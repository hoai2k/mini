// Hero select / party. Players join like the original: the keyboard + mouse
// player (or touch), and controllers pressing A or Start (up to 4). Each
// player picks a hero and a profile (their saved progress: the first player
// is this device's main profile, the others "Player 2", "Player 3"… or any
// other; X on a controller cycles it). With one player there are two
// companions to choose, with two players one (the third hero, which either
// can swap into in play); three or four play without companions.
// "Play online" (Y) begins and opens the Iris-message lobby straight away.
//   confirm -> game.beginSession([{ device, hero, profile }], { companions: [heroId] })
import { h, padSnap, toast } from './ui.js';
import { HEROES, HERO_IDS } from '../heroes/index.js';
import { PLAYER_COLORS } from '../entities/player.js';
import { isMobile } from '../util.js';
import { openStart } from './saves.js';

const ALL = Object.keys(HEROES);
const devName = (d) => (d === 'kbm' ? 'Keyboard' : d === 'touch' ? 'Touch' : 'Controller ' + (+d.slice(3) + 1));
const lockText = (id) => 'Coming in ' + (HEROES[id].unlock === 'book3' ? 'book 3' : HEROES[id].unlock === 'book2' ? 'book 2' : 'a later book');

export function openSelect(game, { skipStart = false } = {}) {
  const ui = game.ui;
  const ids = HERO_IDS;
  const dev0 = game.input.lastDevice === 'touch' || isMobile ? 'touch' : game.input.lastDevice?.startsWith('pad') ? game.input.lastDevice : 'kbm';
  // somewhere to continue from: Continue (the default), Return to camp, New game
  if (!skipStart && game.resume?.load()) {
    openStart(game, { onPlay: ({ resume }) => {
      if (!resume) { openSelect(game, { skipStart: true }); return; }
      const { hero, companions } = game.resume.partyOf(resume);
      game.beginSession([{ device: dev0, hero, profile: game.save.id }], { companions });
      game.resume.apply(resume);
    } });
    return;
  }
  const P = game.profiles;
  const last = ids.indexOf(game.save.data.lastHero);
  const slots = game.selectSlots = [{ device: dev0, char: last < 0 ? 0 : last, ready: false, row: 0, prof: P.main.id }];
  let comps = [null, null], compsAuto = true;

  const heroOf = (s) => ids[s.char];
  const compRows = () => (slots.length === 1 ? 2 : slots.length === 2 ? 1 : 0);
  const taken = () => new Set(slots.map(heroOf));
  const defaults = () => { const used = taken(); const i = ids.indexOf(heroOf(slots[0])); return [1, 2, 3, 4, 5].map((k) => ids[(i + k) % ids.length]).filter((x) => !used.has(x)); };
  // keep the companions valid: never a hero a player has, never twice
  const fixComps = () => {
    const used = taken();
    if (compsAuto) { const d = defaults(); comps = [d[0] ?? null, d[1] ?? null]; }
    comps = comps.map((c) => (c && used.has(c) ? null : c));
    if (comps[0] && comps[0] === comps[1]) comps[1] = null;
  };
  fixComps();
  const solo = () => slots.length === 1;

  const view = () => game.enterSelectView?.(slots);
  const redraw = () => ui.refresh('select');
  const changeHero = (s, dir) => { s.char = (s.char + dir + ids.length) % ids.length; s.ready = false; fixComps(); game.audio?.ui('move'); view(); redraw(); };
  const setHero = (s, i) => { s.char = i; s.ready = false; fixComps(); game.audio?.ui('move'); view(); redraw(); };
  const compOptions = (j) => [...ids.filter((x) => !taken().has(x) && x !== comps[1 - j]), null];
  const changeComp = (j, dir) => {
    const opts = compOptions(j); const i = opts.indexOf(comps[j]);
    comps[j] = opts[(i + dir + opts.length) % opts.length]; compsAuto = false; game.audio?.ui('move'); redraw();
  };
  // profiles: the ones nobody else on this screen is using, then "a new one"
  const profName = (s) => (s.prof === 'new' ? 'New profile' : P.profile(s.prof)?.name ?? 'Player');
  const cycleProfile = (s) => {
    const used = new Set(slots.filter((x) => x !== s).map((x) => x.prof));
    const opts = [...P.list().map((p) => p.id).filter((id) => !used.has(id)), 'new'];
    const i = opts.indexOf(s.prof);
    const next = opts[(i + 1) % opts.length];
    s.prof = next;   // ('new' is made when the quest begins)
    s.ready = false; game.audio?.ui('move'); redraw();
  };
  const back = () => { ui.close('select'); game.exitSelectView?.(); if (game.toTitle) game.toTitle(); else import('./title.js').then((m) => m.openTitle(game)); };
  const begin = (online = false) => {
    ui.close('select');
    game.save.data.lastHero = heroOf(slots[0]); game.save.write();
    game.exitSelectView?.();
    const companions = comps.slice(0, compRows()).filter(Boolean);
    game.beginSession(slots.map((s) => ({ device: s.device, hero: heroOf(s), profile: s.prof === 'new' ? P.create().id : s.prof })), { companions });
    if (online) import('../net/lobby.js').then((m) => m.openOnline(game));
  };
  const join = (device) => {
    if (slots.length >= 4 || slots.some((s) => s.device === device)) return;
    const used = taken();
    const c = ids.findIndex((x) => !used.has(x));
    const usedProf = new Set(slots.map((s) => s.prof));
    let prof = P.slotDefault(slots.length);
    slots.push({ device, char: c < 0 ? slots.length % ids.length : c, ready: false, row: 0, prof: usedProf.has(prof.id) ? 'new' : prof.id });
    fixComps(); slots[0].row = Math.min(slots[0].row, compRows());
    game.audio?.ui('buy'); view(); redraw();
  };
  const leave = (s) => { slots.splice(slots.indexOf(s), 1); slots[0].row = 0; fixComps(); view(); redraw(); };
  // one event from one player's device
  const act = (s, ev) => {
    const i = slots.indexOf(s);
    if (ev === 'left' || ev === 'right') { const dir = ev === 'left' ? -1 : 1; if (i === 0 && s.row > 0) changeComp(s.row - 1, dir); else changeHero(s, dir); }
    else if ((ev === 'up' || ev === 'down') && i === 0 && compRows()) { s.row = Math.max(0, Math.min(compRows(), s.row + (ev === 'up' ? -1 : 1))); game.audio?.ui('move'); redraw(); }
    else if (ev === 'a') { if (s.ready && i === 0) begin(); else { s.ready = !s.ready; game.audio?.ui(s.ready ? 'buy' : 'back'); redraw(); } }
    else if (ev === 'b') { if (s.ready) { s.ready = false; redraw(); } else if (i === 0) back(); else leave(s); }
    else if (ev === 'x') cycleProfile(s);
    else if (ev === 'y' && i === 0) begin(true);
    else if (ev === 'start' && i === 0) begin();
  };

  const chip = (id, s) => {
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
      const prof = s.prof === 'new' ? null : P.profile(s.prof);
      cards.appendChild(h('div', { class: 'slot joined' + (s.ready ? ' ready' : ''), style: `--pc:${pc};--hc:${info.color}` },
        h('div', { class: 'pn' }, `Player ${i + 1} · ${devName(s.device)}`),
        h('button', { class: 'linkbtn prof', title: 'Profile: saved progress (X on a controller to change)', 'aria-label': `Profile ${profName(s)}, change`, onclick: () => cycleProfile(s) }, `👤 ${profName(s)} · Lv ${prof?.data.level ?? 1} ⟳`),
        h('img', { class: 'hero-art', src: `assets/heroes/${id}-card.jpg`, alt: '', onerror: (e) => e.target.remove() }),
        h('div', { class: 'cn', style: `color:${info.color}` }, info.full ?? info.name),
        h('div', { class: 'ct' }, info.title),
        h('div', { class: 'cp' }, `Parent: ${info.parent}`),
        h('div', { class: 'cd' }, info.desc),
        h('div', { class: 'cg' }, h('b', {}, 'Godly power '), info.power),
        h('div', { class: 'chips', role: 'group', 'aria-label': 'Choose a hero' }, ...ALL.map((x) => chip(x, s))),
        h('div', { class: 'arrows' },
          h('button', { class: 'btn small', 'aria-label': 'Previous hero', onclick: () => changeHero(s, -1) }, '◀'),
          h('button', { class: 'btn small' + (s.ready ? ' primary' : ''), onclick: () => (s.ready && i === 0 ? begin() : act(s, 'a')) }, s.ready ? (i === 0 ? 'Ready: begin' : 'Ready ✓') : 'Ready'),
          h('button', { class: 'btn small', 'aria-label': 'Next hero', onclick: () => changeHero(s, 1) }, '▶')),
        i > 0 ? h('button', { class: 'linkbtn', onclick: () => leave(s) }, 'Leave') : null));
    }
    const soon = ALL.filter((x) => ids.indexOf(x) < 0);
    const n = compRows();
    const party = n ? h('div', { class: 'party' }, h('h3', {}, n === 2 ? 'Your party' : 'The third hero'),
      h('div', { class: 'hint', style: 'margin:0 0 6px' }, n === 2 ? 'Companions follow you as allies. Switch to one in play with D-pad ↓ or Tab.' : 'An AI companion fights alongside you both. Either of you can swap into it with D-pad ↓ or Tab.'),
      h('div', { class: 'comps' }, ...[0, 1].slice(0, n).map((j) => compRow(j, slots[0])))) : null;
    el.appendChild(h('div', { class: 'select-wrap' },
      h('div', { class: 'select-top' }, h('span', {}, 'Choose Your Hero')),
      h('div', { class: 'select-mid', 'aria-hidden': 'true' }),
      h('div', { class: 'select-low' }, cards, party,
        h('div', { class: 'select-foot' },
          h('button', { class: 'btn', onclick: back }, 'Back'),
          h('button', { class: 'btn', onclick: () => openProfiles(game, redraw) }, 'Profiles'),
          h('div', { class: 'hint', style: 'margin:0;text-align:center' },
            soon.length ? h('div', {}, '🔒 ' + soon.map((x) => HEROES[x].name).join(' · ') + ': ' + lockText(soon[0])) : null,
            h('div', {}, '◀ ▶ hero' + (n ? ' · ▲ ▼ companions' : '') + ' · X profile · A ready · Y online · Start begin')),
          h('button', { class: 'btn', onclick: () => begin(true) }, 'Play online'),
          h('button', { class: 'btn primary', onclick: () => begin() }, 'Begin the Quest ▶')))));
  };

  let prev = padSnap(game);
  view();
  ui.open('select', render, {
    onNav: (m) => {
      const kb = m.keyboard;
      const ks = slots.find((s) => s.device === 'kbm');
      if (kb.confirm && !ks && !slots.some((s) => s.device === 'kbm')) join('kbm');
      else if (ks) for (const [k, ev] of [['left', 'left'], ['right', 'right'], ['up', 'up'], ['down', 'down'], ['confirm', 'a'], ['back', 'b']]) if (kb[k] && slots.includes(ks)) act(ks, ev);
      if (ui.top()?.id !== 'select') return;
      const cur = padSnap(game);
      for (const [id, c] of cur) {
        const p = prev.get(id) ?? { b: [], l: false, r: false, u: false, d: false };
        const s = slots.find((x) => x.device === id);
        const press = (i) => c.b[i] && !p.b[i];
        if (!s) { if ((press(0) || press(9)) && slots.length < 4) join(id); continue; }
        if (c.l && !p.l) act(s, 'left'); if (c.r && !p.r) act(s, 'right');
        if (c.u && !p.u) act(s, 'up'); if (c.d && !p.d) act(s, 'down');
        for (const [i, ev] of [[0, 'a'], [1, 'b'], [2, 'x'], [3, 'y'], [9, 'start']]) {
          if (ui.top()?.id !== 'select') return;
          if (press(i)) act(s, ev);
        }
        if (ui.top()?.id !== 'select') return;
      }
      prev = cur;
      m.up = m.down = m.left = m.right = m.confirm = m.back = m.start = false;
    },
    onBack: () => { /* handled in onNav */ },
  });
}

