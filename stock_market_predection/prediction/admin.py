from django.contrib import admin
from .models import Upper, Hbl, UpperLive, HblLive

# Register your models here.

class UpperAdmin(admin.ModelAdmin):
    list_display = ('published_date', 'open', 'high', 'low', 'close', 'status')


class HblAdmin(admin.ModelAdmin):
    list_display = ('published_date', 'open', 'high', 'low', 'close', 'status')


class UpperLiveAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'ltp', 'open', 'high', 'low', 'pr_close', 'status')


class HblLiveAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'ltp', 'open', 'high', 'low', 'pr_close', 'status')



admin.site.register(Upper, UpperAdmin)
admin.site.register(Hbl, HblAdmin)
admin.site.register(UpperLive, UpperLiveAdmin)
admin.site.register(HblLive, HblLiveAdmin)