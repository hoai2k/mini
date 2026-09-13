"""Safe, restartable runner for Hopper Tier A cleanup candidates.

Candidates and all intermediates live under ignored local/hopper-tier-a/.  The
runner never edits production GLBs or manifest.json.  A candidate is promoted
to candidates/ only after decode, Blender cleanup, compression, and validator
checks succeed.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import shutil
import struct
import subprocess
import sys
import time
from pathlib import Path


HERE = Path(__file__).resolve().parent
MODEL_DIR = HERE.parent
ROOT = MODEL_DIR.parents[2]
MANIFEST = MODEL_DIR / "manifest.json"
WORK = ROOT / "local" / "hopper-tier-a"
BLENDER = Path("/Applications/Blender.app/Contents/MacOS/Blender")
GLTFPACK_CANDIDATES = [
    *([Path(os.environ["GLTFPACK"])] if os.environ.get("GLTFPACK") else []),
    *Path.home().glob(".npm/_npx/*/node_modules/.bin/gltfpack"),
]
PRESERVE_SOURCE_TEXTURE_REQUESTS = {"M-036", "M-059", "M-060", "M-064", "M-067", "M-092"}
JPEG_EMISSION_REQUESTS = {"M-061"}
FUNCTIONAL_RIGID_REQUESTS = {
    "M-059": {
        "reason": "three bridge stages are independent rigid drop pivots",
        "pivots": ["Stage0", "Stage1", "Stage2", "LOD1.Stage0", "LOD1.Stage1", "LOD1.Stage2"],
    },
    "M-060": {
        "reason": "the floating reef moves as a rigid LOD root",
        "pivots": [],
    },
    "M-064": {
        "reason": "the ring shard orbits as a rigid LOD root with its landing",
        "pivots": [],
    },
    "M-066": {
        "reason": "the gravity seam animates its named Arrow pivots",
        "pivots": [
            *[f"Arrow{i}" for i in range(8)],
            *[f"LOD1.Arrow{i}" for i in range(1, 8)],
        ],
    },
}
IMPORT_TRIANGLE_EXCEPTIONS = {
    "M-067": {
        "delta": {"0": 0, "1": -2},
        "reason": (
            "Blender removes two exact coincident geometric faces from "
            "LOD1.Circle during glTF import; reviewed visual cleanup accepted"
        ),
        "evidence": {
            "mesh": "LOD1.Circle",
            "source_geometric_duplicate_pairs": [[0, 1], [40, 41]],
            "zero_area_triangles": 0,
        },
    },
}


def run(command: list[str], log: Path, cwd: Path = ROOT) -> str:
    completed = subprocess.run(command, cwd=cwd, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    log.parent.mkdir(parents=True, exist_ok=True)
    log.write_text("$ " + " ".join(command) + "\n\n" + completed.stdout)
    if completed.returncode:
        raise RuntimeError(f"command failed ({completed.returncode}); see {log}")
    return completed.stdout


def glb_json(path: Path) -> dict:
    data = path.read_bytes()
    if data[:4] != b"glTF" or struct.unpack_from("<I", data, 4)[0] != 2:
        raise RuntimeError(f"not glTF 2 GLB: {path}")
    offset = 12
    while offset + 8 <= len(data):
        length, chunk_type = struct.unpack_from("<II", data, offset)
        offset += 8
        if offset + length > len(data):
            raise RuntimeError(f"truncated GLB: {path}")
        if chunk_type == 0x4E4F534A:
            return json.loads(data[offset : offset + length].decode("utf-8").rstrip(" \x00"))
        offset += length
    raise RuntimeError(f"missing JSON chunk: {path}")


def primitive_triangle_count(doc: dict, primitive: dict) -> int:
    accessors = doc.get("accessors", [])
    accessor_index = primitive.get("indices")
    if accessor_index is None:
        accessor_index = primitive.get("attributes", {}).get("POSITION")
    if accessor_index is None or not 0 <= accessor_index < len(accessors):
        raise RuntimeError("mesh primitive has no countable indices or POSITION accessor")
    count = int(accessors[accessor_index]["count"])
    mode = int(primitive.get("mode", 4))
    if mode == 4:
        if count % 3:
            raise RuntimeError(f"TRIANGLES accessor count {count} is not divisible by 3")
        return count // 3
    if mode in (5, 6):
        return max(0, count - 2)
    raise RuntimeError(f"unsupported non-triangle primitive mode {mode}")


def triangle_counts_by_lod(doc: dict) -> dict[str, int]:
    """Count authored draw triangles from GLB accessor metadata under each LOD."""
    nodes = doc.get("nodes", [])
    meshes = doc.get("meshes", [])

    def descendants(root_index: int) -> list[int]:
        found: list[int] = []
        stack = [root_index]
        seen: set[int] = set()
        while stack:
            index = stack.pop()
            if index in seen:
                continue
            if not 0 <= index < len(nodes):
                raise RuntimeError(f"node index {index} is out of range")
            seen.add(index)
            found.append(index)
            stack.extend(nodes[index].get("children", []))
        return found

    counts: dict[str, int] = {}
    for level in (0, 1):
        roots = [i for i, node in enumerate(nodes) if node.get("name", "").upper() == f"LOD{level}"]
        if len(roots) != 1:
            raise RuntimeError(f"expected one LOD{level} node, found {len(roots)}")
        total = 0
        for node_index in descendants(roots[0]):
            mesh_index = nodes[node_index].get("mesh")
            if mesh_index is None:
                continue
            if not 0 <= mesh_index < len(meshes):
                raise RuntimeError(f"mesh index {mesh_index} is out of range")
            total += sum(primitive_triangle_count(doc, primitive) for primitive in meshes[mesh_index].get("primitives", []))
        counts[str(level)] = total
    return counts


def functional_structure(doc: dict, definition: dict, sockets: list[str]) -> dict:
    """Capture the nodes and per-pivot geometry that define rigid gameplay motion."""
    nodes = doc.get("nodes", [])
    meshes = doc.get("meshes", [])
    names = {node.get("name"): i for i, node in enumerate(nodes) if node.get("name")}
    parents = {child: parent for parent, node in enumerate(nodes) for child in node.get("children", [])}
    pivot_names = set(definition.get("pivots", []))
    missing_pivots = sorted(pivot_names - names.keys())
    if missing_pivots:
        raise RuntimeError(f"functional pivot nodes are missing: {missing_pivots}")
    socket_names = {
        name for name in names
        if name in sockets or (name.startswith("LOD1.") and name[5:] in sockets)
    }
    protected_names = {"LOD0", "LOD1", *pivot_names, *socket_names}

    protected = {}
    for name in sorted(protected_names):
        if name not in names:
            raise RuntimeError(f"functional contract node is missing: {name}")
        index = names[name]
        parent_index = parents.get(index)
        protected[name] = {
            "parent": nodes[parent_index].get("name") if parent_index is not None else None,
            "local_matrix": node_matrix(nodes[index]),
            "extras": nodes[index].get("extras"),
        }

    triangle_owners: dict[str, int] = {}
    for root_name in ("LOD0", "LOD1"):
        root_index = names[root_name]
        stack = [(root_index, root_name)]
        seen: set[int] = set()
        while stack:
            index, owner = stack.pop()
            if index in seen:
                raise RuntimeError(f"node {index} appears more than once below {root_name}")
            seen.add(index)
            node = nodes[index]
            node_name = node.get("name")
            if node_name in pivot_names:
                owner = node_name
            mesh_index = node.get("mesh")
            if mesh_index is not None:
                if not 0 <= mesh_index < len(meshes):
                    raise RuntimeError(f"mesh index {mesh_index} is out of range")
                triangle_owners[owner] = triangle_owners.get(owner, 0) + sum(
                    primitive_triangle_count(doc, primitive)
                    for primitive in meshes[mesh_index].get("primitives", [])
                )
            stack.extend((child, owner) for child in node.get("children", []))
    return {"nodes": protected, "triangles_by_rigid_subtree": triangle_owners}


def compare_functional_structure(source: dict, candidate: dict) -> None:
    if source["triangles_by_rigid_subtree"] != candidate["triangles_by_rigid_subtree"]:
        raise RuntimeError(
            "functional rigid-subtree triangles changed: "
            f"{source['triangles_by_rigid_subtree']} -> {candidate['triangles_by_rigid_subtree']}"
        )
    if source["nodes"].keys() != candidate["nodes"].keys():
        raise RuntimeError("functional node set changed")
    for name, before in source["nodes"].items():
        after = candidate["nodes"][name]
        if before["parent"] != after["parent"]:
            raise RuntimeError(f"functional node {name} parent changed {before['parent']} -> {after['parent']}")
        if stable(before["extras"]) != stable(after["extras"]):
            raise RuntimeError(f"functional node {name} extras changed")
        delta = max(abs(a - b) for a, b in zip(before["local_matrix"], after["local_matrix"]))
        if delta > 1e-5:
            raise RuntimeError(f"functional node {name} local transform changed by {delta:.8f}")


def node_matrix(node: dict) -> list[float]:
    if "matrix" in node:
        return list(map(float, node["matrix"]))
    x, y, z, w = map(float, node.get("rotation", [0, 0, 0, 1]))
    sx, sy, sz = map(float, node.get("scale", [1, 1, 1]))
    tx, ty, tz = map(float, node.get("translation", [0, 0, 0]))
    return [
        (1 - 2 * (y*y + z*z))*sx, (2*(x*y + z*w))*sx, (2*(x*z - y*w))*sx, 0,
        (2*(x*y - z*w))*sy, (1 - 2*(x*x + z*z))*sy, (2*(y*z + x*w))*sy, 0,
        (2*(x*z + y*w))*sz, (2*(y*z - x*w))*sz, (1 - 2*(x*x + y*y))*sz, 0,
        tx, ty, tz, 1,
    ]


def multiply(a: list[float], b: list[float]) -> list[float]:
    return [sum(a[k*4+r] * b[c*4+k] for k in range(4)) for c in range(4) for r in range(4)]


def node_world_positions(doc: dict) -> dict[str, list[float]]:
    worlds: dict[int, list[float]] = {}
    identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
    def walk(index: int, parent: list[float]) -> None:
        world = multiply(parent, node_matrix(doc["nodes"][index]))
        worlds[index] = world
        for child in doc["nodes"][index].get("children", []):
            walk(child, world)
    for scene in doc.get("scenes", []):
        for index in scene.get("nodes", []):
            walk(index, identity)
    return {node["name"]: [worlds[i][12], worlds[i][13], worlds[i][14]] for i, node in enumerate(doc.get("nodes", [])) if node.get("name") and i in worlds}


def stable(value) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def cross_file_checks(before_path: Path, after_path: Path, entry: dict) -> dict:
    before = glb_json(before_path)
    after = glb_json(after_path)
    before_names = {n.get("name") for n in before.get("nodes", []) if n.get("name")}
    after_names = {n.get("name") for n in after.get("nodes", []) if n.get("name")}
    required = {"LOD0", "LOD1", *entry.get("sockets", [])}
    missing = sorted(required - after_names)
    if missing:
        raise RuntimeError(f"candidate lost required nodes: {missing}")
    roots = {}
    for name in ("LOD0", "LOD1"):
        b = next(n for n in before["nodes"] if n.get("name") == name)
        a = next(n for n in after["nodes"] if n.get("name") == name)
        if stable(b.get("extras")) != stable(a.get("extras")):
            raise RuntimeError(f"{name} extras changed")
        roots[name] = a.get("extras")
    bp, ap = node_world_positions(before), node_world_positions(after)
    moved = {}
    for name in entry.get("sockets", []):
        if name not in bp or name not in ap:
            raise RuntimeError(f"cannot compare socket {name}")
        delta = math.dist(bp[name], ap[name])
        moved[name] = delta
        if delta > 0.01:
            raise RuntimeError(f"socket {name} moved {delta:.6f} m")
    image_limit = len(before.get("images", [])) if entry["request"] in PRESERVE_SOURCE_TEXTURE_REQUESTS else 2
    if len(after.get("images", [])) > image_limit:
        raise RuntimeError(f"candidate embeds {len(after.get('images', []))} images; expected at most {image_limit}")
    before_animations = before.get("animations", [])
    after_animations = after.get("animations", [])
    if before_animations or after_animations:
        raise RuntimeError(
            "static Tier A path received animation data "
            f"(source={len(before_animations)}, candidate={len(after_animations)})"
        )
    result = {
        "source_nodes": len(before.get("nodes", [])),
        "candidate_nodes": len(after.get("nodes", [])),
        "source_named_nodes": len(before_names),
        "candidate_named_nodes": len(after_names),
        "socket_deltas_m": moved,
        "images": len(after.get("images", [])),
        "animations": {"source": len(before_animations), "candidate": len(after_animations)},
        "root_extras": roots,
    }
    functional = entry.get("functional_rigid")
    if functional:
        source_structure = entry["functional_structure"]
        candidate_structure = functional_structure(after, functional, entry.get("sockets", []))
        compare_functional_structure(source_structure, candidate_structure)
        result["functional_structure"] = {
            "status": "preserved",
            "reason": functional["reason"],
            "source": source_structure,
            "candidate": candidate_structure,
        }
    return result


def parse_validator(output: str) -> dict:
    import re
    match = re.search(r"\n?\s*(\d+) nodes · (\d+) meshes · (\d+) materials · (\d+)/(\d+) tris", output)
    if not match:
        raise RuntimeError("could not parse validator metrics")
    nodes, meshes, materials, lod0, lod1 = map(int, match.groups())
    return {"nodes": nodes, "meshes": meshes, "materials": materials, "triangles": [lod0, lod1]}


def manifest_bounds_review(entry: dict, blender_report: dict) -> dict:
    manifest = [float(value) for value in entry.get("bounds", [])]
    exact_source = [float(value) for value in blender_report["before"]["bounds"]["0"]]
    if len(manifest) != 3 or len(exact_source) != 3:
        raise RuntimeError("cannot compare manifest and exact decoded LOD0 bounds")
    deltas = [abs(actual - recorded) / max(recorded, 0.001) for recorded, actual in zip(manifest, exact_source)]
    required = any(delta > 0.12 for delta in deltas)
    return {
        "required_before_integration": required,
        "manifest": manifest,
        "exact_decoded_source": exact_source,
        "relative_deltas_percent": [round(delta * 100, 3) for delta in deltas],
        "reason": (
            "compressed accessor AABB measurement differs from exact decoded source geometry"
            if required else "exact decoded source geometry remains within the production validator tolerance"
        ),
    }


def tools() -> tuple[Path, Path]:
    gltfpack = next((p for p in GLTFPACK_CANDIDATES if p.is_file() and os.access(p, os.X_OK)), None)
    if gltfpack is None:
        raise RuntimeError("gltfpack not found; set GLTFPACK or populate the existing npm cache")
    if not BLENDER.exists():
        raise RuntimeError(f"Blender not found: {BLENDER}")
    return gltfpack, BLENDER


def ensure_previews(job: Path, preview_key: str, blender: Path) -> dict[str, str]:
    before = WORK / "previews" / f"{preview_key}-before.png"
    after = WORK / "previews" / f"{preview_key}-after.png"
    before_lod1 = WORK / "previews" / f"{preview_key}-before-lod1.png"
    after_lod1 = WORK / "previews" / f"{preview_key}-after-lod1.png"
    inputs = (
        (job / "decoded.glb", before, "preview-before.log", 0),
        (job / "cleaned.raw.glb", after, "preview-after.log", 0),
        (job / "decoded.glb", before_lod1, "preview-before-lod1.log", 1),
        (job / "cleaned.raw.glb", after_lod1, "preview-after-lod1.log", 1),
    )
    for source, output, log_name, lod in inputs:
        if output.exists() and output.stat().st_mtime >= source.stat().st_mtime:
            continue
        if not source.exists():
            raise RuntimeError(f"cannot render preview; missing job artifact {source}")
        run(
            [
                str(blender), "--background", "--python", str(HERE / "tier_a_preview.py"), "--",
                str(source), str(output), "--lod", str(lod),
            ],
            job / log_name,
        )
    return {
        "before": str(before.relative_to(ROOT)),
        "after": str(after.relative_to(ROOT)),
        "before_lod1": str(before_lod1.relative_to(ROOT)),
        "after_lod1": str(after_lod1.relative_to(ROOT)),
    }


def process(entry: dict, force: bool) -> dict:
    request = entry["request"]
    rel = Path(entry["file"])
    key = f"{request}-{rel.stem}"
    job = WORK / "jobs" / key
    candidate = WORK / "candidates" / rel
    final_report = WORK / "reports" / f"{key}.json"
    preview_key = key if request == "M-092" else request
    source = MODEL_DIR / rel
    gltfpack, blender = tools()
    if candidate.exists() and final_report.exists() and not force:
        report = json.loads(final_report.read_text())
        if report.get("status") == "passed":
            _, blender = tools()
            report["manifest_bounds_review"] = manifest_bounds_review(entry, report["blender"])
            report["previews"] = ensure_previews(job, preview_key, blender)
            final_report.write_text(json.dumps(report, indent=2) + "\n")
        return report
    if job.exists():
        shutil.rmtree(job)
    job.mkdir(parents=True)
    (job / "atlas").mkdir()
    decoded = job / "decoded.glb"
    raw = job / "cleaned.raw.glb"
    compressed = job / "cleaned.compressed.glb"
    contract = dict(entry)
    source_doc = glb_json(source)
    contract["source_nodes"] = len(source_doc.get("nodes", []))
    contract["source_images"] = len(source_doc.get("images", []))
    contract["source_animations"] = len(source_doc.get("animations", []))
    contract["compressed_source_triangles"] = triangle_counts_by_lod(source_doc)
    contract["import_triangle_exception"] = IMPORT_TRIANGLE_EXCEPTIONS.get(request)
    contract["functional_rigid"] = FUNCTIONAL_RIGID_REQUESTS.get(request)
    if contract["functional_rigid"]:
        contract["functional_structure"] = functional_structure(
            source_doc, contract["functional_rigid"], contract.get("sockets", [])
        )
    contract["preserve_source_textures"] = request in PRESERVE_SOURCE_TEXTURE_REQUESTS
    contract["jpeg_emission"] = request in JPEG_EMISSION_REQUESTS
    (job / "contract.json").write_text(json.dumps(contract, indent=2) + "\n")
    started = time.time()
    stage = "decode"
    try:
        if contract["source_animations"] or contract.get("clips"):
            raise RuntimeError(
                "static Tier A cleanup refuses animated inputs: "
                f"GLB animations={contract['source_animations']}, manifest clips={contract.get('clips', [])}"
            )
        run([str(gltfpack), "-i", str(source), "-o", str(decoded), "-noq", "-kn", "-ke", "-km"], job / "decode.log")
        decoded_doc = glb_json(decoded)
        if len(decoded_doc.get("nodes", [])) != contract["source_nodes"]:
            raise RuntimeError(f"decode changed node count {contract['source_nodes']} -> {len(decoded_doc.get('nodes', []))}")
        decoded_triangles = triangle_counts_by_lod(decoded_doc)
        if decoded_triangles != contract["compressed_source_triangles"]:
            raise RuntimeError(
                "decode changed authored triangle counts "
                f"{contract['compressed_source_triangles']} -> {decoded_triangles}"
            )
        stage = "blender"
        blender_args = [
            str(blender), "--background", "--python", str(HERE / "tier_a_cleanup.py"), "--",
            "--input", str(decoded), "--output", str(raw), "--contract", str(job / "contract.json"),
            "--report", str(job / "blender-report.json"), "--atlas-dir", str(job / "atlas"),
        ]
        if rel.parts and rel.parts[0] == "terrain":
            blender_args.append("--terrain-bake-only")
        run(blender_args, job / "blender.log")
        if not raw.exists() or not (job / "blender-report.json").exists():
            raise RuntimeError("Blender did not produce the raw GLB and success report; see blender.log")
        stage = "compress"
        run(["node", str(HERE / "compress.mjs"), str(raw), str(compressed), "--gltfpack", str(gltfpack), "--force"], job / "compress.log")
        stage = "validate"
        blender_report = json.loads((job / "blender-report.json").read_text())
        validation_entry = dict(entry)
        validation_entry["file"] = compressed.name
        # The production measurement can overestimate rotated source parts
        # because compressed accessor AABBs are transformed by their corners.
        # Validate against the exact decoded vertex bounds recorded by Blender.
        validation_entry["bounds"] = blender_report["before"]["bounds"]["0"]
        validation_manifest = job / "validation-manifest.json"
        validation_manifest.write_text(json.dumps({"version": 1, "models": [validation_entry]}, indent=2) + "\n")
        validation = run(
            ["node", str(HERE / "validate.mjs"), "--manifest", str(validation_manifest), str(compressed)],
            job / "validate.log",
        )
        metrics = parse_validator(validation)
        if metrics["triangles"][1] >= metrics["triangles"][0]:
            raise RuntimeError("validator metrics violate LOD relation")
        cross = cross_file_checks(source, compressed, contract)
        if request in PRESERVE_SOURCE_TEXTURE_REQUESTS:
            size_limit = math.ceil(source.stat().st_size * 1.05)
        else:
            size_limit = 2_500_000 if max(entry["bounds"]) > 120 else 1_200_000
        byte_count = compressed.stat().st_size
        if byte_count >= size_limit:
            raise RuntimeError(f"candidate is {byte_count} bytes; Tier A limit is {size_limit}")
        candidate.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(compressed, candidate)
        report = {
            "status": "passed",
            "request": request,
            "name": entry["name"],
            "source": str(source.relative_to(ROOT)),
            "candidate": str(candidate.relative_to(ROOT)),
            "source_bytes": source.stat().st_size,
            "candidate_bytes": byte_count,
            "byte_reduction_percent": round((1 - byte_count / source.stat().st_size) * 100, 1),
            "metrics": metrics,
            "cross_file_checks": cross,
            "manifest_bounds_review": manifest_bounds_review(entry, blender_report),
            "blender": blender_report,
            "seconds": round(time.time() - started, 1),
        }
        report["previews"] = ensure_previews(job, preview_key, blender)
    except Exception as error:
        if candidate.exists():
            candidate.unlink()
        report = {
            "status": "failed",
            "request": request,
            "name": entry["name"],
            "source": str(source.relative_to(ROOT)),
            "stage": stage,
            "error": str(error),
            "seconds": round(time.time() - started, 1),
        }
    final_report.parent.mkdir(parents=True, exist_ok=True)
    final_report.write_text(json.dumps(report, indent=2) + "\n")
    return report


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("requests", nargs="*", help="request IDs, paths, or 'landmarks'")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    models = [m for m in json.loads(MANIFEST.read_text())["models"] if m.get("processing") == "needs-cleanup"]
    selectors = set(args.requests)
    if not selectors:
        parser.error("select request IDs/paths, 'landmarks', 'episode-one-static', or 'all'")
    def selected(entry: dict) -> bool:
        if "all" in selectors:
            return True
        if "landmarks" in selectors and entry["file"].startswith("landmarks/"):
            return True
        if "episode-one-static" in selectors and entry["request"] in {"M-024", "M-027", "M-036", "M-037"}:
            return True
        return entry["request"] in selectors or entry["file"] in selectors
    chosen = [entry for entry in models if selected(entry)]
    if not chosen:
        parser.error("no needs-cleanup entries matched")
    results = []
    for entry in chosen:
        print(f"TIER_A_START {entry['request']} {entry['file']}", flush=True)
        report = process(entry, args.force)
        results.append(report)
        detail = report.get("candidate", report.get("error", report.get("reason")))
        print(f"TIER_A_{report['status'].upper()} {entry['request']} {detail}", flush=True)
    passed = sum(r["status"] == "passed" for r in results)
    failed = len(results) - passed
    print(f"TIER_A_SUMMARY {passed} passed, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
