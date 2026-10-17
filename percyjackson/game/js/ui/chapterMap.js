// Chapter map: the books as tabs, their chapters as cards (chapter image,
// place, Mist rating, completion / lock state), a difficulty picker and Start.
import { h } from './ui.js';
import { demigodText, GREEK } from './greekText.js';
import { BOOKS, CHAPTERS, chaptersOf, chapterPlayable } from '../story/chapters.js';
import { t as tx } from '../text_config.js';

export const DIFFICULTIES = ['mortal', 'demigod', 'hero', 'olympian'].map((id) => [tx(`chapterMap.difficulty.${id}.name`), tx(`chapterMap.difficulty.${id}.tip`)]);
const OBJECTIVES = Object.fromEntries(['exorcise', 'escort', 'flag', 'rescue', 'seal', 'boss', 'escape'].map((id) => [id, tx(`chapterMap.objectives.${id}`)]));
const BOSSES = Object.fromEntries(['alecto', 'minotaur', 'hellhound', 'hellhound_alpha', 'luke', 'furies', 'medusa', 'chimera', 'spiders', 'procrustes', 'cerberus', 'ares', 'pit_scorpion'].map((id) => [id, tx(`chapterMap.bosses.${id}`)]));
const bossName = (id) => (id ? BOSSES[id] ?? id.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : tx('chapterMap.noBoss'));
const CLOUD = '<svg viewBox="0 0 24 16" aria-hidden="true"><path d="M6.5 14.5a4 4 0 0 1-.4-8A5.5 5.5 0 0 1 16.8 5.4 4.6 4.6 0 0 1 17.5 14.5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';

