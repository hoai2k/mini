// Play checks for the mite world (headless Chromium, software WebGL; a few minutes), the owner's 2026-11-04
// round: creatures push each other, nothing vanishes, one X press eats, the jump attack, and the corridor.
//
//   node micro/game/mite/play-check.mjs            # all
//   node micro/game/mite/play-check.mjs push       # or: eat, jump, vanish, walls
//
// push: walking into the second box mite pushes it along and is pushed back (no overlap left between any two
// bodies), and against the predatory mite, ~6 times its mass, the player takes ~6 times the push it does.
// eat: one X on a springtail grabs it and eating starts, and it finishes with no more presses (eatSeconds);
// a second press shortens it (eatPressShare); walking off lets it wriggle free.
// jump: a bite from the ground at the predatory mite glances off (its body stands too high; the hint shows),
// while X in a jump's landing window (just before touchdown, or up to 0.15 s after) hits it: a flash, a recoil,
// and its interest drops; a few such hits drive it off; X 0.3 s after landing is an ordinary bite again.
// vanish: walking up the corridor zooming out and in, no springtail in view disappears between frames, and a
// group sent into the moss dives (crumbs) instead of vanishing.
// walls: walking at full tilt from the start south, and to each side along a line clear of the thickets, and
// north from the water, meets each wall about its game_config.js seconds out.
// Screenshots go to $SHOTS (default: the system temp folder).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..'); // micro/ (text_config.js and game_config.js are at its top)
const shots = process.env.SHOTS || tmpdir();
const which = process.argv[2] || 'all';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg' };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = join(root, p);
  try { if (!file.startsWith(root) || !(await stat(file)).isFile()) throw 0; res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }); res.end(await readFile(file)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let failed = 0;
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) failed++; };

async function page() {
  const tab = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  tab.on('console', (m) => m.type() === 'error' && !/favicon/.test(m.text()) && errors.push(m.text()));
  tab.on('pageerror', (e) => errors.push(String(e)));
  await tab.goto(base + 'game/mite/', { waitUntil: 'load' });
  await tab.waitForFunction(() => window.__micro && window.__micro.frames > 3, null, { timeout: 120000 });
  // (Tab hides the help panel, read while the page runs; then the checks step it themselves)
  await tab.keyboard.press('Tab'); await tab.waitForTimeout(400);
  await tab.evaluate(() => { const m = window.__micro; m.paused = true; m.pace.mode = 'Never'; });
  return { tab, errors };
}
const shot = async (tab, name) => { await tab.evaluate(() => { const m = window.__micro; m.settle(3); m.render(); }); await tab.screenshot({ path: join(shots, `mite-${name}.png`) }); };

