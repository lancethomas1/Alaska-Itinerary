import { useState, useEffect, useCallback } from "react";
import { PHOTOS } from "./photos.js";

const TRIP_DATA = {
flights: {
outbound: {
airline: "Air Canada",
conf: "CH3D3P",
date: "May 6, 2026",
route: "Miami → Vancouver",
details: "AC1755 direct ~7 hr. Departs 6:10 PM MIA, arrives 10:00 PM YVR.",
},
return: {
airline: "United",
conf: "F8LP9X",
date: "May 17–18, 2026",
route: "Anchorage → Chicago → Fort Lauderdale",
details: "UA267 ANC→ORD 8:45 PM | UA1421 ORD→FLL 7:00 AM. Seats 29D/29E & 39A/39B.",
},
},
costs: [
// Prepaid bookings
{ label: "Celebrity Summit cruise (ECR)", amount: 835.96 },
{ label: "Shore excursions (Ketchikan + Sitka)", amount: 963.96 },
{ label: "ANC Airport Transfer by Train", amount: 161.98 },
{ label: "Grande Denali Lodge (2 nights)", amount: 793.35 },
{ label: "Enterprise rental car (Denali)", amount: 169.15 },
{ label: "Fly Denali — Glacier Landing", amount: 1558.00 },
{ label: "Air Canada flights + bags", amount: 684.79 },
{ label: "United return flights", amount: 578.80 },
// In-trip posted spending (from CSV)
{ label: "MIA airport meals + Lyft", amount: 91.76 },
{ label: "Vancouver — dining, hotel, transit, bikes", amount: 424.64 },
{ label: "Celebrity Summit — onboard charges", amount: 99.75 },
{ label: "Ketchikan — souvenirs", amount: 5.39 },
{ label: "Sitka — dining", amount: 125.62 },
{ label: "Juneau (May 12) — food & gas", amount: 62.65 },
{ label: "Explore Juneau rental car (placeholder)", amount: 230.00 },
],
sections: [
{
id: "cruise",
emoji: "🚢",
title: "Celebrity Summit",
subtitle: "Alaska Inside Passage",
dates: "May 6–15, 2026",
color: "#1d3d52",
accent: "#6fb5cf",
days: [
{
date: "May 6",
day: "Travel Day",
location: "Miami → Vancouver",
icon: "✈️",
weather: { icon: "⛅", hi: 64, lo: 52, desc: "Vancouver actual: mostly cloudy on arrival, 57°F observed at 8 PM. Miami: warm evening departure ~85°F." },
astro: { sunrise: "5:43 AM", sunset: "8:35 PM", moon: "🌖", phase: "Waning Gibbous" },
items: [
"Depart MIA 6:10 PM on Air Canada AC1755",
"Arrive YVR ~10:00 PM PDT",
"Check in: Executive Hotel Le Soleil (Hopper conf: MB7DX5Z5N5PV)",
"567 Hornby St, Vancouver — 2 nights",
],
status: "booked",
},
{
date: "May 7",
day: "Vancouver",
location: "Vancouver, BC",
icon: "🏙️",
weather: { icon: "🌦️", hi: 63, lo: 52, desc: "Actual: mix of sun & cloud with periods of drizzle. Cool morning, milder afternoon. (Environment Canada)" },
astro: { sunrise: "5:41 AM", sunset: "8:36 PM", moon: "🌖", phase: "Waning Gibbous" },
photos: ["may7_seawall", "may7_selfie", "may7_tidepools"],
items: [
"Stanley Park — bike or walk the seawall",
"Uber to Granville Island food market",
"Walk back via waterfront",
"Pre-cruise dinner downtown",
],
status: "booked",
},
{
date: "May 8",
day: "Embarkation",
location: "Vancouver, BC",
icon: "⚓",
weather: { icon: "☁️", hi: 61, lo: 50, desc: "Actual: cloudy with light drizzle — classic Vancouver embarkation weather. Mild for sailaway." },
astro: { sunrise: "5:39 AM", sunset: "8:38 PM", moon: "🌖", phase: "Waning Gibbous" },
items: [
"Hotel checkout AM",
"Canada Place cruise terminal, 999 Canada Pl",
"Boarding opens late morning",
"Celebrity Summit sails at 5:00 PM",
],
status: "booked",
},
{
date: "May 9",
day: "Sea Day",
location: "Inside Passage",
icon: "🌊",
weather: { icon: "⛅", hi: 58, lo: 46, desc: "Actual: calm seas through Inside Passage. Partly cloudy, light winds. Ridge of high pressure building over panhandle." },
astro: { sunrise: "4:56 AM", sunset: "8:32 PM", moon: "🌗", phase: "Last Quarter" },
items: [
"Scenic fjord cruising — bring binoculars",
"Watch for humpback whales, orcas, sea otters",
"Explore ship amenities — spa, pools, shows",
"Book specialty dining if not done",
],
status: "none",
},
{
date: "May 10",
day: "Ketchikan",
location: "Ketchikan, AK  7AM–3PM",
icon: "🐟",
weather: { icon: "⛅", hi: 50, lo: 42, desc: "Actual: pleasant surprise — high-pressure ridge held off the rain. Mostly cloudy with sun breaks, dry conditions (rare for Ketchikan!)." },
astro: { sunrise: "4:47 AM", sunset: "8:39 PM", moon: "🌗", phase: "Last Quarter" },
photos: ["may10_creek", "may10_totem"],
items: [
"✅ BOOKED: Wilderness Exploration & Crab Feast — 9:00 AM — $503.98",
"Order #211686852 (Celebrity Shorex)",
"World's largest collection of standing totem poles",
"Creek Street historic boardwalk",
],
status: "booked",
},
{
date: "May 11",
day: "Sitka",
location: "Sitka, AK  7AM–3:30PM",
icon: "🦅",
weather: { icon: "⛅", hi: 50, lo: 42, desc: "Actual: mostly cloudy but dry, light winds. Ideal kayaking conditions on calm water." },
astro: { sunrise: "4:51 AM", sunset: "9:04 PM", moon: "🌘", phase: "Waning Crescent" },
photos: ["may11_launch", "may11_kayak", "may11_paddle"],
items: [
"✅ BOOKED: Wilderness Sea Kayaking Adventure — 8:30 AM — $459.98",
"Order #211686852 (Celebrity Shorex)",
"St. Michael's Cathedral — Russian heritage",
"Sitka National Historical Park",
],
status: "booked",
},
{
date: "May 12",
day: "Juneau",
location: "Juneau, AK  7AM–9:30PM",
icon: "🏔️",
weather: { icon: "☀️", hi: 60, lo: 42, desc: "Actual: SUNNY & BEAUTIFUL ☀️ High-pressure ridge cleared the skies. Mostly sunny all day, light winds — perfect for the Mendenhall + Eagle Beach drive." },
astro: { sunrise: "4:38 AM", sunset: "9:09 PM", moon: "🌘", phase: "Waning Crescent" },
photos: ["may12_glacier", "may12_falls", "may12_brewery", "may12_eagle", "may12_rainforest"],
items: [
"✅ DONE — self-drive day via Explore Juneau rental (Booking 019e1d2a)",
"✓ Mendenhall Glacier & Nugget Falls",
"✓ Lunch — Forbidden Peak Brewery",
"✓ Eagle Beach",
"✓ Shrine of St. Therese",
"✓ Perseverance Trail",
"✓ Point Bridget / Outer Point Loop",
"Spent today: $62.65 (food/gas) · car rental ~$230 placeholder",
],
status: "booked",
},
{
date: "May 13",
day: "Icy Strait Point",
location: "Icy Strait Point, AK  7AM–5PM",
icon: "🐻",
weather: { icon: "🌤️", hi: 55, lo: 42, desc: "Cloudy AM clearing to mostly sunny PM. Light NE wind. Improving conditions — best port-day weather of the week. (NWS Glacier Bay zone)" },
astro: { sunrise: "4:41 AM", sunset: "9:14 PM", moon: "🌘", phase: "Waning Crescent", tides: [{type:"L",time:"5:12 AM",h:1.1}, {type:"H",time:"11:17 AM",h:12.5}, {type:"L",time:"5:16 PM",h:2.1}, {type:"H",time:"11:27 PM",h:15.2}] },
items: [
"⚠️ TODO — book shore excursion",
"Tlingit-owned port near Hoonah",
"Options: ZipRider, gondola, whale watching, brown bears",
"Fortress of the Bear sanctuary nearby",
],
status: "todo",
},
{
date: "May 14",
day: "Hubbard Glacier",
location: "Hubbard Glacier  6AM–10AM",
icon: "🧊",
weather: { icon: "🌧️", hi: 47, lo: 40, desc: "Rain, mostly cloudy. Yakutat area staying wet while rest of panhandle dries out. Bundle up — wind chill on deck near the glacier will feel much colder. (NWS Glacier Bay zone)" },
astro: { sunrise: "4:43 AM", sunset: "9:45 PM", moon: "🌘", phase: "Waning Crescent" },
items: [
"Scenic cruising in Disenchantment Bay",
"Be on deck early — 6 AM for best views",
"Watch for calving — glacier face is 6 miles wide",
"Largest tidewater glacier in North America",
],
status: "none",
},
{
date: "May 15",
day: "Disembark → Denali",
location: "Whittier → Anchorage → Denali",
icon: "🚂",
weather: { icon: "🌦️", hi: 50, lo: 38, desc: "Showers possible Whittier AM, drying as you head north through the Whittier Tunnel and up the Seward Hwy. Denali arrival: mostly sunny, high ~49°F. (NWS Whittier + Denali Park)" },
astro: { sunrise: "5:10 AM", sunset: "10:33 PM", moon: "🌘", phase: "Waning Crescent", tides: [{type:"H",time:"12:15 AM",h:13.2}, {type:"L",time:"7:00 AM",h:-2.1}, {type:"H",time:"1:17 PM",h:10.8}, {type:"L",time:"6:57 PM",h:1.7}] },
items: [
"⚠️ VERIFY with Celebrity: Transfer Whittier → Anchorage (was Seward; Order #210829304) — confirm new departure time/method (motorcoach vs train)",
"Arrive Anchorage — earlier than original Seward plan (~1h15 drive via Whittier Tunnel + Seward Hwy vs. 2.5h Seward train)",
"Enterprise rental car pickup 1 PM — Conf #71517672",
"Drive Parks Hwy to Denali (~4–5 hrs) → Grande Denali Lodge (HA463X0AM)",
],
status: "booked",
},
],
},
{
id: "denali",
emoji: "🦌",
title: "Denali",
subtitle: "The Great One",
dates: "May 15–17, 2026",
color: "#2a4a35",
accent: "#8fc99d",
days: [
{
date: "May 15",
day: "Arrival Evening",
location: "Grande Denali Lodge",
icon: "🏔️",
weather: { icon: "🌤️", hi: 49, lo: 39, desc: "Mostly sunny on arrival. Cool overnight near 39°F. Good chance Denali is out — keep eyes north! (NWS Denali Park, issued May 12)" },
items: [
"Arrive Grande Denali Lodge — Conf HA463X0AM",
"Evening walk: Horseshoe Lake Trail (~1.5 hrs, easy)",
"Watch for moose at dusk",
"Long daylight — sunset around 10:30 PM in mid-May",
],
status: "booked",
},
{
date: "May 16",
day: "Full Denali Day",
location: "Denali National Park",
icon: "🐻",
weather: { icon: "⛅", hi: 51, lo: 40, desc: "Mostly cloudy, dry. Decent flightseeing conditions if cloud ceiling holds — Fly Denali will assess at 8:30 AM. (NWS Denali Park)" },
astro: { sunrise: "4:42 AM", sunset: "11:01 PM", moon: "🌑", phase: "New Moon" },
items: [
"✅ BOOKED: Fly Denali Glacier Landing — 8:30 AM — $1,558 for 2 (Res. IOR0BL)",
"Ruth Glacier — 100 min flight + 20–30 min on the ice",
"Free shuttle from lodge to Healy River Airport",
"PM: open — relax at lodge, Horseshoe Lake, or Riley Creek trails",
],
status: "booked",
},
{
date: "May 17",
day: "Morning & Depart",
location: "Denali → Anchorage",
icon: "🌅",
weather: { icon: "🌦️", hi: 50, lo: 38, desc: "Slight chance of showers after 10 AM. Get sled dog demo done before noon — drive south stays dry. (NWS Denali Park)" },
astro: { sunrise: "4:57 AM", sunset: "10:47 PM", moon: "🌑", phase: "New Moon" },
items: [
"Morning: Sled Dog Demo 10 AM (free) or Savage River Loop — depart lodge by noon",
"~1:30 PM — Denali Viewpoint South pullout (Mile 134–135) — panoramic Alaska Range views, 10 min",
"~1:50 PM — Broad Pass — highest point on Parks Hwy, open tundra, moose/caribou possible",
"~2:30 PM — Talkeetna (14-mile spur off hwy) — best ground-level Denali views, lunch on Main St, 50 min",
"~5:30–6:00 PM — ANC airport · Return Enterprise by 7 PM · Fly UA267 8:45 PM",
],
status: "none",
},
],
},
],
packing: {
cruise: [
"Formal wear (2 nights)",
"Rain jacket + waterproof layers",
"Comfortable walking shoes for ports",
"Binoculars for wildlife & glaciers",
"Seasickness meds/bands",
"Tote bag for port days",
"Sunscreen (UV reflects off water)",
"Camera + extra batteries",
],
denali: [
"Waterproof hiking boots",
"Warm layers (30–55°F in May)",
"Gloves, hat, buff neck gaiter",
"Sunglasses (glacier glare is intense)",
"Camera with long zoom for wildlife",
"Insect repellent",
"Daypack",
"Snacks & reusable water bottle",
],
},
todos: [
{ id: 1, text: "Juneau — self-drove (Explore Juneau, Booking 019e1d2a): Mendenhall + Nugget Falls + Forbidden Peak + Eagle Beach + St. Therese + Perseverance + Outer Point Loop", done: true, priority: "high" },
{ id: 2, text: "Book Icy Strait Point shore excursion", done: false, priority: "high" },
{ id: 4, text: "Whittier → Anchorage transfer via Celebrity — Order #210829304 (originally Seward; verify rebooked details and time)", done: false, priority: "high" },
{ id: 5, text: "Resolve Enterprise account-issue banner before May 15", done: false, priority: "high" },
{ id: 6, text: "Check passport expiry (both Lance & Betsy)", done: false, priority: "high" },
{ id: 7, text: "Pack formal wear for cruise dinners", done: false, priority: "medium" },
{ id: 8, text: "Get travel insurance", done: false, priority: "medium" },
{ id: 9, text: "Download Celebrity Cruises app + check in online", done: true, priority: "medium" },
{ id: 10, text: "Air Canada flight booked — CH3D3P (MIA→YVR)", done: true, priority: "high" },
{ id: 11, text: "United return flights booked — F8LP9X (ANC→ORD→FLL)", done: true, priority: "high" },
{ id: 12, text: "Grande Denali Lodge booked — HA463X0AM", done: true, priority: "high" },
{ id: 13, text: "Enterprise rental car booked — Conf #71517672", done: true, priority: "high" },
{ id: 14, text: "Ketchikan excursion booked — Wilderness & Crab Feast", done: true, priority: "high" },
{ id: 15, text: "Sitka excursion booked — Wilderness Sea Kayaking", done: true, priority: "high" },
{ id: 16, text: "Fly Denali Glacier Landing booked — Res. IOR0BL", done: true, priority: "high" },
],
};

