// Bookzam: the page. Catalogue reads photos into book and board game lists;
// Find Book circles one book in a photo of a shelf.

import { mergeScan, removePhoto, moveItem, filterItems, sortItems, exportData, emptyCatalogue, newId, addLook } from './catalogue.js';
import { readPhoto, scanLines, findInRead, warmUp, saveLook, lookAt } from './reader.js';
import { isbnOf, bookByIsbn, readBarcodes } from './barcodes.js';
import { gameByBarcode } from './games.js';
import { prepare, recognise } from './looks.js';
import { lookupBook } from './lookup.js';
import { lookupGame } from './games.js';
import { loadCatalogue, saveCatalogue, persist } from './store.js';
import { decode, thumbnail, render } from './photo.js';
import { ringFor } from './geometry.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let cat = emptyCatalogue();
const ui = { view: 'catalogue', kind: 'books', query: '', sort: 'added', fresh: new Set(), openId: null };

// ---------- saving ----------

let saveTimer = 0;
function save(now = false) {
  clearTimeout(saveTimer);
  if (now) return saveCatalogue(cat);
  saveTimer = setTimeout(() => saveCatalogue(cat), 400);
}

// ---------- toast ----------

let toastTimer = 0;
function toast(message, ms = 3200) {
  const el = $('toast');
  el.textContent = message;
  el.hidden = false;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => { el.hidden = true; }, 250);
  }, ms);
}

// ---------- views ----------

function showView(view) {
  ui.view = view;
  for (const tab of document.querySelectorAll('.tabs [role=tab]')) tab.setAttribute('aria-selected', String(tab.dataset.view === view));
  $('view-catalogue').hidden = view !== 'catalogue';
  $('view-find').hidden = view !== 'find';
  if (view === 'find') refreshSuggestions();
  try { history.replaceState(null, '', view === 'find' ? '#find' : '#'); } catch {}
}

function showKind(kind) {
  ui.kind = kind;
  for (const seg of document.querySelectorAll('.segmented [role=tab]')) seg.setAttribute('aria-selected', String(seg.dataset.kind === kind));
  renderList();
}

// ---------- catalogue list ----------

function coverHtml(item, big = false) {
  const url = item.lookup?.cover;
  const hue = [...item.title].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  const initial = esc((item.title.replace(/^(the|a|an)\s+/i, '')[0] || '?').toUpperCase());
  const spine = `<span class="spine" style="--h:${hue}">${initial}</span>`;
  if (!url) return spine;
  return `${spine}<img src="${esc(url)}" alt="" loading="lazy" onerror="this.remove()"${big ? '' : ' width="44" height="64"'}>`;
}

function byline(item) {
  if (item.kind === 'game') return [item.designer || item.lookup?.designers?.[0] || item.publisher, item.lookup?.year || item.year, players(item.lookup)].filter(Boolean).join(' · ');
  return [item.author || item.lookup?.authors?.[0], item.lookup?.year || item.year].filter(Boolean).join(' · ');
}

function renderList() {
  const items = cat[ui.kind];
  $('count-books').textContent = cat.books.length;
  $('count-games').textContent = cat.games.length;
  const shown = sortItems(filterItems(items, ui.query), ui.sort);
  const games = ui.kind === 'games';
  $('toolbar').hidden = !items.length;
  $('fab').hidden = !items.length;
  $('fab-scan').hidden = !items.length;
  $('empty-scan').textContent = games ? 'Or scan the barcodes on the boxes' : 'Or scan the barcodes on their backs';
  $('fab').setAttribute('aria-label', games ? 'Add a photo of board games' : 'Add a photo of books');
  $('empty').hidden = items.length > 0;
  if (!items.length) {
    $('empty-title').textContent = games ? 'Snap your games' : 'Snap a shelf';
    $('empty-text').textContent = games
      ? 'Take a photo of your board games, with their names showing. Everything Bookzam reads in it is added here as a game. Add as many photos as you like.'
      : 'Take a photo of your books, spines facing you. Everything Bookzam reads in it is added here as a book. Add as many photos as you like.';
  }
  $('none-match').hidden = !(items.length && !shown.length);
  $('items').innerHTML = shown.map((item) => {
    const unsure = item.confidence != null && item.confidence < 0.6;
    const status = item.lookupStatus === 'pending' ? '<span class="looking" title="Looking it up"></span>' : '';
    return `<li><button type="button" class="item${ui.fresh.has(item.id) ? ' fresh' : ''}" data-id="${item.id}">
      <span class="cover">${coverHtml(item)}</span>
      <span class="text"><span class="title">${esc(item.title)}${unsure ? ' <span class="unsure" title="Bookzam wasn\'t sure of this title">?</span>' : ''}</span>
      <span class="by">${esc(byline(item))}</span></span>${status}
    </button></li>`;
  }).join('');
}

