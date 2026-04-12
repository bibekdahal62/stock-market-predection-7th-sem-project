import os
import pickle
import numpy as np
import pandas as pd
from tensorflow.keras.models import load_model
from pathlib import Path
from sklearn.metrics import mean_squared_error, r2_score

# BASE = os.path.dirname(os.path.abspath(__file__))
BASE= Path(__file__).resolve().parent.parent

SEQ1         = 30
SEQ2         = 15
TARGET_COLS  = ["high", "low", "close"]
FEATURE_COLS = TARGET_COLS + [f"{c}_ma5" for c in TARGET_COLS] + [f"{c}_ma10" for c in TARGET_COLS]


def predict_next_day(model1_path, model2_path, scaler_features_path, scaler_targets_path, data):
    # ── Load models & scalers ─────────────────────────────────────────────────
    model1          = load_model(model1_path)
    model2          = load_model(model2_path)
    scaler_features = pickle.load(open(scaler_features_path, "rb"))
    scaler_targets  = pickle.load(open(scaler_targets_path,  "rb"))

    # ── Prepare data ──────────────────────────────────────────────────────────
    df = pd.DataFrame(data)
    df["published_date"] = pd.to_datetime(df["published_date"])
    df = df.sort_values("published_date").reset_index(drop=True)

    for col in TARGET_COLS:
        df[f"{col}_ma5"]  = df[col].rolling(5).mean()
        df[f"{col}_ma10"] = df[col].rolling(10).mean()

    df.dropna(inplace=True)

    scaled = scaler_features.transform(df[FEATURE_COLS])

    # ── Predict with each model ───────────────────────────────────────────────
    w1 = scaled[-SEQ1:].reshape(1, SEQ1, len(FEATURE_COLS))
    w2 = scaled[-SEQ2:].reshape(1, SEQ2, len(FEATURE_COLS))

    p1 = scaler_targets.inverse_transform(model1.predict(w1, verbose=0))[0]
    p2 = scaler_targets.inverse_transform(model2.predict(w2, verbose=0))[0]

    avg = (p1 + p2) / 2.0

    # ── Metrics on full dataset (ensemble vs actual) ──────────────────────────
    scaled_targets = scaler_targets.transform(df[TARGET_COLS])
    X_all, y_all   = [], []
    for i in range(SEQ1, len(scaled)):
        X_all.append(scaled[i - SEQ1:i])
        y_all.append(scaled_targets[i])
    X_all = np.array(X_all)
    y_all = np.array(y_all)
 
    p1_all = scaler_targets.inverse_transform(model1.predict(X_all, verbose=0))
    w2_all = np.array([scaled[i - SEQ2:i] for i in range(SEQ1, len(scaled))])
    p2_all = scaler_targets.inverse_transform(model2.predict(w2_all, verbose=0))
 
    ens_all = (p1_all + p2_all) / 2.0
    act_all = scaler_targets.inverse_transform(y_all)
 
    # Per-target metrics (Close is index 2)
    labels = ["high", "low", "close"]
    model_metrics = {}
    for i, lbl in enumerate(labels):
        mse  = round(float(mean_squared_error(act_all[:, i], ens_all[:, i])), 4)
        rmse = round(float(np.sqrt(mse)), 4)
        r2   = round(float(r2_score(act_all[:, i], ens_all[:, i])), 4)
        model_metrics[lbl] = {"mse": mse, "rmse": rmse, "r2": r2}
 
    # ── Build result ──────────────────────────────────────────────────────────
    last       = df.iloc[-1]
    change     = round(float(avg[2]) - float(last["close"]), 2)
    change_pct = round(change / float(last["close"]) * 100, 2)
 
    return {
        "last_date":       str(last["published_date"].date()),
        "last_high":       float(last["high"]),
        "last_low":        float(last["low"]),
        "last_close":      float(last["close"]),
        "predicted_high":  round(float(avg[0]), 2),
        "predicted_low":   round(float(avg[1]), 2),
        "predicted_close": round(float(avg[2]), 2),
        "change":          change,
        "change_pct":      change_pct,
        "metrics":         model_metrics,
    }


if __name__ == "__main__":
    model_1 = os.path.join(BASE, "prediction", "saved_models", "lstm", "upper", "two_models","upper_lstm_model1_30d.keras")
    model_2 = os.path.join(BASE, "prediction", "saved_models", "lstm", "upper", "two_models","upper_lstm_model2_15d.keras")
    scaler_feature = os.path.join(BASE, "prediction", "saved_models", "lstm", "upper", "two_models","scaler_features.pkl")
    scaler_targets = os.path.join(BASE, "prediction", "saved_models", "lstm", "upper", "teo_models","scaler_targets.pkl")
    result = predict_next_day(model1_path=model_1, model2_path=model_2, scaler_features_path=scaler_feature, scaler_targets_path=scaler_targets)
    print(f"Last Date      : {result['last_date']}")
    print(f"Last High      : {result['last_high']:.2f}")
    print(f"Last Low       : {result['last_low']:.2f}")
    print(f"Last Close     : {result['last_close']:.2f}")
    print()
    print(f"Predicted High : {result['predicted_high']:.2f}")
    print(f"Predicted Low  : {result['predicted_low']:.2f}")
    print(f"Predicted Close: {result['predicted_close']:.2f}")
    print(f"Change         : {result['change']:+.2f}  ({result['change_pct']:+.2f}%)")