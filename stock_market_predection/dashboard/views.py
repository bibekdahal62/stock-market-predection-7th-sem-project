from django.shortcuts import render
from django.http import HttpResponse
from nepse_data_api import Nepse
from django.contrib.auth.decorators import login_required

# Create your views here.
# nepse = Nepse()
# market_status = nepse.get_market_status()
# market_summary = nepse.get_market_summary()
# nepse_idex = nepse.get_nepse_index()
# gainers = nepse.get_top_gainers(limit=5)
# loosers = nepse.get_top_losers(limit=5)
# sectors = nepse.get_sub_indices()

# sectors = sorted(sectors, key=lambda x: x['id'])
# for s in sectors:
#     s['abs_perChange'] = abs(s['perChange'])

# max_pct = max(s['abs_perChange'] for s in sectors)

# stocks = nepse.get_stocks()

# # Sort by totalTradeQuantity (volume) in descending order
# top_9_active = sorted(
#     stocks,
#     key=lambda x: x.get('totalTradeQuantity', 0),
#     reverse=True
# )[:9]


def home(request):

    return render(request, 'dashboard/index.html', {
        'title': 'Dashboard',
    })


@login_required
def about(request):

    return render(request, 'dashboard/about.html', {
        'title': 'About Us',
    })
