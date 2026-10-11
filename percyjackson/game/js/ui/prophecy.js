// The prophecy scroll: a parchment showing a book's prophecy. Lines already
// fulfilled (save.data.prophecy[bookId] = [line indices]) are in English; the
// rest are Greek letters. A newly revealed line settles into English as you
// read it (demigodText).
import { h } from './ui.js';
import { demigodText, toGreek } from './greekText.js';
import { BOOKS, CHAPTERS } from '../story/chapters.js';

export function openProphecy(game, bookId = 'book1', onClose) {
  const ui = game.ui, d = game.save.data;
  const books = BOOKS.filter((b) => b.prophecy?.length);
  if (!books.some((b) => b.id === bookId)) bookId = books[0]?.id ?? bookId;
  game.audio?.setOverride?.('oracle');
  const close = () => { ui.close('prophecy'); game.audio?.setOverride?.(null); onClose?.(); };
  ui.open('prophecy', (el) => {
    const book = BOOKS.find((b) => b.id === bookId);
    const lines = book?.prophecy ?? [];
    const got = new Set(d.prophecy?.[bookId] ?? []);
    const seen = new Set(d.prophecySeen?.[bookId] ?? []);
    const body = h('div', { class: 'scroll-lines' });
    lines.forEach((line, i) => {
      const known = got.has(i);
      const p = h('p', { class: 'pl' + (known ? ' known' : ' hidden-line'), 'aria-label': known ? line : 'A line of the prophecy that is not yet fulfilled' });
      if (known) {
        if (!seen.has(i)) { demigodText(p, line, { speed: 0.8, delay: 0.5 + i * 0.1 }); (d.prophecySeen ??= {})[bookId] = [...seen.add(i)]; }
        else p.textContent = line;
      } else {
        p.textContent = toGreek(line, i * 97 + 5);
        const ch = CHAPTERS.find((c) => c.book === bookId && c.prophecyLine === i);
        if (ch) p.append(h('small', {}, `Fulfilled in: ${ch.title}`));
      }
      body.append(p);
    });
    if (d.prophecySeen) game.save.write();
    if (!lines.length) body.append(h('p', { class: 'pl hidden-line' }, 'The Oracle has not spoken yet.'));
    const tabs = books.length > 1 ? h('div', { class: 'tabs' }, ...books.map((b) => h('button', { class: 'tab' + (b.id === bookId ? ' on' : ''), onclick: () => { bookId = b.id; ui.refresh('prophecy'); } }, b.title))) : null;
    el.appendChild(h('div', { class: 'prophecy', role: 'dialog', 'aria-label': 'The prophecy' },
      h('div', { class: 'roll top' }),
      h('div', { class: 'parch' },
        h('div', { class: 'ptitle' }, 'The Prophecy'), h('div', { class: 'psub' }, book?.title ?? ''), tabs, body,
        h('div', { class: 'pcount' }, lines.length ? `${got.size} of ${lines.length} lines fulfilled` : ''),
        h('button', { class: 'btn primary', 'data-autofocus': true, onclick: close }, 'Close')),
      h('div', { class: 'roll bottom' })));
  }, { dim: true, onBack: close });
}
