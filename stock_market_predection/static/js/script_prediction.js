// MODEL DATA

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
  if (currentPriceElem) currentPriceElem.innerHTML = 'NPR ---';
  
  // Clear high and low
  const highElem = document.getElementById('pm-high');
  if (highElem) highElem.innerHTML = 'NPR ---';
  
  const lowElem = document.getElementById('pm-low');
  if (lowElem) lowElem.innerHTML = 'NPR ---';
  
  // Clear predicted value
  const predElem = document.getElementById('pm-pred');
  if (predElem) predElem.innerHTML = 'NPR ---';
  
  // Clear top prediction display
  const topPredPrice = document.getElementById('top-pred-price');
  if (topPredPrice) topPredPrice.textContent = 'NPR ---';
  
  const topPredChange = document.getElementById('top-pred-change');
  if (topPredChange) topPredChange.textContent = '▲ ---%';
  
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
}

function onHorizonChange() {
  updateHorizonNote();
  refreshPrediction();
}

function onStockChange() {
  const symbol = document.getElementById('stock-sel').value;
  
  // Clear all displayed data immediately
  clearDisplayData();
  
  // Blur the chart when stock change is triggered
  blurPredictionChart();
  
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

// Get current price (prioritize live data over historical)
function getCurrentPrice() {
  if (currentLiveData && currentLiveData.length > 0 && currentLiveData[0].ltp) {
    return parseFloat(currentLiveData[0].ltp);
  }
  return apiData ? apiData.data[0].close : 0;
}

// Get today's high (prioritize live data)
function getTodayHigh() {
  if (currentLiveData && currentLiveData.length > 0 && currentLiveData[0].high) {
    return parseFloat(currentLiveData[0].high);
  }
  return apiData ? apiData.data[0].high : 0;
}

// Get today's low (prioritize live data)
function getTodayLow() {
  if (currentLiveData && currentLiveData.length > 0 && currentLiveData[0].low) {
    return parseFloat(currentLiveData[0].low);
  }
  return apiData ? apiData.data[0].low : 0;
}

// Get previous close price
function getPreviousClose() {
  if (currentLiveData && currentLiveData.length > 0 && currentLiveData[0].pr_close) {
    return parseFloat(currentLiveData[0].pr_close);
  }
  return apiData && apiData.data && apiData.data[1] ? apiData.data[1].close : 0;
}

// Get percentage change
function getPercentageChange() {
  if (currentLiveData && currentLiveData.length > 0 && currentLiveData[0].per_change) {
    return parseFloat(currentLiveData[0].per_change);
  }
  const currentPrice = getCurrentPrice();
  const prevClose = getPreviousClose();
  if (prevClose !== 0) {
    return ((currentPrice - prevClose) / prevClose * 100);
  }
  return 0;
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
  const percentChange = getPercentageChange();
  const isPriceUp = percentChange >= 0;
  
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

  const isPredUp = finalPred > currentPrice;
  const modelLabel = activeModel === 'lstm' ? 'LSTM' : 'Random Forest';

  // Update top predicted price display
  const topPredPrice = document.getElementById('top-pred-price');
  const topPredChange = document.getElementById('top-pred-change');
  if (topPredPrice) {
    topPredPrice.textContent = `NPR ${finalPred.toFixed(2)}`;
    topPredPrice.className = isPredUp ? 'up' : 'dn';
  }
  if (topPredChange) {
    topPredChange.textContent = `${isPredUp ? '▲' : '▼'} ${Math.abs(changePct).toFixed(2)}%`;
    topPredChange.className = isPredUp ? 'up' : 'dn';
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
  
  // Update current price with percentage change inline
  const currentPriceElem = document.getElementById('pm-cur');
  const currentPriceChange = document.getElementById('pm-stock');
  currentPriceElem.innerHTML = `NPR ${currentPrice.toFixed(2).toLocaleString()}`;
  currentPriceChange.innerHTML = `${symbol} · Today <span class="${isPriceUp ? 'up' : 'dn'}" style="font-size: 12px; margin-left: 8px;">${isPriceUp ? '▲' : '▼'} ${isPriceUp ? '' : '-'}${Math.abs(percentChange).toFixed(2)}%</span>`;
  
  // Update stock name display (removed LIVE text)
  // document.getElementById('pm-stock').innerHTML = ;
  
  // Update high display with percentage inline
  const highElem = document.getElementById('pm-high');
  const highElemChgID = document.getElementById('pm-high-chg');
  if (highElem) {
    highElem.innerHTML = `NPR ${todayHigh.toFixed(2).toLocaleString()}`;
    highElemChgID.innerHTML = `▲ ${Math.abs(highChg).toFixed(2)}%`;
  }
  
  // Update low display with percentage inline
  const lowElem = document.getElementById('pm-low');
  const lowElemChgID = document.getElementById('pm-low-chg');
  if (lowElem) {
    lowElem.innerHTML = `NPR ${todayLow.toFixed(2).toLocaleString()}`;
    lowElemChgID.innerHTML = `▼ -${Math.abs(lowChg).toFixed(2)}%`;
  }
  
  // Update predicted price display with percentage inline
  const predElem = document.getElementById('pm-pred');
  const predElemChg = document.getElementById('pm-chg');
  if (predElem) {
    predElem.innerHTML = `NPR ${finalPred.toFixed(2).toLocaleString()}`;
    predElemChg.innerHTML = `<span class="${isPredUp ? 'up' : 'dn'}" style="font-size: 12px; margin-left: 8px;">${isPredUp ? '▲' : '▼'} ${isPredUp ? '' : '-'}${Math.abs(changePct).toFixed(2)}% in ${predData.length} day${predData.length > 1 ? 's' : ''}</span>`
    predElem.className = 'stat-val';
  }
  
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
      <td class="${isUp ? 'up' : 'dn'}">${isUp ? '▲ +' : '▼ '}${Math.abs(chg).toFixed(2)}%</td>
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
// LIVE DATA UPDATE - Now updates all displays dynamically
// LIVE DATA UPDATE - Now updates all displays dynamically
async function liveDataChange() {
  try {
    const symbol = document.getElementById('stock-sel').value;
    const marketStatusEl = document.querySelector('#market-status');
    const isMarketOpen = marketStatusEl && marketStatusEl.classList.contains('live-pill');
    
    const res = await fetch(`/prediction/live-stock-data/${symbol}/`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    currentLiveData = data; // Store the live data array
    
    // Update the timestamp display
    const updateIndicator = document.getElementById('live-update-time');
    if (updateIndicator && data && data.length > 0 && data[0].timestamp) {
      const timestamp = new Date(data[0].timestamp);
      const formattedDate = timestamp.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const formattedTime = timestamp.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      
      updateIndicator.innerHTML = `Last updated: ${formattedDate} at ${formattedTime} ${isMarketOpen ? '• LIVE' : ''}`;
      updateIndicator.style.fontSize = '14px';
      updateIndicator.style.color = '#505761';
      updateIndicator.style.padding = '8px 12px';
      updateIndicator.style.marginBottom = '10px';
      updateIndicator.style.borderBottom = '1px solid rgba(154,162,174,0.2)';
    } else if (updateIndicator) {
      const now = new Date();
      const formattedDate = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const formattedTime = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      updateIndicator.innerHTML = `Last updated: ${formattedDate} at ${formattedTime} ${isMarketOpen ? ' • LIVE' : ''}`;
    }
    
    // Refresh everything with the new live data
    if (apiData) {
      refreshPrediction(); // This will use the live data via getCurrentPrice()
    }
    
    console.log("Live data updated successfully");
  } catch (e) {
    console.error("Live data fetch failed:", e);
    
    // Show error in update time display
    const updateIndicator = document.getElementById('live-update-time');
    if (updateIndicator) {
      const now = new Date();
      const formattedDate = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const formattedTime = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      updateIndicator.innerHTML = `⚠️ Failed to fetch live data at ${formattedDate} at ${formattedTime}`;
      updateIndicator.style.color = '#e74c3c';
    }
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