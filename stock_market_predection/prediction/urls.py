from django.urls import path
from . import views

urlpatterns = [
    path('prediction/', views.index, name='prediction'),
    # path('prediction/prediction-data/<str:stock>/', views.predection_data, name='prediction_data_api'),
    path('prediction/live-stock-data/<str:stock>/', views.live_stock_data, name='live_stock_data'),
    path('prediction/prediction-data/<str:stock>/', views.prediction_data_, name='prediction_data_api'),
    path('prediction/all-prediction-data/<str:stock>/', views.all_prediction_data, name='all_prediction_data_api'),

]