// Profiles: rename, copy a profile's code to carry it to another device, or
// paste a code from another device (the same profile merges; see profiles.js).
export function openProfiles(game, onDone) {
  const ui = game.ui, P = game.profiles;
  let shown = null, msg = '';
  const close = () => { ui.close('profiles'); onDone?.(); };
  ui.open('profiles', (el) => {
    const panel = h('div', { class: 'panel', style: 'width:min(620px,95vw);max-height:92vh;overflow:auto' }, h('h2', {}, 'Profiles'),
      h('p', { class: 'hint' }, 'Each player’s progress is kept in their profile: level, drachmas, gear for every hero, chapters and the prophecy. To play the same profile on another device, copy its code there and paste it under “Bring a profile here”: progress from both is combined, and nothing is counted twice.'));
    for (const p of P.list()) {
      const name = h('input', { type: 'text', maxlength: '16', value: p.name, 'aria-label': `Name of ${p.name}`, style: 'width:10em' });
      name.addEventListener('keydown', (e) => e.stopPropagation());
      name.addEventListener('change', () => { P.rename(p.id, name.value); });
      panel.appendChild(h('div', { class: 'stat-line', style: 'gap:8px;flex-wrap:wrap;align-items:center' },
        name, h('span', { class: 'hint' }, `Level ${p.level} · ${p.chapters} chapter${p.chapters === 1 ? '' : 's'}${p.main ? ' · this device’s main profile' : ''}`),
        h('button', { class: 'btn small', onclick: () => { shown = p.id; ui.refresh('profiles'); } }, 'Code'),
        !p.main ? h('button', { class: 'btn small danger', onclick: () => { P.remove(p.id); ui.refresh('profiles'); } }, 'Remove') : null));
      if (shown === p.id) {
        const code = P.exportCode(p.id);
        const ta = h('textarea', { readonly: true, rows: 3, style: 'width:100%;font-size:11px', 'aria-label': 'Profile code' }); ta.value = code;
        panel.appendChild(ta);
        panel.appendChild(h('button', { class: 'btn small', onclick: () => { navigator.clipboard?.writeText(code).then(() => toast('Copied'), () => { ta.select(); }); } }, 'Copy'));
      }
    }
    panel.appendChild(h('h3', {}, 'Bring a profile here'));
    const paste = h('textarea', { rows: 3, placeholder: 'HBQ2.…', style: 'width:100%;font-size:11px', 'aria-label': 'Paste a profile code' });
    paste.addEventListener('keydown', (e) => e.stopPropagation());
    panel.appendChild(paste);
    panel.appendChild(h('div', { class: 'row', style: 'gap:8px;justify-content:space-between;margin-top:8px' },
      h('button', { class: 'btn small', onclick: () => {
        const r = P.importCode(paste.value);
        msg = !r ? 'That isn’t a profile code.' : r.merged ? `Combined with ${r.save.name}.` : `Added ${r.save.name}.`;
        if (r) for (const q of game.players) if (!q.remote) q.refreshLoadout?.();
        ui.refresh('profiles');
      } }, 'Bring it here'),
      h('span', { class: 'hint', 'aria-live': 'polite' }, msg),
      h('button', { class: 'btn', 'data-autofocus': true, onclick: close }, 'Done')));
    el.appendChild(panel);
  }, { dim: true, onBack: close });
}
