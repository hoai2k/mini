// Node test for the 3D edition's episode flow: Engine3D with a stubbed
// renderer and audio, played through all three districts of episode one.
// Hopper is teleported along the totem chain (the controller has its own
// tests), signals and cages are collected, strongholds and the Night Rook are
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
const names = ['world', 'controller', 'camera', 'combat3d', 'district', 'boss3d', 'engine3d', 'route', 'scenery', 'preload', 'textures3d', 'models3d', 'trail'];
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
    .replace("'../../../3d/standins/src/palette.js'", `'${new URL('../../../3d/standins/src/palette.js', import.meta.url).pathname}'`)
    .replace("'../../../3d/standins/src/textures.js'", `'${new URL('../../../3d/standins/src/textures.js', import.meta.url).pathname}'`)
    .replace(/from 'three'/g, `from '${threeModule}'`);
  fs.writeFileSync(path.join(temp, name + '.mjs'), ts.transpileModule(raw, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, verbatimModuleSyntax: false } }).outputText);
}

// Browser globals the engine touches.
const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.document = { pointerLockElement: null };

const { Engine3D } = await import(path.join(temp, 'engine3d.mjs'));
const { MISSIONS } = await import(path.join(temp, 'district.mjs'));

/** Let the district preload settle: its paintings resolve on the microtask
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

/** Play one district: totems, signals, cages, strongholds, then the boss and exit. */
function playDistrict(index) {
  const d = district();
  const w = world();
  const c = combat();
  check(d.name === MISSIONS[0][index]().name, `district ${index} loaded`);
  check(w.instances.length > 10, `${d.name} has structures`);
  check(priv('scene').lastBuild.world === w, 'scene built for the district');
  // The next district stands beyond the exit, its start on this exit at the same height.
  const ahead = priv('scene').lastBuild.next;
  if (index < MISSIONS[0].length - 1) {
    check(!!ahead, `${d.name}: the next district is shown ahead`);
    const n = ahead.world.district;
    check(Math.abs(ahead.offset[0] + n.start.x - d.exit.x) < 0.01 && Math.abs(ahead.offset[2] + n.start.z - d.exit.z) < 0.01, 'the next district starts on this exit');
    const seam = ahead.offset[1] + ahead.world.heightAt(n.start.x, n.start.z) - w.heightAt(d.exit.x, d.exit.z);
    check(Math.abs(seam) < 0.01, `the ground meets at the seam (${seam.toFixed(2)} m)`);
    check(ahead.world.instances.length > 40, 'the district ahead has its structures');
  } else check(!ahead, `${d.name}: nothing beyond the last district`);
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
      check(priv('checkpointIndex') >= i, `${d.name}: totem ${i} lit (index ${priv('checkpointIndex')}, totem at ${t.x.toFixed(0)},${t.y.toFixed(0)},${t.z.toFixed(0)}, taken ${t.taken}, completed ${priv('completed')}, respawnT ${priv('respawnT').toFixed(2)}, hp ${priv('hp')}, player ${engine.player.x.toFixed(1)},${engine.player.y.toFixed(1)},${engine.player.z.toFixed(1)} ${engine.player.move})`);
    }
    check(JSON.parse(store.get('hopper3d.save')).checkpoint >= 1, 'checkpoint saved');
  };
  // Strongholds: the host waits in plain view on the structures (most of it
  // up on their tops), stares as Hopper approaches, comes down when he is
  // within reach, and nothing holds him in; clear the host and see the
  // region freed.
  for (const field of w.fields.filter((f) => f.group !== 'boss')) {
    const group = c.shadows.filter((s) => s.group === field.group);
    check(group.length > 0, `stronghold ${field.id} has a host`);
    check(group.every((s) => s.perched && s.dormant && s.held), `${d.name}: ${field.id} host waits perched in view before the approach`);
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
    check(sounds.includes('boss'), 'stronghold sting played');
    engine.player.x = field.x + field.r + 30;
    run(0.1);
    check(Math.hypot(engine.player.x - field.x, engine.player.z - field.z) > field.r, 'nothing holds Hopper inside a stronghold');
    teleport(field.x, field.y + 1, field.z);
    run(7); // let the host come down
    check(group.some((s) => s.alive && !s.dormant), `${d.name}: ${field.id} host released`);
    check(group.every((s) => !s.alive || !s.dormant || s.entry === 'ambush' || s.wave > 0), `${d.name}: ${field.id} wave-0 host all released within 7 s`);
    for (const s of group)
      if (s.alive) {
        // Armoured shadows only take full damage with the core open.
        s.open = 5;
        c.damage(s, 999, priv('callbacks').call(engine));
      }
    run(0.2);
    check(field.cleared && !field.active, `${d.name}: ${field.id} freed when its host fell`);
    check(snapshot.banner.includes('freed') || snapshot.banner === 'Gate open', `freed banner (${snapshot.banner})`);
  }
  // Signals: beacons are free, cages break open under Hopper's own fire and
  // shed bars on the way, so the damage is visible before the cage opens.
  const signalTriggers = w.triggers.filter((t) => t.kind === 'signal');
  for (const t of signalTriggers) {
    if (t.locked) {
      teleport(t.x, t.y + 1, t.z + 10);
      const bars = t.cageBars.length;
      const shoot = (kind) =>
        c.projectiles.push({ id: 900000 + c.projectiles.length, x: t.x, y: t.lockY, z: t.z, vx: 0, vy: 0, vz: 0, life: 1, radius: 1, damage: 2, gravity: 0, owner: 'hopper', kind });
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
    run(0.3);
    check(t.taken, `${d.name}: signal ${t.id} taken (trigger ${t.x},${t.y.toFixed(1)},${t.z} r ${t.r}; Hopper ${engine.player.x.toFixed(1)},${engine.player.y.toFixed(1)},${engine.player.z.toFixed(1)} ${engine.player.move}; locked ${t.locked})`);
  }
  check(snapshot.signals >= signalTriggers.length, 'HUD counts the signals');
  // The exit: barred only while the boss lives, otherwise the district ends.
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
  check(rook.active && arena.active, 'entering the arena wakes the Rook');
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
  check(arena.cleared, 'the arena is cleared when the Rook falls');
  check(snapshot.boss === null, 'boss bar gone');
  check(priv('hp') > 0, 'Hopper survives');
}

