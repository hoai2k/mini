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
import bmesh
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


def mesh_is_closed_manifold(obj: bpy.types.Object) -> bool:
    mesh = bmesh.new()
    mesh.from_mesh(obj.data)
    result = bool(mesh.edges) and all(edge.is_manifold for edge in mesh.edges)
    mesh.free()
    return result


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
        "bounds": {
            str(level): game_bounds(root)
            for level, root in root_by_lod.items()
        },
    }


def game_bounds(root: bpy.types.Object) -> list[float]:
    points = [obj.matrix_world @ vertex.co for obj in descendants(root) if obj.type == "MESH" for vertex in obj.data.vertices]
    if not points:
        die(f"{root.name}: no vertices for bounds")
    blender_span = [max(p[i] for p in points) - min(p[i] for p in points) for i in range(3)]
    # Blender imports glTF Y-up as Z-up: game XYZ maps to Blender XZY.
    return [float(blender_span[0]), float(blender_span[2]), float(blender_span[1])]


def material_key(obj: bpy.types.Object) -> str:
    names = [slot.material.name for slot in obj.material_slots if slot.material]
    if len(names) != 1:
        die(f"{obj.name}: expected exactly one material before merge, found {names}")
    return names[0]


def safe_name(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", value)[:55] or "material"


def merge_meshes_by_material(
    parent: bpy.types.Object, name_prefix: str, meshes: list[bpy.types.Object]
) -> list[bpy.types.Object]:
    groups: dict[str, list[bpy.types.Object]] = {}
    for obj in meshes:
        groups.setdefault(material_key(obj), []).append(obj)

    merged: list[bpy.types.Object] = []
    for mat_name, group in sorted(groups.items()):
        # Bake each part into its allowed rigid parent's local space before joining.
        # Reparenting a joined object whose source hierarchy contains rotated,
        # non-uniform scales can create shear that glTF TRS cannot represent;
        # M-027 and M-036 exposed this as greatly inflated exported bounds.
        parent_inverse = parent.matrix_world.inverted_safe()
        for obj in group:
            if obj.data.users > 1:
                obj.data = obj.data.copy()
            obj.data.transform(parent_inverse @ obj.matrix_world)
            obj.parent = parent
            obj.matrix_parent_inverse = Matrix.Identity(4)
            obj.matrix_basis = Matrix.Identity(4)
        bpy.ops.object.select_all(action="DESELECT")
        for obj in group:
            obj.select_set(True)
        active = group[0]
        bpy.context.view_layer.objects.active = active
        bpy.ops.object.join()
        joined = bpy.context.view_layer.objects.active
        joined.name = f"{safe_name(name_prefix)}.{safe_name(mat_name)}"
        joined.data.name = joined.name
        if len(joined.material_slots) != 1:
            die(f"{joined.name}: join produced {len(joined.material_slots)} material slots")
        merged.append(joined)
    return merged


def merge_by_material(root: bpy.types.Object, level: int) -> list[bpy.types.Object]:
    meshes = [o for o in descendants(root) if o.type == "MESH"]
    return merge_meshes_by_material(root, f"LOD{level}", meshes)


def merge_with_functional_pivots(
    root: bpy.types.Object, pivot_names: set[str]
) -> tuple[list[bpy.types.Object], dict[str, list[str]]]:
    """Merge only meshes sharing the same nearest protected rigid pivot."""
    pivots = {obj.name: obj for obj in descendants(root) if obj.name in pivot_names}
    relevant_names = {name for name in pivot_names if name == root.name or name.startswith(f"{root.name}.")}
    missing = sorted(relevant_names - pivots.keys())
    if missing:
        die(f"{root.name}: functional pivots missing after import: {missing}")
    owners = {root, *pivots.values()}
    owned: dict[bpy.types.Object, list[bpy.types.Object]] = {owner: [] for owner in owners}
    for mesh in [obj for obj in descendants(root) if obj.type == "MESH"]:
        owner = mesh.parent
        while owner not in owners and owner is not None:
            owner = owner.parent
        if owner is None:
            die(f"{mesh.name}: no functional rigid owner below {root.name}")
        owned[owner].append(mesh)

    merged: list[bpy.types.Object] = []
    ownership = {}
    for owner in sorted(owners, key=lambda obj: obj.name):
        meshes = owned[owner]
        ownership[owner.name] = sorted(obj.name for obj in meshes)
        if meshes:
            merged.extend(merge_meshes_by_material(owner, owner.name, meshes))
    return merged, ownership


def weld_and_delete_interior(obj: bpy.types.Object) -> dict:
    before_vertices = len(obj.data.vertices)
    before_triangles = mesh_triangles(obj)
    original_mesh = obj.data.copy()
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.remove_doubles(threshold=0.01)
    bpy.ops.object.mode_set(mode="OBJECT")
    welded_triangles = mesh_triangles(obj)
    if welded_triangles != before_triangles:
        changed_mesh = obj.data
        obj.data = original_mesh
        bpy.data.meshes.remove(changed_mesh)
        weld_action = "skipped-triangle-change"
    else:
        bpy.data.meshes.remove(original_mesh)
        weld_action = "applied"
    welded_mesh = obj.data.copy()
    welded_triangles = mesh_triangles(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="DESELECT")
    bpy.ops.mesh.select_interior_faces()
    bpy.ops.mesh.delete(type="FACE")
    bpy.ops.mesh.select_all(action="DESELECT")
    bpy.ops.object.mode_set(mode="OBJECT")
    obj.data.update()

    selected_interior_removed = welded_triangles - mesh_triangles(obj)
    if selected_interior_removed:
        # Blender's interior selector can classify visible faces inside
        # overlapping shells (M-089's LOD1 ring lost 30 exterior triangles).
        # Keep the weld but roll back deletion whenever the operator selects
        # anything; Tier A must favor an intact silhouette over speculative
        # hidden-face removal.
        removed_mesh = obj.data
        obj.data = welded_mesh
        bpy.data.meshes.remove(removed_mesh)
        interior_action = "skipped-conservative"
    else:
        bpy.data.meshes.remove(welded_mesh)
        interior_action = "no-faces-selected"
    if mesh_is_closed_manifold(obj):
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.mesh.normals_make_consistent(inside=False)
        bpy.ops.mesh.select_all(action="DESELECT")
        bpy.ops.object.mode_set(mode="OBJECT")
        normals_action = "recalculated-closed-manifold"
    else:
        normals_action = "preserved-open-shell"
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
        "weld_action": weld_action,
        "interior_faces_selected": selected_interior_removed,
        "interior_action": interior_action,
        "normals_action": normals_action,
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
    # Blender's multi-object Smart Project can pack each object independently
    # into the full 0..1 square, making their islands overlap in the shared
    # bake. Give every merged material object a deterministic grid cell.
    grid = math.ceil(math.sqrt(len(objects)))
    cell_padding = 0.02
    for index, obj in enumerate(objects):
        bpy.ops.object.select_all(action="DESELECT")
        uv = obj.data.uv_layers.get("Atlas") or obj.data.uv_layers.new(name="Atlas")
        obj.data.uv_layers.active = uv
        obj.data.uv_layers.active_index = next(i for i, layer in enumerate(obj.data.uv_layers) if layer.name == "Atlas")
        uv.active_render = True
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.context.scene.tool_settings.use_uv_select_sync = True
        result = bpy.ops.uv.smart_project(
            angle_limit=math.radians(66.0),
            island_margin=0.02,
            scale_to_bounds=True,
        )
        if "FINISHED" not in result:
            die(f"{obj.name}: Smart Project failed: {result}")
        bpy.ops.object.mode_set(mode="OBJECT")
        column, row = index % grid, index // grid
        atlas_layer = obj.data.attributes.get("Atlas")
        if atlas_layer is None or atlas_layer.domain != "CORNER":
            die(f"{obj.name}: Smart Project did not create Atlas loop data")
        values = [0.0] * (len(atlas_layer.data) * 2)
        atlas_layer.data.foreach_get("vector", values)
        for offset in range(0, len(values), 2):
            values[offset] = (column + cell_padding + values[offset] * (1 - 2 * cell_padding)) / grid
            values[offset + 1] = (row + cell_padding + values[offset + 1] * (1 - 2 * cell_padding)) / grid
        atlas_layer.data.foreach_set("vector", values)
        obj.data.update()


def pin_implicit_source_uv(objects: list[bpy.types.Object]) -> list[dict]:
    """Keep source textures sampling their original UV while Atlas is active for baking."""
    material_objects: dict[bpy.types.Material, list[bpy.types.Object]] = {}
    for obj in objects:
        for slot in obj.material_slots:
            if slot.material:
                material_objects.setdefault(slot.material, []).append(obj)
    reports = []
    for material, users in material_objects.items():
        if not material.use_nodes or material.node_tree is None:
            reports.append({"material": material.name, "uv": None, "pinned_image_nodes": []})
            continue
        implicit_nodes = [
            node for node in material.node_tree.nodes
            if node.type == "TEX_IMAGE" and node.inputs.get("Vector") is not None
            and not node.inputs["Vector"].is_linked
        ]
        if not implicit_nodes:
            reports.append({"material": material.name, "uv": None, "pinned_image_nodes": []})
            continue
        uv_names = set()
        for obj in users:
            original = next((uv for uv in obj.data.uv_layers if uv.name != "Atlas" and uv.active_render), None)
            original = original or next((uv for uv in obj.data.uv_layers if uv.name != "Atlas"), None)
            if original:
                uv_names.add(original.name)
        if len(uv_names) != 1:
            die(f"{material.name}: expected one shared source UV name, found {sorted(uv_names)}")
        uv_name = next(iter(uv_names))
        implicit = []
        for node in implicit_nodes:
            vector = node.inputs["Vector"]
            uv_node = material.node_tree.nodes.new("ShaderNodeUVMap")
            uv_node.name = f"Tier A source UV for {node.name}"
            uv_node.uv_map = uv_name
            material.node_tree.links.new(uv_node.outputs["UV"], vector)
            implicit.append(node.name)
        reports.append({"material": material.name, "uv": uv_name, "pinned_image_nodes": implicit})
    return reports


def keep_only_atlas_uv(objects: list[bpy.types.Object]) -> None:
    """Make the baked atlas the unambiguous TEXCOORD_0 for glTF export."""
    for obj in objects:
        atlas = obj.data.uv_layers.get("Atlas")
        if atlas is None:
            die(f"{obj.name}: missing Atlas UV before export")
        debug_layers = {}
        for layer in obj.data.uv_layers:
            attribute = obj.data.attributes.get(layer.name)
            layer_values = [0.0] * (len(attribute.data) * 2)
            attribute.data.foreach_get("vector", layer_values)
            debug_layers[layer.name] = [min(layer_values), max(layer_values)] if layer_values else []
        print("TIER_A_UV_BEFORE_FINALIZE", obj.name, json.dumps(debug_layers, sort_keys=True))
        originals = [uv.name for uv in obj.data.uv_layers if uv.name != "Atlas"]
        if originals:
            # Removing TEXCOORD_0 from Blender 5.2 can retain its data under
            # the surviving layer. Copy Atlas data into the first layer, then
            # remove the later Atlas layer so the exported TEXCOORD_0 is exact.
            target_name = originals[0]
            source_layer = obj.data.attributes.get("Atlas")
            target_layer = obj.data.attributes.get(target_name)
            if source_layer is None or target_layer is None or source_layer.domain != "CORNER" or target_layer.domain != "CORNER":
                die(f"{obj.name}: cannot copy Atlas UV to {target_name}")
            values = [0.0] * (len(source_layer.data) * 2)
            source_layer.data.foreach_get("vector", values)
            target_layer.data.foreach_set("vector", values)
            obj.data.update()
            for uv in list(obj.data.uv_layers):
                if uv.name != target_name:
                    obj.data.uv_layers.remove(uv)
            obj.data.uv_layers[0].name = "Atlas"
        atlas = obj.data.uv_layers.get("Atlas")
        if atlas is None or len(obj.data.uv_layers) != 1:
            die(f"{obj.name}: failed to make Atlas the sole UV layer")
        obj.data.uv_layers.active = atlas
        obj.data.uv_layers.active_index = 0
        atlas.active_render = True
        exported = obj.data.attributes.get("Atlas")
        values = [0.0] * (len(exported.data) * 2)
        exported.data.foreach_get("vector", values)
        if values and (min(values) < -0.001 or max(values) > 1.001):
            die(f"{obj.name}: final Atlas UV escapes 0..1 ({min(values):.4f}..{max(values):.4f})")


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
        target.data.uv_layers.active_index = next(i for i, layer in enumerate(target.data.uv_layers) if layer.name == "Atlas")
        source.data.uv_layers.active = source.data.uv_layers["Atlas"]
        source.data.uv_layers.active_index = next(i for i, layer in enumerate(source.data.uv_layers) if layer.name == "Atlas")
        bpy.ops.object.select_all(action="DESELECT")
        source.select_set(True)
        target.select_set(True)
        # data_transfer copies from the active object to the other selected
        # objects. Keeping the LOD1 target active reversed the transfer and
        # overwrote the freshly packed LOD0 Atlas with LOD1's tiled source UV.
        bpy.context.view_layer.objects.active = source
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
        uv = nodes.new("ShaderNodeUVMap")
        uv.name = "Tier A Atlas UV"
        uv.uv_map = "Atlas"
        base = nodes.new("ShaderNodeTexImage")
        base.name = "Tier A Albedo"
        base.image = albedo
        base.interpolation = "Linear"
        links.new(uv.outputs["UV"], base.inputs["Vector"])
        links.new(base.outputs["Color"], shader.inputs["Base Color"])
        if has_emission.get(material.name):
            emit = nodes.new("ShaderNodeTexImage")
            emit.name = "Tier A Emission"
            emit.image = emission
            emit.interpolation = "Linear"
            links.new(uv.outputs["UV"], emit.inputs["Vector"])
            emission_input = shader.inputs.get("Emission Color") or shader.inputs.get("Emission")
            if emission_input:
                links.new(emit.outputs["Color"], emission_input)
            strength = shader.inputs.get("Emission Strength")
            if strength:
                strength.default_value = 1.0
        shader.inputs["Roughness"].default_value = 0.78
        shader.inputs["Metallic"].default_value = 0.0
        links.new(shader.outputs["BSDF"], output.inputs["Surface"])


def bake_atlas(
    lod0: list[bpy.types.Object],
    lod1: list[bpy.types.Object],
    size: int,
    atlas_dir: Path,
    stem: str,
    jpeg_emission: bool = False,
) -> dict:
    source_uvs = pin_implicit_source_uv(lod0)
    ensure_atlas_uv(lod0)
    materials = sorted({slot.material for obj in lod0 for slot in obj.material_slots if slot.material}, key=lambda m: m.name)
    has_emission = {material.name: material_has_emission(material) for material in materials}
    albedo = bpy.data.images.new(f"{stem}.albedo", width=size, height=size, alpha=False)
    emission = bpy.data.images.new(f"{stem}.emission", width=size, height=size, alpha=False)
    emission_format = "JPEG" if jpeg_emission else "PNG"
    emission_extension = "jpg" if jpeg_emission else "png"
    albedo.file_format = "JPEG"
    emission.file_format = emission_format
    albedo.filepath_raw = str(atlas_dir / f"{stem}.albedo.jpg")
    emission.filepath_raw = str(atlas_dir / f"{stem}.emission.{emission_extension}")
    bpy.context.scene.render.image_settings.file_format = "JPEG"
    bpy.context.scene.render.image_settings.quality = 92
    bake(lod0, materials, albedo, "DIFFUSE")
    albedo.save_render(albedo.filepath_raw, scene=bpy.context.scene)
    bpy.context.scene.render.image_settings.file_format = emission_format
    if jpeg_emission:
        bpy.context.scene.render.image_settings.quality = 92
    else:
        bpy.context.scene.render.image_settings.compression = 100
    bake(lod0, materials, emission, "EMIT")
    emission.save_render(emission.filepath_raw, scene=bpy.context.scene)
    transfers = transfer_lod1_uvs(lod0, lod1)
    keep_only_atlas_uv(lod0 + lod1)
    replace_material_textures(materials, albedo, emission, has_emission)
    albedo.pack()
    emission.pack()
    keep = {albedo, emission}
    for image in list(bpy.data.images):
        if image not in keep:
            bpy.data.images.remove(image)
    return {
        "size": size,
        "image_formats": {"albedo": "JPEG", "emission": emission_format},
        "materials": [m.name for m in materials],
        "emissive_materials": [name for name, active in has_emission.items() if active],
        "uv_transfers": transfers,
        "source_uvs": source_uvs,
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
    for level in ("0", "1"):
        for axis, (source, candidate) in enumerate(zip(before["bounds"][level], after["bounds"][level])):
            if abs(source - candidate) > 0.01:
                die(f"LOD{level} {'XYZ'[axis]} bound changed {source:.6f} -> {candidate:.6f} m")


def assert_import_topology(contract: dict, imported: dict) -> dict:
    source = {str(level): int(count) for level, count in contract["compressed_source_triangles"].items()}
    imported_triangles = {str(level): int(count) for level, count in imported["triangles"].items()}
    delta = {level: imported_triangles[level] - source[level] for level in ("0", "1")}
    exception = contract.get("import_triangle_exception")
    expected_delta = (
        {str(level): int(count) for level, count in exception["delta"].items()}
        if exception else {"0": 0, "1": 0}
    )
    if delta != expected_delta:
        die(
            "Blender import changed compressed-source triangle counts without the reviewed exception: "
            f"source={source}, imported={imported_triangles}, delta={delta}, expected={expected_delta}"
        )
    return {
        "compressed_source_triangles": source,
        "blender_imported_triangles": imported_triangles,
        "delta": delta,
        "accepted_exception": exception,
    }


def main() -> None:
    args = parse_args()
    contract = json.loads(Path(args.contract).read_text())
    if int(contract.get("source_animations", 0)) or contract.get("clips"):
        die(
            "static Tier A cleanup refuses animated inputs: "
            f"GLB animations={contract.get('source_animations', 0)}, manifest clips={contract.get('clips', [])}"
        )
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
    import_topology = assert_import_topology(contract, before)
    expected_nodes = int(contract["source_nodes"])
    if before["objects"] != expected_nodes:
        die(f"decoded import has {before['objects']} objects; validator reported {expected_nodes} nodes")

    operations = []
    functional_cleanup = None
    if args.terrain_bake_only:
        lod_meshes = {
            level: [o for o in descendants(root) if o.type == "MESH"]
            for level, root in root_by_lod.items()
        }
        if any(len(meshes) != 1 for meshes in lod_meshes.values()):
            die(f"terrain bake-only input is not one mesh per LOD: { {k: len(v) for k, v in lod_meshes.items()} }")
    elif contract.get("functional_rigid"):
        pivot_names = set(contract["functional_rigid"].get("pivots", []))
        imported_names = {obj.name for obj in bpy.data.objects}
        missing = sorted(pivot_names - imported_names)
        if missing:
            die(f"functional pivots missing after import: {missing}")
        lod_meshes = {}
        ownership = {}
        for level, root in root_by_lod.items():
            merged, level_ownership = merge_with_functional_pivots(root, pivot_names)
            lod_meshes[level] = merged
            ownership.update(level_ownership)
            operations.extend(weld_and_delete_interior(obj) for obj in merged)
        functional_cleanup = {
            "status": "rigid-pivots-preserved",
            "reason": contract["functional_rigid"]["reason"],
            "protected_pivots": sorted(pivot_names),
            "source_triangles_by_rigid_subtree": contract["functional_structure"]["triangles_by_rigid_subtree"],
            "imported_mesh_ownership": ownership,
        }
    else:
        lod_meshes = {}
        for level, root in root_by_lod.items():
            merged = merge_by_material(root, level)
            lod_meshes[level] = merged
            operations.extend(weld_and_delete_interior(obj) for obj in merged)

    landing_checks = raycast_landings(root_by_lod, contract)
    if contract.get("preserve_source_textures"):
        atlas = {
            "status": "skipped-preserve-source-textures-quality",
            "reason": "shared atlas visibly reduced texture density; retaining original painted materials",
            "materials": sorted({material_key(obj) for obj in lod_meshes[0]}),
        }
    elif int(contract.get("source_images", 0)) == 0:
        atlas = {
            "status": "skipped-untextured-flat-color",
            "reason": "source GLB embeds no images; retaining its flat-color materials avoids adding a redundant atlas",
            "materials": sorted({material_key(obj) for obj in lod_meshes[0]}),
        }
    else:
        atlas_size = 2048 if max(contract["bounds"]) > 120 else 1024
        atlas = bake_atlas(
            lod_meshes[0],
            lod_meshes[1],
            atlas_size,
            Path(args.atlas_dir),
            Path(args.output).stem,
            jpeg_emission=bool(contract.get("jpeg_emission")),
        )
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
        # Applying TRS at export inflated bounds on rotated/scaled assemblies
        # such as M-027 and M-036. The joined geometry is already in the
        # correct object space, so preserve transforms verbatim.
        export_apply=False,
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
        "import_topology": import_topology,
        "functional_cleanup": functional_cleanup,
        "operations": operations,
        "landing_checks": landing_checks,
        "atlas": atlas,
    }
    Path(args.report).write_text(json.dumps(report, indent=2) + "\n")
    print("TIER_A_BLENDER_DONE", json.dumps({"request": contract["request"], "triangles": after["triangles"], "vertices": after["vertices"]}))


if __name__ == "__main__":
    main()
