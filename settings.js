document.addEventListener("DOMContentLoaded", () => {
	const $ = (id) => document.getElementById(id);
	let tempUnit = "C";
	let theme = "dark";

	const applyThemeUI = (t) => {
		if (t === "light") {
			document.documentElement.setAttribute("data-theme", "light");
			$("theme-light").classList.add("active");
			$("theme-dark").classList.remove("active");
		} else {
			document.documentElement.removeAttribute("data-theme");
			$("theme-dark").classList.add("active");
			$("theme-light").classList.remove("active");
		}
	};

	$("theme-dark").addEventListener("click", () => { theme = "dark"; applyThemeUI("dark"); });
	$("theme-light").addEventListener("click", () => { theme = "light"; applyThemeUI("light"); });

	$("temp-c").addEventListener("click", () => {
		tempUnit = "C";
		$("temp-c").classList.add("active");
		$("temp-f").classList.remove("active");
	});
	$("temp-f").addEventListener("click", () => {
		tempUnit = "F";
		$("temp-f").classList.add("active");
		$("temp-c").classList.remove("active");
	});

	const createRow = (container, cls, data, fields) => {
		const div = document.createElement("div");
		div.className = cls;
		const escape = (s) => String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;");
		div.innerHTML = fields.map((f) => `<input type="text" class="${f.cls}" placeholder="${f.ph}" value="${escape(data[f.key])}">`).join("") + `<button class="remove-btn">−</button>`;
		container.appendChild(div);
		div.querySelector(".remove-btn").addEventListener("click", () => div.remove());
	};

	// ===== BACKGROUND IMAGE UPLOAD =====
	const bgUploadArea = $("bg-upload-area");
	const bgUploadInput = $("bg-upload-input");
	const bgPreview = $("bg-preview");
	const bgPlaceholder = $("bg-placeholder");
	const bgRemoveBtn = $("bg-remove-btn");

	let pendingBgDataUrl = null; // holds new image if user picked one
	let hasBgImage = false;

	const showPreview = (dataUrl) => {
		bgPreview.src = dataUrl;
		bgPreview.style.display = "block";
		bgPlaceholder.style.display = "none";
		bgRemoveBtn.style.display = "";
		hasBgImage = true;
	};

	const clearPreview = () => {
		bgPreview.src = "";
		bgPreview.style.display = "none";
		bgPlaceholder.style.display = "";
		bgRemoveBtn.style.display = "none";
		hasBgImage = false;
		pendingBgDataUrl = null;
	};

	// Click on area or button opens file picker
	bgUploadArea.addEventListener("click", () => bgUploadInput.click());
	$("bg-upload-btn").addEventListener("click", (e) => {
		e.stopPropagation();
		bgUploadInput.click();
	});

	bgUploadInput.addEventListener("change", (e) => {
		const file = e.target.files[0];
		if (!file || !file.type.startsWith("image/")) return;
		if (file.size > 3 * 1024 * 1024) {
			alert(`This image is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Please use an image under 3 MB to ensure it saves correctly.`);
			e.target.value = "";
			return;
		}
		const reader = new FileReader();
		reader.onload = (ev) => {
			pendingBgDataUrl = ev.target.result;
			showPreview(pendingBgDataUrl);
		};
		reader.readAsDataURL(file);
	});

	// Drag & drop
	bgUploadArea.addEventListener("dragover", (e) => {
		e.preventDefault();
		bgUploadArea.classList.add("drag-over");
	});
	bgUploadArea.addEventListener("dragleave", () => bgUploadArea.classList.remove("drag-over"));
	bgUploadArea.addEventListener("drop", (e) => {
		e.preventDefault();
		bgUploadArea.classList.remove("drag-over");
		const file = e.dataTransfer.files[0];
		if (!file || !file.type.startsWith("image/")) return;
		if (file.size > 3 * 1024 * 1024) {
			alert(`This image is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Please use an image under 3 MB to ensure it saves correctly.`);
			return;
		}
		const reader = new FileReader();
		reader.onload = (ev) => {
			pendingBgDataUrl = ev.target.result;
			showPreview(pendingBgDataUrl);
		};
		reader.readAsDataURL(file);
	});

	bgRemoveBtn.addEventListener("click", (e) => {
		e.stopPropagation();
		clearPreview();
		// Mark for removal on save
		pendingBgDataUrl = "REMOVE";
	});

	// ===== LOAD SETTINGS =====
	const loadSettings = () => {
		chrome.storage.sync.get(
			["searchEngine", "rssFeeds", "userShortcuts", "tempUnit", "storiesRssUrl", "storiesFeeds", "openRouterKey", "theme"],
			(d) => {
				theme = d.theme || "dark";
				applyThemeUI(theme);
				$("search-engine").value = d.searchEngine || "https://www.google.com/search?q=";
				$("openrouter-key").value = d.openRouterKey || "";
				tempUnit = d.tempUnit || "C";
				if (tempUnit === "F") {
					$("temp-f").classList.add("active");
					$("temp-c").classList.remove("active");
				}

				// News RSS feeds
				$("rss-feeds-list").innerHTML = "";
				(d.rssFeeds || [{ name: "BBC News", url: "https://feeds.bbci.co.uk/news/rss.xml" }]).forEach((f) =>
					createRow($("rss-feeds-list"), "rss-feed-item", f, [
						{ cls: "rss-name", ph: "Feed Name", key: "name" },
						{ cls: "rss-url", ph: "Feed URL", key: "url" },
					]),
				);

				// Stories RSS feeds — migrate from old single storiesRssUrl if needed
				let storiesFeeds = d.storiesFeeds;
				if (!storiesFeeds || !storiesFeeds.length) {
					const oldUrl = d.storiesRssUrl || "https://feeds.bbci.co.uk/news/rss.xml";
					storiesFeeds = [{ name: "BBC News", url: oldUrl }];
				}
				$("stories-feeds-list").innerHTML = "";
				storiesFeeds.forEach((f) =>
					createRow($("stories-feeds-list"), "stories-feed-item", f, [
						{ cls: "stories-name", ph: "Feed Name", key: "name" },
						{ cls: "stories-url", ph: "Feed URL", key: "url" },
					]),
				);

				// Shortcuts
				$("shortcuts-list").innerHTML = "";
				(
					d.userShortcuts || [
						{ title: "YouTube", url: "https://youtube.com" },
						{ title: "Gmail", url: "https://mail.google.com" },
						{ title: "GitHub", url: "https://github.com" },
						{ title: "Reddit", url: "https://reddit.com" },
						{ title: "LinkedIn", url: "https://linkedin.com" },
						{ title: "Drive", url: "https://drive.google.com" },
						{ title: "Calendar", url: "https://calendar.google.com" },
						{ title: "Twitter", url: "https://twitter.com" },
					]
				).forEach((s) =>
					createRow($("shortcuts-list"), "shortcut-item-row", s, [
						{ cls: "sc-name", ph: "Name", key: "title" },
						{ cls: "sc-url", ph: "URL", key: "url" },
					]),
				);
			},
		);

		// Load background image from local storage (too large for sync)
		chrome.storage.local.get(["customBgImage"], (d) => {
			if (d.customBgImage) {
				showPreview(d.customBgImage);
				hasBgImage = true;
			}
		});
	};

	$("add-rss-feed").addEventListener("click", () =>
		createRow($("rss-feeds-list"), "rss-feed-item", {}, [
			{ cls: "rss-name", ph: "Feed Name", key: "name" },
			{ cls: "rss-url", ph: "Feed URL", key: "url" },
		]),
	);
	$("add-stories-feed").addEventListener("click", () =>
		createRow($("stories-feeds-list"), "stories-feed-item", {}, [
			{ cls: "stories-name", ph: "Feed Name", key: "name" },
			{ cls: "stories-url", ph: "Feed URL", key: "url" },
		]),
	);
	$("add-shortcut").addEventListener("click", () =>
		createRow($("shortcuts-list"), "shortcut-item-row", {}, [
			{ cls: "sc-name", ph: "Name", key: "title" },
			{ cls: "sc-url", ph: "URL", key: "url" },
		]),
	);

	$("reset-layout").addEventListener("click", () => {
		chrome.storage.local.remove("blockLayout", () => {
			if (chrome.runtime.lastError) {
				console.warn("Failed to reset layout:", chrome.runtime.lastError.message);
			}
			$("status-message").textContent = "Layout reset!";
			setTimeout(() => ($("status-message").textContent = ""), 2000);
		});
	});

	$("save-settings").addEventListener("click", () => {
		const rssFeeds = [];
		document.querySelectorAll(".rss-feed-item").forEach((item) => {
			const n = item.querySelector(".rss-name").value.trim(),
				u = item.querySelector(".rss-url").value.trim();
			if (n && u) rssFeeds.push({ name: n, url: u });
		});
		const storiesFeeds = [];
		document.querySelectorAll(".stories-feed-item").forEach((item) => {
			const n = item.querySelector(".stories-name").value.trim(),
				u = item.querySelector(".stories-url").value.trim();
			if (n && u) storiesFeeds.push({ name: n, url: u });
		});
		const userShortcuts = [];
		document.querySelectorAll(".shortcut-item-row").forEach((item) => {
			const t = item.querySelector(".sc-name").value.trim();
			let u = item.querySelector(".sc-url").value.trim();
			if (t && u) {
				if (!/^https?:\/\//i.test(u)) u = "https://" + u;
				userShortcuts.push({ title: t, url: u });
			}
		});

		// Handle background image save
		const saveSync = () => {
			chrome.storage.sync.set(
				{
					searchEngine: $("search-engine").value,
					openRouterKey: $("openrouter-key").value.trim(),
					storiesFeeds,
					rssFeeds,
					userShortcuts,
					tempUnit,
					theme,
				},
				() => {
					chrome.storage.local.remove(["weatherCache", "wallpaperCache", "storiesCache", "aiGreetingCache", "quoteCache"]);
					// Also remove old storiesRssUrl key
					chrome.storage.sync.remove("storiesRssUrl");
					$("status-message").textContent = "✓ Saved!";
					setTimeout(() => {
						$("status-message").textContent = "";
						window.close();
					}, 1000);
				},
			);
		};

		if (pendingBgDataUrl === "REMOVE") {
			// User removed the background
			chrome.storage.local.remove(["customBgImage"], saveSync);
		} else if (pendingBgDataUrl) {
			// User picked a new image
			chrome.storage.local.set({ customBgImage: pendingBgDataUrl }, saveSync);
		} else {
			saveSync();
		}
	});

	loadSettings();
});
