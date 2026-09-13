"""Mechanical Tier A cleanup for one decoded Hopper GLB.

Run only through tier_a_batch.py.  That runner decodes meshopt while preserving
named nodes/extras, supplies the manifest contract, compresses the result, and
performs the cross-file checks that Blender cannot reliably perform itself.

Blender coordinates are Z-up after glTF import.  This script does not move any
empty, change any object transform, decimate, retopologise, or rebuild LOD1.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


FLAT_MATERIALS = {"terrain.cliff", "trim.obsidian", "trim.ringstone"}


def die(message: str) -> None:
    raise RuntimeError(message)


def args_after_separator() -> list[str]:
    return sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--contract", required=True)
    parser.add_argument("--report", required=True)
    parser.add_argument("--atlas-dir", required=True)
    parser.add_argument("--terrain-bake-only", action="store_true")
    return parser.parse_args(args_after_separator())


def descendants(root: bpy.types.Object) -> list[bpy.types.Object]:
    result: list[bpy.types.Object] = []
    stack = list(root.children)
    while stack:
        obj = stack.pop()
        result.append(obj)
        stack.extend(obj.children)
    return result


def world_position(obj: bpy.types.Object) -> list[float]:
    return [float(v) for v in obj.matrix_world.translation]


def mesh_triangles(obj: bpy.types.Object) -> int:
    obj.data.calc_loop_triangles()
    return len(obj.data.loop_triangles)


def snapshot(root_by_lod: dict[int, bpy.types.Object], contract: dict) -> dict:
    named = {obj.name: obj for obj in bpy.data.objects if obj.name}
    sockets = sorted(set(contract.get("sockets", [])) | {n for n in named if n.startswith("Landing.")})
    return {
        "objects": len(bpy.data.objects),
        "roots": {
            str(level): {
                "name": root.name,
                "extras": dict(root.items()),
                "world_matrix": [float(v) for row in root.matrix_world for v in row],
            }
            for level, root in root_by_lod.items()
        },
        "sockets": {name: world_position(named[name]) for name in sockets if name in named},
        "missing_sockets": [name for name in sockets if name not in named],
        "triangles": {
            str(level): sum(mesh_triangles(o) for o in descendants(root) if o.type == "MESH")
            for level, root in root_by_lod.items()
        },
        "vertices": {
            str(level): sum(len(o.data.vertices) for o in descendants(root) if o.type == "MESH")
            for level, root in root_by_lod.items()
        },
    }


def material_key(obj: bpy.types.Object) -> str:
    names = [slot.material.name for slot in obj.material_slots if slot.material]
    if len(names) != 1:
        die(f"{obj.name}: expected exactly one material before merge, found {names}")
    return names[0]


def safe_name(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", value)[:55] or "material"


def merge_by_material(root: bpy.types.Object, level: int) -> list[bpy.types.Object]:
    meshes = [o for o in descendants(root) if o.type == "MESH"]
    groups: dict[str, list[bpy.types.Object]] = {}
    for obj in meshes:
        groups.setdefault(material_key(obj), []).append(obj)

    merged: list[bpy.types.Object] = []
    for mat_name, group in sorted(groups.items()):
        bpy.ops.object.select_all(action="DESELECT")
        for obj in group:
            obj.select_set(True)
        active = group[0]
        bpy.context.view_layer.objects.active = active
        bpy.ops.object.join()
        joined = bpy.context.view_layer.objects.active
        before_parent_world = joined.matrix_world.copy()
        joined.parent = root
        joined.matrix_world = before_parent_world
        joined.name = f"LOD{level}.{safe_name(mat_name)}"
        joined.data.name = joined.name
        if len(joined.material_slots) != 1:
            die(f"{joined.name}: join produced {len(joined.material_slots)} material slots")
        merged.append(joined)
    return merged


def weld_and_delete_interior(obj: bpy.types.Object) -> dict:
    before_vertices = len(obj.data.vertices)
    before_triangles = mesh_triangles(obj)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.remove_doubles(threshold=0.01)
    bpy.ops.mesh.select_all(action="DESELECT")
    bpy.ops.mesh.select_interior_faces()
    bpy.ops.mesh.delete(type="FACE")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.mesh.select_all(action="DESELECT")
    bpy.ops.object.mode_set(mode="OBJECT")
    obj.data.update()

    after_vertices = len(obj.data.vertices)
    after_triangles = mesh_triangles(obj)
    if after_vertices > before_vertices:
        die(f"{obj.name}: weld increased vertices {before_vertices} -> {after_vertices}")
    if after_triangles > before_triangles:
        die(f"{obj.name}: interior deletion increased triangles {before_triangles} -> {after_triangles}")

    mat_name = obj.material_slots[0].material.name
    if mat_name in FLAT_MATERIALS:
        for polygon in obj.data.polygons:
            polygon.use_smooth = False
    else:
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
        if hasattr(obj.data, "set_sharp_from_angle"):
            obj.data.set_sharp_from_angle(angle=math.radians(30.0))
        else:
            for edge in obj.data.edges:
                edge.use_edge_sharp = False

    return {
        "object": obj.name,
        "vertices_before": before_vertices,
        "vertices_after": after_vertices,
        "triangles_before": before_triangles,
        "triangles_after": after_triangles,
    }


def raycast_landings(root_by_lod: dict[int, bpy.types.Object], contract: dict) -> list[dict]:
    lod1_objects = [root_by_lod[1]] + descendants(root_by_lod[1])
    previous_hide = {obj.name: obj.hide_viewport for obj in lod1_objects}
    for obj in lod1_objects:
        obj.hide_viewport = True
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    named = {obj.name: obj for obj in bpy.data.objects if obj.name}
    checks = []
    for socket_name in contract.get("sockets", []):
        if not socket_name.startswith("Landing."):
            continue
        obj = named.get(socket_name)
        if obj is None:
            die(f"missing landing socket {socket_name}")
        position = obj.matrix_world.translation
        hit, location, _normal, _face, hit_obj, _matrix = bpy.context.scene.ray_cast(
            depsgraph, position + Vector((0, 0, 0.05)), Vector((0, 0, -1)), distance=0.55
        )
        distance = float(position.z - location.z) if hit else None
        checks.append({"name": socket_name, "hit": bool(hit), "distance": distance, "object": hit_obj.name if hit_obj else None})
        if not hit or distance is None or distance > 0.5:
            die(f"{socket_name}: no LOD0 landing face within 0.5 m")
    for obj in lod1_objects:
        obj.hide_viewport = previous_hide[obj.name]
    bpy.context.view_layer.update()
    return checks


def ensure_atlas_uv(objects: list[bpy.types.Object]) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        uv = obj.data.uv_layers.get("Atlas") or obj.data.uv_layers.new(name="Atlas")
        obj.data.uv_layers.active = uv
        obj.data.uv_layers.active_index = list(obj.data.uv_layers).index(uv)
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(66.0), island_margin=0.02)
    bpy.ops.object.mode_set(mode="OBJECT")


def material_has_emission(material: bpy.types.Material) -> bool:
    if not material.use_nodes:
        return False
    for node in material.node_tree.nodes:
        if node.type != "BSDF_PRINCIPLED":
            continue
        color = node.inputs.get("Emission Color") or node.inputs.get("Emission")
        strength = node.inputs.get("Emission Strength")
        if color and (color.is_linked or any(float(x) > 0.0001 for x in color.default_value[:3])):
            return strength is None or strength.is_linked or float(strength.default_value) > 0.0001
    return False


def add_bake_target(materials: list[bpy.types.Material], image: bpy.types.Image, label: str) -> None:
    for material in materials:
        material.use_nodes = True
        nodes = material.node_tree.nodes
        for node in list(nodes):
            if node.label == "TIER_A_BAKE_TARGET":
                nodes.remove(node)
        node = nodes.new("ShaderNodeTexImage")
        node.name = f"Tier A {label} target"
        node.label = "TIER_A_BAKE_TARGET"
        node.image = image
        node.select = True
        nodes.active = node


def bake(objects: list[bpy.types.Object], materials: list[bpy.types.Material], image: bpy.types.Image, bake_type: str) -> None:
    add_bake_target(materials, image, bake_type)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.context.scene.render.engine = "CYCLES"
    bpy.context.scene.cycles.device = "CPU"
    bpy.context.scene.cycles.samples = 1
    bpy.context.scene.render.bake.use_clear = True
    bpy.context.scene.render.bake.margin = 8
    if bake_type == "DIFFUSE":
        bpy.context.scene.render.bake.use_pass_direct = False
        bpy.context.scene.render.bake.use_pass_indirect = False
        bpy.context.scene.render.bake.use_pass_color = True
    bpy.ops.object.bake(type=bake_type)


def transfer_lod1_uvs(lod0: list[bpy.types.Object], lod1: list[bpy.types.Object]) -> list[dict]:
    sources = {material_key(obj): obj for obj in lod0}
    reports = []
    for target in lod1:
        mat_name = material_key(target)
        source = sources.get(mat_name)
        if source is None:
            die(f"{target.name}: no LOD0 source for material {mat_name}")
        target.data.uv_layers.new(name="Atlas") if target.data.uv_layers.get("Atlas") is None else None
        target.data.uv_layers.active = target.data.uv_layers["Atlas"]
        source.data.uv_layers.active = source.data.uv_layers["Atlas"]
        bpy.ops.object.select_all(action="DESELECT")
        source.select_set(True)
        target.select_set(True)
        bpy.context.view_layer.objects.active = target
        bpy.ops.object.data_transfer(
            data_type="UV",
            use_create=True,
            vert_mapping="NEAREST",
            loop_mapping="NEAREST_POLYNOR",
            layers_select_src="ACTIVE",
            layers_select_dst="ACTIVE",
            mix_mode="REPLACE",
            mix_factor=1.0,
        )
        reports.append({"target": target.name, "source": source.name})
    return reports


def replace_material_textures(
    materials: list[bpy.types.Material], albedo: bpy.types.Image, emission: bpy.types.Image, has_emission: dict[str, bool]
) -> None:
    for material in materials:
        nodes = material.node_tree.nodes
        links = material.node_tree.links
        nodes.clear()
        output = nodes.new("ShaderNodeOutputMaterial")
        shader = nodes.new("ShaderNodeBsdfPrincipled")
        base = nodes.new("ShaderNodeTexImage")
        base.name = "Tier A Albedo"
        base.image = albedo
        base.interpolation = "Linear"
        links.new(base.outputs["Color"], shader.inputs["Base Color"])
        if has_emission.get(material.name):
            emit = nodes.new("ShaderNodeTexImage")
            emit.name = "Tier A Emission"
            emit.image = emission
            emit.interpolation = "Linear"
            emission_input = shader.inputs.get("Emission Color") or shader.inputs.get("Emission")
            if emission_input:
                links.new(emit.outputs["Color"], emission_input)
            strength = shader.inputs.get("Emission Strength")
            if strength:
                strength.default_value = 1.0
        shader.inputs["Roughness"].default_value = 0.78
        shader.inputs["Metallic"].default_value = 0.0
        links.new(shader.outputs["BSDF"], output.inputs["Surface"])


def bake_atlas(lod0: list[bpy.types.Object], lod1: list[bpy.types.Object], size: int, atlas_dir: Path, stem: str) -> dict:
    ensure_atlas_uv(lod0)
    materials = sorted({slot.material for obj in lod0 for slot in obj.material_slots if slot.material}, key=lambda m: m.name)
    has_emission = {material.name: material_has_emission(material) for material in materials}
    albedo = bpy.data.images.new(f"{stem}.albedo", width=size, height=size, alpha=False)
    emission = bpy.data.images.new(f"{stem}.emission", width=size, height=size, alpha=False)
    albedo.file_format = emission.file_format = "PNG"
    albedo.filepath_raw = str(atlas_dir / f"{stem}.albedo.png")
    emission.filepath_raw = str(atlas_dir / f"{stem}.emission.png")
    bake(lod0, materials, albedo, "DIFFUSE")
    albedo.save()
    bake(lod0, materials, emission, "EMIT")
    emission.save()
    transfers = transfer_lod1_uvs(lod0, lod1)
    replace_material_textures(materials, albedo, emission, has_emission)
    albedo.pack()
    emission.pack()
    keep = {albedo, emission}
    for image in list(bpy.data.images):
        if image not in keep:
            bpy.data.images.remove(image)
    return {
        "size": size,
        "materials": [m.name for m in materials],
        "emissive_materials": [name for name, active in has_emission.items() if active],
        "uv_transfers": transfers,
    }


def assert_mechanical_invariants(before: dict, after: dict) -> None:
    if before["missing_sockets"] or after["missing_sockets"]:
        die(f"missing sockets before/after: {before['missing_sockets']} / {after['missing_sockets']}")
    if before["roots"] != after["roots"]:
        die("LOD root name, extras, or world transform changed")
    if before["sockets"].keys() != after["sockets"].keys():
        die("socket set changed")
    for name, position in before["sockets"].items():
        delta = math.dist(position, after["sockets"][name])
        if delta > 0.01:
            die(f"socket {name} moved {delta:.6f} m")
    if after["triangles"]["0"] > before["triangles"]["0"] or after["triangles"]["1"] > before["triangles"]["1"]:
        die("triangle count increased")
    if after["triangles"]["1"] >= after["triangles"]["0"]:
        die("LOD1 is not lower detail than LOD0")


def main() -> None:
    args = parse_args()
    contract = json.loads(Path(args.contract).read_text())
    bpy.ops.wm.read_factory_settings(use_empty=True)
    result = bpy.ops.import_scene.gltf(filepath=str(Path(args.input).resolve()))
    if "FINISHED" not in result:
        die(f"glTF import failed: {result}")
    root_by_lod = {}
    for level in (0, 1):
        matches = [o for o in bpy.data.objects if o.name.upper() == f"LOD{level}"]
        if len(matches) != 1:
            die(f"expected one LOD{level} root, found {[o.name for o in matches]}")
        root_by_lod[level] = matches[0]
    before = snapshot(root_by_lod, contract)
    expected_nodes = int(contract["source_nodes"])
    if before["objects"] != expected_nodes:
        die(f"decoded import has {before['objects']} objects; validator reported {expected_nodes} nodes")

    operations = []
    if args.terrain_bake_only:
        lod_meshes = {
            level: [o for o in descendants(root) if o.type == "MESH"]
            for level, root in root_by_lod.items()
        }
        if any(len(meshes) != 1 for meshes in lod_meshes.values()):
            die(f"terrain bake-only input is not one mesh per LOD: { {k: len(v) for k, v in lod_meshes.items()} }")
    else:
        lod_meshes = {}
        for level, root in root_by_lod.items():
            merged = merge_by_material(root, level)
            lod_meshes[level] = merged
            operations.extend(weld_and_delete_interior(obj) for obj in merged)

    landing_checks = raycast_landings(root_by_lod, contract)
    if int(contract.get("source_images", 0)) == 0:
        atlas = {
            "status": "skipped-untextured-flat-color",
            "reason": "source GLB embeds no images; retaining its flat-color materials avoids adding a redundant atlas",
            "materials": sorted({material_key(obj) for obj in lod_meshes[0]}),
        }
    else:
        atlas_size = 2048 if max(contract["bounds"]) > 120 else 1024
        atlas = bake_atlas(lod_meshes[0], lod_meshes[1], atlas_size, Path(args.atlas_dir), Path(args.output).stem)
    after = snapshot(root_by_lod, contract)
    assert_mechanical_invariants(before, after)

    bpy.ops.object.select_all(action="DESELECT")
    export_objects = [root_by_lod[0], root_by_lod[1]] + descendants(root_by_lod[0]) + descendants(root_by_lod[1])
    for obj in export_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root_by_lod[0]
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    result = bpy.ops.export_scene.gltf(
        filepath=str(Path(args.output).resolve()),
        export_format="GLB",
        use_selection=True,
        export_extras=True,
        export_apply=True,
        export_yup=True,
        export_animations=False,
        export_materials="EXPORT",
        export_unused_images=False,
    )
    if "FINISHED" not in result:
        die(f"glTF export failed: {result}")
    report = {
        "request": contract["request"],
        "file": contract["file"],
        "before": before,
        "after": after,
        "operations": operations,
        "landing_checks": landing_checks,
        "atlas": atlas,
    }
    Path(args.report).write_text(json.dumps(report, indent=2) + "\n")
    print("TIER_A_BLENDER_DONE", json.dumps({"request": contract["request"], "triangles": after["triangles"], "vertices": after["vertices"]}))


if __name__ == "__main__":
    main()
