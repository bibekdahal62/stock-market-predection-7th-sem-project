from django.contrib import admin
from .models import Upper, Hbl

# Register your models here.

class UpperAdmin(admin.ModelAdmin):
    list_display = ('published_date', 'open', 'high', 'low', 'close', 'status')


class HblAdmin(admin.ModelAdmin):
    list_display = ('published_date', 'open', 'high', 'low', 'close', 'status')



admin.site.register(Upper, UpperAdmin)
admin.site.register(Hbl, HblAdmin)