// Hero select / party. Players join like the original: the keyboard + mouse
// player (or touch), and controllers pressing A or Start (up to 4). Each
// player picks a hero. A single player also picks up to two companions who
// follow as AI and can be switched to in play.
//   confirm -> game.beginSession([{ device, hero }], { companions: [heroId] })
import { h, padSnap } from './ui.js';
import { HEROES, HERO_IDS } from '../heroes/index.js';
import { PLAYER_COLORS } from '../entities/player.js';
import { isMobile } from '../util.js';

const ALL = Object.keys(HEROES);
const devName = (d) => (d === 'kbm' ? 'Keyboard' : d === 'touch' ? 'Touch' : 'Controller ' + (+d.slice(3) + 1));
const lockText = (id) => 'Coming in ' + (HEROES[id].unlock === 'book3' ? 'book 3' : HEROES[id].unlock === 'book2' ? 'book 2' : 'a later book');

export function openSelect(game) {
  const ui = game.ui;
  const ids = HERO_IDS;
  const dev0 = game.input.lastDevice === 'touch' || isMobile ? 'touch' : game.input.lastDevice?.startsWith('pad') ? game.input.lastDevice : 'kbm';
  const last = ids.indexOf(game.save.data.lastHero);
  const slots = game.selectSlots = [{ device: dev0, char: last < 0 ? 0 : last, ready: false, row: 0 }];
  let comps = [null, null], compsAuto = true;

  const heroOf = (s) => ids[s.char];
  const defaults = (hero) => { const i = ids.indexOf(hero); return [1, 2].map((k) => ids[(i + k) % ids.length]).filter((x) => x !== hero); };
  const fixComps = (hero, oldHero) => {
    if (compsAuto) { const d = defaults(hero); comps = [d[0] ?? null, d[1] ?? null]; return; }
    comps = comps.map((c) => (c === hero ? (oldHero && oldHero !== hero ? oldHero : null) : c));
    if (comps[0] && comps[0] === comps[1]) comps[1] = null;
  };
  fixComps(heroOf(slots[0]));
  const solo = () => slots.length === 1;

  const view = () => game.enterSelectView?.(slots);
  const redraw = () => ui.refresh('select');
  const changeHero = (s, dir) => {
    const old = heroOf(s);
    s.char = (s.char + dir + ids.length) % ids.length; s.ready = false;
    if (s === slots[0]) fixComps(heroOf(s), old);
    game.audio?.ui('move'); view(); redraw();
  };
  const setHero = (s, i) => { const old = heroOf(s); s.char = i; s.ready = false; if (s === slots[0]) fixComps(heroOf(s), old); game.audio?.ui('move'); view(); redraw(); };
  const compOptions = (j) => [...ids.filter((x) => x !== heroOf(slots[0]) && x !== comps[1 - j]), null];
  const changeComp = (j, dir) => {
    const opts = compOptions(j); const i = opts.indexOf(comps[j]);
    comps[j] = opts[(i + dir + opts.length) % opts.length]; compsAuto = false; game.audio?.ui('move'); redraw();
  };
  const back = () => { ui.close('select'); game.exitSelectView?.(); if (game.toTitle) game.toTitle(); else import('./title.js').then((m) => m.openTitle(game)); };
  const begin = () => {
    ui.close('select');
    game.save.data.lastHero = heroOf(slots[0]); game.save.write();
    game.exitSelectView?.();
    const companions = solo() ? comps.filter(Boolean) : [];
    game.beginSession(slots.map((s) => ({ device: s.device, hero: heroOf(s) })), { companions });
  };
  const join = (device) => {
    if (slots.length >= 4 || slots.some((s) => s.device === device)) return;
    const used = new Set(slots.map(heroOf));
    const c = ids.findIndex((x) => !used.has(x));
    slots.push({ device, char: c < 0 ? slots.length % ids.length : c, ready: false, row: 0 });
    game.audio?.ui('buy'); view(); redraw();
  };
  const leave = (s) => { slots.splice(slots.indexOf(s), 1); slots[0].row = 0; fixComps(heroOf(slots[0])); view(); redraw(); };
  // one event from one player's device
  const act = (s, ev) => {
    const i = slots.indexOf(s);
    if (ev === 'left' || ev === 'right') { const dir = ev === 'left' ? -1 : 1; if (solo() && s.row > 0) changeComp(s.row - 1, dir); else changeHero(s, dir); }
    else if ((ev === 'up' || ev === 'down') && solo()) { s.row = Math.max(0, Math.min(2, s.row + (ev === 'up' ? -1 : 1))); game.audio?.ui('move'); redraw(); }
    else if (ev === 'a') { if (s.ready && i === 0) begin(); else { s.ready = !s.ready; game.audio?.ui(s.ready ? 'buy' : 'back'); redraw(); } }
    else if (ev === 'b') { if (s.ready) { s.ready = false; redraw(); } else if (i === 0) back(); else leave(s); }
    else if (ev === 'start' && i === 0) begin();
  };

  const chip = (id, s, i) => {
    const info = HEROES[id], idx = ids.indexOf(id);
    if (idx < 0) return h('span', { class: 'chip locked', title: lockText(id), 'aria-label': `${info.name}: ${lockText(id)}` }, h('i', { style: '--c:#555' }, '🔒'));
    return h('button', { class: 'chip' + (s.char === idx ? ' on' : ''), title: info.name, 'aria-label': info.name, 'aria-pressed': String(s.char === idx), style: `--c:${info.color}`, onclick: () => setHero(s, idx) }, h('i', {}, info.name[0]));
  };
  const compRow = (j, s) => {
    const id = comps[j], info = id ? HEROES[id] : null;
    return h('button', { class: 'comp' + (s.row === j + 1 ? ' cur' : ''), 'aria-label': `Companion ${j + 1}: ${info?.name ?? 'none'}`, onclick: () => changeComp(j, 1) },
      h('i', { class: 'pt', style: `--c:${info?.color ?? '#555'}` }, info ? info.name[0] : '–'), h('span', { class: 'cn2' }, info ? info.name : 'No one'), h('span', { class: 'sub' }, info ? info.title : 'Go it alone'), h('em', {}, '⟳'));
  };

  const render = (el) => {
    const cards = h('div', { class: 'slots' });
    for (let i = 0; i < 4; i++) {
      const s = slots[i], pc = PLAYER_COLORS[i];
      if (!s) {
        cards.appendChild(h('div', { class: 'slot empty-slot', style: `--pc:${pc}` }, h('div', { class: 'pn' }, `Player ${i + 1}`),
          h('div', { class: 'empty' }, isMobile ? '—' : 'Press A or Start on a controller to join'),
          !slots.some((x) => x.device === 'kbm') && !isMobile ? h('button', { class: 'btn small', onclick: () => join('kbm') }, 'Join with keyboard') : null));
        continue;
      }
      const id = heroOf(s), info = HEROES[id];
      cards.appendChild(h('div', { class: 'slot joined' + (s.ready ? ' ready' : ''), style: `--pc:${pc};--hc:${info.color}` },
        h('div', { class: 'pn' }, `Player ${i + 1} · ${devName(s.device)}`),
        h('div', { class: 'cn', style: `color:${info.color}` }, info.full ?? info.name),
        h('div', { class: 'ct' }, info.title),
        h('div', { class: 'cp' }, `Parent: ${info.parent}`),
        h('div', { class: 'cd' }, info.desc),
        h('div', { class: 'cg' }, h('b', {}, 'Godly power '), info.power),
        h('div', { class: 'chips', role: 'group', 'aria-label': 'Choose a hero' }, ...ALL.map((x) => chip(x, s, i))),
        h('div', { class: 'arrows' },
          h('button', { class: 'btn small', 'aria-label': 'Previous hero', onclick: () => changeHero(s, -1) }, '◀'),
          h('button', { class: 'btn small' + (s.ready ? ' primary' : ''), onclick: () => (s.ready && i === 0 ? begin() : act(s, 'a')) }, s.ready ? (i === 0 ? 'Ready: begin' : 'Ready ✓') : 'Ready'),
          h('button', { class: 'btn small', 'aria-label': 'Next hero', onclick: () => changeHero(s, 1) }, '▶')),
        i > 0 ? h('button', { class: 'linkbtn', onclick: () => leave(s) }, 'Leave') : null));
    }
    const soon = ALL.filter((x) => ids.indexOf(x) < 0);
    const party = solo() ? h('div', { class: 'party' }, h('h3', {}, 'Your party'),
      h('div', { class: 'hint', style: 'margin:0 0 6px' }, 'Companions follow you as allies. Switch to one in play with D-pad ↓ or Tab.'),
      h('div', { class: 'comps' }, compRow(0, slots[0]), compRow(1, slots[0]))) : null;
    el.appendChild(h('div', { class: 'select-wrap' },
      h('div', { class: 'select-top' }, h('span', {}, 'Choose Your Hero')),
      h('div', { class: 'select-mid', 'aria-hidden': 'true' }),
      h('div', { class: 'select-low' }, cards, party,
        h('div', { class: 'select-foot' },
          h('button', { class: 'btn', onclick: back }, 'Back'),
          h('div', { class: 'hint', style: 'margin:0;text-align:center' },
            soon.length ? h('div', {}, '🔒 ' + soon.map((x) => HEROES[x].name).join(' · ') + ': ' + lockText(soon[0])) : null,
            h('div', {}, '◀ ▶ hero' + (solo() ? ' · ▲ ▼ companions' : '') + ' · A ready · B back · Start begin')),
          h('button', { class: 'btn primary', onclick: begin }, 'Begin the Quest ▶')))));
  };

  // Buttons held when this screen opens (e.g. the one that started the game)
  // must not count as presses.
  let prev = padSnap(game);
  view();
  ui.open('select', render, {
    onNav: (m) => {
      const kb = m.keyboard;
      let ks = slots.find((s) => s.device === 'kbm') ?? (dev0 === 'touch' ? null : null);
      if (kb.confirm && !ks && !slots.some((s) => s.device === 'kbm')) join('kbm');
      else if (ks) for (const [k, ev] of [['left', 'left'], ['right', 'right'], ['up', 'up'], ['down', 'down'], ['confirm', 'a'], ['back', 'b']]) if (kb[k] && slots.includes(ks)) act(ks, ev);
      if (ui.top()?.id !== 'select') return;
      const cur = padSnap(game);
      for (const [id, c] of cur) {
        const p = prev.get(id) ?? { b: [], l: false, r: false, u: false, d: false };
        const s = slots.find((x) => x.device === id);
        const a = c.b[0] && !p.b[0], st = c.b[9] && !p.b[9];
        if (!s) { if ((a || st) && slots.length < 4) join(id); continue; }
        if (c.l && !p.l) act(s, 'left'); if (c.r && !p.r) act(s, 'right');
        if (c.u && !p.u) act(s, 'up'); if (c.d && !p.d) act(s, 'down');
        if (ui.top()?.id !== 'select') return;
        if (a) act(s, 'a');
        if (ui.top()?.id !== 'select') return;
        if (c.b[1] && !p.b[1]) act(s, 'b');
        if (ui.top()?.id !== 'select') return;
        if (st) act(s, 'start');
        if (ui.top()?.id !== 'select') return;
      }
      prev = cur;
      // the screen is driven here, never by shared focus
      m.up = m.down = m.left = m.right = m.confirm = m.back = m.start = false;
    },
    onBack: () => { /* handled in onNav */ },
  });
}
