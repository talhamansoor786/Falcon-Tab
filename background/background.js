/**
 * Background Service Worker for Falcon Tab v3.0
 * Handles RSS, Weather, Location, Wallpaper, Facts, AI Chat, and AI News fetching
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

	if (action === "FETCH_QUOTE") {
		const apiKey = request.apiKey;
		if (!apiKey) {
			sendResponse({ success: false, error: "No API-Ninjas key provided" });
			return true;
		}

		const category = request.category || "inspirational";

		// Helper: fetch one category from the stable v1 endpoint
		const fetchCategory = async (cat) => {
			const url = `https://api.api-ninjas.com/v1/quotes?category=${encodeURIComponent(cat)}`;
			const r = await fetch(url, {
				headers: { "X-Api-Key": apiKey },
				cache: "no-store"
			});
			if (!r.ok) throw new Error(`HTTP ${r.status}`);
			const data = await r.json();
			// v1 returns an array; normalise to array just in case
			const arr = Array.isArray(data) ? data : (data ? [data] : []);
			return arr.find((item) => item && item.quote) || null;
		};

		(async () => {
			try {
				let q = await fetchCategory(category);

				// If the category returned nothing, retry with a safe fallback
				if (!q && category !== "inspirational") {
					q = await fetchCategory("inspirational");
				}

				if (q) {
					sendResponse({ success: true, fact: `"${q.quote}" — ${q.author || "Unknown"}` });
				} else {
					sendResponse({ success: false, error: "No quotes available" });
				}
			} catch (e) {
				console.warn("API-Ninjas quote fetch failed:", e.message);
				sendResponse({ success: false, error: e.message });
			}
		})();
		return true;
	}

	if (action === "FETCH_ISLAMIC_FACT") {
		fetch("https://api.alquran.cloud/v1/ayah/random/en.sahih")
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json();
			})
			.then((data) => {
				if (data && data.data) {
					sendResponse({ success: true, fact: `"${data.data.text}" - Surah ${data.data.surah.englishName} (${data.data.surah.number}:${data.data.numberInSurah})` });
				} else throw new Error("Invalid format");
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

	// AI Chat — uses OpenRouter API (supports multiple LLM models)
	if (action === "AI_CHAT") {
		const query = request.query || "";
		const model = request.model || "openai/gpt-oss-120b:free";
		const history = request.history || [];
		const OPENROUTER_API_KEY = request.openRouterKey;

		if (!OPENROUTER_API_KEY) {
			sendResponse({ success: false, error: "NO_API_KEY" });
			return true;
		}

		const messages = [
			{
				role: "system",
				content:
					"You are a helpful, concise assistant embedded in a browser new-tab extension called Falcon Tab. Provide clear, accurate, and friendly answers. Keep responses reasonably brief unless the user asks for detail.",
			},
			...history,
			{ role: "user", content: query },
		];

		fetch("https://openrouter.ai/api/v1/chat/completions", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${OPENROUTER_API_KEY}`,
				"Content-Type": "application/json",
				"HTTP-Referer": "chrome-extension://falcon-tab",
				"X-Title": "Falcon Tab",
			},
			body: JSON.stringify({ model, messages, max_tokens: 1024 }),
		})
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json();
			})
			.then((data) => {
				const msgObj = data.choices?.[0]?.message;
				// Prefer content (the actual answer). Fall back to reasoning only if content is empty.
				// Never show reasoning as visible "thinking" — the user only wants the final answer.
				let answer = "";
				if (msgObj) {
					answer = (msgObj.content || msgObj.reasoning || "").trim();
				}
				// Strip ALL HTML/XML tags & comments that models sometimes leak
				// Covers <!-- -->, <think>, </response>, <|end|>, etc. in one pass.
				answer = answer
					.replace(/<[^>]*>/g, "")
					.replace(/<!--[\s\S]*?-->/g, "")
					.trim();
				answer = answer || "No response received.";

				const usedModel = data.model || model;
				sendResponse({ success: true, answer, source: "OpenRouter", model: usedModel });
			})
			.catch((e) => sendResponse({ success: false, error: e.message }));
		return true;
	}

	if (action === "FETCH_AI_GREETING") {
		const timeStr = request.timeStr || "evening";
		const style = request.style || "funny";
		const model = request.model || "openai/gpt-oss-120b:free";
		const OPENROUTER_API_KEY = request.openRouterKey;

		// No key configured — return a graceful failure so the dashboard uses its static default
		if (!OPENROUTER_API_KEY) {
			sendResponse({ success: false, error: "NO_API_KEY" });
			return true;
		}

		const messages = [
			{
				role: "system",
				content: `You are a new tab greeting generator. The local time is ${timeStr}. Give a single, short, ${style} greeting. Do not include quotes or extra text. Max 10 words.`,
			},
		];

		fetch("https://openrouter.ai/api/v1/chat/completions", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${OPENROUTER_API_KEY}`,
				"Content-Type": "application/json",
				"HTTP-Referer": "chrome-extension://falcon-tab",
				"X-Title": "Falcon Tab",
			},
			body: JSON.stringify({ model, messages, max_tokens: 50 }),
		})
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json();
			})
			.then((data) => {
				const msgObj = data.choices?.[0]?.message;
				let answer = "";
				if (msgObj) {
					answer = (msgObj.content || msgObj.reasoning || "").trim();
				}
				answer = answer
					.replace(/<[^>]*>/g, "")
					.replace(/<!--[\s\S]*?-->/g, "")
					.trim();
				answer = answer || "Hello there!";

				sendResponse({ success: true, answer });
			})
			.catch((e) => sendResponse({ success: false, error: e.message }));
		return true;
	}

	sendResponse({ success: false, error: "Unknown action" });
	return false;
});