function findItem(id) {
  return cat.books.find((i) => i.id === id) || cat.games.find((i) => i.id === id) || null;
}

// ---------- adding photos ----------

const jobs = [];
let working = false;

function addFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/') && !/\.(jpe?g|png|heic|heif|webp)$/i.test(file.name)) continue;
    // The list open when the photo was added says what's in it.
    const job = { id: newId('j'), file, mode: ui.kind, state: 'waiting', el: null };
    jobs.push(job);
    renderJob(job);
  }
  persist();
  runJobs();
}

function renderJob(job) {
  if (!job.el) {
    job.el = document.createElement('div');
    job.el.className = 'job';
    $('jobs').prepend(job.el);
  }
  const thumb = job.thumb ? `<img src="${job.thumb}" alt="">` : '<span class="ph"></span>';
  const label = job.mode === 'games' ? 'Board games' : 'Books';
  const text = {
    waiting: `${label}: waiting…`,
    reading: job.progress || 'Reading the titles…',
    done: job.summary,
    failed: job.error,
  }[job.state];
  job.el.dataset.state = job.state;
  job.el.innerHTML = `${thumb}<span class="job-text">${esc(job.state === 'reading' ? `${label}: ${text}` : text)}</span>${job.state === 'reading' || job.state === 'waiting' ? '<span class="spinner" aria-hidden="true"></span>' : '<button type="button" class="x" aria-label="Dismiss">×</button>'}`;
  job.el.querySelector('.x')?.addEventListener('click', () => job.el.remove());
}

function summarize(added, existing, unreadable, recognised = 0) {
  const books = added.filter((i) => i.kind === 'book').length;
  const games = added.filter((i) => i.kind === 'game').length;
  const parts = [];
  if (books) parts.push(`${books} book${books === 1 ? '' : 's'}`);
  if (games) parts.push(`${games} board game${games === 1 ? '' : 's'}`);
  let s = parts.length ? `Added ${parts.join(' and ')}` : 'Nothing new';
  if (existing.length) s += `, ${existing.length} already here`;
  if (recognised) s += ` (${recognised} recognised by ${recognised === 1 ? 'its' : 'their'} look)`;
  if (!added.length && !existing.length) s = unreadable ? "Couldn't make out any titles. Try closer, straighter on, with more light." : 'No titles found in that photo.';
  return `${s}.`;
}

