from django.db import models

# Create your models here.


class Upper(models.Model):
    published_date = models.DateField()
    open = models.FloatField()
    high = models.FloatField()
    low = models.FloatField()
    close = models.FloatField()
    per_change = models.FloatField()
    traded_quantity = models.FloatField()
    traded_amount = models.DecimalField(max_digits=15, decimal_places=2)
    status = models.IntegerField()

    class Meta:
        db_table = "upper"
        ordering = ["-published_date"]
        verbose_name = "Upper"
        verbose_name_plural = "Upper"

    def __str__(self):
        return f"{self.published_date} - {self.close}"




class Hbl(models.Model):
    published_date = models.DateField()
    open = models.FloatField()
    high = models.FloatField()
    low = models.FloatField()
    close = models.FloatField()
    per_change = models.FloatField()
    traded_quantity = models.FloatField()
    traded_amount = models.DecimalField(max_digits=15, decimal_places=2)
    status = models.IntegerField()

    class Meta:
        db_table = "hbl"
        ordering = ["-published_date"]
        verbose_name = "Hbl"
        verbose_name_plural = "Hbl"

    def __str__(self):
        return f"{self.published_date} - {self.close}"
    


class UpperLive(models.Model):
    timestamp = models.DateTimeField()
    ltp = models.FloatField(null=True, blank=True)
    open = models.FloatField()
    high = models.FloatField()
    low = models.FloatField()
    pr_close = models.FloatField()
    per_change = models.FloatField()
    traded_quantity = models.FloatField()
    traded_amount = models.DecimalField(max_digits=15, decimal_places=2)
    status = models.IntegerField()

    class Meta:
        db_table = "upperLive"
        ordering = ["-timestamp"]
        verbose_name = "UpperLive"
        verbose_name_plural = "UpperLive"

    def __str__(self):
        return f"{self.timestamp} - {self.pr_close}"
    


class HblLive(models.Model):
    timestamp = models.DateTimeField()
    ltp = models.FloatField(null=True, blank=True)
    open = models.FloatField()
    high = models.FloatField()
    low = models.FloatField()
    pr_close = models.FloatField()
    per_change = models.FloatField()
    traded_quantity = models.FloatField()
    traded_amount = models.DecimalField(max_digits=15, decimal_places=2)
    status = models.IntegerField()

    class Meta:
        db_table = "HblLive"
        ordering = ["-timestamp"]
        verbose_name = "HblLive"
        verbose_name_plural = "HblLive"

    def __str__(self):
        return f"{self.timestamp} - {self.pr_close}"