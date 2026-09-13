"""Reference-authored rigid creature candidates for M-018 and M-014.

Run with Blender:
  blender --background --python rigid_creatures.py -- M-018 [M-014]

All candidates remain under ignored ``local/hopper-rigid-creatures``. This module
does not write production GLBs or the shared model manifest.
"""

from __future__ import annotations

import json
import math
import shutil
import subprocess
import sys
from pathlib import Path

import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from common import Context, ROOT, TEXTURES, rotation, v  # noqa: E402


WORK = ROOT / "local/hopper-rigid-creatures"
FPS = 30

REQUESTS = {
    "M-018": {
        "request": "M-018",
        "name": "Phase Skate",
        "category": "enemy",
        "rig": "rigid",
        "size": [8.7, 0.9, 6.1],
        "tris": "3k / 1k",
        "standIn": "enemy.phaseSkate",
        "final": "models/enemies/phaseSkate.glb",
        "region": "blue",
        "clips": [
            "Glide",
            "Fade_Out",
            "Silhouette_Hold",
            "Fade_In",
            "Dash",
            "Hit",
            "Dissolve",
        ],
        "sockets": ["Core", "Hitbox.Body"],
        "reference": "design/references/enemies/phaseSkate-turnaround.png",
    },
    "M-014": {
        "request": "M-014",
        "name": "Turbine Wasp",
        "category": "enemy",
        "rig": "rigid",
        "size": [7.7, 3.4, 6.1],
        "tris": "6k / 2k",
        "standIn": "enemy.turbineWasp",
        "final": "models/enemies/turbineWasp.glb",
        "region": "launchworks",
        "clips": ["Hover", "Intake_Tell", "Dash", "Guard_Break", "Hit", "Dissolve"],
        "sockets": ["Core", "Fan.L", "Fan.R", "Fan.Tail", "Hitbox.Body", "Landing"],
        "reference": "design/references/enemies/turbineWasp-turnaround.png",
    },
}


def polygon_prism(c, name, points, thickness, mat, parent, center_y=0.0):
    """Create a low-poly plate from local game-XZ outline points."""
    count = len(points)
    low = center_y - thickness / 2
    high = center_y + thickness / 2
    verts = [(x, low, z) for x, z in points] + [(x, high, z) for x, z in points]
    faces = []
    # Bottom winding is reversed, top winding is forward.
    faces.append(tuple(reversed(range(count))))
    faces.append(tuple(range(count, count * 2)))
    for i in range(count):
        j = (i + 1) % count
        faces.append((i, j, count + j, count + i))
    obj = c.mesh(name, verts, faces, mat, parent)
    for poly in obj.data.polygons:
        poly.use_smooth = False
    return obj


def tapered_segment(c, name, a, b, r0, r1, mat, parent, vertices=8):
    """Create a tapered round segment between local game-space points."""
    aa, bb = v(a), v(b)
    midpoint = (aa + bb) / 2
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=r0,
        radius2=r1,
        depth=(bb - aa).length,
        location=midpoint,
    )
    obj = bpy.context.object
    obj.rotation_euler = (bb - aa).to_track_quat("Z", "Y").to_euler()
    return c.finish(obj, name, mat, parent)


def edge_beam(c, name, a, b, width, mat, parent):
    return c.beam(name, a, b, width, mat, parent)


def mirrored(points):
    return [(-x, z) for x, z in points]


def convex_plate(c, name, points, thickness, mat, parent, center_y=0.0, crown=0.10):
    """Create a shallow convex shell whose top and bottom are triangulated fans."""
    count = len(points)
    cx = sum(point[0] for point in points) / count
    cz = sum(point[1] for point in points) / count
    low = center_y - thickness / 2
    high = center_y + thickness / 2
    verts = [(x, low, z) for x, z in points] + [(x, high, z) for x, z in points]
    bottom_center = len(verts)
    verts.append((cx, low - crown * 0.35, cz))
    top_center = len(verts)
    verts.append((cx, high + crown, cz))
    faces = []
    for index in range(count):
        nxt = (index + 1) % count
        faces.append((bottom_center, nxt, index))
        faces.append((top_center, count + index, count + nxt))
        faces.append((index, nxt, count + nxt, count + index))
    return c.mesh(name, verts, faces, mat, parent)


