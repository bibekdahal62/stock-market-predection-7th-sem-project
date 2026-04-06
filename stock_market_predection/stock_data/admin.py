from django.contrib import admin
from .models import UPPER, NepseIndex, NepseIndexData, MostActiveStocks

# Register your models here.

class UPPERAdmin(admin.ModelAdmin):
    list_display = ('symbol', 'open_price', 'high_price', 'low_price', 'close_price', 'ltp', 'date')


class NepseIndexAdmin(admin.ModelAdmin):
    list_display = ('date', 'close', 'high', 'low', 'absolute_change', 'percentage_change')
    ordering = ('-date',)

class NepseIndexDataAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'nepse_index', 'change', 'percentage_change', 'close', 'high', 'low')


class MostActiveStocksAdmin(admin.ModelAdmin):
    list_display = (
        'timestamp',
        'security_id',
        'name',
        'symbol',
        'ltp',
        'percentage_change',
        'previous_close',
        'total_traded_quantity',
    )

    list_filter = ('timestamp','total_traded_quantity')
    search_fields = ('name', 'symbol', 'security_id')
    ordering = ('-timestamp',)


admin.site.register(UPPER, UPPERAdmin)
admin.site.register(NepseIndex, NepseIndexAdmin)
admin.site.register(NepseIndexData, NepseIndexDataAdmin)
admin.site.register(MostActiveStocks, MostActiveStocksAdmin)
