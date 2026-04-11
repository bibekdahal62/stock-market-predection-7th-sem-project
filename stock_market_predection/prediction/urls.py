from django.urls import path
from . import views

urlpatterns = [
    path('prediction/', views.index, name='prediction'),
    path('prediction/prediction-data/<str:stock>/', views.predection_data, name='prediction_data_api'),

]