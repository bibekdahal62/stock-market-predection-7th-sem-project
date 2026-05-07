from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from pathlib import Path
import pandas as pd
from . import predictor_lstm_gru, predictor_rf
import os
from .models import Upper, Hbl, UpperLive, HblLive, PredictionSession, DailyForecast
from .serializers import UpperSerializer, HblSerializer, UpperLiveSerializer, HblLiveSerializer, PredictionSessionSerializer, DailyForecastSerializer
from django.contrib.auth.decorators import login_required


# Create your views here.
BASE= Path(__file__).resolve().parent.parent

@login_required
def index(request):

    return render(request, 'prediction/pred.html', {
        'title': 'Predict Stocks',
    })


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

live_stock_models = {
    'upper': UpperLive,
    'hbl': HblLive,
}

model_serializers = {
    'upper': UpperSerializer,
    'hbl': HblSerializer,
}

live_models_serializer = {
    'upper': UpperLiveSerializer,
    'hbl': HblLiveSerializer,
}


# @api_view(['GET'])
# def predection_data(request, stock):

#     if stock in stock_names:

#         qs = stock_models[stock].objects.all().values()   # gets dict with field names
#         data = stock_models[stock].objects.order_by('-published_date')[:30]
#         sd = model_serializers[stock]
#         serializer = sd(data, many=True)

#         stock_name = stock_names[stock]
#         model_dir = stock_name['rf']['model_dir']
#         random_forest_predection = predictor_rf.predict_upper(model_dir=model_dir, n_days=7, data=qs)

#         lstm_model = stock_name['lstm']['lstm_model']
#         gru_model = stock_name['lstm']['gru_model']
        
#         scaler_feature_path = stock_name['lstm']['scaler_feature_path']
#         scaler_target_path = stock_name['lstm']['scaler_target_path']
        
#         lstm_prediction = predictor_lstm_gru.predict_next_day(
#             data=qs,
#             lstm_model=lstm_model,
#             gru_model=gru_model,
#             scaler_feature=scaler_feature_path,
#             scaler_target=scaler_target_path
#         )

#         return Response({
#             'message': 'success',
#             'error': False,
#             'rf_pred': random_forest_predection,
#             'lstm_pred': lstm_prediction,
#             'data': serializer.data
#         })
    
#     else:
#         return Response({
#             'message': 'Stock name not found...',
#             'error': True,
#             'rf_pred': None,
#             'lstm_pred': None
#         })
    


@api_view(['GET'])
def prediction_data_(request, stock):
    if stock in stock_names:
        stock_data = stock_models[stock].objects.order_by('-published_date')[:30]
        sd = model_serializers[stock]
        serializer = sd(stock_data, many=True)


        latest = PredictionSession.objects.filter(ticker=stock.upper()).first()
        latest_serializer = PredictionSessionSerializer(latest)
        if latest:
            forecasts = latest.daily_forecasts.order_by("day")
            forecast_serializer = DailyForecastSerializer(forecasts, many=True)

        return Response({
            'message': 'success',
            'error': False,
            'lstm_pred': latest_serializer.data,
            'rf_pred': forecast_serializer.data,
            'data': serializer.data,
        })
    else:
        return Response({
            'message': 'Stock name not found...',
            'error': True,
            'data': None,
            'lstm_pred': None,
            'rf_pred': None,
        })



@api_view(['GET'])
def live_stock_data(request, stock):


    if stock in live_stock_models:
        data = live_stock_models[stock].objects.order_by('-timestamp')[:2]
        sd = live_models_serializer[stock]
        serializer = sd(data, many=True)

    return Response(serializer.data)