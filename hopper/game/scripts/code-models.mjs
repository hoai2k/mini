#!/usr/bin/env node
/** Code-built GLBs for model requests that have no painted model yet.
 *
 * The geometry is authored in three.js (custom builders in ./code-models/,
 * or the stand-in library for kits and landmarks), painted with the delivered
 * trim sheets and terrain sets, and written as the same kind of GLB the
 * Blender pipeline delivers: LOD0 + LOD1 hierarchies, named sockets,
 * landing metadata in extras, KHR_mesh_quantization + EXT_meshopt_compression.
 *
 * These are stand-ins with better clothes, not final art. Every entry is
 * recorded in hopper/3d/models/manifest.json with authoring: 'code-built',
 * so a painted model can replace it later without anybody guessing.
 *
 * Usage (from hopper/game): node scripts/code-models.mjs [M-024 ...]
 *   --previews   also render studio previews with headless Chromium
 *   --no-write   build and validate without touching hopper/3d/models
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { reorder, simplifyPrimitive, weldPrimitive, prune, dedup } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import { PNG } from 'pngjs';
import { createStandIn, makeLandmark, regionById } from '../../3d/standins/src/index.js';
import { BUILDERS, terrainBuilders, prepareTerrain } from './code-models/index.mjs';
import { coarsen, worldBounds, stripInk } from './code-models/lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const MODELS = path.join(ROOT, 'hopper/3d/models');
const TEXTURES = path.join(ROOT, 'hopper/3d/textures');
const DESIGN = JSON.parse(fs.readFileSync(path.join(ROOT, 'hopper/3d/design/standin-manifest.json'), 'utf8'));
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const wanted = args.filter((a) => /^M-\d{3}$/.test(a));

/** Trim sheets are eight equal horizontal bands, top to bottom (textures3d.ts). */
export const TRIM_BANDS = {
  fields: ['ivory', 'tile', 'timber', 'concrete', 'ivory', 'tile', 'timber', 'concrete'],
  city: ['ivory', 'glass', 'rail', 'billboard', 'ivory', 'glass', 'rail', 'billboard'],
  mountains: ['slate', 'timber', 'iron', 'slate', 'slate', 'timber', 'iron', 'slate'],
  foundry: ['iron', 'rust', 'brick', 'iron', 'iron', 'rust', 'brick', 'iron'],
  harbor: ['steel', 'container', 'crane', 'steel', 'steel', 'container', 'crane', 'steel'],
  launchworks: ['rust', 'rocket', 'brass', 'rust', 'rust', 'rocket', 'brass', 'rust'],
  red: ['coral', 'bone', 'coral', 'bone', 'coral', 'bone', 'coral', 'bone'],
  blue: ['reef', 'crystal', 'reef', 'crystal', 'reef', 'crystal', 'reef', 'crystal'],
  violet: ['obsidian', 'seam', 'ringstone', 'obsidian', 'obsidian', 'seam', 'ringstone', 'obsidian'],
};

/** Which painting a stand-in material gets, from the colour and procedural
 * texture it was built with. Custom builders set mesh.userData.paint directly. */
function paintFor(region, meta) {
  const { color, texture } = meta;
  const trim = (band, repeat = 1) => ({ kind: 'trim', band, repeat });
  const terrain = (file, repeat) => ({ kind: 'terrain', file, repeat });
  const t = texture || '';
  if (t === 'grass') return terrain('ground.png', 3);
  if (t === 'terrace' || t === 'soil') return terrain('path.png', 2);
  if (t === 'rock' || t === 'slate' || t === 'basalt') return terrain('cliff.png', 2);
  if (region === 'fields') {
    if (t === 'ivory' && color === '#b8b3a4') return trim('concrete');
    if (t === 'ivory') return trim('ivory');
    if (color === '#a0402e' || color === '#7d3b32') return trim('tile');
    if (color === '#8c6a3f' || t === 'wood') return trim('timber');
  }
  if (region === 'city') {
    if (t === 'ivory') return trim('ivory');
    if (color === '#5fb7a6' || t === 'glass') return trim('glass');
    if (t === 'iron' || t === 'steel') return trim('rail');
  }
  if (region === 'mountains') {
    if (t === 'wood' || color === '#8c6a3f') return trim('timber');
    if (t === 'iron' || t === 'rust') return trim('iron');
    if (t === 'ivory') return trim('slate');
  }
  if (region === 'red') {
    if (t === 'coral' || color === '#7d2f2c' || color === '#b7322c') return trim('coral', 2);
    if (t === 'bone' || color === '#efe5cf') return trim('bone', 2);
  }
  if (region === 'blue') {
    if (t === 'reef' || color === '#3f7fb5') return trim('reef', 2);
    if (color === '#6fa5d9') return trim('crystal', 2);
  }
  if (region === 'violet') {
    if (t === 'obsidian' || color === '#2a1e34') return trim('obsidian', 2);
    if (color === '#5a4a6a' || color === '#8a7a9a' || color === '#3a2a4a') return trim('ringstone', 2);
    if (t === 'rock') return trim('ringstone', 2);
  }
  return null;
}

