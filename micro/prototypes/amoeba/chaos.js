// The boss of the pool floor: the giant amoeba Chaos (C. carolinensis type),
// many nuclei, a real eater of smaller amoebae and ciliates
// (../../design/bosses.md). It guards the way on: main.js puts it on its
// post just before the portal (the green Paramecium bursaria in the golden
// glow) when the director places the portal, out of everyone's view.
//
// It is the same soft body as the player (shared/techniques/amoeba-softbody.js)
// at about 1.9x the player's width (~0.65 mm across here; real Chaos reaches
// 1-5 mm: a labelled departure so it fits the field), slower, with a dozen
// nuclei and denser cytoplasm.
//
// Fight (shared/predation.js createFight for its rhythm; the owner, 2026-11-02:
// "the normal interaction would be just pushing and ensuring you don't get
// encircled ... he shouldn't eat you just by touching you, but rather only if
// he manages to encircle you entirely and then do his equivalent of pressing X"):
//   dormant: rounded and polypodial at its post. It is slow to notice: you
//     have to stay within CHAOS_WAKE µm of its edge for NOTICE s (or touch it)
//     before it stirs, so you can slip past it to the portal;
//   stalk: it flows at you and pushes. Cells never overlap: contact.js makes
//     every touch a push-pull struggle, the thicker and more actively
//     advancing membrane winning ground;
//   the tell: it raises and spreads its pseudopods (every arm out at once);
//   the encircle: two broad arms reach round your flanks and curl on behind
//     you; ring() measures how far its membrane rings you (the closing ring
//     main.js draws, with the danger stain and sound);
//   the X: only when the ring is shut all round you does it close it (CLOSE_T
//     s, its food cup sealing); still shut at the end, you are engulfed. Push
//     out through the gap before it shuts, or force it open with a thick
//     pseudopod or a surge (A), and it has to start again;
//   the lunge (every other attack): the whole cell shoves at you behind one
//     broad arm (a push, never a bite).
//   Rarely, X with your membrane round the neck of one of its arms pinches it
//   off (pincer, cut): it staggers; enough of them and it gives up and flows
//   away to rest (beaten). Not the way to play it, just possible.
//   The lure: it follows its target only up to LEASH µm from its post, then
//   gives up and flows back (return); it is slower than you.
//   The portal never waits on it: at the open portal, Y enters whatever Chaos
//   is doing; on the portal itself it blocks only with its body.
import { Body, N } from '../shared/techniques/amoeba-softbody.js';
import { Cytoplasm } from './cytoplasm.js';
import { hyp } from './util.js';
import { createFight } from '../shared/predation.js';
import { encircle } from './contact.js';

const TAU = Math.PI * 2;
export const CHAOS_R = 320;   // µm, radius of the rounded cell
const WAKE = 240;             // µm from its edge to yours: this close (for NOTICE s), it stirs
const NOTICE = 2.2;           // s it takes to notice you (touching it wakes it at once)
export const CHAOS_WAKE = WAKE;
// The encircle: its membrane within RING_REACH µm beyond your edge covers that
// bearing; shut when RING_SHUT of the bearings are covered and no gap is wider
// than RING_GAP rad; then CLOSE_T s of its X, engulfing if still RING_HOLD covered.
export const RING = { reach: 120, shut: 0.94, gap: 0.3, hold: 0.88, broken: 0.75, warn: 0.5, closeT: 1.2 };
export const CHAOS_LEASH = 720;
const SQUEEZE = 25;           // µm/s at which it squeezes a channel forced into it shut // it follows you no further than this from its post
const ARM_W = 7;              // nodes either side of an arm's tip: its neck

