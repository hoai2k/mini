// Ai-Ching: the page. The home view takes a question; the reading view shows
// what the coins said. The question and the day live in the URL fragment
// (#q=…&d=YYYY-MM-DD), which never leaves the browser.

import { buildReading } from './reading.js';
import { linesOf, symbolOf, trigramsOf, hexagramNumber, nuclearOf } from './iching.js';
import { almanac } from './almanac.js';
import { gather } from './online.js';
import { TOPICS, KINDS } from './topics.js';
import { setAssets, delivered, hexagramImage, trigramImage, topicImage } from './art.js';
import { dayKey } from './rng.js';
import { aiOpening, aiEnabled, setAiEnabled } from './ai.js';
import { voiceMode, listen, joinText } from './voice.js';

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let HEXAGRAMS = [];
let castToken = 0;

const POSITION = ['at the beginning', 'in the second place', 'in the third place', 'in the fourth place', 'in the fifth place', 'at the top'];
const lineName = (index, yang) => `${yang ? 'Nine' : 'Six'} ${POSITION[index]}`;

// ---------------------------------------------------------------- drawing

function hexLines(lines, { changing = [], values = null, small = false, interactive = false } = {}) {
  const rows = lines.map((yang, i) => {
    const moving = changing.includes(i);
    const mark = moving ? `<span class="mark" title="${values?.[i] === 9 ? 'old yang, changing' : 'old yin, changing'}">${values?.[i] === 9 ? '○' : '×'}</span>` : '';
    const attrs = interactive
      ? ` data-line="${i}" tabindex="0" role="button" aria-label="${esc(`${lineName(i, yang)}${moving ? ', changing' : ''}`)}"`
      : '';
    return `<li class="ln ${yang ? 'yang' : 'yin'}${moving ? ' moving' : ''}"${attrs}><span class="bar"></span><span class="bar"></span>${mark}</li>`;
  });
  return `<ol class="hexlines${small ? ' small' : ''}${interactive ? ' interactive' : ''}"${interactive ? ' aria-label="The six lines, top line first"' : ' aria-hidden="true"'}>${rows.reverse().join('')}</ol>`;
}

const hexHref = (n) => `#h=${n}`;

/** The picture, names and lines at the top of a reading or a hexagram page. */
function heroHTML(h, { lines = linesOf(h.n), changing = [], values = null, relating = null } = {}) {
  return `
      <section class="hero">
        <figure class="hero-art"><img alt="${esc(`${h.name}: ${h.scene}`)}" src="${esc(hexagramImage(h))}"></figure>
        <div class="hero-text">
          <p class="hero-num">Hexagram ${h.n} <span class="sym">${symbolOf(h.n)}</span></p>
          <h1><span class="hero-zh" lang="zh">${esc(h.zh)}</span><span class="hero-names"><span class="pinyin">${esc(h.pinyin)}</span><span class="en">${esc(h.name)}</span><span class="alt">${esc(h.alt)}</span></span></h1>
        </div>
        <div class="hero-lines">
          <div class="hero-own">${hexLines(lines, { changing, values, interactive: true })}<p class="line-hint">Tap a line to read it</p></div>
          ${relating ? `<span class="arrow" aria-hidden="true">→</span><a href="${hexHref(relating.n)}" class="to-relating" title="Open hexagram ${relating.n}, ${esc(relating.name)}">${hexLines(linesOf(relating.n), { small: true })}<span>${relating.n}. ${esc(relating.name)}</span></a>` : ''}
        </div>
      </section>
      <div class="line-detail" data-line-detail hidden aria-live="polite"></div>`;
}

