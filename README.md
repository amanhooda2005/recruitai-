# RecruitAI — Frontend Project

A modern, clean, and professional frontend for an **AI-Powered Smart Recruitment System**.
Built with semantic HTML, vanilla CSS (with CSS custom properties), and vanilla JavaScript.
No build tools, no dependencies — just open and go.

---

## Project Structure

```
recruitai/
├── index.html                  # Landing page
├── styles/
│   └── main.css                # Design system + all styles
├── components/
│   └── shared.js               # Sidebar, topbar, icons, helpers
└── pages/
    ├── auth.html               # Login / Sign up
    ├── dashboard.html          # Main dashboard
    ├── candidates.html         # Candidate management
    ├── jobs.html               # Job postings
    └── analytics.html          # Analytics & charts
```

---

## Pages

| Page | File | Description |
|------|------|-------------|
| Landing | `index.html` | Hero, features, how-it-works, CTA, footer |
| Auth | `pages/auth.html` | Login & signup with toggle + validation |
| Dashboard | `pages/dashboard.html` | Stats, pipeline, activity feed, top matches |
| Candidates | `pages/candidates.html` | Table with search/filter, status tags, modals |
| Jobs | `pages/jobs.html` | Job cards + post new role form |
| Analytics | `pages/analytics.html` | Bar chart, donut chart, line chart, source breakdown |

---

## How to Run Locally

### Option 1 — Simply open the file (easiest)
Double-click `index.html` in your file manager. Most pages work fine.

> ⚠️ Some browsers (Chrome/Edge) block local JS module loading. If you see blank pages, use Option 2.

### Option 2 — Local dev server (recommended)

**Using Python (built-in):**
```bash
cd recruitai
python3 -m http.server 3000
```
Then open → [http://localhost:3000](http://localhost:3000)

**Using Node.js (npx serve):**
```bash
cd recruitai
npx serve .
```
Then open → [http://localhost:3000](http://localhost:3000)

**Using VS Code:**
Install the **Live Server** extension, right-click `index.html` → *Open with Live Server*.

---

## Design System

| Token | Value |
|-------|-------|
| Primary color | `#3b6be8` (Blue 600) |
| Font (body) | DM Sans (Google Fonts) |
| Font (display) | Fraunces (Google Fonts) |
| Border radius | 6px / 10px / 16px / 24px |
| Shadow levels | xs / sm / md / lg / xl |

All CSS variables are defined in `:root {}` at the top of `styles/main.css`.

---

## Features

- ✅ Fully responsive (desktop + mobile)
- ✅ Sidebar with hamburger toggle on mobile
- ✅ Sticky navbar + topbar with blur
- ✅ Form validation (auth page)
- ✅ Live candidate search & multi-filter
- ✅ Add / delete candidates (in-memory)
- ✅ Skill pill input (Jobs page)
- ✅ Bar chart, donut chart, line chart (Canvas + SVG, no library)
- ✅ Status tags (Selected / Pending / Rejected / etc.)
- ✅ Modal dialogs
- ✅ All dummy/static data — no backend needed

---

## Customization

- **Colors:** Edit CSS variables in `styles/main.css` `:root` block
- **Data:** Edit the `candidates`, `jobs`, `monthData` arrays in each page's `<script>` block
- **Navigation:** Add/remove nav items in `components/shared.js` → `buildSidebar()`

---

## Browser Support

Chrome 90+, Firefox 90+, Safari 14+, Edge 90+
