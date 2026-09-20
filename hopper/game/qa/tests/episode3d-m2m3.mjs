// Node test for the 3D edition's episode flow, missions two and three: The
// Iron Migration (Cinder Foundries -> Tempest Docks -> Skyhook Works, boss
// Smelter Leviathan) and Beyond the Black Sun (Vermilion Basin -> Cobalt
// Drift -> Violet Inversion, boss Eclipse Regent). Plays each mission end to
// end through the real Engine3D exactly as qa/tests/episode3d.mjs plays
// mission one: a fake canvas, an audio stub, a snapshot callback,
// engine.start(mission), engine.tick(dt, input), teleports via the engine's
// private fields. New here: the hazards and mechanics these districts
// introduce (slag, the sea's shore, staged bridges, the three gravity
// regions, gravity seams) and the Smelter Leviathan and Eclipse Regent
// fights.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const source = new URL('../../src/', import.meta.url).pathname;
const standIns = new URL('../../../3d/standins/src/index.js', import.meta.url).pathname;
const threeModule = require.resolve('three').replace(/three\.cjs$/, 'three.module.js');
const threeDir = path.dirname(path.dirname(threeModule)); // .../three/build/three.module.js -> .../three
const gltfLoader = path.join(threeDir, 'examples/jsm/loaders/GLTFLoader.js');
const meshoptDecoder = path.join(threeDir, 'examples/jsm/libs/meshopt_decoder.module.js');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hopper-episode3d-m2m3-'));
const names = ['world', 'controller', 'jumptuning', 'combattuning', 'camera', 'combat3d', 'district', 'district2', 'district3', 'boss3d', 'commanders', 'leviathan3d', 'regent3d', 'engine3d', 'route', 'scenery', 'trailprops', 'preload', 'textures3d', 'models3d', 'trail', 'shadows/index', 'shadows/ground', 'shadows/rooted', 'shadows/flyers'];
fs.mkdirSync(path.join(temp, 'shadows'), { recursive: true });
// The renderer needs a DOM; the engine only calls a handful of its methods.
fs.writeFileSync(
  path.join(temp, 'scene.mjs'),
  `export class Scene3D {
  constructor(canvas) { this.canvas = canvas; this.builds = 0; this.effects = []; this.bossSets = []; this.frames = 0; }
  async loadHopper(_url, progress) { progress(1); }
  buildWorld(world, shadows, rook, ahead, next) { this.builds++; this.lastBuild = { world, shadows, rook, ahead, next }; }
  capture() { return 'data:image/jpeg;base64,STUB'; }
  setBoss(rook) { this.bossSets.push(rook); }
  effect(name, x, y, z) { this.effects.push({ name, x, y, z }); }
  render() { this.frames++; }
  renderIdle() {}
  setHalo() {}
  dispose() {}
  get hopperReady() { return true; }
}
`,
);
fs.writeFileSync(path.join(temp, 'game-engine.mjs'), `export function saveKey(edition, name) { return edition === '3d' ? 'hopper3d.' + name : 'hopper.' + name; }\n`);
for (const name of names) {
  const raw = fs
    .readFileSync(source + 'game3d/' + name + '.ts', 'utf8')
    .replace(/from '(\.\.?\/[\w-/]+)'/g, (m, rel) => { const target = path.posix.normalize(path.posix.join(path.posix.dirname(name), rel)); return names.includes(target) || target === 'scene' ? `from '${rel}.mjs'` : m; })
    .replaceAll("from '../game/game-engine'", "from './game-engine.mjs'")
    .replace("'../../../3d/standins/src/index.js'", `'${standIns}'`)
    .replace("'../../../3d/standins/src/palette.js'", `'${new URL('../../../3d/standins/src/palette.js', import.meta.url).pathname}'`)
    .replace("'../../../3d/standins/src/textures.js'", `'${new URL('../../../3d/standins/src/textures.js', import.meta.url).pathname}'`)
    .replace("'three/examples/jsm/loaders/GLTFLoader.js'", `'${gltfLoader}'`)
    .replace("'three/examples/jsm/libs/meshopt_decoder.module.js'", `'${meshoptDecoder}'`)
    .replace(/from 'three'/g, `from '${threeModule}'`)
    // Bare JSON imports (design/delivery manifests, baked collision) need an
    // import attribute under plain Node ESM; `require` reads JSON natively.
    .replace(/import (\w+) from '(\.\.\/[^']+\.json)';/g, (m, ident, rel) => {
      const dir = path.posix.dirname(name);
      const base = dir === '.' ? source + 'game3d/' : source + 'game3d/' + dir + '/';
      return `const ${ident} = require('${base}${rel}');`;
    });
  const compiled = ts.transpileModule(raw, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, verbatimModuleSyntax: false } }).outputText;
  const withRequire = compiled.includes('require(') ? `import { createRequire as __cr } from 'node:module';\nconst require = __cr(import.meta.url);\n${compiled}` : compiled;
  fs.writeFileSync(path.join(temp, name + '.mjs'), withRequire);
}

