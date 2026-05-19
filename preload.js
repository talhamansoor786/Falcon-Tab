// Preload script — runs before DOM to apply cached wallpaper and prevent flash
(function(){
    try {
        chrome.storage.local.get(['cachedWeatherCode'], function(d) {
            let code = d.cachedWeatherCode || 0;
            let hour = new Date().getHours();
            let isDay = hour >= 6 && hour < 18; // Evaluate day/night locally instantly
            let gradient = "linear-gradient(135deg, #0d0f1a 0%, #1a1a2e 100%)";

            if (code <= 1) gradient = isDay ? "linear-gradient(135deg,#1e6fa0 0%,#58b0d4 60%,#a0d4e8 100%)" : "linear-gradient(135deg,#0a1628 0%,#152242 40%,#1a2a4a 100%)";
            else if (code <= 48) gradient = isDay ? "linear-gradient(135deg,#4a5568 0%,#718096 60%,#a0aec0 100%)" : "linear-gradient(135deg,#1a1a2e 0%,#2d2d44 60%,#1a1a2e 100%)";
            else if (code <= 67 || (code >= 80 && code <= 82)) gradient = isDay ? "linear-gradient(135deg,#2d3748 0%,#4a5568 50%,#1a202c 100%)" : "linear-gradient(135deg,#0d1117 0%,#1a2332 50%,#0d1117 100%)";
            else if (code <= 77) gradient = isDay ? "linear-gradient(135deg,#c4d5e3 0%,#8ab4c9 50%,#5a8ea0 100%)" : "linear-gradient(135deg,#1a2030 0%,#2a3545 50%,#1a2030 100%)";
            else gradient = isDay ? "linear-gradient(135deg,#2d3748 0%,#4a5568 50%,#1a202c 100%)" : "linear-gradient(135deg,#0d1117 0%,#1a2332 50%,#0d1117 100%)";

            document.body.style.background = gradient;
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                    document.body.classList.add('ready');
                });
            } else {
                document.body.classList.add('ready');
            }
        });
    } catch(e) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                document.body.classList.add('ready');
            });
        } else {
            document.body.classList.add('ready');
        }
    }
})();