// ─── Color tokens ─────────────────────────────────────────
const C = {
midnight: "#08151f",
deepFjord: "#0e2435",
fjord: "#143049",
glacier: "#3d7993",
iceBlue: "#9fc4d4",
mist: "#d8e6ec",
snow: "#f1f6f9",
pineDeep: "#1a3025",
pineSoft: "#5a8a6b",
alpenglow: "#ed9874",
alpenglowSoft: "#f4b89a",
gold: "#e9c178",
stone: "#6b8090",
textMuted: "#8fb0c2",
textDim: "#5d7f93",
};

const priorityColors = { high: C.alpenglow, medium: C.gold, low: C.pineSoft };

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

// ─── SVG: Layered mountain range with snow caps & alpenglow sky ───
function MountainHeader() {
return (
<svg
viewBox="0 0 800 280"
preserveAspectRatio="none"
style={{ width: "100%", height: "180px", display: "block", position: "absolute", top: 0, left: 0 }}
aria-hidden
>
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stopColor="#0c1e2e" />
<stop offset="55%" stopColor="#1f3a52" />
<stop offset="85%" stopColor="#c47860" stopOpacity="0.55" />
<stop offset="100%" stopColor="#e9b58c" stopOpacity="0.4" />
</linearGradient>
<linearGradient id="farPeaks" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stopColor="#f4d9c2" />
<stop offset="14%" stopColor="#d5dee5" />
<stop offset="55%" stopColor="#6a8aa0" />
<stop offset="100%" stopColor="#2d4a62" />
</linearGradient>
<linearGradient id="midPeaks" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stopColor="#ffffff" />
<stop offset="10%" stopColor="#aac3d3" />
<stop offset="60%" stopColor="#3a5e76" />
<stop offset="100%" stopColor="#152e42" />
</linearGradient>
<linearGradient id="nearPeaks" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stopColor="#f4f8fa" />
<stop offset="8%" stopColor="#4f6b78" />
<stop offset="55%" stopColor="#1f3528" />
<stop offset="100%" stopColor="#0a1810" />
</linearGradient>
<radialGradient id="sun" cx="0.78" cy="0.62" r="0.18">
<stop offset="0%" stopColor="#fde2c8" stopOpacity="0.85" />
<stop offset="100%" stopColor="#fde2c8" stopOpacity="0" />
</radialGradient>
</defs>

  <rect width="800" height="280" fill="url(#sky)" />
  <rect width="800" height="280" fill="url(#sun)" />

  {/* Bird silhouettes */}
  <g opacity="0.55">
    <path d="M420 95 q4 -3 8 0 q4 -3 8 0" stroke="#1a2530" strokeWidth="1.2" fill="none" />
    <path d="M480 75 q3 -2 6 0 q3 -2 6 0" stroke="#1a2530" strokeWidth="1.1" fill="none" />
    <path d="M310 110 q3 -2 6 0 q3 -2 6 0" stroke="#1a2530" strokeWidth="1.1" fill="none" />
  </g>

  <path
    d="M0,280 L0,165 L55,125 L110,150 L165,95 L220,135 L280,80 L335,120 L395,70 L455,115 L515,90 L580,130 L640,100 L705,125 L760,90 L800,110 L800,280 Z"
    fill="url(#farPeaks)"
  />
  <path
    d="M0,280 L0,200 L45,160 L95,185 L150,135 L210,175 L270,125 L335,165 L395,140 L460,175 L525,150 L595,180 L660,155 L725,180 L800,165 L800,280 Z"
    fill="url(#midPeaks)"
  />
  <path
    d="M0,280 L0,230 L40,205 L90,225 L150,195 L215,220 L280,190 L340,215 L410,190 L475,220 L545,195 L615,225 L680,205 L745,225 L800,215 L800,280 Z"
    fill="url(#nearPeaks)"
  />
  <rect y="200" width="800" height="30" fill="#aec5d2" opacity="0.08" />
</svg>

);
}

