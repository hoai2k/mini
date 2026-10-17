// Hero select / party. Players join like the original: the keyboard + mouse
// player (or touch), and controllers pressing A or Start (up to 4). Each
// player picks a hero and a profile (their saved progress: the first player
// is this device's main profile, the others "Player 2", "Player 3"… or any
// other; X on a controller cycles it). With one player there are two
// companions to choose, with two players one (the third hero, which either
// can swap into in play); three or four play without companions.
// "Play online" (Y) begins and opens the Iris-message lobby straight away.
// A save that hasn't finished the opening plays it as the story goes
// (partyRules.js): player 1 is Percy, player 2 Grover, then Annabeth and
// Clarisse, with no companions and no other heroes to pick. After it, each
// player picks any hero they have unlocked.
//   confirm -> game.beginSession([{ device, hero, profile }], { companions: [heroId] })
import { h, padSnap, toast } from './ui.js';
import { HEROES, HERO_IDS } from '../heroes/index.js';
import { PLAYER_COLORS } from '../entities/player.js';
import { isMobile } from '../util.js';
import { openStart } from './saves.js';
import { selectOptions, STORY_HEROES } from '../partyRules.js';
import { t as tx, tn } from '../text_config.js';

const ALL = Object.keys(HEROES);
const devName = (d) => (d === 'kbm' ? tx('heroSelect.device.keyboard') : d === 'touch' ? tx('heroSelect.device.touch') : tx('heroSelect.device.controller', { n: +d.slice(3) + 1 }));
const lockText = (id) => { const u = HEROES[id].unlock, ch = /^ch(\d+)$/.exec(u ?? ''); return ch ? tx('heroSelect.lock.chapter', { n: ch[1] }) : u === 'book3' ? tx('heroSelect.lock.book3') : u === 'book2' ? tx('heroSelect.lock.book2') : tx('heroSelect.lock.later'); };