export class Chaos {
  constructor(rand, view, x, y) {
    this.rand = rand;
    this.post = { x, y };
    const b = (this.body = new Body(rand, x, y));
    for (let i = 0; i < N; i++) { const a = (i / N) * TAU; b.x[i] = x + CHAOS_R * Math.cos(a); b.y[i] = y + CHAOS_R * Math.sin(a); }
    b.A0 = b.Abase = Math.PI * CHAOS_R * CHAOS_R;
    b.opts.speed = 0.75;
    // Broad, blunt, finger-like arms (the reference sheet, boss-chaos.webp): its
    // idle arms and its two cup arms are about 1.7x the player's in width.
    b.opts.podScale = 1.7;
    b.opts.reach = 230; // long fingers: an arm runs out about 2/3 of its radius
    b.pods[0].rad = b.pods[1].rad = 50;
    b.grid.build(b.x, b.y, N);
    b.centroid();
    // Densely granular to the tips: more granules, most of them round refractile
    // ones (lipid droplets, food granules), so it reads granular olive, not clear.
    this.cyto = new Cytoplasm(rand, b, 4200);
    const cy = this.cyto;
    for (let i = 0; i < cy.n; i++) {
      const u = rand();
      if (u < 0.3) { cy.kind[i] = 3; cy.size[i] = rand.range(4, 8); }       // lipid / refractile spheres
      else if (u < 0.42) { cy.kind[i] = 4; cy.size[i] = rand.range(3, 6); }  // olive food granules
      else if (u < 0.5) { cy.kind[i] = 2; cy.size[i] = rand.range(3, 5); }   // crystals
    }
    // many nuclei, scattered through the endoplasm
    this.nuclei = Array.from({ length: 9 }, (_, k) => {
      const a = k * 2.4 + 0.5, r = (0.18 + 0.32 * ((k * 0.37) % 1)) * CHAOS_R;
      return { ox: Math.cos(a) * r, oy: Math.sin(a) * r, x: x, y: y, r: 16 + 4 * ((k * 0.61) % 1) };
    });
    this.cyto.nucleus.r = 18;
    this.cyto.extraNuclei = this.nuclei;
    this.layer = view.addCell(b, this.cyto);
    // its look in the body shader: olive endoplasm, a thin clear rim, coarser granularity
    view.setLook(this.layer, { olive: 1, rim: 0.7, grain: 1.6 });
    this.fight = createFight({ windup: 1.8, strike: 7, recoverT: 4.5, repelT: 2.2, retreatT: 18, facingRate: 0, blockHit: 0.1, biteHit: 0.2, regain: 0.01 });
    // how far contact has pushed each membrane node in (contact.js): a channel forced into it, squeezed shut again (squeeze)
    b.dent = new Float32Array(N);
    this.on = true;
    this.reset();
  }

  reset() {
    Object.assign(this, { state: 'dormant', t: 0, fs: 'stalk', ft: 0, attack: 0, target: null, cuts: 0, leaveT: 0, beaten: false, restUntil: 0, notice: 0, ring: null, ringOf: null, closing: null, warned: false });
    this.body.pushK = 0.85;
    if (this.body.dent) this.body.dent.fill(0);
    this.fight.reset();
  }

  /** Move the whole cell (membrane, granules, nuclei) by (dx, dy), e.g. onto its post. */
  translate(dx, dy) {
    const b = this.body, y = this.cyto;
    for (let i = 0; i < N; i++) { b.x[i] += dx; b.y[i] += dy; b.sx[i] += dx; b.sy[i] += dy; }
    b.centroid(); b.ux += dx; b.uy += dy;
    for (let i = 0; i < y.n; i++) { y.px[i] += dx; y.py[i] += dy; }
    y.nucleus.x += dx; y.nucleus.y += dy; y.cv.x += dx; y.cv.y += dy;
    for (const v of y.vacuoles) { v.x += dx; v.y += dy; }
    for (const n of this.nuclei) { n.x += dx; n.y += dy; }
    b.grid.build(b.x, b.y, N);
  }

  /** On guard at (x, y): moved there (unseen), dormant, fresh. rest: where it goes when beaten. */
  setPost(x, y, rest) {
    this.translate(x - this.body.cx, y - this.body.cy);
    this.post = { x, y };
    this.restAt = rest;
    this.reset();
  }

