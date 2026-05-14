const modelAcc = { lstm: 87.4, rf: 83.1 };
let activeModel = 'lstm';
let apiData = null;
let allPredictions = null;
let currentLiveData = null;
let liveDataInterval = null;
let marketStatusInterval = null;

// ── helpers ──────────────────────────────────────────────────────────────────

function toDateStr(isoStr) {
  return isoStr.split('T')[0];
}

function nextTradingDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildPredictionMap(predictions) {
  const map = {};
  predictions.forEach(session => {
    const createdDate = toDateStr(session.lstm_pred.created_at);
    const key         = nextTradingDay(createdDate);
    if (!map[key] || session.lstm_pred.id > map[key].lstm_pred.id) {
      map[key] = session;
    }
  });
  return map;
}

// Returns the next market day after the last date in stock data
function getNextMarketDay() {
  const lastDate = new Date(apiData.data[0].published_date + 'T00:00:00');
  lastDate.setDate(lastDate.getDate() + 1);
  while (lastDate.getDay() === 0 || lastDate.getDay() === 6) lastDate.setDate(lastDate.getDate() + 1);
  return lastDate;
}

// ── display helpers ───────────────────────────────────────────────────────────

function clearDisplayData() {
  ['pm-cur', 'pm-high', 'pm-low', 'pm-pred'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = 'NPR ---';
  });

  const topPredPrice = document.getElementById('top-pred-price');
  if (topPredPrice) topPredPrice.textContent = 'NPR ---';

  const topPredChange = document.getElementById('top-pred-change');
  if (topPredChange) topPredChange.textContent = '▲ ---%';

  const tableBody = document.getElementById('pred-price-tbody');
  if (tableBody) tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;">Loading data...</td></tr>`;

  const sigBox = document.getElementById('signal-box');
  if (sigBox) {
    sigBox.className = 'signal-bar hold';
    sigBox.innerHTML = `<span class="signal-icon">⏳</span><div><div class="signal-label">Loading...</div><div class="signal-detail">Fetching latest stock data...</div></div>`;
  }

  const predTitle = document.getElementById('pred-title');
  if (predTitle) predTitle.textContent = 'Loading stock data...';

  const stockDisplay = document.getElementById('pm-stock');
  if (stockDisplay) stockDisplay.textContent = 'Loading...';

  if (predChart) { predChart.destroy(); predChart = null; }
  if (volChart)  { volChart.destroy();  volChart  = null; }

  ['predChart', 'volChart'].forEach(id => {
    const canvas = document.getElementById(id);
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  });
}

// ── fetch ─────────────────────────────────────────────────────────────────────

async function fetchStockData(symbol) {
  clearDisplayData();

  try {
    const [mainRes, allPredRes] = await Promise.all([
      fetch(`/prediction/prediction-data/${symbol}/`),
      fetch(`/prediction/all-prediction-data/${symbol}/`)
    ]);

    const mainData    = await mainRes.json();
    const allPredData = await allPredRes.json();

    if (mainData && !mainData.error) {
      apiData        = mainData;
      allPredictions = allPredData.predictions || [];
      await liveDataChange();
      refreshPrediction();
    }
  } catch (error) {
    console.error(`Error fetching ${symbol} data:`, error);
    const predTitle = document.getElementById('pred-title');
    if (predTitle) predTitle.textContent = `Error loading data for ${symbol}`;
    const sigBox = document.getElementById('signal-box');
    if (sigBox) {
      sigBox.className = 'signal-bar hold';
      sigBox.innerHTML = `<span class="signal-icon">⚠️</span><div><div class="signal-label">Error</div><div class="signal-detail">Failed to load data. Please try again.</div></div>`;
    }
  }
}

// ── model / horizon / stock controls ─────────────────────────────────────────

function pickModel(labelEl, m) {
  document.querySelectorAll('.model-option').forEach(l => l.classList.remove('active'));
  labelEl.classList.add('active');
  activeModel = m;

  const horizSel = document.getElementById('horizon-sel');
  if (m === 'lstm') {
    horizSel.value = '1';
    Array.from(horizSel.options).forEach(o => { o.disabled = parseInt(o.value) > 1; });
  } else {
    Array.from(horizSel.options).forEach(o => { o.disabled = false; });
  }

  updateHorizonNote();
  refreshPrediction();
}

function onHorizonChange() { updateHorizonNote(); refreshPrediction(); }

