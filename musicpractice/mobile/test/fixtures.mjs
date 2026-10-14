// Exports what the native mixer tests need, made by the web app itself in
// Chromium: the metronome's clicks, each drone voice's loops (nativeaudio.js,
// exactly what the apps hand over), and reference renders of the web drone
// (Drone in an OfflineAudioContext) to compare levels and reverb against.
// Output: local/musicpractice-mixer/ (raw little-endian float32 + index.json).
//
//   node musicpractice/mobile/test/fixtures.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright-core/index.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, '../../app');
const out = path.resolve(here, '../../../local/musicpractice-mixer');
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<!doctype html><title>fixtures</title>'); }
  fs.readFile(path.join(app, p), (e, d) => {
    if (e) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
    res.end(d);
  });
}).listen(0);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
const page = await browser.newPage();
await page.goto(`http://localhost:${server.address().port}/`);

const index = { clicks: {}, voices: {}, references: [] };
const save = (name, arr) => { fs.writeFileSync(path.join(out, name), Buffer.from(new Float32Array(arr).buffer)); return name; };

for (const sound of ['wood', 'click', 'beep']) {
  const c = await page.evaluate(async (s) => {
    const { renderClicks } = await import('/src/nativeaudio.js');
    return (await renderClicks(s, 48000)).map((a) => Array.from(a));
  }, sound);
  index.clicks[sound] = c.map((a, i) => save(`click-${sound}-${i}.f32`, a));
}

for (const voice of ['cello', 'cello-soft', 'organ', 'organ-synth']) {
  const v = await page.evaluate(async (id) => {
    const { voiceLoops } = await import('/src/nativeaudio.js');
    const r = await voiceLoops(id);
    return { ...r, loops: r.loops.map((l) => ({ ...l, samples: Array.from(l.samples) })) };
  }, voice);
  index.voices[voice] = { ...v, loops: v.loops.map((l, i) => ({ hz: l.hz, sampleRate: l.sampleRate, channels: l.channels, file: save(`loop-${voice}-${i}.f32`, l.samples) })) };
}

// Web references: 12 s of the drone at 48 kHz, full, dry only and hall only.
for (const [voice, midi, fifth] of [['cello', 48, false], ['cello', 38, true], ['cello-soft', 43, false], ['organ', 50, false], ['organ-synth', 45, false]]) {
  for (const mix of ['full', 'dry', 'wet']) {
    const r = await page.evaluate(async ({ voice, midi, fifth, mix }) => {
      const { Drone } = await import('/src/drone.js');
      const ctx = new OfflineAudioContext(2, 48000 * 12, 48000);
      const d = new Drone(ctx);
      d.setVolume(0.8);
      await d.play({ midi, voice, a4: 440, fifth });
      if (mix !== 'full') {
        const off = mix === 'dry' ? d.wet.gain : d.dry.gain;
        off.cancelScheduledValues(0);
        off.setValueAtTime(0, 0);
      }
      const b = await ctx.startRendering();
      return [Array.from(b.getChannelData(0)), Array.from(b.getChannelData(1))];
    }, { voice, midi, fifth, mix });
    const name = `ref-${voice}-${midi}${fifth ? '-5th' : ''}-${mix}`;
    index.references.push({ voice, midi, fifth, mix, left: save(`${name}-L.f32`, r[0]), right: save(`${name}-R.f32`, r[1]) });
  }
}

// The hall against the dry sound on every drone note: a steady tone through any
// reverb comes out louder or softer by note, so the hall is matched on average.
const hall = [];
for (const voice of ['cello', 'organ', 'organ-synth']) {
  const r = await page.evaluate(async (voice) => {
    const { Drone } = await import('/src/drone.js');
    const rms = (b, from) => { let s = 0, n = 0; for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = from; i < d.length; i++) { s += d[i] * d[i]; n++; } } return Math.sqrt(s / n); };
    const res = [];
    for (let midi = 36; midi <= 59; midi++) {
      const r = {};
      for (const mix of ['dry', 'wet']) {
        const ctx = new OfflineAudioContext(2, 48000 * 9, 48000);
        const d = new Drone(ctx);
        d.setVolume(0.8);
        await d.play({ midi, voice, a4: 440, fifth: false });
        const off = mix === 'dry' ? d.wet.gain : d.dry.gain;
        off.cancelScheduledValues(0);
        off.setValueAtTime(0, 0);
        r[mix] = rms(await ctx.startRendering(), 48000 * 5);
      }
      res.push(`${voice} ${midi} ${r.dry} ${r.wet}`);
    }
    return res;
  }, voice);
  hall.push(...r);
}
fs.writeFileSync(path.join(out, 'webhall.txt'), hall.join('\n') + '\n');

fs.writeFileSync(path.join(out, 'index.json'), JSON.stringify(index, null, 1));
// The same as plain lines, for the Java and Swift tests:
//   click <sound> <weak> <mid> <strong>
//   voice <id> <level> <wet> <lowpass> <maxShift> then loop <hz> <rate> <channels> <file> per loop
//   ref <voice> <midi> <fifth 0/1> <mix> <left> <right>
const lines = [];
for (const [s, f] of Object.entries(index.clicks)) lines.push(['click', s, ...f].join(' '));
for (const [id, v] of Object.entries(index.voices)) {
  lines.push(['voice', id, v.level, v.wet, v.lowpass, v.maxShift].join(' '));
  for (const l of v.loops) lines.push(['loop', l.hz, l.sampleRate, l.channels, l.file].join(' '));
}
for (const r of index.references) lines.push(['ref', r.voice, r.midi, r.fifth ? 1 : 0, r.mix, r.left, r.right].join(' '));
fs.writeFileSync(path.join(out, 'index.txt'), lines.join('\n') + '\n');
console.log('fixtures in', out);
await browser.close();
server.close();
