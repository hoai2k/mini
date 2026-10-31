// The boss of the pool floor: the giant amoeba Chaos (C. carolinensis type),
// many nuclei, a real eater of smaller amoebae and ciliates
// (../../design/bosses.md). It lies between the start and the green
// Paramecium bursaria (the forward landmark).
//
// It is the same soft body as the player (shared/techniques/amoeba-softbody.js)
// at about 1.9x the player's width (~0.65 mm across here; real Chaos reaches
// 1-5 mm: a labelled departure so it fits the field), slower, with a dozen
// nuclei and denser cytoplasm.
//
// Fight (shared/predation.js createFight: lots of interest, two attacks):
//   dormant: rounded and polypodial at its post until a player comes near
//     after the calm opening;
//   the tell: it raises and spreads its pseudopods (every arm out at once);
//   the cup: two arms reach out round you, first to your flanks, then
//     curling behind you; if they wrap you (a food cup) you are engulfed;
//   the lunge (every third attack): the whole cell flows at you behind one
//     broad arm.
//   Push into it and pinch its arms off with two of your own, like a pincer:
//   X when your membrane is on both sides of an arm's neck cuts it (the
//   piece rounds up and dies) and staggers it. Cut the encircling arms
//   before the cup closes, then slip round its edge. Worn down (the brass
//   resolve gauge), it flows away and rests.
import { Body, N } from '../shared/techniques/amoeba-softbody.js';
import { Cytoplasm } from './cytoplasm.js';
import { createFight } from '../shared/predation.js';

const TAU = Math.PI * 2;
export const CHAOS_R = 320;   // µm, radius of the rounded cell
const WAKE = 950;             // a player's centre this close wakes it
const ARM_W = 7;              // nodes either side of an arm's tip: its neck

export class Chaos {
  constructor(rand, view, x, y) {
    this.rand = rand;
    this.post = { x, y };
    const b = (this.body = new Body(rand, x, y));
    for (let i = 0; i < N; i++) { const a = (i / N) * TAU; b.x[i] = x + CHAOS_R * Math.cos(a); b.y[i] = y + CHAOS_R * Math.sin(a); }
    b.A0 = b.Abase = Math.PI * CHAOS_R * CHAOS_R;
    b.opts.speed = 0.75;
    b.grid.build(b.x, b.y, N);
    b.centroid();
    this.cyto = new Cytoplasm(rand, b, 2600);
    // many nuclei, scattered through the endoplasm
    this.nuclei = Array.from({ length: 9 }, (_, k) => {
      const a = k * 2.4 + 0.5, r = (0.18 + 0.32 * ((k * 0.37) % 1)) * CHAOS_R;
      return { ox: Math.cos(a) * r, oy: Math.sin(a) * r, x: x, y: y, r: 16 + 4 * ((k * 0.61) % 1) };
    });
    this.cyto.nucleus.r = 18;
    this.cyto.extraNuclei = this.nuclei;
    this.layer = view.addCell(b, this.cyto);
    this.fight = createFight({ windup: 1.6, strike: 6.5, recoverT: 2.6, repelT: 2.2, retreatT: 18, facingRate: 0, blockHit: 0.1, biteHit: 0.2, regain: 0.01 });
    this.on = true;
    this.reset();
  }

  reset() {
    Object.assign(this, { state: 'dormant', t: 0, fs: 'stalk', ft: 0, attack: 0, target: null, cuts: 0, leaveT: 0 });
    this.fight.reset();
  }

  get awake() { return this.state === 'fight' || this.state === 'leaving'; }
  get attacking() { return this.state === 'fight' && (this.fs === 'windup' || this.fs === 'strike'); }
  get interest() { return this.fight.interest; }

