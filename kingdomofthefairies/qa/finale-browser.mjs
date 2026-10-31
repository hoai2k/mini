import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { serve, playwright } from '../../chat/test/lib.mjs';
const output = process.argv[2] || '/tmp/fairies-finale-review';
await mkdir(output, { recursive: true });
const server = await serve(new URL('../', import.meta.url).pathname);
const { chromium } = await playwright();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    window.scoreStarts = [];
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) { window.scoreStarts.push(this.buffer?.duration); return start.apply(this, args); };
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (target, ...args) {
      if (target instanceof AudioDestinationNode) {
        const analyser = this.context.createAnalyser(); analyser.fftSize = 2048;
        window.scoreAnalyser = analyser; connect.call(analyser, target);
        return connect.call(this, analyser, ...args);
      }
      return connect.call(this, target, ...args);
    };
  });
  await page.goto(server.url + '/?qa&act=7&scene=4&look=tinted');
  await page.waitForFunction(() => window.__kingdomOfTheFairies);
  // Dispatch through the real start handler even when the shell is still
  // revealing its title art; this is a deliberate QA user gesture.
  await page.locator('#start').evaluate(button => button.click());
  await page.waitForFunction(() => window.__kingdomOfTheFairies.audio.periodStates().includes('period-wedding:ready'), { timeout: 30000 });
  await page.evaluate(() => {
    const { S } = window.__kingdomOfTheFairies;
    S.mode = 'play'; S.card = null; S.curtain = S.curtainTarget = 1; S.paused = false;
  });
  await page.waitForFunction(() => window.__kingdomOfTheFairies.audio.nowPlaying()?.id === 'period-wedding');
  await page.evaluate(() => { window.__kingdomOfTheFairies.S.state.w.x = 900; });
  await page.waitForFunction(() => window.__kingdomOfTheFairies.S.state.phase === 'apotheosis');
  await page.evaluate(() => {
    const st = window.__kingdomOfTheFairies.S.state; st.w.x = 675; st.az.x = 605;
  });
  await page.waitForFunction(() => window.__kingdomOfTheFairies.S.state.phase === 'finale');
  assert.equal(await page.evaluate(async () => (await import('/src/save.js')).loadSave().endings?.wedding), true, 'completion is saved before the credits finish');
  assert.equal(await page.evaluate(() => window.__kingdomOfTheFairies.audio.nowPlaying().id), 'period-wedding');
  const samples = [];
  for (const time of [0, 12, 22, 39, 43.1]) {
    await page.evaluate(t => { window.__kingdomOfTheFairies.S.state.phaseT = t; }, time);
    await page.waitForTimeout(180);
    const sample = await page.evaluate(() => {
      const q = window.__kingdomOfTheFairies, data = new Float32Array(window.scoreAnalyser.fftSize);
      window.scoreAnalyser.getFloatTimeDomainData(data);
      return { time: q.S.state.phaseT, music: q.audio.musicLevel(), track: q.audio.nowPlaying()?.id,
        rms: Math.sqrt(data.reduce((s, v) => s + v * v, 0) / data.length),
        starts: window.scoreStarts.filter(d => d > 118 && d < 120).length };
    });
    assert.equal(sample.track, 'period-wedding'); assert.equal(sample.starts, 1, 'the wedding recording continues without restarting for credits');
    if (time === 0) assert.ok(sample.rms > 0.0001, 'actual decoded recording is audible');
    if (time === 39) assert.ok(sample.music > 0.4 && sample.music < 0.6);
    if (time > 43) assert.equal(sample.music, 0);
    samples.push(sample);
    await page.locator('#stage').screenshot({ path: `${output}/finale-${time}.png` });
  }
  // The shared game clock freezes both the roll and the fade while paused.
  await page.evaluate(() => { const q = window.__kingdomOfTheFairies; q.S.state.phaseT = 39; q.S.paused = true; });
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => window.__kingdomOfTheFairies.S.state.phaseT), 39);
  assert.equal(await page.evaluate(() => window.__kingdomOfTheFairies.audio.musicLevel()), 0.5);
  await page.evaluate(() => { const q = window.__kingdomOfTheFairies; q.S.paused = false; q.S.state.phaseT = 45; });
  await page.waitForFunction(() => window.__kingdomOfTheFairies.S.mode === 'playbill');
  await page.waitForFunction(() => window.__kingdomOfTheFairies.audio.nowPlaying()?.id === 'period-tender');
  assert.equal(await page.evaluate(() => window.scoreStarts.filter(d => d > 118 && d < 120).length), 1, 'the faded wedding source does not restart when menu music returns');
  // The same credits/fade must remain legible and reach black in both cast
  // looks and each film-effect setting, through the production renderer.
  await page.evaluate(async () => {
    const { createRenderer } = await import('/src/art.js');
    const { actBurning } = await import('/src/acts/act5film.js');
    const { finaleFrame } = await import('/src/finale.js');
    await window.__kingdomOfTheFairies.assets.all;
    const canvas = document.createElement('canvas'); canvas.id = 'ending-review'; canvas.width = 1280; canvas.height = 720;
    canvas.style.cssText = 'position:fixed;inset:0;z-index:99999;width:1280px;height:720px'; document.body.append(canvas);
    window.endingReview = { canvas, createRenderer, actBurning, finaleFrame };
  });
  for (const look of ['original', 'tinted']) for (const film of ['off', 'gentle', 'full']) {
    for (const time of [0, 12, 22, 39, 43]) {
      await page.evaluate(({ look, film, time }) => {
        const r = window.endingReview, st = r.actBurning.create({ from: { scene: 4 } });
        Object.assign(st, { phase: 'finale', phaseT: time, riseT: 3.2 }); st.w.x = 675; st.az.x = 605;
        r.createRenderer(r.canvas, window.__kingdomOfTheFairies.assets).render({ act: r.actBurning, state: st,
          t: time + 8, curtain: 1, film, tinted: look === 'tinted', fade: r.finaleFrame(time).fade });
      }, { look, film, time });
      await page.locator('#ending-review').screenshot({ path: `${output}/${look}-${film}-${time}.png` });
    }
  }
  assert.deepEqual(errors, []);
  await writeFile(`${output}/audio-and-timing.json`, JSON.stringify(samples, null, 2) + '\n');
  console.log('Real wedding audio, uninterrupted credits playback, shared fade, pause and playbill return pass');
} finally { await browser.close(); server.close(); }
