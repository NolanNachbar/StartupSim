# One-time migration: shrink the shipped sprites from the old 128 px tile to the 96 px tile the game now uses
# (a 0.75 scale), recompress, and rewrite manifest.json to match. New renders already come out at 96 px
# (see TILE_W in render_city.py), so this is not part of the normal pipeline. Run from the project root.
import json
import os
import subprocess
import sys

FACTOR = 0.75
DIR = "public/art/city"
manifest_path = os.path.join(DIR, "manifest.json")
manifest = json.load(open(manifest_path))
if os.environ.get("FORCE") != "1" and manifest.get("_tile_w") == 96:
    sys.exit("already at the 96 px tile")
out = {}
for name, m in manifest.items():
    if name.startswith("_"):
        continue
    src = os.path.join(DIR, name + ".webp")
    png = os.path.join(DIR, name + ".tmp.png")
    nw, nh = max(1, round(m["w"] * FACTOR)), max(1, round(m["h"] * FACTOR))
    subprocess.run(["/opt/homebrew/bin/dwebp", "-quiet", src, "-o", png], check=True)
    subprocess.run(["/opt/homebrew/bin/cwebp", "-quiet", "-q", "78", "-alpha_q", "85", "-m", "6", "-resize", str(nw), str(nh), png, "-o", src], check=True)
    os.remove(png)
    out[name] = {"w": nw, "h": nh, "ax": round(m["ax"] * FACTOR, 2), "ay": round(m["ay"] * FACTOR, 2)}
out["_tile_w"] = 96
json.dump(out, open(manifest_path, "w"), indent=1, sort_keys=True)
print("done", len(out) - 1)
