"""Mechanical M-007 Crag Tortoise rig scaffold for later art refinement.

This placeholder establishes the full skeletal interface, weighted motion,
grounding, belly presentation, clips, sockets, exact bounds, and two LODs. It is
not intended as final creature art.

Run from the repository root:
  blender --background --python hopper/3d/models/source/crag_tortoise.py -- full
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


WORK = ROOT / "local/hopper-rigid-creatures/M-007"
REQ = {
    "request": "M-007",
    "name": "Crag Tortoise",
    "category": "enemy",
    "rig": "skeletal",
    "size": [7.1, 4.7, 8.6],
    "tris": "7k / 2k",
    "standIn": "enemy.cragTortoise",
    "final": "models/enemies/cragTortoise.glb",
    "region": "mountains",
    "clips": ["Idle", "Walk", "Lunge_Tell", "Lunge", "Belly_Open_Hold",
              "Withdraw", "Hit", "Dissolve"],
    "sockets": ["Core", "Mouth", "Hitbox.Shell", "Hitbox.Body"],
}

LEG_IDS = ("FL", "FR", "RL", "RR")
BONE_NAMES = ["Spine.0", "Spine.1", "Shell", "Head", "Jaw", *(
    f"Leg.{leg}.{joint}" for leg in LEG_IDS for joint in range(3)
)]
LOOPING_CLIPS = {"Idle", "Walk", "Belly_Open_Hold"}


def make_armature(name, root, prefix=""):
    data = bpy.data.armatures.new(name + ".Data")
    armature = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(armature)
    armature.parent = root
    armature.show_in_front = True
    armature["rigType"] = "crag-tortoise skeletal scaffold"

    bpy.context.view_layer.objects.active = armature
    armature.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    spine0 = data.edit_bones.new(prefix + "Spine.0")
    spine0.head, spine0.tail = v((0, 1.25, -2.1)), v((0, 1.45, 0.0))
    spine1 = data.edit_bones.new(prefix + "Spine.1")
    spine1.head, spine1.tail = spine0.tail, v((0, 1.45, 2.15))
    spine1.parent, spine1.use_connect = spine0, True

    shell = data.edit_bones.new(prefix + "Shell")
    shell.head, shell.tail = v((0, 1.35, -0.65)), v((0, 2.75, 0.15))
    shell.parent = spine0
    head = data.edit_bones.new(prefix + "Head")
    head.head, head.tail = v((0, 1.15, 1.75)), v((0, 1.35, 3.55))
    head.parent = spine1
    jaw = data.edit_bones.new(prefix + "Jaw")
    jaw.head, jaw.tail = v((0, 0.90, 2.45)), v((0, 0.78, 3.82))
    jaw.parent = head

    for leg in LEG_IDS:
        left = leg.endswith("L")
        front = leg.startswith("F")
        x_sign = -1 if left else 1
        z_sign = 1 if front else -1
        hip = (1.75 * x_sign, 1.42, 1.62 * z_sign)
        knee = (2.55 * x_sign, 0.70, 1.95 * z_sign)
        ankle = (3.02 * x_sign, 0.28, 2.28 * z_sign)
        toe = (3.34 * x_sign, 0.18, 2.92 * z_sign)
        parent = spine1 if front else spine0
        points = (hip, knee, ankle, toe)
        previous = None
        for joint in range(3):
            bone = data.edit_bones.new(prefix + f"Leg.{leg}.{joint}")
            bone.head, bone.tail = v(points[joint]), v(points[joint + 1])
            bone.parent = parent if previous is None else previous
            bone.use_connect = previous is not None
            previous = bone

    for bone in data.edit_bones:
        bone.use_deform = True
    bpy.ops.object.mode_set(mode="OBJECT")
    armature.select_set(False)
    return armature


def add_skin(obj, bone_weights, armature, prefix=""):
    groups = {name: obj.vertex_groups.new(name=prefix + name) for name in BONE_NAMES}
    for vertex_index, influences in enumerate(bone_weights):
        total = sum(weight for _, weight in influences)
        if total <= 0 or not math.isfinite(total):
            raise RuntimeError(f"{obj.name} vertex {vertex_index}: invalid weights")
        for name, weight in influences:
            groups[name].add([vertex_index], weight / total, "REPLACE")
    world = obj.matrix_world.copy()
    obj.parent = armature
    obj.matrix_world = world
    modifier = obj.modifiers.new("CragTortoise.Skin", "ARMATURE")
    modifier.object = armature
    modifier.use_vertex_groups = True
    modifier.use_bone_envelopes = False


def rigid_skin(obj, armature, bone_name, prefix=""):
    add_skin(obj, [[(bone_name, 1.0)] for _ in obj.data.vertices], armature, prefix)
    return obj


def tapered_segment(c, name, start, end, radii, material, root, vertices,
                    armature, bone_name, prefix=""):
    a, b = v(start), v(end)
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radii[0],
                                    radius2=radii[1], depth=(b - a).length,
                                    location=(a + b) / 2)
    obj = bpy.context.object
    obj.rotation_euler = (b - a).to_track_quat("Z", "Y").to_euler()
    obj = c.finish(obj, name, material, root)
    return rigid_skin(obj, armature, bone_name, prefix)


def body_weighted_sphere(c, name, position, size, material, root, armature,
                         prefix, lod):
    obj = c.sphere(name, position, size, material,
                   14 if lod == 0 else 9, 8 if lod == 0 else 5, root)
    weights = []
    for vertex in obj.data.vertices:
        game_z = -vertex.co.y
        alpha = max(0.0, min(1.0, (game_z + 1.2) / 2.4))
        weights.append([("Spine.0", 1.0 - alpha), ("Spine.1", alpha)])
    add_skin(obj, weights, armature, prefix)
    return obj


def build_lod(c, root, lod, materials):
    prefix = "" if lod == 0 else "LOD1."
    armature = make_armature(prefix + "Rig", root, prefix)
    meshes = []
    meshes.append(body_weighted_sphere(c, prefix + "Body.Belly", (0, 1.25, 0.0),
                                        (4.55, 2.18, 5.0), materials["ivory"],
                                        root, armature, prefix, lod))
    shell = c.sphere(prefix + "Shell.Rigid", (0, 2.48, -0.18),
                     (6.18, 3.86, 6.55), materials["hide"],
                     18 if lod == 0 else 10, 10 if lod == 0 else 6, root)
    meshes.append(rigid_skin(shell, armature, "Shell", prefix))

    spike_positions = [
        (0, 4.12, -0.30, 0.58), (-1.55, 3.72, 0.25, 0.45),
        (1.55, 3.72, 0.25, 0.45), (-2.35, 3.12, -1.30, 0.38),
        (2.35, 3.12, -1.30, 0.38), (0, 3.92, 1.25, 0.46),
        (-1.35, 3.62, -2.15, 0.40), (1.35, 3.62, -2.15, 0.40),
        (0, 3.52, -2.72, 0.36),
    ]
    if lod == 1:
        spike_positions = spike_positions[::2]
    for index, (x, y, z, radius) in enumerate(spike_positions):
        spike = c.cyl(prefix + f"Shell.Spike.{index}", (x, y, z), radius,
                      0.90 + radius, materials["edge"], 7 if lod == 0 else 5,
                      top_radius=0.025, parent=root)
        meshes.append(rigid_skin(spike, armature, "Shell", prefix))

    head = c.sphere(prefix + "Head.Placeholder", (0, 1.25, 3.08),
                    (2.0, 1.35, 2.25), materials["shell"],
                    12 if lod == 0 else 8, 7 if lod == 0 else 5, root)
    meshes.append(rigid_skin(head, armature, "Head", prefix))
    snout = tapered_segment(c, prefix + "Head.Snout", (0, 1.20, 3.15),
                            (0, 1.12, 4.18), (0.68, 0.20), materials["shell"],
                            root, 9 if lod == 0 else 6, armature, "Head", prefix)
    meshes.append(snout)
    jaw = c.sphere(prefix + "Jaw.Placeholder", (0, 0.78, 3.38),
                   (1.38, 0.48, 1.72), materials["mouth"],
                   10 if lod == 0 else 7, 6 if lod == 0 else 4, root)
    meshes.append(rigid_skin(jaw, armature, "Jaw", prefix))

    for leg in LEG_IDS:
        left = leg.endswith("L")
        front = leg.startswith("F")
        x_sign = -1 if left else 1
        z_sign = 1 if front else -1
        points = [
            (1.75 * x_sign, 1.42, 1.62 * z_sign),
            (2.55 * x_sign, 0.70, 1.95 * z_sign),
            (3.02 * x_sign, 0.28, 2.28 * z_sign),
            (3.34 * x_sign, 0.18, 2.92 * z_sign),
        ]
        for joint in range(3):
            meshes.append(tapered_segment(
                c, prefix + f"Leg.{leg}.Segment.{joint}", points[joint],
                points[joint + 1], (0.42 - joint * 0.09, 0.35 - joint * 0.09),
                materials["shell" if joint < 2 else "edge"], root,
                8 if lod == 0 else 6, armature, f"Leg.{leg}.{joint}", prefix,
            ))
        foot = c.sphere(prefix + f"Leg.{leg}.Foot", points[-1],
                        (0.82, 0.36, 1.10), materials["shell"],
                        10 if lod == 0 else 7, 6 if lod == 0 else 4, root)
        meshes.append(rigid_skin(foot, armature, f"Leg.{leg}.2", prefix))

    return armature, meshes


def bone_socket(c, name, position, armature, bone_name):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.location = v(position)
    world = obj.matrix_world.copy()
    obj.parent = armature
    obj.parent_type = "BONE"
    obj.parent_bone = bone_name
    obj.matrix_world = world
    obj["socket"] = True
    c.sockets.append(name)
    return obj


def clear_pose(armature):
    for bone in armature.pose.bones:
        bone.rotation_mode = "XYZ"
        bone.location = (0, 0, 0)
        bone.rotation_euler = (0, 0, 0)
        bone.scale = (1, 1, 1)


def pose_for(clip, phase, name):
    rotation = [0.0, 0.0, 0.0]
    scale = [1.0, 1.0, 1.0]
    leg = name.split(".")[1] if name.startswith("Leg.") else None
    joint = int(name.rsplit(".", 1)[1]) if leg else None
    front = bool(leg and leg.startswith("F"))
    gait_side = -1 if leg in ("FL", "RR") else 1
    if clip == "Idle":
        if name == "Spine.1":
            rotation[0] = 0.025 * math.sin(phase * math.tau)
        elif name == "Head":
            rotation[2] = 0.035 * math.sin(phase * math.tau)
    elif clip == "Walk" and leg:
        swing = math.sin(phase * math.tau) * gait_side
        rotation[0] = swing * (0.18 if joint == 0 else -0.24 if joint == 1 else 0.13)
    elif clip in ("Lunge_Tell", "Lunge", "Belly_Open_Hold"):
        amount = phase if clip == "Lunge_Tell" else 1.0
        if name == "Spine.0":
            rotation[0] = -0.28 * amount
        elif name == "Spine.1":
            rotation[0] = -0.42 * amount
        elif name == "Shell":
            rotation[0] = 0.16 * amount
        elif name == "Head":
            rotation[0] = 0.22 * amount
        elif name == "Jaw":
            rotation[0] = 0.36 * amount
        elif leg and front:
            rotation[0] = (0.38 if joint == 0 else -0.52 if joint == 1 else 0.26) * amount
        elif leg:
            rotation[0] = (-0.12 if joint == 0 else 0.18 if joint == 1 else -0.08) * amount
        if clip == "Belly_Open_Hold" and name == "Shell":
            rotation[2] = 0.018 * math.sin(phase * math.tau)
    elif clip == "Withdraw":
        amount = 1.0 - phase
        if name == "Spine.0":
            rotation[0] = -0.28 * amount
        elif name == "Spine.1":
            rotation[0] = -0.42 * amount
        elif name == "Shell":
            rotation[0] = 0.16 * amount
        elif name == "Jaw":
            rotation[0] = 0.36 * amount
        elif leg and front:
            rotation[0] = (0.38 if joint == 0 else -0.52 if joint == 1 else 0.26) * amount
    elif clip == "Hit":
        impulse = math.sin(phase * math.pi)
        if name.startswith("Spine") or name == "Shell":
            rotation[2] = 0.18 * impulse
        elif name == "Head":
            rotation[2] = -0.22 * impulse
        elif leg:
            rotation[0] = gait_side * 0.12 * impulse
    elif clip == "Dissolve":
        shrink = max(0.04, 1.0 - phase * 0.92)
        scale = [shrink, shrink, shrink]
    return rotation, scale


def author_actions(armature, prefix=""):
    durations = {"Idle": 1.2, "Walk": 1.0, "Lunge_Tell": 0.62,
                 "Lunge": 0.34, "Belly_Open_Hold": 0.8, "Withdraw": 0.7,
                 "Hit": 0.42, "Dissolve": 0.85}
    counts = {"Idle": 5, "Walk": 5, "Belly_Open_Hold": 5}
    armature.animation_data_create()
    for clip in REQ["clips"]:
        action = bpy.data.actions.new(clip + "__" + armature.name)
        armature.animation_data.action = action
        count = counts.get(clip, 3)
        for sample in range(count):
            phase = sample / (count - 1)
            frame = 1 + round(durations[clip] * 30 * phase)
            for name in BONE_NAMES:
                bone = armature.pose.bones[prefix + name]
                rotation, scale = pose_for(clip, phase, name)
                bone.rotation_mode = "XYZ"
                bone.rotation_euler = rotation
                bone.scale = scale
                bone.keyframe_insert("rotation_euler", frame=frame, group=name)
                bone.keyframe_insert("scale", frame=frame, group=name)
        track = armature.animation_data.nla_tracks.new()
        track.name = clip
        strip = track.strips.new(clip, 1, action)
        strip.name = clip
        track.mute = True
        armature.animation_data.action = None
    clear_pose(armature)


def author_root_lunge(root):
    original = root.location.copy()
    root.animation_data_create()
    action = bpy.data.actions.new("Lunge__" + root.name)
    root.animation_data.action = action
    for seconds, position in [(0.0, (0, 0, 0)), (0.10, (0, 0.12, 0.38)),
                              (0.34, (0, 1.15, 5.4))]:
        root.location = v(position)
        root.keyframe_insert("location", frame=1 + round(seconds * 30))
    track = root.animation_data.nla_tracks.new()
    track.name = "Lunge"
    strip = track.strips.new("Lunge", 1, action)
    strip.name = "Lunge"
    track.mute = True
    root.animation_data.action = None
    root.location = original


def mesh_bounds(root):
    bpy.context.view_layer.update()
    points = [obj.matrix_world @ Vector(corner) for obj in root.children_recursive
              if obj.type == "MESH" for corner in obj.bound_box]
    low = Vector(tuple(min(point[index] for point in points) for index in range(3)))
    high = Vector(tuple(max(point[index] for point in points) for index in range(3)))
    return low, high


def fit_root(root):
    low, high = mesh_bounds(root)
    dimensions = high - low
    target = Vector((REQ["size"][0], REQ["size"][2], REQ["size"][1]))
    root.scale = tuple(root.scale[index] * target[index] / dimensions[index]
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


def validate_weights(meshes, armature, prefix=""):
    allowed = {prefix + name for name in BONE_NAMES}
    report = []
    for obj in meshes:
        names = {group.index: group.name for group in obj.vertex_groups}
        for vertex in obj.data.vertices:
            weights = [(names[item.group], item.weight) for item in vertex.groups
                       if item.group in names and item.weight > 1e-8]
            total = sum(weight for _, weight in weights)
            if not weights or not math.isfinite(total) or abs(total - 1.0) > 1e-4:
                raise RuntimeError(f"{obj.name} vertex {vertex.index}: invalid weights")
            if any(name not in allowed or not math.isfinite(weight) for name, weight in weights):
                raise RuntimeError(f"{obj.name} vertex {vertex.index}: invalid influence")
        report.append({"mesh": obj.name, "vertices": len(obj.data.vertices)})
    if len(armature.data.bones) != 17:
        raise RuntimeError(f"{armature.name}: expected 17 bones, found {len(armature.data.bones)}")
    return report


def action_fcurves(action):
    if hasattr(action, "fcurves"):
        return list(action.fcurves)
    curves = []
    for layer in action.layers:
        for strip in layer.strips:
            for channel_bag in strip.channelbags:
                curves.extend(channel_bag.fcurves)
    return curves


def mute_actions(objects):
    for obj in objects:
        data = obj.animation_data
        if not data:
            continue
        data.action = None
        for track in data.nla_tracks:
            track.mute = True


def set_clip(objects, clip):
    for obj in objects:
        data = obj.animation_data
        if not data:
            continue
        data.action = None
        data.use_nla = True
        for track in data.nla_tracks:
            track.is_solo = False
            track.mute = track.name != clip


def evaluated_coordinates(meshes, dependency_graph):
    values = []
    for obj in meshes:
        evaluated = obj.evaluated_get(dependency_graph)
        mesh = evaluated.to_mesh()
        try:
            for vertex in mesh.vertices:
                point = evaluated.matrix_world @ vertex.co
                if not all(math.isfinite(value) for value in point):
                    raise RuntimeError(f"non-finite evaluated coordinate in {obj.name}")
                values.extend(point)
        finally:
            evaluated.to_mesh_clear()
    return values


def sample_animations(animated, meshes):
    scene = bpy.context.scene
    dependency_graph = bpy.context.evaluated_depsgraph_get()
    rest = {obj: (obj.location.copy(), obj.rotation_euler.copy(), obj.scale.copy())
            for obj in animated}
    report = {}
    for clip in REQ["clips"]:
        mute_actions(animated)
        for obj, (location, rotation, scale) in rest.items():
            obj.location, obj.rotation_euler, obj.scale = location.copy(), rotation.copy(), scale.copy()
            if obj.type == "ARMATURE":
                clear_pose(obj)
        set_clip(animated, clip)
        keyed_frames = {1}
        for obj in animated:
            if not obj.animation_data:
                continue
            for track in obj.animation_data.nla_tracks:
                if track.name == clip:
                    for strip in track.strips:
                        for curve in action_fcurves(strip.action):
                            keyed_frames.update(round(point.co.x) for point in curve.keyframe_points)
        frames = sorted(keyed_frames)
        baseline = None
        samples = []
        greatest_delta = 0.0
        for frame in frames:
            scene.frame_set(frame)
            bpy.context.view_layer.update()
            values = evaluated_coordinates(meshes, dependency_graph)
            if baseline is None:
                baseline = values
            delta = max(abs(a - b) for a, b in zip(values, baseline))
            greatest_delta = max(greatest_delta, delta)
            samples.append({"frame": frame, "coordinateCount": len(values),
                            "maxAbs": round(max(abs(value) for value in values), 6),
                            "maxDeltaFromFirst": round(delta, 6)})
        if greatest_delta <= 1e-5:
            raise RuntimeError(f"{clip}: evaluated mesh does not move")
        report[clip] = samples
    mute_actions(animated)
    for obj, (location, rotation, scale) in rest.items():
        obj.location, obj.rotation_euler, obj.scale = location.copy(), rotation.copy(), scale.copy()
        if obj.type == "ARMATURE":
            clear_pose(obj)
    scene.frame_set(1)
    bpy.context.view_layer.update()
    return report


def validate_loops(armatures):
    report = {}
    for clip in LOOPING_CLIPS:
        differences = []
        for armature in armatures:
            track = next(track for track in armature.animation_data.nla_tracks
                         if track.name == clip)
            action = track.strips[0].action
            for curve in action_fcurves(action):
                differences.append(abs(curve.evaluate(action.frame_range[0]) -
                                       curve.evaluate(action.frame_range[1])))
        maximum = max(differences, default=0.0)
        if maximum > 1e-5:
            raise RuntimeError(f"{clip}: loop closure delta {maximum}")
        report[clip] = {"maxChannelDelta": maximum}
    return report


def validate_root_motion(roots):
    report = {}
    for root in roots:
        tracks = [track.name for track in root.animation_data.nla_tracks]
        if tracks != ["Lunge"]:
            raise RuntimeError(f"{root.name}: root tracks must be Lunge only, found {tracks}")
        action = root.animation_data.nla_tracks[0].strips[0].action
        delta = []
        curves = action_fcurves(action)
        for index in range(3):
            curve = next(curve for curve in curves
                         if curve.data_path == "location" and curve.array_index == index)
            delta.append(curve.evaluate(action.frame_range[1]) -
                         curve.evaluate(action.frame_range[0]))
        if Vector(delta).length <= 0.1 or not all(math.isfinite(value) for value in delta):
            raise RuntimeError(f"{root.name}: invalid Lunge root motion {delta}")
        report[root.name] = {"tracks": tracks, "blenderDelta": delta}
    return report


def ground_report(root):
    results = {}
    for leg in LEG_IDS:
        foot = bpy.data.objects[("" if root.name == "LOD0" else "LOD1.") + f"Leg.{leg}.Foot"]
        points = [foot.matrix_world @ Vector(corner) for corner in foot.bound_box]
        game_y_min = min(point.z for point in points)
        results[leg] = round(game_y_min, 6)
        if abs(game_y_min) > 0.03:
            raise RuntimeError(f"{root.name} {leg} foot is not grounded: {game_y_min}")
    return results


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
    if not scene.world:
        world = bpy.data.worlds.new("Crag Tortoise Scaffold Studio")
        world.use_nodes = True
        world.node_tree.nodes["Background"].inputs[0].default_value = (0.32, 0.34, 0.39, 1)
        world.node_tree.nodes["Background"].inputs[1].default_value = 0.72
        scene.world = world
        for offset, energy, color in [
            ((1.0, -1.2, 1.25), 5.0, (0.84, 0.76, 1.0)),
            ((-0.9, 0.2, 0.55), 2.6, (0.46, 0.52, 0.80)),
        ]:
            bpy.ops.object.light_add(type="AREA", location=center + Vector(offset) * span)
            light = bpy.context.object
            light.data.energy = energy * span * span * 3
            light.data.size = span
            light.data.color = color
            light.rotation_euler = (center - light.location).to_track_quat("-Z", "Y").to_euler()
    bpy.ops.object.camera_add(location=center + Vector((0.95, -1.30, 0.64)) * span)
    camera = bpy.context.object
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = span * 1.25
    camera.data.clip_end = span * 20
    scene.camera = camera
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1000
    scene.render.resolution_y = 760
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(output)
    scene.view_settings.look = "AgX - Medium High Contrast"
    bpy.ops.render.render(write_still=True)


def full_candidate():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    c = Context(REQ)
    c.root["authoring"] = "mechanical skeletal scaffold; not art delivery"
    c.root["reference"] = "design/references/enemies/cragTortoise-turnaround.png"
    c.root["axisContract"] = "+Y up, +Z forward"
    c.root["landings"] = "[]"
    hide = c.material("Tortoise.PaintedHide", (0.14, 0.115, 0.18),
                      TEXTURES / "creatures/shadow-hide.png")
    shell = c.material("Tortoise.ScaffoldShell", (0.065, 0.055, 0.085))
    edge = c.material("Tortoise.VioletEdge", (0.30, 0.13, 0.45))
    ivory = c.material("Tortoise.IvoryBelly", (0.88, 0.79, 0.58))
    mouth = c.material("Tortoise.Mouth", (0.34, 0.08, 0.055))
    materials = {"hide": hide, "shell": shell, "edge": edge,
                 "ivory": ivory, "mouth": mouth}

    arm0, meshes0 = build_lod(c, c.root, 0, materials)
    lod1 = bpy.data.objects.new("LOD1", None)
    bpy.context.collection.objects.link(lod1)
    lod1["lod"] = 1
    lod1["request"] = REQ["request"]
    lod1["authoring"] = c.root["authoring"]
    arm1, meshes1 = build_lod(c, lod1, 1, materials)

    bone_socket(c, "Core", (0, 0.60, -0.10), arm0, "Spine.0")
    bone_socket(c, "Mouth", (0, 0.90, 4.02), arm0, "Head")
    bone_socket(c, "Hitbox.Shell", (0, 2.65, -0.20), arm0, "Shell")
    bone_socket(c, "Hitbox.Body", (0, 1.20, 0.0), arm0, "Spine.0")

    author_actions(arm0)
    author_actions(arm1, "LOD1.")
    author_root_lunge(c.root)
    author_root_lunge(lod1)
    c.clips.update(REQ["clips"])
    bounds0, bounds1 = fit_root(c.root), fit_root(lod1)
    triangles = [count_triangles(c.root), count_triangles(lod1)]
    if triangles[0] > 7000 or triangles[1] > 2000:
        raise RuntimeError(f"triangle budget exceeded: {triangles}")

    weights = {"LOD0": validate_weights(meshes0, arm0),
               "LOD1": validate_weights(meshes1, arm1, "LOD1.")}
    animated = [c.root, lod1, arm0, arm1]
    samples = sample_animations(animated, [*meshes0, *meshes1])
    loops = validate_loops([arm0, arm1])
    root_motion = validate_root_motion([c.root, lod1])
    grounding = {"LOD0": ground_report(c.root), "LOD1": ground_report(lod1)}

    WORK.mkdir(parents=True, exist_ok=True)
    qa = {
        "bones": {"LOD0": [bone.name for bone in arm0.data.bones],
                  "LOD1": [bone.name for bone in arm1.data.bones]},
        "weights": weights, "animationSamples": samples,
        "loopClosure": loops, "rootMotion": root_motion, "grounding": grounding,
        "bounds": {"LOD0": bounds0, "LOD1": bounds1}, "triangles": triangles,
    }
    (WORK / "rig-qa.json").write_text(json.dumps(qa, indent=2) + "\n")

    saved = capture_transforms()
    raw = WORK / "cragTortoise-uncompressed.glb"
    output = WORK / "cragTortoise.glb"
    bpy.ops.object.select_all(action="DESELECT")
    for obj in [c.root, *c.root.children_recursive, lod1, *lod1.children_recursive]:
        obj.select_set(True)
    scene = bpy.context.scene
    scene.render.fps = 30
    scene.frame_set(1)
    bpy.ops.export_scene.gltf(
        filepath=str(raw), export_format="GLB", use_selection=True,
        export_animations=True, export_animation_mode="NLA_TRACKS",
        export_nla_strips_merged_animation_name="Animation", export_extras=True,
        export_apply=True, export_materials="EXPORT", export_yup=True,
        export_skins=True, export_all_influences=True,
    )
    node = shutil.which("node")
    if not node:
        raise RuntimeError("Node.js is required for the offline gltfpack wrapper")
    subprocess.run([node, str(HERE / "compress.mjs"), str(raw), str(output), "--force"],
                   check=True)
    mute_actions(animated)
    clear_pose(arm0)
    clear_pose(arm1)
    restore_transforms(saved)
    for obj in [lod1, *lod1.children_recursive]:
        obj.hide_render = True
    rest_preview = WORK / "preview-scaffold.png"
    render_preview(c.root, rest_preview)
    set_clip(animated, "Lunge_Tell")
    scene.frame_set(20)
    bpy.context.view_layer.update()
    render_preview(c.root, WORK / "preview-belly-tell.png")
    mute_actions(animated)
    clear_pose(arm0)
    clear_pose(arm1)
    restore_transforms(saved)
    bpy.ops.wm.save_as_mainfile(filepath=str(WORK / "cragTortoise.blend"), compress=True)

    record = {
        "request": REQ["request"], "name": REQ["name"],
        "file": str(output.relative_to(ROOT)),
        "preview": str(rest_preview.relative_to(ROOT)),
        "category": "enemy", "region": "mountains",
        "source": "hopper/3d/models/source/crag_tortoise.py",
        "bounds": [round(value, 6) for value in bounds0],
        "targetBounds": REQ["size"], "triangles": triangles,
        "clips": REQ["clips"], "sockets": REQ["sockets"], "landings": [],
        "status": "mechanical-rig-scaffold-awaiting-art-refinement",
        "sourceReference": "design/references/enemies/cragTortoise-turnaround.png",
    }
    (WORK / "record.json").write_text(json.dumps(record, indent=2) + "\n")
    (WORK / "manifest.json").write_text(
        json.dumps({"version": 1, "models": [record]}, indent=2) + "\n")
    print("CRAG_TORTOISE_SCAFFOLD_DONE", bounds0, bounds1, triangles, output, flush=True)


if __name__ == "__main__":
    mode = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "full"
    if mode != "full":
        raise RuntimeError("mode must be full")
    full_candidate()
