// MODEL DATA

async function getMarketStatus() {
  const res = await fetch('/api/market-status/');
  const data = await res.json();

  const status = document.querySelector('#market-status');

  if (data.isOpen === 'OPEN') {
    status.innerHTML = '<span class="live-dot"></span> OPEN</div>'
    status.classList.remove('close-pill');
    status.classList.add('live-pill');


    // 👉 start interval ONLY if not already running
    // if (!marketStatusInterval) {
    //     marketStatusInterval = setInterval(updateData, 200000); // 10 sec
    // }

  } else {
    status.innerHTML = '<span class="close-dot"></span> CLOSE</div>'
    status.classList.remove('live-pill');
    status.classList.add('close-pill');
    // marketTime.innerText = 'As of: ' + formatted;

    // 👉 stop auto refresh when market is closed
    // if (marketStatusInterval) {
    //     clearInterval(marketStatusInterval);
    //     marketStatusInterval = null;
    // }

  }
}
getMarketStatus();
setInterval(getMarketStatus, 60000);


const modelAcc = { lstm: 87.4, rf: 83.1 };
let activeModel = 'lstm';
let apiData = null; // Store API data for current stock

// Fetch API data based on selected stock symbol
async function fetchStockData(symbol) {
  try {
    const response = await fetch(`/prediction/prediction-data/${symbol}/`);
    const data = await response.json();
    if (data && !data.error) {
      apiData = data;
      refreshPrediction();
    }
  } catch (error) {
    console.error(`Error fetching ${symbol} data:`, error);
  }
}

// When model changes, clamp horizon to 1 if LSTM is selected
function pickModel(labelEl, m) {
  document.querySelectorAll('.model-option').forEach(l => l.classList.remove('active'));
  labelEl.classList.add('active');
  activeModel = m;

  const horizSel = document.getElementById('horizon-sel');
  if (m === 'lstm') {
    horizSel.value = '1';
    // Disable options > 1 day
    Array.from(horizSel.options).forEach(o => {
      o.disabled = parseInt(o.value) > 1;
    });
  } else {
    // Re-enable all options for RF
    Array.from(horizSel.options).forEach(o => { o.disabled = false; });
  }

  updateHorizonNote();
  refreshPrediction();
}

function onHorizonChange() {
  updateHorizonNote();
  refreshPrediction();
}

