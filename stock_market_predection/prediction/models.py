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
    

from django.utils import timezone

class PredictionSession(models.Model):
    """
    Stores one full prediction run for a given ticker/date.
    Contains last known actual prices, ensemble & individual model forecasts,
    summary change stats, and per-metric accuracy scores.
    """
 
    # --- Identity ---
    ticker = models.CharField(
        max_length=20,
        default="UNKNOWN",
        help_text="Stock/asset symbol this prediction belongs to.",
    )
    created_at = models.DateTimeField(
        # default=timezone.localtime,
        db_index=True,
        help_text="Timestamp when the prediction was generated.",
    )
 
    # --- Last known actual values ---
    last_date = models.DateField(help_text="Date of the last actual trading day used as input.")
    last_high = models.FloatField()
    last_low = models.FloatField()
    last_close = models.FloatField()
 
    # --- LSTM model predictions ---
    lstm_high = models.FloatField()
    lstm_low = models.FloatField()
    lstm_close = models.FloatField()
 
    # --- GRU model predictions ---
    gru_high = models.FloatField()
    gru_low = models.FloatField()
    gru_close = models.FloatField()
 
    # --- Ensemble (combined) prediction for next day ---
    predicted_high = models.FloatField()
    predicted_low = models.FloatField()
    predicted_close = models.FloatField()
 
    # --- Change vs last close ---
    change = models.FloatField(help_text="Absolute change: predicted_close - last_close.")
    change_pct = models.FloatField(help_text="Percentage change vs last close.")
 
    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Prediction Session"
        verbose_name_plural = "Prediction Sessions"
 
    def __str__(self):
        return f"{self.ticker} | {self.last_date} | created {self.created_at:%Y-%m-%d %H:%M}"
 
 
class ModelMetric(models.Model):
    """
    Per-target (high / low / close) accuracy metrics for a PredictionSession.
    One session produces 3 rows — one per target field.
    """
 
    class Target(models.TextChoices):
        HIGH = "high", "High"
        LOW = "low", "Low"
        CLOSE = "close", "Close"
 
    session = models.ForeignKey(
        PredictionSession,
        on_delete=models.CASCADE,
        related_name="metrics",
    )
    target = models.CharField(max_length=5, choices=Target.choices)
 
    mse = models.FloatField(help_text="Mean Squared Error")
    rmse = models.FloatField(help_text="Root Mean Squared Error")
    mape = models.FloatField(help_text="Mean Absolute Percentage Error (%)")
    accuracy = models.FloatField(help_text="Model accuracy (100 - MAPE, %)")
    r2 = models.FloatField(help_text="R² coefficient of determination")
 
    class Meta:
        unique_together = ("session", "target")
        verbose_name = "Model Metric"
        verbose_name_plural = "Model Metrics"
 
    def __str__(self):
        return f"{self.session} | {self.target} | accuracy={self.accuracy}%"
 
 
class DailyForecast(models.Model):
    """
    Individual day-by-day OHLC forecasts linked to a PredictionSession.
    A 7-day forecast produces 7 rows.
    """
 
    session = models.ForeignKey(
        PredictionSession,
        on_delete=models.CASCADE,
        related_name="daily_forecasts",
    )
    day = models.PositiveSmallIntegerField(help_text="Forecast horizon day (1 = next trading day).")
 
    open = models.FloatField()
    high = models.FloatField()
    low = models.FloatField()
    close = models.FloatField()
 
    class Meta:
        unique_together = ("session", "day")
        ordering = ["session", "day"]
        verbose_name = "Daily Forecast"
        verbose_name_plural = "Daily Forecasts"
 
    def __str__(self):
        return f"{self.session} | Day {self.day} | close={self.close}"