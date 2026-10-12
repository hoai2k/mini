// Chapter map: the books as tabs, their chapters as cards (chapter image,
// place, Mist rating, completion / lock state), a difficulty picker and Start.
import { h } from './ui.js';
import { demigodText } from './greekText.js';
import { BOOKS, CHAPTERS, chaptersOf, chapterPlayable } from '../story/chapters.js';

export const DIFFICULTIES = [['Mortal', 'Gentle: for learning the ropes.'], ['Demigod', 'The way the books play.'], ['Hero', 'Tougher monsters.'], ['Olympian', 'For legends only.']];
const OBJECTIVES = { exorcise: 'Defeat the monsters', escort: 'Escort your friends to safety', flag: 'Capture the flag', rescue: 'Rescue the captives', seal: 'Seal the breaches', boss: 'Defeat the boss', escape: 'Escape in time' };
const BOSSES = { alecto: 'Mrs. Dodds, the Fury', minotaur: 'The Minotaur', hellhound: 'A hellhound', hellhound_alpha: 'A hellhound from the Underworld', luke: 'Luke, and the pit scorpion', furies: 'The three Furies', medusa: 'Medusa', chimera: 'The Chimera', spiders: 'The spider swarm', procrustes: 'Procrustes', cerberus: 'Cerberus', ares: 'Ares', pit_scorpion: 'The pit scorpion' };
const bossName = (id) => (id ? BOSSES[id] ?? id.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : 'No boss: the place itself is the trap');
const CLOUD = '<svg viewBox="0 0 24 16" aria-hidden="true"><path d="M6.5 14.5a4 4 0 0 1-.4-8A5.5 5.5 0 0 1 16.8 5.4 4.6 4.6 0 0 1 17.5 14.5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';

export function mistRating(mist) {
  const n = Math.round((mist ?? 0) * 5);
  const el = h('span', { class: 'mist', role: 'img', 'aria-label': `Mist ${n} of 5`, title: `Mist ${n} of 5` });
  for (let i = 0; i < 5; i++) el.appendChild(h('span', { class: 'cl' + (i < n ? ' on' : ''), html: CLOUD }));
  return el;
}
export function isUnlocked(d, ch) {
  if (!chapterPlayable(ch)) return false;
  if (d.unlockAll) return true;
  const list = chaptersOf(ch.book), i = list.indexOf(ch);
  return i <= 0 || !!d.completed?.[list[i - 1].id];
}
// card image with a parchment fallback (number and title) if it fails to load
export function cardArt(ch, cls = '') {
  const fb = () => h('div', { class: 'art-fallback' }, h('span', { class: 'n' }, String(ch.num ?? '')), h('span', { class: 't' }, ch.title));
  const wrap = h('div', { class: 'art ' + cls });
  if (!ch.card) { wrap.append(fb()); return wrap; }
  const img = h('img', { src: ch.card, alt: '', loading: 'lazy', draggable: 'false' });
  img.addEventListener('error', () => wrap.replaceChildren(fb()));
  wrap.append(img);
  return wrap;
}

