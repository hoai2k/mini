"""Reference-authored M-014 Turbine Wasp candidate.

The silhouette checkpoint intentionally runs before animation/LOD/export work:
  blender --background --python turbine_wasp.py -- silhouette

All artifacts stay under ignored ``local/hopper-rigid-creatures/M-014``.
"""

from __future__ import annotations

import math
import json
import shutil
import subprocess
import sys
from pathlib import Path

import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from common import Context, ROOT, TEXTURES, v  # noqa: E402


WORK = ROOT / "local/hopper-rigid-creatures/M-014"
REQ = {
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
}


def tapered_segment(c, name, a, b, r0, r1, mat, parent, vertices=10):
    aa, bb = v(a), v(b)
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=r0,
        radius2=r1,
        depth=(bb - aa).length,
        location=(aa + bb) / 2,
    )
    obj = bpy.context.object
    obj.rotation_euler = (bb - aa).to_track_quat("Z", "Y").to_euler()
    return c.finish(obj, name, mat, parent)


def section_hull(c, name, sections, sides, mat, parent):
    """Build a faceted organic-mechanical hull from game-space XY rings along Z."""
    verts = []
    for z, rx, ry in sections:
        for index in range(sides):
            angle = 2 * math.pi * index / sides
            verts.append((math.cos(angle) * rx, math.sin(angle) * ry, z))
    faces = []
    for ring in range(len(sections) - 1):
        for index in range(sides):
            nxt = (index + 1) % sides
            a = ring * sides + index
            b = ring * sides + nxt
            d = (ring + 1) * sides + index
            e = (ring + 1) * sides + nxt
            faces.append((a, b, e, d))
    faces.append(tuple(reversed(range(sides))))
    last = (len(sections) - 1) * sides
    faces.append(tuple(last + index for index in range(sides)))
    obj = c.mesh(name, verts, faces, mat, parent)
    # One continuous authored wrap prevents the painted hide from repeating on
    # every small face like an architectural tile.
    coords = []
    for ring in range(len(sections)):
        for index in range(sides):
            coords.append((index / sides, ring / max(1, len(sections) - 1)))
    uv = obj.data.uv_layers.active
    if uv:
        for loop in obj.data.loops:
            uv.data[loop.index].uv = coords[loop.vertex_index]
    return obj


def annular_duct(c, name, outer, inner, depth, mat, parent, segments=20):
    """A closed fan housing with a real open bore, not stacked primitive rings."""
    verts = []
    for z in (-depth / 2, depth / 2):
        for radius in (outer, inner):
            for index in range(segments):
                angle = 2 * math.pi * index / segments
                verts.append((math.cos(angle) * radius, math.sin(angle) * radius, z))
    faces = []
    front_outer = 0
    front_inner = segments
    rear_outer = segments * 2
    rear_inner = segments * 3
    for index in range(segments):
        nxt = (index + 1) % segments
        faces.extend([
            (front_outer + index, front_outer + nxt, rear_outer + nxt, rear_outer + index),
            (front_inner + nxt, front_inner + index, rear_inner + index, rear_inner + nxt),
            (front_outer + index, front_inner + index, front_inner + nxt, front_outer + nxt),
            (rear_outer + nxt, rear_inner + nxt, rear_inner + index, rear_outer + index),
        ])
    return c.mesh(name, verts, faces, mat, parent)