/** Clicking a line of the hero shows what it says, and whether it is moving. */
function wireLines(root, h, { changing = [], values = null, relating = null } = {}) {
  const panel = $('[data-line-detail]', root);
  const list = $('.hero-lines .hexlines.interactive', root);
  if (!panel || !list) return;
  const lines = linesOf(h.n);
  let current = -1;
  const open = (i) => {
    const close = i === current;
    current = close ? -1 : i;
    for (const li of list.querySelectorAll('.ln')) li.classList.toggle('selected', Number(li.dataset.line) === current);
    if (close) { panel.hidden = true; return; }
    const moving = changing.includes(i);
    const yang = values ? values[i] === 7 || values[i] === 9 : lines[i] === 1;
    const status = values
      ? (moving
        ? `Changing in your cast: an old ${values[i] === 9 ? 'yang line (nine) turning to yin' : 'yin line (six) turning to yang'}.${relating ? ` It helps turn this hexagram into <a href="${hexHref(relating.n)}">${relating.n}. ${esc(relating.name)}</a>.` : ''}`
        : 'Steady in your cast. Only changing lines speak in a reading; its text is here to study.')
      : 'Read when this line is changing in a cast.';
    panel.innerHTML = `<div class="line-detail-inner${moving ? ' moving' : ''}">
        <p class="mini-label">Line ${i + 1} of 6, counted from the bottom</p>
        <h3>${esc(lineName(i, yang))}</h3>
        <p class="line-status">${status}</p>
        <p class="line-text">${esc(h.lines[i])}</p>
        <button type="button" class="link line-close">Close</button>
      </div>`;
    panel.hidden = false;
    panel.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    $('.line-close', panel).addEventListener('click', () => open(current));
  };
  list.addEventListener('click', (e) => { const li = e.target.closest('[data-line]'); if (li) open(Number(li.dataset.line)); });
  list.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset.line) { e.preventDefault(); open(Number(e.target.dataset.line)); }
  });
}

// A small card for another hexagram, linking to its page.
function miniHex(h, label, note) {
  return `
      <article class="mini-hex">
        <a class="mini-link" href="${hexHref(h.n)}" aria-label="Open hexagram ${h.n}, ${esc(h.name)}"><img alt="" src="${esc(hexagramImage(h, true))}"></a>
        <div class="mini-body">
          <p class="mini-label">${esc(label)}</p>
          <h3><a href="${hexHref(h.n)}"><span class="mini-zh" lang="zh">${esc(h.zh)}</span> ${h.n}. ${esc(h.name)}</a></h3>
          ${hexLines(linesOf(h.n), { small: true })}
          <p>${esc(h.essence)}</p>
          ${note ? `<p class="note">${esc(note)}</p>` : ''}
        </div>
      </article>`;
}

function chip(text, zh) {
  return `<span class="chip">${zh ? `<b lang="zh">${esc(zh)}</b>` : ''}${esc(text)}</span>`;
}

function sectionHead(zh, title, sub = '') {
  return `<header class="sec-head"><span class="sec-seal" lang="zh">${esc(zh)}</span><div><h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div></header>`;
}

function legge(n) {
  return `https://sacred-texts.com/ich/ic${String(n).padStart(2, '0')}.htm`;
}

// ---------------------------------------------------------------- sections

