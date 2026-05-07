let marketStatusInterval = null;

let currentTF = '1D';

async function updateData() {
    const res = await fetch('/api/stock-data/');
    const data = await res.json()


    const date = new Date(data.asOf);

    const formatted = date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });


    // Market index display
    const nepseValue = document.querySelector('#nepse-val');
    const nepseChange = document.querySelector('#nepse-chg');

    const marketTime = document.querySelector('#last-update-time');
    marketTime.innerText = 'As of: ' + formatted;

    nepseValue.innerText = data.nepseIndex;
    console.log("nepse index", data.nepseIndex);
    if (data.nepseValChange < 0) {
        nepseChange.innerText = '▼ ' + data.nepseValChange + '(' + data.nepsePerChange + ') %';
        nepseChange.classList.remove('up');
        nepseChange.classList.add('dn');
    } else {
        nepseChange.innerText = '▲ ' + data.nepseValChange + '(' + data.nepsePerChange + ') %';
        nepseChange.classList.remove('dn');
        nepseChange.classList.add('up');
    }

    // console.log(data)


    //Market trunover, shares etc

    document.querySelector('#trunover').innerText = `NPR ${data.turnover} B`;
    document.querySelector('#shares').innerText = `${data.shares} M`;
    document.querySelector('#transactions').innerText = `${data.transactions.toLocaleString('en-US')}`;
    document.querySelector('#scripts').innerText = `${data.scripts}`;



    //Advancing Declining Stocks
    const advancing = document.querySelector('#advancing');
    const declining = document.querySelector('#declining');
    const unchanged = document.querySelector('#unchanged');
    const positiveCircuit = document.querySelector('#plus-circuit');
    const negativeCircuit = document.querySelector('#minus-circuit');
    const totalListed = document.querySelector('#total-listed');

    advancing.innerText = data.market_breadth.advancing;
    declining.innerText = data.market_breadth.declining;
    unchanged.innerText = data.market_breadth.unchanged;
    positiveCircuit.innerText = data.market_breadth.positive_circuit;
    negativeCircuit.innerText = data.market_breadth.negative_circuit;
    totalListed.innerText = data.market_breadth.total_listed;


    //Top Gainers
    document.getElementById('gainers-body').innerHTML = [...data.gainers]
    .sort((a, b) => b.percentage_change - a.percentage_change)
    .map(d =>
        `<tr><td><div class="sym">${d.symbol}</div></td><td>${d.ltp}</td><td><span class="badge badge-up">${d.point_change}</span></td><td><span class="badge badge-up">${d.percentage_change}</span></td></tr>`
    ).join('');

    //Top losers
    document.getElementById('losers-body').innerHTML = [...data.loosers]
        .sort((a, b) => a.percentage_change - b.percentage_change)
        .map(d =>
            `<tr><td><div class="sym">${d.symbol}</div></td><td>${d.ltp}</td><td><span class="badge badge-dn">${d.point_change}</span></td><td><span class="badge badge-dn">${d.percentage_change}</span></td></tr>`
        ).join('');


    //Sectors
    const changes = data.sectors.map(s => Math.abs(s.percentage_change ?? s.percentage_change ?? 0));
    const maxPct = Math.max(...changes, 0.01); // prevent divide by zero

    document.getElementById('sector-list').innerHTML = data.sectors.map(s => {

        const change = s.percentage_change ?? s.percentage_change ?? 0;
        const pos = change >= 0;

        const w = Math.round(Math.abs(change) / maxPct * 100);

        return `
        <div class="sector-row">
            <span class="sector-name">${s.index_name}</span>
            <div class="bar-track">
                <div class="bar-fill ${pos ? 'pos' : 'neg'}" style="width:${w}%"></div>
            </div>
            <span class="sector-pct ${pos ? 'up' : 'dn'}">
                ${pos ? '+' : ''}${change.toFixed(2)}%
            </span>
        </div>`;
    }).join('');


    //Active stocks
    document.getElementById('active-body').innerHTML =
        data.active_stocks.map(d => {
            const pct = parseFloat(d.percentage_change);
            const qty = Number(d.total_traded_quantity);
            const ltp = parseFloat(d.ltp);

            return `
                <tr>
                <td>
                    <div class="sym">${d.symbol}</div>
                    <div class="co-name">${d.name}</div>
                </div>
                <td>${ltp.toFixed(2)}</div>
                <td>
                    <span class="badge ${pct > 0 ? 'badge-up' : 'badge-dn'}">
                        ${pct.toFixed(2)}%
                    </span>
                </div>
                <td>${qty.toLocaleString()}</div>
                </tr>`;
        }).join('');
    // console.log('Data Updated Successfilly....');

    //Market Status display
    

    
    // console.log('market status: ', data.isOpen)


}

