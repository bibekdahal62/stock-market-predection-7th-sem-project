from django.urls import path
from .import views

urlpatterns = [
    path('portfolio/', views.portfolio_view, name='portfolio'),
    path('api/ltp/', views.api_ltp, name='api_ltp'),
    path('api/holdings/', views.api_portfolio_list, name='api_portfolio_list'),
    path('api/holdings/add/', views.api_portfolio_add, name='api_portfolio_add'),
    path('api/holdings/<int:item_id>/delete/', views.api_portfolio_delete, name='api_portfolio_delete'),
    
]

