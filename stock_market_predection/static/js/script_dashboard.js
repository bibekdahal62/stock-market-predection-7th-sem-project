let marketStatusInterval = null;


async function updateData() {
    const res = await fetch('/api/stock-data/');
    const data = await res.json()


    // Market index display
    const nepseValue = document.querySelector('#nepse-val');
    const nepseChange = document.querySelector('#nepse-chg');

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

    document.querySelector('#trunover').innerText = `NPR ${data.trunover} B`;
    document.querySelector('#shares').innerText = `${data.shares} M`;
    document.querySelector('#transactions').innerText = `${data.transactions.toLocaleString('en-US')}`;
    document.querySelector('#scripts').innerText = `${data.scripts}`;



    //Advancing Declining Stocks
    const advancing = document.querySelector('#advancing');
    const declining = document.querySelector('#declining');
    const unchanged = document.querySelector('#unchanged');
    const totalListed = document.querySelector('#total-listed');

    advancing.innerText = data.advancing;
    declining.innerText = data.declining;
    unchanged.innerText = data.unchanged;
    totalListed.innerText = data.total_listed;


    //Top Gainers
    document.getElementById('gainers-body').innerHTML = data.gainers.map(d =>
        `<tr><td><div class="sym">${d.symbol}</div></td><td>${d.ltp}</td><td><span class="badge badge-up">${d.pointChange}</span></td><td><span class="badge badge-up">${d.percentageChange}</span></td></tr>`
    ).join('');


    //Top Loosers
    document.getElementById('losers-body').innerHTML = data.loosers.map(d =>
        `<tr><td><div class="sym">${d.symbol}</div></td><td>${d.ltp}</td><td><span class="badge badge-dn">${d.pointChange}</span></td><td><span class="badge badge-dn">${d.percentageChange}</span></td></tr>`
    ).join('');


    //Sectors
    const changes = data.sectors.map(s => Math.abs(s.perChange ?? s.perachange ?? 0));
    const maxPct = Math.max(...changes, 0.01); // prevent divide by zero

    document.getElementById('sector-list').innerHTML = data.sectors.map(s => {

        const change = s.perChange ?? s.perachange ?? 0;
        const pos = change >= 0;

        const w = Math.round(Math.abs(change) / maxPct * 100);

        return `
        <div class="sector-row">
            <span class="sector-name">${s.index}</span>
            <div class="bar-track">
                <div class="bar-fill ${pos ? 'pos' : 'neg'}" style="width:${w}%"></div>
            </div>
            <span class="sector-pct ${pos ? 'up' : 'dn'}">
                ${pos ? '+' : ''}${change.toFixed(2)}%
            </span>
        </div>`;
    }).join('');


    //Active stocks
    document.getElementById('active-body').innerHTML = data.active_stocks.map(d =>
        `<tr>
      <td><div class="sym">${d.symbol}</div><div class="co-name">${d.securityName}</div></td>
      <td>${d.lastTradedPrice}</td>
      <td><span class="badge ${d.percentageChange > 0 ? 'badge-up' : 'badge-dn'}">${d.percentageChange}</span></td>
      <td>${d.totalTradeQuantity.toLocaleString()}</td>
    </tr>`
    ).join('');
    // console.log('Data Updated Successfilly....');

    //Market Status display
    const status = document.querySelector('#market-status');
    const marketTime = document.querySelector('#last-update-time');

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
    // console.log('market status: ', data.isOpen)

    if (data.isOpen === 'OPEN') {
        status.innerHTML = '<span class="live-dot"></span> OPEN</div>'
        status.classList.remove('close-pill');
        status.classList.add('live-pill');
        marketTime.innerText = 'As of: ' + formatted;
        // 👉 start interval ONLY if not already running
        // if (!marketStatusInterval) {
        //     marketStatusInterval = setInterval(updateData, 200000); // 10 sec
        // }

    } else {
        status.innerHTML = '<span class="close-dot"></span> CLOSE</div>'
        status.classList.remove('live-pill');
        status.classList.add('close-pill');
        marketTime.innerText = 'As of: ' + formatted;

        // 👉 stop auto refresh when market is closed
        // if (marketStatusInterval) {
        //     clearInterval(marketStatusInterval);
        //     marketStatusInterval = null;
        // }

    }


}

updateData();

