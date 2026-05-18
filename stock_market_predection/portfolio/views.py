from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
import json

from stock_data.models import StockData
from .models import PortfolioItem


@login_required
def portfolio_view(request):
    return render(request, 'portfolio/portfolio.html', {
        'title': 'Portfolio - Hamro Stock',
    })


@login_required
@require_http_methods(["GET"])
def api_ltp(request):
    """
    GET /portfolio/api/ltp/?symbol=NABIL
    Returns latest LTP for a symbol from StockData.
    """
    symbol = request.GET.get('symbol', '').strip().upper()
    if not symbol:
        return JsonResponse({'error': 'symbol is required'}, status=400)

    entry = (
        StockData.objects
        .filter(symbol=symbol)
        .order_by('-timestamp')
        .first()
    )

    if entry is None:
        return JsonResponse({'error': f'No data found for symbol: {symbol}'}, status=404)

    return JsonResponse({
        'symbol':         entry.symbol,
        'ltp':            float(entry.ltp),
        'change_percent': float(entry.change_percent),
        'up':             entry.up,
        'open':           entry.open,
        'high':           entry.high,
        'low':            entry.low,
        'previous_close': float(entry.previous_close) if entry.previous_close else None,
        'traded_quantity': entry.traded_quantity,
        'traded_amount':  float(entry.traded_amount) if entry.traded_amount else None,
        'timestamp':      entry.timestamp.isoformat(),
    })


@login_required
@require_http_methods(["GET"])
def api_portfolio_list(request):
    """
    GET /portfolio/api/holdings/
    Returns all holdings for the logged-in user with live LTP.
    """
    items = PortfolioItem.objects.filter(user=request.user)
    data = []

    for item in items:
        latest = (
            StockData.objects
            .filter(symbol=item.symbol)
            .order_by('-timestamp')
            .first()
        )
        ltp = float(latest.ltp) if latest else None
        change_percent = float(latest.change_percent) if latest else None
        up = latest.up if latest else None

        buy_price = float(item.buy_price)
        qty = item.quantity
        invested = buy_price * qty
        current_val = ltp * qty if ltp else invested
        previous_close = float(latest.previous_close) if latest and latest.previous_close else buy_price
        gl = current_val - (previous_close * qty)
        ret = (gl / invested * 100) if invested else 0

        data.append({
            'id':             item.id,
            'symbol':         item.symbol,
            'buy_price':      buy_price,
            'quantity':       qty,
            'ltp':            ltp,
            'change_percent': change_percent,
            'up':             up,
            'invested':       invested,
            'previous_close': previous_close,
            'current_value':  current_val,
            'gain_loss':      gl,
            'return_pct':     ret,
        })

    return JsonResponse({'holdings': data})


@login_required
@require_http_methods(["POST"])
def api_portfolio_add(request):
    """
    POST /portfolio/api/holdings/add/
    Body: { symbol, buy_price, quantity }
    If symbol already exists for user, averages the buy price.
    """
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    symbol    = body.get('symbol', '').strip().upper()
    buy_price = body.get('buy_price')
    quantity  = body.get('quantity')

    if not symbol:
        return JsonResponse({'error': 'symbol is required'}, status=400)
    if buy_price is None or float(buy_price) <= 0:
        return JsonResponse({'error': 'buy_price must be a positive number'}, status=400)
    if quantity is None or int(quantity) < 1:
        return JsonResponse({'error': 'quantity must be at least 1'}, status=400)

    buy_price = float(buy_price)
    quantity  = int(quantity)

    # Validate symbol exists in StockData
    exists = StockData.objects.filter(symbol=symbol).exists()
    if not exists:
        return JsonResponse({'error': f'Symbol "{symbol}" not found in NEPSE data.'}, status=404)

    existing = PortfolioItem.objects.filter(user=request.user, symbol=symbol).first()
    if existing:
        # Weighted average buy price
        total_qty      = existing.quantity + quantity
        avg_price      = ((float(existing.buy_price) * existing.quantity) + (buy_price * quantity)) / total_qty
        existing.buy_price = round(avg_price, 2)
        existing.quantity  = total_qty
        existing.save()
        item = existing
    else:
        item = PortfolioItem.objects.create(
            user=request.user,
            symbol=symbol,
            buy_price=round(buy_price, 2),
            quantity=quantity,
        )

    return JsonResponse({'success': True, 'id': item.id, 'symbol': item.symbol})


@login_required
@require_http_methods(["DELETE"])
def api_portfolio_delete(request, item_id):
    """
    DELETE /portfolio/api/holdings/<item_id>/delete/
    """
    try:
        item = PortfolioItem.objects.get(id=item_id, user=request.user)
        item.delete()
        return JsonResponse({'success': True})
    except PortfolioItem.DoesNotExist:
        return JsonResponse({'error': 'Holding not found'}, status=404)