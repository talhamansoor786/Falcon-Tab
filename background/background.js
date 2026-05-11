/**
 * Background Service Worker for Falcon Tab v3.0
 * Handles RSS, Weather, Location, Wallpaper, Facts, AI Chat, and AI News fetching
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	const { action } = request;

	if (action === 'FETCH_RSS') {
		if (!request.feedUrl) { sendResponse({ success: false, error: 'feedUrl required' }); return true; }
		fetch(request.feedUrl)
			.then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
			.then(data => sendResponse({ success: true, data }))
			.catch(e => sendResponse({ success: false, error: e.message }));
		return true;
	}

	if (action === 'FETCH_WEATHER') {
		const { latitude, longitude } = request;
		if (latitude == null || longitude == null) { sendResponse({ success: false, error: 'coords required' }); return true; }
		fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&timezone=auto`)
			.then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
			.then(data => sendResponse({ success: true, data }))
			.catch(e => sendResponse({ success: false, error: e.message }));
		return true;
	}

	if (action === 'REVERSE_GEOCODE') {
		const { latitude, longitude } = request;
		fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`)
			.then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
			.then(data => sendResponse({ success: true, city: data.city || data.locality || data.principalSubdivision || 'Unknown' }))
			.catch(e => sendResponse({ success: false, error: e.message }));
		return true;
	}

	if (action === 'FETCH_IP_LOCATION') {
		fetch('http://ip-api.com/json/?fields=lat,lon,city,country')
			.then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
			.then(data => sendResponse({ success: true, data }))
			.catch(e => sendResponse({ success: false, error: e.message }));
		return true;
	}

	if (action === 'FETCH_DAILY_FACT') {
		fetch('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en')
			.then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
			.then(data => sendResponse({ success: true, fact: data.text }))
			.catch(e => sendResponse({ success: false, error: e.message }));
		return true;
	}

	if (action === 'FETCH_ISLAMIC_FACT') {
		fetch('https://api.alquran.cloud/v1/ayah/random/en.sahih')
			.then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
			.then(data => {
				if(data && data.data) {
					sendResponse({ success: true, fact: `"${data.data.text}" - Surah ${data.data.surah.englishName} (${data.data.surah.number}:${data.data.numberInSurah})` });
				} else throw new Error("Invalid format");
			})
			.catch(e => sendResponse({ success: false, error: e.message }));
		return true;
	}

	if (action === 'FETCH_STORIES') {
		const feedUrl = request.url || 'https://feeds.bbci.co.uk/news/rss.xml';
		fetch(feedUrl)
			.then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
			.then(data => sendResponse({ success: true, data }))
			.catch(e => sendResponse({ success: false, error: e.message }));
		return true;
	}

	if (action === 'FETCH_WALLPAPER') {
		const query = request.query || 'nature landscape';
		// Pollinations.ai generates an image on the fly. We'll append a random number to avoid aggressive caching if we want a new one, 
		// but since we want weather based, we can just use the query.
		// Added a seed to get a slightly different image each time it fetches (hourly)
		const seed = Math.floor(Math.random() * 10000);
		const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(query)}?width=1920&height=1080&nologo=true&seed=${seed}`;
		// Pollinations returns the image directly, so we just send the URL back to the client to use as background
		sendResponse({ success: true, imageUrl: url });
		return true;
	}

	// AI Chat — uses DuckDuckGo Instant Answer API (free, no key)
	if (action === 'AI_CHAT') {
		const query = request.query || '';
		const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
		fetch(ddgUrl)
			.then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
			.then(data => {
				// Try to extract a meaningful answer from DDG instant answer
				let answer = data.AbstractText || data.Answer || '';
				if (!answer && data.RelatedTopics && data.RelatedTopics.length > 0) {
					answer = data.RelatedTopics.slice(0, 3).map(t => t.Text || '').filter(Boolean).join('\n\n');
				}
				if (!answer) {
					answer = `I don't have an instant answer for that. Try searching: https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
				}
				sendResponse({ success: true, answer, source: data.AbstractSource || 'DuckDuckGo' });
			})
			.catch(e => sendResponse({ success: false, error: e.message }));
		return true;
	}

	sendResponse({ success: false, error: 'Unknown action' });
	return false;
});
