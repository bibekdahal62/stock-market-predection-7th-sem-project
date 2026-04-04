from rest_framework import serializers
from stock_data.models import NepseIndex, NepseIndexData

class NepseIndexSerializer(serializers.ModelSerializer):
    class Meta:
        model = NepseIndex
        fields = '__all__'


class NepseIndexDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = NepseIndexData
        fields = '__all__'