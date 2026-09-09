/** Region terrain sculpts (M-092) for the episode-one districts: the game's
 * own heightfield generator, exported as a mesh plus a 16-bit heightmap PNG.
 * The runtime keeps sampling the generator for collision; the GLB and the
 * heightmap are the deliverable the request asks for, so the same shape can
 * be resculpted in a DCC tool and handed back.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { makeHeightField, regionById } from '../../../3d/standins/src/index.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

/** The districts, transpiled from district.ts the way the tests do it. */
function loadDistricts() {
  const ts = require('typescript');
  const src = fs.readFileSync(path.join(HERE, '../../src/game3d/district.ts'), 'utf8');
  const out = ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, verbatimModuleSyntax: false } }).outputText;
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hopper-district-')), 'district.mjs');
  fs.writeFileSync(file, out);
  return import(file);
}

/** Minimal 16-bit greyscale PNG writer. */
function png16(width, height, values) {
  const raw = Buffer.alloc((width * 2 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 2 + 1)] = 0;
    for (let x = 0; x < width; x++) raw.writeUInt16BE(values[y * width + x], y * (width * 2 + 1) + 1 + x * 2);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32 ? zlib.crc32(body) : crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 16;
  ihdr[9] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
let table = null;
function crc32(buf) {
  if (!table) {
    table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = -1;
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function terrainMesh(region, district, segments, lod) {
  const heightAt = makeHeightField({ size: district.size, ...district.terrain });
  const geo = new THREE.PlaneGeometry(district.size, district.size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const ground = new THREE.Color(region.ground),
    accent = new THREE.Color(region.accent),
    haze = new THREE.Color(region.haze);
  const relief = district.terrain.relief;
  let min = Infinity,
    max = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      z = pos.getZ(i),
      y = heightAt(x, z);
    pos.setY(i, y);
    min = Math.min(min, y);
    max = Math.max(max, y);
    const slope = Math.abs(heightAt(x + 4, z) - y) + Math.abs(heightAt(x, z + 4) - y);
    const t = Math.min(1, Math.max(0, (y + relief) / (relief * 3)));
    const rock = Math.min(1, slope / 6);
    const c = ground.clone().lerp(accent, t * 0.15).multiplyScalar(0.9 + t * 0.5).lerp(haze, rock * 0.4);
    colors[i * 3] = Math.min(1, c.r);
    colors[i * 3 + 1] = Math.min(1, c.g);
    colors[i * 3 + 2] = Math.min(1, c.b);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const root = new THREE.Group();
  root.name = `terrain.${region.id}`;
  root.userData.standIn = { id: 'terrain.heightfield', kind: 'terrain', region: region.id, size: [district.size, max - min, district.size] };
  root.userData.landings = [];
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true }));
  mesh.name = 'Heightfield';
  mesh.userData.paint = { kind: 'terrain', file: 'ground.png', repeat: 48, name: 'terrain.ground' };
  root.add(mesh);
  root.userData.heightAt = heightAt;
  root.userData.range = [min, max];
  void lod;
  return root;
}

/** Builders for the districts' terrains: one entry per episode-one district. */
export function terrainBuilders() {
  return [
    ['fields', 'sunseedFields'],
    ['city', 'crownlineCity'],
    ['mountains', 'thunderheadRange'],
  ].map(([regionId, districtName]) => ({
    name: `Terrain sculpt: ${regionId}`,
    region: regionId,
    file: `terrain/${regionId}.glb`,
    targetBounds: null,
    notes: `Heightfield of the ${districtName} district (4800 m, 60 000 triangles at LOD0). terrain/${regionId}-height.png is the 16-bit heightmap (513², metres = value / 65535 × range + min, see heightRange). The runtime samples the generator, not this file.`,
    extraFiles: [`terrain/${regionId}-height.png`],
    build: (lod) => {
      const district = terrainBuilders.districts[districtName]();
      return terrainMesh(regionById(regionId), district, lod ? 60 : 173, lod);
    },
    after: async (file, entry) => {
      const district = terrainBuilders.districts[districtName]();
      const heightAt = makeHeightField({ size: district.size, ...district.terrain });
      const n = 513,
        values = new Uint16Array(n * n);
      let min = Infinity,
        max = -Infinity;
      const raw = new Float32Array(n * n);
      for (let j = 0; j < n; j++)
        for (let i = 0; i < n; i++) {
          const y = heightAt((i / (n - 1) - 0.5) * district.size, (j / (n - 1) - 0.5) * district.size);
          raw[j * n + i] = y;
          min = Math.min(min, y);
          max = Math.max(max, y);
        }
      for (let i = 0; i < raw.length; i++) values[i] = Math.round(((raw[i] - min) / (max - min || 1)) * 65535);
      fs.writeFileSync(path.join(path.dirname(file), `${regionId}-height.png`), png16(n, n, values));
      entry.heightRange = [Number(min.toFixed(2)), Number(max.toFixed(2))];
      entry.heightmap = `terrain/${regionId}-height.png`;
    },
  }));
}
terrainBuilders.districts = null;
export async function prepareTerrain() {
  const mod = await loadDistricts();
  terrainBuilders.districts = mod;
}
