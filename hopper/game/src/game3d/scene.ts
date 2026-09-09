/** The three.js picture of the 3D edition: sky, terrain, structures, the
 * delivered Hopper model with its clips, stand-in shadows, projectiles,
 * effects and the landing guide. Reads simulation state; never changes it.
 */
import {
  AmbientLight,
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  LoopOnce,
  LoopRepeat,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  Object3D,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  RingGeometry,
  Sprite,
  SpriteMaterial,
  Texture,
  Vector3,
  WebGLRenderer,
  DoubleSide,
  PlaneGeometry,
  CanvasTexture,
  RepeatWrapping,
  ClampToEdgeWrapping,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {
  createStandIn,
  makeFog,
  makeHorizon,
  makeLandmark,
  makeSkyDome,
  makeTerrain,
  type StandInObject,
} from '../../../3d/standins/src/index.js';
import type { World } from './world';
import type { HopperState } from './controller';
import type { CameraState } from './camera';
import type { Combat, Shadow, Projectile } from './combat3d';
import { atlasSprite, cell, cellPlane, cellSprite, decal, guideVariant, HOPPER_CELLS, HOPPER_SHEET, muzzleCell, paintHorizon, paintKit, paintShadows, paintSky, paintTerrain, PROP_CELLS, PROP_SHEET, reticle, setCell, stepAtlas, terrainClock, type AtlasSprite } from './textures3d';
import { standInKey, swapDelivered, type Swapped } from './models3d';
import { buildTrail } from './trail';
import type { RookRuntime } from './boss3d';

interface Effect {
  object: Object3D;
  life: number;
  maxLife: number;
  kind: string;
}

/** The lockdown barrier's surface: bright along the ground, ribbed, and clear
 * through the middle so a sealed arena reads as a wall rather than a fog the
 * whole view is seen through. */
function barrierTexture(): Texture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 256, 0, 0);
  grad.addColorStop(0, 'rgba(226,196,255,0.95)');
  grad.addColorStop(0.1, 'rgba(198,158,255,0.5)');
  grad.addColorStop(0.35, 'rgba(186,146,255,0.14)');
  grad.addColorStop(0.75, 'rgba(186,146,255,0.05)');
  grad.addColorStop(1, 'rgba(186,146,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 256);
  // Ribs down the seams, and a bright line where the barrier meets the ground.
  g.fillStyle = 'rgba(240,222,255,0.55)';
  g.fillRect(0, 0, 3, 256);
  g.fillRect(61, 0, 3, 256);
  g.fillStyle = 'rgba(255,244,255,0.9)';
  g.fillRect(0, 246, 64, 10);
  const tex = new CanvasTexture(c);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = ClampToEdgeWrapping;
  return tex;
}

/** Find a node by its glTF name, before or after three's name sanitising. */
function node(root: Object3D, name: string): Object3D | null {
  let found = root.getObjectByName(name) || root.getObjectByName(name.replace(/[\s.]/g, '')) || null;
  if (!found) root.traverse((o) => { if (!found && o.userData?.name === name) found = o; });
  return found;
}

