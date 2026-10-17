// Bookzam: the page. Catalogue reads photos into book and board game lists;
// Find Book circles one book in a photo of a shelf.

import { mergeScan, removePhoto, moveItem, filterItems, sortItems, exportData, emptyCatalogue, newId } from './catalogue.js';
import { scanPhoto, findInPhoto, errorMessage } from './api.js';
import { lookupBook } from './lookup.js';
import { loadCatalogue, saveCatalogue, persist } from './store.js';
import { decode, forServer, thumbnail, render } from './photo.js';
import { cropAround, fromCrop, overlap, ringFor } from './geometry.js';

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
  if (item.kind === 'game') return [item.publisher, item.designer, item.year].filter(Boolean).join(' · ');
  return [item.author || item.lookup?.authors?.[0], item.lookup?.year || item.year].filter(Boolean).join(' · ');
}

function renderList() {
  const items = cat[ui.kind];
  $('count-books').textContent = cat.books.length;
  $('count-games').textContent = cat.games.length;
  const shown = sortItems(filterItems(items, ui.query), ui.sort);
  const any = cat.books.length + cat.games.length > 0;
  $('toolbar').hidden = !items.length;
  $('fab').hidden = !any;
  $('empty').hidden = items.length > 0;
  if (!items.length) {
    $('empty-title').textContent = any ? (ui.kind === 'books' ? 'No books yet' : 'No board games yet') : 'Snap a shelf';
    $('empty-text').textContent = any
      ? `Photos you add put ${ui.kind === 'books' ? 'books' : 'board games'} here as Bookzam finds them.`
      : 'Take a photo of your books or board games, spines facing you. Bookzam reads every title it can and adds them here. Add as many photos as you like.';
  }
  $('none-match').hidden = !(items.length && !shown.length);
  $('items').innerHTML = shown.map((item) => {
    const unsure = item.confidence != null && item.confidence < 0.6;
    const status = item.kind === 'book' && item.lookupStatus === 'pending' ? '<span class="looking" title="Looking it up"></span>' : '';
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
    const job = { id: newId('j'), file, state: 'waiting', el: null };
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
  const text = {
    waiting: 'Waiting…',
    reading: 'Reading the titles…',
    done: job.summary,
    failed: job.error,
  }[job.state];
  job.el.dataset.state = job.state;
  job.el.innerHTML = `${thumb}<span class="job-text">${esc(text)}</span>${job.state === 'reading' || job.state === 'waiting' ? '<span class="spinner" aria-hidden="true"></span>' : '<button type="button" class="x" aria-label="Dismiss">×</button>'}`;
  job.el.querySelector('.x')?.addEventListener('click', () => job.el.remove());
}

function summarize(added, existing, unreadable) {
  const books = added.filter((i) => i.kind === 'book').length;
  const games = added.filter((i) => i.kind === 'game').length;
  const parts = [];
  if (books) parts.push(`${books} book${books === 1 ? '' : 's'}`);
  if (games) parts.push(`${games} board game${games === 1 ? '' : 's'}`);
  let s = parts.length ? `Added ${parts.join(' and ')}` : 'Nothing new';
  if (existing.length) s += `, ${existing.length} already here`;
  if (unreadable) s += `. ${unreadable} couldn't be read`;
  if (!added.length && !existing.length) s = unreadable ? `Couldn't read any titles (${unreadable} unreadable). Try closer, with more light.` : 'No books or games found in that photo.';
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
      const scan = await scanPhoto(forServer(img));
      img.close?.();
      const photoId = newId('p');
      const { added, existing } = mergeScan(cat, scan, photoId);
      cat.photos.unshift({ id: photoId, thumb: job.thumb, added: new Date().toISOString(), books: (scan.books || []).length, games: (scan.games || []).length, source: scan.source });
      cat.reader = scan.source;
      await save(true);
      for (const item of added) ui.fresh.add(item.id);
      // Show whichever list just grew if the current one didn't.
      const grew = { books: added.some((i) => i.kind === 'book'), games: added.some((i) => i.kind === 'game') };
      if (!grew[ui.kind] && grew[ui.kind === 'books' ? 'games' : 'books']) showKind(ui.kind === 'books' ? 'games' : 'books');
      else renderList();
      job.state = 'done';
      job.summary = summarize(added, existing, scan.unreadable);
      renderJob(job);
      queueLookups();
      setTimeout(() => job.el?.remove(), 9000);
    } catch (e) {
      console.error(e);
      job.state = 'failed';
      job.error = e?.code ? errorMessage(e) : "That photo couldn't be opened. Try another.";
      renderJob(job);
    }
  }
  working = false;
}

