"""
disease_detect.py <image_path>

DEDICATED crop-disease detector (separate from crop identification). Prints JSON:
  { label, crop, confidence, healthy, alternatives:[{label,confidence}], model, lowConfidence }

Primary: ONNX model at env DISEASE_MODEL_PATH (+ DISEASE_LABELS_PATH), e.g. an
open-source PlantVillage-trained classifier with labels like
"Tomato___Early_blight", "Potato___healthy", etc.
Fallback: transparent leaf-health heuristic (clearly flagged low-confidence).
"""

import os
import sys
import warnings
warnings.filterwarnings("ignore")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cv_common import run_onnx, image_features, emit  # noqa: E402

# --- Robust model-path resolution ---------------------------------------------
# The .env stores model paths as "ml_models/disease_model.onnx" (relative to
# the backend/ directory). The Node controller spawns Python with cwd set to
# ml_models/, though, so a plain os.path.exists() against the raw env value
# fails and the script silently falls back to the built-in heuristic — losing
# the whole ONNX model. To be robust against either cwd choice, try the value
# as-is, then relative to the backend directory (parent of ml_models/), then
# relative to ml_models/ itself. The first hit wins.
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))       # .../backend/ml_models
_BACKEND_DIR = os.path.dirname(_THIS_DIR)                    # .../backend


def _resolve(env_value):
    if not env_value:
        return env_value
    if os.path.isabs(env_value) and os.path.exists(env_value):
        return env_value
    for base in ("", _BACKEND_DIR, _THIS_DIR):
        candidate = env_value if base == "" else os.path.join(base, env_value)
        if os.path.exists(candidate):
            return candidate
    # Nothing matched — return the original value so run_onnx() logs a clean miss.
    return env_value


DISEASE_MODEL_PATH = _resolve(os.environ.get("DISEASE_MODEL_PATH"))
DISEASE_LABELS_PATH = _resolve(os.environ.get("DISEASE_LABELS_PATH"))


def split_label(raw):
    """Parse a label from disease_labels.txt into (crop, disease, healthy).

    The labels in this project are natural English phrases, e.g.
      "Apple Scab"                                  -> ("Apple",   "Apple Scab",   False)
      "Apple with Black Rot"                        -> ("Apple",   "Black Rot",    False)
      "Tomato with Late Blight"                     -> ("Tomato",  "Late Blight",  False)
      "Corn (Maize) with Common Rust"               -> ("Corn (Maize)", "Common Rust", False)
      "Bell Pepper with Bacterial Spot"             -> ("Bell Pepper", "Bacterial Spot", False)
      "Healthy Tomato Plant"                        -> ("Tomato",  "Healthy",      True)
      "Healthy Apple"                               -> ("Apple",   "Healthy",      True)
      "Tomato Yellow Leaf Curl Virus"               -> ("Tomato",  "Tomato Yellow Leaf Curl Virus", False)
      "Tomato Mosaic Virus"                         -> ("Tomato",  "Tomato Mosaic Virus", False)

    Also stays backward-compatible with the older PlantVillage
    "Crop___Disease" underscore format, in case a different labels file is
    plugged in later via DISEASE_LABELS_PATH.
    """
    s = raw.strip()

    # Backward-compat: old-style "Crop___Disease" / "Crop__Disease"
    for sep in ("___", "__"):
        if sep in s:
            crop, disease = s.split(sep, 1)
            crop = crop.replace("_", " ").strip()
            disease = disease.replace("_", " ").strip()
            healthy = "healthy" in disease.lower()
            return crop, ("Healthy" if healthy else disease), healthy

    # Natural-English "Healthy <Crop> [Plant]" pattern
    low = s.lower()
    if low.startswith("healthy "):
        rest = s[len("Healthy "):].strip()
        if rest.lower().endswith(" plant"):
            rest = rest[:-len(" plant")].strip()
        return rest, "Healthy", True

    # Natural-English "<Crop> with <Disease>" pattern
    if " with " in low:
        crop_part, disease_part = s.split(" with ", 1)
        return crop_part.strip(), disease_part.strip(), False

    # Otherwise the label is a single phrase — try to guess the crop by
    # matching a known crop prefix; if we can't, leave crop blank and use
    # the whole label as the disease name (e.g. "Apple Scab", "Tomato
    # Yellow Leaf Curl Virus", "Cedar Apple Rust").
    KNOWN_CROP_PREFIXES = [
        "Apple", "Blueberry", "Cherry", "Corn (Maize)", "Corn", "Grape",
        "Orange", "Peach", "Bell Pepper", "Pepper", "Potato", "Raspberry",
        "Soybean", "Squash", "Strawberry", "Tomato",
    ]
    for crop in KNOWN_CROP_PREFIXES:
        if s.startswith(crop + " "):
            return crop, s, False

    return "", s, False


