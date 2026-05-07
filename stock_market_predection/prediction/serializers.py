from rest_framework import serializers
from .models import Upper, Hbl, UpperLive, HblLive, PredictionSession, DailyForecast, ModelMetric

class UpperSerializer(serializers.ModelSerializer):
    class Meta:
        model = Upper
        fields = '__all__'


class HblSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hbl
        fields = '__all__'


class UpperLiveSerializer(serializers.ModelSerializer):
    class Meta:
        model = UpperLive
        fields = '__all__'


class HblLiveSerializer(serializers.ModelSerializer):
    class Meta:
        model = HblLive
        fields = '__all__'


class ModelMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModelMetric
        fields = ["target", "mse", "rmse", "mape", "accuracy", "r2"]


class DailyForecastSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyForecast
        fields = ["day", "open", "high", "low", "close"]


class PredictionSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PredictionSession
        fields = [
            "id",
            "ticker",
            "created_at",
            "last_date",
            "last_close",
            "predicted_high",
            "predicted_low",
            "predicted_close",
            "change",
            "change_pct",
        ]