if (which === 'all' || which === 'push') {
  const { tab, errors } = await page();
  const r = await tab.evaluate(() => {
    const m = window.__micro, dt = 1 / 30;
    const out = {};
    // into the second box mite (the same size): it is pushed along, the player slowed
    m.resetLevel(); m.steps(3, 1 / 30); // (the director lays the default path out on its first frame)
    const n = m.npc.center.clone();
    m.npc.place(n.x, n.z, 0);
    const from = { x: n.x - 600, z: n.z };
    m.teleport(0, from.x, from.z, 0);
    m.settle(2);
    let worst = 0, sumMe = 0, sumIt = 0, frames = 0;
    const n0 = m.npc.center.clone();
    for (let i = 0; i < 75; i++) {
      m.testStep(dt, { x: 1, y: 0 }, false, 600);
      worst = Math.max(worst, m.push.overlap());
      for (const b of m.push.bodies()) { if (b.id === 'p0') sumMe += Math.hypot(b.dx, b.dz); if (b.id === 'npc') { sumIt += Math.hypot(b.dx, b.dz); if (Math.hypot(b.dx, b.dz) > 0) frames++; } }
      if (i === 40) window.__shotNow = true;
    }
    out.npc = { moved: Math.round(m.npc.center.distanceTo(n0)), pushMe: Math.round(sumMe), pushIt: Math.round(sumIt), frames, worst: +worst.toFixed(2), gap: Math.round(m.mite.center.distanceTo(m.npc.center)) };
    // into the predatory mite (about six times the mass), calm and wandering
    m.setFoe(0); m.pace.mode = 'Never';
    const c = m.mite.center;
    m.pred.place(c.x + 700, c.z, Math.PI);
    m.steps(2, dt);
    let me = 0, it = 0; worst = 0;
    for (let i = 0; i < 60; i++) {
      m.testStep(dt, { x: 1, y: 0 }, false, 878);
      worst = Math.max(worst, m.push.overlap());
      for (const b of m.push.bodies()) { if (b.id === 'p0') me += Math.hypot(b.dx, b.dz); if (b.id === 'pred') it += Math.hypot(b.dx, b.dz); }
    }
    out.pred = { pushMe: Math.round(me), pushIt: Math.round(it), ratio: +(me / Math.max(1, it)).toFixed(2), worst: +worst.toFixed(2), masses: m.push.masses() };
    return out;
  });
  console.log('push', JSON.stringify(r));
  check(r.npc.frames > 10 && r.npc.pushIt > 100, `walking into another box mite pushes it (${r.npc.pushIt} µm of push over ${r.npc.frames} frames; it moved ${r.npc.moved} µm)`);
  // (the same mass: each takes a like share; it also walks about and shies on its own, so not exactly half)
  check(r.npc.pushMe > 50 && r.npc.pushMe / r.npc.pushIt > 0.4 && r.npc.pushMe / r.npc.pushIt < 2.5, `and the player is pushed back about as much, the same mass (${r.npc.pushMe} against ${r.npc.pushIt} µm)`);
  check(r.npc.worst < 6, `no overlap left between bodies after each step (deepest ${r.npc.worst} µm, on bodies ~100 µm across)`);
  check(r.pred.pushIt > 0 && r.pred.ratio > 4 && r.pred.ratio < 8, `against the predatory mite (mass ${r.pred.masses.pred}) the player takes ~6x the push (${r.pred.pushMe} against ${r.pred.pushIt} µm: ${r.pred.ratio}x)`);
  check(r.pred.worst < 6, `no overlap with the predator (deepest ${r.pred.worst} µm)`);
  // a still of a push: the player leaning into the second box mite
  await tab.evaluate(() => { const m = window.__micro; m.pace.mode = 'Never'; m.calm(); m.pred.place(-30000, -30000, 0); const n = m.npc.center.clone(); m.teleport(0, n.x - 330, n.z + 40, 0); m.rig.hfw = 900; for (let i = 0; i < 20; i++) m.testStep(1 / 30, { x: 1, y: -0.1 }, false, 600); });
  await shot(tab, 'push');
  check(!errors.length, `no page errors${errors.length ? ': ' + errors.join('; ') : ''}`);
  await tab.close();
}