def heuristic_predict(path):
    f = image_features(path)
    green = f["green_ratio"]
    brown = f["brown_ratio"]
    yellow = f["yellow_ratio"]
    dark = f["dark_ratio"]

    # Lesion-like (brown/yellow/dark) coverage vs healthy green tissue.
    lesion = brown + yellow + dark
    healthy_score = max(0.0, green - lesion)

    candidates = {
        "Healthy": healthy_score * 1.4 + 0.05,
        "Early Blight": brown * 1.3 + dark * 0.6,
        "Late Blight": dark * 1.2 + brown * 0.7,
        "Bacterial Spot": yellow * 0.9 + brown * 0.6,
        "Powdery Mildew": max(0.0, f["brightness"] - 0.55) * 1.1 + (1 - green) * 0.3,
    }
    total = sum(candidates.values()) or 1.0
    ranked = sorted(
        ({"label": k, "confidence": round(v / total, 4)} for k, v in candidates.items()),
        key=lambda x: x["confidence"],
        reverse=True,
    )
    return ranked


def main():
    if len(sys.argv) < 2:
        emit({"error": "missing-image-path"})
        return 1

    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        emit({"error": "image-not-found"})
        return 1

    try:
        # mean/std/resize_crop here match the specific model this project ships
        # with (see backend/ml_models/README.md) — a MobileNetV2 model, which
        # uses TensorFlow-style [-1, 1] scaling and a resize-256/crop-224
        # pipeline, NOT the ImageNet mean/std convention. Verified from that
        # model's preprocessor_config.json, not assumed.
        onnx = run_onnx(DISEASE_MODEL_PATH, DISEASE_LABELS_PATH, image_path,
                        mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5], layout="NCHW",
                        resize_crop=(256, 224))

        if onnx:
            crop, disease, healthy = split_label(onnx[0][0])
            # Build a de-duplicated list of alternatives: skip anything that
            # collapses to the same displayed label as the top prediction
            # (e.g. two "Healthy <crop>" entries both display as "Healthy")
            # and cap at 3 distinct alternatives.
            alts = []
            seen = {disease.lower()}
            for raw, p in onnx[1:]:
                _, d, _ = split_label(raw)
                key = d.lower()
                if key in seen:
                    continue
                seen.add(key)
                alts.append({"label": d, "confidence": round(p, 4)})
                if len(alts) >= 3:
                    break
            emit({
                "label": disease,
                "crop": crop or None,
                "confidence": round(onnx[0][1], 4),
                "healthy": healthy,
                "alternatives": alts,
                "model": "onnx",
                "lowConfidence": onnx[0][1] < 0.5,
            })
            return 0

        ranked = heuristic_predict(image_path)
        top = ranked[0]
        emit({
            "label": top["label"],
            "crop": None,
            "confidence": top["confidence"],
            "healthy": top["label"] == "Healthy",
            "alternatives": ranked[1:4],
            "model": "heuristic",
            "lowConfidence": True,
            "note": "No trained disease-detection model is installed; result is a low-confidence visual estimate and not a diagnosis.",
        })
        return 0
    except Exception as exc:  # pragma: no cover
        emit({"error": f"inference-failed: {exc}"})
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
