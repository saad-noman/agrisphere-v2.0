# Crop disease detection model

Used by `disease_detect.py` via `cv_common.py`'s `run_onnx()`, controlled by
the `DISEASE_MODEL_PATH`/`DISEASE_LABELS_PATH` variables in `backend/.env`.
If the model file is missing, the script falls back to a built-in,
clearly-labeled heuristic — nothing crashes either way.

## `disease_model.onnx` / `disease_labels.txt`

- **Source**: [`linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification`](https://huggingface.co/linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification)
  on Hugging Face — a `transformers` `Trainer`-fine-tuned checkpoint of
  Google's `mobilenet_v2_1.0_224`.
- **Converted to ONNX** from the published PyTorch checkpoint for this
  project (the source repo only publishes `pytorch_model.bin`); the
  conversion is a pure format change, not a retrain — same weights, same
  predictions.
- **License**: no separate license was declared for the fine-tuned
  checkpoint; the base architecture (`google/mobilenet_v2_1.0_224`) is
  Apache-2.0.
- **Dataset**: PlantVillage (Kaggle release) — a widely-used academic
  dataset of ~54,000 lab-photographed leaf images.
- **Classes**: 38 — see `disease_labels.txt`, in the exact order of the
  model's output indices (taken directly from the checkpoint's
  `config.json` `id2label`, not reconstructed/alphabetized). Spans 14 crop
  species (apple, blueberry, cherry, corn, grape, orange, peach, pepper,
  potato, raspberry, soybean, squash, strawberry, tomato), each with either
  a disease label (e.g. "Tomato with Late Blight") or a "Healthy ... Plant"
  label.
- **Reported accuracy**: 95.41% on its own PlantVillage eval split (per the
  source model card) — not independently re-verified here.
- **Preprocessing**: resize shortest edge to 256px, center-crop to 224×224,
  scale to [-1, 1] (mean=std=0.5 per channel) — taken from the checkpoint's
  `preprocessor_config.json`, implemented in `cv_common.py`'s
  `load_image_resize_crop()` + the `mean`/`std`/`resize_crop` arguments
  `disease_detect.py` passes to `run_onnx()`.

**Limitation, stated plainly**: PlantVillage photos are lab-condition,
single-leaf, plain-background images. Real field photos (cluttered
background, multiple leaves, poor lighting) are harder for any model
trained on it, including this one. The app already reflects this — results
are always labeled a prediction/estimate (never a diagnosis), confidence is
the model's real softmax score, and low-confidence results are flagged.
This is an academic/student project's crop-disease-analysis feature, not a
certified diagnostic tool.
