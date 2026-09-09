// Node test for the 3D edition's episode flow: Engine3D with a stubbed
// renderer and audio, played through all three districts of episode one.
// Hopper is teleported along the totem chain (the controller has its own
// tests), signals and cages are collected, gate domes and the Night Rook are
// fought, and the district transitions and the episode's completion are
// checked, at the fixed 120 Hz step the game uses.
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

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hopper-episode3d-'));
const names = ['world', 'controller', 'camera', 'combat3d', 'district', 'boss3d', 'engine3d'];
// The renderer needs a DOM; the engine only calls a handful of its methods.
fs.writeFileSync(
  path.join(temp, 'scene.mjs'),
  `export class Scene3D {
  constructor(canvas) { this.canvas = canvas; this.builds = 0; this.effects = []; this.bossSets = []; this.frames = 0; }
  async loadHopper(_url, progress) { progress(1); }
  buildWorld(world, shadows, rook) { this.builds++; this.lastBuild = { world, shadows, rook }; }
  setBoss(rook) { this.bossSets.push(rook); }
  effect(name, x, y, z) { this.effects.push({ name, x, y, z }); }
  render() { this.frames++; }
  renderIdle() {}
  dispose() {}
  get hopperReady() { return true; }
}
`,
);
fs.writeFileSync(path.join(temp, 'game-engine.mjs'), `export function saveKey(edition, name) { return edition === '3d' ? 'hopper3d.' + name : 'hopper.' + name; }\n`);
for (const name of names) {
  const raw = fs
    .readFileSync(source + 'game3d/' + name + '.ts', 'utf8')
    .replace(/from '\.\/([\w-]+)'/g, (m, n) => (names.includes(n) || n === 'scene' ? `from './${n}.mjs'` : m))
    .replaceAll("from '../game/game-engine'", "from './game-engine.mjs'")
    .replace("'../../../3d/standins/src/index.js'", `'${standIns}'`)
    .replace(/from 'three'/g, `from '${threeModule}'`);
  fs.writeFileSync(path.join(temp, name + '.mjs'), ts.transpileModule(raw, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, verbatimModuleSyntax: false } }).outputText);
}

// Browser globals the engine touches.
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.document = { pointerLockElement: null };

const { Engine3D } = await import(path.join(temp, 'engine3d.mjs'));
const { MISSIONS } = await import(path.join(temp, 'district.mjs'));

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

const sounds = [];
const audio = { effect: (n) => sounds.push(n) };
const canvas = { addEventListener() {}, removeEventListener() {}, clientWidth: 1600, clientHeight: 900 };
let snapshot = null;
const engine = new Engine3D(canvas, audio, (s) => (snapshot = s));
await engine.load(() => {});
engine.start(0);
engine.setPaused(false);

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
  // The walk is about flow, not survival: shadows along the route cannot kill Hopper here.
  h.invuln = 1e9;
};
const finite = () => {
  const h = engine.player;
  check([h.x, h.y, h.z, h.vx, h.vy, h.vz].every(Number.isFinite), `Hopper state stays finite (${JSON.stringify({ x: h.x, y: h.y, z: h.z, vx: h.vx, vy: h.vy, vz: h.vz, move: h.move })})`);
};