async function runJobs() {
  if (working) return;
  working = true;
  while (jobs.length) {
    const job = jobs.shift();
    job.state = 'reading';
    renderJob(job);
    try {
      const img = await decode(job.file);
      job.thumb = thumbnail(img);
      renderJob(job);
      const progress = (text) => { job.progress = text; renderJob(job); };
      const read = await readPhoto(img, (p) => progress(progressText(p)));
      img.close?.();
      const scan = await scanLines(read.lines, { mode: job.mode, onProgress: (p) => progress(progressText(p)) });
      await addBarcodes(scan, read.barcodes, job.mode);
      const photoId = newId('p');
      const { added, existing, pairs } = mergeScan(cat, scan, photoId);
      // Keep each spine's look, to recognise it later when its title can't be read.
      for (const { entry, item } of pairs) if (entry.group) addLook(item, saveLook(read, entry.group));
      // Spines whose title couldn't be read, recognised by their look.
      const seen = new Set(pairs.map((p) => p.item));
      const known = (job.mode === 'games' ? cat.games : cat.books).filter((i) => i.looks?.length && !seen.has(i));
      let recognised = 0;
      if (known.length) {
        for (const group of scan.leftovers) {
          const match = recognise(prepare(lookAt(read, group)), known.filter((i) => !seen.has(i)));
          if (!match) continue;
          seen.add(match.item);
          if (!match.item.photos.includes(photoId)) match.item.photos.push(photoId);
          existing.push(match.item);
          recognised++;
        }
      }
      cat.photos.unshift({ id: photoId, thumb: job.thumb, added: new Date().toISOString(), books: scan.books.length, games: scan.games.length });
      await save(true);
      for (const item of added) ui.fresh.add(item.id);
      if (added.length && ui.kind !== job.mode) showKind(job.mode);
      else renderList();
      job.state = 'done';
      job.summary = summarize(added, existing, scan.unreadable, recognised);
      renderJob(job);
      queueLookups();
      setTimeout(() => job.el?.remove(), 9000);
    } catch (e) {
      console.error(e);
      job.state = 'failed';
      job.error = readError(e);
      renderJob(job);
    }
  }
  working = false;
}

/**
 * Barcodes found in a photo, added to its scan: an ISBN is looked up on Open
 * Library, a game's barcode in the bundled games (then Wikidata). A book's
 * barcode in the Board games list (or a game's in Books) is left alone.
 */
async function addBarcodes(scan, barcodes, mode) {
  const done = new Set();
  for (const { code } of barcodes || []) {
    if (done.has(code)) continue;
    done.add(code);
    const entry = await entryForBarcode(code, mode).catch(() => null);
    if (entry) (mode === 'games' ? scan.games : scan.books).push(entry);
  }
}

async function entryForBarcode(code, mode) {
  const isbn = isbnOf(code);
  if (mode === 'books') {
    if (!isbn) return null;
    const book = await bookByIsbn(isbn);
    return book ? { ...book, kind: 'book', confidence: 1, barcode: isbn } : null;
  }
  if (isbn) return null;
  const game = await gameByBarcode(code);
  return game ? { kind: 'game', title: game.title, designer: game.designers[0] || null, year: game.year, confidence: 1, lookup: game, barcode: code } : null;
}

/** What the reader is doing, for a job card or the Find verdict. */
function progressText(p) {
  const mb = (n) => (n / 1e6).toFixed(0);
  if (p.stage === 'download') return `Getting the reader ready: ${mb(p.done)} of ${mb(p.total)} MB (first time only)…`;
  if (p.stage === 'detect') return 'Finding the text…';
  if (p.stage === 'recognise') return `Reading the titles: ${p.done} of ${p.total}…`;
  if (p.stage === 'lookup') return `Looking them up: ${p.done} of ${p.total}…`;
  return 'Reading the titles…';
}

function readError(e) {
  const message = String(e?.message || '');
  if (/fetch|network|load|404|Failed/i.test(message)) return "Couldn't download the reader. Check your connection and try again.";
  if (/memory|allocation/i.test(message)) return 'That photo was too big to read on this phone. Try a smaller one.';
  return "That photo couldn't be read. Try another.";
}

function players(l) {
  if (!l?.minPlayers) return '';
  return l.maxPlayers && l.maxPlayers !== l.minPlayers ? `${l.minPlayers}–${l.maxPlayers} players` : `${l.minPlayers} players`;
}

// ---------- lookups after an edit or a move (Open Library for books, Wikidata for games) ----------

