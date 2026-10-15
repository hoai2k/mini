// Plays Aquarium in test/game.html with phone-sized seats sharing one tank:
//   - both seats see the same fish (the owner's starter tank);
//   - adding a fish from the picker on the non-owner seat puts it in the tank
//     for both seats;
//   - tapping the water drops flakes the owner's fish eat;
//   - a hungry piranha hunts and eats a guppy (a chomp event on both seats,
//     the guppy gone from both), while fed fish leave prey alone;
//   - dragging a fish with the mouse on the non-owner seat moves it there for
//     both seats; dropping one on the bin takes it out of the tank;
//   - with many fish most of them spend their time off screen, far more than
//     with a few, and the crowded tank fights;
//   - a third seat joining mid-game sees the same tank;
//   - the next seat runs the tank when the owner leaves;
//   - rookie bot moves add and feed without errors.
//   node chat/test/aquarium-play.mjs
// Pictures land in local/chat-shots/aquarium-*.png.
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { serve, launch } from './lib.mjs';

const chatDir = fileURLToPath(new URL('..', import.meta.url));
const outDir = fileURLToPath(new URL('../../local/chat-shots/', import.meta.url));
await mkdir(outDir, { recursive: true });

const server = await serve(chatDir);
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 3 * 402 + 30, height: 820 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/i.test(m.text())) errors.push(m.text()); });
await page.goto(`${server.url}/test/game.html?game=aquarium&n=3&hold=1&w=390&h=690&expr=0`);
await page.waitForFunction(() => window.ready === true && window.seats.slice(0, 2).every(s => s.gh.current?.instance?._view), null, { timeout: 20000 });

let failed = 0;
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failed++;
};
const wait = ms => page.waitForTimeout(ms);
const view = i => page.evaluate(i => window.seats[i].gh.current?.instance._view() ?? null, i);
const ids = v => v.fish.map(f => f.id).sort((a, b) => a - b).join(',');
const box = i => page.evaluate(i => {
  const r = window.seats[i].el.querySelector('canvas.g-canvas').getBoundingClientRect();
  return { x: r.left, y: r.top };
}, i);
const toScreen = (i, x, y) => page.evaluate(([i, x, y]) => window.seats[i].gh.current.instance._toScreen(x, y), [i, x, y]);
// Runs code against the owner's simulation (seat i).
const onTank = (i, fn, arg) => page.evaluate(([i, src, arg]) => {
  const tank = window.seats[i].gh.current.instance._tank();
  return new Function('tank', 'arg', src)(tank, arg);
}, [i, fn, arg]);

// --- the shared starter tank --------------------------------------------------
await page.waitForFunction(() => window.seats[1].gh.current.instance._view().fish.length > 5, null, { timeout: 8000 });
await wait(600);
let a = await view(0), b = await view(1);
check(a.owner && !b.owner, 'seat 1 owns the tank');
check(a.fish.length >= 10 && ids(a) === ids(b), `both seats see the same ${a.fish.length} starter fish`);
const near = (va, vb, tol) => va.fish.every(f => { const g = vb.fish.find(x => x.id === f.id); return g && Math.hypot(g.x - f.x, g.y - f.y) < tol; });
check(near(a, b, 6), 'and in the same places');
await page.screenshot({ path: `${outDir}aquarium-start.png` });

// --- adding a fish from the picker (non-owner) ---------------------------------
// Keep the hunters from eating while we set things up.
await onTank(0, 'for (const f of tank.fish) f.hunger = 0;');
const before = (await view(0)).fish.length;
await page.evaluate(() => window.seats[1].el.querySelector('.aq-add').click());
await wait(300);
check(await page.evaluate(() => !window.seats[1].el.querySelector('.aq-shelf').hidden), 'the picker opens');
const cardInfo = await page.evaluate(() => [...window.seats[1].el.querySelectorAll('.aq-card')].map(c => ({ sp: c.dataset.sp, text: c.textContent, minis: c.querySelectorAll('.row canvas').length })));
check(cardInfo.length === 10, `the picker shows ${cardInfo.length} species`);
const piranhaCard = cardInfo.find(c => c.sp === 'piranha');
check(/eats/.test(piranhaCard.text) && /fears/.test(piranhaCard.text) && piranhaCard.minis >= 6, 'each card shows who it eats and who it fears');
check(/nobody: it puffs up/.test(cardInfo.find(c => c.sp === 'puffer').text), 'the pufferfish card says nobody eats it');
await page.screenshot({ path: `${outDir}aquarium-picker.png` });
await page.evaluate(() => window.seats[1].el.querySelector('.aq-card[data-sp="shark"]').click());
await wait(700);
a = await view(0); b = await view(1);
check(a.fish.length === before + 1 && a.fish.some(f => f.sp === 'shark'), 'the shark added on seat 2 is in the owner\'s tank');
check(b.fish.some(f => f.sp === 'shark') && b.events[3] >= 1, 'and seat 2 sees it splash in');
await page.evaluate(() => window.seats[1].el.querySelector('.aq-close').click());
// Keep the shark busy elsewhere for now.
await onTank(0, 'for (const f of tank.fish) if (f.sp === "shark") { f.x = 150; f.tx = 150; f.retarget = 60; f.hunger = 0; }');