updateData();


// setInterval(() => {
//     allNepseData = [];
//     historicalData = [];
//     initChart();
// }, 60500);

setInterval(() => {
    updateData();
}, 30000);









// //BELOW IS THE JS FOR THE CHART


// BELOW IS THE JS FOR THE CHART
// INDEX CHART
let indexChart;
let allNepseData = [];
let historicalData = [];
let currentMarketStatus = "CLOSE";
let chartRefreshInterval = null;

async function fetchNepseData() {
    try {
        const dailyResponse = await fetch('/api/latest-chart/');
        if (!dailyResponse.ok) throw new Error('API request failed');
        const dailyDataResponse = await dailyResponse.json();
        
        currentMarketStatus = dailyDataResponse.market_status;
        const dailyData = dailyDataResponse.data;
        const intradayData = Array.isArray(dailyData) ? dailyData : [];

        const historicalResponse = await fetch('/api/index-chart/');
        if (!historicalResponse.ok) throw new Error('API request failed');
        const historicalData_raw = await historicalResponse.json();
        const historicalDataArray = Array.isArray(historicalData_raw) ? historicalData_raw : [];

        return {
            intraday: intradayData,
            historical: historicalDataArray,
            marketStatus: currentMarketStatus
        };
    } catch (error) {
        console.error('Error fetching NEPSE data:', error);
        return { intraday: [], historical: [], marketStatus: "CLOSE" };
    }
}

function isMarketOpen() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTimeInMinutes = hours * 60 + minutes;
    
    const marketOpenTime = 11 * 60;
    const marketCloseTime = 15 * 60;
    
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isWithinMarketHours = currentTimeInMinutes >= marketOpenTime && currentTimeInMinutes <= marketCloseTime;
    
    return isWeekday && isWithinMarketHours;
}

function isWeekend() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
}

// Function to manage chart refresh interval
function manageChartRefreshInterval() {
    // Clear existing interval
    if (chartRefreshInterval) {
        clearInterval(chartRefreshInterval);
        chartRefreshInterval = null;
    }

    console.log('Chart interval started - Checking market status every 60 seconds');

    chartRefreshInterval = setInterval(() => {
        if (currentTF !== '1D') return;

        if (isMarketOpen()) {
            console.log('Market is OPEN - Refreshing chart...', new Date().toLocaleTimeString());
            
            refreshOneDayChart();
        } else if (isWeekend()) {
            console.log('Weekend - Market closed, waiting...', new Date().toLocaleTimeString());
        } else {
            console.log('Market is CLOSED - Waiting for market to open...', new Date().toLocaleTimeString());
        }
    }, 60000);
}

async function refreshOneDayChart() {
    console.log('Refreshing 1D chart...', new Date().toLocaleTimeString());
    
    const canvas = document.getElementById('indexChart');
    if (canvas) canvas.style.opacity = '0.5';
    
    try {
        allNepseData = [];
        
        const dailyResponse = await fetch('/api/latest-chart/');
        if (!dailyResponse.ok) throw new Error('API request failed');
        
        const dailyDataResponse = await dailyResponse.json();
        currentMarketStatus = dailyDataResponse.market_status;
        allNepseData = Array.isArray(dailyDataResponse.data) ? dailyDataResponse.data : [];
        
        await buildIndexChart('1D');
        console.log('1D chart refreshed successfully');
    } catch (error) {
        console.error('Error refreshing 1D chart:', error);
    } finally {
        if (canvas) canvas.style.opacity = '1';
    }
}