  get awake() { return this.state === 'fight' || this.state === 'leaving'; }
  get attacking() { return this.state === 'fight' && (this.fs === 'windup' || this.fs === 'strike' || !!this.closing); }
  /** Is it ringing (strike, cup) someone now? Then ring is { cover, gap, gapA, bins } round ringOf (a player). */
  get encircling() { return this.state === 'fight' && this.fs === 'strike' && this.attack % 2 !== 0; }
  get interest() { return this.fight.interest; }

  /**
   * players: [{ cell, body, x, y, req, active }] (centroids, µm). Returns events [{ e, p }]:
   * wake, windupCup, windupLunge, strike, ring (its arms are round half of you), closing (the
   * ring is shut: its X begins), broken (you got the ring open again), engulf, retreat, leash, home.
   * calm: it stays asleep (sated after a meal, or passive for tests). col: colliders for the body
   * (obstacles only: the players' membranes meet it in contact.js after every step).
   */
  update(dt, adt, players, col, { calm = false, granules = true } = {}) {
    const ev = [];
    const b = this.body;
    this.t += dt;
    const input = { pods: [{ m: 0, dx: 1, dy: 0 }, { m: 0, dx: 1, dy: 0 }], push: 0, spread: 0, body: null };
    let tgt = null, td = Infinity;
    for (const p of players) { if (!p.active) continue; const d = Math.hypot(p.x - b.cx, p.y - b.cy); if (d < td) { td = d; tgt = p; } }
    // the one it is ringing, as they are this step
    if (this.ringOf) this.ringOf = players.find((q) => q.cell === this.ringOf.cell) || this.ringOf;
    // a ring in progress stays on whoever it is round
    if (this.closing && this.ringOf && this.ringOf.active) { tgt = this.ringOf; td = Math.hypot(tgt.x - b.cx, tgt.y - b.cy); }
    this.target = tgt;
    const gap = tgt ? td - b.req - tgt.req : Infinity;
    b.opts.boost = 1;
    b.opts.speed = 0.75;
    b.opts.reach = 230;
    b.pushK = 0.85;
    const home = Math.hypot(b.cx - this.post.x, b.cy - this.post.y);
    if (!this.encircling && !this.closing) { this.ring = null; this.ringOf = null; this.warned = false; }
    if (this.state === 'dormant') {
      // slow to notice: you have to linger near it (or bump into it) before it stirs
      this.notice = !calm && !this.beaten && tgt && gap < WAKE ? this.notice + dt : Math.max(0, this.notice - dt * 0.5);
      if (!calm && !this.beaten && tgt && (this.notice > NOTICE || gap < 12)) { this.state = 'fight'; this.fight.reset(); this.notice = 0; ev.push({ e: 'wake', p: tgt }); }
      // pushed or carried off its post (not beaten): it goes back
      else if (!this.beaten && home > 140) this.state = 'return';
    } else if (this.state === 'return') {
      // back to its post; it ignores you on the way unless you are right on it
      const ax = this.post.x - b.cx, ay = this.post.y - b.cy, l = Math.hypot(ax, ay) || 1;
      input.body = { m: 0.8, dx: ax / l, dy: ay / l };
      if (home < 60) { this.state = 'dormant'; this.fight.reset(); ev.push({ e: 'home', p: tgt }); }
      else if (!calm && tgt && gap < 40 && home < CHAOS_LEASH * 0.5) { this.state = 'fight'; this.fight.reset(); }
    } else if (this.state === 'fight' && home > CHAOS_LEASH && !this.attacking) {
      // lured (or pushed) too far off its post: it gives up and flows back
      this.state = 'return'; this.fight.reset(); ev.push({ e: 'leash', p: tgt });
    } else if (this.state === 'fight') {
      // the X holds the fight still until the ring is either sealed or broken
      const f = this.closing ? { state: this.fs, t: this.ft } : this.fight.update(dt, { near: gap < 900, inReach: gap < 160 && home < CHAOS_LEASH * 0.5, facing: true, blocking: false });
      if (f.state !== this.fs) {
        if (f.state === 'windup') { this.attack++; ev.push({ e: this.attack % 2 === 0 ? 'windupLunge' : 'windupCup', p: tgt }); this.aim = tgt ? { x: tgt.x, y: tgt.y } : null; }
        if (f.state === 'strike') { ev.push({ e: 'strike', p: tgt }); this.ringOf = tgt; this.warned = false; this.side0 = null; }
      }
      this.fs = f.state; this.ft = f.t;
      if (tgt) {
        const dx = tgt.x - b.cx, dy = tgt.y - b.cy, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
        if (f.state === 'stalk' || f.state === 'recover') input.body = { m: f.state === 'stalk' ? (gap > 60 ? 0.7 : 0.45) : 0.2, dx: ux, dy: uy };
        else if (f.state === 'windup') {
          // the tell: every arm raised and spread at once
          for (let k = 2; k < b.pods.length; k++) { const pod = b.pods[k]; if (pod.life < 3) { pod.life = 3.5; pod.ret = 0; } pod.base = 1; }
          b.spread = 0;
        } else if (f.state === 'strike' && this.attack % 2 === 0) {
          // the lunge: one broad arm, the cell flowing after it: a hard shove, never a bite
          input.pods[0] = { m: 1, dx: ux, dy: uy };
          input.body = { m: 1, dx: ux, dy: uy };
          b.opts.boost = 1.8; b.pushK = 1.5;
        } else if (f.state === 'strike' && this.ringOf) {
          this.encircle(dt, input, this.ringOf, ev);
        } else if (f.state === 'repelled') input.body = { m: 0.5, dx: -ux, dy: -uy };
      }
      if (this.fight.state === 'retreat') { this.state = 'leaving'; this.beaten = true; this.leaveT = 0; this.closing = null; ev.push({ e: 'retreat', p: tgt }); }
    } else if (this.state === 'leaving') {
      // it flows away from you and rests
      this.leaveT += dt;
      const rest = this.restAt || { x: this.post.x + 300, y: this.post.y + 1600 };
      const ax = rest.x - b.cx, ay = rest.y - b.cy, l = Math.hypot(ax, ay) || 1;
      if (this.leaveT < 22) input.body = { m: 0.8, dx: ax / l, dy: ay / l };
      else { this.state = 'dormant'; this.fight.reset(); }
    }
    if (this.state !== 'fight') this.closing = null;
    // asleep and nobody near: it does not move (and costs nothing)
    if (this.state === 'dormant' && gap > WAKE + 300) { this.placeNuclei(); return ev; }
    b.step(adt, input, col);
    this.squeeze(adt);
    b.grid.build(b.x, b.y, N);
    b.untangle();
    // the granules once per frame (main.js passes granules on its last catch-up step)
    this.gAcc = (this.gAcc || 0) + adt;
    if (granules) { this.cyto.update(Math.min(this.gAcc, 4 / 60), b, this.t); this.gAcc = 0; }
    this.placeNuclei();
    return ev;
  }

