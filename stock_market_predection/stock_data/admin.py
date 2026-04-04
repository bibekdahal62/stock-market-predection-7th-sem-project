from django.contrib import admin
from .models import UPPER, NepseIndex, NepseIndexData

# Register your models here.

class UPPERAdmin(admin.ModelAdmin):
    list_display = ('symbol', 'open_price', 'high_price', 'low_price', 'close_price', 'ltp', 'date')


class NepseIndexAdmin(admin.ModelAdmin):
    list_display = ('date', 'close', 'high', 'low', 'absolute_change', 'percentage_change')
    ordering = ('-date',)

class NepseIndexDataAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'nepse_index')


admin.site.register(UPPER, UPPERAdmin)
admin.site.register(NepseIndex, NepseIndexAdmin)

admin.site.register(NepseIndexData, NepseIndexDataAdmin)