/* ---------- images ---------- */
const imageCache = new Map();
/** Read a PNG and box-filter it down to at most `max` pixels a side. */
function loadImage(file, max = 1024) {
  const key = `${file}@${max}`;
  if (imageCache.has(key)) return imageCache.get(key);
  const png = PNG.sync.read(fs.readFileSync(file));
  let { width, height, data } = png;
  const f = Math.max(1, Math.ceil(Math.max(width, height) / max));
  if (f > 1) {
    const w = Math.floor(width / f),
      h = Math.floor(height / f),
      out = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const acc = [0, 0, 0, 0];
        for (let j = 0; j < f; j++)
          for (let i = 0; i < f; i++) {
            const p = ((y * f + j) * width + x * f + i) * 4;
            for (let c = 0; c < 4; c++) acc[c] += data[p + c];
          }
        const q = (y * w + x) * 4;
        for (let c = 0; c < 4; c++) out[q + c] = Math.round(acc[c] / (f * f));
      }
    data = out;
    width = w;
    height = h;
  }
  const small = new PNG({ width, height });
  small.data = data;
  const bytes = PNG.sync.write(small, { colorType: 6 });
  imageCache.set(key, bytes);
  return bytes;
}

/* ---------- three → glTF ---------- */
function linearRgb(hex) {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
}