export function mistRating(mist) {
  const n = Math.round((mist ?? 0) * 5);
  const el = h('span', { class: 'mist', role: 'img', 'aria-label': tx('chapterMap.mistRating', { n }), title: tx('chapterMap.mistRating', { n }) });
  for (let i = 0; i < 5; i++) el.appendChild(h('span', { class: 'cl' + (i < n ? ' on' : ''), html: CLOUD }));
  return el;
}
export function isUnlocked(d, ch) {
  if (!chapterPlayable(ch)) return false;
  if (d.unlockAll) return true;
  const list = chaptersOf(ch.book), i = list.indexOf(ch);
  return i <= 0 || !!d.completed?.[list[i - 1].id];
}
// The chapter's card picture (preloaded behind the loading screen, ui/art.js).
// A picture that is genuinely missing leaves the frame empty.
export function cardArt(ch, cls = '') {
  const wrap = h('div', { class: 'art ' + cls });
  if (!ch.card) return wrap;
  const img = h('img', { src: ch.card, alt: '', draggable: 'false' });
  img.addEventListener('error', () => img.remove());
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
        h('span', { class: 'bn' }, tx('chapterMap.bookTab', { n: b.num })), h('span', { class: 'bt' }, b.title));
    }));
    const detail = h('aside', { class: 'cdetail', 'aria-live': 'polite' });
    let titleHandle = null;
    const renderDetail = (animate = true) => {
      const ch = CHAPTERS.find((c) => c.id === sel);
      detail.replaceChildren();
      if (!ch) { detail.append(h('div', { class: 'hint' }, list.length ? tx('chapterMap.choose') : tx('chapterMap.bookNotReady'))); return; }
      const open = isUnlocked(d, ch), done = !!d.completed?.[ch.id];
      const title = h('h3', { class: 'ctitle' });
      titleHandle?.cancel?.();
      if (animate) titleHandle = demigodText(title, ch.title, { timing: GREEK.map }); else title.textContent = ch.title;
      const diffRow = h('div', { class: 'diffs', role: 'radiogroup', 'aria-label': tx('chapterMap.difficulty.label') }, ...DIFFICULTIES.map(([n, tip], i) =>
        h('button', { class: 'diff' + (difficulty === i + 1 ? ' on' : ''), role: 'radio', 'aria-checked': String(difficulty === i + 1), title: tip, onclick: () => { difficulty = i + 1; d.lastDifficulty = difficulty; renderDetail(false); ui.setFocus(detail.querySelectorAll('.diff')[i]); } }, n)));
      const startBtn = h('button', { class: 'btn primary', 'data-start': true, disabled: !open, onclick: () => start(ch) }, open ? (done ? tx('chapterMap.playAgain') : tx('chapterMap.startChapter')) : (ch.ready ? tx('chapterMap.locked') : tx('chapterMap.comingSoon')));
      detail.append(cardArt(ch, 'big'),
        h('div', { class: 'cnum' }, tx('chapterMap.chapterLine', { book: book?.num ?? '', n: ch.num }) + (done ? tx('chapterMap.completedSuffix') : '')),
        title,
        h('div', { class: 'cplace' }, ch.place),
        h('div', { class: 'cmist' }, h('span', {}, tx('chapterMap.mist')), mistRating(ch.mist)),
        h('dl', { class: 'cfacts' }, h('dt', {}, tx('chapterMap.goal')), h('dd', {}, OBJECTIVES[ch.objective] ?? ch.objective), h('dt', {}, tx('chapterMap.boss')), h('dd', {}, bossName(ch.boss)), ch.start?.place ? h('dt', {}, tx('chapterMap.starts')) : null, ch.start?.place ? h('dd', {}, tx('chapterMap.inCamp', { place: ch.start.place })) : null),
        !open ? h('p', { class: 'lockmsg' }, ch.ready ? tx('chapterMap.finishBefore') : tx('chapterMap.comingSoonDot')) : null,
        h('div', { class: 'dlabel' }, tx('chapterMap.difficultyLabel'), h('b', {}, DIFFICULTIES[difficulty - 1][0])),
        diffRow, startBtn);
    };
    const cards = h('div', { class: 'ccards' });
    if (!list.length) cards.append(h('div', { class: 'coming' }, h('h3', {}, book.title), h('p', {}, tx('chapterMap.bookComingSoon'))));
    for (const ch of list) {
      const open = isUnlocked(d, ch), done = !!d.completed?.[ch.id];
      const b = h('button', { class: 'ccard' + (ch.id === sel ? ' sel' : '') + (open ? '' : ' locked') + (done ? ' done' : ''), 'data-ch': ch.id, 'aria-label': tx('chapterMap.cardAria', { n: ch.num, title: ch.title, state: open ? (done ? tx('chapterMap.completed') : tx('chapterMap.available')) : ch.ready ? tx('chapterMap.locked') : tx('chapterMap.comingSoon') }),
        onclick: () => { sel = ch.id; cards.querySelectorAll('.ccard').forEach((x) => x.classList.toggle('sel', x === b)); renderDetail(); const sb = detail.querySelector('[data-start]'); if (sb && !sb.disabled) ui.setFocus(sb); } },
        cardArt(ch),
        h('span', { class: 'badge' }, String(ch.num)),
        done ? h('span', { class: 'tick', 'aria-hidden': 'true' }, '✔') : null,
        !open ? h('span', { class: 'lock', 'aria-hidden': 'true' }, ch.ready ? '🔒' : tx('chapterMap.soon')) : null,
        h('span', { class: 'cap' }, h('span', { class: 'ct' }, ch.title), h('span', { class: 'cpl' }, ch.place), mistRating(ch.mist)));
      b.addEventListener('navfocus', () => { if (sel !== ch.id) { sel = ch.id; cards.querySelectorAll('.ccard').forEach((x) => x.classList.toggle('sel', x === b)); renderDetail(); } });
      cards.append(b);
    }
    renderDetail(false);
    el.appendChild(h('div', { class: 'panel cmap', role: 'dialog', 'aria-label': tx('chapterMap.title') },
      h('h2', {}, tx('chapterMap.title')), tabs,
      h('div', { class: 'cmap-body' }, cards, detail),
      h('div', { class: 'row', style: 'justify-content:space-between;margin-top:8px' }, h('span', { class: 'hint', style: 'margin:0' }, tx('chapterMap.controls')), h('button', { class: 'btn', onclick: close }, tx('common.close')))));
    if (!scr.first) { scr.first = true; }
  }, { dim: true, onBack: close });
  // start with focus on the selected chapter's card
  const s = ui.top(); const card = s?.el.querySelector('.ccard.sel'); if (card) ui.setFocus(card);
}