// Browser globals the engine touches.
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.document = { pointerLockElement: null };

const { Engine3D } = await import(path.join(temp, 'engine3d.mjs'));
const { MISSIONS } = await import(path.join(temp, 'district.mjs'));

/** Let a district's preload settle: its paintings resolve on the microtask
 * queue (null in Node, where nothing decodes), then the handover runs. */
const settle = async () => {
  for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0));
};
const dt = 1 / 60;
const empty = {
  moveX: 0,
  moveY: 0,
  menuX: 0,
  menuY: 0,
  anyPressed: false,
  instructionsPressed: false,
  connected: false,
  active: false,
  disconnected: false,
  lookX: 0,
  lookY: 0,
  mouseLookX: 0,
  mouseLookY: 0,
  jumpPressed: false,
  jumpHeld: false,
  kickPressed: false,
  shootHeld: false,
  blockHeld: false,
  divePressed: false,
  diveHeld: false,
  lockPressed: false,
  lockHeld: false,
  chargeHeld: false,
  dashPressed: false,
  dashHeld: false,
  sprintHeld: false,
  horizonHeld: false,
  cameraResetPressed: false,
  pausePressed: false,
  confirmPressed: false,
  backPressed: false,
};
let checks = 0;
const check = (cond, msg) => {
  assert.ok(cond, msg);
  checks++;
};
const finiteXYZ = (x, y, z) => Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z);

const canvas = { addEventListener() {}, removeEventListener() {}, clientWidth: 1600, clientHeight: 900 };

/** Everything a mission's playthrough needs, bound to one Engine3D instance:
 * the private-field accessor, the world/combat/district getters, the fixed
 * step runner, a teleport (grounded, invulnerable -- the walk is about flow,
 * not survival) and one that lands airborne (for soft-floor hazards, which
 * only ever apply to a Hopper who isn't already resting on solid ground),
 * a finite-state sanity check, and the engine's last emitted snapshot. */
function makeContext() {
  const box = { snapshot: null, sounds: [] };
  const audio = { effect: (n) => box.sounds.push(n) };
  const engine = new Engine3D(canvas, audio, (s) => (box.snapshot = s));
  const priv = (k) => engine[k];
  const world = () => priv('world');
  const combat = () => priv('combat');
  const district = () => priv('district');
  const run = (seconds, input = empty) => {
    for (let i = 0; i < Math.round(seconds / dt); i++) engine.tick(dt, input);
  };
  const teleport = (x, y, z) => {
    const h = engine.player;
    h.x = x;
    h.y = y;
    h.z = z;
    h.vx = h.vy = h.vz = 0;
    h.grounded = true;
    h.move = 'idle';
    h.invuln = 1e9;
  };
  const teleportFalling = (x, y, z) => {
    teleport(x, y, z);
    engine.player.grounded = false;
  };
  const finite = () => {
    const h = engine.player;
    check([h.x, h.y, h.z, h.vx, h.vy, h.vz].every(Number.isFinite), `Hopper state stays finite (${JSON.stringify({ x: h.x, y: h.y, z: h.z, vx: h.vx, vy: h.vy, vz: h.vz, move: h.move })})`);
  };
  return { engine, priv, world, combat, district, run, teleport, teleportFalling, finite, snap: () => box.snapshot, sounds: () => box.sounds };
}


/** Find, empirically, the world (x, z) a collider actually sits at: it
 * carries its structure's centre and yaw plus its own offset in the
 * structure's local frame, and rather than hand-derive the rotation's sign
 * convention this just tries both and keeps whichever one `groundAt` (the
 * same query real collision uses) agrees points at this exact collider. */
