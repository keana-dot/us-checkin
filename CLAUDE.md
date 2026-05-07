# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

Open `index.html` directly in a browser — no build step, no server needed:

```bash
open index.html
```

## Git workflow

**After every change — no exceptions — commit and push to GitHub.** This ensures we never lose work and can always roll back to a working state.

```bash
git add <files>
git commit -m "short description of what changed and why"
git push
```

Commit message rules:
- One concise line describing *what* changed and *why*
- Use present tense ("add partner view" not "added partner view")
- Never leave changes uncommitted after a working session

Remote: https://github.com/keana-dot/us-checkin

## Architecture

Three files, no framework, no build tooling:

- **`index.html`** — all screen markup. Four screens (`screen-home`, `screen-checkin`, `screen-history`, `screen-saved`) are always in the DOM; only the `.active` one is visible.
- **`style.css`** — CSS custom properties on `:root` define the color palette. All layout uses flexbox/grid. `.hidden` is a utility class (`display: none !important`).
- **`app.js`** — all logic. No modules; functions are global and called inline from HTML via `onclick`.

### Screen navigation

`showScreen(id)` swaps the `.active` class and triggers `renderHome()` or `renderHistory()` as a side effect.

### Check-in flow

State lives in the module-level `checkinData` object and `currentStep` integer. `goToStep(n)` shows/hides `.step` divs, updates the progress bar, and calls `renderSummary()` on step 5. `saveCheckin()` appends the entry to localStorage and navigates to `screen-saved`.

### Data persistence

All data is stored in `localStorage` under the key `us-checkin-data` as:

```json
{
  "checkins": [
    {
      "date": "May 7, 2026",
      "timestamp": 1234567890000,
      "mood": "🙂",
      "sliders": { "connection": 7, "communication": 6, "trust": 8, "happiness": 7, "intimacy": 5 },
      "yesno": { "heard": true, "quality_time": false, "authentic": true, "safe": true, "aligned": false },
      "reflection": "..."
    }
  ]
}
```

`loadData()` and `saveData(data)` in `app.js` are the only two functions that touch localStorage.

### History & chart

`renderHistory()` reads all check-ins, destroys and recreates the Chart.js line chart (stored in `trendChart` to allow cleanup), and builds yes/no percentage chips. Chart.js is loaded from CDN in `index.html`.
