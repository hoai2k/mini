// The Iris-message fountain: online play. Host your camp (friends join with
// its five-letter code or from the list), join a friend's, or rejoin the room
// you were last in. Everything is buttons, so a controller works it with the
// D-pad / stick and A (B goes back); the code can be typed with the letter
// grid or a keyboard. Room titles and names come from other players, so they
// are always inserted as text, never as HTML.
import { h, toast } from '../ui/ui.js';
import { t, tn } from '../text_config.js';
import { HEROES } from '../heroes/index.js';
import { loadClient } from './session.js';
import { GAME, CODE_CHARS, codeOf, roomIdFor, PEOPLE } from './proto.js';

const STATUS = { connecting: t('online.status.connecting'), open: t('online.status.open'), reconnecting: t('online.status.reconnecting'), migrating: t('online.status.migrating'), closed: t('online.status.closed') };

export function openOnline(game) {
  const on = game.online, ui = game.ui;
  const wasPaused = game.paused;
  if (!on.live) game.paused = true;
  let stopWatch = null, rooms = [], err = null, code = '', refreshT = null;
  const close = () => { stopWatch?.(); clearInterval(refreshT); ui.close('online'); game.paused = on.live ? false : wasPaused && false; game.last = performance.now(); };
  const go = async (mode, c) => {
    try { await on.start(mode, c); close(); } catch (e) { err = t('online.lobby.unavailable'); ui.refresh('online'); }
  };
  const watch = () => {
    loadClient().then((MR) => {
      const net = MR.connect(GAME);
      let stopped = false, timer = null;
      const tick = async () => {
        try { rooms = await Promise.race([net.listRooms(), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 6000))]); err = null; } catch (e) { rooms = []; err = t('online.lobby.unreachable'); }
        if (stopped) return;
        if (ui.isOpen('online') && !on.live) ui.refresh('online');
        timer = setTimeout(tick, 4000);
      };
      tick();
      stopWatch = () => { stopped = true; clearTimeout(timer); };
    }).catch(() => { err = t('online.lobby.unavailable'); if (ui.isOpen('online')) ui.refresh('online'); });
  };

  const inRoom = (panel) => {
    const s = on.session;
    panel.appendChild(h('p', { class: 'hint', 'aria-live': 'polite' }, `${STATUS[s.status] ?? s.status} · ${on.isHost ? t('online.lobby.youAreHost') : t('online.lobby.hostChooses')}`));
    if (on.code) panel.appendChild(h('div', { class: 'stat-line' }, t('online.lobby.roomCode'), h('b', { style: 'letter-spacing:.2em;font-size:22px' }, on.code)));
    const list = h('ul', { class: 'online-peers', style: 'list-style:none;padding:0;margin:8px 0' });
    for (const m of s.members()) {
      const heroes = (m.me ? (s.mine.hs ?? []) : (m.p?.hs ?? [])).filter((x) => x && x.ai !== 1);
      const names = heroes.map((x) => `${x.n || m.name} (${HEROES[x.h]?.name ?? x.h})`).join(', ') || m.name;
      list.appendChild(h('li', { style: 'padding:3px 0' }, (m.host ? '★ ' : '• ') + names + (m.me ? t('online.lobby.thisScreen') : '') + (m.missing ? t('online.lobby.missing') : '')));
    }
    const ai = game.players.filter((p) => p.ai);
    if (ai.length) list.appendChild(h('li', { class: 'hint', style: 'padding:3px 0' }, t('online.lobby.companions', { names: ai.map((p) => HEROES[p.hero]?.name ?? p.hero).join(', ') }) + (game.partyMgr.takeable().length ? t('online.lobby.swapIn') : '')));
    panel.appendChild(list);
    panel.appendChild(h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:12px;gap:8px' },
      h('button', { class: 'btn', 'data-autofocus': true, onclick: close }, t('online.lobby.back')),
      h('button', { class: 'btn danger', onclick: () => { on.leave(); close(); } }, on.isHost ? t('online.lobby.closeCamp') : t('online.lobby.leave'))));
  };

  const offline = (panel) => {
    panel.appendChild(h('div', { class: 'row', style: 'margin:10px 0;gap:8px;flex-wrap:wrap' },
      h('button', { class: 'btn primary', 'data-autofocus': true, onclick: () => go('host') }, t('online.lobby.openCamp'))));
    // rejoin the last room (or the room that took over from it after a host change)
    const last = on.lastRoom();
    const lastCode = codeOf(last?.id);
    const again = lastCode && rooms.filter((r) => codeOf(r.id) === lastCode).sort((a, b) => b.id.length - a.id.length || (b.id > a.id ? 1 : -1))[0];
    if (again) panel.appendChild(h('button', { class: 'btn', onclick: () => go('join', again.id) }, t('online.lobby.rejoin', { title: again.title, code: lastCode })));
    panel.appendChild(h('h3', {}, t('online.lobby.joinWithCode')));
    const field = h('input', { type: 'text', maxlength: '5', value: code, placeholder: 'ABCDE', 'aria-label': t('online.lobby.roomCode'), style: 'width:8em;text-transform:uppercase;letter-spacing:.25em;font-size:20px' });
    field.addEventListener('input', () => { code = field.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5); });
    field.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') joinCode(); });
    const joinCode = () => {
      if (code.length !== 5) { toast(t('online.lobby.codeFive')); return; }
      const hit = rooms.filter((r) => codeOf(r.id) === code).sort((a, b) => b.id.length - a.id.length)[0];
      go('join', hit?.id ?? roomIdFor(code));
    };
    const grid = h('div', { style: 'display:grid;grid-template-columns:repeat(8,2.3em);gap:4px;margin:6px 0' });
    for (const c of CODE_CHARS) grid.appendChild(h('button', { class: 'btn small', 'data-nav': true, onclick: () => { if (code.length < 5) { code += c; field.value = code; } } }, c));
    panel.appendChild(h('div', { class: 'row', style: 'gap:8px;align-items:center' }, field,
      h('button', { class: 'btn small', onclick: () => { code = code.slice(0, -1); field.value = code; } }, '⌫'),
      h('button', { class: 'btn small primary', onclick: joinCode }, t('online.lobby.join'))));
    panel.appendChild(grid);
    panel.appendChild(h('h3', {}, t('online.lobby.friendsCamps')));
    panel.appendChild(h('p', { class: 'hint', 'aria-live': 'polite' }, err ?? (rooms.length ? t('online.lobby.choose') : t('online.lobby.noCamps'))));
    const col = h('div', { class: 'menu-col online-rooms' });
    for (const r of rooms) {
      const full = r.count >= r.capacity;
      const b = h('button', { class: 'btn', disabled: full ? true : undefined, onclick: () => go('join', r.id) });
      b.textContent = t('online.lobby.room', { title: r.title, code: codeOf(r.id) ?? '', n: r.count }) + (full ? t('online.lobby.full') : '');
      col.appendChild(b);
    }
    panel.appendChild(col);
    panel.appendChild(h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:12px' }, h('button', { class: 'btn', onclick: close }, t('online.lobby.back'))));
  };

  ui.open('online', (el) => {
    const panel = h('div', { class: 'panel online-panel', style: 'width:min(600px,94vw);max-height:92vh;overflow:auto' });
    el.appendChild(panel);
    panel.appendChild(h('h2', {}, t('online.lobby.title')));
    panel.appendChild(h('p', { class: 'hint' }, t('online.lobby.intro', { n: PEOPLE, name: game.save.name })));
    if (on.live) inRoom(panel); else offline(panel);
  }, { dim: true, onBack: close });
  if (!on.live) watch();
  else refreshT = setInterval(() => { if (ui.top()?.id === 'online') ui.refresh('online'); }, 1000);
}
