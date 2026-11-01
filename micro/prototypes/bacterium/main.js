// Bacterium prototype (Level 5 of the Zoom Chain): steer (LS) or run and tumble as a
// magnetotactic spirillum, or as the predator Bdellovibrio, in bog sediment
// at 1000×, at the limit of the light microscope. See README.md.
//
// Micro Zoom: the forward landmark (a host cell with phages landing on it, far
// right) zooms into the phage level; the backdoor (the looming Paramecium, top
// left) rises to the pool. Up to four local players (shared/players.js), with
// the LEGO-style split screen (shared/splitscreen.js) and the edge arrows
// (shared/landmark.js).
import * as THREE from '../shared/vendor/three.module.min.js';
import { mountHud, keyFor } from '../shared/hud.js';
import { createDash, hudControls } from '../shared/controls.js';
import { createFeatures } from '../shared/features.js';
import { createAudio } from '../shared/audio.js';
import { loadTexture } from '../shared/assets.js';
import { createLightOptics, LOOK_NAMES, psfSigmaUm } from '../shared/techniques/bacterium-fluorescence.js';
import { createShapes } from '../shared/techniques/bacterium-shapes.js';
import { createBorrowedLooks, borrowedSwitches, CLS, SEM_LOOKS, DIC_MODES } from '../shared/techniques/adapters.js';
import { createWorld, segDist, WORLD, DIRECTOR, ENCOUNTERS, canPlace } from './world.js';
import { createDirector } from '../shared/director.js';
import { createSwimmer, SPECIES } from './swim.js';
import { createGame, GOAL_PREY } from './game.js';
import { createDrawer } from './draw.js';
import { createStentor } from './stentor.js';
import { createOverlay } from './overlay.js';
import { createCapture, createFight } from '../shared/predation.js';
import { createPlayers } from '../shared/players.js';
import { createSplitScreen } from '../shared/splitscreen.js';
import { createLandmarks } from '../shared/landmark.js';
import { embed } from '../shared/embed.js';
import { gauss } from './world.js';
import { createCollectives, COLL, LEVEL_NAMES } from './collective.js';
import { createGuards } from './guards.js';
import { createQuality } from '../shared/quality.js';
import { createPortalGlow, createPortalLight, createGlint } from '../shared/portal.js';

const canvas = document.querySelector('canvas.view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
renderer.autoClear = false;

// --- players: P1 on the keyboard and the first controller; 2-4 join with any button on another ---
const players = createPlayers({
  max: 4,
  onJoin: (p) => { hud.toast(`Player ${p.slot + 1} joined`); embed.join(p.slot, p.color, p.name); },
  onLeave: (p) => { hud.toast(`Player ${p.slot + 1} left`); embed.leave(p.slot); },
  onChange: (list) => { if (hud) hud.players(list); },
});
if (embed.players) players.fromJSON(embed.players);
embed.on('players', (r) => players.fromJSON(r));
const pad = players.pad(0);
const ctl = players.controls(0);
const hud = mountHud({
  title: 'Bacterium',
  sub: 'A magnetotactic spirillum, 3 µm long, in bog sediment at 1000× (or the predator Bdellovibrio). Gather an army of your kin and fight your way to the host cell.',
  controls: hudControls({
    move: 'Steer your flock: it heads where you point, as fast as you tilt. Let go and it slows and stops',
    camera: 'Move the stage',
    dash: 'Sprint run: every flagellum at full motor speed (recharges); the whole flock sprints',
    attack: 'Beacon: a pulse from the flock; kin it reaches answer and join. It also eats prey (rods) in reach and strikes any enemy your flock touches · Bdellovibrio: attach and bore in',
    defend: 'Defend: tumble, a quick random turn that leans toward the stick. At the moment a predator strikes your cell (a grazer\'s surge, a phage landing, a Bdellovibrio\'s ram) it evades',
    special: 'Toxin burst when charged (army of 12). Otherwise the data overlay. At the Paramecium: back to the pool',
    analog: 'Fine focus down / up',
    secondary: 'Reverse the run: the other pole leads (back along the field)',
    look: 'Look: phase, fluorescence, darkfield, SEM, DIC',
    zoom: 'Field: 180 µm eyepiece … 22 µm camera crop',
  }),
  note: 'Real scale and speeds in µm and µm/s; a few labelled stretches (see Features). Goal: press X near kin to call them into your flock, eat prey to grow, then head out any way you like: the gates (a grazer, a Bdellovibrio pack, a phage cloud, an amoeba, a second grazer) come one at a time with calm water between, then Stentor and the host cell beyond, its golden light spilling in from the edge once it is near. A lone cell cannot win a fight; an army can. As Bdellovibrio, take three prey. The ring points to the Paramecium (the way back). Up to four players: press any button on another controller to join.',
});
hud.players(players.list);
/** A button as the instructions should name it: the controller's, or the key while no controller is connected. */
const glyph = (b) => (hud.glyphs === 'keyboard' ? keyFor(b) || b : b);

// --- tiny DOM bits: end card, DATA tag, scale bar, the army chip, warnings, the backdoor prompt ---
const card = Object.assign(document.createElement('div'), { className: 'bx-card' });
const tag = Object.assign(document.createElement('div'), { className: 'bx-tag', textContent: 'DATA OVERLAY · not optics: what the cell senses' });
const scaleEl = Object.assign(document.createElement('div'), { className: 'bx-scale' });
// the army chip (a HUD line, not a ring round the flock): size, abilities, toxin, or the hint to call kin
const armyEl = document.createElement('div');
armyEl.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:6;pointer-events:none;color:#e6d3a3;font:600 12px/1.35 system-ui,sans-serif;text-align:center;text-shadow:0 1px 2px rgba(0,0,0,.8);white-space:nowrap;max-width:calc(100vw - 32px);overflow:hidden;text-overflow:ellipsis';
const warnEl = document.createElement('div');
warnEl.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);background:rgba(10,12,16,.7);color:#ff8a7a;border-radius:12px;padding:6px 14px;font:600 13px/1.3 system-ui,sans-serif;pointer-events:none;white-space:nowrap;z-index:20;display:none;max-width:calc(100vw - 32px);overflow:hidden;text-overflow:ellipsis;text-align:center';
const promptEl = document.createElement('div');
promptEl.style.cssText = 'position:fixed;left:50%;bottom:14vh;transform:translateX(-50%);background:rgba(18,16,10,.72);color:#efe4c4;border:1px solid rgba(201,163,90,.7);border-radius:999px;padding:5px 14px;font:600 13px system-ui,sans-serif;pointer-events:none;z-index:6;display:none';
// the corner brackets that mark each player's cell (a game marker, not optics), clipped to each split view
const markCv = document.createElement('canvas');
markCv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:3';
document.body.append(card, tag, scaleEl, armyEl, warnEl, promptEl, markCv);
const markG = markCv.getContext('2d');

// --- simulation ---
const world = createWorld();
const drawer = createDrawer(world);
// the boss: Stentor coeruleus, anchored by the host cell (stentor.js; runBoss below)
const stentor = createStentor();
world.stentor = stentor;
// the clay grain Stentor's foot holds on to (placed with the portal)
const stentorGrain = { x: 1e6, y: 0, r: 14, wob: 0.3, seed: 31, cap: 8, ang: 0, z: -0.4 };
world.grains.push(stentorGrain);
const dashFor = (sp) => (sp === 'mtb' ? createDash({ duration: 0.6, cooldown: 3 }) : createDash({ duration: 0.45, cooldown: 2.5 }));
/** Every player's cell: its own swimmer, rules (game), dash, catch and HUD state. */
const roster = [];
function makePlayer(p) {
  const swimmer = createSwimmer(world);
  const P = {
    slot: p.slot, color: p.color, name: `Player ${p.slot + 1}`, swimmer, S: swimmer.state, game: createGame(world, swimmer),
    dash: dashFor('mtb'), pad: players.pad(p.slot), ctl: players.controls(p.slot),
    capture: createCapture({ onRespawn: () => respawnPlayer(P) }),
    cat: { kind: null, who: null, phase: null, t: 0, x0: 0, y0: 0, a0: 0, zoom0: 2, released: false },
    backT: 0, eatenFor: 0, msg: { phageHint: false }, blockT: 0, sprintT: 0, phage: null, bdello: null,
  };
  // the capture's card (unused: the catch follows the predator, then respawns), its veil (the
  // fade) and caption: in multiplayer one player's fade must not black out everyone's screen
  P.card = P.capture.card;
  P.veil = P.card.nextElementSibling;
  return P;
}
const P1 = makePlayer(players.get(0));
roster.push(P1);

// --- the collective (collective.js): touch kin and they join you; no leader, one flock ---
const collMsg = { lostAt: -9, recruitAt: -9, n: 0, beaconT: -9, joinSnd: -9 };
const coll = createCollectives(world, {
  onRecruit: (C) => {
    if (t - collMsg.joinSnd > 0.06) { collMsg.joinSnd = t; audio.play('bacterium/tumble', { volume: 0.35, rate: 1.7 + Math.random() * 0.3 }); }
    const n = C.members.length + C.players.length;
    if (C.members.length === 1) hud.toast('A kin cell answers your beacon and joins: you are a flock now. Steer and it follows, each cell in its own way', 3200);
    else if (n === COLL.shield && t - collMsg.recruitAt > 2) { collMsg.recruitAt = t; hud.toast(`An army of ${n}: a slime shield now catches phages`, 2600); }
    else if (n === COLL.raft && t - collMsg.recruitAt > 2) { collMsg.recruitAt = t; hud.toast(`An army of ${n}: a raft. Currents drag you less, the bigger it grows`, 2600); }
    else if (n === COLL.toxin && t - collMsg.recruitAt > 2) { collMsg.recruitAt = t; hud.toast(`An army of ${n}: your toxin charges. ${glyph('Y')} fires it when ready`, 2600); }
  },
  onBeacon: () => { audio.play('bacterium/eat', { volume: 0.4, rate: 1.9 }); },
  onLost: (C, m, kind) => {
    // a member eaten by a grazer, the amoeba or Stentor poisons it (guards.js poison)
    if (C && C.players.length) guards.poison(kind, m, C);
    if (!C || !C.players.length || t - collMsg.lostAt < 1.5) return;
    collMsg.lostAt = t;
    const by = { grazer: 'a grazer', amoeba: 'the amoeba', stentor: 'Stentor', bdello: 'a Bdellovibrio', phage: 'a phage' }[kind] || 'a predator';
    hud.toast(`${by[0].toUpperCase() + by.slice(1)} took a member of your army (${C.members.length} left): members are your health`, 2200);
  },
  onShield: (C, P, kind) => { if (t - collMsg.lostAt > 1.5) { collMsg.lostAt = t; hud.toast(kind === 'phage' ? 'The slime catches the phage: it cannot reach your wall' : 'The ram glances off the slime round your army', 2000); } },
  onMerge: (C, P) => { hud.toast(`${P.name} joins a flock: ${C.players.map((Q) => Q.name).join(' and ')} now move as one (sticks blend). Move away to leave: the army splits evenly`, 3600); },
  onSplit: (C, N, P, k) => { hud.toast(`${P.name} branches off: the army splits evenly (${k} with ${P.name}, ${C.members.length} stay)`, 3000); },
  onDivide: () => {},
  onBurst: (C, b) => toxinBurst(C, b),
});
world.coll = coll;
coll.reset(roster);
// --- the gates on the way (guards.js): enemies the army fights by contact ---
const gateMsg = { seen: new Set() };
const guards = createGuards(world, coll, stentor, {
  onBeaten: (q) => {
    audio.play('bacterium/eat', { volume: 1, rate: 0.6 });
    for (const P of roster) P.pad.rumble(250, 0.6, 0.6);
    const text = { grazer: 'The peritrich gives up: it coils back on its stalk and its current stops. The way is open', bdello: 'The Bdellovibrio pack is gone: the way is open', phage: 'The phage cloud is swept up in your slime: the way is open', amoeba: 'The amoeba withdraws from your army: the way is open', stentor: 'Stentor has had enough: it contracts and stays shut. The host is yours!' }[q.kind];
    hud.toast(text, 3600);
    gateInfo.log.push({ ev: 'beaten', id: q.id, t });
  },
  onKill: () => { audio.play('bacterium/eat', { volume: 0.6, rate: 1.3 }); },
  onInfected: (C) => { if (t - collMsg.lostAt > 1.5) { collMsg.lostAt = t; hud.toast(`A phage infected a member (${C.members.length} left). At an army of ${COLL.shield} the slime shield catches them`, 2400); } },
  onSwept: () => {},
});
const gateInfo = { log: [] };

// --- the encounters, placed as you go (design/encounter-pattern.md "Placed as you go"; shared/director.js) ---
// The director places the gates one at a time, in world.js ENCOUNTERS order (the peritrich, the
// Bdellovibrio pack, the phage cloud, the amoeba's edge, the bigger peritrich, then the host cell with
// Stentor on guard), each in water nobody has seen, a little ahead of whoever leads (or, if they linger,
// round them), out of every view, after a calm break. Nothing a player has seen is ever placed, moved or
// removed; until placed, each gate is parked far off (guards.park). The clay grains, the biofilm and the
// ambient life are scenery, there from the start. Army sizes: a gate is placed whatever the army (nothing
// waits on the player for ever), but while the leader's army is short of the next gate's need
// (ENCOUNTERS[].need) the calm break before it lasts up to ARMY_HOLD s longer, and kin are kept closer
// round every player who is short (keepAmbient), so there is always enough kin in reach to grow it.
const ARMY_HOLD = 8;
// (stepDirector below: a lingering player's gate drifts over to them; kin and prey are kept near every player)
const DRIFT = 6, DRIFT_WAIT = 4;
const drift = { idle: 0 };
const KEEP = { r: 130, kin: 8, kinShort: 18, prey: 14, far: 240, every: 0.4, moves: 4 };
const keepT = { t: 0 };
const leaderP = () => { const L = director.leader; return L ? roster.find((P) => P.slot === L.id) || null : null; };
const armyOf = (P) => { const C = P && coll.opts.on && coll.of(P); return C ? C.army : 1; };
/** The army the next encounter wants (after the last: the boss's). */
const nextNeed = () => (ENCOUNTERS[director.index] || ENCOUNTERS[ENCOUNTERS.length - 1]).need;
/** Met: a player's flock comes into the gate's zone (where the army fights it), or it is beaten. */
const gateMet = (q) => (h, [p]) => { const c = guards.centre(q); return q.beaten || Math.hypot(p.x - c.x, p.z - c.y) < q.zone + 8; };
const ENC = { portal: { place: (x, y, b) => placePortal(x, y, b), met: () => false } };
for (const q of guards.list) if (q.kind !== 'stentor') ENC[q.id] = { place: (x, y, b) => { guards.placeGate(q, x, y, b); return q; }, met: gateMet(q) };
const director = createDirector({
  ...DIRECTOR,
  // encounters also keep clear of the gates already met (still standing where they were)
  canPlace: (x, y, r, o) => canPlace(x, y, r) && guards.list.every((q) => !q.placed || q.id === o.entry.id || Math.hypot(guards.centre(q).x - x, guards.centre(q).y - y) > r * 0.5 + q.zone),
  entries: ENCOUNTERS.map((e, i) => {
    const o = { ...e, ...ENC[e.id] };
    // the break before it: longer (up to ARMY_HOLD s) while the leader's army is short of its need
    Object.defineProperty(o, 'calm', { get: () => { const base = (i === 0 ? DIRECTOR.warmup : DIRECTOR.calm).sec; return { sec: base + Math.max(0, Math.min(ARMY_HOLD, e.need - armyOf(leaderP()))) }; } });
    return o;
  }),
});
/** A predator would take player P: the collective gives a member instead (or the slime stops it). */
function absorbHit(P, kind, who) {
  const from = kind === 'grazer' ? who.pose.mouth : kind === 'stentor' ? who.mouth : kind === 'phage' ? (who.p || who) : who;
  if (!coll.absorb(P, kind, from)) return false;
  if (from && !(P.kickT > 0)) { P.kickT = kind === 'phage' || kind === 'bdello' || kind === 'stentor' ? 0.2 : 0.6; P.kickFrom = { x: from.x, y: from.y }; }
  P.pad.rumble(160, 0.5, 0.4);
  return true;
}
/** The toxin burst: every enemy in reach takes a big hit; grazers recoil, Bdellovibrio die or flee, phages are destroyed. */
function toxinBurst(C, b) {
  const R = b.R;
  audio.play('bacterium/eat', { volume: 1, rate: 0.55 });
  for (const P of C.players) P.pad.rumble(300, 0.8, 0.6);
  let hit = guards.burstHit(b);
  for (const g of world.grazers) {
    if (Math.hypot(g.pose.mouth.x - b.x, g.pose.mouth.y - b.y) > R + g.R) continue;
    g.contract = 6; g.ext = 0; g.fight.bitten(); g.fight.bitten(); g.fight.bitten();
  }
  for (const c of world.cells) {
    if (c.kind !== 'bdello' || Math.hypot(c.x - b.x, c.y - b.y) > R) continue;
    c.stalking = null; c.cooldown = 14; c.windup = 0; const a = Math.atan2(c.y - b.y, c.x - b.x); c.x += Math.cos(a) * 18; c.y += Math.sin(a) * 18; c.a = a; hit.push('Bdellovibrio');
  }
  for (const P of roster) if (P.bdello && Math.hypot(P.bdello.c.x - b.x, P.bdello.c.y - b.y) < R + 20) { P.bdello.c.stalking = null; P.bdello = null; }
  for (const p of world.phages) if (!p.stuck && Math.hypot(p.x - b.x, p.y - b.y) < R) { p.x = b.x + (Math.random() < 0.5 ? -1 : 1) * (200 + Math.random() * 100); p.y = b.y + (Math.random() - 0.5) * 300; p.homing = false; p.cloud = null; hit.push('phage'); }
  for (const P of roster) if (P.phage && Math.hypot(P.phage.p.x - b.x, P.phage.p.y - b.y) < R) P.phage = null;
  if (Math.hypot(stentor.mouth.x - b.x, stentor.mouth.y - b.y) < R + stentor.catchR && stentor.awake && !stentor.beaten) stentor.fight.bitten();
  collInfo.bursts.push({ t, x: b.x, y: b.y, hit: [...new Set(hit)] });
  const what = [...new Set(hit)];
  hud.toast(`Toxin burst! ${what.length ? what.join(', ').replace(/^./, (x) => x.toUpperCase()) + ' hit' : 'Nothing in reach this time'} (a quorum-gated toxin, like violacein)`, 2600);
}
const collInfo = { bursts: [], presses: [] };
const collFeature = { on: true };
const swimmer = P1.swimmer, game = P1.game, S = P1.S;
const multi = () => roster.length > 1;
const alive = () => roster.filter((P) => P.S.alive);