const SECTIONS = {
  counsel(r) {
    const cards = r.counsel.map((c, i) => `
      <article class="counsel-card${i === 0 ? ' lead' : ''}">
        <img class="counsel-art" alt="" src="${esc(c.from !== r.primary.n ? hexagramImage(r.relating, true) : topicImage(c.key, c.zh))}">
        <div><h3><b lang="zh">${esc(c.zh)}</b> ${esc(c.label)}</h3><p>${esc(c.text)}</p>
        ${c.from !== r.primary.n ? `<p class="from">from ${esc(r.relating.name)}, the hexagram this one becomes</p>` : ''}</div>
      </article>`).join('');
    return `${sectionHead('答', 'For your question', KINDS[r.about.kind].label)}<div class="counsel-grid">${cards}</div>`;
  },

  judgment(r) {
    const h = r.primary;
    return `${sectionHead('彖', 'The Judgment and the Image')}
      <div class="two-col">
        <div class="panel"><h3>The Judgment</h3><p>${esc(h.judgment)}</p></div>
        <div class="panel"><h3>The Image</h3><p>${esc(h.image)}</p></div>
      </div>
      <p class="keywords">${h.keywords.map((k) => chip(k)).join('')}${chip(h.season, '時')}</p>`;
  },

  lines(r) {
    const f = r.focus;
    const card = (l, lead) => {
      const src = HEXAGRAMS[l.from - 1];
      const yang = linesOf(l.from)[l.index] === 1;
      return `<article class="line-card${lead ? ' lead' : ''}">
        <div class="line-badge">${hexLines(linesOf(l.from), { changing: [l.index], values: linesOf(l.from).map((v) => (v ? 9 : 6)), small: true })}</div>
        <div><h3>${esc(lineName(l.index, yang))}${l.from !== r.primary.n ? ` <small>of <a href="${hexHref(src.n)}">${esc(src.name)}</a></small>` : ''}</h3><p>${esc(l.text)}</p></div>
      </article>`;
    };
    const stressed = f.stressed.map((l, i) => card(l, i === 0)).join('');
    const others = f.otherChanging.map((l) => card(l, false)).join('');
    const body = stressed || others
      ? `${stressed}${others && stressed ? '<p class="minor-head">The other moving lines</p>' : ''}${others}`
      : `<div class="panel still"><p>${esc(r.primary.essence)}</p></div>`;
    return `${sectionHead('爻', 'The moving lines', f.note)}<div class="lines-list">${body}</div>`;
  },

  becoming(r) {
    const parts = [];
    if (r.relating) parts.push(miniHex(r.relating, 'It becomes', r.relating.judgment));
    parts.push(miniHex(r.nuclear, 'Hidden within', 'The nuclear hexagram, made of the inner lines, shows what is working quietly beneath the surface.'));
    return `${sectionHead('變', r.relating ? 'Where it is going' : 'What lies beneath', r.relating ? 'The changing lines turn this hexagram into another: the direction of the matter.' : 'No line is changing, so look inward: the hexagram hidden inside this one.')}<div class="mini-grid">${parts.join('')}</div>`;
  },

  trigrams(r) {
    const card = (t, pos) => `
      <article class="tri-card">
        <img alt="" src="${esc(trigramImage(t.key))}">
        <div><p class="mini-label">${pos}</p><h3><span lang="zh">${t.zh}</span> ${esc(t.name)} <span class="tri-sym">${t.symbol}</span></h3>
        <p>${esc(t.quality)}. In the family, the ${esc(t.family)}; in space, the ${esc(t.direction)}; its element, ${esc(t.element)}.</p></div>
      </article>`;
    return `${sectionHead('卦', 'The two trigrams', `${r.trigrams.upper.name} above ${r.trigrams.lower.name}`)}
      <div class="tri-grid">${card(r.trigrams.upper, 'Above: the outer world')}${card(r.trigrams.lower, 'Below: the inner self')}</div>`;
  },

  sage(r) {
    return `${sectionHead('言', 'Words of the sages')}<blockquote class="sage"><p>${esc(r.sage.text)}</p><cite>${esc(r.sage.source)}</cite></blockquote>`;
  },

  world() {
    return `${sectionHead('世', 'Signs of the day', 'What the world brings today, chosen for your question')}<div class="world" data-world><p class="loading">Gathering the day's signs…</p></div>`;
  },

  almanac(r, date) {
    const a = almanac(date);
    const cells = [
      a.lunar && ['農曆', 'Lunar date', `${a.lunar.zh}`, `Month ${a.lunar.month}${a.lunar.leap ? ' (leap)' : ''}, day ${a.lunar.day}${a.lunar.animal ? `, year of the ${a.lunar.animal}` : ''}`],
      ['日', 'The day', a.day.zh, `${a.day.pinyin}: ${a.day.element}, the ${a.day.animal}`],
      ['節氣', 'Solar term', a.term.zh, a.term.en],
      ['月', 'The moon', a.moon.name, `${Math.round(a.moon.illumination * 100)}% lit, ${a.moon.waxing ? 'growing' : 'waning'}`],
      dayKey(new Date()) === r.day && ['時', 'The hour', a.hour.zh, `${a.hour.pinyin}, the hour of the ${a.hour.animal}`],
    ].filter(Boolean);
    const timing = r.about.kind === 'timing'
      ? `<p class="almanac-note">${esc(timingNote(a, r))}</p>` : '';
    return `${sectionHead('曆', 'The almanac', `For ${date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`)}
      ${timing}<dl class="almanac">${cells.map(([zh, label, big, small]) => `<div><dt><b lang="zh">${zh}</b> ${label}</dt><dd><strong lang="zh">${esc(big)}</strong><span>${esc(small)}</span></dd></div>`).join('')}</dl>`;
  },
};

function timingNote(a, r) {
  const moon = a.moon.waxing ? 'The moon is growing: a time for beginnings and for gathering.' : 'The moon is waning: a time for finishing, clearing and rest.';
  return `You asked about time. The hexagram speaks of ${r.primary.season}; the calendar stands at ${a.term.en} (${a.term.zh}). ${moon}`;
}

// ---------------------------------------------------------------- online

function renderWorld(root, r, online) {
  const box = $('[data-world]', root);
  if (!box) return;
  const cards = [];
  const d = online.daily;
  if (d?.event) {
    cards.push(`<article class="world-card">
      ${d.event.page?.thumb ? `<img alt="" loading="lazy" src="${esc(d.event.page.thumb)}">` : ''}
      <div><p class="mini-label">On this day in ${esc(d.event.year)}</p><p>${esc(d.event.text)}</p>
      ${d.event.page ? `<a href="${esc(d.event.page.url)}" target="_blank" rel="noopener">${esc(d.event.page.title)} on Wikipedia</a>` : ''}
      <p class="note">${d.event.matched ? 'Chosen because it echoes your question and the hexagram.' : 'The coins chose this one.'}</p></div></article>`);
  }
  if (d?.news) {
    cards.push(`<article class="world-card"><div><p class="mini-label">In the news</p><p>${esc(d.news.text)}</p>
      ${d.news.page ? `<a href="${esc(d.news.page.url)}" target="_blank" rel="noopener">Read more on Wikipedia</a>` : ''}</div></article>`);
  }
  for (const p of online.lore) {
    cards.push(`<article class="world-card">
      ${p.thumb ? `<img alt="" loading="lazy" src="${esc(p.thumb)}">` : ''}
      <div><p class="mini-label">A thread to follow</p><h3>${esc(p.title)}</h3><p>${esc(p.extract.length > 360 ? `${p.extract.slice(0, 357)}…` : p.extract)}</p>
      <a href="${esc(p.url)}" target="_blank" rel="noopener">Continue on Wikipedia</a></div></article>`);
  }
  if (d?.picture?.src) {
    cards.push(`<figure class="world-picture"><a href="${esc(d.picture.url)}" target="_blank" rel="noopener"><img alt="${esc(d.picture.description || d.picture.title)}" loading="lazy" src="${esc(d.picture.src)}"></a>
      <figcaption><span class="mini-label">Picture of the day</span> ${esc(d.picture.description || d.picture.title)}${d.picture.artist ? ` · ${esc(d.picture.artist)}` : ''}</figcaption></figure>`);
  }
  cards.push(`<p class="sources">Also read <a href="${legge(r.primary.n)}" target="_blank" rel="noopener">Legge's translation of hexagram ${r.primary.n}</a>${r.relating ? ` and <a href="${legge(r.relating.n)}" target="_blank" rel="noopener">of ${r.relating.n}</a>` : ''}. Daily items from Wikipedia and Wikimedia Commons.</p>`);
  box.innerHTML = cards.length > 1 ? cards.join('') : `<p class="loading">The day's signs could not be reached just now; the reading above is complete without them.</p>${cards.join('')}`;
}

// ---------------------------------------------------------------- views

function readingDate(day) {
  const [y, m, d] = day.split('-').map(Number);
  const now = new Date();
  return dayKey(now) === day ? now : new Date(y, m - 1, d, 12);
}

function renderReading(question, day) {
  const date = readingDate(day);
  const r = buildReading(question, HEXAGRAMS, date);
  const h = r.primary;
  const root = $('#reading');
  paint(root, h);

  const topicChips = [chip(KINDS[r.about.kind].label, r.about.kind === 'decision' ? '決' : r.about.kind === 'timing' ? '時' : '問'),
    ...r.about.topics.slice(0, 3).map((t) => chip(TOPICS[t.key].label, TOPICS[t.key].zh))].join('');

  root.innerHTML = `
    <div class="reading-bg" aria-hidden="true"></div>
    <div class="reading-inner">
      <div class="you"><p class="bubble">${esc(r.question)}</p><p class="meta">${topicChips}</p></div>
      <div class="oracle" data-ai hidden aria-live="polite">
        <span class="oracle-seal" lang="zh" aria-hidden="true">易</span>
        <div class="oracle-body"><p class="oracle-text"><span class="typing" aria-label="Writing"><i></i><i></i><i></i></span></p>
        <p class="oracle-note" hidden></p></div>
      </div>
      ${heroHTML(h, { lines: r.values.map((v) => (v === 7 || v === 9 ? 1 : 0)), changing: r.changing, values: r.values, relating: r.relating })}
      <p class="essence">${esc(h.essence)}</p>
      ${r.order.map((key) => `<section class="sec sec-${key}" id="${key}">${SECTIONS[key](r, date)}</section>`).join('<div class="divider" aria-hidden="true"></div>')}
      <form class="prompt follow" id="again-form" autocomplete="off">
        <label class="visually-hidden" for="again">Ask another question</label>
        <textarea id="again" rows="1" maxlength="600" placeholder="Ask another question…" required></textarea>
        <div class="prompt-bar"><span class="hint">Cast ${esc(day)} · seed ${esc(r.seed)}</span>
          <span class="actions"><button type="button" class="link" data-share>Copy link</button><button class="send" type="submit" aria-label="Cast the coins"><span lang="zh" aria-hidden="true">卜</span></button></span></div>
      </form>
    </div>`;

  wirePrompt($('#again-form', root), $('#again', root));
  wireLines(root, h, { changing: r.changing, values: r.values, relating: r.relating });
  try { sessionStorage.setItem('aiching:last', location.hash); } catch { /* storage blocked */ }
  $('[data-share]', root).addEventListener('click', async (e) => {
    try { await navigator.clipboard.writeText(location.href); e.target.textContent = 'Link copied'; } catch { e.target.textContent = 'Copy the address bar'; }
  });
  document.title = `${h.zh} ${h.name} · Ai-Ching`;

  const token = ++castToken;
  showOpening(root, r, token);
  gather(r).then((online) => { if (token === castToken) renderWorld(root, r, online); })
    .catch(() => { if (token === castToken) renderWorld(root, r, { daily: null, lore: [] }); });
  return r;
}

function paint(root, h) {
  const [c0, c1, c2] = h.palette;
  root.style.setProperty('--hx-base', c0);
  root.style.setProperty('--hx-accent', c1);
  root.style.setProperty('--hx-high', c2);
}

// A page for one hexagram, reached from any hexagram shown in a reading.
function renderHexagram(n) {
  castToken++;
  const h = HEXAGRAMS[n - 1];
  const root = $('#reading');
  paint(root, h);
  const lines = linesOf(n);
  const tri = trigramsOf(n);
  const opposite = HEXAGRAMS[hexagramNumber(lines.map((v) => 1 - v)) - 1];
  const reversed = HEXAGRAMS[hexagramNumber([...lines].reverse()) - 1];
  const nuclear = HEXAGRAMS[nuclearOf(n) - 1];
  let last = null;
  try { last = sessionStorage.getItem('aiching:last'); } catch { /* storage blocked */ }
  const r = { primary: h, trigrams: tri };
  const allLines = h.lines.map((text, i) => `
      <article class="line-card" id="line-${i + 1}">
        <div class="line-badge">${hexLines(lines, { changing: [i], values: lines.map((v) => (v ? 9 : 6)), small: true })}</div>
        <div><h3>${esc(lineName(i, lines[i] === 1))}</h3><p>${esc(text)}</p></div>
      </article>`).reverse().join('');
  const related = [
    miniHex(nuclear, 'Hidden within', 'The nuclear hexagram, made of the inner lines: what works quietly beneath the surface.'),
    opposite.n !== n && miniHex(opposite, 'Its opposite', 'Every line changed: the other side of this situation.'),
    reversed.n !== n && reversed.n !== opposite.n && miniHex(reversed, 'Seen from the other side', 'The hexagram turned upside down: the same matter as the other party sees it.'),
  ].filter(Boolean).join('');
  const grid = HEXAGRAMS.map((x) => `<a class="hex-cell${x.n === n ? ' current' : ''}" href="${hexHref(x.n)}" title="${x.n}. ${esc(x.name)}"><span class="cell-sym">${symbolOf(x.n)}</span><span class="cell-n">${x.n}</span><span class="cell-zh" lang="zh">${esc(x.zh)}</span></a>`).join('');
  const prev = HEXAGRAMS[(n + 62) % 64];
  const next = HEXAGRAMS[n % 64];

  root.innerHTML = `
    <div class="reading-bg" aria-hidden="true"></div>
    <div class="reading-inner">
      <nav class="hex-nav">
        ${last ? `<a href="${esc(last)}" class="back">← Back to your reading</a>` : '<a href="./" class="back">← Ask a question</a>'}
        <span><a href="${hexHref(prev.n)}">‹ ${prev.n}. ${esc(prev.name)}</a> · <a href="${hexHref(next.n)}">${next.n}. ${esc(next.name)} ›</a></span>
      </nav>
      ${heroHTML(h)}
      <p class="essence">${esc(h.essence)}</p>
      <section class="sec">${SECTIONS.judgment(r)}</section>
      <div class="divider" aria-hidden="true"></div>
      <section class="sec">${sectionHead('爻', 'The six lines', 'Top line first. In a reading, only the changing lines are read.')}<div class="lines-list">${allLines}</div></section>
      <div class="divider" aria-hidden="true"></div>
      <section class="sec">${SECTIONS.trigrams(r)}</section>
      <div class="divider" aria-hidden="true"></div>
      <section class="sec">${sectionHead('變', 'Related hexagrams')}<div class="mini-grid">${related}</div></section>
      <div class="divider" aria-hidden="true"></div>
      <section class="sec">${sectionHead('易', 'All sixty-four')}<div class="hex-grid">${grid}</div></section>
      <form class="prompt follow" id="again-form" autocomplete="off">
        <label class="visually-hidden" for="again">Ask a question</label>
        <textarea id="again" rows="1" maxlength="600" placeholder="Ask your own question…" required></textarea>
        <div class="prompt-bar"><span class="hint">Hexagram ${n}: ${esc(h.name)}</span>
          <span class="actions"><button class="send" type="submit" aria-label="Cast the coins"><span lang="zh" aria-hidden="true">卜</span></button></span></div>
      </form>
    </div>`;
  wirePrompt($('#again-form', root), $('#again', root));
  wireLines(root, h);
  document.title = `${n}. ${h.zh} ${h.name} · Ai-Ching`;
}

const SOURCE_NOTE = {
  chrome: "Written by Chrome's built-in AI, on your device.",
  'workers-ai': 'Written by AI (Workers AI). The reading below comes from the I Ching texts.',
};

async function showOpening(root, r, token) {
  const box = $('[data-ai]', root);
  if (!box || !aiEnabled()) return;
  const textEl = $('.oracle-text', box);
  const note = $('.oracle-note', box);
  box.hidden = false;
  const out = await aiOpening(r, {
    onText: (t) => { if (token === castToken && t) textEl.textContent = t; },
  });
  if (token !== castToken) return;
  if (!out) { box.hidden = true; return; }
  textEl.textContent = out.text;
  note.innerHTML = `${esc(SOURCE_NOTE[out.source] || '')} <button type="button" class="link" data-ai-off>Turn off</button>`;
  note.hidden = false;
  $('[data-ai-off]', note).addEventListener('click', () => { setAiEnabled(false); box.hidden = true; syncAiToggle(); });
}

function syncAiToggle() {
  const t = $('#ai-toggle');
  if (t) t.checked = aiEnabled();
}

function show(view) {
  document.body.classList.toggle('is-home', view === 'home');
  document.body.classList.toggle('is-reading', view === 'reading');
  $('#home').hidden = view !== 'home';
  $('#reading').hidden = view !== 'reading';
  window.scrollTo({ top: 0 });
}

function parseHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  const q = p.get('q');
  const d = p.get('d');
  if (q) return { q, d: /^\d{4}-\d{2}-\d{2}$/.test(d || '') ? d : dayKey() };
  const n = Number(p.get('h'));
  return Number.isInteger(n) && n >= 1 && n <= 64 ? { h: n } : null;
}