export class Scene3D {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(60, 16 / 9, 0.5, 30000);
  private hopper: Object3D | null = null;
  private mixer: AnimationMixer | null = null;
  private clips = new Map<string, AnimationClip>();
  private action: AnimationAction | null = null;
  private actionName = '';
  private wings: Object3D[] = [];
  private wingSpread = 0;
  // Round-three effect sheet: muzzle glow, shield face, glide trails, laser bolts.
  private muzzle: Sprite | null = null;
  private shieldSprite: Sprite | null = null;
  private trails: Mesh[] = [];
  private laserTex: Texture | null = null;
  private worldGroup = new Group();
  private shadowObjects = new Map<string, StandInObject>();
  private animated: StandInObject[] = [];
  private projectileObjects = new Map<number, Mesh>();
  private effects: Effect[] = [];
  private guide: Mesh;
  private guidePredicted: Mesh;
  private lockRing: Mesh;
  private reticles: { open: Sprite | null; locked: Sprite | null } = { open: null, locked: null };
  private guideDecal: Mesh | null = null;
  private atlases: AtlasSprite[] = [];
  private delivered: Swapped[] = [];
  private bossObject: Object3D | null = null;
  private bossRook: RookRuntime | null = null;
  private bossWings: Object3D[] = [];
  private corridor: Mesh | null = null;
  private fieldDomes = new Map<string, Mesh>();
  /** The barrier itself: a wall of light at the radius Hopper cannot pass. */
  private fieldWalls = new Map<string, Mesh>();
  private buildVersion = 0;
  private kickSparked = false;
  private sun: DirectionalLight;
  private laserMaterial = new MeshBasicMaterial({ color: '#ff5a4a' });
  private laserCore = new MeshBasicMaterial({ color: '#ffffff' });
  private seedMaterial = new MeshToonMaterial({ color: '#1a1520', emissive: new Color('#8a4bd8'), emissiveIntensity: 0.5 });
  private flashMaterial = new MeshBasicMaterial({ color: '#fff3d2', transparent: true, opacity: 0.9 });
  private tellMaterial = new MeshBasicMaterial({ color: '#ffb454', transparent: true, opacity: 0.85 });
  private corridorMaterial = new MeshBasicMaterial({ color: '#ff5a4a', transparent: true, opacity: 0.35, depthWrite: false, side: DoubleSide });
  private width = 1;
  private height = 1;
  time = 0;
  constructor(readonly canvas: HTMLCanvasElement) {
    // preserveDrawingBuffer: the district hand-over reads the last frame back
    // to dissolve from it.
    this.renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.scene.add(this.worldGroup);
    this.sun = new DirectionalLight('#fff1c2', 1.15);
    this.sun.position.set(-600, 900, 500);
    this.guide = new Mesh(new RingGeometry(3.2, 4.2, 40), new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75, side: DoubleSide, depthWrite: false }));
    this.guide.rotation.x = -Math.PI / 2;
    this.guide.visible = false;
    this.guidePredicted = new Mesh(new RingGeometry(1.6, 2.4, 32), new MeshBasicMaterial({ color: '#ffdf7a', transparent: true, opacity: 0.6, side: DoubleSide, depthWrite: false }));
    this.guidePredicted.rotation.x = -Math.PI / 2;
    this.guidePredicted.visible = false;
    this.lockRing = new Mesh(new TorusGeometry(4, 0.3, 6, 32), new MeshBasicMaterial({ color: '#ff5a4a', depthTest: false }));
    this.lockRing.visible = false;
    this.scene.add(this.guide, this.guidePredicted, this.lockRing);
    this.resize();
  }
  resize() {
    const w = this.canvas.clientWidth || 1600,
      h = this.canvas.clientHeight || 900;
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
  /** Load the delivered Hopper model with its rider and clips. */
  async loadHopper(url: string, progress: (v: number) => void): Promise<void> {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(url, (e) => progress(e.total ? Math.min(0.95, e.loaded / e.total) : 0.5));
    this.hopper = gltf.scene;
    this.mixer = new AnimationMixer(gltf.scene);
    for (const c of gltf.animations) this.clips.set(c.name, c);
    this.wings = ['wing.L', 'wing.R'].map((n) => node(gltf.scene, n)).filter((o): o is Object3D => !!o);
    this.scene.add(gltf.scene);
    this.play('Idle', true);
    progress(1);
    this.attachEffects(gltf.scene);
  }
  /** Hopper's painted effects (T-082) ride on the model: the eye muzzle glow,
   * the guard's shield face and a glide trail off each wing. Lasers use the
   * same sheet when they are spawned. Missing paint leaves the flat shapes. */
  private attachEffects(root: Object3D) {
    void cellSprite(HOPPER_SHEET, 4, 4, HOPPER_CELLS.muzzle[0], HOPPER_CELLS.muzzle[1], 9, { additive: true }).then((s) => {
      if (!s) return;
      s.position.set(0, 12.5, 10);
      s.visible = false;
      root.add(s);
      this.muzzle = s;
    });
    void cellSprite(HOPPER_SHEET, 4, 4, HOPPER_CELLS.shield[0], HOPPER_CELLS.shield[1], 19).then((s) => {
      if (!s) return;
      s.position.set(0, 11.6, 13);
      s.visible = false;
      (s.material as SpriteMaterial).opacity = 0.9;
      root.add(s);
      this.shieldSprite = s;
    });
    for (const side of [-1, 1])
      void cellPlane(HOPPER_SHEET, 4, 4, HOPPER_CELLS.trail[0], HOPPER_CELLS.trail[1], 28, 7, { color: '#fff3d2' }).then((m) => {
        if (!m) return;
        // The ribbon's curl sits at the wing tip and sweeps back along -Z.
        m.geometry.rotateX(-Math.PI / 2);
        m.geometry.rotateY(Math.PI / 2);
        m.geometry.translate(0, 0, -12);
        m.position.set(side * 9.5, 12.5, -3);
        m.scale.x = side;
        m.renderOrder = 5;
        (m.material as MeshBasicMaterial).opacity = 0;
        root.add(m);
        this.trails.push(m);
      });
    void cell(HOPPER_SHEET, 4, 4, HOPPER_CELLS.laser[0], HOPPER_CELLS.laser[1]).then((t) => (this.laserTex = t));
  }
  /** Crossfade to a clip. One-shots clamp at their last frame. */
  play(name: string, loop: boolean, fade = 0.12, timeScale = 1) {
    if (!this.mixer) return;
    if (this.actionName === name) {
      if (this.action) this.action.timeScale = timeScale;
      return;
    }
    const clip = this.clips.get(name);
    if (!clip) return;
    const next = this.mixer.clipAction(clip).reset();
    next.clampWhenFinished = true;
    next.setLoop(loop ? LoopRepeat : LoopOnce, loop ? Infinity : 1);
    next.timeScale = timeScale;
    next.play();
    if (this.action && this.action !== next) next.crossFadeFrom(this.action, fade, false);
    this.action = next;
    this.actionName = name;
  }
  /** Build the picture of a district: atmosphere, terrain, structures, shadows. */
  buildWorld(world: World, shadows: Shadow[], rook: RookRuntime | null = null, ahead?: { sky: string; haze: string; ground: string }) {
    this.scene.remove(this.worldGroup);
    this.worldGroup = new Group();
    this.scene.add(this.worldGroup);
    this.shadowObjects.clear();
    this.fieldDomes.clear();
    this.fieldWalls.clear();
    this.bossObject = null;
    this.corridor = null;
    this.animated = [];
    const region = world.region,
      d = world.district;
    this.scene.background = new Color(region.sky);
    this.scene.fog = makeFog(region, 0.00016);
    const version = ++this.buildVersion;
    const dome = makeSkyDome(region);
    this.worldGroup.add(dome);
    const horizon = makeHorizon(region, d.horizon || {});
    this.worldGroup.add(horizon);
    const landmarkAngle = Math.atan2(d.landmark.z, d.landmark.x);
    void paintSky(dome, region.id);
    void paintHorizon(region.id, landmarkAngle).then((cards) => {
      if (!cards || version !== this.buildVersion) return;
      this.worldGroup.remove(horizon);
      this.worldGroup.add(cards);
    });
    // The landmark is the next district seen from here, so it is painted in
    // that district's colours: the place ahead looks like the place ahead.
    const landmark = makeLandmark(ahead ? { ...region, haze: ahead.haze, ground: ahead.ground, sky: ahead.sky } : region);
    landmark.position.set(d.landmark.x, 0, d.landmark.z);
    this.worldGroup.add(landmark);
    void swapDelivered(landmark, standInKey('terrain.landmark', region.id));
    const hemi = new HemisphereLight(new Color(region.sky).lerp(new Color('#ffffff'), 0.3), new Color(region.ground), 0.5);
    this.sun.color = new Color(region.sun || '#fff1c2').lerp(new Color('#ffffff'), 0.5);
    this.worldGroup.add(hemi, this.sun, new AmbientLight(region.haze, 0.12));
    const terrain = makeTerrain(region, { size: d.size, segments: 160, ...d.terrain });
    this.worldGroup.add(terrain);
    void paintTerrain(terrain, region.id, d, world.route);
    // The trail along the route: its ribbon, edge stones, waymarkers and the
    // tall things beside it.
    this.worldGroup.add(buildTrail(world));
    this.delivered = [];
    for (const inst of world.instances) {
      this.worldGroup.add(inst.object);
      if (inst.object.userData.animate) this.animated.push(inst.object as StandInObject);
      void swapDelivered(inst.object, inst.standIn).then((swapped) => {
        if (swapped && version === this.buildVersion) this.delivered.push(swapped);
      });
    }
    void paintKit(this.worldGroup, region.id);
    for (const inst of world.instances) this.decorate(inst.object, inst.standIn);
    // Delivered decals and reticles replace the placeholder rings once loaded.
    void decal(guideVariant(region.id, region.ground), 12, '#f6edcc').then((m) => {
      if (!m || version !== this.buildVersion) return;
      this.guideDecal = m;
      m.visible = false;
      this.scene.add(m);
    });
    void reticle(false, 14).then((r) => (this.reticles.open = r));
    void reticle(true, 14).then((r) => (this.reticles.locked = r));
    for (const s of shadows) {
      const o = createStandIn(`enemy.${s.kind}`);
      // The body is scaled to Hopper's size; the flash sphere and amber tell
      // ring are authored in the stand-in's own units and scale with it.
      const r = s.radius / s.size,
        hgt = s.height / s.size;
      o.scale.setScalar(s.size);
      const flash = new Mesh(new SphereGeometry(r * 1.3, 12, 8), this.flashMaterial);
      flash.name = 'Flash';
      flash.visible = false;
      flash.position.y = hgt * 0.5;
      const tell = new Mesh(new TorusGeometry(r * 1.4, 0.25, 6, 24), this.tellMaterial);
      tell.name = 'Tell';
      tell.visible = false;
      tell.rotation.x = Math.PI / 2;
      tell.position.y = hgt + 1.5;
      o.add(flash, tell);
      this.worldGroup.add(o);
      this.shadowObjects.set(s.id, o);
    }
    void paintShadows(this.shadowObjects.values());
    // Lockdown fields: a dome overhead and, at the radius Hopper is actually
    // held inside, a wall of violet light. The clamp is a cylinder, so the
    // wall is one too -- what you see is exactly what stops you.
    for (const f of world.fields) {
      const dome = createStandIn('prop.lockdownDome', { r: 1 });
      const mesh = dome.getObjectByName('Field') as Mesh | undefined;
      if (!mesh) continue;
      mesh.removeFromParent();
      mesh.scale.setScalar(f.r);
      mesh.position.set(f.x, f.y, f.z);
      mesh.visible = false;
      this.worldGroup.add(mesh);
      this.fieldDomes.set(f.id, mesh);
      const tex = barrierTexture();
      tex.repeat.set(Math.max(8, Math.round((Math.PI * 2 * f.r) / 45)), 1);
      const wall = new Mesh(new CylinderGeometry(f.r - 2, f.r - 2, 300, 72, 1, true), new MeshBasicMaterial({ color: '#e0c6ff', map: tex, transparent: true, opacity: 0.85, side: DoubleSide, depthWrite: false, fog: false }));
      wall.position.set(f.x, world.heightAt(f.x, f.z) + 132, f.z);
      wall.visible = false;
      this.worldGroup.add(wall);
      this.fieldWalls.set(f.id, wall);
    }
    this.setBoss(rook);
  }
  /** Painted prop decals (T-086): the totem's lamp face, the spring pad's
   * chevrons and the cage's crown glyph, laid over stand-in and delivered
   * models alike. */
  private decorate(object: Object3D, standIn: string) {
    if (standIn === 'prop.checkpointTotem') {
      const lamp = object.getObjectByName('Lamp');
      const at = lamp ? lamp.position.clone() : new Vector3(0, 13, 0);
      let lit = false;
      let face: Sprite | null = null;
      const prev = object.userData.lit as ((on: boolean) => void) | undefined;
      object.userData.lit = (on: boolean) => {
        lit = on;
        prev?.(on);
        if (face) setCell((face.material as SpriteMaterial).map!, 2, 2, on ? PROP_CELLS.lampLit[0] : PROP_CELLS.lampUnlit[0], 0);
      };
      void cellSprite(PROP_SHEET, 2, 2, PROP_CELLS.lampUnlit[0], PROP_CELLS.lampUnlit[1], 3.6).then((s) => {
        if (!s) return;
        s.name = 'LampFace';
        s.position.copy(at);
        s.renderOrder = 3;
        object.add(s);
        face = s;
        if (lit) setCell((s.material as SpriteMaterial).map!, 2, 2, PROP_CELLS.lampLit[0], 0);
      });
    } else if (standIn === 'prop.springPad') {
      const plate = object.getObjectByName('Plate') as Mesh | undefined;
      if (!plate) return;
      plate.geometry.computeBoundingBox();
      const bb = plate.geometry.boundingBox!;
      const size = (bb.max.x - bb.min.x) * 0.92;
      void cellPlane(PROP_SHEET, 2, 2, PROP_CELLS.chevrons[0], PROP_CELLS.chevrons[1], size, size).then((m) => {
        if (!m) return;
        m.name = 'Chevrons';
        m.rotation.x = -Math.PI / 2;
        m.position.set(plate.position.x, plate.position.y + bb.max.y + 0.06, plate.position.z);
        m.renderOrder = 2;
        object.add(m);
      });
    } else if (standIn === 'prop.signalCage') {
      const crown = object.getObjectByName('Crown');
      const y = crown ? crown.position.y : 9.2;
      void cellSprite(PROP_SHEET, 2, 2, PROP_CELLS.crown[0], PROP_CELLS.crown[1], 5.5).then((s) => {
        if (!s) return;
        // Named Crown so the engine hides it with the bars when the cage opens.
        s.name = 'Crown';
        s.position.set(0, y + 2.8, 0);
        s.visible = crown ? crown.visible : true;
        object.add(s);
      });
    }
  }
  /** Attach (or drop) the Night Rook's stand-in body. Stand-in art: the boss has no delivered model yet. */
  setBoss(rook: RookRuntime | null) {
    if (this.bossObject) {
      this.worldGroup.remove(this.bossObject);
      this.bossObject = null;
    }
    if (this.corridor) {
      this.worldGroup.remove(this.corridor);
      this.corridor = null;
    }
    this.bossRook = rook;
    this.bossWings = [];
    if (!rook) return;
    const o = createStandIn('boss.nightRook');
    delete o.userData.animate;
    for (const side of ['L', 'R']) {
      const w = node(o, `Wing.${side}`);
      if (w) this.bossWings.push(w);
    }
    const flash = new Mesh(new SphereGeometry(rook.radius * 1.6, 14, 10), this.flashMaterial);
    flash.name = 'Flash';
    flash.visible = false;
    flash.position.y = rook.height * 0.9;
    const tell = new Mesh(new TorusGeometry(rook.radius * 2.2, 0.5, 6, 32), this.tellMaterial);
    tell.name = 'Tell';
    tell.visible = false;
    tell.rotation.x = Math.PI / 2;
    tell.position.y = rook.height * 1.9;
    o.add(flash, tell);
    o.position.set(rook.x, rook.y, rook.z);
    o.rotation.y = rook.yaw;
    this.worldGroup.add(o);
    this.bossObject = o;
    this.corridor = new Mesh(new CylinderGeometry(6, 6, 1, 10, 1, true), this.corridorMaterial);
    this.corridor.visible = false;
    this.worldGroup.add(this.corridor);
    void paintShadows([o]);
  }
  private syncBoss(dt: number) {
    const r = this.bossRook,
      o = this.bossObject;
    if (!r || !o) return;
    o.visible = r.alive || r.hitFlash > 0;
    if (!o.visible) {
      if (this.corridor) this.corridor.visible = false;
      return;
    }
    o.position.set(r.x, r.y, r.z);
    o.rotation.set(0, r.yaw, 0);
    const flash = o.getObjectByName('Flash') as Mesh,
      tell = o.getObjectByName('Tell') as Mesh;
    flash.visible = r.hitFlash > 0;
    tell.visible = r.state === 'mark' || r.state === 'fan' || r.state === 'channel' || r.open > 0;
    if (tell.visible) {
      (tell.material as MeshBasicMaterial).color.set(r.open > 0 ? '#f3e7c8' : r.state === 'channel' ? '#8a4bd8' : '#ffb454');
      tell.scale.setScalar(r.state === 'mark' || r.state === 'fan' ? 1.6 - r.telegraph * 0.6 : 0.9 + Math.sin(this.time * 12) * 0.1);
    }
    // Wings: the runtime's spread plus a slow beat while airborne.
    const beat = r.state === 'sweep' || r.state === 'climb' ? Math.sin(this.time * 9) * 0.35 : Math.sin(this.time * 1.6) * 0.12;
    for (const [i, w] of this.bossWings.entries()) w.rotation.z = (i ? -1 : 1) * (0.15 + r.wingSpread * 0.9 + beat);
    const pitch = r.state === 'sweep' ? -0.35 : r.state === 'climb' ? 0.4 : 0;
    o.rotation.x += (pitch - o.rotation.x) * Math.min(1, dt * 5);
    // The marked sweep corridor: a red tube from the perch to the far rim.
    if (this.corridor) {
      const show = r.state === 'mark';
      this.corridor.visible = show;
      if (show) {
        const a = new Vector3(...r.markFrom),
          b = new Vector3(...r.markTo);
        const len = Math.max(1, a.distanceTo(b));
        this.corridor.position.copy(a).lerp(b, 0.5);
        this.corridor.scale.set(1, len, 1);
        this.corridor.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), b.clone().sub(a).normalize());
        this.corridorMaterial.opacity = 0.2 + r.telegraph * 0.3;
      }
    }
  }
  private syncFields(world: World) {
    for (const f of world.fields) {
      const on = f.active && !f.cleared;
      const flare = f.flare || 0;
      const dome = this.fieldDomes.get(f.id);
      if (dome) {
        dome.visible = on;
        if (on) (dome.material as MeshToonMaterial).opacity = 0.2 + Math.sin(this.time * 3) * 0.05 + flare * 0.25;
      }
      const wall = this.fieldWalls.get(f.id);
      if (wall) {
        wall.visible = on;
        // The wall brightens where Hopper has just pushed against it.
        if (on) {
          const m = wall.material as MeshBasicMaterial;
          m.opacity = 0.8 + Math.sin(this.time * 2.4) * 0.08 + flare * 0.2;
          if (m.map) m.map.offset.y = -0.02 + Math.sin(this.time * 0.7) * 0.01;
        }
      }
    }
  }
  private syncHopper(h: HopperState, combat: Combat, dt: number) {
    const root = this.hopper;
    if (!root) return;
    root.position.set(h.x, h.y, h.z);
    root.rotation.set(0, h.yaw, 0);
    const speed = Math.hypot(h.vx, h.vz);
    // Clip by movement state; attacks override.
    let clip = 'Idle',
      loop = true,
      scale = 1;
    if (combat.kick > 0.05) {
      if (combat.kick > 0.46 && !this.kickSparked) {
        this.kickSparked = true;
        this.effect('kick', h.x, h.y + 6, h.z);
      }
      clip = 'Spin_Kick';
      loop = false;
      scale = 2;
    } else if (h.mantle > 0) clip = 'Crouch';
    else
      switch (h.move) {
        case 'run':
          clip = 'Run';
          scale = Math.max(0.6, speed / 32);
          break;
        case 'crouch':
          clip = 'Crouch_Hold';
          break;
        case 'jump':
          clip = h.hold < 0.45 ? 'Jump_Start' : 'Jump_Loop';
          loop = clip === 'Jump_Loop';
          break;
        case 'fall':
        case 'glide':
          clip = 'Jump_Loop';
          break;
        case 'dive':
          clip = 'Crouch_Hold';
          break;
        case 'land':
        case 'stomp':
        case 'hopBack':
          clip = 'Land';
          loop = false;
          break;
        default:
          clip = combat.guarding ? 'Block_Loop' : combat.heat > 0 && combat.shotClock > 0 ? 'Fire_Loop' : 'Idle';
      }
    if (combat.kick <= 0.05) this.kickSparked = false;
    if (h.hitstun > 0) {
      clip = 'Hit_Reaction';
      loop = false;
    }
    this.play(clip, loop, 0.12, scale);
    // Wings open for the glide; the body pitches into dives and glides.
    const wantSpread = h.gliding ? 1 : h.diving ? 0.3 : 0;
    this.wingSpread += (wantSpread - this.wingSpread) * Math.min(1, dt * 8);
    for (const [i, w] of this.wings.entries()) {
      const side = i === 0 ? 1 : -1;
      w.rotation.z = side * this.wingSpread * 1.1;
      w.rotation.y = side * this.wingSpread * 0.35;
    }
    const pitch = h.diving ? -0.7 : h.gliding ? Math.max(-0.35, Math.min(0.2, -h.vy * 0.015)) : h.grounded ? 0 : Math.max(-0.25, Math.min(0.25, -h.vy * 0.006));
    root.rotation.x += (pitch - root.rotation.x) * Math.min(1, dt * 6);
    this.mixer?.update(dt);
    // Guard: the painted shield face, or the stand-in dome until it loads.
    const shield = root.getObjectByName('GuardDome');
    if (this.shieldSprite) {
      this.shieldSprite.visible = combat.guarding;
      if (combat.guarding) this.shieldSprite.scale.setScalar(19 + Math.sin(this.time * 9) * 0.6);
      if (shield) root.remove(shield);
    } else if (combat.guarding) {
      if (!shield) {
        const dome = createStandIn('prop.shieldDome');
        dome.name = 'GuardDome';
        dome.position.set(0, 11.6, 12);
        dome.rotation.y = Math.PI;
        root.add(dome);
      }
    } else if (shield) root.remove(shield);
    // Eye muzzle glow while the lasers run: eight painted frames.
    if (this.muzzle) {
      const firing = combat.heat > 0 && combat.shotClock > 0 && !combat.guarding;
      this.muzzle.visible = firing;
      if (firing) muzzleCell((this.muzzle.material as SpriteMaterial).map!, Math.floor(this.time * 24) % 8);
    }
    // Glide trails fade in with the wings and the airspeed.
    const trail = this.wingSpread * Math.min(1, speed / 45) * (h.gliding ? 1 : 0.4);
    for (const t of this.trails) (t.material as MeshBasicMaterial).opacity += (trail * 0.85 - (t.material as MeshBasicMaterial).opacity) * Math.min(1, dt * 6);
  }
  private syncShadows(shadows: Shadow[], combat: Combat) {
    for (const s of shadows) {
      const o = this.shadowObjects.get(s.id);
      if (!o) continue;
      o.visible = s.alive && !s.dormant;
      if (!o.visible) continue;
      o.position.set(s.x, s.y, s.z);
      o.rotation.set(0, s.yaw, 0);
      const flash = o.getObjectByName('Flash') as Mesh,
        tell = o.getObjectByName('Tell') as Mesh;
      flash.visible = s.hitFlash > 0 || s.spawnFlash > 0;
      if (flash.visible) flash.scale.setScalar(s.spawnFlash > 0 ? 1 + s.spawnFlash * 2 : 1);
      tell.visible = s.state === 'tell' || s.open > 0;
      if (tell.visible) {
        (tell.material as MeshBasicMaterial).color.set(s.open > 0 && s.state !== 'tell' ? '#f3e7c8' : '#ffb454');
        tell.scale.setScalar(s.state === 'tell' ? 1.6 - s.telegraph * 0.6 : 0.9 + Math.sin(this.time * 12) * 0.1);
      }
      const squash = s.kind === 'seedSpitter' ? s.scale : 1;
      o.scale.set(squash * s.size, s.size / Math.sqrt(squash), squash * s.size);
      o.userData.animate?.(this.time + s.phase);
      if (combat.lock === s.id) {
        const r = s.open > 0 || s.state === 'tell' ? this.reticles.locked : this.reticles.locked || this.reticles.open;
        if (r) {
          if (!r.parent) this.scene.add(r);
          r.visible = true;
          r.position.set(s.x, s.y + s.height * 0.5, s.z);
          const d = this.camera.position.distanceTo(r.position);
          r.scale.setScalar(Math.max(8, d * 0.07));
        } else {
          this.lockRing.visible = true;
          this.lockRing.position.set(s.x, s.y + s.height * 0.5, s.z);
          this.lockRing.lookAt(this.camera.position);
        }
      }
    }
  }
  private syncProjectiles(projectiles: Projectile[]) {
    const live = new Set<number>();
    for (const p of projectiles) {
      live.add(p.id);
      let m = this.projectileObjects.get(p.id);
      if (!m) {
        if (p.kind === 'laser' && this.laserTex) {
          // The painted bolt on two crossed quads, its tip along the flight.
          const mat = new MeshBasicMaterial({ map: this.laserTex, transparent: true, depthWrite: false, side: DoubleSide, fog: false });
          const along = new PlaneGeometry(11, 3.4);
          along.rotateY(-Math.PI / 2);
          m = new Mesh(along, mat);
          const across = along.clone();
          across.rotateZ(Math.PI / 2);
          m.add(new Mesh(across, mat));
        } else if (p.kind === 'laser') {
          m = new Mesh(new CapsuleGeometry(0.35, 5, 3, 6), this.laserMaterial);
          const core = new Mesh(new CapsuleGeometry(0.15, 5.2, 3, 6), this.laserCore);
          m.add(core);
        } else m = new Mesh(new SphereGeometry(p.radius, 8, 6), this.seedMaterial);
        this.worldGroup.add(m);
        this.projectileObjects.set(p.id, m);
      }
      m.position.set(p.x, p.y, p.z);
      if (p.kind === 'laser') {
        m.lookAt(p.x + p.vx, p.y + p.vy, p.z + p.vz);
        if (!m.geometry || m.geometry.type === 'CapsuleGeometry') m.rotateX(Math.PI / 2);
      }
    }
    for (const [id, m] of this.projectileObjects) {
      if (live.has(id)) continue;
      this.worldGroup.remove(m);
      this.projectileObjects.delete(id);
    }
  }
  /** Spawn a visual effect. */
  effect(name: string, x: number, y: number, z: number) {
    const atlas = name === 'shockwave' ? ['stomp-shockwave', 26, false] : name === 'spark' || name === 'hit' ? ['laser-impact', 7, true] : name === 'kick' ? ['kick-spark', 16, true] : null;
    if (atlas) {
      void atlasSprite(atlas[0] as string, atlas[1] as number, { additive: atlas[2] as boolean }).then((a) => {
        if (!a) return;
        a.sprite.position.set(x, y + (name === 'shockwave' ? 1.5 : 0), z);
        this.worldGroup.add(a.sprite);
        this.atlases.push(a);
      });
      if (name !== 'hit') return;
    }
    let object: Object3D,
      life = 0.5;
    if (name === 'dissolve') {
      object = createStandIn('prop.dissolveBurst');
      life = 0.6;
    } else if (name === 'shockwave') {
      object = new Mesh(new TorusGeometry(4, 0.8, 6, 40), new MeshBasicMaterial({ color: '#ffe8a0', transparent: true, opacity: 0.8 }));
      object.rotation.x = Math.PI / 2;
      life = 0.45;
    } else if (name === 'barrier') {
      object = new Mesh(new RingGeometry(2, 9, 28), new MeshBasicMaterial({ color: '#d9b6ff', transparent: true, opacity: 0.9, side: DoubleSide, depthWrite: false }));
      object.lookAt(this.camera.position);
      life = 0.4;
    } else if (name === 'parry') {
      object = new Mesh(new SphereGeometry(2.5, 10, 8), new MeshBasicMaterial({ color: '#b9fff1', transparent: true, opacity: 0.8 }));
      life = 0.25;
    } else {
      object = new Mesh(new SphereGeometry(name === 'hit' ? 1.6 : 0.9, 8, 6), new MeshBasicMaterial({ color: name === 'splat' ? '#8a4bd8' : '#fff3d2', transparent: true, opacity: 0.9 }));
      life = 0.22;
    }
    object.position.set(x, y, z);
    this.worldGroup.add(object);
    this.effects.push({ object, life, maxLife: life, kind: name });
  }
  private syncEffects(dt: number) {
    for (const a of this.atlases) if (!stepAtlas(a, dt)) this.worldGroup.remove(a.sprite);
    this.atlases = this.atlases.filter((a) => a.sprite.parent);
    for (const e of this.effects) {
      e.life -= dt;
      const t = 1 - Math.max(0, e.life) / e.maxLife;
      if (e.kind === 'shockwave') e.object.scale.setScalar(1 + t * 3);
      else if (e.kind === 'dissolve') e.object.scale.setScalar(0.5 + t * 1.6);
      else e.object.scale.setScalar(1 + t * 1.5);
      const m = (e.object as Mesh).material as MeshBasicMaterial | undefined;
      if (m && 'opacity' in m) m.opacity = (1 - t) * 0.9;
      if (e.life <= 0) this.worldGroup.remove(e.object);
    }
    this.effects = this.effects.filter((e) => e.life > 0);
  }
  private syncGuide(h: HopperState, world: World, predicted: { x: number; y: number; z: number } | null, enabled: boolean) {
    const show = enabled && !h.grounded && h.height > 3;
    const guide = this.guideDecal || this.guide;
    this.guide.visible = show && !this.guideDecal;
    if (this.guideDecal) this.guideDecal.visible = show;
    this.guidePredicted.visible = show && !!predicted;
    if (!show) return;
    const below = world.groundAt(h.x, h.z, h.y).y;
    guide.position.set(h.x, below + 0.3, h.z);
    const k = 1 + Math.min(3, h.height * 0.04);
    guide.scale.setScalar(k);
    (guide.material as MeshBasicMaterial).opacity = 0.35 + Math.min(0.5, 12 / Math.max(6, h.height));
    if (predicted) {
      this.guidePredicted.position.set(predicted.x, predicted.y + 0.35, predicted.z);
      this.guidePredicted.scale.setScalar(k);
    }
  }
  /** Sync everything to the simulation and draw. */
  render(h: HopperState, world: World, combat: Combat, cam: CameraState, dt: number, predicted: { x: number; y: number; z: number } | null, guideEnabled: boolean) {
    this.time += dt;
    terrainClock.value = this.time;
    this.resize();
    this.lockRing.visible = false;
    if (this.reticles.open) this.reticles.open.visible = false;
    if (this.reticles.locked) this.reticles.locked.visible = false;
    this.syncHopper(h, combat, dt);
    this.syncShadows(combat.shadows, combat);
    this.syncBoss(dt);
    this.syncFields(world);
    this.syncProjectiles(combat.projectiles);
    this.syncEffects(dt);
    this.syncGuide(h, world, predicted, guideEnabled);
    for (const o of this.animated) o.userData.animate?.(this.time);
    for (const d of this.delivered) d.mixer?.update(dt);
    this.camera.position.set(cam.eye[0], cam.eye[1], cam.eye[2]);
    this.camera.lookAt(new Vector3(cam.target[0], cam.target[1], cam.target[2]));
    if (Math.abs(this.camera.fov - cam.fov) > 0.05) {
      this.camera.fov = cam.fov;
      this.camera.updateProjectionMatrix();
    }
    this.sun.position.set(cam.target[0] + 190, cam.target[1] + 760, cam.target[2] + 980);
    this.renderer.render(this.scene, this.camera);
  }
  /** The frame on screen, as an image the shell can hold over the next one. */
  capture(): string {
    try {
      return this.canvas.toDataURL('image/jpeg', 0.72);
    } catch {
      return '';
    }
  }
  /** Draw once with no simulation (title screen behind the poster). */
  renderIdle() {
    this.resize();
    this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.renderer.dispose();
  }
  get hopperReady() {
    return !!this.hopper;
  }
}