def fan_blade(c, name, angle, inner, outer, mat, parent):
    """Swept six-blade rotor leaf in the local XY plane, facing game +Z."""
    leading = angle - 0.16
    trailing = angle + 0.48
    points = [
        (math.cos(leading) * inner, math.sin(leading) * inner),
        (math.cos(angle - 0.20) * outer * 0.58, math.sin(angle - 0.20) * outer * 0.58),
        (math.cos(angle - 0.03) * outer, math.sin(angle - 0.03) * outer),
        (math.cos(angle + 0.24) * outer * 0.98, math.sin(angle + 0.24) * outer * 0.98),
        (math.cos(trailing) * outer * 0.57, math.sin(trailing) * outer * 0.57),
        (math.cos(angle + 0.22) * inner * 1.08, math.sin(angle + 0.22) * inner * 1.08),
    ]
    depth = 0.07
    verts = [(x, y, -depth / 2) for x, y in points] + [(x, y, depth / 2) for x, y in points]
    count = len(points)
    faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
    for index in range(count):
        nxt = (index + 1) % count
        faces.append((index, nxt, count + nxt, count + index))
    return c.mesh(name, verts, faces, mat, parent)


def triangular_fin(c, name, points, thickness, mat, parent):
    """Extrude a vertical game-YZ armour fin with local X thickness."""
    low, high = -thickness / 2, thickness / 2
    verts = [(low, y, z) for y, z in points] + [(high, y, z) for y, z in points]
    count = len(points)
    faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
    for index in range(count):
        nxt = (index + 1) % count
        faces.append((index, nxt, count + nxt, count + index))
    return c.mesh(name, verts, faces, mat, parent)


def almond_patch(c, name, center, width, height, depth, mat, parent):
    """Pointed convex eye panel facing game +Z."""
    cx, cy, cz = center
    outline = [
        (cx - width / 2, cy, cz),
        (cx - width * 0.18, cy + height * 0.44, cz),
        (cx + width * 0.15, cy + height / 2, cz),
        (cx + width / 2, cy, cz),
        (cx + width * 0.15, cy - height / 2, cz),
        (cx - width * 0.18, cy - height * 0.44, cz),
    ]
    verts = [(x, y, z - depth / 2) for x, y, z in outline] + [
        (x, y, z + depth / 2) for x, y, z in outline
    ]
    count = len(outline)
    faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
    for index in range(count):
        nxt = (index + 1) % count
        faces.append((index, nxt, count + nxt, count + index))
    return c.mesh(name, verts, faces, mat, parent)


def build_fan(c, name, position, radius, housing, violet, blade, dark, parent):
    pivot = c.empty(name, position, parent)
    pivot["socket"] = True
    c.sockets.append(name)
    annular_duct(c, f"{name}.Housing", radius, radius * 0.72, 0.48, housing, pivot, 20)
    c.torus(f"{name}.FrontLip", (0, 0, 0.255), radius * 0.85, radius * 0.068, violet, "z", pivot)
    c.torus(f"{name}.RearLip", (0, 0, -0.255), radius * 0.85, radius * 0.055, violet, "z", pivot)
    for rib_index in range(4):
        angle = rib_index * math.pi / 2 + math.pi / 4
        x, y = math.cos(angle) * radius * 0.91, math.sin(angle) * radius * 0.91
        tapered_segment(c, f"{name}.Rib.{rib_index}", (x, y, -0.27), (x, y, 0.27),
                        radius * 0.045, radius * 0.045, violet, pivot, 7)
    for index in range(6):
        fan_blade(c, f"{name}.Blade.{index}", index * math.tau / 6, radius * 0.18,
                  radius * 0.68, blade, pivot)
    c.sphere(f"{name}.Hub", (0, 0, 0.29), (radius * 0.30,) * 3, dark, 14, 8, pivot)
    return pivot


