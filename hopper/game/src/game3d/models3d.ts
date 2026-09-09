/** Delivered models (hopper/3d/models) swapped in over the stand-ins.
 * The design manifest says which stand-in a request replaces and whether it
 * is delivered; the delivery manifest says where the GLB is. A delivered
 * model is added as a child of its stand-in group, so position, rotation,
 * visibility and the colliders derived from the stand-in all stay as they
 * are; only the stand-in's own meshes are hidden.
 */
import { AnimationMixer, LoopRepeat, Mesh, Object3D } from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import design from '../../../3d/design/standin-manifest.json';
import delivery from '../../../3d/models/manifest.json';

export const MODEL_BASE = './3d/models/';

interface DesignRequest {
  request: string;
  kind: string;
  standIn?: string;
  status: string;
}
interface Delivered {
  request: string;
  file: string;
  clips: string[];
  sockets: string[];
  status: string;
}

/** stand-in id → delivered GLB entry, for requests both sides call delivered. */
const byStandIn = new Map<string, Delivered>();
{
  const files = new Map<string, Delivered>();
  for (const d of (delivery as { models: Delivered[] }).models) if (d.status === 'delivered') files.set(d.request, d);
  for (const r of (design as { requests: DesignRequest[] }).requests)
    if (r.kind === 'model' && r.standIn && r.status === 'delivered' && files.has(r.request)) byStandIn.set(r.standIn, files.get(r.request)!);
}
export function hasDeliveredModel(standIn: string): boolean {
  return byStandIn.has(standIn);
}
export function deliveredModels(): string[] {
  return [...byStandIn.keys()];
}

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const cache = new Map<string, Promise<GLTF | null>>();
function load(file: string): Promise<GLTF | null> {
  if (!cache.has(file)) cache.set(file, loader.loadAsync(MODEL_BASE + file).catch(() => null));
  return cache.get(file)!;
}

export interface Swapped {
  root: Object3D;
  mixer: AnimationMixer | null;
  clips: Map<string, { play(): void }>;
  play(name: string): boolean;
}

/** Show one LOD hierarchy of a delivered model. */
function selectLod(root: Object3D, lod: 'LOD0' | 'LOD1') {
  root.traverse((o) => {
    if (/^LOD\d/.test(o.name)) o.visible = o.name.startsWith(lod);
  });
}

/** Replace a stand-in's picture with its delivered model, if there is one. */
export async function swapDelivered(standIn: Object3D, standInId: string): Promise<Swapped | null> {
  const entry = byStandIn.get(standInId);
  if (!entry) return null;
  const gltf = await load(entry.file);
  if (!gltf) return null;
  const root = gltf.scene.clone(true);
  root.name = `delivered:${standInId}`;
  selectLod(root, 'LOD0');
  root.traverse((o) => {
    const m = o as Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  // Hide the stand-in's own meshes, keep its sockets and metadata.
  standIn.traverse((o) => {
    if ((o as Mesh).isMesh) o.visible = false;
  });
  standIn.add(root);
  let mixer: AnimationMixer | null = null;
  const clips = new Map<string, { play(): void }>();
  if (gltf.animations.length) {
    mixer = new AnimationMixer(root);
    for (const clip of gltf.animations) {
      const action = mixer.clipAction(clip);
      action.setLoop(LoopRepeat, Infinity);
      clips.set(clip.name, { play: () => action.reset().play() });
    }
    // Machinery idles; the stand-in's own animate() no longer needs to run.
    clips.get('Idle')?.play();
    if (!clips.has('Idle')) clips.values().next().value?.play();
  }
  const swapped: Swapped = {
    root,
    mixer,
    clips,
    play(name: string) {
      const a = clips.get(name);
      if (!a) return false;
      mixer?.stopAllAction();
      a.play();
      return true;
    },
  };
  standIn.userData.delivered = swapped;
  standIn.userData.animate = undefined;
  // A totem's lit state plays its Active clip when the model has one.
  if (standInId === 'prop.checkpointTotem') standIn.userData.lit = (on: boolean) => swapped.play(on ? 'Active' : 'Idle');
  return swapped;
}
