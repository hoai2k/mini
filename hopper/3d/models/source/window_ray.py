"""Mechanical M-005 Window Ray skeletal scaffold for later art refinement.

The placeholder proves skinning, pivots, clips, sockets, root motion, and LOD
contracts. It deliberately avoids final armour and surface authoring.

Run from the repository root:
  blender --background --python hopper/3d/models/source/window_ray.py -- full
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


WORK = ROOT / "local/hopper-rigid-creatures/M-005"
REQ = {
    "request": "M-005",
    "name": "Window Ray",
    "category": "enemy",
    "rig": "skeletal",
    "size": [11.0, 0.9, 6.3],
    "tris": "4k / 1.2k",
    "standIn": "enemy.windowRay",
    "final": "models/enemies/windowRay.glb",
    "region": "city",
    "clips": ["Hover", "Bank_L", "Bank_R", "Dive_Tell", "Dive",
              "Recover", "Hit", "Dissolve"],
    "sockets": ["Core", "Mouth", "Hitbox.Body", "Landing"],
}

BONE_NAMES = ["Body", "Wing.L.0", "Wing.L.1", "Wing.R.0", "Wing.R.1",
              "Tail.0", "Tail.1", "Eye"]
LOOPING_CLIPS = {"Hover"}


def make_armature(name, root, prefix=""):
    data = bpy.data.armatures.new(name + ".Data")
    armature = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(armature)
    armature.parent = root
    armature.show_in_front = True
    armature["rigType"] = "window-ray skeletal motion scaffold"

    bpy.context.view_layer.objects.active = armature
    armature.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")

    body = data.edit_bones.new(prefix + "Body")
    body.head = v((0, 0, -0.9))
    body.tail = v((0, 0, 1.9))
    body.use_deform = True

    for side, sign in (("L", -1), ("R", 1)):
        inner = data.edit_bones.new(prefix + f"Wing.{side}.0")
        inner.head = v((0.55 * sign, 0, 0.55))
        inner.tail = v((2.9 * sign, 0, 0.05))
        inner.parent = body
        inner.use_deform = True
        outer = data.edit_bones.new(prefix + f"Wing.{side}.1")
        outer.head = inner.tail
        outer.tail = v((5.5 * sign, 0, 0.28))
        outer.parent = inner
        outer.use_connect = True
        outer.use_deform = True

    tail0 = data.edit_bones.new(prefix + "Tail.0")
    tail0.head = v((0, 0, -0.72))
    tail0.tail = v((0, 0, -2.35))
    tail0.parent = body
    tail0.use_deform = True
    tail1 = data.edit_bones.new(prefix + "Tail.1")
    tail1.head = tail0.tail
    tail1.tail = v((0, 0, -4.10))
    tail1.parent = tail0
    tail1.use_connect = True
    tail1.use_deform = True

    eye = data.edit_bones.new(prefix + "Eye")
    eye.head = v((0, 0.12, 1.18))
    eye.tail = v((0, 0.12, 1.85))
    eye.parent = body
    eye.use_deform = True

    bpy.ops.object.mode_set(mode="OBJECT")
    armature.select_set(False)
    return armature


def armature_modifier(obj, armature):
    modifier = obj.modifiers.new("WindowRay.Skin", "ARMATURE")
    modifier.object = armature
    modifier.use_vertex_groups = True
    modifier.use_bone_envelopes = False


def assign_weights(obj, assignments, armature, prefix=""):
    groups = {name: obj.vertex_groups.new(name=prefix + name) for name in BONE_NAMES}
    for vertex_index, influences in enumerate(assignments):
        total = sum(weight for _, weight in influences)
        if not math.isfinite(total) or total <= 0:
            raise RuntimeError(f"{obj.name} vertex {vertex_index}: invalid weight total")
        for name, weight in influences:
            groups[name].add([vertex_index], weight / total, "REPLACE")
    armature_modifier(obj, armature)


def prism_mesh(c, name, outline, heights, material, root):
    bottom, top = heights
    verts = [(x, bottom, z) for x, z in outline] + [(x, top, z) for x, z in outline]
    count = len(outline)
    faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
    for index in range(count):
        nxt = (index + 1) % count
        faces.append((index, nxt, count + nxt, count + index))
    return c.mesh(name, verts, faces, material, root), verts


def build_body(c, prefix, root, armature, materials, lod):
    outline = [
        (0.0, 2.20), (0.82, 1.28), (1.18, 0.24), (0.72, -0.92),
        (0.0, -1.18), (-0.72, -0.92), (-1.18, 0.24), (-0.82, 1.28),
    ]
    obj, verts = prism_mesh(c, prefix + "Body.Placeholder", outline,
                            (-0.45, 0.45), materials["hide"], root)
    assign_weights(obj, [[("Body", 1.0)] for _ in verts], armature, prefix)
    return obj


def wing_influences(side, x_value):
    distance = abs(x_value)
    side_name = "L" if side < 0 else "R"
    if distance <= 1.05:
        alpha = max(0.0, min(1.0, (distance - 0.55) / 0.50))
        return [("Body", 1.0 - alpha), (f"Wing.{side_name}.0", alpha)]
    if distance <= 3.0:
        return [(f"Wing.{side_name}.0", 1.0)]
    alpha = min(1.0, (distance - 3.0) / 2.5)
    return [(f"Wing.{side_name}.0", 1.0 - alpha),
            (f"Wing.{side_name}.1", alpha)]


def build_wing(c, prefix, side_name, root, armature, materials, lod):
    sign = -1 if side_name == "L" else 1
    points = [
        (0.58 * sign, 1.28), (1.60 * sign, 1.62), (3.35 * sign, 1.28),
        (5.50 * sign, 1.05), (4.20 * sign, 0.18), (5.16 * sign, -1.02),
        (3.02 * sign, -0.55), (1.02 * sign, -0.88),
    ]
    if lod == 1:
        points = [points[index] for index in (0, 2, 3, 4, 5, 6, 7)]
    obj, verts = prism_mesh(c, prefix + f"Wing.{side_name}.Skinned", points,
                            (-0.15, 0.17), materials["shell"], root)
    assignments = [wing_influences(sign, x_value) for x_value, _, _ in verts]
    assign_weights(obj, assignments, armature, prefix)
    return obj


def tail_influences(z_value):
    if z_value >= -1.15:
        alpha = max(0.0, min(1.0, (-z_value - 0.72) / 0.43))
        return [("Body", 1.0 - alpha), ("Tail.0", alpha)]
    if z_value >= -2.35:
        return [("Tail.0", 1.0)]
    alpha = min(1.0, (-z_value - 2.35) / 1.75)
    return [("Tail.0", 1.0 - alpha), ("Tail.1", alpha)]


def build_tail(c, prefix, root, armature, materials, lod):
    widths = [0.28, 0.24, 0.18, 0.105, 0.035]
    z_values = [-0.78, -1.45, -2.35, -3.22, -4.10]
    if lod == 1:
        widths = [widths[index] for index in (0, 2, 4)]
        z_values = [z_values[index] for index in (0, 2, 4)]
    verts = []
    assignments = []
    for width, z_value in zip(widths, z_values):
        curve = 0.10 * math.sin((z_value + 0.78) * 1.35)
        for x_value, y_value in ((-width + curve, -0.07), (width + curve, -0.07),
                                 (width + curve, 0.07), (-width + curve, 0.07)):
            verts.append((x_value, y_value, z_value))
            assignments.append(tail_influences(z_value))
    faces = []
    for ring in range(len(z_values) - 1):
        a = ring * 4
        b = (ring + 1) * 4
        faces.extend([(a, a + 1, b + 1, b), (a + 1, a + 2, b + 2, b + 1),
                      (a + 2, a + 3, b + 3, b + 2), (a + 3, a, b, b + 3)])
    faces.extend([(0, 3, 2, 1), tuple(range(len(verts) - 4, len(verts)))])
    obj = c.mesh(prefix + "Tail.Skinned", verts, faces, materials["edge"], root)
    assign_weights(obj, assignments, armature, prefix)
    return obj


def build_eye(c, prefix, root, armature, materials, lod):
    eye = c.sphere(prefix + "Eye.Lens", (0, 0.50, 1.58),
                   (0.92, 0.16, 0.52), materials["ivory"],
                   12 if lod == 0 else 8, 6 if lod == 0 else 4, root)
    assign_weights(eye, [[("Eye", 1.0)] for _ in eye.data.vertices], armature, prefix)
    pupil = c.sphere(prefix + "Eye.Pupil", (0, 0.592, 1.59),
                     (0.18, 0.05, 0.31), materials["ink"],
                     10 if lod == 0 else 8, 5 if lod == 0 else 4, root)
    assign_weights(pupil, [[("Eye", 1.0)] for _ in pupil.data.vertices], armature, prefix)
    return [eye, pupil]


def build_lod(c, root, lod, materials):
    prefix = "" if lod == 0 else "LOD1."
    armature = make_armature(prefix + "Rig", root, prefix)
    meshes = [build_body(c, prefix, root, armature, materials, lod)]
    meshes.append(build_wing(c, prefix, "L", root, armature, materials, lod))
    meshes.append(build_wing(c, prefix, "R", root, armature, materials, lod))
    meshes.append(build_tail(c, prefix, root, armature, materials, lod))
    meshes.extend(build_eye(c, prefix, root, armature, materials, lod))
    return armature, meshes


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


def clear_pose(armature):
    for bone in armature.pose.bones:
        bone.rotation_mode = "XYZ"
        bone.location = (0, 0, 0)
        bone.rotation_euler = (0, 0, 0)
        bone.scale = (1, 1, 1)


def arm_pose(clip, phase, bone_name):
    rotation = [0.0, 0.0, 0.0]
    scale = [1.0, 1.0, 1.0]
    side = -1 if ".L." in bone_name else 1
    outer = bone_name.endswith(".1")
    if clip == "Hover" and bone_name.startswith("Wing."):
        rotation[1] = side * (0.045 + 0.08 * math.sin(phase * math.tau)) * (1.2 if outer else 1.0)
    elif clip == "Bank_L":
        if bone_name == "Body":
            rotation[1] = 0.22 * math.sin(phase * math.pi)
        elif bone_name.startswith("Wing."):
            rotation[1] = side * 0.15 * math.sin(phase * math.pi)
    elif clip == "Bank_R":
        if bone_name == "Body":
            rotation[1] = -0.22 * math.sin(phase * math.pi)
        elif bone_name.startswith("Wing."):
            rotation[1] = -side * 0.15 * math.sin(phase * math.pi)
    elif clip == "Dive_Tell":
        if bone_name.startswith("Wing."):
            rotation[1] = side * (0.56 if outer else 0.38) * phase
        elif bone_name == "Body":
            rotation[0] = -0.16 * phase
        elif bone_name.startswith("Tail."):
            rotation[0] = 0.12 * phase
    elif clip == "Dive":
        if bone_name.startswith("Wing."):
            rotation[1] = side * (0.42 if outer else 0.30)
        elif bone_name == "Body":
            rotation[0] = -0.12
    elif clip == "Recover":
        if bone_name.startswith("Wing."):
            rotation[1] = side * (0.42 if outer else 0.30) * (1.0 - phase)
        elif bone_name == "Body":
            rotation[0] = -0.12 * (1.0 - phase)
    elif clip == "Hit":
        impulse = math.sin(phase * math.pi)
        if bone_name == "Body":
            rotation[2] = 0.28 * impulse
        elif bone_name.startswith("Wing."):
            rotation[1] = -side * 0.18 * impulse
        elif bone_name.startswith("Tail."):
            rotation[0] = -0.22 * impulse
    elif clip == "Dissolve":
        shrink = max(0.035, 1.0 - phase * 0.94)
        scale = [shrink, shrink, shrink]
    if bone_name == "Eye" and clip == "Dive_Tell":
        scale = [1.0 + 0.28 * phase] * 3
    return rotation, scale


def author_armature_actions(armature, prefix=""):
    durations = {"Hover": 1.2, "Bank_L": 0.65, "Bank_R": 0.65,
                 "Dive_Tell": 0.55, "Dive": 0.32, "Recover": 0.72,
                 "Hit": 0.42, "Dissolve": 0.85}
    counts = {"Hover": 5, "Dive": 3}
    armature.animation_data_create()
    for clip in REQ["clips"]:
        action = bpy.data.actions.new(clip + "__" + armature.name)
        armature.animation_data.action = action
        sample_count = counts.get(clip, 3)
        for sample in range(sample_count):
            phase = sample / (sample_count - 1)
            frame = 1 + round(durations[clip] * 30 * phase)
            for name in BONE_NAMES:
                bone = armature.pose.bones[prefix + name]
                bone.rotation_mode = "XYZ"
                rotation, scale = arm_pose(clip, phase, name)
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


def author_root_dive(root):
    original = root.location.copy()
    root.animation_data_create()
    action = bpy.data.actions.new("Dive__" + root.name)
    root.animation_data.action = action
    for seconds, position in [(0.0, (0, 0, 0)), (0.08, (0, -0.20, 0.45)),
                              (0.32, (0, -2.4, 5.2))]:
        root.location = v(position)
        root.keyframe_insert("location", frame=1 + round(seconds * 30))
    track = root.animation_data.nla_tracks.new()
    track.name = "Dive"
    strip = track.strips.new("Dive", 1, action)
    strip.name = "Dive"
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
                raise RuntimeError(f"{obj.name} vertex {vertex.index}: invalid weights {weights}")
            if any(name not in allowed or not math.isfinite(weight) for name, weight in weights):
                raise RuntimeError(f"{obj.name} vertex {vertex.index}: invalid influence {weights}")
        report.append({"mesh": obj.name, "vertices": len(obj.data.vertices)})
    if len(armature.data.bones) != len(BONE_NAMES):
        raise RuntimeError(f"{armature.name}: expected {len(BONE_NAMES)} bones")
    return report


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


def mute_actions(objects):
    for obj in objects:
        data = obj.animation_data
        if not data:
            continue
        data.action = None
        for track in data.nla_tracks:
            track.mute = True


def action_fcurves(action):
    """Return curves from legacy or Blender 4.4+ layered actions."""
    if hasattr(action, "fcurves"):
        return list(action.fcurves)
    curves = []
    for layer in action.layers:
        for strip in layer.strips:
            for channel_bag in strip.channelbags:
                curves.extend(channel_bag.fcurves)
    return curves


def sampled_coordinates(meshes, dependency_graph):
    coordinates = []
    for obj in meshes:
        evaluated = obj.evaluated_get(dependency_graph)
        mesh = evaluated.to_mesh()
        try:
            for vertex in mesh.vertices:
                point = evaluated.matrix_world @ vertex.co
                if not all(math.isfinite(value) for value in point):
                    raise RuntimeError(f"non-finite evaluated coordinate in {obj.name}")
                coordinates.extend(point)
        finally:
            evaluated.to_mesh_clear()
    return coordinates


def sample_animations(animated_objects, meshes):
    scene = bpy.context.scene
    dependency_graph = bpy.context.evaluated_depsgraph_get()
    rest_transforms = {
        obj: (obj.location.copy(), obj.rotation_euler.copy(), obj.scale.copy())
        for obj in animated_objects
    }
    report = {}
    for clip in REQ["clips"]:
        mute_actions(animated_objects)
        for obj, (location, rotation, scale) in rest_transforms.items():
            obj.location, obj.rotation_euler, obj.scale = location.copy(), rotation.copy(), scale.copy()
            if obj.type == "ARMATURE":
                clear_pose(obj)
        set_clip(animated_objects, clip)
        scene.frame_set(1)
        bpy.context.view_layer.update()
        maximum_frame = 1
        keyed_frames = {1}
        for obj in animated_objects:
            data = obj.animation_data
            if not data:
                continue
            for track in data.nla_tracks:
                if track.name == clip:
                    for strip in track.strips:
                        maximum_frame = max(maximum_frame, int(math.ceil(strip.frame_end)))
                        for curve in action_fcurves(strip.action):
                            keyed_frames.update(round(point.co.x) for point in curve.keyframe_points)
        keyed_frames.add(maximum_frame)
        frames = sorted(keyed_frames)
        samples = []
        baseline = None
        greatest_delta = 0.0
        for frame in frames:
            scene.frame_set(frame)
            bpy.context.view_layer.update()
            values = sampled_coordinates(meshes, dependency_graph)
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
    mute_actions(animated_objects)
    for obj, (location, rotation, scale) in rest_transforms.items():
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
            action = track.strips[0].action
            for curve in action_fcurves(action):
                first = curve.evaluate(action.frame_range[0])
                last = curve.evaluate(action.frame_range[1])
                differences.append(abs(first - last))
        maximum = max(differences, default=0.0)
        if maximum > 1e-5:
            raise RuntimeError(f"{clip}: loop closure delta {maximum}")
        report[clip] = {"maxChannelDelta": maximum}
    return report


def validate_root_motion(roots):
    report = {}
    for root in roots:
        tracks = [track.name for track in root.animation_data.nla_tracks]
        if tracks != ["Dive"]:
            raise RuntimeError(f"{root.name}: root tracks must be Dive only, found {tracks}")
        action = root.animation_data.nla_tracks[0].strips[0].action
        delta = []
        for index in range(3):
            curve = next(curve for curve in action_fcurves(action)
                         if curve.data_path == "location" and curve.array_index == index)
            delta.append(curve.evaluate(action.frame_range[1]) -
                         curve.evaluate(action.frame_range[0]))
        if Vector(delta).length <= 0.1 or not all(math.isfinite(value) for value in delta):
            raise RuntimeError(f"{root.name}: invalid Dive root motion {delta}")
        report[root.name] = {"tracks": tracks, "blenderDelta": delta}
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
    world = bpy.data.worlds.new("Window Ray Scaffold Studio")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.32, 0.34, 0.40, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.72
    scene.world = world
    for offset, energy, color in [
        ((0.8, -1.0, 1.5), 5.0, (0.82, 0.76, 1.0)),
        ((-0.9, 0.2, 0.6), 2.8, (0.42, 0.50, 0.82)),
    ]:
        bpy.ops.object.light_add(type="AREA", location=center + Vector(offset) * span)
        light = bpy.context.object
        light.data.energy = energy * span * span * 3
        light.data.size = span
        light.data.color = color
        light.rotation_euler = (center - light.location).to_track_quat("-Z", "Y").to_euler()
    bpy.ops.object.camera_add(location=center + Vector((0.85, -1.35, 1.15)) * span)
    camera = bpy.context.object
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = span * 1.20
    camera.data.clip_end = span * 20
    scene.camera = camera
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1100
    scene.render.resolution_y = 700
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(output)
    scene.view_settings.look = "AgX - Medium High Contrast"
    bpy.ops.render.render(write_still=True)


def full_candidate():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    c = Context(REQ)
    c.root["authoring"] = "mechanical skeletal scaffold; not art delivery"
    c.root["reference"] = "design/references/enemies/windowRay-turnaround.png"
    c.root["axisContract"] = "+Y up, +Z forward"
    c.root["landings"] = "[]"
    hide = c.material("Ray.PaintedHide", (0.14, 0.105, 0.20),
                      TEXTURES / "creatures/shadow-hide.png")
    shell = c.material("Ray.ScaffoldShell", (0.065, 0.05, 0.095))
    edge = c.material("Ray.VioletEdge", (0.31, 0.13, 0.48))
    ivory = c.material("Ray.IvoryEye", (0.94, 0.87, 0.66), emission=0.25)
    ink = c.material("Ray.Ink", (0.012, 0.008, 0.02))
    materials = {"hide": hide, "shell": shell, "edge": edge,
                 "ivory": ivory, "ink": ink}

    arm0, meshes0 = build_lod(c, c.root, 0, materials)
    lod1 = bpy.data.objects.new("LOD1", None)
    bpy.context.collection.objects.link(lod1)
    lod1["lod"] = 1
    lod1["request"] = REQ["request"]
    lod1["authoring"] = c.root["authoring"]
    arm1, meshes1 = build_lod(c, lod1, 1, materials)

    bone_socket(c, "Core", (0, 0.34, 0.10), arm0, "Body")
    bone_socket(c, "Mouth", (0, 0.58, 1.72), arm0, "Eye")
    c.socket("Hitbox.Body", (0, 0, 0.15), c.root)["shape"] = "flat-capsule"
    c.socket("Landing", (0, 0.45, 0.02), c.root)["surface"] = "stomp-target"

    author_armature_actions(arm0)
    author_armature_actions(arm1, "LOD1.")
    author_root_dive(c.root)
    author_root_dive(lod1)
    c.clips.update(REQ["clips"])
    bounds0 = fit_root(c.root)
    bounds1 = fit_root(lod1)
    triangles = [count_triangles(c.root), count_triangles(lod1)]
    if triangles[0] > 4000 or triangles[1] > 1200:
        raise RuntimeError(f"triangle budget exceeded: {triangles}")

    weights = {"LOD0": validate_weights(meshes0, arm0),
               "LOD1": validate_weights(meshes1, arm1, "LOD1.")}
    animated = [c.root, lod1, arm0, arm1]
    samples = sample_animations(animated, [*meshes0, *meshes1])
    loops = validate_loop_closure([arm0, arm1])
    root_motion = validate_root_motion([c.root, lod1])

    WORK.mkdir(parents=True, exist_ok=True)
    qa = {
        "bones": {"LOD0": [bone.name for bone in arm0.data.bones],
                  "LOD1": [bone.name for bone in arm1.data.bones]},
        "weights": weights, "animationSamples": samples,
        "loopClosure": loops, "rootMotion": root_motion,
        "bounds": {"LOD0": bounds0, "LOD1": bounds1}, "triangles": triangles,
    }
    (WORK / "rig-qa.json").write_text(json.dumps(qa, indent=2) + "\n")

    saved = capture_transforms()
    raw = WORK / "windowRay-uncompressed.glb"
    output = WORK / "windowRay.glb"
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
    preview = WORK / "preview-scaffold.png"
    render_preview(c.root, preview)
    bpy.ops.wm.save_as_mainfile(filepath=str(WORK / "windowRay.blend"), compress=True)

    record = {
        "request": REQ["request"], "name": REQ["name"],
        "file": str(output.relative_to(ROOT)),
        "preview": str(preview.relative_to(ROOT)),
        "category": "enemy", "region": "city",
        "source": "hopper/3d/models/source/window_ray.py",
        "bounds": [round(value, 6) for value in bounds0],
        "targetBounds": REQ["size"], "triangles": triangles,
        "clips": REQ["clips"], "sockets": REQ["sockets"], "landings": [],
        "status": "mechanical-rig-scaffold-awaiting-art-refinement",
        "sourceReference": "design/references/enemies/windowRay-turnaround.png",
    }
    (WORK / "record.json").write_text(json.dumps(record, indent=2) + "\n")
    (WORK / "manifest.json").write_text(
        json.dumps({"version": 1, "models": [record]}, indent=2) + "\n")
    print("WINDOW_RAY_SCAFFOLD_DONE", bounds0, bounds1, triangles, output, flush=True)


if __name__ == "__main__":
    mode = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "full"
    if mode != "full":
        raise RuntimeError("mode must be full")
    full_candidate()
