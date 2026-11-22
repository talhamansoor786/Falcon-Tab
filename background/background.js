/**
 * Background Service Worker for Falcon New Tab v3.0
 * Handles RSS, Weather, Location, and Stories fetching
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	const { action } = request;

	if (action === "FETCH_RSS") {
		if (!request.feedUrl) {
			sendResponse({ success: false, error: "feedUrl required" });
			return true;
		}
		fetch(request.feedUrl)
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.text();
			})
			.then((data) => sendResponse({ success: true, data }))
			.catch((e) => sendResponse({ success: false, error: e.message }));
		return true;
	}

	if (action === "FETCH_WEATHER") {
		const { latitude, longitude } = request;
		if (latitude == null || longitude == null) {
			sendResponse({ success: false, error: "coords required" });
			return true;
		}
		fetch(
			`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&timezone=auto`,
		)
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json();
			})
			.then((data) => sendResponse({ success: true, data }))
			.catch((e) => sendResponse({ success: false, error: e.message }));
		return true;
	}

	if (action === "REVERSE_GEOCODE") {
		const { latitude, longitude } = request;
		fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`)
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json();
			})
			.then((data) => sendResponse({ success: true, city: data.city || data.locality || data.principalSubdivision || "Unknown" }))
			.catch((e) => sendResponse({ success: false, error: e.message }));
		return true;
	}

	if (action === "FETCH_IP_LOCATION") {
		fetch("https://freeipapi.com/api/json")
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json();
			})
			.then((data) => {
				sendResponse({
					success: true,
					data: {
						lat: data.latitude,
						lon: data.longitude,
						city: data.cityName || "Unknown",
						country: data.countryName || ""
					}
				});
			})
			.catch((e) => sendResponse({ success: false, error: e.message }));
		return true;
	}


	if (action === "FETCH_STORIES") {
		const feedUrl = request.url || "https://feeds.bbci.co.uk/news/rss.xml";
		fetch(feedUrl)
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.text();
			})
			.then((data) => sendResponse({ success: true, data }))
			.catch((e) => sendResponse({ success: false, error: e.message }));
		return true;
	}

	sendResponse({ success: false, error: "Unknown action" });
	return false;
});
