// Story cards: a full-screen card with the chapter image, a title (Greek
// letters that settle into English) and the narration one line at a time in
// plain English. A / Enter / Space / click advances; B / Esc skips all.
// The game is paused while a card is open.
import { h } from './ui.js';
import { demigodText, GREEK } from './greekText.js';
import { artReady } from './art.js';

export function openStoryCards(game, { title = '', image = '', lines = [] } = {}, onDone) {
  const ui = game.ui;
  const wasPaused = game.paused;
  game.paused = true;
  let i = -1, finished = false;
  const done = () => {
    if (finished) return; finished = true;
    window.removeEventListener('keydown', onKey);
    ui.close('story'); game.paused = wasPaused;
    onDone?.();
  };
  const onKey = (e) => {
    if (e.code === 'Space' && ui.top()?.id === 'story' && !e.repeat) { e.preventDefault(); advance(); }
  };
  let lineEl, hintEl, titleEl;
  const advance = () => {
    if (finished) return;
    i++;
    if (i >= lines.length) { done(); return; }
    lineEl.replaceChildren(); lineEl.classList.remove('in'); void lineEl.offsetWidth; lineEl.classList.add('in');
    lineEl.textContent = lines[i];
    hintEl.textContent = (i + 1) + ' / ' + lines.length;
    game.audio?.ui('move');
  };
  if (!lines.length && !title) { game.paused = wasPaused; onDone?.(); return; }
  ui.open('story', (el) => {
    // the chapter's picture, preloaded with the title (ui/art.js); a missing one is left out
    const img = image && artReady(image) ? h('img', { class: 'story-img', src: image, alt: '', draggable: 'false' }) : null;
    titleEl = h('h2', { class: 'story-title' });
    lineEl = h('p', { class: 'story-line' });
    hintEl = h('span', { class: 'story-count' });
    el.classList.add('story');
    el.append(img, h('div', { class: 'story-shade' }), titleEl,
      h('div', { class: 'story-box' }, lineEl,
        h('div', { class: 'story-foot' }, hintEl, h('span', { class: 'story-keys' }, 'A / Enter / click: next · B / Esc: skip'),
          h('button', { class: 'btn small', onclick: (e) => { e.stopPropagation(); done(); } }, 'Skip'))),
      h('button', { class: 'story-adv', 'data-autofocus': true, 'aria-label': 'Next', onclick: advance }));
    demigodText(titleEl, title, { timing: GREEK.title });
  }, { onBack: done, onClose: () => { if (!finished) { finished = true; window.removeEventListener('keydown', onKey); game.paused = wasPaused; } } });
  window.addEventListener('keydown', onKey);
  advance();
}
