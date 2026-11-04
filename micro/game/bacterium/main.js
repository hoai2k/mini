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
import { createWorld, segDist, DIRECTOR, DEFAULT_PATH, ENCOUNTERS, canPlace, DROP, rimDist, FAR_OUT } from './world.js';
import { createDirector } from '../shared/director.js';
import { createSwimmer, SPECIES } from './swim.js';
import { createGame, GOAL_PREY } from './game.js';
import { createDrawer } from './draw.js';
import { createStentor } from './stentor.js';
import { createOverlay } from './overlay.js';
import { createCapture, createFight } from '../shared/predation.js';
import { createPlayers } from '../shared/players.js';
import { createSplitScreen } from '../shared/splitscreen.js';
import { createLandmarks, portalArrowOn } from '../shared/landmark.js';
import { embed } from '../shared/embed.js';
import { gauss } from './world.js';
import { createCollectives, COLL, LEVEL_NAMES } from './collective.js';
import { createFollow, snapFollow, stepFollow, ZOOM, zoomStep } from './followcam.js';
import { createGuards } from './guards.js';
import { createQuality } from '../shared/quality.js';
import { createPortalGlow, createPortalLight, createGlint } from '../shared/portal.js';
import { clumpLayout, placeInFrame } from '../shared/kin-clump.js';
import { t as tt, tx } from '../shared/text.js';

