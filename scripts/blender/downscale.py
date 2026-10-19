# One-time migration: shrink the shipped sprites from the old 128 px tile to the 96 px tile the game now uses
# (a 0.75 scale), recompress, and rewrite manifest.json to match. New renders already come out at 96 px
# (see TILE_W in render_city.py), so this is not part of the normal pipeline. Run from the project root.
import json
import os
import shutil
import subprocess
import sys

FACTOR = 0.75
QUALITY = os.environ.get("WEBP_Q", "64")  # the same settings as to_webp.sh
ALPHA_QUALITY = os.environ.get("WEBP_ALPHA_Q", "60")
DWEBP = shutil.which("dwebp") or "/opt/homebrew/bin/dwebp"
CWEBP = shutil.which("cwebp") or "/opt/homebrew/bin/cwebp"
for tool in (DWEBP, CWEBP):
    if not os.path.exists(tool):
        sys.exit(f"needs the webp tools (brew install webp); not found: {tool}")
DIR = "public/art/city"
manifest_path = os.path.join(DIR, "manifest.json")
manifest = json.load(open(manifest_path))
if os.environ.get("FORCE") != "1" and manifest.get("_tile_w") == 96:
    sys.exit("already at the 96 px tile")
out = {k: v for k, v in manifest.items() if k.startswith("_")}  # keep any notes the manifest carries
for name, m in manifest.items():
    if name.startswith("_"):
        continue
    src = os.path.join(DIR, name + ".webp")
    png = os.path.join(DIR, name + ".tmp.png")
    nw, nh = max(1, round(m["w"] * FACTOR)), max(1, round(m["h"] * FACTOR))
    try:
        subprocess.run([DWEBP, "-quiet", src, "-o", png], check=True)
        subprocess.run([CWEBP, "-quiet", "-q", QUALITY, "-alpha_q", ALPHA_QUALITY, "-m", "6", "-sns", "50", "-resize", str(nw), str(nh), png, "-o", src], check=True)
    finally:
        if os.path.exists(png):
            os.remove(png)
    out[name] = {"w": nw, "h": nh, "ax": round(m["ax"] * FACTOR, 2), "ay": round(m["ay"] * FACTOR, 2)}
out["_tile_w"] = 96
json.dump(out, open(manifest_path, "w"), indent=1, sort_keys=True)
print("done", len(out) - 1)
