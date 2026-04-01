import csv
from django.core.management.base import BaseCommand
from stock_data.models import UPPER


class Command(BaseCommand):
    help = "Import stock CSV into database"

    def handle(self, *args, **kwargs):

        file_path = "stock_data/data/UPPER.csv"

        objects = []

        with open(file_path, "r") as file:
            reader = csv.DictReader(file)

            for row in reader:
                objects.append(
                    UPPER(
                        sno=row["SNo"],
                        symbol=row["Symbol"],
                        confidence=row["Confidence"],
                        open_price=row["Open"],
                        high_price=row["High"],
                        low_price=row["Low"],
                        close_price=row["Close"],
                        ltp=row["LTP"],
                        close_ltp=row["Close - LTP"],
                        close_ltp_percent=row["Close - LTP %"],
                        vwap=row["VWAP"],
                        vol=row["Vol"],
                        prev_close=row["PrevClose"],
                        turnover=row["Turnover"],
                        transactions=row["Transactions"],
                        diff=row["Diff"],
                        range_value=row["Range"],
                        change_percent=row["ChangePercent"],
                        range_percent=row["RangePercent"],
                        vwap_percent=row["VWAP %"],
                        weeks_52_high=row["Weeks52High"],
                        weeks_52_low=row["Weeks52Low"],
                        date=row["Date"],
                        days_120=row.get("Days120") or None,
                        days_180=row.get("Days180") or None,
                    )
                )

        UPPER.objects.bulk_create(objects)

        self.stdout.write(self.style.SUCCESS("✅ CSV imported successfully!"))