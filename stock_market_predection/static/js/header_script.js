

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