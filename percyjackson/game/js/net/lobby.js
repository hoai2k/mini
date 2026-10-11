// The Iris-message fountain: online play. Open your camp to friends (host),
// or join a friend's camp from the list. Controller: D-pad / stick to move,
// A to choose, B to go back. Room titles and names come from other players,
// so they are always inserted as text, never as HTML.
import { h, toast } from '../ui/ui.js';
import { loadClient } from './online.js';

const NAME_KEY = 'half-blood-quests-name';
const names = ['Demigod', 'Half-Blood', 'Camper', 'Hero'];
function defaultName() {
  try { const n = localStorage.getItem(NAME_KEY); if (n) return n; } catch (e) { /* private mode */ }
  return `${names[Math.floor(Math.random() * names.length)]} ${Math.floor(10 + Math.random() * 90)}`;
}
function rememberName(n) { try { localStorage.setItem(NAME_KEY, n); } catch (e) { /* ignore */ } }

export function openOnline(game) {
  const on = game.online;
  game.paused = true;
  let stopWatch = null;
  const close = () => { stopWatch?.(); game.ui.close('online'); game.paused = false; game.last = performance.now(); };
  game.ui.open('online', (el) => {
    const panel = h('div', { class: 'panel online-panel', style: 'width:min(560px,94vw)' });
    el.appendChild(panel);
    panel.appendChild(h('h2', {}, 'Iris Message'));
    panel.appendChild(h('p', { class: 'hint' }, 'Toss a golden drachma into the rainbow and call your friends. Up to four heroes, one per person. The host chooses the chapters.'));
    if (on.active) {
      panel.appendChild(h('p', {}, on.isHost ? 'Your camp is open online.' : 'You are in a friend’s camp.'));
      const list = h('ul', { class: 'online-peers' });
      for (const peer of on.peers.values()) list.appendChild(h('li', {}, peer.name));
      if (!on.peers.size) list.appendChild(h('li', { class: 'hint' }, on.isHost ? 'Waiting for friends to join…' : 'Connecting…'));
      panel.appendChild(list);
      panel.appendChild(h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:12px' },
        h('button', { class: 'btn', onclick: close }, 'Back'),
        h('button', { class: 'btn danger', 'data-autofocus': true, onclick: () => { on.leave(); close(); if (game.mode !== 'hub') game.returnToHub(); toast('You are offline'); } }, on.isHost ? 'Close my camp' : 'Leave')));
      return;
    }
    const name = h('input', { type: 'text', maxlength: '20', value: defaultName(), 'aria-label': 'Your name' });
    panel.appendChild(h('div', { class: 'setting' }, h('label', {}, 'Your name'), name));
    const status = h('p', { class: 'hint', 'aria-live': 'polite' }, 'Looking for open camps…');
    const rooms = h('div', { class: 'menu-col online-rooms' });
    const nameValue = () => (name.value || '').trim().slice(0, 20) || defaultName();
    panel.appendChild(h('div', { class: 'row', style: 'margin:10px 0' },
      h('button', { class: 'btn primary', 'data-autofocus': true, onclick: async () => {
        const n = nameValue(); rememberName(n);
        try { await on.host(n); close(); } catch (e) { status.textContent = 'Could not reach the Iris network. Try again later.'; }
      } }, 'Open my camp (host)')));
    panel.appendChild(h('h3', {}, 'Friends’ camps'));
    panel.appendChild(status);
    panel.appendChild(rooms);
    panel.appendChild(h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:12px' }, h('button', { class: 'btn', onclick: close }, 'Back')));
    loadClient().then((MR) => {
      on.net ??= MR.connect('halfbloodquests');
      stopWatch = on.net.watchRooms(({ rooms: list, error }) => {
        if (!game.ui.isOpen('online')) return;
        rooms.textContent = '';
        if (error) { status.textContent = 'Could not reach the Iris network.'; return; }
        status.textContent = list.length ? 'Choose a camp to join:' : 'No open camps right now. Open yours and ask a friend to join.';
        for (const r of list) {
          const full = r.count >= r.capacity;
          const b = h('button', { class: 'btn', disabled: full ? true : undefined, onclick: async () => {
            const n = nameValue(); rememberName(n);
            try { await on.join(r.id, n); close(); } catch (e) { status.textContent = 'Could not join that camp.'; }
          } });
          b.textContent = `${r.title} · ${r.count}/${r.capacity}${full ? ' (full)' : ''}`;
          rooms.appendChild(b);
        }
      });
    }).catch(() => { status.textContent = 'Online play is not available here.'; });
  }, { dim: true, onBack: close });
}