function onStockChange() {
  const symbol = document.getElementById('stock-sel').value;
  clearDisplayData();
  fetchStockData(symbol);
}

function updateHorizonNote() {
  const days = parseInt(document.getElementById('horizon-sel').value);
  const note = document.getElementById('horizon-note');
  if (activeModel === 'lstm') {
    note.textContent = 'LSTM is limited to 1-day forecasting only.';
    note.style.borderLeftColor = 'var(--green)';
  } else {
    note.textContent = `Random Forest forecasting ${days} day${days > 1 ? 's' : ''} ahead (max 7 days).`;
    note.style.borderLeftColor = 'var(--blue)';
  }
}

// ── price helpers ─────────────────────────────────────────────────────────────

let predChart, volChart;

function getCurrentPrice() {
  if (currentLiveData?.[0]?.ltp) return parseFloat(currentLiveData[0].ltp);
  return apiData?.data[0]?.close ?? 0;
}
function getTodayHigh() {
  if (currentLiveData?.[0]?.high) return parseFloat(currentLiveData[0].high);
  return apiData?.data[0]?.high ?? 0;
}
function getTodayLow() {
  if (currentLiveData?.[0]?.low) return parseFloat(currentLiveData[0].low);
  return apiData?.data[0]?.low ?? 0;
}
function getPreviousClose() {
  if (currentLiveData?.[0]?.pr_close) return parseFloat(currentLiveData[0].pr_close);
  return apiData?.data[1]?.close ?? 0;
}
function getPercentageChange() {
  if (currentLiveData?.[0]?.per_change) return parseFloat(currentLiveData[0].per_change);
  const cur = getCurrentPrice(), prev = getPreviousClose();
  return prev !== 0 ? ((cur - prev) / prev * 100) : 0;
}

function isMarketOpen() {
  return document.querySelector('#market-status')?.classList.contains('live-pill') ?? false;
}

function getFirstPredLabel() {
  const d = getNextMarketDay();
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
}

function getPredDate(i) {
  const base = getNextMarketDay();
  let count = 0;
  while (count < i) {
    base.setDate(base.getDate() + 1);
    while (base.getDay() === 0 || base.getDay() === 6) base.setDate(base.getDate() + 1);
    count++;
  }
  return base;
}

// ── live display ──────────────────────────────────────────────────────────────

function updateLiveDisplay() {
  if (!currentLiveData && !apiData) return;
  const currentPrice  = getCurrentPrice();
  const todayHigh     = getTodayHigh();
  const todayLow      = getTodayLow();
  const percentChange = getPercentageChange();
  const isPriceUp     = percentChange >= 0;
  const symbol        = document.getElementById('stock-sel').value.toUpperCase();
  if (currentPrice === 0) return;

  const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };

  set('pm-cur',   `NPR ${currentPrice.toFixed(2)}`);
  set('pm-stock', `${symbol} · Today <span class="${isPriceUp ? 'up' : 'dn'}" style="font-size:12px;margin-left:8px;">${isPriceUp ? '▲' : '▼'} ${Math.abs(percentChange).toFixed(2)}%</span>`);

  const highChg = ((todayHigh - currentPrice) / currentPrice * 100).toFixed(2);
  set('pm-high',     `NPR ${todayHigh.toFixed(2)}`);
  set('pm-high-chg', `▲ ${Math.abs(highChg)}%`);

  const lowChg = ((todayLow - currentPrice) / currentPrice * 100).toFixed(2);
  set('pm-low',     `NPR ${todayLow.toFixed(2)}`);
  set('pm-low-chg', `▼ -${Math.abs(lowChg)}%`);
}

// ── MAIN REFRESH ──────────────────────────────────────────────────────────────