function worldPointOfCollider(w, c) {
  const cosY = Math.cos(c.yaw),
    sinY = Math.sin(c.yaw);
  const candidates = [
    [c.cx + c.ox * cosY - c.oz * sinY, c.cz + c.ox * sinY + c.oz * cosY],
    [c.cx + c.ox * cosY + c.oz * sinY, c.cz - c.ox * sinY + c.oz * cosY],
  ];
  for (const [x, z] of candidates) {
    const g = w.groundAt(x, z, c.y1 + 5, 1);
    if (g.collider === c) return { x, y: c.y1, z };
  }
  return null;
}

/** Play one district: totems, signals, strongholds, then the boss and exit.
 * `extra(ctx, d, w, c)`, when given, runs district-specific checks once it
 * has loaded, before the totem walk. `boss` (when the district carries one)
 * names the expected HUD name and a state the natural fight cycle should
 * reach, and is passed on to fightBoss(). */
async function playDistrict(ctx, missionIdx, index, opts = {}) {
  const { priv, world, combat, run, teleport, finite, snap } = ctx;
  const d = priv('district');
  const w = world();
  const c = combat();
  const mission = MISSIONS[missionIdx];
  check(d.name === mission[index]().name, `district ${index} of mission ${missionIdx} loaded (${d.name})`);
  check(w.instances.length > 10, `${d.name} has structures`);
  check(priv('scene').lastBuild.world === w, 'scene built for the district');
  const ahead = priv('scene').lastBuild.next;
  if (index < mission.length - 1) {
    check(!!ahead, `${d.name}: the next district is shown ahead`);
    const n = ahead.world.district;
    check(Math.abs(ahead.offset[0] + n.start.x - d.exit.x) < 0.01 && Math.abs(ahead.offset[2] + n.start.z - d.exit.z) < 0.01, `${d.name}: the next district starts on this exit`);
    const seam = ahead.offset[1] + ahead.world.heightAt(n.start.x, n.start.z) - w.heightAt(d.exit.x, d.exit.z);
    check(Math.abs(seam) < 0.01, `${d.name}: the ground meets at the seam (${seam.toFixed(2)} m)`);
    check(ahead.world.instances.length > 40, `${d.name}: the district ahead has its structures`);
  } else check(!ahead, `${d.name}: nothing beyond the last district`);
  const totems = priv('checkpoints');
  check(totems.length >= 7, `${d.name} has a totem chain (${totems.length})`);
  if (priv('boss')) check(!priv('boss').runtime.active && priv('boss').runtime.state === 'sleep', `${d.name}: the commander sleeps until Hopper enters the arena`);

  const walkTotems = () => {
    for (const [i, t] of totems.entries()) {
      teleport(t.x, t.y + 1, t.z);
      run(0.6);
      finite();
      if (priv('district') !== d) break;
      check(priv('checkpointIndex') >= i, `${d.name}: totem ${i} lit (index ${priv('checkpointIndex')}, totem at ${t.x.toFixed(0)},${t.y.toFixed(0)},${t.z.toFixed(0)}, taken ${t.taken})`);
    }
    check(JSON.parse(store.get('hopper3d.save')).checkpoint >= 1, 'checkpoint saved');
  };

  // Strongholds: the host waits in view on the structures, comes down when
  // Hopper is within reach, and clearing it frees the field.
  for (const field of w.fields.filter((f) => f.group !== 'boss')) {
    const group = c.shadows.filter((s) => s.group === field.group);
    check(group.length > 0, `stronghold ${field.id} has a host`);
    // A host member is in plain view before release either perched on a
    // structure top (the mission-one pattern) or, new here, hanging under a
    // lintel (a mirror stalker's `ceiling: true`) -- combat3d.ts's own
    // make() deliberately leaves a ceiling-hung shadow unperched (it has no
    // structure top to stand on), so requiring `perched` of every member
    // would wrongly fail a stronghold that mixes the two.
    check(group.every((s) => (s.perched || s.ceiling) && s.dormant && s.held), `${d.name}: ${field.id} host waits in view (perched or hanging) before the approach`);
    const climbers = group.filter((s) => !s.rooted);
    const up = climbers.filter((s) => s.y - w.heightAt(s.x, s.z) >= 10);
    check(up.length >= Math.ceil(climbers.length * 0.7), `${d.name}: ${field.id} host is up on the structures (${up.length}/${climbers.length} at least 10 m up)`);
    teleport(field.x + 300, w.heightAt(field.x + 300, field.z + 300) + 1, field.z + 300);
    run(0.2);
    check(!field.active, `${d.name}: stronghold ${field.id} is quiet from 420 m`);
    check(group.some((s) => s.stare > 0), `${d.name}: ${field.id} host stares as Hopper approaches`);
    teleport(field.x, field.y + 1, field.z);
    run(0.2);
    check(field.active, `${d.name}: stronghold ${field.id} activated on approach`);
    check(ctx.sounds().includes('boss'), 'stronghold sting played');
    ctx.engine.player.x = field.x + field.r + 30;
    run(0.1);
    check(Math.hypot(ctx.engine.player.x - field.x, ctx.engine.player.z - field.z) > field.r, 'nothing holds Hopper inside a stronghold');
    teleport(field.x, field.y + 1, field.z);
    run(7); // let the host come down
    check(group.some((s) => s.alive && !s.dormant), `${d.name}: ${field.id} host released`);
    check(group.every((s) => !s.alive || !s.dormant || s.entry === 'ambush' || s.wave > 0), `${d.name}: ${field.id} wave-0 host all released within 7 s`);
    for (const s of group)
      if (s.alive) {
        s.open = 5;
        c.damage(s, 999, priv('callbacks').call(ctx.engine));
      }
    run(0.2);
    check(field.cleared && !field.active, `${d.name}: ${field.id} freed when its host fell`);
    check(snap().banner.includes('freed') || snap().banner === 'Gate open', `freed banner (${snap().banner})`);
  }

  // Signals: beacons are free, cages break open under Hopper's own fire.
  const signalTriggers = w.triggers.filter((t) => t.kind === 'signal' && !(opts.skipSignal && opts.skipSignal(t)));
  for (const t of signalTriggers) {
    if (t.locked) {
      teleport(t.x, t.y + 1, t.z + 10);
      const bars = t.cageBars.length;
      const shoot = (kind) => c.projectiles.push({ id: 900000 + c.projectiles.length, x: t.x, y: t.lockY, z: t.z, vx: 0, vy: 0, vz: 0, life: 1, radius: 1, damage: 2, gravity: 0, owner: 'hopper', kind });
      shoot('laser');
      run(0.1);
      check(t.locked, `${d.name}: cage ${t.id} survives one laser hit`);
      check(t.cageHp === t.cageMaxHp - 1, `${d.name}: cage ${t.id} lost integrity (${t.cageHp}/${t.cageMaxHp})`);
      check(t.cageBars.filter((b) => b.visible).length < bars, `${d.name}: cage ${t.id} shed a bar`);
      for (let shot = 0; shot < 40 && t.locked; shot++) {
        shoot('laser');
        run(0.1);
      }
      check(!t.locked, `${d.name}: cage ${t.id} opens under sustained fire`);
      check(t.cageBars.every((b) => !b.visible), `${d.name}: cage ${t.id} bars are gone`);
      check(!t.cageCrown.visible, `${d.name}: cage ${t.id} crown is gone`);
    }
    teleport(t.x, t.y + 1, t.z);
    // A signal that happens to sit inside the exit's own radius (Tempest
    // Docks' last one does, 10 m from a 40 m exit) would cross the threshold
    // as a side effect of simply being collected, and there is no taking a
    // crossing back. Shut the threshold for as long as it takes to pick the
    // signal up, so the rest of this district's checks -- its own hazards,
    // the totem walk, the real, deliberate exit -- run against a district
    // that has not already left.
    const exitR = d.exit.r;
    d.exit.r = 0;
    // Up to 3 s, not a flat 0.3: a signal authored against a delivered
    // structure's assumed perch may have been snapped onto real ground well
    // below it, so reaching it can take a real fall.
    for (let i = 0; i < 30 && !t.taken; i++) run(0.1);
    d.exit.r = exitR;
    check(t.taken, `${d.name}: signal ${t.id} taken`);
    // Likewise, a signal that sits inside the boss arena's own radius
    // (Violet Inversion's cathedral-facade beacon, 90 m from the Regent's
    // 170 m dais field, does) wakes the commander as a side effect of
    // collecting it. Put it back to sleep so the district's own checks --
    // and fightBoss()'s own, deliberate wake -- see it the way a player who
    // hasn't yet reached the dais would.
    if (priv('boss')?.runtime.active) {
      const r = priv('boss').runtime;
      r.active = false;
      r.state = 'sleep';
      r.phase = 1;
      r.gravity = 1;
      const arenaField = w.fields.find((f) => f.group === 'boss');
      if (arenaField) {
        arenaField.active = false;
        arenaField.cleared = false;
      }
    }
  }
  check(snap().signals >= signalTriggers.length, 'HUD counts the signals');

  // District-specific checks run last: several of them (a slag pool, a
  // staged bridge) sit inside a stronghold's own territory, and running them
  // any earlier would wake or clear that stronghold's host before the
  // generic loop above gets to see it waiting, perched, in view.
  if (opts.extra) opts.extra(ctx, d, w, c);

  // The exit: barred only while the commander lives, otherwise the district ends.
  // Landing at the exit uses groundAt rather than heightAt: Violet Inversion's
  // sits atop the eclipse dais, a structure whose floor stands well above the
  // raw terrain, and heightAt (terrain only) would land Hopper inside the
  // dais's own solid body, which shoves him out to its edge -- outside the
  // exit's own, much smaller radius.
  const toExit = () => teleport(d.exit.x, w.groundAt(d.exit.x, d.exit.z, 1e6).y + 1, d.exit.z);
  const boss = priv('boss');
  if (boss) {
    walkTotems();
    run(8); // let the opening hint expire
    toExit();
    run(0.3);
    check(!priv('crossing') && !snap().loading && priv('victoryT') <= 0, 'exit refused while the commander lives');
    check(snap().hint?.includes('commander'), 'hint names the commander');
    await fightBoss(ctx, d, w, c, opts.boss);
    // Violet Inversion's exit is the eclipse dais itself, where the Regent
    // is fought: when it falls with Hopper still standing there, the
    // victory timer has already started by the time the fight helper
    // returns, and the fixed 4 s below is measured from that moment.
    const already = priv('victoryT');
    toExit();
    run(0.3);
    check(priv('victoryT') > 0, `${d.name}: the episode's victory timer starts`);
    // The commander is updated before the arena reads it, so the exit's own
    // banner is the one left on screen.
    const finale = missionIdx >= MISSIONS.length - 1;
    const intended = finale ? 'HOPPER RETURNS TO EARTH · THANK YOU FOR PLAYING' : 'EPISODE COMPLETE';
    check(priv('bannerSmall') === intended, `${d.name}: the banner left on screen is the completion text (${priv('bannerSmall')})`);
    if (finale) check(already > 0 ? already > 3.2 && priv('victoryT') > already - 0.35 : priv('victoryT') > 3.5, `${d.name}: the finale's victory timer is the long one (~4 s; ${already.toFixed(2)} s left when the fight ended, ${priv('victoryT').toFixed(2)} s now)`);
  } else {
    walkTotems();
    if (priv('district') === d) {
      toExit();
      run(0.2);
    }
  }
  return d;
}

