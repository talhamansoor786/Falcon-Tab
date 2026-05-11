// Preload script — runs before DOM to apply cached wallpaper and prevent flash
(function(){
    try {
        chrome.storage.local.get(['wallpaperCache','cachedWeatherBg'], function(d) {
            if (d.wallpaperCache && d.wallpaperCache.url) {
                document.body.style.backgroundImage = 'linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.55)),url(' + d.wallpaperCache.url + ')';
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundPosition = 'center';
            } else if (d.cachedWeatherBg) {
                document.body.style.background = d.cachedWeatherBg;
            }
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
