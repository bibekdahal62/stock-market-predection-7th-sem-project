import os

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"   # hide INFO/WARNING/ERROR
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0" # hide oneDNN message
os.environ["CUDA_VISIBLE_DEVICES"] = "-1" # hide CUDA message



import pickle
import numpy as np
import pandas as pd
from tensorflow.keras.models import load_model
from pathlib import Path


import warnings
warnings.filterwarnings("ignore")


BASE= Path(__file__).resolve().parent.parent

SEQUENCE_LENGTH = 30
TARGET_COLS     = ["high", "low", "close"]
FEATURE_COLS    = TARGET_COLS + [f"{c}_ma5" for c in TARGET_COLS] + [f"{c}_ma10" for c in TARGET_COLS]


def predict_next_day(model_path, scaler_feature_path, scaler_target_path, data):
    model = load_model(model_path)
    scaler_features = pickle.load(open(scaler_feature_path, "rb"))
    scaler_targets  = pickle.load(open(scaler_target_path,  "rb"))

    # df = pd.read_csv(os.path.join(BASE, "predection", "data", "UPPER.csv"))
    df = pd.DataFrame(data)
    df["published_date"] = pd.to_datetime(df["published_date"])
    df = df.sort_values("published_date").reset_index(drop=True)

    for col in TARGET_COLS:
        df[f"{col}_ma5"]  = df[col].rolling(5).mean()
        df[f"{col}_ma10"] = df[col].rolling(10).mean()

    df.dropna(inplace=True)

    scaled      = scaler_features.transform(df[FEATURE_COLS])
    last_window = scaled[-SEQUENCE_LENGTH:].reshape(1, SEQUENCE_LENGTH, len(FEATURE_COLS))
    pred        = scaler_targets.inverse_transform(model.predict(last_window, verbose=0))[0]

    last       = df.iloc[-1]
    change     = round(float(pred[2]) - float(last["close"]), 2)
    change_pct = round(change / float(last["close"]) * 100, 2)

    return {
        "last_date":       str(last["published_date"].date()),
        "last_high":       float(last["high"]),
        "last_low":        float(last["low"]),
        "last_close":      float(last["close"]),
        "predicted_high":  round(float(pred[0]), 2),
        "predicted_low":   round(float(pred[1]), 2),
        "predicted_close": round(float(pred[2]), 2),
        "change":          change,
        "change_pct":      change_pct,
    }



if __name__ == "__main__":
    model_path = os.path.join(BASE, "predection", "saved_models", "lstm", "upper","upper_lstm.keras")
    scaler_feature_path = os.path.join(BASE, "predection", "saved_models", "lstm", "upper", "scaler_features.pkl")
    scaler_target_path = os.path.join(BASE, "predection", "saved_models", "lstm", "upper", "scaler_targets.pkl")
    result = predict_next_day(model_path=model_path, scaler_feature_path=scaler_feature_path, scaler_target_path=scaler_target_path)
    print(f"Last Date      : {result['last_date']}")
    print(f"Last High      : {result['last_high']:.2f}")
    print(f"Last Low       : {result['last_low']:.2f}")
    print(f"Last Close     : {result['last_close']:.2f}")
    print()
    print(f"Predicted High : {result['predicted_high']:.2f}")
    print(f"Predicted Low  : {result['predicted_low']:.2f}")
    print(f"Predicted Close: {result['predicted_close']:.2f}")
    print(f"Change         : {result['change']:+.2f}  ({result['change_pct']:+.2f}%)")