/** Wake the commander, watch it run its natural cycle for a while, then kill
 * it: force its core open every tick and lay a laser on whatever point
 * target() currently names (the Leviathan's tail joint/maw/head, the
 * Regent's heart) -- the same approach as episode3d.mjs's fightBoss, just
 * generalised past the Night Rook's own shape to the common `Commander`
 * surface every boss shares (`runtime`, `target()`). Also exercises one
 * mid-fight death: the checkpoint restore should keep the district and put
 * the commander back to sleep. */
async function fightBoss(ctx, d, w, c, spec) {
  const { priv, run, teleport, finite, snap, engine } = ctx;
  let boss = priv('boss');
  const arena = w.fields.find((f) => f.group === 'boss');
  check(!!arena, 'boss arena field exists');
  teleport(arena.x, arena.y + 1, arena.z);
  run(0.2);
  check(boss.runtime.active && arena.active, 'entering the arena wakes the commander');
  check(snap().boss && snap().boss.name === spec.name && snap().boss.health === 1, `HUD shows the boss bar at full health (${snap().boss?.name}, ${snap().boss?.health})`);
  check(snap().standIns?.includes('commander'), 'HUD marks the commander as stand-in art');

  // A death mid-fight: the checkpoint restore keeps the district, and the
  // commander -- freshly recreated because it was awake when Hopper fell --
  // goes back to sleep rather than staying wounded and active.
  engine['hp'] = 0;
  engine['respawnT'] = 2.2;
  // Stop ticking the instant respawn() has fired (hp is back up), rather than
  // running a fixed few seconds: the arena often reaches right up to the
  // final checkpoint (it has to, to bar the way out), so if the checkpoint
  // Hopper respawns to sits inside the arena's own radius, running any
  // further would wake it again before this check ever sees it asleep. One
  // internal physics step (1/120 s) at a time, so the very tick after
  // respawn() runs is never bundled with the one that follows it.
  for (let i = 0; i < Math.round(3 / (1 / 120)) && priv('hp') <= 0; i++) engine.tick(1 / 120, empty);
  check(priv('hp') > 0, `${d.name}: respawn actually fired within 3 s`);
  check(priv('district') === d, `${d.name}: respawn keeps the same district`);
  boss = priv('boss');
  check(!boss.runtime.active && boss.runtime.state === 'sleep', `${d.name}: respawn puts the commander back to sleep`);
  check(boss.runtime.alive, `${d.name}: respawn restores the commander to full health`);
  teleport(arena.x, arena.y + 1, arena.z);
  run(0.2);
  check(boss.runtime.active && arena.active, 're-entering the arena wakes the commander again');

  // Let the fight run untouched: the commander should cycle its own states.
  const seen = new Set();
  for (let i = 0; i < 12 * 60; i++) {
    engine.tick(dt, empty);
    seen.add(boss.runtime.state);
    if (engine.player.y < arena.y - 50) teleport(arena.x, arena.y + 1, arena.z);
  }
  check(seen.has(spec.state), `the commander's natural cycle reaches '${spec.state}' (seen: ${[...seen].join(', ')})`);
  check(finiteXYZ(boss.runtime.x, boss.runtime.y, boss.runtime.z), 'the commander stays finite');
  finite();

  // Fight back: force the core open and lay a laser on whatever point
  // target() currently names, every dozen ticks, teleporting clear of the
  // floor if a knockback ever drops Hopper through it.
  let shots = 0;
  for (let i = 0; i < 240 * 60 && boss.runtime.alive; i++) {
    boss.runtime.open = 1;
    if ('openX' in boss.runtime) {
      boss.runtime.openX = boss.runtime.x;
      boss.runtime.openY = boss.runtime.y;
      boss.runtime.openZ = boss.runtime.z;
    }
    if (i % 12 === 0) {
      const t = boss.target();
      c.projectiles.push({ id: 800000 + shots++, x: t.x, y: t.y, z: t.z, vx: 0, vy: 0, vz: 0, life: 0.5, radius: 1, damage: 2, gravity: 0, owner: 'hopper', kind: 'laser' });
    }
    engine.tick(dt, empty);
    if (engine.player.y < arena.y - 50) teleport(arena.x, arena.y + 1, arena.z);
  }
  check(!boss.runtime.alive, `the commander falls to sustained fire (${shots} shots)`);
  check(boss.runtime.phase === 3, 'the fight reached phase three');
  run(0.3);
  check(arena.cleared, 'the arena is cleared when the commander falls');
  check(snap().boss === null, 'boss bar gone');
  check(priv('hp') > 0, 'Hopper survives');
  if (boss.runtime.kind === 'eclipseRegent') {
    check(boss.runtime.gravity === 0.85, "the Regent's death restores the arena's own gravity (0.85)");
    run(0.3);
    check(engine.player.gravityScale > 0, "Hopper's own gravity is the right way up again a few ticks after the Regent falls");
  }
}