let lookupsRunning = 0;
function queueLookups() {
  while (lookupsRunning < 2) {
    const item = [...cat.books, ...cat.games].find((i) => i.lookupStatus === 'pending' && !i.lookingUp);
    if (!item) return;
    item.lookingUp = true;
    lookupsRunning++;
    (item.kind === 'game' ? lookupGame(item) : lookupBook(item))
      .then((found) => {
        if (found && item.kind === 'game') {
          item.designer ||= found.designers[0] || null;
          item.year ||= found.year;
        }
        item.lookup = found;
        item.lookupStatus = found ? 'matched' : 'none';
      })
      .catch(() => {
        item.lookupStatus = navigator.onLine === false ? 'pending' : 'error';
      })
      .finally(() => {
        delete item.lookingUp;
        lookupsRunning--;
        save();
        if (ui.view === 'catalogue') renderList();
        if (ui.openId === item.id) fillItemSheet(item);
        if (item.lookupStatus !== 'pending') queueLookups();
      });
  }
}

// ---------- item sheet ----------

function openSheet(dialog) {
  if (!dialog.open) dialog.showModal();
}

function fillItemSheet(item) {
  const game = item.kind === 'game';
  $('item-cover').innerHTML = coverHtml(item, true);
  $('item-title').value = item.title;
  $('item-by-name').textContent = game ? 'Designer' : 'Author';
  $('item-by').value = (game ? item.designer : item.author) || '';
  const l = item.lookup || {};
  const status = (where) => (item.lookupStatus === 'pending' ? 'Looking it up…' : item.lookupStatus === 'none' ? `Not found on ${where}` : item.lookupStatus === 'error' ? "Couldn't reach it" : null);
  const facts = game
    ? [
      ['Found as', l.title && l.title.toLowerCase() !== item.title.toLowerCase() ? l.title : null],
      ['Designers', l.designers?.length ? l.designers.join(', ') : null],
      ['Published', l.year || item.year],
      ['Players', players(l)],
      ['Wikidata', status('Wikidata')],
    ]
    : [
      ['Found as', l.title && l.title.toLowerCase() !== item.title.toLowerCase() ? l.title : null],
      ['Authors', l.authors?.length ? l.authors.join(', ') : null],
      ['First published', l.year],
      ['Pages', l.pages],
      ['ISBN', l.isbn],
      ['Publisher', l.publisher],
      ['Subjects', l.subjects?.length ? l.subjects.join(', ') : null],
      ['Open Library', status('Open Library')],
    ];
  $('item-facts').innerHTML = facts.filter(([, v]) => v != null && v !== '').map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  const q = encodeURIComponent([item.title, game ? '' : item.author].filter(Boolean).join(' '));
  const links = game
    ? [
      ['BoardGameGeek', l.bgg ? `https://boardgamegeek.com/boardgame/${l.bgg}` : `https://boardgamegeek.com/geeksearch.php?action=search&objecttype=boardgame&q=${encodeURIComponent(item.title)}`],
      ...(l.wikidata ? [['Wikidata', `https://www.wikidata.org/wiki/${l.wikidata}`]] : []),
    ]
    : [
      l.key ? ['Open Library', `https://openlibrary.org${l.key}`] : ['Open Library', `https://openlibrary.org/search?q=${q}`],
      ['Goodreads', `https://www.goodreads.com/search?q=${l.isbn || q}`],
      ['Google Books', `https://www.google.com/search?tbm=bks&q=${q}`],
    ];
  $('item-links').innerHTML = links.map(([name, href]) => `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(name)} ↗</a>`).join('');
  const photos = item.photos.map((id) => cat.photos.find((p) => p.id === id)).filter(Boolean);
  $('item-photos').innerHTML = photos.map((p) => `<img src="${p.thumb}" alt="A photo it was found in">`).join('');
  $('item-spine').innerHTML = item.thumb ? `<span>Its spine${item.looks?.length ? ', which Bookzam remembers to recognise it by' : ''}</span><img src="${item.thumb}" alt="">` : '';
  $('item-move').textContent = game ? 'Move to books' : 'Move to board games';

}

function openItem(id) {
  const item = findItem(id);
  if (!item) return;
  ui.openId = id;
  ui.fresh.delete(id);
  fillItemSheet(item);
  openSheet($('item-sheet'));
}

