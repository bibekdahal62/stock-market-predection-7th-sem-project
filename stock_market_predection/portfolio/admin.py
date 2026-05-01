from django.contrib import admin
from .models import PortfolioItem

@admin.register(PortfolioItem)
class PortfolioItemAdmin(admin.ModelAdmin):
    list_display  = ('user', 'symbol', 'buy_price', 'quantity', 'added_at')
    list_filter   = ('symbol',)
    search_fields = ('user__username', 'user__email', 'symbol')
    ordering      = ('-added_at',)
    readonly_fields = ('added_at',)