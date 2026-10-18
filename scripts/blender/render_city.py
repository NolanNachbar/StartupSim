# Renders isometric sprites from Kenney's CC0 3D kits (City Kit Commercial/Industrial/Roads, Car Kit, Nature Kit)
# into public/art/city/*.png plus manifest.json. Run headless:
#   KENNEY3D=/path/to/kits OUT=public/art/city SET=all /Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/blender/render_city.py
# The models are real Kenney art; this script only places a camera and lights and renders them. One tile of ground
# is a diamond 128 px wide and 64 px tall (a 2:1 isometric projection). Each sprite's anchor is the ground centre
# of its footprint, so the game can place it on its grid cell.
import json
import math
import os
import sys

import bpy
import mathutils

KITS = os.environ["KENNEY3D"]
OUT = os.environ.get("OUT", "public/art/city")
SET = os.environ.get("SET", "all")
SAMPLES = int(os.environ.get("SAMPLES", "48"))
TILE_W = 128.0  # diamond width in pixels for a 1 x 1 unit tile
PX_PER_UNIT = TILE_W / math.sqrt(2)
CANVAS = int(os.environ.get("CANVAS", "1024"))

def glb(kit, sub, name):
    return os.path.join(KITS, kit, "Models", sub, name + ".glb")

COM = lambda n: glb("city-kit-commercial", "GLB format", n)
IND = lambda n: glb("city-kit-industrial", "GLB format", n)
ROAD = lambda n: glb("city-kit-roads", "GLB format", n)
CAR = lambda n: glb("car-kit", "GLB format", n)
NAT = lambda n: glb("nature-kit", "GLTF format", n)

jobs = []  # (name, path, z_rotation_degrees, scale)
def add(name, path, rot=0, scale=1.0):
    jobs.append((name, path, rot, scale))

def add_rotations(base, path, scale=1.0):
    """Four views of one building (its sides differ), so a street of the same model never looks copy-pasted."""
    for r in (0, 90, 180, 270):
        add(base if r == 0 else f"{base}-r{r}", path, r, scale)

for letter in "abcdefghijklmn":
    add_rotations(f"com-{letter}", COM(f"building-{letter}"))
for letter in "abcde":
    add_rotations(f"sky-{letter}", COM(f"building-skyscraper-{letter}"))
for letter in "abcefhij":  # ind-d and ind-g have texture glitches, so they are left out
    add_rotations(f"ind-{letter}", IND(f"building-{letter}"))
add("water-tower", IND("water-tower"))
add("solar-group", IND("solar-panel-landscape-group"))
# Standing signs: abstract original marks on a pole (no real brand logos).
for kind, colour in (("ring", "coral"), ("rise", "mint"), ("hex", "yellow"), ("tri", "blue"), ("cubes", "violet")):
    add(f"sign-{kind}", f"sign:{kind}:{colour}")
for r in (0, 90):
    add(f"road-straight-{r}", ROAD("road-straight"), r)
for r in (0, 90, 180, 270):
    add(f"road-bend-{r}", ROAD("road-bend"), r)
    add(f"road-intersection-{r}", ROAD("road-intersection"), r)
    add(f"road-end-{r}", ROAD("road-end"), r)
add("road-crossroad", ROAD("road-crossroad"))
add("road-roundabout", ROAD("road-roundabout"))
add("grass", NAT("ground_grass"))
for n in ("tree_default", "tree_oak", "tree_pineTallA", "tree_pineRoundA", "plant_bushLarge", "rock_largeA"):
    add(n, NAT(n))
# The Car Kit is modelled larger than the City Kit roads, so cars are scaled to fit a one-tile road.
for car in ("van", "sedan", "taxi", "suv", "police", "ambulance", "firetruck", "truck-flat"):
    for r in (0, 90, 180, 270):
        add(f"car-{car}-{r}", CAR(car), r, 0.5)
for d in ("debris-bumper", "debris-door", "debris-tire", "debris-plate-a", "debris-spoiler-a", "debris-door-window", "debris-drivetrain"):
    add(d, CAR(d), 0, 0.5)

if SET != "all":
    wanted = set(SET.split(","))
    jobs = [j for j in jobs if j[0] in wanted or any(j[0].startswith(w) for w in wanted)]

def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = SAMPLES
    scene.cycles.use_denoising = True
    scene.cycles.device = "CPU"
    try:  # use the Metal GPU when Blender can see one
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = "METAL"
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
        scene.cycles.device = "GPU"
    except Exception as exc:  # noqa: BLE001
        print("GPU unavailable, using CPU:", exc)
    scene.render.resolution_x = CANVAS
    scene.render.resolution_y = CANVAS
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    # camera: orthographic, 2:1 isometric (30 degrees of elevation)
    cam_data = bpy.data.cameras.new("cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = CANVAS / PX_PER_UNIT
    cam = bpy.data.objects.new("cam", cam_data)
    scene.collection.objects.link(cam)
    euler = mathutils.Euler((math.radians(60), 0, math.radians(45)), "XYZ")
    offset = mathutils.Vector((0, 0, 40))
    offset.rotate(euler)
    cam.location = offset
    cam.rotation_euler = euler
    cam_data.clip_end = 200
    scene.camera = cam
    # warm sun from the upper left, soft shadows
    sun_data = bpy.data.lights.new("sun", "SUN")
    sun_data.energy = 3.4
    sun_data.angle = math.radians(6)
    sun_data.color = (1.0, 0.93, 0.80)
    sun = bpy.data.objects.new("sun", sun_data)
    sun.rotation_euler = (math.radians(30), math.radians(6), math.radians(-35))
    scene.collection.objects.link(sun)
    # cool sky fill
    world = bpy.data.worlds.new("world")
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.74, 0.84, 1.0, 1.0)
    bg.inputs[1].default_value = 0.85
    scene.world = world
    # a shadow catcher so the sprite carries its own ground shadow
    bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, -0.001))
    plane = bpy.context.object
    plane.is_shadow_catcher = True
    return scene