function commitItemEdits() {
  const item = findItem(ui.openId);
  if (!item) return null;
  const title = $('item-title').value.trim();
  const by = $('item-by').value.trim() || null;
  const field = item.kind === 'game' ? 'designer' : 'author';
  if ((title && title !== item.title) || by !== item[field]) {
    if (title) item.title = title;
    item[field] = by;
    item.edited = true;
    item.lookup = null;
    item.lookupStatus = 'pending';
    queueLookups();
    save();
    renderList();
  }
  return item;
}

// ---------- menu, export, photos ----------

function exportKind(kind) {
  const data = exportData(cat, kind);
  if (!data.count) { toast(kind === 'books' ? 'No books to export yet.' : 'No board games to export yet.'); return; }
  const name = `bookzam-${kind}-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  const touch = matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    navigator.share({ files: [file], title: name }).catch((e) => { if (e?.name !== 'AbortError') download(blob, name); });
    return;
  }
  download(blob, name);
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function fillMenu() {
  const b = cat.books.length, g = cat.games.length, p = cat.photos.length;
  $('menu-summary').textContent = `${b} book${b === 1 ? '' : 's'} and ${g} board game${g === 1 ? '' : 's'} from ${p} photo${p === 1 ? '' : 's'}.`;
}

function renderPhotos() {
  $('photo-list').innerHTML = cat.photos.length
    ? cat.photos.map((p) => `<li><img src="${p.thumb}" alt=""><span>${new Date(p.added).toLocaleDateString()}<br><small>${p.books} books · ${p.games} games</small></span><button type="button" class="btn danger small" data-photo="${p.id}">Delete</button></li>`).join('')
    : '<li class="muted">No photos yet.</li>';
}

// ---------- Find Book ----------

const find = { img: null, query: '', run: 0, box: null, zoomed: false, read: null };

function refreshSuggestions() {
  const titles = [...new Set([...cat.books, ...cat.games].map((b) => b.title))].sort().slice(0, 500);
  $('find-suggest').innerHTML = titles.map((t) => `<option value="${esc(t)}">`).join('');
}

function setVerdict(html, state) {
  $('verdict').innerHTML = html;
  $('verdict').dataset.state = state || '';
}

function drawStage() {
  const canvas = $('stage-canvas');
  const drawn = render(find.img, 2000);
  canvas.width = drawn.width;
  canvas.height = drawn.height;
  canvas.getContext('2d').drawImage(drawn, 0, 0);
  $('overlay').setAttribute('viewBox', `0 0 ${canvas.width} ${canvas.height}`);
  $('overlay').innerHTML = '';
  setZoom(false);
}

function drawRing(box) {
  const { width: w, height: h } = $('stage-canvas');
  const r = ringFor(box, w, h);
  const stroke = Math.max(4, Math.min(w, h) / 120);
  const id = `m${find.run}`;
  // Darken everything but the ring, then draw the ring itself.
  $('overlay').innerHTML = `
    <defs><mask id="${id}"><rect width="${w}" height="${h}" fill="#fff"/><ellipse cx="${r.cx}" cy="${r.cy}" rx="${r.rx}" ry="${r.ry}" fill="#000"/></mask></defs>
    <rect class="dim" width="${w}" height="${h}" mask="url(#${id})"/>
    <ellipse class="ring" cx="${r.cx}" cy="${r.cy}" rx="${r.rx}" ry="${r.ry}" stroke-width="${stroke}" pathLength="100"/>`;
}

function setZoom(on) {
  find.zoomed = on && Boolean(find.box);
  const z = $('zoomer');
  if (!find.zoomed) { z.style.transform = ''; return; }
  const b = find.box;
  // Fill about half the width with the book, without pushing it off the top or bottom.
  const scale = Math.max(1, Math.min(4, 0.5 / Math.max(b.x1 - b.x0, 0.01), 0.95 / Math.max(b.y1 - b.y0, 0.01)));
  // Keep the photo covering the frame: never pan past its edges.
  const limit = (1 - 1 / scale) * 50;
  const pan = (c) => Math.max(-limit, Math.min(limit, (0.5 - c) * 100));
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  z.style.transform = `scale(${scale}) translate(${pan(cx)}%, ${pan(cy)}%)`;
}

async function runFind() {
  const query = $('find-query').value.trim();
  if (!query) { $('find-query').focus(); toast('Type the title you are looking for first.'); return; }
  if (!find.img) { $('find-input').click(); return; }
  find.query = query;
  find.box = null;
  const run = ++find.run;
  $('overlay').innerHTML = '';
  $('similar').innerHTML = '';
  setZoom(false);
  setVerdict(`Looking for <b>${esc(query)}</b>…`, 'busy');
  try {
    // Read the photo once; searching it again for another title is instant.
    if (!find.read) {
      $('frame').classList.add('scanning');
      const reading = find.reading ||= readPhoto(find.img, (p) => {
        if (run === find.run) setVerdict(`Looking for <b>${esc(query)}</b>… <span class="where">${esc(progressText(p))}</span>`, 'busy');
      });
      const read = await reading;
      if (find.reading === reading) { find.read = read; find.reading = null; }
    }
    if (run !== find.run) return;
    $('frame').classList.remove('scanning');
    const hint = catalogueHint(query);
    const result = findInRead(find.read, query, hint);
    if (!result.found) {
      // Show what it looks like, so the eye can do what the reader couldn't.
      const spine = hint?.thumb ? `<span class="spine-hint">Its spine looks like this:<img src="${hint.thumb}" alt=""></span>` : '';
      setVerdict(`Couldn't find <b>${esc(query)}</b> in this photo. <span class="where">Try closer, straighter on, or with more light.</span>${spine}`, 'missing');
      $('similar').innerHTML = result.similar.length
        ? `<span class="chips-label">Titles it could read here</span>${result.similar.map((t) => `<button type="button" class="chip" data-q="${esc(t)}">${esc(t)}</button>`).join('')}`
        : '';
      return;
    }
    find.box = result.box;
    drawRing(result.box);
    // A thin spine on a big shelf is easy to miss: zoom in on it after a moment.
    const size = (result.box.x1 - result.box.x0) * (result.box.y1 - result.box.y0);
    if (size < 0.02) setTimeout(() => { if (run === find.run) setZoom(true); }, 700);
    const how = result.byLook ? '<span class="tap-hint">Recognised by its look: its title was too small to read, so check it.</span>' : '';
    setVerdict(`Found <b>${esc(result.title)}</b>. <span class="where">${esc(result.where)}</span>${how}<span class="tap-hint">Tap the photo to zoom in.</span>`, 'found');
    navigator.vibrate?.(30);
  } catch (e) {
    if (run !== find.run) return;
    console.error(e);
    find.reading = null;
    $('frame').classList.remove('scanning');
    setVerdict(esc(readError(e)), 'error');
  }
}

