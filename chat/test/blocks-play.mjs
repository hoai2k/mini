// Plays Block Drop in test/game.html with two phone-sized seats, using real
// touches (through the DevTools protocol) as a player would, and checks:
//   - both seats play the same round from the same seed: the same pieces in
//     the same order;
//   - touch: dragging sideways moves the piece a cell at a time under the
//     finger, a tap turns it, a quick swipe up holds it, a flick down drops it;
//     the controller's D-pad moves it too;
//   - each seat sees the other's well live (packed rows and score);
//   - clearing two rows or more sends garbage: it waits beside the other
//     well and rises into it when that player next locks a piece;
//   - topping out ends the round, with the same winner shown on both seats;
//   - the next round starts by itself, and rookie bots (js/rookie.js) play it.
//   node chat/test/blocks-play.mjs
// Pictures land in local/chat-shots/blocks-*.png.
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { serve, launch } from './lib.mjs';

const chatDir = fileURLToPath(new URL('..', import.meta.url));
const outDir = fileURLToPath(new URL('../../local/chat-shots/', import.meta.url));
await mkdir(outDir, { recursive: true });

const server = await serve(chatDir);
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 2 * 402 + 30, height: 820 }, hasTouch: true });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => {
  if (m.type() === 'error' && !/Failed to load resource|mediapipe|vision_wasm|TensorFlow Lite/i.test(m.text())) errors.push(m.text());
});
await page.goto(`${server.url}/test/game.html?game=blocks&n=2&w=390&h=690&expr=0`);
await page.waitForFunction(() => window.ready === true && window.seats.every(s => s.gh.current?.instance?._test), null, { timeout: 20000 });

let failed = 0;
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failed++;
};
const pause = ms => page.waitForTimeout(ms);
const view = i => page.evaluate(i => window.seats[i].gh.current.instance._test.view(), i);
const call = (i, fn, ...args) => page.evaluate(([i, fn, args]) => window.seats[i].gh.current.instance._test[fn](...args), [i, fn, args]);
const until = async (fn, ms, what) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return true;
    await pause(80);
  }
  console.log(`  (timed out waiting for ${what})`);
  return false;
};
const ID = ['client1', 'client2'];

// Real touches.
const cdp = await page.context().newCDPSession(page);
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
const boxes = await page.evaluate(() => window.seats.map(s => { const r = s.el.querySelector('.panel canvas.g-canvas').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }));
async function centre(i) {
  const v = await view(i);
  const L = v.layout;
  return { x: boxes[i].x + L.wx + L.cell * 5, y: boxes[i].y + L.wy + L.cell * 8, cell: L.cell };
}
async function drag(i, dx, dy, { steps = 8, ms = 16, from = null } = {}) {
  const c = from || await centre(i);
  await touch('touchStart', c.x, c.y);
  for (let k = 1; k <= steps; k++) {
    await touch('touchMove', c.x + (dx * k) / steps, c.y + (dy * k) / steps);
    await pause(ms);
  }
  await touch('touchEnd');
  await pause(60);
}
const tap = async i => { const c = await centre(i); await touch('touchStart', c.x, c.y); await pause(40); await touch('touchEnd'); await pause(60); };
// A flick: the finger down, three quick moves and up, sent back to back as a
// real finger's events would arrive.
const flick = async i => {
  const c = await centre(i);
  const y = c.y - c.cell * 2;
  await Promise.all([touch('touchStart', c.x, y), ...[1, 2, 3].map(k => touch('touchMove', c.x, y + (c.cell * 4 * k) / 3)), touch('touchEnd')]);
  await pause(80);
};

// 1. The round starts on both seats with the same pieces.
await until(async () => (await view(0)).playing && (await view(1)).playing, 9000, 'both seats playing');
await pause(300);
let a = await view(0), b = await view(1);
check(a.round === 1 && b.round === 1 && a.seed === b.seed && a.seed > 0, `both seats play round 1 from one seed (${a.seed}; ${JSON.stringify([a.round, a.playing, b.round, b.playing, a.ph, b.ph])})`);
check(a.seq.join('') === b.seq.join('') && a.dealt[0] === b.dealt[0], `the same pieces in the same order (${a.seq.join('')})`);
check(a.owner && !b.owner, 'seat 1 owns the round');
check(a.layout.cell >= 24 && a.layout.slots === 1, `a big well on the phone (cell ${a.layout.cell}px) with the friend's well beside it`);
await page.screenshot({ path: `${outDir}blocks-start.png` });

