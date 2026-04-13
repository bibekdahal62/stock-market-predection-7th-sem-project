from rest_framework import serializers
from .models import Upper, Hbl

class UpperSerializer(serializers.ModelSerializer):
    class Meta:
        model = Upper
        fields = '__all__'


class HblSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hbl
        fields = '__all__'