function onStockChange() {
  const symbol = document.getElementById('stock-sel').value;
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

// PREDICTION
let predChart, volChart;

function refreshPrediction() {
  if (!apiData) {
    console.log('Waiting for API data...');
    return;
  }

  const days = parseInt(document.getElementById('horizon-sel').value);
  const symbol = document.getElementById('stock-sel').value.toUpperCase();

  // Get current price from latest data
  const currentPrice = apiData.data[0].close;
  const stockNames = {
    'HBL': 'Himalayan Bank Limited',
    'UPPER': 'Upper Tamakoshi Hydropower Limited',
    // 'NABIL': 'Nabil Bank Limited',
    // 'NICA': 'NIC Asia Bank Limited',
    // 'PRVU': 'Prabhu Bank Limited',
    // 'NLFCL': 'Nepal Finance Limited',
    // 'SHPC': 'Sanima Hydro Limited',
    // 'NTC': 'Nepal Telecom',
    // 'HIDCL': 'Hydroelectricity Investment and Development Company Limited'
  };

  const stockName = stockNames[symbol] || symbol;

  // Get historical data (last 30 days for chart) - order from oldest to newest (left to right)
  const historicalData = apiData.data.slice(0, 30).reverse();
  const histPrices = historicalData.map(d => d.close);
  const histLabels = historicalData.map((d, i) => {
    const date = new Date(d.published_date);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  });

  let predData = [];
  let upBand = [];
  let loBand = [];
  let finalPred = currentPrice;
  let changePct = 0;

  if (activeModel === 'lstm') {
    // Use LSTM prediction from API
    const lstmPred = apiData.lstm_pred;
    finalPred = lstmPred.predicted_close;
    changePct = lstmPred.change_pct;
    predData = [finalPred];
    upBand = [lstmPred.predicted_high];
    loBand = [lstmPred.predicted_low];
  } else {
    // Use RF predictions from API (max available days)
    const maxDays = Math.min(days, apiData.rf_pred.length);
    for (let i = 0; i < maxDays; i++) {
      const pred = apiData.rf_pred[i];
      predData.push(pred.close);
      upBand.push(pred.high);
      loBand.push(pred.low);
    }
    finalPred = predData[predData.length - 1];
    changePct = ((finalPred - currentPrice) / currentPrice * 100);
  }

  const isUp = finalPred > currentPrice;
  const modelLabel = activeModel === 'lstm' ? 'LSTM' : 'Random Forest';

  // Update top predicted price display with floating points
  const topPredPrice = document.getElementById('top-pred-price');
  const topPredChange = document.getElementById('top-pred-change');
  if (topPredPrice) {
    topPredPrice.textContent = `NPR ${finalPred.toFixed(2)}`;
    topPredPrice.className = isUp ? 'up' : 'dn';
  }
  if (topPredChange) {
    topPredChange.textContent = `${isUp ? '▲' : '▼'} ${Math.abs(changePct).toFixed(2)}%`;
    topPredChange.className = isUp ? 'up' : 'dn';
  }

  // Build chart labels - historical dates and prediction labels
  const histChartLabels = [...histLabels];

  // Create prediction labels
  const predLabels = [];
  for (let i = 0; i < predData.length; i++) {
    if (i === 0) {
      predLabels.push('Tomorrow');
    } else {
      predLabels.push(`Day ${i + 1}`);
    }
  }

  // Combine labels
  const labels = [...histChartLabels, ...predLabels];

  // Build data arrays for chart
  const histFull = [...histPrices];

  // For prediction data, add null for all historical points, then prediction points
  const predFull = [...Array(histPrices.length).fill(null), ...predData];
  const upFull = [...Array(histPrices.length).fill(null), ...upBand];
  const loFull = [...Array(histPrices.length).fill(null), ...loBand];

  // Add point radius for better visibility of prediction dots
  const pointRadiusArray = [...Array(histPrices.length).fill(0), ...Array(predData.length).fill(4)];

  // Update metric cards using actual data
  const todayHigh = apiData.data[0].high;
  const todayLow = apiData.data[0].low;
  const highChg = ((todayHigh - currentPrice) / currentPrice * 100).toFixed(2);
  const lowChg = ((todayLow - currentPrice) / currentPrice * 100).toFixed(2);

  document.getElementById('pm-cur').textContent = `NPR ${currentPrice.toLocaleString()}`;
  document.getElementById('pm-stock').textContent = `${symbol} · Today`;
  document.getElementById('pm-high').textContent = `NPR ${todayHigh.toLocaleString()}`;
  document.getElementById('pm-high-chg').innerHTML = `▲ +${highChg}%`;
  document.getElementById('pm-low').textContent = `NPR ${todayLow.toLocaleString()}`;
  document.getElementById('pm-low-chg').innerHTML = `▼ ${lowChg}%`;
  document.getElementById('pm-pred').textContent = `NPR ${finalPred.toFixed(2)}`;
  document.getElementById('pm-pred').className = 'stat-val ' + (isUp ? 'up' : 'dn');
  document.getElementById('pm-chg').innerHTML = `${isUp ? '▲' : '▼'} ${isUp ? '+' : ''}${changePct.toFixed(2)}% in ${predData.length} day${predData.length > 1 ? 's' : ''}`;
  document.getElementById('pm-chg').className = 'stat-change ' + (isUp ? 'up' : 'dn');
  document.getElementById('pred-title').textContent = `${symbol} — ${stockName} · Prediction (${predData.length} Day${predData.length > 1 ? 's' : ''})`;

  // Signal box
  const sigBox = document.getElementById('signal-box');
  if (changePct > 2) {
    sigBox.className = 'signal-bar buy';
    sigBox.innerHTML = `<span class="signal-icon">📈</span><div><div class="signal-label">BUY Signal</div><div class="signal-detail">${modelLabel} projects +${changePct.toFixed(2)}% over ${predData.length} day${predData.length > 1 ? 's' : ''}. Educational reference only.</div></div>`;
  } else if (changePct < -2) {
    sigBox.className = 'signal-bar sell';
    sigBox.innerHTML = `<span class="signal-icon">📉</span><div><div class="signal-label">SELL Signal</div><div class="signal-detail">${modelLabel} projects ${changePct.toFixed(2)}% over ${predData.length} day${predData.length > 1 ? 's' : ''}. Educational reference only.</div></div>`;
  } else {
    sigBox.className = 'signal-bar hold';
    sigBox.innerHTML = `<span class="signal-icon">⏸</span><div><div class="signal-label">HOLD — Neutral</div><div class="signal-detail">Minimal movement projected (${changePct.toFixed(2)}%) over ${predData.length} day${predData.length > 1 ? 's' : ''}. Educational reference only.</div></div>`;
  }

  // Prediction chart
  if (predChart) predChart.destroy();
  predChart = new Chart(document.getElementById('predChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Actual',
          data: histFull,
          borderColor: '#12a066',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          tension: 0.3,
          fill: false
        },
        {
          label: 'Predicted',
          data: predFull,
          borderColor: '#1a4f8a',
          borderWidth: 2.5,
          borderDash: [6, 4],
          pointRadius: 5,
          pointBorderColor: '#1a4f8a',
          pointBackgroundColor: '#ffffff',
          pointBorderWidth: 2,
          pointHoverRadius: 7,
          tension: 0.3,
          fill: false
        },
        {
          label: 'Upper CI',
          data: upFull,
          borderColor: 'transparent',
          fill: '+1',
          backgroundColor: 'rgba(26,79,138,0.1)',
          pointRadius: 0,
          tension: 0.3
        },
        {
          label: 'Lower CI',
          data: loFull,
          borderColor: 'transparent',
          fill: false,
          pointRadius: 0,
          tension: 0.3
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
          filter: i => i.datasetIndex <= 1,
          callbacks: {
            label: c => `${c.dataset.label}: NPR ${c.parsed.y?.toFixed(2)}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#9aa2ae',
            font: { size: 10, family: 'IBM Plex Mono' },
            maxTicksLimit: 12,
            maxRotation: 45,
            minRotation: 45
          }
        },
        y: {
          position: 'right',
          grid: { color: 'rgba(154,162,174,0.15)' },
          ticks: { color: '#9aa2ae', font: { size: 10, family: 'IBM Plex Mono' } }
        }
      },
      elements: {
        point: {
          radius: function (context) {
            // Show points only for prediction data
            const datasetIndex = context.datasetIndex;
            const dataIndex = context.dataIndex;
            if (datasetIndex === 1 && dataIndex >= histPrices.length) {
              return 5;
            }
            return 0;
          }
        }
      }
    }
  });

  buildVolChart();
  buildPredTable(currentPrice, predData, upBand, loBand);
}

// PREDICTED PRICES TABLE
function buildPredTable(currentPrice, predData, upBand, loBand) {
  const tbody = document.getElementById('pred-price-tbody');
  const today = new Date();
  let dayCount = 0;

  const rows = predData.map((price, i) => {
    // Skip weekends
    let date = new Date(today);
    dayCount++;
    date.setDate(today.getDate() + dayCount);
    while (date.getDay() === 0 || date.getDay() === 6) {
      dayCount++;
      date.setDate(today.getDate() + dayCount);
    }

    const chg = ((price - currentPrice) / currentPrice * 100);
    const isUp = chg >= 0;
    const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const dayLabel = i === 0 ? 'Tomorrow' : `Day ${i + 1}`;

    return `<tr>
      <td>${dayLabel}</td>
      <td>${dateStr}</td>
      <td style="font-weight:600">NPR ${price.toFixed(2)}</td>
      <td class="${isUp ? 'up' : 'dn'}">${isUp ? '▲ +' : '▼ '}${chg.toFixed(2)}%</td>
      <td class="ci-range">NPR ${loBand[i].toFixed(2)}</td>
      <td class="ci-range">NPR ${upBand[i].toFixed(2)}</td>
    </tr>`;
  });

  tbody.innerHTML = rows.join('');
}

// VOLUME CHART using actual volume data
function buildVolChart() {
  if (volChart) volChart.destroy();

  // Use actual volume data from API (last 15 days) - order from oldest to newest
  const volumeData = apiData.data.slice(0, 15).reverse();
  const labels = volumeData.map(d => {
    const date = new Date(d.published_date);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  });
  const data = volumeData.map(d => (d.traded_quantity / 1000000).toFixed(3));
  const colors = data.map((_, i) => i >= 13 ? 'rgba(26,79,138,0.75)' : 'rgba(10,124,78,0.5)');

  volChart = new Chart(document.getElementById('volChart'), {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, borderRadius: 3 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.parsed.y}M shares` } } },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#9aa2ae',
            font: { size: 9, family: 'IBM Plex Mono' },
            maxTicksLimit: 8,
            maxRotation: 45,
            minRotation: 45
          }
        },
        y: {
          grid: { color: 'rgba(154,162,174,0.15)' },
          ticks: { color: '#9aa2ae', font: { size: 9, family: 'IBM Plex Mono' }, callback: v => `${v}M` }
        }
      }
    }
  });
}

// Remove accuracy display from model options
function removeAccuracyDisplay() {
  const modelOptions = document.querySelectorAll('.model-option');
  modelOptions.forEach(option => {
    // Remove any accuracy text spans if they exist
    const accuracySpan = option.querySelector('.accuracy');
    if (accuracySpan) {
      accuracySpan.remove();
    }
  });
}

// INIT — lock horizon to 1 on load since LSTM is default, then fetch API data for default stock
(function init() {
  const horizSel = document.getElementById('horizon-sel');
  Array.from(horizSel.options).forEach(o => { o.disabled = parseInt(o.value) > 1; });
  updateHorizonNote();

  // Remove accuracy displays
  // removeAccuracyDisplay();

  // Get initial stock value and fetch its data
  const initialStock = document.getElementById('stock-sel').value;
  fetchStockData(initialStock);
})();