setInterval(updateData, 20000);

// async function marketIndex() {
//     const res = await fetch('/api/market-index/');
//     const data = await res.json();

//     const nepseValue = document.querySelector('#nepse-val');
//     const nepseChange = document.querySelector('#nepse-chg');

//     nepseValue.innerText = data.nepseIndex;
//     console.log("nepse index", data.nepseIndex);
//     if (data.nepseValChange < 0) {
//         nepseChange.innerText = '▼ ' + data.nepseValChange + '(' + data.nepsePerChange + ') %';
//         nepseChange.classList.remove('up');
//         nepseChange.classList.add('dn');
//     } else {
//         nepseChange.innerText = '▲ ' + data.nepseValChange + '(' + data.nepsePerChange + ') %';
//         nepseChange.classList.remove('dn');
//         nepseChange.classList.add('up');
//     }
//     // console.log("Index updated..");
// }

// async function marketStatus() {
//     const res = await fetch('/api/market-status/');
//     const data = await res.json();

//     const status = document.querySelector('#market-status');
//     const time = document.querySelector('#last-update-time');

//     const date = new Date(data.asOf);

//     const formatted = date.toLocaleString('en-US', {
//         year: 'numeric',
//         month: 'long',
//         day: 'numeric',
//         hour: '2-digit',
//         minute: '2-digit',
//         second: '2-digit',
//         hour12: true
//     });
//     // console.log('market status: ', data.isOpen)

//     if (data.isOpen === 'OPEN') {
//         status.innerHTML = '<span class="live-dot"></span> OPEN</div>'
//         status.classList.remove('close-pill');
//         status.classList.add('live-pill');
//         time.innerText = 'As of: ' + formatted;
//         // 👉 start interval ONLY if not already running
//         if (!marketStatusInterval) {
//             marketStatusInterval = setInterval(marketStatus, 120000); // 10 sec
//         }

//     } else {
//         status.innerHTML = '<span class="close-dot"></span> CLOSE</div>'
//         status.classList.remove('live-pill');
//         status.classList.add('close-pill');
//         time.innerText = 'As of: ' + formatted;

//         // 👉 stop auto refresh when market is closed
//         if (marketStatusInterval) {
//             clearInterval(marketStatusInterval);
//             marketStatusInterval = null;
//         }

//     }

// }



// async function advancingDecliningStocks() {
//     const res = await fetch('/api/stocks-status/');
//     const data = await res.json();

//     const advancing = document.querySelector('#advancing');
//     const declining = document.querySelector('#declining');
//     const unchanged = document.querySelector('#unchanged');
//     const totalListed = document.querySelector('#total-listed');

//     advancing.innerText = data.advancing;
//     declining.innerText = data.declining;
//     unchanged.innerText = data.unchanged;
//     totalListed.innerText = data.total_listed;

// }


// async function gainers() {
//     const res = await fetch('/api/gainers/');
//     const data = await res.json();

//     document.getElementById('gainers-body').innerHTML = data.gainers.map(d =>
//         `<tr><td><div class="sym">${d.symbol}</div></td><td>${d.ltp}</td><td><span class="badge badge-up">${d.pointChange}</span></td><td><span class="badge badge-up">${d.percentageChange}</span></td></tr>`
//     ).join('');

//     // console.log(data.gainers)
// }


// async function loosers() {
//     const res = await fetch('/api/loosers/');
//     const data = await res.json();

//     document.getElementById('losers-body').innerHTML = data.loosers.map(d =>
//         `<tr><td><div class="sym">${d.symbol}</div></td><td>${d.ltp}</td><td><span class="badge badge-dn">${d.pointChange}</span></td><td><span class="badge badge-dn">${d.percentageChange}</span></td></tr>`
//     ).join('');
//     // console.log('loosers')
// }



// async function sectors() {
//     const res = await fetch('/api/sectors/');
//     const data = await res.json();

//     const changes = data.sectors.map(s => Math.abs(s.perChange ?? s.perachange ?? 0));
//     const maxPct = Math.max(...changes, 0.01); // prevent divide by zero

//     document.getElementById('sector-list').innerHTML = data.sectors.map(s => {

//         const change = s.perChange ?? s.perachange ?? 0;
//         const pos = change >= 0;

//         const w = Math.round(Math.abs(change) / maxPct * 100);

