// Save slots on screen: the Continue choice after Press Start, and the Saves
// list in Settings (make a slot the one Continue uses, rename, delete with a
// confirmation, start a new game in a new slot). All buttons, so a controller
// works it (D-pad / stick, A, B); names can be typed with a keyboard.
import { h, toast, confirmDialog } from './ui.js';
import { HEROES } from '../heroes/index.js';
import { chapter as chapterDef } from '../story/chapters.js';

const when = (t) => (t ? new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const hours = (s) => { const m = Math.round((s ?? 0) / 60); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`; };

// A new game: a new slot (the others are kept), the same players with fresh progress.
export async function newGame(game) {
  const people = game.profiles.list().map((p) => ({ id: p.id, name: p.name }));
  const main = people.find((p) => p.id === game.save.id);
  const ordered = main ? [main, ...people.filter((p) => p !== main)] : people;
  const id = game.slots.create({ people: ordered });
  await game.useSlot(id);
  toast(`New game: ${game.slots.meta(id)?.name}`, 'big');
  return id;
}

// After Press Start, when the active slot has somewhere to continue from.
export function openStart(game, { onPlay }) {
  const ui = game.ui, r = game.resume.load();
  const meta = game.slots.meta(game.slots.active);
  const ch = r?.chapter ? chapterDef(r.chapter) : null;
  const close = () => ui.close('start');
  ui.open('start', (el) => {
    el.appendChild(h('div', { class: 'panel menu-col', style: 'min-width:min(420px,94vw);text-align:center' },
      h('h2', {}, meta?.name ?? 'Your save'),
      r ? h('button', { class: 'btn primary', 'data-autofocus': true, onclick: () => { close(); onPlay({ resume: r }); } }, `Continue: ${ch?.title ?? r.title ?? 'your quest'}`) : null,
      r ? h('div', { class: 'hint' }, `Difficulty ${r.def.difficulty ?? 1} · saved ${when(r.t)}`) : null,
      h('button', { class: 'btn' + (r ? '' : ' primary'), 'data-autofocus': !r, onclick: () => { game.resume.clear(); close(); onPlay({}); } }, r ? 'Return to camp' : 'Play'),
      h('button', { class: 'btn', onclick: () => confirmDialog(game, { title: 'Start a new game?', text: 'A new save is made. Your other saves stay as they are, and you can switch between them in Settings → Saves.', yes: 'New game', no: 'Back',
        onYes: async () => { await newGame(game); close(); onPlay({}); } }) }, 'New game'),
      h('button', { class: 'btn', onclick: () => openSaves(game, () => { close(); openStart(game, { onPlay }); }) }, 'Saves…')));
  }, { dim: true, onBack: () => { close(); game.toTitle?.(); } });
}

// Settings → Saves
export function openSaves(game, onDone) {
  const ui = game.ui, S = game.slots;
  const close = () => { ui.close('saves'); onDone?.(); };
  const playing = () => game.state === 'playing';
  ui.open('saves', (el) => {
    const panel = h('div', { class: 'panel', style: 'width:min(640px,95vw);max-height:92vh;overflow:auto' }, h('h2', {}, 'Saves'),
      h('p', { class: 'hint' }, 'Each save is a whole game: every player’s progress and where to continue from. Continue on the title plays the active save.'));
    for (const m of S.list()) {
      const name = h('input', { type: 'text', maxlength: '24', value: m.name, 'aria-label': `Name of ${m.name}`, style: 'width:11em' });
      name.addEventListener('keydown', (e) => e.stopPropagation());
      name.addEventListener('change', () => { S.rename(m.id, name.value); ui.refresh('saves'); });
      const heroes = (m.heroes ?? []).map((x) => HEROES[x]?.name ?? x).join(', ');
      panel.appendChild(h('div', { class: 'setting', style: 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:6px 0;border-top:1px solid rgba(255,255,255,.12)' },
        name,
        h('span', { class: 'hint', style: 'flex:1 1 220px' }, `${m.active ? '★ active · ' : ''}made ${when(m.created)} · played ${when(m.played)} · ${hours(m.playTime)} · ${m.chapters} chapter${m.chapters === 1 ? '' : 's'}${heroes ? ' · ' + heroes : ''}`),
        !m.active ? h('button', { class: 'btn small primary', onclick: () => {
          const go = async () => { await game.useSlot(m.id); toast(`Playing ${m.name}`); ui.refresh('saves'); };
          if (playing()) confirmDialog(game, { title: 'Switch saves?', text: 'You go back to the title, and Continue then plays this save. Your progress so far is saved.', yes: 'Switch', no: 'Back', onYes: () => { ui.closeAll(); game.paused = false; game.toTitle(); go(); } });
          else go();
        } }, 'Make active') : null,
        S.list().length > 1 && !(m.active && playing()) ? h('button', { class: 'btn small danger', onclick: () => confirmDialog(game, {
          title: `Delete ${m.name}?`, text: 'All of its progress is deleted for good. Your other saves stay.', yes: 'Delete', no: 'Keep it', danger: true,
          onYes: async () => { const wasActive = m.active; S.remove(m.id); if (wasActive) await game.useSlot(S.active); toast(`${m.name} deleted`); ui.refresh('saves'); },
        }) }, 'Delete') : null));
    }
    panel.appendChild(h('div', { class: 'row', style: 'justify-content:space-between;margin-top:12px;gap:8px' },
      !playing() ? h('button', { class: 'btn', onclick: () => confirmDialog(game, { title: 'Start a new game?', text: 'A new save is made and becomes active. Your other saves stay as they are.', yes: 'New game', no: 'Back', onYes: async () => { await newGame(game); ui.refresh('saves'); } }) }, 'New game') : h('span'),
      h('button', { class: 'btn', 'data-autofocus': true, onclick: close }, 'Done')));
    el.appendChild(panel);
  }, { dim: true, onBack: close });
}