COLOURS = {"coral": (1.0, 0.36, 0.30), "mint": (0.18, 0.82, 0.55), "yellow": (1.0, 0.78, 0.20), "blue": (0.24, 0.42, 1.0), "violet": (0.54, 0.36, 1.0)}

def material(name, rgb):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (rgb[0], rgb[1], rgb[2], 1.0)
    m.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.45
    return m

def build_sign(kind, colour):
    """A mark on a pole, facing the camera. Returns the objects created."""
    objs = []
    paint = material("mark", COLOURS[colour])
    steel = material("pole", (0.62, 0.64, 0.72))
    def put(o, mat):
        o.data.materials.append(mat)
        objs.append(o)
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.035, depth=0.7, location=(0, 0, 0.35))
    put(bpy.context.object, steel)
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.16, depth=0.03, location=(0, 0, 0.015))
    put(bpy.context.object, steel)
    z = 1.05
    if kind == "ring":
        bpy.ops.mesh.primitive_torus_add(major_radius=0.3, minor_radius=0.09, major_segments=32, minor_segments=14, location=(0, 0, z), rotation=(math.radians(90), 0, 0))
        put(bpy.context.object, paint)
    elif kind in ("hex", "tri"):
        bpy.ops.mesh.primitive_cone_add(vertices=6 if kind == "hex" else 3, radius1=0.36, radius2=0.36, depth=0.16, location=(0, 0, z), rotation=(math.radians(90), 0, 0))
        put(bpy.context.object, paint)
    elif kind == "rise":
        for i, h in enumerate((0.3, 0.5, 0.78)):
            bpy.ops.mesh.primitive_cube_add(size=1, location=((i - 1) * 0.24, 0, 0.7 + h / 2))
            bpy.context.object.scale = (0.18, 0.12, h)
            put(bpy.context.object, paint)
    else:  # cubes
        for off in ((-0.2, 0.7), (0.2, 0.7), (0.0, 1.1)):
            bpy.ops.mesh.primitive_cube_add(size=0.36, location=(off[0], 0, off[1]))
            put(bpy.context.object, paint)
    return objs

def render_one(name, path, rot, scale, manifest):
    scene = reset_scene()
    before = set(bpy.data.objects)
    if path.startswith("sign:"):
        _, kind, colour = path.split(":")
        build_sign(kind, colour)
    else:
        bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    roots = [o for o in new if o.parent is None]
    # Some kits (the Car Kit) ship wheels as separate root objects, so rotate and scale them together around one pivot.
    pivot = bpy.data.objects.new("pivot", None)
    scene.collection.objects.link(pivot)
    for o in roots:
        o.parent = pivot
    pivot.rotation_euler[2] = math.radians(rot)
    pivot.scale = (scale, scale, scale)
    bpy.context.view_layer.update()
    out_png = os.path.join(OUT, name + ".png")
    scene.render.filepath = out_png
    bpy.ops.render.render(write_still=True)
    # crop to the alpha bounding box and record the anchor (ground centre of the footprint)
    import numpy as np
    img = bpy.data.images.load(out_png)
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    alpha = px[:, :, 3]
    alpha[alpha < 0.06] = 0.0
    px[:, :, 3] = alpha
    ys, xs = np.where(alpha > 0.0)
    if len(xs) == 0:
        print("EMPTY", name)
        return
    x0, x1, y0, y1 = int(xs.min()), int(xs.max()) + 1, int(ys.min()), int(ys.max()) + 1
    crop = px[y0:y1, x0:x1, :]
    out = bpy.data.images.new(name + "_c", width=x1 - x0, height=y1 - y0, alpha=True)
    out.pixels = crop.reshape(-1).tolist()
    out.filepath_raw = out_png
    out.file_format = "PNG"
    out.save()
    # image y is bottom-up in Blender; the origin sits at the canvas centre
    cx, cy = w // 2, h // 2
    manifest[name] = {"w": x1 - x0, "h": y1 - y0, "ax": cx - x0, "ay": y1 - 1 - cy}
    print("DONE", name, manifest[name])

os.makedirs(OUT, exist_ok=True)
manifest_path = os.path.join(OUT, "manifest.json")
manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {}
for name, path, rot, scale in jobs:
    if name in manifest and os.path.exists(os.path.join(OUT, name + ".png")):
        continue  # resume
    if not path.startswith("sign:") and not os.path.exists(path):
        print("MISSING", path)
        continue
    render_one(name, path, rot, scale, manifest)
    json.dump(manifest, open(manifest_path, "w"), indent=1, sort_keys=True)
