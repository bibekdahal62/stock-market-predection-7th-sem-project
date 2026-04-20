import os
import pickle
import numpy as np
import pandas as pd
from tensorflow.keras.models import load_model
from sklearn.metrics import mean_squared_error, mean_absolute_error, mean_absolute_percentage_error, r2_score
 
BASE = os.path.dirname(os.path.abspath(__file__))
 
SEQ1         = 30   # LSTM look-back
SEQ2         = 15   # GRU  look-back
TARGET_COLS  = ["high", "low", "close"]
FEATURE_COLS = TARGET_COLS + [f"{c}_ma5" for c in TARGET_COLS] + [f"{c}_ma10" for c in TARGET_COLS]
 
 
def predict_next_day(data, lstm_model, gru_model, scaler_feature, scaler_target):
    # ── Load models & scalers ─────────────────────────────────────────────────
    model_lstm      = load_model(lstm_model)
    model_gru       = load_model(gru_model)
    scaler_features = pickle.load(open(scaler_feature, "rb"))
    scaler_targets  = pickle.load(open(scaler_target,  "rb"))
 
    # ── Prepare data ──────────────────────────────────────────────────────────
    df = pd.DataFrame(data)
    df["published_date"] = pd.to_datetime(df["published_date"])
    df = df.sort_values("published_date").reset_index(drop=True)
 
    for col in TARGET_COLS:
        df[f"{col}_ma5"]  = df[col].rolling(5).mean()
        df[f"{col}_ma10"] = df[col].rolling(10).mean()
 
    df.dropna(inplace=True)
 
    scaled = scaler_features.transform(df[FEATURE_COLS])
 
    # ── Next-day prediction ───────────────────────────────────────────────────
    w1 = scaled[-SEQ1:].reshape(1, SEQ1, len(FEATURE_COLS))
    w2 = scaled[-SEQ2:].reshape(1, SEQ2, len(FEATURE_COLS))
 
    p_lstm = scaler_targets.inverse_transform(model_lstm.predict(w1, verbose=0))[0]
    p_gru  = scaler_targets.inverse_transform(model_gru.predict(w2,  verbose=0))[0]
    avg    = (p_lstm + p_gru) / 2.0
 
    last       = df.iloc[-1]
    change     = round(float(avg[2]) - float(last["close"]), 2)
    change_pct = round(change / float(last["close"]) * 100, 2)
 
    # ── Metrics on full dataset ───────────────────────────────────────────────
    scaled_targets_all = scaler_targets.transform(df[TARGET_COLS])
 
    X_all = np.array([scaled[i - SEQ1:i] for i in range(SEQ1, len(scaled))])
    y_all = scaler_targets.inverse_transform(scaled_targets_all[SEQ1:])
 
    p1_all  = scaler_targets.inverse_transform(model_lstm.predict(X_all, verbose=0))
    X2_all  = np.array([scaled[i - SEQ2:i] for i in range(SEQ1, len(scaled))])
    p2_all  = scaler_targets.inverse_transform(model_gru.predict(X2_all, verbose=0))
    ens_all = (p1_all + p2_all) / 2.0
 
    labels  = ["high", "low", "close"]
    metrics = {}
    for i, lbl in enumerate(labels):
        mse  = round(float(mean_squared_error(y_all[:, i], ens_all[:, i])), 4)
        rmse = round(float(np.sqrt(mse)), 4)
        mape = round(float(mean_absolute_percentage_error(y_all[:, i], ens_all[:, i]) * 100), 4)
        r2   = round(float(r2_score(y_all[:, i], ens_all[:, i])), 4)
        acc  = round(100 - mape, 2)
        metrics[lbl] = {"mse": mse, "rmse": rmse, "mape": mape, "accuracy": acc, "r2": r2}
 
    return {
        "last_date":        str(last["published_date"].date()),
        "last_high":        float(last["high"]),
        "last_low":         float(last["low"]),
        "last_close":       float(last["close"]),
        "lstm_high":        round(float(p_lstm[0]), 2),
        "lstm_low":         round(float(p_lstm[1]), 2),
        "lstm_close":       round(float(p_lstm[2]), 2),
        "gru_high":         round(float(p_gru[0]), 2),
        "gru_low":          round(float(p_gru[1]), 2),
        "gru_close":        round(float(p_gru[2]), 2),
        "predicted_high":   round(float(avg[0]), 2),
        "predicted_low":    round(float(avg[1]), 2),
        "predicted_close":  round(float(avg[2]), 2),
        "change":           change,
        "change_pct":       change_pct,
        "metrics":          metrics,
    }
 
 
if __name__ == "__main__":
    result = predict_next_day()
    print(f"Last Date       : {result['last_date']}")
    print(f"Last High       : {result['last_high']:.2f}")
    print(f"Last Low        : {result['last_low']:.2f}")
    print(f"Last Close      : {result['last_close']:.2f}")
    print()
    print(f"LSTM  High/Low/Close : {result['lstm_high']} / {result['lstm_low']} / {result['lstm_close']}")
    print(f"GRU   High/Low/Close : {result['gru_high']} / {result['gru_low']} / {result['gru_close']}")
    print()
    print(f"Ensemble High   : {result['predicted_high']:.2f}")
    print(f"Ensemble Low    : {result['predicted_low']:.2f}")
    print(f"Ensemble Close  : {result['predicted_close']:.2f}")
    print(f"Change          : {result['change']:+.2f}  ({result['change_pct']:+.2f}%)")
    print()
    print("Metrics (Ensemble):")
    for target, m in result["metrics"].items():
        print(f"  {target.capitalize():<6} — MSE:{m['mse']}  RMSE:{m['rmse']}  "
              f"MAPE:{m['mape']}%  Accuracy:{m['accuracy']}%  R²:{m['r2']}")