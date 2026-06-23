// Preload script — applies cached custom background image and theme before first paint
// to prevent a flash of the default appearance.
(function () {
    try {
        chrome.storage.sync.get(['theme'], function (s) {
            if (!chrome.runtime.lastError && s.theme === 'light') {
                document.documentElement.setAttribute('data-theme', 'light');
            }
        });
    } catch (e) {}

    try {
        chrome.storage.local.get(['customBgImage'], function (d) {
            if (chrome.runtime.lastError || !d.customBgImage) return;
            var bgLayer = document.getElementById('custom-bg-layer');
            var bgOverlay = document.getElementById('custom-bg-overlay');
            if (bgLayer) {
                bgLayer.style.backgroundImage = 'url(' + d.customBgImage + ')';
                bgLayer.classList.add('active');
            }
            if (bgOverlay) bgOverlay.classList.add('active');
        });
    } catch (e) {}
})();