def build_phase_skate(req, c):
    """Thin blue-black diamond ray with an eye core and three continuous tails."""
    hide = c.material(
        "Skate.Hide",
        (0.68, 0.74, 0.92),
        TEXTURES / "creatures/shadow-hide.png",
    )
    blue = c.material(
        "Skate.BlueArmour",
        (0.72, 0.82, 1.0),
        TEXTURES / "creatures/shadow-hide.png",
    )
    armour = c.material(
        "Skate.VioletArmour",
        (1.0, 0.84, 1.0),
        TEXTURES / "creatures/shadow-hide.png",
    )
    glow = c.material("Skate.Emissive", (0.01, 0.08, 0.55), emission=0.18)
    eye_glow = c.material("Skate.EyeGlow", (0.04, 0.46, 1.0), emission=1.25)
    eye = c.material(
        "Skate.EyeIvory",
        (0.72, 0.94, 1.0),
        TEXTURES / "trim/blue.png",
        1.2,
    )
    ink = c.material("Skate.Ink", (0.008, 0.012, 0.025))

    fit = c.empty("Scale.ToContract", parent=c.root)
    motion = c.empty("Motion", parent=fit)
    body = c.empty("Body", parent=motion)

    # The central carapace is a shallow crowned wedge with the canonical long nose.
    convex_plate(
        c,
        "Body.Shell",
        [(-0.92, 1.72), (0.0, 3.02), (0.92, 1.72), (0.70, -0.52),
         (0.0, -1.12), (-0.70, -0.52)],
        0.36,
        hide,
        body,
        0.0,
        0.13,
    )
    convex_plate(
        c,
        "Body.DorsalKeel",
        [(-0.13, -0.80), (0.0, 2.78), (0.13, -0.80)],
        0.15,
        armour,
        body,
        0.25,
        0.10,
    )
    convex_plate(
        c,
        "Body.Brow.L",
        [(-0.78, 1.54), (-0.08, 2.54), (-0.13, 1.90), (-0.62, 1.19)],
        0.10,
        blue,
        body,
        0.25,
        0.045,
    )
    convex_plate(
        c,
        "Body.Brow.R",
        mirrored([(-0.78, 1.54), (-0.08, 2.54), (-0.13, 1.90), (-0.62, 1.19)]),
        0.10,
        blue,
        body,
        0.25,
        0.045,
    )

    # The full eye sits on the upper-forward shell: pale lens, cyan iris, dark slit.
    lens = c.sphere("Eye.Lens", (0, 0.37, 1.73), (1.28, 0.18, 0.72), eye, 24, 12, body)
    lens.rotation_euler.x = math.radians(-5)
    iris = c.torus("Eye.Iris", (0, 0.455, 1.73), 0.42, 0.055, eye_glow, "y", body)
    iris.scale.x = 1.34
    iris.scale.y = 0.72
    pupil = c.sphere("Eye.Pupil", (0, 0.485, 1.73), (0.14, 0.10, 0.48), ink, 14, 8, body)
    for x in (-0.57, 0.57):
        tapered_segment(c, f"Eye.Clamp.{x:+.0f}", (x, 0.43, 1.65), (x * 0.72, 0.43, 1.30), 0.025, 0.018, eye_glow, body, 6)

    wing_outline = [
        (0.02, 1.46), (-0.43, 1.06), (-1.18, 0.46), (-2.30, -0.08),
        (-3.85, -0.62), (-3.26, -1.02), (-2.66, -1.31), (-2.87, -1.68),
        (-2.18, -1.46), (-1.62, -1.86), (-1.16, -1.42), (-0.56, -1.91),
        (-0.02, -1.23), (0.23, -0.08),
    ]
    for side, sign in (("L", 1), ("R", -1)):
        pivot = c.empty(f"Wing.{side}", (-0.50 * sign, 0, 0.62), body)
        outline = wing_outline if side == "L" else mirrored(wing_outline)
        convex_plate(c, f"Wing.{side}.Shell", outline, 0.24, hide, pivot, 0.0, 0.12)

        # Small overlapping plates follow the leading-to-trailing flow of the ray.
        plate_sets = [
            [(-0.06, 1.02), (-0.68, 0.72), (-1.44, 0.20), (-0.58, 0.38)],
            [(-0.54, 0.26), (-1.52, 0.04), (-2.38, -0.42), (-1.33, -0.52)],
            [(-1.32, -0.55), (-2.42, -0.48), (-3.15, -0.76), (-2.20, -1.04)],
            [(-0.34, -0.44), (-1.30, -0.68), (-1.52, -1.25), (-0.52, -0.98)],
            [(-0.15, 0.57), (-0.72, 0.20), (-0.38, -0.42), (0.05, -0.06)],
        ]
        for index, plate in enumerate(plate_sets):
            cx = sum(point[0] for point in plate) / len(plate)
            cz = sum(point[1] for point in plate) / len(plate)
            plate = [(cx + (x - cx) * 0.80, cz + (z - cz) * 0.80) for x, z in plate]
            convex_plate(
                c,
                f"Wing.{side}.Armour.{index}",
                plate if side == "L" else mirrored(plate),
                0.045,
                blue if index in (0, 3) else armour,
                pivot,
                0.185 + index * 0.004,
                0.016,
            )
        crack_paths = [
            [(-0.18, 0.83), (-0.78, 0.46), (-1.46, 0.10)],
            [(-0.48, 0.06), (-1.25, -0.28), (-2.15, -0.60)],
            [(-0.42, -0.58), (-1.12, -0.84), (-1.82, -1.10)],
        ]
        for crack_index, path in enumerate(crack_paths):
            if side == "R":
                path = [(-x, z) for x, z in path]
            for segment_index, (a, b) in enumerate(zip(path, path[1:])):
                tapered_segment(
                    c,
                    f"Wing.{side}.Crack.{crack_index}.{segment_index}",
                    (a[0], 0.29, a[1]),
                    (b[0], 0.29, b[1]),
                    0.018,
                    0.014,
                    glow,
                    pivot,
                    6,
                )

    # Three long tails use many short, touching tapers so their outline reads fluid.
    tail_paths = {
        "L": [(-0.64, -0.68), (-0.83, -0.91), (-1.08, -1.15), (-1.31, -1.40),
              (-1.41, -1.68), (-1.36, -1.96), (-1.17, -2.24), (-0.86, -2.51),
              (-0.54, -2.77), (-0.31, -3.02)],
        "C": [(0.0, -0.78), (-0.05, -1.03), (-0.05, -1.31), (0.02, -1.59),
              (0.14, -1.86), (0.21, -2.13), (0.20, -2.40), (0.12, -2.64),
              (0.03, -2.85), (0.0, -3.04)],
        "R": [(0.64, -0.68), (0.86, -0.91), (1.13, -1.15), (1.36, -1.40),
              (1.47, -1.66), (1.45, -1.93), (1.30, -2.20), (1.05, -2.46),
              (0.78, -2.69), (0.58, -2.89)],
    }
    tail_pivots = []
    for tail_name, path in tail_paths.items():
        start_x, start_z = path[0]
        pivot = c.empty(f"Tail.{tail_name}", (start_x, 0.36, start_z), body)
        tail_pivots.append(pivot)
        local = [(x - start_x, 0.0, z - start_z) for x, z in path]
        for index, (a, b) in enumerate(zip(local, local[1:])):
            tapered_segment(
                c,
                f"Tail.{tail_name}.Segment.{index}",
                a,
                b,
                0.105 - index * 0.0075,
                0.098 - index * 0.0075,
                hide,
                pivot,
                8,
            )
            # A hairline dorsal crack stays continuous across each hidden pivot.
            aa = (a[0], a[1] + 0.072 - index * 0.004, a[2])
            bb = (b[0], b[1] + 0.068 - index * 0.004, b[2])
            tapered_segment(c, f"Tail.{tail_name}.Glow.{index}", aa, bb, 0.014, 0.010, glow, pivot, 6)

    c.socket("Core", (0, 0.49, 1.73), body)
    c.socket("Hitbox.Body", (0, 0, 0.48), motion)

    # Functional motion: all clips contain a visible nonzero transform. Dash is the
    # only translational root-motion clip, as required by the request.
    c.animate(motion, "Glide", [
        {"t": 0.0, "position": [0, 0, 0]},
        {"t": 0.55, "position": [0, 0.09, 0]},
        {"t": 1.10, "position": [0, 0, 0]},
    ])
    c.animate(bpy.data.objects["Wing.L"], "Glide", [
        {"t": 0.0, "rotation": [0, 0, -0.025]},
        {"t": 0.55, "rotation": [0, 0, 0.055]},
        {"t": 1.10, "rotation": [0, 0, -0.025]},
    ])
    c.animate(bpy.data.objects["Wing.R"], "Glide", [
        {"t": 0.0, "rotation": [0, 0, 0.025]},
        {"t": 0.55, "rotation": [0, 0, -0.055]},
        {"t": 1.10, "rotation": [0, 0, 0.025]},
    ])
    c.animate(motion, "Fade_Out", [
        {"t": 0.0, "scale": [1, 1, 1]},
        {"t": 0.34, "scale": [0.96, 0.035, 0.96]},
    ])
    c.animate(motion, "Silhouette_Hold", [
        {"t": 0.0, "scale": [0.94, 0.045, 0.94]},
        {"t": 0.35, "scale": [1.02, 0.055, 1.02]},
        {"t": 0.70, "scale": [0.94, 0.045, 0.94]},
    ])
    c.animate(motion, "Fade_In", [
        {"t": 0.0, "scale": [0.96, 0.035, 0.96]},
        {"t": 0.30, "scale": [1, 1, 1]},
    ])
    c.animate(c.root, "Dash", [
        {"t": 0.0, "position": [0, 0, 0]},
        {"t": 0.08, "position": [0, 0.02, 0.25]},
        {"t": 0.25, "position": [0, 0, 3.6]},
    ])
    c.animate(motion, "Hit", [
        {"t": 0.0, "rotation": [0, 0, 0]},
        {"t": 0.10, "rotation": [0, 0, 0.18]},
        {"t": 0.28, "rotation": [0, 0, -0.08]},
        {"t": 0.48, "rotation": [0, 0, 0]},
    ])
    c.animate(motion, "Dissolve", [
        {"t": 0.0, "scale": [1, 1, 1]},
        {"t": 0.42, "scale": [0.62, 0.08, 0.62]},
        {"t": 0.80, "scale": [0.015, 0.015, 0.015]},
    ])
    for index, pivot in enumerate(tail_pivots):
        c.animate(pivot, "Glide", [
            {"t": 0.0, "rotation": [0, (-0.025 + index * 0.025), 0]},
            {"t": 0.55, "rotation": [0, (0.035 - index * 0.025), 0]},
            {"t": 1.10, "rotation": [0, (-0.025 + index * 0.025), 0]},
        ])