/** Cross the district threshold: the exit starts a transition, the seam
 * crossing it hands over to the next district. These walks teleport from
 * beat to beat, so they reach each threshold cold -- with none of the
 * running time the approach would otherwise have used to fetch what is
 * beyond it -- and take the loading hold that catches that case. The warmed,
 * seamless crossing is district-agnostic and covered in episode3d.mjs. */
async function advance(ctx, d, index) {
  const { priv, run, snap } = ctx;
  check(priv('crossing'), `${d.name}: stepping over the threshold crosses it`);
  check(!!snap().loading, `${d.name}: reached cold, the seam raises a loading screen`);
  await settle();
  run(1 / 60);
  check(!snap().loading, `${d.name}: the loading screen clears`);
  check(priv('districtIndex') === index + 1, `${d.name}: the threshold hands over to district ${index + 1}`);
}

// =====================================================================
// Mission one (index 1): The Iron Migration.
// =====================================================================
{
  const ctx = makeContext();
  const { engine, priv, run, teleportFalling, snap } = ctx;
  await engine.load(() => {});
  // start(mission) does not gate on the unlock store entry at all -- see
  // Engine3D.start in src/game3d/engine3d.ts, which clamps the index and
  // reads nothing from localStorage unless resume is true.
  engine.start(1);
  engine.setPaused(false);

  check(MISSIONS[1].length === 3, 'mission one (Iron Migration) has three districts');

  // ---- Cinder Foundries ----
  const cinder = await playDistrict(ctx, 1, 0, {
    extra: (ctx, d, w) => {
      check(w.soft.kind === 'slag', 'Cinder Foundries: the trench floor is slag');
      const hp0 = priv('hp');
      teleportFalling(0, -80, -1472);
      let maxY = -1e9,
        sawSoft = false;
      for (let i = 0; i < Math.round(2 / dt); i++) {
        engine.tick(dt, empty);
        const h = engine.player;
        maxY = Math.max(maxY, h.y);
        if (h.inSoft || h.events.some((e) => e.kind === 'soft')) sawSoft = true;
      }
      check(maxY > -60, `Cinder Foundries: the slag lifts Hopper above -60 at some point (max ${maxY.toFixed(1)})`);
      check(sawSoft, "Cinder Foundries: a 'soft' MoveEvent (or the inSoft flag) fired for the slag");
      check(priv('hp') === hp0, 'Cinder Foundries: hp does not drop from the slag');
    },
  });
  await advance(ctx, cinder, 0);

  // ---- Tempest Docks ----
  const tempest = await playDistrict(ctx, 1, 1, {
    extra: (ctx, d, w) => {
      check(w.soft.kind === 'sea' && w.soft.shore === true, "Tempest Docks: the sea is a 'shore' soft floor");
      teleportFalling(-260, -20, -600);
      const before = w.route.nearest(engine.player.x, engine.player.z);
      const distBefore = Math.hypot(engine.player.x - before.x, engine.player.z - before.z);
      // The sea's own vertical buoyancy is gentle (lift 14, against a body
      // already falling under the 1.25x fall multiplier) and can settle into
      // a slow, steady sink rather than a quick rise; what actually delivers
      // Hopper to safety here is the horizontal push (12 m/s) carrying him
      // back toward the shelf, where the real seabed rises above the sea
      // level and grounds him normally. Poll for up to 15 s rather than
      // assume a fixed recovery time.
      let liftedAfter = null;
      for (let t = 0; t < 15 && liftedAfter === null; t += 0.5) {
        run(0.5);
        if (engine.player.y > -6) liftedAfter = t + 0.5;
      }
      const after = w.route.nearest(engine.player.x, engine.player.z);
      const distAfter = Math.hypot(engine.player.x - after.x, engine.player.z - after.z);
      check(distAfter < distBefore, `Tempest Docks: the sea pushes Hopper back toward the trail (${distBefore.toFixed(1)} -> ${distAfter.toFixed(1)} m)`);
      check(liftedAfter !== null, `Tempest Docks: the sea delivers Hopper above -6, pushed to the shelf or genuinely lifted (${engine.player.y.toFixed(1)} after 15s)`);
    },
  });
  await advance(ctx, tempest, 1);

  // ---- Skyhook Works (boss: Smelter Leviathan) ----
  await playDistrict(ctx, 1, 2, {
    extra: () => {
      const boss = priv('boss');
      check(boss.kind === 'smelterLeviathan', `Skyhook Works: the commander is a Smelter Leviathan (${boss.kind})`);
      check(boss.runtime.segments.length === 16, `Skyhook Works: the coil has 16 segments (${boss.runtime.segments.length})`);
    },
    boss: { name: 'Smelter Leviathan', state: 'sweep', won: 'THE STAR GATE OPENS' },
  });
  run(3);
  check(snap().completed, 'mission one: snapshot reports completion');
  check(Number(store.get('hopper3d.unlocked') || 0) >= 2, "mission one: the unlock store entry advances to at least '2'");
  check(!store.has('hopper3d.save'), 'mission one: save cleared at the episode end');
  console.log(`episode3d-m2m3: ${checks} checks passed so far (mission one, The Iron Migration)`);
}