// --- feeding -------------------------------------------------------------------
await onTank(0, 'tank.flakes.length = 0; for (const f of tank.fish) f.hunger = 0.6;');
let bx = await box(1);
// An empty spot in the water (a tap on a fish would pick it up).
b = await view(1);
let spot = { x: 0, y: 25 };
for (const [x, y] of [[0, 25], [-20, 20], [20, 20], [-15, 40], [15, 40], [0, 12], [-25, 60], [25, 60]]) {
  if (b.fish.every(f => Math.hypot(f.x - x, f.y - y) > 14)) { spot = { x, y }; break; }
}
let p = await toScreen(1, spot.x, spot.y);
await page.mouse.click(bx.x + p.x, bx.y + p.y);
await wait(400);
a = await view(0);
check(a.flakes >= 4, `a tap on seat 2 drops flakes in the shared tank (${a.flakes})`);
await wait(6000);
const left = await onTank(0, 'return tank.flakes.length;');
check(left <= 1, `fish swim over to the flakes and eat them (${5 - left} of 5 eaten)`);

// --- a hungry piranha eats a guppy ------------------------------------------------
await onTank(0, `
  tank.flakes.length = 0;
  for (const f of tank.fish) { f.hunger = 0; f.held = null; if (['guppy', 'tetra', 'clown', 'betta', 'angel'].includes(f.sp)) { f.x = 160; f.y = 40; } }
  const g = tank.fish.find(f => f.sp === 'guppy');
  g.x = 10; g.y = 50; g.safe = 0;
  const p = tank.make('piranha', -8, 50);
  p.hunger = 1; p.safe = 0;
  window.__prey = g.id; window.__hunter = p.id;
`);
const preyId = await page.evaluate(() => window.__prey);
const ev0 = (await view(1)).events[1];
await page.waitForFunction(id => !window.seats[0].gh.current.instance._view().fish.some(f => f.id === id), preyId, { timeout: 8000 }).catch(() => {});
await wait(200);
await page.screenshot({ path: `${outDir}aquarium-chomp.png` });
await wait(500);
a = await view(0); b = await view(1);
check(!a.fish.some(f => f.id === preyId) && !b.fish.some(f => f.id === preyId), 'the hungry piranha ate the guppy (gone on both seats)');
check(b.events[1] > ev0, 'seat 2 got the chomp');
const hunterHunger = await onTank(0, 'return tank.byId(window.__hunter).hunger;');
check(hunterHunger < 0.5, `the piranha is full now (hunger ${hunterHunger.toFixed(2)})`);
// A fed piranha leaves the little ones alone.
await onTank(0, `
  const p = tank.byId(window.__hunter); p.hunger = 0; p.full = 0;
  const g = tank.fish.find(f => f.sp === 'tetra'); g.x = p.x + 4; g.y = p.y; g.safe = 0; window.__prey2 = g.id;
`);
await wait(2500);
check(await onTank(0, 'return !!tank.byId(window.__prey2);'), 'a fed piranha leaves a tetra right beside it alone');

