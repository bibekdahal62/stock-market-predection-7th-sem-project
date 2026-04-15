from django.urls import path
from . import views

urlpatterns = [
    # path('market-index/', views.market_index),
    # path('market-status/', views.market_status),
    # path('stocks-status/', views.change_unchange_stocks),
    # path('gainers/', views.gainers),
    # path('loosers/', views.loosers),
    # path('sectors/', views.sectors),
    # path('active-stocks/', views.active_stocks),
    path('index-chart/', views.index_chart),
    path('latest-chart/', views.index_chart_latest),
    # path('fetch-nepse/', views.fetch_and_store_nepse, name='fetch-nepse'),
    path('stock-data/', views.stock_data, name='stock_data')

]