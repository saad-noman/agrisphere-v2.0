"""
cv_common — shared helpers for the crop-identification and disease-detection
inference scripts.

Design:
  * PRIMARY path: run a free / open-source image-classification model in ONNX
    format via onnxruntime (CPU, no API key, fully self-hosted). Operators drop
    an exported open-source model (e.g. a PlantVillage / MobileNet / EfficientNet
    classifier) at the configured path and provide a matching labels file. No
    code change is required to upgrade from the fallback to a real DL model.
  * FALLBACK path: a transparent, dependency-light heuristic (Pillow + numpy)
    that still returns a label + confidence + alternatives, always clearly
    flagged as low-confidence so results are never presented as certain.

The LLM is NEVER the image classifier — classification happens here.
"""

import os
import json
import numpy as np
from PIL import Image


def load_image(path, size=(224, 224)):
    img = Image.open(path).convert("RGB").resize(size)
    return np.asarray(img).astype("float32")


def load_image_resize_crop(path, resize_edge=256, crop_size=224):
    """Resize the shortest edge to `resize_edge`, then center-crop a
    `crop_size` x `crop_size` square — the preprocessing some HuggingFace
    image models (e.g. MobileNetV2-based ones) were actually trained with,
    as opposed to the plain squash-resize `load_image()` above does."""
    img = Image.open(path).convert("RGB")
    w, h = img.size
    scale = resize_edge / min(w, h)
    img = img.resize((round(w * scale), round(h * scale)))
    w, h = img.size
    left = (w - crop_size) // 2
    top = (h - crop_size) // 2
    img = img.crop((left, top, left + crop_size, top + crop_size))
    return np.asarray(img).astype("float32")


def softmax(x):
    x = np.asarray(x, dtype="float64")
    x = x - np.max(x)
    e = np.exp(x)
    return e / (np.sum(e) + 1e-9)


def read_labels(labels_path):
    if not labels_path or not os.path.exists(labels_path):
        return None
    with open(labels_path, "r", encoding="utf-8") as f:
        content = f.read().strip()
    # Support JSON array or newline-separated labels.
    try:
        data = json.loads(content)
        if isinstance(data, list):
            return [str(x) for x in data]
        if isinstance(data, dict):
            # {"0": "label", ...} ordered by int key
            return [str(data[k]) for k in sorted(data, key=lambda k: int(k))]
    except Exception:
        pass
    return [line.strip() for line in content.splitlines() if line.strip()]


def run_onnx(model_path, labels_path, image_path, mean=None, std=None, layout="NHWC", resize_crop=None):
    """
    Attempt ONNX inference. Returns a list of (label, prob) sorted desc, or None
    if the model / runtime is not available.

    resize_crop: optional (resize_edge, crop_size) tuple. When given, uses
    load_image_resize_crop() instead of the plain squash-resize — needed for
    models trained with a resize-then-center-crop pipeline (check the
    model's preprocessor_config.json rather than guessing).
    """
    if not model_path or not os.path.exists(model_path):
        return None
    labels = read_labels(labels_path)
    if not labels:
        return None
    try:
        import onnxruntime as ort
    except Exception:
        return None

    try:
        if resize_crop:
            arr = load_image_resize_crop(image_path, *resize_crop) / 255.0
        else:
            arr = load_image(image_path) / 255.0
        if mean is not None and std is not None:
            arr = (arr - np.array(mean)) / np.array(std)
        if layout == "NCHW":
            arr = np.transpose(arr, (2, 0, 1))
        batch = np.expand_dims(arr, 0).astype("float32")

        sess = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
        input_name = sess.get_inputs()[0].name
        logits = sess.run(None, {input_name: batch})[0][0]
        probs = softmax(logits) if np.max(logits) > 1.0 or np.min(logits) < 0.0 else np.asarray(logits)
        order = np.argsort(probs)[::-1]
        pairs = [(labels[i] if i < len(labels) else f"class_{i}", float(probs[i])) for i in order]
        return pairs
    except Exception:
        return None


def image_features(path):
    """Extract simple, robust color/texture stats used by the heuristic fallback."""
    arr = load_image(path, (160, 160)) / 255.0
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    total = arr.reshape(-1, 3)

    green_mask = (g > r) & (g > b) & (g > 0.2)
    brown_mask = (r > 0.3) & (g > 0.2) & (b < 0.35) & (r >= g) & (g >= b)
    yellow_mask = (r > 0.5) & (g > 0.5) & (b < 0.4)
    dark_mask = (arr.max(axis=2) < 0.25)

    return {
        "mean_r": float(r.mean()),
        "mean_g": float(g.mean()),
        "mean_b": float(b.mean()),
        "brightness": float(total.mean()),
        "green_ratio": float(green_mask.mean()),
        "brown_ratio": float(brown_mask.mean()),
        "yellow_ratio": float(yellow_mask.mean()),
        "dark_ratio": float(dark_mask.mean()),
        "std": float(total.std()),
    }


def emit(result):
    """Print a single JSON line to stdout (the Node caller parses this)."""
    print(json.dumps(result))
