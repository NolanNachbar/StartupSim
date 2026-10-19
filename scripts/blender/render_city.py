# Renders isometric sprites from Kenney's CC0 3D kits (City Kit Commercial/Industrial/Roads, Car Kit, Nature Kit)
# into public/art/city/*.png plus manifest.json. Run headless:
#   KENNEY3D=/path/to/kits OUT=public/art/city SET=all blender -b -P scripts/blender/render_city.py
# Needs: Blender 5 on PATH as `blender` (or call its binary directly), the Kenney kits unzipped under $KENNEY3D, and
# the webp tools (brew install webp) for scripts/blender/to_webp.sh afterwards.
# The models are real Kenney art; this script only places a camera and lights and renders them. One tile of ground
# is a diamond 96 px wide and 48 px tall (a 2:1 isometric projection). Each sprite's anchor is the ground centre
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
TILE_W = float(os.environ.get("TILE_W", "96"))  # diamond width in pixels for a 1 x 1 unit tile (the game draws at about this size)
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
    """scale is one number, or (x, y, z) to stretch a model: a taller tower, or a 2 x 2 footprint."""
    jobs.append((name, path, rot, scale if isinstance(scale, tuple) else (scale, scale, scale)))

def add_rotations(base, path, scale=1.0, rots=(0, 90, 180, 270)):
    """Several views of one building (its sides differ), so a street of the same model never looks copy-pasted."""
    for r in rots:
        add(base if r == 0 else f"{base}-r{r}", path, r, scale)

for letter in "abcdefghijklmn":
    add_rotations(f"com-{letter}", COM(f"building-{letter}"))
for letter in "abcde":
    add_rotations(f"sky-{letter}", COM(f"building-skyscraper-{letter}"))
for letter in "abcefhij":  # ind-d and ind-g have texture glitches, so they are left out
    add_rotations(f"ind-{letter}", IND(f"building-{letter}"))
SUB = lambda n: glb("city-kit-suburban", "GLB format", n)
for letter in "abcdefghijklmnopqrstu":  # suburban houses
    add_rotations(f"sub-{letter}", SUB(f"building-type-{letter}"))
# The same houses with the green roofs recoloured (one palette swatch in the shared colour map), two views each.
ROOFS = {"brick": (176, 98, 70), "slate": (88, 94, 112)}
for variant in ROOFS:
    for letter in "abcdefghijklmnopqrstu":
        add_rotations(f"sub-{letter}-{variant}", f"recolor|{variant}|" + SUB(f"building-type-{letter}"), rots=(0, 180))
add("sub-tree-large", SUB("tree-large"))
add("sub-tree-small", SUB("tree-small"))
add("sub-planter", SUB("planter"))
# Farmland and country props (Nature Kit): crop tiles in two rotations so rows can run either way.
for crop in ("crops_wheatStageB", "crops_cornStageD", "crops_dirtDoubleRow", "crops_leafsStageB", "crops_wheatStageA"):
    for r in (0, 90):
        add(crop if r == 0 else f"{crop}-r{r}", NAT(crop), r)
for n in ("fence_simple", "stump_old", "log_stack", "flower_redA", "flower_yellowB", "flower_purpleC", "stone_largeA", "stone_tallA"):
    add(n, NAT(n))
add("windmill", IND("windmill"))
add("silo", IND("detail-tank-large"))
add("chimney", IND("chimney-large"))
for r in (0, 90, 180, 270):
    add(f"car-tractor-{r}", CAR("tractor"), r, 0.5)
# More distinct buildings: the low-detail commercial set, more factories, and street furniture.
for letter in "abcdefghijklmn":
    add_rotations(f"low-{letter}", COM(f"low-detail-building-{letter}"), rots=(0, 90))
for letter in "ab":
    add_rotations(f"low-wide-{letter}", COM(f"low-detail-building-wide-{letter}"), rots=(0, 90))
for letter in "klmnopqrst":
    add_rotations(f"ind-{letter}", IND(f"building-{letter}"))
# Heights: the same buildings rendered shorter and taller (a real change in floors, not a squash on screen), so a
# skyline has a rhythm. Two views each. Names end -z<percent of the original height>.
for letter in "abcde":
    for z in (70, 135, 175):
        add_rotations(f"sky-{letter}-z{z}", COM(f"building-skyscraper-{letter}"), (1, 1, z / 100), (0, 90))
    add_rotations(f"com-{letter}-z150", COM(f"building-{letter}"), (1, 1, 1.5), (0, 90))
