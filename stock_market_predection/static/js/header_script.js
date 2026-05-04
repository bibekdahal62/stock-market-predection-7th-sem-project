

document.addEventListener("DOMContentLoaded", function () {
    const links = document.querySelectorAll(".nav-btn");

    // Set active based on current URL
    links.forEach(link => {
        if (link.href === window.location.href) {
            link.classList.add("active");
        }
    });

    // Change active on click
    links.forEach(link => {
        link.addEventListener("click", function () {
            links.forEach(l => l.classList.remove("active"));
            this.classList.add("active");
        });
    });
});


const burger = document.getElementById('hamburger');
const drawer = document.getElementById('mobile-nav');
burger.addEventListener('click', () => {
    burger.classList.toggle('open');
    drawer.classList.toggle('open');
});

async function marketStatus(){
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
marketStatus();
setInterval(marketStatus, 60000); // 60 sec