if (which === 'all' || which === 'eat') {
  const { tab, errors } = await page();
  const r = await tab.evaluate(() => {
    const m = window.__micro, dt = 1 / 30;
    m.resetLevel(); m.steps(3, 1 / 30); // (the director lays the default path out on its first frame)
    /** Walk to a springtail of a group near (x, z) and grab it with one X; returns the act or null. */
    function grabOne(x, z) {
      m.teleport(0, x, z, 0); m.settle(2); m.steps(3, dt);
      const L = m.life.ambient.live.filter((b) => !b.held && !b.stunned && !(b.dive > 0));
      L.sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z));
      for (const b of L.slice(0, 6)) {
        const a = Math.atan2(b.z - z, b.x - x) + 0.4;
        const cx = b.x - Math.cos(a) * 230, cz = b.z - Math.sin(a) * 230;
        m.teleport(0, cx, cz, Math.atan2(-(b.z - cz), b.x - cx));
        const act = m.x(0);
        if (act === 'devour') return act;
      }
      return null;
    }
    const W = m.walls();
    const spot = (k) => { const s = m.life.ambient.sitesNear(W.ux * 3000 * (k + 1), W.uz * 3000 * (k + 1), 3000)[0]; return s; };
    const out = {};
    for (const [name, presses] of [['none', []], ['one more', [0.5]], ['four more', [0.3, 0.6, 0.9, 1.2]]]) {
      const s = spot(Object.keys(out).length);
      const act = grabOne(s.x, s.z);
      let t = 0, done = null;
      const me0 = m.me(0);
      const pend = [...presses];
      for (; t < 8; t += dt) {
        if (pend.length && t >= pend[0]) { pend.shift(); m.x(0); }
        m.testStep(dt, null, false);
        if (name === 'one more' && t > 1.0 && t < 1.0 + dt) window.__eatShot = true;
        if (!m.me(0).act) { done = t; break; }
      }
      out[name] = { act, bugsBefore: me0.bugs, bugs: m.me(0).bugs, seconds: done === null ? null : +(done + dt).toFixed(2), chomps: m.me(0).lastMeal && m.me(0).lastMeal.chomps };
    }
    // walking off with it: it wriggles free
    {
      const s = spot(3);
      const act = grabOne(s.x, s.z);
      const e0 = m.me(0).escapes;
      let t = 0;
      for (; t < 4 && m.me(0).act === 'devour'; t += dt) m.testStep(dt, { x: -W.ux, y: -W.uz }, false, 878);
      out.walkOff = { act, escaped: m.me(0).escapes - e0, after: +t.toFixed(2), act2: m.me(0).act };
    }
    out.conf = m.fightConf;
    return out;
  }).catch((e) => ({ error: String(e) }));
  console.log('eat', JSON.stringify(r));
  if (r.error) { check(false, r.error); } else {
    const E = r.conf.EAT_SEC;
    check(r.none.act === 'devour', 'one X on a springtail grabs it and eating starts');
    check(r.none.seconds !== null && Math.abs(r.none.seconds - E) < 0.2 && r.none.bugs === r.none.bugsBefore + 1, `with no more presses it is still eaten, in ${r.none.seconds} s (eatSeconds ${E})`);
    check(r['one more'].seconds !== null && r['one more'].seconds < r.none.seconds - 0.4, `a second press shortens it (${r['one more'].seconds} s)`);
    check(r['four more'].seconds !== null && r['four more'].seconds < r['one more'].seconds, `more presses, faster still (${r['four more'].seconds} s, ${r['four more'].chomps} chomps)`);
    check(r.walkOff.act === 'devour' && r.walkOff.escaped === 1 && !r.walkOff.act2, `walking off lets it wriggle free (after ${r.walkOff.after} s)`);
  }
  // a still of the one-press eat, seen from the front and from behind
  await tab.evaluate(() => {
    const m = window.__micro, dt = 1 / 30, W = m.walls();
    const s = m.life.ambient.sitesNear(W.ux * 9000, W.uz * 9000, 3000)[0];
    m.teleport(0, s.x, s.z, 0); m.settle(2); m.steps(3, dt);
    const L = m.life.ambient.live.filter((b) => !b.held && !(b.dive > 0));
    for (const b of L) { const a = Math.atan2(-W.pz, -W.px) - 0.35; const cx = b.x - Math.cos(a) * 230, cz = b.z - Math.sin(a) * 230; m.teleport(0, cx, cz, Math.atan2(-(b.z - cz), b.x - cx)); if (m.x(0) === 'devour') break; }
    m.rig.hfw = 850;
    for (let i = 0; i < 30; i++) m.testStep(dt, null, false);
  });
  await shot(tab, 'eat');
  check(!errors.length, `no page errors${errors.length ? ': ' + errors.join('; ') : ''}`);
  await tab.close();
}

