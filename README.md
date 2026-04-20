# 🔍 CF StatLens

> **Elevate your Codeforces profile with granular daily analytics, accuracy tracking, and difficulty breakdowns directly inside your heatmap.**

CF StatLens is a lightweight, blazing-fast browser extension that replaces the default Codeforces heatmap tooltips with deep, actionable insights. Designed for competitive programmers who want to track their real productivity, not just their submission count.

## ✨ Features

* **🔥 Contextual Streak Tracking:** Instantly see your active streak relative to the day you are hovering over.
* **🎯 Accuracy Metrics:** Calculates your daily Accepted/Total ratio with color-coded progress bars.
* **📊 Difficulty Breakdown:** Groups your accepted problems by exact rating (e.g., 800, 1400, 1900) so you know exactly what level you practiced.
* **🏷️ Top Topics:** Dynamically aggregates the tags of your accepted problems to show your primary focus for the day.
* **🏆 Global Targets:** Always displays your "Most Productive Day" (highest AC) and "Highest Grind Day" (most submissions) as benchmarks to beat.
* **⚡ Zero-Lag Caching:** Uses `localStorage` to cache API responses, meaning the tooltip loads instantly without rate-limiting the Codeforces servers.

## 📸 Screenshots

<p align="center">
  <img src="assets/screenshot1.png" height="400px" alt="CF StatLens Hover Overview" />
  &nbsp;
  <img src="assets/screenshot2.png" height="400px" alt="Difficulty Breakdown View" />
</p>

## 🛠️ Installation (Developer Mode)

Want to try it locally or contribute? You can install the extension directly from this source code.

1. Clone this repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/CF-StatLens.git
   ```
2. Open your Chromium-based browser (Chrome, Edge, Brave).
3. Navigate to the extensions page: `chrome://extensions/`
4. Enable **"Developer mode"** (toggle in the top right corner).
5. Click **"Load unpacked"** and select the folder where you cloned this repository.
6. Open any Codeforces profile and hover over the heatmap!

## ⚙️ How it Works under the Hood

Instead of spamming the Codeforces server with an API call every time you hover over a cell, CF StatLens is highly optimized:
1. **Initial Fetch:** Makes a single request to the `user.status` endpoint on initial page load.
2. **Data Structuring:** Processes thousands of raw submissions into a O(1) lookup Hash Map stored in RAM.
3. **Local Storage:** Caches the structured map in the browser's hard drive for 10 minutes to survive page reloads and protect network bandwidth.
4. **DOM Manipulation:** Aggressively suppresses native tooltips (`tippy-box`, `cal-heatmap-tooltip`) to inject a custom-styled floating element on hover.

## 💻 Tech Stack
* Vanilla JavaScript (ES6+)
* CSS3 (Catppuccin Dark Mode Theme)
* HTML5
* WebExtensions API (Manifest V3)
* Official Codeforces API

## 🤝 Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## 📝 License
[MIT](https://choosealicense.com/licenses/mit/)
