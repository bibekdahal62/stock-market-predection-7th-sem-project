// MODEL DATA

async function getMarketStatus() {
  const res = await fetch('/api/market-status/');
  const data = await res.json();

  const status = document.querySelector('#market-status');

  if (data.isOpen === 'OPEN') {
    status.innerHTML = '<span class="live-dot"></span> OPEN</div>'
    status.classList.remove('close-pill');
    status.classList.add('live-pill');
  } else {
    status.innerHTML = '<span class="close-dot"></span> CLOSE</div>'
    status.classList.remove('live-pill');
    status.classList.add('close-pill');
  }
}
getMarketStatus();
setInterval(getMarketStatus, 60000);

const modelAcc = { lstm: 87.4, rf: 83.1 };
let activeModel = 'lstm';
let apiData = null; // Store historical/ML data from API
let currentLiveData = null; // Store current live data
let liveDataInterval = null;
let marketStatusInterval = null;

// Function to clear all displayed data
function clearDisplayData() {
  // Clear current price
  const currentPriceElem = document.getElementById('pm-cur');
  if (currentPriceElem) currentPriceElem.textContent = 'NPR ---';
  
  // Clear high and low
  const highElem = document.getElementById('pm-high');
  if (highElem) highElem.textContent = 'NPR ---';
  
  const lowElem = document.getElementById('pm-low');
  if (lowElem) lowElem.textContent = 'NPR ---';
  
  // Clear high and low changes
  const highChgElem = document.getElementById('pm-high-chg');
  if (highChgElem) highChgElem.innerHTML = '▲ ---%';
  
  const lowChgElem = document.getElementById('pm-low-chg');
  if (lowChgElem) lowChgElem.innerHTML = '▼ ---%';
  
  // Clear predicted value
  const predElem = document.getElementById('pm-pred');
  if (predElem) predElem.textContent = 'NPR ---';
  
  const predChangeElem = document.getElementById('pm-chg');
  if (predChangeElem) predChangeElem.innerHTML = '▲ ---%';
  
  // Clear top prediction display
  // const topPredPrice = document.getElementById('top-pred-price');
  // if (topPredPrice) topPredPrice.textContent = 'NPR ---';
  
  // const topPredChange = document.getElementById('top-pred-change');
  // if (topPredChange) topPredChange.textContent = '▲ ---%';
  
  // Clear prediction table
  const tableBody = document.getElementById('pred-price-tbody');
  if (tableBody) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px;">Loading data...</td></tr>`;
  }
  
  // Clear signal box
  const sigBox = document.getElementById('signal-box');
  if (sigBox) {
    sigBox.className = 'signal-bar hold';
    sigBox.innerHTML = `<span class="signal-icon">⏳</span><div><div class="signal-label">Loading...</div><div class="signal-detail">Fetching latest stock data...</div></div>`;
  }
  
  // Clear prediction title
  const predTitle = document.getElementById('pred-title');
  if (predTitle) predTitle.textContent = 'Loading stock data...';
  
  // Clear stock name display
  const stockDisplay = document.getElementById('pm-stock');
  if (stockDisplay) stockDisplay.textContent = 'Loading...';
  
  // Destroy and clear chart if it exists
  if (predChart) {
    predChart.destroy();
    predChart = null;
  }
  
  // Clear chart canvas
  const chartCanvas = document.getElementById('predChart');
  if (chartCanvas) {
    const ctx = chartCanvas.getContext('2d');
    ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
  }
  
  // Clear volume chart if it exists
  if (volChart) {
    volChart.destroy();
    volChart = null;
  }
  
  // Clear volume chart canvas
  const volChartCanvas = document.getElementById('volChart');
  if (volChartCanvas) {
    const ctx = volChartCanvas.getContext('2d');
    ctx.clearRect(0, 0, volChartCanvas.width, volChartCanvas.height);
  }
}