const canvas = document.querySelector('canvas.view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
renderer.autoClear = false;

// --- players: P1 on the keyboard and the first controller; 2-4 join with any button on another ---
const players = createPlayers({
  max: 4,
  onJoin: (p) => { audio.play('shared/join', { volume: 0.6 }); hud.toast(tt('shared.players.joined', { n: p.slot + 1 })); embed.join(p.slot, p.color, p.name, players.toJSON()); }, // the roster rides along, so the shell carries this player into the next world
  onLeave: (p) => { hud.toast(tt('shared.players.left', { n: p.slot + 1 })); embed.leave(p.slot); },
  onChange: (list) => { if (hud) hud.players(list); },
});
if (embed.players) players.fromJSON(embed.players);
embed.on('players', (r) => players.fromJSON(r));
const pad = players.pad(0);
const ctl = players.controls(0);
const hud = mountHud({
  title: tt('bacterium.hud.title'),
  sub: tt('bacterium.hud.sub'),
  controls: hudControls({
    move: tt('bacterium.hud.controls.move'),
    camera: tt('bacterium.hud.controls.camera'),
    dash: tt('bacterium.hud.controls.dash'),
    attack: tt('bacterium.hud.controls.attack'),
    defend: tt('bacterium.hud.controls.defend'),
    special: tt('bacterium.hud.controls.special'),
    analog: tt('bacterium.hud.controls.analog'),
    secondary: tt('bacterium.hud.controls.secondary'),
    look: tt('bacterium.hud.controls.look'),
  }),
  note: tt('bacterium.hud.note'),
});
hud.players(players.list);
/** A button as the instructions should name it: the controller's, or the key while no controller is connected. */
const glyph = (b) => (hud.glyphs === 'keyboard' ? keyFor(b) || b : b);

// --- tiny DOM bits: end card, DATA tag, scale bar, the army chip, warnings, the backdoor prompt ---
const card = Object.assign(document.createElement('div'), { className: 'bx-card' });
const tag = Object.assign(document.createElement('div'), { className: 'bx-tag', textContent: tt('bacterium.dataTag') });
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
world.addMover(stentorGrain);
const dashFor = (sp) => (sp === 'mtb' ? createDash({ duration: 0.6, cooldown: 3 }) : createDash({ duration: 0.45, cooldown: 2.5 }));
/** Every player's cell: its own swimmer, rules (game), dash, catch and HUD state. */
const roster = [];
function makePlayer(p) {
  const swimmer = createSwimmer(world);
  swimmer.state.label = p.slot; // the strain's fluorescent protein (draw.js LABELS; player 1 unlabelled)
  const P = {
    slot: p.slot, color: p.color, name: tt('shared.players.name', { n: p.slot + 1 }), swimmer, S: swimmer.state, game: createGame(world, swimmer),
    dash: dashFor('mtb'), pad: players.pad(p.slot), ctl: players.controls(p.slot),
    capture: createCapture({ onRespawn: () => respawnPlayer(P) }),
    cat: { kind: null, who: null, phase: null, t: 0, x0: 0, y0: 0, a0: 0, zoom0: 45, released: false },
    follow: createFollow(), look: { x: 0, y: 0 }, // the follow camera (followcam.js) and the RS look held
    zoom: SPECIES.mtb.view, zoomWant: SPECIES.mtb.view, // the field height (µm): LT out, RT in, each player their own (stepZoom)
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
const collMsg = { lostAt: -9, recruitAt: -9, n: 0, beaconT: -9, joinSnd: -9, answerDue: false, answerSnd: -9, infectSnd: -9, eatSnd: -9, taken: {}, sizes: new Set() };
const coll = createCollectives(world, {
  onRecruit: (C) => {
    // a flock answers at once: the first answer to each beacon is heard, then the joins at most 4 a second
    if (collMsg.answerDue && t - collMsg.answerSnd > 0.3) { collMsg.answerSnd = t; audio.play('bacterium/answer', { volume: 0.5, rate: 0.95 + Math.random() * 0.1 }); }
    collMsg.answerDue = false;
    // (the Old set: its tumble stand-in, every 0.06 s)
    if (t - collMsg.joinSnd > (audio.set === 'old' ? 0.06 : 0.25)) { collMsg.joinSnd = t; audio.play('bacterium/join', { volume: 0.4, rate: 0.95 + Math.random() * 0.1, old: ['bacterium/tumble', { volume: 0.35, rate: 1.7 + Math.random() * 0.3 }] }); }
    const n = C.members.length + C.players.length;
    if (C.members.length === 1) hud.toast(tt('bacterium.toasts.firstKin'), 3200);
    else if (n === COLL.shield && t - collMsg.recruitAt > 2) { collMsg.recruitAt = t; hud.toast(tt('bacterium.toasts.armyShield', { n }), 2600); }
    else if (n === COLL.raft && t - collMsg.recruitAt > 2) { collMsg.recruitAt = t; hud.toast(tt('bacterium.toasts.armyRaft', { n }), 2600); }
    else if (n === COLL.toxin && t - collMsg.recruitAt > 2) { collMsg.recruitAt = t; hud.toast(tt('bacterium.toasts.armyToxin', { n, glyph }), 2600); }
  },
  onBeacon: () => { collMsg.answerDue = true; audio.play('bacterium/beacon', { volume: 0.6, old: ['bacterium/eat', { volume: 0.4, rate: 1.9 }] }); },
  onLost: (C, m, kind) => {
    if (kind === 'phage' && C && C.players.length && t - collMsg.infectSnd > 0.5) { collMsg.infectSnd = t; audio.play('bacterium/infected', { volume: 0.6 }); }
    // a member eaten by a grazer, the amoeba or Stentor poisons it (guards.js poison)
    if (C && C.players.length) guards.poison(kind, m, C);
    // each one taken is heard (a gulp; a Bdellovibrio's a burst), at most ~7 a second, quieter for a crowd
    if (C && C.players.length && t - collMsg.eatSnd > 0.14) {
      collMsg.eatSnd = t;
      if (kind === 'bdello') audio.play('bacterium/lyse', { volume: 0.45, rate: 0.8 + Math.random() * 0.2 });
      else if (kind === 'grazer' || kind === 'amoeba' || kind === 'stentor') audio.play('bacterium/eat', { volume: 0.5, rate: (kind === 'amoeba' ? 0.6 : kind === 'stentor' ? 0.75 : 0.9) + Math.random() * 0.15 });
    }
    // (the first time each enemy takes one, say so plainly; after that the gauge and the army line show it)
    if (!C || !C.players.length || collMsg.taken[kind] || t - collMsg.lostAt < 1.5) return;
    collMsg.lostAt = t; collMsg.taken[kind] = true;
    hud.toast(tt(`bacterium.toasts.memberTaken.${['grazer', 'amoeba', 'stentor', 'bdello', 'phage'].includes(kind) ? kind : 'other'}`, { left: C.members.length }), 2600);
  },
  onShield: (C, P, kind) => { if (t - collMsg.lostAt > 1.5) { collMsg.lostAt = t; hud.toast(kind === 'phage' ? tt('bacterium.toasts.slimePhage') : tt('bacterium.toasts.slimeRam'), 2000); } },
  onMerge: (C, P) => { hud.toast(tt('bacterium.toasts.joinsFlock', { name: P.name, names: C.players.map((Q) => Q.name).join(tt('bacterium.toasts.and')) }), 3600); },
  onSplit: (C, N, P, k) => { hud.toast(tt('bacterium.toasts.branchesOff', { name: P.name, k, name2: P.name, stay: C.members.length }), 3000); },
  onDivide: () => {},
  onBurst: (C, b) => toxinBurst(C, b),
  // waylaying (collective.js WAYLAY): a stranger's decoy pulse draws a member off; X calls it back
  onWaylay: (C) => {
    if (!C.players.length) return;
    audio.play('bacterium/answer', { volume: 0.35, rate: 0.62 });
    if (!collMsg.waylayHint) { collMsg.waylayHint = true; hud.toast(tt('bacterium.toasts.waylay', { glyph }), 4200); }
  },
  onRecall: () => { if (t - collMsg.answerSnd > 0.2) { collMsg.answerSnd = t; audio.play('bacterium/answer', { volume: 0.5, rate: 1.15 }); } },
  onWaylaid: (C) => {
    if (!C || !C.players.length) return;
    audio.play('bacterium/infected', { volume: 0.45, rate: 1.3 });
    if (t - collMsg.lostAt < 1.5) return;
    collMsg.lostAt = t;
    hud.toast(tt('bacterium.toasts.waylaid', { left: C.members.length, glyph }), 3200);
  },
});
world.coll = coll;
coll.reset(roster);
// --- the gates on the way (guards.js): enemies the army fights by contact ---
const gateMsg = { seen: new Set(), bite: {}, drillHint: false };
const guards = createGuards(world, coll, stentor, {
  onBeaten: (q) => {
    audio.play('bacterium/gate', { volume: 0.9, old: ['bacterium/eat', { volume: 1, rate: 0.6 }] });
    for (const P of roster) P.pad.rumble(250, 0.6, 0.6);
    const text = tt(`bacterium.toasts.gateBeaten.${q.kind}`, { glyph });
    hud.toast(text, 3600);
    gateInfo.log.push({ ev: 'beaten', id: q.id, t });
  },
  onKill: () => { audio.play('bacterium/lyse', { volume: 0.6, old: ['bacterium/eat', { volume: 0.6, rate: 1.3 }] }); },
  // an enemy's tell (its cilia race, its edge bulges) and its bite (members taken): heard, and shaken on the pad
  onTell: (q) => { if (q.kind === 'grazer') audio.play('bacterium/stentor', { volume: 0.35, rate: 1.4 }); else if (q.kind === 'amoeba') audio.play('bacterium/stentor', { volume: 0.4, rate: 0.7 }); },
  // the amoeba (guards.js IRR, TUN): it flinches (half way to routed), and a tunnel bored right through it
  onFlinch: () => { if (!gateMsg.flinch) { gateMsg.flinch = true; hud.toast(tt('bacterium.toasts.amoebaFlinch', { glyph }), 2800); } },
  onThrough: () => { audio.play('bacterium/gate', { volume: 0.5, rate: 1.4 }); if (!gateMsg.through) { gateMsg.through = true; hud.toast(tt('bacterium.toasts.tunnelThrough'), 3200); } },
  onBite: (q, n, how) => {
    if (!n) return;
    audio.play('bacterium/graze', { volume: 0.7, rate: q.kind === 'amoeba' ? 0.7 : q.kind === 'stentor' ? 0.85 : 1.1 });
    for (const P of roster) P.pad.rumble(140, 0.4, 0.5);
    // say what took them, where (the eaten animation plays at the spot): one line per attack, Stentor's summed over 3 s
    const b = gateMsg.bite[q.kind] || (gateMsg.bite[q.kind] = { n: 0, t: -9 });
    b.n += n;
    if (t - b.t > (q.kind === 'stentor' ? 3 : 1.5)) { b.t = t; hud.toast(tt(`bacterium.toasts.bite.${how || q.kind}`, { n: b.n }), 2600); b.n = 0; }
  },
});
const gateInfo = { log: [] };
// drilling: a soft grinding, at most every 0.45 s while any member drills (bacterium/strike, quiet and low)
const drillSnd = { t: 0 };

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
const KEEP = { r: 130, kin: 8, kinShort: 18, prey: 14, strangers: 1, far: 240, every: 0.4, moves: 4 };
const BOSS_HIT_K = 0.02; // a tumble free of a pull, a foot bump or a wasted pull: this share of Stentor's health
const keepT = { t: 0 };
const leaderP = () => { const L = director.leader; return L ? roster.find((P) => P.slot === L.id) || null : null; };
const armyOf = (P) => { const C = P && coll.opts.on && coll.of(P); return C ? C.army : 1; };
/** The army the next encounter wants (after the last: the boss's). */
const nextNeed = () => (ENCOUNTERS[director.index] || ENCOUNTERS[ENCOUNTERS.length - 1]).need;
/** Met: a player's flock comes into the gate's zone (where the army fights it), or it is beaten. */
const gateMet = (q) => (h, [p]) => { const c = guards.centre(q); return q.beaten || Math.hypot(p.x - c.x, p.z - c.y) < q.zone + 8; };
const ENC = { portal: { place: (x, y, b) => placePortal(x, y, b), met: () => false } };
for (const q of guards.list) if (q.kind !== 'stentor') ENC[q.id] = { place: (x, y, b) => { guards.placeGate(q, x, y, b); return q; }, met: gateMet(q) };
// The default path (world.js DEFAULT_PATH): the host with Stentor laid out across the field on
// the first frame, so the way on exists from the start (sealed until every gate is met: portalSealed); the gates
// are still placed as you go, each after its break and the army-size hold (the field has no room to lay them
// out with their breaks). Off the bearing the host, while nobody has seen it, leaves the path and is placed
// ahead of you after the last gate, as before (one thing each: single).
const director = createDirector({
  ...DIRECTOR,
  defaultPath: DEFAULT_PATH,
  // encounters also keep clear of the gates already met (still standing where they were)
  canPlace: (x, y, r, o) => canPlace(x, y, r) && guards.list.every((q) => !q.placed || q.id === o.entry.id || Math.hypot(guards.centre(q).x - x, guards.centre(q).y - y) > r * 0.5 + q.zone),
  entries: ENCOUNTERS.map((e, i) => {
    const o = { ...e, ...ENC[e.id], single: true };
    // the break before it: longer (up to ARMY_HOLD s) while the leader's army is short of its need
    // (and short, once the leader is FAR_OUT from the start: the host comes long before the drop's edge)
    Object.defineProperty(o, 'calm', { get: () => { const base = (i === 0 ? DIRECTOR.warmup : DIRECTOR.calm).sec, L = leaderP(), f = L && focusOf(L); if (f && world.distFromStart(f.x, f.y) > FAR_OUT) return { sec: 1 }; return { sec: base + Math.max(0, Math.min(ARMY_HOLD, (e.need - armyOf(L)) / 4)) }; } });
    return o;
  }),
});
const PORTAL_INDEX = ENCOUNTERS.findIndex((e) => e.final);
/** The way on exists from the start but stays shut until every earlier encounter is met (the director's order). */
function portalSealed() { return director.index < PORTAL_INDEX; }
/** A predator would take player P: the collective gives a member instead (or the slime stops it). */
function absorbHit(P, kind, who) {
  const from = kind === 'grazer' ? who.pose.mouth : kind === 'stentor' ? who.mouth : kind === 'phage' ? (who.p || who) : who;
  if (!coll.absorb(P, kind, from)) return false;
  if (!(P.hitSndT > t)) { P.hitSndT = t + 0.3; audio.play('shared/hit', { volume: 0.55 }); }
  if (from && !(P.kickT > 0)) { P.kickT = kind === 'phage' || kind === 'bdello' || kind === 'stentor' ? 0.2 : 0.6; P.kickFrom = { x: from.x, y: from.y }; }
  P.pad.rumble(160, 0.5, 0.4);
  return true;
}
/** The toxin burst: every enemy in reach takes a big hit; grazers recoil, Bdellovibrio die or flee, phages are destroyed. */
function toxinBurst(C, b) {
  const R = b.R;
  audio.play('bacterium/toxin', { volume: 1, old: ['bacterium/eat', { volume: 1, rate: 0.55 }] });
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
  if (Math.hypot(stentor.mouth.x - b.x, stentor.mouth.y - b.y) < R + stentor.discR && stentor.awake && !stentor.beaten) stentor.knock(b.x, b.y, 0.9); // (a big recoil)
  collInfo.bursts.push({ t, x: b.x, y: b.y, hit: [...new Set(hit)] });
  const what = [...new Set(hit)];
  const names = tx('bacterium.hitNames');
  hud.toast(what.length ? tt('bacterium.toasts.toxinHit', { what: what.map((w) => names[w] ?? w).join(', ').replace(/^./, (x) => x.toUpperCase()) }) : tt('bacterium.toasts.toxinMiss'), 2600);
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
  P.S.x = m.x + Math.cos(a) * d; P.S.y = m.y + Math.sin(a) * d;
  if (!world.inWater(P.S.x, P.S.y, -60)) { P.S.x = m.x; P.S.y = m.y; } // (beside a teammate at the drop's edge: on them)
  P.S.a = m.a !== undefined ? m.a + (Math.random() - 0.5) : P.S.a;
  world.pushOutOfGrains(P.S, P.S.sp.r + 0.2);
}

// --- the landmarks: the way on (the host, the portal) and the backdoor (the Paramecium) ---
const LMK = world.landmarks;
const FWD = { x: LMK.forward.x, y: LMK.forward.y, z: 0 };
const BACK = { x: LMK.back.x, y: LMK.back.y, z: 0 };
const lm = { fired: false, near: false, portal: false, log: [], turned: false, hinted: false };

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
  stentor.awake = false; stentor.recoil = 0; stentor.contract = 0; bossInfo.log.length = 0; bossInfo.guardMsg = false;
  clearPortal(); lm.fired = false;
  resetEncounters();
  gateMsg.seen.clear();
}
function updatePressure() {
  for (const g of world.grazers) g.feeding = !g.beaten;
  world.hunt.phage = false; // (ambient phages only: the phage cloud is no longer a gate)
  world.hunt.bdello = !guards.byId.bdello.beaten;
  world.hunt.amoeba = !world.amoeba.beaten;
  // the first time a player's flock reaches a gate, say what it is and how to beat it
  for (const q of guards.list) {
    if (!q.engaged || gateMsg.seen.has(q.id)) continue;
    gateMsg.seen.add(q.id);
    hud.toast(tt(`bacterium.gates.${q.id}`, { glyph }), 4600);
    gateInfo.log.push({ ev: 'reached', id: q.id, t });
  }
  // drilling: heard while any member bores in
  const drilling = guards.list.reduce((a, q) => a + (q.beaten ? 0 : q.drills), 0);
  if (drilling > 2 && !gateMsg.drillHint) { gateMsg.drillHint = true; hud.toast(tt('bacterium.toasts.drillWorks', { glyph }), 3200); }
  if (drilling && t - drillSnd.t > 0.45) { drillSnd.t = t; audio.play('bacterium/strike', { volume: Math.min(0.45, 0.12 + drilling / 300), rate: 0.55 + Math.random() * 0.1 }); }
}

// --- being caught: strike → hold → eat → the Eaten card (shared/predation.js) ---
// Solo: the Eaten card and A to start again. Multiplayer: the catch plays out
// the same, then the player rejoins beside a teammate.
const CATCH = {
  stentor: { by: tt('bacterium.capture.stentor.by'), how: tt('bacterium.capture.stentor.how'), sound: 'bacterium/graze',
    strike: tt('bacterium.capture.stentor.strike'), hold: tt('bacterium.capture.stentor.hold'), eat: tt('bacterium.capture.stentor.eat') },
  grazer: { by: tt('bacterium.capture.grazer.by'), how: tt('bacterium.capture.grazer.how'), sound: 'bacterium/graze',
    strike: tt('bacterium.capture.grazer.strike'), hold: tt('bacterium.capture.grazer.hold'), eat: tt('bacterium.capture.grazer.eat') },
  amoeba: { by: tt('bacterium.capture.amoeba.by'), how: tt('bacterium.capture.amoeba.how'), sound: 'bacterium/graze',
    strike: tt('bacterium.capture.amoeba.strike'), hold: tt('bacterium.capture.amoeba.hold'), eat: tt('bacterium.capture.amoeba.eat') },
  phage: { by: tt('bacterium.capture.phage.by'), how: tt('bacterium.capture.phage.how'), sound: 'bacterium/phage',
    strike: tt('bacterium.capture.phage.strike'), hold: tt('bacterium.capture.phage.hold'), eat: tt('bacterium.capture.phage.eat') },
  bdello: { by: tt('bacterium.capture.bdello.by'), how: tt('bacterium.capture.bdello.how'), sound: 'bacterium/eat',
    strike: tt('bacterium.capture.bdello.strike'), hold: tt('bacterium.capture.bdello.hold'), eat: tt('bacterium.capture.bdello.eat') },
};
const capture = P1.capture;
const cat = P1.cat;
function startCatch(P, { kind, who }) {
  const S = P.S, cat = P.cat;
  Object.assign(cat, { kind, who, phase: 'strike', t: 0, x0: S.x, y0: S.y, a0: S.a, zoom0: P.zoom, released: false });
  S.catchAnim = cat;
  P.eatenFor = 0;
  coll.remove(P); // members stay with the others (or go free)
  P.capture.start({ by: CATCH[kind].by, how: CATCH[kind].how });
  audio.play(CATCH[kind].sound, { volume: 1, rate: kind === 'amoeba' ? 0.7 : 1 });
  audio.play('shared/death', { volume: 0.6, delay: 0.4 });
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
  audio.play('shared/reform', { volume: 0.7 });
  const mates = alive().filter((Q) => Q !== P && !Q.capture.active);
  if (mates.length) { placeNear(P, mates[0]); hud.toast(tt('bacterium.toasts.backBeside', { name: P.name, mate: mates[0].name })); return; }
  // a safe spot: open water ~90-130 µm from where you were, as far as can be from every gate still
  // standing and from Stentor (kin are kept near you wherever you are: keepAmbient)
  const best = safeSpot(P.S.x, P.S.y);
  P.S.x = best.x; P.S.y = best.y;
  world.pushOutOfGrains(P.S, P.S.sp.r + 0.2);
  if (P === P1) { view.cx = P.S.x; view.cy = P.S.y; }
  hud.toast(multi() ? tt('bacterium.toasts.back', { name: P.name }) : tt('bacterium.toasts.newCell'), 2400);
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
  if (mates.length) { placeNear(P, mates[0]); hud.toast(tt('bacterium.toasts.backBeside', { name: P.name, mate: mates[0].name })); }
  else { P.S.x = -20; P.S.y = 32; hud.toast(tt('bacterium.toasts.back', { name: P.name })); }
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
    if (g.battle || g.parked) { g.target = null; continue; } // fighting a swarm: guards.js drives its tell and bite
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
    if (T.sprintT > 0 && d < 34 && f.state !== 'retreat') { T.sprintT = 0; const gone = g.fight.bitten(); hud.toast(gone ? tt('bacterium.toasts.sprintOut', { who: who(T) }) : tt('bacterium.toasts.sprintAgainst', { who: who(T) }), 1800); }
    if (f.hit && d < 8) { const ev = {}; T.game.catchBy('grazer', g, ev); if (ev.caught) startCatch(T, ev.caught); }
    if (f.blocked) { T.pad.rumble(200, 0.6, 0.5); hud.toast(tt('bacterium.toasts.tumbledClearGrazer', { who: who(T) }), 1800); }
    // out of interest (worn down by sprints and dodges): it coils back on its stalk and its current stops
    if (g.fight.state === 'retreat' && !g.retreating) { g.retreating = true; g.contract = 3; g.ext = 0; hud.toast(tt('bacterium.toasts.grazerGivesUp'), 2000); }
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
        hud.toast(tt('bacterium.toasts.slimePhageWho', { who: who(P) }), 1600);
      } else if (f.hit) {
        const side = (p.x - S.x) * -sa + (p.y - S.y) * ca > 0 ? 1 : -1;
        const ph = { p, u, side, t: 0, irreversible: false, shed: false };
        p.stuck = ph; p.homing = false; S.phages.push(ph); P.phage = null;
        audio.play('bacterium/phage', { volume: 0.8 }); P.pad.rumble(80, 0.4, 0.1);
        hud.toast(tt('bacterium.toasts.phageBound', { who: who(P), glyph }), 2600);
      } else if (f.blocked || f.retreated || d > 26 || (P.sprintT > 0 && d < 3)) {
        if (f.blocked || P.sprintT > 0) hud.toast(tt('bacterium.toasts.shakenOff', { who: who(P) }), 1500);
        p.homing = false; p.splay = 0; p.x += nx * 2; p.y += ny * 2; P.phage = null;
      }
    }
    // --- Bdellovibrio lining up to ram the magnetotactic cell ---
    // (also let go of one that is no longer there to attack: killed by the army, gone out of sight after
    // taking a member, or attached to other prey; its wind-up ring would otherwise pulse with nothing behind it)
    if (P.bdello && (!fightable(P) || S.species !== 'mtb' || !world.opts.hunters || !world.hunt.bdello || S.attacker || P.bdello.c.dead || P.bdello.c.hidden > 0 || P.bdello.c.prey || P.bdello.c.latch)) { P.bdello.c.stalking = null; P.bdello.c.cooldown = Math.max(P.bdello.c.cooldown || 0, 6); P.bdello = null; }
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
      if (f.state === 'strike' && P.bdello.st !== 'strike') audio.play('bacterium/bdello', { volume: 0.7 }); // it rams
      P.bdello.st = f.state;
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
        hud.toast(tt('bacterium.toasts.slimeRamWho', { who: who(P) }), 1600);
      } else if (f.hit && d < 1.4 && absorbHit(P, 'bdello', c)) {
        c.stalking = null; c.cooldown = 8; c.windup = 0; P.bdello = null;
      } else if (f.hit && d < 1.4) {
        S.attacker = c; c.prey = { x: S.x, y: S.y, a: S.a, L: S.sp.L, isPlayer: true }; c.attachT = 0; S.attackT = 0; c.stalking = null; c.windup = 0; P.bdello = null;
        P.pad.rumble(300, 0.8, 0.8);
        hud.toast(tt('bacterium.toasts.bdelloRammed', { who: who(P), glyph }), 2600);
      } else if (f.blocked || f.retreated || d > 45 || (P.sprintT > 0 && d < 8 && fight.bitten())) {
        if (f.blocked) { P.pad.rumble(150, 0.5, 0.4); hud.toast(tt('bacterium.toasts.bdelloMissed', { who: who(P) }), 1500); }
        c.stalking = null; c.cooldown = 6; c.windup = 0; P.bdello = null;
      }
    }
  }
}