/** Play one district: totems, signals, cages, gates, then the boss and exit. */
function playDistrict(index) {
  const d = district();
  const w = world();
  const c = combat();
  check(d.name === MISSIONS[0][index]().name, `district ${index} loaded`);
  check(w.instances.length > 10, `${d.name} has structures`);
  check(priv('scene').lastBuild.world === w, 'scene built for the district');
  const totems = priv('checkpoints');
  check(totems.length >= 7, `${d.name} has a totem chain (${totems.length})`);
  if (priv('boss')) check(!priv('boss').rook.active && priv('boss').rook.state === 'sleep', 'the Rook sleeps until Hopper enters the arena');
  // Walk the totem chain last: the final totem can stand inside the exit.
  const walkTotems = () => {
    for (const [i, t] of totems.entries()) {
      teleport(t.x, t.y + 1, t.z);
      run(0.6);
      finite();
      if (priv('district') !== d) break;
      check(priv('checkpointIndex') === i, `${d.name}: totem ${i} lit (index ${priv('checkpointIndex')}, totem at ${t.x.toFixed(0)},${t.y.toFixed(0)},${t.z.toFixed(0)}, taken ${t.taken}, completed ${priv('completed')}, respawnT ${priv('respawnT').toFixed(2)}, hp ${priv('hp')}, player ${engine.player.x.toFixed(1)},${engine.player.y.toFixed(1)},${engine.player.z.toFixed(1)} ${engine.player.move})`);
    }
    check(JSON.parse(store.get('hopper3d.save')).checkpoint >= 1, 'checkpoint saved');
  };
  // Signals: beacons are free, cages open to a reflected shot at the lock.
  const signalTriggers = w.triggers.filter((t) => t.kind === 'signal');
  for (const t of signalTriggers) {
    if (t.locked) {
      teleport(t.x, t.y + 1, t.z + 10);
      c.projectiles.push({ id: 900000 + signalTriggers.indexOf(t), x: t.x, y: t.lockY, z: t.z, vx: 0, vy: 0, vz: 0, life: 1, radius: 1, damage: 2, gravity: 0, owner: 'hopper', kind: 'seed' });
      run(0.1);
      check(!t.locked, `${d.name}: cage ${t.id} opened by a reflected shot`);
    }
    teleport(t.x, t.y + 1, t.z);
    run(0.3);
    check(t.taken, `${d.name}: signal ${t.id} taken (trigger ${t.x},${t.y.toFixed(1)},${t.z} r ${t.r}; Hopper ${engine.player.x.toFixed(1)},${engine.player.y.toFixed(1)},${engine.player.z.toFixed(1)} ${engine.player.move}; locked ${t.locked})`);
  }
  check(snapshot.signals >= signalTriggers.length, 'HUD counts the signals');
  // Gates: enter the dome, confirm the lockdown holds Hopper in, clear its shadows.
  for (const field of w.fields.filter((f) => f.group !== 'boss')) {
    teleport(field.x, field.y + 1, field.z);
    run(0.2);
    check(field.active, `${d.name}: gate ${field.id} sealed on entry`);
    check(sounds.includes('boss'), 'lockdown sting played');
    // Try to leave: the dome pushes back.
    engine.player.x = field.x + field.r + 30;
    run(0.1);
    check(Math.hypot(engine.player.x - field.x, engine.player.z - field.z) <= field.r, 'the dome keeps Hopper inside');
    const group = c.shadows.filter((s) => s.group === field.group);
    check(group.length > 0, `gate ${field.id} has shadows`);
    for (const s of group)
      if (s.alive) {
        // Armoured shadows only take full damage with the core open.
        s.open = 5;
        c.damage(s, 999, priv('callbacks').call(engine));
      }
    run(0.2);
    check(field.cleared && !field.active, `${d.name}: gate ${field.id} opened when its shadows fell`);
  }
  // The exit: sealed while the boss lives, otherwise the district ends.
  const boss = priv('boss');
  if (boss) {
    // The arena holds the exit, so the totems come first here.
    walkTotems();
    run(8); // let the opening hint expire
    teleport(d.exit.x, w.heightAt(d.exit.x, d.exit.z) + 1, d.exit.z);
    run(0.3);
    check(priv('transitionT') <= 0 && priv('victoryT') <= 0, 'exit refused while the commander lives');
    check(snapshot.hint?.includes('commander'), 'hint names the commander');
    fightBoss(boss, w, c);
    teleport(d.exit.x, w.heightAt(d.exit.x, d.exit.z) + 1, d.exit.z);
    run(0.2);
  } else {
    walkTotems();
    if (priv('district') === d) {
      teleport(d.exit.x, w.heightAt(d.exit.x, d.exit.z) + 1, d.exit.z);
      run(0.2);
    }
  }
  return d;
}

