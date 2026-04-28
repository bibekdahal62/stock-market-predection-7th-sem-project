

async function updateTicker(){

    const res = await fetch('/api/ticker-data/');
    const data = await res.json();

    // console.log(data);

    const tickerHTML = data.map(i =>
      `<span class="ticker-item">
      <span class="ticker-sym">${i.symbol}</span>
      <span>${i.ltp}</span>
      <span class="${i.up ? 'ticker-up' : 'ticker-dn'}">${i.change_percent}%${i.up ? ' ▲ ' : ' ▼ '} </span>
    </span>`
    ).join('');
    document.getElementById('ticker').innerHTML = tickerHTML + tickerHTML;
}

updateTicker();
setInterval(updateTicker, 60000)
