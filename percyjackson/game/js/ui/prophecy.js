// The prophecy scroll: a parchment showing a book's prophecy. Lines already
// fulfilled (save.data.prophecy[bookId] = [line indices]) are in English; the
// rest are Greek letters. A newly revealed line settles into English as you
// read it (demigodText).
import { h } from './ui.js';
import { demigodText, toGreek, GREEK } from './greekText.js';
import { BOOKS, CHAPTERS } from '../story/chapters.js';
import { t as tx } from '../text_config.js';

// opts: ui, embedded when it is a tab of a player's own menu (playerMenu.js):
// then the Oracle's music isn't played (the game goes on for the others) and
// closing it closes that menu (onClose).
export function openProphecy(game, bookId = 'book1', onClose, { ui = game.ui, embedded = false } = {}) {
  const d = game.save.data;
  const books = BOOKS.filter((b) => b.prophecy?.length);
  if (!books.some((b) => b.id === bookId)) bookId = books[0]?.id ?? bookId;
  if (!embedded) game.audio?.setOverride?.('oracle');
  const close = embedded ? () => onClose?.() : () => { ui.close('prophecy'); game.audio?.setOverride?.(null); onClose?.(); };
  ui.open('prophecy', (el) => {
    const book = BOOKS.find((b) => b.id === bookId);
    const lines = book?.prophecy ?? [];
    const got = new Set(d.prophecy?.[bookId] ?? []);
    const seen = new Set(d.prophecySeen?.[bookId] ?? []);
    const body = h('div', { class: 'scroll-lines' });
    lines.forEach((line, i) => {
      const known = got.has(i);
      const p = h('p', { class: 'pl' + (known ? ' known' : ' hidden-line'), 'aria-label': known ? line : tx('prophecy.unfulfilledAria') });
      if (known) {
        if (!seen.has(i)) { demigodText(p, line, { timing: GREEK.prophecy, delay: 0.5 + i * 0.1 }); (d.prophecySeen ??= {})[bookId] = [...seen.add(i)]; }
        else p.textContent = line;
      } else {
        p.textContent = toGreek(line, i * 97 + 5);
        const ch = CHAPTERS.find((c) => c.book === bookId && c.prophecyLine === i);
        if (ch) p.append(h('small', {}, tx('prophecy.fulfilledIn', { title: ch.title })));
      }
      body.append(p);
    });
    if (d.prophecySeen) game.save.write();
    if (!lines.length) body.append(h('p', { class: 'pl hidden-line' }, tx('prophecy.silent')));
    const tabs = books.length > 1 ? h('div', { class: 'tabs', role: 'tablist', 'data-tabbar': '' }, ...books.map((b) => h('button', { class: 'tab' + (b.id === bookId ? ' on' : ''), role: 'tab', 'aria-selected': String(b.id === bookId), 'data-k': 'book-' + b.id, onclick: () => { bookId = b.id; ui.refresh('prophecy'); } }, b.title))) : null;
    el.appendChild(h('div', { class: 'prophecy' + (tabs ? ' tabbed' : ''), role: 'dialog', 'aria-label': tx('prophecy.title') },
      h('div', { class: 'roll top' }),
      h('div', { class: 'parch' },
        h('div', { class: 'ptitle' }, tx('prophecy.title')), h('div', { class: 'psub' }, book?.title ?? ''), tabs, body,
        h('div', { class: 'pcount' }, lines.length ? tx('prophecy.count', { got: got.size, total: lines.length }) : ''),
        h('button', { class: 'btn primary', 'data-autofocus': true, onclick: close }, tx('common.close'))),
      h('div', { class: 'roll bottom' })));
  }, { dim: !embedded, onBack: close });
}