class Exporter {
  constructor(region) {
    this.doc = new Document();
    this.buffer = this.doc.createBuffer();
    this.scene = this.doc.createScene('Scene');
    this.region = region;
    this.materials = new Map();
    this.textures = new Map();
    this.triangles = [0, 0];
  }
  texture(file, name) {
    const key = file;
    if (this.textures.has(key)) return this.textures.get(key);
    const t = this.doc.createTexture(name).setImage(loadImage(file)).setMimeType('image/png');
    this.textures.set(key, t);
    return t;
  }
  /** Material for a paint description; deduplicated within the file. */
  material(paint) {
    const key = JSON.stringify(paint);
    if (this.materials.has(key)) return this.materials.get(key);
    const m = this.doc.createMaterial(paint.name || key.slice(0, 40)).setRoughnessFactor(0.9).setMetallicFactor(0);
    const rgb = paint.color ? linearRgb(paint.color) : [1, 1, 1];
    m.setBaseColorFactor([...rgb, paint.opacity ?? 1]);
    if (paint.opacity !== undefined && paint.opacity < 1) m.setAlphaMode('BLEND').setDoubleSided(true);
    if (paint.kind === 'trim') {
      const file = path.join(TEXTURES, 'trim', `${this.region}.png`);
      if (fs.existsSync(file)) {
        m.setBaseColorTexture(this.texture(file, `trim.${this.region}`));
        m.getBaseColorTextureInfo().setWrapS(10497).setWrapT(33071);
        // The trim is painted colour: the factor only tints.
        m.setBaseColorFactor([1, 1, 1, paint.opacity ?? 1]);
        const em = path.join(TEXTURES, 'trim', `${this.region}-emissive.png`);
        if (fs.existsSync(em) && paint.emissiveBand !== false) {
          m.setEmissiveTexture(this.texture(em, `trim.${this.region}.emissive`));
          m.getEmissiveTextureInfo().setWrapS(10497).setWrapT(33071);
          m.setEmissiveFactor(linearRgb('#ffd38c').map((c) => c * 0.8));
        }
      }
    } else if (paint.kind === 'terrain') {
      const file = path.join(TEXTURES, 'terrain', this.region, paint.file);
      if (fs.existsSync(file)) {
        m.setBaseColorTexture(this.texture(file, `terrain.${this.region}.${paint.file.replace('.png', '')}`));
        m.getBaseColorTextureInfo().setWrapS(10497).setWrapT(10497);
        m.setBaseColorFactor([1, 1, 1, 1]);
      }
    }
    if (paint.emissive) {
      const k = paint.emissiveIntensity ?? 0.9;
      m.setEmissiveFactor(linearRgb(paint.emissive).map((c) => Math.min(1, c * k)));
    }
    this.materials.set(key, m);
    return m;
  }
  /** glTF UVs for a geometry given its paint: trim bands select a strip of the sheet. */
  uvFor(geometry, paint) {
    const src = geometry.attributes.uv;
    const n = geometry.attributes.position.count;
    const out = new Float32Array(n * 2);
    const repeat = paint?.repeat ?? 1;
    const bands = TRIM_BANDS[this.region] || [];
    const band = paint?.kind === 'trim' ? bands.indexOf(paint.band) : -1;
    for (let i = 0; i < n; i++) {
      let u = src ? src.getX(i) : 0,
        v = src ? 1 - src.getY(i) : 0;
      if (band >= 0) {
        // Band from the top of the sheet, inset against filtering bleed; u repeats.
        const frac = ((v * repeat) % 1 + 1) % 1;
        u = u * repeat;
        v = band / 8 + 0.004 + frac * (1 / 8 - 0.008);
      } else if (paint?.kind === 'terrain') {
        u *= repeat;
        v *= repeat;
      }
      out[i * 2] = u;
      out[i * 2 + 1] = v;
    }
    return out;
  }
  primitive(mesh, lod) {
    const geometry = mesh.geometry.index ? mesh.geometry : mesh.geometry;
    const meta = mesh.material?.userData?.standIn;
    const paint = mesh.userData.paint || (meta ? { ...paintFor(this.region, meta), color: meta.color, emissive: meta.emissive, emissiveIntensity: mesh.material.emissiveIntensity, opacity: mesh.material.transparent ? mesh.material.opacity : undefined } : { color: '#' + (mesh.material?.color?.getHexString?.() || 'ffffff') });
    if (paint.kind === 'trim' || paint.kind === 'terrain') paint.color = undefined;
    const material = this.material(paint);
    const pos = geometry.attributes.position;
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    const nor = geometry.attributes.normal;
    const prim = this.doc.createPrimitive().setMaterial(material);
    prim.setAttribute('POSITION', this.doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos.array)).setBuffer(this.buffer));
    prim.setAttribute('NORMAL', this.doc.createAccessor().setType('VEC3').setArray(new Float32Array(nor.array)).setBuffer(this.buffer));
    prim.setExtras({ quantizeMe: true });
    prim.setAttribute('TEXCOORD_0', this.doc.createAccessor().setType('VEC2').setArray(this.uvFor(geometry, paint)).setBuffer(this.buffer));
    if (geometry.attributes.color) prim.setAttribute('COLOR_0', this.doc.createAccessor().setType('VEC3').setArray(new Float32Array(geometry.attributes.color.array)).setBuffer(this.buffer));
    if (geometry.index) prim.setIndices(this.doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(geometry.index.array)).setBuffer(this.buffer));
    if (lod === 1) {
      weldPrimitive(prim, { tolerance: 0.0001 });
      const before = trianglesOfPrim(prim);
      if (before > 24) {
        const simplified = simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio: 0.35, error: 0.02, lockBorder: false });
        if (simplified !== prim) prim.dispose();
        return simplified;
      }
    }
    return prim;
  }
  /** Walk a three hierarchy into a LOD root node. */
  lod(root, lod, extras) {
    const node = this.doc.createNode(`LOD${lod}`).setExtras({ lod, ...extras });
    this.scene.addChild(node);
    const walk = (obj, parent, depth) => {
      for (const child of obj.children) {
        if (child.userData.ink || child.visible === false) continue;
        if (lod === 1 && child.userData.detail) continue;
        const n = this.doc.createNode(lod ? `LOD1.${child.name || 'node'}` : child.name || 'node');
        n.setTranslation(child.position.toArray()).setRotation(child.quaternion.toArray()).setScale(child.scale.toArray());
        if (child.userData.socket) n.setExtras({ socket: true });
        if (child.isMesh) {
          const prim = this.primitive(child, lod);
          const mesh = this.doc.createMesh(n.getName()).addPrimitive(prim);
          // gltfpack-style quantisation: uint16 positions on a grid, the
          // dequantisation transform on an unnamed child node.
          const q = this.quantizePrimitive(prim);
          n.addChild(this.doc.createNode().setTranslation(q.translation).setScale([q.scale, q.scale, q.scale]).setMesh(mesh));
          this.triangles[lod] += trianglesOfPrim(prim);
        }
        parent.addChild(n);
        walk(child, n, depth + 1);
      }
    };
    walk(root, node, 0);
    return node;
  }
  /** Positions to uint16 on a 0..16383 grid (non-normalised, as gltfpack writes them),
   * normals to int8 normalised. Returns the node transform that restores metres. */
  quantizePrimitive(prim) {
    const p = prim.getAttribute('POSITION');
    const arr = p.getArray();
    const min = [Infinity, Infinity, Infinity],
      max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < arr.length; i += 3)
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], arr[i + k]);
        max[k] = Math.max(max[k], arr[i + k]);
      }
    const extent = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2], 1e-6);
    const scale = extent / 16383;
    const out = new Uint16Array(arr.length);
    for (let i = 0; i < arr.length; i += 3) for (let k = 0; k < 3; k++) out[i + k] = Math.round((arr[i + k] - min[k]) / scale);
    p.setArray(out).setNormalized(false);
    const n = prim.getAttribute('NORMAL');
    if (n) {
      const na = n.getArray(),
        no = new Int8Array(na.length);
      for (let i = 0; i < na.length; i++) no[i] = Math.round(Math.max(-1, Math.min(1, na[i])) * 127);
      n.setArray(no).setNormalized(true);
    }
    const idx = prim.getIndices();
    if (idx && p.getCount() <= 65535) idx.setArray(new Uint16Array(idx.getArray()));
    return { translation: min, scale };
  }
  async write(file) {
    // Positions and normals are already quantised (gltfpack style, above), so
    // only reorder and compress here rather than letting meshopt() requantise.
    this.doc.createExtension(KHRMeshQuantization).setRequired(true);
    this.doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: 'quantize' });
    await this.doc.transform(dedup(), prune({ keepLeaves: true, keepAttributes: true }), reorder({ encoder: MeshoptEncoder, target: 'size' }));
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await io.write(file, this.doc);
  }
}
function trianglesOfPrim(prim) {
  const idx = prim.getIndices();
  const count = idx ? idx.getCount() : prim.getAttribute('POSITION').getCount();
  return Math.floor(count / 3);
}