// 2. Touch controls on seat 1.
{
  const c0 = (await view(0)).cur;
  const { cell } = await centre(0);
  await drag(0, cell * 2.1, 0);
  const c1 = (await view(0)).cur;
  check(c1.x === c0.x + 2 && c1.t === c0.t, `dragging two cells right moves the piece two cells (${c0.x} -> ${c1.x})`);
  await drag(0, -cell * 3.1, 0, { steps: 12 });
  const c2x = (await view(0)).cur;
  check(c2x.x === c1.x - 3, `dragging three cells left moves it three cells back (${c1.x} -> ${c2x.x})`);
  // (An O doesn't turn: drop it and try the next piece.)
  let c2 = c2x;
  if (c2.t === 1) { await flick(0); c2 = (await view(0)).cur; }
  await tap(0);
  const c3 = (await view(0)).cur;
  check(c3.t === c2.t && c3.r === (c2.r + 1) % 4, `a tap turns the piece clockwise (${c2.r} -> ${c3.r}, piece ${c3.t})`);
  const y0 = (await view(0)).cur.y;
  await drag(0, 0, cell * 3.05, { steps: 10, ms: 30 });
  const c4 = (await view(0)).cur;
  check(c4 && c4.y >= y0 + 3 && c4.t === c3.t, `a slow drag down soft-drops row by row (${y0} -> ${c4?.y})`);
  // Swipe up holds.
  const before = await view(0);
  await drag(0, 0, -cell * 3, { steps: 4, ms: 10 });
  const held = await view(0);
  check(held.hold === before.cur.t && held.cur.t !== before.cur.t || (held.hold === before.cur.t && before.hold === held.cur.t),
    `a quick swipe up holds the piece (held ${held.hold}, now ${held.cur?.t})`);
  // The controller's D-pad.
  const p0 = (await view(0)).cur;
  await page.evaluate(() => window.seats[0].pad({ right: true }));
  await page.evaluate(() => window.seats[0].pad({}));
  const p1 = (await view(0)).cur;
  check(p1.x === p0.x + 1, `the D-pad moves the piece (${p0.x} -> ${p1.x})`);
  // Flick down drops it.
  const placed = (await view(0)).placed;
  await flick(0);
  const f = await view(0);
  check(f.placed === placed + 1, `a flick down hard-drops the piece (${placed} -> ${f.placed} placed) ${JSON.stringify(await call(0, 'flick'))}`);
  await page.screenshot({ path: `${outDir}blocks-touch.png` });
}

// 3. Seat 2 sees seat 1's well live.
{
  await pause(400);
  const me = await view(0), other = await view(1);
  const seen = other.others.find(o => o.id === ID[0]);
  check(seen && me.board.length > 0 && seen.b === me.board && seen.sc === me.score, `seat 2 sees seat 1's well and score live (${me.board.length / 10} rows, ${me.score} pts)`);
  await flick(1);
  await pause(400);
  const two = await view(1), seen2 = (await view(0)).others.find(o => o.id === ID[1]);
  check(seen2 && seen2.b === two.board && seen2.p && two.cur && seen2.p.t === two.cur.t, 'seat 1 sees seat 2\'s well and falling piece');
  const n = Math.min((await view(0)).dealt.length, two.dealt.length);
  const d0 = (await view(0)).dealt.slice(0, n), d1 = two.dealt.slice(0, n);
  check(n >= 2 && d0.join('') === d1.join(''), `both seats were dealt the same pieces so far (${d0.join('')})`);
}