  /**
   * The encircle (strike, every attack but the lunge): two broad arms run round
   * player p's flanks and curl on behind them, hugging their membrane, while
   * the body leans in. ring() is measured every step; once it is shut all
   * round, the X (closing): both arms drive for the last gap and, if after
   * CLOSE_T s the ring still holds, 'engulf'. Opened again first: 'broken'.
   */
  encircle(dt, input, p, ev) {
    const b = this.body;
    const R = p.req + 95;
    const ring = (this.ring = this.ringAround(p.body));
    // the bearing it comes from (fixed when the strike starts), round which its arms open out
    const dx = b.cx - p.x, dy = b.cy - p.y;
    if (this.side0 == null) {
      // the arms start from its membrane nearest your two flanks
      this.side0 = Math.atan2(dy, dx);
      this.armTip = [1, -1].map((s) => b.nearest(p.x + Math.cos(this.side0 + s * 1.1) * R, p.y + Math.sin(this.side0 + s * 1.1) * R).i);
      this.armDir = [null, null];
    }
    const k = Math.min(1, this.ft * 7 / 4.2); // the strike's progress, the arms fully round after ~4.2 s
    for (const [n, s] of [[0, 1], [1, -1]]) {
      const want = this.side0 + s * (1.1 + 2.3 * k); // from beside you round to behind you
      const pod = b.pods[n];
      const tip = pod.active ? pod.tip : this.armTip[n];
      // crawling round you: along your membrane (the tangent, its way round), held about R from your centre
      const ex = b.x[tip] - p.x, ey = b.y[tip] - p.y, r = Math.hypot(ex, ey) || 1;
      const at = Math.atan2(ey, ex);
      const go = this.closing ? 1 : Math.atan2(Math.sin(want - at), Math.cos(want - at)) * s; // how far it still has to go round
      // aim at a point a little further round you (a chord, so it rides over your pseudopods, not into them)
      const lead = go > 0.05 ? s * Math.min(0.7, go + 0.25) : s * 0.1;
      const la = at + lead, rr = Math.max(R, Math.min(r, R + 60));
      let ax = p.x + Math.cos(la) * rr - b.x[tip], ay = p.y + Math.sin(la) * rr - b.y[tip];
      const al = Math.hypot(ax, ay) || 1;
      ax /= al; ay /= al;
      // steadied, so the tip does not flick between nodes
      const d0 = this.armDir[n];
      if (d0) { const kk = Math.min(1, dt * 5); ax = d0.x + (ax - d0.x) * kk; ay = d0.y + (ay - d0.y) * kk; const m = Math.hypot(ax, ay) || 1; ax /= m; ay /= m; }
      this.armDir[n] = { x: ax, y: ay };
      input.pods[n] = { m: 1, dx: ax, dy: ay, tip: this.armTip[n] };
    }
    const l = Math.hypot(dx, dy) || 1;
    input.body = { m: 0.12, dx: -dx / l, dy: -dy / l };
    b.opts.boost = 2.2; b.opts.speed = 2.4; b.opts.reach = 600; b.pushK = 0.95;
    if (!this.warned && ring.cover >= RING.warn) { this.warned = true; ev.push({ e: 'ring', p }); }
    if (!this.closing) {
      if (ring.cover >= RING.shut && ring.gap <= RING.gap) { this.closing = { t: 0 }; ev.push({ e: 'closing', p }); }
    } else {
      this.closing.t += dt;
      if (ring.cover < RING.broken) { this.closing = null; ev.push({ e: 'broken', p }); }
      else if (this.closing.t >= RING.closeT) {
        this.closing = null;
        if (ring.cover >= RING.hold) { ev.push({ e: 'engulf', p }); this.fight.update(10, {}); }
        else ev.push({ e: 'broken', p });
      }
    }
  }