def build_silhouette(c):
    hide = c.material("Wasp.PaintedHide", (0.86, 0.78, 0.96), TEXTURES / "creatures/shadow-hide.png")
    charcoal = c.material("Wasp.CharcoalShell", (0.055, 0.045, 0.085))
    armour = c.material("Wasp.VioletShell", (0.17, 0.095, 0.29))
    violet = c.material("Wasp.VioletEdge", (0.31, 0.15, 0.52))
    ivory = c.material("Wasp.IvoryBlade", (0.88, 0.78, 0.51))
    eye_ivory = c.material("Wasp.IvoryEye", (0.97, 0.88, 0.63), emission=0.25)
    core = c.material("Wasp.IntakeCore", (0.72, 0.16, 0.08), emission=0.55)
    ink = c.material("Wasp.Ink", (0.012, 0.009, 0.022))

    fit = c.empty("Scale.ToContract", parent=c.root)
    motion = c.empty("Motion", parent=fit)
    body = c.empty("Body", parent=motion)

    # Layered fuselage and pointed hornet helmet establish the reference silhouette.
    section_hull(c, "Thorax.Shell", [(-1.28, 0.44, 0.38), (-0.82, 0.91, 0.72),
                 (0.12, 1.10, 0.82), (1.15, 0.78, 0.66), (1.48, 0.48, 0.43)],
                 12, hide, body)
    head = c.empty("Head", (0, 0.05, 1.08), body)
    section_hull(c, "Head.Helmet", [(0.20, 0.82, 0.72), (0.90, 0.72, 0.65),
                 (1.48, 0.45, 0.46), (2.18, 0.16, 0.15), (2.52, 0.025, 0.025)],
                 10, charcoal, head)
    # Paired almond-like eye lenses flank the beak and preserve the canonical face.
    for side, x in (("L", -1), ("R", 1)):
        almond_patch(c, f"Eye.{side}.Lens", (0.30 * x, 0.08, 1.91), 0.43, 0.47, 0.10,
                     eye_ivory, head)
        almond_patch(c, f"Eye.{side}.Pupil", (0.28 * x, 0.08, 1.975), 0.070, 0.23, 0.035,
                     ink, head)
    tapered_segment(c, "Head.Beak", (0, -0.12, 1.72), (0, -0.24, 2.58),
                    0.20, 0.012, charcoal, head, 10)
    triangular_fin(c, "Head.Crest", [(0.18, 0.20), (0.78, 0.52), (0.14, 1.02)], 0.22,
                   violet, head)
    for index, (z, height, sweep) in enumerate([(-0.66, 0.92, 0.30), (-0.10, 1.16, 0.46),
                                                (0.50, 0.90, 0.42)]):
        triangular_fin(c, f"Thorax.Dorsal.{index}", [(0.34, z - 0.36), (height, z + sweep),
                       (0.34, z + 0.44)], 0.20 - index * 0.025, violet, body)

    fan_l = build_fan(c, "Fan.L", (-2.62, 0.55, 0.45), 1.12, charcoal, violet, ivory, ink, body)
    fan_r = build_fan(c, "Fan.R", (2.62, 0.55, 0.45), 1.12, charcoal, violet, ivory, ink, body)
    fan_tail = build_fan(c, "Fan.Tail", (0, -0.48, -0.58), 0.91, charcoal, violet, ivory, ink, body)
    for side, x in (("L", -1), ("R", 1)):
        tapered_segment(c, f"Shoulder.{side}.Upper", (0.68 * x, 0.42, 0.48),
                        (1.55 * x, 0.62, 0.47), 0.20, 0.13, charcoal, body, 8)
        tapered_segment(c, f"Shoulder.{side}.Lower", (0.52 * x, 0.08, 0.22),
                        (1.55 * x, 0.30, 0.42), 0.14, 0.09, violet, body, 8)
    tapered_segment(c, "TailFan.Brace.L", (-0.40, -0.34, -0.42), (-0.64, -0.42, -0.58),
                    0.13, 0.09, armour, body, 8)
    tapered_segment(c, "TailFan.Brace.R", (0.40, -0.34, -0.42), (0.64, -0.42, -0.58),
                    0.13, 0.09, armour, body, 8)

    stinger = c.empty("Stinger", (0, 0.04, -1.10), body)
    tapered_segment(c, "Stinger.Armour", (0, 0, 0.0), (0, 0.02, -1.12), 0.42, 0.22,
                    hide, stinger, 10)
    for ring_index, (z, radius) in enumerate([(-0.18, 0.37), (-0.42, 0.34), (-0.66, 0.30),
                                              (-0.88, 0.26)]):
        c.torus(f"Stinger.Ring.{ring_index}", (0, 0.02, z), radius, 0.045, violet, "z", stinger)
    tapered_segment(c, "Stinger.Tip", (0, 0.02, -1.06), (0, -0.03, -1.92), 0.22, 0.015,
                    violet, stinger, 10)

    # Exactly two dangling, two-jointed claw legs.
    for side, x in (("L", -1), ("R", 1)):
        leg = c.empty(f"Leg.{side}", (0.54 * x, -0.45, 1.05), body)
        tapered_segment(c, f"Leg.{side}.Upper", (0, 0, 0), (0.28 * x, -0.52, 0.25),
                        0.13, 0.105, armour, leg, 8)
        tapered_segment(c, f"Leg.{side}.Lower", (0.28 * x, -0.52, 0.25),
                        (0.38 * x, -1.14, 0.56), 0.105, 0.065, hide, leg, 8)
        tapered_segment(c, f"Leg.{side}.Claw.A", (0.38 * x, -1.14, 0.56),
                        (0.31 * x, -1.42, 0.78), 0.065, 0.018, violet, leg, 7)
        tapered_segment(c, f"Leg.{side}.Claw.B", (0.38 * x, -1.14, 0.56),
                        (0.52 * x, -1.39, 0.72), 0.060, 0.018, violet, leg, 7)

    intake = c.empty("IntakeRing", (0, -0.29, 1.36), body)
    c.torus("Intake.Outer", (0, 0, 0.03), 0.43, 0.11, armour, "z", intake)
    c.torus("Intake.Inner", (0, 0, 0.08), 0.28, 0.055, core, "z", intake)
    c.sphere("Intake.Void", (0, 0, 0.09), (0.38, 0.38, 0.12), ink, 12, 8, intake)

    c.socket("Core", (0, 0, 0.12), intake)
    c.socket("Hitbox.Body", (0, 0, 0.05), motion)
    c.socket("Landing", (0, 0.86, 0.0), motion)

    # Required rigid clips. Fan pivots carry rotor spin; Dash alone has root translation.
    c.animate(motion, "Hover", [
        {"t": 0, "position": [0, 0, 0]}, {"t": 0.55, "position": [0, 0.11, 0]},
        {"t": 1.1, "position": [0, 0, 0]},
    ])
    for fan in (fan_l, fan_r, fan_tail):
        c.animate(fan, "Hover", [
            {"t": 0, "rotation": [0, 0, 0]}, {"t": 0.28, "rotation": [0, 0, math.tau]},
        ])
    c.animate(intake, "Intake_Tell", [
        {"t": 0, "scale": [1, 1, 1]}, {"t": 0.28, "scale": [0.58, 0.58, 0.58]},
        {"t": 0.52, "scale": [0.72, 0.72, 0.72]},
    ])
    c.animate(c.root, "Dash", [
        {"t": 0, "position": [0, 0, 0]}, {"t": 0.08, "position": [0, 0.02, 0.30]},
        {"t": 0.26, "position": [0, 0, 4.2]},
    ])
    c.animate(motion, "Guard_Break", [
        {"t": 0, "rotation": [0, 0, 0]}, {"t": 0.18, "rotation": [0.10, 0, -0.10]},
        {"t": 0.46, "rotation": [-0.20, 0, 0.16]}, {"t": 0.82, "rotation": [-0.12, 0, 0]},
    ])
    for fan in (fan_l, fan_r, fan_tail):
        c.animate(fan, "Guard_Break", [
            {"t": 0, "rotation": [0, 0, 0]}, {"t": 0.16, "rotation": [0, 0, math.pi * 1.5]},
            {"t": 0.60, "rotation": [0, 0, math.pi * 1.62]},
        ])
    c.animate(motion, "Hit", [
        {"t": 0, "rotation": [0, 0, 0]}, {"t": 0.10, "rotation": [0, 0, 0.18]},
        {"t": 0.28, "rotation": [0, 0, -0.07]}, {"t": 0.48, "rotation": [0, 0, 0]},
    ])
    c.animate(motion, "Dissolve", [
        {"t": 0, "scale": [1, 1, 1]}, {"t": 0.45, "scale": [0.66, 0.40, 0.66]},
        {"t": 0.82, "scale": [0.015, 0.015, 0.015]},
    ])

    return fit