// 4. A two-row (or more) clear on seat 1 sends garbage to seat 2.
{
  // Carve the current piece's shape out of full rows at the bottom, right under it.
  // Find a turn of the piece that can fall straight into a slot carved from
  // two or more full rows, then turn it that way.
  const v = await view(0);
  const plan = await page.evaluate(async ({ t, x }) => {
    const B = (await import('../games/blocks.js'))._logic;
    let best = null;
    for (let r = 0; r < (t === 1 ? 1 : 4); r++) {
      const cells = B.cellsOf(t, r).map(([cx, cy]) => [x + cx, cy]);
      const maxY = Math.max(...cells.map(c => c[1])), minY = Math.min(...cells.map(c => c[1]));
      for (let k = 2; k <= maxY - minY + 1; k++) {
        const rows = [];
        for (let row = maxY; row > maxY - k; row--) rows.push([...Array(10)].map((_, col) => (cells.some(c => c[0] === col && c[1] === row) ? '0' : String(1 + ((col + row) % 7)))).join(''));
        const s = B.newWell(1);
        rows.forEach((str, i) => { s.board[B.TOTAL - 1 - i] = [...str].map(Number); });
        s.cur = { t, r, x, y: 2 };
        if (!B.fits(s.board, t, r, x, 2)) continue;
        B.hardDrop(s);
        const e = s.events.find(e => e.type === 'clear');
        if (e && e.lines === k && (!best || k > best.rows.length)) best = { r, rows };
      }
    }
    return best;
  }, { t: v.cur.t, x: v.cur.x });
  check(!!plan, `a slot for piece ${v.cur.t}`);
  for (let k = 0; k < 4 && (await view(0)).cur.r !== plan.r; k++) await tap(0);
  const cur = (await view(0)).cur;
  const rows = plan.rows;
  await call(0, 'setRows', rows);
  const lines0 = (await view(0)).lines, sc0 = (await view(0)).score;
  await flick(0);
  await pause(120);
  await page.screenshot({ path: `${outDir}blocks-clear.png` });
  await until(async () => (await view(1)).pending > 0, 2500, 'garbage on seat 2');
  const after = await view(0), other = await view(1);
  check(after.lines - lines0 === rows.length && after.score > sc0, `the drop clears ${rows.length} rows (${lines0} -> ${after.lines} lines, ${sc0} -> ${after.score} pts)${after.lines - lines0 === rows.length ? '' : ' ' + JSON.stringify({ cur, rows, board: after.board })}`);
  const sent = [0, 0, 1, 2, 4][rows.length];
  check(other.pending === sent, `seat 2 gets ${sent} garbage row${sent === 1 ? '' : 's'} waiting (${other.pending})`);
  await pause(250);
  check((await view(0)).others.find(o => o.id === ID[1])?.g === sent, 'seat 1 sees the garbage waiting beside seat 2\'s well');
  await page.screenshot({ path: `${outDir}blocks-garbage.png` });
  await flick(1);
  await until(async () => (await view(1)).garbageRows > 0, 2000, 'garbage rising');
  const g = await view(1);
  check(g.garbageRows === sent && g.pending === 0, `it rises into seat 2's well when seat 2 locks a piece (${g.garbageRows} rows)`);
}

// 5. Topping out ends the round, with the winner shown on both seats.
{
  const full = [...Array(20)].map((_, i) => [...Array(10)].map((_, col) => (col === (i % 2 ? 2 : 7) ? '0' : '8')).join(''));
  await call(1, 'setRows', full);
  await flick(1);
  await until(async () => (await view(1)).over, 2000, 'seat 2 topping out');
  check((await view(1)).over, 'seat 2 tops out');
  await until(async () => (await view(0)).card && (await view(1)).card, 3000, 'the results on both seats');
  const r0 = await view(0), r1 = await view(1);
  check(r0.ph === 'done' && r1.ph === 'done' && r0.winner === ID[0] && r1.winner === ID[0], `the round ends with seat 1 the winner on both seats (${r0.winner} / ${r1.winner})`);
  check(/You win/.test(r0.cardTitle) && /Ana wins/.test(r1.cardTitle), `the cards say so ("${r0.cardTitle}" / "${r1.cardTitle}")`);
  await pause(300);
  await page.screenshot({ path: `${outDir}blocks-win.png` });
}

// 6. The next round starts by itself, and rookie bots play it.
{
  await until(async () => (await view(0)).round === 2 && (await view(0)).playing && (await view(1)).playing, 12000, 'round 2');
  const a2 = await view(0), b2 = await view(1);
  check(a2.round === 2 && b2.round === 2 && a2.seed === b2.seed && a2.seed !== a.seed && !a2.card, `round 2 starts on its own with a new seed on both seats`);
  check(a2.board === '' && b2.board === '' && !b2.over, 'with empty wells, and seat 2 back in');
  const res = await page.evaluate(async () => {
    const { driveRookie } = await import('../js/rookie.js');
    let step = 0;
    await new Promise(done => {
      const t = setInterval(() => {
        step++;
        for (const seat of window.seats) if (seat.gh.current) driveRookie(seat.gh.current, step);
        if (step >= 75) { clearInterval(t); done(); }
      }, 400);
    });
    return window.seats.map(s => s.gh.current.instance._test.view());
  });
  await page.screenshot({ path: `${outDir}blocks-bots.png` });
  check(res.every(r => r.placed >= 12 || r.over), `rookie bots place pieces (${res.map(r => r.placed).join(', ')} placed)`);
  check(res.some(r => r.lines > 0), `and clear rows (${res.map(r => r.lines).join(', ')} lines; ${res.map(r => r.score).join(', ')} pts)`);
  const seen = res[1].others.find(o => o.id === ID[0]);
  check(seen && seen.r === res[0].round, 'the seats still follow each other\'s wells');
}

check(!errors.length, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
server.close();
if (failed) { console.log(`${failed} check(s) failed`); process.exit(1); }
console.log('all Block Drop checks passed');
