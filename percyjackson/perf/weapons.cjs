// Weapon check: every armed model holds its weapon pointing forward and
// strikes forward. Builds each model (heroes, bosses, monsters and fodder,
// champions, people, mortals) in headless Chromium, poses it at rest and at
// the strike moment of each attack style, and measures in world space where
// the weapon's tip lies relative to the hand, along the model's facing (+z).
//   at rest:     the tip is in front of the hand or above it (a raised hold is fine)
//   at a strike: the tip is in front of the hand (forward share >= STRIKE_MIN)
//   a shot:      a ranged monster or champion (ai 'ranged' or 'summon', which
//                shoot with enemy.js 'spit') holds what it carries level at
//                the target through the wind-up of a shot (the action
//                enemy.js animate plays: cast, both hands) and the kick of
//                the shot (forward share >= AIM_MIN, about 30 degrees off
//                level at most), and still forward as it lowers it after
//                (>= STRIKE_MIN). Columns aim, kick, lower.
// Tips are the objects markTip() adds (name 'weaponTip', see the hand-axis
// convention at "holding things" in js/entities/character.js). A long prop in
// a hand with no marked tip is measured at its farthest point and listed too,
// so a new weapon without a mark still gets checked; markHeld() exempts a
// prop with no point to aim (a shield, a sling, a trailing whip).
//   NODE_PATH=/opt/node22/lib/node_modules node percyjackson/perf/weapons.cjs
// Prints a table; exits 1 if any check fails. Serves the repository on
// PERF_PORT (default 8765) if nothing is there yet. As a module (check.cjs):
// run({ browser, base, page?, only? }) resolves to { ok, lines, summary, rows }.

const REST_MIN = -0.05, STRIKE_MIN = 0.3, AIM_MIN = 0.85;
// (every style for both hands: a boss may swing with one arm while the other holds the weapon)
const ALL = ['swingR', 'swingL', 'punch', 'slam', 'uppercut', 'throw', 'backhand'], STYLES = { R: ALL, L: ALL };
// (the gear set: every weapon item of loot.js in the hands of every hero, gear/weapons.js, re-posed for its family: GEAR_HEROES)
const GEAR_HEROES = (process.env.GEAR_HEROES || '').split(',').filter(Boolean);

const { openModulePage, loadModule, watchErrors, reseed, cli } = require('./lib.cjs');