/** The catalogue item a Find query names, if any: its title, author and how its spine read. */
function catalogueHint(query) {
  const q = query.toLowerCase().trim();
  const all = [...cat.books, ...cat.games];
  const item = all.find((i) => i.title.toLowerCase() === q) || all.find((i) => i.title.toLowerCase().startsWith(q) && q.length >= 4);
  return item ? { title: item.title, author: item.author || item.lookup?.authors?.[0] || '', read: item.read || '', looks: item.looks || [], thumb: item.thumb || null } : null;
}

async function loadFindPhoto(file) {
  try {
    find.img?.close?.();
    find.img = await decode(file);
    find.read = null;
    find.reading = null;
  } catch (e) {
    console.error(e);
    toast("That photo couldn't be opened. Try another.");
    return;
  }
  $('find-start').hidden = true;
  $('stage').hidden = false;
  drawStage();
  runFind();
}

// ---------- barcode scanner ----------

const scanner = { stream: null, timer: 0, busy: false, seen: new Set(), mode: 'books' };

async function openScanner() {
  scanner.mode = ui.kind;
  scanner.seen.clear();
  const games = scanner.mode === 'games';
  $('scan-title').textContent = games ? 'Scan game barcodes' : 'Scan book barcodes';
  $('scan-hint').textContent = games
    ? 'Point the camera at the barcode on a game box. Each one is added as soon as it is read; Bookzam knows the barcodes of about 550 games.'
    : 'Point the camera at the barcode on the back of a book. Each one is added as soon as it is read.';
  $('scan-list').innerHTML = '';
  setScanStatus('Starting the camera…');
  openSheet($('scan-sheet'));
  try {
    scanner.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
  } catch (e) {
    console.warn(e);
    setScanStatus("Bookzam can't use the camera. Allow camera access for this site, or photograph the barcodes with + instead.", 'error');
    return;
  }
  const video = $('scan-video');
  video.srcObject = scanner.stream;
  await video.play().catch(() => {});
  setScanStatus('Looking for a barcode…');
  scanner.timer = setInterval(scanFrame, 280);
}