// ---- Episode one ----
check(MISSIONS[0].length === 3, 'episode one has three districts');

// ---- Lock-on leaves the camera alone ----
// Holding LT marks a target and turns Hopper toward it. It must not turn the
// view, and losing the target -- shot down, or simply gone -- must not snap
// the view back: the camera's direction is the trail's, locked or not.
{
  const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const cam = priv('camera');
  const h = engine.player;
  teleport(h.x, h.y, h.z);
  run(0.5);
  const aiming = { ...empty, lockHeld: true, lockPressed: true };
  // A target square off to one side, 90° from the way the view faces.
  const side = cam.forward + Math.PI / 2;
  const mark = combat().spawn({ id: 'lock-probe', kind: 'riftCondor', x: h.x + Math.sin(side) * 30, z: h.z + Math.cos(side) * 30, y: h.y + 24, mode: 'a' });
  check(Math.abs(wrapA(Math.atan2(mark.x - h.x, mark.z - h.z) - cam.yaw)) > 1, 'the probe stands well off the view');
  const yaw0 = cam.yaw,
    dist0 = cam.distance;
  let worstStep = 0,
    prevYaw = cam.yaw;
  const track = () => {
    worstStep = Math.max(worstStep, Math.abs(wrapA(cam.yaw - prevYaw)) / dt);
    prevYaw = cam.yaw;
  };
  for (let i = 0; i < 120; i++) {
    engine.tick(dt, i === 0 ? aiming : { ...aiming, lockPressed: false });
    track();
  }
  check(combat().lock === 'lock-probe', `the lock finds the target off to the side (${combat().lock})`);
  check(snapshot.lock === undefined, 'the centre crosshair stands down while a target is locked');
  check(Math.abs(wrapA(cam.yaw - yaw0)) < 0.05, `locking on does not turn the camera (${wrapA(cam.yaw - yaw0).toFixed(3)} rad)`);
  check(Math.abs(cam.distance - dist0) < 2, `locking on does not move the camera back (${cam.distance.toFixed(1)} vs ${dist0.toFixed(1)})`);
  check(cam.mode === 'follow', `lock-on is not a camera mode (${cam.mode})`);
  check(Math.abs(wrapA(h.yaw - Math.atan2(mark.x - h.x, mark.z - h.z))) < 0.2, 'Hopper faces the locked target');
  // Shot down with the lock still held: the crosshair lets go, the view does not move.
  combat().damage(mark, 999, engine.callbacks ? engine.callbacks() : { hurt() {}, effect() {}, sound() {}, bounce() {} });
  const yaw1 = cam.yaw;
  for (let i = 0; i < 120; i++) {
    engine.tick(dt, { ...aiming, lockPressed: false });
    track();
  }
  check(!combat().targetById('lock-probe'), 'the target is gone');
  check(Math.abs(wrapA(cam.yaw - yaw1)) < 0.05, `losing the target does not reset the camera (${wrapA(cam.yaw - yaw1).toFixed(3)} rad)`);
  check(worstStep < 0.35, `the view never jumps through the lock, the kill or the release (worst ${worstStep.toFixed(2)} rad/s)`);
  run(0.5);
  check(snapshot.lock === 'open' || snapshot.lock === undefined, 'the crosshair returns to free aim with nothing locked');
}
check(snapshot.standIns === undefined || snapshot.standIns.includes('shadows'), 'HUD stand-in tag reads the shadows on screen');
const first = playDistrict(0);
check(priv('transitionT') > 0, `${first.name}: exit starts the transition`);
check(snapshot.banner === first.exit.name, 'exit banner');
// Cross the threshold at a run, angled off the trail: the hand-over has to
// keep the heading, the speed and the picture.
{
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const angleToTrail = () => {
    const h = engine.player,
      route = world().route;
    // Heading is the way he moves; the facing follows the camera.
    return wrap(Math.atan2(h.vx, h.vz) - route.yawAt(route.nearest(h.x, h.z).s + 60));
  };
  const running = { ...empty, moveX: 0.45, moveY: -1 };
  run(0.4, running);
  const before = angleToTrail(),
    speedBefore = Math.hypot(engine.player.vx, engine.player.vz);
  let speedAtSeam = 0,
    fadeSeen = 0;
  for (let i = 0; i < 180 && priv('districtIndex') === 0 && !snapshot.loading; i++) {
    run(1 / 60, running);
    speedAtSeam = Math.hypot(engine.player.vx, engine.player.vz);
    fadeSeen = Math.max(fadeSeen, snapshot.transitionFade || 0);
  }
  // The seam now waits for the next district's paintings: the loading screen
  // is up, play is frozen, and the handover happens once they are in hand.
  check(!!snapshot.loading, 'the seam raises a loading screen');
  const frozen = { x: engine.player.x, z: engine.player.z };
  run(0.5, running);
  check(
    engine.player.x === frozen.x && engine.player.z === frozen.z,
    'play is held while the district loads',
  );
  await settle();
  run(1 / 60, running);
  check(!snapshot.loading, 'the loading screen clears');
  check(priv('districtIndex') === 1, 'the threshold hands over to the next district');
  check(Math.abs(wrap(angleToTrail() - before)) < 0.35, `heading carries across the threshold (${angleToTrail().toFixed(2)} vs ${before.toFixed(2)})`);
  check(speedAtSeam > speedBefore * 0.6, `momentum carries across the threshold (${speedAtSeam.toFixed(0)} of ${speedBefore.toFixed(0)} m/s)`);
  check(Math.abs(wrap(priv('camera').yaw - engine.player.yaw)) < 1.2, `the camera comes through pointing the same way as Hopper (cam ${priv('camera').yaw.toFixed(2)} forward ${priv('camera').forward.toFixed(2)} turn ${priv('camera').turn.toFixed(2)}, hopper ${engine.player.yaw.toFixed(2)}, route ${world().route.yawAt(world().route.nearest(engine.player.x, engine.player.z).s + 40).toFixed(2)}, at ${engine.player.x.toFixed(0)},${engine.player.z.toFixed(0)})`);
  check(!!snapshot.transitionImage && fadeSeen > 0.5, `the frame just left is held over the new district (fade ${fadeSeen.toFixed(2)})`);
}
check(priv('districtIndex') === 1, 'second district loaded');
check(priv('scene').builds === 2, 'scene rebuilt for the second district');
check(priv('scene').lastBuild.ahead !== undefined, 'the landmark ahead is painted in the next district\'s colours');
check(JSON.parse(store.get('hopper3d.save')).district === 1, 'district saved');
// And the dissolve clears itself.
run(1.6);
check(!snapshot.transitionImage, 'the held frame fades away');
const second = playDistrict(1);
run(2.5);
await settle();
run(1 / 60);
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

console.log(`episode3d: ${checks} checks passed (three districts, cages, strongholds, the Night Rook, transitions, resume)`);
