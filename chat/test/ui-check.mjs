// Touch and mouse checks of the call screen's sheets and effects strip, on a
// phone-sized page with no relay: a short pull down peeks and snaps back, a
// long pull closes, and swiping the strip sideways puts on the effect that
// stops in the ring.
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
  p.on('pageerror', e => console.log('ERR', e.message));
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
  for (const [btn, sel] of [['#btn-games', '#tray-games'], ['#btn-effects', '#tray-effects'], ['#btn-chat', '#chat-box']]) {
    await p.click(btn); await p.waitForTimeout(400);
    const small = await drag(sel, 0.2);
    const big = await drag(sel, 0.6);
    const ok = small.mid.includes('translateY') && !small.hidden && big.hidden;
    if (!ok) fails++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${touch ? 'touch' : 'mouse'} ${sel}: peek ${small.mid} snaps back=${!small.hidden}, long pull closes=${big.hidden}`);
    if (!big.hidden) await p.click(btn);
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
await browser.close();
server.close();
if (fails) console.log(`${fails} failed`);
process.exit(fails ? 1 : 0);
