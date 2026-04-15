from django.contrib import admin
from .models import UPPER, NepseIndex, NepseIndexData, MostActiveStocks, Gainer, Loser, Sector, MarketBreadth

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



class GainerAdmin(admin.ModelAdmin):
    list_display = (
        'timestamp',
        'symbol',
        'security_name',
        'security_id',
        'ltp',
        'cp',
        'point_change',
        'percentage_change',
    )
    ordering = ('-timestamp', '-percentage_change')
    search_fields = ('symbol', 'security_name')
    list_filter = ('timestamp',)



class LoserAdmin(admin.ModelAdmin):
    list_display = (
        'timestamp',
        'symbol',
        'security_name',
        'security_id',
        'ltp',
        'cp',
        'point_change',
        'percentage_change',
    )
    ordering = ('-timestamp', 'percentage_change')
    search_fields = ('symbol', 'security_name')
    list_filter = ('timestamp',)



class SectorAdmin(admin.ModelAdmin):
    list_display = (
        'timestamp',
        'sector_id',
        'index_name',
        'current_value',
        'change',
        'percentage_change',
    )
    ordering = ('-timestamp',)
    search_fields = ('index_name',)
    list_filter = ('timestamp',)



class MarketBreadthAdmin(admin.ModelAdmin):
    list_display = (
        'timestamp',
        'total_listed',
        'advancing',
        'declining',
        'unchanged',
        'positive_circuit',
        'negative_circuit',
    )

    ordering = ('-timestamp',)

    list_filter = ('timestamp',)

    search_fields = ('timestamp',)




admin.site.register(UPPER, UPPERAdmin)
admin.site.register(NepseIndex, NepseIndexAdmin)
admin.site.register(NepseIndexData, NepseIndexDataAdmin)
admin.site.register(MostActiveStocks, MostActiveStocksAdmin)
admin.site.register(Gainer, GainerAdmin)
admin.site.register(Loser, LoserAdmin)
admin.site.register(Sector, SectorAdmin)
admin.site.register(MarketBreadth, MarketBreadthAdmin)
