#!/usr/bin/env bash
# import-photos.sh — pull 13 photos from a synced "Alaska Photos" folder
# into ./photos/ at the names index.html expects.
#
# Setup (one-time):
#   1) Install Drive for Desktop and sync the "Alaska Photos" folder.
#   2) On macOS install ImageMagick (for resize) and dcraw (for DNG):
#        brew install imagemagick dcraw
#   3) Edit SOURCE below to point to the synced folder.
#   4) Edit the MAPPING section to pair each caption-key to a source filename.
#   5) Run:  bash import-photos.sh
#
# The script:
#   - Converts DNG → JPG (uses sips on macOS, which handles DNG natively)
#   - Resizes to 800px on the long edge (good quality, small file size)
#   - Drops result in ./photos/<caption-key>.jpg

set -euo pipefail

# ── EDIT ME ──────────────────────────────────────────────────────────
SOURCE="$HOME/Library/CloudStorage/GoogleDrive-lance.thomas@gmail.com/My Drive/Alaska Photos"
DEST="$(cd "$(dirname "$0")" && pwd)/photos"

# Pair each app key with the source filename in $SOURCE.
# Use the actual iPhone names (IMG_xxxx.DNG / .JPG / .HEIC).
# Leave a value blank to skip that slot for now.
declare -A MAP=(
  [may7_seawall]=""        # already in repo; safe to leave blank to keep it
  [may7_selfie]=""         # e.g. "IMG_9912.HEIC"
  [may7_tidepools]=""
  [may10_creek]=""
  [may10_totem]=""
  [may11_launch]=""
  [may11_kayak]=""
  [may11_paddle]=""
  [may12_glacier]=""
  [may12_falls]=""
  [may12_brewery]=""
  [may12_eagle]=""
  [may12_rainforest]=""
)
# ─────────────────────────────────────────────────────────────────────

mkdir -p "$DEST"

if [[ ! -d "$SOURCE" ]]; then
  echo "Source folder not found: $SOURCE"
  echo "Edit SOURCE at the top of this script."
  exit 1
fi

for key in "${!MAP[@]}"; do
  src_name="${MAP[$key]}"
  out="$DEST/$key.jpg"

  if [[ -z "$src_name" ]]; then
    echo "skip   $key (no source mapped)"
    continue
  fi

  src="$SOURCE/$src_name"
  if [[ ! -f "$src" ]]; then
    echo "MISS   $key  ($src_name not found in source)"
    continue
  fi

  # macOS sips handles JPG/HEIC/DNG. Resize long edge to 800, format JPEG.
  if command -v sips >/dev/null 2>&1; then
    sips -s format jpeg -Z 800 "$src" --out "$out" >/dev/null
  else
    # Linux fallback: imagemagick
    magick "$src" -resize '800x800>' -quality 85 "$out"
  fi
  printf "ok     %-22s ← %s  (%s)\n" "$key.jpg" "$src_name" \
    "$(du -h "$out" | cut -f1)"
done

echo
echo "Done. Files in $DEST:"
ls -la "$DEST"
