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
import { DISTRICTS, type District } from './district';
import { createHopperState, intentFromInput, predictLanding, stepHopper, MOVE, type HopperState } from './controller';
import { createCamera, updateCamera, type CameraState } from './camera';
import { Combat, type Shadow } from './combat3d';
import { Scene3D } from './scene';

const STEP = 1 / 120;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

interface Save {
  mission: number;
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
  private camera: CameraState = createCamera(0, [0, 0, 0]);
  private settings: GameSettings = { master: 0.8, music: 0.55, sfx: 0.65, shake: true, assist: false, cameraSensitivity: 0.5, invertY: false, landingGuide: true };
  private loaded = false;
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
  private predicted: { x: number; y: number; z: number } | null = null;
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
  private sound(name: SoundEffect) {
    this.audio.effect(name);
  }
  start(mission: number, resume = false): void {
    if (!this.scene) return;
    let save: Save | null = null;
    try {
      if (resume) save = JSON.parse(localStorage.getItem(saveKey('3d', 'save')) || 'null');
    } catch {}
    this.mission = clamp(save?.mission ?? mission, 0, DISTRICTS.length - 1);
    const district = DISTRICTS[this.mission]();
    this.district = district;
    this.world = new World(district);
    this.combat = new Combat(this.world, district, this.settings.assist);
    // Checkpoints in spine order (toward the exit).
    this.checkpoints = this.world.triggers.filter((t) => t.kind === 'checkpoint').sort((a, b) => Math.hypot(a.x - district.start.x, a.z - district.start.z) - Math.hypot(b.x - district.start.x, b.z - district.start.z));
    this.checkpointIndex = clamp(save?.checkpoint || 0, 0, this.checkpoints.length - 1);
    this.signals = new Set(save?.signals || []);
    for (const t of this.world.triggers)
      if (t.kind === 'signal' && this.signals.has(t.id)) {
        t.taken = true;
        if (t.object) t.object.visible = false;
      }
    this.score = save?.score || 0;
    this.time = 0;
    this.completed = false;
    this.victoryT = 0;
    this.respawnT = 0;
    this.hp = this.maxHp;
    this.scene.buildWorld(this.world, this.combat.shadows);
    for (let i = 0; i <= this.checkpointIndex; i++) this.checkpoints[i]?.object?.userData.lit?.(true);
    this.resetPlayer();
    this.combat.resetToCheckpoint(this.player.z);
    this.showBanner(district.name, district.subtitle, 3.2);
    this.setHint('Hold A to soar. Keep holding to glide.', 6);
    this.emit();
  }
  private resetPlayer() {
    const d = this.district!,
      world = this.world!;
    const cp = this.checkpoints[this.checkpointIndex];
    const x = cp ? cp.x + 6 : d.start.x,
      z = cp ? cp.z + 8 : d.start.z;
    const yaw = cp ? Math.atan2(d.exit.x - x, d.exit.z - z) : d.start.yaw;
    this.player = createHopperState(x, world.groundAt(x, z, 1e6).y, z, yaw);
    this.player.groundY = this.player.y;
    this.player.invuln = 1.7;
    this.camera = createCamera(yaw, [x, this.player.y + 8, z]);
    this.predicted = null;
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
      if (this.victoryT <= 0) this.completed = true;
    }
    if (this.respawnT > 0) {
      this.respawnT -= dt;
      if (this.respawnT <= 0) this.respawn();
      return;
    }
    // Lock-on: hold LT to lock the nearest shadow in view; tap to cycle.
    const lockTapped = f.lockPressed && this.lockHeldPrev;
    if (f.lockHeld) {
      if (!combat.lock || lockTapped) {
        const forward = this.aimDirection();
        const candidates = combat.aliveShadows().filter((s) => Math.hypot(s.x - h.x, s.z - h.z) < 220).sort((a, b) => this.lockScore(a, forward) - this.lockScore(b, forward));
        if (candidates.length) {
          const i = combat.lock ? candidates.findIndex((s) => s.id === combat.lock) : -1;
          combat.lock = candidates[(i + 1) % candidates.length].id;
        }
      }
    } else combat.lock = null;
    this.lockHeldPrev = f.lockHeld;
    const locked = combat.lock ? combat.shadows.find((s) => s.id === combat.lock && s.alive) || null : null;
    if (!locked) combat.lock = null;

