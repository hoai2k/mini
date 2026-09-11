/** Engine3D: the 3D edition's game loop. Owns the district, Hopper's
 * movement, the camera, combat, checkpoints, signals and saves, and drives
 * the Scene3D picture. Same public surface as the 2D Engine so the shell
 * cannot tell them apart.
 */
import type { GameAudio, SoundEffect } from '../game/audio';
import type { GameSettings, GameSnapshot } from '../game/engine';
import type { InputFrame } from '../game/input';
import type { GameEngine } from '../game/game-engine';
import { saveKey } from '../game/game-engine';
import { World, type Trigger } from './world';
import { regionById } from '../../../3d/standins/src/index.js';
import { preloadDistrict, Prefetcher } from './preload';
import { MISSIONS, type District } from './district';
import { NightRook } from './boss3d';
import { createHopperState, intentFromInput, predictLanding, stepHopper, MOVE, type HopperState } from './controller';
import { createCamera, updateCamera, type CameraState } from './camera';
import { Combat, type Shadow } from './combat3d';
import { Scene3D } from './scene';

const STEP = 1 / 120;
/** What the HUD calls each shadow when it is the target. */
const SHADOW_NAMES: Record<string, string> = {
  shadeHound: 'Shade Hound',
  seedSpitter: 'Seed Spitter',
  windowRay: 'Window Ray',
  spireLeech: 'Spire Leech',
  cragTortoise: 'Crag Tortoise',
  riftCondor: 'Rift Condor',
};
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** What crosses the threshold with Hopper when a district hands over. */
interface Carry {
  /** Hopper's facing as an angle from the camera's, and his movement as an
   * angle from the trail: both are kept across the seam. */
  turn: number;
  moveTurn: number;
  camTurn: number;
  pitch: number;
  speed: number;
  vy: number;
  airborne: boolean;
  gliding: boolean;
  hovering: boolean;
  hoverFuel: number;
}
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
interface Save {
  mission: number;
  district: number;
  checkpoint: number;
  signals: string[];
  score: number;
}

