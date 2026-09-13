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
    if len(after.get("images", [])) > 2:
        raise RuntimeError(f"candidate embeds {len(after.get('images', []))} images; expected at most two")
    return {
        "source_nodes": len(before.get("nodes", [])),
        "candidate_nodes": len(after.get("nodes", [])),
        "source_named_nodes": len(before_names),
        "candidate_named_nodes": len(after_names),
        "socket_deltas_m": moved,
        "images": len(after.get("images", [])),
        "root_extras": roots,
    }


def parse_validator(output: str) -> dict:
    import re
    match = re.search(r"\n?\s*(\d+) nodes · (\d+) meshes · (\d+) materials · (\d+)/(\d+) tris", output)
    if not match:
        raise RuntimeError("could not parse validator metrics")
    nodes, meshes, materials, lod0, lod1 = map(int, match.groups())
    return {"nodes": nodes, "meshes": meshes, "materials": materials, "triangles": [lod0, lod1]}


def tools() -> tuple[Path, Path]:
    gltfpack = next((p for p in GLTFPACK_CANDIDATES if p.is_file() and os.access(p, os.X_OK)), None)
    if gltfpack is None:
        raise RuntimeError("gltfpack not found; set GLTFPACK or populate the existing npm cache")
    if not BLENDER.exists():
        raise RuntimeError(f"Blender not found: {BLENDER}")
    return gltfpack, BLENDER


def process(entry: dict, force: bool) -> dict:
    gltfpack, blender = tools()
    request = entry["request"]
    rel = Path(entry["file"])
    key = f"{request}-{rel.stem}"
    job = WORK / "jobs" / key
    candidate = WORK / "candidates" / rel
    final_report = WORK / "reports" / f"{key}.json"
    if candidate.exists() and final_report.exists() and not force:
        return json.loads(final_report.read_text())
    if job.exists():
        shutil.rmtree(job)
    job.mkdir(parents=True)
    (job / "atlas").mkdir()
    source = MODEL_DIR / rel
    decoded = job / "decoded.glb"
    raw = job / "cleaned.raw.glb"
    compressed = job / "cleaned.compressed.glb"
    contract = dict(entry)
    source_doc = glb_json(source)
    contract["source_nodes"] = len(source_doc.get("nodes", []))
    contract["source_images"] = len(source_doc.get("images", []))
    (job / "contract.json").write_text(json.dumps(contract, indent=2) + "\n")
    started = time.time()
    stage = "decode"
    try:
        run([str(gltfpack), "-i", str(source), "-o", str(decoded), "-noq", "-kn", "-ke", "-km"], job / "decode.log")
        decoded_doc = glb_json(decoded)
        if len(decoded_doc.get("nodes", [])) != contract["source_nodes"]:
            raise RuntimeError(f"decode changed node count {contract['source_nodes']} -> {len(decoded_doc.get('nodes', []))}")
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
        validation_entry = dict(entry)
        validation_entry["file"] = compressed.name
        validation_manifest = job / "validation-manifest.json"
        validation_manifest.write_text(json.dumps({"version": 1, "models": [validation_entry]}, indent=2) + "\n")
        validation = run(
            ["node", str(HERE / "validate.mjs"), "--manifest", str(validation_manifest), str(compressed)],
            job / "validate.log",
        )
        metrics = parse_validator(validation)
        if metrics["triangles"][1] >= metrics["triangles"][0]:
            raise RuntimeError("validator metrics violate LOD relation")
        cross = cross_file_checks(source, compressed, entry)
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
            "blender": json.loads((job / "blender-report.json").read_text()),
            "seconds": round(time.time() - started, 1),
        }
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
        print(f"TIER_A_{report['status'].upper()} {entry['request']} {report.get('candidate', report.get('error'))}", flush=True)
    passed = sum(r["status"] == "passed" for r in results)
    failed = len(results) - passed
    print(f"TIER_A_SUMMARY {passed} passed, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
