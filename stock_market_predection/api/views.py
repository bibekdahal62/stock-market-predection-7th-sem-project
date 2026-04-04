from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from nepse_data_api import Nepse
from stock_data.models import NepseIndex, NepseIndexData
from .serializers import NepseIndexSerializer, NepseIndexDataSerializer
from datetime import datetime, time
from django.utils import timezone


# Create your views here.
nepse = Nepse()
stocks = nepse.get_stocks()
status = nepse.get_market_status()

@api_view(['GET'])
def market_index(request):
    nepse_index_data = nepse.get_nepse_index()
    nepse_index = nepse_index_data[1]['currentValue']
    nepse_index_change = nepse_index_data[1]['change']
    nepse_index_per_change = nepse_index_data[1]['perChange']
    return Response({
        'nepseIndex' : nepse_index,
        'nepseValChange': nepse_index_change,
        'nepsePerChange' : nepse_index_per_change
    })



@api_view(['GET'])
def market_status(request):
    
    return Response({
        'isOpen': status['isOpen'],
        'asOf': status['asOf']
    })



@api_view(['GET'])
def change_unchange_stocks(request):
    total_listed = len(stocks)
    advancing = 0
    declining = 0
    unchanged = 0

    for stock in stocks:
        change = stock.get("percentageChange", 0)

        if change == 0:
            unchanged += 1

        elif change >= 0:
            advancing += 1

        elif change <= 0:
            declining += 1
    
    return Response({
        'advancing': advancing,
        'declining': declining,
        'unchanged': unchanged,
        'total_listed': total_listed
    })


@api_view(['GET'])
def gainers(request):
    gainers = nepse.get_top_gainers(limit=5)
    return Response({
        'gainers': gainers
    })


@api_view(['GET'])
def loosers(request):
    loosers = nepse.get_top_losers(limit=5)
    return Response({
        'loosers': loosers
    })


@api_view(['GET'])
def sectors(request):
    sectors = nepse.get_sub_indices()
    return Response({
        'sectors': sectors
    })


@api_view(['GET'])
def active_stocks(request):
    top_9_active = sorted(
        stocks,
        key=lambda x: x.get('totalTradeQuantity', 0),
        reverse=True
    )[:9]

    return Response({
        'active_stocks': top_9_active
    })


@api_view(['GET'])
def index_chart(request):
    nepse_indices = NepseIndex.objects.all()
    serializer = NepseIndexSerializer(nepse_indices, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def index_chart_latest(request):
    dt_string = status['asOf']

    # Convert string to Python datetime
    dt_object = datetime.fromisoformat(dt_string)  # 2026-04-02 15:00:00

    # Filter using only the date part
    results = NepseIndexData.objects.filter(timestamp__date=dt_object.date())

    serializer = NepseIndexDataSerializer(results, many=True)

    return Response({
        'market_status': status['isOpen'],
        'data': serializer.data
    })



@api_view(['POST'])
def fetch_and_store_nepse(request):
    # print("Fetch api called")
    """
    Fetch NEPSE index and store it in the database.
    """
    now = timezone.localtime()
    nepse_index_data = nepse.get_nepse_index()
    nepse_index = nepse_index_data[1]['currentValue']
    # Optional: check market hours
    if time(11, 0) <= now.time() <= time(15, 0):
        NepseIndexData.objects.create(timestamp=now, nepse_index=nepse_index)
        return Response({"message": f"NEPSE index {nepse_index} added at {now}"})
    else:
        return Response({"message": "Market is closed."})
    