export class Engine3D implements GameEngine {
  rumble: (strength: number, duration: number) => void = () => {};
  player: HopperState = createHopperState();
  private scene: Scene3D | null = null;
  private world: World | null = null;
  private district: District | null = null;
  private combat: Combat | null = null;
  private boss: NightRook | null = null;
  private districtIndex = 0;
  private clearedGates = new Set<string>();
  private transitionT = 0;
  /** The hand-over: the frame captured as the threshold is crossed, and how
   * much of it is still showing. */
  private transitionImage = '';
  private transitionFade = 0;
  private captureNext = false;
  private camera: CameraState = createCamera(0, [0, 0, 0]);
  private settings: GameSettings = { master: 0.8, music: 0.55, sfx: 0.65, shake: true, assist: false, cameraSensitivity: 0.5, invertY: false, landingGuide: true };
  private loaded = false;
  /** Held while a district's paintings are still arriving. */
  private loading: { label: string; progress: number } | null = null;
  private prefetcher = new Prefetcher();
  private paused = true;
  private acc = 0;
  private uiClock = 0;
  private time = 0;
  private mission = 0;
  private hp = 6;
  private readonly maxHp = 6;
  private score = 0;
  private signals = new Set<string>();
  private checkpoints: Trigger[] = [];
  private checkpointIndex = 0;
  private completed = false;
  private victoryT = 0;
  private respawnT = 0;
  private banner = '';
  private bannerSmall = '';
  private bannerT = 0;
  private chapterName = '';
  private hint = '';
  private hintT = 0;
  private pending = { jump: false, kick: false, dive: false, lock: false, reset: false };
  private lockHeldPrev = false;
  /** Seconds Y has been held on the ground: a tap hops back, a hold charges. */
  private yHold = -1;
  private predicted: { x: number; y: number; z: number } | null = null;
  /** Hopper's last known distance along the trail (a search hint). */
  private routeS = 0;
  private onClick = () => {
    if (!this.paused && document.pointerLockElement !== this.canvas) void this.canvas.requestPointerLock?.()?.catch?.(() => {});
  };
  constructor(
    private canvas: HTMLCanvasElement,
    private audio: GameAudio,
    private onSnapshot: (s: GameSnapshot) => void,
  ) {
    canvas.addEventListener('click', this.onClick);
  }
  async load(progress: (fraction: number) => void): Promise<void> {
    this.scene = new Scene3D(this.canvas);
    await this.scene.loadHopper('./models/hopper-rider.glb', progress);
    this.loaded = true;
    this.emit();
  }
  configure(s: GameSettings): void {
    this.settings = s;
  }
  /**
   * Everything the district about to be entered paints, before it is built.
   * Resuming enters the saved district, so that is the one warmed.
   */
  async prepare(mission: number, resume: boolean, progress: (fraction: number) => void): Promise<void> {
    this.prefetcher.stop();
    let save: Save | null = null;
    try {
      if (resume) save = JSON.parse(localStorage.getItem(saveKey('3d', 'save')) || 'null');
    } catch {}
    const m = clamp(save?.mission ?? mission, 0, MISSIONS.length - 1);
    const district = clamp(save?.district ?? 0, 0, MISSIONS[m].length - 1);
    await preloadDistrict(m, district, progress);
  }
  /** Spend idle time on the episode the player is looking at. */
  prefetch(mission: number): void {
    this.prefetcher.retarget(clamp(mission, 0, MISSIONS.length - 1));
  }
  private sound(name: SoundEffect) {
    this.audio.effect(name);
  }
  start(mission: number, resume = false): void {
    if (!this.scene) return;
    let save: Save | null = null;
    try {
      if (resume) save = JSON.parse(localStorage.getItem(saveKey('3d', 'save')) || 'null');
    } catch {}
    this.mission = clamp(save?.mission ?? mission, 0, MISSIONS.length - 1);
    this.districtIndex = clamp(save?.district ?? 0, 0, MISSIONS[this.mission].length - 1);
    this.hp = this.maxHp;
    this.score = save?.score || 0;
    this.signals = new Set(save?.signals || []);
    this.loadDistrict(save?.checkpoint || 0);
    this.time = 0;
    this.completed = false;
    this.victoryT = 0;
    this.respawnT = 0;
    this.showBanner(this.district!.name, this.district!.subtitle, 3.2);
    this.setHint('Hold A in the air to hover; keep holding to glide down. RB sprints, LB dashes.', 7);
    this.emit();
  }
  /** Build the current district of the episode and place Hopper at a checkpoint. */
  private loadDistrict(checkpoint: number, carry?: Carry) {
    const district = MISSIONS[this.mission][this.districtIndex]();
    this.district = district;
    this.world = new World(district);
    this.combat = new Combat(this.world, district, this.settings.assist);
    this.boss = district.boss ? new NightRook(district.boss, this.world) : null;
    this.clearedGates = new Set();
    this.chapterName = '';
    // Checkpoints in spine order (toward the exit).
    this.checkpoints = this.world.triggers.filter((t) => t.kind === 'checkpoint').sort((a, b) => Math.hypot(a.x - district.start.x, a.z - district.start.z) - Math.hypot(b.x - district.start.x, b.z - district.start.z));
    this.checkpointIndex = clamp(checkpoint, 0, this.checkpoints.length - 1);
    for (const t of this.world.triggers)
      if (t.kind === 'signal' && this.signals.has(t.id)) {
        t.taken = true;
        if (t.object) t.object.visible = false;
      }
    this.victoryT = 0;
    this.respawnT = 0;
    this.hp = this.maxHp;
    this.scene?.buildWorld(this.world, this.combat.shadows, this.boss?.rook ?? null, this.aheadColours(), this.districtAhead());
    for (let i = 0; i <= this.checkpointIndex; i++) this.checkpoints[i]?.object?.userData.lit?.(true);
    this.resetPlayer(carry);
    this.combat.resetToCheckpoint(this.player.z);
    this.showBanner(district.name, district.subtitle, 3.2);
    this.setHint('Hold A in the air to hover; keep holding to glide down. RB sprints, LB dashes.', 7);
    this.emit();
  }
  private resetPlayer(carry?: Carry) {
    const d = this.district!,
      world = this.world!;
    const cp = this.checkpoints[this.checkpointIndex];
    const x = cp ? cp.x + 6 : d.start.x,
      z = cp ? cp.z + 8 : d.start.z;
    // Face along the trail from here, as the camera will.
    const forward = cp ? world.route.yawAt(world.route.nearest(x, z).s + 40) : d.start.yaw;
    // Crossing a threshold keeps the facing he had relative to the view and
    // the heading he had relative to the way on, so a run continues as a run.
    const yaw = forward + (carry ? carry.camTurn + carry.turn : 0);
    this.player = createHopperState(x, world.groundAt(x, z, 1e6).y, z, yaw);
    this.player.groundY = this.player.y;
    this.player.invuln = 1.7;
    if (carry) {
      const heading = forward + carry.moveTurn;
      this.player.vx = Math.sin(heading) * carry.speed;
      this.player.vz = Math.cos(heading) * carry.speed;
      if (carry.airborne) {
        this.player.y += 24;
        this.player.vy = carry.vy;
        this.player.grounded = false;
        this.player.gliding = carry.gliding;
        this.player.hovering = carry.hovering;
        this.player.hoverFuel = carry.hoverFuel;
        this.player.move = carry.hovering ? 'hover' : carry.gliding ? 'glide' : carry.vy > 0 ? 'jump' : 'fall';
      } else this.player.move = carry.speed > 4 ? 'run' : 'idle';
    }
    this.camera = createCamera(yaw, [x, this.player.y + 8, z]);
    if (carry) {
      this.camera.forward = forward;
      this.camera.turn = carry.camTurn;
      this.camera.pitch = carry.pitch;
      this.camera.yaw = forward + carry.camTurn;
    }
    this.predicted = null;
    this.routeS = world.route.nearest(x, z).s;
  }
  setPaused(v: boolean): void {
    this.paused = v;
    this.acc = 0;
    this.pending = { jump: false, kick: false, dive: false, lock: false, reset: false };
    if (v && typeof document !== 'undefined' && document.pointerLockElement === this.canvas) document.exitPointerLock?.();
  }
  tick(dt: number, f?: InputFrame): void {
    if (!this.loaded || !this.scene) return;
    if (!this.world || !this.combat) {
      this.scene.renderIdle();
      return;
    }
    // A seam crossing waits for its paintings: hold the simulation and keep
    // presenting the last frame behind the loading screen.
    if (this.loading) {
      this.scene.render(this.player, this.world, this.combat, this.camera, 0, this.predicted, this.settings.landingGuide !== false);
      return;
    }
    if (!this.paused && f && !this.completed) {
      this.pending.jump ||= f.jumpPressed;
      this.pending.kick ||= f.kickPressed;
      this.pending.dive ||= f.divePressed;
      this.pending.lock ||= f.lockPressed;
      this.pending.reset ||= f.cameraResetPressed;
      this.acc += Math.min(dt, 0.05);
      let first = true;
      while (this.acc >= STEP) {
        this.step(STEP, first ? { ...f, jumpPressed: this.pending.jump, kickPressed: this.pending.kick, divePressed: this.pending.dive, lockPressed: this.pending.lock, cameraResetPressed: this.pending.reset } : { ...f, jumpPressed: false, kickPressed: false, divePressed: false, lockPressed: false, cameraResetPressed: false, mouseLookX: 0, mouseLookY: 0 });
        first = false;
        this.pending = { jump: false, kick: false, dive: false, lock: false, reset: false };
        this.acc -= STEP;
      }
      this.uiClock += dt;
      if (this.uiClock > 0.1) {
        this.emit();
        this.uiClock = 0;
      }
    }
    this.scene.render(this.player, this.world, this.combat, this.camera, this.paused ? 0 : dt, this.predicted, this.settings.landingGuide !== false);
    // The hand-over: keep the frame just drawn, swap districts behind it, and
    // let the shell dissolve it away over the new one.
    if (this.captureNext) {
      this.captureNext = false;
      this.transitionImage = this.scene.capture();
      this.transitionFade = 1;
      this.nextDistrict();
      this.emit();
    }
  }
  private step(dt: number, f: InputFrame) {
    const world = this.world!,
      combat = this.combat!,
      h = this.player,
      d = this.district!;
    this.time += dt;
    if (this.bannerT > 0) this.bannerT -= dt;
    if (this.hintT > 0) this.hintT -= dt;
    if (this.victoryT > 0) {
      this.victoryT -= dt;
      if (this.victoryT <= 0) {
        // Completion stops the tick loop, so it has to be announced here: the
        // next scheduled snapshot never comes.
        this.completed = true;
        this.emit();
      }
    }
    if (this.respawnT > 0) {
      this.respawnT -= dt;
      if (this.respawnT <= 0) this.respawn();
      return;
    }
    // The commander is an aim target while it is awake, so the lasers find it
    // and the lock-on can hold it: a shadow this big, this high, is otherwise
    // shot at only by luck.
    combat.bossTarget = this.boss && this.boss.rook.active && this.boss.rook.alive ? this.boss.target() : null;
    // Lock-on: hold LT to lock the nearest shadow in view; tap to cycle.
    const lockTapped = f.lockPressed && this.lockHeldPrev;
    if (f.lockHeld) {
      if (!combat.lock || lockTapped) {
        const forward = this.aimDirection();
        const candidates = combat.targets().filter((s) => Math.hypot(s.x - h.x, s.z - h.z) < 260).sort((a, b) => this.lockScore(a, forward) - this.lockScore(b, forward));
        if (candidates.length) {
          const i = combat.lock ? candidates.findIndex((s) => s.id === combat.lock) : -1;
          combat.lock = candidates[(i + 1) % candidates.length].id;
        }
      }
    } else combat.lock = null;
    this.lockHeldPrev = f.lockHeld;
    const locked = combat.targetById(combat.lock);
    if (!locked) combat.lock = null;

    // Moving structures carry whatever stands on them.
    world.update(dt);
    if (h.grounded) {
      const under = world.groundAt(h.x, h.z, h.y + 0.5).collider;
      const m = under?.instance?.moving;
      if (m && Math.abs(under!.y1 - h.y) < 1) {
        h.x += m.dx;
        h.y += m.dy;
        h.z += m.dz;
      }
    }
    // Movement. Y on the ground: tap to hop back, hold to crouch and charge.
    const intent = intentFromInput(f, this.camera.yaw);
    if (h.grounded) {
      if (f.divePressed) this.yHold = 0;
      else if (this.yHold >= 0 && f.diveHeld) this.yHold += dt;
      if (this.yHold >= 0 && !f.diveHeld) {
        if (this.yHold < 0.18) intent.hopBackPressed = true;
        this.yHold = -1;
      }
      intent.chargeHeld = this.yHold >= 0.18 && f.diveHeld;
      intent.divePressed = false;
    } else {
      this.yHold = -1;
      intent.chargeHeld = false;
    }
    if (locked) {
      intent.faceX = locked.x - h.x;
      intent.faceZ = locked.z - h.z;
    }
    const events = stepHopper(h, world, intent, dt);
    for (const e of events) {
      if (e.kind === 'jump') this.sound('jump');
      else if (e.kind === 'land') {
        if (e.stomp) {
          combat.shockwave(h.x, h.y, h.z, 12, this.callbacks());
          this.rumble(0.8, 160);
        } else if (e.speed > 40) {
          this.sound('stomp');
          this.rumble(Math.min(0.6, e.speed / 190), 90);
        }
      } else if (e.kind === 'wallKick' || e.kind === 'spring') this.sound('jump');
      else if (e.kind === 'glideStart' || e.kind === 'hoverStart') this.sound('shield');
      else if (e.kind === 'dive') this.sound('kick');
      else if (e.kind === 'dash') {
        this.sound('shield');
        this.rumble(0.3, 60);
      }
    }
    // Caged signals break open under any of Hopper's attacks: lasers chip the
    // bars, a kick tears at them, and a turned-back shot still hits hardest.
    // Checked before combat moves the shots so a hit registers where it looks.
    for (const t of world.triggers) {
      if (!t.locked || !t.cage) continue;
      if (t.cageFlash) t.cageFlash = Math.max(0, t.cageFlash - dt);
      // The cage shudders on a hit and its lock fades as integrity drops, so a
      // shot that lands reads even when no bar falls on that particular hit.
      const flash = t.cageFlash ?? 0;
      t.cage.scale.setScalar(1 + flash * 1.6);
      const crown = (t.cageCrown as { material?: { emissiveIntensity?: number } } | undefined)?.material;
      if (crown && crown.emissiveIntensity !== undefined)
        crown.emissiveIntensity = 0.15 + 0.65 * ((t.cageHp ?? 0) / (t.cageMaxHp || 1)) + flash * 8;
      const hit = (damage: number, x: number, y: number, z: number) => {
        t.cageHp = Math.max(0, (t.cageHp ?? 0) - damage);
        t.cageFlash = 0.12;
        this.scene?.effect('spark', x, y, z);
        const bars = t.cageBars ?? [];
        // Keep as many bars standing as the remaining integrity earns.
        const standing = Math.ceil((t.cageHp / (t.cageMaxHp || 1)) * bars.length);
        bars.forEach((bar, i) => (bar.visible = i < standing));
        if (t.cageHp > 0) {
          this.sound('hit');
          this.rumble(0.25, 60);
          return;
        }
        t.locked = false;
        for (const bar of bars) bar.visible = false;
        if (t.cageCrown) t.cageCrown.visible = false;
        this.scene?.effect('parry', t.x, t.lockY ?? t.y, t.z);
        this.sound('explode');
        this.rumble(0.6, 180);
        this.showBanner('Cage broken', 'THE SIGNAL IS FREE', 1.6);
      };
      const top = t.lockY ?? t.y;
      for (const p of combat.projectiles) {
        if (p.owner !== 'hopper' || p.life <= 0) continue;
        // The whole cage is the target, not just the crown: anywhere between
        // the pedestal and the lock counts.
        const height = p.y > top ? p.y - top : p.y < t.y ? t.y - p.y : 0;
        if (Math.hypot(p.x - t.x, p.z - t.z) > 7 + p.radius || height > 2 + p.radius) continue;
        p.life = 0;
        hit(p.kind === 'laser' ? 1 : 4, p.x, p.y, p.z);
        if (!t.locked) break;
      }
      // A kick lands once per swing, tracked in the same set the shadows use.
      if (t.locked && combat.kick > 0.15 && combat.kick < 0.42 && !combat.kickHit.has(t.id)) {
        const reach = Math.hypot(h.x - t.x, h.z - t.z) <= 14;
        if (reach && h.y + 24 > t.y && h.y < top + 4) {
          combat.kickHit.add(t.id);
          hit(3, t.x, Math.min(top, h.y + 10), t.z);
        }
      }
    }
    // Combat: aim from the eye sockets along the facing, tilted with the camera.
    const aim = this.aimDirection();
    combat.update(dt, h, this.callbacks(), { x: h.x + Math.sin(h.yaw) * 9, y: h.y + 12, z: h.z + Math.cos(h.yaw) * 9, dx: aim[0], dy: aim[1], dz: aim[2], firing: f.shootHeld && h.hitstun <= 0, guarding: f.blockHeld && h.hitstun <= 0, kickPressed: f.kickPressed });
    // Strongholds: the host, in plain view on its perches, comes down the
    // moment Hopper is within reach; the region is freed when it is down.
    // Nothing holds Hopper in: the trail runs straight through.
    for (const field of world.fields) {
      const dist = Math.hypot(field.x - h.x, field.z - h.z);
      if (!field.active && !field.cleared && dist < field.r && Math.abs(h.y - field.y) < field.r) {
        field.active = true;
        if (field.group === 'boss') {
          this.boss?.wake(this.callbacks());
          this.showBanner('The Night Rook', 'DEFEAT THE COMMANDER', 3);
        } else {
          const released = combat.activateGroup(field.group);
          this.showBanner(field.name, released > 0 ? 'THE SHADOWS COME DOWN · FREE THE REGION' : 'FREE THE REGION', 2.6);
        }
        this.sound('boss');
      }
      if (field.active) {
        const left = field.group === 'boss' ? (this.boss && this.boss.rook.alive ? 1 : 0) : combat.shadows.filter((s) => s.group === field.group && s.alive).length;
        const done = field.group === 'boss' ? !!this.boss && !this.boss.rook.alive : left === 0;
        if (done) {
          field.active = false;
          field.cleared = true;
          this.clearedGates.add(field.id);
          this.hp = Math.min(this.maxHp, this.hp + 2);
          this.score += 1000;
          this.showBanner(field.group === 'boss' ? 'The shadow falls' : `${field.name} freed`, field.group === 'boss' ? 'THE TRANSMITTER IS YOURS' : 'THE WAY IS CLEAR · ON TO THE NEXT', 2.6);
          this.sound('checkpoint');
        }
      }
    }
    // The commander.
    this.boss?.update(dt, h, combat, this.callbacks());
    // Triggers.
    for (const t of world.triggers) {
      if (t.taken) continue;
      const near = Math.hypot(t.x - h.x, t.z - h.z) < t.r && h.y > t.y - 12 && h.y < t.y + (t.kind === 'checkpoint' ? 30 : 16);
      if (!near) continue;
      if (t.kind === 'checkpoint') {
        const i = this.checkpoints.indexOf(t);
        if (i > this.checkpointIndex) {
          this.checkpointIndex = i;
          t.object?.userData.lit?.(true);
          this.hp = Math.min(this.maxHp, this.hp + 2);
          this.sound('checkpoint');
          this.save();
          this.showBanner('Checkpoint', this.chapterName.toUpperCase(), 1.6);
        }
        t.taken = true;
      } else if (t.kind === 'signal') {
        if (t.locked) continue;
        t.taken = true;
        if (t.object) t.object.visible = false;
        this.signals.add(t.id);
        this.score += 500;
        this.sound('pickup');
        this.save();
      } else if (t.kind === 'capsule' && this.hp < this.maxHp) {
        t.taken = true;
        if (t.object) t.object.visible = false;
        this.hp = Math.min(this.maxHp, this.hp + 2);
        this.sound('pickup');
      }
    }
    // Chapter and exit.
    const chapter = h.z > d.chapters[0].z0 ? d.chapters[0] : d.chapters.find((c) => h.z <= c.z0 && h.z > c.z1) || d.chapters[d.chapters.length - 1];
    if (chapter && chapter.name !== this.chapterName) {
      this.chapterName = chapter.name;
      if (this.time > 1) this.showBanner(chapter.name, d.name.toUpperCase(), 2.2);
    }
    if (this.transitionFade > 0) this.transitionFade = Math.max(0, this.transitionFade - dt / 1.15);
    if (this.transitionT > 0) {
      this.transitionT -= dt;
      // The swap happens in tick(), right after the last frame of this
      // district has been drawn, so it can be kept and dissolved from.
      if (this.transitionT <= 0) this.captureNext = true;
    } else if (this.victoryT <= 0 && !this.completed && Math.hypot(d.exit.x - h.x, d.exit.z - h.z) < d.exit.r) {
      // The threshold is open: a stronghold left standing is a choice, and
      // only the mission's commander bars the way at the end.
      const bossDown = !this.boss || !this.boss.rook.alive;
      if (bossDown) {
        const last = this.districtIndex >= MISSIONS[this.mission].length - 1;
        this.score += last ? 5000 : 2000;
        this.sound('checkpoint');
        if (last) {
          this.victoryT = 2.5;
          this.showBanner(d.exit.name, 'EPISODE COMPLETE', 2.5);
          try {
            localStorage.setItem(saveKey('3d', 'unlocked'), String(Math.max(Number(localStorage.getItem(saveKey('3d', 'unlocked')) || 0), Math.min(MISSIONS.length - 1, this.mission + 1))));
            localStorage.removeItem(saveKey('3d', 'save'));
          } catch {}
        } else {
          this.transitionT = 1.2;
          this.showBanner(d.exit.name, 'REGION COMPLETE', 3.4);
        }
      } else if (this.hintT <= 0) {
        this.setHint('The commander guards the summit: defeat it to open the way.', 3.5);
      }
    }
    // Camera and the landing prediction. While the commander is awake the
    // camera lifts and pulls back to hold it in frame.
    const rook = this.boss?.rook;
    const rookInFrame = rook && rook.active && rook.alive ? ([rook.x, rook.y + rook.height * 0.5, rook.z] as [number, number, number]) : null;
    updateCamera(this.camera, h, world, { lookX: f.lookX, lookY: f.lookY, mouseLookX: f.mouseLookX, mouseLookY: f.mouseLookY, resetPressed: f.cameraResetPressed, horizonHeld: f.horizonHeld, landmark: [d.landmark.x, 200, d.landmark.z], forward: this.forward(), boss: rookInFrame }, { sensitivity: this.settings.cameraSensitivity ?? 0.5, invertY: !!this.settings.invertY, reducedMotion: !this.settings.shake }, dt);
    this.predicted = !h.grounded && h.height > 3 && !h.gliding && !h.hovering ? predictLanding(h, world) : null;
    // Contextual hints for the first minutes.
    if (this.time > 8 && this.time < 8.1) this.setHint('Y in the air: dive. Land on a shadow to bounce.', 6);
    if (this.time > 20 && this.time < 20.1) this.setHint(`Click the right stick: Horizon View shows the way to ${d.landmark.name}.`, 6);
  }
  /** The palette of the district this one leads to, for the landmark on the
   * horizon: what is ahead should look like what is ahead. */
  private aheadColours(): { sky: string; haze: string; ground: string } | undefined {
    const next = MISSIONS[this.mission]?.[this.districtIndex + 1];
    if (!next) return undefined;
    const region = regionById(next().region);
    return { sky: region.sky, haze: region.haze, ground: region.ground };
  }
  /** The next district as a picture beyond this one's exit: built in its own
   * frame and offset so its start sits on this district's exit, at the same
   * ground height, so the crossing is continuous. */
  private districtAhead(): { world: World; offset: [number, number, number] } | undefined {
    const next = MISSIONS[this.mission]?.[this.districtIndex + 1];
    if (!next || !this.world || !this.district) return undefined;
    const world = new World(next());
    const d = this.district,
      n = world.district;
    const dx = d.exit.x - n.start.x,
      dz = d.exit.z - n.start.z,
      dy = this.world.heightAt(d.exit.x, d.exit.z) - world.heightAt(n.start.x, n.start.z);
    return { world, offset: [dx, dy, dz] };
  }
  /** The way onward: the trail's tangent 80 m ahead of Hopper's place on it.
   * A direction along the route, so it turns only as the trail bends. */
  private forward(): number {
    const route = this.world!.route,
      h = this.player;
    this.routeS = route.nearest(h.x, h.z, this.routeS).s;
    return route.yawAt(this.routeS + 80);
  }
  /** The episode continues in its next district. Hopper crosses a threshold:
   * he keeps the way he was facing relative to the trail, the speed he had
   * and whether he was in the air, and the picture dissolves from the frame
   * he crossed on rather than cutting. */
  private nextDistrict() {
    const h = this.player,
      old = this.world!;
    const forward = old.route.yawAt(old.route.nearest(h.x, h.z).s + 80);
    const speed = Math.hypot(h.vx, h.vz);
    const carry: Carry = {
      // Where he faces relative to the view, and where he is going relative
      // to the way on: both kept across the seam.
      turn: wrapAngle(h.yaw - this.camera.yaw),
      moveTurn: speed > 4 ? wrapAngle(Math.atan2(h.vx, h.vz) - forward) : 0,
      camTurn: this.camera.turn,
      pitch: this.camera.pitch,
      speed,
      vy: h.vy,
      airborne: !h.grounded,
      gliding: h.gliding,
      hovering: h.hovering,
      hoverFuel: h.hoverFuel,
    };
    const next = this.districtIndex + 1;
    const name = MISSIONS[this.mission][next]?.().name ?? '';
    this.loading = { label: name, progress: 0 };
    this.emit();
    void preloadDistrict(this.mission, next, (fraction) => {
      if (!this.loading) return;
      this.loading = { label: name, progress: fraction };
      this.emit();
    }).then(() => {
      this.loading = null;
      this.districtIndex = next;
      this.loadDistrict(0, carry);
      this.save();
      const d = this.district!;
      this.showBanner(d.name, d.subtitle, 3.2);
      this.emit();
    });
  }
  private lockScore(s: Shadow, forward: [number, number, number]) {
    const h = this.player;
    const dx = s.x - h.x,
      dy = s.y - h.y,
      dz = s.z - h.z,
      d = Math.hypot(dx, dy, dz) || 1;
    const cos = (dx * forward[0] + dy * forward[1] + dz * forward[2]) / d;
    return d * (1.5 - cos);
  }
  private aimDirection(): [number, number, number] {
    const h = this.player;
    const pitch = -Math.sin(this.camera.pitch) * 0.5;
    const l = Math.hypot(1, pitch);
    return [Math.sin(h.yaw) / l, pitch / l, Math.cos(h.yaw) / l];
  }
  private callbacks() {
    return {
      hurt: (damage: number, kx: number, ky: number, kz: number, fromX: number, fromZ: number) => this.hurt(damage, kx, ky, kz, fromX, fromZ),
      effect: (name: string, x: number, y: number, z: number) => this.scene?.effect(name, x, y, z),
      sound: (name: string) => this.sound(name as SoundEffect),
      bounce: (shadow: Shadow) => this.bounce(shadow),
    };
  }
  /** Hopper's feet met a shadow's back: bounce, higher with A held. */
  private bounce(_shadow: Shadow) {
    const h = this.player;
    const apex = h.holding || h.gliding ? MOVE.bounceApexHeld : MOVE.bounceApex;
    h.vy = Math.sqrt(2 * MOVE.gravity * h.gravityScale * apex);
    h.grounded = false;
    h.diving = false;
    h.gliding = false;
    h.hovering = false;
    h.holding = false;
    h.hold = MOVE.holdWindow;
    h.move = 'jump';
    this.sound('stomp');
    this.rumble(0.5, 100);
  }
  /** Returns true when the blow was blocked by the guard. */
  private hurt(damage: number, kx: number, ky: number, kz: number, fromX: number, fromZ: number): boolean {
    const h = this.player,
      combat = this.combat!;
    if (this.respawnT > 0 || this.victoryT > 0 || h.invuln > 0) return false;
    // The guard turns blows arriving from the front.
    const dx = fromX - h.x,
      dz = fromZ - h.z,
      dl = Math.hypot(dx, dz) || 1;
    const fromFront = (dx * Math.sin(h.yaw) + dz * Math.cos(h.yaw)) / dl > 0.35;
    if (combat.guarding && fromFront) {
      combat.shield = Math.max(0, combat.shield - 0.25);
      h.invuln = Math.max(h.invuln, 0.3);
      this.scene?.effect('parry', h.x + Math.sin(h.yaw) * 10, h.y + 11, h.z + Math.cos(h.yaw) * 10);
      this.sound('shield');
      return true;
    }
    this.hp -= this.settings.assist ? Math.max(1, Math.round(damage * 0.5)) : damage;
    h.invuln = this.settings.assist ? 1.8 : 1.1;
    h.hitstun = 0.3;
    h.vx = kx;
    h.vy = Math.max(h.vy, ky);
    h.vz = kz;
    h.grounded = false;
    h.gliding = false;
    h.hovering = false;
    h.diving = false;
    h.charge = 0;
    this.sound('hurt');
    this.rumble(0.7, 140);
    if (this.hp <= 0) {
      this.hp = 0;
      this.respawnT = 2.2;
      this.sound('explode');
    }
    return false;
  }
  respawn(): void {
    if (!this.world || !this.combat) return;
    this.hp = this.maxHp;
    this.respawnT = 0;
    this.resetPlayer();
    this.combat.resetToCheckpoint(this.player.z);
    for (const t of this.world.triggers) if (t.kind === 'checkpoint') t.taken = this.checkpoints.indexOf(t) <= this.checkpointIndex;
    for (const field of this.world.fields) if (field.active) field.active = false;
    if (this.boss && this.boss.rook.alive && this.boss.rook.active) this.boss = new NightRook(this.district!.boss!, this.world);
    this.scene?.setBoss(this.boss?.rook ?? null);
    this.showBanner('Back in the saddle', 'CHECKPOINT RESTORED', 2);
    this.emit();
  }
  private save() {
    try {
      localStorage.setItem(saveKey('3d', 'save'), JSON.stringify({ mission: this.mission, district: this.districtIndex, checkpoint: this.checkpointIndex, signals: [...this.signals], score: this.score } satisfies Save));
    } catch {}
  }
  private showBanner(text: string, small: string, seconds: number) {
    this.banner = text;
    this.bannerSmall = small;
    this.bannerT = seconds;
  }
  private setHint(text: string, seconds: number) {
    this.hint = text;
    this.hintT = seconds;
  }
  snapshot(): GameSnapshot {
    const d = this.district,
      h = this.player,
      c = this.combat;
    const total = d ? Math.hypot(d.exit.x - d.start.x, d.exit.z - d.start.z) : 1;
    const remaining = d ? Math.hypot(d.exit.x - h.x, d.exit.z - h.z) : 1;
    const districts = MISSIONS[this.mission]?.length || 1;
    const rook = this.boss?.rook;
    return {
      loading: this.loading ?? undefined,
      mission: this.mission,
      hp: this.hp,
      maxHp: this.maxHp,
      heat: c?.heat ?? 0,
      overheated: (c?.overheated ?? 0) > 0,
      area: d?.name || '',
      chapter: this.chapterName || d?.chapters[0]?.name || '',
      progress: clamp((this.districtIndex + clamp(1 - remaining / total, 0, 1)) / districts, 0, 1),
      signals: this.signals.size,
      score: this.score,
      shield: c?.shield ?? 1,
      shieldBroken: (c?.shieldBroken ?? 0) > 0,
      gravity: h.gravityScale,
      banner: this.bannerT > 0 ? this.banner : '',
      bannerSmall: this.bannerSmall,
      boss: rook && rook.active && rook.alive ? { name: 'Night Rook', health: rook.hp / rook.maxHp, phase: rook.phase, tell: this.boss!.tell() } : null,
      completed: this.completed,
      height: h.grounded ? undefined : h.height,
      landmark: d ? { name: d.landmark.name, distance: Math.hypot(d.landmark.x - h.x, d.landmark.z - h.z) } : undefined,
      hint: this.hintT > 0 ? this.hint : undefined,
      // The centre crosshair is the free-aim mark, and free aim is where the
      // shots go when nothing is locked. A locked target carries its own
      // reticle in the world, so the centre mark stands down.
      lock: c?.lock ? undefined : this.lockHeldPrev ? 'open' : undefined,
      target: this.targetInfo(),
      standIns: this.standInsOnScreen(),
      stronghold: this.activeStronghold(),
      transitionImage: this.transitionFade > 0 ? this.transitionImage : undefined,
      transitionFade: this.transitionFade > 0 ? this.transitionFade : undefined,
    };
  }
  /** The shadow the HUD shows a health bar for: whatever is locked, else
   * whatever the lasers last chose, for a few seconds after the last shot.
   * The commander has its own bar, so it is not repeated here. */
  private targetInfo(): { name: string; health: number; locked: boolean } | undefined {
    const c = this.combat;
    if (!c) return undefined;
    const locked = c.targetById(c.lock);
    const recent = c.time - c.lastTargetAt < 3.5 ? c.lastTarget : null;
    const s = locked || (recent && recent.alive ? recent : null);
    if (!s || !s.alive) return undefined;
    if (s.id === 'boss') return undefined;
    return { name: SHADOW_NAMES[s.kind] || 'Shadow', health: Math.max(0, s.hp / s.maxHp), locked: !!locked };
  }
  /** The stronghold whose host is out right now, for the HUD. */
  private activeStronghold(): GameSnapshot['stronghold'] {
    const field = this.world?.fields.find((f) => f.active && f.group !== 'boss');
    if (!field || !this.combat) return undefined;
    const host = this.combat.shadows.filter((s) => s.group === field.group);
    return { name: field.name, remaining: host.filter((s) => s.alive).length, total: host.length };
  }
  /** Which placeholder art is in play right now, for the HUD's stand-in tag. */
  private standInsOnScreen(): string | undefined {
    const h = this.player,
      parts: string[] = [];
    if (this.combat?.shadows.some((s) => s.alive && !s.dormant && Math.hypot(s.x - h.x, s.z - h.z) < 400)) parts.push('shadows');
    if (this.boss?.rook.active && this.boss.rook.alive) parts.push('commander');
    return parts.length ? parts.join(', ') : undefined;
  }
  private emit() {
    this.onSnapshot(this.snapshot());
  }
  dispose(): void {
    this.canvas.removeEventListener('click', this.onClick);
    this.scene?.dispose();
    this.scene = null;
  }
}
