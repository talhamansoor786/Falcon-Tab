# Falcon New Tab

A sleek, fully customizable Chrome extension that replaces the default new tab page with a productivity dashboard — featuring drag-and-drop widgets, RSS news, bookmarks, weather, a focus timer, and more.

![Version](https://img.shields.io/badge/version-3.0-blue)
![Status](https://img.shields.io/badge/status-stable-green)
![Chrome](https://img.shields.io/badge/chrome-MV3-important)

---

## ✨ Features

| Widget | Description |
|---|---|
| 🔗 **Quick Links** | Customizable shortcut tiles to your favorite sites |
| 🔖 **Bookmarks** | Browse and search your full Chrome bookmarks tree |
| 🌐 **Recent Sites** | Frequently visited websites via Chrome Top Sites |
| 📰 **RSS News** | Multi-feed reader sorted by date, with thumbnails |
| 📈 **Stories Carousel** | Horizontal scrolling headline bar |
| ⏱️ **Focus Timer** | Presets, progress ring, and browser notifications |
| 📝 **Quick Notes** | Auto-saving notes widget stored locally |
| 🌤️ **Live Weather** | Current conditions for your location |
| 🕐 **Clock & Date** | Always-visible large clock display |
| 🖼️ **Custom Background** | Upload your own background image |
| 🎨 **Themes** | Light and dark mode |

All widgets are **drag-and-drop**, **resizable**, and **rearrangeable**. The layout is saved automatically and restored on every new tab.

---

## 🚀 Installation (Developer Mode)

1. Go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `Falcon Tab` project folder
5. Open a new tab — your dashboard will appear

---

## ⚙️ Settings

Click the **gear icon** (⚙️) in the top-right corner of the dashboard to open Settings.

| Setting | Description |
|---|---|
| Search Engine | Google, DuckDuckGo, or Bing |
| Temperature Unit | °C or °F |
| Theme | Dark or Light |
| Background Image | Upload a custom image |
| Quick Links | Add, edit, or remove shortcut tiles |
| News RSS Feeds | Add multiple RSS sources for the main news block |
| Stories RSS Feeds | Add sources for the horizontal stories bar |
| Reset Layout | Restore default widget positions and sizes |

---

## 🔐 Permissions

| Permission | Purpose |
|---|---|
| `storage` | Save settings, layout, and cache locally |
| `topSites` | Power the Recent Sites widget |
| `bookmarks` | Display and search the bookmarks tree |
| `notifications` | Notify when a focus timer session ends |
| `host_permissions: <all_urls>` | Fetch RSS feeds and weather from any user-configured URL |

---

## 🏗️ Architecture

- **Manifest v3** — Latest Chrome extension format
- **Service Worker** (`background/background.js`) — Handles all network requests (RSS, Weather, Geocoding) to avoid CORS issues
- **Chrome Storage Sync** — Persists user settings and preferences
- **Chrome Storage Local** — Stores cached RSS data and custom background images
- **Pure JavaScript** — No npm packages or external build steps

### Project Structure

```
Falcon Tab/
├── manifest.json           # Extension config (MV3)
├── dashboard.html          # Main dashboard UI
├── dashboard.css           # Dashboard styles
├── dashboard.js            # Dashboard logic and widget rendering
├── preload.js              # Early theme + background injection (prevents flash)
├── settings.html           # Settings popup UI
├── settings.js             # Settings logic
├── settings.css            # Settings styles
├── background/
│   └── background.js       # Service worker — RSS, Weather, Geocoding
└── icons/                  # Extension icons (16, 48, 128px)
```

---

## 🔒 Privacy

- All dashboard data is stored locally in your browser via `chrome.storage`
- RSS feeds are fetched directly from user-configured sources — no third-party proxy
- No personal information is collected, transmitted, or sold
- Falcon New Tab is open source

---

## 📄 License

MIT License — Free for personal and commercial use