function detectTimeInterval(data) {
    if (data.length < 2) return 10;
    const timestamp1 = new Date(data[0].timestamp);
    const timestamp2 = new Date(data[1].timestamp);
    const diffMinutes = Math.abs(timestamp2 - timestamp1) / (1000 * 60);
    console.log(`Detected time interval: ${diffMinutes} minutes`);
    
    if (diffMinutes <= 1.5) return 1;
    if (diffMinutes <= 3) return 2;
    if (diffMinutes <= 5.5) return 5;
    if (diffMinutes <= 10.5) return 10;
    if (diffMinutes <= 15.5) return 15;
    if (diffMinutes <= 30.5) return 30;
    return Math.round(diffMinutes);
}

function filterDataByTimeframe(data, tf) {
    if (tf === '1D') {
        if (!data.intraday || !Array.isArray(data.intraday)) {
            return { data: [], interval: 10, marketStatus: data.marketStatus || "CLOSE" };
        }
        
        const intradayData = [...data.intraday].reverse();
        const interval = detectTimeInterval(intradayData);
        
        if (intradayData.length > 0) {
            const firstTimestamp = new Date(intradayData[0].timestamp);
            const lastTimestamp = new Date(intradayData[intradayData.length - 1].timestamp);
            console.log(`1D View: ${intradayData.length} data points at ${interval}-minute intervals`);
            console.log(`Time range: ${firstTimestamp.toLocaleTimeString()} to ${lastTimestamp.toLocaleTimeString()}`);
        }
        
        return { data: intradayData, interval: interval, marketStatus: data.marketStatus };
    } else {
        if (!data.historical || !Array.isArray(data.historical)) {
            return { data: [], interval: 1440, marketStatus: "CLOSE" };
        }
        
        const points = { '1W': 7, '1M': 30, '3M': 90 }[tf] || 48;
        return { data: data.historical.slice(0, points).reverse(), interval: 1440, marketStatus: "CLOSE" };
    }
}

function formatLabels(data, tf, interval) {
    if (tf === '1D') {
        return data.map(item => {
            const timestamp = new Date(item.timestamp);
            let hours = timestamp.getHours();
            const minutes = timestamp.getMinutes();
            const period = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            const formattedMinutes = minutes.toString().padStart(2, '0');
            
            if (interval <= 1) {
                const seconds = timestamp.getSeconds().toString().padStart(2, '0');
                return `${hours}:${formattedMinutes}:${seconds} ${period}`;
            }
            return `${hours}:${formattedMinutes} ${period}`;
        });
    } else if (tf === '1W') {
        return data.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
        });
    } else {
        return data.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        });
    }
}

