from django.contrib import admin
from .models import Upper, Hbl, UpperLive, HblLive, PredictionSession, ModelMetric, DailyForecast

# Register your models here.

class UpperAdmin(admin.ModelAdmin):
    list_display = ('published_date', 'open', 'high', 'low', 'close', 'status')


class HblAdmin(admin.ModelAdmin):
    list_display = ('published_date', 'open', 'high', 'low', 'close', 'status')


class UpperLiveAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'ltp', 'open', 'high', 'low', 'pr_close', 'status')


class HblLiveAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'ltp', 'open', 'high', 'low', 'pr_close', 'status')



class ModelMetricInline(admin.TabularInline):
    model = ModelMetric
    extra = 0
    readonly_fields = ('target', 'mse', 'rmse', 'mape', 'accuracy', 'r2')

class DailyForecastInline(admin.TabularInline):
    model = DailyForecast
    extra = 0
    readonly_fields = ('day', 'open', 'high', 'low', 'close')

@admin.register(PredictionSession)
class PredictionSessionAdmin(admin.ModelAdmin):
    list_display = ('ticker', 'last_date', 'created_at', 'predicted_close', 'change', 'change_pct')
    list_filter = ('ticker',)
    search_fields = ('ticker',)
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)
    inlines = [ModelMetricInline, DailyForecastInline]

@admin.register(ModelMetric)
class ModelMetricAdmin(admin.ModelAdmin):
    list_display = ('session', 'target', 'accuracy', 'r2', 'rmse', 'mape')
    list_filter = ('target', 'session__ticker')

@admin.register(DailyForecast)
class DailyForecastAdmin(admin.ModelAdmin):
    list_display = ('session', 'day', 'open', 'high', 'low', 'close')
    list_filter = ('session__ticker',)
    ordering = ('session', 'day')



admin.site.register(Upper, UpperAdmin)
admin.site.register(Hbl, HblAdmin)
admin.site.register(UpperLive, UpperLiveAdmin)
admin.site.register(HblLive, HblLiveAdmin)