function closeScanner() {
  clearInterval(scanner.timer);
  scanner.timer = 0;
  for (const track of scanner.stream?.getTracks() || []) track.stop();
  scanner.stream = null;
  $('scan-video').srcObject = null;
}

function setScanStatus(text, state = '') {
  $('scan-status').textContent = text;
  $('scan-status').dataset.state = state;
}

let scanCanvas = null;
async function scanFrame() {
  const video = $('scan-video');
  if (scanner.busy || !scanner.stream || video.readyState < 2) return;
  scanner.busy = true;
  try {
    const w = video.videoWidth, h = video.videoHeight;
    scanCanvas ||= document.createElement('canvas');
    scanCanvas.width = w;
    scanCanvas.height = h;
    const ctx = scanCanvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, w, h);
    const codes = await readBarcodes(ctx.getImageData(0, 0, w, h));
    for (const { code } of codes) {
      if (scanner.seen.has(code)) continue;
      scanner.seen.add(code);
      beep();
      setScanStatus(`Read ${code}, looking it up…`);
      await addScanned(code);
    }
  } catch (e) {
    console.warn(e);
  } finally {
    scanner.busy = false;
  }
}

async function addScanned(code) {
  const mode = scanner.mode;
  let entry = null;
  try { entry = await entryForBarcode(code, mode); } catch (e) { console.warn(e); }
  const li = document.createElement('li');
  if (!entry) {
    const wrong = mode === 'books' ? !isbnOf(code) : Boolean(isbnOf(code));
    li.innerHTML = `<span class="no">✕</span><span>${esc(code)}: ${wrong ? (mode === 'books' ? "not a book's barcode" : "a book's barcode, not a game's") : 'not found'}</span>`;
    setScanStatus(wrong ? (mode === 'books' ? 'That barcode is not an ISBN.' : 'That is a book; scan it from the Books list.') : `Bookzam doesn't know ${code}. Photograph the title instead.`, 'error');
  } else {
    // Barcode items belong to no photo, so deleting a photo never removes them.
    const { added } = mergeScan(cat, mode === 'games' ? { games: [entry] } : { books: [entry] }, 'barcode');
    for (const item of added) { item.manual = true; ui.fresh.add(item.id); }
    save();
    renderList();
    li.innerHTML = `<span class="ok">✓</span><span>${esc(entry.title)}${entry.author ? ` — ${esc(entry.author)}` : ''}${added.length ? '' : ' (already here)'}</span>`;
    setScanStatus(added.length ? `Added ${entry.title}.` : `${entry.title} is already here.`);
    navigator.vibrate?.(40);
  }
  $('scan-list').prepend(li);
}

let audio = null;
function beep() {
  try {
    audio ||= new AudioContext();
    const osc = audio.createOscillator(), gain = audio.createGain();
    osc.frequency.value = 1320;
    gain.gain.setValueAtTime(0.12, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.12);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.13);
  } catch {}
}

// ---------- wiring ----------

