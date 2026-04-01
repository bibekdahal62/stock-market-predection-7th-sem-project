from django.contrib import admin
from .models import UPPER

# Register your models here.

class UPPERAdmin(admin.ModelAdmin):
    list_display = ('symbol', 'open_price', 'high_price', 'low_price', 'close_price', 'ltp', 'date')

admin.site.register(UPPER, UPPERAdmin)
