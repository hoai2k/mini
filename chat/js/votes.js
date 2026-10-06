// Thumbs up and down on every effect and game, added up for everyone on the
// relay (POST/GET /votes/chat, see multiplayer/server). Each browser has a
// random voter ID and one vote per item, which it can change or take back.
// If the relay can't take votes yet, my own votes are still kept here and
// `shared` is false.
//
//   const votes = createVotes({ server });
//   votes.counts('fx-puppy') -> { up, down }   (everyone, including me)
//   votes.mine('fx-puppy')   -> 1 | -1 | 0
//   votes.vote('fx-puppy', 1)                  (same value again clears it)
//   votes.onChange(cb)

import { load, save, randomId } from './store.js';

const APP = 'chat';

export function createVotes({ server }) {
  const base = server.replace(/\/$/, '');
  let voter = load('voter', null);
  if (!voter) {
    voter = `v${randomId()}${randomId()}`.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32);
    save('voter', voter);
  }
  const mine = load('votes.mine', {});
  let totals = {};
  let shared = false;
  const listeners = new Set();
  const emit = () => listeners.forEach(cb => { try { cb(); } catch (e) { console.error(e); } });

  async function refresh() {
    try {
      const res = await fetch(`${base}/votes/${APP}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status);
      totals = (await res.json()).items || {};
      shared = true;
    } catch {
      shared = false;
    }
    emit();
  }

  async function send(item, value) {
    try {
      const res = await fetch(`${base}/votes/${APP}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item, voter, value }),
      });
      if (!res.ok) throw new Error(res.status);
      const t = await res.json();
      totals[item] = { up: t.up, down: t.down };
      shared = true;
    } catch {
      shared = false;
    }
    emit();
  }

  refresh();
  setInterval(refresh, 60_000);

  return {
    get shared() { return shared; },
    counts(item) {
      if (shared) return totals[item] || { up: 0, down: 0 };
      // Offline: just my own vote.
      const m = mine[item] || 0;
      return { up: m === 1 ? 1 : 0, down: m === -1 ? 1 : 0 };
    },
    mine: item => mine[item] || 0,
    vote(item, value) {
      const prev = mine[item] || 0;
      const next = prev === value ? 0 : value;
      if (next) mine[item] = next;
      else delete mine[item];
      save('votes.mine', mine);
      // Show the change at once; the relay's answer corrects it.
      if (shared) {
        const t = { ...(totals[item] || { up: 0, down: 0 }) };
        if (prev === 1) t.up--;
        if (prev === -1) t.down--;
        if (next === 1) t.up++;
        if (next === -1) t.down++;
        totals[item] = t;
      }
      emit();
      send(item, next);
    },
    all: () => ({ ...totals }),
    refresh,
    onChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}

// A little 👍 n 👎 n control for one item. Returns the element; it keeps
// itself up to date.
export function voteButtons(votes, item, { compact = false } = {}) {
  const el = document.createElement('span');
  el.className = `votes${compact ? ' compact' : ''}`;
  const make = (value, emoji, label) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'vote';
    b.dataset.value = String(value);
    b.setAttribute('aria-label', label);
    const ico = document.createElement('span');
    ico.textContent = emoji;
    const n = document.createElement('span');
    n.className = 'n';
    b.append(ico, n);
    b.addEventListener('click', e => {
      e.stopPropagation();
      votes.vote(el.dataset.item, value);
    });
    return b;
  };
  const up = make(1, '👍', 'Thumbs up');
  const down = make(-1, '👎', 'Thumbs down');
  el.append(up, down);
  el.dataset.item = item;
  const render = () => {
    const id = el.dataset.item;
    const c = votes.counts(id);
    const m = votes.mine(id);
    up.querySelector('.n').textContent = String(c.up);
    down.querySelector('.n').textContent = String(c.down);
    up.setAttribute('aria-pressed', String(m === 1));
    down.setAttribute('aria-pressed', String(m === -1));
  };
  // Lets the effects strip reuse one control for whichever effect is on.
  el.setItem = id => {
    el.dataset.item = id;
    render();
  };
  votes.onChange(render);
  render();
  return el;
}
