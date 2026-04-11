"""
predictor.py
Place this file inside your Django app folder.

Folder structure expected:
    your_project/
    ├── data/
    │   └── UPPER.csv
    └── saved_models/
        └── upper/
            ├── rf_high.pkl
            ├── rf_low.pkl
            ├── rf_close.pkl
            ├── scaler_high.pkl
            ├── scaler_low.pkl
            └── scaler_close.pkl

Usage in any view or anywhere in Django:
    from your_app.predictor import predict_upper

    predictions = predict_upper(n_days=5)
    print(predictions)
"""

import os
import numpy as np
import pandas as pd
import joblib
from django.conf import settings
# settings.configure()

from pathlib import Path

def predict_upper(model_dir, n_days, data):
    """
    Loads saved models and predicts the next n_days High, Low, Close for UPPER stock.

    Args:
        n_days (int): Number of future trading days to predict. Default is 5.

    Returns:
        list of dicts:
        [
            {'day': 1, 'open': 213.00, 'high': 217.50, 'low': 210.20, 'close': 215.00},
            {'day': 2, 'open': 215.00, 'high': 220.10, 'low': 213.00, 'close': 218.30},
            ...
        ]
    """

    # ── Paths ────────────────────────────────────────────────

    # ── Load models and scalers ──────────────────────────────
    targets = ['high', 'low', 'close']
    models  = {t: joblib.load(os.path.join(model_dir, f'rf_{t}.pkl'))     for t in targets}
    scalers = {t: joblib.load(os.path.join(model_dir, f'scaler_{t}.pkl')) for t in targets}

    # ── Load and prepare CSV ─────────────────────────────────
    # df = pd.read_csv(csv_path)
    df = pd.DataFrame(data)
    df['published_date'] = pd.to_datetime(df['published_date'])
    df = df.sort_values('published_date').reset_index(drop=True)

    # Rolling features needed for prediction
    df['prev_close']        = df['close'].shift(1)
    df['prev_high']         = df['high'].shift(1)
    df['prev_low']          = df['low'].shift(1)
    df['close_ma5']         = df['close'].rolling(5).mean()
    df['close_ma10']        = df['close'].rolling(10).mean()
    df['vol_ma5']           = df['traded_quantity'].rolling(5).mean()
    df['volatility5']       = df['close'].rolling(5).std()
    df['momentum3']         = df['close'] - df['close'].shift(3)
    df['momentum5']         = df['close'] - df['close'].shift(5)
    delta                   = df['close'].diff()
    gain                    = delta.clip(lower=0).rolling(14).mean()
    loss                    = (-delta.clip(upper=0)).rolling(14).mean()
    df['rsi14']             = 100 - (100 / (1 + gain / loss.replace(0, np.nan)))
    df['open_to_prev']      = df['open'] / df['prev_close']
    df['prev_hl_range_pct'] = (df['prev_high'] - df['prev_low']) / df['prev_close']
    df['prev_oc_diff_pct']  = (df['close'].shift(1) - df['open'].shift(1)) / df['open'].shift(1)
    df['close_to_ma5']      = df['prev_close'] / df['close_ma5']
    df['close_to_ma10']     = df['prev_close'] / df['close_ma10']
    df['vol_ratio']         = df['traded_quantity'] / df['vol_ma5']
    df['momentum3_pct']     = df['momentum3'] / df['prev_close']
    df['momentum5_pct']     = df['momentum5'] / df['prev_close']
    df['volatility5_pct']   = df['volatility5'] / df['prev_close']

    df = df.dropna().reset_index(drop=True)

    # Feature columns the model was trained on
    feature_cols = [
        'open', 'per_change', 'status', 'traded_quantity', 'traded_amount',
        'open_to_prev', 'prev_hl_range_pct', 'prev_oc_diff_pct',
        'close_to_ma5', 'close_to_ma10', 'vol_ratio',
        'momentum3_pct', 'momentum5_pct', 'volatility5_pct', 'rsi14',
    ]

    # ── Predict next n_days iteratively ──────────────────────
    last          = df.iloc[-1].copy()
    close_history = df['close'].tolist()
    vol_history   = df['traded_quantity'].tolist()
    predictions   = []

    for day in range(1, n_days + 1):

        new_open   = float(last['close'])   # close of prev day = open of next day
        prev_close = float(last['close'])
        prev_high  = float(last['high'])
        prev_low   = float(last['low'])
        prev_open  = float(last['open'])

        row = {
            'open'             : new_open,
            'per_change'       : float(last['per_change']),
            'status'           : int(last['status']),
            'traded_quantity'  : float(last['traded_quantity']),
            'traded_amount'    : float(last['traded_amount']),
            'open_to_prev'     : new_open / prev_close,
            'prev_hl_range_pct': (prev_high - prev_low) / prev_close,
            'prev_oc_diff_pct' : (prev_close - prev_open) / prev_open,
            'close_to_ma5'     : prev_close / np.mean(close_history[-5:]),
            'close_to_ma10'    : prev_close / np.mean(close_history[-10:]),
            'vol_ratio'        : float(last['traded_quantity']) / np.mean(vol_history[-5:]),
            'momentum3_pct'    : (prev_close - close_history[-3]) / prev_close,
            'momentum5_pct'    : (prev_close - close_history[-5]) / prev_close,
            'volatility5_pct'  : np.std(close_history[-5:]) / prev_close,
            'rsi14'            : float(last['rsi14']),
        }

        X = pd.DataFrame([row])[feature_cols]

        day_result = {'day': day, 'open': round(new_open, 2)}
        for t in targets:
            ratio         = models[t].predict(scalers[t].transform(X))[0]
            day_result[t] = round(ratio * new_open, 2)

        predictions.append(day_result)

        # Update last row for next iteration (chaining)
        last               = last.copy()
        last['open']       = new_open
        last['high']       = day_result['high']
        last['low']        = day_result['low']
        last['close']      = day_result['close']
        last['per_change'] = ((day_result['close'] - new_open) / new_open) * 100
        last['status']     = 1 if day_result['close'] >= new_open else -1

        close_history.append(day_result['close'])
        vol_history.append(float(last['traded_quantity']))

    return predictions



if __name__ == '__main__':
    BASE      = Path(__file__).resolve().parent.parent
    csv_path  = os.path.join(BASE, 'predection', 'data', 'UPPER.csv')
    model_dir = os.path.join(BASE, 'predection','saved_models', 'upper')
    print(predict_upper(csv_path= csv_path, model_dir= model_dir))