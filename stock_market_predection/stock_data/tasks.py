from django.utils import timezone
from nepse_data_api import Nepse
from datetime import time
from .models import MostActiveStocks, NepseIndexData, NepseIndex, Gainer, Loser, Sector, MarketBreadth
from django.db import transaction
from prediction.models import Upper, Hbl, UpperLive, HblLive
import logging
logger = logging.getLogger(__name__)


def store_data():
    now = timezone.localtime()

    # ✅ Only run during market days/times
    if not (now.weekday() < 5 and time(11, 0) <= now.time() <= time(15, 2)):
        logger.info("Outside market time. Skipping data store.")
        return

    try:
        nepse = Nepse()
        status = nepse.get_market_status()

        # if status.get('isopen') == False:
        #     logger.info('Market is currently close due to National Holiday....')
        #     return
        
        # -------- API CALLS (protected) --------
        try:
            stocks = nepse.get_stocks()
            nepse_index_data = nepse.get_nepse_index()
            market_summary = nepse.get_market_summary()
            gainers = nepse.get_top_gainers(limit=5)
            loosers = nepse.get_top_losers(limit=5)
            sectors = nepse.get_sub_indices()

            stocks = nepse.get_stocks()
            total_listed = len(stocks)
            advancing = 0
            declining = 0
            unchanged = 0
            postitive_circuit = 0
            negative_circuit = 0

            for stock in stocks:
                change = stock.get("percentageChange", 0)

                if change == 0:
                    unchanged += 1

                elif change >= 0:
                    advancing += 1

                elif change <= 0:
                    declining += 1

                elif change >=9.8:
                    postitive_circuit += 1

                elif change <= -9.8:
                    negative_circuit += 1
            
        except Exception as e:
            logger.error(f"Failed to fetch data from NEPSE API: {e}")
            return

        # -------- Safe extraction from market summary --------
        try:
            turnover = market_summary[0].get('value', 0)
            shares = market_summary[1].get('value', 0)
            transaction_count = market_summary[2].get('value', 0)
            scripts = market_summary[3].get('value', 0)
        except Exception as e:
            logger.error(f"Market summary parsing error: {e}")
            return

        # -------- Top 10 active stocks --------
        top_10_active = sorted(
            stocks,
            key=lambda x: x.get('totalTradeQuantity', 0),
            reverse=True
        )[:5]

        # -------- Extract NEPSE index safely --------
        nepse_index = change = per_change = close = high = low = previous_close = fiftyTwoWeekHigh = fiftyTwoWeekLow = None

        for item in nepse_index_data:
            if item.get('index') == 'NEPSE Index':
                nepse_index = item.get('currentValue')
                change = item.get('change')
                per_change = item.get('perChange')
                close = item.get('close')
                high = item.get('high')
                low = item.get('low')
                previous_close = item.get('previousClose')
                fiftyTwoWeekHigh = item.get('fiftyTwoWeekHigh')
                fiftyTwoWeekLow = item.get('fiftyTwoWeekLow')
                break

        if nepse_index is None:
            logger.error("NEPSE Index data not found.")
            return

        # -------- DATABASE OPERATIONS (atomic) --------
        with transaction.atomic():

            # Store Most Active Stocks (11:00–15:00)
            if time(11, 0) <= now.time() <= time(15, 0):
                logger.info("Market is active. Storing data...")
                for stock in top_10_active:
                    MostActiveStocks.objects.create(
                        timestamp=now,
                        name=stock.get('securityName'),
                        symbol=stock.get('symbol'),
                        ltp=stock.get('lastTradedPrice'),
                        percentage_change=stock.get('percentageChange'),
                        previous_close=stock.get('previousClose'),
                        total_traded_quantity=stock.get('totalTradeQuantity'),
                        security_id=stock.get('securityId')
                    )
                logger.info("Top 10 active stocks stored.")

                NepseIndexData.objects.create(
                    timestamp=now,
                    nepse_index=nepse_index,
                    change=change,
                    percentage_change=per_change,
                    high=high,
                    low=low,
                    close=close,
                    prevously_closed=previous_close,
                    fift_two_week_high=fiftyTwoWeekHigh,
                    fift_two_week_low=fiftyTwoWeekLow
                )
                logger.info("NEPSE index snapshot stored.")

                for g in gainers:
                    Gainer.objects.create(
                        timestamp=now,
                        symbol=g['symbol'],
                        security_name=g['securityName'],
                        security_id=g['securityId'],
                        ltp=g['ltp'],
                        cp=g['cp'],
                        point_change=g['pointChange'],
                        percentage_change=g['percentageChange'],
                    )
                logger.info("Gainers snapshot stored.")


                for l in loosers:
                    Loser.objects.create(
                        timestamp=now,
                        symbol=l['symbol'],
                        security_name=l['securityName'],
                        security_id=l['securityId'],
                        ltp=l['ltp'],
                        cp=l['cp'],
                        point_change=l['pointChange'],
                        percentage_change=l['percentageChange'],
                    )
                logger.info("Losers snapshot stored.")


                IMPORTANT_SECTORS = {
                    "Banking SubIndex",
                    "HydroPower Index",
                    "Life Insurance",
                    "Non Life Insurance",
                    "Development Bank Index",
                    "Hotels And Tourism Index",
                    "Mutual Fund"
                }



                for s in sectors:
                    if s.get('index') not in IMPORTANT_SECTORS:
                        continue

                    Sector.objects.create(
                        timestamp=now,
                        sector_id=s.get('id'),
                        index_name=s.get('index'),
                        current_value=s.get('currentValue'),
                        change=s.get('change'),
                        percentage_change=s.get('perChange'),
                    )
                logger.info("Sector snapshot stored.")

                MarketBreadth.objects.create(
                    timestamp=now,
                    total_listed=total_listed,
                    advancing=advancing,
                    declining=declining,
                    unchanged=unchanged,
                    positive_circuit=postitive_circuit,
                    negative_circuit=negative_circuit,
                )
                logger.info("Market Breadth snapshot stored.")

                for stock in stocks:
                    if stock['symbol'] == 'UPPER':
                        UpperLive.objects.create(
                            timestamp = now,
                            current= stock[''],
                            open = stock['openPrice'],
                            high=stock['highPrice'],
                            low= stock['lowPrice'],
                            close= stock['lastTradedPrice'],
                            per_change=stock['percentageChange'],
                            traded_quantity= stock['totalTradeQuantity'],
                            traded_amount=stock['totalTradeValue'],
                            status = -1 if per_change < 0 else (1 if per_change > 0 else 0)
                            )
                    elif stock['symbol'] == 'HBL':
                        HblLive.objects.create(
                            timestamp = now,
                            current= stock[''],
                            open = stock['openPrice'],
                            high=stock['highPrice'],
                            low= stock['lowPrice'],
                            close= stock['lastTradedPrice'],
                            per_change=stock['percentageChange'],
                            traded_quantity= stock['totalTradeQuantity'],
                            traded_amount=stock['totalTradeValue'],
                            status = -1 if per_change < 0 else (1 if per_change > 0 else 0)
                            )
                logger.info("Live stock stock summary stored...")

            # Store end-of-day summary (15:00–15:01)
            if time(15, 0) <= now.time() <= time(15, 1):
                NepseIndex.objects.create(
                    date=now.date(),
                    close=nepse_index,
                    high=high,
                    low=low,
                    absolute_change=change,
                    percentage_change=per_change,
                    week_52_high=fiftyTwoWeekHigh,
                    week_52_low=fiftyTwoWeekLow,
                    turnover_values=turnover,
                    turnover_volume=shares,
                    total_transaction=transaction_count,
                    scripts=scripts
                )
                logger.info("End-of-day NEPSE summary stored.")

                for stock in stocks:
                    if stock['symbol'] == 'UPPER':
                        Upper.objects.create(
                            published_date = now.date(),
                            open = stock['openPrice'],
                            high=stock['highPrice'],
                            low= stock['lowPrice'],
                            close= stock['lastTradedPrice'],
                            per_change=stock['percentageChange'],
                            traded_quantity= stock['totalTradeQuantity'],
                            traded_amount=stock['totalTradeValue'],
                            status = -1 if per_change < 0 else (1 if per_change > 0 else 0)
                            )
                    elif stock['symbol'] == 'HBL':
                        Hbl.objects.create(
                            published_date = now.date(),
                            open = stock['openPrice'],
                            high=stock['highPrice'],
                            low= stock['lowPrice'],
                            close= stock['lastTradedPrice'],
                            per_change=stock['percentageChange'],
                            traded_quantity= stock['totalTradeQuantity'],
                            traded_amount=stock['totalTradeValue'],
                            status = -1 if per_change < 0 else (1 if per_change > 0 else 0)
                            )
                logger.info("End of day stock summary stored...")
                        
    except Exception as e:
        logger.exception(f"Unexpected error in store_data(): {e}")

     
