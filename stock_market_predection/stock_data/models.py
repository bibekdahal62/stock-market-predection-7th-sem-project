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
    

class NepseIndex(models.Model):
   
    date = models.DateField()

    close = models.DecimalField(max_digits=10, decimal_places=2)
    high = models.DecimalField(max_digits=10, decimal_places=2)
    low = models.DecimalField(max_digits=10, decimal_places=2)

    absolute_change = models.DecimalField(max_digits=10, decimal_places=2)
    percentage_change = models.DecimalField(max_digits=6, decimal_places=2)

    week_52_high = models.DecimalField(max_digits=10, decimal_places=2)
    week_52_low = models.DecimalField(max_digits=10, decimal_places=2)

    turnover_values = models.DecimalField(max_digits=20, decimal_places=2)
    turnover_volume = models.BigIntegerField()
    total_transaction = models.BigIntegerField()
    scripts = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return f"{self.date} - {self.close}"


class NepseIndexData(models.Model):
    timestamp = models.DateTimeField()  # manual date & time
    nepse_index = models.DecimalField(max_digits=10, decimal_places=2)
    change = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    percentage_change = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    close = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    high = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    low = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    prevously_closed = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    fift_two_week_high = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    fift_two_week_low = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.timestamp} - {self.nepse_index} - {self.change} - {self.percentage_change}"
    

class MostActiveStocks(models.Model):
    timestamp = models.DateTimeField()
    security_id = models.IntegerField()
    name = models.CharField(max_length=100)
    symbol = models.CharField(max_length=12)
    ltp = models.DecimalField(max_digits=20, decimal_places=2)
    percentage_change = models.DecimalField(max_digits=20, decimal_places=2)
    previous_close = models.DecimalField(max_digits=20, decimal_places=2)
    total_traded_quantity = models.BigIntegerField()