/** Keep one player record per joined player (a join during play, or the shell's roster). */
function syncRoster() {
  for (const p of players.list) {
    if (roster.some((P) => P.slot === p.slot)) continue;
    const P = makePlayer(p);
    P.swimmer.reset(P1.S.species);
    P.dash = dashFor(P1.S.species);
    roster.push(P);
    roster.sort((a, b) => a.slot - b.slot);
    placeNear(P, P1);
  }
  for (let i = roster.length - 1; i >= 0; i--) {
    const P = roster[i];
    if (P === P1 || players.get(P.slot)) continue;
    P.capture.reset(false);
    coll.remove(P);
    P.card.remove(); if (P.veil) { P.veil.nextElementSibling && P.veil.nextElementSibling.remove(); P.veil.remove(); }
    roster.splice(i, 1);
  }
  for (const P of roster) { const p = players.get(P.slot); P.waiting = !!(p && p.waiting); if (P.veil) P.veil.style.visibility = multi() ? 'hidden' : ''; }
}
/** Put P beside a teammate (a few body lengths away, clear of grains). */
function placeNear(P, M) {
  const a = Math.random() * Math.PI * 2, d = 4 + Math.random() * 2;
  const m = M.S.inside || M.S;
  P.S.x = Math.max(WORLD.x0 + 4, Math.min(WORLD.x1 - 4, m.x + Math.cos(a) * d));
  P.S.y = Math.max(world.surfaceY(P.S.x) + 2, Math.min(WORLD.y1 - 6, m.y + Math.sin(a) * d));
  P.S.a = m.a !== undefined ? m.a + (Math.random() - 0.5) : P.S.a;
  world.pushOutOfGrains(P.S, P.S.sp.r + 0.2);
}

// --- the landmarks: the way on (the host, the portal) and the backdoor (the Paramecium) ---
const LMK = world.landmarks;
const FWD = { x: LMK.forward.x, y: LMK.forward.y, z: 0 };
const BACK = { x: LMK.back.x, y: LMK.back.y, z: 0 };
const lm = { fired: false, near: false, log: [], turned: false, hinted: false };

// --- pacing: a rhythm along the way, not a clock (world.js ROUTE, guards.js) ---
// The owner: "a few seconds of moving, an obstacle, a short calm break, the
// next, and so on to a boss at the destination". Every gate is on until your
// army beats it, and stays beaten. Nothing here is timed.
const pacing = { now: 0, t0: 0, firstThreat: null, firstCatch: null };
function resetPressure() {
  guards.reset();
  world.grazers.forEach((gr) => { gr.feeding = true; gr.gulping = false; });
  pacing.t0 = pacing.now; pacing.firstThreat = null; pacing.firstCatch = null;
  for (const p of world.phages) p.anim = false;
  for (const c of world.cells) if (c.kind === 'bdello' && c.prey && c.prey.isPlayer) { c.prey = null; c.cooldown = 6; c.L = 1.0; }
  stentor.awake = false; stentor.fight.reset(); bossInfo.log.length = 0;
  clearPortal(); lm.fired = false; lm.blocked = false;
  resetEncounters();
  gateMsg.seen.clear();
}
function updatePressure() {
  for (const g of world.grazers) g.feeding = !g.beaten;
  world.hunt.phage = !guards.byId.phage.beaten;
  world.hunt.bdello = !guards.byId.bdello.beaten;
  world.hunt.amoeba = !world.amoeba.beaten;
  // the first time a player's flock reaches a gate, say what it is and how to beat it
  for (const q of guards.list) {
    if (!q.engaged || gateMsg.seen.has(q.id)) continue;
    gateMsg.seen.add(q.id);
    const tip = {
      grazer1: 'A peritrich: its feeding current sweeps cells into its funnel. Swarm its bell with your army to wear it down (X strikes); a lone cell cannot',
      bdello: 'A Bdellovibrio pack: each takes a member on contact. Surround them: every cell touching one wears it down (X strikes)',
      phage: 'A phage cloud (spots in fluorescence and darkfield, D-pad ←→): unshielded cells are infected. An army of 5 has a slime shield that sweeps them up',
      amoeba: 'An amoeba\'s edge blocks the way: cells inside it are engulfed. Push on its edge with your army to drive it back (X strikes)',
      grazer2: 'A bigger peritrich: bring a bigger army',
      stentor: `Stentor guards the host: its vortex sweeps in anything near it. Fight it at its rim of membranelles, tumble (${glyph('B')}) at the pull, and fire your toxin (${glyph('Y')})`,
    }[q.id];
    hud.toast(tip, 4200);
    gateInfo.log.push({ ev: 'reached', id: q.id, t });
  }
}

// --- being caught: strike → hold → eat → the Eaten card (shared/predation.js) ---
// Solo: the Eaten card and A to start again. Multiplayer: the catch plays out
// the same, then the player rejoins beside a teammate.
const CATCH = {
  stentor: { by: 'Stentor', how: 'swept you into its oral pouch with its vortex', sound: 'bacterium/graze',
    strike: 'Caught in the vortex: swept round toward the mouth', hold: 'Into the oral pouch, spinning', eat: 'Packed into a food vacuole, carried down into its body' },
  grazer: { by: 'A peritrich', how: 'swept you into its oral funnel and packed you into a food vacuole', sound: 'bacterium/graze',
    strike: 'Caught in the feeding current: drawn into the oral funnel', hold: 'Down the funnel: the oral cilia sweep you deeper', eat: 'Packed into a food vacuole: digestion begins' },
  amoeba: { by: 'The amoeba', how: 'closed you into a phagosome', sound: 'bacterium/graze',
    strike: 'The amoeba\'s edge rises round you', hold: 'Its lobes meet over you: you are enclosed', eat: 'Closed into a phagosome, drawn in and darkening' },
  phage: { by: 'A phage', how: 'injected its DNA: your cell burst into new phages', sound: 'bacterium/phage',
    strike: 'The phage\'s tail sheath contracts: its tube pierces the envelope', hold: 'Its DNA is going in', eat: 'Lytic cycle: the cell rounds up, fills with new phages and bursts' },
  bdello: { by: 'Bdellovibrio', how: 'bored in and turned you into a bdelloplast', sound: 'bacterium/eat',
    strike: 'Bdellovibrio rams your wall', hold: 'It bores through into the periplasm', eat: 'You round up into a bdelloplast: it eats you from inside' },
};
const capture = P1.capture;
const cat = P1.cat;
function startCatch(P, { kind, who }) {
  const S = P.S, cat = P.cat;
  Object.assign(cat, { kind, who, phase: 'strike', t: 0, x0: S.x, y0: S.y, a0: S.a, zoom0: view.zoom, released: false });
  S.catchAnim = cat;
  P.eatenFor = 0;
  coll.remove(P); // members stay with the others (or go free)
  P.capture.start({ by: CATCH[kind].by, how: CATCH[kind].how });
  audio.play(CATCH[kind].sound, { volume: 1, rate: kind === 'amoeba' ? 0.7 : 1 });
  P.pad.rumble(400, 0.7, 0.8);
  if (kind === 'phage') who.p.anim = true;
  if (pacing.firstCatch === null) pacing.firstCatch = pacing.now - pacing.t0;
  embed.captured({ by: CATCH[kind].by, player: P.slot });
}
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
function stepCatch(P, dt) {
  const S = P.S, cat = P.cat;
  if (!P.capture.active) return;
  const prev = cat.phase;
  const c0 = P.capture.update(dt);
  if (!c0.active) return; // over: respawnPlayer has run
  // after the eat the catch follows the predator (follow, fade out, fade in): drawn as 'eaten'
  const c = { ...c0, phase: AFTER.has(c0.phase) ? 'eaten' : c0.phase };
  cat.realPhase = c0.phase;
  cat.phase = c.phase; cat.t = c.t;
  const k = c.t, e = c.phase === 'eaten' ? 1 : c.phase === 'eat' ? ease(k) : 0;
  if (c.phase !== prev) {
    if (c.phase === 'eat') {
      audio.play(cat.kind === 'phage' ? 'bacterium/phage' : 'bacterium/eat', { volume: 0.9, rate: 0.7 });
    }
    if (c.phase === 'hold' && cat.kind === 'bdello') audio.play('bacterium/eat', { volume: 0.8, rate: 1.2 });
  }
  if (cat.kind === 'grazer') {
    const g = cat.who, Q = g.pose, R = g.R;
    g.gulping = c.phase !== 'eaten';
    const deep = { x: Q.mouth.x - Q.up.x * R * 0.55, y: Q.mouth.y - Q.up.y * R * 0.55 };
    if (c.phase === 'strike') { const q = ease(k); S.x = cat.x0 + (Q.mouth.x - cat.x0) * q; S.y = cat.y0 + (Q.mouth.y - cat.y0) * q; S.a += dt * 7; }
    else if (c.phase === 'hold') { const q = ease(k); S.x = Q.mouth.x + (deep.x - Q.mouth.x) * q; S.y = Q.mouth.y + (deep.y - Q.mouth.y) * q; S.a += dt * 6; }
    else { S.x = deep.x - Q.up.x * R * 0.25 * e + Q.up.y * R * 0.3 * e; S.y = deep.y - Q.up.y * R * 0.25 * e - Q.up.x * R * 0.3 * e; S.a += dt * 2 * (1 - e); }
  } else if (cat.kind === 'stentor') {
    // swept round the vortex into the oral pouch, packed into a food vacuole carried down into the body
    const B = cat.who, M = B.mouth;
    const a0 = Math.atan2(cat.y0 - M.y, cat.x0 - M.x), r0 = Math.hypot(cat.x0 - M.x, cat.y0 - M.y);
    if (c.phase === 'strike') { const q = ease(k); const a = a0 + 1.2 * q, r = r0 + (B.catchR * 0.7 - r0) * q; S.x = M.x + Math.cos(a) * r; S.y = M.y + Math.sin(a) * r; S.a += dt * 8; }
    else if (c.phase === 'hold') { const q = ease(k); const a = a0 + 1.2 + 1.4 * q, r = B.catchR * (0.7 - 0.45 * q); S.x = M.x + Math.cos(a) * r; S.y = M.y + Math.sin(a) * r; S.a += dt * 7; }
    else { const a = a0 + 2.6, r = B.catchR * 0.25; S.x = M.x + Math.cos(a) * r - 20 * e; S.y = M.y + Math.sin(a) * r - 30 * e; S.a += dt * 2 * (1 - e); }
  } else if (cat.kind === 'amoeba') {
    // the phagosome is drawn in and carried along as the edge creeps on
    const A = cat.who, nx = -Math.sin(A.ang), ny = Math.cos(A.ang);
    if (cat.ax === undefined) { cat.ax = cat.x0 - A.x; cat.ay = cat.y0 - A.y; }
    S.x = A.x + cat.ax - nx * 6 * e; S.y = A.y + cat.ay - ny * 6 * e;
  } else if (cat.kind === 'phage') {
    if (c.phase === 'eaten' && !cat.released) {
      // the burst: new phages into the water
      cat.released = true;
      for (let i = 0; i < 30; i++) { const p = world.newPhage(S.x + gauss(Math.random) * 1.2, S.y + gauss(Math.random) * 1.2); p.z = (Math.random() - 0.5) * 0.4; world.phages.push(p); }
      for (const ph of S.phages) ph.p.anim = true; // the shells stay with the ghost
      P.pad.rumble(250, 0.5, 0.4);
    }
  } else if (cat.kind === 'bdello') {
    const b = cat.who, sp = S.sp;
    b.attachT = 0;
    const pole = { x: S.x + Math.cos(S.a) * sp.L * 0.5, y: S.y + Math.sin(S.a) * sp.L * 0.5 };
    if (c.phase === 'strike') { const q = 1 - ease(k); b.x = pole.x + Math.cos(S.a) * (0.55 + 1.6 * q); b.y = pole.y + Math.sin(S.a) * (0.55 + 1.6 * q); b.a = S.a + Math.PI; }
    else if (c.phase === 'hold') { const q = ease(k); b.x = pole.x + Math.cos(S.a) * 0.55 * (1 - q) - Math.cos(S.a) * sp.L * 0.35 * q; b.y = pole.y + Math.sin(S.a) * 0.55 * (1 - q) - Math.sin(S.a) * sp.L * 0.35 * q; b.a = S.a + Math.PI; }
    else { b.x = S.x; b.y = S.y; b.a = S.a + Math.PI * 0.5 + e * 1.2; b.L = 1.0 - 0.3 * e; b.curve = 0.7 + 0.8 * e; }
  }
  // the grazer carries the food vacuole off: its bell contracts on its stalk and re-extends
  if (cat.kind === 'grazer' && c0.phase === 'follow' && c0.t < 0.05) { cat.who.contract = 1.6; cat.who.ext = 0.4; }
}
const AFTER = new Set(['follow', 'fadeOut', 'fadeIn']);
/** The catch is over (the screen is black): respawn beside a teammate, or (alone) at a safe spot. */
function respawnPlayer(P) {
  const cat = P.cat;
  if (cat.kind === 'grazer' && cat.who) cat.who.gulping = false;
  if (cat.kind === 'bdello' && cat.who) { const b = cat.who; b.prey = null; b.cooldown = 6; b.L = 1.0; b.curve = 0.7; }
  cat.kind = null; cat.who = null; cat.phase = null; cat.ax = undefined;
  P.swimmer.reset(P.S.species);
  P.dash = dashFor(P.S.species);
  P.eatenFor = 0; P.phage = null; P.bdello = null;
  const mates = alive().filter((Q) => Q !== P && !Q.capture.active);
  if (mates.length) { placeNear(P, mates[0]); hud.toast(`${P.name} is back, beside ${mates[0].name}`); return; }
  // a safe spot: open water ~90-130 µm from where you were, as far as can be from every gate still
  // standing and from Stentor (kin are kept near you wherever you are: keepAmbient)
  const best = safeSpot(P.S.x, P.S.y);
  P.S.x = best.x; P.S.y = best.y;
  world.pushOutOfGrains(P.S, P.S.sp.r + 0.2);
  if (P === P1) { view.cx = P.S.x; view.cy = P.S.y; }
  hud.toast(multi() ? `${P.name} is back` : 'A new cell swims into the field, away from the predators', 2400);
}
/** Open water near (x, y) farthest from the threats still standing (placed, unbeaten gates; Stentor). */
function safeSpot(x, y) {
  const threats = guards.list.filter((q) => (q.kind === 'stentor' ? stentor.placed : q.placed) && !q.beaten).map((q) => guards.centre(q));
  let best = { x: world.start.x, y: world.start.y }, bs = -Infinity;
  for (let i = 0; i < 16; i++) for (const d of [90, 130]) {
    const a = (i / 16) * Math.PI * 2, q = { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d };
    if (!world.inWater(q.x, q.y, 10) || world.pushOutOfGrains({ x: q.x, y: q.y }, 2)) continue;
    const s = threats.reduce((m, c) => Math.min(m, Math.hypot(c.x - q.x, c.y - q.y)), 400);
    if (s > bs) { bs = s; best = q; }
  }
  return best;
}
/** Multiplayer: a caught or spent player comes back beside a teammate (solo uses the cards). */
function rejoin(P) {
  const cat = P.cat;
  if (cat.kind === 'grazer' && cat.who) cat.who.gulping = false;
  if (cat.kind === 'bdello' && cat.who) { const b = cat.who; b.prey = null; b.cooldown = 6; b.L = 1.0; b.curve = 0.7; }
  P.capture.reset(false);
  cat.kind = null; cat.who = null; cat.phase = null;
  P.swimmer.reset(P.S.species);
  P.dash = dashFor(P.S.species);
  P.eatenFor = 0;
  const mates = alive().filter((Q) => Q !== P);
  if (mates.length) { placeNear(P, mates[0]); hud.toast(`${P.name} is back, beside ${mates[0].name}`); }
  else { P.S.x = -20; P.S.y = 32; hud.toast(`${P.name} is back`); }
}

