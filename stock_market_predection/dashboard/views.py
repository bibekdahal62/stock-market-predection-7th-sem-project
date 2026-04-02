from django.shortcuts import render
from django.http import HttpResponse
from nepse_data_api import Nepse

# Create your views here.
nepse = Nepse()
market_status = nepse.get_market_status()
market_summary = nepse.get_market_summary()
nepse_idex = nepse.get_nepse_index()
gainers = nepse.get_top_gainers(limit=5)
loosers = nepse.get_top_losers(limit=5)

def home(request):

    return render(request, 'dashboard/index.html', {
        'title': 'Home',
        'market_status': market_status['isOpen'],
        'trunover': market_summary[0]['value'] / 1000000000,
        'shares': market_summary[1]['value'] / 1000000,
        'transactions': market_summary[2]['value'],
        'captalizaton': market_summary[4]['value'] / 1000000000000,
        'floatcaptalizaton': market_summary[5]['value'] / 1000000000000,
        'nepse_index': nepse_idex[1]['currentValue'],
        'nepse_index_change': nepse_idex[1]['change'],
        'nepse_index_per_change': nepse_idex[1]['perChange'],
        'gainers': gainers,
        'loosers': loosers,
    })