// The in-page module (served beside the workbench as workbench/__weapons.js): builds and poses the models.
function moduleSource() {
  return `import * as THREE from 'three/webgpu';
import { buildHeroModel, buildNpc, HERO_LOOKS } from '../js/entities/models.js';
import { buildMonsterModel, MONSTERS, MONSTER_IDS } from '../js/entities/monsters.js';
import { buildMortal, MORTAL_IDS } from '../js/entities/mortals.js';
import { BOSS_DEFS, BOSS_IDS } from '../js/entities/bosses.js';
import { buildPerson, PEOPLE_IDS } from '../js/entities/people.js';
import { rigOffsets } from '../js/entities/parts.js';
import { CHAMPION_SHOWCASE, CHAMPION_LOOKS, buildShowcase } from '../js/entities/champions.js';
import { dressHero } from '../js/entities/gear/equip.js';
import { WEAPON_IDS } from '../js/entities/gear/weapons.js';
import { ITEMS } from '../js/loot.js';
// the models that shoot (enemy.js shoot: the 'spit' attack): ranged and summoning monsters, and champions of those kinds
const shooter = (set, id) => {
  const kind = set === 'monsters' ? id : set === 'champions' ? (id.startsWith('kind:') ? id.slice(5) : CHAMPION_LOOKS[id]?.kind) : null;
  const ai = kind && MONSTERS[kind]?.ai;
  return ai === 'ranged' || ai === 'summon';
};
// a shot as enemy.js animate plays it: the wind-up (cast, both hands), then the recover as an attack with no style
const SHOT = { aim: { type: 'cast', t: 1, both: true }, kick: { type: 'attack', t: 0.4, windup: 0.3, strike: 0.5 }, lower: { type: 'attack', t: 0.75, windup: 0.3, strike: 0.5 } };
const SETS = {
  heroes: [[...Object.keys(HERO_LOOKS), 'chiron', 'mr_d'], (id) => (HERO_LOOKS[id] ? buildHeroModel(id) : buildNpc(id))],
  bosses: [BOSS_IDS, (id) => BOSS_DEFS[id].build()],
  monsters: [MONSTER_IDS, (id) => buildMonsterModel(MONSTERS[id].model)],
  champions: [CHAMPION_SHOWCASE, (id) => buildShowcase(id)],
  people: [PEOPLE_IDS, (id) => buildPerson(id)],
  mortals: [MORTAL_IDS, (id) => buildMortal(id)],
  // every weapon item in each hero's hands (one rig a hero, re-dressed: gear/equip.js)
  gear: [(${JSON.stringify(GEAR_HEROES)}.length ? ${JSON.stringify(GEAR_HEROES)} : Object.keys(HERO_LOOKS)).flatMap((h) => ITEMS.filter((i) => i.kind === 'weapon' && WEAPON_IDS.includes(i.id) && i.id !== 'training_sword').map((i) => h + '+' + i.id)),
    (key) => { const [h, w] = key.split('+'); const r = (gearRigs[h] ??= buildHeroModel(h)); dressHero(r, { weapon: w }); return r; }],
};
const gearRigs = {};
const STYLES = ${JSON.stringify(STYLES)};
const zero = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), fwd = new THREE.Vector3();
function pose(r, action) {
  for (let i = 0; i < 80; i++) { rigOffsets(r, -1); r.animate({ dt: 0.033, speed: 0, vel: zero, action }); rigOffsets(r, 1); }
  r.root.updateMatrixWorld(true);
}
// which side a node hangs from (hand or arm), or null
function sideOf(r, o) {
  for (let p = o; p; p = p.parent) {
    if (p === r.handR || p === r.armR) return 'R';
    if (p === r.handL || p === r.armL) return 'L';
  }
  return null;
}
// tips: marked ones, else the farthest point of each long unmarked hand prop
function tips(r) {
  const out = [];
  r.root.traverse((o) => { if (o.userData?.weaponTip) { const s = sideOf(r, o); if (s) out.push({ o, side: s, name: o.userData.label || 'weapon', marked: true }); } });
  if (r.handR === r.handL) return out;   // (a quadruped's "hands" are its jaw)
  for (const [hand, side] of [[r.handR, 'R'], [r.handL, 'L']]) for (const c of hand.children) {
    let has = false; c.traverse((o) => { if (o.userData?.weaponTip || o.userData?.heldProp) has = true; }); if (has) continue;
    r.root.updateMatrixWorld(true);
    const inv = hand.matrixWorld.clone().invert(); let best = null, bd = 0;
    c.traverse((m) => {
      if (!m.isMesh || !m.geometry) return;
      const P = m.geometry.attributes.position, v = new THREE.Vector3();
      for (let k = 0; k < P.count; k += Math.max(1, Math.floor(P.count / 300))) { v.fromBufferAttribute(P, k).applyMatrix4(m.matrixWorld).applyMatrix4(inv); if (v.length() > bd) { bd = v.length(); best = v.clone(); } }
    });
    if (!best || bd * r.root.scale.x < 0.4) continue;   // (fists, claws, pom-poms: too short to point anywhere)
    const o = new THREE.Object3D(); o.position.copy(best); hand.add(o);
    out.push({ o, side, name: 'unmarked prop', marked: false });
  }
  return out;
}
function measure(r, t) {
  const hand = t.side === 'R' ? r.handR : r.handL;
  t.o.getWorldPosition(a); hand.getWorldPosition(b); r.root.getWorldDirection(fwd);
  const d = a.sub(b), L = d.length();
  return L > 1e-6 ? d.dot(fwd) / L : 0;
}
export function run(only) {
  const rows = [];
  for (const [set, [ids, build]] of Object.entries(SETS)) for (const id of ids) {
    if (only && !only.includes(id) && !(set === 'gear' && only.some((o) => id.startsWith(o + '+') || id.endsWith('+' + o)))) continue;
    globalThis.__perfReseed?.();   // (PERF_SEED: lib.cjs reseed)
    let r;
    try { r = build(id); } catch (e) { rows.push({ set, id, error: String(e).slice(0, 120) }); continue; }
    if (!r?.root || !r.animate) continue;
    const T = tips(r); if (!T.length) continue;
    for (const t of T) {
      const row = { set, id, weapon: t.name, side: t.side, marked: t.marked, hidden: false, rest: null, strikes: {} };
      for (let p = t.o; p; p = p.parent) if (p.visible === false) row.hidden = true;
      if (r.statuePose) { r.statuePose(r); r.root.updateMatrixWorld(true); row.statue = measure(r, t); }
      pose(r, null); row.rest = measure(r, t);
      row.restOnly = !!r.person;   // (the open world's people hand out quests and never attack)
      if (r.armR && r.handR !== r.handL && !row.restOnly) for (const style of STYLES[t.side]) { pose(r, { type: 'attack', t: 0.499, style, windup: 0.3, strike: 0.5 }); row.strikes[style] = measure(r, t); }
      if (r.armR && r.handR !== r.handL && shooter(set, id)) { row.shots = {}; for (const [k, act] of Object.entries(SHOT)) { pose(r, act); row.shots[k] = measure(r, t); } }
      rows.push(row);
    }
  }
  return rows;
}
`;
}