def descendants(root):
    return list(root.children_recursive)


def mesh_bounds(root):
    bpy.context.view_layer.update()
    points = [
        obj.matrix_world @ Vector(corner)
        for obj in descendants(root)
        if obj.type == "MESH"
        for corner in obj.bound_box
    ]
    if not points:
        raise RuntimeError("candidate contains no mesh geometry")
    low = Vector(tuple(min(point[i] for point in points) for i in range(3)))
    high = Vector(tuple(max(point[i] for point in points) for i in range(3)))
    return low, high


def fit_to_contract(c, target):
    fit = bpy.data.objects["Scale.ToContract"]
    low, high = mesh_bounds(c.root)
    dim = high - low
    # Blender axes: X=game X, Y=-game Z, Z=game Y.
    fit.scale = (target[0] / dim.x, target[2] / dim.y, target[1] / dim.z)
    bpy.context.view_layer.update()
    low, high = mesh_bounds(c.root)
    got = [high.x - low.x, high.z - low.z, high.y - low.y]
    return got


def count_triangles(root):
    total = 0
    for obj in descendants(root):
        if obj.type == "MESH":
            obj.data.calc_loop_triangles()
            total += len(obj.data.loop_triangles)
    return total


def make_lod1(c):
    lod1 = bpy.data.objects.new("LOD1", None)
    bpy.context.collection.objects.link(lod1)
    lod1["lod"] = 1
    copies = {c.root: lod1}
    for obj in descendants(c.root):
        copy = obj.copy()
        copy.name = "LOD1." + obj.name
        if obj.type == "MESH":
            copy.data = obj.data.copy()
        bpy.context.collection.objects.link(copy)
        copies[obj] = copy
    for obj, copy in list(copies.items())[1:]:
        copy.parent = copies.get(obj.parent, lod1)
        if copy.type != "MESH":
            continue
        copy.data.calc_loop_triangles()
        if len(copy.data.loop_triangles) <= 12:
            continue
        bpy.context.view_layer.objects.active = copy
        copy.select_set(True)
        modifier = copy.modifiers.new("LOD1 silhouette reduction", "DECIMATE")
        modifier.ratio = 0.34
        try:
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        except RuntimeError:
            copy.modifiers.remove(modifier)
        copy.select_set(False)
    return lod1


