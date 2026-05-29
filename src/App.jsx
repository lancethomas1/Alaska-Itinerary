import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { usePhotos, isPastDay, enhanceItems } from "./photos.js";
// "~trip-data" resolves to ./trip-data.js for the normal build and to the
// pre-sanitized ./trip-data.public.js for the public share build — see
// vite.config.js. That keeps cost figures out of the public bundle entirely
// rather than just hidden from the rendered UI.
import TRIP_DATA from "~trip-data";

// Public share build hides the costs panel + tweaks Aurora's prompt. The
// actual data scrubbing happens at build time via the import alias above.
const PUBLIC_MODE = import.meta.env.VITE_PUBLIC_MODE === "1";


// ─── Color tokens ─────────────────────────────────────────
// Two semantic palettes share the same token names so every `C.x` reference
// stays valid in either theme. `midnight`/`deepFjord`/`fjord` are always
// "background-ish", `snow` is always "primary text", etc.
//
// The whole UI is themed after the app's vintage National Park sticker icon:
// a warm cream field, deep navy ink, and a retro sunset palette of gold,
// orange, red-orange, and dusty blue. Light mode is the "sticker" itself
// (cream paper); dark mode is that same sticker scene at night (navy field,
// cream type).
//
// Icon source colors: cream #efe2b8 · snow-cap #f3e8c4 · gold #eab835 ·
// orange #e08436 · red-orange #cd4a36 · dusty blue #79a7be · navy #1c2536.
//
// Contrast targets (on the section's typical background):
//   textMuted / textDim must clear WCAG AA (≥4.5:1 for body, ≥3:1 for large)
//   against `midnight`. Values below were checked against the new palettes.
const DARK_PALETTE = {
  midnight: "#101822",
  deepFjord: "#18202e",
  fjord: "#243144",
  glacier: "#79a7be",
  iceBlue: "#9cc4d5",
  mist: "#e7dcc0",
  snow: "#f3e8c4",
  pineDeep: "#28382a",
  pineSoft: "#9cb886",
  alpenglow: "#e8853a",
  alpenglowSoft: "#eeb44a",
  gold: "#eab835",
  stone: "#897f66",
  textMuted: "#cdc09a",
  textDim: "#a99b78",
};

const LIGHT_PALETTE = {
  midnight: "#f3e8c6",
  deepFjord: "#ecdcb0",
  fjord: "#e0cd99",
  glacier: "#b5642a",
  iceBlue: "#2b6573",
  mist: "#33302a",
  snow: "#1c2536",
  pineDeep: "#3f4a2c",
  pineSoft: "#4f6f34",
  alpenglow: "#aa3b26",
  alpenglowSoft: "#9a4419",
  gold: "#8a5e0c",
  stone: "#9c8a5e",
  textMuted: "#4a4434",
  textDim: "#6a5f44",
};

// Resolve initial palette synchronously so first render matches system.
function detectInitialPalette() {
  if (typeof window === "undefined" || !window.matchMedia) return DARK_PALETTE;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? DARK_PALETTE
    : LIGHT_PALETTE;
}

let activePalette = detectInitialPalette();

// Per-section accent colors in trip-data.js (e.g. Denali's `#e08436`) are
// tuned against the dark background. Used as TEXT on the light (cream) palette
// they fall below WCAG AA. `readableAccent` returns a darkened variant in light
// mode for text only — borders and icons keep the raw accent.
function readableAccent(hex) {
  if (!hex || hex[0] !== "#" || activePalette !== LIGHT_PALETTE) return hex;
  const n = hex.length === 4
    ? hex.slice(1).split("").map((c) => c + c).join("")
    : hex.slice(1, 7);
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  if (lum < 130) return hex;
  const to = (v) => Math.round(v * 0.32).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

// Proxy so every `C.x` access reads the current palette. Inline styles
// re-evaluate on each render, so swapping `activePalette` + a re-render
// flips the whole UI.
const C = new Proxy(
  {},
  {
    get(_, key) {
      return activePalette[key];
    },
    ownKeys() {
      return Reflect.ownKeys(activePalette);
    },
    getOwnPropertyDescriptor(_, key) {
      return {
        enumerable: true,
        configurable: true,
        value: activePalette[key],
      };
    },
  }
);

// Use getters so priority colors stay live across theme changes.
const priorityColors = {
  get high() { return C.alpenglow; },
  get medium() { return C.gold; },
  get low() { return C.pineSoft; },
};

// Visually hides text but keeps it available to screen readers.
const SR_ONLY_STYLE = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
};
const SrOnly = ({ children }) => <span style={SR_ONLY_STYLE}>{children}</span>;

// Strip trailing time ranges (e.g. "Ketchikan, AK  7AM–3PM") so Apple Maps
// gets a clean query, and build a universal maps.apple.com URL that opens
// the Apple Maps app on iOS/macOS and the web preview elsewhere.
function appleMapsUrl(location) {
  if (!location) return null;
  const cleaned = location
    .replace(/\s+\d{1,2}(:\d{2})?\s*(AM|PM)\s*[–-]\s*\d{1,2}(:\d{2})?\s*(AM|PM)/i, "")
    .replace(/\s+\d{1,2}(:\d{2})?\s*[–-]\s*\d{1,2}(:\d{2})?\s*(AM|PM)/i, "")
    .trim();
  return `https://maps.apple.com/?q=${encodeURIComponent(cleaned)}`;
}