/* ---------- catalogue ---------- */
const requests = new Map(DESIGN.requests.filter((r) => r.kind === 'model').map((r) => [r.request, r]));

/** What we can build: request → {file, build(lod) → three root, targetBounds, reference}. */
function catalogue() {
  const out = [];
  for (const r of requests.values()) {
    if (r.category === 'structure' || r.category === 'prop') {
      const key = r.standIn.split('.').pop();
      const custom = BUILDERS[r.standIn];
      out.push({
        request: r.request,
        name: r.name,
        category: r.category,
        region: r.region,
        standIn: r.standIn,
        file: r.category === 'structure' ? `structures/${r.region}/${key}.glb` : `props/${key}.glb`,
        targetBounds: r.size_m,
        reference: r.category === 'structure' ? `design/references/kits/${r.region}.png` : 'design/references/props.png',
        authoring: custom ? 'code-built (authored three.js geometry, painted trim and terrain sheets)' : 'code-built (stand-in geometry, painted trim and terrain sheets)',
        build: custom ? (lod) => custom(lod) : (lod) => (lod ? coarsen(stripInk(createStandIn(r.standIn))) : stripInk(createStandIn(r.standIn))),
      });
    } else if (r.category === 'landmark') {
      const region = r.region;
      out.push({
        request: r.request,
        name: r.name,
        category: 'landmark',
        region,
        standIn: 'terrain.landmark',
        file: `landmarks/${region}.glb`,
        targetBounds: null,
        reference: `design/assets/level-${['fields', 'city', 'mountains'].includes(region) ? '1-earth' : ['foundry', 'harbor', 'launchworks'].includes(region) ? '2-industry' : '3-alien'}.png`,
        authoring: 'code-built silhouette (stand-in geometry in the region haze colour); the kit model replaces it at approach',
        notes: 'The request envelope of 400 × 600 × 400 m was nominal; the silhouette keeps the size the stand-in is placed at so the horizon composition is unchanged.',
        build: (lod) => {
          const g = stripInk(makeLandmark(regionById(region)));
          g.position.set(0, 0, 0);
          return lod ? coarsen(g) : g;
        },
      });
    } else if (r.category === 'terrain') {
      for (const t of terrainBuilders()) out.push({ ...t, request: r.request, category: 'terrain', standIn: 'terrain.heightfield', reference: 'design/assets/level-1-earth.png', authoring: 'code-built heightfield (the same generator the game samples for collision), painted with the terrain set' });
    }
  }
  return out;
}

