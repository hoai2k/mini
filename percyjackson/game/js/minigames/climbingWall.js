// Camp minigame: the climbing wall. Two walls of rock grind together and pour
// lava; reach the top before the time runs out. Push up to climb, left and
// right to change handholds, and hold A (Space / left click) when the wall
// starts to shake or you will slip. Lava streams glow before they pour — get
// out of the column. Drawn on a canvas overlay in blocky pixel art; the game
// is paused underneath while it runs.
import { HEROES } from '../heroes/index.js';

const HEIGHT = 60;           // metres to the top
// Tuned with a replica simulation (comfort audit): a first-timer reacting in
// about half a second reaches the top two times in three, a practised
// climber nine in ten. It was about one in four before: near the top the
// lava came every 0.55 s and nearly every lane was pouring.
const TIME = 55;
const LANES = 5;

export class ClimbingWall {
  constructor(game, player) {
    this.game = game; this.p = player;
    this.lane = 2; this.x = 2; this.y = 0; this.t = TIME;
    this.lava = [];          // { lane, warn, pour, top }
    this.lavaT = 1.6;
    this.shakeT = 6; this.shaking = 0; this.slipT = 0;
    this.stun = 0; this.done = false; this.falls = 0;
    this.moveCd = 0;
  }
  start() {
    const g = this.game;
    g.paused = true; g.minigame = this;
    this.el = document.createElement('div');
    this.el.className = 'minigame-overlay';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-label', 'Climbing wall minigame');
    Object.assign(this.el.style, { position: 'fixed', inset: '0', zIndex: 60, background: 'rgba(8,10,20,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' });
    this.cv = document.createElement('canvas');
    this.cv.width = 480; this.cv.height = 640;
    Object.assign(this.cv.style, { height: 'min(92vh, 900px)', imageRendering: 'pixelated', border: '3px solid #c9963a', borderRadius: '8px', boxShadow: '0 0 40px rgba(255,120,40,.35)' });
    this.el.appendChild(this.cv);
    document.body.appendChild(this.el);
    this.ctx = this.cv.getContext('2d');
    this.col = HEROES[this.p.hero]?.color ?? '#f28c28';
    this.last = performance.now();
    this.prevGrip = true;   // ignore a grip button already held
    const loop = () => { if (this.done) return; this.frame(); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
    g.audio?.ui?.('open');
  }
  input() {
    const inp = this.game.input.get(this.p.device);
    return { x: inp.move.x, y: inp.move.y, grip: !!(inp.held.attack || inp.held.dodge || inp.held.jump), quit: inp.pressed.pause };
  }
  frame() {
    const now = performance.now(); const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    const k = this.input();
    if (k.quit) { this.finish(false, true); return; }
    this.t -= dt; this.moveCd -= dt; this.stun = Math.max(0, this.stun - dt);
    // shaking wall: hold on or slip
    this.shakeT -= dt;
    if (this.shakeT <= 0 && !this.shaking) { this.shaking = 1.6; this.shakeT = 5 + Math.random() * 4; this.game.audio?.impact?.(0.5); }
    if (this.shaking > 0) {
      this.shaking -= dt;
      if (!k.grip && this.shaking < 1.2) { this.slipT += dt; if (this.slipT > 0.25) { this.fall(4, 'You slipped! Hold on when the wall shakes.'); this.slipT = 0; } }
      if (this.shaking <= 0) this.shaking = 0;
    } else this.slipT = 0;
    // climbing (not while gripping through a shake)
    if (this.stun <= 0 && !(this.shaking > 0 && k.grip)) {
      if (k.y > 0.4) this.y = Math.min(HEIGHT, this.y + dt * 3.2 * k.y);
      if (Math.abs(k.x) > 0.5 && this.moveCd <= 0) { this.lane = Math.max(0, Math.min(LANES - 1, this.lane + Math.sign(k.x))); this.moveCd = 0.22; }
    }
    this.x += (this.lane - this.x) * Math.min(1, dt * 14);
    // lava: warn, then pour down a column for a while
    this.lavaT -= dt;
    if (this.lavaT <= 0) {
      const lane = Math.random() < 0.42 ? this.lane : Math.floor(Math.random() * LANES);
      this.lava.push({ lane, warn: 0.9, pour: 1.3 + Math.random() * 0.9 });
      this.lavaT = Math.max(0.7, 1.6 - this.y / HEIGHT);
    }
    for (const l of this.lava) {
      if (l.warn > 0) l.warn -= dt; else l.pour -= dt;
      if (l.warn <= 0 && l.pour > 0 && l.lane === this.lane && this.stun <= 0) this.fall(4, 'Lava! Move to another handhold.');
    }
    this.lava = this.lava.filter((l) => l.pour > 0);
    this.draw();
    if (this.y >= HEIGHT) this.finish(true);
    else if (this.t <= 0) this.finish(false);
  }
  fall(m, msg) {
    this.y = Math.max(0, this.y - m); this.stun = 0.8; this.falls++;
    this.msg = msg; this.msgT = 1.6;
    this.game.audio?.hurt?.();
  }
  draw() {
    const c = this.ctx, W = 480, H = 640, LW = W / LANES;
    const shake = this.shaking > 0 ? (Math.random() - 0.5) * 6 : 0;
    c.save(); c.translate(shake, 0);
    // rock wall that scrolls with the climb
    const off = (this.y * 40) % 32;
    for (let yy = -32; yy < H + 32; yy += 32) for (let xx = 0; xx < W; xx += 32) {
      const n = Math.abs(Math.sin((xx * 7 + Math.floor((yy - off + this.y * 40) / 32) * 13) * 0.37));
      c.fillStyle = n > 0.66 ? '#5a5560' : n > 0.33 ? '#4a4652' : '#3e3b46';
      c.fillRect(xx, yy + off, 32, 32);
      c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(xx, yy + off + 30, 32, 2); c.fillRect(xx + 30, yy + off, 2, 32);
      if (n > 0.85) { c.fillStyle = '#8a7a5a'; c.fillRect(xx + 10, yy + off + 12, 10, 6); }   // handhold
    }
    // the top ledge
    const topY = H * 0.62 - (HEIGHT - this.y) * 40;
    if (topY > -40) { c.fillStyle = '#2e8b6e'; c.fillRect(0, topY - 40, W, 40); c.fillStyle = '#f4ead5'; c.font = 'bold 20px Cinzel, serif'; c.textAlign = 'center'; c.fillText('THE TOP', W / 2, topY - 14); }
    // lava
    for (const l of this.lava) {
      const x = l.lane * LW;
      if (l.warn > 0) { c.fillStyle = `rgba(255,120,40,${0.18 + 0.2 * Math.sin(performance.now() / 60)})`; c.fillRect(x + 6, 0, LW - 12, H); }
      else { const g = c.createLinearGradient(x, 0, x + LW, 0); g.addColorStop(0, '#ff5a1a'); g.addColorStop(0.5, '#ffd84a'); g.addColorStop(1, '#ff5a1a'); c.fillStyle = g; c.fillRect(x + 10, 0, LW - 20, H); }
    }
    // climber: a little blocky hero
    const px = this.x * LW + LW / 2, py = H * 0.62;
    const flick = this.stun > 0 && Math.floor(performance.now() / 80) % 2;
    if (!flick) {
      c.fillStyle = '#f0c8a8'; c.fillRect(px - 10, py - 40, 20, 20);          // head
      c.fillStyle = '#1a1a1a'; c.fillRect(px - 11, py - 42, 22, 7);           // hair
      c.fillStyle = this.col; c.fillRect(px - 12, py - 20, 24, 24);           // shirt in hero colour
      c.fillStyle = '#3a5a9a'; c.fillRect(px - 10, py + 4, 8, 18); c.fillRect(px + 2, py + 4, 8, 18);
      const reach = Math.sin(this.y * 3) * 6;
      c.fillStyle = '#f0c8a8'; c.fillRect(px - 20, py - 26 - reach, 7, 16); c.fillRect(px + 13, py - 26 + reach, 7, 16);
    }
    c.restore();
    // HUD
    c.fillStyle = 'rgba(16,35,61,.85)'; c.fillRect(0, 0, W, 44);
    c.fillStyle = '#f4ead5'; c.font = 'bold 18px Cinzel, serif'; c.textAlign = 'left';
    c.fillText(`${Math.floor(this.y)} / ${HEIGHT} m`, 12, 28);
    c.textAlign = 'right'; c.fillText(`${Math.max(0, Math.ceil(this.t))} s`, W - 12, 28);
    c.textAlign = 'center';
    if (this.shaking > 0) { c.fillStyle = '#ffd84a'; c.font = 'bold 26px Cinzel, serif'; c.fillText('HOLD ON! (A / Space)', W / 2, 90); }
    if (this.msgT > 0) { this.msgT -= 1 / 60; c.fillStyle = '#ff9a6a'; c.font = 'bold 18px Cinzel, serif'; c.fillText(this.msg, W / 2, 124); }
    c.fillStyle = 'rgba(16,35,61,.85)'; c.fillRect(0, H - 46, W, 46);
    c.fillStyle = 'rgba(244,234,213,.9)'; c.font = '14px sans-serif';
    c.fillText('Stick / WASD: climb and change handholds', W / 2, H - 27);
    c.fillText('A / Space: hold on · Menu / Esc: give up', W / 2, H - 9);
  }
  finish(won, quit = false) {
    if (this.done) return;
    this.done = true;
    cancelAnimationFrame(this.raf);
    this.el.remove();
    const g = this.game, d = g.save.data;
    g.paused = false; g.minigame = null; g.audio?.setOverride?.(null); g.last = performance.now();
    if (quit) { g.toast?.('You let go of the wall.'); return; }
    const time = TIME - this.t;
    if (won) {
      const best = (d.minigames ??= {}).climb;
      const record = best == null || time < best;
      if (record) d.minigames.climb = Math.round(time * 10) / 10;
      const drachmas = Math.max(5, Math.round(40 - time / 2));
      g.addCoins(drachmas); g.save.write();
      g.toast?.(`You reached the top in ${time.toFixed(1)} s${record ? ' — camp record!' : ''} · +${drachmas} drachmas`, 'big');
      g.audio?.levelUp?.();
    } else {
      g.toast?.(`Out of time at ${Math.floor(this.y)} m. The lava wins this round.`, 'big');
    }
  }
}