// --- the boss: Stentor, guarding the host cell -----------------------------------
// The last gate (guards.js 'stentor', stentor.js): it leans over the host, covering it; its feeding cone
// draws in debris, free cells and your members a little at a time; it turns and stretches to aim the cone
// at you, deliberately; drilling dents its body and knocks it back, and sustained pushing drags its holdfast
// off the host, which uncovers the way on. Beat it, or push it off: either opens the host.
const BOSS_HIT = () => guards.byId.stentor.max * BOSS_HIT_K; // health taken by a bump of its foot
const gaugeEl = document.createElement('div');
gaugeEl.style.cssText = 'position:fixed;left:50%;top:56px;transform:translateX(-50%);z-index:20;pointer-events:none;display:none;color:#e6d3a3;font:600 11px/1.2 system-ui,sans-serif;letter-spacing:.04em;text-align:center;text-shadow:0 1px 2px rgba(0,0,0,.7)';
gaugeEl.innerHTML = '<div class="nm"></div><div style="margin:3px auto 0;width:150px;height:5px;border:1px solid rgba(201,163,90,.85);border-radius:3px;background:rgba(20,16,8,.45)"><i style="display:block;height:100%;background:#c9a35a;border-radius:2px;width:100%"></i></div>';
document.body.appendChild(gaugeEl);
const bossInfo = { log: [], footT: 0, guardMsg: false };
/**
 * Stentor (stentor.js) each step: it wakes when a swarm comes near, turns and stretches its feeding cone
 * toward the nearest swarm (or lone cell), and its holdfast creeps after you; its cone takes your members a
 * little at a time (guards.js) and draws in a lone cell; bumping its foot knocks it. Its grain follows its foot.
 */
function runBoss(dt) {
  const B = stentor, G = guards.byId.stentor;
  if (!B.placed) return;
  let tgt = null, nd = Infinity;
  for (const P of roster) if (fightable(P)) { const f = focusOf(P), d = Math.hypot(f.x - B.mouth.x, f.y - B.mouth.y); if (d < nd) { nd = d; tgt = { x: f.x, y: f.y }; } }
  if (!B.awake && !B.beaten && (nd < B.wakeR || bossInfo.force)) { B.awake = true; bossInfo.log.push({ ev: 'wake', t }); audio.play('bacterium/stentor', { volume: 0.6 }); }
  B.update(dt, tgt);
  stentorGrain.x = B.foot.x - B.ux * 10; stentorGrain.y = B.foot.y - B.uy * 10;
  if (B.beaten || !B.awake) return;
  for (const P of roster) {
    if (!fightable(P)) continue;
    // deep in its cone a cell is drawn in (with a swarm, its members are taken first: guards.js and absorb)
    const k = B.cone(P.S.x, P.S.y);
    P.sweptT = k > 0.4 ? (P.sweptT || 0) + dt * k * 0.8 : 0;
    if (P.sweptT > 1) { P.sweptT = 0; const ev = {}; P.game.catchBy('stentor', B, ev); if (ev.caught) { startCatch(P, ev.caught); bossInfo.log.push({ ev: 'catch', slot: P.slot, t }); } }
    // bumping its foot: it flinches back (a knock)
    if (Math.hypot(P.S.x - B.foot.x, P.S.y - B.foot.y) < 9 && bossInfo.footT <= 0) {
      bossInfo.footT = 4; guards.hurt(G, BOSS_HIT()); B.knock(P.S.x, P.S.y, 0.6); bossInfo.log.push({ ev: 'foot', slot: P.slot, t });
      P.pad.rumble(200, 0.6, 0.6);
      hud.toast(tt('bacterium.toasts.stentorFoot'), 2000);
    }
  }
  bossInfo.footT = Math.max(0, bossInfo.footT - dt);
}
/** The enemy gauge: the nearest gate your flock is fighting, its health as a brass bar. */
function gauge() {
  const f = focusOf(P1);
  const q = guards.nearest(f.x, f.y);
  gaugeEl.style.display = q ? 'block' : 'none';
  if (!q) return;
  const B = stentor;
  const name = q.kind === 'stentor' ? tt(q.hp < q.max * 0.5 ? 'bacterium.gauge.stentorStraining' : 'bacterium.gauge.stentor') : q.kind === 'bdello' ? tt('bacterium.gauge.bdello', { left: world.cells.filter((c) => c.kind === 'bdello' && c.home && !c.dead).length }) : q.kind === 'amoeba' ? tt('bacterium.gauge.amoeba') : tt('bacterium.gauge.peritrich');
  // (its tell shows in the gauge too: the line turns warm while it winds up to bite)
  const tell = q.kind === 'stentor' ? B.state === 'recoil' : q.atk.st === 'tell';
  gaugeEl.querySelector('.nm').textContent = q.drills ? tt('bacterium.gauge.drilling', { name, n: q.drills }) : name;
  gaugeEl.querySelector('.nm').style.color = tell ? '#ffb27a' : '';
  // (the amoeba has no health to show: it cannot be killed, only routed; its irritation shows on it, draw.js)
  const bar = gaugeEl.querySelector('i');
  if (q.kind === 'amoeba') { bar.parentElement.style.visibility = 'hidden'; gaugeEl.querySelector('.nm').textContent = q.drills ? tt('bacterium.gauge.drilling', { name: amoebaMood(q), n: q.drills }) : amoebaMood(q); return; }
  bar.parentElement.style.visibility = '';
  bar.style.width = `${Math.round(Math.max(0, q.hp / q.max) * 100)}%`;
}
/** How the amoeba is taking it, in words (its irritation, guards.js IRR). */
const amoebaMood = (q) => tt(`bacterium.gauge.amoebaMood.${q.irr < 0.25 ? 'calm' : q.irr < 0.5 ? 'stung' : q.irr < 0.8 ? 'flinching' : 'giving'}`);

// --- rendering ---
const optics = createLightOptics(renderer);
// A/B switches for measurements (README "Performance"): ?psfdown=0 keeps the PSF at full
// resolution; ?rects=0 renders each split view over the whole screen as before
const devQ = new URLSearchParams(location.search);
if (devQ.get('psfdown') === '0') optics.toggles.down = false;
const useRects = devQ.get('rects') !== '0';
const FLOCK_N = Math.max(0, Math.min(COLL.max, +(devQ.get('flock') || 0)));
/** Is (x, y) within r of anything a view shows (the director's views, last frame)? (world.watch, the members' LOD) */
const inViewNow = (x, y, r) => director.visibleNow(x, 0, y, r);
const shapes = createShapes(24000); // (a swarm of 1000 draws up to ~6 shapes a member up close, one each far out: draw.js LOD)
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
/** The split layout without degenerate (empty) regions, for shared/landmark.js, projecting through each view's camera. */
const arrowSplit = () => { const L = split.layout; return { layout: { ...L, regions: L.regions.filter((r) => r.polygon.length > 2) }, project: projectView }; };
// Each view's camera (camMatrix): its centre on the slide, field, matrix and inverse. The split screen's
// 2D mode works in the shared frame: the slide as the shared camera shows it (toFrame), so a view's
// offset there is turned back into a centre on the slide (groundAt).
const camViews = [];
const camPool = [0, 1, 2, 3].map((index) => ({ index, cx: 0, cy: 0, fieldH: 45, M: new THREE.Matrix4(), Mi: new THREE.Matrix4() }));
const frameCam = { cx: 0, cy: 0, fieldH: 45, fw: 80, M: new THREE.Matrix4(), Mi: new THREE.Matrix4() };
function setFrame(cx, cy, fieldH) {
  Object.assign(frameCam, { cx, cy, fieldH, fw: fieldH * aspect() });
  camMatrix(frameCam.M, cx, cy, fieldH, aspect()); frameCam.Mi.copy(frameCam.M).invert();
}
const _nq = {};
/** A slide point in the shared frame (what the split screen's 2D mode lays out). */
function toFrame(p) { ndcOf(frameCam.M, p.x, p.y, _nq); return { x: frameCam.cx + _nq.x * frameCam.fw / 2, y: frameCam.cy + _nq.y * frameCam.fieldH / 2, z: 0 }; }
/** The cameras for the split layout L (null: one view, the shared frame's own). */
function layoutCams(L, cx, cy, fieldH) {
  if (!L) setFrame(cx, cy, fieldH);
  camViews.length = 0;
  const vs = L && L.views.length ? L.views : [{ index: 0, offset: { x: 0, y: 0 }, slots: null }];
  for (const v of vs) {
    const c = camPool[v.index] || camPool[0], o = v.offset || { x: 0, y: 0 };
    groundAt(frameCam.Mi, o.x / (frameCam.fw / 2), o.y / (frameCam.fieldH / 2), _nq);
    c.cx = _nq.x; c.cy = _nq.y;
    // split: each view keeps its own players' zoom (the shared view: everyone's widest), eased in and
    // out with the split (L.amount), so a merge needs no zoom change; it zooms about the view's players
    // (their follow points), so they stay where the split screen shows them
    c.fieldH = frameCam.fieldH;
    if (L && !L.merged && v.slots) {
      // (split.viewBlend: each player's field blended with those near them, eased with the split)
      const r = split.viewBlend(v, (j) => zoomPull(fieldOfSlots([L.players[j].slot])) * groupZoom.applied / frameCam.fieldH, 1);
      const ms = (v.members || []).map((j) => L.players[j] && L.players[j].position).filter(Boolean);
      if (r !== 1 && ms.length) {
        const mx = ms.reduce((s, p) => s + p.x, 0) / ms.length, my = ms.reduce((s, p) => s + p.y, 0) / ms.length;
        c.cx = mx - r * (mx - c.cx); c.cy = my - r * (my - c.cy);
      }
      c.fieldH = frameCam.fieldH * r;
    }
    camMatrix(c.M, c.cx, c.cy, c.fieldH, aspect()); c.Mi.copy(c.M).invert();
    camViews.push(c);
  }
}
const camOf = (i) => camViews.find((c) => c.index === i) || camViews[0] || camPool[0];
/** Screen position (CSS px from the top left) of a slide point as view i shows it. */
function projectView(i, p) { const q = ndcOf(camOf(i).M, p.x, p.y, {}); return { x: (q.x + 1) / 2 * innerWidth, y: (1 - q.y) / 2 * innerHeight, behind: q.behind }; }
// Two to four players share one view, zoomed out up to this far (a field 1.6x
// as tall) before the screen splits; split views settle at 0.75 of it.
const SPLIT_ZOOM_MAX = 1.6;
const groupZoom = { z: 1, applied: 1 };
const split = createSplitScreen(renderer, { capture: true, zoomMax: SPLIT_ZOOM_MAX });
const marks = createLandmarks({ zIndex: 4 });

// Delivered art (null until delivered; the ids may not be in the list yet).
const safeTexture = (id) => { try { return loadTexture(id, { srgb: false }); } catch { return Promise.resolve(null); } };
const plates = { phase: null };
safeTexture('MP-B01').then((t) => { if (t) plates.phase = t; });
safeTexture('MP-B02').then((t) => { if (t) shapes.setTextures({ bio: t }); });
safeTexture('MP-B03').then((t) => { if (t) shapes.setTextures({ cil: t }); });
safeTexture('MP-B04').then((t) => { if (t) shapes.setTextures({ mag: t }); });

/**
 * The zoom (the owner, 2026-11-03: "LT/RT be zoom (like paramecium) instead of DPad"): LT out, RT in,
 * analogue and continuous, each player their own, as the Paramecium's: the trigger sets how fast the
 * wanted field moves (×e^(rate·s) at full pull), and the field eases to it (followcam.js ZOOM, zoomStep):
 * from 10 to 600 µm, starting at the species' field (20 µm), continuous, with no field stop and no
 * automatic zoom (the owner, 2026-11-04).
 */
/** The widest field of these players (a shared view never narrows anyone's). */
const fieldOfSlots = (slots) => { let z = 0; for (const P of roster) if (!P.waiting && slots.includes(P.slot)) z = Math.max(z, P.zoom); return z || P1.zoom; };
/** The field shown (one view: every player's widest): being eaten (alone), the camera pulls back to watch the predator, then follows it. */
const zoomPull = (z) => (!multi() && P1.capture.active && P1.cat.realPhase && /eat|follow|fade/.test(P1.cat.realPhase) ? Math.max(z, ZOOM.pull) : z);
const baseField = () => zoomPull(fieldOfSlots(roster.map((P) => P.slot)));
const view = { mark: true, cx: 0, cy: 30, focus: 0, focusH: 1.8, look: 'phase', overlay: false, stop: true }; // focusH: the height your cell swims at (the focus follows it)

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
const audio = createAudio(['bacterium/amb-sediment', 'bacterium/run', 'bacterium/tumble', 'bacterium/sprint', 'bacterium/eat', 'bacterium/phage', 'bacterium/graze', 'shared/portal-chime',
  'bacterium/beacon', 'bacterium/answer', 'bacterium/join', 'bacterium/toxin', 'bacterium/lyse', 'bacterium/strike', 'bacterium/stentor', 'bacterium/bdello', 'bacterium/gate', 'bacterium/infected',
  'shared/portal-enter', 'shared/slowdown', 'shared/portal-near', 'shared/portal-sealed', 'shared/portal-appear', 'shared/backdoor', 'shared/hit', 'shared/death', 'shared/reform', 'shared/join']);
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
features.add({ id: 'species', group: 'Body', choices: [SPECIES_NAMES.mtb, SPECIES_NAMES.bdello], value: SPECIES_NAMES.mtb,
  onChange: (v) => setSpecies(v === SPECIES_NAMES.bdello ? 'bdello' : 'mtb') });