def setup_studio(c, lod1, destination, view="front"):
    for obj in [lod1, *descendants(lod1)]:
        obj.hide_render = True
    low, high = mesh_bounds(c.root)
    center = (low + high) / 2
    span = max(high - low)
    scene = bpy.context.scene
    world = bpy.data.worlds.new("Creature Studio")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.26, 0.31, 0.40, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.62
    scene.world = world
    for offset, energy, size, color in [
        ((1.1, -1.4, 1.5), 5.0, 1.2, (0.70, 0.82, 1.0)),
        ((-1.2, 0.35, 0.65), 2.7, 1.5, (0.30, 0.52, 1.0)),
        ((0.0, 1.2, -0.1), 1.6, 0.9, (0.50, 0.36, 0.78)),
    ]:
        bpy.ops.object.light_add(type="AREA", location=center + Vector(offset) * span)
        light = bpy.context.object
        light.data.energy = energy * span * span * 3
        light.data.shape = "DISK"
        light.data.size = size * span
        light.data.color = color
        light.rotation_euler = (center - light.location).to_track_quat("-Z", "Y").to_euler()
    # Paired front/rear three-quarter views expose the authored rest silhouette.
    camera_offsets = {
        "front": (1.0, -1.10, 1.35),
        "rear": (-1.0, 1.10, 1.20),
        "top": (0.18, -0.18, 2.25),
    }
    camera_offset = camera_offsets[view]
    bpy.ops.object.camera_add(location=center + Vector(camera_offset) * span)
    camera = bpy.context.object
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = span * 1.32
    camera.data.clip_end = span * 20
    scene.camera = camera
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1100
    scene.render.resolution_y = 820
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.filepath = str(destination)
    scene.view_settings.look = "AgX - Medium High Contrast"
    bpy.ops.render.render(write_still=True)