export function openChapterMap(game) {
  const ui = game.ui, d = game.save.data;
  let difficulty = Math.min(4, Math.max(1, d.lastDifficulty ?? 2));
  const firstOpen = CHAPTERS.find((c) => isUnlocked(d, c) && !d.completed?.[c.id]) ?? CHAPTERS[0];
  let bookId = firstOpen.book;
  let sel = firstOpen.id;
  const wasPaused = game.paused;
  game.paused = true;
  const close = () => { ui.close('chaptermap'); game.paused = false; };
  const start = (ch) => {
    d.lastDifficulty = difficulty; game.save.write();
    close();
    if (typeof game.startChapter === 'function') game.startChapter(ch.id, difficulty);
    else game.startMission({ biome: ch.biome, objective: ch.objective, boss: ch.boss, difficulty, seed: (Math.random() * 1e9) | 0 });
  };
  ui.open('chaptermap', (el, scr) => {
    const book = BOOKS.find((b) => b.id === bookId);
    const list = chaptersOf(bookId);
    const tabs = h('div', { class: 'tabs book-tabs', role: 'tablist' }, ...BOOKS.map((b) => {
      const has = chaptersOf(b.id).some((c) => chapterPlayable(c));
      return h('button', { class: 'tab' + (b.id === bookId ? ' on' : '') + (has ? '' : ' dim'), role: 'tab', 'aria-selected': String(b.id === bookId), onclick: () => { bookId = b.id; sel = chaptersOf(b.id)[0]?.id ?? null; ui.refresh('chaptermap'); } },
        h('span', { class: 'bn' }, 'Book ' + b.num), h('span', { class: 'bt' }, b.title));
    }));
    const detail = h('aside', { class: 'cdetail', 'aria-live': 'polite' });
    let titleHandle = null;
    const renderDetail = (animate = true) => {
      const ch = CHAPTERS.find((c) => c.id === sel);
      detail.replaceChildren();
      if (!ch) { detail.append(h('div', { class: 'hint' }, list.length ? 'Choose a chapter.' : 'This book is not ready yet.')); return; }
      const open = isUnlocked(d, ch), done = !!d.completed?.[ch.id];
      const title = h('h3', { class: 'ctitle' });
      titleHandle?.cancel?.();
      if (animate) titleHandle = demigodText(title, ch.title, { speed: 1.4 }); else title.textContent = ch.title;
      const diffRow = h('div', { class: 'diffs', role: 'radiogroup', 'aria-label': 'Difficulty' }, ...DIFFICULTIES.map(([n, tip], i) =>
        h('button', { class: 'diff' + (difficulty === i + 1 ? ' on' : ''), role: 'radio', 'aria-checked': String(difficulty === i + 1), title: tip, onclick: () => { difficulty = i + 1; d.lastDifficulty = difficulty; renderDetail(false); ui.setFocus(detail.querySelectorAll('.diff')[i]); } }, n)));
      const startBtn = h('button', { class: 'btn primary', 'data-start': true, disabled: !open, onclick: () => start(ch) }, open ? (done ? 'Play again' : 'Start chapter') : (ch.ready ? 'Locked' : 'Coming soon'));
      detail.append(cardArt(ch, 'big'),
        h('div', { class: 'cnum' }, `Book ${book?.num ?? ''} · Chapter ${ch.num}` + (done ? ' · Completed' : '')),
        title,
        h('div', { class: 'cplace' }, ch.place),
        h('div', { class: 'cmist' }, h('span', {}, 'Mist'), mistRating(ch.mist)),
        h('dl', { class: 'cfacts' }, h('dt', {}, 'Goal'), h('dd', {}, OBJECTIVES[ch.objective] ?? ch.objective), h('dt', {}, 'Boss'), h('dd', {}, bossName(ch.boss)), ch.start?.place ? h('dt', {}, 'Starts') : null, ch.start?.place ? h('dd', {}, 'In camp: ' + ch.start.place) : null),
        !open ? h('p', { class: 'lockmsg' }, ch.ready ? 'Finish the chapter before this one to unlock it.' : 'Coming soon.') : null,
        h('div', { class: 'dlabel' }, 'Difficulty: ', h('b', {}, DIFFICULTIES[difficulty - 1][0])),
        diffRow, startBtn);
    };
    const cards = h('div', { class: 'ccards' });
    if (!list.length) cards.append(h('div', { class: 'coming' }, h('h3', {}, book.title), h('p', {}, 'Coming soon. Finish the books before it to reach it.')));
    for (const ch of list) {
      const open = isUnlocked(d, ch), done = !!d.completed?.[ch.id];
      const b = h('button', { class: 'ccard' + (ch.id === sel ? ' sel' : '') + (open ? '' : ' locked') + (done ? ' done' : ''), 'data-ch': ch.id, 'aria-label': `Chapter ${ch.num}: ${ch.title}. ${open ? (done ? 'Completed' : 'Available') : ch.ready ? 'Locked' : 'Coming soon'}`,
        onclick: () => { sel = ch.id; cards.querySelectorAll('.ccard').forEach((x) => x.classList.toggle('sel', x === b)); renderDetail(); const sb = detail.querySelector('[data-start]'); if (sb && !sb.disabled) ui.setFocus(sb); } },
        cardArt(ch),
        h('span', { class: 'badge' }, String(ch.num)),
        done ? h('span', { class: 'tick', 'aria-hidden': 'true' }, '✔') : null,
        !open ? h('span', { class: 'lock', 'aria-hidden': 'true' }, ch.ready ? '🔒' : 'Soon') : null,
        h('span', { class: 'cap' }, h('span', { class: 'ct' }, ch.title), h('span', { class: 'cpl' }, ch.place), mistRating(ch.mist)));
      b.addEventListener('navfocus', () => { if (sel !== ch.id) { sel = ch.id; cards.querySelectorAll('.ccard').forEach((x) => x.classList.toggle('sel', x === b)); renderDetail(); } });
      cards.append(b);
    }
    renderDetail(false);
    el.appendChild(h('div', { class: 'panel cmap', role: 'dialog', 'aria-label': 'Chapter map' },
      h('h2', {}, 'Chapter Map'), tabs,
      h('div', { class: 'cmap-body' }, cards, detail),
      h('div', { class: 'row', style: 'justify-content:space-between;margin-top:8px' }, h('span', { class: 'hint', style: 'margin:0' }, 'A choose · B close'), h('button', { class: 'btn', onclick: close }, 'Close'))));
    if (!scr.first) { scr.first = true; }
  }, { dim: true, onBack: close });
  // start with focus on the selected chapter's card
  const s = ui.top(); const card = s?.el.querySelector('.ccard.sel'); if (card) ui.setFocus(card);
}