export function openSelect(game, { skipStart = false } = {}) {
  const ui = game.ui;
  const ids = HERO_IDS;
  const dev0 = game.input.lastDevice === 'touch' || isMobile ? 'touch' : game.input.lastDevice?.startsWith('pad') ? game.input.lastDevice : 'kbm';
  // somewhere to continue from: Continue (the default), Return to camp, New game
  if (!skipStart && game.resume?.load()) {
    openStart(game, { onPlay: ({ resume }) => {
      if (!resume) { openSelect(game, { skipStart: true }); return; }
      // (Continue into the opening: Percy alone, the story party; partyRules.js)
      const opening = !game.opening.done && (resume.kind === 'opening' || !!resume.def?.opening);
      const { hero, companions } = game.resume.partyOf(resume);
      game.beginSession([{ device: dev0, hero: opening ? STORY_HEROES[0] : hero, profile: game.save.id }], { companions: opening ? [] : companions, opening });
      game.resume.apply(resume);
    } });
    return;
  }
  const P = game.profiles;
  // the opening: each slot plays its story hero; after it, the unlocked heroes
  const opening = !game.opening?.done;
  const unlocked = (id) => game.heroUnlocked?.(id) ?? true;
  const allowed = (i) => selectOptions(i, { opening, ids, unlocked });
  const firstFree = (i, used) => allowed(i).find((x) => !used.has(x)) ?? allowed(i)[0] ?? ids[0];
  const last = allowed(0).includes(game.save.data.lastHero) ? ids.indexOf(game.save.data.lastHero) : ids.indexOf(firstFree(0, new Set()));
  const slots = game.selectSlots = [{ device: dev0, char: last < 0 ? 0 : last, ready: false, row: 0, prof: P.main.id }];
  let comps = [null, null], compsAuto = true;

  const heroOf = (s) => ids[s.char];
  // (in the opening: player i is the story's hero i, whoever leaves)
  const storyFix = () => { if (opening) slots.forEach((s, i) => { s.char = ids.indexOf(allowed(i)[0]); }); };
  const compRows = () => (opening ? 0 : slots.length === 1 ? 2 : slots.length === 2 ? 1 : 0);
  const taken = () => new Set(slots.map(heroOf));
  const defaults = () => { const used = taken(); const i = ids.indexOf(heroOf(slots[0])); return [1, 2, 3, 4, 5].map((k) => ids[(i + k) % ids.length]).filter((x) => !used.has(x) && unlocked(x)); };
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
  const changeHero = (s, dir) => {
    const opts = allowed(slots.indexOf(s)); if (opts.length < 2) return;
    const k = opts.indexOf(heroOf(s));
    s.char = ids.indexOf(opts[(k + dir + opts.length) % opts.length]); s.ready = false; fixComps(); game.audio?.ui('move'); view(); redraw();
  };
  const setHero = (s, i) => { if (!allowed(slots.indexOf(s)).includes(ids[i]) || s.char === i) return; s.char = i; s.ready = false; fixComps(); game.audio?.ui('move'); view(); redraw(); };
  const compOptions = (j) => ids.filter((x) => unlocked(x) && !taken().has(x) && x !== comps[1 - j]);   // (the AI always plays whoever is missing)
  const changeComp = (j, dir) => {
    const opts = compOptions(j); const i = opts.indexOf(comps[j]);
    comps[j] = opts[(i + dir + opts.length) % opts.length]; compsAuto = false; game.audio?.ui('move'); redraw();
  };
  // profiles: the ones nobody else on this screen is using, then "a new one"
  const profName = (s) => (s.prof === 'new' ? tx('heroSelect.newProfile') : P.profile(s.prof)?.name ?? tx('heroSelect.defaultProfile'));
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
    storyFix();
    const companions = comps.slice(0, compRows()).filter(Boolean);
    // a save that hasn't finished the opening starts it (or carries on with it); online starts in camp
    game.beginSession(slots.map((s) => ({ device: s.device, hero: heroOf(s), profile: s.prof === 'new' ? P.create().id : s.prof })), { companions, start: online ? 'hub' : 'auto' });
    if (online) import('../net/lobby.js').then((m) => m.openOnline(game));
  };
  const join = (device) => {
    if (slots.length >= 4 || slots.some((s) => s.device === device)) return;
    const used = taken();
    const c = ids.indexOf(firstFree(slots.length, used));
    const usedProf = new Set(slots.map((s) => s.prof));
    let prof = P.slotDefault(slots.length);
    slots.push({ device, char: c < 0 ? slots.length % ids.length : c, ready: false, row: 0, prof: usedProf.has(prof.id) ? 'new' : prof.id });
    storyFix(); fixComps(); slots[0].row = Math.min(slots[0].row, compRows());
    game.audio?.ui('buy'); view(); redraw();
  };
  const leave = (s) => { slots.splice(slots.indexOf(s), 1); slots[0].row = 0; storyFix(); fixComps(); view(); redraw(); };
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
    if (opening && !allowed(slots.indexOf(s)).includes(id)) return null;   // (the story gives each player one hero)
    if (idx < 0 || !unlocked(id)) return h('span', { class: 'chip locked', title: lockText(id), 'aria-label': tx('heroSelect.lockedAria', { name: info.name, lock: lockText(id) }) }, h('i', { style: '--c:#555' }, '🔒'));
    return h('button', { class: 'chip' + (s.char === idx ? ' on' : ''), title: info.name, 'aria-label': info.name, 'aria-pressed': String(s.char === idx), style: `--c:${info.color}`, onclick: () => setHero(s, idx) }, h('i', {}, info.name[0]));
  };
  const compRow = (j, s) => {
    const id = comps[j], info = id ? HEROES[id] : null;
    return h('button', { class: 'comp' + (s.row === j + 1 ? ' cur' : ''), 'aria-label': tx('heroSelect.companionAria', { n: j + 1, name: info?.name ?? tx('heroSelect.none') }), onclick: () => changeComp(j, 1) },
      h('i', { class: 'pt', style: `--c:${info?.color ?? '#555'}` }, info ? info.name[0] : '–'), h('span', { class: 'cn2' }, info ? info.name : tx('heroSelect.noOne')), h('span', { class: 'sub' }, info ? info.title : tx('heroSelect.goAlone')), h('em', {}, '⟳'));
  };

  const render = (el) => {
    const cards = h('div', { class: 'slots' });
    for (let i = 0; i < 4; i++) {
      const s = slots[i], pc = PLAYER_COLORS[i];
      if (!s) {
        cards.appendChild(h('div', { class: 'slot empty-slot', style: `--pc:${pc}` }, h('div', { class: 'pn' }, tx('heroSelect.player', { n: i + 1 })),
          h('div', { class: 'empty' }, isMobile ? '—' : tx('heroSelect.joinHint')),
          !slots.some((x) => x.device === 'kbm') && !isMobile ? h('button', { class: 'btn small', onclick: () => join('kbm') }, tx('heroSelect.joinKeyboard')) : null));
        continue;
      }
      const id = heroOf(s), info = HEROES[id];
      const prof = s.prof === 'new' ? null : P.profile(s.prof);
      cards.appendChild(h('div', { class: 'slot joined' + (s.ready ? ' ready' : ''), style: `--pc:${pc};--hc:${info.color}` },
        h('div', { class: 'pn' }, tx('heroSelect.playerDevice', { n: i + 1, device: devName(s.device) })),
        h('button', { class: 'linkbtn prof', title: tx('heroSelect.profileTitle'), 'aria-label': tx('heroSelect.profileAria', { name: profName(s) }), onclick: () => cycleProfile(s) }, tx('heroSelect.profileLabel', { name: profName(s), level: prof?.data.level ?? 1 })),
        h('img', { class: 'hero-art', src: `assets/heroes/${id}-card.jpg`, alt: '', onerror: (e) => e.target.remove() }),
        h('div', { class: 'cn', style: `color:${info.color}` }, info.full ?? info.name),
        h('div', { class: 'ct' }, info.title),
        h('div', { class: 'cp' }, tx('heroSelect.parent', { parent: info.parent })),
        h('div', { class: 'cd' }, info.desc),
        h('div', { class: 'cg' }, h('b', {}, tx('heroSelect.godlyPower')), info.power),
        opening ? null : h('div', { class: 'chips', role: 'group', 'aria-label': tx('heroSelect.chooseHeroGroup') }, ...ALL.map((x) => chip(x, s))),
        h('div', { class: 'arrows' },
          opening ? null : h('button', { class: 'btn small', 'aria-label': tx('heroSelect.prevHero'), onclick: () => changeHero(s, -1) }, '◀'),
          h('button', { class: 'btn small' + (s.ready ? ' primary' : ''), onclick: () => (s.ready && i === 0 ? begin() : act(s, 'a')) }, s.ready ? (i === 0 ? tx('heroSelect.readyBegin') : tx('heroSelect.readyDone')) : tx('heroSelect.ready')),
          opening ? null : h('button', { class: 'btn small', 'aria-label': tx('heroSelect.nextHero'), onclick: () => changeHero(s, 1) }, '▶')),
        i > 0 ? h('button', { class: 'linkbtn', onclick: () => leave(s) }, tx('heroSelect.leave')) : null));
    }
    const soon = opening ? [] : ALL.filter((x) => ids.indexOf(x) < 0);
    const n = compRows();
    const party = n ? h('div', { class: 'party' }, h('h3', {}, n === 2 ? tx('heroSelect.yourParty') : tx('heroSelect.thirdHero')),
      h('div', { class: 'hint', style: 'margin:0 0 6px' }, n === 2 ? tx('heroSelect.partyHint') : tx('heroSelect.thirdHint')),
      h('div', { class: 'comps' }, ...[0, 1].slice(0, n).map((j) => compRow(j, slots[0])))) : null;
    el.appendChild(h('div', { class: 'select-wrap' },
      h('div', { class: 'select-top' }, h('span', {}, opening ? tx('heroSelect.storyBegins') : tx('heroSelect.chooseHero'))),
      h('div', { class: 'select-mid', 'aria-hidden': 'true' }),
      h('div', { class: 'select-low' }, cards, party,
        h('div', { class: 'select-foot' },
          h('button', { class: 'btn', onclick: back }, tx('common.back')),
          h('button', { class: 'btn', onclick: () => openProfiles(game, redraw) }, tx('heroSelect.profiles')),
          h('div', { class: 'hint', style: 'margin:0;text-align:center' },
            soon.length ? h('div', {}, tx('heroSelect.soon', { names: soon.map((x) => HEROES[x].name).join(' · '), lock: lockText(soon[0]) })) : null,
            opening ? h('div', {}, tx('heroSelect.storyNote')) : null,
            h('div', {}, opening ? tx('heroSelect.controlsOpening') : n ? tx('heroSelect.controlsCompanions') : tx('heroSelect.controls'))),
          h('button', { class: 'btn', onclick: () => begin(true) }, tx('heroSelect.playOnline')),
          h('button', { class: 'btn primary', onclick: () => begin() }, tx('heroSelect.begin'))))));
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
    const panel = h('div', { class: 'panel', style: 'width:min(620px,95vw);max-height:92vh;overflow:auto' }, h('h2', {}, tx('heroSelect.profilesScreen.title')),
      h('p', { class: 'hint' }, tx('heroSelect.profilesScreen.intro')));
    for (const p of P.list()) {
      const name = h('input', { type: 'text', maxlength: '16', value: p.name, 'aria-label': tx('heroSelect.profilesScreen.nameOf', { name: p.name }), style: 'width:10em' });
      name.addEventListener('keydown', (e) => e.stopPropagation());
      name.addEventListener('change', () => { P.rename(p.id, name.value); });
      panel.appendChild(h('div', { class: 'stat-line', style: 'gap:8px;flex-wrap:wrap;align-items:center' },
        name, h('span', { class: 'hint' }, tx('heroSelect.profilesScreen.line', { level: p.level, chapters: tn('heroSelect.profilesScreen.chapters', p.chapters), main: p.main ? tx('heroSelect.profilesScreen.mainSuffix') : '' })),
        h('button', { class: 'btn small', onclick: () => { shown = p.id; ui.refresh('profiles'); } }, tx('heroSelect.profilesScreen.code')),
        !p.main ? h('button', { class: 'btn small danger', onclick: () => { P.remove(p.id); ui.refresh('profiles'); } }, tx('heroSelect.profilesScreen.remove')) : null));
      if (shown === p.id) {
        const code = P.exportCode(p.id);
        const ta = h('textarea', { readonly: true, rows: 3, style: 'width:100%;font-size:11px', 'aria-label': tx('heroSelect.profilesScreen.codeAria') }); ta.value = code;
        panel.appendChild(ta);
        panel.appendChild(h('button', { class: 'btn small', onclick: () => { navigator.clipboard?.writeText(code).then(() => toast(tx('heroSelect.profilesScreen.copied')), () => { ta.select(); }); } }, tx('heroSelect.profilesScreen.copy')));
      }
    }
    panel.appendChild(h('h3', {}, tx('heroSelect.profilesScreen.bringHeader')));
    const paste = h('textarea', { rows: 3, placeholder: tx('heroSelect.profilesScreen.pastePlaceholder'), style: 'width:100%;font-size:11px', 'aria-label': tx('heroSelect.profilesScreen.pasteAria') });
    paste.addEventListener('keydown', (e) => e.stopPropagation());
    panel.appendChild(paste);
    panel.appendChild(h('div', { class: 'row', style: 'gap:8px;justify-content:space-between;margin-top:8px' },
      h('button', { class: 'btn small', onclick: () => {
        const r = P.importCode(paste.value);
        msg = !r ? tx('heroSelect.profilesScreen.notCode') : r.merged ? tx('heroSelect.profilesScreen.combined', { name: r.save.name }) : tx('heroSelect.profilesScreen.added', { name: r.save.name });
        if (r) for (const q of game.players) if (!q.remote) q.refreshLoadout?.();
        ui.refresh('profiles');
      } }, tx('heroSelect.profilesScreen.bringIt')),
      h('span', { class: 'hint', 'aria-live': 'polite' }, msg),
      h('button', { class: 'btn', 'data-autofocus': true, onclick: close }, tx('common.done'))));
    el.appendChild(panel);
  }, { dim: true, onBack: close });
}