if (which === 'all' || which === 'jump') {
  const { tab, errors } = await page();
  const r = await tab.evaluate(() => {
    const m = window.__micro, dt = 1 / 30;
    const out = { rows: [] };
    m.resetLevel(); m.steps(3, 1 / 30); // (the director lays the default path out on its first frame)
    m.teleport(0, -2500, 5000, 0);
    // the predator in front, calm (so it does not strike back during the checks)
    const fwd = () => { const f = m.mite.st.fwd, l = Math.hypot(f.x, f.z) || 1; return { x: f.x / l, z: f.z / l }; };
    const front = (d = 520) => { m.setFoe(0); m.pace.mode = 'Never'; m.predAI.state = 'wander'; m.predAI.bored = 30; const c = m.mite.center, f = fwd(); m.pred.place(c.x + f.x * d, c.z + f.z * d, Math.atan2(f.z, -f.x)); m.steps(1, dt); };
    // 1. a bite from the ground: it glances off its legs
    front(520);
    const i0 = m.fight.interest, th0 = m.fightLog.tooHigh;
    const reach = m.reach();
    out.ground = { act: m.bite(0) };
    for (let i = 0; i < 24; i++) m.testStep(dt, null, false);
    out.ground.tooHigh = m.fightLog.tooHigh - th0; out.ground.interest = [+i0.toFixed(3), +m.fight.interest.toFixed(3)]; out.ground.reach = reach;
    // 2. X in the landing window, just before touchdown: a jump at it from 0.9 mm
    /** Jump at it from 0.9 mm and press X `when` ('before' touchdown, 'after' it, 'late': 0.3 s after); keep its interest unless fresh. */
    const jumpAtIt = (when, fresh = true) => {
      if (fresh) { m.fight.reset(); front(900); }
      else { const c = m.mite.center, f = fwd(); m.pred.place(c.x + f.x * 900, c.z + f.z * 900, Math.atan2(f.z, -f.x)); m.predAI.state = 'wander'; m.predAI.bored = 30; m.steps(1, dt); }
      const p = m.pred.center;
      m.jumpAt(0, p.x, p.z);
      const fl0 = m.flashes, h0 = m.me(0).jumpHits, i1 = m.fight.interest, land0 = m.me(0).landT;
      let pressed = false, t = 0, landed = null, predAfter = null, belly = [];
      for (; t < 3; t += dt) {
        const me = m.me(0);
        if (!pressed && when === 'before' && me.mode === 'air' && me.timeToLand <= 0.2) { m.x(0); pressed = 'in the air, ' + me.timeToLand.toFixed(2) + ' s before touchdown'; }
        m.testStep(dt, null, false);
        const me2 = m.me(0);
        belly.push(m.reach().belly);
        if (predAfter === null && me2.jumpHits > h0) predAfter = m.predAI.state;
        if (landed === null && (me2.landT !== land0 && me2.landT !== null || (me2.lastImpact && me2.lastImpact.t > m.time - dt * 1.5))) landed = t;
        if (!pressed && when === 'after' && landed !== null && t - landed >= 0.09) { m.x(0); pressed = (t - landed).toFixed(2) + ' s after touchdown'; }
        if (!pressed && when === 'late' && landed !== null && t - landed >= 0.3) { pressed = (t - landed).toFixed(2) + ' s after touchdown'; out.lateAct = m.x(0); }
        if (pressed && landed !== null && t > landed + 0.6) break;
      }
      return { when, pressed, hit: m.me(0).jumpHits - h0, flash: m.flashes - fl0, interest: [+i1.toFixed(3), +m.fight.interest.toFixed(3)], predAfter, impact: m.me(0).lastImpact, belly: [Math.min(...belly), Math.max(...belly)] };
    };
    out.rows.push(jumpAtIt('before'));
    out.rows.push(jumpAtIt('after'));
    out.rows.push(jumpAtIt('late'));
    // 3. a few jump attacks drive it off (its interest kept from one to the next)
    m.fight.reset(); front(900);
    const r0 = m.fightLog.retreats;
    let n = 0;
    for (; n < 6 && m.fightLog.retreats === r0; n++) { jumpAtIt('before', false); for (let t = 0; t < 0.5; t += dt) m.testStep(dt, null, false); }
    out.driveOff = { attacks: n, retreated: m.fightLog.retreats > r0, state: m.predAI.state };
    out.conf = m.fightConf;
    return out;
  }).catch((e) => ({ error: String(e) }));
  console.log('jump', JSON.stringify(r));
  if (r.error) check(false, r.error); else {
    check(r.ground.act === 'fight' && r.ground.tooHigh === 1 && r.ground.interest[1] >= r.ground.interest[0] - 0.08, `a bite from the ground at the predator glances off (its belly ${r.ground.reach.belly} µm up, a bite reaching ${r.ground.reach.groundReach} µm; interest ${r.ground.interest.join(' -> ')})`);
    const [b, a, l] = r.rows;
    check(b.hit === 1 && b.flash === 1 && b.interest[1] <= b.interest[0] - r.conf.JA_INTEREST + 0.02, `X just before touchdown (${b.pressed}): a jump attack hit, a flash, interest ${b.interest.join(' -> ')}`);
    check(a.hit === 1 && a.interest[1] < a.interest[0] - 0.3, `X just after touchdown (${a.pressed}): a hit too (interest ${a.interest.join(' -> ')})`);
    check(l.hit === 0 && r.lateAct !== 'jstrike', `X 0.3 s after touchdown: no jump attack (${r.lateAct})`);
    check(['recoil', 'retreat'].includes(b.predAfter), `the predator recoils (${b.predAfter}; its belly ${b.belly.join('-')} µm up meanwhile)`);
    check(r.driveOff.retreated && r.driveOff.attacks <= 3, `a few jump attacks drive it off (${r.driveOff.attacks})`);
  }
  // a still of a jump attack coming down on the predator
  await tab.evaluate(() => {
    const m = window.__micro, dt = 1 / 30;
    m.fight.reset(); m.setFoe(0); m.pace.mode = 'Never'; m.predAI.state = 'wander'; m.predAI.bored = 30;
    const c = m.mite.center, fw = m.mite.st.fwd, l = Math.hypot(fw.x, fw.z) || 1, f = { x: fw.x / l, z: fw.z / l };
    m.pred.place(c.x + f.x * 900, c.z + f.z * 900, Math.atan2(f.z, -f.x)); m.steps(1, dt);
    const p = m.pred.center; m.jumpAt(0, p.x, p.z); m.rig.hfw = 1300;
    for (let t = 0; t < 2; t += dt) { const me = m.me(0); if (me.mode === 'air' && me.timeToLand <= 0.25) { m.x(0); m.testStep(dt, null, false); m.testStep(dt, null, false); break; } m.testStep(dt, null, false); }
  });
  await shot(tab, 'jump-attack');
  check(!errors.length, `no page errors${errors.length ? ': ' + errors.join('; ') : ''}`);
  await tab.close();
}

