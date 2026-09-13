"""Render a matched studio preview of one uncompressed Tier A GLB."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("output")
    values = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    return parser.parse_args(values)


def descendants(root: bpy.types.Object) -> list[bpy.types.Object]:
    result = []
    stack = list(root.children)
    while stack:
        obj = stack.pop()
        result.append(obj)
        stack.extend(obj.children)
    return result


def main() -> None:
    args = parse_args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(Path(args.input).resolve()))
    lod0 = next((o for o in bpy.data.objects if o.name.upper() == "LOD0"), None)
    lod1 = next((o for o in bpy.data.objects if o.name.upper() == "LOD1"), None)
    if lod0 is None or lod1 is None:
        raise RuntimeError("preview input must contain exact LOD0 and LOD1 roots")
    for obj in [lod1] + descendants(lod1):
        obj.hide_render = True
    meshes = [o for o in descendants(lod0) if o.type == "MESH"]
    points = [o.matrix_world @ Vector(corner) for o in meshes for corner in o.bound_box]
    if not points:
        raise RuntimeError("LOD0 contains no mesh bounds")
    lo = Vector(tuple(min(p[i] for p in points) for i in range(3)))
    hi = Vector(tuple(max(p[i] for p in points) for i in range(3)))
    center = (lo + hi) / 2
    span = max(hi - lo)

    scene = bpy.context.scene
    world = bpy.data.worlds.new("Tier A Studio")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.42, 0.47, 0.48, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.75
    scene.world = world
    for offset, energy, size in [((1.0, -1.2, 1.5), 4.0, 1.2), ((-1.1, 0.2, 0.7), 2.0, 1.5)]:
        bpy.ops.object.light_add(type="AREA", location=center + Vector(offset) * span)
        light = bpy.context.object
        light.data.energy = energy * span * span * 3
        light.data.shape = "DISK"
        light.data.size = size * span
        light.rotation_euler = (center - light.location).to_track_quat("-Z", "Y").to_euler()
    bpy.ops.object.camera_add(location=center + Vector((1.15, -1.55, 0.95)) * span)
    camera = bpy.context.object
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = span * 1.45
    camera.data.clip_end = span * 20
    scene.camera = camera

    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 750
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.filepath = str(Path(args.output).resolve())
    scene.view_settings.look = "AgX - Medium High Contrast"
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.render.render(write_still=True)
    print("TIER_A_PREVIEW_DONE", args.output)


if __name__ == "__main__":
    main()
