import type { LevelData, Platform, Hazard } from './levels';
import type { CombatWorld, EnemyRuntime, BossRuntime } from './combat';
import { drawHopper, hopperEye } from './hopper-animation';

export interface RenderState {
  level: LevelData;
  combat: CombatWorld;
  player: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    facing: number;
    gravitySign: number;
    grounded: boolean;
    kickT: number;
    launchT: number;
    landT: number;
    invuln: number;
    shooting: boolean;
    parryT?: number;
    catchT?: number;
    blocking?: boolean;
    shieldFlash?: number;
    landingDistance?: number;
    reducedMotion: boolean;
    w?: number;
    h?: number;
  };
  camera: { x: number; y: number; zoom: number };
  time: number;
  particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    color: string;
  }>;
  explosions: Array<{
    x: number;
    y: number;
    life: number;
    maxLife: number;
    size: number;
  }>;
  lasers: Array<{
    x: number;
    y: number;
    x2: number;
    y2: number;
    life: number;
    maxLife: number;
  }>;
  signals: Set<string>;
  broken?: Set<string>;
  lockT?: number;
  checkpointIndex: number;
  shake: number;
  settings: { shake: boolean };
  platforms: Platform[];
}
const BACKGROUNDS = [
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
const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const smooth = (n: number) => {
  n = clamp(n);
  return n * n * (3 - 2 * n);
};
const FLYING = new Set([
  'windowRay',
  'riftCondor',
  'chainManta',
  'coilWraith',
  'turbineWasp',
  'veilMedusa',
  'phaseSkate',
  'gravityCantor',
]);
export const HOPPER_RENDER_SIZE = 240;

/** Canvas has no UI: DOM overlay owns menus and HUD. Viewport values are world units. */
export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly images: Record<string, HTMLImageElement>;
  readonly viewport = { width: 1600, height: 900 };
  private ctx: CanvasRenderingContext2D;
  private width = 1600;
  private height = 900;
  private ratio = 1;
  private bounds = { left: 0, right: 1600, top: 0, bottom: 900 };
  constructor(
    canvas: HTMLCanvasElement,
    images: Record<string, HTMLImageElement>,
  ) {
    this.canvas = canvas;
    this.images = images;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D is unavailable');
    this.ctx = ctx;
  }
  private image(key: string) {
    const img = this.images[key];
    return img && img.complete && img.naturalWidth > 0 ? img : undefined;
  }
  private visible(x: number, y: number, w: number, h: number) {
    return (
      x + w > this.bounds.left - 120 &&
      x < this.bounds.right + 120 &&
      y + h > this.bounds.top - 120 &&
      y < this.bounds.bottom + 120
    );
  }
  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, rect.width || 1600);
    this.height = Math.max(1, rect.height || 900);
    this.ratio = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(this.width * this.ratio),
      h = Math.round(this.height * this.ratio);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }
  draw(s: RenderState): void {
    this.resize();
    const c = this.ctx,
      zoom = clamp(s.camera.zoom, 0.2, 3),
      scale = Math.min(this.height / 900, this.width / 1100) * zoom;
    this.viewport.width = this.width / scale;
    this.viewport.height = this.height / scale;
    this.bounds = {
      left: s.camera.x - this.viewport.width / 2,
      right: s.camera.x + this.viewport.width / 2,
      top: s.camera.y - this.viewport.height / 2,
      bottom: s.camera.y + this.viewport.height / 2,
    };
    c.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    this.background(s);
    const shake =
      s.settings.shake && !s.player.reducedMotion ? Math.min(16, s.shake) : 0;
    c.translate(
      this.width / 2 + Math.sin(s.time * 93) * shake,
      this.height / 2 + Math.cos(s.time * 79) * shake * 0.6,
    );
    c.scale(scale, scale);
    c.translate(-s.camera.x, -s.camera.y);
    // Architectural bodies extend beneath the collision ledge; optional shelves stay light.
    for (const p of s.platforms)
      if (this.visible(p.x, p.y, p.w, Math.max(p.h, 950))) this.platform(p, s);
    // Lockdown walls animate from the level list so they are seen closing and
    // opening, not only while they are solid.
    for (const p of s.level.platforms)
      if (p.lock && this.visible(p.x, p.y, p.w, p.h)) this.lockWall(p, s);
    for (const h of s.level.hazards)
      if (this.visible(h.x, h.y, h.w, h.h)) this.hazard(h, s.time);
    this.markers(s);
    for (const e of s.combat.enemies)
      if (e.alive && this.visible(e.x - e.w, e.y - e.h, e.w * 2, e.h * 2))
        this.creature(e, s.time, false);
    if (
      s.combat.boss.alive &&
      this.visible(s.combat.boss.x - 650, s.combat.boss.y - 700, 1300, 1000)
    )
      this.creature(s.combat.boss, s.time, true);
    this.projectiles(s);
    this.player(s);
    if (s.player.blocking) {
      const p = s.player,
        flash = p.shieldFlash || 0,
        pulse = 0.5 + Math.sin(s.time * 11) * 0.12;
      // A forward-facing guard, not a bubble: the back is deliberately open.
      c.save();
      c.translate(p.x, p.y - 70 * p.gravitySign);
      c.scale(p.facing, 1);
      c.globalAlpha = 0.55 + flash * 1.4;
      c.strokeStyle = flash > 0 ? '#eaffff' : '#8ce6ef';
      c.lineWidth = 5 + flash * 8;
      c.shadowColor = '#76e9ff';
      c.shadowBlur = 22 + flash * 40;
      c.beginPath();
      c.ellipse(
        18,
        0,
        104 + pulse * 8,
        96 + pulse * 8,
        0,
        -Math.PI * 0.44,
        Math.PI * 0.44,
      );
      c.stroke();
      c.globalAlpha = 0.13 + flash * 0.3;
      c.fillStyle = '#b6fbff';
      c.fill();
      c.restore();
    }
    if ((s.player.parryT || 0) > 0) {
      // Parry flash: a bright ring that snaps outward from the spin. The kick
      // sweeps behind, so the ring is centred on Hopper's back.
      const p = s.player,
        t = 1 - (p.parryT || 0) / 0.36;
      c.save();
      c.translate(
        p.x - (p.blocking ? 0 : p.facing * 45),
        p.y - 70 * p.gravitySign,
      );
      c.globalAlpha = Math.max(0, 1 - t) * 0.9;
      c.strokeStyle = '#d6ffff';
      c.lineWidth = 5 - t * 3;
      c.shadowColor = '#76e9ff';
      c.shadowBlur = 26;
      c.beginPath();
      c.ellipse(0, 0, 90 + t * 110, 78 + t * 96, 0, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
    if ((s.player.catchT || 0) > 0) {
      // Ledge catch: a short ivory tick at the lip Hopper hauled onto.
      const p = s.player;
      c.save();
      c.globalAlpha = Math.min(1, (p.catchT || 0) / 0.3) * 0.85;
      c.strokeStyle = '#fff2bc';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(p.x - 40, p.y);
      c.lineTo(p.x + 40, p.y);
      c.stroke();
      c.restore();
    }
    this.effects(s);
    c.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    const vignette = c.createRadialGradient(
      this.width * 0.5,
      this.height * 0.45,
      this.height * 0.28,
      this.width * 0.5,
      this.height * 0.45,
      this.width * 0.72,
    );
    vignette.addColorStop(0, '#00000000');
    vignette.addColorStop(1, '#050b193c');
    c.fillStyle = vignette;
    c.fillRect(0, 0, this.width, this.height);
  }
  private background(s: RenderState) {
    const c = this.ctx,
      areas = s.level.areas;
    let index = Math.max(
      0,
      areas.findIndex((a) => s.player.x >= a.xStart && s.player.x < a.xEnd),
    );
    if (s.player.x >= areas[areas.length - 1].xEnd) index = areas.length - 1;
    const area = areas[index];
    c.fillStyle = area.palette.sky;
    c.fillRect(0, 0, this.width, this.height);
    const layer = (i: number, alpha: number) => {
      const a = areas[i],
        key = BACKGROUNDS[a.backgroundIndex],
        img =
          this.image('background-' + key) ||
          this.image('bg' + a.backgroundIndex);
      if (!img) return;
      c.globalAlpha = alpha;
      const fit =
          Math.max(
            this.width / img.naturalWidth,
            this.height / img.naturalHeight,
          ) * 1.04,
        w = img.naturalWidth * fit,
        h = img.naturalHeight * fit,
        extra = w - this.width;
      const t =
          ((((s.camera.x * 0.035) / (Math.max(1, extra) * 2)) % 2) + 2) % 2,
        pan = t < 1 ? t : 2 - t;
      const dy =
        (Math.sin(s.camera.y / 6000) * 0.5 + 0.5) *
        Math.max(0, h - this.height);
      c.drawImage(img, -extra * pan, -dy, w, h);
      c.globalAlpha = 1;
    };
    layer(index, 1);
    if (index + 1 < areas.length && s.player.x > area.xEnd - 1400)
      layer(index + 1, smooth((s.player.x - (area.xEnd - 1400)) / 1400));
    const shade = c.createLinearGradient(0, 0, 0, this.height);
    shade.addColorStop(0, 'rgba(5,10,22,.1)');
    shade.addColorStop(0.5, 'rgba(5,10,22,.27)');
    shade.addColorStop(1, 'rgba(5,10,22,.57)');
    c.fillStyle = shade;
    c.fillRect(0, 0, this.width, this.height);
    // Sparse drifting atmospheric motes reinforce depth without masking playable surfaces.
    c.fillStyle = area.palette.accent;
    for (let n = 0; n < 24; n++) {
      const x =
          (((n * 137.37 + s.time * (3 + (n % 4)) - s.camera.x * 0.012) %
            this.width) +
            this.width) %
          this.width,
        y = (n * 89.79 + s.time * (2 + (n % 3))) % this.height;
      c.globalAlpha = 0.1 + (n % 3) * 0.025;
      c.beginPath();
      c.arc(x, y, 0.7 + (n % 2), 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
  }
  private lockWall(p: Platform, s: RenderState) {
    // Lockdown wall: energy bars that drop from above as the boss wakes and
    // lift again when it falls. Drawn from the arena floor upward.
    const c = this.ctx,
      t = s.lockT || 0;
    if (t <= 0) return;
    const bottom = p.y + p.h,
      height = (p.h - 190) * t,
      top = bottom - 190 - height,
      pulse = 0.5 + Math.sin(s.time * 7) * 0.2;
    c.save();
    c.globalAlpha = 0.55 + t * 0.35;
    const g = c.createLinearGradient(p.x, 0, p.x + p.w, 0);
    g.addColorStop(0, '#ff9a6a22');
    g.addColorStop(0.5, '#ffd9a8cc');
    g.addColorStop(1, '#ff9a6a22');
    c.fillStyle = g;
    c.fillRect(p.x, top, p.w, height);
    c.strokeStyle = '#ffe1b8';
    c.lineWidth = 3;
    c.shadowColor = '#ffb070';
    c.shadowBlur = 24 * pulse;
    for (let y = top + 24; y < bottom - 190; y += 56) {
      c.beginPath();
      c.moveTo(p.x, y);
      c.lineTo(p.x + p.w, y - 14);
      c.stroke();
    }
    c.strokeRect(p.x, top, p.w, height);
    c.restore();
  }
  private platform(p: Platform, s: RenderState) {
    if (p.lock) {
      this.lockWall(p, s);
      return;
    }
    const c = this.ctx,
      img = this.image('platform' + p.skin),
      area = s.level.areas[p.area ?? 0],
      optional = p.kind === 'oneWay' || p.routeRole === 'optional' || p.ceiling;
    const depth = optional
      ? Math.max(p.h, 65)
      : p.hollow
        ? Math.max(p.h, p.hollow)
        : Math.max(p.h, this.bounds.bottom - p.y + 120);
    c.save();
    if (p.ceiling) {
      c.translate(0, p.y + p.h);
      c.scale(1, -1);
      c.translate(0, -p.y);
    }
    const decor = this.image('decor' + p.skin),
      tileWidth = optional ? Math.min(460, p.w) : 470;
    if (decor && !p.ceiling) {
      c.save();
      c.beginPath();
      c.rect(p.x, p.y - 500, p.w, 500);
      c.clip();
      c.globalAlpha = 0.84;
      const start =
        Math.floor((Math.max(p.x, this.bounds.left - 500) - p.x) / tileWidth) *
          tileWidth +
        p.x;
      const decorH = (tileWidth * decor.naturalHeight) / decor.naturalWidth;
      for (
        let x = start;
        x < Math.min(p.x + p.w, this.bounds.right + 500);
        x += tileWidth
      )
        c.drawImage(decor, x, p.y - decorH, tileWidth, decorH);
      c.restore();
    }
    c.beginPath();
    c.rect(p.x, p.y, p.w, depth);
    c.clip();
    c.fillStyle = area?.palette.ground || '#49453d';
    c.fillRect(p.x, p.y, p.w, depth);
    if (img) {
      const artHeight = (tileWidth * img.naturalHeight) / img.naturalWidth;
      const start =
        Math.floor((Math.max(p.x, this.bounds.left - 500) - p.x) / tileWidth) *
          tileWidth +
        p.x;
      if (!optional) {
        // Only the opaque upper central material continues underground. Repeating a
        // cutout's lower silhouette produced floating stone rows and flat-color gaps.
        const sx = Math.floor(img.naturalWidth * 0.14),
          sy = Math.floor(img.naturalHeight * 0.08);
        const sw = Math.floor(img.naturalWidth * 0.52),
          sh = Math.max(1, Math.floor(img.naturalHeight * 0.27));
        const textureScale = tileWidth / img.naturalWidth,
          tw = sw * textureScale,
          th = sh * textureScale;
        const firstCol = Math.floor(
          (Math.max(p.x, this.bounds.left) - p.x) / tw,
        );
        const firstRow = Math.max(0, Math.floor((this.bounds.top - p.y) / th));
        for (let row = firstRow; p.y + row * th < p.y + depth; row++) {
          const y = p.y + row * th;
          for (
            let col = firstCol;
            p.x + col * tw < Math.min(p.x + p.w, this.bounds.right + 1);
            col++
          ) {
            const x = p.x + col * tw;
            c.save();
            c.translate(x + (col % 2 ? tw : 0), y + (row % 2 ? th : 0));
            c.scale(col % 2 ? -1 : 1, row % 2 ? -1 : 1);
            c.drawImage(img, sx, sy, sw, sh, 0, 0, tw + 0.5, th + 0.5);
            c.restore();
          }
        }
      }
      for (
        let x = start;
        x < Math.min(p.x + p.w, this.bounds.right + 500);
        x += tileWidth
      ) {
        if (optional) c.drawImage(img, x, p.y, tileWidth, artHeight);
        else {
          // One painted top course, cropped before the natural dangling lower edge.
          const topH = Math.max(1, Math.floor(img.naturalHeight * 0.36));
          c.drawImage(
            img,
            0,
            0,
            img.naturalWidth,
            topH,
            x,
            p.y,
            tileWidth,
            (topH / img.naturalWidth) * tileWidth,
          );
        }
      }
    }
    const fade = c.createLinearGradient(
      0,
      p.y + 25,
      0,
      p.y + (optional ? depth : Math.min(depth, 420)),
    );
    fade.addColorStop(0, '#05081400');
    if (!optional) fade.addColorStop(0.35, '#05081455');
    fade.addColorStop(1, optional ? '#05081444' : '#050814ed');
    c.fillStyle = fade;
    c.fillRect(p.x, p.y, p.w, depth);
    // Exact collision surface is always legible and stays stationary as textures animate.
    c.fillStyle = '#121a24';
    c.fillRect(p.x, p.y, p.w, 8);
    c.fillStyle = area?.palette.accent || '#f6d8a5';
    c.globalAlpha = optional ? 0.9 : 0.7;
    c.fillRect(p.x, p.y, p.w, 3);
    c.globalAlpha = 1;
    if (p.kind === 'spring') {
      // A coiled pad: bright chevrons that breathe so it reads as a launcher.
      const pulse = 0.6 + Math.sin(s.time * 6 + p.x) * 0.2;
      c.fillStyle = '#8ce6ef';
      c.globalAlpha = 0.85;
      c.fillRect(p.x, p.y, p.w, 10);
      c.strokeStyle = '#eaffff';
      c.lineWidth = 3;
      c.shadowColor = '#76e9ff';
      c.shadowBlur = 16 * pulse;
      for (let x = p.x + 18; x < p.x + p.w - 18; x += 34) {
        c.beginPath();
        c.moveTo(x, p.y + 30);
        c.lineTo(x + 12, p.y + 14);
        c.lineTo(x + 24, p.y + 30);
        c.stroke();
      }
      c.shadowBlur = 0;
      c.globalAlpha = 1;
    }
    if (p.kind === 'conveyor' && (p.drift ?? 90) < 0) {
      // Belts that run against Hopper show their direction plainly.
      c.strokeStyle = '#ffbe80';
      c.lineWidth = 2;
      c.globalAlpha = 0.8;
      const shift = (s.time * 70) % 40;
      for (let x = p.x + p.w - shift; x > p.x + 10; x -= 40) {
        c.beginPath();
        c.moveTo(x, p.y + 12);
        c.lineTo(x - 12, p.y + 22);
        c.lineTo(x, p.y + 32);
        c.stroke();
      }
      c.globalAlpha = 1;
    }
    if (p.kind === 'conveyor') {
      c.strokeStyle = '#e5c68b';
      c.lineWidth = 3;
      const offset = (s.time * 45) % 50;
      for (let x = p.x - 50 + offset; x < p.x + p.w; x += 50) {
        c.beginPath();
        c.moveTo(x, p.y + 14);
        c.lineTo(x + 12, p.y + 20);
        c.lineTo(x, p.y + 26);
        c.stroke();
      }
    }
    if (p.kind === 'crumble') {
      c.strokeStyle = '#fff0b477';
      c.lineWidth = 2;
      for (let x = p.x + 40; x < p.x + p.w; x += 93) {
        c.beginPath();
        c.moveTo(x, p.y + 5);
        c.lineTo(x - 9, p.y + 17);
        c.lineTo(x + 5, p.y + 31);
        c.stroke();
      }
    }
    c.restore();
  }
  private hazard(h: Hazard, time: number) {
    const c = this.ctx,
      period = h.period || 3,
      phase = (time + (h.phase || 0)) % period,
      active = h.type === 'lava' || h.type === 'spikes' || phase > period * 0.6;
    c.save();
    c.globalAlpha = active ? 0.9 : 0.34;
    if (h.type === 'lava') {
      const g = c.createLinearGradient(0, h.y, 0, h.y + h.h);
      g.addColorStop(0, '#fff1a6');
      g.addColorStop(0.13, '#ff9639');
      g.addColorStop(1, '#76231c');
      c.fillStyle = g;
      c.fillRect(h.x, h.y, h.w, h.h);
      c.strokeStyle = '#ffe094';
      c.lineWidth = 3;
      c.beginPath();
      for (let x = 0; x <= h.w; x += 12) {
        const y = h.y + Math.sin(x * 0.04 + time * 3) * 4;
        if (x === 0) c.moveTo(h.x + x, y);
        else c.lineTo(h.x + x, y);
      }
      c.stroke();
    } else if (h.type === 'press') {
      c.fillStyle = active ? '#bc6653' : '#80735e';
      const height = active ? h.h : 28;
      c.fillRect(h.x, h.y, h.w, height);
      c.strokeStyle = active ? '#ffcf86' : '#f6e5ac';
      c.lineWidth = 3;
      c.strokeRect(h.x, h.y, h.w, height);
      c.setLineDash([8, 8]);
      c.strokeStyle = '#ffbe8077';
      c.strokeRect(h.x, h.y, h.w, h.h);
    } else if (h.type === 'arc') {
      c.strokeStyle = active ? '#c4f2ff' : '#8bd9ee';
      c.lineWidth = active ? 5 : 2;
      c.shadowColor = '#70dcff';
      c.shadowBlur = active ? 22 : 0;
      c.beginPath();
      for (let y = 0; y <= h.h; y += 16) {
        const x =
          h.x +
          h.w * 0.5 +
          (active ? Math.sin(y * 2 + time * 49) * h.w * 0.3 : 0);
        if (y === 0) c.moveTo(x, h.y);
        else c.lineTo(x, h.y + y);
      }
      c.stroke();
    } else if (h.type === 'spikes') {
      c.fillStyle = '#ad97b1';
      for (let x = h.x; x < h.x + h.w; x += 25) {
        c.beginPath();
        c.moveTo(x, h.y + h.h);
        c.lineTo(x + 12, h.y);
        c.lineTo(x + 25, h.y + h.h);
        c.fill();
      }
    } else {
      // Wind lane: streaks drift along the push so the lean is readable.
      const px = h.push?.x ?? 110,
        py = h.push?.y ?? 0,
        len = Math.max(1, Math.hypot(px, py)),
        ux = px / len,
        uy = py / len;
      c.globalAlpha = 0.28;
      c.strokeStyle = '#d8eeff';
      c.lineWidth = 2;
      c.beginPath();
      c.rect(h.x, h.y, h.w, h.h);
      c.clip();
      for (let i = 0; i < 18; i++) {
        const t = ((time * 260 + i * 173) % (h.w + h.h)) - 120,
          x0 = h.x + ((i * 97) % h.w) + ux * t,
          y0 = h.y + ((i * 61) % h.h) + uy * t;
        c.beginPath();
        c.moveTo(x0, y0);
        c.lineTo(x0 + ux * 70, y0 + uy * 70);
        c.stroke();
      }
    }
    c.restore();
  }
  private markers(s: RenderState) {
    const c = this.ctx;
    for (const gate of s.level.gravityGates || []) {
      if (!this.visible(gate.x, gate.y, gate.w, gate.h)) continue;
      c.save();
      const g = c.createLinearGradient(gate.x, 0, gate.x + gate.w, 0);
      g.addColorStop(0, '#c387ff44');
      g.addColorStop(0.5, '#663d9910');
      g.addColorStop(1, '#c387ff44');
      c.fillStyle = g;
      c.fillRect(gate.x, gate.y, gate.w, gate.h);
      c.strokeStyle = '#d4a4ff';
      c.lineWidth = 3;
      c.setLineDash([12, 10]);
      c.strokeRect(gate.x, gate.y, gate.w, gate.h);
      c.restore();
    }
    s.level.checkpoints.forEach((p, i) => {
      if (!this.visible(p.x - 30, p.y - 110, 60, 120)) return;
      const active = i <= s.checkpointIndex;
      c.save();
      c.strokeStyle = active ? '#97ffe1' : '#eed7ac';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(p.x, p.y);
      c.lineTo(p.x, p.y - 100);
      c.stroke();
      c.shadowBlur = active ? 18 : 5;
      c.shadowColor = c.strokeStyle;
      c.fillStyle = c.strokeStyle;
      c.beginPath();
      c.moveTo(p.x, p.y - 102);
      c.lineTo(p.x + 28, p.y - 87);
      c.lineTo(p.x, p.y - 72);
      c.fill();
      c.restore();
    });
    for (const b of s.level.barriers || []) {
      if (s.broken?.has(b.id) || !this.visible(b.x, b.y, b.w, b.h)) continue;
      // Signal cage: hexagonal bars that only a reflected shot can open.
      c.save();
      c.strokeStyle = '#8ce6ef';
      c.lineWidth = 3;
      c.shadowColor = '#76e9ff';
      c.shadowBlur = 14;
      c.globalAlpha = 0.75 + Math.sin(s.time * 4) * 0.1;
      const cx = b.x + b.w * 0.5,
        cy = b.y + b.h * 0.5,
        rx = b.w * 0.5,
        ry = b.h * 0.5;
      c.beginPath();
      for (let n = 0; n < 6; n++) {
        const a = Math.PI / 6 + (n * Math.PI) / 3;
        const x = cx + Math.cos(a) * rx,
          y = cy + Math.sin(a) * ry;
        if (n === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.closePath();
      c.stroke();
      c.globalAlpha = 0.12;
      c.fillStyle = '#b6fbff';
      c.fill();
      c.restore();
    }
    for (const p of s.level.collectibles) {
      if (s.signals.has(p.id) || !this.visible(p.x - 30, p.y - 30, 60, 60))
        continue;
      const y = p.y + Math.sin(s.time * 3 + p.x) * 6;
      c.save();
      c.translate(p.x, y);
      c.rotate(Math.PI / 4);
      c.shadowColor = '#ffdc79';
      c.shadowBlur = 20;
      c.fillStyle = '#fff0b2';
      c.fillRect(-10, -10, 20, 20);
      c.strokeStyle = '#ffbd5b';
      c.lineWidth = 3;
      c.strokeRect(-15, -15, 30, 30);
      c.restore();
    }
  }
  private creature(e: EnemyRuntime | BossRuntime, time: number, boss: boolean) {
    const c = this.ctx,
      img = this.image(e.type);
    if (!img) return;
    const visible = 'visible' in e ? e.visible : true;
    if (!visible) return;
    const facing =
      e.type === 'nightRook'
        ? -e.facing
        : ['eclipseRegent', 'gravityCantor', 'thornChoir'].includes(e.type)
          ? 1
          : -e.facing;
    // Preserve the canonical aspect ratio. Boss height may exceed its compact combat box.
    const maxH = boss
      ? Math.max(
          e.h,
          e.type === 'nightRook'
            ? 400
            : e.type === 'smelterLeviathan'
              ? 380
              : 460,
        )
      : Math.max(e.h, FLYING.has(e.type) ? 105 : 100);
    const maxW = boss ? Math.max(e.w, 330) : Math.max(e.w, 125),
      fit = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight),
      w = img.naturalWidth * fit,
      h = img.naturalHeight * fit;
    c.save();
    c.translate(e.x, e.y + e.bob);
    c.scale(facing * e.scaleX, e.scaleY);
    if (e.invulnerable > 0) c.globalAlpha = 0.62 + Math.sin(time * 65) * 0.25;
    if (e.glow > 0) {
      c.shadowColor = e.open > 0 ? '#ffe7a4' : '#db8dff';
      c.shadowBlur = 12 + e.glow * 25;
    }
    c.drawImage(img, -w / 2, -h, w, h);
    c.restore();
    if (e.state === 'telegraph') {
      c.save();
      c.strokeStyle = '#ffce81';
      c.lineWidth = 2;
      c.globalAlpha = 0.65 + 0.25 * Math.sin(time * 20);
      c.beginPath();
      c.ellipse(e.x, e.y + 4, Math.max(35, e.w * 0.48), 9, 0, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = '#ffdf9a';
      c.font = 'bold 24px sans-serif';
      c.textAlign = 'center';
      c.fillText('!', e.x, e.y - h - 12);
      c.restore();
    }
    if (!boss && e.hp < e.maxHp) {
      c.fillStyle = '#090b19b3';
      c.fillRect(e.x - 28, e.y - h - 10, 56, 4);
      c.fillStyle = '#dcbdff';
      c.fillRect(e.x - 28, e.y - h - 10, 56 * clamp(e.hp / e.maxHp), 4);
    }
  }
  private projectiles(s: RenderState) {
    const c = this.ctx;
    for (const b of s.combat.projectiles) {
      if (!this.visible(b.x - 40, b.y - 40, 80, 80)) continue;
      c.save();
      c.globalAlpha = b.active ? 1 : 0.35;
      c.strokeStyle = b.color;
      c.fillStyle = b.color;
      c.shadowColor = b.color;
      c.shadowBlur = b.active ? 17 : 5;
      c.lineWidth = b.type === 'ring' ? 4 : 2;
      if (b.type === 'lance') {
        c.translate(b.x, b.y);
        c.rotate(Math.atan2(b.vy, b.vx));
        c.beginPath();
        c.moveTo(22, 0);
        c.lineTo(-16, -6);
        c.lineTo(-10, 0);
        c.lineTo(-16, 6);
        c.closePath();
        c.fill();
      } else {
        c.beginPath();
        c.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        if (b.type === 'ring') c.stroke();
        else c.fill();
        c.shadowBlur = 0;
        c.fillStyle = '#fff3df';
        c.beginPath();
        c.arc(
          b.x - b.radius * 0.2,
          b.y - b.radius * 0.2,
          b.radius * 0.35,
          0,
          Math.PI * 2,
        );
        c.fill();
      }
      c.restore();
    }
  }
  private player(s: RenderState) {
    const c = this.ctx,
      p = s.player,
      size = HOPPER_RENDER_SIZE;
    if (!p.grounded && p.vy * p.gravitySign > 60 && !p.reducedMotion) {
      const candidates = s.platforms
        .filter(
          (q) =>
            !q.ceiling &&
            p.x > q.x &&
            p.x < q.x + q.w &&
            q.y > p.y &&
            q.y < p.y + 650,
        )
        .sort((a, b) => a.y - b.y);
      if (candidates.length) {
        c.save();
        c.globalAlpha = 0.26;
        c.strokeStyle = '#d6ffed';
        c.lineWidth = 2;
        c.setLineDash([6, 6]);
        c.beginPath();
        c.ellipse(p.x, candidates[0].y - 3, 40, 7, 0, 0, Math.PI * 2);
        c.stroke();
        c.restore();
      }
    }
    if (p.kickT > 0) {
      const progress = 1 - clamp(p.kickT / 0.5);
      c.save();
      c.translate(p.x, p.y - 75 * p.gravitySign);
      c.scale(p.facing, p.gravitySign);
      c.strokeStyle = '#ffe1a6';
      c.shadowColor = '#ffbb67';
      c.shadowBlur = 18;
      c.lineWidth = 8;
      c.globalAlpha = Math.sin(progress * Math.PI) * 0.65;
      c.beginPath();
      c.arc(
        0,
        0,
        128,
        Math.PI * 0.35 + progress * 4,
        Math.PI * 1.35 + progress * 4,
      );
      c.stroke();
      c.restore();
    }
    if (this.image('hopperAtlas'))
      drawHopper(c, this.images, p, p.x, p.y, size, size, s.time);
    if (p.shooting) {
      const eye = hopperEye(p, p.x, p.y, size, size, s.time);
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = '#fff1b8';
      c.shadowColor = '#ff6157';
      c.shadowBlur = 25;
      c.beginPath();
      c.arc(eye.x, eye.y, 4 + Math.sin(s.time * 75) * 1.2, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  }
  private effects(s: RenderState) {
    const c = this.ctx;
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (const beam of s.lasers) {
      const alpha = clamp(beam.life / beam.maxLife);
      c.globalAlpha = alpha;
      c.strokeStyle = '#ff4e58';
      c.shadowColor = '#ff334c';
      c.shadowBlur = 18;
      c.lineWidth = 8;
      c.beginPath();
      c.moveTo(beam.x, beam.y);
      c.lineTo(beam.x2, beam.y2);
      c.stroke();
      c.shadowBlur = 0;
      c.strokeStyle = '#fff6cf';
      c.lineWidth = 2.5;
      c.stroke();
    }
    c.shadowBlur = 0;
    for (const p of s.particles) {
      c.globalAlpha = clamp(p.life / p.maxLife);
      c.fillStyle = p.color;
      c.beginPath();
      c.arc(
        p.x,
        p.y,
        Math.max(0.1, p.size * (0.4 + (0.6 * p.life) / p.maxLife)),
        0,
        Math.PI * 2,
      );
      c.fill();
    }
    c.restore();
    const atlas = this.image('explosionAtlas');
    for (const e of s.explosions) {
      const progress = clamp(1 - e.life / e.maxLife);
      c.save();
      c.globalAlpha = Math.min(1, (e.life / e.maxLife) * 3);
      if (atlas) {
        const frame = Math.min(7, Math.floor(progress * 8));
        c.drawImage(
          atlas,
          (frame % 4) * 512,
          Math.floor(frame / 4) * 512,
          512,
          512,
          e.x - e.size / 2,
          e.y - e.size / 2,
          e.size,
          e.size,
        );
      } else {
        c.fillStyle = '#ffc475';
        c.beginPath();
        c.arc(e.x, e.y, e.size * 0.4 * progress, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    }
  }
  dispose(): void {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