  /** How far its membrane rings body pb now: { cover, gap, gapA, bins, n } (contact.js encircle). */
  ringAround(pb) {
    this._ring = encircle(pb, this.body, RING.reach, this._ring);
    return this._ring;
  }

  /**
   * It squeezes a channel a pseudopod has forced into it closed again: each
   * dented membrane node flows back out along its normal (SQUEEZE µm/s, never
   * past where it was) and counts as advancing, so it pushes hard (contact.js).
   * Ease off and the pseudopod is shoved back out; push harder than it
   * squeezes and the channel opens on.
   */
  squeeze(dt) {
    const b = this.body, dent = b.dent;
    b.normals();
    for (let i = 0; i < N; i++) {
      if (dent[i] < 0.2) { dent[i] = 0; continue; }
      const m = Math.min(dent[i], SQUEEZE * dt);
      b.x[i] += b.nx[i] * m; b.y[i] += b.ny[i] * m;
      dent[i] -= m;
      b.Gp[i] = Math.max(b.Gp[i], 0.2);
    }
  }

  /** How deep the deepest channel into it is now (µm of dent). */
  get channel() { let m = 0; for (let i = 0; i < N; i++) if (this.body.dent[i] > m) m = this.body.dent[i]; return m; }

  /** Sated after engulfing someone: it will not wake for a while. */
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
      const w = hyp(b.x[i] - b.x[j], b.y[i] - b.y[j]);
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
    b.dent.fill(0); // the nodes are renumbered
    b.grid.build(b.x, b.y, N);
    this.cuts++;
    const gone = this.fight.bitten();
    return { lost, gone };
  }
}