if (which === 'all' || which === 'vanish') {
  const { tab, errors } = await page();
  const r = await tab.evaluate(() => {
    const m = window.__micro, dt = 1 / 30, W = m.walls();
    m.resetLevel(); m.steps(3, 1 / 30); // (the director lays the default path out on its first frame)
    let prev = new Map(), inView = 0, popped = [], fastest = 0;
    for (let i = 0; i < 900; i++) {
      // up the corridor, weaving, zooming out to 4.2 mm and back
      const t = i * dt;
      m.rig.hfw = 1600 + 1300 * (0.5 - 0.5 * Math.cos(t * 0.35));
      const a = Math.sin(t * 0.3) * 0.7;
      m.testStep(dt, { x: W.ux * Math.cos(a) - W.uz * Math.sin(a), y: W.uz * Math.cos(a) + W.ux * Math.sin(a) }, false, 878);
      const now = new Map(m.life.ambient.live.map((b) => [b.key, b]));
      for (const [k, b] of prev) {
        if (!m.inSight(b.x, b.z, 0)) continue;
        inView++;
        const n = now.get(k);
        if (!n) { if (!(b.dive > 0.9) && !b.held) popped.push({ k, t: +t.toFixed(2) }); continue; }
        if (!n.held && !b.held) fastest = Math.max(fastest, Math.hypot(n.x - b.x, n.z - b.z) / dt);
      }
      prev = now;
    }
    const st = m.life.ambient.stats;
    return { inView, popped: popped.slice(0, 10), nPopped: popped.length, fastest: Math.round(fastest), maxv: m.life.ambient.MAXV, dives: st.dives, rises: st.rises, capped: st.capped, at: m.walls() };
  });
  console.log('vanish', JSON.stringify(r));
  check(r.inView > 3000 && r.nPopped === 0, `walking ${(r.at.a / 1000).toFixed(1)} mm up the corridor, zooming: no springtail in view vanished (${r.inView} springtail-frames in view; ${r.dives} dives, ${r.rises} climbs out)`);
  check(r.fastest <= r.maxv + 70, `none jumped (fastest ${r.fastest} µm/s)`);
  // a still of a group diving into the moss (crumbs), and one of a grabbed one's group leaping away
  const group = () => tab.evaluate(() => {
    // the group most in view, not shied by the mite
    const m = window.__micro, A = m.life.ambient;
    let best = null, bn = 0;
    for (const S of A.shown.values()) {
      const L = A.live.filter((b) => b.key.startsWith(`${S.s.k}:`) && !b.held && !(b.dive > 0) && m.inSight(b.x, b.z, -150));
      if (L.length > bn) { bn = L.length; best = { k: S.s.k, n: L.length, keys: L.map((b) => b.key) }; }
    }
    return best;
  });
  // (stand 0.6 mm south of a group, so it is up the screen in view and not shied)
  const nearGroup = (along) => tab.evaluate((along) => { const m = window.__micro, W = m.walls(); const s = m.life.ambient.sitesNear(W.ux * along, W.uz * along, 2500)[0]; m.teleport(0, s.x - W.ux * 650, s.z - W.uz * 650, 0); m.rig.hfw = 1300; m.settle(4); m.steps(30, 1 / 30); m.settle(4); }, along);
  await nearGroup(6000);
  const g1 = await group();
  await tab.evaluate((k) => { const m = window.__micro; m.life.ambient.forceDive(k); for (let i = 0; i < 6; i++) m.testStep(1 / 30, null, false); }, g1 && g1.k);
  await shot(tab, 'springtails-dive');
  await nearGroup(15000);
  const g2 = await group();
  const grabbed = await tab.evaluate((keys) => {
    const m = window.__micro, W = m.walls();
    for (const key of keys || []) {
      const b = m.life.ambient.live.find((q) => q.key === key);
      if (!b) continue;
      const a = Math.atan2(-W.pz, -W.px); const cx = b.x - Math.cos(a) * 230, cz = b.z - Math.sin(a) * 230;
      m.teleport(0, cx, cz, Math.atan2(-(b.z - cz), b.x - cx));
      if (m.x(0) === 'devour') { for (let i = 0; i < 7; i++) m.testStep(1 / 30, null, false); return key; }
    }
    return null;
  }, g2 && g2.keys);
  console.log('stills', JSON.stringify({ dive: g1, leap: g2, grabbed }));
  await shot(tab, 'springtails-leap');
  check(!errors.length, `no page errors${errors.length ? ': ' + errors.join('; ') : ''}`);
  await tab.close();
}

