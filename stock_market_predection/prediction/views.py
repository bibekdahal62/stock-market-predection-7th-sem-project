from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from pathlib import Path
import pandas as pd
from . import predictor_lstm, predictor_rf
import os
from .models import Upper


# Create your views here.
BASE= Path(__file__).resolve().parent.parent
print(BASE)

def index(request):

    return render(request, 'prediction/pred.html', {

    })


stock_names = {
    'upper':{
        'rf':{
            'model_dir': os.path.join(BASE, 'prediction','saved_models', 'upper')
        }, 
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

@api_view(['GET'])
def predection_data(request, stock):

    if stock in stock_names:

        qs = Upper.objects.all().values()   # gets dict with field names

        stock_name = stock_names[stock]
        model_dir = stock_name['rf']['model_dir']
        random_forest_predection = predictor_rf.predict_upper(model_dir=model_dir, n_days=5, data=qs)

        model_path = stock_name['lstm']['model_path']
        scaler_feature_path = stock_name['lstm']['scaler_feature_path']
        scaler_target_path = stock_name['lstm']['scaler_target_path']
        lstm_predection = predictor_lstm.predict_next_day(model_path=model_path, scaler_feature_path=scaler_feature_path, scaler_target_path=scaler_target_path, data=qs)

        return Response({
            'message': 'success',
            'error': False,
            'rf_pred': random_forest_predection,
            'lstm_pred': lstm_predection,
        })
    
    else:
        return Response({
            'message': 'Stock name not found...',
            'error': True
        })