    // Movement.
    const intent = intentFromInput(f, this.camera.yaw);
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
        } else if (e.speed > 25) {
          this.sound('stomp');
          this.rumble(Math.min(0.6, e.speed / 120), 90);
        }
      } else if (e.kind === 'wallKick' || e.kind === 'spring') this.sound('jump');
      else if (e.kind === 'glideStart') this.sound('shield');
      else if (e.kind === 'dive') this.sound('kick');
    }
    // Combat: aim from the eye sockets along the facing, tilted with the camera.
    const aim = this.aimDirection();
    combat.update(dt, h, this.callbacks(), { x: h.x + Math.sin(h.yaw) * 9, y: h.y + 12, z: h.z + Math.cos(h.yaw) * 9, dx: aim[0], dy: aim[1], dz: aim[2], firing: f.shootHeld && h.hitstun <= 0, guarding: f.blockHeld && h.hitstun <= 0, kickPressed: f.kickPressed });
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
    if (this.victoryT <= 0 && !this.completed && Math.hypot(d.exit.x - h.x, d.exit.z - h.z) < d.exit.r) {
      this.victoryT = 2.5;
      this.score += 2000;
      this.showBanner(d.exit.name, 'REGION COMPLETE', 2.5);
      this.sound('checkpoint');
      try {
        localStorage.setItem(saveKey('3d', 'unlocked'), String(Math.max(Number(localStorage.getItem(saveKey('3d', 'unlocked')) || 0), Math.min(DISTRICTS.length - 1, this.mission + 1))));
        localStorage.removeItem(saveKey('3d', 'save'));
      } catch {}
    }
    // Camera and the landing prediction.
    updateCamera(this.camera, h, world, { lookX: f.lookX, lookY: f.lookY, mouseLookX: f.mouseLookX, mouseLookY: f.mouseLookY, resetPressed: f.cameraResetPressed, horizonHeld: f.horizonHeld, lock: locked ? [locked.x, locked.y + locked.height * 0.5, locked.z] : null, landmark: [d.landmark.x, 200, d.landmark.z] }, { sensitivity: this.settings.cameraSensitivity ?? 0.5, invertY: !!this.settings.invertY, reducedMotion: !this.settings.shake }, dt);
    this.predicted = !h.grounded && h.height > 3 && !h.gliding ? predictLanding(h, world) : null;
    // Contextual hints for the first minutes.
    if (this.time > 8 && this.time < 8.1) this.setHint('Y in the air: dive. Land on a shadow to bounce.', 6);
    if (this.time > 20 && this.time < 20.1) this.setHint('LB: Horizon View shows the way to Crownline.', 6);
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
    this.showBanner('Back in the saddle', 'CHECKPOINT RESTORED', 2);
    this.emit();
  }
  private save() {
    try {
      localStorage.setItem(saveKey('3d', 'save'), JSON.stringify({ mission: this.mission, checkpoint: this.checkpointIndex, signals: [...this.signals], score: this.score } satisfies Save));
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
    return {
      mission: this.mission,
      hp: this.hp,
      maxHp: this.maxHp,
      heat: c?.heat ?? 0,
      overheated: (c?.overheated ?? 0) > 0,
      area: d?.name || '',
      chapter: this.chapterName || d?.chapters[0]?.name || '',
      progress: clamp(1 - remaining / total, 0, 1),
      signals: this.signals.size,
      score: this.score,
      shield: c?.shield ?? 1,
      shieldBroken: (c?.shieldBroken ?? 0) > 0,
      gravity: h.gravityScale,
      banner: this.bannerT > 0 ? this.banner : '',
      bannerSmall: this.bannerSmall,
      boss: null,
      completed: this.completed,
      height: h.grounded ? undefined : h.height,
      landmark: d ? { name: d.landmark.name, distance: Math.hypot(d.landmark.x - h.x, d.landmark.z - h.z) } : undefined,
      hint: this.hintT > 0 ? this.hint : undefined,
      lock: c?.lock ? 'locked' : this.lockHeldPrev ? 'open' : undefined,
    };
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