async function buildIndexChart(tf) {
    const canvas = document.getElementById('indexChart');
    if (canvas) canvas.style.opacity = '0.7';

    if (allNepseData.length === 0 || historicalData.length === 0) {
        const fetchedData = await fetchNepseData();
        allNepseData = fetchedData.intraday;
        historicalData = fetchedData.historical;
        currentMarketStatus = fetchedData.marketStatus;
    }

    const dataForView = { intraday: allNepseData, historical: historicalData, marketStatus: currentMarketStatus };
    const { data: filteredData, interval, marketStatus: marketStatusForView } = filterDataByTimeframe(dataForView, tf);

    if (filteredData.length === 0) {
        console.error('No data available for timeframe:', tf);
        if (indexChart) indexChart.destroy();
        const canvas = document.getElementById('indexChart');
        const ctx = canvas?.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = '14px IBM Plex Mono';
            ctx.fillStyle = '#9aa2ae';
            ctx.textAlign = 'center';
            ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
        }
        if (canvas) canvas.style.opacity = '1';
        return;
    }

    let closeValues, labels;
    if (tf === '1D') {
        closeValues = filteredData.map(item => parseFloat(item.nepse_index));
        labels = formatLabels(filteredData, tf, interval);
    } else {
        closeValues = filteredData.map(item => parseFloat(item.close));
        labels = formatLabels(filteredData, tf, interval);
    }

    let minValue, maxValue, padding;
    if (closeValues.length === 1) {
        minValue = closeValues[0] - 20;
        maxValue = closeValues[0] + 20;
        padding = 0;
    } else {
        minValue = Math.min(...closeValues);
        maxValue = Math.max(...closeValues);
        padding = (maxValue - minValue) * 0.1;
    }

    if (indexChart) indexChart.destroy();

    let xAxisConfig = {
        display: true,
        grid: { display: tf === '1D' && filteredData.length > 5, color: 'rgba(154,162,174,0.1)' },
        ticks: { display: true, color: '#9aa2ae', font: { size: 12, family: 'IBM Plex Mono' } }
    };

    const dataPointCount = filteredData.length;

    if (tf === '1D') {
        const marketHours = 4;
        const expectedMaxPoints = Math.floor((marketHours * 60) / interval) + 1;
        
        let lastUpdateText = '';
        if (dataPointCount > 0) {
            const lastTimestamp = new Date(filteredData[filteredData.length - 1].timestamp);
            lastUpdateText = ` | Last: ${lastTimestamp.toLocaleTimeString()}`;
        }
        
        let autoRefreshText = '';
        if (marketStatusForView === "OPEN" && isMarketOpen()) {
            autoRefreshText = ' | 🔄 Auto-refresh: 60s';
        }
        
        const marketStatusIcon = marketStatusForView === "OPEN" ? "🟢" : "🔴";
        const marketStatusText = marketStatusForView === "OPEN" ? "MARKET OPEN" : "MARKET CLOSED";
        
        // SHOW 8 TIMESTAMPS TOTAL (FIRST, LAST, AND 6 EVENLY SPACED IN BETWEEN)
        if (dataPointCount >= 8) {
            const totalLabels = labels.length;
            // We want 8 ticks total: first, last, and 6 evenly spaced in between
            const targetTicks = 8;
            const step = (totalLabels - 1) / (targetTicks - 1);
            
            // Create array of indices to show
            const indicesToShow = [];
            for (let i = 0; i < targetTicks; i++) {
                const index = Math.round(i * step);
                if (!indicesToShow.includes(index) && index < totalLabels) {
                    indicesToShow.push(index);
                }
            }
            
            // Ensure last index is included
            if (!indicesToShow.includes(totalLabels - 1)) {
                indicesToShow[indicesToShow.length - 1] = totalLabels - 1;
            }
            
            // Create new labels array with empty strings for hidden labels
            const newLabels = [];
            for (let i = 0; i < totalLabels; i++) {
                if (indicesToShow.includes(i)) {
                    newLabels.push(labels[i]);
                } else {
                    newLabels.push(''); // Empty string hides the tick
                }
            }
            
            // Replace the labels array
            labels.length = 0;
            labels.push(...newLabels);
            
            // Configure x-axis ticks
            xAxisConfig.ticks.maxRotation = 45;
            xAxisConfig.ticks.minRotation = 40;
            xAxisConfig.ticks.autoSkip = false;
            xAxisConfig.ticks.maxTicksLimit = targetTicks;
            
        } else if (dataPointCount > 5) {
            // Show all data points but ensure no overlapping
            xAxisConfig.ticks.maxRotation = 30;
            xAxisConfig.ticks.minRotation = 30;
            xAxisConfig.ticks.autoSkip = true;
            xAxisConfig.ticks.maxTicksLimit = dataPointCount;
        } else {
            // Show all data points
            xAxisConfig.ticks.maxRotation = 30;
            xAxisConfig.ticks.minRotation = 30;
            xAxisConfig.ticks.autoSkip = false;
            xAxisConfig.ticks.maxTicksLimit = dataPointCount;
        }
        
        xAxisConfig.title = {
            display: true,
            text: `${marketStatusIcon} ${marketStatusText}${autoRefreshText}${lastUpdateText}`,
            color: marketStatusForView === "OPEN" ? '#2ecc71' : (dataPointCount <= 5 ? '#e74c3c' : (dataPointCount < expectedMaxPoints ? '#f39c12' : '#27ae60')),
            font: { size: 12, family: 'IBM Plex Mono', weight: marketStatusForView === "OPEN" ? 'bold' : 'normal' },
            padding: { top: 10 }
        };
    } else if (tf === '1W') {
        xAxisConfig.ticks.maxRotation = 25;
        xAxisConfig.ticks.minRotation = 25;
        xAxisConfig.ticks.autoSkip = dataPointCount > 10;
        xAxisConfig.ticks.maxTicksLimit = Math.min(7, dataPointCount);
        xAxisConfig.title = { display: true, text: `Last ${dataPointCount} Day${dataPointCount !== 1 ? 's' : ''}`, color: '#9aa2ae', font: { size: 12, family: 'IBM Plex Mono' }, padding: { top: 10 } };
    } else if (tf === '1M') {
        xAxisConfig.ticks.maxRotation = 45;
        xAxisConfig.ticks.minRotation = 45;
        xAxisConfig.ticks.autoSkip = dataPointCount > 15;
        xAxisConfig.ticks.maxTicksLimit = 8;
        xAxisConfig.title = { display: true, text: `Last ${dataPointCount} Day${dataPointCount !== 1 ? 's' : ''}`, color: '#9aa2ae', font: { size: 12, family: 'IBM Plex Mono' }, padding: { top: 10 } };
    } else if (tf === '3M') {
        xAxisConfig.ticks.maxRotation = 45;
        xAxisConfig.ticks.minRotation = 45;
        xAxisConfig.ticks.autoSkip = dataPointCount > 20;
        xAxisConfig.ticks.maxTicksLimit = 10;
        xAxisConfig.title = { display: true, text: `Last ${dataPointCount} Day${dataPointCount !== 1 ? 's' : ''}`, color: '#9aa2ae', font: { size: 12, family: 'IBM Plex Mono' }, padding: { top: 10 } };
    }

    const customXAxisLabels = {
        id: 'customXAxisLabels',
        afterDraw(chart) {
            if (tf === '1D' && marketStatusForView === "OPEN") {
                const ctx = chart.ctx;
                const xAxis = chart.scales.x;
                const marketOpenTime = new Date();
                marketOpenTime.setHours(11, 0, 0, 0);
                const currentTime = new Date();
                
                const formatTimeForDisplay = (date) => {
                    let hours = date.getHours();
                    const minutes = date.getMinutes();
                    const period = hours >= 12 ? 'PM' : 'AM';
                    hours = hours % 12;
                    hours = hours ? hours : 12;
                    return `${hours}:${minutes.toString().padStart(2, '0')} ${period}`;
                };
                
                ctx.save();
                ctx.font = 'bold 11px "IBM Plex Mono"';
                const xAxisY = xAxis.bottom + 15;
                
                ctx.fillStyle = '#2ecc71';
                ctx.textAlign = 'left';
                ctx.fillText(`🟢 OPEN: ${formatTimeForDisplay(marketOpenTime)}`, xAxis.left, xAxisY);
                
                ctx.fillStyle = '#3498db';
                ctx.textAlign = 'right';
                ctx.fillText(`🕐 CURRENT: ${formatTimeForDisplay(currentTime)}`, xAxis.right, xAxisY);
                
                ctx.strokeStyle = 'rgba(46, 204, 113, 0.3)';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(xAxis.left, xAxis.bottom);
                ctx.lineTo(xAxis.right, xAxis.bottom);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
            }
        }
    };

    indexChart = new Chart(document.getElementById('indexChart'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                data: closeValues,
                borderColor: '#0a7c4e',
                borderWidth: 2.5,
                pointRadius: dataPointCount <= 30 ? 3 : 2,
                pointHoverRadius: 7,
                pointBackgroundColor: '#0a7c4e',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 1.5,
                pointHoverBackgroundColor: '#0a7c4e',
                pointHoverBorderColor: '#ffffff',
                tension: dataPointCount <= 3 ? 0 : 0.2,
                fill: true,
                backgroundColor: 'rgba(10,124,78,0.08)',
                spanGaps: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 500, easing: 'easeInOutQuart' },
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: (tooltipItems) => {
                            if (tf === '1D') {
                                const item = filteredData[tooltipItems[0].dataIndex];
                                return new Date(item.timestamp).toLocaleString();
                            } else {
                                return filteredData[tooltipItems[0].dataIndex].date;
                            }
                        },
                        label: (context) => {
                            const value = context.parsed.y;
                            if (tf === '1D') {
                                const item = filteredData[context.dataIndex];
                                return [`NPR ${value.toFixed(2)}`, `Time: ${new Date(item.timestamp).toLocaleTimeString()}`];
                            } else {
                                const item = filteredData[context.dataIndex];
                                return [
                                    `NPR ${value.toFixed(2)}`,
                                    `Change: ${parseFloat(item.absolute_change).toFixed(2)} (${parseFloat(item.percentage_change).toFixed(2)}%)`,
                                    `High: ${parseFloat(item.high).toFixed(2)}`,
                                    `Low: ${parseFloat(item.low).toFixed(2)}`
                                ];
                            }
                        }
                    }
                }
            },
            scales: {
                x: xAxisConfig,
                y: {
                    position: 'right',
                    grid: { color: 'rgba(154,162,174,0.15)' },
                    ticks: { color: '#9aa2ae', font: { size: 12, family: 'IBM Plex Mono' }, callback: (value) => value.toFixed(0) },
                    min: minValue - padding,
                    max: maxValue + padding
                }
            }
        },
        plugins: [customXAxisLabels]
    });

    if (canvas) canvas.style.opacity = '1';
}

