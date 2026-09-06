import { buildLevel, type LevelData, type Platform } from './levels';
import { CombatWorld, ENEMY_ORDER, type CombatCallbacks } from './combat';
import { hopperEye } from './hopper-animation';
import { Renderer } from './renderer';
import type { InputFrame } from './input';
import type { GameAudio, SoundEffect } from './audio';
export interface GameSettings {
  master: number;
  music: number;
  sfx: number;
  shake: boolean;
  assist: boolean;
}
export interface GameSnapshot {
  mission: number;
  hp: number;
  maxHp: number;
  heat: number;
  overheated: boolean;
  area: string;
  chapter: string;
  progress: number;
  signals: number;
  score: number;
  shield: number;
  shieldBroken: boolean;
  gravity: number;
  banner: string;
  bannerSmall: string;
  boss: null | { name: string; health: number; phase: number; tell: string };
  completed: boolean;
}
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}
interface Explosion {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  size: number;
}
interface Laser {
  x: number;
  y: number;
  x2: number;
  y2: number;
  life: number;
  maxLife: number;
}
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const approach = (v: number, t: number, s: number) =>
  v < t ? Math.min(t, v + s) : Math.max(t, v - s);
const BG = [
  'fields',
  'city',
  'mountains',
  'foundry',
  'harbor',
  'launchworks',
  'red',
  'blue',
  'purple',
];
const BOSSES = ['nightRook', 'smelterLeviathan', 'eclipseRegent'];
const BOSS_NAMES = ['Night Rook', 'Smelter Leviathan', 'The Eclipse Regent'];
export const PHYSICS = {
  speed: 650,
  gravity: 1900,
  jump: 1000,
  airAcceleration: 2400,
  groundAcceleration: 3400,
  holdTime: 0.32,
  holdGravity: 0.48,
  releaseCut: 0.45,
  coyote: 0.11,
  buffer: 0.13,
};
const emptyInput: InputFrame = {
  moveX: 0,
  moveY: 0,
  jumpHeld: false,
  jumpPressed: false,
  kickPressed: false,
  shootHeld: false,
  blockHeld: false,
  pausePressed: false,
  instructionsPressed: false,
  confirmPressed: false,
  backPressed: false,
  anyPressed: false,
  menuX: 0,
  menuY: 0,
  connected: false,
  active: 'keyboard',
  disconnected: false,
};
export class Engine {
  rumble: (strength: number, duration: number) => void = () => {};
  level: LevelData = buildLevel(0);
  combat = new CombatWorld(this.level);
  mission = 0;
  time = 0;
  paused = true;
  loaded = false;
  completed = false;
  player = {
    x: 180,
    y: 800,
    vx: 0,
    vy: 0,
    w: 110,
    h: 120,
    facing: 1,
    gravitySign: 1,
    grounded: true,
    kickT: 0,
    launchT: 0,
    landT: 0,
    invuln: 0,
    shooting: false,
    blocking: false,
    shieldFlash: 0,
    landingDistance: Infinity,
    reducedMotion: false,
  };
  camera = { x: 520, y: 490, zoom: 0.95 };
  images: Record<string, HTMLImageElement> = {};
  renderer: Renderer;
  platforms: Platform[] = [];
  particles: Particle[] = [];
  explosions: Explosion[] = [];
  lasers: Laser[] = [];
  signals = new Set<string>();
  checkpointIndex = 0;
  settings: GameSettings = {
    master: 0.8,
    music: 0.55,
    sfx: 0.65,
    shake: true,
    assist: false,
  };
  hp = 7;
  maxHp = 7;
  heat = 0;
  overheated = false;
  score = 0;
  shake = 0;
  shield = 1;
  private shieldBrokenT = 0;
  private shieldHitT = 0;
  private shieldRestT = 0;
  private groundAnchorY = 800;
  private groundAnchorSign = 1;
  private cameraLead = 330;
  private leadDirection = 1;
  private leadCandidate = 1;
  private leadDistance = 0;
  private leadTimer = 0;
  private pendingJump = false;
  private pendingKick = false;
  private pendingShot = false;
  private acc = 0;
  private uiClock = 0;
  private coyote = 0.11;
  private jumpBuffer = 0;
  private hold = 0;
  private previousHold = false;
  private shotCooldown = 0;
  private kickId = 0;
  private launchId = 0;
  private launchFacing = 1;
  private checkpoint = { x: 180, y: 800, area: 0 };
  private areaIndex = -1;
  private banner = '';
  private bannerSmall = '';
  private bannerT = 0;
  private crumble = new Map<string, number>();
  private stood = '';
  private respawnT = 0;
  private deathY = 2000;
  private resizeObserver: ResizeObserver;
  private callbacks: CombatCallbacks;
  private victoryT = 0;
  constructor(
    private canvas: HTMLCanvasElement,
    private audio: GameAudio,
    private onSnapshot: (s: GameSnapshot) => void,
  ) {
    this.renderer = new Renderer(canvas, this.images);
    this.platforms = this.level.platforms;
    this.callbacks = {
      hurt: (d, kx, ky) => this.hurt(d, kx, ky),
      effect: (name, x, y, color) => this.effect(name, x, y, color),
      sound: (n) =>
        this.audio.effect(
          ({ enemy: 'laser', burst: 'explode', victory: 'boss' }[n] ||
            n) as SoundEffect,
        ),
      stomp: () => {
        this.player.landT = 0.18;
        this.shake = Math.max(this.shake, 6);
      },
      bossDefeated: () => {
        this.victoryT = 2.6;
        this.effect(
          'bossExplosion',
          this.combat.boss.x,
          this.combat.boss.y - 100,
        );
        this.score += 5000;
      },
    };
    this.resizeObserver = new ResizeObserver(() => this.render());
    this.resizeObserver.observe(canvas);
    // Read-only state is useful to assistive tools; local QA adds controls only on loopback.
    const debug = {
      snapshot: () => this.snapshot(),
      state: () => ({
        player: { ...this.player },
        camera: { ...this.camera },
        time: this.time,
        checkpoint: { ...this.checkpoint },
        boss: { ...this.combat.boss, attackIds: undefined },
        platforms: this.platforms.filter(
          (p) => Math.abs(p.x - this.player.x) < 1800,
        ),
      }),
      pause: () => this.setPaused(true),
    };
    Object.assign(window, { hopper: debug });
    if (['localhost', '127.0.0.1'].includes(location.hostname))
      Object.assign(debug, {
        engine: this,
        warp: (mission: number, area = 0, chapter = 0) => {
          this.start(mission);
          const ch = this.level.chapters[area * 5 + chapter];
          const p = this.level.platforms.find(
            (p) => p.routeRole === 'main' && p.x >= ch.xStart,
          )!;
          Object.assign(this.player, {
            x: p.x + 180,
            y: p.y,
            grounded: true,
            vx: 0,
            vy: 0,
          });
          this.camera.x = this.player.x + 350;
          this.camera.y = this.player.y - 270;
          this.checkpoint = { x: this.player.x, y: this.player.y, area };
          this.paused = false;
        },
        boss: () => {
          const a = this.level.boss.arena;
          Object.assign(this.player, {
            x: a.x + 200,
            y: a.y,
            grounded: true,
            vx: 0,
            vy: 0,
          });
          this.camera.x = this.player.x + 350;
          this.camera.y = this.player.y - 300;
          this.paused = false;
        },
        step: (count: number, f: Partial<InputFrame>) => {
          for (let n = 0; n < count; n++)
            this.step(1 / 120, {
              ...emptyInput,
              ...f,
              jumpPressed: n === 0 && !!f.jumpPressed,
              kickPressed: n === 0 && !!f.kickPressed,
            });
          this.emit();
          this.render();
        },
      });
  }
  async load(progress: (v: number) => void) {
    const list: [string, string][] = [
      ['hopperAtlas', './assets/hopper-atlas.png'],
      ['explosionAtlas', './assets/explosion-atlas.png'],
      ...BG.map(
        (k) =>
          ['background-' + k, `./assets/backgrounds/${k}.webp`] as [
            string,
            string,
          ],
      ),
      ...ENEMY_ORDER.map(
        (k) => [k, `./assets/enemies/${k}.png`] as [string, string],
      ),
      ...BOSSES.map((k) => [k, `./assets/bosses/${k}.png`] as [string, string]),
      ...Array.from(
        { length: 9 },
        (_, n) =>
          ['platform' + n, `./assets/platforms/platform${n}.png`] as [
            string,
            string,
          ],
      ),
      ...[0, 1, 4, 5].map(
        (n) =>
          ['decor' + n, `./assets/platforms/decor${n}.png`] as [string, string],
      ),
    ];
    let done = 0;
    await Promise.all(
      list.map(async ([key, path]) => {
        const im = new Image();
        im.decoding = 'async';
        await new Promise<void>((resolve, reject) => {
          im.onload = () => resolve();
          im.onerror = () => reject(new Error(`Could not load ${path}`));
          im.src = path;
        });
        await im.decode().catch(() => {});
        this.images[key] = im;
        progress(++done / list.length);
      }),
    );
    this.loaded = true;
    this.emit();
    this.render();
  }
  preview(mission: number, area: number, pose: string) {
    this.start(mission);
    const ch = this.level.chapters[area * 5],
      q = this.level.platforms.find(
        (p) => p.routeRole === 'main' && p.x >= ch.xStart,
      )!;
    Object.assign(this.player, {
      x: q.x + 220,
      y: q.y,
      grounded: true,
      vx: 0,
      vy: 0,
      invuln: 0,
    });
    this.checkpoint = { x: this.player.x, y: this.player.y, area };
    this.areaIndex = area;
    this.bannerT = 0;
    if (pose === 'boss') {
      const a = this.level.boss.arena;
      Object.assign(this.player, { x: a.x + 800, y: a.y });
      this.combat.boss.active = true;
    }
    if (pose === 'run') this.player.vx = 650;
    if (pose === 'rise' || pose === 'fall') {
      this.player.y -= 280;
      this.player.grounded = false;
      this.player.vy = pose === 'rise' ? -500 : 500;
    }
    if (pose === 'kick') this.player.kickT = 0.27;
    if (pose === 'inverted') {
      this.player.gravitySign = -1;
      this.player.y -= 280;
    }
    this.groundAnchorY = this.player.y;
    this.groundAnchorSign = this.player.gravitySign;
    this.camera = {
      x: this.player.x + 330,
      y: this.player.y - 270,
      zoom: 0.95,
    };
    if (pose === 'shield') {
      this.player.blocking = true;
      this.player.shieldFlash = 0.18;
    }
    if (pose === 'laser') {
      this.player.shooting = true;
      this.shoot();
    }
    if (pose === 'explosion')
      this.effect('explosion', this.player.x + 240, this.player.y - 90);
    this.paused = true;
    this.emit();
    this.render();
  }
  auditStep(count: number, f: Partial<InputFrame>) {
    for (let n = 0; n < count; n++)
      this.step(1 / 120, {
        ...emptyInput,
        ...f,
        jumpPressed: n === 0 && !!f.jumpPressed,
        kickPressed: n === 0 && !!f.kickPressed,
      });
    this.paused = true;
    this.emit();
    this.render();
  }
  configure(s: GameSettings) {
    this.settings = s;
    this.player.reducedMotion = !s.shake;
  }
  start(mission: number, resume = false) {
    let save: null | {
      mission: number;
      checkpoint: number;
      signals: string[];
      score: number;
    } = null;
    try {
      if (resume)
        save = JSON.parse(localStorage.getItem('hopper.save') || 'null');
    } catch {}
    this.mission = clamp(save?.mission ?? mission, 0, 2);
    this.level = buildLevel(this.mission);
    this.combat = new CombatWorld(this.level);
    this.time = 0;
    this.completed = false;
    this.victoryT = 0;
    this.hp = this.maxHp;
    this.heat = 0;
    this.shield = 1;
    this.shieldBrokenT = 0;
    this.overheated = false;
    this.particles = [];
    this.explosions = [];
    this.lasers = [];
    this.signals = new Set(save?.signals || []);
    this.score = save?.score || 0;
    this.checkpointIndex = clamp(
      save?.checkpoint || 0,
      0,
      this.level.checkpoints.length - 1,
    );
    this.checkpoint = {
      ...(this.level.checkpoints[this.checkpointIndex] || {
        ...this.level.start,
        area: 0,
      }),
    };
    this.areaIndex = -1;
    this.crumble.clear();
    this.resetPlayer();
    this.platforms = this.level.platforms.map((p) => ({ ...p }));
    this.combat.resetToCheckpoint(this.player.x);
    this.emit();
  }
  setPaused(v: boolean) {
    this.paused = v;
    this.acc = 0;
    this.pendingJump = false;
    this.pendingKick = false;
    this.pendingShot = false;
    this.previousHold = false;
    this.jumpBuffer = 0;
  }
  tick(dt: number, f?: InputFrame) {
    if (!this.loaded) return;
    if (!this.paused && f && !this.completed) {
      this.pendingJump ||= f.jumpPressed;
      this.pendingKick ||= f.kickPressed;
      this.pendingShot ||= f.shootHeld;
      this.acc += Math.min(dt, 0.05);
      let first = true;
      while (this.acc >= 1 / 120) {
        this.step(
          1 / 120,
          first
            ? {
                ...f,
                jumpPressed: this.pendingJump,
                kickPressed: this.pendingKick,
                shootHeld: this.pendingShot,
              }
            : { ...f, jumpPressed: false, kickPressed: false },
        );
        first = false;
        this.pendingJump = false;
        this.pendingKick = false;
        this.pendingShot = false;
        this.acc -= 1 / 120;
      }
      this.uiClock += dt;
      if (this.uiClock > 0.1) {
        this.emit();
        this.uiClock = 0;
      }
    }
    this.render();
  }
  private resetPlayer() {
    Object.assign(this.player, {
      x: this.checkpoint.x,
      y: this.checkpoint.y,
      vx: 0,
      vy: 0,
      gravitySign: 1,
      grounded: true,
      kickT: 0,
      launchT: 0,
      landT: 0,
      invuln: 1.7,
      shooting: false,
      blocking: false,
      shieldFlash: 0,
      landingDistance: 0,
    });
    this.camera = {
      x: this.player.x + 340,
      y: this.player.y - 270,
      zoom: 0.95,
    };
    this.groundAnchorY = this.player.y;
    this.groundAnchorSign = this.player.gravitySign;
    this.cameraLead = 330;
    this.leadDirection = 1;
    this.leadCandidate = 1;
    this.leadDistance = 0;
    this.leadTimer = 0;
    this.hold = 0;
    this.coyote = 0.11;
    this.jumpBuffer = 0;
    this.previousHold = false;
    this.shotCooldown = 0;
    this.respawnT = 0;
    this.stood = '';
    this.deathY = this.checkpoint.y + 1200;
  }
  respawn() {
    this.hp = this.maxHp;
    this.heat = 0;
    this.shield = 1;
    this.shieldBrokenT = 0;
    this.overheated = false;
    this.resetPlayer();
    this.combat.resetToCheckpoint(this.checkpoint.x);
    this.crumble.clear();
    this.particles = [];
    this.lasers = [];
    this.banner = 'Back in the saddle';
    this.bannerSmall = 'CHECKPOINT RESTORED';
    this.bannerT = 2;
    this.emit();
  }
  private save() {
    try {
      localStorage.setItem(
        'hopper.save',
        JSON.stringify({
          mission: this.mission,
          checkpoint: this.checkpointIndex,
          signals: [...this.signals],
          score: this.score,
        }),
      );
    } catch {}
  }
  private hurt(d: number, kx: number, ky: number) {
    if (this.respawnT > 0 || this.victoryT > 0) return;
    if (this.player.blocking) {
      if (this.shieldHitT <= 0) {
        this.shield = Math.max(0, this.shield - 0.2);
        this.shieldHitT = 0.22;
        this.player.shieldFlash = 0.3;
        this.shieldRestT = 0.8;
        this.effect(
          'spark',
          this.player.x - Math.sign(kx) * 105,
          this.player.y - 65 * this.player.gravitySign,
          '#b6fbff',
        );
        this.audio.effect('shield');
        this.rumble(0.22, 55);
        if (this.shield <= 0) {
          this.shieldBrokenT = 1.4;
          this.player.blocking = false;
        }
      }
      return;
    }
    if (this.player.invuln > 0) return;
    this.hp = Math.max(0, this.hp - d);
    this.player.invuln = this.settings.assist ? 2.8 : 1.25;
    this.player.vx = kx;
    this.player.vy = ky;
    this.player.grounded = false;
    this.shake = Math.max(this.shake, 8);
    this.audio.effect('hurt');
    this.rumble(0.6, 120);
    this.effect('spark', this.player.x, this.player.y - 50, '#ffd99b');
    if (this.hp <= 0) {
      this.respawnT = 1.15;
      this.effect('explosion', this.player.x, this.player.y - 75);
      this.banner = 'Hold on, Hopper!';
      this.bannerSmall = 'RETURNING TO CHECKPOINT';
      this.bannerT = 1.2;
    }
  }
  private step(dt: number, f: InputFrame) {
    this.time += dt;
    this.bannerT = Math.max(0, this.bannerT - dt);
    this.shake = Math.max(0, this.shake - dt * 25);
    const p = this.player;
    for (const n of ['kickT', 'launchT', 'landT', 'invuln'] as const)
      p[n] = Math.max(0, p[n] - dt);
    this.shotCooldown = Math.max(0, this.shotCooldown - dt);
    this.shieldBrokenT = Math.max(0, this.shieldBrokenT - dt);
    this.shieldHitT = Math.max(0, this.shieldHitT - dt);
    this.shieldRestT = Math.max(0, this.shieldRestT - dt);
    p.shieldFlash = Math.max(0, p.shieldFlash - dt);
    const wasBlocking = p.blocking;
    p.blocking = !!f.blockHeld && this.shield > 0.03 && this.shieldBrokenT <= 0;
    if (p.blocking) {
      this.shield = Math.max(0, this.shield - dt * 0.13);
      this.shieldRestT = 0.65;
      if (!wasBlocking) {
        this.audio.effect('shield');
        p.kickT = 0;
      }
      if (this.shield <= 0.03) {
        this.shieldBrokenT = 1.4;
        p.blocking = false;
      }
    } else if (this.shieldRestT <= 0)
      this.shield = Math.min(1, this.shield + dt * 0.27);
    for (const b of this.particles) {
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vy += 260 * dt;
    }
    this.particles = this.particles.filter((b) => b.life > 0).slice(-600);
    for (const b of this.explosions) b.life -= dt;
    this.explosions = this.explosions.filter((b) => b.life > 0);
    for (const b of this.lasers) b.life -= dt;
    this.lasers = this.lasers.filter((b) => b.life > 0);
    if (this.victoryT > 0) {
      this.victoryT -= dt;
      if (
        Math.floor(this.victoryT * 12) !== Math.floor((this.victoryT + dt) * 12)
      )
        this.effect(
          'explosion',
          this.combat.boss.x + (Math.random() - 0.5) * 300,
          this.combat.boss.y - 100 - Math.random() * 200,
        );
      if (this.victoryT <= 0) {
        this.completed = true;
        try {
          localStorage.setItem(
            'hopper.unlocked',
            String(
              Math.max(
                this.mission + 1,
                Number(localStorage.getItem('hopper.unlocked') || 0),
              ),
            ),
          );
          localStorage.removeItem('hopper.save');
        } catch {}
        this.emit();
      }
      return;
    }
    if (this.respawnT > 0) {
      this.respawnT -= dt;
      if (this.respawnT <= 0) this.respawn();
      return;
    }
    const area =
      this.level.areas.find((a) => p.x >= a.xStart && p.x < a.xEnd) ||
      this.level.areas[2];
    if (area.id !== this.areaIndex) {
      this.areaIndex = area.id;
      this.banner = area.name;
      this.bannerSmall = area.subtitle.toUpperCase();
      this.bannerT = 4;
      this.audio.effect('checkpoint');
    }
    const gate = this.level.gravityGates.find(
      (g) => p.x > g.x && p.x < g.x + g.w && p.y > g.y - 100 && p.y < g.y + g.h,
    );
    const sign = gate ? -1 : 1;
    if (sign !== p.gravitySign) {
      p.gravitySign = sign;
      p.vy = clamp(p.vy, -380, 380);
      p.grounded = false;
      this.coyote = 0;
      this.banner = sign < 0 ? 'The world turns over' : 'Feet toward home';
      this.bannerSmall =
        sign < 0
          ? 'REVERSED GRAVITY · JUMP AWAY FROM THE CEILING'
          : 'NORMAL GRAVITY RESTORED';
      this.bannerT = 2.4;
    }
    this.platforms = this.level.platforms
      .map((q) => {
        const b = { ...q };
        if (q.moving)
          b[q.moving.axis] +=
            Math.sin(
              (this.time * q.moving.speed) / q.moving.range + q.moving.phase,
            ) * q.moving.range;
        return b;
      })
      .filter((q) => {
        const t = this.crumble.get(q.id);
        return t === undefined || this.time - t < 0.65 || this.time - t > 5;
      });
    if (this.stood) {
      const base = this.level.platforms.find((q) => q.id === this.stood);
      if (base?.moving) {
        const v = base.moving;
        const delta =
          (Math.sin((this.time * v.speed) / v.range + v.phase) -
            Math.sin(((this.time - dt) * v.speed) / v.range + v.phase)) *
          v.range;
        p[v.axis] += delta;
      }
      if (base?.kind === 'conveyor') p.x += 90 * dt;
    }
    if (f.jumpPressed) this.jumpBuffer = PHYSICS.buffer;
    else this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    if (p.grounded) this.coyote = PHYSICS.coyote;
    else this.coyote = Math.max(0, this.coyote - dt);
    p.vx = approach(
      p.vx,
      f.moveX * PHYSICS.speed,
      (p.grounded ? PHYSICS.groundAcceleration : PHYSICS.airAcceleration) * dt,
    );
    if (p.grounded && Math.abs(f.moveX) > 0.12 && p.kickT < 0.12)
      p.facing = f.moveX < 0 ? -1 : 1;
    if (this.jumpBuffer > 0 && this.coyote > 0) {
      p.vy = -PHYSICS.jump * sign;
      p.grounded = false;
      this.stood = '';
      this.hold = 0;
      this.coyote = 0;
      this.jumpBuffer = 0;
      p.launchT = 0.2;
      p.landT = 0;
      this.launchFacing = p.facing;
      this.launchId++;
      this.audio.effect('jump');
      this.effect('stomp', p.x - p.facing * 65, p.y - 20, '#d7dd9f');
    }
    if (this.previousHold && !f.jumpHeld && p.vy * sign < 0)
      p.vy *= PHYSICS.releaseCut;
    this.previousHold = f.jumpHeld;
    this.hold += dt;
    p.vy +=
      PHYSICS.gravity *
      area.gravity *
      sign *
      (f.jumpHeld && this.hold < PHYSICS.holdTime && p.vy * sign < 0
        ? PHYSICS.holdGravity
        : 1) *
      dt;
    p.vy = clamp(p.vy, -1600, 1600);
    const oldX = p.x,
      oldY = p.y,
      wasGrounded = p.grounded;
    p.x += p.vx * dt;
    p.x = clamp(p.x, 55, this.level.width - 70);
    // Horizontal walls use the forgiving body capsule; thin optional shelves remain one-way.
    for (const q of this.platforms) {
      if (
        q.ceiling ||
        q.kind === 'oneWay' ||
        q.routeRole === 'optional' ||
        Math.abs(q.x - p.x) > q.w + 300
      )
        continue;
      const top = sign > 0 ? p.y - p.h : p.y,
        bottom = sign > 0 ? p.y : p.y + p.h;
      if (bottom <= q.y + 8 || top >= q.y + q.h - 3) continue;
      if (oldX + 45 <= q.x && p.x + 45 > q.x) {
        p.x = q.x - 45;
        p.vx = 0;
      } else if (oldX - 45 >= q.x + q.w && p.x - 45 < q.x + q.w) {
        p.x = q.x + q.w + 45;
        p.vx = 0;
      }
    }
    p.y += p.vy * dt;
    p.grounded = false;
    this.stood = '';
    for (const q of this.platforms) {
      if (p.x + 43 < q.x || p.x - 43 > q.x + q.w) continue;
      if (
        sign > 0 &&
        !q.ceiling &&
        p.vy >= 0 &&
        oldY <= q.y + 5 &&
        p.y >= q.y
      ) {
        p.y = q.y;
        p.vy = 0;
        p.grounded = true;
        this.stood = q.id;
      } else if (
        sign < 0 &&
        q.ceiling &&
        p.vy <= 0 &&
        oldY >= q.y + q.h - 5 &&
        p.y <= q.y + q.h
      ) {
        p.y = q.y + q.h;
        p.vy = 0;
        p.grounded = true;
        this.stood = q.id;
      }
      if (
        sign > 0 &&
        q.kind !== 'oneWay' &&
        q.routeRole !== 'optional' &&
        !q.ceiling &&
        p.vy < 0 &&
        oldY - p.h >= q.y + q.h &&
        p.y - p.h < q.y + q.h
      ) {
        p.y = q.y + q.h + p.h;
        p.vy = 0;
      }
    }
    if (p.grounded && !wasGrounded) {
      p.landT = 0.18;
      this.hold = 0;
      this.audio.effect('stomp');
      this.rumble(0.23, 55);
      this.effect('stomp', p.x, p.y);
      this.shake = Math.max(this.shake, Math.abs(oldY - p.y) > 10 ? 5 : 2);
      if (
        this.stood &&
        this.level.platforms.find((q) => q.id === this.stood)?.kind ===
          'crumble'
      )
        this.crumble.set(this.stood, this.time);
    }
    if (f.kickPressed && p.kickT === 0 && !p.blocking) {
      p.kickT = 0.5;
      this.kickId++;
      this.audio.effect('kick');
      this.rumble(0.3, 65);
    }
    if (p.kickT > 0.1 && p.kickT < 0.44) {
      const result = this.combat.hit(
        p.x,
        p.y - 60 * sign,
        175,
        4,
        'kick',
        p.facing,
        `kick-${this.kickId}`,
      );
      this.score += result.kills * 150;
      for (const b of this.combat.projectiles) {
        if (Math.hypot(b.x - p.x, b.y - (p.y - 55 * sign)) < 195) {
          b.life = 0;
          this.effect('spark', b.x, b.y, '#c9ffe5');
        }
      }
    }
    if (p.launchT > 0) {
      const result = this.combat.hit(
        p.x,
        p.y - 55 * sign,
        160,
        3,
        'launch',
        this.launchFacing,
        `jump-${this.launchId}`,
      );
      this.score += result.kills * 150;
    }
    if (this.combat.tryStomp(p, oldY, f.jumpHeld, this.callbacks)) {
      this.hold = 0;
      this.score += 75;
    }
    this.combat.update(dt, this.time, p, this.platforms, this.callbacks);
    this.heat = Math.max(
      0,
      this.heat -
        dt * (f.shootHeld && !this.overheated && !p.blocking ? 0.06 : 0.34),
    );
    if (this.overheated && this.heat < 0.15) this.overheated = false;
    p.shooting = f.shootHeld && !this.overheated && !p.blocking;
    if (p.shooting && this.shotCooldown === 0) {
      this.shoot();
      this.shotCooldown = 0.11;
      this.heat = Math.min(1, this.heat + 0.055);
      if (this.heat >= 1) {
        this.overheated = true;
        this.audio.effect('hurt');
      }
    }
    for (const h of this.level.hazards) {
      if (Math.abs(h.x - p.x) > h.w + 200) continue;
      const period = h.period || 3,
        phase = (this.time + (h.phase || 0)) % period,
        active =
          h.type === 'lava' || h.type === 'spikes' || phase > period * 0.6;
      if (!active) continue;
      const bodyY = p.y - 55 * sign;
      if (
        p.x + 35 > h.x &&
        p.x - 35 < h.x + h.w &&
        bodyY + 45 > h.y &&
        bodyY - 45 < h.y + h.h
      ) {
        if (h.type === 'wind') p.vx += 110 * dt;
        else this.hurt(1, -p.facing * 160, -240 * sign);
      }
    }
    for (const c of this.level.collectibles) {
      if (
        !this.signals.has(c.id) &&
        Math.hypot(c.x - p.x, c.y - (p.y - 70 * sign)) < 100
      ) {
        this.signals.add(c.id);
        this.score += 500;
        this.hp = Math.min(this.maxHp, this.hp + 1);
        this.audio.effect('pickup');
        this.effect('core', c.x, c.y, '#fff1a3');
        this.save();
      }
    }
    for (
      let n = this.checkpointIndex + 1;
      n < this.level.checkpoints.length;
      n++
    ) {
      const c = this.level.checkpoints[n];
      if (
        p.x >= c.x &&
        p.x < c.x + 550 &&
        p.grounded &&
        Math.abs(p.y - c.y) < 50
      ) {
        this.checkpointIndex = n;
        this.checkpoint = { ...c };
        this.hp = Math.min(this.maxHp, this.hp + 2);
        this.save();
        this.audio.effect('checkpoint');
        this.effect('core', c.x, c.y - 90, '#bbffdf');
      }
    }
    const nearby = this.platforms.filter(
      (q) =>
        !q.ceiling &&
        q.routeRole !== 'optional' &&
        p.x >= q.x - 450 &&
        p.x < q.x + q.w + 450,
    );
    if (nearby.length) this.deathY = Math.max(...nearby.map((q) => q.y)) + 900;
    if (p.y > this.deathY || p.y < this.checkpoint.y - 16000) {
      this.hp = 0;
      this.respawnT = 0.7;
      this.banner = 'A leap too far';
      this.bannerSmall = 'RETURNING TO CHECKPOINT';
      this.bannerT = 0.9;
    }
    const feetSurface = this.platforms
      .filter(
        (q) =>
          p.x + 35 > q.x &&
          p.x - 35 < q.x + q.w &&
          (sign > 0 ? !q.ceiling : !!q.ceiling),
      )
      .map((q) => (sign > 0 ? q.y - p.y : p.y - (q.y + q.h)))
      .filter((d) => d >= -2);
    for (const e of [
      ...this.combat.enemies.filter((e) => e.alive && !e.asleep && e.visible),
      ...(this.combat.boss.active && this.combat.boss.alive
        ? [this.combat.boss]
        : []),
    ]) {
      if (Math.abs(e.x - p.x) < (e.w + p.w) * 0.43) {
        const d = sign > 0 ? e.y - e.h - p.y : p.y - e.y;
        if (d >= 0) feetSurface.push(d);
      }
    }
    p.landingDistance = feetSurface.length
      ? Math.max(0, Math.min(...feetSurface))
      : Infinity;
    if (p.grounded) {
      this.groundAnchorY = p.y;
      this.groundAnchorSign = p.gravitySign;
    }
    // Aim changes never steer the camera. A new travel direction needs both time and distance.
    const travel = Math.abs(p.vx) > 180 ? Math.sign(p.vx) : 0;
    if (travel && travel !== this.leadDirection) {
      if (travel !== this.leadCandidate) {
        this.leadCandidate = travel;
        this.leadTimer = 0;
        this.leadDistance = 0;
      }
      this.leadTimer += dt;
      this.leadDistance += Math.abs(p.vx) * dt;
      if (this.leadTimer > 0.38 && this.leadDistance > 150) {
        this.leadDirection = travel;
        this.leadTimer = 0;
        this.leadDistance = 0;
      }
    } else {
      this.leadTimer = 0;
      this.leadDistance = 0;
    }
    this.cameraLead +=
      (this.leadDirection * 330 - this.cameraLead) * Math.min(1, dt * 1.35);
    const b = this.combat.boss,
      targetZoom = b.active
        ? clamp(
            (this.renderer.viewport.width * this.camera.zoom - 240) /
              (Math.abs(b.x - p.x) + 900),
            0.55,
            0.9,
          )
        : 0.95;
    this.camera.zoom += (targetZoom - this.camera.zoom) * Math.min(1, dt * 1.3);
    const desiredX = b.active ? (p.x + b.x) * 0.5 : p.x + this.cameraLead,
      dx = desiredX - this.camera.x;
    if (b.active || Math.abs(dx) > 90)
      this.camera.x +=
        (b.active ? dx : dx - Math.sign(dx) * 90) * Math.min(1, dt * 4);
    // Keep the landing terrain steady through normal hops. Follow only to protect screen edges.
    const halfView = this.renderer.viewport.height * 0.5,
      anchor = this.groundAnchorY - this.groundAnchorSign * 270;
    let desiredY = anchor;
    const headY = sign > 0 ? p.y - 180 : p.y,
      footY = sign > 0 ? p.y : p.y + 180;
    desiredY = Math.min(desiredY, headY + halfView - 110);
    desiredY = Math.max(desiredY, footY - halfView + 145);
    const urgent =
      headY < this.camera.y - halfView + 80 ||
      footY > this.camera.y + halfView - 90;
    this.camera.y +=
      (desiredY - this.camera.y) * Math.min(1, dt * (urgent ? 9 : 3));
  }
  private shoot() {
    const p = this.player,
      eye = hopperEye(p, p.x, p.y, 240, 240, this.time),
      max = 1050;
    let end = eye.x + p.facing * max,
      endY = eye.y;
    const targets = [
      ...this.combat.enemies.filter((e) => e.alive && e.visible && !e.asleep),
      ...(this.combat.boss.active && this.combat.boss.alive
        ? [this.combat.boss]
        : []),
    ];
    let hitTarget: (typeof targets)[number] | null = null;
    let distance = max;
    for (const e of targets) {
      const dx = (e.x - eye.x) * p.facing;
      if (
        dx > 0 &&
        dx < distance &&
        eye.y > e.y - e.h - 60 &&
        eye.y < e.y + 35
      ) {
        distance = dx;
        end = e.x;
        endY = clamp(eye.y, e.y - e.h * 0.8, e.y - e.h * 0.2);
        hitTarget = e;
      }
    }
    for (const q of this.platforms) {
      const edge = p.facing > 0 ? q.x : q.x + q.w,
        dx = (edge - eye.x) * p.facing;
      if (dx > 0 && dx < distance && eye.y > q.y + 4 && eye.y < q.y + q.h) {
        distance = dx;
        end = edge;
        endY = eye.y;
        hitTarget = null;
      }
    }
    if (hitTarget) {
      const r = this.combat.hit(hitTarget.x, endY, 22, 1, 'laser', p.facing);
      this.score += r.kills * 100;
      this.effect('spark', end, endY, '#ffe7bb');
    }
    this.lasers.push({
      x: eye.x,
      y: eye.y,
      x2: end,
      y2: endY,
      life: 0.1,
      maxLife: 0.1,
    });
    this.audio.effect('laser');
  }
  private effect(name: string, x: number, y: number, color = '#efd6a4') {
    const explosion = name === 'explosion' || name === 'bossExplosion';
    if (explosion) {
      this.explosions.push({
        x,
        y,
        life: 0.565,
        maxLife: 0.565,
        size: name === 'bossExplosion' ? 470 : 190,
      });
      this.audio.effect('explode');
      this.shake = Math.max(this.shake, name === 'bossExplosion' ? 14 : 5);
    }
    const count = explosion
      ? 26
      : name === 'stomp'
        ? 12
        : name === 'tell'
          ? 3
          : 16;
    for (let n = 0; n < count; n++) {
      const a = Math.random() * Math.PI * 2,
        v = (name === 'stomp' ? 140 : 260) * (0.3 + Math.random());
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - (name === 'stomp' ? 50 : 0),
        life: 0.3 + Math.random() * 0.5,
        maxLife: 0.8,
        size: 1 + Math.random() * 4,
        color,
      });
    }
  }
  snapshot(): GameSnapshot {
    const area = this.level.areas[Math.max(0, this.areaIndex)],
      chapter = this.level.chapters.find(
        (c) => this.player.x >= c.xStart && this.player.x < c.xEnd,
      ),
      b = this.combat.boss;
    return {
      mission: this.mission,
      hp: this.hp,
      maxHp: this.maxHp,
      heat: this.heat,
      overheated: this.overheated,
      area: area?.name || '',
      chapter:
        chapter?.name || (b.active ? 'The final shadow' : 'Into the horizon'),
      progress: clamp(this.player.x / this.level.width, 0, 1),
      signals: this.signals.size,
      score: this.score,
      shield: this.shield,
      shieldBroken: this.shieldBrokenT > 0,
      gravity: (area?.gravity || 1) * this.player.gravitySign,
      banner: this.bannerT > 0 ? this.banner : '',
      bannerSmall: this.bannerSmall,
      boss:
        b.active && b.alive
          ? {
              name: BOSS_NAMES[b.spriteIndex],
              health: b.hp / b.maxHp,
              phase: b.phase,
              tell:
                b.state === 'telegraph'
                  ? 'INCOMING · keep moving'
                  : b.open > 0
                    ? 'CORE EXPOSED · strike now'
                    : 'Read the shadow. Find your opening.',
            }
          : null,
      completed: this.completed,
    };
  }
  private emit() {
    this.onSnapshot(this.snapshot());
  }
  private render() {
    if (!this.loaded) return;
    this.renderer.draw({
      level: this.level,
      combat: this.combat,
      player: this.player,
      camera: this.camera,
      time: this.time,
      particles: this.particles,
      explosions: this.explosions,
      lasers: this.lasers,
      signals: this.signals,
      checkpointIndex: this.checkpointIndex,
      shake: this.shake,
      settings: this.settings,
      platforms: this.platforms,
    });
  }
  dispose() {
    this.resizeObserver.disconnect();
    this.renderer.dispose();
  }
}