function report(rows) {
  const lines = [];
  const f = (v) => (v == null ? '' : (v >= 0 ? ' ' : '') + v.toFixed(2));
  const cols = ['swingR', 'swingL', 'punch', 'slam', 'uppercut', 'throw', 'backhand'];
  const shots = ['aim', 'kick', 'lower'];
  lines.push(['set'.padEnd(10), 'model'.padEnd(20), 'weapon'.padEnd(16), 'hand', ' rest', ...cols.map((c) => c.padStart(8)), ...shots.map((c) => c.padStart(6)), ' result'].join(' '));
  let fails = 0;
  for (const r of rows) {
    if (r.error) { lines.push([r.set.padEnd(10), r.id.padEnd(20), 'ERROR', r.error].join(' ')); fails++; continue; }
    const bad = [];
    if (r.rest < REST_MIN) bad.push('rest');
    if (r.statue != null && r.statue < REST_MIN) bad.push('statue');
    for (const [s, v] of Object.entries(r.strikes)) if (v < STRIKE_MIN) bad.push(s);
    for (const [s, v] of Object.entries(r.shots ?? {})) if (v < (s === 'lower' ? STRIKE_MIN : AIM_MIN)) bad.push('shot ' + s);
    if (bad.length) { fails++; r.fail = true; }
    const name = (r.weapon + (r.hidden ? ' (hidden)' : '')).slice(0, 16);
    lines.push([r.set.padEnd(10), r.id.padEnd(20), name.padEnd(16), (' ' + r.side).padEnd(4), f(r.rest).padStart(5), ...cols.map((c) => f(r.strikes[c]).padStart(8)), ...shots.map((c) => f(r.shots?.[c]).padStart(6)), ' ' + (bad.length ? 'FAIL ' + bad.join(',') : 'ok') + (r.statue != null ? ` (statue pose ${f(r.statue)})` : '') + (r.restOnly ? ' (rest only: never attacks)' : '') + (r.marked ? '' : ' [no tip mark]')].join(' '));
  }
  const gear = rows.filter((r) => r.set === 'gear');
  if (gear.length) lines.push(`\ngear: ${new Set(gear.map((r) => r.id.split('+')[1])).size} weapon items in the hands of ${new Set(gear.map((r) => r.id.split('+')[0])).size} heroes (${gear.length} hands), ${gear.filter((r) => r.fail).length} failing`);
  lines.push(`\n${rows.length} weapons checked, ${fails} failing. Columns: forward share of the hand-to-tip direction (1 = straight ahead, 0 = straight up or sideways, -1 = straight back); rest needs >= ${REST_MIN}, each strike >= ${STRIKE_MIN}; a shooter's aim and kick >= ${AIM_MIN} (level at the target), its lowering >= ${STRIKE_MIN}.`);
  return { ok: !fails, lines, rows, summary: { weapons: rows.length, failing: fails, gearHands: gear.length }, text: `${rows.length} weapons (${gear.length} of them gear items in heroes' hands), ${fails} failing` };
}

// page: a page under workbench/ with the import map (openModulePage); a new one if not given
async function run({ browser, base, page = null, only = null }) {
  const own = page ? null : await openModulePage(browser, base);
  page = page ?? own.page;
  const w = watchErrors(page, (e) => String(e.message).slice(0, 300));
  try {
    const err = await loadModule(page, base, 'weapons', moduleSource());
    const errors = [...(own ? own.errors : w.errors)]; if (err && !errors.length) errors.push(err);
    if (errors.length) return { ok: false, lines: [errors.join('\n')], rows: [], summary: { pageErrors: errors.length }, text: `page errors: ${errors[0]}` };
    await reseed(page);
    const rows = await page.evaluate((o) => import('./__weapons.js').then((m) => m.run(o)), only);
    return report(rows);
  } finally { w.stop(); if (own) await own.page.close(); }
}

module.exports = { run, moduleSource, report };
if (require.main === module) cli(run, { only: process.argv[2] ? process.argv[2].split(',') : null });