//         return `
//         <div class="sector-row">
//             <span class="sector-name">${s.index}</span>
//             <div class="bar-track">
//                 <div class="bar-fill ${pos ? 'pos' : 'neg'}" style="width:${w}%"></div>
//             </div>
//             <span class="sector-pct ${pos ? 'up' : 'dn'}">
//                 ${pos ? '+' : ''}${change.toFixed(2)}%
//             </span>
//         </div>`;
//     }).join('');
// }


// async function activeStocks() {
//     const res = await fetch('/api/active-stocks/');
//     const data = await res.json();

//     // console.log(data.active_stocks)

//     document.getElementById('active-body').innerHTML = data.active_stocks.map(d =>
//         `<tr>
//       <td><div class="sym">${d.symbol}</div><div class="co-name">${d.securityName}</div></td>
//       <td>${d.lastTradedPrice}</td>
//       <td><span class="badge ${d.percentageChange > 0 ? 'badge-up' : 'badge-dn'}">${d.percentageChange}</span></td>
//       <td>${d.totalTradeQuantity.toLocaleString()}</td>
//     </tr>`
//     ).join('');
// }


//BELOW IS THE JS FOR THE CHART


// INDEX CHART
// INDEX CHART
let indexChart;
let allNepseData = []; // Store daily intraday data
let historicalData = []; // Store historical daily closing data
let currentMarketStatus = "CLOSE"; // Store market status (renamed to avoid conflict)

async function fetchNepseData() {
    try {
        // Fetch daily intraday data for 1D view
        const dailyResponse = await fetch('/api/latest-chart/');

        if (!dailyResponse.ok) throw new Error('API request failed');

        const dailyDataResponse = await dailyResponse.json();

        // Extract market status and data from the response
        currentMarketStatus = dailyDataResponse.market_status;
        const dailyData = dailyDataResponse.data;

        // Fetch historical daily closing data for 1W, 1M, 3M views
        const historicalResponse = await fetch('/api/index-chart/');

        if (!historicalResponse.ok) throw new Error('API request failed');

        const historicalData_raw = await historicalResponse.json();

        return {
            intraday: dailyData, // Intraday data (any interval: 1min, 5min, 10min, etc.)
            historical: historicalData_raw, // Daily closing data
            marketStatus: currentMarketStatus
        };
    } catch (error) {
        console.error('Error fetching NEPSE data:', error);
        return { intraday: [], historical: [], marketStatus: "CLOSE" };
    }
}

// Function to detect the time interval between data points
function detectTimeInterval(data) {
    if (data.length < 2) return 10; // Default to 10 minutes if not enough data

    // Get first two timestamps to calculate interval
    const timestamp1 = new Date(data[0].timestamp);
    const timestamp2 = new Date(data[1].timestamp);

    // Calculate difference in minutes
    const diffMinutes = Math.abs(timestamp2 - timestamp1) / (1000 * 60);

    console.log(`Detected time interval: ${diffMinutes} minutes`);

    // Round to nearest common interval
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
        // Return intraday data sorted chronologically
        const intradayData = [...data.intraday].reverse();

        // Detect the time interval
        const interval = detectTimeInterval(intradayData);

        // Log data info
        if (intradayData.length > 0) {
            const firstTimestamp = new Date(intradayData[0].timestamp);
            const lastTimestamp = new Date(intradayData[intradayData.length - 1].timestamp);
            console.log(`1D View: ${intradayData.length} data points at ${interval}-minute intervals`);
            console.log(`Time range: ${firstTimestamp.toLocaleTimeString()} to ${lastTimestamp.toLocaleTimeString()}`);
            // console.log(`Market Status: ${data.marketStatus}`);
        }

        return {
            data: intradayData,
            interval: interval,
            marketStatus: data.marketStatus
        };
    } else {
        // For 1W, 1M, 3M use historical daily closing data
        const points = {
            '1W': 7,      // Last 7 days
            '1M': 30,     // Last 30 days
            '3M': 90      // Last 90 days
        }[tf] || 48;

        return {
            data: data.historical.slice(0, points).reverse(),
            interval: 1440, // 24 hours in minutes for daily data
            marketStatus: "CLOSE"
        };
    }
}

