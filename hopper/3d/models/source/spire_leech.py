"""Mechanical M-006 Spire Leech rig scaffold for later art refinement.

This is intentionally not an art-delivery model. It establishes a real skinned
seven-bone chain, head/jaw deformation, gameplay sockets, two LODs, and all
required animation clips in an isolated local candidate.

Run from the repository root with Blender 4.x/5.x:
  blender --background --python hopper/3d/models/source/spire_leech.py -- full
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

from common import Context, ROOT, TEXTURES, v  # noqa: E402


WORK = ROOT / "local/hopper-rigid-creatures/M-006"
REQ = {
    "request": "M-006",
    "name": "Spire Leech",
    "category": "enemy",
    "rig": "spline",
    "size": [1.3, 1.3, 8.2],
    "tris": "5k / 1.5k",
    "standIn": "enemy.spireLeech",
    "final": "models/enemies/spireLeech.glb",
    "region": "city",
    "clips": [
        "Cling_Idle", "Crawl", "Charge_Tell", "Beam_Hold",
        "Retract", "Hit", "Dissolve",
    ],
    "sockets": ["Core", "Emitter", "Hitbox.Body"],
}

CHAIN_ENDPOINTS = [-3.62, -2.67, -1.72, -0.77, 0.18, 1.13, 2.08, 3.03]
CHAIN_NAMES = [f"Chain.{index}" for index in range(7)]
DEFORM_NAMES = [*CHAIN_NAMES, "Head", "Jaw"]


def centerline(z_value):
    """A restrained rest curve; the armature stays straight for clean controls."""
    phase = (z_value + 3.62) / 6.65
    return 0.075 * math.sin(phase * math.pi * 1.7), 0.045 * math.sin(phase * math.pi * 2.2)


def radius_at(z_value):
    phase = max(0.0, min(1.0, (z_value + 3.62) / 6.65))
    return 0.24 + 0.285 * math.sin(phase * math.pi * 0.78) ** 0.82


def make_armature(name, root, prefix=""):
    data = bpy.data.armatures.new(name + ".Data")
    armature = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(armature)
    armature.parent = root
    armature.show_in_front = True
    armature["rigType"] = "seven-chain skinned scaffold"
    armature["rootMotion"] = False

    bpy.context.view_layer.objects.active = armature
    armature.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    previous = None
    for index, (z0, z1) in enumerate(zip(CHAIN_ENDPOINTS[:-1], CHAIN_ENDPOINTS[1:])):
        bone = data.edit_bones.new(prefix + CHAIN_NAMES[index])
        bone.head = v((0, 0, z0))
        bone.tail = v((0, 0, z1))
        bone.use_deform = True
        if previous:
            bone.parent = previous
            bone.use_connect = True
        previous = bone
    head = data.edit_bones.new(prefix + "Head")
    head.head = v((0, 0, CHAIN_ENDPOINTS[-1]))
    head.tail = v((0, 0, 3.76))
    head.parent = previous
    head.use_connect = True
    head.use_deform = True
    jaw = data.edit_bones.new(prefix + "Jaw")
    jaw.head = v((0, -0.17, 3.38))
    jaw.tail = v((0, -0.18, 3.96))
    jaw.parent = head
    jaw.use_deform = True
    bpy.ops.object.mode_set(mode="OBJECT")
    armature.select_set(False)
    return armature


def add_armature_modifier(obj, armature):
    modifier = obj.modifiers.new("SpireLeech.Skin", "ARMATURE")
    modifier.object = armature
    modifier.use_vertex_groups = True
    modifier.use_bone_envelopes = False


def chain_weights(z_value, prefix=""):
    centers = [(a + b) * 0.5 for a, b in zip(CHAIN_ENDPOINTS[:-1], CHAIN_ENDPOINTS[1:])]
    if z_value <= centers[0]:
        return [(prefix + CHAIN_NAMES[0], 1.0)]
    if z_value >= centers[-1]:
        return [(prefix + CHAIN_NAMES[-1], 1.0)]
    for index in range(len(centers) - 1):
        if centers[index] <= z_value <= centers[index + 1]:
            alpha = (z_value - centers[index]) / (centers[index + 1] - centers[index])
            return [
                (prefix + CHAIN_NAMES[index], 1.0 - alpha),
                (prefix + CHAIN_NAMES[index + 1], alpha),
            ]
    raise RuntimeError("chain weight interval not found")


def apply_weights(obj, rows, armature, prefix=""):
    groups = {}
    for bone_name in [prefix + name for name in DEFORM_NAMES]:
        groups[bone_name] = obj.vertex_groups.new(name=bone_name)
    for vertex_index, z_value, rigid_bone in rows:
        influences = [(prefix + rigid_bone, 1.0)] if rigid_bone else chain_weights(z_value, prefix)
        for group_name, weight in influences:
            if weight > 1e-8:
                groups[group_name].add([vertex_index], weight, "REPLACE")
    add_armature_modifier(obj, armature)


def skinned_tube(c, name, z_values, sides, material, root, armature, prefix="",
                 radius_scale=1.0, rigid_bone=None, cap=True):
    verts = []
    rows = []
    for z_value in z_values:
        cx, cy = centerline(z_value)
        radius = radius_at(z_value) * radius_scale
        for side in range(sides):
            angle = math.tau * side / sides
            verts.append((cx + math.cos(angle) * radius,
                          cy + math.sin(angle) * radius, z_value))
            rows.append((len(verts) - 1, z_value, rigid_bone))
    faces = []
    for ring in range(len(z_values) - 1):
        for side in range(sides):
            nxt = (side + 1) % sides
            a = ring * sides + side
            b = ring * sides + nxt
            c0 = (ring + 1) * sides + nxt
            d = (ring + 1) * sides + side
            faces.append((a, b, c0, d))
    if cap:
        faces.append(tuple(reversed(range(sides))))
        last = (len(z_values) - 1) * sides
        faces.append(tuple(last + side for side in range(sides)))
    obj = c.mesh(name, verts, faces, material, root)
    apply_weights(obj, rows, armature, prefix)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def collar_mesh(c, name, z_center, sides, material, root, armature, prefix=""):
    width = 0.13
    z_values = [z_center - width, z_center - width * 0.46,
                z_center + width * 0.46, z_center + width]
    scales = [1.01, 1.13, 1.13, 1.01]
    verts = []
    rows = []
    for z_value, scale in zip(z_values, scales):
        cx, cy = centerline(z_value)
        radius = radius_at(z_value) * scale
        for side in range(sides):
            angle = math.tau * side / sides
            verts.append((cx + math.cos(angle) * radius,
                          cy + math.sin(angle) * radius, z_value))
            rows.append((len(verts) - 1, z_value, None))
    faces = []
    for ring in range(3):
        for side in range(sides):
            nxt = (side + 1) % sides
            faces.append((ring * sides + side, ring * sides + nxt,
                          (ring + 1) * sides + nxt, (ring + 1) * sides + side))
    obj = c.mesh(name, verts, faces, material, root)
    apply_weights(obj, rows, armature, prefix)
    return obj


def rigid_mesh(c, name, verts, faces, material, root, armature, bone_name, prefix=""):
    obj = c.mesh(name, verts, faces, material, root)
    rows = [(vertex.index, 0.0, bone_name) for vertex in obj.data.vertices]
    apply_weights(obj, rows, armature, prefix)
    return obj


def radial_tooth(c, name, angle, inner, outer, z0, z1, thickness,
                 material, root, armature, bone_name, prefix=""):
    tangent = Vector((-math.sin(angle), math.cos(angle), 0))
    radial = Vector((math.cos(angle), math.sin(angle), 0))
    a = radial * inner
    b = radial * outer + tangent * thickness * 0.25
    half = tangent * thickness * 0.5
    verts = [
        (a.x - half.x, a.y - half.y, z0), (a.x + half.x, a.y + half.y, z0),
        (b.x, b.y, z1),
        (a.x - half.x, a.y - half.y, z0 + 0.09),
        (a.x + half.x, a.y + half.y, z0 + 0.09), (b.x, b.y, z1 + 0.035),
    ]
    faces = [(0, 2, 1), (3, 4, 5), (0, 1, 4, 3),
             (1, 2, 5, 4), (2, 0, 3, 5)]
    return rigid_mesh(c, name, verts, faces, material, root, armature, bone_name, prefix)


def bone_socket(c, name, world_position, armature, bone_name):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.location = v(world_position)
    world = obj.matrix_world.copy()
    obj.parent = armature
    obj.parent_type = "BONE"
    obj.parent_bone = bone_name
    obj.matrix_world = world
    obj["socket"] = True
    c.sockets.append(name)
    return obj


def build_lod(c, root, lod_index, material_names):
    prefix = "" if lod_index == 0 else "LOD1."
    armature = make_armature(prefix + "Rig", root, prefix)
    sides = 12 if lod_index == 0 else 8
    ring_count = 29 if lod_index == 0 else 15
    z_values = [-3.62 + (3.03 + 3.62) * index / (ring_count - 1)
                for index in range(ring_count)]
    meshes = []
    meshes.append(skinned_tube(c, prefix + "Body.Skinned", z_values, sides,
                               material_names["hide"], root, armature, prefix))
    collar_sides = 12 if lod_index == 0 else 8
    for index, z_center in enumerate([(a + b) * 0.5 for a, b in zip(
            CHAIN_ENDPOINTS[:-1], CHAIN_ENDPOINTS[1:])]):
        meshes.append(collar_mesh(c, prefix + f"Body.Collar.{index}", z_center,
                                  collar_sides, material_names["edge"], root,
                                  armature, prefix))

    head_z = [3.00, 3.20, 3.43, 3.65]
    meshes.append(skinned_tube(c, prefix + "Head.Shell", head_z, sides,
                               material_names["shell"], root, armature, prefix,
                               radius_scale=1.18, rigid_bone="Head"))
    tooth_count = 8 if lod_index == 0 else 6
    for index in range(tooth_count):
        angle = math.tau * index / tooth_count
        lower = math.sin(angle) < -0.05
        bone_name = "Jaw" if lower else "Head"
        meshes.append(radial_tooth(
            c, prefix + f"Mouth.Hook.{index}", angle, 0.27, 0.60,
            3.62, 4.065, 0.16 if lod_index == 0 else 0.19,
            material_names["ivory"], root, armature, bone_name, prefix,
        ))

    # The terminal hook reaches the exact rear extent and follows Chain.0.
    hook_verts = [
        (-0.08, -0.02, -3.55), (0.08, -0.02, -3.55),
        (0.12, 0.02, -3.82), (0.04, 0.05, -4.10),
        (-0.04, 0.05, -4.10), (-0.12, 0.02, -3.82),
        (-0.07, 0.10, -3.55), (0.07, 0.10, -3.55),
        (0.10, 0.12, -3.82), (0.03, 0.13, -4.10),
        (-0.03, 0.13, -4.10), (-0.10, 0.12, -3.82),
    ]
    hook_faces = [(0, 1, 2, 3, 4, 5), (6, 11, 10, 9, 8, 7)]
    for index in range(6):
        hook_faces.append((index, (index + 1) % 6, 6 + (index + 1) % 6, 6 + index))
    meshes.append(rigid_mesh(c, prefix + "Tail.TerminalHook", hook_verts,
                             hook_faces, material_names["edge"], root,
                             armature, CHAIN_NAMES[0], prefix))

    # A mouth emitter and six small charge lenses provide readable tell proxies.
    emitter = c.sphere(prefix + "Mouth.Emitter", (0, 0, 3.72),
                       (0.31, 0.31, 0.16), material_names["emitter"],
                       10 if lod_index == 0 else 8, 6 if lod_index == 0 else 4, root)
    rows = [(vertex.index, 0.0, "Head") for vertex in emitter.data.vertices]
    apply_weights(emitter, rows, armature, prefix)
    meshes.append(emitter)
    for index in range(6 if lod_index == 0 else 4):
        angle = math.tau * index / (6 if lod_index == 0 else 4)
        eye = c.sphere(prefix + f"ChargeLens.{index}",
                       (math.cos(angle) * 0.47, math.sin(angle) * 0.47, 3.57),
                       (0.10, 0.10, 0.07), material_names["eye"],
                       8, 4, root)
        rows = [(vertex.index, 0.0, "Head") for vertex in eye.data.vertices]
        apply_weights(eye, rows, armature, prefix)
        meshes.append(eye)

    return armature, meshes, emitter


def clear_pose(armature):
    for bone in armature.pose.bones:
        bone.rotation_mode = "XYZ"
        bone.location = (0, 0, 0)
        bone.rotation_euler = (0, 0, 0)
        bone.scale = (1, 1, 1)


def pose_values(clip, sample_index, sample_count, chain_index):
    phase = sample_index / max(1, sample_count - 1)
    wave = math.sin(phase * math.tau - chain_index * 0.72)
    values = {"rotation": (0.0, 0.0, 0.0), "scale": (1.0, 1.0, 1.0)}
    if clip == "Cling_Idle":
        values["rotation"] = (0.035 * wave, 0.0, 0.018 * math.cos(phase * math.tau + chain_index))
    elif clip == "Crawl":
        values["rotation"] = (0.13 * wave, 0.0, 0.045 * math.cos(phase * math.tau - chain_index * 0.72))
    elif clip == "Charge_Tell":
        values["rotation"] = (0.045 * phase * (chain_index / 6), 0.0, 0.0)
    elif clip == "Beam_Hold":
        values["rotation"] = (0.018 * wave, 0.0, 0.0)
    elif clip == "Retract":
        values["rotation"] = (-0.12 * math.sin(phase * math.pi) * (1 - chain_index / 8), 0.0,
                              0.04 * wave)
    elif clip == "Hit":
        impulse = math.sin(phase * math.pi)
        values["rotation"] = (0.0, 0.16 * impulse, (-0.18 + chain_index * 0.018) * impulse)
    elif clip == "Dissolve":
        scale = max(0.04, 1.0 - phase * (0.78 + 0.025 * chain_index))
        values["scale"] = (scale, scale, scale)
    return values


def author_actions(armature, prefix=""):
    durations = {
        "Cling_Idle": 1.2, "Crawl": 1.0, "Charge_Tell": 0.65,
        "Beam_Hold": 0.8, "Retract": 0.6, "Hit": 0.42, "Dissolve": 0.85,
    }
    sample_counts = {"Crawl": 5, "Cling_Idle": 4, "Beam_Hold": 4}
    armature.animation_data_create()
    for clip in REQ["clips"]:
        action = bpy.data.actions.new(clip + "__" + armature.name)
        armature.animation_data.action = action
        count = sample_counts.get(clip, 3)
        for sample in range(count):
            phase = sample / (count - 1)
            frame = 1 + round(durations[clip] * 30 * phase)
            for chain_index, base_name in enumerate(CHAIN_NAMES):
                bone = armature.pose.bones[prefix + base_name]
                bone.rotation_mode = "XYZ"
                values = pose_values(clip, sample, count, chain_index)
                bone.rotation_euler = values["rotation"]
                bone.scale = values["scale"]
                bone.keyframe_insert("rotation_euler", frame=frame, group=base_name)
                bone.keyframe_insert("scale", frame=frame, group=base_name)
            head = armature.pose.bones[prefix + "Head"]
            jaw = armature.pose.bones[prefix + "Jaw"]
            head.rotation_mode = jaw.rotation_mode = "XYZ"
            head.rotation_euler = (0.0, 0.0, 0.0)
            jaw.rotation_euler = (0.0, 0.0, 0.0)
            if clip == "Charge_Tell":
                head.rotation_euler.x = -0.08 * math.sin(phase * math.pi)
                jaw.rotation_euler.x = 0.42 * phase
            elif clip == "Beam_Hold":
                jaw.rotation_euler.x = 0.42 + 0.035 * math.sin(phase * math.tau)
            elif clip == "Retract":
                head.rotation_euler.z = 0.18 * math.sin(phase * math.pi)
                jaw.rotation_euler.x = 0.36 * (1.0 - phase)
            elif clip == "Hit":
                head.rotation_euler.z = -0.24 * math.sin(phase * math.pi)
                jaw.rotation_euler.x = -0.12 * math.sin(phase * math.pi)
            elif clip == "Dissolve":
                scale = max(0.04, 1.0 - phase * 0.92)
                head.scale = jaw.scale = (scale, scale, scale)
            head.keyframe_insert("rotation_euler", frame=frame, group="Head")
            head.keyframe_insert("scale", frame=frame, group="Head")
            jaw.keyframe_insert("rotation_euler", frame=frame, group="Jaw")
            jaw.keyframe_insert("scale", frame=frame, group="Jaw")
        track = armature.animation_data.nla_tracks.new()
        track.name = clip
        strip = track.strips.new(clip, 1, action)
        strip.name = clip
        track.mute = True
        armature.animation_data.action = None
    clear_pose(armature)


def animate_emitter(c, emitter):
    c.animate(emitter, "Charge_Tell", [
        {"t": 0, "scale": [1, 1, 1]},
        {"t": 0.34, "scale": [1.28, 1.28, 1.28]},
        {"t": 0.65, "scale": [1.58, 1.58, 1.58]},
    ])
    c.animate(emitter, "Beam_Hold", [
        {"t": 0, "scale": [1.52, 1.52, 1.52]},
        {"t": 0.40, "scale": [1.68, 1.68, 1.68]},
        {"t": 0.80, "scale": [1.52, 1.52, 1.52]},
    ])


def mesh_bounds(root):
    bpy.context.view_layer.update()
    points = [obj.matrix_world @ Vector(corner) for obj in root.children_recursive
              if obj.type == "MESH" for corner in obj.bound_box]
    low = Vector(tuple(min(point[index] for point in points) for index in range(3)))
    high = Vector(tuple(max(point[index] for point in points) for index in range(3)))
    return low, high


def fit_root_to_contract(root):
    low, high = mesh_bounds(root)
    dimensions = high - low
    target_blender = Vector((REQ["size"][0], REQ["size"][2], REQ["size"][1]))
    root.scale = tuple(root.scale[index] * target_blender[index] / dimensions[index]
                       for index in range(3))
    bpy.context.view_layer.update()
    low, high = mesh_bounds(root)
    dimensions = high - low
    return [dimensions.x, dimensions.z, dimensions.y]


def count_triangles(root):
    total = 0
    for obj in root.children_recursive:
        if obj.type == "MESH":
            obj.data.calc_loop_triangles()
            total += len(obj.data.loop_triangles)
    return total


def validate_skin_weights(meshes, armature, prefix=""):
    allowed = {prefix + name for name in DEFORM_NAMES}
    findings = []
    for obj in meshes:
        group_names = {group.index: group.name for group in obj.vertex_groups}
        for vertex in obj.data.vertices:
            weights = [(group_names[item.group], item.weight) for item in vertex.groups
                       if item.group in group_names and item.weight > 1e-8]
            total = sum(weight for _, weight in weights)
            if not weights or not math.isfinite(total) or abs(total - 1.0) > 1e-4:
                raise RuntimeError(f"invalid weights {obj.name} vertex {vertex.index}: {weights}")
            if any(name not in allowed or not math.isfinite(weight) for name, weight in weights):
                raise RuntimeError(f"invalid bone influence {obj.name} vertex {vertex.index}: {weights}")
        findings.append({"mesh": obj.name, "vertices": len(obj.data.vertices)})
    if len(armature.data.bones) != 9:
        raise RuntimeError(f"{armature.name}: expected 9 bones, found {len(armature.data.bones)}")
    return findings


def set_active_clip(objects, clip):
    for obj in objects:
        data = obj.animation_data
        if not data:
            continue
        data.action = None
        data.use_nla = True
        for track in data.nla_tracks:
            track.is_solo = False
            track.mute = track.name != clip


def mute_all_actions(objects):
    for obj in objects:
        data = obj.animation_data
        if not data:
            continue
        data.action = None
        for track in data.nla_tracks:
            track.mute = True


def sample_animations(animated_objects, skinned_meshes):
    scene = bpy.context.scene
    dependency_graph = bpy.context.evaluated_depsgraph_get()
    report = {}
    for clip in REQ["clips"]:
        set_active_clip(animated_objects, clip)
        max_frame = 1
        for obj in animated_objects:
            data = obj.animation_data
            if not data:
                continue
            for track in data.nla_tracks:
                if track.name == clip:
                    for strip in track.strips:
                        max_frame = max(max_frame, int(math.ceil(strip.frame_end)))
        sample_frames = sorted({1, max(1, (1 + max_frame) // 2), max_frame})
        clip_samples = []
        for frame in sample_frames:
            scene.frame_set(frame)
            bpy.context.view_layer.update()
            coordinate_count = 0
            maximum = 0.0
            for obj in skinned_meshes:
                evaluated = obj.evaluated_get(dependency_graph)
                mesh = evaluated.to_mesh()
                try:
                    for vertex in mesh.vertices:
                        point = evaluated.matrix_world @ vertex.co
                        if not all(math.isfinite(value) for value in point):
                            raise RuntimeError(f"{clip} frame {frame}: non-finite {obj.name}")
                        maximum = max(maximum, max(abs(value) for value in point))
                        coordinate_count += 3
                finally:
                    evaluated.to_mesh_clear()
            if coordinate_count == 0 or not math.isfinite(maximum) or maximum > 1000:
                raise RuntimeError(f"{clip} frame {frame}: invalid evaluated mesh sample")
            clip_samples.append({"frame": frame, "coordinates": coordinate_count,
                                 "maxAbs": round(maximum, 6)})
        report[clip] = clip_samples
    mute_all_actions(animated_objects)
    for obj in animated_objects:
        if obj.type == "ARMATURE":
            clear_pose(obj)
    scene.frame_set(1)
    bpy.context.view_layer.update()
    return report


def capture_transforms():
    return {obj: (obj.location.copy(), obj.rotation_euler.copy(), obj.scale.copy())
            for obj in bpy.context.scene.objects}


def restore_transforms(saved):
    for obj, values in saved.items():
        if obj.name in bpy.context.scene.objects:
            obj.location, obj.rotation_euler, obj.scale = values
    bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()


def render_preview(root, output):
    low, high = mesh_bounds(root)
    center = (low + high) / 2
    span = max(high - low)
    scene = bpy.context.scene
    world = bpy.data.worlds.new("Spire Leech Scaffold Studio")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.34, 0.35, 0.40, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.7
    scene.world = world
    for offset, energy, color in [
        ((1.2, -1.4, 0.9), 4.6, (0.82, 0.74, 1.0)),
        ((-1.0, 0.2, 0.5), 2.8, (0.45, 0.55, 0.9)),
    ]:
        bpy.ops.object.light_add(type="AREA", location=center + Vector(offset) * span)
        light = bpy.context.object
        light.data.energy = energy * span * span * 3
        light.data.size = span
        light.data.color = color
        light.rotation_euler = (center - light.location).to_track_quat("-Z", "Y").to_euler()
    bpy.ops.object.camera_add(location=center + Vector((1.05, -1.35, 0.62)) * span)
    camera = bpy.context.object
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = span * 1.18
    camera.data.clip_end = span * 20
    scene.camera = camera
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1100
    scene.render.resolution_y = 520
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(output)
    scene.view_settings.look = "AgX - Medium High Contrast"
    bpy.ops.render.render(write_still=True)


def full_candidate():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    c = Context(REQ)
    c.root["authoring"] = "mechanical skinned rig scaffold; not art delivery"
    c.root["reference"] = "design/references/enemies/spireLeech-turnaround.png"
    c.root["axisContract"] = "+Y up, +Z forward"
    c.root["landings"] = "[]"
    hide = c.material("Leech.PaintedHide", (0.16, 0.12, 0.23),
                      TEXTURES / "creatures/shadow-hide.png")
    shell = c.material("Leech.ScaffoldShell", (0.075, 0.055, 0.105))
    edge = c.material("Leech.VioletEdge", (0.31, 0.13, 0.48))
    ivory = c.material("Leech.IvoryMouth", (0.88, 0.80, 0.60))
    emitter_mat = c.material("Leech.Emitter", (1.0, 0.26, 0.035), emission=2.0)
    eye = c.material("Leech.ChargeLens", (0.96, 0.70, 0.16), emission=1.2)
    materials = {"hide": hide, "shell": shell, "edge": edge,
                 "ivory": ivory, "emitter": emitter_mat, "eye": eye}

    lod0_armature, lod0_meshes, lod0_emitter = build_lod(c, c.root, 0, materials)
    lod1 = bpy.data.objects.new("LOD1", None)
    bpy.context.collection.objects.link(lod1)
    lod1["lod"] = 1
    lod1["authoring"] = c.root["authoring"]
    lod1["request"] = REQ["request"]
    lod1_armature, lod1_meshes, lod1_emitter = build_lod(c, lod1, 1, materials)

    # Authoritative sockets live on LOD0 and follow the relevant deform bones.
    bone_socket(c, "Core", (0, 0, -0.28), lod0_armature, "Chain.3")
    bone_socket(c, "Emitter", (0, 0, 3.92), lod0_armature, "Head")
    hitbox = c.socket("Hitbox.Body", (0, 0, -0.15), c.root)
    hitbox["shape"] = "capsule"

    author_actions(lod0_armature)
    author_actions(lod1_armature, "LOD1.")
    animate_emitter(c, lod0_emitter)
    animate_emitter(c, lod1_emitter)
    c.clips.update(REQ["clips"])
    bounds0 = fit_root_to_contract(c.root)
    bounds1 = fit_root_to_contract(lod1)
    triangles = [count_triangles(c.root), count_triangles(lod1)]
    if triangles[0] > 5000 or triangles[1] > 1500:
        raise RuntimeError(f"triangle budget exceeded: {triangles}")

    weight_report = {
        "LOD0": validate_skin_weights(lod0_meshes, lod0_armature),
        "LOD1": validate_skin_weights(lod1_meshes, lod1_armature, "LOD1."),
    }
    animated_objects = [lod0_armature, lod1_armature, lod0_emitter, lod1_emitter]
    sample_report = sample_animations(animated_objects, [*lod0_meshes, *lod1_meshes])
    root_animated = bool(c.root.animation_data or lod1.animation_data)
    if root_animated:
        raise RuntimeError("LOD root animation is forbidden for M-006 surface-relative clips")

    WORK.mkdir(parents=True, exist_ok=True)
    qa = {
        "bones": {
            "LOD0": [bone.name for bone in lod0_armature.data.bones],
            "LOD1": [bone.name for bone in lod1_armature.data.bones],
        },
        "weightMeshes": weight_report,
        "animationSamples": sample_report,
        "rootAnimated": root_animated,
        "bounds": {"LOD0": bounds0, "LOD1": bounds1},
        "triangles": triangles,
    }
    (WORK / "rig-qa.json").write_text(json.dumps(qa, indent=2) + "\n")

    rest_transforms = capture_transforms()
    uncompressed = WORK / "spireLeech-uncompressed.glb"
    output = WORK / "spireLeech.glb"
    bpy.ops.object.select_all(action="DESELECT")
    selected = [c.root, *c.root.children_recursive, lod1, *lod1.children_recursive]
    for obj in selected:
        obj.select_set(True)
    scene = bpy.context.scene
    scene.render.fps = 30
    scene.frame_set(1)
    bpy.ops.export_scene.gltf(
        filepath=str(uncompressed), export_format="GLB", use_selection=True,
        export_animations=True, export_animation_mode="NLA_TRACKS",
        export_nla_strips_merged_animation_name="Animation", export_extras=True,
        export_apply=True, export_materials="EXPORT", export_yup=True,
        export_skins=True, export_all_influences=True,
    )
    node = shutil.which("node")
    if not node:
        raise RuntimeError("Node.js is required for the offline gltfpack wrapper")
    subprocess.run([node, str(HERE / "compress.mjs"), str(uncompressed),
                    str(output), "--force"], check=True)
    mute_all_actions(animated_objects)
    clear_pose(lod0_armature)
    clear_pose(lod1_armature)
    restore_transforms(rest_transforms)
    for obj in [lod1, *lod1.children_recursive]:
        obj.hide_render = True
    preview = WORK / "preview-scaffold.png"
    render_preview(c.root, preview)
    bpy.ops.wm.save_as_mainfile(filepath=str(WORK / "spireLeech.blend"), compress=True)

    record = {
        "request": REQ["request"], "name": REQ["name"],
        "file": str(output.relative_to(ROOT)),
        "preview": str(preview.relative_to(ROOT)),
        "category": "enemy", "region": "city",
        "source": "hopper/3d/models/source/spire_leech.py",
        "bounds": [round(value, 6) for value in bounds0],
        "targetBounds": REQ["size"], "triangles": triangles,
        "clips": REQ["clips"], "sockets": REQ["sockets"], "landings": [],
        "status": "mechanical-rig-scaffold-awaiting-art-refinement",
        "sourceReference": "design/references/enemies/spireLeech-turnaround.png",
    }
    (WORK / "record.json").write_text(json.dumps(record, indent=2) + "\n")
    (WORK / "manifest.json").write_text(
        json.dumps({"version": 1, "models": [record]}, indent=2) + "\n")
    print("SPIRE_LEECH_SCAFFOLD_DONE", bounds0, bounds1, triangles, output, flush=True)


if __name__ == "__main__":
    mode = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "full"
    if mode != "full":
        raise RuntimeError("mode must be full")
    full_candidate()
