// Touch and mouse checks of the call screen's sheets and effects strip, on a
// phone-sized page with no relay: a short pull down peeks and snaps back, a
// long pull closes, swiping the strip sideways puts on the effect that
// stops in the ring, dragging the strip up opens the effects grid, and a
// busy or unanswering camera is explained without holding up the chat.
//   chat/publish.sh local/pages/chat && node chat/test/ui-check.mjs
import { fileURLToPath } from 'node:url';
import { serve, launch } from './lib.mjs';

const pages = fileURLToPath(new URL('../../local/pages', import.meta.url));
const server = await serve(pages);
const browser = await launch();
let fails = 0;
for (const touch of [false, true]) {
  // Synthesised gestures must land inside the real headless window (800 x 600).
  const ctx = await browser.newContext({ viewport: { width: 390, height: touch ? 590 : 844 }, hasTouch: touch, isMobile: touch, permissions: ['camera', 'microphone'] });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('ERR', e.message, e.stack?.split('\n').slice(0,3).join(' | ')));
  await p.goto(`${server.url}/chat/?rooms=http://127.0.0.1:1`);
  await p.fill('#name-input', 'Ana'); await p.click('#start-btn'); await p.waitForTimeout(1200);
  const cdp = touch ? await ctx.newCDPSession(p) : null;
  const drag = async (sel, frac) => {
    const sheet = p.locator(sel);
    const h = (await sheet.boundingBox()).height;
    const g = await p.locator(`${sel} .sheet-grip`).boundingBox();
    const x = g.x + g.width / 2, y = g.y + 3, dy = h * frac;
    let mid = '';
    if (!touch) {
      await p.mouse.move(x, y); await p.mouse.down();
      for (let i = 1; i <= 10; i++) { await p.mouse.move(x, y + (dy * i) / 10); await p.waitForTimeout(30); }
      mid = await sheet.evaluate(e => e.style.transform);
      await p.waitForTimeout(120); await p.mouse.up();
    } else {
      const pt = yy => [{ x, y: yy }];
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(y) });
      for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(y + (dy * i) / 10) }); await p.waitForTimeout(30); }
      mid = await sheet.evaluate(e => e.style.transform);
      await p.waitForTimeout(120); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    await p.waitForTimeout(600);
    return { mid, hidden: await sheet.isHidden() };
  };
  // Messages opens from Settings; the others from the bottom row.
  const openIt = async btn => {
    if (btn !== 'chat') return p.click(btn);
    await p.click('#topbar [data-open="settings"]');
    await p.waitForTimeout(200);
    await p.click('#open-chat');
  };
  for (const [btn, sel] of [['#btn-games', '#tray-games'], ['#btn-effects', '#tray-effects'], ['#btn-accessories', '#tray-effects'], ['#btn-backgrounds', '#tray-effects'], ['chat', '#chat-box']]) {
    await openIt(btn); await p.waitForTimeout(400);
    const small = await drag(sel, 0.2);
    const big = await drag(sel, 0.6);
    // Strips step the UI down a level (the row tucks away); sheets close.
    const strip = sel === '#tray-effects';
    const level = await p.evaluate(() => window.__chat.uiLevel);
    const ok = small.mid.includes('translateY') && !small.hidden && (strip ? !big.hidden && level === 1 : big.hidden);
    if (!ok) fails++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${touch ? 'touch' : 'mouse'} ${sel}: peek ${small.mid} snaps back=${!small.hidden}, long pull ${strip ? `tucks the row away (level ${level})` : `closes=${big.hidden}`}`);
    await p.evaluate(() => { window.__chat.toggleTray(null); window.__chat.setUiLevel(2); });
    await p.waitForTimeout(350);
  }
  {
    // The levels: drag the strip down (row tucks away), down again (strip
    // goes, grip shows), the grip up, the strip up (row back), up again (grid),
    // down (grid closes), and the row itself down.
    await p.click('#btn-effects');
    await p.waitForTimeout(400);
    const pull = async (sel, dy) => {
      const bb = await p.locator(sel).boundingBox();
      const x = bb.x + bb.width / 2, y = bb.y + Math.min(bb.height / 2, 14);
      if (!touch) {
        await p.mouse.move(x, y); await p.mouse.down();
        for (let i = 1; i <= 10; i++) { await p.mouse.move(x, y + (dy * i) / 10); await p.waitForTimeout(25); }
        await p.waitForTimeout(80); await p.mouse.up();
      } else {
        const pt = yy => [{ x, y: yy }];
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(y) });
        for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(y + (dy * i) / 10) }); await p.waitForTimeout(25); }
        await p.waitForTimeout(80); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      }
      await p.waitForTimeout(450);
      return p.evaluate(() => `${window.__chat.uiLevel}${document.querySelector('#tray-effects').classList.contains('grid') ? 'g' : ''}`);
    };
    const steps = [
      await pull('#tray-effects .sheet-grip', 120),
      await pull('#tray-effects .sheet-grip', 120),
      await pull('#ui-grip', -120),
      await pull('#tray-effects .sheet-grip', -120),
      await pull('#tray-effects .sheet-grip', -120),
      await pull('#tray-effects .sheet-grip', 120),
      await pull('#controls', 90),
    ];
    const want = ['1', '0', '1', '2', '2g', '2', '1'];
    const ok = JSON.stringify(steps) === JSON.stringify(want);
    if (!ok) fails++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${touch ? 'touch' : 'mouse'}: UI levels by dragging ${steps.join(' → ')} (want ${want.join(' → ')})`);
    await p.evaluate(() => { window.__chat.toggleTray(null); window.__chat.setUiLevel(2); });
    await p.waitForTimeout(350);
  }
  {
    // Drag the effects strip up into the grid, scroll it, pick an effect,
    // then pull it down: back to the strip, still open.
    await p.click('#btn-effects');
    await p.waitForTimeout(400);
    const g = await p.locator('#tray-effects .sheet-grip').boundingBox();
    const x = g.x + g.width / 2, y = g.y + 3;
    const vdrag = async (from, dy) => {
      if (!touch) {
        await p.mouse.move(x, from); await p.mouse.down();
        for (let i = 1; i <= 10; i++) { await p.mouse.move(x, from + (dy * i) / 10); await p.waitForTimeout(30); }
        await p.waitForTimeout(80); await p.mouse.up();
      } else {
        const pt = yy => [{ x, y: yy }];
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(from) });
        for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(from + (dy * i) / 10) }); await p.waitForTimeout(30); }
        await p.waitForTimeout(80); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      }
      await p.waitForTimeout(500);
    };
    await vdrag(y, -160);
    const grid = await p.evaluate(() => {
      const list = document.querySelector('#effect-list');
      return { on: document.querySelector('#tray-effects').classList.contains('grid'), tall: list.scrollHeight > list.clientHeight + 50 };
    });
    await p.evaluate(() => { document.querySelector('#effect-list').scrollTop = 400; });
    await p.waitForTimeout(300);
    const pick = await p.evaluate(() => {
      const list = document.querySelector('#effect-list');
      const r = list.getBoundingClientRect();
      const b = [...list.children].find(c => { const q = c.getBoundingClientRect(); return q.top > r.top + 10 && q.bottom < r.bottom - 10 && c.dataset.fx; });
      return b.dataset.fx;
    });
    await p.click(`#effect-list [data-fx="${pick}"]`);
    await p.waitForTimeout(300);
    const on = await p.evaluate(() => window.__chat.studio.effect?.id ?? null);
    await p.evaluate(() => { document.querySelector('#effect-list').scrollTop = 0; });
    const g2 = await p.locator('#tray-effects .sheet-grip').boundingBox();
    await vdrag(g2.y + 3, 140);
    const back = await p.evaluate(() => ({ grid: document.querySelector('#tray-effects').classList.contains('grid'), open: !document.querySelector('#tray-effects').hidden, fx: window.__chat.studio.effect?.id ?? null }));
    const ok = grid.on && grid.tall && on === pick && !back.grid && back.open && back.fx === pick;
    if (!ok) fails++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${touch ? 'touch' : 'mouse'}: dragging the strip up opens a scrolling grid (${JSON.stringify(grid)}), tapping ${pick} puts it on (${on}), pulling down returns to the open strip (${JSON.stringify(back)})`);
    await p.click('#btn-effects');
    await p.waitForTimeout(300);
  }
  if (touch) {
    // Swipe the strip right to left with a finger.
    await p.click('#btn-effects');
    await p.waitForTimeout(400);
    const box = await p.locator('#effect-list').boundingBox();
    const y = box.y + box.height / 2;
    // A sideways scroll of the strip (what a finger swipe does).
    await p.mouse.move(box.x + box.width / 2, y);
    await p.mouse.wheel(260, 0);
    await p.waitForTimeout(1200);
    const fx = await p.evaluate(() => window.__chat.studio.effect?.id ?? null);
    const scrolled = await p.evaluate(() => document.querySelector('#effect-list').scrollLeft);
    const stripOpen = await p.locator('#tray-effects').isVisible();
    const ok = !!fx && stripOpen;
    if (!ok) fails++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} swiping the strip puts on an effect (${fx}, scrolled ${Math.round(scrolled)}px) and leaves the strip open`);
  }
  await ctx.close();
}
// Camera and microphone trouble: busy in another app (rejected), or never
// answering (as iPhones do during a phone call). The chat must still start,
// the reason must be shown, and Try again must pick the devices up.
for (const mode of ['busy', 'hang']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['camera', 'microphone'] });
  await ctx.addInitScript(mode => {
    const real = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    let calls = 0;
    navigator.mediaDevices.getUserMedia = c => {
      if (window.__devicesOk) return real(c);
      calls++;
      if (mode === 'hang') return new Promise(() => {});
      return Promise.reject(new DOMException('Could not start audio source', 'NotReadableError'));
    };
  }, mode);
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('ERR', e.message, e.stack?.split('\n').slice(0,3).join(' | ')));
  await p.goto(`${server.url}/chat/?rooms=http://127.0.0.1:1`);
  await p.fill('#name-input', 'Ana'); await p.click('#start-btn');
  const shown = await p.waitForFunction(() => document.querySelector('#devices').open, null, { timeout: 15000 }).then(() => true, () => false);
  const msg = await p.textContent('#devices-msg');
  const joined = await p.evaluate(() => !!window.__chat.net && !!window.__chat.rtc);
  await p.evaluate(() => { window.__devicesOk = true; });
  await p.click('#devices-retry');
  const back = await p.waitForFunction(() => window.__chat.studio.hasMic && window.__chat.studio.hasCamera, null, { timeout: 10000 }).then(() => true, () => false);
  const want = mode === 'busy' ? /busy in another app/ : /didn't start/;
  const ok = shown && want.test(msg) && joined && back;
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} devices ${mode}: reason shown=${shown} ("${msg}"), chat started anyway=${joined}, Try again starts them=${back}`);
  await ctx.close();
}

await browser.close();
server.close();
if (fails) console.log(`${fails} failed`);
process.exit(fails ? 1 : 0);
