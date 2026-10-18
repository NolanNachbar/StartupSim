#!/bin/sh
# Compress the rendered PNG sprites to WebP (alpha preserved) and drop the PNGs.
set -e
DIR="${1:-public/art/city}"
for f in "$DIR"/*.png; do
  [ -f "$f" ] || continue
  /opt/homebrew/bin/cwebp -quiet -q 84 -alpha_q 90 -m 6 "$f" -o "${f%.png}.webp"
  rm "$f"
done
du -sh "$DIR"