def export_candidate(req, c):
    c.root["landings"] = "[]"
    c.root["authoring"] = "reference-authored Blender rigid creature"
    c.root["reference"] = req["reference"]
    c.root["axisContract"] = "+Y up, +Z forward"
    c.rest_pose()
    bpy.context.scene.frame_set(1)
    bounds = fit_to_contract(c, req["size"])
    lod1 = make_lod1(c)
    triangles = [count_triangles(c.root), count_triangles(lod1)]
    folder = WORK / req["request"]
    folder.mkdir(parents=True, exist_ok=True)
    key = "phaseSkate" if req["request"] == "M-018" else "turbineWasp"
    uncompressed = folder / f"{key}-uncompressed.glb"
    raw = folder / f"{key}.glb"
    bpy.ops.object.select_all(action="DESELECT")
    for obj in [c.root, *descendants(c.root), lod1, *descendants(lod1)]:
        obj.select_set(True)
    scene = bpy.context.scene
    scene.render.fps = FPS
    scene.frame_set(1)
    bpy.ops.export_scene.gltf(
        filepath=str(uncompressed),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="NLA_TRACKS",
        export_nla_strips_merged_animation_name="Animation",
        export_extras=True,
        export_apply=True,
        export_materials="EXPORT",
        export_yup=True,
    )
    node = shutil.which("node")
    if not node:
        raise RuntimeError("Node.js is required for the offline gltfpack wrapper")
    subprocess.run(
        [node, str(HERE / "compress.mjs"), str(uncompressed), str(raw), "--force"],
        check=True,
    )
    c.rest_pose()
    scene.frame_set(1)
    bpy.context.view_layer.update()
    preview = folder / "preview.png"
    rear_preview = folder / "preview-rear.png"
    top_preview = folder / "preview-top.png"
    setup_studio(c, lod1, preview, "front")
    setup_studio(c, lod1, rear_preview, "rear")
    setup_studio(c, lod1, top_preview, "top")
    blend = folder / ("phaseSkate.blend" if req["request"] == "M-018" else "turbineWasp.blend")
    bpy.ops.wm.save_as_mainfile(filepath=str(blend), compress=True)
    record = {
        "request": req["request"],
        "name": req["name"],
        "file": str(raw.relative_to(ROOT)),
        "preview": str(preview.relative_to(ROOT)),
        "qaRenders": [
            str(preview.relative_to(ROOT)),
            str(rear_preview.relative_to(ROOT)),
            str(top_preview.relative_to(ROOT)),
        ],
        "category": "enemy",
        "region": req["region"],
        "source": "hopper/3d/models/source/rigid_creatures.py",
        "bounds": [round(value, 6) for value in bounds],
        "targetBounds": req["size"],
        "triangles": triangles,
        "clips": req["clips"],
        "sockets": req["sockets"],
        "landings": [],
        "status": "candidate-awaiting-root-review",
        "sourceReference": req["reference"],
    }
    (folder / "record.json").write_text(json.dumps(record, indent=2) + "\n")
    (folder / "manifest.json").write_text(json.dumps({"version": 1, "models": [record]}, indent=2) + "\n")
    print("RIGID_CREATURE_DONE", req["request"], bounds, triangles, raw, flush=True)


def main(request_id):
    req = REQUESTS[request_id]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    c = Context(req)
    if request_id == "M-018":
        build_phase_skate(req, c)
    else:
        raise RuntimeError("M-014 is authored after the required M-018 visual checkpoint")
    export_candidate(req, c)


if __name__ == "__main__":
    ids = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else ["M-018"]
    for request_id in ids:
        main(request_id)