// --- the fights ----------------------------------------------------------------
// Every predator winds up readably before it strikes (shared/predation.js
// createFight), and B (the tumble) at the strike evades it:
//  - a grazer: its oral cilia beat harder and its funnel tips toward you while
//    the feeding current intensifies (wind-up), then a surge pulls (strike);
//    caught at the funnel's mouth then, you are swept in. Sprinting out (A)
//    wears it down; out of interest it coils back on its stalk.
//  - a phage: it homes in (a game stretch: phages only diffuse), its long tail
//    fibres catch your wall and its baseplate settles (wind-up), then it
//    commits (strike) and binds. Tumbling at that moment shakes it off.
//  - Bdellovibrio (hunting the magnetotactic cell): it stalks you, lines up a
//    few µm off with a tremble (wind-up), then rams (strike).
const segTo = (x, y, S) => segDist(x, y, S.x, S.y, S.a, S.sp.L)[0];
const fightable = (P) => P.S.alive && !P.capture.active && !P.waiting;
const towards = (a, b, v, dt, o) => { const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1; const m = Math.min(d, v * dt); o.x = a.x + (dx / d) * m; o.y = a.y + (dy / d) * m; return o; };
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
for (const g of world.grazers) g.fight = createFight({ windup: 1.1, strike: 0.5, recoverT: 1.2, repelT: 1.6, retreatT: 8, facingRate: 0, blockHit: 0.36, biteHit: 0.3 });
function runFights(dt) {
  const who = (P) => (multi() ? `${P.name}: ` : '');
  for (const P of roster) { P.blockT = Math.max(0, P.blockT - dt); P.sprintT = Math.max(0, P.sprintT - dt); }
  // grazers
  for (const g of world.grazers) {
    const live = world.opts.grazers && g.contract <= 0 && g.feeding !== false;
    let T = null, d = Infinity;
    if (live) for (const P of roster) { if (!fightable(P)) continue; const q = Math.hypot(P.S.x - g.pose.mouth.x, P.S.y - g.pose.mouth.y); if (q < d && q < 60) { d = q; T = P; } }
    const f = g.fight.update(dt, { near: !!T && d < 45, inReach: !!T && d < 24, facing: !!T && T.blockT > 0, blocking: !!T && T.blockT > 0 });
    g.fightState = live ? f.state : 'stalk'; g.fightT = f.t; g.target = T;
    const want = !live ? 1 : f.state === 'windup' ? 1 + 1.5 * f.t : f.state === 'strike' ? 3.4 : f.state === 'repelled' ? 0.2 : f.state === 'retreat' ? 0.1 : 1;
    g.pull = (g.pull || 1) + (want - (g.pull || 1)) * Math.min(1, dt * (f.state === 'strike' ? 14 : 5));
    // the funnel tips toward its target as it winds up
    let lean = 0;
    if (T && (f.state === 'windup' || f.state === 'strike')) { const up = Math.atan2(g.pose.up.y, g.pose.up.x); lean = Math.max(-0.45, Math.min(0.45, wrapA(Math.atan2(T.S.y - g.pose.mouth.y, T.S.x - g.pose.mouth.x) - up))) * (f.state === 'strike' ? 1 : f.t); }
    g.lean = (g.lean || 0) + (lean - (g.lean || 0)) * Math.min(1, dt * 4);
    if (!T) continue;
    if (T.sprintT > 0 && d < 34 && f.state !== 'retreat') { T.sprintT = 0; const gone = g.fight.bitten(); hud.toast(gone ? `${who(T)}You sprint out of its current: the grazer gives up` : `${who(T)}You sprint against the current: its pull falters`, 1800); }
    if (f.hit && d < 8) { const ev = {}; T.game.catchBy('grazer', g, ev); if (ev.caught) startCatch(T, ev.caught); }
    if (f.blocked) { T.pad.rumble(200, 0.6, 0.5); hud.toast(`${who(T)}Tumbled clear: the grazer's surge misses you`, 1800); }
    // out of interest (worn down by sprints and dodges): it coils back on its stalk and its current stops
    if (g.fight.state === 'retreat' && !g.retreating) { g.retreating = true; g.contract = 3; g.ext = 0; hud.toast('The grazer gives up: it coils back on its stalk', 2000); }
    else if (g.fight.state !== 'retreat') g.retreating = false;
  }
  // phages and Bdellovibrio, per player
  for (const P of roster) {
    const S = P.S;
    // --- a phage homing in ---
    if (P.phage && (!fightable(P) || !world.opts.phages || !world.hunt.phage || P.phage.p.stuck)) { P.phage.p.homing = false; P.phage = null; }
    if (!P.phage && fightable(P) && P.nearCloud && world.opts.phages && world.hunt.phage) {
      P.phageCool = (P.phageCool ?? 3) - dt;
      if (P.phageCool <= 0) {
        P.phageCool = 0.5;
        let best = null, bd = 18;
        for (const p of world.phages) { if (p.stuck || p.anim || p.homing) continue; const q = Math.hypot(p.x - S.x, p.y - S.y); if (q < bd) { bd = q; best = p; } }
        if (best) { P.phageCool = 6 + Math.random() * 5; best.homing = true; best.splay = 0; P.phage = { p: best, fight: createFight({ windup: 0.75, strike: 0.25, recoverT: 1, repelT: 1, retreatT: 2.5, facingRate: 0, blockHit: 1, biteHit: 1 }) }; }
      }
    }
    if (P.phage) {
      const { p, fight } = P.phage;
      const d = segTo(p.x, p.y, S) - S.sp.r;
      const f = fight.update(dt, { near: d < 22, inReach: d < 1.5, facing: P.blockT > 0, blocking: P.blockT > 0 });
      // the nearest point of your wall, and just outside it
      const ca = Math.cos(S.a), sa = Math.sin(S.a);
      const u = Math.max(-S.sp.L / 2, Math.min(S.sp.L / 2, (p.x - S.x) * ca + (p.y - S.y) * sa));
      const qx = S.x + ca * u, qy = S.y + sa * u, nl = Math.hypot(p.x - qx, p.y - qy) || 1;
      const nx = (p.x - qx) / nl, ny = (p.y - qy) / nl;
      p.dirA = Math.atan2(-ny, -nx);
      if (f.state === 'stalk') towards(p, { x: qx + nx * 1.0, y: qy + ny * 1.0 }, 32, dt, p);
      else if (f.state === 'windup') { p.x = qx + nx * (S.sp.r + 0.55); p.y = qy + ny * (S.sp.r + 0.55); p.splay = f.t; }
      else if (f.state === 'strike') { p.x = qx + nx * (S.sp.r + 0.55 * (1 - f.t)); p.y = qy + ny * (S.sp.r + 0.55 * (1 - f.t)); p.splay = 1; }
      else { towards(p, { x: p.x + nx * 5, y: p.y + ny * 5 }, 8, dt, p); p.splay *= Math.exp(-dt * 3); }
      if (f.hit && P.game.opts.shielded) {
        // the collective's slime catches it before it reaches your wall
        p.homing = false; p.splay = 0; p.x += nx * 2.5; p.y += ny * 2.5; P.phage = null;
        hud.toast(`${who(P)}The slime catches the phage: it cannot reach your wall`, 1600);
      } else if (f.hit) {
        const side = (p.x - S.x) * -sa + (p.y - S.y) * ca > 0 ? 1 : -1;
        const ph = { p, u, side, t: 0, irreversible: false, shed: false };
        p.stuck = ph; p.homing = false; S.phages.push(ph); P.phage = null;
        audio.play('bacterium/phage', { volume: 0.8 }); P.pad.rumble(80, 0.4, 0.1);
        hud.toast(`${who(P)}A phage has bound to your wall: sprint (${glyph('A')}) or tumble (${glyph('B')}) within 3 s to shake it off`, 2600);
      } else if (f.blocked || f.retreated || d > 26 || (P.sprintT > 0 && d < 3)) {
        if (f.blocked || P.sprintT > 0) hud.toast(`${who(P)}Shaken off: the phage's fibres let go`, 1500);
        p.homing = false; p.splay = 0; p.x += nx * 2; p.y += ny * 2; P.phage = null;
      }
    }
    // --- Bdellovibrio lining up to ram the magnetotactic cell ---
    if (P.bdello && (!fightable(P) || S.species !== 'mtb' || !world.opts.hunters || !world.hunt.bdello || S.attacker)) { P.bdello.c.stalking = null; P.bdello.c.cooldown = 6; P.bdello = null; }
    if (!P.bdello && fightable(P) && P.nearPack && S.species === 'mtb' && world.opts.hunters && world.hunt.bdello && !S.attacker) {
      P.bdelloCool = (P.bdelloCool ?? 2) - dt;
      if (P.bdelloCool <= 0) {
        P.bdelloCool = 0.5;
        // a dense collective draws them from further off (a dense prey colony suits Bdellovibrio)
        const C = coll.of(P);
        let best = null, bd = 30 + (C ? 2 * C.army : 0);
        for (const c of world.cells) { if (c.kind !== 'bdello' || c.dead || c.prey || c.hidden > 0 || c.cooldown > 0 || c.stalking) continue; const q = Math.hypot(c.x - S.x, c.y - S.y); if (q < bd) { bd = q; best = c; } }
        if (best) { P.bdelloCool = 3; best.stalking = P; best.cooldown = 99; P.bdello = { c: best, fight: createFight({ windup: 0.85, strike: 0.3, recoverT: 1.2, repelT: 1.3, retreatT: 4, facingRate: 0, blockHit: 0.5, biteHit: 0.4 }) }; }
      }
    }
    if (P.bdello) {
      const { c, fight } = P.bdello;
      const d = segTo(c.x, c.y, S) - S.sp.r;
      const f = fight.update(dt, { near: d < 32, inReach: d < 6, facing: P.blockT > 0, blocking: P.blockT > 0 });
      const to = Math.atan2(S.y - c.y, S.x - c.x);
      const off = { x: S.x - Math.cos(to) * (S.sp.L * 0.5 + 4.2), y: S.y - Math.sin(to) * (S.sp.L * 0.5 + 4.2) };
      c.tumble = 0;
      if (f.state === 'stalk') { towards(c, off, 85, dt, c); c.a = to; }
      else if (f.state === 'windup') { towards(c, off, 120, dt, c); c.a = to + Math.sin(t * 46) * 0.12 * f.t; c.flPhase += dt * 30; }
      else if (f.state === 'strike') { towards(c, S, 170, dt, c); c.a = to; }
      else if (f.state === 'retreat') { towards(c, { x: c.x - Math.cos(to) * 10, y: c.y - Math.sin(to) * 10 }, 90, dt, c); c.a = to + Math.PI; }
      else { towards(c, { x: c.x - Math.cos(to) * 4, y: c.y - Math.sin(to) * 4 }, f.state === 'repelled' ? 50 : 15, dt, c); c.a = to; }
      c.windup = f.state === 'windup' ? f.t : f.state === 'strike' ? 1 : 0;
      if (f.hit && d < 1.4 && P.game.opts.shielded) {
        c.stalking = null; c.cooldown = 6; c.windup = 0; P.bdello = null;
        hud.toast(`${who(P)}The ram glances off the slime round your army`, 1600);
      } else if (f.hit && d < 1.4 && absorbHit(P, 'bdello', c)) {
        c.stalking = null; c.cooldown = 8; c.windup = 0; P.bdello = null;
      } else if (f.hit && d < 1.4) {
        S.attacker = c; c.prey = { x: S.x, y: S.y, a: S.a, L: S.sp.L, isPlayer: true }; c.attachT = 0; S.attackT = 0; c.stalking = null; c.windup = 0; P.bdello = null;
        P.pad.rumble(300, 0.8, 0.8);
        hud.toast(`${who(P)}Bdellovibrio has rammed you! Sprint (${glyph('A')}) or tumble (${glyph('B')}) to shake it off`, 2600);
      } else if (f.blocked || f.retreated || d > 45 || (P.sprintT > 0 && d < 8 && fight.bitten())) {
        if (f.blocked) { P.pad.rumble(150, 0.5, 0.4); hud.toast(`${who(P)}Tumbled: the Bdellovibrio's ram misses`, 1500); }
        c.stalking = null; c.cooldown = 6; c.windup = 0; P.bdello = null;
      }
    }
  }
}

// --- the boss: Stentor, anchored by the host cell ---------------------------------
// The last gate (guards.js 'stentor'): its health is worn down by the army at
// its rim of membranelles (and by X's volleys, the toxin burst, a tumble free of
// its pull, a bump of its foot and every pull that comes up empty). Its
// patterns (shared/predation.js createFight, as the state machine only): the
// steady vortex, the pull (tell: membranelles speed up, the vortex brightens),
// and below half health a longer, harder pull. Anything inside the rim of its
// oral disc is swept in, and the host lies in its feeding current: only once
// it is beaten (it contracts and stays shut) does the host let you in.
stentor.fight = createFight({ windup: 1.4, strike: 0.9, recoverT: 2.4, repelT: 3.5, retreatT: 22, facingRate: 0, blockHit: 0, biteHit: 0, regain: 0 });
const BOSS_HIT = 6; // health taken by a tumble free of a pull, a foot bump or a wasted pull
const gaugeEl = document.createElement('div');
gaugeEl.style.cssText = 'position:fixed;left:50%;top:56px;transform:translateX(-50%);z-index:20;pointer-events:none;display:none;color:#e6d3a3;font:600 11px/1.2 system-ui,sans-serif;letter-spacing:.04em;text-align:center;text-shadow:0 1px 2px rgba(0,0,0,.7)';
gaugeEl.innerHTML = '<div class="nm"></div><div style="margin:3px auto 0;width:150px;height:5px;border:1px solid rgba(201,163,90,.85);border-radius:3px;background:rgba(20,16,8,.45)"><i style="display:block;height:100%;background:#c9a35a;border-radius:2px;width:100%"></i></div>';
document.body.appendChild(gaugeEl);
const bossInfo = { log: [], footT: 0 };
function runBoss(dt) {
  const B = stentor, M = B.mouth, G = guards.byId.stentor;
  const dist = (P) => Math.hypot(P.S.x - M.x, P.S.y - M.y);
  let nd = Infinity;
  for (const P of roster) if (fightable(P)) nd = Math.min(nd, dist(P));
  if (!B.placed) return;
  if (B.beaten) { B.update(dt, 'retreat', 1); return; }
  if (!B.awake && (nd < B.wakeR || bossInfo.force)) { B.awake = true; bossInfo.log.push({ ev: 'wake', t }); }
  if (!B.awake) { B.update(dt, 'stalk', 0); return; }
  const inVortex = (P) => fightable(P) && dist(P) < B.pullR;
  // a tumble just before or during the pull breaks free (the pull is long: the window is the whole pull)
  for (const P of roster) if (inVortex(P) && P.blockT > 0) P.vortexTumbleAt = P.tumbleAt;
  const blocking = roster.some((P) => P.vortexTumbleAt !== undefined && (B.fight.state === 'strike' ? P.vortexTumbleAt > (B.strikeAt ?? t) - 0.35 : P.blockT > 0));
  const f = B.fight.update(dt, { near: nd < B.wakeR, inReach: nd < B.pullR, facing: true, blocking });
  if (f.state === 'windup' && B.state !== 'windup') bossInfo.log.push({ ev: 'tell', t });
  if (f.state === 'strike' && !B.inStrike) { B.inStrike = true; B.strikeAt = t; B.strikeLoss = 0; bossInfo.log.push({ ev: 'pull', t }); }
  else if (f.state !== 'strike') B.inStrike = false;
  B.phase2 = G.hp < G.max * 0.5;
  let caught = false;
  for (const P of roster) {
    if (!fightable(P)) continue;
    // inside its oral disc's rim you are swept in, faster the harder it pulls (members first, collective.js)
    P.sweptT = B.disc(P.S.x, P.S.y).rho < 1 ? (P.sweptT || 0) + dt * B.flowK * 0.35 : 0;
    if (P.sweptT > 1) { P.sweptT = 0; const ev = {}; P.game.catchBy('stentor', B, ev); if (ev.caught) { startCatch(P, ev.caught); caught = true; bossInfo.log.push({ ev: 'catch', slot: P.slot, t }); } }
    // a tumble at the pull breaks you free of it: a kick out of the vortex
    if (B.fight.state === 'strike' && inVortex(P) && P.tumbleAt > (B.strikeAt ?? t) - 0.35 && P.kickedAt !== B.strikeAt) { P.kickedAt = B.strikeAt; P.kickT = 0.7; P.kickFrom = M; }
    // bumping its foot: it contracts in a flash and pauses
    if (Math.hypot(P.S.x - B.foot.x, P.S.y - B.foot.y) < 9 && bossInfo.footT <= 0) {
      bossInfo.footT = 4; B.fight.bitten(); guards.hurt(G, BOSS_HIT); bossInfo.log.push({ ev: 'foot', slot: P.slot, t });
      P.pad.rumble(200, 0.6, 0.6);
      hud.toast('You bumped its foot: Stentor contracts in a flash and pauses', 2000);
    }
  }
  bossInfo.footT = Math.max(0, bossInfo.footT - dt);
  if (f.blocked) {
    for (const P of roster) if (P.vortexTumbleAt > (B.strikeAt ?? t) - 0.35 && !(P.kickT > 0)) { P.kickT = 0.6; P.kickFrom = M; }
    guards.hurt(G, BOSS_HIT);
    bossInfo.log.push({ ev: 'blocked', t });
    hud.toast('Tumbled free of the pull!', 1500);
  }
  if (f.hit && !caught) { bossInfo.log.push({ ev: 'miss', t }); guards.hurt(G, BOSS_HIT); }
  B.fightT = f.t;
  B.update(dt, B.fight.state, f.t);
  // below half health: a longer, harder pull
  if (B.phase2 && B.fight.state === 'strike') B.flowK = Math.max(B.flowK, 6.5);
}
/** The enemy gauge: the nearest gate your flock is fighting, its health as a brass bar. */
function gauge() {
  const f = focusOf(P1);
  const q = guards.nearest(f.x, f.y);
  gaugeEl.style.display = q ? 'block' : 'none';
  if (!q) return;
  const B = stentor;
  const name = q.kind === 'stentor' ? `Stentor${B.phase2 ? ' · straining' : ''}` : q.kind === 'bdello' ? `Bdellovibrio pack · ${guards.list[1] && world.cells.filter((c) => c.kind === 'bdello' && c.home && !c.dead).length} left` : q.kind === 'phage' ? 'Phage cloud' : q.kind === 'amoeba' ? 'Amoeba' : 'Peritrich';
  gaugeEl.querySelector('.nm').textContent = `${name}${q.contact ? ` · ${q.contact} fighting` : ''}`;
  gaugeEl.querySelector('i').style.width = `${Math.round(Math.max(0, q.hp / q.max) * 100)}%`;
}

