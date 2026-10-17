// Save slots on screen: the Continue choice after Press Start, and the Saves
// list in Settings (make a slot the one Continue uses, rename, delete with a
// confirmation, start a new game in a new slot). All buttons, so a controller
// works it (D-pad / stick, A, B); names can be typed with a keyboard.
import { h, toast, confirmDialog } from './ui.js';
import { HEROES } from '../heroes/index.js';
import { chapter as chapterDef } from '../story/chapters.js';
import { STEP_INFO, openingDone } from '../story/opening.js';
import { t, tn } from '../text_config.js';

const when = (time) => (time ? new Date(time).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const hours = (s) => { const m = Math.round((s ?? 0) / 60); return m < 60 ? t('saves.minutes', { m }) : t('saves.hoursMinutes', { h: Math.floor(m / 60), m: m % 60 }); };

// A new game: a new slot (the others are kept), the same players with fresh progress.
// A new game runs the opening (the Manhattan prologue first) unless skipOpening.
export async function newGame(game, { skipOpening = false } = {}) {
  const people = game.profiles.list().map((p) => ({ id: p.id, name: p.name }));
  const main = people.find((p) => p.id === game.save.id);
  const ordered = main ? [main, ...people.filter((p) => p !== main)] : people;
  const id = game.slots.create({ people: ordered });
  await game.useSlot(id);
  if (skipOpening) { game.save.data.opening = 'done'; game.save.writeNow?.(); }
  toast(t('saves.newGameToast', { name: game.slots.meta(id)?.name }), 'big');
  return id;
}

// After Press Start, when the active slot has somewhere to continue from.
export function openStart(game, { onPlay }) {
  const ui = game.ui, r = game.resume.load();
  const meta = game.slots.meta(game.slots.active);
  const ch = r?.chapter ? chapterDef(r.chapter) : null;
  const story = r?.kind === 'opening' ? STEP_INFO[r.step]?.title ?? t('saves.theStory') : null;
  const finished = openingDone(game.save.data);   // this save has seen the opening: a new game may skip it
  const close = () => ui.close('start');
  ui.open('start', (el) => {
    el.appendChild(h('div', { class: 'panel menu-col', style: 'min-width:min(420px,94vw);text-align:center' },
      h('h2', {}, meta?.name ?? t('saves.yourSave')),
      r ? h('button', { class: 'btn primary', 'data-autofocus': true, onclick: () => { close(); onPlay({ resume: r }); } }, t('saves.continue', { where: story ?? ch?.title ?? r.title ?? t('saves.yourQuest') })) : null,
      r ? h('div', { class: 'hint' }, story ? t('saves.openingSaved', { when: when(r.t) }) : t('saves.difficultySaved', { n: r.def.difficulty ?? 1, when: when(r.t) })) : null,
      h('button', { class: 'btn' + (r ? '' : ' primary'), 'data-autofocus': !r, onclick: () => { game.resume.clear(); close(); onPlay({}); } }, !r ? t('saves.play') : finished ? t('saves.returnToCamp') : t('saves.chooseHeroes')),
      h('button', { class: 'btn', onclick: () => confirmDialog(game, { title: t('saves.newGameTitle'), text: t('saves.newGameStartText'), yes: t('saves.newGame'), no: t('saves.back'),
        onYes: async () => { await newGame(game); close(); onPlay({}); } }) }, t('saves.newGame')),
      finished ? h('button', { class: 'btn', onclick: () => confirmDialog(game, { title: t('saves.skipTitle'), text: t('saves.skipText'), yes: t('saves.skipYes'), no: t('saves.back'),
        onYes: async () => { await newGame(game, { skipOpening: true }); close(); onPlay({}); } }) }, t('saves.skipButton')) : null,
      h('button', { class: 'btn', onclick: () => openSaves(game, () => { close(); openStart(game, { onPlay }); }) }, t('saves.savesButton'))));
  }, { dim: true, onBack: () => { close(); game.toTitle?.(); } });
}

// Settings → Saves
export function openSaves(game, onDone) {
  const ui = game.ui, S = game.slots;
  const close = () => { ui.close('saves'); onDone?.(); };
  const playing = () => game.state === 'playing';
  ui.open('saves', (el) => {
    const panel = h('div', { class: 'panel', style: 'width:min(640px,95vw);max-height:92vh;overflow:auto' }, h('h2', {}, t('saves.title')),
      h('p', { class: 'hint' }, t('saves.intro')));
    for (const m of S.list()) {
      const name = h('input', { type: 'text', maxlength: '24', value: m.name, 'aria-label': t('saves.nameOf', { name: m.name }), style: 'width:11em' });
      name.addEventListener('keydown', (e) => e.stopPropagation());
      name.addEventListener('change', () => { S.rename(m.id, name.value); ui.refresh('saves'); });
      const heroes = (m.heroes ?? []).map((x) => HEROES[x]?.name ?? x).join(', ');
      panel.appendChild(h('div', { class: 'setting', style: 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:6px 0;border-top:1px solid rgba(255,255,255,.12)' },
        name,
        h('span', { class: 'hint', style: 'flex:1 1 220px' }, (m.active ? t('saves.activePrefix') : '') + t('saves.summary', { created: when(m.created), played: when(m.played), time: hours(m.playTime), chapters: tn('saves.chapters', m.chapters) }) + (heroes ? ' · ' + heroes : '')),
        !m.active ? h('button', { class: 'btn small primary', onclick: () => {
          const go = async () => { await game.useSlot(m.id); toast(t('saves.playing', { name: m.name })); ui.refresh('saves'); };
          if (playing()) confirmDialog(game, { title: t('saves.switchTitle'), text: t('saves.switchText'), yes: t('saves.switchYes'), no: t('saves.back'), onYes: () => { ui.closeAll(); game.paused = false; game.toTitle(); go(); } });
          else go();
        } }, t('saves.makeActive')) : null,
        S.list().length > 1 && !(m.active && playing()) ? h('button', { class: 'btn small danger', onclick: () => confirmDialog(game, {
          title: t('saves.deleteTitle', { name: m.name }), text: t('saves.deleteText'), yes: t('saves.deleteYes'), no: t('saves.deleteNo'), danger: true,
          onYes: async () => { const wasActive = m.active; S.remove(m.id); if (wasActive) await game.useSlot(S.active); toast(t('saves.deleted', { name: m.name })); ui.refresh('saves'); },
        }) }, t('saves.delete')) : null));
    }
    panel.appendChild(h('div', { class: 'row', style: 'justify-content:space-between;margin-top:12px;gap:8px' },
      !playing() ? h('button', { class: 'btn', onclick: () => confirmDialog(game, { title: t('saves.newGameTitle'), text: t('saves.newGameText'), yes: t('saves.newGame'), no: t('saves.back'), onYes: async () => { await newGame(game); ui.refresh('saves'); } }) }, t('saves.newGame')) : h('span'),
      h('button', { class: 'btn', 'data-autofocus': true, onclick: close }, t('saves.done'))));
    el.appendChild(panel);
  }, { dim: true, onBack: close });
}
