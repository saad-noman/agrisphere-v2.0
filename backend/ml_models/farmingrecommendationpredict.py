import os
import sys
import warnings
warnings.filterwarnings('ignore')

try:
    import sklearn._loss._loss
    sys.modules['_loss'] = sys.modules['sklearn._loss._loss']
except Exception:
    pass
import joblib
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'best_gb_model.pkl')
SCALER_PATH = os.path.join(BASE_DIR, 'scaler.pkl')
ENCODER_PATH = os.path.join(BASE_DIR, 'label_encoder.pkl')
POLY_PATH = os.path.join(BASE_DIR, 'poly_transform.pkl')


def load_artifacts():
    try:
        import sys
        import sklearn._loss._loss as _loss_sub
        sys.modules['_loss'] = _loss_sub
    except Exception:
        pass
    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    encoder = joblib.load(ENCODER_PATH)
    poly = joblib.load(POLY_PATH)
    return model, scaler, encoder, poly


def main():
    if len(sys.argv) < 9:
        print('missing-input')
        return 1

    try:
        values = [float(x) for x in sys.argv[1:9]]
        features = np.array(values).reshape(1, -1)

        model, scaler, encoder, poly = load_artifacts()
        transformed = poly.transform(features)
        scaled = scaler.transform(transformed)
        prediction = model.predict(scaled)[0]
        crop = encoder.inverse_transform([prediction])[0]
        print(crop)
        return 0
    except Exception as exc:
        print(f'Prediction error: {exc}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
