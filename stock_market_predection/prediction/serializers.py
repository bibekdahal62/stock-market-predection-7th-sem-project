from rest_framework import serializers
from .models import Upper, Hbl, UpperLive, HblLive

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