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
  RingGeometry,
  Sprite,
  Vector3,
  WebGLRenderer,
  DoubleSide,
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
import { atlasSprite, decal, paintHorizon, paintKit, paintShadows, paintSky, paintTerrain, reticle, stepAtlas, type AtlasSprite } from './textures3d';
import { swapDelivered, type Swapped } from './models3d';

interface Effect {
  object: Object3D;
  life: number;
  maxLife: number;
  kind: string;
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
  private buildVersion = 0;
  private kickSparked = false;
  private sun: DirectionalLight;
  private laserMaterial = new MeshBasicMaterial({ color: '#ff5a4a' });
  private laserCore = new MeshBasicMaterial({ color: '#ffffff' });
  private seedMaterial = new MeshToonMaterial({ color: '#1a1520', emissive: new Color('#8a4bd8'), emissiveIntensity: 0.5 });
  private flashMaterial = new MeshBasicMaterial({ color: '#fff3d2', transparent: true, opacity: 0.9 });
  private tellMaterial = new MeshBasicMaterial({ color: '#ffb454', transparent: true, opacity: 0.85 });
  private width = 1;
  private height = 1;
  time = 0;
  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
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
  buildWorld(world: World, shadows: Shadow[]) {
    this.scene.remove(this.worldGroup);
    this.worldGroup = new Group();
    this.scene.add(this.worldGroup);
    this.shadowObjects.clear();
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
    const landmark = makeLandmark(region);
    landmark.position.set(d.landmark.x, 0, d.landmark.z);
    this.worldGroup.add(landmark);
    const hemi = new HemisphereLight(new Color(region.sky).lerp(new Color('#ffffff'), 0.3), new Color(region.ground), 0.5);
    this.sun.color = new Color(region.sun || '#fff1c2').lerp(new Color('#ffffff'), 0.5);
    this.worldGroup.add(hemi, this.sun, new AmbientLight(region.haze, 0.12));
    const terrain = makeTerrain(region, { size: d.size, segments: 160, ...d.terrain });
    this.worldGroup.add(terrain);
    void paintTerrain(terrain, region.id, d);
    this.delivered = [];
    for (const inst of world.instances) {
      this.worldGroup.add(inst.object);
      if (inst.object.userData.animate) this.animated.push(inst.object as StandInObject);
      void swapDelivered(inst.object, inst.standIn).then((swapped) => {
        if (swapped && version === this.buildVersion) this.delivered.push(swapped);
      });
    }
    void paintKit(this.worldGroup, region.id);
    // Delivered decals and reticles replace the placeholder rings once loaded.
    void decal('landing-guide.png', 12, '#f6edcc').then((m) => {
      if (!m || version !== this.buildVersion) return;
      this.guideDecal = m;
      m.visible = false;
      this.scene.add(m);
    });
    void reticle(false, 14).then((r) => (this.reticles.open = r));
    void reticle(true, 14).then((r) => (this.reticles.locked = r));
    for (const s of shadows) {
      const o = createStandIn(`enemy.${s.kind}`);
      // A small flash sphere and an amber tell ring, shown by state.
      const flash = new Mesh(new SphereGeometry(s.radius * 1.3, 12, 8), this.flashMaterial);
      flash.name = 'Flash';
      flash.visible = false;
      flash.position.y = s.height * 0.5;
      const tell = new Mesh(new TorusGeometry(s.radius * 1.4, 0.25, 6, 24), this.tellMaterial);
      tell.name = 'Tell';
      tell.visible = false;
      tell.rotation.x = Math.PI / 2;
      tell.position.y = s.height + 1.5;
      o.add(flash, tell);
      this.worldGroup.add(o);
      this.shadowObjects.set(s.id, o);
    }
    void paintShadows(this.shadowObjects.values());
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
    // Guard dome.
    const shield = root.getObjectByName('GuardDome');
    if (combat.guarding) {
      if (!shield) {
        const dome = createStandIn('prop.shieldDome');
        dome.name = 'GuardDome';
        dome.position.set(0, 11.6, 12);
        dome.rotation.y = Math.PI;
        root.add(dome);
      }
    } else if (shield) root.remove(shield);
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
      o.scale.set(squash, 1 / Math.sqrt(squash), squash);
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
        if (p.kind === 'laser') {
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
        m.rotateX(Math.PI / 2);
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
    this.resize();
    this.lockRing.visible = false;
    if (this.reticles.open) this.reticles.open.visible = false;
    if (this.reticles.locked) this.reticles.locked.visible = false;
    this.syncHopper(h, combat, dt);
    this.syncShadows(combat.shadows, combat);
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