function refreshPrediction() {
  if (!apiData) return;

  const days          = parseInt(document.getElementById('horizon-sel').value);
  const symbol        = document.getElementById('stock-sel').value.toUpperCase();
  const currentPrice  = getCurrentPrice();
  const todayHigh     = getTodayHigh();
  const todayLow      = getTodayLow();
  const percentChange = getPercentageChange();
  const isPriceUp     = percentChange >= 0;

  if (currentPrice === 0) return;

  const stockNames = { HBL: 'Himalayan Bank Limited', UPPER: 'Upper Tamakoshi Hydropower Limited' };
  const stockName  = stockNames[symbol] || symbol;

  // ── historical bars (oldest → newest) ────────────────────────────────────
  const historicalData = apiData.data.slice(0, 30).reverse();
  const histPrices     = historicalData.map(d => d.close);
  const histLabels     = historicalData.map(d => {
    const date = new Date(d.published_date + 'T00:00:00');
    return `${date.getMonth() + 1}/${date.getDate()}`;
  });
  const histDates = historicalData.map(d => toDateStr(d.published_date));

  // ── prediction map: nextTradingDay(created_at) → session ─────────────────
  const predMap = allPredictions ? buildPredictionMap(allPredictions) : {};

  const histLstmClose = histDates.map(date => predMap[date]?.lstm_pred?.predicted_close ?? null);
  const histRfClose   = histDates.map(date => predMap[date]?.rf_pred?.[0]?.close        ?? null);

  // ── future predictions (latest session) ───────────────────────────────────
  let predData = [], upBand = [], loBand = [];
  let finalPred = currentPrice, changePct = 0;

  if (activeModel === 'lstm') {
    const lstmPred = apiData.lstm_pred;
    finalPred = lstmPred.predicted_close;
    changePct = ((finalPred - currentPrice) / currentPrice * 100);
    predData  = [finalPred];
    upBand    = [lstmPred.predicted_high];
    loBand    = [lstmPred.predicted_low];
  } else {
    const maxDays = Math.min(days, apiData.rf_pred.length);
    for (let i = 0; i < maxDays; i++) {
      predData.push(apiData.rf_pred[i].close);
      upBand.push(apiData.rf_pred[i].high);
      loBand.push(apiData.rf_pred[i].low);
    }
    finalPred = predData[predData.length - 1];
    changePct = ((finalPred - currentPrice) / currentPrice * 100);
  }

  const isPredUp   = finalPred > currentPrice;
  const modelLabel = activeModel === 'lstm' ? 'LSTM' : 'Random Forest';

  // ── top-card ──────────────────────────────────────────────────────────────
  const set = (id, html, cls) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = html;
    if (cls) el.className = cls;
  };

  set('top-pred-price',  `NPR ${finalPred.toFixed(2)}`, isPredUp ? 'up' : 'dn');
  set('top-pred-change', `${isPredUp ? '▲' : '▼'} ${Math.abs(changePct).toFixed(2)}%`, isPredUp ? 'up' : 'dn');

  // ── chart labels ──────────────────────────────────────────────────────────
  const firstLabel = getFirstPredLabel();
  const predLabels = predData.map((_, i) => {
    if (i === 0) return firstLabel;
    const d = getPredDate(i);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });

  const labels    = [...histLabels, ...predLabels];
  const histLen   = histPrices.length;
  const futurePad = Array(predData.length).fill(null);

  const histLstmFull = [...histLstmClose, ...futurePad];
  const histRfFull   = [...histRfClose,   ...futurePad];

  const predFull = [...Array(histLen).fill(null), ...predData];
  const upFull   = [...Array(histLen).fill(null), ...upBand];
  const loFull   = [...Array(histLen).fill(null), ...loBand];

  const pastPredFull  = activeModel === 'lstm' ? histLstmFull : histRfFull;
  const pastPredColor = activeModel === 'lstm' ? '#e67e22' : '#9b59b6';
  const pastPredLabel = activeModel === 'lstm' ? 'Past LSTM Pred' : 'Past RF Pred (Day 1)';

  // ── stats ─────────────────────────────────────────────────────────────────
  set('pm-cur',   `NPR ${currentPrice.toFixed(2)}`);
  set('pm-stock', `${symbol} · Today <span class="${isPriceUp ? 'up' : 'dn'}" style="font-size:12px;margin-left:8px;">${isPriceUp ? '▲' : '▼'} ${Math.abs(percentChange).toFixed(2)}%</span>`);

  const highChg = ((todayHigh - currentPrice) / currentPrice * 100).toFixed(2);
  set('pm-high',     `NPR ${todayHigh.toFixed(2)}`);
  set('pm-high-chg', `▲ ${Math.abs(highChg)}%`);

  const lowChg = ((todayLow - currentPrice) / currentPrice * 100).toFixed(2);
  set('pm-low',     `NPR ${todayLow.toFixed(2)}`);
  set('pm-low-chg', `▼ -${Math.abs(lowChg)}%`);

  set('pm-pred', `NPR ${finalPred.toFixed(2)}`, 'stat-val');
  set('pm-chg', `<span class="${isPredUp ? 'up' : 'dn'}" style="font-size:12px;margin-left:8px;">${isPredUp ? '▲' : '▼'} ${Math.abs(changePct).toFixed(2)}% in ${predData.length} day${predData.length > 1 ? 's' : ''}</span><br><span style="font-size:12px;color:#9aa2ae;font-family:'IBM Plex Mono',monospace;margin-left:8px;">For ${getNextMarketDay().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>`);

  document.getElementById('pred-title').innerHTML =
    `${symbol} — ${stockName} · Prediction (${predData.length} Day${predData.length > 1 ? 's' : ''})`;

  // ── signal box ────────────────────────────────────────────────────────────
  const sigBox = document.getElementById('signal-box');
  if (changePct > 2) {
    sigBox.className = 'signal-bar buy';
    sigBox.innerHTML = `<span class="signal-icon">📈</span><div><div class="signal-label">BUY Signal</div><div class="signal-detail">${modelLabel} projects +${changePct.toFixed(2)}% from NPR ${currentPrice.toFixed(2)} over ${predData.length} day${predData.length > 1 ? 's' : ''}. Educational reference only.</div></div>`;
  } else if (changePct < -2) {
    sigBox.className = 'signal-bar sell';
    sigBox.innerHTML = `<span class="signal-icon">📉</span><div><div class="signal-label">SELL Signal</div><div class="signal-detail">${modelLabel} projects ${changePct.toFixed(2)}% from NPR ${currentPrice.toFixed(2)} over ${predData.length} day${predData.length > 1 ? 's' : ''}. Educational reference only.</div></div>`;
  } else {
    sigBox.className = 'signal-bar hold';
    sigBox.innerHTML = `<span class="signal-icon">⏸</span><div><div class="signal-label">HOLD — Neutral</div><div class="signal-detail">Minimal movement projected (${changePct.toFixed(2)}%) from NPR ${currentPrice.toFixed(2)} over ${predData.length} day${predData.length > 1 ? 's' : ''}. Educational reference only.</div></div>`;
  }

  // ── prediction chart ──────────────────────────────────────────────────────
  if (predChart) predChart.destroy();
  predChart = new Chart(document.getElementById('predChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Actual',
          data: [...histPrices, ...Array(predData.length).fill(null)],
          borderColor: '#12a066',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          tension: 0.3,
          fill: false,
          spanGaps: false,
        },
        {
          label: pastPredLabel,
          data: pastPredFull,
          borderColor: pastPredColor,
          borderWidth: 1.5,
          borderDash: [4, 3],
          pointRadius: pastPredFull.map(v => v !== null ? 4 : 0),
          pointBorderColor: pastPredColor,
          pointBackgroundColor: '#ffffff',
          pointBorderWidth: 1.5,
          pointHoverRadius: 6,
          tension: 0.3,
          fill: false,
          spanGaps: false,
        },
        {
          label: 'Predicted',
          data: predFull,
          borderColor: '#1a4f8a',
          borderWidth: 2.5,
          borderDash: [6, 4],
          pointRadius: predFull.map((v, i) => (v !== null && i >= histLen) ? 5 : 0),
          pointBorderColor: '#1a4f8a',
          pointBackgroundColor: '#ffffff',
          pointBorderWidth: 2,
          pointHoverRadius: 7,
          tension: 0.3,
          fill: false,
          spanGaps: false,
        },
        {
          label: 'Upper CI',
          data: upFull,
          borderColor: 'transparent',
          fill: '+1',
          backgroundColor: 'rgba(26,79,138,0.1)',
          pointRadius: 0,
          tension: 0.3,
          spanGaps: false,
        },
        {
          label: 'Lower CI',
          data: loFull,
          borderColor: 'transparent',
          fill: false,
          pointRadius: 0,
          tension: 0.3,
          spanGaps: false,
        },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          filter: i => i.datasetIndex <= 2,
          callbacks: {
            label: c => {
              if (c.parsed.y === null) {
                if (c.datasetIndex === 1) return `${c.dataset.label}: NONE`;
                return null;
              }
              return `${c.dataset.label}: NPR ${c.parsed.y.toFixed(2)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#9aa2ae', font: { size: 10, family: 'IBM Plex Mono' }, maxTicksLimit: 12, maxRotation: 45, minRotation: 45 }
        },
        y: {
          position: 'right',
          grid: { color: 'rgba(154,162,174,0.15)' },
          ticks: { color: '#9aa2ae', font: { size: 10, family: 'IBM Plex Mono' } }
        }
      }
    }
  });

  buildVolChart();
  buildPredTable(currentPrice, predData, upBand, loBand);
}

// ── pred table ────────────────────────────────────────────────────────────────

function buildPredTable(currentPrice, predData, upBand, loBand) {
  const tbody = document.getElementById('pred-price-tbody');
  tbody.innerHTML = predData.map((price, i) => {
    const date     = getPredDate(i);
    const chg      = ((price - currentPrice) / currentPrice * 100);
    const isUp     = chg >= 0;
    const dateStr  = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const dayLabel = i === 0 ? 'Next Day' : `Day ${i + 1}`;
    return `<tr>
      <td>${dayLabel}</td>
      <td>${dateStr}</td>
      <td style="font-weight:600">NPR ${price.toFixed(2)}</td>
      <td class="${isUp ? 'up' : 'dn'}">${isUp ? '▲ +' : '▼ '}${Math.abs(chg).toFixed(2)}%</td>
      <td class="ci-range">NPR ${loBand[i].toFixed(2)}</td>
      <td class="ci-range">NPR ${upBand[i].toFixed(2)}</td>
    </tr>`;
  }).join('');
}

// ── volume chart ──────────────────────────────────────────────────────────────

function buildVolChart() {
  if (volChart) volChart.destroy();
  const volumeData = apiData.data.slice(0, 15).reverse();
  const labels = volumeData.map(d => {
    const dt = new Date(d.published_date + 'T00:00:00');
    return `${dt.getMonth() + 1}/${dt.getDate()}`;
  });
  const data   = volumeData.map(d => (d.traded_quantity / 1000000).toFixed(3));
  const colors = data.map((_, i) => i >= 13 ? 'rgba(26,79,138,0.75)' : 'rgba(10,124,78,0.5)');

  volChart = new Chart(document.getElementById('volChart'), {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, borderRadius: 3 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => `${c.parsed.y}M shares` } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#9aa2ae', font: { size: 9, family: 'IBM Plex Mono' }, maxTicksLimit: 8, maxRotation: 45, minRotation: 45 } },
        y: { grid: { color: 'rgba(154,162,174,0.15)' }, ticks: { color: '#9aa2ae', font: { size: 9, family: 'IBM Plex Mono' }, callback: v => `${v}M` } }
      }
    }
  });
}

// ── live data polling ─────────────────────────────────────────────────────────

async function liveDataChange() {
  try {
    const symbol     = document.getElementById('stock-sel').value;
    const marketOpen = isMarketOpen();
    const res        = await fetch(`/prediction/live-stock-data/${symbol}/`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data      = await res.json();
    currentLiveData = data;

    const updateIndicator = document.getElementById('live-update-time');
    if (updateIndicator) {
      const now           = data?.[0]?.timestamp ? new Date(data[0].timestamp) : new Date();
      const formattedDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const formattedTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
      updateIndicator.innerHTML = `Last updated: ${formattedDate} at ${formattedTime} ${marketOpen ? '• LIVE' : ''}`;
      updateIndicator.style.cssText = 'font-size:14px;color:#505761;padding:8px 12px;margin-bottom:10px;border-bottom:1px solid rgba(154,162,174,0.2);';
    }

    updateLiveDisplay();
    console.log('Live data updated successfully');
  } catch (e) {
    console.error('Live data fetch failed:', e);
    const updateIndicator = document.getElementById('live-update-time');
    if (updateIndicator) {
      const now = new Date();
      updateIndicator.innerHTML = `⚠️ Failed to fetch live data at ${now.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })} at ${now.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit', second:'2-digit', hour12:true })}`;
      updateIndicator.style.color = '#e74c3c';
    }
  }
}

function startLiveDataUpdates() {
  if (liveDataInterval) clearInterval(liveDataInterval);
  liveDataInterval = setInterval(liveDataChange, 60000);
}

function stopLiveDataUpdates() {
  if (liveDataInterval) { clearInterval(liveDataInterval); liveDataInterval = null; }
}

// ── init ──────────────────────────────────────────────────────────────────────

(function init() {
  const horizSel = document.getElementById('horizon-sel');
  Array.from(horizSel.options).forEach(o => { o.disabled = parseInt(o.value) > 1; });
  updateHorizonNote();
  const initialStock = document.getElementById('stock-sel').value;
  fetchStockData(initialStock);
  startLiveDataUpdates();
})();

window.addEventListener('beforeunload', () => {
  stopLiveDataUpdates();
  if (marketStatusInterval) clearInterval(marketStatusInterval);
});