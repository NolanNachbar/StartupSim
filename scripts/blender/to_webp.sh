#!/bin/sh
# Compress the rendered PNG sprites to WebP (alpha preserved) at the shipped quality and drop the PNGs.
set -e
DIR="${1:-public/art/city}"
for f in "$DIR"/*.png; do
  [ -f "$f" ] || continue
  /opt/homebrew/bin/cwebp -quiet -q 64 -alpha_q 60 -m 6 -sns 50 "$f" -o "${f%.png}.webp"
  rm "$f"
done
du -sh "$DIR"