// --- dragging a fish (non-owner) -----------------------------------------------------
await onTank(0, 'for (const f of tank.fish) f.hunger = 0; const c = tank.fish.find(f => f.sp === "catfish"); c.x = -10; c.y = 86; c.tx = -10; c.ty = 86; c.retarget = 30; window.__cat = c.id;');
await wait(800);
const catId = await page.evaluate(() => window.__cat);
b = await view(1);
const cat = b.fish.find(f => f.id === catId);
bx = await box(1);
p = await toScreen(1, cat.x, cat.y);
const to = await toScreen(1, 12, 30);
await page.mouse.move(bx.x + p.x, bx.y + p.y);
await page.mouse.down();
for (let k = 1; k <= 12; k++) {
  await page.mouse.move(bx.x + p.x + (to.x - p.x) * k / 12, bx.y + p.y + (to.y - p.y) * k / 12);
  await wait(40);
}
a = await view(0);
check(a.fish.find(f => f.id === catId)?.held === 'client2', 'the owner sees the catfish held by seat 2');
await page.screenshot({ path: `${outDir}aquarium-drag.png` });
await page.mouse.up();
await wait(400);
a = await view(0);
const moved = a.fish.find(f => f.id === catId);
check(moved && Math.hypot(moved.x - 12, moved.y - 30) < 6, `the catfish was dropped where seat 2 let go (${moved?.x.toFixed(1)}, ${moved?.y.toFixed(1)})`);
await wait(3000);
a = await view(0);
check(a.fish.find(f => f.id === catId).y > 50, `and it sinks back toward the floor, as catfish do (y ${a.fish.find(f => f.id === catId).y.toFixed(0)})`);

// --- the bin ------------------------------------------------------------------
await onTank(0, 'const f = tank.fish.find(f => f.sp === "puffer"); Object.assign(f, { x: -5, y: 45, tx: -5, ty: 45, retarget: 60, hunger: 0 }); tank.attract = null;');
await wait(700);
b = await view(1);
const victim = b.fish.find(f => f.sp === 'puffer');
p = await toScreen(1, victim.x, victim.y);
const bin = b.bin;
await page.mouse.move(bx.x + p.x, bx.y + p.y);
await page.mouse.down();
for (let k = 1; k <= 10; k++) {
  await page.mouse.move(bx.x + p.x + (bin.x + bin.w / 2 - p.x) * k / 10, bx.y + p.y + (bin.y + bin.h / 2 - p.y) * k / 10);
  await wait(40);
}
await page.screenshot({ path: `${outDir}aquarium-bin.png` });
await page.mouse.up();
await wait(600);
a = await view(0); b = await view(1);
check(!a.fish.some(f => f.id === victim.id) && !b.fish.some(f => f.id === victim.id), 'a fish dropped on the bin is gone from the tank');
check(b.events[4] >= 1, 'with a bin event');

// --- many fish: more time off screen, more fights -----------------------------------
const offShare = async (secs) => {
  let off = 0, all = 0;
  for (let t = 0; t < secs * 4; t++) {
    const v = await view(1);
    for (const f of v.fish) { all++; if (Math.abs(f.x) > v.halfW) off++; }
    await wait(250);
  }
  return off / Math.max(1, all);
};
await onTank(0, `for (const f of [...tank.fish]) if (f.sp !== "guppy" && f.sp !== "tetra") tank.bin(f.id);
  tank.groups = {}; for (const f of tank.fish) { f.x = Math.random() * 60 - 30; f.retarget = 0; }`);
const fewShare = await offShare(8);
const fightsBefore = (await view(0)).events[2];
await onTank(0, `
  const list = ['guppy', 'tetra', 'clown', 'betta', 'angel', 'puffer', 'catfish', 'piranha', 'lionfish', 'shark'];
  let i = 0;
  while (tank.fish.length < 40) { const f = tank.add(list[i++ % list.length]); f.safe = 0; }
  for (const f of tank.fish) { f.retarget = 0; f.hunger = 0; }
`);
await wait(2500);
await page.screenshot({ path: `${outDir}aquarium-crowded.png` });
await wait(8000);
const manyShare = await offShare(12);
a = await view(0);
console.log(`     off screen: ${(fewShare * 100).toFixed(0)}% of the time with a few fish, ${(manyShare * 100).toFixed(0)}% with ${a.fish.length}`);
check(manyShare > fewShare + 0.2 && manyShare > 0.45, 'with many fish each spends far more time off screen');
const onScreen = (await view(1)).fish.filter(f => Math.abs(f.x) < 32).length;
check(onScreen <= 22, `the phone view stays readable (${onScreen} fish on it out of ${a.fish.length})`);
check(a.crowd > 0.4 && a.events[2] - fightsBefore >= 3, `the crowded tank gets grumpy: ${a.events[2] - fightsBefore} scuffles`);