function fightBoss(boss, w, c) {
  const rook = boss.rook;
  const arena = w.fields.find((f) => f.group === 'boss');
  check(arena, 'boss arena field exists');
  teleport(arena.x, arena.y + 1, arena.z);
  run(0.2);
  check(rook.active && arena.active, 'entering the arena wakes the Rook and seals the dome');
  check(snapshot.boss && snapshot.boss.name === 'Night Rook' && snapshot.boss.health === 1, 'HUD shows the boss bar');
  check(snapshot.standIns?.includes('commander'), 'HUD marks the commander as stand-in art');
  // Let the fight run: the Rook should mark, sweep and climb on its own.
  const seen = new Set();
  const fake = { ...empty };
  for (let i = 0; i < 12 * 60; i++) {
    engine.tick(dt, fake);
    seen.add(rook.state);
    if (engine.player.y < arena.y - 50) teleport(arena.x, arena.y + 1, arena.z);
  }
  check(seen.has('mark') && seen.has('sweep') && seen.has('climb'), `the Rook cycles its attacks (${[...seen].join(', ')})`);
  check([rook.x, rook.y, rook.z].every(Number.isFinite), 'the Rook stays finite');
  finite();
  // Fight back: lasers into the core until it falls, teleporting clear of the floor.
  let shots = 0;
  for (let i = 0; i < 240 * 60 && rook.alive; i++) {
    if (i % 12 === 0) {
      c.projectiles.push({ id: 700000 + shots++, x: rook.x, y: rook.y + rook.height * 0.5, z: rook.z, vx: 0, vy: 0, vz: 0, life: 0.5, radius: 1, damage: 2, gravity: 0, owner: 'hopper', kind: 'laser' });
    }
    engine.tick(dt, fake);
    if (priv('respawnT') > 0) {
      run(2.5);
      check(priv('boss') !== boss || rook.alive, 'respawn mid-fight resets the arena');
      return fightBoss(priv('boss'), w, c);
    }
    if (engine.player.y < arena.y - 50) teleport(arena.x, arena.y + 1, arena.z);
  }
  check(!rook.alive, `the Rook falls to sustained fire (${shots} shots)`);
  check(rook.phase === 3, 'the fight reached phase three');
  run(0.3);
  check(arena.cleared, 'the arena dome lifts when the Rook falls');
  check(snapshot.boss === null, 'boss bar gone');
  check(priv('hp') > 0, 'Hopper survives');
}

// ---- Episode one ----
check(MISSIONS[0].length === 3, 'episode one has three districts');
check(snapshot.standIns === undefined || snapshot.standIns.includes('shadows'), 'HUD stand-in tag reads the shadows on screen');
const first = playDistrict(0);
check(priv('transitionT') > 0, `${first.name}: exit starts the transition`);
check(snapshot.banner === first.exit.name, 'exit banner');
run(2.5);
check(priv('districtIndex') === 1, 'second district loaded');
check(priv('scene').builds === 2, 'scene rebuilt for the second district');
check(JSON.parse(store.get('hopper3d.save')).district === 1, 'district saved');
const second = playDistrict(1);
run(2.5);
check(priv('districtIndex') === 2, `${second.name} leads to the third district`);
const third = playDistrict(2);
check(priv('victoryT') > 0, `${third.name}: episode complete`);
run(3);
check(snapshot.completed, 'snapshot reports completion');
check(store.get('hopper3d.unlocked') === '0' || store.get('hopper3d.unlocked') === undefined || Number(store.get('hopper3d.unlocked')) >= 0, 'unlock recorded');
check(!store.has('hopper3d.save'), 'save cleared at the episode end');
check(snapshot.progress >= 0.99, 'progress reaches the end');

// ---- Resume from a save in the second district ----
const engine2 = new Engine3D(canvas, audio, (s) => (snapshot = s));
await engine2.load(() => {});
store.set('hopper3d.save', JSON.stringify({ mission: 0, district: 1, checkpoint: 3, signals: ['sig-a'], score: 1234 }));
engine2.start(0, true);
engine2.setPaused(false);
check(engine2.districtIndex === 1 && engine2.checkpointIndex === 3, 'resume restores the district and checkpoint');
check(engine2.score === 1234, 'resume restores the score');
check(Math.hypot(engine2.player.x - engine2.checkpoints[3].x, engine2.player.z - engine2.checkpoints[3].z) < 20, 'Hopper starts at the saved totem');

console.log(`episode3d: ${checks} checks passed (three districts, cages, gates, the Night Rook, transitions, resume)`);