/* ---------- main ---------- */
async function main() {
  await MeshoptEncoder.ready;
  await MeshoptSimplifier.ready;
  await prepareTerrain();
  const manifestPath = path.join(MODELS, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const existing = new Map(manifest.models.map((m) => [m.file, m]));
  const items = catalogue().filter((c) => (wanted.length ? wanted.includes(c.request) : !existing.has(c.file) || existing.get(c.file).authoring));
  if (!items.length) {
    console.log('Nothing to build.');
    return;
  }
  const built = [];
  for (const item of items) {
    const t0 = Date.now();
    const roots = [item.build(0), item.build(1)];
    for (const r of roots) r.updateMatrixWorld(true);
    const exporter = new Exporter(item.region);
    const landings = roots[0].userData.landings || [];
    const sockets = [];
    roots[0].traverse((o) => {
      if (o.userData.socket) sockets.push(o.name);
    });
    const extras = { request: item.request, standIn: item.standIn, authoring: item.authoring, reference: item.reference, landings: JSON.stringify(landings) };
    exporter.lod(roots[0], 0, extras);
    exporter.lod(roots[1], 1, { request: item.request });
    const bounds = worldBounds(roots[0]);
    const file = path.join(MODELS, item.file);
    if (!flags.has('--no-write')) await exporter.write(file);
    const [t0n, t1n] = exporter.triangles;
    const entry = {
      request: item.request,
      name: item.name,
      file: item.file,
      preview: `previews/${item.file.replace(/^structures\//, '').replace(/^props\//, '').replace(/\//g, '.').replace('.glb', '')}.png`,
      category: item.category,
      region: item.region,
      source: 'game/scripts/code-models.mjs',
      authoring: item.authoring,
      bounds: bounds.map((v) => Number(v.toFixed(3))),
      targetBounds: item.targetBounds || bounds.map((v) => Number(v.toFixed(3))),
      triangles: [t0n, t1n],
      clips: [],
      sockets: sockets.sort((a, b) => a.localeCompare(b)),
      landings,
      status: 'delivered',
      sourceReference: item.reference,
      ...(item.notes ? { notes: item.notes } : {}),
      ...(item.extraFiles ? { extraFiles: item.extraFiles } : {}),
    };
    built.push(entry);
    console.log(`${item.request} ${item.file}: ${t0n}/${t1n} tris, ${bounds.map((v) => v.toFixed(1)).join(' × ')} m${item.targetBounds ? ` (target ${item.targetBounds.join(' × ')})` : ''}, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    if (item.after && !flags.has('--no-write')) await item.after(file, entry);
  }
  if (!flags.has('--no-write')) {
    for (const e of built) {
      const i = manifest.models.findIndex((m) => m.file === e.file);
      if (i >= 0) manifest.models[i] = e;
      else manifest.models.push(e);
    }
    manifest.models.sort((a, b) => a.request.localeCompare(b.request));
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`manifest: ${manifest.models.length} models`);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