// Function to blur the prediction chart
function blurPredictionChart() {
  const chartContainer = document.getElementById('predChart')?.parentElement;
  if (chartContainer) {
    chartContainer.style.filter = 'blur(4px)';
    chartContainer.style.transition = 'filter 0.3s ease';
    
    // Add loading overlay if not exists
    let overlay = chartContainer.querySelector('.chart-loading-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'chart-loading-overlay';
      overlay.innerHTML = `
        <div class="loading-spinner"></div>
        <div class="loading-text">Loading stock data...</div>
      `;
      overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 10;
        border-radius: 12px;
      `;
      chartContainer.style.position = 'relative';
      chartContainer.appendChild(overlay);
    } else {
      overlay.style.display = 'flex';
    }
  }
}

// Function to unblur the prediction chart
function unblurPredictionChart() {
  const chartContainer = document.getElementById('predChart')?.parentElement;
  if (chartContainer) {
    chartContainer.style.filter = 'blur(0px)';
    const overlay = chartContainer.querySelector('.chart-loading-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }
}

// Fetch API data based on selected stock symbol
async function fetchStockData(symbol) {
  // Clear all displayed data immediately
  clearDisplayData();
  
  // Blur the chart while fetching new data
  blurPredictionChart();
  
  try {
    const response = await fetch(`/prediction/prediction-data/${symbol}/`);
    const data = await response.json();
    if (data && !data.error) {
      apiData = data;
      // After getting historical data, fetch live data
      await liveDataChange();
      refreshPrediction();
    }
  } catch (error) {
    console.error(`Error fetching ${symbol} data:`, error);
    // Show error in UI
    const predTitle = document.getElementById('pred-title');
    if (predTitle) predTitle.textContent = `Error loading data for ${symbol}`;
    
    const sigBox = document.getElementById('signal-box');
    if (sigBox) {
      sigBox.className = 'signal-bar hold';
      sigBox.innerHTML = `<span class="signal-icon">⚠️</span><div><div class="signal-label">Error</div><div class="signal-detail">Failed to load data. Please try again.</div></div>`;
    }
  } finally {
    // Unblur the chart after data is loaded (even if error)
    unblurPredictionChart();
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
    Array.from(horizSel.options).forEach(o => {
      o.disabled = parseInt(o.value) > 1;
    });
  } else {
    Array.from(horizSel.options).forEach(o => { o.disabled = false; });
  }

  updateHorizonNote();
  refreshPrediction();
  // liveDataChange();
}

function onHorizonChange() {
  updateHorizonNote();
  refreshPrediction();
  // liveDataChange();
}

function onStockChange() {
  const symbol = document.getElementById('stock-sel').value;
  
  // Clear all displayed data immediately
  clearDisplayData();
  
  // Blur the chart when stock change is triggered
  blurPredictionChart();
  
  fetchStockData(symbol);
  // liveDataChange();
  
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

// Get current price (prioritize live data over historical)
function getCurrentPrice() {
  if (currentLiveData && currentLiveData.ltp) {
    return parseFloat(currentLiveData.ltp);
  }
  return apiData ? apiData.data[0].close : 0;
}

// Get today's high (prioritize live data)
function getTodayHigh() {
  if (currentLiveData && currentLiveData.high) {
    return parseFloat(currentLiveData.high);
  }
  return apiData ? apiData.data[0].high : 0;
}

// Get today's low (prioritize live data)
function getTodayLow() {
  if (currentLiveData && currentLiveData.low) {
    return parseFloat(currentLiveData.low);
  }
  return apiData ? apiData.data[0].low : 0;
}

function refreshPrediction() {
  if (!apiData) {
    console.log('Waiting for API data...');
    return;
  }

  const days = parseInt(document.getElementById('horizon-sel').value);
  const symbol = document.getElementById('stock-sel').value.toUpperCase();

  // Use LIVE current price if available, otherwise fall back to historical
  const currentPrice = getCurrentPrice();
  const todayHigh = getTodayHigh();
  const todayLow = getTodayLow();
  
  // Don't proceed if currentPrice is invalid
  if (currentPrice === 0) {
    console.log('Invalid current price, waiting for data...');
    return;
  }
  
  const stockNames = {
    'HBL': 'Himalayan Bank Limited',
    'UPPER': 'Upper Tamakoshi Hydropower Limited',
  };

  const stockName = stockNames[symbol] || symbol;

  // Get historical data (last 30 days for chart) - order from oldest to newest
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
    const lstmPred = apiData.lstm_pred;
    finalPred = lstmPred.predicted_close;
    // Recalculate percentage based on LIVE price
    changePct = ((finalPred - currentPrice) / currentPrice * 100);
    predData = [finalPred];
    upBand = [lstmPred.predicted_high];
    loBand = [lstmPred.predicted_low];
  } else {
    const maxDays = Math.min(days, apiData.rf_pred.length);
    for (let i = 0; i < maxDays; i++) {
      const pred = apiData.rf_pred[i];
      predData.push(pred.close);
      upBand.push(pred.high);
      loBand.push(pred.low);
    }
    finalPred = predData[predData.length - 1];
    // Recalculate percentage based on LIVE price
    changePct = ((finalPred - currentPrice) / currentPrice * 100);
  }

  const isUp = finalPred > currentPrice;
  const modelLabel = activeModel === 'lstm' ? 'LSTM' : 'Random Forest';

  // Update top predicted price display
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

  // Build chart labels
  const histChartLabels = [...histLabels];
  const predLabels = [];
  for (let i = 0; i < predData.length; i++) {
    if (i === 0) {
      predLabels.push('Tomorrow');
    } else {
      predLabels.push(`Day ${i + 1}`);
    }
  }
  const labels = [...histChartLabels, ...predLabels];

  // Build data arrays for chart
  const histFull = [...histPrices];
  const predFull = [...Array(histPrices.length).fill(null), ...predData];
  const upFull = [...Array(histPrices.length).fill(null), ...upBand];
  const loFull = [...Array(histPrices.length).fill(null), ...loBand];

  // Update metric cards with LIVE data
  const highChg = ((todayHigh - currentPrice) / currentPrice * 100).toFixed(2);
  const lowChg = ((todayLow - currentPrice) / currentPrice * 100).toFixed(2);
  
  const currentPriceElem = document.getElementById('pm-cur');
  currentPriceElem.textContent = `NPR ${currentPrice.toFixed(2).toLocaleString()}`;
  
  // Add live indicator if using live data
  if (currentLiveData) {
    currentPriceElem.classList.add('live-data');
    document.getElementById('pm-stock').innerHTML = `${symbol} · Today`;
  } else {
    document.getElementById('pm-stock').innerHTML = `${symbol} · Today`;
  }
  
  document.getElementById('pm-high').textContent = `NPR ${todayHigh.toLocaleString()}`;
  document.getElementById('pm-high-chg').innerHTML = `▲ ${highChg >= 0 ? '+' : ''}${highChg}%`;
  document.getElementById('pm-low').textContent = `NPR ${todayLow.toLocaleString()}`;
  document.getElementById('pm-low-chg').innerHTML = `▼ ${lowChg}%`;
  document.getElementById('pm-pred').textContent = `NPR ${finalPred.toFixed(2)}`;
  document.getElementById('pm-pred').className = 'stat-val ' + (isUp ? 'up' : 'dn');
  document.getElementById('pm-chg').innerHTML = `${isUp ? '▲' : '▼'} ${isUp ? '+' : ''}${changePct.toFixed(2)}% in ${predData.length} day${predData.length > 1 ? 's' : ''}`;
  document.getElementById('pm-chg').className = 'stat-change ' + (isUp ? 'up' : 'dn');
  document.getElementById('pred-title').innerHTML = `${symbol} — ${stockName} · Prediction (${predData.length} Day${predData.length > 1 ? 's' : ''})`;

  // Signal box with updated percentages
  const sigBox = document.getElementById('signal-box');
  if (changePct > 2) {
    sigBox.className = 'signal-bar buy';
    sigBox.innerHTML = `<span class="signal-icon">📈</span><div><div class="signal-label">BUY Signal</div><div class="signal-detail">${modelLabel} projects +${changePct.toFixed(2)}% from current price (NPR ${currentPrice.toFixed(2)}) over ${predData.length} day${predData.length > 1 ? 's' : ''}. Educational reference only.</div></div>`;
  } else if (changePct < -2) {
    sigBox.className = 'signal-bar sell';
    sigBox.innerHTML = `<span class="signal-icon">📉</span><div><div class="signal-label">SELL Signal</div><div class="signal-detail">${modelLabel} projects ${changePct.toFixed(2)}% from current price (NPR ${currentPrice.toFixed(2)}) over ${predData.length} day${predData.length > 1 ? 's' : ''}. Educational reference only.</div></div>`;
  } else {
    sigBox.className = 'signal-bar hold';
    sigBox.innerHTML = `<span class="signal-icon">⏸</span><div><div class="signal-label">HOLD — Neutral</div><div class="signal-detail">Minimal movement projected (${changePct.toFixed(2)}%) from current price (NPR ${currentPrice.toFixed(2)}) over ${predData.length} day${predData.length > 1 ? 's' : ''}. Educational reference only.</div></div>`;
  }

  // Prediction chart (using historical data only)
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

function buildPredTable(currentPrice, predData, upBand, loBand) {
  const tbody = document.getElementById('pred-price-tbody');
  const today = new Date();
  let dayCount = 0;

  const rows = predData.map((price, i) => {
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

function buildVolChart() {
  if (volChart) volChart.destroy();

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

// LIVE DATA UPDATE - Now updates all displays dynamically
async function liveDataChange() {
  try {
    const symbol = document.getElementById('stock-sel').value;
    const marketStatusEl = document.querySelector('#market-status');
    const isMarketOpen = marketStatusEl && marketStatusEl.classList.contains('live-pill');
    
    // if (!isMarketOpen) {
    //   console.log('Market closed - skipping live data update');
    //   return;
    // }
    
    const res = await fetch(`/prediction/live-stock-data/${symbol}/`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    currentLiveData = data; // Store the live data
    
    // Refresh everything with the new live data
    if (apiData) {
      refreshPrediction(); // This will use the live data via getCurrentPrice()
    }
    
    const timestamp = new Date().toLocaleTimeString();
    const updateIndicator = document.getElementById('live-update-time');
    if (updateIndicator) {
      updateIndicator.innerHTML = `📡 Last update: ${timestamp} ${isMarketOpen ? '• LIVE' : ''}`;
    }

    // console.log("Live data updated at", timestamp);
  } catch (e) {
    console.error("Live data fetch failed:", e);
  }
}

function startLiveDataUpdates() {
  if (liveDataInterval) {
    clearInterval(liveDataInterval);
  }
  liveDataInterval = setInterval(liveDataChange, 60000);
  liveDataChange(); // Initial call
}

function stopLiveDataUpdates() {
  if (liveDataInterval) {
    clearInterval(liveDataInterval);
    liveDataInterval = null;
  }
}

// INIT
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
  if (marketStatusInterval) {
    clearInterval(marketStatusInterval);
  }
});