function route() {
  const st = parseHash();
  if (!st) { document.title = 'Ai-Ching'; show('home'); return; }
  if (st.h) renderHexagram(st.h);
  else renderReading(st.q, st.d);
  show('reading');
}

// The casting ceremony: six throws of three coins, the lines built upward.
async function ceremony(question) {
  const day = dayKey();
  const r = buildReading(question, HEXAGRAMS, new Date());
  const box = $('#casting');
  const list = $('.casting-lines', box);
  const coins = [...box.querySelectorAll('.coin')];
  $('.casting-q', box).textContent = `“${question}”`;
  list.innerHTML = '';
  box.hidden = false;
  let skipped = reduceMotion;
  const skip = () => { skipped = true; };
  $('.skip', box).addEventListener('click', skip, { once: true });
  const wait = (ms) => new Promise((res) => setTimeout(res, skipped ? 0 : ms));
  for (let i = 0; i < 6; i++) {
    coins.forEach((c) => { c.className = 'coin spin'; });
    await wait(520);
    r.throws[i].coins.forEach((v, k) => { coins[k].className = `coin ${v === 3 ? 'heads' : 'tails'}`; });
    const v = r.values[i];
    const li = document.createElement('li');
    li.className = `ln ${v === 7 || v === 9 ? 'yang' : 'yin'}${v === 6 || v === 9 ? ' moving' : ''}`;
    li.innerHTML = `<span class="bar"></span><span class="bar"></span><span class="val">${v}</span>`;
    list.prepend(li);
    await wait(380);
  }
  await wait(450);
  box.hidden = true;
  return day;
}

