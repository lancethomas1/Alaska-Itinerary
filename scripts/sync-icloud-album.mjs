#!/usr/bin/env node
// Fetches the public iCloud Shared Album server-side, downloads each photo
// to public/photos/, and writes public/album.json. Designed to run in
// GitHub Actions before `npm run build` so the static GH Pages deploy
// contains all photo data — sidestepping iCloud's lack of CORS support
// from arbitrary browser origins.
//
// Run locally to populate dev:
//   node scripts/sync-icloud-album.mjs
//
// Override the album with env var:
//   ICLOUD_ALBUM_TOKEN=ABC123 node scripts/sync-icloud-album.mjs

import { writeFile, mkdir, readdir, unlink } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ALBUM_TOKEN = process.env.ICLOUD_ALBUM_TOKEN || "B2QJqstnBJOH2V1";
const PARTITION_DEFAULT = "p23";

async function iCloudPost(partition, token, endpoint, body) {
  const url =
    `https://${partition}-sharedstreams.icloud.com/${token}` +
    `/sharedstreams/${endpoint}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(body),
  });
  if (res.status === 330) {
    const data = await res.json();
    const host = (data["X-Apple-MMe-Host"] || "").split("-sharedstreams")[0];
    if (!host) throw new Error("iCloud redirect without host");
    return iCloudPost(host, token, endpoint, body);
  }
  if (!res.ok) throw new Error(`iCloud ${endpoint} ${res.status}`);
  return res.json();
}

async function downloadTo(url, path) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(path, buf);
  return buf.length;
}

async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const publicDir = resolve(here, "..", "public");
  const photosDir = join(publicDir, "photos");
  await mkdir(photosDir, { recursive: true });

  console.log(`Fetching iCloud Shared Album (${ALBUM_TOKEN})…`);
  const stream = await iCloudPost(
    PARTITION_DEFAULT,
    ALBUM_TOKEN,
    "webstream",
    { streamCtag: null },
  );
  const photos = stream.photos || [];
  console.log(`  → ${photos.length} photos in album`);

  const guids = photos.map((p) => p.photoGuid);
  const items = {};
  const locations = {};
  for (let i = 0; i < guids.length; i += 25) {
    const data = await iCloudPost(
      PARTITION_DEFAULT,
      ALBUM_TOKEN,
      "webasseturls",
      { photoGuids: guids.slice(i, i + 25) },
    );
    Object.assign(items, data.items || {});
    Object.assign(locations, data.locations || {});
  }

  const resolveUrl = (checksum) => {
    const item = items[checksum];
    if (!item) return null;
    const loc = locations[item.url_location];
    const host = loc?.hosts?.[0] || item.url_location;
    const scheme = loc?.scheme || "https";
    return `${scheme}://${host}${item.url_path}`;
  };

  const out = [];
  const keepFiles = new Set();
  let bytes = 0;
  for (const p of photos) {
    const derivs = p.derivatives || {};
    let bestKey = null;
    let bestArea = 0;
    for (const [k, d] of Object.entries(derivs)) {
      const a = Number(d.width || 0) * Number(d.height || 0);
      if (a > bestArea) { bestArea = a; bestKey = k; }
    }
    if (!bestKey) continue;
    const url = resolveUrl(derivs[bestKey].checksum);
    if (!url) continue;
    const ext = p.mediaAssetType === "video" ? "mp4" : "jpg";
    const filename = `${p.photoGuid}.${ext}`;
    const localPath = join(photosDir, filename);
    try {
      const size = await downloadTo(url, localPath);
      bytes += size;
      keepFiles.add(filename);
      out.push({
        guid: p.photoGuid,
        caption: (p.caption || "").trim(),
        dateCreated: p.dateCreated,
        width: Number(derivs[bestKey].width || p.width || 0),
        height: Number(derivs[bestKey].height || p.height || 0),
        // Stored relative to album.json; the app prepends Vite's BASE_URL.
        src: `photos/${filename}`,
        thumb: `photos/${filename}`,
      });
    } catch (err) {
      console.warn(`  ! ${p.photoGuid}: ${err.message}`);
    }
  }

  // Drop stale files (photos removed from the album).
  for (const f of await readdir(photosDir)) {
    if (!keepFiles.has(f)) {
      await unlink(join(photosDir, f)).catch(() => {});
    }
  }

  await writeFile(
    join(publicDir, "album.json"),
    JSON.stringify(
      {
        version: 1,
        generatedAt: new Date().toISOString(),
        photos: out,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `\nDownloaded ${out.length}/${photos.length} photos ` +
    `(${(bytes / 1024 / 1024).toFixed(1)} MB)`,
  );
  console.log("Wrote public/album.json");
}

main().catch((err) => {
  console.error(`\nFAILED: ${err.message}`);
  process.exit(1);
});