// --- rendering ---
const optics = createLightOptics(renderer);
// A/B switches for measurements (README "Performance"): ?psfdown=0 keeps the PSF at full
// resolution; ?rects=0 renders each split view over the whole screen as before
const devQ = new URLSearchParams(location.search);
if (devQ.get('psfdown') === '0') optics.toggles.down = false;
const useRects = devQ.get('rects') !== '0';
const FLOCK_N = Math.max(0, Math.min(COLL.max, +(devQ.get('flock') || 0)));
const shapes = createShapes(6000);
// the portal's golden glow (shared/portal.js), drawn over each view after the optics: its ground
// plane turned to face the microscope, so the pool is a disc of light round the host and the glints
// twinkle toward you; and its light spilling in from the screen's edge while it is out of view
const glowScene = new THREE.Scene();
const glowCam = new THREE.OrthographicCamera(-1, 1, 1, -1, -200, 200);
glowCam.position.set(0, 0, 100);
const glow = createPortalGlow({ THREE, scene: glowScene, size: 9, count: 56, intensity: 1.1, beam: 0, pixelHeight: () => renderer.getDrawingBufferSize(_b).y });
glow.group.rotation.x = Math.PI / 2;
glow.setOpen(false);
const portalGlow = { x: 1e6, y: 1e6, place(x, y) { this.x = x; this.y = y; glow.setPosition(x, y, 0); }, burst: () => glow.burst(), get open() { return glow.open; } };
portalGlow.place(1e6, 1e6);
const portalLight = createPortalLight({ zIndex: 3 });
// The next world's creature, glimpsed at the portal: one of the phages landed on
// the host (world.js F.phages[0], true size, 0.23 µm), marked by a small gold
// star glint (the super-gene gold the phage carries in its own world), so the
// eye and the continuous transition's camera have something to go to.
const PHAGE_LEN = 0.23; // µm: a T4-like phage, head and tail (phage/main.js: ~23 units of 10 nm)
const glimpse = createGlint({ THREE, size: 70, intensity: 1.1, pixelHeight: () => renderer.getDrawingBufferSize(_b).y });
glowScene.add(glimpse.points);
// the glow's brightness (one uniform shared by its parts): it fades as the field closes in on the phage
const glowUI = (() => { let u = null; glow.group.traverse((o) => { if (!u && o.material && o.material.uniforms && o.material.uniforms.uI) u = o.material.uniforms.uI; }); return u; })();
const GLOW_I = glowUI ? glowUI.value : 1;
/** The glimpsed phage: its centre on the host's wall and its heading (outward). */
function glimpsePhage() {
  const F = world.landmarks.forward, q = F.phages[0], ca = Math.cos(F.a), sa = Math.sin(F.a);
  const nx = -sa * q.side, ny = ca * q.side, off = F.r + 0.12 + PHAGE_LEN * 0.4;
  return { x: F.x + ca * q.u + nx * off, y: F.y + sa * q.u + ny * off, a: Math.atan2(ny, nx) };
}
const overlay = createOverlay();
const looks = createBorrowedLooks(renderer);
// split screen: in a 2D field the view is drawn around a centre; each view is
// rendered to the screen and captured (the optics end on the screen)
/** The split layout without degenerate (empty) regions, for shared/landmark.js. */
const arrowSplit = () => { const L = split.layout; return { layout: { ...L, regions: L.regions.filter((r) => r.polygon.length > 2) }, project: split.project }; };
const split = createSplitScreen(renderer, { capture: true });
const marks = createLandmarks({ zIndex: 4 });

// Delivered art (null until delivered; the ids may not be in the list yet).
const safeTexture = (id) => { try { return loadTexture(id, { srgb: false }); } catch { return Promise.resolve(null); } };
const plates = { phase: null };
safeTexture('MP-B01').then((t) => { if (t) plates.phase = t; });
safeTexture('MP-B02').then((t) => { if (t) shapes.setTextures({ bio: t }); });
safeTexture('MP-B03').then((t) => { if (t) shapes.setTextures({ cil: t }); });
safeTexture('MP-B04').then((t) => { if (t) shapes.setTextures({ mag: t }); });

const ZOOMS = [180, 90, 45, 22]; // field height in µm: the eyepiece field at 1000×, then camera crops
/** The field shown: being eaten (alone), the camera pulls back to watch the predator, then follows it. */
const zoomIdx = () => (!multi() && P1.capture.active && P1.cat.realPhase && /eat|follow|fade/.test(P1.cat.realPhase) ? Math.min(view.zoom, 1) : view.zoom);
const view = { mark: true, zoom: 2, cx: 0, cy: 30, stage: new THREE.Vector2(), focus: 0, look: 'phase', overlay: false, stop: true, focusFollows: true };

const gl = renderer.getContext();
const soft = /SwiftShader|llvmpipe|Software/i.test(String(gl.getParameter(gl.RENDERER)) + (gl.getExtension('WEBGL_debug_renderer_info') ? gl.getParameter(0x9246) : ''));
const softScale = soft ? 0.5 : 1;
// The quality governor (shared/quality.js): the canvas pixel ratio (min(DPR, 1.25) alone, 1 while
// split) and a render scale for the optics' buffers (its step × the split factor: 0.7 at 2 views,
// 0.55 at 3-4, so a split frame costs about one view). The image is formed at that scale and the
// last pass draws it to the full canvas.
const quality = createQuality({ key: 'bacterium', min: 0.5, max: 1, onChange: () => resize() });
const _b = new THREE.Vector2();
function resize() {
  // CSS size with a pixel ratio, so the split screen and the edge arrows work in CSS px
  const pr = quality.pixelRatio * softScale;
  if (renderer.getPixelRatio() !== pr) renderer.setPixelRatio(pr);
  renderer.setSize(innerWidth, innerHeight, false);
  const b = renderer.getDrawingBufferSize(_b);
  const k = quality.scale;
  optics.resize(Math.max(2, Math.round(b.x * k)), Math.max(2, Math.round(b.y * k)));
}
addEventListener('resize', resize);
resize();

// --- features ---
const features = createFeatures({ key: 'bacterium', pad });
quality.addToFeatures(features);
const audio = createAudio(['bacterium/amb-sediment', 'bacterium/run', 'bacterium/tumble', 'bacterium/sprint', 'bacterium/eat', 'bacterium/phage', 'bacterium/graze', 'shared/portal-chime']);
audio.addToFeatures(features);
audio.loop('bacterium/amb-sediment', { volume: 0.6 });
const runLoop = audio.loop('bacterium/run', { volume: 0 });
const snd = { t: 0, lastEat: -9, feeding: false, lastPhage: -9 };
/** Gamepads fire no DOM events: unlock sound on any pad button. */
function unlockOnPad() {
  if (pad.kind !== 'controller') return;
  for (let b = 0; b < 16; b++) if (pad.value(b) > 0.5) { audio.unlock(); return; }
}
const SPECIES_NAMES = { mtb: SPECIES.mtb.name, bdello: SPECIES.bdello.name };
features.add({ id: 'species', group: 'Body', label: 'Protagonist', choices: [SPECIES_NAMES.mtb, SPECIES_NAMES.bdello], value: SPECIES_NAMES.mtb,
  about: 'Magnetospirillum: a 3 µm helical cell with a chain of magnetite magnetosomes and a flagellum at each pole; it seeks the microaerobic band. Bdellovibrio: a 1 µm curved rod with one sheathed polar flagellum that rams Gram-negative prey, bores into the periplasm and grows inside the rounded "bdelloplast".',
  onChange: (v) => setSpecies(v === SPECIES_NAMES.bdello ? 'bdello' : 'mtb') });
const LOOK_CYCLE = ['phase', 'fluorescence', 'darkfield', 'sem', 'dic'];
const LOOK_LABEL = { phase: 'Phase contrast', fluorescence: 'Fluorescence', darkfield: 'Darkfield' };
features.add({ id: 'look', group: 'Optics', label: 'Microscope look (D-pad ←→)', choices: Object.values(LOOK_LABEL), value: LOOK_LABEL.phase,
  about: 'Phase contrast (Ph3, 100× oil): cells dark with bright halos; flagella (20 nm) and phages (60 nm) are invisible, as they really are. Fluorescence: three stains shown in pseudo-colour on black (membranes FM 4-64 magenta, flagella Alexa 488 maleimide green, magnetosome chain MamC-GFP shown blue, phages SYBR green). Darkfield: high-intensity darkfield, which does show flagellar bundles (Macnab 1976).',
  onChange: (v) => { view.look = Object.keys(LOOK_LABEL).find((k) => LOOK_LABEL[k] === v) || 'phase'; } });
features.add({ id: 'psf', group: 'Optics', label: 'Diffraction limit (point spread)', on: true,
  about: `Every image is blurred by a Gaussian of σ = 0.21 λ/NA = ${(psfSigmaUm() * 1000).toFixed(0)} nm (FWHM ≈ 0.21 µm at NA 1.3). Zooming the camera past the eyepiece field is empty magnification: softer, never more detailed. Off: an impossible perfect lens.`,
  onChange: (on) => { optics.toggles.psf = on; } });
features.add({ id: 'halo', group: 'Optics', label: 'Phase halo', on: true, about: 'The phase ring leaks low spatial frequencies back: φ − 0.75·blur(φ), so cells get bright halos and big objects lighter centres. Off: an ideal phase plate.', onChange: (on) => { optics.toggles.halo = on; } });
features.add({ id: 'focus', group: 'Optics', label: 'Depth of field ≈ 0.4 µm, fine focus (LT/RT)', on: true,
  about: 'At NA 1.3 only a slice about 0.4 µm thick is sharp. Things above or below are drawn wider and fainter with their total kept. On: focus drifts back to your cell when the triggers are released. Off: focus stays where you leave it.',
  onChange: (on) => { view.focusFollows = on; } });
features.add({ id: 'plate', group: 'Optics', label: 'Out-of-focus background', on: true, about: 'Bacteria and silt far below the focal plane as a soft mottle (the MP-B01 plate when delivered, procedural until then).', onChange: (on) => { optics.toggles.plate = on; } });
features.add({ id: 'noise', group: 'Optics', label: 'Camera shot noise', on: true, about: 'Per-frame sensor noise; in fluorescence it grows with the square root of the signal.', onChange: (on) => { optics.toggles.noise = on; } });
features.add({ id: 'stop', group: 'Optics', label: 'Eyepiece field stop', on: true, about: 'At 180 µm (the whole field of a 100× objective with an FN 18 eyepiece) the round field stop shows. Smaller fields are camera crops.', onChange: (on) => { view.stop = on; } });
features.add({ id: 'chMemb', group: 'Optics', label: 'Stain: membranes (FM 4-64)', on: true, about: 'A lipophilic dye in the membranes of every cell, brighter at the rim. Fluorescence look only.', onChange: (on) => { drawer.chan.memb = on ? 1 : 0; } });
features.add({ id: 'chFlag', group: 'Optics', label: 'Stain: flagella (Alexa 488 maleimide)', on: true, about: 'Flagellin with a cysteine added, labelled with a maleimide dye: how Turner, Ryu and Berg filmed bundles forming and flying apart in tumbles.', onChange: (on) => { drawer.chan.flag = on ? 1 : 0; } });
features.add({ id: 'chMag', group: 'Optics', label: 'Stain: magnetosome chain (MamC-GFP)', on: true, about: 'A fluorescent protein fused to a magnetosome membrane protein: a line down the middle of the cell. Shown in blue so it reads apart from the flagella (pseudo-colour).', onChange: (on) => { drawer.chan.mag = on ? 1 : 0; } });
features.add({ id: 'chPhage', group: 'Optics', label: 'Stain: phages (SYBR Gold)', on: true, about: 'A nucleic-acid stain makes each 60 nm phage a diffraction-limited spot: the standard way to count viruses in pond water. Without it, no light microscope shows them.', onChange: (on) => { drawer.chan.phage = on ? 1 : 0; } });
features.add({ id: 'overlay', group: 'Optics', label: 'Data overlay (Y)', on: false,
  about: 'Food contours, the field lines and the grazers\' currents, and the magnetosome chain picked out. Marked on screen as data, not optics.',
  onChange: (on) => { view.overlay = on; tag.classList.toggle('show', on); } });
features.add({ id: 'mark', group: 'Optics', label: 'Mark your cell', on: true, about: 'Corner brackets round your cell (a game marker, not optics): at 1000× you are one small grey rod among many.', onChange: (on) => { view.mark = on; } });
features.add({ id: 'collective', group: 'Body', label: 'Your army: a flock of kin (X calls them)', on: true,
  about: 'X sends a beacon from the middle of your flock (an autoinducer pulse, drawn so it shows: a departure, they are invisible small molecules). Kin it reaches (your own species, wandering in the meadow by the start and in the breaks between the gates) answer with their own small pulse, one after another, and join. They never join by themselves. X also lyses prey rods in reach of any member, and each one feeds a member toward dividing, so the army grows. The flock: you steer it (the stick sets its heading and speed); every member follows by its own rules, with its own top speed, turn rate, reaction lag and wander, so the front moves first and the rest catch up, overshoot and turn back. Members are your health (a predator takes one in your place). Army size gates the slime shield (5: phages stick in it), the raft (8: currents drag you less, the bigger it is) and the toxin (12: it charges; Y or LS click fires it). Together: touch another player\'s flock to join it (sticks blend); move away to leave: past 20 µm the army splits evenly. Real basis: quorum sensing, swarming rafts, multicellular magnetotactic prokaryotes, contact killing. Departures: a player steers the group, kin answering one by one, members die in your place.',
  onChange: (on) => { collFeature.on = on; coll.opts.on = on && S.species === 'mtb'; coll.reset(roster); } });
features.add({ id: 'shapes', group: 'Rendering', label: 'Instanced 2D distance-field specimen', fixed: true,
  about: 'Every cell, filament, phage, grain and giant-cell edge is a quad whose fragment shader computes its true cross-section chord (2√(r²−d²)) and adds optical path, scatter, stain and absorbance into float buffers. Sub-pixel parts are widened with their total kept.' });
features.add({ id: 'field', group: 'Rendering', label: 'Shared optical field', fixed: true, about: 'The buffers are adapters.js\'s optical field plus a fluorescence attachment, so the borrowed looks read the same specimen.' });
// Motion
const STEER_MODES = ['Steer: the cell follows the stick', 'Tumble bias only: the stick leans each tumble', 'Honest: no steering'];
features.add({ id: 'bias', group: 'Motion', label: 'LS steering', choices: STEER_MODES, value: STEER_MODES[0],
  about: 'A real bacterium cannot steer: it runs, and chooses only WHEN to tumble. Steer (a labelled game assist, the default): while the stick is held the body turns toward it, fast but not instantly (up to ~5 rad/s), and swims at a speed set by the tilt; rotational and translational Brownian motion are cut to about a third and a half but still show, and the magnetic torque still pulls (gently) toward the field line. Let go and the cell keeps running at cruise speed wherever Brownian motion, the flow, the grazers\' currents and the field turn it. Tumble bias only: the stick does nothing but lean each tumble (B): eight angles from the real distribution, the nearest kept. Honest: no steering at all; the stick does nothing.',
  onChange: (v) => { swimmer.opts.steer = v === STEER_MODES[0]; swimmer.opts.bias = v !== STEER_MODES[2]; } });
features.add({ id: 'spont', group: 'Motion', label: 'Spontaneous tumbles', choices: ['Off: you are the chemotaxis network', 'Real motor clock'], value: 'Off: you are the chemotaxis network',
  about: 'Real motors switch on their own (E. coli about once a second). With the clock on, tumbles come by themselves and are suppressed while things are getting better, as the Che network does: chemotaxis without a pilot.',
  onChange: (v) => { swimmer.opts.spontaneous = v.startsWith('Real'); } });
features.add({ id: 'rotdiff', group: 'Motion', label: 'Rotational Brownian motion', on: true, about: 'Runs are not straight: D_r ≈ 0.15 rad²/s for the spirillum, 0.6 for tiny Bdellovibrio, so the small cell loses its heading within a second.', onChange: (on) => { swimmer.opts.rotDiff = on; } });
features.add({ id: 'brown', group: 'Motion', label: 'Translational Brownian motion', on: true, about: 'Everything jitters: D ≈ 0.25 µm²/s for you, ~4 µm²/s for a phage, 0.2/r µm²/s for clay specks. Visible at this magnification.', onChange: (on) => { swimmer.opts.brownian = on; world.opts.brownian = on; } });
features.add({ id: 'lowre', group: 'Motion', label: 'Low Reynolds number (no coasting)', on: true, about: 'At Re ≈ 10⁻⁵ a bacterium coasts about a tenth of a nanometre when its motor stops. Off: a one-second glide, physically wrong, for comparison.', onChange: (on) => { swimmer.opts.lowRe = on; } });
features.add({ id: 'beat', group: 'Motion', label: 'Flagellar rotation shown', choices: ['Slowed (readable)', 'Faster (aliases)'], value: 'Slowed (readable)',
  about: 'Real flagella turn at 100–300 Hz (the sheathed Bdellovibrio one perhaps faster): far beyond a 60 Hz display. Slowed so the helix can be followed.', onChange: (v) => { drawer.opts.slowBeat = v.startsWith('Slowed'); swimmer.opts.beat = v.startsWith('Slowed') ? 1 : 5; } });
features.add({ id: 'flagella', group: 'Body', label: 'Flagella', on: true, about: 'Spirillum: one flagellum at each pole. Bdellovibrio: one sheathed polar flagellum, shed when it enters prey. E. coli-like rods: a bundle behind in a run, splayed in a tumble.', onChange: (on) => { drawer.opts.flagella = on; } });
features.add({ id: 'pattern', group: 'Body', label: 'How each cell turns', fixed: true,
  about: 'E. coli-like rods tumble (mean 68°). Bdellovibrio, a polar flagellate, reverses and flicks (the Vibrio pattern). Magnetospirillum mostly reverses; its tumble (B) is a labelled stop-and-turn drawn from the E. coli angles.' });