async function ask(question) {
  question = question.trim();
  if (!question) return;
  const day = await ceremony(question);
  const hash = `#${new URLSearchParams({ q: question, d: day })}`;
  if (location.hash === hash) route();
  else location.hash = hash;
}

function autosize(t) {
  t.style.height = 'auto';
  t.style.height = `${Math.min(t.scrollHeight, 240)}px`;
}

const MIC_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

// A microphone button beside the send button, when the browser can listen.
function wireMic(form, area) {
  const send = $('.send', form);
  if (!voiceMode() || !send || $('.mic', form)) return;
  const mic = document.createElement('button');
  mic.type = 'button';
  mic.className = 'mic';
  mic.setAttribute('aria-label', 'Speak your question');
  mic.setAttribute('aria-pressed', 'false');
  mic.innerHTML = MIC_ICON;
  send.before(mic);
  const status = document.createElement('p');
  status.className = 'mic-status';
  status.setAttribute('aria-live', 'polite');
  status.hidden = true;
  form.append(status);
  let stop = null;
  let before = '';
  const setState = (state, msg) => {
    mic.classList.toggle('listening', state === 'listening');
    mic.classList.toggle('working', state === 'working');
    mic.setAttribute('aria-pressed', String(state === 'listening'));
    status.hidden = !msg && state !== 'listening' && state !== 'working';
    status.textContent = msg || (state === 'listening' ? 'Listening… speak your question, then pause.' : state === 'working' ? 'Writing down your words…' : '');
    status.classList.toggle('error', state === 'error');
    if (state === 'idle' || state === 'error') {
      stop = null;
      if (state === 'idle') { area.focus(); area.setSelectionRange(area.value.length, area.value.length); }
    }
  };
  mic.addEventListener('click', () => {
    if (stop) { stop(); return; }
    before = area.value;
    stop = listen({
      onText: (t) => { area.value = joinText(before, t); autosize(area); },
      onState: setState,
    });
  });
  form.addEventListener('submit', () => { if (stop) stop(); });
}

