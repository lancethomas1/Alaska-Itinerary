// One-shot rasterizer: renders public/icon.svg into the PNG sizes the
// PWA / favicon / apple-touch-icon references. Run after editing the SVG.
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const svgPath = path.join(root, "public", "icon.svg");
const svg = await fs.readFile(svgPath);

const outputs = [
  { file: "favicon-32.png", size: 32 },
  { file: "favicon-192.png", size: 192 },
  { file: "icon-192.png", size: 192 },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "icon-512.png", size: 512 },
  { file: "icon-1024.png", size: 1024 },
];

for (const { file, size } of outputs) {
  const outPath = path.join(root, "public", file);
  await sharp(svg, { density: Math.max(72, Math.round(size * 0.75)) })
    .resize(size, size)
    .png()
    .toFile(outPath);
  console.log(`wrote public/${file} (${size}x${size})`);
}