// Simulation
features.add({ id: 'bfield', group: 'Simulation', label: 'Magnetic field at the slide', choices: ['Earth (20 µT horizontal)', 'Bar magnet (200 µT)', 'Cancelled (0 µT)'], value: 'Earth (20 µT horizontal)',
  about: 'The magnetosome chain\'s moment (~10⁻¹⁵ A·m²) feels a torque m×B: mB/kT ≈ 5 in the Earth\'s horizontal field, so the cell lines up within a second or two. North points into the sediment, as the field\'s downward dip does in the Northern Hemisphere. Cancel it and the magnetotactic cell is as lost as any other.',
  onChange: (v) => { world.opts.field = v.startsWith('Earth') ? 20 : v.startsWith('Bar') ? 200 : 0; } });
features.add({ id: 'grazers', group: 'World', label: 'Peritrich grazers', on: true, about: 'Two Vorticella-like bells on stalks, oral cilia beating a feeding current (a sink, ~60 µm/s at 16 µm, faster than you near the funnel). Touch the bell and it may contract on its stalk.', onChange: (on) => { world.opts.grazers = on; } });
features.add({ id: 'amoeba', group: 'World', label: 'Amoeba edge', on: true, about: 'The leading edge of a giant amoeba creeps toward you at ~1.4 µm/s: easy to outswim, deadly to anything parked while feeding.', onChange: (on) => { world.opts.amoeba = on; } });
features.add({ id: 'phages', group: 'World', label: 'Phages', on: true, about: 'Tail-first adsorption is reversible for a few seconds here (much longer in life), then irreversible; then the DNA goes in. Dashing shears loosely bound phages off (a labelled stretch).', onChange: (on) => { world.opts.phages = on; } });
features.add({ id: 'hunters', group: 'World', label: 'Bdellovibrio hunters', on: true, about: 'Three predators hunting Gram-negative prey, making bdelloplasts. One may hit you: dash or tumble at once to shake it off before it bores in.', onChange: (on) => { world.opts.hunters = on; } });
features.add({ id: 'gates', group: 'World', label: 'The way: gates in a rhythm', fixed: true,
  about: 'The meadow by the start, full of kin and prey, then a gate every ~95 µm with a calm break between (a few kin and prey to top up the army): a peritrich, a Bdellovibrio pack, a phage cloud, an amoeba\'s edge, a bigger peritrich, and Stentor at the host. Each is fought by contact: every cell of your army touching it wears it down while it recovers, so a lone cell gets nowhere and an army wins. Beaten, it stays beaten. No timers.' });
features.add({ id: 'npc', group: 'World', label: 'Other bacteria swim', on: true, about: 'E. coli-like rods (your prey) run and tumble at 18–28 µm/s; Bdellovibrio hunt them. Off: everything sits still (Brownian only).', onChange: (on) => { world.opts.npcRun = on; } });
features.add({ id: 'scenery', group: 'World', label: 'Biofilm, EPS, clay, detritus', fixed: true, about: 'An EPS-rich biofilm of attached rods and cocci over clay and silt grains larger than you; matrix strands; decaying detritus flakes at the heart of each food patch.' });
features.add({ id: 'pad', group: 'Controls', label: 'Shared control scheme', fixed: true, about: 'LS steer the flock (released: it slows and stops), RS stage, A sprint, X beacon + eat + strike (Bdellovibrio: attach), B tumble, Y toxin burst (or data), LT/RT focus, LB/RB reverse, D-pad ←→ look, ↑↓ field, Menu features, View panel.' });
// Borrowed (default off), also reachable from the look cycle.
const borrow = borrowedSwitches(features);
const bmode = { dic: 0 };
borrow.add({ id: 'semMite', label: 'SEM (scanning electron microscope)', from: 'mite',
  about: 'The specimen\'s height buffer handed to the mite\'s secondary-electron composite. The SEM resolves nanometres, so here flagella would show in life only in fixed, dried, coated samples; nothing in an SEM swims.' });
features.add({ id: 'semMiteMode', group: 'Borrowed', label: 'SEM detector', from: 'mite', choices: SEM_LOOKS, value: SEM_LOOKS[0], about: 'SE, BSE or false colour.', onChange: (v) => looks.semMode(SEM_LOOKS.indexOf(v)) });
borrow.add({ id: 'dicTardigrade', label: 'Tardigrade DIC (Nomarski)', from: 'tardigrade',
  about: 'The optical path, after the diffraction blur, handed to the tardigrade\'s interference model. Path differences are scaled ×6 so 0.03 µm bacteria show (its constants are tuned for animals).' });
features.add({ id: 'dicMode', group: 'Borrowed', label: 'Tardigrade look', from: 'tardigrade', choices: DIC_MODES, value: DIC_MODES[0], about: 'DIC or its brightfield.', onChange: (v) => (bmode.dic = DIC_MODES.indexOf(v)) });
features.add({ id: 'sdfNote', group: 'Borrowed', label: 'Bodies from distance fields', from: 'shared sdf.js', fixed: true, about: 'The same idea as shared/sdf.js (bodies from capsules and tubes), done per pixel in 2D: a 3 µm cell flat in a 0.4 µm focal slice needs no 3D mesh.' });

function currentLookKey() { return borrow.id === 'semMite' ? 'sem' : borrow.id === 'dicTardigrade' ? 'dic' : view.look; }
function cycleLook(dir) {
  const i = LOOK_CYCLE.indexOf(currentLookKey());
  const next = LOOK_CYCLE[(i + dir + LOOK_CYCLE.length) % LOOK_CYCLE.length];
  if (next === 'sem') features.set('semMite', true);
  else if (next === 'dic') features.set('dicTardigrade', true);
  else { if (borrow.id) features.set(borrow.id, false); features.set('look', LOOK_LABEL[next]); }
  const name = { phase: LOOK_NAMES.phase, fluorescence: LOOK_NAMES.fluorescence, darkfield: LOOK_NAMES.darkfield, sem: 'SEM (borrowed from the mite): an electron microscope, not a live view', dic: 'DIC (borrowed from the tardigrade)' }[next];
  hud.toast(name);
}

function setSpecies(sp) {
  for (const P of roster) {
    if (P.capture.active) P.capture.reset(false);
    P.swimmer.reset(sp);
    P.dash = dashFor(sp);
    P.cat.kind = null; P.eatenFor = 0;
    if (P !== P1) placeNear(P, P1);
  }
  resetPressure();
  coll.opts.on = sp === 'mtb' && collFeature.on;
  coll.reset(roster);
  view.zoom = ZOOMS.indexOf(SPECIES[sp].view);
  view.cx = S.x; view.cy = S.y;
  card.classList.remove('show');
  hud.toast(sp === 'mtb' ? `Gather an army: press ${glyph('X')} near kin (the spirilla like you) and they answer and join. Then head out, any way you like` : `Bdellovibrio: ram and bore into ${GOAL_PREY} Gram-negative prey (${glyph('X')} when touching)`, 3600);
}

// --- the landmarks: forward (the host with phages: the portal) and the backdoor (the Paramecium) ---
function landmark(kind, P) {
  lm.log.push({ kind, slot: P ? P.slot : 0, t });
  embed.landmark(kind, { player: P ? P.slot : 0 });
}

// --- the director, each step (see `director` above) ---
// What every view sees: one rectangle per split view (the field drawn round its centre), as four
// planes on the director's ground plane (its z is our y).
const dirViews = [0, 1, 2, 3].map(() => ({ frustum: [[1, 0, 0, 0], [-1, 0, 0, 0], [0, 0, 1, 0], [0, 0, -1, 0]], focus: { x: 0, y: 0, z: 0 } }));
function directorViews() {
  const fieldH = ZOOMS[zoomIdx()], fw = (fieldH * innerWidth) / Math.max(1, innerHeight), pad = 6;
  const cx = view.cx + view.stage.x, cy = view.cy + view.stage.y;
  const offs = split.views && split.views.length ? split.views.map((v) => v.offset) : [{ x: 0, y: 0 }];
  const out = [];
  for (let i = 0; i < offs.length && i < 4; i++) {
    const v = dirViews[i], x = cx + offs[i].x, y = cy + offs[i].y, F = v.frustum;
    F[0][3] = -(x - fw / 2 - pad); F[1][3] = x + fw / 2 + pad; F[2][3] = -(y - fieldH / 2 - pad); F[3][3] = y + fieldH / 2 + pad;
    v.focus.x = x; v.focus.z = y;
    out.push(v);
  }
  return out;
}
function stepDirector(dt) {
  if (outro) return;
  const ps = roster.filter((P) => !P.waiting).map((P) => { const f = focusOf(P); return { id: P.slot, x: f.x, z: f.y, alive: P.S.alive && !P.capture.active }; });
  director.update(dt, ps, directorViews());
  driftGate(dt);
  keepAmbient(dt);
}
/**
 * A gate placed beyond a lingering player's reach comes over to them (behaviour, not a placement): after
 * DRIFT_WAIT s of the leader staying put, the gate's whole assembly drifts toward them at DRIFT µm/s
 * until its zone reaches them (the pack and the cloud swim and drift; the amoeba creeps; a peritrich's
 * clay grain is carried on a slow current, a labelled departure). Seen space may change by behaviour.
 */
function driftGate(dt) {
  const e = ENCOUNTERS[director.index], q = e && guards.byId[e.id];
  const L = director.leader, P = leaderP();
  drift.idle = L && !L.moving ? drift.idle + dt : 0;
  if (!q || !q.placed || q.beaten || q.engaged || !P || drift.idle < DRIFT_WAIT) return;
  const S = director.entry(e.id);
  if (!S || S.state !== 'placed' || director.state().t - S.placedT < DRIFT_WAIT) return;
  const f = focusOf(P), c = guards.centre(q), dx = f.x - c.x, dy = f.y - c.y, d = Math.hypot(dx, dy);
  if (d < q.zone) return;
  const k = Math.min(d - q.zone + 1, DRIFT * dt) / d;
  guards.shift(q, dx * k, dy * k);
}
/**
 * Kin and prey are ambient and plentiful everywhere: every few tenths of a second each player gets free
 * kin and prey rods kept within KEEP.r of them (more kin while their army is short of the next gate's
 * need), brought from the parked ones (lysed rods, kin lost in battle) or from free ones far from every
 * player, and only from water nobody has seen to water nobody has seen, out of every view, ahead of the
 * flock where it is moving. What a player has seen keeps the kin and prey it had.
 */
const unseenSpot = (x, y) => world.inWater(x, y, 2) && !director.seenAt(x, y) && !director.visibleNow(x, 0, y, 4);
function keepAmbient(dt) {
  if ((keepT.t -= dt) > 0) return;
  keepT.t = KEEP.every;
  const live = roster.filter((P) => !P.waiting && P.S.alive);
  if (!live.length) return;
  const fs = live.map((P) => focusOf(P));
  const farFromAll = (x, y) => fs.every((f) => Math.abs(f.x - x) > KEEP.far || Math.abs(f.y - y) > KEEP.far);
  const need = nextNeed();
  live.forEach((P, i) => {
    const f = fs[i], C = coll.of(P);
    const hx = C && C.speed > 6 ? C.vx / C.speed : null, hy = C && C.speed > 6 ? C.vy / C.speed : null;
    const spot = () => {
      for (let k = 0; k < 12; k++) {
        const a = hx !== null ? Math.atan2(hy, hx) + (Math.random() - 0.5) * 2.4 : Math.random() * Math.PI * 2, d = 55 + Math.random() * (KEEP.r - 55);
        const x = f.x + Math.cos(a) * d, y = f.y + Math.sin(a) * d;
        if (unseenSpot(x, y) && !world.pushOutOfGrains({ x, y }, 1)) return { x, y };
      }
      return null;
    };
    const near = (x, y) => Math.abs(x - f.x) < KEEP.r && Math.abs(y - f.y) < KEEP.r && (x - f.x) ** 2 + (y - f.y) ** 2 < KEEP.r * KEEP.r;
    // kin
    if (coll.opts.on) {
      let n = 0;
      for (const k of coll.kin) if (coll.isFree(k) && near(k.x, k.y)) n++;
      const want = armyOf(P) < need ? KEEP.kinShort : KEEP.kin;
      for (let m = 0; m < KEEP.moves && n < want; m++) {
        const k = coll.kin.find((q) => q.parked && !q.coll && !q.dying) || coll.kin.find((q) => coll.isFree(q) && farFromAll(q.x, q.y) && unseenSpot(q.x, q.y));
        const at = k && spot();
        if (!at) break;
        coll.putFree(k, at.x, at.y); k.zone = 1; n++;
      }
    }
    // prey rods
    let n = 0;
    for (const c of world.cells) if (c.kind === 'rod' && !c.parked && !c.lysed && near(c.x, c.y)) n++;
    for (let m = 0; m < KEEP.moves && n < KEEP.prey; m++) {
      const c = world.cells.find((q) => q.kind === 'rod' && q.parked) || world.cells.find((q) => q.kind === 'rod' && q.zone === 1 && !q.lysed && !q.attachedBy && !q.bdelloplast && farFromAll(q.x, q.y) && unseenSpot(q.x, q.y));
      const at = c && spot();
      if (!at) break;
      c.x = at.x; c.y = at.y; c.parked = false; c.zone = 1; c.stopped = 0; n++;
    }
  });
}
/** A new game: nothing placed yet (the director starts over; every gate parked), no portal. */
function resetEncounters() {
  director.reset();
  for (const q of guards.list) if (q.kind !== 'stentor') guards.park(q);
  clearPortal();
  drift.idle = 0; keepT.t = 0;
}
/** Put the host cell (the portal) at (x, y), met coming along bearing a, with Stentor guarding it beyond. */
function placePortal(x, y, a) {
  const p = { x, y };
  world.setPortal(p.x, p.y, a);
  // clear the host's water: any clay grain within 30 µm of it is moved off (unseen: the director places the
  // portal only where every cell within ~95 µm of the host is unseen, world.js portalParts)
  world.clearHostWater(p.x, p.y, stentorGrain);
  FWD.x = p.x; FWD.y = p.y;
  stentor.place(p.x, p.y, a);
  { const fx = stentor.foot.x - stentor.mouth.x, fy = stentor.foot.y - stentor.mouth.y, fl = Math.hypot(fx, fy); stentorGrain.x = stentor.foot.x + (fx / fl) * 10; stentorGrain.y = stentor.foot.y + (fy / fl) * 10; }
  portalGlow.place(p.x, p.y);
  lm.turned = false; lm.hinted = false;
}
function clearPortal() {
  world.landmarks.forward.placed = false;
  stentor.placed = false; stentorGrain.x = 1e6;
  portalGlow.place(1e6, 1e6);
}
/** Is the portal guarded? Stentor guards it until your army beats it. */
const guarded = () => !stentor.beaten;
function landmarkTick(dt) {
  const F = LMK.forward;
  let at = null, close = false, dmin = Infinity;
  for (const P of roster) {
    if (!P.S.alive) { P.backT = 0; continue; }
    P.backT = Math.hypot(P.S.x - BACK.x, P.S.y - BACK.y) < LMK.back.r ? P.backT + dt : 0;
    if (!F.placed) continue;
    const [d] = segDist(P.S.x, P.S.y, F.x, F.y, F.a, F.L);
    dmin = Math.min(dmin, d);
    if (d < F.r + P.S.sp.r + F.reach + 1.5) at = at || P;
    if (d < 14) close = true;
    // or any member of the player's flock
    const C = coll.opts.on && coll.of(P);
    if (C && C.members.length && Math.abs(C.cx - F.x) < C.extent + 16 && Math.abs(C.cy - F.y) < C.extent + 16) {
      for (const m of C.members) { const [e] = segDist(m.x, m.y, F.x, F.y, F.a, F.L); if (e < F.r + m.r + F.reach + 1.5) { at = at || P; close = true; break; } if (e < 14) close = true; }
    }
  }
  if (F.placed) {
    if (!lm.hinted && dmin < 160) { lm.hinted = true; }
    const nearing = dmin < 120;
    if (nearing !== lm.nearing) { lm.nearing = nearing; embed.near('forward', nearing); }
    if (at && !lm.fired) {
      if (guarded()) {
        // Stentor guards it: its current turns you back (your cell, and your flock with it)
        lm.fired = true; lm.blocked = true;
        lm.log.push({ kind: 'turnedBack', slot: at.slot, t });
        if (!at.kickT || at.kickT <= 0) { at.kickT = 0.5; at.kickFrom = { x: F.x, y: F.y }; }
        if (!lm.turned || t - (lm.turnedAt ?? -9) > 4) { lm.turned = true; lm.turnedAt = t; hud.toast('Turned back: Stentor\'s current guards the host. Drive Stentor off with your army first', 3200); }
      } else enterPortal(at);
    }
    if (!close) { lm.fired = false; lm.blocked = false; }
    if (lm.blocked && at && !guarded()) { lm.blocked = false; enterPortal(at); }
  }
  const dweller = roster.find((P) => P.backT > 0.5) || null;
  if (!!dweller !== lm.near) { lm.near = !!dweller; embed.near('back', lm.near); }
  // standalone the page shows its own quiet prompt (the shell draws one in the game)
  promptEl.style.display = lm.near && !embed.active ? 'block' : 'none';
  if (lm.near) promptEl.textContent = `${glyph('Y')} · back to the Paramecium's pool`;
}
/**
 * The way on: player P has reached the open portal. This is the one place the zoom into the
 * next world is triggered (embed.landmark('forward'); standalone, embed.js shows a toast).
 */
