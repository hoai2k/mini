"""Mechanical M-011 Chain Manta rig scaffold for later art refinement.

The placeholder proves the requested 18-bone skeletal hierarchy, paired chain
deformation, clips, sockets, exact bounds, and LOD budgets. It is not creature
art and must not be copied to production as a finished asset.

Run from the repository root:
  blender --background --python hopper/3d/models/source/chain_manta.py -- full
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


WORK = ROOT / "local/hopper-rigid-creatures/M-011"
REQ = {
    "request": "M-011",
    "name": "Chain Manta",
    "category": "enemy",
    "rig": "skeletal",
    "size": [14.2, 7.3, 7.6],
    "tris": "6k / 2k",
    "standIn": "enemy.chainManta",
    "final": "models/enemies/chainManta.glb",
    "region": "harbor",
    "clips": ["Soar", "Tether_Tell", "Tether_Pull", "Release", "Bank",
              "Hit", "Dissolve"],
    "sockets": ["Core", "TetherNode", "Hook.L", "Hook.R", "Hitbox.Body",
                "Landing"],
}

WING_BONES = [f"Wing.{side}.{joint}" for side in ("L", "R") for joint in range(3)]
TAIL_BONES = [f"Tail.{joint}" for joint in range(3)]
TETHER_BONES = [f"Tether.{joint}" for joint in range(6)]
BONE_NAMES = ["Body", *WING_BONES, "HookJoint.L", "HookJoint.R", *TAIL_BONES,
              *TETHER_BONES]
LOOPING_CLIPS = {"Soar"}


def make_armature(name, root, prefix=""):
    data = bpy.data.armatures.new(name + ".Data")
    armature = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(armature)
    armature.parent = root
    armature.show_in_front = True
    armature["rigType"] = "chain-manta skeletal motion scaffold"

    bpy.context.view_layer.objects.active = armature
    armature.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    body = data.edit_bones.new(prefix + "Body")
    body.head, body.tail = v((0, 4.45, -0.72)), v((0, 4.45, 1.82))

    for side, sign in (("L", -1), ("R", 1)):
        points = [(0.65 * sign, 4.45, 0.62), (2.35 * sign, 4.43, 0.25),
                  (4.55 * sign, 4.40, 0.08), (6.65 * sign, 4.34, 0.48)]
        previous = None
        for joint in range(3):
            bone = data.edit_bones.new(prefix + f"Wing.{side}.{joint}")
            bone.head, bone.tail = v(points[joint]), v(points[joint + 1])
            bone.parent = body if previous is None else previous
            bone.use_connect = previous is not None
            previous = bone

    tail_points = [(0, 4.38, -0.58), (0, 4.34, -1.18),
                   (0, 4.22, -1.78), (0, 4.06, -2.38)]
    previous = None
    for joint in range(3):
        bone = data.edit_bones.new(prefix + f"Tail.{joint}")
        bone.head, bone.tail = v(tail_points[joint]), v(tail_points[joint + 1])
        bone.parent = body if previous is None else previous
        bone.use_connect = previous is not None
        previous = bone

    tether_points = [(0, 4.05, -0.82), (0, 3.55, -1.55),
                     (0, 2.88, -2.30), (0, 2.15, -3.08),
                     (0, 1.52, -3.82), (0, 1.02, -4.50),
                     (0, 0.72, -5.18)]
    previous = None
    for joint in range(6):
        bone = data.edit_bones.new(prefix + f"Tether.{joint}")
        bone.head, bone.tail = v(tether_points[joint]), v(tether_points[joint + 1])
        bone.parent = body if previous is None else previous
        bone.use_connect = previous is not None
        previous = bone

    for side, sign in (("L", -1), ("R", 1)):
        hook = data.edit_bones.new(prefix + f"HookJoint.{side}")
        hook.head = v((0.64 * sign, 0.72, -5.18))
        hook.tail = v((0.84 * sign, 0.70, -5.72))
        hook.parent = previous

    for bone in data.edit_bones:
        bone.use_deform = True
    bpy.ops.object.mode_set(mode="OBJECT")
    armature.select_set(False)
    return armature


def add_skin(obj, assignments, armature, prefix=""):
    groups = {name: obj.vertex_groups.new(name=prefix + name) for name in BONE_NAMES}
    for vertex_index, influences in enumerate(assignments):
        total = sum(weight for _, weight in influences)
        if not math.isfinite(total) or total <= 0:
            raise RuntimeError(f"{obj.name} vertex {vertex_index}: invalid weights")
        for name, weight in influences:
            groups[name].add([vertex_index], weight / total, "REPLACE")
    world = obj.matrix_world.copy()
    obj.parent = armature
    obj.matrix_world = world
    modifier = obj.modifiers.new("ChainManta.Skin", "ARMATURE")
    modifier.object = armature
    modifier.use_vertex_groups = True
    modifier.use_bone_envelopes = False
    return obj


def rigid_skin(obj, armature, bone_name, prefix=""):
    return add_skin(obj, [[(bone_name, 1.0)] for _ in obj.data.vertices],
                    armature, prefix)


def prism_mesh(c, name, outline, heights, material, root):
    bottom, top = heights
    verts = [(x, bottom, z) for x, z in outline] + [(x, top, z) for x, z in outline]
    count = len(outline)
    faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
    for index in range(count):
        nxt = (index + 1) % count
        faces.append((index, nxt, count + nxt, count + index))
    return c.mesh(name, verts, faces, material, root), verts


def wing_influences(side, x_value):
    distance = abs(x_value)
    side_name = "L" if side < 0 else "R"
    if distance <= 1.0:
        alpha = max(0.0, min(1.0, (distance - 0.55) / 0.45))
        return [("Body", 1.0 - alpha), (f"Wing.{side_name}.0", alpha)]
    if distance <= 2.6:
        return [(f"Wing.{side_name}.0", 1.0)]
    if distance <= 4.6:
        alpha = (distance - 2.6) / 2.0
        return [(f"Wing.{side_name}.0", 1.0 - alpha),
                (f"Wing.{side_name}.1", alpha)]
    alpha = min(1.0, (distance - 4.6) / 2.05)
    return [(f"Wing.{side_name}.1", 1.0 - alpha),
            (f"Wing.{side_name}.2", alpha)]


def build_body(c, prefix, root, armature, materials, lod):
    outline = [(0, 2.12), (1.05, 1.40), (1.30, 0.35), (0.92, -0.72),
               (0, -1.05), (-0.92, -0.72), (-1.30, 0.35), (-1.05, 1.40)]
    body, verts = prism_mesh(c, prefix + "Body.Placeholder", outline,
                             (4.03, 4.78), materials["hide"], root)
    add_skin(body, [[("Body", 1.0)] for _ in verts], armature, prefix)
    meshes = [body]
    eye = c.sphere(prefix + "Eye.Placeholder", (0, 4.33, 1.66),
                   (1.15, 0.20, 0.62), materials["ivory"],
                   12 if lod == 0 else 8, 6 if lod == 0 else 4, root)
    meshes.append(rigid_skin(eye, armature, "Body", prefix))
    pupil = c.sphere(prefix + "Eye.Pupil", (0, 4.205, 1.72),
                     (0.18, 0.07, 0.38), materials["ink"],
                     8 if lod == 0 else 6, 5 if lod == 0 else 4, root)
    meshes.append(rigid_skin(pupil, armature, "Body", prefix))
    core = c.sphere(prefix + "Core.Proxy", (0, 4.91, -0.10),
                    (0.78, 0.28, 0.78), materials["core"],
                    10 if lod == 0 else 7, 6 if lod == 0 else 4, root)
    meshes.append(rigid_skin(core, armature, "Body", prefix))
    return meshes


def build_wing(c, prefix, side_name, root, armature, materials, lod):
    sign = -1 if side_name == "L" else 1
    points = [(0.65 * sign, 1.52), (2.10 * sign, 1.86),
              (4.12 * sign, 1.55), (6.65 * sign, 1.15),
              (5.35 * sign, 0.20), (6.15 * sign, -0.82),
              (4.05 * sign, -0.45), (2.20 * sign, -0.88),
              (0.82 * sign, -0.55)]
    if lod == 1:
        points = [points[index] for index in (0, 2, 3, 4, 5, 6, 8)]
    wing, verts = prism_mesh(c, prefix + f"Wing.{side_name}.Skinned", points,
                             (4.12, 4.55), materials["shell"], root)
    add_skin(wing, [wing_influences(sign, x) for x, _, _ in verts],
             armature, prefix)
    return wing


def tail_influence(z_value):
    if z_value >= -1.18:
        return [("Tail.0", 1.0)]
    if z_value >= -1.78:
        alpha = (-z_value - 1.18) / 0.60
        return [("Tail.0", 1.0 - alpha), ("Tail.1", alpha)]
    alpha = min(1.0, (-z_value - 1.78) / 0.65)
    return [("Tail.1", 1.0 - alpha), ("Tail.2", alpha)]


def build_tail(c, prefix, root, armature, materials, lod):
    outline = [(0, -0.55), (0.48, -1.02), (0.32, -1.55),
               (0.12, -2.42), (0, -2.72), (-0.12, -2.42),
               (-0.32, -1.55), (-0.48, -1.02)]
    if lod == 1:
        outline = [outline[index] for index in (0, 1, 3, 4, 5, 7)]
    tail, verts = prism_mesh(c, prefix + "Tail.Skinned", outline,
                             (4.08, 4.48), materials["edge"], root)
    add_skin(tail, [tail_influence(z_value) for _, _, z_value in verts],
             armature, prefix)
    return tail


def tube_mesh(c, name, points, radius, sides, material, root):
    verts = []
    assignments = []
    for ring, point in enumerate(points):
        for side in range(sides):
            angle = math.tau * side / sides
            verts.append((point[0] + radius * math.cos(angle),
                          point[1] + radius * math.sin(angle), point[2]))
            bone_index = min(5, max(0, ring - 1))
            assignments.append([(f"Tether.{bone_index}", 1.0)])
    faces = []
    for ring in range(len(points) - 1):
        a, b = ring * sides, (ring + 1) * sides
        for side in range(sides):
            nxt = (side + 1) % sides
            faces.append((a + side, a + nxt, b + nxt, b + side))
    faces.extend([tuple(reversed(range(sides))),
                  tuple(range((len(points) - 1) * sides, len(points) * sides))])
    return c.mesh(name, verts, faces, material, root), assignments


def build_tethers(c, prefix, root, armature, materials, lod):
    center_points = [(4.05, -0.82), (3.55, -1.55), (2.88, -2.30),
                     (2.15, -3.08), (1.52, -3.82), (1.02, -4.50),
                     (0.72, -5.18)]
    meshes = []
    for side_name, sign in (("L", -1), ("R", 1)):
        points = [(0.62 * sign, y, z) for y, z in center_points]
        tube, weights = tube_mesh(c, prefix + f"Tether.{side_name}.Skinned",
                                  points, 0.115 if lod == 0 else 0.13,
                                  6 if lod == 0 else 4, materials["chain"], root)
        meshes.append(add_skin(tube, weights, armature, prefix))
        for index, point in enumerate(points[:-1]):
            if lod == 1 and index % 2:
                continue
            collar = c.torus(prefix + f"Tether.{side_name}.Link.{index}", point,
                             0.19, 0.055, materials["edge"], axis="z", parent=root)
            meshes.append(rigid_skin(collar, armature, f"Tether.{index}", prefix))
    return meshes


def build_hooks(c, prefix, root, armature, materials, lod):
    meshes = []
    for side_name, sign in (("L", -1), ("R", 1)):
        x = 0.72 * sign
        outline = [(x, -5.02), (x + 0.72 * sign, -5.34),
                   (x + 0.34 * sign, -5.58), (x + 0.58 * sign, -6.04),
                   (x, -5.76), (x - 0.58 * sign, -6.04),
                   (x - 0.34 * sign, -5.55), (x - 0.70 * sign, -5.32)]
        if lod == 1:
            outline = [outline[index] for index in (0, 1, 3, 4, 5, 7)]
        hook, _ = prism_mesh(c, prefix + f"Hook.{side_name}.Placeholder", outline,
                             (0.42, 1.02), materials["shell"], root)
        meshes.append(rigid_skin(hook, armature, f"HookJoint.{side_name}", prefix))
    return meshes


def build_lod(c, root, lod, materials):
    prefix = "" if lod == 0 else "LOD1."
    armature = make_armature(prefix + "Rig", root, prefix)
    meshes = build_body(c, prefix, root, armature, materials, lod)
    meshes.append(build_wing(c, prefix, "L", root, armature, materials, lod))
    meshes.append(build_wing(c, prefix, "R", root, armature, materials, lod))
    meshes.append(build_tail(c, prefix, root, armature, materials, lod))
    meshes.extend(build_tethers(c, prefix, root, armature, materials, lod))
    meshes.extend(build_hooks(c, prefix, root, armature, materials, lod))
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
    wing_side = -1 if ".L." in name else 1
    wing_joint = int(name.rsplit(".", 1)[1]) if name.startswith("Wing.") else None
    tether_joint = int(name.rsplit(".", 1)[1]) if name.startswith("Tether.") else None
    tail_joint = int(name.rsplit(".", 1)[1]) if name.startswith("Tail.") else None
    if clip == "Soar":
        wave = math.sin(phase * math.tau)
        if name.startswith("Wing."):
            rotation[1] = wing_side * wave * (0.055 + 0.025 * wing_joint)
        elif name.startswith("Tail."):
            rotation[2] = wave * (0.025 + 0.018 * tail_joint)
        elif name.startswith("Tether."):
            rotation[2] = math.sin(phase * math.tau - tether_joint * 0.38) * 0.035
    elif clip == "Tether_Tell":
        ease = math.sin(phase * math.pi * 0.5)
        if name.startswith("Wing."):
            rotation[1] = wing_side * (0.12 + 0.055 * wing_joint) * ease
        elif name.startswith("Tail."):
            rotation[0] = -0.09 * (tail_joint + 1) * ease
        elif name.startswith("Tether."):
            rotation[0] = (0.22 - tether_joint * 0.035) * (1.0 - ease)
            rotation[2] = (-1 if tether_joint % 2 else 1) * 0.10 * (1.0 - ease)
        elif name.startswith("HookJoint."):
            rotation[1] = (0.28 if name.endswith("L") else -0.28) * ease
    elif clip == "Tether_Pull":
        brace = math.sin(phase * math.pi)
        if name.startswith("Wing."):
            rotation[1] = -wing_side * (0.16 + 0.07 * wing_joint)
            rotation[0] = 0.035 * brace
        elif name == "Body":
            rotation[0] = -0.055 * brace
        elif name.startswith("Tether."):
            rotation[0] = -0.08 * tether_joint + 0.10 * brace
            rotation[2] = (0.045 + 0.008 * tether_joint) * brace
        elif name.startswith("HookJoint."):
            rotation[1] = (0.12 if name.endswith("L") else -0.12) * brace
    elif clip == "Release":
        snap = math.sin(phase * math.pi)
        if name.startswith("Tether."):
            rotation[0] = (0.12 + 0.035 * tether_joint) * snap
            rotation[2] = (-1 if tether_joint % 2 else 1) * 0.08 * snap
        elif name.startswith("HookJoint."):
            rotation[1] = (0.52 if name.endswith("L") else -0.52) * snap
        elif name.startswith("Wing."):
            rotation[1] = wing_side * 0.08 * snap
    elif clip == "Bank":
        bank = math.sin(phase * math.pi)
        if name == "Body":
            rotation[2] = 0.28 * bank
        elif name.startswith("Wing."):
            rotation[1] = wing_side * 0.14 * bank + 0.07 * bank
        elif name.startswith("Tail.") or name.startswith("Tether."):
            rotation[2] = -0.08 * bank
    elif clip == "Hit":
        impulse = math.sin(phase * math.pi)
        if name == "Body":
            rotation[2] = -0.26 * impulse
        elif name.startswith("Wing."):
            rotation[1] = -wing_side * 0.18 * impulse
        elif name.startswith("Tail.") or name.startswith("Tether."):
            rotation[2] = 0.14 * impulse
    elif clip == "Dissolve":
        shrink = max(0.04, 1.0 - phase * 0.92)
        scale = [shrink, shrink, shrink]
    return rotation, scale


def author_actions(armature, prefix=""):
    durations = {"Soar": 1.2, "Tether_Tell": 0.65, "Tether_Pull": 0.9,
                 "Release": 0.55, "Bank": 0.7, "Hit": 0.42,
                 "Dissolve": 0.85}
    counts = {"Soar": 5, "Tether_Pull": 5}
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
    if len(armature.data.bones) != len(BONE_NAMES):
        raise RuntimeError(f"{armature.name}: expected {len(BONE_NAMES)} bones")
    return report


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
        baseline = None
        greatest_delta = 0.0
        samples = []
        for frame in sorted(keyed_frames):
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


def validate_loop_closure(armatures):
    report = {}
    for clip in LOOPING_CLIPS:
        differences = []
        for armature in armatures:
            track = next(track for track in armature.animation_data.nla_tracks
                         if track.name == clip)
            for curve in action_fcurves(track.strips[0].action):
                differences.append(abs(curve.evaluate(curve.range()[0]) -
                                       curve.evaluate(curve.range()[1])))
        maximum = max(differences, default=0.0)
        if maximum > 1e-5:
            raise RuntimeError(f"{clip}: loop closure delta {maximum}")
        report[clip] = {"maxChannelDelta": maximum}
    return report


def validate_chain_motion(armatures):
    report = {}
    for armature in armatures:
        track = next(track for track in armature.animation_data.nla_tracks
                     if track.name == "Tether_Pull")
        curves = action_fcurves(track.strips[0].action)
        bone_report = {}
        prefix = "LOD1." if armature.name.startswith("LOD1.") else ""
        for name in TETHER_BONES:
            token = f'pose.bones["{prefix + name}"]'
            matched = [curve for curve in curves
                       if curve.data_path.startswith(token) and
                       curve.data_path.endswith("rotation_euler")]
            spread = max((max(point.co.y for point in curve.keyframe_points) -
                          min(point.co.y for point in curve.keyframe_points)
                          for curve in matched), default=0.0)
            if not math.isfinite(spread) or spread <= 0.01:
                raise RuntimeError(f"{armature.name} {name}: no verified chain motion")
            bone_report[prefix + name] = round(spread, 6)
        report[armature.name] = bone_report
    return report


def validate_static_roots(roots):
    report = {}
    for root in roots:
        tracks = [] if not root.animation_data else [track.name for track in root.animation_data.nla_tracks]
        if tracks:
            raise RuntimeError(f"{root.name}: unexpected root motion tracks {tracks}")
        report[root.name] = {"tracks": tracks}
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
    if not scene.world:
        world = bpy.data.worlds.new("Chain Manta Scaffold Studio")
        world.use_nodes = True
        world.node_tree.nodes["Background"].inputs[0].default_value = (0.32, 0.34, 0.39, 1)
        world.node_tree.nodes["Background"].inputs[1].default_value = 0.72
        scene.world = world
        for offset, energy, color in [
            ((0.9, -1.2, 1.25), 5.0, (0.84, 0.77, 1.0)),
            ((-0.8, 0.3, 0.55), 2.7, (0.44, 0.52, 0.82)),
        ]:
            bpy.ops.object.light_add(type="AREA", location=center + Vector(offset) * span)
            light = bpy.context.object
            light.data.energy = energy * span * span * 3
            light.data.size = span
            light.data.color = color
            light.rotation_euler = (center - light.location).to_track_quat("-Z", "Y").to_euler()
    bpy.ops.object.camera_add(location=center + Vector((0.92, -1.32, 0.96)) * span)
    camera = bpy.context.object
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = span * 1.24
    camera.data.clip_end = span * 20
    scene.camera = camera
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1100
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
    c.root["reference"] = "design/references/enemies/chainManta-turnaround.png"
    c.root["axisContract"] = "+Y up, +Z forward"
    c.root["rigInterpretation"] = "paired chain meshes share requested six-bone tether spline"
    c.root["landings"] = "[]"
    hide = c.material("ChainManta.PaintedHide", (0.13, 0.10, 0.18),
                      TEXTURES / "creatures/shadow-hide.png")
    shell = c.material("ChainManta.ScaffoldShell", (0.055, 0.045, 0.075))
    edge = c.material("ChainManta.VioletEdge", (0.31, 0.13, 0.47))
    ivory = c.material("ChainManta.IvoryEye", (0.93, 0.84, 0.60), emission=0.20)
    ink = c.material("ChainManta.Ink", (0.012, 0.008, 0.020))
    chain = c.material("ChainManta.Chain", (0.12, 0.13, 0.16))
    core = c.material("ChainManta.Core", (0.52, 0.14, 0.88), emission=1.4)
    materials = {"hide": hide, "shell": shell, "edge": edge,
                 "ivory": ivory, "ink": ink, "chain": chain, "core": core}

    arm0, meshes0 = build_lod(c, c.root, 0, materials)
    lod1 = bpy.data.objects.new("LOD1", None)
    bpy.context.collection.objects.link(lod1)
    lod1["lod"] = 1
    lod1["request"] = REQ["request"]
    lod1["authoring"] = c.root["authoring"]
    arm1, meshes1 = build_lod(c, lod1, 1, materials)

    bone_socket(c, "Core", (0, 5.03, -0.10), arm0, "Body")
    bone_socket(c, "TetherNode", (0, 0.72, -5.18), arm0, "Tether.5")
    bone_socket(c, "Hook.L", (-0.76, 0.70, -5.50), arm0, "HookJoint.L")
    bone_socket(c, "Hook.R", (0.76, 0.70, -5.50), arm0, "HookJoint.R")
    bone_socket(c, "Hitbox.Body", (0, 4.38, 0.35), arm0, "Body")
    bone_socket(c, "Landing", (0, 5.15, 0.05), arm0, "Body")

    author_actions(arm0)
    author_actions(arm1, "LOD1.")
    c.clips.update(REQ["clips"])
    bounds0, bounds1 = fit_root(c.root), fit_root(lod1)
    triangles = [count_triangles(c.root), count_triangles(lod1)]
    if triangles[0] > 6000 or triangles[1] > 2000:
        raise RuntimeError(f"triangle budget exceeded: {triangles}")

    weights = {"LOD0": validate_weights(meshes0, arm0),
               "LOD1": validate_weights(meshes1, arm1, "LOD1.")}
    animated = [c.root, lod1, arm0, arm1]
    samples = sample_animations(animated, [*meshes0, *meshes1])
    loops = validate_loop_closure([arm0, arm1])
    chain_motion = validate_chain_motion([arm0, arm1])
    root_motion = validate_static_roots([c.root, lod1])

    WORK.mkdir(parents=True, exist_ok=True)
    qa = {
        "bones": {"LOD0": [bone.name for bone in arm0.data.bones],
                  "LOD1": [bone.name for bone in arm1.data.bones]},
        "weights": weights, "animationSamples": samples,
        "loopClosure": loops, "chainMotion": chain_motion,
        "rootMotion": root_motion,
        "bounds": {"LOD0": bounds0, "LOD1": bounds1}, "triangles": triangles,
    }
    (WORK / "rig-qa.json").write_text(json.dumps(qa, indent=2) + "\n")

    saved = capture_transforms()
    raw = WORK / "chainManta-uncompressed.glb"
    output = WORK / "chainManta.glb"
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
    set_clip(animated, "Tether_Pull")
    scene.frame_set(14)
    bpy.context.view_layer.update()
    render_preview(c.root, WORK / "preview-tether-pull.png")
    mute_actions(animated)
    clear_pose(arm0)
    clear_pose(arm1)
    restore_transforms(saved)
    bpy.ops.wm.save_as_mainfile(filepath=str(WORK / "chainManta.blend"), compress=True)

    record = {
        "request": REQ["request"], "name": REQ["name"],
        "file": str(output.relative_to(ROOT)),
        "preview": str(rest_preview.relative_to(ROOT)),
        "category": "enemy", "region": "harbor",
        "source": "hopper/3d/models/source/chain_manta.py",
        "bounds": [round(value, 6) for value in bounds0],
        "targetBounds": REQ["size"], "triangles": triangles,
        "clips": REQ["clips"], "sockets": REQ["sockets"], "landings": [],
        "status": "mechanical-rig-scaffold-awaiting-art-refinement",
        "sourceReference": "design/references/enemies/chainManta-turnaround.png",
    }
    (WORK / "record.json").write_text(json.dumps(record, indent=2) + "\n")
    (WORK / "manifest.json").write_text(
        json.dumps({"version": 1, "models": [record]}, indent=2) + "\n")
    print("CHAIN_MANTA_SCAFFOLD_DONE", bounds0, bounds1, triangles, output, flush=True)


if __name__ == "__main__":
    mode = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "full"
    if mode != "full":
        raise RuntimeError("mode must be full")
    full_candidate()