for letter in "fghijk":
    add_rotations(f"com-{letter}-z140", COM(f"building-{letter}"), (1, 1, 1.4), (0, 90))
for letter in "lmn":
    add_rotations(f"com-{letter}-z130", COM(f"building-{letter}"), (1, 1, 1.3), (0, 90))
# Compound buildings (see build_compound): several real kit pieces assembled into one complex, so the silhouettes are
# not all boxes. "cx-" is a 3 x 3 cell lot; "cs-" is the same complex scaled down to 2 x 2.
import random as _random
COMPOUND_KINDS = {"court": 6, "podium": 8, "wing": 6, "solar": 6, "yard": 4, "towers": 4, "terrace": 4, "ring": 4, "wave": 4, "garden": 5}
for kind, count in COMPOUND_KINDS.items():
    for i in range(1, count + 1):
        add_rotations(f"cx-{kind}-{i}", f"compound:{kind}:{i}", rots=(0, 90))
        if i <= 3:
            add_rotations(f"cs-{kind}-{i}", f"compound:{kind}:{i}", scale=(0.67, 0.67, 0.67), rots=(0, 90))
add("road-square", ROAD("road-square"))
add("tile-low", ROAD("tile-low"))
for n in ("light-square-double", "traffic-light", "construction-cone", "dumpster", "electricity-pole", "road-sign-street"):
    add(n, ROAD(n))
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

if os.environ.get("ROT0"):  # a quick look: one view of each model
    jobs = [j for j in jobs if j[2] == 0]
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
    # Golden-hour light, like the reference: a strong warm sun low in the sky from the upper left, so shadows are long
    # and soft-edged, and only a little cool sky light, so the shadowed sides stay rich instead of washed out.
    look = os.environ.get("LIGHT", "golden")
    sun_data = bpy.data.lights.new("sun", "SUN")
    if look == "golden":
        sun_data.energy = 5.2
        sun_data.angle = math.radians(4.5)
        sun_data.color = (1.0, 0.84, 0.64)
        elevation, azimuth = 24, -38
    else:
        sun_data.energy = 3.4
        sun_data.angle = math.radians(6)
        sun_data.color = (1.0, 0.93, 0.80)
        elevation, azimuth = 30, -35
    sun = bpy.data.objects.new("sun", sun_data)
    sun.rotation_euler = (math.radians(elevation), math.radians(6), math.radians(azimuth))
    scene.collection.objects.link(sun)
    # cool sky fill, much weaker in the golden look
    world = bpy.data.worlds.new("world")
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    if look == "golden":
        bg.inputs[0].default_value = (0.62, 0.74, 0.98, 1.0)
        bg.inputs[1].default_value = 0.42
        scene.view_settings.view_transform = "AgX"
        scene.view_settings.look = "AgX - Medium High Contrast"
    else:
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

SKY = lambda n: f"com:building-skyscraper-{n}"
SLABS = ["com:building-j", "com:building-k", "com:building-e", "ind:building-s", "ind:building-p", "ind:building-r", "ind:building-a", "ind:building-t"]
FLATS = ["ind:building-p", "ind:building-q", "ind:building-r", "ind:building-s", "ind:building-t", "ind:building-a", "ind:building-k"]
MIDS = ["com:building-l", "com:building-m", "com:building-i", "com:building-f", "com:building-g", "com:building-n", "com:building-h"]
TOWER_MODELS = [SKY(c) for c in "abcde"] + ["com:building-m", "com:building-l"]
SLENDER = [f"com:low-detail-building-{c}" for c in "bfim"] + [f"com:low-detail-building-{c}" for c in "adgkl"]

def kit_path(spec):
    kit, name = spec.split(":", 1)
    base = {"com": COM, "ind": IND, "sub": SUB, "nat": NAT, "road": ROAD}[kit]
    return base(name)