function enterPortal(P) {
  if (lm.entered && t - lm.entered < 3) return;
  lm.fired = true; lm.entered = t;
  portalGlow.burst();
  const L = split.layout;
  if (L && L.views && L.views.length) { const q = split.project(0, { x: FWD.x, y: FWD.y, z: 0 }); portalLight.bloom(q.x, q.y, { scale: 1.2 }); }
  audio.play('shared/portal-chime', { volume: 0.9 });
  P.pad.rumble(520, 0.55, 0.85);
  startOutro(P);
  lm.log.push({ kind: 'forward', slot: P.slot, t });
  embed.landmark('forward', { player: P.slot, outro: embed.active });
}

// --- the continuous transition (embed.js "Continuous transitions") ---
// Out: through the portal (the burst, bloom, chime and rumble above), time eases
// to a stop over ~1 s while the field keeps drawing (the freeze frame). Frozen,
// it reports how the glimpsed phage is framed (embed.frozen) and follows the
// shell's `camera` poses: the stage centres and the field narrows on it while
// the phage's world fades in under the same framing. Standalone (or a shell that
// never answers) the freeze holds a moment and time comes back.
// In: provides 'intro'. Held at its start, it draws its opening field, reports
// how that frames your cell (embed.opening) and takes the shell's poses (from
// the Paramecium's spirillum glimpse), ending exactly on that field; on `begin`
// time eases back in.
// A 2D field as a pose: looking straight down (pitch just short of vertical),
// the screen's up the field's +y; `rel` in embed.js's three.js convention
// (azimuth atan2(z, x), the field's +y as -z), so a 3D world turning to this
// pose shows the creature at the same angle on screen.
const TOP_PITCH = 1.55;
const OUTRO = { beat: 0.3, ease: 1.0, hold: 1.4, back: 0.6, giveUp: 8, rate: 1 }; // rate: tests slow it down
const INTRO_EASE = 0.6;
let outro = null, intro = null; // intro: { cam } while held; { ease } while time comes back
const sm01 = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
/** The field's width over its height (the optics' buffers). */
const aspect = () => { const [W, H] = optics.size; return W / H; };
/** A creature at (x, y), heading a, length len, as a pose in the field centred (cx, cy), fieldH tall. */
function pose2D(x, y, a, len, cx, cy, fieldH) {
  const w = fieldH * aspect();
  return { f: len / w, x: (x - cx) / (w / 2), y: (y - cy) / (fieldH / 2), pitch: TOP_PITCH, rel: wrapA(a + Math.PI / 2) };
}
/** The field (centre, height) that frames a creature at (x, y), length len, as `pose` says. */
function poseField(pose, x, y, len) {
  const w = len / Math.max(1e-6, pose.f), h = w / aspect();
  return { cx: x - pose.x * (w / 2), cy: y - pose.y * (h / 2), fieldH: h };
}
/** The field the transition sets (or null: the world's own). */
function camOverride() {
  if (outro && outro.cam) { const g = glimpsePhage(); return poseField(outro.cam, g.x, g.y, PHAGE_LEN); }
  if (intro && intro.cam && !('ease' in intro)) return poseField(intro.cam, P1.S.x, P1.S.y, P1.S.sp.L);
  return null;
}
function startOutro() {
  outro = { t: 0, scale: 1, frozenAt: null, cam: null, heard: false };
  if (embed.active) { embed.cinematic(true, canvas); portalLight.canvas.style.visibility = 'visible'; }
}
/** The glimpsed phage as a pose in the field drawn now. */
function glimpsePose() {
  const g = glimpsePhage();
  return pose2D(g.x, g.y, g.a, PHAGE_LEN, view.cx + view.stage.x, view.cy + view.stage.y, ZOOMS[zoomIdx()]);
}
/** Advance the outro by dt (frame time); returns the world's time scale. */
function stepOutro(dt) {
  const o = outro;
  o.t += dt * OUTRO.rate;
  o.scale = 1 - sm01(OUTRO.beat, OUTRO.beat + OUTRO.ease, o.t);
  if (o.scale <= 0 && o.frozenAt === null) {
    o.frozenAt = o.t;
    o.f0 = glimpsePose().f;
    if (embed.active) embed.frozen(glimpsePose());
  }
  if (o.frozenAt !== null) {
    const held = o.t - o.frozenAt;
    const back = !embed.active ? held - OUTRO.hold : !o.heard && held > OUTRO.giveUp ? held - OUTRO.giveUp : -1;
    if (back >= 0) {
      o.scale = sm01(0, OUTRO.back, back);
      if (back >= OUTRO.back) { outro = null; if (embed.active) embed.cinematic(false, canvas); }
    }
  }
  return outro ? outro.scale : 1;
}
/** Your cell as a pose in the field drawn now. */
const cellPose = () => pose2D(P1.S.x, P1.S.y, P1.S.a, P1.S.sp.L, view.cx + view.stage.x, view.cy + view.stage.y, ZOOMS[zoomIdx()]);
embed.provide('intro');
embed.on('hold', () => {
  intro = { cam: null };
  embed.cinematic(true, canvas);
  embed.opening(cellPose());
});
embed.on('camera', (d) => {
  if (!d.pose) return;
  if (outro) { outro.cam = d.pose; outro.heard = true; }
  if (intro && !('ease' in intro)) intro.cam = d.pose;
});
embed.on('begin', () => { embed.cinematic(false, canvas); intro = { cam: null, ease: 0 }; });
embed.on('pause', () => { if (outro) outro.heard = true; });

// --- loop ---
let t = 0, last = performance.now(), blocked = false, fps = 60, fpsT = 0, frames = 0, frameCount = 0;
const debug = {
  freeze: false,
  teleport(x, y, a, slot = 0) {
    const P = roster.find((Q) => Q.slot === slot) || P1;
    // the player's flock comes along (if it is theirs alone)
    const C = coll.of(P);
    if (C && C.players.length === 1) { const dx = x - P.S.x, dy = y - P.S.y; for (const m of C.members) { m.x += dx; m.y += dy; } C.cx += dx; C.cy += dy; C.fx += dx; C.fy += dy; }
    P.S.x = x; P.S.y = y; if (a !== undefined) P.S.a = a;
    if (P === P1 || !multi()) { view.cx = x; view.cy = y; }
  },
  look(k) { const want = LOOK_CYCLE.indexOf(k); for (let i = 0; i < 6 && currentLookKey() !== k; i++) cycleLook(1); return want >= 0; },
  zoom(i) { view.zoom = i; },
  tumble() { return swimmer.tumble(null); },
  dash() { if (P1.dash.trigger()) doDash(P1); },
  reverse() { return swimmer.reverse(); },
  overlay(on) { features.set('overlay', on); },
  species(s) { features.set('species', SPECIES_NAMES[s]); },
  phageOnMe(slot = 0) { const T = (roster.find((Q) => Q.slot === slot) || P1).S; const p = world.newPhage(T.x, T.y); p.z = 0; world.phages.push(p); const ph = { p, u: (Math.random() - 0.5) * T.sp.L * 0.6, side: 1, t: 0, irreversible: false, shed: false }; p.stuck = ph; T.phages.push(ph); },
  nearGrazer(i = 0, d = 14) { const Q = world.grazers[i].pose; debug.teleport(Q.mouth.x + Q.up.x * d, Q.mouth.y + Q.up.y * d, Math.atan2(-Q.up.y, -Q.up.x)); },
  /** Make every predator hungry now (tests of the fights). */
  /** Wake the boss now, whatever the calm opening says. */
  wakeBoss() { bossInfo.force = true; },
  /** Put n free kin cells beside a player (tests): they join only when a beacon (X) reaches them. */
  recruit(n = 5, slot = 0) {
    const P = roster.find((Q) => Q.slot === slot) || P1; let k = 0;
    for (const m of coll.kin) { if (k >= n) break; if (m.coll || m.dying) continue; const a = k * 2.4; m.x = P.S.x + Math.cos(a) * (1.6 + 0.25 * k); m.y = P.S.y + Math.sin(a) * (1.6 + 0.25 * k); k++; }
    return k;
  },
  /** Give a player's flock n members at once (tests, ?flock=n). */
  fill(n = 40, slot = 0) {
    const P = roster.find((Q) => Q.slot === slot) || P1; const C = coll.of(P); let k = 0;
    for (let i = 0; C && C.members.length < n && i < 64; i++) { const a = i * 2.4, d = 1.5 + 0.35 * i; if (coll.adopt(P, P.S.x + Math.cos(a) * d, P.S.y + Math.sin(a) * d, Math.random() * 6.28)) k++; else break; }
    return k;
  },
  /** X for a player in tests: the beacon, eating prey in reach and a volley on any enemy in contact. */
  x(slot = 0) { const P = roster.find((Q) => Q.slot === slot) || P1; return pressX(P); },
  /** Fill a player's collective's toxin charge (tests). */
  charge(slot = 0) { const C = coll.of(roster.find((Q) => Q.slot === slot) || P1); if (C) C.charge = 1; },
  burst(slot = 0) { return !!coll.burst(roster.find((Q) => Q.slot === slot) || P1); },
  /** A button for a player in tests: 'B' tumble (defend), 'A' sprint. */
  press(b, slot = 0) { const P = roster.find((Q) => Q.slot === slot) || P1; if (b === 'B') { P.blockT = 0.55; P.tumbleAt = t; P.swimmer.tumble(null); } else if (b === 'A' && P.dash.trigger()) { doDash(P); P.sprintT = 0.55; } },
  step(n = 1, dt = 1 / 60, inp = {}) {
    for (let i = 0; i < n; i++) {
      const ins = {};
      // inp: one player's input, or { slots: { 0: {...}, 1: {...} } }
      const per = inp.slots || { 0: inp };
      for (const k in per) { const q = per[k] || {}; ins[k] = { attack: !!q.attack, attackPressed: !!q.attack && i === 0, steer: q.steer ? { ...q.steer } : null }; }
      tick(dt, ins);
    }
  },
};

function doDash(P) {
  audio.play('bacterium/sprint', { volume: 0.9 });
  const res = P.swimmer.dash();
  P.S.dashOn = true;
  P.pad.rumble(160, 0.5, 0.7);
  const who = multi() ? `${P.name}: ` : '';
  if (res === 'shook') { hud.toast(`${who}Shook the Bdellovibrio off before it could bore in`); }
  else if (res === 'detached') hud.toast(`${who}Let go of the prey`);
}

const idle = () => ({ attack: false, attackPressed: false, focusing: false, steer: null });
/**
 * X (the magnetotactic cell): a beacon from the flock's middle (kin it reaches answer and join), every prey
 * rod in reach of a member lysed, and a volley on any enemy the flock touches. One press every 0.3 s.
 */
function pressX(P) {
  if (!P.S.alive || P.S.species !== 'mtb' || !coll.opts.on) return null;
  const b = coll.beacon(P, t);
  if (!b) return null;
  const C = coll.of(P);
  const eaten = coll.eat(P);
  const hits = C ? guards.volley(C, t) : 0;
  if (eaten.length) {
    audio.play('bacterium/eat', { volume: 0.8, rate: 1.05 + Math.random() * 0.1 });
    P.pad.rumble(60, 0.3, 0.2);
    if (!P.msg.ate) { P.msg.ate = true; hud.toast(`${multi() ? P.name + ': ' : ''}Lysed ${eaten.length > 1 ? eaten.length + ' prey rods' : 'a prey rod'}: the cells that took them grow toward dividing, so your army grows`, 3000); }
  }
  if (hits) P.pad.rumble(80, 0.4, 0.3);
  collInfo.presses.push({ t, slot: P.slot, R: +b.R.toFixed(1), eaten: eaten.length, hits });
  if (collInfo.presses.length > 50) collInfo.presses.shift();
  return { beacon: true, R: b.R, eaten: eaten.length, hits };
}
/** Where a player's view centres: the flock's smoothed middle; alone, the cell (inside its prey, as Bdellovibrio). */
const focusOf = (P) => P.S.inside || coll.focus(P) || P.S;

function tick(dt, inputs) {
  t += dt;
  world.time = t;
  pacing.now = t;
  updatePressure(dt);
  for (const P of roster) if (P !== P1) { Object.assign(P.swimmer.opts, swimmer.opts); Object.assign(P.game.opts, game.opts); }
  const evs = new Map();
  for (const P of roster) {
    const inp = inputs[P.slot] || (inputs[P.slot] = idle());
    P.dash.update(dt);
    inp.dashActive = P.dash.active;
    // which gate a player is at: phages and the pack's rams take hold only there
    const f = focusOf(P), cl = world.cloud, home = guards.centre(guards.byId.bdello);
    P.nearCloud = Math.hypot(f.x - cl.x, f.y - cl.y) < cl.r + 22;
    P.nearPack = Math.hypot(f.x - home.x, f.y - home.y) < 45;
    P.safeT = Math.max(0, (P.safeT || 0) - dt);
    if (inp.attackPressed && P.S.species === 'mtb') pressX(P);
  }
  // the flock: its intent from the sticks; each player's own cell steered as one member
  const active = roster.filter((P) => !P.waiting);
  coll.pre(dt, t, active, inputs);
  for (const P of roster) {
    const ev = {}, C = coll.of(P);
    P.S.flowK = C ? C.drag : 1; // a raft: currents drag it less, the bigger it is (collective.js dragK)
    P.swimmer.step(dt, t, inputs[P.slot], ev);
    evs.set(P, ev);
  }
  snd.t += dt;
  const fastest = Math.max(...roster.map((P) => (P.S.alive && P.S.mode !== 'tumble' ? Math.min(1, P.S.speed / 40) : 0)));
  runLoop.set({ volume: 0.7 * fastest, rate: 0.8 + 0.6 * fastest + (roster.some((P) => P.dash.active) ? 0.2 : 0) });
  // hunters pick a player: the amoeba's edge creeps toward the nearest living cell
  const A = world.amoeba;
  let target = P1.S, bd = Infinity;
  for (const P of alive()) { const d = Math.hypot(P.S.x - A.x, P.S.y - A.y); if (d < bd) { bd = d; target = P.S; } }
  world.update(dt, t, target);
  // the fights: predators wind up readably before they strike (shared/predation.js createFight)
  runFights(dt);
  runBoss(dt);
  // knocked clear (a tumble free of the pull, or a member taken in your place)
  for (const P of roster) if (P.kickT > 0 && P.S.alive) { P.kickT -= dt; const F = P.kickFrom || stentor.mouth; const a = Math.atan2(P.S.y - F.y, P.S.x - F.x); P.S.x += Math.cos(a) * 130 * dt; P.S.y += Math.sin(a) * 130 * dt; }
  coll.post(dt, t, active);
  guards.update(dt, t, active);
  stepDirector(dt);
  for (const P of roster) {
    const ev = evs.get(P), inp = inputs[P.slot], S = P.S;
    const C = coll.of(P);
    P.game.opts.absorb = (kind, who) => absorbHit(P, kind, who);
    P.game.opts.shielded = !!(C && C.level >= 1 && coll.opts.on);
    P.game.opts.adopt = (x, y, a) => coll.opts.on && coll.adopt(P, x, y, a);
    // uptake: a soft eating sound every ~0.7 s while X feeds, and when a prey is finished
    if ((S.feeding && snd.t - snd.lastEat > 0.7) || (ev.emerged && snd.t - snd.lastEat > 0.2)) {
      snd.lastEat = snd.t;
      audio.play('bacterium/eat', { volume: 0.7, rate: 0.95 + Math.random() * 0.1 });
    }
    if (ev.phage && snd.t - snd.lastPhage > 0.2) { snd.lastPhage = snd.t; audio.play('bacterium/phage', { volume: 0.8 }); }
    if (ev.captured) audio.play('bacterium/graze', { volume: 0.9 });
    const wasAlive = S.alive;
    // phages and the pack's Bdellovibrio take hold only of a player at their gate
    const hp = world.hunt.phage, hb = world.hunt.bdello;
    world.hunt.phage = hp && P.nearCloud; world.hunt.bdello = hb && P.nearPack;
    P.game.update(dt, t, inp, ev);
    world.hunt.phage = hp; world.hunt.bdello = hb;
    if (ev.caught) startCatch(P, ev.caught);
    stepCatch(P, dt);
    if (wasAlive && !S.alive && !S.caught && S.over !== 'won') embed.died({ cause: S.cause || '', player: P.slot });
    events(P, ev);
  }
  if (pacing.firstThreat === null && S.alive && (S.flow > 15 || S.phages.length || S.attacker || world.insideAmoeba(S.x, S.y, t) > 0)) pacing.firstThreat = t - pacing.t0;
  // focus drifts back to the cell's plane
  if (view.focusFollows && !(inputs[0] && inputs[0].focusing)) view.focus *= Math.exp(-dt * 1.5);
  // camera: the stage follows your flock's middle (the players' middles together; the split screen does the rest)
  const k = 1 - Math.exp(-dt * 5);
  let { x: fx, y: fy } = focusOf(P1);
  if (multi()) {
    const ps = roster.filter((P) => !P.waiting).map(focusOf);
    fx = ps.reduce((a, p) => a + p.x, 0) / ps.length; fy = ps.reduce((a, p) => a + p.y, 0) / ps.length;
  }
  // once eaten, the view slides down so your remains sit above the Eaten card
  const lift = 0;
  view.cx += (fx - view.cx) * k; view.cy += (fy - lift - view.cy) * k;
  landmarkTick(dt);
}