const STREET_ADDRESS_RE = /\b\d+\s+(?:[A-Z][A-Za-z.'-]*\s+){1,4}(?:St|Street|Ave|Avenue|Blvd|Boulevard|Rd|Road|Dr|Drive|Pl|Place|Hwy|Highway|Ln|Lane|Way|Pkwy|Parkway|Ct|Court|Sq|Square|Terr|Terrace|Cir|Circle)(?:,\s+[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)?\b/g;

// Named destinations referenced in TRIP_DATA items. Multi-word names go
// before their shorter forms so the longest match wins when both apply.
const PLACE_NAMES = [
  "Executive Hotel Le Soleil",
  "Sitka National Historical Park",
  "Forbidden Peak Brewery",
  "Shrine of St. Therese",
  "Denali Viewpoint South",
  "St. Michael's Cathedral",
  "Fortress of the Bear",
  "Grande Denali Lodge",
  "Healy River Airport",
  "Horseshoe Lake Trail",
  "Outer Point Loop",
  "Savage River Loop",
  "Perseverance Trail",
  "Mendenhall Glacier",
  "Disenchantment Bay",
  "Granville Island",
  "Whittier Tunnel",
  "Hubbard Glacier",
  "Horseshoe Lake",
  "Point Bridget",
  "Stanley Park",
  "Nugget Falls",
  "Creek Street",
  "Canada Place",
  "Eagle Beach",
  "Ruth Glacier",
  "Riley Creek",
  "Broad Pass",
  "Talkeetna",
  "Hoonah",
];

const PLACE_RE = new RegExp(
  "\\b(?:" + PLACE_NAMES.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\b",
  "g"
);

// Split a string into text + Apple Maps links wherever a street address or
// known destination appears. Longest match wins; overlaps are dropped.
function linkifyAddresses(text, linkColor) {
  if (!text) return text;
  const found = [];
  STREET_ADDRESS_RE.lastIndex = 0;
  for (let m; (m = STREET_ADDRESS_RE.exec(text)); ) {
    found.push({ index: m.index, value: m[0] });
  }
  PLACE_RE.lastIndex = 0;
  for (let m; (m = PLACE_RE.exec(text)); ) {
    found.push({ index: m.index, value: m[0] });
  }
  if (!found.length) return text;
  found.sort((a, b) => a.index - b.index || b.value.length - a.value.length);
  const hits = [];
  let cursor = 0;
  for (const f of found) {
    if (f.index >= cursor) {
      hits.push(f);
      cursor = f.index + f.value.length;
    }
  }
  const parts = [];
  let last = 0;
  hits.forEach((h, i) => {
    if (h.index > last) parts.push(text.slice(last, h.index));
    parts.push(
      <a
        key={`a-${i}-${h.index}`}
        href={appleMapsUrl(h.value)}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: linkColor,
          textDecoration: "underline",
          textDecorationColor: `${linkColor}55`,
          textUnderlineOffset: "2px",
        }}
      >
        {h.value}
      </a>
    );
    last = h.index + h.value.length;
  });
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// ─── SVG: Retro sunset bands + navy mountain range ───
// Mirrors the app icon's vintage National Park sticker: horizontal sunset
// bands (gold → orange → red-orange → dusty blue) behind a flat navy
// silhouette with cream snow caps. Fixed colors in both themes — the
// sticker scene reads the same day or night, just like the icon.
function MountainHeader() {
return (
<svg
viewBox="0 0 800 280"
preserveAspectRatio="none"
style={{ width: "100%", height: "180px", display: "block", position: "absolute", top: 0, left: 0 }}
aria-hidden="true"
focusable="false"
>
  {/* Retro sunset bands */}
  <rect x="0" y="0"   width="800" height="70"  fill="#eab835" />
  <rect x="0" y="70"  width="800" height="60"  fill="#e08436" />
  <rect x="0" y="130" width="800" height="60"  fill="#cd4a36" />
  <rect x="0" y="190" width="800" height="90"  fill="#79a7be" />

  {/* Soft sun glow low on the horizon */}
  <defs>
    <radialGradient id="sun" cx="0.74" cy="0.66" r="0.30">
      <stop offset="0%" stopColor="#f3e8c4" stopOpacity="0.75" />
      <stop offset="100%" stopColor="#f3e8c4" stopOpacity="0" />
    </radialGradient>
  </defs>
  <rect width="800" height="280" fill="url(#sun)" />

  {/* Bird silhouettes */}
  <g opacity="0.5">
    <path d="M420 55 q4 -3 8 0 q4 -3 8 0" stroke="#1c2536" strokeWidth="1.4" fill="none" />
    <path d="M480 40 q3 -2 6 0 q3 -2 6 0" stroke="#1c2536" strokeWidth="1.2" fill="none" />
    <path d="M310 62 q3 -2 6 0 q3 -2 6 0" stroke="#1c2536" strokeWidth="1.2" fill="none" />
  </g>

  {/* Flat navy mountain silhouette */}
  <path
    d="M0,280 L0,205 L48,170 L96,192 L150,140 L210,178 L270,120 L335,162 L395,108 L455,150 L515,118 L580,156 L640,112 L705,150 L760,120 L800,142 L800,280 Z"
    fill="#1c2536"
  />

  {/* Cream snow caps on the tallest peaks */}
  <path d="M255,134 L270,120 L285,134 L274,140 L262,132 Z" fill="#f3e8c4" />
  <path d="M381,121 L395,108 L410,121 L398,128 L387,119 Z" fill="#f3e8c4" />
  <path d="M627,124 L640,112 L654,124 L643,130 L632,122 Z" fill="#f3e8c4" />
</svg>

);
}

function EagleMotif({ size = 22, color = C.glacier, opacity = 0.55 }) {
return (
<svg width={size} height={size * 0.5} viewBox="0 0 40 20" style={{ opacity }} aria-hidden="true" focusable="false">
<path
d="M2 12 Q8 4 14 10 Q18 6 20 10 Q22 6 26 10 Q32 4 38 12"
stroke={color}
strokeWidth="1.6"
fill="none"
strokeLinecap="round"
/>
</svg>
);
}

function PineRow({ count = 7, color = C.pineDeep, opacity = 0.6 }) {
return (
<svg width="100%" height="14" viewBox={`0 0 ${count * 16} 14`} preserveAspectRatio="none" style={{ opacity, display: "block" }} aria-hidden="true" focusable="false">
{Array.from({ length: count }).map((_, i) => (
<polygon
key={i}
points={`${i * 16 + 2},14 ${i * 16 + 8},2 ${i * 16 + 14},14`}
fill={color}
/>
))}
</svg>
);
}

function DayWeatherChip({ weather }) {
if (!weather || weather.hi == null || weather.lo == null) return null;
return (
<span
aria-label={`High ${weather.hi}°, low ${weather.lo}°`}
style={{
display: "inline-flex", alignItems: "center", gap: "5px",
fontSize: "12px", color: C.textMuted,
fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
letterSpacing: "0.5px", flexShrink: 0, whiteSpace: "nowrap",
}}>
{weather.icon && <span aria-hidden="true" style={{ fontSize: "14px" }}>{weather.icon}</span>}
<span>{weather.hi}°/{weather.lo}°</span>
</span>
);
}

// Renders one itinerary bullet, with an optional photo-evidence badge that
// opens the lightbox at the first matching photo. `derived` rows are bullets
// the photo data added (photos whose location matched no existing bullet).
function ItineraryRow({ entry, section, C, derived, onOpenPhoto }) {
  const fontDisplay = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
  const photos = entry.photos || [];
  const hasPhotos = photos.length > 0;
  return (
    <li style={{
      display: "flex", gap: "10px", padding: "6px 0",
      fontSize: "13px", color: C.mist,
      alignItems: "flex-start", lineHeight: 1.45,
    }}>
      <span aria-hidden="true" style={{
        color: derived ? C.iceBlue : section.accent,
        flexShrink: 0, marginTop: "2px", fontSize: "10px",
      }}>
        {derived ? "📷" : "◆"}
      </span>
      <span style={{ flex: 1, fontStyle: derived ? "italic" : "normal" }}>
        {derived ? entry.text : linkifyAddresses(entry.text, C.iceBlue)}
        {hasPhotos && (
          <button
            type="button"
            onClick={() => onOpenPhoto(photos, 0)}
            aria-label={`View ${photos.length} matching photo${photos.length === 1 ? "" : "s"}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: "4px",
              marginLeft: "8px", padding: "1px 7px",
              fontSize: "10px", fontFamily: fontDisplay,
              color: C.iceBlue,
              background: `${C.iceBlue}14`,
              border: `1px solid ${C.iceBlue}55`,
              borderRadius: "10px",
              cursor: "pointer",
              verticalAlign: "1px",
              letterSpacing: "0.5px",
            }}
          >
            <span aria-hidden="true">📷</span> {photos.length}
          </button>
        )}
      </span>
    </li>
  );
}


// ─── Park Conditions (live from NPS, cached 24h) ──────────────
const FALLBACK_CONDITIONS = {
  lastUpdated: "April 14, 2026",
  fetchedAt: null,
  headline: "Pretty Rocks Landslide — Mile 43 closure through summer 2026",
  alerts: [
    {
      severity: "high",
      title: "Park Road closed at Mile 43",
      body: "Closure expected to remain in place through summer 2026 while the Polychrome Area Plan is implemented. Transit and tour buses turn around at East Fork Bridge.",
    },
    {
      severity: "info",
      title: "Eielson Visitor Center — closed",
      body: "Closed for the 2026 season due to the road closure.",
    },
    {
      severity: "info",
      title: "Wonder Lake Campground — closed",
      body: "Closed for the 2026 season.",
    },
    {
      severity: "good",
      title: "Sled Dog Demos & Kennels — open",
      body: "Daily ranger programs and sled dog demos running in summer. Check kennels hours before visiting.",
    },
    {
      severity: "good",
      title: "Your activities unaffected",
      body: "Savage River Loop (Mile 15) and Sled Dog Demo (Mile 3) are well inside the open zone. Fly Denali flightseeing is independent of park road access.",
    },
  ],
  source: "https://www.nps.gov/dena/planyourvisit/conditions.htm",
};

const CONDITIONS_CACHE_KEY = "denali-conditions:v1";
const CONDITIONS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function readConditionsCache() {
  try {
    if (typeof window === "undefined" || !window.storage) return null;
    const result = await window.storage.get(CONDITIONS_CACHE_KEY);
    if (!result?.value) return null;
    const parsed = JSON.parse(result.value);
    if (!parsed?.fetchedAt) return null;
    const age = Date.now() - new Date(parsed.fetchedAt).getTime();
    if (age > CONDITIONS_CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeConditionsCache(data) {
  try {
    if (typeof window === "undefined" || !window.storage) return;
    await window.storage.set(CONDITIONS_CACHE_KEY, JSON.stringify(data));
  } catch {}
}

function useDenaliConditions() {
  const [data, setData] = useState(FALLBACK_CONDITIONS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          tools: [{ type: "web_fetch_20250910", name: "web_fetch", max_uses: 1 }],
          messages: [
            {
              role: "user",
              content:
                'Fetch https://www.nps.gov/dena/planyourvisit/conditions.htm and return ONLY a JSON object (no prose, no code fences) matching this exact shape:\n' +
                '{ "lastUpdated": "Month DD, YYYY", "headline": "one-line summary of the most important current condition", "alerts": [ { "severity": "high|info|good", "title": "short title", "body": "1-2 sentence detail" } ] }\n' +
                'Include 3-6 alerts. Use "high" for closures and warnings, "info" for neutral facts, "good" for things that are open/running normally. Focus on Park Road status, visitor center closures, campground status, and any active wildlife or weather alerts.',
            },
          ],
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      const text = body.content
        ?.filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      if (!text) throw new Error("No text in response");
      const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
      const parsed = JSON.parse(cleaned);
      if (!parsed.alerts || !Array.isArray(parsed.alerts)) {
        throw new Error("Malformed response");
      }
      const fresh = {
        ...parsed,
        fetchedAt: new Date().toISOString(),
        source: FALLBACK_CONDITIONS.source,
      };
      setData(fresh);
      writeConditionsCache(fresh);
    } catch (e) {
      setError(e.message || "Refresh failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => fetchFresh(), [fetchFresh]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await readConditionsCache();
      if (cancelled) return;
      if (cached) setData(cached);
      else fetchFresh();
    })();
    return () => { cancelled = true; };
  }, [fetchFresh]);

  return { data, loading, error, refresh };
}

function ParkConditionsCard({ accent, fontDisplay }) {
  const { data, loading, error, refresh } = useDenaliConditions();
  const sevColor = { high: C.alpenglow, info: C.iceBlue, good: C.pineSoft };
  const sevGlyph = { high: "⚠", info: "✦", good: "✓" };

  let statusLabel, statusColor;
  if (error) {
    statusLabel = "Offline · cached";
    statusColor = C.alpenglow;
  } else if (data.fetchedAt) {
    const fetched = new Date(data.fetchedAt);
    const ageHrs = (Date.now() - fetched.getTime()) / (1000 * 60 * 60);
    if (ageHrs < 1) {
      statusLabel = `Live · ${fetched.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    } else if (ageHrs < 24) {
      statusLabel = `Cached · ${Math.round(ageHrs)}h ago`;
    } else {
      statusLabel = "Cached · refreshing...";
    }
    statusColor = C.pineSoft;
  } else {
    statusLabel = "Cached snapshot";
    statusColor = C.gold;
  }

  const sevLabel = { high: "Warning", info: "Info", good: "Status OK" };
  return (
    <section aria-labelledby="park-conditions-heading" style={{
      background: `linear-gradient(180deg, ${C.deepFjord}f0 0%, ${C.midnight}f0 100%)`,
      border: `1px solid ${accent}55`,
      borderLeft: `3px solid ${accent}`,
      padding: "16px 18px",
      marginBottom: "16px",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        gap: "10px", marginBottom: "4px",
      }}>
        <h2 id="park-conditions-heading" style={{
          fontFamily: fontDisplay, fontSize: "12px",
          letterSpacing: "1.8px", textTransform: "uppercase",
          color: readableAccent(accent),
          margin: 0, fontWeight: 600,
        }}>
          <span aria-hidden="true" style={{ color: accent }}>◈ </span>Park Conditions
        </h2>
        <button
          onClick={refresh}
          disabled={loading}
          aria-label={loading ? "Refreshing park conditions" : "Refresh park conditions"}
          style={{
            background: "transparent",
            border: `1px solid ${C.stone}44`,
            color: loading ? C.textDim : C.iceBlue,
            fontFamily: fontDisplay, fontSize: "9px",
            letterSpacing: "2px", textTransform: "uppercase",
            padding: "4px 8px",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          <span aria-hidden="true">{loading ? "⟳" : "↻"}</span> {loading ? "Syncing" : "Refresh"}
        </button>
      </div>

      <div style={{
        fontFamily: fontDisplay, fontStyle: "italic",
        fontSize: "14px", color: C.snow,
        lineHeight: 1.4, marginBottom: "12px",
      }}>
        {data.headline}
      </div>

      <div aria-live="polite" style={{
        display: "flex", justifyContent: "space-between",
        fontFamily: fontDisplay, fontSize: "9px",
        letterSpacing: "1.5px", textTransform: "uppercase",
        color: C.textDim,
        paddingBottom: "10px", marginBottom: "10px",
        borderBottom: `1px dotted ${C.stone}33`,
      }}>
        <span>NPS updated · {data.lastUpdated}</span>
        <span style={{ color: statusColor }}>{statusLabel}</span>
      </div>

      <ul style={{ display: "flex", flexDirection: "column", gap: "8px", listStyle: "none", padding: 0, margin: 0 }}>
        {data.alerts.map((a, i) => {
          const color = sevColor[a.severity] || C.stone;
          return (
            <li key={i} style={{
              display: "flex", gap: "10px",
              padding: "8px 10px",
              background: `${C.midnight}88`,
              borderLeft: `2px solid ${color}`,
            }}>
              <span aria-hidden="true" style={{ color, fontSize: "12px", flexShrink: 0, marginTop: "1px" }}>
                {sevGlyph[a.severity] || "·"}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: "12px", color: C.snow,
                  fontWeight: 500, marginBottom: "2px",
                }}>
                  {sevLabel[a.severity] && <SrOnly>{sevLabel[a.severity]}: </SrOnly>}
                  {a.title}
                </div>
                <div style={{ fontSize: "11px", color: C.textMuted, lineHeight: 1.45 }}>
                  {a.body}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div style={{
        marginTop: "12px",
        fontFamily: fontDisplay, fontSize: "9px",
        letterSpacing: "1.5px", textTransform: "uppercase",
        color: C.textDim, textAlign: "right",
      }}>
        <a href={data.source} target="_blank" rel="noopener noreferrer"
           style={{ color: C.iceBlue, textDecoration: "none" }}>
          nps.gov/dena <span aria-hidden="true">↗</span>
          <SrOnly> (opens in new tab)</SrOnly>
        </a>
      </div>
    </section>
  );
}

const DENALI_VIEWPOINTS = [
  {
    zone: "Inside the Park",
    note: "By car or park bus — closer to the massif",
    spots: [
      { name: "Mile 9 Viewpoint", detail: "First clear summit view; accessible by car on the park road", query: "Mountain Vista Trailhead, Denali National Park" },
      { name: "Stony Hill Overlook", detail: "Mile 62 — classic head-on view, bus access only", query: "Stony Hill Overlook, Denali National Park" },
      { name: "Eielson Visitor Center", detail: "Mile 66 — closest road-accessible view of the summit, bus only", query: "Eielson Visitor Center, Denali National Park" },
    ],
  },
  {
    zone: "South of the Park",
    note: "Parks Highway pullouts — on a clear day",
    spots: [
      { name: "Denali View South", detail: "Parks Hwy Mile 135 — panoramic Alaska Range pullout", query: "Denali Viewpoint South, Alaska" },
      { name: "Denali View North", detail: "Parks Hwy Mile 162 — northbound pullout with sweeping summit view", query: "Denali View North, Alaska" },
    ],
  },
];

function DenaliViewpointsCard({ accent, fontDisplay }) {
  return (
    <section aria-labelledby="summit-viewpoints-heading" style={{
      background: `linear-gradient(180deg, ${C.deepFjord}f0 0%, ${C.midnight}f0 100%)`,
      border: `1px solid ${accent}55`,
      borderLeft: `3px solid ${accent}`,
      padding: "16px 18px",
      marginBottom: "16px",
    }}>
      <h2 id="summit-viewpoints-heading" style={{
        fontFamily: fontDisplay, fontSize: "12px",
        letterSpacing: "1.8px", textTransform: "uppercase",
        color: readableAccent(accent),
        marginBottom: "4px", margin: 0, fontWeight: 600,
      }}>
        <span aria-hidden="true" style={{ color: accent }}>◈ </span>Summit Viewpoints
      </h2>
      <div style={{
        fontFamily: fontDisplay, fontStyle: "italic",
        fontSize: "14px", color: C.snow,
        lineHeight: 1.4, marginBottom: "12px", marginTop: "4px",
      }}>
        Best places to see The High One
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {DENALI_VIEWPOINTS.map((zone, zi) => (
          <section key={zi} aria-label={zone.zone}>
            <div style={{
              display: "flex", alignItems: "baseline", gap: "8px",
              paddingBottom: "6px", marginBottom: "8px",
              borderBottom: `1px dotted ${C.stone}33`,
            }}>
              <h3 style={{
                fontFamily: fontDisplay, fontSize: "11px",
                letterSpacing: "2px", textTransform: "uppercase", color: C.snow,
                margin: 0, fontWeight: "normal",
              }}>
                {zone.zone}
              </h3>
              <span style={{
                fontFamily: fontDisplay, fontSize: "10px",
                fontStyle: "italic", color: C.textDim,
              }}>
                · {zone.note}
              </span>
            </div>
            <ul style={{ display: "flex", flexDirection: "column", gap: "8px", listStyle: "none", padding: 0, margin: 0 }}>
              {zone.spots.map((s, si) => (
                <li key={si} style={{
                  display: "flex", gap: "10px",
                  padding: "8px 10px",
                  background: `${C.midnight}88`,
                  borderLeft: `2px solid ${accent}99`,
                }}>
                  <span aria-hidden="true" style={{ color: accent, fontSize: "12px", flexShrink: 0, marginTop: "1px" }}>▲</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <a
                      href={appleMapsUrl(s.query)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: "12px", color: C.iceBlue,
                        fontWeight: 500,
                        textDecoration: "underline",
                        textDecorationColor: `${C.iceBlue}55`,
                        textUnderlineOffset: "2px",
                      }}
                    >
                      {s.name}
                      <SrOnly> (opens in Apple Maps)</SrOnly>
                    </a>
                    <div style={{ fontSize: "11px", color: C.textMuted, lineHeight: 1.45, marginTop: "2px" }}>
                      {s.detail}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}

// Tracks system light/dark preference and keeps `activePalette` in sync.
// Mutating the module-level palette synchronously with setState ensures the
// re-render below already sees the new colors via the `C` proxy.
function useSystemTheme() {
  const [theme, setTheme] = useState(() =>
    activePalette === DARK_PALETTE ? "dark" : "light"
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = (matches) => {
      activePalette = matches ? DARK_PALETTE : LIGHT_PALETTE;
      setTheme(matches ? "dark" : "light");
    };
    // Re-sync in case the preference changed between module load and mount.
    apply(mq.matches);
    const handler = (e) => apply(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return theme;
}

// ─── Aurora · Trip Concierge ──────────────────────────────
// Browser-direct Claude chat grounded in TRIP_DATA. BYOK: the user's
// Anthropic API key lives in localStorage and never leaves their
// device. CORS is unlocked with the `anthropic-dangerous-direct-browser-access`
// header — appropriate for a personal family app, not a public service.
function TripChat({ tripData, fontDisplay, fontBody, sectionAccent }) {
  const [storedKey, setStoredKey] = useState(() => {
    if (typeof localStorage === "undefined") return "";
    return localStorage.getItem("anthropicApiKey") || "";
  });
  const [keyDraft, setKeyDraft] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollerRef = useRef(null);

  const todayLabel = useMemo(
    () => new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    []
  );

  const systemPrompt = useMemo(
    () =>
      `You are Aurora, a warm and concise travel concierge for Lance & Betsy Thomas's Alaska expedition (May 6–18, 2026, celebrating Betsy's 40th birthday). Today is ${todayLabel}.

You have full knowledge of their itinerary, flights, ${PUBLIC_MODE ? "" : "costs, "}packing lists, and to-dos via the JSON below. Answer questions about their trip using only this context; if asked about something not in the data, say so honestly rather than inventing details.${PUBLIC_MODE ? " This is a public-facing copy of the itinerary, so cost or pricing details have been intentionally excluded — if asked about them, politely say they aren't part of this view." : ""}

Style: short, friendly replies (typically 2–4 sentences). Plain text or simple bullet lists — no markdown headings. Mention specific dates, places, or confirmation numbers when relevant.

Trip data (JSON):
${JSON.stringify(tripData, null, 2)}`,
    [tripData, todayLabel]
  );

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading, error]);

  const saveKey = () => {
    const k = keyDraft.trim();
    if (!k) return;
    localStorage.setItem("anthropicApiKey", k);
    setStoredKey(k);
    setKeyDraft("");
    setError(null);
  };

  const clearKey = () => {
    localStorage.removeItem("anthropicApiKey");
    setStoredKey("");
    setMessages([]);
    setError(null);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading || !storedKey) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": storedKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-opus-4-7",
          max_tokens: 1024,
          system: [
            { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
          ],
          messages: next,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.error?.message || `HTTP ${resp.status}`);
      }
      const reply =
        data.content?.find((b) => b.type === "text")?.text || "(no response)";
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const accent = sectionAccent || C.iceBlue;

  // ── Key-entry state ─────────────────────────────────────
  if (!storedKey) {
    return (
      <section aria-labelledby="aurora-heading">
        <div style={{ textAlign: "center", marginBottom: "20px", fontFamily: fontDisplay }}>
          <h2 id="aurora-heading" style={{
            fontSize: "13px", color: readableAccent(accent), letterSpacing: "2.5px",
            textTransform: "uppercase", margin: 0, fontWeight: 600,
          }}>
            Aurora · Trip Concierge
          </h2>
          <div style={{ fontSize: "11px", color: C.textDim, letterSpacing: "2px", marginTop: "4px", fontStyle: "italic" }}>
            Ask anything about the expedition
          </div>
        </div>

        <div style={{
          background: `${C.midnight}cc`, border: `1px solid ${accent}33`,
          borderLeft: `2px solid ${accent}`,
          padding: "18px 18px 16px", backdropFilter: "blur(8px)",
        }}>
          <div style={{
            fontFamily: fontDisplay, fontSize: "13px", color: C.snow,
            fontStyle: "italic", letterSpacing: "0.5px", marginBottom: "8px",
          }}>
            <span aria-hidden="true">✦ </span>One-time setup
          </div>
          <label htmlFor="anthropic-api-key" style={{ display: "block", fontSize: "12px", color: C.textMuted, lineHeight: 1.55, marginBottom: "14px" }}>
            Paste an Anthropic API key to enable the chat. It's stored only in this browser's local storage and sent directly to Anthropic — no server in between. Get one at{" "}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: accent, textDecoration: "underline", textUnderlineOffset: "2px" }}
            >
              console.anthropic.com<SrOnly> (opens in new tab)</SrOnly>
            </a>
            .
          </label>
          <input
            id="anthropic-api-key"
            type="password"
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
            placeholder="sk-ant-..."
            aria-label="Anthropic API key"
            autoComplete="off"
            spellCheck={false}
            style={{
              width: "100%", boxSizing: "border-box",
              background: `${C.deepFjord}cc`,
              border: `1px solid ${C.stone}33`,
              borderLeft: `2px solid ${accent}66`,
              color: C.snow, fontFamily: fontBody, fontSize: "13px",
              padding: "10px 12px", outline: "none",
              letterSpacing: "0.5px",
            }}
          />
          <button
            onClick={saveKey}
            disabled={!keyDraft.trim()}
            style={{
              marginTop: "10px", width: "100%",
              background: keyDraft.trim() ? `${accent}33` : `${C.stone}22`,
              border: `1px solid ${keyDraft.trim() ? accent : C.stone + "33"}`,
              color: keyDraft.trim() ? C.snow : C.textDim,
              fontFamily: fontDisplay, fontSize: "11px",
              letterSpacing: "2.5px", textTransform: "uppercase",
              padding: "10px", cursor: keyDraft.trim() ? "pointer" : "default",
              transition: "all 0.15s",
            }}
          >
            <span aria-hidden="true">◈ </span>Save Key
          </button>
        </div>
      </section>
    );
  }

  // ── Chat state ──────────────────────────────────────────
  const examples = [
    "What's on the agenda for May 12?",
    PUBLIC_MODE ? "Where are we staying in Vancouver?" : "How much have we spent so far?",
    "What's the weather like in Sitka?",
    "What still needs to be booked?",
  ];

  return (
    <section aria-labelledby="aurora-chat-heading">
      <div style={{ textAlign: "center", marginBottom: "16px", fontFamily: fontDisplay }}>
        <h2 id="aurora-chat-heading" style={{
          fontSize: "13px", color: readableAccent(accent), letterSpacing: "2.5px",
          textTransform: "uppercase", margin: 0, fontWeight: 600,
        }}>
          Aurora · Trip Concierge
        </h2>
        <div style={{ fontSize: "11px", color: C.textDim, letterSpacing: "2px", marginTop: "4px", fontStyle: "italic" }}>
          Ask anything about the expedition
        </div>
      </div>

      {/* Conversation */}
      <div
        ref={scrollerRef}
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-label="Aurora conversation"
        style={{
          background: `${C.midnight}aa`, backdropFilter: "blur(8px)",
          border: `1px solid ${C.stone}25`,
          padding: "14px", marginBottom: "10px",
          minHeight: "240px", maxHeight: "55vh", overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "thin",
        }}
      >
        {messages.length === 0 && (
          <div>
            <div style={{
              fontFamily: fontDisplay, fontSize: "11px", color: C.textDim,
              letterSpacing: "2.5px", textTransform: "uppercase",
              marginBottom: "10px",
            }}>
              <span aria-hidden="true">◆ </span>Try asking
            </div>
            <ul style={{ display: "flex", flexDirection: "column", gap: "6px", listStyle: "none", padding: 0, margin: 0 }}>
              {examples.map((q, i) => (
                <li key={i}>
                  <button
                    onClick={() => setInput(q)}
                    style={{
                      width: "100%",
                      textAlign: "left", padding: "9px 12px",
                      background: `${C.deepFjord}66`,
                      border: `1px solid ${C.stone}22`,
                      borderLeft: `2px solid ${accent}55`,
                      color: C.mist, fontFamily: fontBody, fontSize: "12px",
                      cursor: "pointer", transition: "all 0.15s",
                      fontStyle: "italic",
                    }}
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {messages.map((m, i) => {
          const isUser = m.role === "user";
          return (
            <div
              key={i}
              style={{
                marginBottom: "10px",
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start",
              }}
            >
              <div style={{
                maxWidth: "85%",
                background: isUser ? `${C.fjord}cc` : `${C.deepFjord}cc`,
                border: `1px solid ${isUser ? accent + "44" : C.stone + "33"}`,
                borderLeft: isUser ? "none" : `2px solid ${accent}`,
                borderRight: isUser ? `2px solid ${accent}` : "none",
                padding: "9px 13px",
                color: C.snow, fontFamily: fontBody, fontSize: "13px",
                lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>
                <div style={{
                  fontFamily: fontDisplay, fontSize: "9px", letterSpacing: "2px",
                  textTransform: "uppercase", color: isUser ? C.iceBlue : accent,
                  marginBottom: "4px",
                }}>
                  {isUser ? "You" : <><span aria-hidden="true">✦ </span>Aurora</>}
                </div>
                {m.content}
              </div>
            </div>
          );
        })}

        {loading && (
          <div role="status" style={{ display: "flex", justifyContent: "flex-start", marginBottom: "10px" }}>
            <div style={{
              background: `${C.deepFjord}cc`, border: `1px solid ${C.stone}33`,
              borderLeft: `2px solid ${accent}`,
              padding: "9px 13px",
              fontFamily: fontDisplay, fontStyle: "italic",
              fontSize: "12px", color: C.textMuted,
              letterSpacing: "0.5px",
            }}>
              <span aria-hidden="true">✦ </span>Aurora is thinking…
            </div>
          </div>
        )}
      </div>

      {error && (
        <div role="alert" style={{
          background: `${C.alpenglow}15`,
          border: `1px solid ${C.alpenglow}55`,
          borderLeft: `2px solid ${C.alpenglow}`,
          padding: "9px 12px", marginBottom: "10px",
          fontSize: "12px", color: C.alpenglow,
          fontFamily: fontBody, lineHeight: 1.45,
        }}>
          <span aria-hidden="true">⚠ </span>
          <SrOnly>Error: </SrOnly>
          {error}
        </div>
      )}

      {/* Composer */}
      <div style={{
        display: "flex", gap: "8px", alignItems: "stretch",
        background: `${C.midnight}aa`, padding: "8px",
        border: `1px solid ${C.stone}25`,
      }}>
        <label htmlFor="aurora-input" style={SR_ONLY_STYLE}>
          Message Aurora about the trip
        </label>
        <textarea
          id="aurora-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about the trip…"
          rows={1}
          style={{
            flex: 1, resize: "none",
            background: `${C.deepFjord}99`,
            border: `1px solid ${C.stone}22`,
            color: C.snow, fontFamily: fontBody, fontSize: "13px",
            padding: "9px 11px", outline: "none",
            minHeight: "38px", maxHeight: "120px",
            lineHeight: 1.4,
          }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          aria-label={loading ? "Sending message" : "Send message"}
          style={{
            background: input.trim() && !loading ? `${accent}33` : `${C.stone}22`,
            border: `1px solid ${input.trim() && !loading ? accent : C.stone + "33"}`,
            color: input.trim() && !loading ? C.snow : C.textDim,
            fontFamily: fontDisplay, fontSize: "11px",
            letterSpacing: "2px", textTransform: "uppercase",
            padding: "0 16px",
            cursor: input.trim() && !loading ? "pointer" : "default",
            transition: "all 0.15s",
          }}
        >
          {loading ? <span aria-hidden="true">…</span> : "Send"}
        </button>
      </div>

      {/* Footer controls */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginTop: "10px", fontFamily: fontDisplay, fontSize: "10px",
        letterSpacing: "1.5px", textTransform: "uppercase",
      }}>
        <span style={{ color: C.textDim }}>
          Model · claude-opus-4-7
        </span>
        <div style={{ display: "flex", gap: "12px" }}>
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); setError(null); }}
              style={{
                background: "none", border: "none", padding: 0,
                color: C.textMuted, fontFamily: "inherit", fontSize: "inherit",
                letterSpacing: "inherit", textTransform: "inherit",
                cursor: "pointer",
              }}
            >
              Clear chat
            </button>
          )}
          <button
            onClick={clearKey}
            style={{
              background: "none", border: "none", padding: 0,
              color: C.textMuted, fontFamily: "inherit", fontSize: "inherit",
              letterSpacing: "inherit", textTransform: "inherit",
              cursor: "pointer",
            }}
          >
            Remove key
          </button>
        </div>
      </div>
    </section>
  );
}

export default function AlaskaTripPlanner() {
const theme = useSystemTheme();
const [activeSection, setActiveSection] = useState("cruise");
const [activeTab, setActiveTab] = useState("itinerary");
const [todos, setTodos] = useState(TRIP_DATA.todos);
const [expandedDay, setExpandedDay] = useState(null);
const [showCosts, setShowCosts] = useState(false);
const [lightbox, setLightbox] = useState(null); // { photos: [photoObj], index: number }
const { byDate: photosByDate, loading: photosLoading, error: photosError } = usePhotos();
const lightboxRef = useRef(null);
const lightboxOpenerRef = useRef(null);

// Hint the browser so native UI (scrollbars, form controls, default canvas)
// matches the active palette.
useEffect(() => {
  if (typeof document === "undefined") return;
  document.documentElement.style.colorScheme = theme;
}, [theme]);

// Keyboard navigation + focus trap while lightbox is open
useEffect(() => {
if (!lightbox) return;
const previouslyFocused = lightboxOpenerRef.current || document.activeElement;
// Defer to next tick so the dialog node exists.
const focusTimer = window.setTimeout(() => {
  lightboxRef.current?.focus?.();
}, 0);
const onKey = (e) => {
if (e.key === "Escape") {
  e.preventDefault();
  setLightbox(null);
} else if (e.key === "ArrowRight" && lightbox.index < lightbox.photos.length - 1) {
  setLightbox({ ...lightbox, index: lightbox.index + 1 });
} else if (e.key === "ArrowLeft" && lightbox.index > 0) {
  setLightbox({ ...lightbox, index: lightbox.index - 1 });
} else if (e.key === "Tab") {
  // Simple focus trap: keep focus inside the dialog.
  const root = lightboxRef.current;
  if (!root) return;
  const focusables = root.querySelectorAll(
    'button, [href], [tabindex]:not([tabindex="-1"])'
  );
  if (focusables.length === 0) {
    e.preventDefault();
    root.focus();
    return;
  }
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  } else if (document.activeElement === root) {
    e.preventDefault();
    (e.shiftKey ? last : first).focus();
  }
}
};
window.addEventListener("keydown", onKey);
return () => {
  window.clearTimeout(focusTimer);
  window.removeEventListener("keydown", onKey);
  // Restore focus to the element that opened the lightbox.
  if (previouslyFocused && typeof previouslyFocused.focus === "function") {
    previouslyFocused.focus();
  }
  lightboxOpenerRef.current = null;
};
}, [lightbox]);

const section = TRIP_DATA.sections.find((s) => s.id === activeSection);
const toggleTodo = (id) =>
setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
const completedCount = todos.filter((t) => t.done).length;
const totalSpent = TRIP_DATA.costs.reduce((sum, c) => sum + c.amount, 0);
const pendingTotal = totalSpent;

const fontDisplay = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const fontBody = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

return (
<div
style={{
fontFamily: fontBody,
background: `linear-gradient(180deg, ${C.midnight} 0%, ${C.deepFjord} 35%, ${C.fjord} 70%, ${C.deepFjord} 100%)`,
minHeight: "100vh",
color: C.snow,
position: "relative",
overflow: "hidden",
}}
>
<style>{`
  /* Visible focus indicator for keyboard users. Inline styles can't set
     :focus-visible, so we rely on this global rule. */
  *:focus { outline: none; }
  *:focus-visible {
    outline: 2px solid ${C.iceBlue};
    outline-offset: 2px;
    border-radius: 2px;
  }
  a:focus-visible {
    outline: 2px solid ${C.iceBlue};
    outline-offset: 2px;
  }
  /* Skip link — visible only when focused. */
  .a11y-skip-link {
    position: absolute;
    left: 8px;
    top: -100px;
    z-index: 9999;
    padding: 10px 14px;
    background: ${C.midnight};
    color: ${C.snow};
    border: 2px solid ${C.iceBlue};
    font-family: 'Hoefler Text', Georgia, serif;
    font-size: 13px;
    letterSpacing: 2px;
    text-decoration: none;
  }
  .a11y-skip-link:focus { top: 8px; }
  /* Respect users who prefer reduced motion: kill long transitions and
     keyframe animations everywhere. */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
      scroll-behavior: auto !important;
    }
  }
`}</style>
<a href="#main-content" className="a11y-skip-link">Skip to main content</a>
{/* Atmospheric mist */}
<div aria-hidden="true" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
<div style={{
position: "absolute", top: "30%", left: "-20%", width: "70%", height: "40%",
background: `radial-gradient(ellipse, ${C.glacier}1a 0%, transparent 70%)`,
filter: "blur(40px)",
}} />
<div style={{
position: "absolute", bottom: "5%", right: "-15%", width: "60%", height: "35%",
background: `radial-gradient(ellipse, ${C.alpenglow}12 0%, transparent 70%)`,
filter: "blur(50px)",
}} />
</div>

  <div style={{ position: "relative", zIndex: 1, maxWidth: "680px", margin: "0 auto" }}>

    {/* ─── Header with mountain range ─── */}
    <header style={{ position: "relative", paddingTop: "180px" }}>
      <MountainHeader />
      <div style={{ position: "absolute", top: "172px", left: 0, right: 0 }}>
        <PineRow count={48} color={C.pineDeep} opacity={0.75} />
      </div>

      <div style={{ textAlign: "center", padding: "24px 16px 0" }}>
        <div style={{
          fontSize: "10px", letterSpacing: "6px", color: C.alpenglowSoft,
          textTransform: "uppercase", marginBottom: "10px",
          fontFamily: fontDisplay,
        }}>
          ✦  Lance & Betsy Thomas  ✦
        </div>
        <h1 style={{
          fontFamily: fontDisplay,
          fontSize: "clamp(38px, 11vw, 60px)",
          fontWeight: 900,
          margin: "0 0 8px",
          letterSpacing: "3px",
          lineHeight: 1.0,
          color: C.snow,
          textTransform: "uppercase",
        }}>
          Alaska
        </h1>
        {/* Retro sunset rule echoing the icon's banded arch */}
        <div aria-hidden="true" style={{
          display: "flex", justifyContent: "center", gap: 0,
          width: "132px", height: "5px", margin: "0 auto",
          borderRadius: "3px", overflow: "hidden",
          border: `1px solid ${C.snow}22`,
        }}>
          <span style={{ flex: 1, background: "#eab835" }} />
          <span style={{ flex: 1, background: "#e08436" }} />
          <span style={{ flex: 1, background: "#cd4a36" }} />
          <span style={{ flex: 1, background: "#79a7be" }} />
        </div>
        <div style={{
          fontSize: "11px", letterSpacing: "8px", color: C.iceBlue,
          textTransform: "uppercase", marginTop: "10px",
          fontFamily: fontDisplay,
        }}>
          MMXXVI
        </div>
        <div style={{
          fontSize: "13px", color: C.textMuted, fontStyle: "italic",
          marginTop: "14px", fontFamily: fontDisplay,
        }}>
          Betsy's 40th Birthday Expedition
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "14px", margin: "18px 0 14px" }}>
          <div style={{ height: "1px", flex: 1, background: `linear-gradient(90deg, transparent, ${C.stone}55)` }} />
          <EagleMotif size={28} color={C.iceBlue} opacity={0.7} />
          <div style={{ height: "1px", flex: 1, background: `linear-gradient(90deg, ${C.stone}55, transparent)` }} />
        </div>

        <ul aria-label="Flights" style={{ display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap", listStyle: "none", padding: 0, margin: 0 }}>
          {[TRIP_DATA.flights.outbound, TRIP_DATA.flights.return].map((f, i) => (
            <li key={i} title={f.details} style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              background: `${C.iceBlue}10`, border: `1px solid ${C.iceBlue}30`,
              padding: "5px 11px", fontSize: "11px", color: C.iceBlue,
              fontFamily: fontDisplay, letterSpacing: "0.5px",
            }}>
              <span aria-hidden="true">✈</span> <strong style={{ fontWeight: "normal", color: C.snow }}>{f.airline}</strong> · {f.conf} · {f.route}
            </li>
          ))}
        </ul>

        {!PUBLIC_MODE && (
        <button
          type="button"
          onClick={() => setShowCosts(!showCosts)}
          aria-expanded={showCosts}
          aria-controls="costs-panel"
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            background: `${C.pineSoft}15`, border: `1px solid ${C.pineSoft}45`,
            padding: "5px 14px", marginTop: "8px", fontFamily: fontDisplay,
            fontSize: "11px", color: C.pineSoft, cursor: "pointer", letterSpacing: "0.5px",
          }}
        >
          <span aria-hidden="true">◈ </span>${totalSpent.toLocaleString("en-US", { minimumFractionDigits: 2 })} spent <span aria-hidden="true">{showCosts ? "▲" : "▼"}</span>
        </button>
        )}

        {!PUBLIC_MODE && showCosts && (
          <div id="costs-panel" style={{
            background: `${C.midnight}cc`, border: `1px solid ${C.pineSoft}30`,
            padding: "16px 18px", marginTop: "10px", textAlign: "left",
            backdropFilter: "blur(10px)",
          }}>
            <h2 style={SR_ONLY_STYLE}>Trip costs</h2>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {TRIP_DATA.costs.map((c, i) => (
              <li key={i} style={{
                display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: "12px",
                borderBottom: i < TRIP_DATA.costs.length - 1 ? `1px solid ${C.stone}22` : "none",
              }}>
                <span style={{ color: C.textMuted }}>{c.label}</span>
                <span style={{ color: C.snow, fontFamily: fontDisplay, letterSpacing: "0.5px" }}>${c.amount.toFixed(2)}</span>
              </li>
            ))}
            </ul>
            <div style={{
              display: "flex", justifyContent: "space-between", padding: "10px 0 0", fontSize: "13px",
              borderTop: `1px solid ${C.pineSoft}55`, marginTop: "8px", fontFamily: fontDisplay,
            }}>
              <span style={{ color: C.pineSoft, letterSpacing: "1px" }}>TOTAL SPENT</span>
              <span style={{ color: C.pineSoft }}>${totalSpent.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </header>

    <main id="main-content" style={{ padding: "28px 16px 0" }}>
      {/* Section toggle */}
      <div role="group" aria-label="Trip leg" style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        {TRIP_DATA.sections.map((s) => {
          const active = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => { setActiveSection(s.id); setExpandedDay(null); }}
              aria-pressed={active}
              style={{
                flex: 1, padding: "16px 8px", cursor: "pointer",
                background: active ? `linear-gradient(180deg, ${s.color}ee 0%, ${s.color}aa 100%)` : `${C.deepFjord}aa`,
                // Section colors are always dark surfaces, so keep the active
                // label cream in both themes (snow is navy in light mode).
                color: active ? "#f3e8c4" : C.textDim,
                fontFamily: fontDisplay, fontSize: "13px",
                letterSpacing: "1px", textTransform: "uppercase",
                border: active ? `1px solid ${s.accent}` : `1px solid ${C.stone}22`,
                borderTop: active ? `2px solid ${s.accent}` : `1px solid ${C.stone}22`,
                transition: "all 0.25s",
                position: "relative", overflow: "hidden",
              }}
            >
              <div aria-hidden="true" style={{ fontSize: "20px", marginBottom: "4px" }}>{s.emoji}</div>
              <div style={{ fontStyle: "italic", fontSize: "14px" }}>{s.title}</div>
              <div style={{ fontSize: "9px", opacity: 0.7, marginTop: "3px", letterSpacing: "2px" }}>{s.dates.replace("2026", "'26")}</div>
              {active && (
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
                  <PineRow count={20} color={s.accent} opacity={0.4} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Trip information"
        onKeyDown={(e) => {
          const tabs = ["itinerary", "packing", "todos", "chat"];
          const i = tabs.indexOf(activeTab);
          let next = null;
          if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
          else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
          else if (e.key === "Home") next = tabs[0];
          else if (e.key === "End") next = tabs[tabs.length - 1];
          if (next) {
            e.preventDefault();
            setActiveTab(next);
            const el = e.currentTarget.querySelector(`#tab-${next}`);
            el?.focus?.();
          }
        }}
        style={{
          display: "flex", background: `${C.midnight}99`,
          border: `1px solid ${C.stone}25`,
          padding: "4px", marginBottom: "24px",
        }}
      >
        {["itinerary", "packing", "todos", "chat"].map((tab) => {
          const active = activeTab === tab;
          const visualLabel = tab === "itinerary" ? <><span aria-hidden="true">✦ </span>Itinerary</>
            : tab === "packing" ? <><span aria-hidden="true">▲ </span>Packing</>
            : tab === "chat" ? <><span aria-hidden="true">✦ </span>Ask</>
            : <><span aria-hidden="true">◈ </span>Todo {completedCount}/{todos.length}</>;
          const a11yName = tab === "todos"
            ? `Todo, ${completedCount} of ${todos.length} complete`
            : tab.charAt(0).toUpperCase() + tab.slice(1);
          return (
            <button
              key={tab}
              role="tab"
              id={`tab-${tab}`}
              aria-selected={active}
              aria-controls={`panel-${tab}`}
              tabIndex={active ? 0 : -1}
              aria-label={a11yName}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: "10px 4px", border: "none", cursor: "pointer",
                background: active ? `${C.glacier}33` : "transparent",
                color: active ? C.snow : C.textDim,
                fontFamily: fontDisplay, fontSize: "11px",
                letterSpacing: "1.5px", textTransform: "uppercase",
                transition: "all 0.15s",
                borderBottom: active ? `1px solid ${C.iceBlue}` : "1px solid transparent",
              }}
            >
              {visualLabel}
            </button>
          );
        })}
      </div>

      {/* ═══ ITINERARY ═══ */}
      {activeTab === "itinerary" && (
        <div role="tabpanel" id="panel-itinerary" aria-labelledby="tab-itinerary" tabIndex={0}>
          <div style={{ textAlign: "center", marginBottom: "20px", fontFamily: fontDisplay }}>
            <h2 style={{
              fontSize: "13px", color: readableAccent(section.accent), letterSpacing: "2.5px",
              textTransform: "uppercase", margin: 0, fontWeight: 600,
            }}>
              {section.subtitle}
            </h2>
            <div style={{ fontSize: "11px", color: C.textDim, letterSpacing: "2px", marginTop: "4px", fontStyle: "italic" }}>
              {section.dates}
            </div>
            <div style={{ marginTop: "10px" }}>
              <EagleMotif size={32} color={section.accent} opacity={0.6} />
            </div>
          </div>

          {activeSection === "denali" && (
            <ParkConditionsCard accent={section.accent} fontDisplay={fontDisplay} />
          )}

          {(() => {
            // Photo-loading diagnostic strip — visible without DevTools so
            // mobile-only users can see what the iCloud fetch is doing.
            const totalPhotos = Object.values(photosByDate).reduce(
              (n, ps) => n + (ps?.length || 0),
              0
            );
            const tone = photosError ? C.alpenglow : C.iceBlue;
            const label = photosError
              ? `Photos error: ${photosError}`
              : photosLoading
              ? `Loading photos from iCloud${totalPhotos ? ` (cached: ${totalPhotos})` : ""}…`
              : totalPhotos === 0
              ? `Album returned 0 photos`
              : `${totalPhotos} photo${totalPhotos === 1 ? "" : "s"} loaded from album`;
            const glyph = photosError ? "⚠" : photosLoading ? "…" : "📷";
            return (
              <div
                role="status"
                aria-live="polite"
                style={{
                  fontSize: "10px", letterSpacing: "1.5px",
                  color: tone, fontFamily: fontDisplay,
                  background: `${C.midnight}66`,
                  border: `1px solid ${tone}33`,
                  padding: "6px 12px", marginBottom: "16px",
                  textAlign: "center", textTransform: "uppercase",
                }}
              >
                <span aria-hidden="true">{glyph} </span>{label}
              </div>
            );
          })()}

          <ul aria-label={`${section.subtitle} day-by-day`} style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {section.days.map((day, i) => {
            const expanded = expandedDay === i;
            const accentColor = day.status === "booked" ? C.pineSoft : day.status === "todo" ? C.alpenglow : C.stone;
            // Photos and bullet enhancement only apply to days that have
            // started (date ≤ today). Future days render in their planned
            // form, untouched by the iCloud album.
            const past = isPastDay(day.date);
            const dayPhotos = past ? (photosByDate[day.date] || []) : [];
            const { enriched: enrichedItems, derived: derivedItems } = past
              ? enhanceItems(day.items, dayPhotos)
              : { enriched: day.items.map((text) => ({ text, photos: [] })), derived: [] };
            const panelId = `day-panel-${i}`;
            return (
              <li key={i} style={{ marginBottom: "10px", position: "relative" }}>
                <button
                  onClick={() => setExpandedDay(expanded ? null : i)}
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  style={{
                    width: "100%",
                    background: expanded
                      ? `linear-gradient(180deg, ${section.color}f0 0%, ${C.deepFjord}f0 100%)`
                      : `${C.deepFjord}b3`,
                    backdropFilter: "blur(8px)",
                    border: expanded ? `1px solid ${section.accent}` : `1px solid ${accentColor}33`,
                    borderLeft: `3px solid ${accentColor}`,
                    padding: "14px 16px", cursor: "pointer", color: "inherit",
                    fontFamily: "inherit", textAlign: "left",
                    display: "flex", alignItems: "center", gap: "14px",
                    transition: "all 0.2s",
                  }}
                >
                  <span aria-hidden="true" style={{ fontSize: "22px", flexShrink: 0 }}>{day.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
                      <span style={{ fontFamily: fontDisplay, fontSize: "15px", color: C.snow, fontStyle: "italic" }}>
                        {day.date} · <span style={{ fontStyle: "normal" }}>{day.day}</span>
                      </span>
                      <DayWeatherChip weather={day.weather} />
                    </div>
                    <div style={{
                      fontSize: "11px", color: C.textMuted, marginTop: "3px",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      letterSpacing: "0.5px",
                    }}>
                      {day.location && (
                        <a
                          href={appleMapsUrl(day.location)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            color: C.iceBlue,
                            textDecoration: "underline",
                            textDecorationColor: `${C.iceBlue}55`,
                            textUnderlineOffset: "2px",
                          }}
                        >
                          {day.location}
                          <SrOnly> (opens in Apple Maps)</SrOnly>
                        </a>
                      )}
                      {day.weather && (
                        <span style={{ marginLeft: "8px", color: C.alpenglowSoft, fontFamily: fontDisplay }}>
                          <span aria-hidden="true">{day.weather.icon} </span>
                          <SrOnly>High </SrOnly>{day.weather.hi}°<span aria-hidden="true">/</span>
                          <SrOnly>, low </SrOnly>{day.weather.lo}°
                        </span>
                      )}
                    </div>
                  </div>
                  <span aria-hidden="true" style={{ color: section.accent, fontSize: "10px", flexShrink: 0 }}>{expanded ? "▲" : "▼"}</span>
                </button>

                {expanded && (
                  <div id={panelId} style={{
                    background: `${C.midnight}d9`, backdropFilter: "blur(12px)",
                    border: `1px solid ${section.accent}`, borderTop: "none",
                    borderLeft: `3px solid ${accentColor}`,
                    padding: "14px 16px",
                  }}>
                    {day.weather && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: "12px",
                        background: `${C.fjord}80`, border: `1px solid ${C.glacier}33`,
                        padding: "10px 14px", marginBottom: "12px",
                        fontSize: "12px",
                      }}>
                        <span style={{ fontSize: "24px" }}>{day.weather.icon}</span>
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px", flex: 1 }}>
                          <div style={{ display: "flex", gap: "10px", alignItems: "baseline" }}>
                            <span style={{ color: C.alpenglow, fontFamily: fontDisplay, fontSize: "16px", fontStyle: "italic" }}>↑{day.weather.hi}°</span>
                            <span style={{ color: C.iceBlue, fontFamily: fontDisplay, fontSize: "16px", fontStyle: "italic" }}>↓{day.weather.lo}°</span>
                          </div>
                          <span style={{ color: C.textMuted, fontSize: "11px", lineHeight: 1.4 }}>{day.weather.desc}</span>
                        </div>
                      </div>
                    )}
                    {day.astro && (
                      <div style={{
                        background: `${C.midnight}aa`,
                        border: `1px solid ${C.iceBlue}22`,
                        borderLeft: `2px solid ${C.gold}66`,
                        padding: "10px 14px", marginBottom: "12px",
                        fontSize: "11px",
                      }}>
                        <div style={{
                          display: "flex", flexWrap: "wrap", gap: "16px 22px", alignItems: "center",
                          fontFamily: fontDisplay,
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ color: C.alpenglow, fontSize: "14px" }}>☀</span>
                            <span style={{ color: C.textMuted, letterSpacing: "1px", textTransform: "uppercase", fontSize: "9px" }}>Rise</span>
                            <span style={{ color: C.snow, fontStyle: "italic", fontSize: "13px" }}>{day.astro.sunrise}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ color: C.alpenglowSoft, fontSize: "14px" }}>✦</span>
                            <span style={{ color: C.textMuted, letterSpacing: "1px", textTransform: "uppercase", fontSize: "9px" }}>Set</span>
                            <span style={{ color: C.snow, fontStyle: "italic", fontSize: "13px" }}>{day.astro.sunset}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "14px" }}>{day.astro.moon}</span>
                            <span style={{ color: C.iceBlue, fontSize: "12px", fontStyle: "italic" }}>{day.astro.phase}</span>
                          </div>
                        </div>
                        {day.astro.tides && day.astro.tides.length > 0 && (
                          <div style={{
                            marginTop: "8px", paddingTop: "8px",
                            borderTop: `1px solid ${C.stone}22`,
                          }}>
                            <div style={{
                              display: "flex", alignItems: "center", gap: "8px",
                              marginBottom: "6px",
                            }}>
                              <span style={{ color: C.glacier, fontSize: "13px" }}>≈</span>
                              <span style={{ color: C.textMuted, letterSpacing: "1.5px", textTransform: "uppercase", fontSize: "9px", fontFamily: fontDisplay }}>Tide</span>
                            </div>
                            <div style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(2, 1fr)",
                              gap: "4px 14px",
                              fontFamily: fontDisplay,
                              fontSize: "12px",
                            }}>
                              {day.astro.tides.map((t, ti) => (
                                <div key={ti} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span style={{
                                    color: t.type === "H" ? C.alpenglow : C.iceBlue,
                                    fontWeight: "bold",
                                    fontSize: "10px",
                                    width: "12px",
                                  }}>{t.type}</span>
                                  <span style={{ color: C.snow, fontStyle: "italic" }}>{t.time}</span>
                                  <span style={{ color: C.textMuted, fontSize: "10px" }}>{t.h > 0 ? "+" : ""}{t.h} ft</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {past && dayPhotos.length > 0 && (
                      <section aria-label={`Photographs for ${day.date}, ${dayPhotos.length} total`} style={{ marginBottom: "12px" }}>
                        <h3 style={{
                          fontSize: "9px", letterSpacing: "2.5px", color: section.accent,
                          textTransform: "uppercase", marginBottom: "8px",
                          fontFamily: fontDisplay, display: "flex", alignItems: "center", gap: "8px",
                          margin: "0 0 8px", fontWeight: "normal",
                        }}>
                          <span><span aria-hidden="true">✦ </span>Photographs · {dayPhotos.length}</span>
                          <span aria-hidden="true" style={{ flex: 1, height: "1px", background: `${section.accent}33` }} />
                        </h3>
                        <ul style={{
                          display: "flex", gap: "10px", overflowX: "auto",
                          paddingBottom: "6px", scrollbarWidth: "thin",
                          WebkitOverflowScrolling: "touch",
                          listStyle: "none", padding: 0, margin: 0,
                        }}>
                          {dayPhotos.map((photo, pIdx) => {
                            const photoLabel = photo.caption || photo.locationName || `Photo ${pIdx + 1}`;
                            return (
                            <li key={photo.guid} style={{ flexShrink: 0, width: "150px" }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  lightboxOpenerRef.current = e.currentTarget;
                                  setLightbox({ photos: dayPhotos, index: pIdx });
                                }}
                                aria-label={`Open photo: ${photoLabel} (${pIdx + 1} of ${dayPhotos.length})`}
                                style={{
                                  width: "150px", height: "200px", overflow: "hidden",
                                  border: `1px solid ${C.iceBlue}33`,
                                  borderRadius: "2px",
                                  background: C.midnight,
                                  boxShadow: `0 2px 8px ${C.midnight}99`,
                                  cursor: "pointer",
                                  transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
                                  position: "relative",
                                  padding: 0, display: "block",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = "translateY(-2px)";
                                  e.currentTarget.style.boxShadow = `0 4px 14px ${C.midnight}cc`;
                                  e.currentTarget.style.borderColor = `${C.iceBlue}88`;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = "";
                                  e.currentTarget.style.boxShadow = `0 2px 8px ${C.midnight}99`;
                                  e.currentTarget.style.borderColor = `${C.iceBlue}33`;
                                }}
                              >
                                <img src={photo.thumb || photo.src} alt="" style={{
                                  width: "100%", height: "100%", objectFit: "cover", display: "block",
                                  pointerEvents: "none",
                                }} loading="lazy" />
                                <span aria-hidden="true" style={{
                                  position: "absolute", bottom: "6px", right: "6px",
                                  width: "22px", height: "22px",
                                  borderRadius: "50%",
                                  background: `${C.midnight}cc`,
                                  backdropFilter: "blur(4px)",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: "11px", color: C.iceBlue,
                                  border: `1px solid ${C.iceBlue}44`,
                                }}>⤢</span>
                              </button>
                              <div aria-hidden="true" style={{
                                fontSize: "10px", color: C.textMuted,
                                marginTop: "5px", lineHeight: 1.3,
                                fontFamily: fontDisplay, fontStyle: "italic",
                              }}>
                                {photo.caption || photo.locationName || ""}
                              </div>
                            </li>
                            );
                          })}
                        </ul>
                      </section>
                    )}
                    {past && dayPhotos.length === 0 && (
                      <div role="status" aria-live="polite" style={{
                        fontSize: "10px", color: C.textDim,
                        fontStyle: "italic", marginBottom: "10px",
                        fontFamily: fontDisplay, letterSpacing: "1px",
                      }}>
                        {photosLoading
                          ? "loading photos…"
                          : photosError
                          ? `couldn't load photos (${photosError})`
                          : "no photos in album for this date"}
                      </div>
                    )}
                    <ul aria-label={`${day.day} activities`} style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {enrichedItems.map((entry, j) => (
                      <ItineraryRow
                        key={`e-${j}`}
                        entry={entry}
                        section={section}
                        C={C}
                        onOpenPhoto={(photos, idx) => setLightbox({ photos, index: idx })}
                      />
                    ))}
                    {derivedItems.map((entry, j) => (
                      <ItineraryRow
                        key={`d-${j}`}
                        entry={entry}
                        section={section}
                        C={C}
                        derived
                        onOpenPhoto={(photos, idx) => setLightbox({ photos, index: idx })}
                      />
                    ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
          </ul>

          {activeSection === "denali" && (
            <DenaliViewpointsCard accent={section.accent} fontDisplay={fontDisplay} />
          )}
        </div>
      )}

      {/* ═══ PACKING ═══ */}
      {activeTab === "packing" && (
        <div role="tabpanel" id="panel-packing" aria-labelledby="tab-packing" tabIndex={0}>
          {["cruise", "denali"].map((cat) => {
            const sec = TRIP_DATA.sections.find((s) => s.id === cat);
            const items = TRIP_DATA.packing[cat];
            const headingId = `packing-${cat}-heading`;
            return (
              <section key={cat} aria-labelledby={headingId} style={{ marginBottom: "22px" }}>
                <div style={{
                  background: sec.color,
                  borderTop: `2px solid ${sec.accent}`,
                  padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px",
                }}>
                  <span aria-hidden="true" style={{ fontSize: "20px" }}>{sec.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <h2 id={headingId} style={{
                      fontFamily: fontDisplay, fontSize: "15px", color: "#f3e8c4",
                      fontStyle: "italic", letterSpacing: "0.5px",
                      margin: 0, fontWeight: "normal",
                    }}>
                      {sec.title}
                    </h2>
                    <div style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "1.8px", color: sec.accent, textTransform: "uppercase", marginTop: "3px" }}>
                      Field Pack List
                    </div>
                  </div>
                </div>
                <ul style={{
                  background: `${C.deepFjord}99`, backdropFilter: "blur(8px)",
                  border: `1px solid ${C.stone}25`, borderTop: "none",
                  listStyle: "none", padding: 0, margin: 0,
                }}>
                  {items.map((item, i) => (
                    <li key={i} style={{
                      padding: "11px 16px", fontSize: "13px", color: C.mist,
                      borderBottom: i < items.length - 1 ? `1px solid ${C.stone}15` : "none",
                      display: "flex", gap: "10px", alignItems: "center",
                    }}>
                      <span aria-hidden="true" style={{ color: sec.accent, flexShrink: 0, fontSize: "11px" }}>◆</span> {item}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {/* ═══ TODO ═══ */}
      {activeTab === "todos" && (
        <div role="tabpanel" id="panel-todos" aria-labelledby="tab-todos" tabIndex={0}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: "18px", padding: "12px 14px",
            background: `${C.deepFjord}99`, border: `1px solid ${C.stone}25`,
          }}>
            <div>
              <h2 style={{
                fontFamily: fontDisplay, fontSize: "11px", color: C.iceBlue,
                letterSpacing: "2px", textTransform: "uppercase",
                margin: 0, fontWeight: "normal",
              }}>
                Expedition Progress
              </h2>
              <div style={{ fontSize: "13px", color: C.textMuted, marginTop: "2px" }}>
                {completedCount} of {todos.length} complete
              </div>
            </div>
            <div
              role="progressbar"
              aria-label="Todo completion"
              aria-valuemin={0}
              aria-valuemax={todos.length}
              aria-valuenow={completedCount}
              aria-valuetext={`${completedCount} of ${todos.length} complete`}
              style={{
                height: "6px", width: "120px",
                background: `${C.midnight}cc`, border: `1px solid ${C.stone}25`,
                overflow: "hidden",
              }}
            >
              <div aria-hidden="true" style={{
                height: "100%", width: `${(completedCount / todos.length) * 100}%`,
                background: `linear-gradient(90deg, ${C.glacier}, ${C.pineSoft}, ${C.gold})`,
                transition: "width 0.4s",
              }} />
            </div>
          </div>

          {["high", "medium", "low"].map((p) => {
            const items = todos.filter((t) => t.priority === p);
            if (!items.length) return null;
            const priorityHeadingId = `todo-priority-${p}`;
            return (
              <section key={p} aria-labelledby={priorityHeadingId} style={{ marginBottom: "20px" }}>
                <h3 id={priorityHeadingId} style={{
                  fontFamily: fontDisplay, fontSize: "10px",
                  letterSpacing: "3px", color: priorityColors[p],
                  textTransform: "uppercase", marginBottom: "10px", paddingLeft: "2px",
                  display: "flex", alignItems: "center", gap: "8px",
                  margin: "0 0 10px", fontWeight: "normal",
                }}>
                  <span aria-hidden="true" style={{ fontSize: "8px" }}>▲</span> {p} Priority
                  <span aria-hidden="true" style={{ flex: 1, height: "1px", background: `${priorityColors[p]}33` }} />
                </h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {items.map((todo) => (
                  <li key={todo.id} style={{ marginBottom: "5px" }}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={todo.done}
                      onClick={() => toggleTodo(todo.id)}
                      style={{
                        width: "100%",
                        display: "flex", alignItems: "flex-start", gap: "12px",
                        padding: "11px 14px",
                        background: todo.done ? `${C.pineDeep}55` : `${C.deepFjord}88`,
                        backdropFilter: "blur(6px)",
                        cursor: "pointer",
                        border: `1px solid ${todo.done ? C.pineSoft + "33" : C.stone + "20"}`,
                        borderLeft: `2px solid ${todo.done ? C.pineSoft : priorityColors[todo.priority]}`,
                        transition: "all 0.15s",
                        textAlign: "left", fontFamily: "inherit",
                        color: "inherit",
                      }}
                    >
                      <span aria-hidden="true" style={{
                        width: "16px", height: "16px",
                        flexShrink: 0, marginTop: "2px",
                        border: `1.5px solid ${todo.done ? C.pineSoft : C.stone}`,
                        background: todo.done ? C.pineSoft : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "11px", color: C.midnight, fontWeight: "bold",
                      }}>
                        {todo.done && "✓"}
                      </span>
                      <span style={{
                        fontSize: "13px",
                        color: todo.done ? C.textDim : C.mist,
                        textDecoration: todo.done ? "line-through" : "none",
                        lineHeight: 1.45,
                      }}>
                        {todo.text}
                      </span>
                    </button>
                  </li>
                ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {/* ═══ CHAT ═══ */}
      {activeTab === "chat" && (
        <div role="tabpanel" id="panel-chat" aria-labelledby="tab-chat" tabIndex={0}>
          <TripChat
            tripData={TRIP_DATA}
            fontDisplay={fontDisplay}
            fontBody={fontBody}
            sectionAccent={section.accent}
          />
        </div>
      )}
    </main>

    {/* ─── Footer ─── */}
    <footer style={{ padding: "0 16px 48px", marginTop: "40px" }}>
      <div aria-hidden="true" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "14px", marginBottom: "16px" }}>
        <div style={{ height: "1px", flex: 1, background: `linear-gradient(90deg, transparent, ${C.stone}44)` }} />
        <EagleMotif size={26} color={C.glacier} opacity={0.5} />
        <div style={{ height: "1px", flex: 1, background: `linear-gradient(90deg, ${C.stone}44, transparent)` }} />
      </div>
      <PineRow count={36} color={C.pineDeep} opacity={0.55} />
      <div style={{
        textAlign: "center", marginTop: "16px",
        fontFamily: fontDisplay, fontSize: "10px",
        color: C.textDim, letterSpacing: "5px",
        textTransform: "uppercase",
      }}>
        Betsy's 40th <span aria-hidden="true">✦</span> Alaska MMXXVI
      </div>
      <div style={{
        textAlign: "center", marginTop: "6px",
        fontFamily: fontDisplay, fontSize: "12px",
        color: C.alpenglowSoft, fontStyle: "italic",
      }}>
        <span aria-hidden="true">❦  </span>Happy Birthday<span aria-hidden="true">  ❦</span>
      </div>
    </footer>
  </div>

  {/* ═══ LIGHTBOX OVERLAY ═══ */}
  {lightbox && (() => {
    const photo = lightbox.photos[lightbox.index];
    const hasPrev = lightbox.index > 0;
    const hasNext = lightbox.index < lightbox.photos.length - 1;
    const captionText = photo?.caption || photo?.locationName || "";
    return (
      <div
        ref={lightboxRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Photo ${lightbox.index + 1} of ${lightbox.photos.length}${captionText ? `: ${captionText}` : ""}`}
        tabIndex={-1}
        onClick={() => setLightbox(null)}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          background: `${C.midnight}f2`,
          backdropFilter: "blur(16px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          cursor: "zoom-out",
          animation: "fadeIn 0.18s ease-out",
          outline: "none",
        }}
      >
        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes zoomIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        `}</style>

        {/* Counter (live region so AT users hear index changes) */}
        <div
          aria-live="polite"
          aria-atomic="true"
          style={{
            position: "absolute", top: "20px", left: "20px",
            fontSize: "11px", letterSpacing: "2px",
            color: C.iceBlue, fontFamily: fontDisplay,
            textTransform: "uppercase",
            background: `${C.deepFjord}99`,
            padding: "6px 12px",
            border: `1px solid ${C.iceBlue}33`,
            zIndex: 2,
          }}
        >
          <SrOnly>Photo </SrOnly>
          {lightbox.index + 1} <span aria-hidden="true">/</span><SrOnly> of </SrOnly> {lightbox.photos.length}
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
          aria-label="Close photo viewer"
          style={{
            position: "absolute", top: "16px", right: "16px",
            width: "40px", height: "40px",
            borderRadius: "50%",
            background: `${C.deepFjord}cc`,
            border: `1px solid ${C.iceBlue}44`,
            color: C.snow,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "20px", cursor: "pointer",
            fontFamily: fontDisplay,
            padding: 0,
            zIndex: 2,
          }}
        ><span aria-hidden="true">×</span></button>

        {/* Prev arrow */}
        {hasPrev && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox({ ...lightbox, index: lightbox.index - 1 });
            }}
            aria-label="Previous photo"
            style={{
              position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)",
              width: "44px", height: "44px", borderRadius: "50%",
              background: `${C.deepFjord}cc`,
              border: `1px solid ${C.iceBlue}44`,
              color: C.snow,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "20px", cursor: "pointer",
              fontFamily: fontDisplay,
              padding: 0,
              zIndex: 2,
            }}
          ><span aria-hidden="true">‹</span></button>
        )}

        {/* Next arrow */}
        {hasNext && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox({ ...lightbox, index: lightbox.index + 1 });
            }}
            aria-label="Next photo"
            style={{
              position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
              width: "44px", height: "44px", borderRadius: "50%",
              background: `${C.deepFjord}cc`,
              border: `1px solid ${C.iceBlue}44`,
              color: C.snow,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "20px", cursor: "pointer",
              fontFamily: fontDisplay,
              padding: 0,
              zIndex: 2,
            }}
          ><span aria-hidden="true">›</span></button>
        )}

        {/* Photo + caption */}
        <figure
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: "min(900px, 92vw)",
            maxHeight: "calc(100vh - 80px)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: "16px",
            animation: "zoomIn 0.22s ease-out",
            cursor: "default",
            margin: 0,
          }}
        >
          <img
            key={photo?.guid || lightbox.index}
            src={photo?.src}
            alt={captionText || `Photo ${lightbox.index + 1}`}
            style={{
              maxWidth: "100%",
              maxHeight: "calc(100vh - 140px)",
              objectFit: "contain",
              borderRadius: "2px",
              border: `1px solid ${C.iceBlue}33`,
              boxShadow: `0 8px 40px ${C.midnight}, 0 0 60px ${C.glacier}33`,
              display: "block",
            }}
          />
          {(captionText || photo?.locationName) && (
            <figcaption style={{
              textAlign: "center", maxWidth: "600px",
              fontFamily: fontDisplay, fontStyle: "italic",
              fontSize: "14px", color: C.mist,
              letterSpacing: "0.5px",
              background: `${C.deepFjord}99`,
              padding: "8px 18px",
              border: `1px solid ${C.stone}33`,
            }}>
              {captionText}
              {photo?.locationName && photo.locationName !== captionText && (
                <span style={{
                  marginLeft: "8px", color: C.iceBlue, fontStyle: "normal",
                  fontSize: "11px", letterSpacing: "1px",
                }}>
                  <span aria-hidden="true">📍 </span>{photo.locationName}
                </span>
              )}
            </figcaption>
          )}
        </figure>
      </div>
    );
  })()}
</div>

);
}