// ---------- Open Library lookups ----------

let lookupsRunning = 0;
function queueLookups() {
  while (lookupsRunning < 2) {
    const item = cat.books.find((i) => i.lookupStatus === 'pending' && !i.lookingUp);
    if (!item) return;
    item.lookingUp = true;
    lookupsRunning++;
    lookupBook(item)
      .then((found) => {
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
  $('item-by-name').textContent = game ? 'Publisher' : 'Author';
  $('item-by').value = (game ? item.publisher : item.author) || '';
  const l = item.lookup || {};
  const facts = game
    ? [['Designer', item.designer], ['Year', item.year]]
    : [
      ['Found as', l.title && l.title.toLowerCase() !== item.title.toLowerCase() ? l.title : null],
      ['Authors', l.authors?.length ? l.authors.join(', ') : null],
      ['First published', l.year],
      ['Pages', l.pages],
      ['ISBN', l.isbn],
      ['Publisher', l.publisher],
      ['Subjects', l.subjects?.length ? l.subjects.join(', ') : null],
      ['Open Library', item.lookupStatus === 'pending' ? 'Looking it up…' : item.lookupStatus === 'none' ? 'No match found' : item.lookupStatus === 'error' ? "Couldn't reach it" : null],
    ];
  $('item-facts').innerHTML = facts.filter(([, v]) => v != null && v !== '').map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  const q = encodeURIComponent([item.title, game ? '' : item.author].filter(Boolean).join(' '));
  const links = game
    ? [['BoardGameGeek', `https://boardgamegeek.com/geeksearch.php?action=search&objecttype=boardgame&q=${encodeURIComponent(item.title)}`]]
    : [
      l.key ? ['Open Library', `https://openlibrary.org${l.key}`] : ['Open Library', `https://openlibrary.org/search?q=${q}`],
      ['Goodreads', `https://www.goodreads.com/search?q=${l.isbn || q}`],
      ['Google Books', `https://www.google.com/search?tbm=bks&q=${q}`],
    ];
  $('item-links').innerHTML = links.map(([name, href]) => `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(name)} ↗</a>`).join('');
  const photos = item.photos.map((id) => cat.photos.find((p) => p.id === id)).filter(Boolean);
  $('item-photos').innerHTML = photos.map((p) => `<img src="${p.thumb}" alt="A photo it was found in">`).join('');
  $('item-move').textContent = game ? 'Move to books' : 'Move to board games';
  $('item-relookup').hidden = game;
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
  const field = item.kind === 'game' ? 'publisher' : 'author';
  if ((title && title !== item.title) || by !== item[field]) {
    if (title) item.title = title;
    item[field] = by;
    item.edited = true;
    if (item.kind === 'book') { item.lookup = null; item.lookupStatus = 'pending'; queueLookups(); }
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
  $('menu-reader').textContent = cat.reader === 'claude' ? 'Photos are read by Claude.' : cat.reader === 'workers-ai' ? 'Photos are read by a Llama vision model on Cloudflare Workers AI.' : '';
}

function renderPhotos() {
  $('photo-list').innerHTML = cat.photos.length
    ? cat.photos.map((p) => `<li><img src="${p.thumb}" alt=""><span>${new Date(p.added).toLocaleDateString()}<br><small>${p.books} books · ${p.games} games</small></span><button type="button" class="btn danger small" data-photo="${p.id}">Delete</button></li>`).join('')
    : '<li class="muted">No photos yet.</li>';
}

// ---------- Find Book ----------

const find = { img: null, query: '', run: 0, box: null, zoomed: false, controller: null };

function refreshSuggestions() {
  const titles = [...new Set(cat.books.map((b) => b.title))].sort().slice(0, 500);
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

function drawRing(box, refined) {
  const { width: w, height: h } = $('stage-canvas');
  const r = ringFor(box, w, h);
  const stroke = Math.max(4, Math.min(w, h) / 120);
  const id = `m${find.run}`;
  // Darken everything but the ring, then draw the ring itself.
  $('overlay').innerHTML = `
    <defs><mask id="${id}"><rect width="${w}" height="${h}" fill="#fff"/><ellipse cx="${r.cx}" cy="${r.cy}" rx="${r.rx}" ry="${r.ry}" fill="#000"/></mask></defs>
    <rect class="dim" width="${w}" height="${h}" mask="url(#${id})"/>
    <ellipse class="ring${refined ? ' refined' : ''}" cx="${r.cx}" cy="${r.cy}" rx="${r.rx}" ry="${r.ry}" stroke-width="${stroke}" pathLength="100"/>`;
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
  find.controller?.abort();
  const controller = find.controller = new AbortController();
  const run = ++find.run;
  $('overlay').innerHTML = '';
  $('similar').innerHTML = '';
  setZoom(false);
  $('frame').classList.add('scanning');
  setVerdict(`Looking for <b>${esc(query)}</b>…`, 'busy');
  try {
    const first = await findInPhoto(forServer(find.img), query, controller.signal);
    if (run !== find.run) return;
    if (!first.found) {
      $('frame').classList.remove('scanning');
      setVerdict(`Couldn't find <b>${esc(query)}</b> in this photo.${first.where ? ` <span class="where">${esc(first.where)}</span>` : ''}`, 'missing');
      $('similar').innerHTML = first.similar?.length
        ? `<span class="chips-label">Did you mean</span>${first.similar.map((s) => `<button type="button" class="chip" data-q="${esc(s)}">${esc(s)}</button>`).join('')}`
        : '';
      return;
    }
    find.box = first.box;
    drawRing(first.box, false);
    setVerdict(`Found <b>${esc(first.title || query)}</b>. <span class="where">${esc(first.where)}</span><span class="refining">Sharpening the circle…</span>`, 'found');
    // Look again at a close-up from the full-resolution photo, which shows the spines in far more detail.
    const crop = cropAround(first.box);
    if ((crop.x1 - crop.x0) * (crop.y1 - crop.y0) < 0.8) {
      try {
        const second = await findInPhoto(forServer(find.img, crop), first.title || query, controller.signal);
        if (run !== find.run) return;
        if (second.found) {
          const box = fromCrop(second.box, crop);
          if (overlap(box, first.box) > 0.3) {
            find.box = box;
            drawRing(box, true);
          }
        }
      } catch (e) {
        if (e?.name === 'AbortError') return;
        console.warn('Refining the find failed; keeping the first circle', e);
      }
    }
    $('frame').classList.remove('scanning');
    setVerdict(`Found <b>${esc(first.title || query)}</b>. <span class="where">${esc(first.where)}</span><span class="tap-hint">Tap the photo to zoom in.</span>`, 'found');
    navigator.vibrate?.(30);
  } catch (e) {
    if (e?.name === 'AbortError' || run !== find.run) return;
    console.error(e);
    $('frame').classList.remove('scanning');
    setVerdict(esc(errorMessage(e)), 'error');
  }
}

async function loadFindPhoto(file) {
  try {
    find.img?.close?.();
    find.img = await decode(file);
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

// ---------- wiring ----------

function wire() {
  for (const tab of document.querySelectorAll('.tabs [role=tab]')) tab.addEventListener('click', () => showView(tab.dataset.view));
  for (const seg of document.querySelectorAll('.segmented [role=tab]')) seg.addEventListener('click', () => showKind(seg.dataset.kind));

  for (const btn of document.querySelectorAll('[data-add]')) btn.addEventListener('click', () => $('add-input').click());
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