// --- a mid-game joiner sees the same tank ---------------------------------------------
await page.evaluate(() => window.joinSeat(2));
await page.waitForFunction(() => window.seats[2].gh.current?.instance?._view().fish.length > 0, null, { timeout: 8000 });
await wait(800);
const [a2, c2] = await page.evaluate(() => [0, 2].map(i => window.seats[i].gh.current.instance._view()));
check(ids(a2) === ids(c2), `the late joiner sees the same ${c2.fish.length} fish`);
check(near(a2, c2, 8), 'in the same places');
await page.screenshot({ path: `${outDir}aquarium-late.png` });

// --- the owner leaves: seat 2 runs the tank ------------------------------------------------
await onTank(0, 'for (const f of tank.fish) f.hunger = 0;');
const count = (await view(1)).fish.length;
await page.evaluate(() => window.leaveSeat(0));
await wait(1500);
b = await view(1);
const c = await view(2);
check(b.owner && b.fish.length >= count - 3 && b.fish.length > 0, `seat 2 takes over the tank (${b.fish.length} fish)`);
const pos1 = JSON.stringify(b.fish.map(f => [Math.round(f.x), Math.round(f.y)]));
await wait(1000);
const b2 = await view(1);
check(JSON.stringify(b2.fish.map(f => [Math.round(f.x), Math.round(f.y)])) !== pos1, 'and the fish keep swimming');
check(await page.waitForFunction(() => {
  const [x, y] = [1, 2].map(i => window.seats[i].gh.current.instance._view().fish.map(f => f.id).sort().join());
  return x === y;
}, null, { timeout: 3000 }).then(() => true, () => false), 'seat 3 follows the new owner');
await page.evaluate(() => window.seats[1].el.querySelector('.aq-close')?.click());

// --- a controller: X opens the picker, the stick picks, A adds; A on the water feeds ----------
await onTank(1, 'for (const f of tank.fish) f.hunger = 0;');
const addsBefore = (await view(1)).events[3];
const flBefore = (await view(1)).flakes;
await page.evaluate(async () => {
  const seat = window.seats[1];
  seat.pad({ xBtn: true });
  await new Promise(r => setTimeout(r, 50));
  seat.pad({ x: 1 });
  seat.pad({});
  window.__picked = seat.el.querySelector('.aq-card.sel')?.dataset.sp;
  window.__pickedBefore = seat.gh.current.instance._view().fish.filter(f => f.sp === window.__picked).length;
  seat.pad({ a: true });
  seat.pad({ xBtn: true });
  await new Promise(r => setTimeout(r, 50));
  for (let i = 0; i < 20; i++) { seat.pad({ y: -1 }); await new Promise(r => setTimeout(r, 30)); }
  seat.pad({});
});
await wait(500);
b = await view(1);
const picked = await page.evaluate(() => [window.__picked, window.__pickedBefore]);
check(picked[0] && b.events[3] === addsBefore + 1 && b.fish.filter(f => f.sp === picked[0]).length === picked[1] + 1, `a controller adds the fish it picked (${picked[0]})`);
await page.evaluate(() => window.seats[1].pad({ a: true }));
await wait(300);
check((await view(1)).flakes > flBefore || (await view(1)).fish.some(f => f.held), 'and A feeds (or picks up a fish) at the cursor');

// --- rookie bots --------------------------------------------------------------------------
await onTank(1, 'for (const f of [...tank.fish].slice(6)) tank.bin(f.id);');
await page.evaluate(async () => {
  const { driveRookie } = await import('../js/rookie.js');
  for (let step = 1; step <= 40; step++) {
    for (const i of [1, 2]) if (window.seats[i].gh.current) driveRookie(window.seats[i].gh.current, step);
    await new Promise(r => setTimeout(r, 120));
  }
});
await wait(800);
b = await view(1);
check(b.events[3] >= 2 && b.fish.length > 6, `rookie bots add fish (${b.fish.length} now)`);

// --- landscape -----------------------------------------------------------------------------
await page.setViewportSize({ width: 1200, height: 520 });
await page.goto(`${server.url}/test/game.html?game=aquarium&n=1&w=1100&h=440&expr=0`);
await page.waitForFunction(() => window.ready === true && window.seats[0]?.gh.current?.instance?._view().fish.length > 5, null, { timeout: 8000 });
await wait(2500);
await page.screenshot({ path: `${outDir}aquarium-wide.png` });

check(!errors.length, `no page errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
await browser.close();
server.close();
if (failed) { console.log(`${failed} failed`); process.exit(1); }
console.log('all passed');
