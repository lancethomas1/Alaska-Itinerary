// Reads the iCloud Shared Album from a JSON file baked into the static
// deploy by scripts/sync-icloud-album.mjs (run in GitHub Actions before
// every build). iCloud doesn't send CORS headers for browser fetches, so
// fetching live from the page is impossible on GitHub Pages — the build
// step does it server-side and ships the result as /album.json plus a
// /photos/ directory of downloaded JPGs.
//
// Per-photo GPS still comes from src/photos-manifest.json, built locally
// from original-quality exports (iCloud strips EXIF from shared albums).

import { useEffect, useState } from "react";
import manifest from "./photos-manifest.json";

const STORAGE_KEY = "alaska-photos-v5";
const GEOCODE_KEY = "alaska-geocode-v1";

const TRIP_YEAR = 2026;
const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

// Capture-time matching window between the photo's recorded `dateCreated`
// (UTC) and a manifest entry's EXIF DateTimeOriginal (UTC when
// OffsetTimeOriginal is present, which modern iPhones always include).
const MATCH_TOLERANCE_MS = 5 * 60 * 1000;

function loadCache(key) {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveCache(key, value) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota — non-fatal */
  }
}

// ─── Album fetch (from baked-in static JSON) ──────────────────────────────
async function fetchAlbum() {
  const base = import.meta.env.BASE_URL || "/";
  const albumUrl = `${base}album.json`;
  const res = await fetch(albumUrl, { cache: "no-cache" });
  if (!res.ok) throw new Error(`album.json ${res.status}`);
  const data = await res.json();
  const photos = data.photos || [];
  // Prefix relative photo paths with Vite's base so the URLs resolve under
  // /Alaska-Itinerary/ on GH Pages and / in local dev.
  return photos.map((p) => ({
    guid: p.guid,
    caption: (p.caption || "").trim(),
    dateCreated: p.dateCreated,
    width: Number(p.width || 0),
    height: Number(p.height || 0),
    src: p.src?.startsWith("http") ? p.src : `${base}${p.src}`,
    thumb: p.thumb?.startsWith("http") ? p.thumb : `${base}${p.thumb || p.src}`,
  })).filter((p) => p.src);
}

// ─── Manifest matching ────────────────────────────────────────────────────
// Pick the manifest entry whose capture time is closest to the iCloud photo,
// preferring a same-dimensions tiebreak when multiple are within tolerance.
function matchManifestEntry(photo, entries) {
  if (!entries || !entries.length) return null;
  const target = new Date(photo.dateCreated).getTime();
  if (Number.isNaN(target)) return null;
  let best = null;
  let bestDelta = MATCH_TOLERANCE_MS + 1;
  for (const e of entries) {
    const et = new Date(e.dateTaken).getTime();
    if (Number.isNaN(et)) continue;
    const delta = Math.abs(et - target);
    if (delta > MATCH_TOLERANCE_MS) continue;
    const dimsMatch =
      e.width && e.height &&
      ((e.width === photo.width && e.height === photo.height) ||
       (e.width === photo.height && e.height === photo.width));
    if (delta < bestDelta || (delta === bestDelta && dimsMatch)) {
      best = e;
      bestDelta = delta;
    }
  }
  return best;
}

