from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from nepse_data_api import Nepse
from stock_data.models import NepseIndex, NepseIndexData, MostActiveStocks, Gainer, Loser, Sector, MarketBreadth
from .serializers import NepseIndexSerializer, NepseIndexDataSerializer, MostActiveStocksSerializer, GainerSerializer, LoserSerializer, SectorSerializer, MarketBreadthSerializer
from datetime import datetime, time, date
# from django.utils import timezone
from django.core.exceptions import ObjectDoesNotExist


from django.db.models import Subquery

from django.db.models import Subquery
import logging

logger = logging.getLogger(__name__)

# Create your views here.

@api_view(['GET'])
def stock_data(request):
    try:
        nepse = Nepse()
        status = nepse.get_market_status()

        # ---------------- NEPSE INDEX ----------------
        try:
            nepse_index_data = (
                NepseIndexData.objects
                .order_by('-timestamp')
                .first()
            )

            if nepse_index_data:
                nepse_index = nepse_index_data.nepse_index
                nepse_index_change = nepse_index_data.change
                nepse_index_per_change = nepse_index_data.percentage_change
            else:
                nepse_index = 0
                nepse_index_change = 0
                nepse_index_per_change = 0

        except Exception as e:
            logger.error(f"NEPSE index error: {e}")
            nepse_index = nepse_index_change = nepse_index_per_change = 0

        # ---------------- GAINERS / LOSERS / SECTORS ----------------
        try:
            gainers_data = Gainer.objects.order_by('-timestamp')[:5]
            loser_data = Loser.objects.order_by('-timestamp')[:5]
            sector_data = Sector.objects.order_by('-timestamp')[:7]

            gainers_serializer = GainerSerializer(gainers_data, many=True)
            loser_serializer = LoserSerializer(loser_data, many=True)
            sector_serializer = SectorSerializer(sector_data, many=True)

        except Exception as e:
            logger.error(f"Serializer data error: {e}")
            gainers_serializer = GainerSerializer([], many=True)
            loser_serializer = LoserSerializer([], many=True)
            sector_serializer = SectorSerializer([], many=True)

        # ---------------- MARKET BREADTH ----------------
        try:
            market_breadth = MarketBreadth.objects.order_by('-timestamp').first()

            if market_breadth:
                market_breadth_serializer = MarketBreadthSerializer(market_breadth)
            else:
                market_breadth_serializer = MarketBreadthSerializer(None)

        except Exception as e:
            logger.error(f"Market breadth error: {e}")
            market_breadth_serializer = MarketBreadthSerializer(None)

        # ---------------- MARKET SUMMARY ----------------
        try:
            market_summary = nepse.get_market_summary()

            turnover = round(market_summary[0]['value'] / 1_000_000_000, 2)
            shares = round(market_summary[1]['value'] / 1_000_000, 2)
            transaction = market_summary[2]['value']
            scripts = market_summary[3]['value']

        except Exception as e:
            logger.error(f"Market summary error: {e}")
            turnover = shares = transaction = scripts = 0

        # ---------------- ACTIVE STOCKS ----------------
        try:
            latest_ts = (
                MostActiveStocks.objects
                .order_by('-timestamp')
                .values('timestamp')[:1]
            )

            active_stocks = (
                MostActiveStocks.objects
                .filter(timestamp=Subquery(latest_ts))
                .order_by('-total_traded_quantity')[:5]
            )

            active_stocks_serializer = MostActiveStocksSerializer(active_stocks, many=True)

        except Exception as e:
            logger.error(f"Active stocks error: {e}")
            active_stocks_serializer = MostActiveStocksSerializer([], many=True)

        # ---------------- RESPONSE ----------------
        return Response({
            'nepseIndex': nepse_index,
            'nepseValChange': nepse_index_change,
            'nepsePerChange': nepse_index_per_change,
            'isOpen': status.get('isOpen', False),
            'asOf': status.get('asOf', None),

            'market_breadth': market_breadth_serializer.data,
            'gainers': gainers_serializer.data,
            'loosers': loser_serializer.data,
            'sectors': sector_serializer.data,
            'active_stocks': active_stocks_serializer.data,

            'turnover': turnover,
            'shares': shares,
            'transactions': transaction,
            'scripts': scripts
        })

    except Exception as e:
        logger.exception(f"Critical stock_data API failure: {e}")
        return Response({
            "error": "Failed to fetch stock data",
            "details": str(e)
        }, status=500)



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
        # print(dt_string)
        open_close = status.get('isOpen')
        if not dt_string:
            return Response({'market_status': None, 'data': None})

        # Convert to datetime
        dt_object = datetime.fromisoformat(dt_string)
        # print(dt_object)

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
        # print("Error fetching latest NEPSE data:", e)
        return Response({
            'market_status': None,
            'data': None
        })



# @api_view(['POST'])
# def fetch_and_store_nepse(request):
#     try:
#         nepse = Nepse()

#         now = timezone.localtime()
#         nepse_index_data = nepse.get_nepse_index()
#         market_summary = nepse.get_market_summary()
#         turnover = market_summary[0]['value']
#         shares = market_summary[1]['value']
#         transaction = market_summary[2]['value']
#         scripts = market_summary[3]['value']
#         for item in nepse_index_data:
#             if item['index'] == 'NEPSE Index':
#                 nepse_index = item['currentValue']
#                 change = item['change']
#                 per_change = item['perChange']
#                 close = item['close']
#                 high = item['high']
#                 low = item['low']
#                 previous_close = item['previousClose']
#                 fiftyTwoWeekHigh = item['fiftyTwoWeekHigh']
#                 fiftyTwoWeekLow = item['fiftyTwoWeekLow']
#                 break
        
#         # Optional: check market hours
#         if time(11, 0) <= now.time() <= time(15, 0):
#             NepseIndexData.objects.create(timestamp=now, nepse_index=nepse_index, change= change, percentage_change=per_change, high=high, low=low, close=close, prevously_closed=previous_close, fift_two_week_high=fiftyTwoWeekHigh, fift_two_week_low=fiftyTwoWeekLow)
            
#             return Response({"message": f"NEPSE index {nepse_index} added at {now}"})
#         else:
#             message = "No action taken"
#             if time(15, 0) <= now.time() <= time(15, 1):
#                 NepseIndex.objects.create(date=now.date(), close=nepse_index, high= high, low=low, absolute_change=change, percentage_change=per_change, week_52_high= fiftyTwoWeekHigh, week_52_low= fiftyTwoWeekLow, turnover_values=turnover, turnover_volume=shares, total_transaction=transaction, scripts=scripts)
#                 message = 'Done'
#             return Response({"message": f"Market is closed. and {message} at {now.date()}"})
#     except Exception as e:
#         return Response({"message": 'Error occured - '+str(e)})
    