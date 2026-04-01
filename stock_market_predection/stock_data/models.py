from django.db import models

# Create your models here.


class UPPER(models.Model):
    sno = models.IntegerField()
    symbol = models.CharField(max_length=20)

    confidence = models.FloatField()

    open_price = models.FloatField()
    high_price = models.FloatField()
    low_price = models.FloatField()
    close_price = models.FloatField()
    ltp = models.FloatField()

    close_ltp = models.FloatField()
    close_ltp_percent = models.FloatField()

    vwap = models.FloatField()
    vol = models.FloatField()

    prev_close = models.FloatField()
    turnover = models.FloatField()
    transactions = models.IntegerField()

    diff = models.FloatField()
    range_value = models.FloatField()
    change_percent = models.FloatField()
    range_percent = models.FloatField()

    vwap_percent = models.FloatField()

    weeks_52_high = models.FloatField()
    weeks_52_low = models.FloatField()

    date = models.DateField()

    days_120 = models.FloatField(null=True, blank=True)
    days_180 = models.FloatField(null=True, blank=True)

    def __str__(self):
        return f"{self.symbol} - {self.date}"