// =====================================================================
// Mission two (index 2): Beyond the Black Sun.
// =====================================================================
{
  const ctx = makeContext();
  const { engine, priv, run, teleport, snap } = ctx;
  await engine.load(() => {});
  engine.start(2);
  engine.setPaused(false);

  check(MISSIONS[2].length === 3, 'mission two (Beyond the Black Sun) has three districts');

  const vermilion = await playDistrict(ctx, 2, 0, {
    extra: (ctx, d, w) => {
      run(0.3);
      check(Math.abs(engine.player.gravityScale - 1.35) < 0.01, `Vermilion Basin: gravityScale is 1.35 on the trail (${engine.player.gravityScale})`);
      const bridgeInst = w.instances.find((i) => i.placement.staged);
      check(!!bridgeInst && bridgeInst.stages && bridgeInst.stages.length === 3, `Vermilion Basin: the staged bridge has 3 stages (${bridgeInst?.stages?.length})`);
      const farStage = bridgeInst.stages[bridgeInst.stages.length - 1];
      const farPoint = worldPointOfCollider(w, farStage.colliders[0]);
      check(!!farPoint, 'Vermilion Basin: located the far third of the staged bridge');
      teleport(farPoint.x, farPoint.y + 1, farPoint.z);
      run(2);
      const states = bridgeInst.stages.map((st) => st.state);
      const crackedEarlier = bridgeInst.stages.slice(0, -1).some((st) => st.state === 'cracking' || st.state === 'fallen');
      check(crackedEarlier, `Vermilion Basin: an earlier stage cracks or falls while Hopper stands on the far third (${states.join(', ')})`);
    },
  });
  await advance(ctx, vermilion, 0);

  const cobalt = await playDistrict(ctx, 2, 1, {
    extra: (ctx, d, w) => {
      run(0.3);
      check(Math.abs(engine.player.gravityScale - 0.55) < 0.01, `Cobalt Drift: gravityScale is 0.55 on the trail (${engine.player.gravityScale})`);
      check(w.soft.kind === 'dust', 'Cobalt Drift: the floor of the drift is dust');
    },
  });
  await advance(ctx, cobalt, 1);

  // ---- Violet Inversion (boss: Eclipse Regent) ----
  await playDistrict(ctx, 2, 2, {
    extra: (ctx, d, w) => {
      run(0.3);
      check(Math.abs(engine.player.gravityScale - 0.85) < 0.01, `Violet Inversion: gravityScale is 0.85 on the trail (${engine.player.gravityScale})`);
      teleport(0, 20, -140);
      run(3);
      const h = engine.player;
      check(h.gravityScale < 0, `Violet Inversion: the seam flips gravity negative (${h.gravityScale})`);
      const ceiling = w.ceilingAt(0, -140, 20).y;
      check(h.grounded && Math.abs(h.y - ceiling) < 1, `Violet Inversion: Hopper ends grounded on the seam's ceiling (${h.y.toFixed(1)} vs ${ceiling.toFixed(1)})`);
      const boss = priv('boss');
      check(boss.kind === 'eclipseRegent', `Violet Inversion: the commander is an Eclipse Regent (${boss.kind})`);
    },
    boss: { name: 'Eclipse Regent', state: 'fight', won: 'THE SUN COMES BACK' },
  });
  run(4.5);
  check(snap().completed, 'mission two: snapshot reports completion after the victory timer');
  console.log(`episode3d-m2m3: ${checks} checks passed so far (missions one and two combined)`);
}

console.log(`episode3d-m2m3: ${checks} checks passed (missions two and three -- The Iron Migration and Beyond the Black Sun, their hazards, the Smelter Leviathan and the Eclipse Regent)`);
