from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from nepse_data_api import Nepse
from stock_data.models import NepseIndex, NepseIndexData
from .serializers import NepseIndexSerializer, NepseIndexDataSerializer
from datetime import datetime, time, date
from django.utils import timezone


# Create your views here.
# nepse = Nepse()


@api_view(['GET'])
def stock_data(request):
    nepse = Nepse()

    nepse_index_data = nepse.get_nepse_index()
    for item in nepse_index_data:
        if item['index'] == 'NEPSE Index':
            nepse_index = item['currentValue']
            nepse_index_change = item['change']
            nepse_index_per_change = item['perChange']
            break

    status = nepse.get_market_status()
    market_summary = nepse.get_market_summary()

    gainers = nepse.get_top_gainers(limit=5)
    loosers = nepse.get_top_losers(limit=5)

    sectors = nepse.get_sub_indices()

    stocks = nepse.get_stocks()
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
    
    try:
        turnover = round(market_summary[0]['value'] / 1_000_000_000, 2)
        shares = round(market_summary[1]['value'] / 1_000_000, 2)
        transaction = market_summary[2]['value']
        scripts = market_summary[3]['value']
        # capitalization = round(market_summary[4]['value'] / 1_000_000_000_000, 2)
        # floatcapitalization = round(market_summary[5]['value'] / 1_000_000_000_000, 2)
    except Exception:
        print("exception occured")
        turnover = 0
        shares = 0
        transaction = 0
        scripts = 0
        capitalization = 0
        floatcapitalization = 0


    stocks = nepse.get_stocks()
    top_8_active = sorted(
        stocks,
        key=lambda x: x.get('totalTradeQuantity', 0),
        reverse=True
    )[:8]

    return Response({
        'nepseIndex' : nepse_index,
        'nepseValChange': nepse_index_change,
        'nepsePerChange' : nepse_index_per_change,
        'isOpen': status['isOpen'],
        'asOf': status['asOf'],
        'advancing': advancing,
        'declining': declining,
        'unchanged': unchanged,
        'total_listed': total_listed,
        'gainers': gainers,
        'loosers': loosers,
        'sectors': sectors,
        'active_stocks': top_8_active,
        'trunover': turnover,
        'shares': shares,
        'transactions': transaction,
        'scripts': scripts
        # 'captalizaton': capitalization,
        # 'floatcaptalizaton': floatcapitalization,
     })
    




# @api_view(['GET'])
# def market_index(request):
#     nepse = Nepse()
#     nepse_index_data = nepse.get_nepse_index()
#     nepse_index = nepse_index_data[3]['currentValue']
#     nepse_index_change = nepse_index_data[3]['change']
#     nepse_index_per_change = nepse_index_data[3]['perChange']
#     return Response({
#         'nepseIndex' : nepse_index,
#         'nepseValChange': nepse_index_change,
#         'nepsePerChange' : nepse_index_per_change
#     })



# @api_view(['GET'])
# def market_status(request):
#     nepse = Nepse()
#     status = nepse.get_market_status()
#     return Response({
#         'isOpen': status['isOpen'],
#         'asOf': status['asOf']
#     })



# @api_view(['GET'])
# def change_unchange_stocks(request):
#     nepse = Nepse()
#     stocks = nepse.get_stocks()
#     total_listed = len(stocks)
#     advancing = 0
#     declining = 0
#     unchanged = 0

#     for stock in stocks:
#         change = stock.get("percentageChange", 0)

#         if change == 0:
#             unchanged += 1

#         elif change >= 0:
#             advancing += 1

#         elif change <= 0:
#             declining += 1
    
#     return Response({
#         'advancing': advancing,
#         'declining': declining,
#         'unchanged': unchanged,
#         'total_listed': total_listed
#     })


# @api_view(['GET'])
# def gainers(request):
#     nepse = Nepse()
#     gainers = nepse.get_top_gainers(limit=5)
#     return Response({
#         'gainers': gainers
#     })


# @api_view(['GET'])
# def loosers(request):
#     nepse = Nepse()
#     loosers = nepse.get_top_losers(limit=5)
#     return Response({
#         'loosers': loosers
#     })


# @api_view(['GET'])
# def sectors(request):
#     nepse = Nepse()
#     sectors = nepse.get_sub_indices()
#     return Response({
#         'sectors': sectors
#     })


# @api_view(['GET'])
# def active_stocks(request):
#     nepse = Nepse()
#     stocks = nepse.get_stocks()
#     top_8_active = sorted(
#         stocks,
#         key=lambda x: x.get('totalTradeQuantity', 0),
#         reverse=True
#     )[:8]

#     return Response({
#         'active_stocks': top_8_active
#     })


@api_view(['GET'])
def index_chart(request):
    nepse_indices = NepseIndex.objects.all()
    serializer = NepseIndexSerializer(nepse_indices, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def index_chart_latest(request):
    nepse = Nepse()
    status = nepse.get_market_status()

    # now = timezone.localtime()
    # if time(11, 0) <= now.time() <= time(15, 0):
    #     status = 'OPEN'
    # else:
    #     status = 'CLOSE'

    dt_string = status['asOf']
    # today = '2026-04-02T15:00:00'
    # now = timezone.localtime()
    # today = now.date()

    # Convert string to Python datetime
    dt_object = datetime.fromisoformat(dt_string)  # 2026-04-02 15:00:00

    # Filter using only the date part
    results = NepseIndexData.objects.filter(timestamp__date=dt_object.date())
    # results = NepseIndexData.objects.filter(timestamp__date=today)

    serializer = NepseIndexDataSerializer(results, many=True)

    return Response({
        'market_status': status['isOpen'],
        'data': serializer.data
    })



@api_view(['POST'])
def fetch_and_store_nepse(request):
    # print("Fetch api called")
    nepse = Nepse()
    """
    Fetch NEPSE index and store it in the database.
    """
    now = timezone.localtime()
    nepse_index_data = nepse.get_nepse_index()
    for item in nepse_index_data:
        if item['index'] == 'NEPSE Index':
            nepse_index = item['currentValue']
            nepse_index_change = item['change']
            nepse_index_per_change = item['perChange']
            break
    
    # Optional: check market hours
    if time(11, 0) <= now.time() <= time(15, 0):
        NepseIndexData.objects.create(timestamp=now, nepse_index=nepse_index)
        return Response({"message": f"NEPSE index {nepse_index} added at {now}"})
    else:
        return Response({"message": "Market is closed."})
    