function formatLabels(data, tf, interval) {
    if (tf === '1D') {
        // Format timestamps based on available data points
        return data.map(item => {
            const timestamp = new Date(item.timestamp);
            let hours = timestamp.getHours();
            const minutes = timestamp.getMinutes();
            const period = hours >= 12 ? 'PM' : 'AM';

            // Convert to 12-hour format
            hours = hours % 12;
            hours = hours ? hours : 12;

            const formattedMinutes = minutes.toString().padStart(2, '0');

            // Show seconds if interval is 1 minute or less
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
    } else if (tf === '1M' || tf === '3M') {
        return data.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        });
    }

    return data.map(item => {
        const date = new Date(item.date);
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    });
}

async function buildIndexChart(tf) {
    // Show loading state
    const canvas = document.getElementById('indexChart');
    const ctx = canvas?.getContext('2d');
    if (ctx) {
        canvas.style.opacity = '0.7';
    }

    // Fetch data if not already loaded
    if (allNepseData.length === 0 || historicalData.length === 0) {
        const fetchedData = await fetchNepseData();
        allNepseData = fetchedData.intraday;
        historicalData = fetchedData.historical;
        currentMarketStatus = fetchedData.marketStatus;
    }

    const dataForView = {
        intraday: allNepseData,
        historical: historicalData,
        marketStatus: currentMarketStatus
    };

    // Filter data based on timeframe
    const { data: filteredData, interval, marketStatus: marketStatusForView } = filterDataByTimeframe(dataForView, tf);

    if (filteredData.length === 0) {
        console.error('No data available for timeframe:', tf);
        // Show "No Data" message on chart
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
        canvas.style.opacity = '1';
        return;
    }

    // Extract values based on data type
    let closeValues, labels;

    if (tf === '1D') {
        closeValues = filteredData.map(item => parseFloat(item.nepse_index));
        labels = formatLabels(filteredData, tf, interval);
    } else {
        closeValues = filteredData.map(item => parseFloat(item.close));
        labels = formatLabels(filteredData, tf, interval);
    }

    // Calculate min and max for better y-axis
    let minValue, maxValue, padding;

    if (closeValues.length === 1) {
        // If only one data point, add padding
        minValue = closeValues[0] - 20;
        maxValue = closeValues[0] + 20;
        padding = 0;
    } else {
        minValue = Math.min(...closeValues);
        maxValue = Math.max(...closeValues);
        padding = (maxValue - minValue) * 0.1;
    }

    // Destroy existing chart if it exists
    if (indexChart) {
        indexChart.destroy();
    }

    // Configure x-axis based on data points count and interval
    let xAxisConfig = {
        display: true,
        grid: {
            display: tf === '1D' && filteredData.length > 5,
            color: 'rgba(154,162,174,0.1)'
        },
        ticks: {
            display: true,
            color: '#9aa2ae',
            font: {
                size: 6,
                family: 'IBM Plex Mono'
            }
        }
    };

    // Dynamic x-axis configuration based on available data points
    const dataPointCount = filteredData.length;

    if (tf === '1D') {
        // Calculate expected max points based on interval
        const marketHours = 4; // 11 AM to 3 PM = 4 hours
        const expectedMaxPoints = Math.floor((marketHours * 60) / interval) + 1;

        // Get last update time
        let lastUpdateText = '';
        if (dataPointCount > 0) {
            const lastTimestamp = new Date(filteredData[filteredData.length - 1].timestamp);
            lastUpdateText = ` | Last: ${lastTimestamp.toLocaleTimeString()}`;
        }

        // Set title based on data completeness and market status
        const percentageComplete = (dataPointCount / expectedMaxPoints * 100).toFixed(0);

        // Add market status indicator to title
        const marketStatusIcon = marketStatusForView === "OPEN" ? "🟢" : "🔴";
        const marketStatusText = marketStatusForView === "OPEN" ? "MARKET OPEN" : "MARKET CLOSED";

        if (marketStatusForView === "OPEN") {
            xAxisConfig.ticks.maxRotation = 30;
            xAxisConfig.ticks.minRotation = 30;
            xAxisConfig.ticks.autoSkip = false;
            xAxisConfig.title = {
                display: true,
                text: `${marketStatusIcon} ${marketStatusText}${lastUpdateText}`,
                color: '#2ecc71',
                font: { size: 10, family: 'IBM Plex Mono', weight: 'bold' },
                padding: { top: 10 }
            };
        } else {
            if (dataPointCount <= 5) {
                xAxisConfig.ticks.maxRotation = 0;
                xAxisConfig.ticks.minRotation = 0;
                xAxisConfig.ticks.autoSkip = false;
                xAxisConfig.title = {
                    display: true,
                    text: `${marketStatusIcon} ${marketStatusText}${lastUpdateText}`,
                    color: '#e74c3c',
                    font: { size: 10, family: 'IBM Plex Mono' },
                    padding: { top: 10 }
                };
            } else if (dataPointCount < expectedMaxPoints) {
                xAxisConfig.ticks.maxRotation = 30;
                xAxisConfig.ticks.minRotation = 30;
                xAxisConfig.ticks.autoSkip = false;
                xAxisConfig.title = {
                    display: true,
                    text: `${marketStatusIcon} ${marketStatusText}${lastUpdateText}`,
                    color: '#f39c12',
                    font: { size: 10, family: 'IBM Plex Mono' },
                    padding: { top: 10 }
                };
            } else {
                xAxisConfig.ticks.maxRotation = 45;
                xAxisConfig.ticks.minRotation = 45;
                xAxisConfig.ticks.autoSkip = true;
                xAxisConfig.ticks.maxTicksLimit = 8;
                xAxisConfig.title = {
                    display: true,
                    text: `${marketStatusIcon} ${marketStatusText}${lastUpdateText}`,
                    color: '#27ae60',
                    font: { size: 10, family: 'IBM Plex Mono', weight: 'bold' },
                    padding: { top: 10 }
                };
            }
        }
    } else if (tf === '1W') {
        xAxisConfig.ticks.maxRotation = 25;
        xAxisConfig.ticks.minRotation = 25;
        xAxisConfig.ticks.autoSkip = dataPointCount > 10;
        xAxisConfig.ticks.maxTicksLimit = Math.min(7, dataPointCount);
        xAxisConfig.title = {
            display: true,
            text: `Last ${dataPointCount} Day${dataPointCount !== 1 ? 's' : ''}`,
            color: '#9aa2ae',
            font: { size: 10, family: 'IBM Plex Mono' },
            padding: { top: 10 }
        };
    } else if (tf === '1M') {
        xAxisConfig.ticks.maxRotation = 45;
        xAxisConfig.ticks.minRotation = 45;
        xAxisConfig.ticks.autoSkip = dataPointCount > 15;
        xAxisConfig.ticks.maxTicksLimit = 8;
        xAxisConfig.title = {
            display: true,
            text: `Last ${dataPointCount} Day${dataPointCount !== 1 ? 's' : ''}`,
            color: '#9aa2ae',
            font: { size: 10, family: 'IBM Plex Mono' },
            padding: { top: 10 }
        };
    } else if (tf === '3M') {
        xAxisConfig.ticks.maxRotation = 45;
        xAxisConfig.ticks.minRotation = 45;
        xAxisConfig.ticks.autoSkip = dataPointCount > 20;
        xAxisConfig.ticks.maxTicksLimit = 10;
        xAxisConfig.title = {
            display: true,
            text: `Last ${dataPointCount} Day${dataPointCount !== 1 ? 's' : ''}`,
            color: '#9aa2ae',
            font: { size: 10, family: 'IBM Plex Mono' },
            padding: { top: 10 }
        };
    }

    // Create custom plugin to add left and right labels on x-axis when market is open
    const customXAxisLabels = {
        id: 'customXAxisLabels',
        afterDraw(chart) {
            if (tf === '1D' && marketStatusForView === "OPEN") {
                const ctx = chart.ctx;
                const xAxis = chart.scales.x;

                // Get market open time (11:00 AM)
                const marketOpenTime = new Date();
                marketOpenTime.setHours(11, 0, 0, 0);

                // Get current time
                const currentTime = new Date();

                // Format times for display
                const formatTimeForDisplay = (date) => {
                    let hours = date.getHours();
                    const minutes = date.getMinutes();
                    const period = hours >= 12 ? 'PM' : 'AM';
                    hours = hours % 12;
                    hours = hours ? hours : 12;
                    return `${hours}:${minutes.toString().padStart(2, '0')} ${period}`;
                };

                const openTimeStr = formatTimeForDisplay(marketOpenTime);
                const currentTimeStr = formatTimeForDisplay(currentTime);

                // Save context state
                ctx.save();
                ctx.font = 'bold 11px "IBM Plex Mono"';
                ctx.fillStyle = '#0a7c4e';
                ctx.shadowBlur = 0;

                // Get x-axis position (bottom of chart)
                const xAxisY = xAxis.bottom + 15;

                // Draw left label (Market Open)
                const leftX = xAxis.left;
                ctx.fillStyle = '#2ecc71';
                ctx.textAlign = 'left';
                ctx.fillText(`🟢 OPEN: ${openTimeStr}`, leftX, xAxisY);

                // Draw right label (Current Time)
                const rightX = xAxis.right;
                ctx.fillStyle = '#3498db';
                ctx.textAlign = 'right';
                ctx.fillText(`🕐 CURRENT: ${currentTimeStr}`, rightX, xAxisY);

                // Draw separator line or dots
                ctx.strokeStyle = 'rgba(46, 204, 113, 0.3)';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(leftX, xAxis.bottom);
                ctx.lineTo(rightX, xAxis.bottom);
                ctx.stroke();
                ctx.setLineDash([]);

                // Restore context
                ctx.restore();
            }
        }
    };

    // Create new chart with custom plugin
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
            animation: {
                duration: 500,
                easing: 'easeInOutQuart'
            },
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: (tooltipItems) => {
                            if (tf === '1D') {
                                const item = filteredData[tooltipItems[0].dataIndex];
                                const timestamp = new Date(item.timestamp);
                                return timestamp.toLocaleString();
                            } else {
                                const item = filteredData[tooltipItems[0].dataIndex];
                                return item.date;
                            }
                        },
                        label: (context) => {
                            const value = context.parsed.y;
                            if (tf === '1D') {
                                const item = filteredData[context.dataIndex];
                                const timestamp = new Date(item.timestamp);
                                return [
                                    `NPR ${value.toFixed(2)}`,
                                    `Time: ${timestamp.toLocaleTimeString()}`
                                ];
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
                    grid: {
                        color: 'rgba(154,162,174,0.15)'
                    },
                    ticks: {
                        color: '#9aa2ae',
                        font: {
                            size: 10,
                            family: 'IBM Plex Mono'
                        },
                        callback: (value) => value.toFixed(0)
                    },
                    min: minValue - padding,
                    max: maxValue + padding
                }
            }
        },
        plugins: [customXAxisLabels] // Add the custom plugin
    });

    // Reset opacity
    if (canvas) {
        canvas.style.opacity = '1';
    }
}

