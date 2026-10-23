// Readability, everywhere: every screen and every sheet or dialog, opened the
// way a person opens it, in every theme in both modes. Each piece of text must
// stand at least 4.5:1 against what is behind it (3:1 when large: 24px, or
// 18.66px bold) and be at least 12.5px. What is behind it is the nearest
// background colour, or every solid stop of a gradient (the worst counts);
// text dimmed on purpose (done, disabled) and invisible controls laid over
// others are left out.
//
//   node test/browser/readability.mjs [--themes classic,deco] [--modes light]
import { start, THEMES, checks } from './lib.mjs';

const click = (p, s) => p.click(s, { timeout: 4000 });
const settings = (button) => async (p) => { await click(p, '#app-settings-btn'); await click(p, `#app-settings ${button}`); };

/** [name, address, how to open it, the element to check] */
export const VIEWS = [
  ['home', '', null, 'home'],
  ['metronome', '#metronome', null, 'metronome'],
  ['metronome playing', '#metronome', (p) => click(p, '#met-toggle'), 'metronome'],
  ['tuner', '#tuner', null, 'tuner'],
  ['drone', '#drone', null, 'drone'],
  ['recorder', '#record', null, 'record'],
  ['routine', '#routine', null, 'routine'],
  ['routine edited', '#routine', async (p) => { await click(p, '#timer-edit'); await click(p, '#timer-list .titem:nth-child(1) .titem-pencil'); }, 'routine'],
  ['routine running', '#routine', async (p) => { await click(p, '#timer-go'); await p.waitForTimeout(800); }, 'routine'],
  ['settings', '', (p) => click(p, '#app-settings-btn'), 'app-settings'],
  ['theme sheet', '#metronome', async (p) => { await click(p, '#met-settings-btn'); await click(p, '#met-settings .open-theme'); }, 'theme-sheet'],
  ['audio check', '', settings('.open-audio-check'), 'audio-check'],
  ['feedback', '', settings('.open-feedback'), 'feedback'],
  ['metronome settings', '#metronome', (p) => click(p, '#met-settings-btn'), 'met-settings'],
  ['subdivisions', '#metronome', async (p) => { await click(p, '#met-settings-btn'); await click(p, '#sub-edit'); }, 'sub-editor'],
  ['strong beats', '#metronome', async (p) => { await click(p, '#met-settings-btn'); await click(p, '#accent-edit'); await click(p, '#accent-grid .accent-cell >> nth=1'); }, 'accent-editor'],
  ['tempo picker', '#metronome', (p) => click(p, '#marking'), 'tempo-picker'],
  ['tuner settings', '#tuner', (p) => click(p, '#tuner-settings-btn'), 'tuner-settings'],
  ['scale test', '#tuner', (p) => click(p, '#scale-open'), 'scale-sheet'],
  ['drone settings', '#drone', (p) => click(p, '#drone-settings-btn'), 'drone-settings'],
  ['recorder settings', '#record', (p) => click(p, '#rec-settings-btn'), 'rec-settings'],
  ['routine settings', '#routine', (p) => click(p, '#timer-settings-btn'), 'timer-settings'],
  ['add a routine', '#routine', (p) => click(p, '#timer-add'), 'timer-add-sheet'],
  ['delete confirmation', '#routine', (p) => p.evaluate(() => {
    document.getElementById('timer-confirm-go').textContent = 'Delete';
    document.getElementById('timer-confirm-text').textContent = 'Its settings will be deleted with it.';
    document.getElementById('timer-confirm').showModal();
  }), 'timer-confirm'],
  ['tool settings', '#routine', async (p) => { await click(p, '#timer-go'); await p.waitForTimeout(600); await click(p, '.tool-card[data-tool="metronome"] .tool-gear'); }, 'tool-settings'],
  ['paywall', '', (p) => p.evaluate(() => document.getElementById('paywall').showModal()), 'paywall'],
];