// ─── Reverse geocoding ────────────────────────────────────────────────────
async function reverseGeocode(lat, lng, cache) {
  // 3 decimals ≈ 110 m — close enough to coalesce nearby cache hits.
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  if (key in cache) return cache[key];
  try {
    const url =
      `https://api.bigdatacloud.net/data/reverse-geocode-client` +
      `?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
    const res = await fetch(url);
    if (!res.ok) {
      cache[key] = null;
      return null;
    }
    const data = await res.json();
    const name =
      data.locality ||
      data.city ||
      data.principalSubdivision ||
      null;
    cache[key] = name;
    return name;
  } catch {
    cache[key] = null;
    return null;
  }
}

// Pull a "Stanley Park"-style proper-noun phrase out of a caption when no
// GPS is available. Falls back to the slice before the first dash.
function locationFromCaption(caption) {
  if (!caption) return null;
  const m = caption.match(/[A-Z][\w'.]*(?:\s+[A-Z][\w'.]*){0,4}/);
  if (m) return m[0].trim();
  const dashCut = caption.split(/[—–-]/)[0].trim();
  return dashCut || caption.trim();
}

function dateKey(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

// ─── React hook ───────────────────────────────────────────────────────────
// Returns { byDate, loading, error }.
// byDate["May 7"] is an array of photo objects:
//   { guid, src, thumb, caption, dateCreated, locationName?, gps? }
export function usePhotos() {
  const [state, setState] = useState(() => {
    const cached = loadCache(STORAGE_KEY);
    return cached
      ? { byDate: cached, loading: false, error: null }
      : { byDate: {}, loading: true, error: null };
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const photos = await fetchAlbum();
        const groups = {};
        for (const p of photos) {
          const k = dateKey(p.dateCreated);
          if (!k) continue;
          (groups[k] = groups[k] || []).push(p);
        }
        for (const ps of Object.values(groups)) {
          ps.sort((a, b) => new Date(a.dateCreated) - new Date(b.dateCreated));
        }

        const manifestEntries = manifest?.entries || [];
        const geoCache = loadCache(GEOCODE_KEY) || {};
        for (const ps of Object.values(groups)) {
          for (const p of ps) {
            if (cancelled) return;
            const entry = matchManifestEntry(p, manifestEntries);
            if (entry && entry.lat != null && entry.lng != null) {
              p.gps = { lat: entry.lat, lng: entry.lng };
              const name = await reverseGeocode(entry.lat, entry.lng, geoCache);
              if (name) p.locationName = name;
            }
            if (!p.locationName && p.caption) {
              p.locationName = locationFromCaption(p.caption);
            }
          }
        }
        saveCache(GEOCODE_KEY, geoCache);
        if (cancelled) return;
        saveCache(STORAGE_KEY, groups);
        setState({ byDate: groups, loading: false, error: null });
      } catch (err) {
        if (cancelled) return;
        setState((s) => ({ ...s, loading: false, error: err.message }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

// "May 7" ≤ today? Year is fixed to the trip.
export function isPastDay(dateStr, today = new Date()) {
  if (!dateStr) return false;
  const parts = dateStr.split(" ");
  const monthIdx = MONTHS.indexOf(parts[0]);
  const day = Number(parts[1]);
  if (monthIdx < 0 || !day) return false;
  const d = new Date(TRIP_YEAR, monthIdx, day);
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d <= t;
}

// Match photos to existing bullets by case-insensitive overlap of Title-Cased
// phrases in the bullet against each photo's locationName + caption. Returns
//   { enriched, derived }
// where enriched[i] = { text, photos: [...] } parallel to `items`, and
// derived is an array of orphan-photo bullets to render after.
export function enhanceItems(items, photos) {
  const empty = items.map((text) => ({ text, photos: [] }));
  if (!photos || !photos.length) return { enriched: empty, derived: [] };

  const norm = (s) =>
    (s || "")
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();

  const TITLE_RE = /[A-Z][\w'.]*(?:\s+[A-Z][\w'.]*){0,4}/g;
  // Single bare words that are too generic to anchor a match.
  const STOP = new Set([
    "alaska","ak","am","pm","todo","done","booked","verify","arrive",
    "morning","afternoon","evening","night","lunch","dinner","breakfast",
    "may","june","july","celebrity","summit","enterprise","united","conf",
    "air","canada","national","park","day","check","order","free","shuttle",
    "drive","walk","sea","ship","cruise","return","depart","fly","watch",
    "explore","book","options","light","rain","trail","loop","lodge",
    "tunnel","valley","road","highway","hwy",
  ]);
  const itemTokens = items.map((text) => {
    const out = [];
    let m;
    TITLE_RE.lastIndex = 0;
    while ((m = TITLE_RE.exec(text)) !== null) {
      const t = m[0].trim();
      const tl = t.toLowerCase();
      if (STOP.has(tl)) continue;
      // Single-word tokens are too generic ("Eagle", "Stanley") — require
      // either a multi-word phrase or a long unique word.
      if (t.includes(" ") || t.length >= 8) out.push(norm(t));
    }
    return out;
  });

  const matches = items.map(() => []);
  const unmatched = [];

  for (const p of photos) {
    const hay = norm(
      [p.locationName || "", p.caption || ""].filter(Boolean).join(" "),
    );
    if (!hay) {
      unmatched.push(p);
      continue;
    }
    let bestIdx = -1;
    let bestLen = 0;
    itemTokens.forEach((toks, i) => {
      for (const tok of toks) {
        if (tok.length > bestLen && hay.includes(tok)) {
          bestLen = tok.length;
          bestIdx = i;
        }
      }
    });
    if (bestIdx >= 0) matches[bestIdx].push(p);
    else unmatched.push(p);
  }

  const enriched = items.map((text, i) => ({ text, photos: matches[i] }));

  // Collapse orphan photos by location so a day's full ten extras don't
  // produce ten new bullets.
  const byLoc = new Map();
  for (const p of unmatched) {
    const key = p.locationName || p.caption || "Photo";
    if (!byLoc.has(key)) byLoc.set(key, []);
    byLoc.get(key).push(p);
  }
  const derived = [];
  for (const [loc, ps] of byLoc) derived.push({ text: loc, photos: ps });
  return { enriched, derived };
}