def mesh_bounds(root):
    bpy.context.view_layer.update()
    points = [obj.matrix_world @ Vector(corner) for obj in root.children_recursive
              if obj.type == "MESH" for corner in obj.bound_box]
    low = Vector(tuple(min(point[i] for point in points) for i in range(3)))
    high = Vector(tuple(max(point[i] for point in points) for i in range(3)))
    return low, high


def fit_to_contract(c):
    fit = bpy.data.objects["Scale.ToContract"]
    low, high = mesh_bounds(c.root)
    dim = high - low
    fit.scale = (REQ["size"][0] / dim.x, REQ["size"][2] / dim.y, REQ["size"][1] / dim.z)
    bpy.context.view_layer.update()
    low, high = mesh_bounds(c.root)
    return [high.x - low.x, high.z - low.z, high.y - low.y]


def count_triangles(root):
    total = 0
    for obj in root.children_recursive:
        if obj.type == "MESH":
            obj.data.calc_loop_triangles()
            total += len(obj.data.loop_triangles)
    return total


def capture_transforms():
    return {
        obj: (obj.location.copy(), obj.rotation_euler.copy(), obj.scale.copy())
        for obj in bpy.context.scene.objects
    }


def restore_transforms(saved):
    for obj, (location, rotation_euler, scale) in saved.items():
        if obj.name not in bpy.context.scene.objects:
            continue
        obj.location = location
        obj.rotation_euler = rotation_euler
        obj.scale = scale
    bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()