function EagleMotif({ size = 22, color = C.glacier, opacity = 0.55 }) {
return (
<svg width={size} height={size * 0.5} viewBox="0 0 40 20" style={{ opacity }}>
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
<svg width="100%" height="14" viewBox={`0 0 ${count * 16} 14`} preserveAspectRatio="none" style={{ opacity, display: "block" }}>
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

function TrailBlaze({ status }) {
if (!status || status === "none") return null;
const isBooked = status === "booked";
const c = isBooked ? C.pineSoft : C.alpenglow;
return (
<span style={{
display: "inline-flex", alignItems: "center", gap: "5px",
padding: "2px 8px", fontSize: "10px", letterSpacing: "1.5px",
textTransform: "uppercase", fontFamily: "'Hoefler Text', Georgia, serif",
color: c, background: `${c}18`, border: `1px solid ${c}55`,
borderRadius: "2px",
}}>
{isBooked ? "✦" : "△"} {isBooked ? "BOOKED" : "TODO"}
</span>
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

  return (
    <div style={{
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
        <div style={{
          fontFamily: fontDisplay, fontSize: "10px",
          letterSpacing: "3px", textTransform: "uppercase", color: accent,
        }}>
          ◈ Park Conditions
        </div>
        <button
          onClick={refresh}
          disabled={loading}
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
          {loading ? "⟳ Syncing" : "↻ Refresh"}
        </button>
      </div>

      <div style={{
        fontFamily: fontDisplay, fontStyle: "italic",
        fontSize: "14px", color: C.snow,
        lineHeight: 1.4, marginBottom: "12px",
      }}>
        {data.headline}
      </div>

      <div style={{
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

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {data.alerts.map((a, i) => {
          const color = sevColor[a.severity] || C.stone;
          return (
            <div key={i} style={{
              display: "flex", gap: "10px",
              padding: "8px 10px",
              background: `${C.midnight}88`,
              borderLeft: `2px solid ${color}`,
            }}>
              <span style={{ color, fontSize: "12px", flexShrink: 0, marginTop: "1px" }}>
                {sevGlyph[a.severity] || "·"}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: "12px", color: C.snow,
                  fontWeight: 500, marginBottom: "2px",
                }}>
                  {a.title}
                </div>
                <div style={{ fontSize: "11px", color: C.textMuted, lineHeight: 1.45 }}>
                  {a.body}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: "12px",
        fontFamily: fontDisplay, fontSize: "9px",
        letterSpacing: "1.5px", textTransform: "uppercase",
        color: C.textDim, textAlign: "right",
      }}>
        <a href={data.source} target="_blank" rel="noopener noreferrer"
           style={{ color: C.iceBlue, textDecoration: "none" }}>
          nps.gov/dena ↗
        </a>
      </div>
    </div>
  );
}

export default function AlaskaTripPlanner() {
const [activeSection, setActiveSection] = useState("cruise");
const [activeTab, setActiveTab] = useState("itinerary");
const [todos, setTodos] = useState(TRIP_DATA.todos);
const [expandedDay, setExpandedDay] = useState(null);
const [showCosts, setShowCosts] = useState(false);
const [lightbox, setLightbox] = useState(null); // { photos: [keys], index: number }

// Keyboard navigation while lightbox is open
useEffect(() => {
if (!lightbox) return;
const onKey = (e) => {
if (e.key === "Escape") setLightbox(null);
else if (e.key === "ArrowRight" && lightbox.index < lightbox.photos.length - 1)
setLightbox({ ...lightbox, index: lightbox.index + 1 });
else if (e.key === "ArrowLeft" && lightbox.index > 0)
setLightbox({ ...lightbox, index: lightbox.index - 1 });
};
window.addEventListener("keydown", onKey);
return () => window.removeEventListener("keydown", onKey);
}, [lightbox]);

const section = TRIP_DATA.sections.find((s) => s.id === activeSection);
const toggleTodo = (id) =>
setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
const completedCount = todos.filter((t) => t.done).length;
const totalSpent = TRIP_DATA.costs.reduce((sum, c) => sum + c.amount, 0);
const pendingTotal = totalSpent;

const fontDisplay = "'Hoefler Text', 'Didot', 'Bodoni 72', 'Times New Roman', serif";
const fontBody = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif";

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
{/* Atmospheric mist */}
<div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
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
    <div style={{ position: "relative", paddingTop: "180px" }}>
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
          fontSize: "clamp(34px, 9vw, 52px)",
          fontWeight: "normal",
          margin: "0 0 6px",
          letterSpacing: "-0.5px",
          lineHeight: 1.0,
          color: C.snow,
          fontStyle: "italic",
        }}>
          Alaska
        </h1>
        <div style={{
          fontSize: "11px", letterSpacing: "8px", color: C.iceBlue,
          textTransform: "uppercase", marginTop: "4px",
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

        <div style={{ display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap" }}>
          {[TRIP_DATA.flights.outbound, TRIP_DATA.flights.return].map((f, i) => (
            <div key={i} title={f.details} style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              background: `${C.iceBlue}10`, border: `1px solid ${C.iceBlue}30`,
              padding: "5px 11px", fontSize: "11px", color: C.iceBlue,
              fontFamily: fontDisplay, letterSpacing: "0.5px",
            }}>
              ✈ <strong style={{ fontWeight: "normal", color: C.snow }}>{f.airline}</strong> · {f.conf} · {f.route}
            </div>
          ))}
        </div>

        <div
          onClick={() => setShowCosts(!showCosts)}
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            background: `${C.pineSoft}15`, border: `1px solid ${C.pineSoft}45`,
            padding: "5px 14px", marginTop: "8px", fontFamily: fontDisplay,
            fontSize: "11px", color: C.pineSoft, cursor: "pointer", letterSpacing: "0.5px",
          }}
        >
          ◈ ${totalSpent.toLocaleString("en-US", { minimumFractionDigits: 2 })} spent · ISP excursion TBD {showCosts ? "▲" : "▼"}
        </div>

        {showCosts && (
          <div style={{
            background: `${C.midnight}cc`, border: `1px solid ${C.pineSoft}30`,
            padding: "16px 18px", marginTop: "10px", textAlign: "left",
            backdropFilter: "blur(10px)",
          }}>
            {TRIP_DATA.costs.map((c, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: "12px",
                borderBottom: i < TRIP_DATA.costs.length - 1 ? `1px solid ${C.stone}22` : "none",
              }}>
                <span style={{ color: C.textMuted }}>{c.label}</span>
                <span style={{ color: C.snow, fontFamily: fontDisplay, letterSpacing: "0.5px" }}>${c.amount.toFixed(2)}</span>
              </div>
            ))}
            <div style={{
              display: "flex", justifyContent: "space-between", padding: "10px 0 0", fontSize: "13px",
              borderTop: `1px solid ${C.pineSoft}55`, marginTop: "8px", fontFamily: fontDisplay,
            }}>
              <span style={{ color: C.pineSoft, letterSpacing: "1px" }}>TOTAL SPENT</span>
              <span style={{ color: C.pineSoft }}>${totalSpent.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0 0", fontSize: "11px", fontFamily: fontDisplay }}>
              <span style={{ color: C.gold, letterSpacing: "0.5px" }}>+ Icy Strait Point excursion (TBD)</span>
              <span style={{ color: C.gold }}>TBD</span>
            </div>
          </div>
        )}
      </div>
    </div>

    <div style={{ padding: "28px 16px 48px" }}>
      {/* Section toggle */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        {TRIP_DATA.sections.map((s) => {
          const active = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => { setActiveSection(s.id); setExpandedDay(null); }}
              style={{
                flex: 1, padding: "16px 8px", cursor: "pointer",
                background: active ? `linear-gradient(180deg, ${s.color}ee 0%, ${s.color}aa 100%)` : `${C.deepFjord}aa`,
                color: active ? C.snow : C.textDim,
                fontFamily: fontDisplay, fontSize: "13px",
                letterSpacing: "1px", textTransform: "uppercase",
                border: active ? `1px solid ${s.accent}` : `1px solid ${C.stone}22`,
                borderTop: active ? `2px solid ${s.accent}` : `1px solid ${C.stone}22`,
                transition: "all 0.25s",
                position: "relative", overflow: "hidden",
              }}
            >
              <div style={{ fontSize: "20px", marginBottom: "4px" }}>{s.emoji}</div>
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
      <div style={{
        display: "flex", background: `${C.midnight}99`,
        border: `1px solid ${C.stone}25`,
        padding: "4px", marginBottom: "24px",
      }}>
        {["itinerary", "packing", "todos"].map((tab) => {
          const active = activeTab === tab;
          const label = tab === "itinerary" ? "✦ Itinerary"
            : tab === "packing" ? "▲ Packing"
            : `◈ Todo ${completedCount}/${todos.length}`;
          return (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, padding: "10px 4px", border: "none", cursor: "pointer",
              background: active ? `${C.glacier}33` : "transparent",
              color: active ? C.snow : C.textDim,
              fontFamily: fontDisplay, fontSize: "11px",
              letterSpacing: "1.5px", textTransform: "uppercase",
              transition: "all 0.15s",
              borderBottom: active ? `1px solid ${C.iceBlue}` : "1px solid transparent",
            }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* ═══ ITINERARY ═══ */}
      {activeTab === "itinerary" && (
        <div>
          <div style={{ textAlign: "center", marginBottom: "20px", fontFamily: fontDisplay }}>
            <div style={{ fontSize: "11px", color: section.accent, letterSpacing: "4px", textTransform: "uppercase" }}>
              {section.subtitle}
            </div>
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

          {section.days.map((day, i) => {
            const expanded = expandedDay === i;
            const accentColor = day.status === "booked" ? C.pineSoft : day.status === "todo" ? C.alpenglow : C.stone;
            return (
              <div key={i} style={{ marginBottom: "10px", position: "relative" }}>
                <button
                  onClick={() => setExpandedDay(expanded ? null : i)}
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
                  <span style={{ fontSize: "22px", flexShrink: 0 }}>{day.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
                      <span style={{ fontFamily: fontDisplay, fontSize: "15px", color: C.snow, fontStyle: "italic" }}>
                        {day.date} · <span style={{ fontStyle: "normal" }}>{day.day}</span>
                      </span>
                      <TrailBlaze status={day.status} />
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
                        </a>
                      )}
                      {day.weather && (
                        <span style={{ marginLeft: "8px", color: C.alpenglowSoft, fontFamily: fontDisplay }}>
                          {day.weather.icon} {day.weather.hi}°/{day.weather.lo}°
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{ color: section.accent, fontSize: "10px", flexShrink: 0 }}>{expanded ? "▲" : "▼"}</span>
                </button>

                {expanded && (
                  <div style={{
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
                    {day.photos && day.photos.length > 0 && (
                      <div style={{ marginBottom: "12px" }}>
                        <div style={{
                          fontSize: "9px", letterSpacing: "2.5px", color: section.accent,
                          textTransform: "uppercase", marginBottom: "8px",
                          fontFamily: fontDisplay, display: "flex", alignItems: "center", gap: "8px",
                        }}>
                          <span>✦ Photographs</span>
                          <div style={{ flex: 1, height: "1px", background: `${section.accent}33` }} />
                        </div>
                        <div style={{
                          display: "flex", gap: "10px", overflowX: "auto",
                          paddingBottom: "6px", scrollbarWidth: "thin",
                          WebkitOverflowScrolling: "touch",
                        }}>
                          {day.photos.map((pid, pIdx) => {
                            const photo = PHOTOS[pid];
                            if (!photo) return null;
                            return (
                              <div key={pid} style={{ flexShrink: 0, width: "150px" }}>
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => setLightbox({ photos: day.photos, index: pIdx })}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      setLightbox({ photos: day.photos, index: pIdx });
                                    }
                                  }}
                                  style={{
                                    width: "150px", height: "200px", overflow: "hidden",
                                    border: `1px solid ${C.iceBlue}33`,
                                    borderRadius: "2px",
                                    background: C.midnight,
                                    boxShadow: `0 2px 8px ${C.midnight}99`,
                                    cursor: "pointer",
                                    transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
                                    position: "relative",
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
                                  <img src={photo.src} alt={photo.caption} style={{
                                    width: "100%", height: "100%", objectFit: "cover", display: "block",
                                    pointerEvents: "none",
                                  }} />
                                  <div style={{
                                    position: "absolute", bottom: "6px", right: "6px",
                                    width: "22px", height: "22px",
                                    borderRadius: "50%",
                                    background: `${C.midnight}cc`,
                                    backdropFilter: "blur(4px)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: "11px", color: C.iceBlue,
                                    border: `1px solid ${C.iceBlue}44`,
                                  }}>⤢</div>
                                </div>
                                <div style={{
                                  fontSize: "10px", color: C.textMuted,
                                  marginTop: "5px", lineHeight: 1.3,
                                  fontFamily: fontDisplay, fontStyle: "italic",
                                }}>
                                  {photo.caption}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {day.items.map((item, j) => (
                      <div key={j} style={{
                        display: "flex", gap: "10px", padding: "6px 0",
                        fontSize: "13px", color: C.mist,
                        alignItems: "flex-start", lineHeight: 1.45,
                      }}>
                        <span style={{ color: section.accent, flexShrink: 0, marginTop: "2px", fontSize: "10px" }}>◆</span>
                        <span>{linkifyAddresses(item, C.iceBlue)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ PACKING ═══ */}
      {activeTab === "packing" && (
        <div>
          {["cruise", "denali"].map((cat) => {
            const sec = TRIP_DATA.sections.find((s) => s.id === cat);
            const items = TRIP_DATA.packing[cat];
            return (
              <div key={cat} style={{ marginBottom: "22px" }}>
                <div style={{
                  background: `linear-gradient(180deg, ${sec.color}ee 0%, ${C.deepFjord}cc 100%)`,
                  borderTop: `2px solid ${sec.accent}`,
                  padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px",
                }}>
                  <span style={{ fontSize: "20px" }}>{sec.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: fontDisplay, fontSize: "15px", color: C.snow, fontStyle: "italic", letterSpacing: "0.5px" }}>
                      {sec.title}
                    </div>
                    <div style={{ fontSize: "9px", letterSpacing: "2.5px", color: sec.accent, textTransform: "uppercase", marginTop: "2px" }}>
                      Field Pack List
                    </div>
                  </div>
                </div>
                <div style={{
                  background: `${C.deepFjord}99`, backdropFilter: "blur(8px)",
                  border: `1px solid ${C.stone}25`, borderTop: "none",
                }}>
                  {items.map((item, i) => (
                    <div key={i} style={{
                      padding: "11px 16px", fontSize: "13px", color: C.mist,
                      borderBottom: i < items.length - 1 ? `1px solid ${C.stone}15` : "none",
                      display: "flex", gap: "10px", alignItems: "center",
                    }}>
                      <span style={{ color: sec.accent, flexShrink: 0, fontSize: "11px" }}>◆</span> {item}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ TODO ═══ */}
      {activeTab === "todos" && (
        <div>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: "18px", padding: "12px 14px",
            background: `${C.deepFjord}99`, border: `1px solid ${C.stone}25`,
          }}>
            <div>
              <div style={{ fontFamily: fontDisplay, fontSize: "11px", color: C.iceBlue, letterSpacing: "2px", textTransform: "uppercase" }}>
                Expedition Progress
              </div>
              <div style={{ fontSize: "13px", color: C.textMuted, marginTop: "2px" }}>
                {completedCount} of {todos.length} complete
              </div>
            </div>
            <div style={{
              height: "6px", width: "120px",
              background: `${C.midnight}cc`, border: `1px solid ${C.stone}25`,
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%", width: `${(completedCount / todos.length) * 100}%`,
                background: `linear-gradient(90deg, ${C.glacier}, ${C.pineSoft}, ${C.gold})`,
                transition: "width 0.4s",
              }} />
            </div>
          </div>

          {["high", "medium", "low"].map((p) => {
            const items = todos.filter((t) => t.priority === p);
            if (!items.length) return null;
            return (
              <div key={p} style={{ marginBottom: "20px" }}>
                <div style={{
                  fontFamily: fontDisplay, fontSize: "10px",
                  letterSpacing: "3px", color: priorityColors[p],
                  textTransform: "uppercase", marginBottom: "10px", paddingLeft: "2px",
                  display: "flex", alignItems: "center", gap: "8px",
                }}>
                  <span style={{ fontSize: "8px" }}>▲</span> {p} Priority
                  <div style={{ flex: 1, height: "1px", background: `${priorityColors[p]}33` }} />
                </div>
                {items.map((todo) => (
                  <div
                    key={todo.id}
                    onClick={() => toggleTodo(todo.id)}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: "12px",
                      padding: "11px 14px",
                      background: todo.done ? `${C.pineDeep}55` : `${C.deepFjord}88`,
                      backdropFilter: "blur(6px)",
                      marginBottom: "5px", cursor: "pointer",
                      border: `1px solid ${todo.done ? C.pineSoft + "33" : C.stone + "20"}`,
                      borderLeft: `2px solid ${todo.done ? C.pineSoft : priorityColors[todo.priority]}`,
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{
                      width: "16px", height: "16px",
                      flexShrink: 0, marginTop: "2px",
                      border: `1.5px solid ${todo.done ? C.pineSoft : C.stone}`,
                      background: todo.done ? C.pineSoft : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "11px", color: C.midnight, fontWeight: "bold",
                    }}>
                      {todo.done && "✓"}
                    </div>
                    <span style={{
                      fontSize: "13px",
                      color: todo.done ? C.textDim : C.mist,
                      textDecoration: todo.done ? "line-through" : "none",
                      lineHeight: 1.45,
                    }}>
                      {todo.text}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Footer ─── */}
      <div style={{ marginTop: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "14px", marginBottom: "16px" }}>
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
          Betsy's 40th ✦ Alaska MMXXVI
        </div>
        <div style={{
          textAlign: "center", marginTop: "6px",
          fontFamily: fontDisplay, fontSize: "12px",
          color: C.alpenglowSoft, fontStyle: "italic",
        }}>
          ❦  Happy Birthday  ❦
        </div>
      </div>
    </div>
  </div>

  {/* ═══ LIGHTBOX OVERLAY ═══ */}
  {lightbox && (() => {
    const photo = PHOTOS[lightbox.photos[lightbox.index]];
    const hasPrev = lightbox.index > 0;
    const hasNext = lightbox.index < lightbox.photos.length - 1;
    return (
      <div
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
        }}
      >
        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes zoomIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        `}</style>

        {/* Close button */}
        <div
          onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
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
            zIndex: 2,
          }}
          aria-label="Close"
        >×</div>

        {/* Counter */}
        <div style={{
          position: "absolute", top: "20px", left: "20px",
          fontSize: "11px", letterSpacing: "2px",
          color: C.iceBlue, fontFamily: fontDisplay,
          textTransform: "uppercase",
          background: `${C.deepFjord}99`,
          padding: "6px 12px",
          border: `1px solid ${C.iceBlue}33`,
          zIndex: 2,
        }}>
          {lightbox.index + 1} / {lightbox.photos.length}
        </div>

        {/* Prev arrow */}
        {hasPrev && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setLightbox({ ...lightbox, index: lightbox.index - 1 });
            }}
            style={{
              position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)",
              width: "44px", height: "44px", borderRadius: "50%",
              background: `${C.deepFjord}cc`,
              border: `1px solid ${C.iceBlue}44`,
              color: C.snow,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "20px", cursor: "pointer",
              fontFamily: fontDisplay,
              zIndex: 2,
            }}
            aria-label="Previous"
          >‹</div>
        )}

        {/* Next arrow */}
        {hasNext && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setLightbox({ ...lightbox, index: lightbox.index + 1 });
            }}
            style={{
              position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
              width: "44px", height: "44px", borderRadius: "50%",
              background: `${C.deepFjord}cc`,
              border: `1px solid ${C.iceBlue}44`,
              color: C.snow,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "20px", cursor: "pointer",
              fontFamily: fontDisplay,
              zIndex: 2,
            }}
            aria-label="Next"
          >›</div>
        )}

        {/* Photo + caption */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: "min(900px, 92vw)",
            maxHeight: "calc(100vh - 80px)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: "16px",
            animation: "zoomIn 0.22s ease-out",
            cursor: "default",
          }}
        >
          <img
            key={lightbox.photos[lightbox.index]}
            src={photo.src}
            alt={photo.caption}
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
          <div style={{
            textAlign: "center", maxWidth: "600px",
            fontFamily: fontDisplay, fontStyle: "italic",
            fontSize: "14px", color: C.mist,
            letterSpacing: "0.5px",
            background: `${C.deepFjord}99`,
            padding: "8px 18px",
            border: `1px solid ${C.stone}33`,
          }}>
            {photo.caption}
          </div>
        </div>
      </div>
    );
  })()}
</div>

);
}