  /**
   * players: [{ cell, x, y, req, active }] (centroids, µm). Returns events [{ e, p }].
   * calm: still in the calm opening. col: colliders for the body (obstacles and the players' membranes).
   */
  update(dt, adt, players, col, { calm = false } = {}) {
    const ev = [];
    const b = this.body;
    this.t += dt;
    const input = { pods: [{ m: 0, dx: 1, dy: 0 }, { m: 0, dx: 1, dy: 0 }], push: 0, spread: 0, body: null };
    let tgt = null, td = Infinity;
    for (const p of players) { if (!p.active) continue; const d = Math.hypot(p.x - b.cx, p.y - b.cy); if (d < td) { td = d; tgt = p; } }
    this.target = tgt;
    b.opts.boost = 1;
    b.opts.speed = 0.75;
    if (this.state === 'dormant') {
      if (!calm && tgt && td < WAKE) { this.state = 'fight'; this.fight.reset(); ev.push({ e: 'wake', p: tgt }); }
    } else if (this.state === 'fight') {
      const gap = tgt ? td - b.req - tgt.req : Infinity;
      const f = this.fight.update(dt, { near: gap < 900, inReach: gap < 140, facing: true, blocking: false });
      if (f.state !== this.fs) {
        if (f.state === 'windup') { this.attack++; ev.push({ e: this.attack % 3 === 0 ? 'windupLunge' : 'windupCup', p: tgt }); this.aim = tgt ? { x: tgt.x, y: tgt.y } : null; }
        if (f.state === 'strike') ev.push({ e: 'strike', p: tgt });
      }
      this.fs = f.state; this.ft = f.t;
      if (tgt) {
        const dx = tgt.x - b.cx, dy = tgt.y - b.cy, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
        if (f.state === 'stalk') input.body = { m: gap > 60 ? 0.7 : 0.15, dx: ux, dy: uy };
        else if (f.state === 'windup') {
          // the tell: every arm raised and spread at once
          for (let k = 2; k < b.pods.length; k++) { const pod = b.pods[k]; if (pod.life < 3) { pod.life = 3.5; pod.ret = 0; } pod.base = 1; }
          b.spread = 0;
        } else if (f.state === 'strike') {
          if (this.attack % 3 === 0) {
            // the lunge: one broad arm, the cell flowing after it
            input.pods[0] = { m: 1, dx: ux, dy: uy };
            input.body = { m: 1, dx: ux, dy: uy };
            b.opts.boost = 1.8;
          } else {
            // the cup: two arms to your flanks, then curling round behind you
            const k = f.t, side = tgt.req + 70;
            for (const [n, s] of [[0, 1], [1, -1]]) {
              const tx = k < 0.4 ? tgt.x - ux * side * 0.6 - uy * s * side * 2.0 : tgt.x + ux * side * 1.4 - uy * s * side * 0.3;
              const ty = k < 0.4 ? tgt.y - uy * side * 0.6 + ux * s * side * 2.0 : tgt.y + uy * side * 1.4 + ux * s * side * 0.3;
              const ax = tx - b.cx, ay = ty - b.cy, al = Math.hypot(ax, ay) || 1;
              input.pods[n] = { m: 1, dx: ax / al, dy: ay / al };
            }
            input.body = { m: 0.35, dx: ux, dy: uy };
            b.opts.boost = 2.2; b.opts.speed = 2.4;
            // closed round you: engulfed
            const cup = b.cupAround(tgt.x, tgt.y, tgt.req + 120);
            this.wrap = cup ? cup.wrap : 0;
            if (cup && cup.wrap > 3.0) { ev.push({ e: 'engulf', p: tgt }); this.fight.update(10, {}); }
          }
        } else if (f.state === 'repelled') input.body = { m: 0.5, dx: -ux, dy: -uy };
      }
      if (f.hit && tgt && this.attack % 3 === 0) {
        // the lunge landed: check whether its arm wraps you
        const cup = b.cupAround(tgt.x, tgt.y, tgt.req + 120);
        if (cup && cup.wrap > 3.3) ev.push({ e: 'engulf', p: tgt });
      }
      if (f.retreated || this.fight.state === 'retreat') { this.state = 'leaving'; this.leaveT = 0; ev.push({ e: 'retreat', p: tgt }); }
    } else if (this.state === 'leaving') {
      // it flows away from you and rests
      this.leaveT += dt;
      const ax = this.post.x - b.cx + 300, ay = this.post.y + 1600 - b.cy, l = Math.hypot(ax, ay) || 1;
      if (this.leaveT < 22) input.body = { m: 0.8, dx: ax / l, dy: ay / l };
      else { this.state = 'dormant'; this.fight.reset(); this.restUntil = this.t + 60; }
    }
    if (this.state === 'dormant' && this.restUntil && this.t < this.restUntil) { /* resting after a defeat */ }
    b.step(adt, input, col);
    b.grid.build(b.x, b.y, N);
    b.untangle();
    this.cyto.update(adt, b, this.t);
    this.placeNuclei();
    return ev;
  }

  /** Dormant after a defeat: it will not wake for a while. */
  get resting() { return this.restUntil && this.t < this.restUntil; }

  placeNuclei() {
    const b = this.body, k = Math.sqrt(Math.abs(b.area) / (Math.PI * CHAOS_R * CHAOS_R));
    for (const n of this.nuclei) {
      // carried with the cell, kept inside it
      let x = b.cx + n.ox * k, y = b.cy + n.oy * k;
      const d = b.grid.sample(x, y);
      if (d < 25) { x = b.cx + (x - b.cx) * 0.6; y = b.cy + (y - b.cy) * 0.6; }
      n.x += (x - n.x) * 0.1; n.y += (y - n.y) * 0.1;
    }
  }

  /**
   * The pincer: the arm of this cell whose neck the player's membrane closes
   * on from both sides (within `reach` µm of each side). Returns { i, j } (the
   * neck's ring nodes) or null.
   */
  pincer(pb, reach = 70) {
    const b = this.body;
    let best = null;
    for (const pod of b.pods) {
      if (pod.s < 0.25 || pod.tip == null) continue;
      const i = (pod.tip - ARM_W + N) % N, j = (pod.tip + ARM_W) % N;
      const w = Math.hypot(b.x[i] - b.x[j], b.y[i] - b.y[j]);
      if (w > 240) continue; // too broad to pinch: that is its body, not an arm
      const di = pb.nearest(b.x[i], b.y[i]).d, dj = pb.nearest(b.x[j], b.y[j]).d;
      if (di < reach && dj < reach && (!best || di + dj < best.d)) best = { i, j, d: di + dj, w };
    }
    return best;
  }

  /** Cut an arm across nodes i, j: the piece without the most nuclei is lost. */
  cut(i, j) {
    const b = this.body;
    const lost = b.pinchAt(i, j, b.cx, b.cy);
    b.grid.build(b.x, b.y, N);
    this.cuts++;
    const gone = this.fight.bitten();
    return { lost, gone };
  }
}