def part(spec, pos=(0.0, 0.0, 0.0), rot=0, fit=None, scale=None):
    """Import one kit model, centre it on its own footprint, then turn, size and place it. `fit` is the footprint
    (width, depth) it should fill in the finished compound plus a height factor; returns its size as placed."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=kit_path(spec))
    new = [o for o in bpy.data.objects if o not in before]
    roots = [o for o in new if o.parent is None]
    bpy.context.view_layer.update()
    pts = [o.matrix_world @ mathutils.Vector(c) for o in new if o.type == "MESH" for c in o.bound_box]
    mnx, mxx = min(p.x for p in pts), max(p.x for p in pts)
    mny, mxy = min(p.y for p in pts), max(p.y for p in pts)
    mnz, mxz = min(p.z for p in pts), max(p.z for p in pts)
    nw, nd, nh = mxx - mnx, mxy - mny, mxz - mnz
    inner = bpy.data.objects.new("inner", None)
    bpy.context.scene.collection.objects.link(inner)
    for o in roots:
        o.parent = inner
    inner.location = (-(mnx + mxx) / 2, -(mny + mxy) / 2, -mnz)
    outer = bpy.data.objects.new("outer", None)
    bpy.context.scene.collection.objects.link(outer)
    inner.parent = outer
    turned = rot % 180 == 90
    if fit:
        w, d, hz = fit
        sx, sy, sz = ((d / nw, w / nd, hz) if turned else (w / nw, d / nd, hz))
    else:
        sx, sy, sz = scale if scale else (1, 1, 1)
    outer.rotation_euler[2] = math.radians(rot)
    outer.scale = (sx, sy, sz)
    outer.location = pos
    return ((nd * sy, nw * sx) if turned else (nw * sx, nd * sy)) + (nh * sz,)

def build_compound(kind, n):
    """Assemble one compound from real kit pieces. Deterministic per (kind, n), so a sprite can be re-rendered."""
    r = _random.Random(f"{kind}-{n}")
    ch = r.choice
    if kind == "court":  # four wings around a courtyard with a tree
        w = r.uniform(2.3, 2.7)
        for pos, rot, fit in (((0, 1.05, 0), 0, (w, 0.95)), ((0, -1.05, 0), 180, (w, 0.95)), ((-1.05, 0, 0), 90, (0.95, 1.15)), ((1.05, 0, 0), 270, (0.95, 1.15))):
            if rot in (90, 270) and r.random() < 0.25:
                continue  # a gap in the ring
            part(ch(SLABS), pos, rot, fit=(fit[0], fit[1], r.uniform(0.8, 1.4)))
        part("road:road-square", (0, 0, 0.01), 0, scale=(1.5, 1.5, 1))
        for _ in range(r.choice((1, 2, 3))):
            part(ch(["sub:tree-large", "sub:tree-small"]), (r.uniform(-0.3, 0.3), r.uniform(-0.3, 0.3), 0), 0, scale=(2.2, 2.2, 2.2))
    elif kind == "podium":  # a wide low base with one or two towers standing on it
        pw, pd, ph = part(ch(FLATS + ["com:building-j", "com:building-k"]), (0, -0.1, 0), 0, fit=(r.uniform(2.4, 2.8), r.uniform(1.9, 2.3), r.uniform(0.9, 1.5)))
        t1 = ch(TOWER_MODELS + MIDS)
        s1 = r.uniform(0.8, 1.05)
        part(t1, (r.uniform(-0.6, -0.3), r.uniform(-0.3, 0.1), ph), r.choice((0, 90)), scale=(s1, s1, r.uniform(0.7, 1.1)))
        if r.random() < 0.6:
            s2 = r.uniform(0.6, 0.85)
            part(ch(MIDS), (r.uniform(0.4, 0.8), r.uniform(-0.5, 0.2), ph), r.choice((0, 90)), scale=(s2, s2, r.uniform(0.7, 1.1)))
        elif r.random() < 0.7:
            part("ind:solar-panel-landscape-group", (0.7, -0.2, ph), 0, scale=(0.9, 0.9, 0.9))
    elif kind == "wing":  # an L of two slabs with a taller block at the corner
        part(ch(SLABS), (0, 1.0, 0), 0, fit=(r.uniform(2.4, 2.8), 1.0, r.uniform(0.9, 1.5)))
        part(ch(SLABS), (1.0, -0.45, 0), 90, fit=(1.0, r.uniform(1.5, 1.8), r.uniform(0.8, 1.3)))
        part(ch(MIDS + SLENDER), (-0.95, -0.55, 0), r.choice((0, 90)), scale=(0.85, 0.85, r.uniform(0.8, 1.2)))
        if r.random() < 0.6:
            part(ch(["sub:tree-large", "sub:tree-small"]), (-0.2, -0.7, 0), 0, scale=(2.2, 2.2, 2.2))
    elif kind == "solar":  # a wide flat hall with solar arrays on the roof
        bw, bd, bh = part(ch(FLATS), (0, 0, 0), ch((0, 90)), fit=(r.uniform(2.6, 2.9), r.uniform(1.8, 2.2), r.uniform(1.0, 1.5)))
        for (px, py) in ((-0.65, -0.45), (0.65, -0.45), (-0.65, 0.45), (0.65, 0.45))[: r.choice((2, 3, 4))]:
            part("ind:solar-panel-landscape-group", (px, py, bh), 0, scale=(0.75, 0.75, 0.75))
        if r.random() < 0.5:
            part(ch(["ind:detail-tank", "ind:chimney-large"]), (r.uniform(-1.0, 1.0), r.uniform(-0.9, 0.9), 0), 0, scale=(0.8, 0.8, 0.8))
    elif kind == "yard":  # a factory with its tanks, containers and stacks
        part(ch(["ind:building-l", "ind:building-m", "ind:building-n", "ind:building-c", "ind:building-e"]), (-0.3, 0.3, 0), ch((0, 90, 180)), scale=(1.1, 1.1, 1.0))
        part("ind:chimney-large", (-1.1, -0.9, 0), 0, scale=(0.8, 0.8, 0.9))
        part("ind:detail-tank-large", (1.0, 0.9, 0), 0, scale=(0.7, 0.7, 0.7))
        for i in range(r.choice((2, 3, 4))):
            part(ch(["ind:shipping-container-a", "ind:shipping-container-b", "ind:shipping-container-c"]), (0.95 + 0.0, -0.8 + 0.42 * i, 0), 90, scale=(1.4, 1.4, 1.4))
        if r.random() < 0.6:
            part("ind:water-tower", (0.3, -1.0, 0), 0, scale=(0.8, 0.8, 0.8))
    elif kind == "towers":  # a plaza with a cluster of towers of different heights
        part("road:road-square", (0, 0, 0.01), 0, scale=(2.9, 2.9, 1))
        for pos in ((-0.75, 0.55), (0.7, 0.25), (-0.05, -0.85)):
            s = r.uniform(0.75, 1.0)
            part(ch(TOWER_MODELS + SLENDER), (pos[0], pos[1], 0), r.choice((0, 90)), scale=(s, s, r.uniform(0.6, 1.4)))
    elif kind == "ring":  # an octagonal ring of slabs around a green court, one taller block, like a campus
        R = r.uniform(1.0, 1.15)
        tall = r.randrange(8)
        for k in range(8):
            ang = k * 45.0
            x, y = R * math.cos(math.radians(ang)), R * math.sin(math.radians(ang))
            h = r.uniform(1.4, 2.0) if k == tall else r.uniform(0.7, 1.15)
            part(ch(SLABS), (x, y, 0), ang + 90, scale=(0.85, 0.62, h))
        part("road:road-square", (0, 0, 0.01), 0, scale=(1.4, 1.4, 1))
        for _ in range(r.choice((3, 4, 5))):
            part(ch(["sub:tree-large", "sub:tree-small"]), (r.uniform(-0.45, 0.45), r.uniform(-0.45, 0.45), 0), 0, scale=(2.0, 2.0, 2.0))
    elif kind == "wave":  # a sweeping curve of narrow glass towers, rising in the middle
        n = 7
        for i in range(n):
            t = i / (n - 1)
            x = (t - 0.5) * 3.0
            y = 0.7 * math.sin(t * math.pi) - 0.35
            slope = math.degrees(math.atan2(0.7 * math.pi * math.cos(t * math.pi) / 3.0, 1.0))
            h = 0.7 + 1.5 * math.sin(t * math.pi)
            part(SKY(ch("abcde")), (x, y, 0), slope + r.choice((0, 0)), scale=(0.46, 0.8, h * 0.45))
        part("road:road-square", (0, -0.1, 0.01), 0, scale=(3.0, 1.4, 1))
    elif kind == "garden":  # a wide podium with a green roof: lawns and trees up on the roof
        pw, pd, ph = part(ch(FLATS + ["com:building-j", "com:building-k"]), (0, 0, 0), ch((0, 90)), fit=(r.uniform(2.5, 2.9), r.uniform(2.0, 2.4), r.uniform(0.8, 1.2)))
        grass = bpy.data.materials.new("roof-green")
        grass.use_nodes = True
        grass.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.20, 0.36, 0.14, 1.0)
        grass.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.9
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, ph + 0.02))
        lawn = bpy.context.object
        lawn.scale = (pw * 0.86, pd * 0.86, 0.06)
        lawn.data.materials.append(grass)
        for _ in range(r.choice((4, 5, 6, 7))):
            part(ch(["sub:tree-large", "sub:tree-small", "nat:tree_oak"]), (r.uniform(-pw * 0.38, pw * 0.38), r.uniform(-pd * 0.38, pd * 0.38), ph + 0.05), 0, scale=(1.3, 1.3, 1.3))
        if r.random() < 0.6:
            part(ch(MIDS), (r.choice((-1, 1)) * pw * 0.28, 0, ph), ch((0, 90)), scale=(0.7, 0.7, r.uniform(0.9, 1.5)))
    elif kind == "terrace":  # three slabs stepping up
        zs = sorted([r.uniform(0.6, 1.0), r.uniform(1.0, 1.5), r.uniform(1.5, 2.1)])
        for i, y in enumerate((0.95, 0.0, -0.95)):
            part(ch(SLABS + ["com:building-n"]), (0, y, 0), 0, fit=(r.uniform(2.0, 2.5), 0.9, zs[i]))
        part(ch(["sub:tree-large", "sub:tree-small"]), (1.2, 0.95, 0), 0, scale=(2.2, 2.2, 2.2))

def recolor_roof(variant):
    """Swap the roof-green swatch of the shared colour map for another colour (brick, slate). The importer packs the
    map and the renderer reads the packed copy, so the recoloured pixels go into a new image the materials then use."""
    import numpy as np
    target = ROOFS[variant]
    for mat in bpy.data.materials:
        if not mat.use_nodes:
            continue
        for node in mat.node_tree.nodes:
            if node.type != "TEX_IMAGE" or node.image is None or "colormap" not in node.image.name:
                continue
            im = node.image
            w, h = im.size
            px = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4)
            rgb = px[:, :, :3] * 255.0
            # the roof is a ramp of greens (shaded swatches): every green pixel takes the new colour, keeping its brightness
            near = (rgb[:, :, 1] > rgb[:, :, 0] + 25.0) & (rgb[:, :, 1] > rgb[:, :, 2] + 10.0)
            lum = 0.3 * rgb[:, :, 0] + 0.59 * rgb[:, :, 1] + 0.11 * rgb[:, :, 2]
            ref = 0.3 * 97.0 + 0.59 * 203.0 + 0.11 * 139.0
            for c in range(3):
                px[:, :, c][near] = np.clip(target[c] / 255.0 * (lum[near] / ref), 0.0, 1.0)
            fresh = bpy.data.images.new(im.name + "_" + variant, width=w, height=h, alpha=True)
            fresh.colorspace_settings.name = im.colorspace_settings.name
            fresh.pixels = px.reshape(-1).tolist()
            fresh.update()
            node.image = fresh
            node.interpolation = "Closest"

def render_one(name, path, rot, scale, manifest):
    scene = reset_scene()
    before = set(bpy.data.objects)
    recolor = None
    if path.startswith("recolor|"):
        _, recolor, path = path.split("|", 2)
    if path.startswith("sign:"):
        _, kind, colour = path.split(":")
        build_sign(kind, colour)
    elif path.startswith("compound:"):
        _, kind, n = path.split(":")
        build_compound(kind, int(n))
    else:
        bpy.ops.import_scene.gltf(filepath=path)
    if recolor:
        recolor_roof(recolor)
    new = [o for o in bpy.data.objects if o not in before]
    roots = [o for o in new if o.parent is None]
    # Some kits (the Car Kit) ship wheels as separate root objects, so rotate and scale them together around one pivot.
    pivot = bpy.data.objects.new("pivot", None)
    scene.collection.objects.link(pivot)
    for o in roots:
        o.parent = pivot
    pivot.rotation_euler[2] = math.radians(rot)
    pivot.scale = scale
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
    if name in manifest and any(os.path.exists(os.path.join(OUT, name + ext)) for ext in (".png", ".webp")):
        continue  # resume (the PNG is deleted once it has been converted to WebP)
    if not path.startswith(("sign:", "compound:")) and not os.path.exists(path.split("|")[-1]):
        print("MISSING", path)
        continue
    render_one(name, path, rot, scale, manifest)
    json.dump(manifest, open(manifest_path, "w"), indent=1, sort_keys=True)