def make_lod1(c):
    lod1 = bpy.data.objects.new("LOD1", None)
    bpy.context.collection.objects.link(lod1)
    lod1["lod"] = 1
    copies = {c.root: lod1}
    for obj in c.root.children_recursive:
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
        modifier.ratio = 0.42
        try:
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        except RuntimeError:
            copy.modifiers.remove(modifier)
        copy.select_set(False)
    return lod1


def render_view(c, output, view):
    low, high = mesh_bounds(c.root)
    center = (low + high) / 2
    span = max(high - low)
    scene = bpy.context.scene
    if not scene.world:
        world = bpy.data.worlds.new("Wasp Studio")
        world.use_nodes = True
        world.node_tree.nodes["Background"].inputs[0].default_value = (0.30, 0.32, 0.38, 1)
        world.node_tree.nodes["Background"].inputs[1].default_value = 0.72
        scene.world = world
        for offset, energy, size, color in [
            ((1.0, -1.1, 1.5), 5.5, 1.2, (0.90, 0.82, 1.0)),
            ((-1.0, 0.4, 0.7), 3.0, 1.4, (0.48, 0.34, 0.78)),
        ]:
            bpy.ops.object.light_add(type="AREA", location=center + Vector(offset) * span)
            light = bpy.context.object
            light.data.energy = energy * span * span * 3
            light.data.size = size * span
            light.data.color = color
            light.rotation_euler = (center - light.location).to_track_quat("-Z", "Y").to_euler()
    offsets = {
        "front": (0.0, -1.90, 0.32),
        "three-quarter": (1.0, -1.55, 0.70),
        "side": (1.8, -0.18, 0.48),
        "top": (0.24, -0.38, 2.1),
    }
    bpy.ops.object.camera_add(location=center + Vector(offsets[view]) * span)
    camera = bpy.context.object
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = span * 1.34
    camera.data.clip_end = span * 20
    scene.camera = camera
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1100
    scene.render.resolution_y = 820
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(output)
    scene.view_settings.look = "AgX - Medium High Contrast"
    bpy.ops.render.render(write_still=True)