const LOOK_CYCLE = ['phase', 'fluorescence', 'darkfield', 'sem', 'dic'];
const LOOK_LABEL = { phase: 'Phase contrast', fluorescence: 'Fluorescence', darkfield: 'Darkfield' };
features.add({ id: 'look', group: 'Optics', choices: Object.values(LOOK_LABEL), value: LOOK_LABEL.phase,
  onChange: (v) => { view.look = Object.keys(LOOK_LABEL).find((k) => LOOK_LABEL[k] === v) || 'phase'; } });
features.add({ id: 'psf', group: 'Optics', on: true,
  about: tt('bacterium.features.psf.about', { nm: (psfSigmaUm() * 1000).toFixed(0) }),
  onChange: (on) => { optics.toggles.psf = on; } });
features.add({ id: 'halo', group: 'Optics', on: true, onChange: (on) => { optics.toggles.halo = on; } });
features.add({ id: 'focus', group: 'Optics', fixed: true }); // the focus stays on your cell's plane (no focus control: the owner, 2026-11-03)
features.add({ id: 'plate', group: 'Optics', on: true, onChange: (on) => { optics.toggles.plate = on; } });
features.add({ id: 'noise', group: 'Optics', on: true, onChange: (on) => { optics.toggles.noise = on; } });
features.add({ id: 'chMemb', group: 'Optics', on: true, onChange: (on) => { drawer.chan.memb = on ? 1 : 0; } });
features.add({ id: 'chFlag', group: 'Optics', on: true, onChange: (on) => { drawer.chan.flag = on ? 1 : 0; } });
features.add({ id: 'chLabel', group: 'Optics', on: true, onChange: (on) => { drawer.chanLab.on = on ? 1 : 0; } });
features.add({ id: 'chMag', group: 'Optics', on: true, onChange: (on) => { drawer.chan.mag = on ? 1 : 0; } });
features.add({ id: 'chPhage', group: 'Optics', on: true, onChange: (on) => { drawer.chan.phage = on ? 1 : 0; } });
features.add({ id: 'overlay', group: 'Optics', on: false,
  onChange: (on) => { view.overlay = on; tag.classList.toggle('show', on); } });
features.add({ id: 'mark', group: 'Optics', on: true, onChange: (on) => { view.mark = on; } });
features.add({ id: 'collective', group: 'Body', on: true,
  onChange: (on) => { collFeature.on = on; coll.opts.on = on && S.species === 'mtb'; coll.reset(roster); } });
features.add({ id: 'shapes', group: 'Rendering', fixed: true });
features.add({ id: 'field', group: 'Rendering', fixed: true });
// Motion
const STEER_MODES = ['Steer: the cell follows the stick', 'Tumble bias only: the stick leans each tumble', 'Honest: no steering'];
features.add({ id: 'bias', group: 'Motion', choices: STEER_MODES, value: STEER_MODES[0],
  onChange: (v) => { swimmer.opts.steer = v === STEER_MODES[0]; swimmer.opts.bias = v !== STEER_MODES[2]; } });
features.add({ id: 'spont', group: 'Motion', choices: ['Off: you are the chemotaxis network', 'Real motor clock'], value: 'Off: you are the chemotaxis network',
  onChange: (v) => { swimmer.opts.spontaneous = v.startsWith('Real'); } });
features.add({ id: 'rotdiff', group: 'Motion', on: true, onChange: (on) => { swimmer.opts.rotDiff = on; } });
features.add({ id: 'brown', group: 'Motion', on: true, onChange: (on) => { swimmer.opts.brownian = on; world.opts.brownian = on; } });
features.add({ id: 'lowre', group: 'Motion', on: true, onChange: (on) => { swimmer.opts.lowRe = on; } });
features.add({ id: 'beat', group: 'Motion', choices: ['Slowed (readable)', 'Faster (aliases)'], value: 'Slowed (readable)',
  onChange: (v) => { drawer.opts.slowBeat = v.startsWith('Slowed'); swimmer.opts.beat = v.startsWith('Slowed') ? 1 : 5; } });
features.add({ id: 'flagella', group: 'Body', on: true, onChange: (on) => { drawer.opts.flagella = on; } });
features.add({ id: 'pattern', group: 'Body', fixed: true });
// Simulation
features.add({ id: 'bfield', group: 'Simulation', choices: ['Earth (20 µT horizontal)', 'Bar magnet (200 µT)', 'Cancelled (0 µT)'], value: 'Earth (20 µT horizontal)',
  onChange: (v) => { world.opts.field = v.startsWith('Earth') ? 20 : v.startsWith('Bar') ? 200 : 0; } });
features.add({ id: 'grazers', group: 'World', on: true, onChange: (on) => { world.opts.grazers = on; } });
features.add({ id: 'amoeba', group: 'World', on: true, onChange: (on) => { world.opts.amoeba = on; } });
features.add({ id: 'phages', group: 'World', on: true, onChange: (on) => { world.opts.phages = on; } });
features.add({ id: 'hunters', group: 'World', on: true, onChange: (on) => { world.opts.hunters = on; } });
features.add({ id: 'gates', group: 'World', fixed: true });
features.add({ id: 'npc', group: 'World', on: true, onChange: (on) => { world.opts.npcRun = on; } });
features.add({ id: 'scenery', group: 'World', fixed: true });
features.add({ id: 'pad', group: 'Controls', fixed: true });
// Borrowed (default off), also reachable from the look cycle.
const borrow = borrowedSwitches(features);
const bmode = { dic: 0 };
borrow.add({ id: 'semMite', from: 'mite' });
features.add({ id: 'semMiteMode', group: 'Borrowed', from: 'mite', choices: SEM_LOOKS, value: SEM_LOOKS[0], onChange: (v) => looks.semMode(SEM_LOOKS.indexOf(v)) });
borrow.add({ id: 'dicTardigrade', from: 'tardigrade' });
features.add({ id: 'dicMode', group: 'Borrowed', from: 'tardigrade', choices: DIC_MODES, value: DIC_MODES[0], onChange: (v) => (bmode.dic = DIC_MODES.indexOf(v)) });
features.add({ id: 'sdfNote', group: 'Borrowed', from: 'shared sdf.js', fixed: true });

function currentLookKey() { return borrow.id === 'semMite' ? 'sem' : borrow.id === 'dicTardigrade' ? 'dic' : view.look; }
function cycleLook(dir) {
  const i = LOOK_CYCLE.indexOf(currentLookKey());
  const next = LOOK_CYCLE[(i + dir + LOOK_CYCLE.length) % LOOK_CYCLE.length];
  if (next === 'sem') features.set('semMite', true);
  else if (next === 'dic') features.set('dicTardigrade', true);
  else { if (borrow.id) features.set(borrow.id, false); features.set('look', LOOK_LABEL[next]); }
  const name = tt(`bacterium.looks.${next}`); // the full names (LOOK_NAMES in bacterium-fluorescence.js) as text
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
  if (sp === 'mtb') arrangeClump();
  for (const P of roster) P.zoom = P.zoomWant = SPECIES[sp].view;
  view.cx = S.x; view.cy = S.y;
  card.classList.remove('show');
  hud.toast(sp === 'mtb' ? tt('bacterium.toasts.startMtb', { glyph }) : tt('bacterium.toasts.startBdello', { goal: GOAL_PREY, glyph }), 3600);
}

/**
 * The start among your kin (shared/kin-clump.js): the clump the Paramecium's dive
 * resolves, laid out round your cell exactly as it draws it there, so the two
 * line up through the crossfade. Its own cells are moved, none added: free kin
 * from the meadow, prey rods from the meadow, and attached biofilm cocci and
 * rods (static). After the start they wander off as ever (the cocci and attached
 * rods stay: the microcolony you came from).
 */
function arrangeClump() {
  const clumpPicks = arrangeClump; // (a property of the function: setSpecies runs before this point of the module)
  const L = clumpLayout(), x = P1.S.x, y = P1.S.y, a = P1.S.a;
  const kin = coll.kin.filter((k) => !k.coll && !k.parked && !k.dying);
  const rods = world.cells.filter((c) => c.kind === 'rod' && c.zone === 0 && !c.parked && !c.lysed);
  // the attached cells: picked once (the same ones every start), from microcolonies away from the start
  if (!clumpPicks.film) {
    const far = world.film.map((c, i) => [c, i]).filter(([c]) => { const d = world.distFromStart(c.x, c.y); return d > 120 && d < 900; });
    clumpPicks.film = {
      coccus: far.filter(([c]) => c.kind === 'coccus').map(([c]) => c),
      film: far.filter(([c]) => c.kind === 'rod').map(([c]) => c),
    };
  }
  const n = { kin: 0, rod: 0, coccus: 0, film: 0 };
  for (const c of L) {
    const q = placeInFrame(c, x, y, a);
    if (c.kind === 'kin') { const k = kin[n.kin++]; if (!k) continue; coll.putFree(k, q.x, q.y); k.a = q.a; k.L = c.L; k.zone = 0; }
    else if (c.kind === 'rod') { const r = rods[n.rod++]; if (!r) continue; Object.assign(r, { x: q.x, y: q.y, a: q.a, L: c.L, run: 0.6, tumble: 0, stopped: 0 }); }
    else { const f = clumpPicks.film[c.kind][n[c.kind]++]; if (!f) continue; world.moveFilm(f, q.x, q.y); Object.assign(f, { a: q.a, z: (n[c.kind] % 5 - 2) * 0.2 }); if (c.kind === 'film') f.L = c.L; else f.r = c.r; }
  }
}
/** The kin clump's first n cells as poses' screen points in the field drawn now (normalised device coordinates; tests). */
function clumpScreen(n = 8) {
  const ov = camOverride(), fieldH = ov ? ov.fieldH : baseField();
  const cx = ov ? ov.cx : view.cx, cy = ov ? ov.cy : view.cy, w = fieldH * aspect();
  return clumpLayout().slice(0, n).map((c) => { const q = placeInFrame(c, P1.S.x, P1.S.y, P1.S.a); return { kind: c.kind, x: +((q.x - cx) / (w / 2)).toFixed(4), y: +((q.y - cy) / (fieldH / 2)).toFixed(4) }; });
}

// --- the landmarks: forward (the host with phages: the portal) and the backdoor (the Paramecium) ---
function landmark(kind, P) {
  lm.log.push({ kind, slot: P ? P.slot : 0, t });
  if (kind === 'back') audio.play('shared/backdoor', { volume: 0.55 });
  embed.landmark(kind, { player: P ? P.slot : 0 });
}

