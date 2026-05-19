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
		fetch("http://ip-api.com/json/?fields=lat,lon,city,country")
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json();
			})
			.then((data) => sendResponse({ success: true, data }))
			.catch((e) => sendResponse({ success: false, error: e.message }));
		return true;
	}

	if (action === "FETCH_QUOTE") {
		const apiKey = request.apiKey;
		if (!apiKey) {
			sendResponse({ success: true, fact: "Enter your API Ninjas Key in settings to see daily quotes!" });
			return true;
		}
		fetch("https://api.api-ninjas.com/v1/quotes", {
			headers: { "X-Api-Key": apiKey },
		})
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json();
			})
			.then((data) => {
				if (data && data.length > 0) {
					sendResponse({ success: true, fact: `"${data[0].quote}" — ${data[0].author}` });
				} else {
					throw new Error("No quote found");
				}
			})
			.catch((e) => sendResponse({ success: false, error: e.message }));
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

	if (action === "FETCH_WALLPAPER") {
		const query = request.query || "nature landscape";
		const orientation = request.orientation || "landscape"; // landscape | portrait | squarish
		const screenWidth = request.width || 1920;
		const screenHeight = request.height || 1080;
		const accessKey = "12x7NceM6PAMuqpn5EK__3QpcVUOhiXzXinlzk34Suw";

		// Step 1 — orientation pre-filters Unsplash to the right general shape
		const unsplashUrl = `https://api.unsplash.com/photos/random?client_id=${accessKey}&query=${encodeURIComponent(query)}&orientation=${orientation}`;
		console.log("[FETCH_WALLPAPER]", unsplashUrl, "| Target:", screenWidth, "x", screenHeight);

		fetch(unsplashUrl)
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json();
			})
			.then((data) => {
				// Step 2 — urls.raw + Imgix params make the image EXACTLY the screen's ratio/size.
				// Without this, Unsplash returns the photographer's native ratio (usually 3:2)
				// regardless of orientation filter — causing letterboxing or pillarboxing.
				// crop=entropy keeps the most visually interesting region when trimming edges.
				const imageUrl = `${data.urls.raw}&w=${screenWidth}&h=${screenHeight}&fit=crop&crop=entropy&auto=format&q=85`;

				sendResponse({ success: true, imageUrl });
			})
			.catch((e) => sendResponse({ success: false, error: e.message }));
		return true;
	}

	// AI Chat — uses OpenRouter API (supports multiple LLM models)
	if (action === "AI_CHAT") {
		const query = request.query || "";
		const model = request.model || "openai/gpt-oss-120b:free";
		const history = request.history || [];
		const OPENROUTER_API_KEY = request.openRouterKey;

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
		const OPENROUTER_API_KEY = request.openRouterKey || "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";

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