/** What happened to a player this frame, as toasts (named in multiplayer). */
function events(P, ev) {
  const who = multi() ? `${P.name}: ` : '';
  const S = P.S;
  if (ev.phage) { P.pad.rumble(60, 0.3, 0); if (!P.msg.phageHint) { P.msg.phageHint = true; hud.toast(`${who}A phage stuck to you! Dash (${glyph('A')}) or tumble (${glyph('B')}) within 3 s to shake it off`, 3200); } else hud.toast(`${who}Another phage stuck: shake it off (${glyph('A')} / ${glyph('B')})`); }
  if (ev.shed) hud.toast(`${who}Shook off ${ev.shed} phage${ev.shed > 1 ? 's' : ''} while the binding was still reversible`);
  if (ev.irreversible) { P.pad.rumble(200, 0.6, 0.4); hud.toast(`${who}Irreversible: the phage's tail is through the envelope`, 2600); }
  if (ev.captured) { P.pad.rumble(300, 0.6, 0.9); hud.toast(`${who}Caught in the feeding current at the oral funnel: DASH (${glyph('A')})!`, 2200); }
  if (ev.engulfing) { P.pad.rumble(250, 0.5, 0.5); hud.toast(`${who}The amoeba's edge is closing over you: swim out!`, 2200); }
  if (ev.attacked) { P.pad.rumble(300, 0.8, 0.8); hud.toast(`${who}Bdellovibrio has rammed you! Dash (${glyph('A')}) or tumble (${glyph('B')}) to shake it off`, 2600); }
  if (ev.attach) hud.toast(`${who}Attached: boring through the outer membrane (minutes in life, 2.5 s here)`, 2600);
  if (ev.entered) { P.pad.rumble(200, 0.4, 0.4); hud.toast(`${who}Inside the periplasm: the prey rounds into a bdelloplast. What happens inside is beyond the light microscope.`, 3600); }
  if (ev.emerged) hud.toast(`${who}Prey ${S.prey} of ${GOAL_PREY} eaten. (In life the predator divides inside and the progeny burst out hours later.)`, 3400);
  if (ev.gramPos) hud.toast('Gram-positive: no periplasm, so Bdellovibrio cannot get in');
  if (ev.divide) hud.toast(`${who}Growing to divide: each daughter will get half the magnetosome chain`, 2400);
  if (ev.divided) { P.pad.rumble(300, 0.5, 0.5); hud.toast(`${who}Divided! (${S.divisions}) Your daughter cell joins your army.`, 3000); }
  if (ev.contracted) hud.toast('The peritrich jerked back on its coiling stalk: its current stops for a moment');
  if (ev.bump && Math.random() < 0.02) hud.toast('A clay grain, bigger than you');
}

function readInput(P, dt) {
  const inp = idle();
  const S = P.S, c = P.ctl, me = P === P1;
  const ls = c.move();
  // the stick in world axes (screen up = world +y, toward the air)
  if (ls.m > 0) inp.steer = { x: ls.x, y: -ls.y, m: Math.min(1, ls.m) };
  if (S.alive) {
    if (c.defend.pressed()) {
      P.blockT = 0.55; // a tumble at a strike evades it
      P.tumbleAt = t;
      const bias = P.swimmer.opts.bias && ls.m > 0.3 ? { x: ls.x, y: -ls.y } : null;
      if (P.swimmer.tumble(bias)) {
        audio.play('bacterium/tumble', { volume: 0.8, rate: 0.95 + Math.random() * 0.1 });
        P.pad.rumble(40, 0.2, 0);
        if (S.attacker) { S.attacker.cooldown = 4; S.attacker.prey = null; S.attacker = null; hud.toast(`${multi() ? P.name + ': ' : ''}Tumbled free of the Bdellovibrio`); }
      }
    }
    if (c.lb.pressed() || c.rb.pressed()) { if (P.swimmer.reverse() && me) hud.toast(S.species === 'mtb' ? (S.sense > 0 ? 'Reversed: swimming north, along the field (down)' : 'Reversed: swimming south, against the field (up)') : 'Reversed'); }
    if (c.dash.pressed() && P.dash.trigger()) { doDash(P); P.sprintT = 0.55; }
    inp.attack = c.attack.down();
    inp.attackPressed = c.attack.pressed();
  } else if (me && !multi() && !S.caught && S.overT > 1 && (c.dash.pressed() || c.attack.pressed())) setSpecies(S.species);
  // Y: at the Paramecium it takes everyone back; with the toxin charged it fires; else (player 1) the overlay
  const C = coll.of(P);
  if (c.special.pressed()) {
    if (P.backT > 0.5) landmark('back', P);
    else if (C && C.charge >= 1 && S.alive) coll.burst(P);
    else if (me) features.set('overlay', !view.overlay);
  }
  if (c.stickClick.left.pressed() && C && C.charge >= 1 && S.alive) coll.burst(P);
  if (!me) return inp;
  const ls2 = c.lookStep();
  if (ls2) cycleLook(ls2);
  const zs = c.zoomStep();
  if (zs) { view.zoom = Math.max(0, Math.min(ZOOMS.length - 1, view.zoom + zs)); hud.toast(view.zoom === 0 ? 'Field 180 µm: the whole eyepiece field at 1000×' : `Field ${ZOOMS[view.zoom]} µm: a camera crop (empty magnification, no new detail)`); }
  const an = c.analog();
  if (Math.abs(an) > 0.05) { view.focus = Math.max(-3, Math.min(3, view.focus + an * 1.5 * dt)); inp.focusing = true; }
  const rs = c.camera();
  const half = ZOOMS[view.zoom] / 2;
  view.stage.x = Math.max(-half, Math.min(half, view.stage.x + rs.x * half * dt));
  view.stage.y = Math.max(-half, Math.min(half, view.stage.y - rs.y * half * dt));
  if (rs.m === 0) view.stage.multiplyScalar(Math.exp(-dt * 0.8));
  return inp;
}

function frame(now) {
  requestAnimationFrame(frame);
  const dtReal = (now - last) / 1000;
  const dt = Math.min(0.05, dtReal);
  last = now;
  quality.update(dtReal);
  frameCount++;
  players.poll();
  syncRoster();
  unlockOnPad();
  blocked = features.update();
  if (!blocked) hud.update(pad);
  // the continuous transition: held at the start (in) or in the outro (out): no input, time eased
  const held = embed.held || (intro && !('ease' in intro));
  let ts = 1;
  if (outro) ts = stepOutro(dt);
  else if (intro && 'ease' in intro) { intro.ease += dt; ts = sm01(0, INTRO_EASE, intro.ease); if (intro.ease >= INTRO_EASE) intro = null; }
  const inputs = {};
  if (!blocked && !held && !outro) for (const P of roster) if (!P.waiting) inputs[P.slot] = readInput(P, dt);
  // ?flock=n (tests and perf): every player's army is kept at n (losses are replaced)
  if (FLOCK_N) for (const P of roster) if (P.S.alive && P.S.species === 'mtb' && coll.opts.on) { const C = coll.of(P); if (C && C.members.length < FLOCK_N * C.players.length) debug.fill(FLOCK_N * C.players.length, P.slot); }
  if (!debug.freeze && !held && ts > 0) tick(dt * ts, inputs);
  else for (const P of roster) P.S.dashOn = P.dash.active;
  for (const P of roster) {
    const S = P.S;
    if (S.alive || S.caught) continue;
    if (multi() && S.over !== 'won') { if (S.overT > 2.6) rejoin(P); continue; }
    // solo (or a win): oxygen and starvation: the cell is seen to stop and fade before the card (catches use shared/predation.js's card)
    if (S.overT > (S.over === 'won' ? 0 : 1.2)) showEnd(S);
    if (S.over !== 'won' && S.overT > 8) setSpecies(S.species);
  }
  if (S.alive && S.overT === 0 && !S.over && card.classList.contains('show') && !roster.some((P) => P.S.over === 'won')) card.classList.remove('show');
  if (roster.some((P) => P.S.over === 'won') && (pad.pressed(players.BTN.A))) setSpecies(S.species);
  warn();
  gauge();

  render(dt);
  frames++; fpsT += dt;
  if (fpsT > 1) { fps = frames / fpsT; frames = 0; fpsT = 0; }
  stats();
}

/** The red line at the top: what is happening to whom, and what to do. */
function warn() {
  const lines = [];
  for (const P of roster) {
    const S = P.S, who = multi() ? `${P.name}: ` : '';
    let text = '', sev = 0;
    if (P.capture.active && P.cat.kind && P.cat.phase !== 'eaten') { text = CATCH[P.cat.kind][P.cat.phase]; sev = 3; }
    else if (attackText(P)) { const a = attackText(P); text = a.text; sev = a.sev; }
    else if (!S.alive && S.over && S.over !== 'won' && !S.caught) { text = `Run over: ${(S.cause || 'the cell has stopped').toLowerCase()}`; sev = 2.5; }
    if (text) lines.push({ text: who + text, sev, color: sev >= 2 ? '#ff8a7a' : sev <= 0.5 ? '#bfe3c0' : '#ffc27a' });
  }
  lines.sort((a, b) => b.sev - a.sev);
  const top = lines.slice(0, multi() ? 2 : 1);
  warnEl.innerHTML = top.map((l) => `<div style="color:${l.color}">${l.text}</div>`).join('');
  warnEl.style.display = top.length ? 'block' : 'none';
}

/** What is attacking a player right now, for the warning line. */
function attackText(P) {
  if (!P.S.alive) return null;
  if (stentor.awake && !stentor.beaten && Math.hypot(P.S.x - stentor.mouth.x, P.S.y - stentor.mouth.y) < stentor.pullR + 15) {
    const st = stentor.fight.state;
    if (st === 'windup') return { text: `Stentor's membranelles speed up, its vortex brightens: get to the edge, or tumble (${glyph('B')}) at the pull`, sev: 2.3 };
    if (st === 'strike') return { text: `Stentor PULLS: tumble (${glyph('B')}) to break free, sprint (${glyph('A')}) out`, sev: 2.6 };
    if (st === 'recover') return { text: 'Its vortex slackens: press in on its rim now!', sev: 0.4 };
  }
  const g = world.grazers.find((q) => q.target === P && (q.fightState === 'windup' || q.fightState === 'strike'));
  if (g) return { text: `A grazer's current is ${g.fightState === 'strike' ? 'SURGING' : 'intensifying'}: tumble (${glyph('B')}) as it pulls, or sprint out (${glyph('A')})`, sev: 2.2 };
  if (P.bdello && /windup|strike/.test(P.bdello.fight.state)) return { text: `Bdellovibrio is lining up to ram you: tumble (${glyph('B')}) at the ram`, sev: 2.1 };
  if (P.phage && /windup|strike/.test(P.phage.fight.state)) return { text: `A phage's tail fibres have caught your wall: tumble (${glyph('B')}) now`, sev: 2.1 };
  if (P.bdello && P.bdello.fight.state === 'stalk') return { text: `A Bdellovibrio is stalking you: keep moving, tumble (${glyph('B')}) when it rams`, sev: 1.6 };
  if (P.phage && P.phage.fight.state === 'stalk') return { text: `A phage is homing in on you: tumble (${glyph('B')}) as it lands`, sev: 1.5 };
  return null;
}

function showEnd(S) {
  if (card.classList.contains('show')) return;
  if (S.over === 'won') card.innerHTML = `<h2>Three prey taken</h2><p>The last bdelloplast lyses: five new attack-phase cells swim out. In life this cycle takes three to four hours per prey.</p><p>Press ${glyph('A')} to hunt again.</p>`;
  else card.innerHTML = `<h2>Run over${S.cause ? `: ${S.cause.toLowerCase()}` : ''}</h2><p>${S.over}</p><p>Press ${glyph('A')} to try again (a new cell starts in a few seconds).</p>`;
  card.classList.add('show');
}

/** Draw the specimen around (cx, cy) to the screen: one view. */
let fieldNow = ZOOMS[2]; // the field height being drawn (render sets it: the zoom's, or the transition's)
function drawField(cx, cy, stopOk, rect = null) {
  const [W, H] = optics.size;
  const fieldH = fieldNow;
  const umPerPx = fieldH / H;
  const fieldW = W * umPerPx;
  shapes.setView(cx, cy, fieldW, fieldH, umPerPx, view.focus, t);
  // split: every pass only over this view's region (plus the blurs' reach)
  const look0 = currentLookKey();
  const margin = rect ? Math.ceil(3.3 * (0.12 / umPerPx + (look0 === 'fluorescence' ? 1.6 : 1.2) / umPerPx) + 12) : 0;
  optics.setRect(look0 === 'sem' || look0 === 'dic' ? null : rect, margin);
  renderer.setRenderTarget(optics.field);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(shapes.scene, shapes.camera);
  const look = currentLookKey();
  const stopR = stopOk && view.stop && fieldH === ZOOMS[0] ? 90 / umPerPx : 0;
  if (look === 'sem') {
    const f = optics.field.textures;
    looks.fieldFromBuffers(W, H, { a: { opd: f[0], abs: f[2], opdW: [0, 0, 1, 0], scatW: [0, 1, 0, 0] }, opdK: 1, absK: 1, heightK: 1 });
    renderer.setRenderTarget(null);
    looks.semFromField({ umPerPx, dist: fieldH * 3, cls: CLS.CUTICLE, subCls: CLS.GRAIN, dt: 1 / 60 });
  } else if (look === 'dic') {
    optics.diffract(umPerPx);
    const f = optics.field.textures;
    looks.fieldFromBuffers(W, H, { a: { opd: f[0], abs: f[2], opdW: [1, 0, 0, 0], scatW: [0, 1, 0, 0] }, opdK: 6, absK: 1 });
    renderer.setRenderTarget(null);
    looks.dic({ mode: bmode.dic, pxPerUm: 1 / umPerPx, time: t, opdK: 1, absK: 1 });
  } else {
    optics.render({ look, umPerPx, center: [cx, cy], time: t, stopR, plate: look === 'phase' ? plates.phase : null, noiseRes: [renderer.domElement.width, renderer.domElement.height] });
  }
  if (view.overlay) overlay.render(renderer, { center: [cx, cy], size: [fieldW, fieldH], res: [W, H], time: t, band: S.sp.o2, world, flTex: optics.field.textures[1] });
  // the portal's glow, when it is in this view
  if (world.landmarks.forward.placed && Math.abs(portalGlow.x - cx) < fieldW / 2 + 15 && Math.abs(portalGlow.y - cy) < fieldH / 2 + 15) {
    glowCam.left = cx - fieldW / 2; glowCam.right = cx + fieldW / 2; glowCam.top = cy + fieldH / 2; glowCam.bottom = cy - fieldH / 2;
    glowCam.updateProjectionMatrix();
    renderer.setRenderTarget(null);
    renderer.render(glowScene, glowCam);
  }
}

const posOf = (P) => { const p = focusOf(P); return { x: p.x, y: p.y, z: 0 }; };
const cellPos = (P) => { const p = P.S.inside || P.S; return { x: p.x, y: p.y, z: 0 }; };
function render(dt) {
  glow.setOpen(!guarded());
  glow.update(dt, t, glowCam);
  const ov = camOverride();
  const fieldH = fieldNow = ov ? ov.fieldH : ZOOMS[zoomIdx()];
  const cx = ov ? ov.cx : view.cx + view.stage.x, cy = ov ? ov.cy : view.cy + view.stage.y;
  if (world.landmarks.forward.placed) { const g = glimpsePhage(); glimpse.setPosition(g.x, g.y, 0); } else glimpse.setPosition(1e6, 1e6, 0);
  glimpse.update(t);
  // the camera move: the glow fades over the first ×4 of magnification, the glint over ×4 to ×20 (the shell's halo carries it on)
  const dive = outro && outro.cam && outro.f0 ? Math.log(Math.max(1, outro.cam.f / outro.f0)) : 0;
  if (glowUI) glowUI.value = GLOW_I * (1 - sm01(0, Math.log(4), dive));
  glimpse.intensity = 1.1 * (1 - sm01(Math.log(4), Math.log(20), dive));
  const list = roster.filter((P) => !P.waiting).map((P) => ({ slot: P.slot, position: posOf(P) }));
  const L = split.update(list.length ? list : [{ slot: 0, position: posOf(P1) }], { center: { x: cx, y: cy }, pxPerUnit: innerHeight / fieldH, yUp: true }, dt);
  // split frames render every view: the governor drops each one's resolution (0.7 at 2 views, 0.55 at 3-4)
  quality.setSplitViews(L.views.length);
  // the shapes are culled once for every view: the union of the views' fields
  const fw = fieldH * innerWidth / innerHeight;
  let ux0 = Infinity, ux1 = -Infinity, uy0 = Infinity, uy1 = -Infinity;
  for (const v of (L.views.length ? L.views : [{ offset: { x: 0, y: 0 } }])) {
    const x = cx + v.offset.x, y = cy + v.offset.y;
    ux0 = Math.min(ux0, x - fw / 2); ux1 = Math.max(ux1, x + fw / 2); uy0 = Math.min(uy0, y - fieldH / 2); uy1 = Math.max(uy1, y + fieldH / 2);
  }
  shapes.cull(ux0, uy0, ux1, uy1);
  shapes.begin();
  drawer.draw(shapes, t, roster.map((P) => P.S), view);
  shapes.end();
  if (ov || L.views.length <= 1) {
    const o = L.views[0] && !ov ? L.views[0].offset : { x: 0, y: 0 };
    drawField(cx + o.x, cy + o.y, true);
  } else {
    for (const v of L.views) { drawField(cx + v.offset.x, cy + v.offset.y, false, useRects ? viewRect(L, v.index) : null); split.capture(v.index); }
    split.compose();
  }
  // the edge marks: only the ring to the Paramecium (the way back)
  marks.begin();
  portalLight.begin();
  // no arrow to the way on (the owner: keep moving and you find it): once placed, its golden light spills in
  // from the edge of the view on its side (or haloes it in view); no text
  if (world.landmarks.forward.placed && !outro) {
    let d = Infinity;
    for (const P of roster) { const f = focusOf(P); d = Math.min(d, Math.hypot(f.x - FWD.x, f.y - FWD.y)); }
    portalLight.drawSplit(arrowSplit(), FWD, { strength: Math.max(0.3, Math.min(1, 1.15 - d / 260)), open: portalGlow.open });
  }
  marks.drawSplit(arrowSplit(), BACK, { kind: 'backdoor', label: 'Pool', range: 420, onScreen: 'none' });
  drawMarks(L, fieldH);
  // scale bar
  const bar = fieldH >= 90 ? 20 : fieldH >= 40 ? 5 : 2;
  const cssPerUm = innerHeight / fieldH;
  scaleEl.innerHTML = `<i style="width:${Math.round(bar * cssPerUm)}px"></i>${bar} µm · field ${fieldH} µm${view.zoom ? ' (crop)' : ''}`;
  armyChip();
}

