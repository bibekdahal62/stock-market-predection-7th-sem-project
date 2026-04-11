import csv
from django.core.management.base import BaseCommand
from stock_data.models import UPPER, NepseIndex

from prediction.models import Upper, Hbl


class Command(BaseCommand):
    help = "Import stock CSV into database"

    def handle(self, *args, **kwargs):

        file_path = "stock_data/data/UPPER.csv"

        objects = []

        with open(file_path, "r") as file:
            reader = csv.DictReader(file)

            for row in reader:
                objects.append(
                    # UPPER(
                    #     sno=row["SNo"],
                    #     symbol=row["Symbol"],
                    #     confidence=row["Confidence"],
                    #     open_price=row["Open"],
                    #     high_price=row["High"],
                    #     low_price=row["Low"],
                    #     close_price=row["Close"],
                    #     ltp=row["LTP"],
                    #     close_ltp=row["Close - LTP"],
                    #     close_ltp_percent=row["Close - LTP %"],
                    #     vwap=row["VWAP"],
                    #     vol=row["Vol"],
                    #     prev_close=row["PrevClose"],
                    #     turnover=row["Turnover"],
                    #     transactions=row["Transactions"],
                    #     diff=row["Diff"],
                    #     range_value=row["Range"],
                    #     change_percent=row["ChangePercent"],
                    #     range_percent=row["RangePercent"],
                    #     vwap_percent=row["VWAP %"],
                    #     weeks_52_high=row["Weeks52High"],
                    #     weeks_52_low=row["Weeks52Low"],
                    #     date=row["Date"],
                    #     days_120=row.get("Days120") or None,
                    #     days_180=row.get("Days180") or None,
                    
                #     NepseIndex(
                #         # sn=row["SN"],
                #         date=row["Date"],

                #         close=row["Close"],
                #         high=row["High"],
                #         low=row["Low"],
                #         absolute_change=row["Absolute Change"],
                #         percentage_change=row["Percentage Change"].replace('%', '').strip(),
                #         week_52_high=row["52 Weeks High"],
                #         week_52_low=row["52 Weeks Low"],
                #         turnover_values=row["Turnover Values"],
                #         turnover_volume=row["Turnover Volume"],
                #         total_transaction=row["Total Transaction"],
                # )

                Upper(
                    published_date = row["published_date"],

                    open = row["open"],
                    high = row["high"],
                    low = row["low"],
                    close = row["close"],

                    per_change = row["per_change"],

                    traded_quantity = row["traded_quantity"],
                    traded_amount = row["traded_amount"],

                    status = row["status"],
                )
            )

        Upper.objects.bulk_create(objects)

        self.stdout.write(self.style.SUCCESS("✅ CSV imported successfully!"))