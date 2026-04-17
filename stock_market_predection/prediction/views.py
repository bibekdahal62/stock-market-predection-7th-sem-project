from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from pathlib import Path
import pandas as pd
from . import predictor_lstm, predictor_rf, predictor_lstm_2m
import os
from .models import Upper, Hbl, UpperLive, HblLive
from .serializers import UpperSerializer, HblSerializer, UpperLiveSerializer, HblLiveSerializer
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
        # 'lstm': {
        #     "model1": os.path.join(BASE, "prediction", "saved_models", "lstm", "upper", "two_models","upper_lstm_model1_30d.keras"),
        #     "model2": os.path.join(BASE, "prediction", "saved_models", "lstm", "upper", "two_models","upper_lstm_model2_15d.keras"),
        #     "scaler_feature_path": os.path.join(BASE, "prediction", "saved_models", "lstm", "upper", "two_models","scaler_features.pkl"),
        #     "scaler_target_path": os.path.join(BASE, "prediction", "saved_models", "lstm", "upper", "two_models","scaler_targets.pkl")
        # }
        'lstm': {
            'model_path': os.path.join(BASE, "prediction", "saved_models", "lstm", "upper","upper_lstm.keras"),
            'scaler_feature_path': os.path.join(BASE, "prediction", "saved_models", "lstm", "upper", "scaler_features.pkl"),
            'scaler_target_path': os.path.join(BASE, "prediction", "saved_models", "lstm", "upper", "scaler_targets.pkl")
        }
    },
    'hbl':{
        'rf':{
            'model_dir': os.path.join(BASE, 'prediction','saved_models', 'hbl')
        }, 
        'lstm': {
            'model_path': os.path.join(BASE, "prediction", "saved_models", "lstm", "hbl","hbl_lstm.keras"),
            'scaler_feature_path': os.path.join(BASE, "prediction", "saved_models", "lstm", "hbl", "scaler_features.pkl"),
            'scaler_target_path': os.path.join(BASE, "prediction", "saved_models", "lstm", "hbl", "scaler_targets.pkl")
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


@api_view(['GET'])
def predection_data(request, stock):

    if stock in stock_names:

        qs = stock_models[stock].objects.all().values()   # gets dict with field names
        data = stock_models[stock].objects.order_by('-published_date')[:30]
        sd = model_serializers[stock]
        serializer = sd(data, many=True)

        stock_name = stock_names[stock]
        model_dir = stock_name['rf']['model_dir']
        random_forest_predection = predictor_rf.predict_upper(model_dir=model_dir, n_days=7, data=qs)

        model_path = stock_name['lstm']['model_path']
        # model_2 = stock_name['lstm']['model2']
        scaler_feature_path = stock_name['lstm']['scaler_feature_path']
        scaler_target_path = stock_name['lstm']['scaler_target_path']
        lstm_predection = predictor_lstm.predict_next_day(model_path=model_path, scaler_feature_path=scaler_feature_path, scaler_target_path=scaler_target_path, data=qs)

        return Response({
            'message': 'success',
            'error': False,
            'rf_pred': random_forest_predection,
            'lstm_pred': lstm_predection,
            'data': serializer.data
        })
    
    else:
        return Response({
            'message': 'Stock name not found...',
            'error': True,
            'rf_pred': None,
            'lstm_pred': None
        })



@api_view(['GET'])
def live_stock_data(request, stock):


    if stock in live_stock_models:
        data = live_stock_models[stock].objects.order_by('-timestamp').first()
        sd = live_models_serializer[stock]
        serializer = sd(data)

    return Response(serializer.data)