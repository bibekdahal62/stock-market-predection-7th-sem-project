from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from nepse_data_api import Nepse
from stock_data.models import NepseIndex, NepseIndexData, MostActiveStocks
from .serializers import NepseIndexSerializer, NepseIndexDataSerializer, MostActiveStocksSerializer
from datetime import datetime, time, date
from django.utils import timezone
from django.core.exceptions import ObjectDoesNotExist



# Create your views here.

@api_view(['GET'])
def stock_data(request):
    nepse = Nepse()

    nepse_index_data = nepse.get_nepse_index()
    # print(nepse_index_data)
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

    except Exception:
        turnover = 0
        shares = 0
        transaction = 0
        scripts = 0


    top_10_active = sorted(
        stocks,
        key=lambda x: x.get('totalTradeQuantity', 0),
        reverse=True
    )[:10]
    
    if top_10_active:
        now = timezone.localtime()
        for stock in top_10_active:
            MostActiveStocks.objects.create(timestamp= now, name=stock['securityName'], symbol= stock['symbol'], ltp= stock['lastTradedPrice'], percentage_change=stock['percentageChange'], previous_close= stock['previousClose'], total_traded_quantity= stock['totalTradeQuantity'], security_id=stock['securityId'])
    else:
        try:
            now = MostActiveStocks.objects.latest('timestamp').timestamp
        except ObjectDoesNotExist:
            # Database empty → no data to return
            active_stocks_serializer = []
            now = None    

    active_stocks = MostActiveStocks.objects.filter(timestamp= now).order_by('-total_traded_quantity')[:10]
    active_stocks_serializer = MostActiveStocksSerializer(active_stocks, many=True)

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
        'active_stocks': active_stocks_serializer.data,
        'trunover': turnover,
        'shares': shares,
        'transactions': transaction,
        'scripts': scripts
     })
    



@api_view(['GET'])
def index_chart(request):
    try:
        nepse_indices = NepseIndex.objects.order_by('-date')
        if not nepse_indices.exists():
            # Table is empty
            return Response(None)
        serializer = NepseIndexSerializer(nepse_indices, many=True)
        return Response(serializer.data)
    except ObjectDoesNotExist:
        # Just in case
        return Response(None)
    except Exception:
        # Optional: log error
        return Response(None)



@api_view(['GET'])
def index_chart_latest(request):
    try:
        nepse = Nepse()
        status = nepse.get_market_status()  # fetch current market status

        dt_string = status.get('asOf')
        if not dt_string:
            return Response({'market_status': None, 'data': None})

        # Convert to datetime
        dt_object = datetime.fromisoformat(dt_string)

        # Fetch today's NEPSE data
        results = NepseIndexData.objects.filter(timestamp__date=dt_object.date())

        if not results.exists():
            return Response({
                'market_status': status.get('isOpen'),
                'data': None
            })

        serializer = NepseIndexDataSerializer(results, many=True)

        return Response({
            'market_status': status.get('isOpen'),
            'data': serializer.data
        })

    except Exception as e:
        # Optional: log the error
        print("Error fetching latest NEPSE data:", e)
        return Response({
            'market_status': None,
            'data': None
        })



@api_view(['POST'])
def fetch_and_store_nepse(request):
    try:
        nepse = Nepse()

        now = timezone.localtime()
        nepse_index_data = nepse.get_nepse_index()
        market_summary = nepse.get_market_summary()
        turnover = market_summary[0]['value']
        shares = market_summary[1]['value']
        transaction = market_summary[2]['value']
        scripts = market_summary[3]['value']
        for item in nepse_index_data:
            if item['index'] == 'NEPSE Index':
                nepse_index = item['currentValue']
                change = item['change']
                per_change = item['perChange']
                close = item['close']
                high = item['high']
                low = item['low']
                previous_close = item['previousClose']
                fiftyTwoWeekHigh = item['fiftyTwoWeekHigh']
                fiftyTwoWeekLow = item['fiftyTwoWeekLow']
                break
        
        # Optional: check market hours
        if time(11, 0) <= now.time() <= time(15, 0):
            NepseIndexData.objects.create(timestamp=now, nepse_index=nepse_index, change= change, percentage_change=per_change, high=high, low=low, close=close, prevously_closed=previous_close, fift_two_week_high=fiftyTwoWeekHigh, fift_two_week_low=fiftyTwoWeekLow)
            
            return Response({"message": f"NEPSE index {nepse_index} added at {now}"})
        else:
            message = "No action taken"
            if time(15, 0) <= now.time() <= time(15, 1):
                NepseIndex.objects.create(date=now.date(), close=nepse_index, high= high, low=low, absolute_change=change, percentage_change=per_change, week_52_high= fiftyTwoWeekHigh, week_52_low= fiftyTwoWeekLow, turnover_values=turnover, turnover_volume=shares, total_transaction=transaction, scripts=scripts)
                message = 'Done'
            return Response({"message": f"Market is closed. and {message} at {now.date()}"})
    except Exception as e:
        return Response({"message": 'Error occured - '+str(e)})
    