/** The army chip at the bottom: per player, the army's size, its abilities and the toxin (text, no ring). */
let armyText = '';
function armyChip() {
  let html = '';
  if (coll.opts.on) {
    const seen = new Set();
    for (const P of roster) {
      if (P.waiting) continue;
      const C = coll.of(P);
      if (!C || seen.has(C)) continue;
      seen.add(C);
      const who = multi() ? `<span style="color:${C.players.length > 1 ? '#e6d3a3' : P.color}">${C.players.map((Q) => 'P' + (Q.slot + 1)).join('+')}</span> ` : '';
      if (!C.members.length) { html += `<div>${who}Alone: press ${glyph('X')} near kin to call them</div>`; continue; }
      const ab = [C.level >= 1 ? 'slime shield' : '', C.level >= 2 ? 'raft' : '', C.level >= 3 ? (C.charge >= 1 ? `toxin ready (${glyph('Y')})` : `toxin ${Math.round(C.charge * 100)} %`) : ''].filter(Boolean).join(' · ');
      html += `<div>${who}Army ${C.army}${ab ? ' · ' + ab : ''}</div>`;
    }
  }
  if (html !== armyText) { armyText = html; armyEl.innerHTML = html; }
}

/** A split view's region as a rectangle (fractions of the screen, origin bottom left), for the optics' scissor. */
function viewRect(L, i) {
  // shared/splitscreen.js gives each view its padded rect (drawing-buffer px, bottom left); the optics
  // scissor every one of their passes (specimen, PSF, low-pass, composite) to it plus their blur reach
  const v = L.views.find((q) => q.index === i);
  if (v && v.rect && v.rect.w > 0) { const b = renderer.getDrawingBufferSize(_b); return { x: v.rect.x / b.x, y: v.rect.y / b.y, w: v.rect.w / b.x, h: v.rect.h / b.y }; }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of L.regions) if (r.view === i && r.polygon.length > 2) for (const [x, y] of r.polygon) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  if (!(x1 > x0)) return null;
  const W = innerWidth, H = innerHeight, pad = 2;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W, x1 + pad); y1 = Math.min(H, y1 + pad);
  return { x: x0 / W, y: 1 - y1 / H, w: (x1 - x0) / W, h: (y1 - y0) / H };
}

/** Corner brackets round each player's cell (solo: the old gold marker; together: each in their colour). */
function drawMarks(L, fieldH) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
  if (markCv.width !== w || markCv.height !== h) { markCv.width = w; markCv.height = h; }
  markG.setTransform(1, 0, 0, 1, 0, 0);
  markG.clearRect(0, 0, w, h);
  if (!view.mark) return;
  markG.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cssPerUm = innerHeight / fieldH;
  for (const v of L.views) {
    markG.save();
    if (L.views.length > 1) {
      markG.beginPath();
      for (const r of L.regions) if (r.view === v.index && r.polygon.length > 2) { markG.moveTo(r.polygon[0][0], r.polygon[0][1]); for (const q of r.polygon.slice(1)) markG.lineTo(q[0], q[1]); markG.closePath(); }
      markG.clip();
    }
    for (const P of roster) {
      const S = P.S;
      if (S.over && S.over !== 'won' && S.overT > 2.5) continue;
      if (P.capture.active && P.cat.phase === 'eaten' && multi()) continue;
      // with a flock (alone at the stick), your cell is just one member: no marker
      if (!multi() && coll.focus(P)) continue;
      const q = split.project(v.index, cellPos(P));
      const size = Math.max(26, S.sp.L * cssPerUm + 18), hs = size / 2, arm = 7;
      markG.globalAlpha = multi() ? 0.8 : 0.55;
      markG.strokeStyle = multi() ? P.color : '#ffd28a';
      markG.lineWidth = multi() ? 2 : 1.5;
      markG.beginPath();
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const x = q.x + sx * hs, y = q.y + sy * hs;
        markG.moveTo(x - sx * arm, y); markG.lineTo(x, y); markG.lineTo(x, y - sy * arm);
      }
      markG.stroke();
      if (multi()) { markG.fillStyle = P.color; markG.font = '600 10px system-ui, sans-serif'; markG.textAlign = 'center'; markG.fillText(`P${P.slot + 1}`, q.x, q.y - hs - 4); }
    }
    // an attack under way: a pulsing red ring on the predator (a game marker, not optics)
    const ring = (x, y, r) => { const q = split.project(v.index, { x, y, z: 0 }); markG.globalAlpha = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * 18)); markG.strokeStyle = '#ff5a46'; markG.lineWidth = 2; markG.beginPath(); markG.arc(q.x, q.y, r, 0, Math.PI * 2); markG.stroke(); };
    for (const g of world.grazers) if (g.target && (g.fightState === 'windup' || g.fightState === 'strike')) ring(g.pose.mouth.x, g.pose.mouth.y, Math.max(16, 7 * cssPerUm));
    for (const P of roster) {
      if (P.bdello && /windup|strike/.test(P.bdello.fight.state)) ring(P.bdello.c.x, P.bdello.c.y, Math.max(12, 1.6 * cssPerUm));
      if (P.phage && /windup|strike/.test(P.phage.fight.state)) ring(P.phage.p.x, P.phage.p.y, Math.max(9, 0.9 * cssPerUm));
    }
    markG.globalAlpha = 1;
    markG.restore();
  }
}

function stats() {
  const sp = S.sp;
  const look = currentLookKey();
  const lookName = { phase: 'Phase contrast', fluorescence: 'Fluorescence (pseudo-colour)', darkfield: 'Darkfield', sem: 'SEM (borrowed)', dic: 'DIC (borrowed)' }[look];
  const dash = P1.dash;
  const lines = [
    `${sp.short} · ${lookName} · focus ${view.focus >= 0 ? '+' : ''}${view.focus.toFixed(1)} µm`,
    `speed ${Math.round(S.speed).toString().padStart(3)} µm/s · ${(S.speed / sp.L).toFixed(0)} body lengths/s · ${S.mode === 'tumble' ? 'TUMBLE' : S.boring ? 'BORING IN' : S.inside ? 'INSIDE PREY' : dash.active ? 'SPRINT' : 'run'}${S.mode === 'run' && !S.boring && !S.inside ? (S.steering ? ' · steering (LS)' : swimmer.opts.steer ? ' · stopped: Brownian, flow, field' : '') : ''}`,
    S.species === 'mtb'
      ? `growth ${'█'.repeat(Math.round(Math.min(1, S.growth) * 10))}${'░'.repeat(10 - Math.round(Math.min(1, S.growth) * 10))} · food ${S.food.toFixed(2)}${S.feeding ? ' (uptake)' : ''}`
      : `prey ${S.prey}/${GOAL_PREY}${S.boring ? ` · boring ${Math.min(100, Math.round((S.boreT / 2.5) * 100))} %` : ''}`,
    `${dash.text()} · phages on you ${S.phages.length}${S.phages.some((p) => p.irreversible) ? ' (IRREVERSIBLE)' : ''}${S.attacker ? ' · BDELLOVIBRIO ATTACHED' : ''}`,
    S.species === 'mtb' ? `field ${world.opts.field} µT, mB/kT ≈ ${(S.mB || 0).toFixed(1)} (gentle pull: steer against it) · running ${S.sense > 0 ? 'north (down the field)' : 'south (up the field)'}` : `run ${sp.v} µm/s, sprint ${sp.dash} µm/s`,
    `gates: ${guards.list.map((q) => `${q.id} ${q.beaten ? 'beaten' : `${Math.round((100 * Math.max(0, q.hp)) / q.max)} %${q.contact ? ` (${q.contact} fighting)` : ''}`}`).join(' · ')}`,
    capture.active && cat.kind ? `CAUGHT by ${CATCH[cat.kind].by.toLowerCase()}: ${cat.phase}` : '',
    (() => { const C = coll.of(P1); return C && C.members.length ? `army: ${C.army} cells (${C.players.length > 1 ? C.players.length + ' players' : 'you'}) · ${LEVEL_NAMES.slice(1, C.level + 1).join(', ') || 'no abilities yet'} · toxin ${Math.round(C.charge * 100)} % · drag ×${C.drag.toFixed(2)} · flock ${C.speed.toFixed(0)} µm/s, ${C.extent.toFixed(0)} µm across` : coll.opts.on ? `army: none yet (press ${glyph('X')} near kin)` : ''; })(),
    `out from the start ${Math.round(world.distFromStart(S.x, S.y))} µm · encounters ${director.index}/${ENCOUNTERS.length} (${director.state().phase})${world.landmarks.forward.placed ? ` · host ${Math.round(Math.hypot(S.x - FWD.x, S.y - FWD.y))} µm${guarded() ? ', guarded' : ', open'}` : ''} · Paramecium ${Math.round(Math.hypot(S.x - BACK.x, S.y - BACK.y))} µm`,
    multi() ? `players ${roster.length} · views ${split.views.length}${split.merged ? ' (together)' : ''}` : '',
    `${Math.round(fps)} fps · ${shapes.count} shapes · render ${Math.round(quality.scale * 100)} %${optics.stats.down > 1 ? ` · PSF at 1/${optics.stats.down}` : ''}`,
  ];
  hud.stats(lines.filter((l) => l !== '').join('\n'));
}

/** Test hook: start a catch ('grazer' | 'amoeba' | 'phage' | 'bdellovibrio') on a player (default player 1). */
function forceCapture(kind = 'grazer', slot = 0) {
  const P = roster.find((Q) => Q.slot === slot) || P1;
  const S = P.S, ev = {};
  if (!S.alive) { if (multi()) rejoin(P); else setSpecies(S.species); }
  // (a gate not placed yet is put beside the player first: director.force, out of order)
  const f0 = focusOf(P);
  if (kind === 'grazer' && !guards.byId.grazer1.placed) director.force('grazer1', f0.x + 60, f0.y, 0);
  if (kind === 'amoeba' && !guards.byId.amoeba.placed) director.force('amoeba', f0.x + 60, f0.y, 0);
  if (kind === 'grazer') {
    const g = world.grazers[0], Q = g.pose;
    debug.teleport(Q.mouth.x + Q.up.x * 2.5, Q.mouth.y + Q.up.y * 2.5, Math.atan2(-Q.up.y, -Q.up.x), P.slot);
    if (!multi()) { view.cx = S.x; view.cy = S.y; }
    P.game.catchBy('grazer', g, ev);
  } else if (kind === 'amoeba') {
    const A = world.amoeba, c = Math.cos(A.ang), s = Math.sin(A.ang);
    debug.teleport(A.x + s * 2, A.y - c * 2, A.ang, P.slot);
    P.game.catchBy('amoeba', A, ev);
  } else if (kind === 'phage') {
    debug.phageOnMe(P.slot);
    const ph = S.phages[S.phages.length - 1];
    ph.irreversible = true;
    P.game.catchBy('phage', ph, ev);
  } else {
    if (S.species !== 'mtb') setSpecies('mtb');
    const b = world.cells.find((c) => c.kind === 'bdello');
    b.x = S.x + Math.cos(S.a) * 3; b.y = S.y + Math.sin(S.a) * 3;
    b.prey = { x: S.x, y: S.y, a: S.a, L: S.sp.L, isPlayer: true }; b.attachT = 0;
    S.attacker = b;
    P.game.catchBy('bdello', b, ev);
  }
  if (ev.caught) startCatch(P, ev.caught);
  return P.capture.phase;
}
window.__micro = { forceCapture, capture,
  pacing: () => ({ t: pacing.now - pacing.t0, firstThreat: pacing.firstThreat, firstCatch: pacing.firstCatch,
    gates: guards.report(), log: gateInfo.log,
    capture: capture.active && cat.kind ? { phase: cat.phase, by: CATCH[cat.kind].by } : null, mode: S.mode, alive: S.alive }),
  world, swimmer, game, view, debug, features, optics, shapes, get t() { return t; }, get dash() { return P1.dash; },
  // Micro Zoom: players, split screen and landmarks
  players, split, landmarks: { forward: FWD, back: BACK, log: lm.log, get near() { return lm.near; } },
  get frames() { return frameCount; },
  /** The fights: each grazer's state, and each player's phage and Bdellovibrio stalker. */
  boss: () => ({ awake: stentor.awake, state: stentor.fight.state, t: +(stentor.fightT || 0).toFixed(2), interest: +stentor.fight.interest.toFixed(2), phase2: stentor.phase2, flowK: +stentor.flowK.toFixed(2), contract: +stentor.contract.toFixed(2), log: bossInfo.log }),
  stentor, collective: coll, quality,
  coll: () => coll.report(),
  collInfo,
  /** The way on: each gate (world.js ENCOUNTERS, guards.js) and the portal: where it is, placed or not. */
  challenges: () => {
    const out = [{ name: 'meadow (kin and prey)', r: world.route.meadow }];
    for (const q of guards.list) { const c = guards.centre(q); out.push({ name: `gate ${q.id}`, placed: q.kind === 'stentor' ? stentor.placed : q.placed, bearing: +q.bearing.toFixed(2), x: +c.x.toFixed(1), y: +c.y.toFixed(1), beaten: q.beaten }); }
    out.push({ name: 'portal (host, Stentor)', placed: !!world.landmarks.forward.placed, x: +FWD.x.toFixed(1), y: +FWD.y.toFixed(1) });
    return out;
  },
  /** The director (shared/director.js): its state (the order, what is placed and met, when), and its log. */
  encounters: () => director.state(),
  encounterLog: () => director.log.slice(),
  seenAt: (x, y) => director.seenAt(x, y),
  placeNow: () => director.placeNow(),
  director,
  rings: () => ({ log: director.log.slice(), portal: world.landmarks.forward.placed ? { x: FWD.x, y: FWD.y, guarded: guarded() } : null, turned: lm.log.filter((e) => e.kind === 'turnedBack').length }),
  /**
   * Testing only (it breaks the order on purpose): the portal now, `d` µm from player `slot` at bearing a
   * (default: where their flock is heading, else away from the start). director.force marks every
   * earlier encounter met ('forced').
   */
  placePortal(a = null, slot = 0, d = 200) {
    const P = roster.find((Q) => Q.slot === slot) || P1, f = focusOf(P), C = coll.of(P);
    let b = a ?? (C && C.speed > 6 ? Math.atan2(C.vy, C.vx) : world.distFromStart(f.x, f.y) > 5 ? world.bearingFromStart(f.x, f.y) : 0);
    let x = f.x + Math.cos(b) * d, y = f.y + Math.sin(b) * d;
    for (let i = 0; i < 16 && !world.inWater(x, y, 60); i++) { b += 0.4 * (i % 2 ? 1 : -1) * Math.ceil((i + 1) / 2); x = f.x + Math.cos(b) * d; y = f.y + Math.sin(b) * d; }
    director.force('portal', x, y, b);
    return { x: FWD.x, y: FWD.y };
  },
  /** Testing only: place encounter `id` (a gate id or 'portal') at (x, y), met along bearing b, out of order. */
  placeEncounter(id, x, y, b = 0) { return director.force(id, x, y, b); },
  enterPortal(slot = 0) { enterPortal(roster.find((Q) => Q.slot === slot) || P1); },
  /** The outro after the portal: null, or { t, scale (the world's time scale), frozen, cam (the shell's pose) }. */
  outro() { return outro ? { t: +outro.t.toFixed(3), scale: +outro.scale.toFixed(3), frozen: outro.frozenAt !== null, cam: outro.cam } : null; },
  OUTRO,
  /** The continuous transition, as poses in the field drawn now: your cell, and the glimpsed phage on the host. */
  cellPose: () => { const ov = camOverride(); return ov ? pose2D(P1.S.x, P1.S.y, P1.S.a, P1.S.sp.L, ov.cx, ov.cy, ov.fieldH) : cellPose(); },
  glimpsePose: () => { const ov = camOverride(); if (!ov) return glimpsePose(); const g = glimpsePhage(); return pose2D(g.x, g.y, g.a, PHAGE_LEN, ov.cx, ov.cy, ov.fieldH); },
  gates: () => guards.report(), guards,
  /** Every flock member (tests): position, velocity, speed, heading, spin. */
  members: (slot = 0) => { const C = coll.of(roster.find((Q) => Q.slot === slot) || P1); return C ? C.members.map((m) => ({ x: m.x, y: m.y, vx: m.vx, vy: m.vy, sp: m.sp, a: m.a, body: m.bodyPhase, fl: m.flPhase, lag: m.lag, vmax: m.vmax })) : []; },
  fights: () => ({ grazers: world.grazers.map((g) => ({ state: g.fightState, t: +(g.fightT || 0).toFixed(2), interest: +g.fight.interest.toFixed(2), pull: +(g.pull || 1).toFixed(2), target: g.target ? g.target.slot : null })),
    phage: roster.map((P) => (P.phage ? P.phage.fight.state : null)), bdello: roster.map((P) => (P.bdello ? P.bdello.fight.state : null)) }),
  roster: () => roster.map((P) => ({ slot: P.slot, x: P.S.x, y: P.S.y, speed: P.S.speed, body: P.S.bodyPhase, fl: P.S.flPhase, alive: P.S.alive, mode: P.S.mode, over: P.S.over, cause: P.S.cause, focus: { ...focusOf(P) }, capture: P.capture.active ? P.cat.phase : null })),
  get army() { return armyEl.textContent; },
  get warning() { return warnEl.textContent; },
};
requestAnimationFrame((n) => { last = n; frame(n); });
