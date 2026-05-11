from .models import DailyForecast, ModelMetric, PredictionSession, Upper, Hbl
from . import predictor_lstm_gru, predictor_rf
from django.utils import timezone
import os
from pathlib import Path
from nepse_data_api import Nepse
import logging
logger = logging.getLogger(__name__)



BASE= Path(__file__).resolve().parent.parent



stock_names = {
    'upper':{
        'rf':{
            'model_dir': os.path.join(BASE, 'prediction','saved_models', 'upper')
        }, 
        'lstm': {
            "lstm_model": os.path.join(BASE, "prediction", "saved_models", "lstm", "upper", "two_models","lstm_model_30d.keras"),
            "gru_model": os.path.join(BASE, "prediction", "saved_models", "lstm", "upper", "two_models","gru_model_15d.keras"),
            "scaler_feature_path": os.path.join(BASE, "prediction", "saved_models", "lstm", "upper", "two_models","scaler_features.pkl"),
            "scaler_target_path": os.path.join(BASE, "prediction", "saved_models", "lstm", "upper", "two_models","scaler_targets.pkl")
        }
    },
    'hbl':{
        'rf':{
            'model_dir': os.path.join(BASE, 'prediction','saved_models', 'hbl')
        }, 
        'lstm': {
            "lstm_model": os.path.join(BASE, "prediction", "saved_models", "lstm", "hbl", "two_models","lstm_model_30d.keras"),
            "gru_model": os.path.join(BASE, "prediction", "saved_models", "lstm", "hbl", "two_models","gru_model_15d.keras"),
            "scaler_feature_path": os.path.join(BASE, "prediction", "saved_models", "lstm", "hbl", "two_models","scaler_features.pkl"),
            "scaler_target_path": os.path.join(BASE, "prediction", "saved_models", "lstm", "hbl", "two_models","scaler_targets.pkl")
        }
    }
}


stock_models = {
    'upper': Upper,
    'hbl': Hbl,
}


stock_name_ = ['upper', 'hbl']



def save_prediction(prediction: dict, daily_forecasts: list[dict], ticker: str = "UNKNOWN") -> PredictionSession:
    """
    Persist one full prediction run to the database.

    Args:
        prediction:      The summary dict returned by your prediction function.
        daily_forecasts: The list of 7 daily OHLC dicts.
        ticker:          Stock/asset symbol (e.g. "AAPL").

    Returns:
        The newly created PredictionSession instance.

    Usage inside a Django view:
        session = save_prediction(prediction_dict, forecast_list, ticker="AAPL")
    """
    now = timezone.localtime()
    # 1. Create the parent session (timestamp is auto-set to now)
    session = PredictionSession.objects.create(
        ticker=ticker,
        created_at=now,
        last_date=prediction["last_date"],
        last_high=prediction["last_high"],
        last_low=prediction["last_low"],
        last_close=prediction["last_close"],
        lstm_high=prediction["lstm_high"],
        lstm_low=prediction["lstm_low"],
        lstm_close=prediction["lstm_close"],
        gru_high=prediction["gru_high"],
        gru_low=prediction["gru_low"],
        gru_close=prediction["gru_close"],
        predicted_high=prediction["predicted_high"],
        predicted_low=prediction["predicted_low"],
        predicted_close=prediction["predicted_close"],
        change=prediction["change"],
        change_pct=prediction["change_pct"],
    )

    # 2. Bulk-create the three metric rows (high / low / close)
    ModelMetric.objects.bulk_create(
        [
            ModelMetric(
                session=session,
                target=target,
                mse=prediction["metrics"][target]["mse"],
                rmse=prediction["metrics"][target]["rmse"],
                mape=prediction["metrics"][target]["mape"],
                accuracy=prediction["metrics"][target]["accuracy"],
                r2=prediction["metrics"][target]["r2"],
            )
            for target in ("high", "low", "close")
        ]
    )

    # 3. Bulk-create the daily forecast rows
    DailyForecast.objects.bulk_create(
        [
            DailyForecast(
                session=session,
                day=day["day"],
                open=float(day["open"]),
                high=float(day["high"]),
                low=float(day["low"]),
                close=float(day["close"]),
            )
            for day in daily_forecasts
        ]
    )

    logger.info(f"Scheduled prediction task completed for {ticker}. Results saved to database.")
    # return session



def scheduled_prediction_task():
    """
    Example of a scheduled task that runs the prediction function and saves results.
    You can set this up with Celery beat or Django Q to run at desired intervals.
    """
    for stock in stock_name_:
        try:
            # nepse = Nepse()
            # status = nepse.get_market_status()
            # print(status)

            # if status.get('isOpen') == 'CLOSE':
            #     logger.info('Market is currently close.. Skipping prediction data store.')
            #     return
            
            qs = stock_models[stock].objects.all().values()   # gets dict with field names
        
            stock_name = stock_names[stock]
            model_dir = stock_name['rf']['model_dir']
            random_forest_predection = predictor_rf.predict_upper(model_dir=model_dir, n_days=7, data=qs)

            lstm_model = stock_name['lstm']['lstm_model']
            gru_model = stock_name['lstm']['gru_model']
            
            scaler_feature_path = stock_name['lstm']['scaler_feature_path']
            scaler_target_path = stock_name['lstm']['scaler_target_path']
            
            lstm_prediction = predictor_lstm_gru.predict_next_day(
                data=qs,
                lstm_model=lstm_model,
                gru_model=gru_model,
                scaler_feature=scaler_feature_path,
                scaler_target=scaler_target_path
            )

            save_prediction(lstm_prediction, random_forest_predection, ticker=stock.upper())

        except Exception as e:
            logger.error(f"Prediction failed for {stock}: {e}", exc_info=True)
        