if (which === 'all' || which === 'walls') {
  const { tab, errors } = await page();
  for (const name of ['south', 'west', 'east', 'north']) {
    const r = await tab.evaluate((name) => {
      const m = window.__micro, dt = 1 / 30;
      m.resetLevel(); m.steps(3, 1 / 30); // (the director lays the default path out on its first frame)
      const W = m.walls();
      const dirs = { south: [-W.ux, -W.uz], north: [W.ux, W.uz], west: [W.px, W.pz], east: [-W.px, -W.pz] };
      const [dx, dz] = dirs[name];
      const wallAt = name === 'south' ? -W.south : name === 'north' ? W.north : name === 'west' ? W.side : -W.side;
      const side = name === 'west' || name === 'east';
      // (to a side, along a line clear of the thickets, which drag a walker to half speed: from the start or the nearest such)
      const clear = (a0) => { for (let k = 0; k <= 40; k++) { const c = (k / 40) * wallAt, x = W.ux * a0 + W.px * c, z = W.uz * a0 + W.pz * c; if (m.plan.clusters.some((q) => Math.hypot(q.x - x, q.z - z) < q.r + 300)) return false; } return true; };
      let a0 = 0;
      if (side) for (const t of [0, -500, 500, -1000, 1000, -1500, 1500, -2000, 2000, -2500, 2500, -3000, 3000]) if (clear(t)) { a0 = t; break; }
      if (name === 'north') { m.steps(2, dt); const p = m.portal(); a0 = m.walls().portalAlong + 400; m.teleport(0, p.x + W.ux * 400, p.z + W.uz * 400, Math.atan2(-dz, dx)); }
      else m.teleport(0, W.ux * a0, W.uz * a0, Math.atan2(-dz, dx));
      m.settle(2);
      let t = 0, stopT = null, steer = 0;
      const hist = [];
      for (; t < 40; t += dt) {
        const ca = Math.cos(steer), sa = Math.sin(steer);
        m.testStep(dt, { x: dx * ca - dz * sa, y: dx * sa + dz * ca }, false, W.speed);
        const w = m.walls(), along = side ? w.c : w.a;
        hist.push(along);
        if (hist.length > 15) {
          const moved = Math.abs(along - hist[hist.length - 16]);
          if (moved < W.speed * 0.5 * 0.2) { if (Math.abs(wallAt - along) < 600) { stopT = t - 0.5; break; } steer = steer ? -steer * 1.2 : 0.6; }
          else if (moved > W.speed * 0.5 * 0.6) steer *= 0.9;
        }
      }
      const w = m.walls();
      m.rig.hfw = 3600;
      return { name, from: name === 'north' ? 'the water' : side ? `the route, ${a0} µm north of the start` : 'the start', seconds: stopT === null ? null : +stopT.toFixed(2), want: name === 'north' ? W.seconds.north : side ? W.seconds.side : W.seconds.south, end: { a: w.a, c: w.c }, wallAt };
    }, name);
    console.log('walls', JSON.stringify(r));
    // (north: the moss round the water is beaded, and a bead slows a mite to 40% while it climbs out)
    const tol = r.name === 'north' ? [0.6, 2.0] : [0.85, 1.12];
    check(r.seconds !== null && r.seconds >= r.want * tol[0] && r.seconds <= r.want * tol[1], `${r.name} wall reached from ${r.from} in ${r.seconds} s at full tilt (${r.want} s in game_config.js)`);
    await tab.evaluate(() => window.__micro.settle(20));
    await shot(tab, `wall-${r.name}`);
  }
  check(!errors.length, `no page errors${errors.length ? ': ' + errors.join('; ') : ''}`);
  await tab.close();
}

await browser.close();
server.close();
console.log(`screenshots in ${shots}`);
process.exit(failed ? 1 : 0);
