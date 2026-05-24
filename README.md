# Alaska Itinerary

A personal trip-planning web app for Lance & Betsy Thomas's May 2026 Alaska expedition — Vancouver embark, Celebrity Summit Inside Passage cruise, then a Denali road-trip leg.

## Live URLs

| Build | URL |
|---|---|
| Private (full app, includes costs) | https://lancethomas1.github.io/Alaska-Itinerary/ |
| Public share (sanitized, no costs) | https://lancethomas1.github.io/Alaska-Itinerary/s/friends-hemhb3ts/ |

## What's in it

- **Itinerary** — day-by-day plan for both legs (Cruise + Denali) with weather, astro times, photos pulled live from a shared iCloud album once each day is past, and per-section accent theming.
- **Park Conditions** — pulls the latest NPS Denali alerts (Pretty Rocks closure, Eielson/Wonder Lake status, etc.), cached locally for offline use.
- **Summit Viewpoints** — best places to see Denali from inside and outside the park, with Apple Maps deep links.
- **Packing** — field pack list per leg.
- **Todo** — pre-trip checklist with progress bar.
- **Ask (Aurora)** — bring-your-own-key Claude chat grounded in the trip's JSON; the API key stays in `localStorage` and calls go browser-direct to Anthropic.
- **Costs panel** — running total of prepaid bookings + posted in-trip spending. Hidden entirely from the public build.

Other niceties: light/dark theme tracking system preference, installable as a PWA, accessible labels and live regions, and a service worker for offline caching.

## Public vs private builds

`src/trip-data.js` is the private source of truth (full costs, full notes). The public share build runs `scripts/gen-public-trip-data.mjs` first to emit `src/trip-data.public.js` with the costs array emptied and every dollar amount scrubbed from item strings, then Vite is built with `VITE_PUBLIC_MODE=1` so the costs UI is removed and Aurora's prompt knows not to discuss money.

## Local development

```bash
npm install
npm run dev          # private build at http://localhost:5173/Alaska-Itinerary/
npm run build        # private production build → dist/
npm run build:public # sanitized public build → dist/s/friends-hemhb3ts/
```

Photos are synced from a shared iCloud album by `scripts/sync-icloud-album.mjs`; the manifest is regenerated with `npm run photos:manifest`.