def silhouette_checkpoint():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    c = Context(REQ)
    build_silhouette(c)
    bounds = fit_to_contract(c)
    WORK.mkdir(parents=True, exist_ok=True)
    for view in ("front", "side", "top"):
        render_view(c, WORK / f"silhouette-{view}.png", view)
    bpy.ops.wm.save_as_mainfile(filepath=str(WORK / "turbineWasp-silhouette.blend"), compress=True)
    print("TURBINE_WASP_SILHOUETTE_DONE", bounds, flush=True)


def full_candidate():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    c = Context(REQ)
    build_silhouette(c)
    c.root["landings"] = "[]"
    c.root["authoring"] = "reference-authored Blender rigid creature"
    c.root["reference"] = "design/references/enemies/turbineWasp-turnaround.png"
    c.root["axisContract"] = "+Y up, +Z forward"
    c.rest_pose()
    bpy.context.scene.frame_set(1)
    bounds = fit_to_contract(c)
    lod1 = make_lod1(c)
    triangles = [count_triangles(c.root), count_triangles(lod1)]
    rest_transforms = capture_transforms()
    WORK.mkdir(parents=True, exist_ok=True)
    uncompressed = WORK / "turbineWasp-uncompressed.glb"
    output = WORK / "turbineWasp.glb"
    bpy.ops.object.select_all(action="DESELECT")
    for obj in [c.root, *c.root.children_recursive, lod1, *lod1.children_recursive]:
        obj.select_set(True)
    scene = bpy.context.scene
    scene.render.fps = 30
    scene.frame_set(1)
    bpy.ops.export_scene.gltf(
        filepath=str(uncompressed), export_format="GLB", use_selection=True,
        export_animations=True, export_animation_mode="NLA_TRACKS",
        export_nla_strips_merged_animation_name="Animation", export_extras=True,
        export_apply=True, export_materials="EXPORT", export_yup=True,
    )
    node = shutil.which("node")
    if not node:
        raise RuntimeError("Node.js is required for the offline gltfpack wrapper")
    subprocess.run([node, str(HERE / "compress.mjs"), str(uncompressed), str(output), "--force"],
                   check=True)
    c.rest_pose()
    restore_transforms(rest_transforms)
    for obj in [lod1, *lod1.children_recursive]:
        obj.hide_render = True
    previews = []
    for view in ("front", "three-quarter", "side", "top"):
        preview = WORK / f"preview-{view}.png"
        render_view(c, preview, view)
        previews.append(str(preview.relative_to(ROOT)))
    bpy.ops.wm.save_as_mainfile(filepath=str(WORK / "turbineWasp.blend"), compress=True)
    record = {
        "request": "M-014", "name": "Turbine Wasp",
        "file": str(output.relative_to(ROOT)), "preview": previews[0], "qaRenders": previews,
        "category": "enemy", "region": "launchworks",
        "source": "hopper/3d/models/source/turbine_wasp.py",
        "bounds": [round(value, 6) for value in bounds], "targetBounds": REQ["size"],
        "triangles": triangles, "clips": REQ["clips"], "sockets": REQ["sockets"],
        "landings": [], "status": "candidate-awaiting-root-review",
        "sourceReference": "design/references/enemies/turbineWasp-turnaround.png",
    }
    (WORK / "record.json").write_text(json.dumps(record, indent=2) + "\n")
    (WORK / "manifest.json").write_text(json.dumps({"version": 1, "models": [record]}, indent=2) + "\n")
    print("TURBINE_WASP_DONE", bounds, triangles, output, flush=True)


if __name__ == "__main__":
    mode = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "silhouette"
    if mode == "silhouette":
        silhouette_checkpoint()
    elif mode == "full":
        full_candidate()
    else:
        raise RuntimeError("mode must be silhouette or full")