function wire() {
  for (const tab of document.querySelectorAll('.tabs [role=tab]')) tab.addEventListener('click', () => showView(tab.dataset.view));
  for (const seg of document.querySelectorAll('.segmented [role=tab]')) seg.addEventListener('click', () => showKind(seg.dataset.kind));

  for (const btn of document.querySelectorAll('[data-scan]')) btn.addEventListener('click', openScanner);
  $('scan-sheet').addEventListener('close', closeScanner);
  // Start fetching the reader while the photo picker is open.
  for (const btn of document.querySelectorAll('[data-add]')) btn.addEventListener('click', () => { warmUp(); $('add-input').click(); });
  $('add-input').addEventListener('change', (e) => {
    addFiles([...e.target.files]);
    e.target.value = '';
  });

  $('search').addEventListener('input', (e) => { ui.query = e.target.value; renderList(); });
  $('sort').addEventListener('change', (e) => { ui.sort = e.target.value; renderList(); });
  $('items').addEventListener('click', (e) => {
    const btn = e.target.closest('.item');
    if (btn) openItem(btn.dataset.id);
  });

  // Item sheet
  const sheet = $('item-sheet');
  sheet.addEventListener('close', () => { commitItemEdits(); ui.openId = null; renderList(); });
  $('item-find').addEventListener('click', () => {
    const item = commitItemEdits();
    sheet.close();
    if (!item) return;
    $('find-query').value = item.title;
    showView('find');
    if (find.img) runFind();
  });
  $('item-move').addEventListener('click', () => {
    commitItemEdits();
    const item = moveItem(cat, ui.openId);
    if (!item) return;
    ui.openId = null; // so closing the sheet doesn't write the old fields onto the moved item
    save();
    queueLookups();
    sheet.close();
    toast(`Moved to ${item.kind === 'game' ? 'board games' : 'books'}.`);
  });
  $('item-relookup').addEventListener('click', () => {
    const item = commitItemEdits();
    if (!item) return;
    item.lookup = null;
    item.lookupStatus = 'pending';
    fillItemSheet(item);
    queueLookups();
  });
  $('item-delete').addEventListener('click', () => {
    const id = ui.openId;
    cat.books = cat.books.filter((i) => i.id !== id);
    cat.games = cat.games.filter((i) => i.id !== id);
    ui.openId = null;
    save();
    sheet.close();
    toast('Deleted.');
  });

  // Menu
  $('menu-btn').addEventListener('click', () => { fillMenu(); openSheet($('menu-sheet')); });
  $('export-books').addEventListener('click', () => exportKind('books'));
  $('export-games').addEventListener('click', () => exportKind('games'));
  $('show-photos').addEventListener('click', () => { $('menu-sheet').close(); renderPhotos(); openSheet($('photos-sheet')); });
  $('clear-all').addEventListener('click', async () => {
    if (!confirm('Delete every book, board game and photo from this device? Export first if you want to keep them.')) return;
    cat = emptyCatalogue();
    await save(true);
    $('menu-sheet').close();
    renderList();
    toast('Catalogue cleared.');
  });
  $('photo-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-photo]');
    if (!btn) return;
    removePhoto(cat, btn.dataset.photo);
    save();
    renderPhotos();
    renderList();
  });

  // Close a sheet with a tap on its backdrop.
  for (const dialog of document.querySelectorAll('dialog.sheet')) {
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  }

  // Find Book
  $('find-form').addEventListener('submit', (e) => {
    e.preventDefault();
    $('find-query').blur();
    if (find.img) runFind(); else $('find-input').click();
  });
  $('find-shoot').addEventListener('click', () => {
    warmUp();
    if (!$('find-query').value.trim()) { $('find-query').focus(); toast('Type the title you are looking for first.'); return; }
    $('find-input').click();
  });
  $('find-input').addEventListener('change', (e) => {
    const [file] = e.target.files;
    e.target.value = '';
    if (file) loadFindPhoto(file);
  });
  $('find-new').addEventListener('click', () => $('find-input').click());
  $('find-again').addEventListener('click', () => runFind());
  $('similar').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-q]');
    if (!chip) return;
    $('find-query').value = chip.dataset.q;
    runFind();
  });
  $('frame').addEventListener('click', () => setZoom(!find.zoomed));

  addEventListener('online', queueLookups);
}

async function start() {
  wire();
  cat = await loadCatalogue();
  for (const item of cat.books) delete item.lookingUp; // a lookup cut off by closing the page
  if (location.hash === '#find') showView('find');
  renderList();
  queueLookups();
}

start();