// Switch timeframe function
async function switchTF(btn, tf) {
    document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const originalText = btn.textContent;
    btn.textContent = 'Loading...';
    btn.disabled = true;

    try {
        await buildIndexChart(tf);
    } catch (error) {
        console.error('Error switching timeframe:', error);
        if (indexChart) {
            indexChart.destroy();
        }
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
    if (currentValueEl) {
        currentValueEl.textContent = parseFloat(latest.close).toFixed(2);
    }

    const changeEl = document.getElementById('indexChange');
    if (changeEl) {
        changeEl.textContent = `${changeSymbol}${change.toFixed(2)} (${changeSymbol}${parseFloat(latest.percentage_change).toFixed(2)}%)`;
        changeEl.className = change >= 0 ? 'positive' : 'negative';
    }
}

async function initChart() {
    await buildIndexChart('1D');
    if (historicalData.length > 0) {
        displayIndexMetrics(historicalData);
    }
}

// Start the chart
initChart();


// Optional: Auto-refresh every 5 minutes (if your API updates frequently)
setInterval(() => {
    allNepseData = [];
    historicalData = [];
    initChart();
}, 60100);


function getCookie(name) {
    let cookieValue = null;

    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');

        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();

            // Check if this cookie name matches
            if (cookie.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

async function fetchNepse() {
    try {
        const response = await fetch('/api/fetch-nepse/', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')  // Django CSRF protection
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log(data);

    } catch (error) {
        console.error('Error fetching NEPSE data:', error);
    }
}

// Run every 10 minutes (600,000 ms)
setInterval(fetchNepse, 60000);

// // Optional: run immediately on page load
fetchNepse();

// setInterval(function () {
//     location.reload();
// }, 10000); // 60,000 ms = 1 minute