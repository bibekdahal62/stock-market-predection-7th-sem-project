from rest_framework import serializers
from stock_data.models import NepseIndex, NepseIndexData, MostActiveStocks, Gainer, Loser, Sector, MarketBreadth

class NepseIndexSerializer(serializers.ModelSerializer):
    class Meta:
        model = NepseIndex
        fields = '__all__'


class NepseIndexDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = NepseIndexData
        fields = '__all__'


class MostActiveStocksSerializer(serializers.ModelSerializer):
    class Meta:
        model = MostActiveStocks
        fields = '__all__'


class GainerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gainer
        fields = '__all__'
    

class LoserSerializer(serializers.ModelSerializer):
    class Meta:
        model = Loser
        fields = '__all__'


class SectorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sector
        fields = '__all__'



class MarketBreadthSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketBreadth
        fields = '__all__'