/** Runs in the page: the text in `id` that is hard to read. */
function problems(id) {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  // The colours behind an element: the nearest solid gradient stops or background colour.
  // A gradient layer with see-through stops is ornament (rivets, dots, rules), not the ground.
  function behind(el) {
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      const layers = []; let depth = 0, cur = '';
      for (const ch of cs.backgroundImage !== 'none' ? cs.backgroundImage : '') {
        if (ch === '(') depth++; if (ch === ')') depth--;
        if (ch === ',' && depth === 0) { layers.push(cur); cur = ''; } else cur += ch;
      }
      if (cur.trim()) layers.push(cur);
      const stops = layers.filter((l) => /gradient/.test(l)).map((l) => [...l.matchAll(/rgba?\([^)]+\)/g)].map((m) => parse(m[0])))
        .filter((s) => s.length && s.every((c) => c.a > 0.5)).flat();
      if (stops.length) return stops;
      const bg = parse(cs.backgroundColor);
      if (bg && bg.a > 0.5) return [bg];
    }
    return [parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 }];
  }
  const root = document.getElementById(id);
  if (!root || (root.tagName === 'DIALOG' && !root.open)) return ['did not open'];
  const out = [];
  for (const el of root.querySelectorAll('*')) {
    if (!el.getClientRects().length || el.tagName === 'OPTION' || el.closest('svg, [hidden], .art, .ios-fig') || el.disabled) continue;
    const field = el.matches('input:not([type]), input[type="text"], input[type="email"], input[type="number"], textarea, select');
    const text = field ? (el.value || el.placeholder || el.options?.[el.selectedIndex]?.text || '')
      : [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
    if (!text) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden') continue;
    let opacity = 1;
    for (let e = el; e; e = e.parentElement) opacity *= +getComputedStyle(e).opacity;
    if (opacity < 0.6) continue; // dimmed on purpose
    const fg = parse(cs.color);
    if (!fg || fg.a === 0) continue; // an invisible control laid over another
    const stops = behind(el);
    const size = parseFloat(cs.fontSize);
    const need = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700) ? 3 : 4.5;
    const worst = Math.min(...stops.map((s) => ratio(fg.a < 1 ? over(fg, s) : fg, s)));
    const why = [];
    if (worst < need) why.push(`contrast ${worst.toFixed(2)} < ${need}`);
    if (size < 12.5) why.push(`${size}px`);
    if (why.length) out.push(`${why.join(', ')}: "${text.slice(0, 32)}" (${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}.${[...el.classList].join('.')}, ${cs.color})`);
  }
  return out;
}

export async function run(env, { themes = THEMES, modes = ['light', 'dark'] } = {}) {
  const c = checks('readability');
  const one = async (theme, mode) => {
    const p = await env.page({ theme, mode, height: 1400 });
    for (const [name, at, open, id] of VIEWS) {
      try {
        await p.goto(env.base + at);
        await p.reload();
        await p.waitForTimeout(600);
        if (open) await open(p, env.base);
        await p.waitForTimeout(400);
        const found = await p.evaluate(problems, id);
        c.ok(!found.length, `${theme} ${mode}, ${name}: ${found.join('; ')}`);
      } catch (e) {
        c.ok(false, `${theme} ${mode}, ${name}: could not open (${e.message.split('\n')[0]})`);
      }
    }
    c.ok(!p.errors.length, `${theme} ${mode}: page errors ${p.errors.join(' | ')}`);
    await p.close();
  };
  // Four at a time.
  const jobs = themes.flatMap((t) => modes.map((m) => () => one(t, m)));
  await Promise.all(Array.from({ length: 4 }, async () => { while (jobs.length) await jobs.shift()(); }));
  return c.done();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1].split(',') : undefined; };
  const env = await start();
  const failed = await run(env, { themes: arg('--themes'), modes: arg('--modes') });
  await env.stop();
  process.exitCode = failed ? 1 : 0;
}