// --- the director, each step (see `director` above) ---
// What every view sees: one rectangle per split view (the field drawn round its centre), as four
// planes on the director's ground plane (its z is our y).
// What each view sees is the quad its camera (orbited, tilted) frames on the slide: four planes, one per edge.
const dirViews = [0, 1, 2, 3].map(() => ({ frustum: [[1, 0, 0, 0], [-1, 0, 0, 0], [0, 0, 1, 0], [0, 0, -1, 0]], focus: { x: 0, y: 0, z: 0 } }));
const _corner = [{}, {}, {}, {}], CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
function directorViews() {
  if (!camViews.length) layoutCams(null, view.cx, view.cy, baseField() * groupZoom.applied);
  const out = [], pad = 6;
  for (let i = 0; i < camViews.length && i < 4; i++) {
    const c = camViews[i], v = dirViews[i], F = v.frustum;
    for (let j = 0; j < 4; j++) groundAt(c.Mi, CORNERS[j][0], CORNERS[j][1], _corner[j]);
    for (let j = 0; j < 4; j++) {
      const a = _corner[j], b = _corner[(j + 1) % 4];
      let nx = -(b.y - a.y), nz = b.x - a.x; const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
      F[j][0] = nx; F[j][1] = 0; F[j][2] = nz; F[j][3] = -(nx * a.x + nz * a.y) + pad;
    }
    v.focus.x = c.cx; v.focus.z = c.cy;
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
        // (parked ones first; else an ambient one far from everyone, never a colony's or the meadow's)
        const k = coll.kin.find((q) => q.parked && !q.coll && !q.dying) || coll.kin.find((q) => coll.isFree(q) && q.zone === 1 && farFromAll(q.x, q.y) && unseenSpot(q.x, q.y));
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
    // the stranger strain (collective.js WAYLAY): a couple kept near an army big enough to waylay
    if (coll.opts.on && coll.opts.waylay && C && C.members.length >= coll.WAYLAY.min) {
      let k = 0;
      for (const c of world.cells) if (c.stranger && !c.parked && near(c.x, c.y)) k++;
      for (let m = 0; m < KEEP.moves && k < KEEP.strangers; m++) {
        const c = world.cells.find((q) => q.stranger && q.parked) || world.cells.find((q) => q.stranger && !q.waylay && farFromAll(q.x, q.y) && unseenSpot(q.x, q.y));
        const at = c && spot();
        if (!at) break;
        c.x = at.x; c.y = at.y; c.parked = false; c.zone = 1; k++;
      }
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
/** Is the portal guarded? Stentor covers it until it is beaten or pushed off it (stentor.js covers). */
const guarded = () => !stentor.beaten && stentor.covers(FWD.x, FWD.y);
function landmarkTick(dt) {
  const F = LMK.forward;
  // the way on unseals (every gate met): heard once, on the edge
  const isSealed = portalSealed();
  if (lm.wasSealed && !isSealed) audio.play('shared/portal-appear', { volume: 0.8 });
  lm.wasSealed = isSealed;
  let at = null, close = false, dmin = Infinity;
  for (const P of roster) {
    P.atPortal = false;
    if (!P.S.alive) { P.backT = 0; continue; }
    P.backT = Math.hypot(P.S.x - BACK.x, P.S.y - BACK.y) < LMK.back.r ? P.backT + dt : 0;
    if (!F.placed) continue;
    const [d] = segDist(P.S.x, P.S.y, F.x, F.y, F.a, F.L);
    dmin = Math.min(dmin, d);
    if (d < F.r + P.S.sp.r + F.reach + 1.5) P.atPortal = true;
    if (d < 14) close = true;
    // or any member of the player's flock
    const C = coll.opts.on && coll.of(P);
    if (C && C.members.length && Math.abs(C.cx - F.x) < C.extent + 16 && Math.abs(C.cy - F.y) < C.extent + 16) {
      for (const m of C.members) { const [e] = segDist(m.x, m.y, F.x, F.y, F.a, F.L); if (e < F.r + m.r + F.reach + 1.5) { P.atPortal = true; close = true; break; } if (e < 14) close = true; }
    }
    if (P.atPortal) at = at || P;
  }
  if (F.placed) {
    if (!lm.hinted && dmin < 160) { lm.hinted = true; }
    const nearing = !portalSealed() && dmin < 120;
    if (nearing !== lm.nearing) { lm.nearing = nearing; embed.near('forward', nearing); }
    if (at && !lm.fired) {
      if (guarded()) {
        // Stentor guards it: its current turns you back (your cell, and your flock with it)
        lm.fired = true;
        lm.log.push({ kind: 'turnedBack', slot: at.slot, t });
        audio.play('shared/portal-sealed', { volume: 0.6 });
        if (!at.kickT || at.kickT <= 0) { at.kickT = 0.5; at.kickFrom = { x: F.x, y: F.y }; }
        if (!lm.turned || t - (lm.turnedAt ?? -9) > 4) { lm.turned = true; lm.turnedAt = t; hud.toast(tt('bacterium.toasts.turnedBack'), 3200); }
      } else if (portalSealed()) {
        // the way on exists from the start (the default path) but opens only once every gate is met
        lm.fired = true;
        lm.log.push({ kind: 'sealed', slot: at.slot, t });
        audio.play('shared/portal-sealed', { volume: 0.6 });
        hud.toast(tt('bacterium.toasts.sealed'), 2600);
      }
    }
    if (!close) lm.fired = false;
  }
  // anyone (or their flock) at the open host: "Y Enter the portal"; their Y goes through (readInput)
  setPortalPrompt(F.placed && !!at && !outro && !portalSealed() && !guarded());
  const dweller = roster.find((P) => P.backT > 0.5) || null;
  if (!!dweller !== lm.near) { lm.near = !!dweller; embed.near('back', lm.near); }
  // standalone the page shows its own quiet prompt (the shell draws one in the game)
  promptEl.style.display = lm.near && !embed.active ? 'block' : 'none';
  if (lm.near) promptEl.textContent = tt('bacterium.prompts.backStandalone', { glyph });
}
/** The portal's Y prompt: on while anyone is at the open portal (the shell, or standalone embed.js, shows it). */
function setPortalPrompt(on) {
  if (on === lm.portal) return;
  lm.portal = on;
  if (on) audio.play('shared/portal-near', { volume: 0.6 });
  embed.near('portal', on);
}
/** Can player P go through now (they or their flock at the host, Stentor beaten)? Then P's Y enters. */
const atOpenPortal = (P) => !!P.atPortal && LMK.forward.placed && !outro && !portalSealed() && !guarded() && P.S.alive;
/**
 * The way on: player P is at the open portal and pressed Y (never an automatic
 * door: the owner, 2026-11-01). This is the one place the zoom into the
 * next world is triggered (embed.landmark('forward'); standalone, embed.js shows a toast).
 */
function enterPortal(P) {
  if (lm.entered && t - lm.entered < 3) return;
  if (outro) return;
  lm.fired = true; lm.entered = t;
  setPortalPrompt(false);
  portalGlow.burst();
  const L = split.layout;
  if (L && L.views && L.views.length) { const q = projectView(0, { x: FWD.x, y: FWD.y, z: 0 }); portalLight.bloom(q.x, q.y, { scale: 1.2 }); }
  audio.play('shared/portal-enter', { volume: 0.8 });
  audio.play('shared/portal-chime', { volume: 0.9 });
  audio.play('shared/slowdown', { volume: 0.5, delay: OUTRO.beat });
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
  return pose2D(g.x, g.y, g.a, PHAGE_LEN, view.cx, view.cy, baseField());
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
const cellPose = () => pose2D(P1.S.x, P1.S.y, P1.S.a, P1.S.sp.L, view.cx, view.cy, baseField());
embed.provide('intro');
embed.on('hold', () => {
  intro = { cam: null };
  if (P1.S.species === 'mtb') arrangeClump(); // (where it began: nothing has moved while it loaded, but be sure)
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
  /** Set player slot's field at once (µm, ZOOM.min..max; or an index into the old steps 180/90/45/22). */
  zoom(z, slot = 0) { const P = roster.find((Q) => Q.slot === slot) || P1; const f = Number.isInteger(z) && z < 4 ? [180, 90, 45, 22][z] : z; P.zoom = P.zoomWant = Math.max(ZOOM.min, Math.min(ZOOM.max, f)); },
  /** Hold the zoom triggers for player slot as LT/RT would: +1 full LT (out), -1 full RT (in), null back to the pad. */
  /** Waylaying (tests): put a stranger d µm off player slot's flock (side a, radians) and let it come over. Returns it. */
  stranger(slot = 0, d = 14, a = 0) {
    const P = roster.find((Q) => Q.slot === slot) || P1, C = coll.of(P);
    const c = world.cells.find((q) => q.stranger && !q.waylay) || world.cells.find((q) => q.stranger);
    const R = (C ? C.extent : 0) + d;
    c.waylay = null; c.wlCool = 0; c.parked = false; c.x = (C ? C.cx : P.S.x) + Math.cos(a) * R; c.y = (C ? C.cy : P.S.y) + Math.sin(a) * R;
    return { x: c.x, y: c.y };
  },
  /** Hold the zoom triggers for player slot as LT/RT would: +1 full LT (out), -1 full RT (in), null back to the pad. */
  zoomHold(v = 1, slot = 0) { zoomForce[slot] = v === null ? undefined : v; },
  /** Hold player 1's right stick (RS look) as if pushed: x right, y up (-1..1); null back to the pad. */
  rsHold(x = 0, y = 0) { rsForce = x === null ? null : { x, y }; },
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
    for (let i = 0; C && C.members.length < n && i < COLL.max + 8; i++) { const a = i * 2.4, d = 1.5 + 1.15 * Math.sqrt(i); if (coll.adopt(P, P.S.x + Math.cos(a) * d, P.S.y + Math.sin(a) * d, Math.random() * 6.28)) k++; else break; }
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
      // (stepped without drawing: keep the views where the cameras are, so the director and the members' LOD see what a frame would)
      for (const P of roster) if (!P.waiting) stepZoom(P, dt, false);
      layoutCams(null, view.cx, view.cy, baseField() * groupZoom.applied);
    }
  },
};

function doDash(P) {
  audio.play('bacterium/sprint', { volume: 0.9 });
  const res = P.swimmer.dash();
  P.S.dashOn = true;
  P.pad.rumble(160, 0.5, 0.7);
  const who = multi() ? `${P.name}: ` : '';
  if (res === 'shook') { hud.toast(tt('bacterium.toasts.shookBdello', { who })); }
  else if (res === 'detached') hud.toast(tt('bacterium.toasts.letGoPrey', { who }));
}

const idle = () => ({ attack: false, attackPressed: false, steer: null });
/**
 * X (the magnetotactic cell): a beacon from the flock's front (riding with it) (kin it reaches answer and join), every prey
 * rod in reach of a member lysed, and a volley on any enemy the flock touches. One press every 0.3 s.
 */
function pressX(P) {
  if (!P.S.alive || P.S.species !== 'mtb' || !coll.opts.on) return null;
  const b = coll.beacon(P, t);
  if (!b) return null;
  const C = coll.of(P);
  const eaten = coll.eat(P);
  const hits = C ? guards.volley(C, t) : 0;
  if (hits) audio.play('bacterium/strike', { volume: 0.7 });
  if (eaten.length) {
    audio.play('bacterium/lyse', { volume: 0.7, old: ['bacterium/eat', { volume: 0.8, rate: 1.05 + Math.random() * 0.1 }] });

    P.pad.rumble(60, 0.3, 0.2);
    if (!P.msg.ate) { P.msg.ate = true; hud.toast(tt(eaten.length > 1 ? 'bacterium.toasts.lysedMany' : 'bacterium.toasts.lysedOne', { who: multi() ? P.name + ': ' : '', n: eaten.length }), 3000); }
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
    const f = focusOf(P), home = guards.centre(guards.byId.bdello);
    P.nearCloud = false; // (the phage cloud is no longer a gate)
    P.nearPack = Math.hypot(f.x - home.x, f.y - home.y) < 45;
    P.safeT = Math.max(0, (P.safeT || 0) - dt);
    if (inp.attackPressed && P.S.species === 'mtb') pressX(P);
  }
  // where the players are and what the views show (the ambient life's window, the members' LOD)
  world.watch.players = roster.filter((P) => !P.waiting).map((P) => focusOf(P));
  world.watch.inView = inViewNow;
  // the flock: its intent from the sticks; each player's own cell steered as one member
  const active = roster.filter((P) => !P.waiting);
  coll.pre(dt, t, active, inputs);
  for (const P of roster) {
    const ev = {}, C = coll.of(P);
    P.S.flowK = C ? C.drag : 1; // a raft: currents drag it less, the bigger it is (collective.js dragK)
    P.swimmer.step(dt, t, inputs[P.slot], ev);
    // 2.5D (world.js LAYER): your cell swims at a height too, and ambles up over grains (swim.js still
    // pushes it round the part of a grain above it, so it climbs gently)
    if (P.S.alive) world.stepHeight(P.S, dt, Math.sqrt(dt), P.S.sp.r);
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
  for (const P of roster) if (P.kickT > 0 && P.S.alive) { P.kickT -= dt; const F = P.kickFrom || stentor.mouth; const a = Math.atan2(P.S.y - F.y, P.S.x - F.x), px = P.S.x, py = P.S.y; P.S.x += Math.cos(a) * 130 * dt; P.S.y += Math.sin(a) * 130 * dt; world.soften(P.S, px, py); }
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
  // the cameras: each player's follow camera (followcam.js); the view centres on them
  stepCameras(dt, false);
  // the focus follows your cell's height (eased; the optics' depth of field is round it)
  if (P1.S.hz !== undefined) view.focusH += (P1.S.hz - view.focusH) * (1 - Math.exp(-dt * 2));
  landmarkTick(dt);
}

/** What happened to a player this frame, as toasts (named in multiplayer). */
function events(P, ev) {
  const who = multi() ? `${P.name}: ` : '';
  const S = P.S;
  if (ev.phage) { P.pad.rumble(60, 0.3, 0); if (!P.msg.phageHint) { P.msg.phageHint = true; hud.toast(tt('bacterium.toasts.phageStuck', { who, glyph }), 3200); } else hud.toast(tt('bacterium.toasts.phageStuckAgain', { who, glyph })); }
  if (ev.shed) hud.toast(tt(ev.shed > 1 ? 'bacterium.toasts.shookPhages' : 'bacterium.toasts.shookPhage', { who, n: ev.shed }));
  if (ev.irreversible) { P.pad.rumble(200, 0.6, 0.4); hud.toast(tt('bacterium.toasts.irreversible', { who }), 2600); }
  if (ev.captured) { P.pad.rumble(300, 0.6, 0.9); hud.toast(tt('bacterium.toasts.feedingCurrent', { who, glyph }), 2200); }
  const C = coll.opts.on && coll.of(P), alone = !(C && C.members.length); // (with a swarm its cells take the hit, so no alarm for your own cell)
  if (ev.engulfing && alone) { P.pad.rumble(250, 0.5, 0.5); hud.toast(tt('bacterium.toasts.amoebaClosing', { who }), 2200); }
  if (ev.attacked) { P.pad.rumble(300, 0.8, 0.8); hud.toast(tt('bacterium.toasts.bdelloRammedDash', { who, glyph }), 2600); }
  if (ev.attach) hud.toast(tt('bacterium.toasts.attached', { who }), 2600);
  if (ev.entered) { P.pad.rumble(200, 0.4, 0.4); hud.toast(tt('bacterium.toasts.periplasm', { who }), 3600); }
  if (ev.emerged) hud.toast(tt('bacterium.toasts.preyEaten', { who, prey: S.prey, goal: GOAL_PREY }), 3400);
  if (ev.gramPos) hud.toast(tt('bacterium.toasts.gramPositive'));
  if (ev.divide) hud.toast(tt('bacterium.toasts.growing', { who }), 2400);
  if (ev.divided) { P.pad.rumble(300, 0.5, 0.5); hud.toast(tt('bacterium.toasts.divided', { who, n: S.divisions }), 3000); }
  if (ev.contracted) hud.toast(tt('bacterium.toasts.peritrichJerked'));
}

function readInput(P, dt) {
  const inp = idle();
  const S = P.S, c = P.ctl, me = P === P1;
  const ls = c.move();
  // the stick in slide axes (screen up = slide +y, toward the air)
  const wx = ls.x, wy = -ls.y;
  if (ls.m > 0) inp.steer = { x: wx, y: wy, m: Math.min(1, ls.m) };
  if (S.alive) {
    if (c.defend.pressed()) {
      P.blockT = 0.55; // a tumble at a strike evades it
      P.tumbleAt = t;
      const bias = P.swimmer.opts.bias && ls.m > 0.3 ? { x: wx, y: wy } : null;
      if (P.swimmer.tumble(bias)) {
        audio.play('bacterium/tumble', { volume: 0.8, rate: 0.95 + Math.random() * 0.1 });
        P.pad.rumble(40, 0.2, 0);
        if (S.attacker) { S.attacker.cooldown = 4; S.attacker.prey = null; S.attacker = null; hud.toast(tt('bacterium.toasts.tumbledFreeBdello', { who: multi() ? P.name + ': ' : '' })); }
      }
    }
    if (c.lb.pressed() || c.rb.pressed()) { if (P.swimmer.reverse() && me) hud.toast(S.species === 'mtb' ? (S.sense > 0 ? tt('bacterium.toasts.reversedNorth') : tt('bacterium.toasts.reversedSouth')) : tt('bacterium.toasts.reversed')); }
    if (c.dash.pressed() && P.dash.trigger()) { doDash(P); P.sprintT = 0.55; }
    inp.attack = c.attack.down();
    inp.attackPressed = c.attack.pressed();
  } else if (me && !multi() && !S.caught && S.overT > 1 && (c.dash.pressed() || c.attack.pressed())) setSpecies(S.species);
  // Y: at the open portal it goes through; at the Paramecium it takes everyone
  // back (the game asks for Y there; it is not in the controls list); with the
  // toxin charged it fires; else (player 1) the overlay
  const C = coll.of(P);
  if (c.special.pressed()) {
    if (atOpenPortal(P)) enterPortal(P);
    else if (P.backT > 0.5) landmark('back', P);
    else if (C && C.charge >= 1 && S.alive) coll.burst(P);
    // (Y is only the toxin: the owner, 2026-11-04. Not ready: say so; the data overlay is in the Features panel)
    else if (S.alive && S.species === 'mtb' && coll.opts.on && t - (P.toxinMsgT ?? -9) > 1.5) {
      P.toxinMsgT = t;
      const army = C ? C.army : 1;
      hud.toast(army < COLL.toxin ? tt('bacterium.toasts.toxinNeedsSwarm', { n: COLL.toxin, army }) : tt('bacterium.toasts.toxinCharging', { pct: Math.round((C ? C.charge : 0) * 100) }), 1600);
    }
  }
  if (c.stickClick.left.pressed() && C && C.charge >= 1 && S.alive) coll.burst(P);
  if (!me) return inp;
  const ls2 = c.lookStep();
  if (ls2) cycleLook(ls2);
  return inp;
}

/**
 * The zoom: LT out, RT in, analogue and continuous (each player their own, read even while the world is
 * paused by a panel, never in a cinematic), as the Paramecium's: the trigger sets how fast the wanted
 * field moves, and the field eases to it.
 */
const zoomForce = [];
function stepZoom(P, dt, frozen) {
  const f = zoomForce[P.slot], c = P.ctl;
  const rate = f !== undefined ? f : !frozen && c ? c.lt() - c.rt() : 0;
  const Z = zoomStep({ want: P.zoomWant, field: P.zoom }, rate, dt);
  P.zoomWant = Z.want; P.zoom = Z.field;
}
/**
 * The view: straight down on the slide, as the microscope sees it (the owner, 2026-11-03: "I think we
 * don't need a 3d camera in 2d. Let's keep the slide"). Each player has a follow camera (followcam.js:
 * a dead zone, a critically damped catch-up, a look-ahead along the motion, and RS held to look in any
 * direction); a view is centred on its players' follow points, so a split view follows its own.
 */
let rsForce = null; // (tests: debug.rsHold)
function stepCameras(dt, frozen) {
  for (const P of roster) {
    if (P.waiting) continue;
    const f = focusOf(P), C = coll.of(P), F = P.follow, fieldH = zoomPull(P.zoom) * groupZoom.applied;
    // a jump (a respawn, a teleport, a new game): the camera is put there at once
    if (!(F.bx === F.bx) || Math.hypot(f.x - F.bx, f.y - F.by) > fieldH * 1.5) snapFollow(F, f.x, f.y);
    let vx = 0, vy = 0;
    if (C && C.members.length) { vx = C.vx; vy = C.vy; } else if (P.S.alive) { const v = P.S.speed || 0; vx = Math.cos(P.S.a) * v; vy = Math.sin(P.S.a) * v; }
    const look = rsForce && P === P1 ? rsForce : frozen ? null : P.look;
    stepFollow(F, dt, f.x, f.y, vx, vy, look, fieldH);
  }
  const ps = roster.filter((P) => !P.waiting);
  if (!ps.length) return;
  view.cx = ps.reduce((a, P) => a + P.follow.x, 0) / ps.length;
  view.cy = ps.reduce((a, P) => a + P.follow.y, 0) / ps.length;
}
// A view's matrix: the field fieldH tall round (cx, cy), straight down (orthographic).
const _v4 = new THREE.Vector4();
function camMatrix(out, cx, cy, fieldH, asp) {
  const hw = (fieldH * asp) / 2, hh = fieldH / 2;
  return out.makeOrthographic(cx - hw, cx + hw, cy + hh, cy - hh, -10, 10);
}
/** A slide point (µm) through matrix M to normalised device coordinates. */
function ndcOf(M, x, y, o = {}) { _v4.set(x, y, 0, 1).applyMatrix4(M); o.x = _v4.x / _v4.w; o.y = _v4.y / _v4.w; o.behind = _v4.w <= 0; return o; }
/** The slide point (µm) seen at normalised device coordinates (nx, ny) through the inverse matrix Mi. */
function groundAt(Mi, nx, ny, o = {}) {
  _v4.set(nx, ny, -1, 1).applyMatrix4(Mi); const ax = _v4.x / _v4.w, ay = _v4.y / _v4.w, az = _v4.z / _v4.w;
  _v4.set(nx, ny, 1, 1).applyMatrix4(Mi); const bx = _v4.x / _v4.w, by = _v4.y / _v4.w, bz = _v4.z / _v4.w;
  const k = Math.abs(az - bz) > 1e-9 ? az / (az - bz) : 0;
  o.x = ax + (bx - ax) * k; o.y = ay + (by - ay) * k; return o;
}
const _q = {};
/** The box on the slide a camera matrix sees (its four corners on the ground), for culling. */
function footprint(Mi, box) {
  for (const nx of [-1, 1]) for (const ny of [-1, 1]) { groundAt(Mi, nx, ny, _q); box.x0 = Math.min(box.x0, _q.x); box.x1 = Math.max(box.x1, _q.x); box.y0 = Math.min(box.y0, _q.y); box.y1 = Math.max(box.y1, _q.y); }
  return box;
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
  // the zoom (each player's triggers) and the orbit camera (RS), read even while a panel pauses the world, never in a cinematic
  for (const P of roster) if (!P.waiting) stepZoom(P, dt, held || !!outro);
  // (RS: each player's look, for the follow camera)
  for (const P of roster) { const r = !blocked && !held && !outro && !P.waiting ? P.ctl.camera() : null; P.look.x = r && r.m > 0.12 ? r.x : 0; P.look.y = r && r.m > 0.12 ? -r.y : 0; }
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
    else if (!S.alive && S.over && S.over !== 'won' && !S.caught) { text = tt('bacterium.warn.runOver', { cause: (S.cause || tt('bacterium.warn.cellStopped')).toLowerCase() }); sev = 2.5; }
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
  // a swarm at a gate: the enemy's tell, said plainly (its bite takes your cells, not you)
  const C = coll.opts.on && coll.of(P);
  if (C && C.members.length) {
    // a tunnel pinching shut with your cells in it (guards.js PINCH)
    const Am = world.amoeba;
    if (!Am.beaten && Am.tunnels.some((T) => T.pinch) && C.members.some((m) => guards.zone(guards.byId.amoeba, m.x, m.y, t) > 0 && !(Am.wrap && !Am.wrap.done && Math.hypot(m.x - Am.wrap.x, m.y - Am.wrap.y) < Am.wrap.R))) return { text: tt('bacterium.warn.tell.tunnel', { glyph }), sev: 2.0 };
    for (const q of guards.list) {
      if (!q.engaged || q.beaten || q.kind === 'stentor') continue;
      const tell = q.atk.st === 'tell', bite = q.atk.st === 'bite';
      if (tell || bite) return { text: tt(`bacterium.warn.${bite ? 'bite' : 'tell'}.${q.kind}`, { glyph }), sev: bite ? 2.2 : 1.8 };
    }
    // Stentor's cone: some of your cells are in it (it takes them a few at a time)
    if (stentor.awake && !stentor.beaten && C.members.some((m) => stentor.cone(m.x, m.y) > 0.15)) return { text: tt('bacterium.warn.tell.stentor', { glyph }), sev: 2.0 };
    if (stentor.state === 'recoil' && guards.byId.stentor.engaged) return { text: tt('bacterium.warn.stentorSlackens'), sev: 0.4 };
    return null;
  }
  if (stentor.awake && !stentor.beaten && stentor.cone(P.S.x, P.S.y) > 0) return { text: tt('bacterium.warn.stentorPulls', { glyph }), sev: 2.4 };
  const g = world.grazers.find((q) => q.target === P && (q.fightState === 'windup' || q.fightState === 'strike'));
  if (g) return { text: tt(g.fightState === 'strike' ? 'bacterium.warn.grazerSurging' : 'bacterium.warn.grazerIntensifying', { glyph }), sev: 2.2 };
  if (P.bdello && /windup|strike/.test(P.bdello.fight.state)) return { text: tt('bacterium.warn.bdelloLining', { glyph }), sev: 2.1 };
  if (P.phage && /windup|strike/.test(P.phage.fight.state)) return { text: tt('bacterium.warn.phageCaught', { glyph }), sev: 2.1 };
  if (P.bdello && P.bdello.fight.state === 'stalk') return { text: tt('bacterium.warn.bdelloStalking', { glyph }), sev: 1.6 };
  if (P.phage && P.phage.fight.state === 'stalk') return { text: tt('bacterium.warn.phageHoming', { glyph }), sev: 1.5 };
  return null;
}

function showEnd(S) {
  if (card.classList.contains('show')) return;
  if (S.over === 'won') card.innerHTML = tt('bacterium.endCard.won', { glyph });
  else card.innerHTML = tt(S.cause ? 'bacterium.endCard.overCause' : 'bacterium.endCard.over', { cause: S.cause ? S.cause.toLowerCase() : '', over: S.over, glyph });
  card.classList.add('show');
}

/**
 * The drop's edge in the image (bacterium-fluorescence.js uDrop): its centre and radius, and how strongly the light
 * bends there, more the nearer the view comes to it (the owner: "some visual light bending as you approach the very edge").
 */
function dropUniform(cx, cy, fieldH) {
  const d = rimDist(cx, cy), k = Math.max(0, Math.min(1, 1 - (d - fieldH * 0.5) / 260));
  return { x: DROP.x, y: DROP.y, R: DROP.R, k: 0.35 + 0.65 * k };
}
/** The host's signal (a haze toward the way on, uHost): where the host is and how strong (stronger once its way is open). */
function hostUniform() {
  const F = world.landmarks.forward;
  return F.placed ? { x: F.x, y: F.y, k: portalSealed() ? 0.6 : 1 } : { x: 0, y: 0, k: 0 };
}
/** Draw the specimen around (cx, cy) to the screen: one view. */
let fieldNow = 45; // the field height being drawn (render sets it: the zoom's, or the transition's)
function drawField(cam, stopOk, rect = null) {
  const [W, H] = optics.size;
  const { cx, cy, fieldH } = cam;
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
  // (no round field stop: the zoom is continuous at every field, the owner, 2026-11-04)
  const stopR = 0; void stopOk;
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
    optics.render({ look, umPerPx, center: [cx, cy], time: t, stopR, plate: look === 'phase' ? plates.phase : null, noiseRes: [renderer.domElement.width, renderer.domElement.height], drop: dropUniform(cx, cy, fieldH), host: hostUniform() });
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

/**
 * The "Portal arrow" setting (the game's Settings, default off; ?arrow=1 here): an arrow at the edge of
 * each view toward the way on (the host: the director's portals(), one here), with the distance from the
 * view's nearest flock (µm, as the stats count). Sealed too: it is where the way on will open.
 */
let arrowLog = [];
function drawPortalArrow() {
  arrowLog = [];
  if (!portalArrowOn() || !world.landmarks.forward.placed || outro) return;
  const pp = { x: FWD.x, y: FWD.y, z: 0 };
  arrowLog = marks.drawSplit(arrowSplit(), (vp) => {
    let d = Infinity;
    for (const v of vp) { const P = roster.find((Q) => Q.slot === v.slot); if (P) { const f = focusOf(P); d = Math.min(d, Math.hypot(f.x - pp.x, f.y - pp.y)); } }
    if (!isFinite(d)) { const f = focusOf(P1); d = Math.hypot(f.x - pp.x, f.y - pp.y); }
    return { position: pp, label: `${Math.round(d)} µm`, distance: d };
  }, { kind: 'forward', portal: true, range: 800 }).map((r) => r && { x: r.x, y: r.y, angle: r.angle, onScreen: r.onScreen, d: Math.round(r.picked.distance), label: r.picked.label, at: [+pp.x.toFixed(1), +pp.y.toFixed(1), 0] });
}
const posOf = (P) => { const p = focusOf(P); return { x: p.x, y: p.y, z: 0 }; };
const cellPos = (P) => { const p = P.S.inside || P.S; return { x: p.x, y: p.y, z: 0 }; };
function render(dt) {
  glow.setOpen(!guarded() && !portalSealed());
  glow.update(dt, t, glowCam);
  const ov = camOverride();
  // several players in one view: the split screen's zoom-out (a taller field)
  // keeps them all in it; the screen splits only once it is at its widest
  groupZoom.applied = !ov && multi() ? groupZoom.z : 1;
  const fieldH = fieldNow = ov ? ov.fieldH : baseField() * groupZoom.applied;
  const cx = ov ? ov.cx : view.cx, cy = ov ? ov.cy : view.cy;
  // the shared frame (what the split screen lays out)
  setFrame(cx, cy, fieldH);
  if (world.landmarks.forward.placed) { const g = glimpsePhage(); glimpse.setPosition(g.x, g.y, 0); } else glimpse.setPosition(1e6, 1e6, 0);
  glimpse.update(t);
  // the camera move: the glow fades over the first ×4 of magnification, the glint over ×4 to ×20 (the shell's halo carries it on)
  const dive = outro && outro.cam && outro.f0 ? Math.log(Math.max(1, outro.cam.f / outro.f0)) : 0;
  if (glowUI) glowUI.value = GLOW_I * (1 - sm01(0, Math.log(4), dive));
  glimpse.intensity = 1.1 * (1 - sm01(Math.log(4), Math.log(20), dive));
  // (each player's follow point, so a split view follows its own players as one view does)
  const camPos = (P) => (ov ? posOf(P) : { x: P.follow.x, y: P.follow.y, z: 0 });
  const list = roster.filter((P) => !P.waiting).map((P) => ({ slot: P.slot, position: toFrame(camPos(P)) }));
  const L = split.update(list.length ? list : [{ slot: 0, position: toFrame(camPos(P1)) }], { center: { x: cx, y: cy }, pxPerUnit: innerHeight / fieldH, yUp: true, zoom: groupZoom.applied }, dt);
  groupZoom.z = split.zoom;
  // split frames render every view: the governor drops each one's resolution (0.7 at 2 views, 0.55 at 3-4)
  quality.setSplitViews(L.views.length);
  // each view's camera; the shapes are culled once for every view: the union of what they frame on the slide
  layoutCams(ov ? null : L, cx, cy, fieldH);
  const box = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  for (const c of camViews) footprint(c.Mi, box);
  shapes.cull(box.x0, box.y0, box.x1, box.y1);
  shapes.begin();
  drawer.depth.focusH = view.focusH;
  drawer.lod.px = fieldH / Math.max(1, innerHeight); // (µm per CSS px: a member smaller than lod.simple px is drawn as its body only)
  drawer.draw(shapes, t, roster.map((P) => P.S), view);
  shapes.end();
  if (ov || L.views.length <= 1) drawField(camViews[0], true);
  else {
    for (const v of L.views) { drawField(camOf(v.index), false, useRects ? viewRect(L, v.index) : null); split.capture(v.index); }
    split.compose();
  }
  // the edge marks: only the ring to the Paramecium (the way back)
  marks.begin();
  portalLight.begin();
  // no arrow to the way on by default (the owner: keep moving and you find it): once open, its golden light
  // spills in from the edge of the view on its side (or haloes it in view); no text (the Portal arrow setting
  // adds one: drawPortalArrow). On the default path it is there from the start, sealed.
  if (world.landmarks.forward.placed && !portalSealed() && !outro) {
    let d = Infinity;
    for (const P of roster) { const f = focusOf(P); d = Math.min(d, Math.hypot(f.x - FWD.x, f.y - FWD.y)); }
    portalLight.drawSplit(arrowSplit(), FWD, { strength: Math.max(0.3, Math.min(1, 1.15 - d / 260)), open: portalGlow.open });
  }
  marks.drawSplit(arrowSplit(), BACK, { kind: 'backdoor', label: tt('bacterium.marks.pool'), range: 420, onScreen: 'none' });
  drawPortalArrow();
  drawMarks(L, fieldH);
  // scale bar
  const bar = fieldH >= 260 ? 50 : fieldH >= 90 ? 20 : fieldH >= 40 ? 5 : fieldH >= 15 ? 2 : 1;
  const cssPerUm = innerHeight / fieldH;
  scaleEl.innerHTML = `<i style="width:${Math.round(bar * cssPerUm)}px"></i>${tt('bacterium.scale', { bar, field: Math.round(fieldH) })}`;
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
      if (!C.members.length) { html += tt('bacterium.army.alone', { who, glyph }); continue; }
      const ab = [C.level >= 1 ? tt('bacterium.army.slimeShield') : '', C.level >= 2 ? tt('bacterium.army.raft') : '', C.level >= 3 ? (C.charge >= 1 ? tt('bacterium.army.toxinReady', { glyph }) : tt('bacterium.army.toxinCharging', { pct: Math.round(C.charge * 100) })) : ''].filter(Boolean).join(' · ');
      html += `<div>${who}${tt(ab ? 'bacterium.army.armyWith' : 'bacterium.army.army', { n: C.army, abilities: ab })}</div>`;
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
  for (const v of L.views) {
    const cssPerUm = innerHeight / camOf(v.index).fieldH;
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
      const q = projectView(v.index, cellPos(P));
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
    const ring = (x, y, r) => { const q = projectView(v.index, { x, y, z: 0 }); markG.globalAlpha = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * 18)); markG.strokeStyle = '#ff5a46'; markG.lineWidth = 2; markG.beginPath(); markG.arc(q.x, q.y, r, 0, Math.PI * 2); markG.stroke(); };
    for (const g of world.grazers) if (g.target && (g.fightState === 'windup' || g.fightState === 'strike')) ring(g.pose.mouth.x, g.pose.mouth.y, Math.max(16, 7 * cssPerUm));
    for (const P of roster) {
      if (P.bdello && /windup|strike/.test(P.bdello.fight.state)) ring(P.bdello.c.x, P.bdello.c.y, Math.max(12, 1.6 * cssPerUm));
      if (P.phage && /windup|strike/.test(P.phage.fight.state)) ring(P.phage.p.x, P.phage.p.y, Math.max(9, 0.9 * cssPerUm));
    }
    // waylaying (collective.js WAYLAY), a game marker like the ring above: a drifting member trails a thin
    // amber link back to its flock that fades as it drifts on (gone when it is picked off); the stranger
    // luring it shows its decoy pulse; a member picked off flashes as it goes
    if (coll.opts.on) waylayMarks(v.index, cssPerUm);
    enemyBars(v.index, cssPerUm);
    markG.globalAlpha = 1;
    markG.restore();
  }
}

/**
 * A health bar over each gate enemy your swarm is fighting (a game marker, like the gauge at the top): brass,
 * its fill the enemy's health, warm while it winds up to bite, a tick for every member it has eaten so far.
 */
function enemyBars(i, cssPerUm) {
  for (const q of guards.list) {
    if (!q.engaged || q.beaten || q.kind === 'amoeba') continue; // (the amoeba has no health bar: it cannot be killed)
    const c = guards.centre(q);
    const up = q.kind === 'grazer' ? q.g.R * 1.6 : q.kind === 'amoeba' ? 30 : q.kind === 'stentor' ? 40 : 30;
    const p = projectView(i, { x: c.x, y: c.y + up, z: 0 });
    if (p.x < -80 || p.x > innerWidth + 80 || p.y < -40 || p.y > innerHeight + 40) continue;
    const w = 86, h = 6, x = Math.max(8, Math.min(innerWidth - w - 8, p.x - w / 2)), y = Math.max(70, Math.min(innerHeight - 40, p.y - 12));
    const tell = q.kind === 'stentor' ? stentor.state === 'recoil' : q.atk.st === 'tell';
    markG.globalAlpha = 0.85;
    markG.fillStyle = 'rgba(20,16,8,.55)'; markG.fillRect(x, y, w, h);
    // the health just drilled away lingers as a bright chunk, then drops (your attack working)
    q.hpShown = Math.max(q.hp, Math.min(q.hpShown ?? q.hp, q.max) - q.max * 0.25 * (1 / 60));
    const f1 = Math.max(0, q.hp / q.max), f2 = Math.max(0, q.hpShown / q.max);
    markG.fillStyle = '#fff1c4'; markG.fillRect(x + 1 + (w - 2) * f1, y + 1, (w - 2) * (f2 - f1), h - 2);
    markG.fillStyle = tell ? '#ff9a6a' : '#c9a35a'; markG.fillRect(x + 1, y + 1, (w - 2) * f1, h - 2);
    markG.strokeStyle = 'rgba(201,163,90,.9)'; markG.lineWidth = 1; markG.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }
  void cssPerUm;
  threatMarks(i, cssPerUm);
}
/**
 * The attacks coming (game markers, like the gauge): every danger shows where it will land and how soon,
 * on screen or, when it is off screen, as a mark at the edge of the view toward it (the owner, 2026-11-04:
 * "You should see the attack coming and then be able to try to avoid it"):
 *   the amoeba's loop  a dashed red ring round the cells its pseudopods are closing on, filling as they close
 *   the peritrich      the cone in front of its mouth, dashed, while its cilia race
 *   Stentor's cone     outlined while any of your cells is in it
 *   a Bdellovibrio     a pulsing ring round the cell it clings to
 */
function threatMarks(i, cssPerUm) {
  const ring = (x, y, rPx, k, dash = true) => {
    const p = projectView(i, { x, y, z: 0 }), W = innerWidth, H = innerHeight;
    if (p.x < -rPx || p.x > W + rPx || p.y < -rPx || p.y > H + rPx) { edgeMark(p.x, p.y); return; }
    markG.globalAlpha = 0.5 + 0.4 * k; markG.strokeStyle = '#ff5a46'; markG.lineWidth = 2;
    markG.setLineDash(dash ? [6, 5] : []); markG.beginPath(); markG.arc(p.x, p.y, rPx, 0, Math.PI * 2); markG.stroke(); markG.setLineDash([]);
    if (k > 0) { markG.globalAlpha = 0.9; markG.lineWidth = 3; markG.beginPath(); markG.arc(p.x, p.y, rPx + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); markG.stroke(); }
  };
  const edgeMark = (px, py) => {
    const W = innerWidth, H = innerHeight, cx = W / 2, cy = H / 2, dx = px - cx, dy = py - cy, k = Math.min((W / 2 - 24) / Math.abs(dx || 1e-6), (H / 2 - 24) / Math.abs(dy || 1e-6));
    const x = cx + dx * k, y = cy + dy * k, a = Math.atan2(dy, dx);
    markG.globalAlpha = 0.6 + 0.35 * Math.sin(t * 9); markG.fillStyle = '#ff5a46';
    markG.beginPath(); markG.moveTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12); markG.lineTo(x + Math.cos(a + 2.4) * 9, y + Math.sin(a + 2.4) * 9); markG.lineTo(x + Math.cos(a - 2.4) * 9, y + Math.sin(a - 2.4) * 9); markG.closePath(); markG.fill();
  };
  const A = world.amoeba, Wr = A.wrap;
  if (Wr && !A.beaten) ring(Wr.x, Wr.y, Wr.R * cssPerUm, Wr.done ? 1 : Wr.p);
  // a tunnel pinching shut: a solid ring round its mouth, filling as it closes
  if (!A.beaten) for (const T of A.tunnels) if (T.pinch) { const m = world.amoebaWorld(T.x + Math.cos(T.a) * Math.min(T.len, 8) * 0.5, T.y + Math.sin(T.a) * Math.min(T.len, 8) * 0.5, { x: 0, y: 0 }); ring(m.x, m.y, Math.max(12, (T.w + 4) * cssPerUm), Math.min(1, T.pinch.t / T.pinch.tell), false); }
  const g = guards.byId.grazer1;
  if (g.placed && !g.beaten && g.atk.st === 'tell' && g.engaged) {
    const P = g.g.pose, M = P.mouth, ua = Math.atan2(P.up.y, P.up.x), R = g.reach, p = projectView(i, { x: M.x, y: M.y, z: 0 });
    if (p.x < -R * cssPerUm || p.x > innerWidth + R * cssPerUm || p.y < -R * cssPerUm || p.y > innerHeight + R * cssPerUm) edgeMark(p.x, p.y);
    else { const k = g.atk.t / g.tell; markG.globalAlpha = 0.5 + 0.4 * k; markG.strokeStyle = '#ff5a46'; markG.lineWidth = 2; markG.setLineDash([6, 5]); markG.beginPath(); markG.moveTo(p.x, p.y); markG.arc(p.x, p.y, R * cssPerUm, -(ua + 1.22), -(ua - 1.22)); markG.closePath(); markG.stroke(); markG.setLineDash([]); }
  }
  const C = coll.opts.on && coll.of(P1);
  if (C && stentor.awake && !stentor.beaten && C.members.some((m) => stentor.cone(m.x, m.y) > 0)) {
    const M = stentor.mouth, p = projectView(i, { x: M.x, y: M.y, z: 0 }), R = stentor.pullR * cssPerUm, ua = stentor.ang;
    markG.globalAlpha = 0.55 + 0.3 * Math.sin(t * 6); markG.strokeStyle = '#ff5a46'; markG.lineWidth = 2; markG.setLineDash([6, 5]);
    markG.beginPath(); markG.moveTo(p.x, p.y); markG.arc(p.x, p.y, R, -(ua + 0.95), -(ua - 0.95)); markG.closePath(); markG.stroke(); markG.setLineDash([]);
  }
  for (const c of world.cells) if (c.kind === 'bdello' && c.latch && c.latch.m.coll) ring(c.latch.m.x, c.latch.m.y, Math.max(10, 3 * cssPerUm), Math.min(1, c.latch.t / COLL.latch), false);
  markG.globalAlpha = 1;
}
function waylayMarks(i, cssPerUm) {
  const W = coll.WAYLAY;
  markG.lineCap = 'round';
  for (const C of coll.list) {
    if (!C.players.length) continue;
    for (const m of C.members) {
      if (!m.drift) continue;
      const left = Math.max(0, 1 - m.drift.t / W.lostT);
      const a = projectView(i, { x: m.x, y: m.y, z: 0 }), dx = C.cx - m.x, dy = C.cy - m.y, d = Math.hypot(dx, dy) || 1;
      const reach = Math.max(0, d - C.R0 * 0.7), b = projectView(i, { x: m.x + (dx / d) * reach, y: m.y + (dy / d) * reach, z: 0 });
      markG.globalAlpha = 0.25 + 0.6 * left;
      markG.strokeStyle = '#ffb347';
      markG.lineWidth = 1 + 1.2 * left;
      markG.setLineDash([5, 4]);
      markG.beginPath(); markG.moveTo(a.x, a.y); markG.lineTo(b.x, b.y); markG.stroke();
      markG.setLineDash([]);
      markG.lineWidth = 1.5;
      markG.beginPath(); markG.arc(a.x, a.y, Math.max(8, 2.2 * cssPerUm), 0, Math.PI * 2); markG.stroke();
    }
  }
  for (const c of world.cells) {
    const Wl = c.waylay;
    if (!Wl || Wl.ping < 0 || Wl.ping > 1 || !Wl.C.players.length) continue;
    const q = projectView(i, { x: c.x, y: c.y, z: 0 });
    markG.globalAlpha = 0.6 * (1 - Wl.ping);
    markG.strokeStyle = '#ffb347'; markG.lineWidth = 1.5;
    markG.beginPath(); markG.arc(q.x, q.y, Math.max(6, (1 + (W.reach - 1) * Wl.ping ** 0.7) * cssPerUm), 0, Math.PI * 2); markG.stroke();
  }
  for (const k of coll.kin) {
    if (!k.dying || k.dying.kind !== 'waylaid' || k.dying.t > 1) continue;
    const q = projectView(i, { x: k.dying.x, y: k.dying.y, z: 0 }), e = k.dying.t;
    markG.globalAlpha = 0.85 * (1 - e);
    markG.strokeStyle = '#ffb347'; markG.lineWidth = 2;
    markG.beginPath(); markG.arc(q.x, q.y, Math.max(10, (1.5 + 6 * e) * cssPerUm), 0, Math.PI * 2); markG.stroke();
  }
}

function stats() {
  const sp = S.sp;
  const look = currentLookKey();
  const lookName = { phase: 'Phase contrast', fluorescence: 'Fluorescence (pseudo-colour)', darkfield: 'Darkfield', sem: 'SEM (borrowed)', dic: 'DIC (borrowed)' }[look];
  const dash = P1.dash;
  const lines = [
    `${sp.short} · ${lookName} · field ${Math.round(fieldNow)} µm · your cell ${view.focusH.toFixed(1)} µm above the sediment`,
    `speed ${Math.round(S.speed).toString().padStart(3)} µm/s · ${(S.speed / sp.L).toFixed(0)} body lengths/s · ${S.mode === 'tumble' ? 'TUMBLE' : S.boring ? 'BORING IN' : S.inside ? 'INSIDE PREY' : dash.active ? 'SPRINT' : 'run'}${S.mode === 'run' && !S.boring && !S.inside ? (S.steering ? ' · steering (LS)' : swimmer.opts.steer ? ' · stopped: Brownian, flow, field' : '') : ''}`,
    S.species === 'mtb'
      ? `growth ${'█'.repeat(Math.round(Math.min(1, S.growth) * 10))}${'░'.repeat(10 - Math.round(Math.min(1, S.growth) * 10))} · food ${S.food.toFixed(2)}${S.feeding ? ' (uptake)' : ''}`
      : `prey ${S.prey}/${GOAL_PREY}${S.boring ? ` · boring ${Math.min(100, Math.round((S.boreT / 2.5) * 100))} %` : ''}`,
    `${dash.text()} · phages on you ${S.phages.length}${S.phages.some((p) => p.irreversible) ? ' (IRREVERSIBLE)' : ''}${S.attacker ? ' · BDELLOVIBRIO ATTACHED' : ''}`,
    S.species === 'mtb' ? `field ${world.opts.field} µT, mB/kT ≈ ${(S.mB || 0).toFixed(1)} (gentle pull: steer against it) · running ${S.sense > 0 ? 'north (down the field)' : 'south (up the field)'}` : `run ${sp.v} µm/s, sprint ${sp.dash} µm/s`,
    `gates: ${guards.list.map((q) => `${q.id} ${q.beaten ? 'beaten' : q.kind === 'amoeba' ? `irritated ${Math.round(100 * q.irr)} %, ${world.amoeba.tunnels.length} tunnels${q.contact ? ` (${q.contact} fighting)` : ''}` : `${Math.round((100 * Math.max(0, q.hp)) / q.max)} %${q.contact ? ` (${q.contact} fighting)` : ''}`}`).join(' · ')}`,
    capture.active && cat.kind ? `CAUGHT by ${CATCH[cat.kind].by.toLowerCase()}: ${cat.phase}` : '',
    (() => { const C = coll.of(P1); return C && C.members.length ? `army: ${C.army} cells (${C.players.length > 1 ? C.players.length + ' players' : 'you'}) · ${LEVEL_NAMES.slice(1, C.level + 1).join(', ') || 'no abilities yet'} · toxin ${Math.round(C.charge * 100)} % · drag ×${C.drag.toFixed(2)} · flock ${C.speed.toFixed(0)} µm/s, ${C.extent.toFixed(0)} µm across` : coll.opts.on ? `army: none yet (press ${glyph('X')} near kin)` : ''; })(),
    `out from the start ${Math.round(world.distFromStart(S.x, S.y))} µm · encounters ${director.index}/${ENCOUNTERS.length} (${director.state().phase})${world.landmarks.forward.placed ? ` · host ${Math.round(Math.hypot(S.x - FWD.x, S.y - FWD.y))} µm${portalSealed() ? ', sealed' : guarded() ? ', guarded' : ', open'}` : ''} · Paramecium ${Math.round(Math.hypot(S.x - BACK.x, S.y - BACK.y))} µm`,
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
  players, split, landmarks: { forward: FWD, back: BACK, log: lm.log, get near() { return lm.near; }, get prompt() { return lm.portal; } },
  get frames() { return frameCount; },
  /** The fights: each grazer's state, and each player's phage and Bdellovibrio stalker. */
  boss: () => ({ awake: stentor.awake, state: stentor.state, beaten: stentor.beaten, recoil: +stentor.recoil.toFixed(2), contract: +stentor.contract.toFixed(3), ang: +stentor.ang.toFixed(3), L: +stentor.L.toFixed(1), foot: { x: +stentor.foot.x.toFixed(1), y: +stentor.foot.y.toFixed(1) }, mouth: { x: +stentor.mouth.x.toFixed(1), y: +stentor.mouth.y.toFixed(1) }, covers: stentor.covers(FWD.x, FWD.y), log: bossInfo.log }),
  stentor, collective: coll, quality,
  coll: () => coll.report(),
  /** Waylaying: the strangers luring a flock and its drifting members (collective.js WAYLAY). */
  waylays: () => coll.waylays(),
  /** The cameras: the view centre, each player's follow camera (its point, look-ahead, RS look, target), field (µm), and each view. */
  cam: () => ({ cx: +view.cx.toFixed(1), cy: +view.cy.toFixed(1), follow: roster.map((P) => ({ x: +P.follow.x.toFixed(1), y: +P.follow.y.toFixed(1), ahead: +Math.hypot(P.follow.ax, P.follow.ay).toFixed(1), look: [+P.follow.lx.toFixed(1), +P.follow.ly.toFixed(1)], target: (({ x, y }) => [+x.toFixed(1), +y.toFixed(1)])(focusOf(P)) })), zoom: roster.map((P) => +P.zoom.toFixed(2)), views: camViews.map((c) => ({ index: c.index, cx: +c.cx.toFixed(1), cy: +c.cy.toFixed(1), fieldH: +c.fieldH.toFixed(1) })) }),
  /** Screen position (CSS px) of a slide point in view i (tests). */
  project: (x, y, i = 0) => projectView(i, { x, y, z: 0 }),
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
  rings: () => ({ log: director.log.slice(), portal: world.landmarks.forward.placed ? { x: FWD.x, y: FWD.y, guarded: guarded(), sealed: portalSealed() } : null, turned: lm.log.filter((e) => e.kind === 'turnedBack').length }),
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
  /** Go through the portal now as player `slot` (what Y at the open portal does). */
  enterPortal(slot = 0) { enterPortal(roster.find((Q) => Q.slot === slot) || P1); },
  /** The portal arrow drawn last frame, per view: [{ x, y, angle, onScreen, d, label, at } | null] ([] when off). */
  portalArrow: () => arrowLog,
  /** The director's portals (the way on): [{ instance, x, y, z, open, seen, state }]. */
  portals: () => director.portals().map(({ handle, ...q }) => q),
  /** Is the way on still sealed (encounters left before it)? */
  portalSealed: () => portalSealed(),
  /** Where player `slot`'s view centres (their flock's middle, or their cell): what the arrow measures from. */
  focus: (slot = 0) => { const f = focusOf(roster.find((Q) => Q.slot === slot) || P1); return { x: f.x, y: f.y }; },
  /** The outro after the portal: null, or { t, scale (the world's time scale), frozen, cam (the shell's pose) }. */
  outro() { return outro ? { t: +outro.t.toFixed(3), scale: +outro.scale.toFixed(3), frozen: outro.frozenAt !== null, cam: outro.cam } : null; },
  OUTRO,
  /** The continuous transition, as poses in the field drawn now: your cell, and the glimpsed phage on the host. */
  clumpScreen,
  cellPose: () => { const ov = camOverride(); return ov ? pose2D(P1.S.x, P1.S.y, P1.S.a, P1.S.sp.L, ov.cx, ov.cy, ov.fieldH) : cellPose(); },
  glimpsePose: () => { const ov = camOverride(); if (!ov) return glimpsePose(); const g = glimpsePhage(); return pose2D(g.x, g.y, g.a, PHAGE_LEN, ov.cx, ov.cy, ov.fieldH); },
  gates: () => guards.report(), guards,
  /** Every flock member (tests): position, velocity, speed, heading, spin. */
  /** Testing: player `slot` sends a beacon now (what X does). */
  beacon: (slot = 0) => !!coll.beacon(roster.find((Q) => Q.slot === slot) || P1, t),
  /** Testing: `n` daughters of player `slot`'s cell join its flock (they carry its label). */
  seedFlock: (slot = 0, n = 6) => { const P = roster.find((Q) => Q.slot === slot) || P1; let k = 0; for (let i = 0; i < n; i++) { const a = i * 2.4; if (coll.adopt(P, P.S.x + Math.cos(a) * (2 + i * 0.6), P.S.y + Math.sin(a) * (2 + i * 0.6), P.S.a)) k++; } return k; },
  /** Testing: put player `slot`'s cell at (x, y). */
  placePlayer: (slot, x, y) => { const P = roster.find((Q) => Q.slot === slot); if (P) { P.S.x = x; P.S.y = y; } return !!P; },
  members: (slot = 0) => { const C = coll.of(roster.find((Q) => Q.slot === slot) || P1); return C ? C.members.map((m) => ({ x: m.x, y: m.y, vx: m.vx, vy: m.vy, sp: m.sp, a: m.a, body: m.bodyPhase, fl: m.flPhase, lag: m.lag, vmax: m.vmax })) : []; },
  fights: () => ({ grazers: world.grazers.map((g) => ({ state: g.fightState, t: +(g.fightT || 0).toFixed(2), interest: +g.fight.interest.toFixed(2), pull: +(g.pull || 1).toFixed(2), target: g.target ? g.target.slot : null })),
    phage: roster.map((P) => (P.phage ? P.phage.fight.state : null)), bdello: roster.map((P) => (P.bdello ? P.bdello.fight.state : null)) }),
  roster: () => roster.map((P) => ({ slot: P.slot, x: P.S.x, y: P.S.y, speed: P.S.speed, body: P.S.bodyPhase, fl: P.S.flPhase, alive: P.S.alive, mode: P.S.mode, over: P.S.over, cause: P.S.cause, focus: { ...focusOf(P) }, capture: P.capture.active ? P.cat.phase : null })),
  get army() { return armyEl.textContent; },
  get warning() { return warnEl.textContent; },
};
requestAnimationFrame((n) => { last = n; frame(n); });