function wirePrompt(form, area) {
  wireMic(form, area);
  area.addEventListener('input', () => autosize(area));
  area.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); }
  });
  form.addEventListener('submit', (e) => { e.preventDefault(); ask(area.value); area.value = ''; autosize(area); });
}

function applyArt() {
  const vars = { 'ui-icon': '--icon-img', 'ui-home-bg': '--home-bg', 'ui-paper': '--paper', 'ui-result-bg': '--result-bg', 'ui-clouds': '--clouds-img', 'ui-divider': '--divider-img', 'ui-coin-yang': '--coin-heads', 'ui-coin-yin': '--coin-tails', 'ui-yang': '--yang-mask', 'ui-yin': '--yin-mask' };
  for (const [id, v] of Object.entries(vars)) {
    const url = delivered(id);
    if (url) {
      document.documentElement.style.setProperty(v, `url("${url}")`);
      document.documentElement.classList.add(`has-${id}`);
    }
  }
  for (const img of document.querySelectorAll('img[data-asset]')) {
    const url = delivered(img.dataset.asset);
    if (url) { img.src = url; img.parentElement.classList.add('has-art'); } else img.remove();
  }
  const icon = delivered('ui-icon');
  if (icon) $('#favicon').href = icon;
}

async function start() {
  const [hex, assets] = await Promise.all([
    fetch('data/hexagrams.json').then((r) => r.json()),
    fetch('data/asset-list.json').then((r) => r.json()).catch(() => ({})),
  ]);
  HEXAGRAMS = hex;
  setAssets(assets);
  applyArt();

  wirePrompt($('#ask-form'), $('#question'));
  for (const b of document.querySelectorAll('.suggestions button')) {
    b.addEventListener('click', () => { $('#question').value = b.textContent; autosize($('#question')); $('#question').focus(); });
  }
  const toggle = $('#ai-toggle');
  syncAiToggle();
  toggle?.addEventListener('change', () => setAiEnabled(toggle.checked));
  for (const b of document.querySelectorAll('[data-open]')) b.addEventListener('click', () => $(`#${b.dataset.open}`).showModal());
  window.addEventListener('hashchange', route);
  route();
  if (!parseHash()) $('#question').focus({ preventScroll: true });
}

start();
