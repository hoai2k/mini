// Painted words in the world that a demigod reads: the letters on a sign or
// on the school bus first look like Greek, and settle into English once
// someone has had a good look (ui/greekTiming.js has the timings).
//
// A LiveSign owns a CanvasTexture and repaints it as the letters change.
// Each starts in Greek and settles when:
//   'look' (signs in the world, the default): a hero who is played (or, in a
//          cutscene, the camera) has been within `near` metres of it, with it
//          on screen, for `look` seconds;
//   'near' (the bus at the curb): a hero comes within `near` metres, so the
//          words are English a few seconds before the scene changes;
//   'manual' (cutscenes): the script calls read() (a couple of seconds before
//          the camera cuts away).
// Once settled it stays English until the level is rebuilt. With the Greek
// text setting off, or reduced motion, the English shows from the start.
// game.signs (LiveSigns) updates them every frame and drops them with the level.
import * as THREE from 'three/webgpu';
import { GREEK, greekPlan, greekAt, settledBy } from '../ui/greekTiming.js';
import { greekOn } from '../ui/greekText.js';

const tmp = new THREE.Vector3();

export class LiveSign {
  // paint(ctx, str, english, sign): draws the words; w, h: canvas size
  constructor(text, { w = 512, h = 128, paint, trigger = 'look', near = 9, look = 1.5, timing = GREEK.sign, pos = null, seed } = {}) {
    this.text = String(text); this.paint = paint; this.trigger = trigger; this.near = near; this.look = look;
    this.timing = timing; this.pos = pos ? pos.clone() : null;
    this.plan = greekPlan(this.text, timing, seed);
    this.greek = this.plan.map((L) => (L.at < 0 ? L.ch : L.greek)).join('');
    this.canvas = document.createElement('canvas'); this.canvas.width = w; this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas); this.texture.colorSpace = THREE.SRGBColorSpace; this.texture.anisotropy = 4;
    this.state = greekOn() ? 'greek' : 'english';
    this.t = 0; this.seen = 0; this.shown = null;
    this.draw(this.state === 'greek' ? this.greek : this.text);
  }
  draw(str) {
    if (str === this.shown) return;
    this.shown = str;
    this.paint(this.ctx, str, this.text, this);
    this.texture.needsUpdate = true;
  }
  // back to all Greek letters (a cutscene's bus starts unread, whatever happened before)
  reset() { this.state = greekOn() ? 'greek' : 'english'; this.t = 0; this.seen = 0; this.draw(this.state === 'greek' ? this.greek : this.text); }
  // settle into English now
  read() { if (this.state === 'greek') { this.state = 'settling'; this.t = 0; } }
  get english() { return this.state === 'english'; }
  update(dt) {
    if (this.state !== 'settling') return;
    this.t += dt;
    if (this.t >= settledBy(this.timing)) { this.state = 'english'; this.draw(this.text); return; }
    this.draw(greekAt(this.plan, this.t));
  }
  // a font size that fits both the Greek and the English (so the words don't jump as they settle)
  fit(ctx, font, maxW, size, lines = [this.text, this.greek]) {
    ctx.font = font(size);
    while (size > 10 && Math.max(...lines.flatMap((l) => l.split('\n')).map((l) => ctx.measureText(l).width)) > maxW) { size -= 2; ctx.font = font(size); }
    return size;
  }
}

// A board: background, a border and the words centred (signposts, shop signs).
export function boardPainter({ bg = '#6a4a2a', fg = '#f6e7c0', glow = false, border = '#c9963a' } = {}) {
  let size = 0;
  return (g, str, english, sign) => {
    const W = g.canvas.width, H = g.canvas.height;
    g.shadowBlur = 0;
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    if (border) { g.strokeStyle = border; g.lineWidth = 8; g.strokeRect(6, 6, W - 12, H - 12); }
    const lines = String(str).split('\n');
    const font = (sz) => `bold ${sz}px Georgia, 'Times New Roman', serif`;
    if (!size) size = sign.fit(g, font, W - 28, Math.floor((H - 28) / lines.length));
    g.font = font(size);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (glow) { g.shadowColor = fg; g.shadowBlur = 14; }
    g.fillStyle = fg;
    lines.forEach((l, i) => g.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * size * 1.05));
  };
}
// Black lettering on a clear background (the school bus).
export function letteringPainter({ fg = '#1a1a1e', font = (sz) => `bold ${sz}px Arial, Helvetica, sans-serif`, size: want = 36 } = {}) {
  let size = 0;
  return (g, str, english, sign) => {
    const W = g.canvas.width, H = g.canvas.height;
    g.clearRect(0, 0, W, H);
    if (!size) size = sign.fit(g, font, W - 16, want);
    g.font = font(size); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(str, W / 2, H / 2 + 2);
  };
}

// Every live sign in the current level.
export class LiveSigns {
  constructor(game) { this.game = game; this.list = []; }
  add(s) { if (s && !this.list.includes(s)) this.list.push(s); return s; }
  clear() { this.list = []; }
  update(dt) {
    const g = this.game;
    if (!this.list.length) return;
    const readers = g.cutscene ? null : g.players.filter((p) => !p.ai && !p.remote && !p.dead);
    const cam = g.rig.camera;
    for (const s of this.list) {
      if (s.state === 'greek' && s.pos && s.trigger !== 'manual') {
        let near = Infinity;
        if (readers) for (const p of readers) near = Math.min(near, Math.hypot(p.pos.x - s.pos.x, p.pos.z - s.pos.z));
        else near = cam.position.distanceTo(s.pos);
        if (s.trigger === 'near') { if (near <= s.near) s.read(); }
        else {
          const p = tmp.copy(s.pos).project(cam);
          const onScreen = p.z < 1 && Math.abs(p.x) < 0.95 && Math.abs(p.y) < 0.95;
          s.seen = near <= s.near && onScreen ? s.seen + dt : Math.max(0, s.seen - dt * 0.5);
          if (s.seen >= s.look) s.read();
        }
      }
      s.update(dt);
    }
  }
}