async function switchTF(btn, tf) {
    currentTF = tf;
    document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const originalText = btn.textContent;
    btn.textContent = 'Loading...';
    btn.disabled = true;
    
    try {
        await buildIndexChart(tf);
        if (tf === '1D') {
            manageChartRefreshInterval();
        }
    } catch (error) {
        console.error('Error switching timeframe:', error);
        if (indexChart) indexChart.destroy();
        const canvas = document.getElementById('indexChart');
        const ctx = canvas?.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = '14px IBM Plex Mono';
            ctx.fillStyle = '#9aa2ae';
            ctx.textAlign = 'center';
            ctx.fillText('Error loading data', canvas.width / 2, canvas.height / 2);
        }
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

function displayIndexMetrics(data) {
    if (!data || data.length === 0) return;
    const latest = data[0];
    const change = parseFloat(latest.absolute_change);
    const changeSymbol = change >= 0 ? '+' : '';
    
    const currentValueEl = document.getElementById('currentIndexValue');
    if (currentValueEl) currentValueEl.textContent = parseFloat(latest.close).toFixed(2);
    
    const changeEl = document.getElementById('indexChange');
    if (changeEl) {
        changeEl.textContent = `${changeSymbol}${change.toFixed(2)} (${changeSymbol}${parseFloat(latest.percentage_change).toFixed(2)}%)`;
        changeEl.className = change >= 0 ? 'positive' : 'negative';
    }
}

async function initChart() {
    await buildIndexChart('1D');
    if (historicalData.length > 0) displayIndexMetrics(historicalData);
    manageChartRefreshInterval();
}

// Start the chart
initChart();