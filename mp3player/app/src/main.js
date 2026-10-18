// MP3 Player: the library views, playback, the queue, adding and removing
// songs, and the custom order. Songs live in IndexedDB (store.js); the
// listener adds them with the system file picker, a folder picker where the
// browser has one, or by dropping files on the page.

import * as store from './store.js';
import { Player, probe } from './player.js';
import { Queue } from './queue.js';
import { readTags, fromFileName } from './tags.js';
import { icon } from './icons.js';
import {
  artistOf, albumArtistOf, albumOf, titleOf, albumKey, fold, reconcileOrder, sortTracks, SORTS, moveItem,
  groupAlbums, groupArtists, searchTracks, hashIndex, formatTime, formatTotal, plural,
} from './library.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const AUDIO_EXT = {
  mp3: 'audio/mpeg', m4a: 'audio/mp4', m4b: 'audio/mp4', mp4: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac',
  wav: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg; codecs=opus', webm: 'audio/webm',
  aif: 'audio/aiff', aiff: 'audio/aiff', caf: 'audio/x-caf',
};
const COVER_NAME = /^(cover|folder|front|album|albumart)[^/]*\.(jpe?g|png|webp)$/i;
const extOf = (name) => (/\.([^.]+)$/.exec(name)?.[1] ?? '').toLowerCase();

// ---------------------------------------------------------------- state

const PREFS_KEY = 'mp3player.prefs';
const SESSION_KEY = 'mp3player.session';
const load = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode or full */ } };

const prefs = { tab: 'songs', sort: 'custom', volume: 1, ...load(PREFS_KEY, {}) };
const savePrefs = () => save(PREFS_KEY, prefs);

/** @type {Map<string, object>} */
const tracks = new Map();
let order = []; // custom order of track ids
let queue = new Queue();
const player = new Player();
const ui = { query: '', editing: false, route: { name: 'library' }, scroll: new Map(), sleep: null };
let delivered = new Set();
const pendingRemovals = new Map(); // batch id → { list, timer }

// ---------------------------------------------------------------- art

const artUrls = new Map(); // `${key}|thumb` / `${key}|full` → Promise<string|null>
const artColors = new Map();

function artUrl(key, size = 'thumb') {
  if (!key) return Promise.resolve(null);
  const id = `${key}|${size}`;
  if (!artUrls.has(id)) {
    artUrls.set(id, store.art(key).then((rec) => {
      if (!rec) return null;
      if (rec.color) artColors.set(key, rec.color);
      const blob = size === 'full' ? rec.full ?? rec.thumb : rec.thumb ?? rec.full;
      return blob ? URL.createObjectURL(blob) : null;
    }).catch(() => null));
  }
  return artUrls.get(id);
}

/** Attributes for an art square: a stand-in tile or gradient now, the real cover lazily. */
function artAttrs(artKey, seed, cls = '') {
  const n = hashIndex(seed || 'x', 8);
  const tile = delivered.has(`art-${n + 1}`) ? ` style="--h:${hashIndex(seed || 'x', 360)};background-image:url(assets/art/art-${n + 1}.webp)"` : ` style="--h:${hashIndex(seed || 'x', 360)}"`;
  return `class="art ${cls}" data-art="${esc(artKey ?? '')}"${tile}`;
}

const artObserver = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    artObserver.unobserve(e.target);
    fillArt(e.target);
  }
}, { rootMargin: '400px' }) : null;

function fillArt(el, size = 'thumb') {
  const key = el.dataset.art;
  if (!key) return;
  artUrl(key, size).then((url) => {
    if (url && el.dataset.art === key) {
      el.style.backgroundImage = `url("${url}")`;
      el.classList.add('has-art');
    }
  });
}

function watchArt(root) {
  for (const el of root.querySelectorAll('.art[data-art]:not([data-art=""])')) {
    if (artObserver) artObserver.observe(el); else fillArt(el);
  }
}

function hashBytes(b) {
  let h = 2166136261;
  const step = Math.max(1, Math.floor(b.length / 65536));
  for (let i = 0; i < b.length; i += step) h = Math.imul(h ^ b[i], 16777619);
  return `${(h >>> 0).toString(16)}-${b.length.toString(16)}`;
}

async function loadImage(blob) {
  try {
    return await createImageBitmap(blob);
  } catch {
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function drawScaled(img, max, type = 'image/jpeg') {
  const w = img.width || img.naturalWidth;
  const h = img.height || img.naturalHeight;
  const s = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * s));
  c.height = Math.max(1, Math.round(h * s));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise((resolve) => c.toBlob(resolve, type, 0.86));
}

/** A rich colour from the cover for the player's background. */
function coverColor(img) {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, 16, 16);
  const d = g.getImageData(0, 0, 16, 16).data;
  let r = 0, gg = 0, b = 0, wsum = 0;
  for (let i = 0; i < d.length; i += 4) {
    const max = Math.max(d[i], d[i + 1], d[i + 2]);
    const min = Math.min(d[i], d[i + 1], d[i + 2]);
    const w = 0.15 + (max - min) / 255 + (max > 40 && max < 235 ? 0.3 : 0);
    r += d[i] * w; gg += d[i + 1] * w; b += d[i + 2] * w; wsum += w;
  }
  return [r / wsum, gg / wsum, b / wsum].map(Math.round);
}

/** The player-background colour of a stand-in cover tile. */
const tileColors = new Map();
function tileColor(n) {
  if (!tileColors.has(n)) {
    const img = new Image();
    img.src = `assets/art/art-${n}.webp`;
    tileColors.set(n, img.decode().then(() => coverColor(img)).catch(() => null));
  }
  return tileColors.get(n);
}

/** Store cover art once per distinct image; returns its key. */
async function saveArt(data, mime) {
  const key = hashBytes(data);
  if (await store.hasArt(key)) return key;
  const blob = new Blob([data], { type: mime || 'image/jpeg' });
  try {
    const img = await loadImage(blob);
    const w = img.width || img.naturalWidth;
    const thumb = await drawScaled(img, 320);
    const full = w > 1200 ? await drawScaled(img, 1200) : blob;
    const color = coverColor(img);
    img.close?.();
    await store.putArt(key, { thumb, full, color });
    return key;
  } catch {
    return undefined; // not an image the browser can read
  }
}

// ---------------------------------------------------------------- library

const visibleTracks = () => [...tracks.values()];

async function loadLibrary() {
  const all = await store.allTracks();
  const removed = all.filter((t) => t.removed);
  if (removed.length) {
    const keep = new Set(all.filter((t) => !t.removed && t.artKey).map((t) => t.artKey));
    store.deleteTracks(removed.map((t) => t.id), keep).catch(() => {});
  }
  for (const t of all) if (!t.removed) tracks.set(t.id, t);
  order = reconcileOrder((await store.getMeta('order')) ?? [], visibleTracks());
}

const saveOrder = () => store.setMeta('order', order).catch(() => {});

function songsInView() {
  const list = sortTracks(visibleTracks(), prefs.sort, order);
  return ui.query ? searchTracks(list, ui.query) : list;
}

// ---------------------------------------------------------------- views

const view = $('view');

function rowHtml(t, { number, art = true, edit = false } = {}) {
  const lead = number != null
    ? `<span class="num"><span class="n">${number}</span>${eqHtml()}</span>`
    : art ? `<span ${artAttrs(t.artKey, albumOf(t))}>${eqHtml()}</span>` : '';
  const sub = number != null ? esc(artistOf(t)) : `${esc(artistOf(t))} · ${esc(albumOf(t))}`;
  return `<li class="row${edit ? ' editing' : ''}" data-id="${esc(t.id)}">
    ${edit ? `<button class="grip" type="button" aria-label="Move ${esc(titleOf(t))} (drag, or use the arrow keys)">${icon('grip')}</button>` : ''}
    <button class="row-main" type="button">${lead}<span class="meta"><span class="t">${esc(titleOf(t))}</span><span class="s">${sub}</span></span>
      <span class="dur">${formatTime(t.duration)}</span></button>
    ${edit
      ? `<button class="icon-btn remove" type="button" aria-label="Remove ${esc(titleOf(t))} from the library">${icon('minus')}</button>`
      : `<button class="icon-btn more" type="button" aria-label="More for ${esc(titleOf(t))}">${icon('more')}</button>`}
  </li>`;
}

const eqHtml = () => '<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>';

function emptyHtml() {
  const art = delivered.has('welcome') ? '<img class="welcome-art" src="assets/ui/welcome.webp" alt="" width="1200" height="900">' : `<div class="welcome-standin" aria-hidden="true">${icon('disc')}</div>`;
  const where = isIOS
    ? 'Pick songs from the Files app (On My iPhone, iCloud Drive or any folder there). Songs in the Apple Music app can’t be reached by any web page, and protected downloads won’t play.'
    : 'Pick songs or a whole folder from this device, or drop them here.';
  return `<section class="welcome">
    ${art}
    <h1>Add your music</h1>
    <p>Your library is the songs you add from this device. They play here, offline, and the files on your device are never changed.</p>
    <div class="welcome-actions">
      <button class="pill primary" type="button" data-act="add-files">${icon('file')}<span>Add songs</span></button>
      ${folderSupported() ? `<button class="pill" type="button" data-act="add-folder">${icon('folder')}<span>Add a folder</span></button>` : ''}
    </div>
    <p class="fine">${where}</p>
  </section>`;
}

function renderLibrary() {
  const all = visibleTracks();
  if (!all.length) {
    view.innerHTML = emptyHtml();
    return;
  }
  const tabs = ['songs', 'albums', 'artists'].map((t) => `<button class="chip${prefs.tab === t ? ' on' : ''}" type="button" role="tab" aria-selected="${prefs.tab === t}" data-tab="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('');
  let body = '';
  if (prefs.tab === 'songs') {
    const list = songsInView();
    const total = list.reduce((s, t) => s + (t.duration || 0), 0);
    const canDrag = ui.editing && prefs.sort === 'custom' && !ui.query;
    body = `
      <div class="tools">
        <label class="search">${icon('search')}<input id="q" type="search" placeholder="Search songs, artists, albums" value="${esc(ui.query)}" autocomplete="off" aria-label="Search the library"></label>
        <button class="tool-btn" type="button" data-act="sort" aria-label="Sort: ${esc(SORTS[prefs.sort])}">${icon('sort')}<span>${esc(SORTS[prefs.sort])}</span></button>
        <button class="tool-btn${ui.editing ? ' on' : ''}" type="button" data-act="edit">${ui.editing ? `${icon('check')}<span>Done</span>` : `${icon('edit')}<span>Edit</span>`}</button>
      </div>
      <div class="list-head">
        <span class="count">${plural(list.length, 'song')}${total ? ` · ${formatTotal(total)}` : ''}</span>
        ${list.length && !ui.editing ? `<span class="head-actions">
          <button class="round-btn" type="button" data-act="shuffle-all" aria-label="Shuffle play">${icon('shuffle')}</button>
          <button class="play-btn small" type="button" data-act="play-all" aria-label="Play">${icon('play')}</button></span>` : ''}
      </div>
      ${ui.editing ? `<p class="hint">${canDrag ? 'Drag ≡ to put songs in any order, or tap − to take a song out of the library (the file stays on your device).' : 'Clear the search to reorder.'}</p>` : ''}
      ${list.length ? `<ol class="rows" id="songRows" data-context="songs">${list.map((t) => rowHtml(t, { edit: ui.editing })).join('')}</ol>`
        : `<p class="nothing">No songs match “${esc(ui.query)}”.</p>`}`;
  } else if (prefs.tab === 'albums') {
    body = `<div class="grid">${groupAlbums(all).map((a) => `
      <button class="card" type="button" data-album="${esc(a.key)}">
        <span ${artAttrs(a.artKey, a.name)}></span>
        <span class="card-t">${esc(a.name)}</span>
        <span class="card-s">${esc(a.artist)}${a.year ? ` · ${a.year}` : ''}</span>
      </button>`).join('')}</div>`;
  } else {
    body = `<ul class="rows artists">${groupArtists(all).map((a) => `
      <li class="row"><button class="row-main" type="button" data-artist="${esc(a.key)}">
        ${artistArt(a, 'round')}
        <span class="meta"><span class="t">${esc(a.name)}</span><span class="s">${plural(a.albums.length, 'album')} · ${plural(a.tracks.length, 'song')}</span></span>
      </button></li>`).join('')}</ul>`;
  }
  view.innerHTML = `<div class="lib-head"><h1>Your Library</h1><div class="chips" role="tablist" aria-label="Library">${tabs}</div></div>${body}`;
}

function artistArt(a, cls) {
  if (delivered.has('artist')) return `<span class="art ${cls} artist-photo" style="--h:${hashIndex(a.name, 360)};background-image:url(assets/art/artist.webp)"></span>`;
  return `<span ${artAttrs(a.artKey, a.name, cls)}></span>`;
}

function collectionHead({ artHtml, kind, title, sub, ctx }) {
  return `<div class="collection-head">
    <button class="icon-btn back" type="button" data-act="back" aria-label="Back">${icon('back')}</button>
    ${artHtml}
    <div class="collection-info">
      <span class="kind">${kind}</span>
      <h1>${esc(title)}</h1>
      <p class="sub">${sub}</p>
    </div>
    <div class="collection-actions">
      <button class="round-btn" type="button" data-act="shuffle-ctx" data-ctx="${ctx}" aria-label="Shuffle play">${icon('shuffle')}</button>
      <button class="play-btn" type="button" data-act="play-ctx" data-ctx="${ctx}" aria-label="Play">${icon('play')}</button>
    </div>
  </div>`;
}

function findAlbum(key) { return groupAlbums(visibleTracks()).find((a) => a.key === key); }
function findArtist(key) { return groupArtists(visibleTracks()).find((a) => a.key === key); }

function renderAlbum(key) {
  const a = findAlbum(key);
  if (!a) return go({ name: 'library' }, { replace: true });
  const total = a.tracks.reduce((s, t) => s + (t.duration || 0), 0);
  const multiDisc = new Set(a.tracks.map((t) => t.disc ?? 1)).size > 1;
  let lastDisc = null;
  const rows = a.tracks.map((t, i) => {
    let disc = '';
    if (multiDisc && (t.disc ?? 1) !== lastDisc) { lastDisc = t.disc ?? 1; disc = `<li class="disc-head">Disc ${lastDisc}</li>`; }
    return disc + rowHtml(t, { number: t.track ?? i + 1 });
  }).join('');
  view.innerHTML = collectionHead({
    artHtml: `<span ${artAttrs(a.artKey, a.name, 'hero')}></span>`,
    kind: 'Album', title: a.name,
    sub: `<button class="link" type="button" data-artist="${esc(fold(a.artist))}">${esc(a.artist)}</button>${a.year ? ` · ${a.year}` : ''} · ${plural(a.tracks.length, 'song')}${total ? `, ${formatTotal(total)}` : ''}`,
    ctx: 'album',
  }) + `<ol class="rows" data-context="album">${rows}</ol>`;
  const hero = view.querySelector('.art.hero');
  if (hero) fillArt(hero, 'full');
}

function renderArtist(key) {
  const a = findArtist(key);
  if (!a) return go({ name: 'library' }, { replace: true });
  view.innerHTML = collectionHead({
    artHtml: artistArt(a, 'hero round'), kind: 'Artist', title: a.name,
    sub: `${plural(a.albums.length, 'album')} · ${plural(a.tracks.length, 'song')}`, ctx: 'artist',
  }) + `<h2 class="section">Albums</h2>
    <div class="shelf-row">${a.albums.map((al) => `<button class="card" type="button" data-album="${esc(al.key)}"><span ${artAttrs(al.artKey, al.name)}></span><span class="card-t">${esc(al.name)}</span><span class="card-s">${al.year ?? plural(al.tracks.length, 'song')}</span></button>`).join('')}</div>
    <h2 class="section">Songs</h2>
    <ol class="rows" data-context="artist">${a.tracks.map((t) => rowHtml(t)).join('')}</ol>`;
}

function render() {
  const r = ui.route;
  if (r.name === 'album') renderAlbum(r.key);
  else if (r.name === 'artist') renderArtist(r.key);
  else renderLibrary();
  watchArt(view);
  markCurrent();
}

/** Re-render keeping the search box's focus and caret. */
function rerender() {
  const q = document.activeElement?.id === 'q' ? document.activeElement.selectionStart : null;
  const y = scrollY;
  render();
  scrollTo(0, y);
  if (q != null) { const input = $('q'); input?.focus(); input?.setSelectionRange(q, q); }
}

function markCurrent() {
  for (const el of document.querySelectorAll('.row.current')) el.classList.remove('current');
  const id = queue.current;
  if (!id) return;
  for (const el of document.querySelectorAll(`.row[data-id="${CSS.escape(id)}"]`)) el.classList.add('current');
}

// ---------------------------------------------------------------- navigation

const routeId = (r) => `${r.name}:${r.key ?? ''}`;

function go(route, { replace = false } = {}) {
  if (history.state?.layers) {
    // Close the player (and queue) first; popstate then finishes the trip.
    ui.pending = { route, replace };
    history.go(-history.state.layers);
    return;
  }
  ui.scroll.set(routeId(ui.route), scrollY);
  ui.route = route;
  if (route.name === 'library') ui.editing = false;
  const depth = history.state?.depth ?? 0;
  if (replace) history.replaceState({ route, depth }, '');
  else history.pushState({ route, depth: depth + 1 }, '');
  showOverlay(null);
  render();
  scrollTo(0, ui.scroll.get(routeId(route)) ?? 0);
  if (route.name !== 'library') view.focus({ preventScroll: true });
}

addEventListener('popstate', (e) => {
  const state = e.state ?? { route: { name: 'library' } };
  const route = state.route ?? { name: 'library' };
  if (routeId(route) !== routeId(ui.route)) {
    ui.scroll.set(routeId(ui.route), scrollY);
    ui.route = route;
    render();
    scrollTo(0, ui.scroll.get(routeId(route)) ?? 0);
  }
  showOverlay(state.overlay ?? null);
  if (ui.pending && !state.layers) {
    const { route: to, replace } = ui.pending;
    ui.pending = null;
    go(to, { replace });
  }
});

function openOverlay(name) {
  if (history.state?.overlay === name) return;
  const { depth = 0, layers = 0 } = history.state ?? {};
  history.pushState({ route: ui.route, overlay: name, depth, layers: layers + 1 }, '');
  showOverlay(name);
}

function closeOverlay() {
  if (history.state?.overlay) history.back();
  else showOverlay(null);
}

let overlay = null;
let overlayOpener = null;
function showOverlay(name) {
  if (overlay === name) return;
  const was = overlay;
  overlay = name;
  if (name && !was) overlayOpener = document.activeElement;
  $('now').hidden = name !== 'now' && name !== 'queue';
  $('queuePage').hidden = name !== 'queue';
  document.body.classList.toggle('overlay-open', !!name);
  if (name === 'now') { updateNow(); $('nowClose').focus({ preventScroll: true }); }
  if (name === 'queue') { renderQueue(); $('queueClose').focus({ preventScroll: true }); }
  if (!name) overlayOpener?.focus?.({ preventScroll: true });
  loop();
}

// ---------------------------------------------------------------- playback

function contextFor(kind) {
  const r = ui.route;
  if (kind === 'album' && r.name === 'album') {
    const a = findAlbum(r.key);
    return a && { ids: a.tracks.map((t) => t.id), source: { kind: 'album', id: a.key, label: a.name } };
  }
  if (kind === 'artist' && r.name === 'artist') {
    const a = findArtist(r.key);
    return a && { ids: a.tracks.map((t) => t.id), source: { kind: 'artist', id: a.key, label: a.name } };
  }
  const list = songsInView();
  return {
    ids: list.map((t) => t.id),
    source: ui.query ? { kind: 'search', label: `“${ui.query}”` } : { kind: 'songs', label: 'Your Library' },
  };
}

async function startTrack(id, { play = true, at = 0 } = {}) {
  const t = tracks.get(id);
  if (!t) return;
  try {
    if (!(await player.load(t, { at }))) return; // a newer song took over
  } catch {
    toast(`Couldn’t open “${titleOf(t)}”.`);
    return;
  }
  updateTrackUI();
  saveSession();
  if (play) await player.play();
}

function playFrom(ctx, id, { shuffle } = {}) {
  if (!ctx?.ids.length) return;
  const start = queue.play(ctx.ids, id, ctx.source, { shuffle });
  startTrack(start);
}

async function next({ auto = false } = {}) {
  if (auto && ui.sleep?.endOfTrack) {
    setSleep(null);
    player.pause();
    return;
  }
  const id = queue.next({ auto });
  if (id == null) {
    // The end: back to the start of the list, paused, as streaming apps do.
    const first = queue.order[0];
    if (first != null) {
      queue.pos = 0;
      queue.current = first;
      await startTrack(first, { play: false });
    }
    return;
  }
  if (auto && id === player.track?.id) {
    player.seek(0);
    player.play();
    return;
  }
  startTrack(id);
}

function prev() {
  if (player.time > 3 || !queue.hasPrev()) {
    player.seek(0);
    return;
  }
  const id = queue.prev();
  if (id != null) startTrack(id);
}

function togglePlay() {
  if (!player.track) {
    if (queue.current) return startTrack(queue.current);
    const ctx = contextFor('songs');
    return playFrom(ctx, ctx.ids[0]);
  }
  player.toggle();
}

let errorsInARow = 0;
player.addEventListener('error', () => {
  if (!player.track) return;
  const t = player.track;
  errorsInARow++;
  toast(`“${titleOf(t)}” won’t play in this browser.`);
  if (errorsInARow < Math.min(5, queue.order.length || 1)) next();
});
player.addEventListener('playing', () => { errorsInARow = 0; });
player.addEventListener('ended', () => { if (player.track) next({ auto: true }); });
for (const type of ['play', 'pause']) player.addEventListener(type, () => { updatePlayState(); saveSession(); loop(); });
player.addEventListener('durationchange', () => {
  const t = player.track;
  const d = player.el.duration;
  if (t && Number.isFinite(d) && d > 0 && Math.abs((t.duration ?? 0) - d) > 1) {
    t.duration = d;
    store.putTrack(t).catch(() => {});
    for (const el of document.querySelectorAll(`.row[data-id="${CSS.escape(t.id)}"] .dur`)) el.textContent = formatTime(d);
  }
  updateProgress();
});
player.addEventListener('timeupdate', () => { updateProgress(); throttledSave(); checkSleep(); });

player.bindSession({
  play: () => togglePlayTo(true),
  pause: () => togglePlayTo(false),
  prev,
  next: () => next(),
  seek: (s) => player.seek(s),
});

function togglePlayTo(on) {
  if (on) { if (player.paused) togglePlay(); } else player.pause();
}

// ---------------------------------------------------------------- player UI

function updatePlayState() {
  const playing = !player.paused;
  const label = playing ? 'Pause' : 'Play';
  for (const b of [$('playBtn'), $('miniPlay')]) {
    b.innerHTML = icon(playing ? 'pause' : 'play');
    b.setAttribute('aria-label', label);
  }
  document.body.classList.toggle('is-playing', playing);
}

function updateTrackUI() {
  const t = tracks.get(queue.current) ?? player.track;
  $('mini').hidden = !t;
  document.body.classList.toggle('has-mini', !!t);
  if (!t) { document.title = 'MP3 Player'; return; }
  $('miniTitle').textContent = titleOf(t);
  $('miniArtist').textContent = artistOf(t);
  setArt($('miniArt'), t);
  document.title = `${titleOf(t)} · ${artistOf(t)}`;
  markCurrent();
  updateNow();
  if (overlay === 'queue') renderQueue();
  artUrl(t.artKey, 'full').then((url) => {
    if (player.track?.id !== t.id) return;
    player.setMetadata({
      title: titleOf(t), artist: artistOf(t), album: albumOf(t),
      artwork: url ? { src: url, sizes: '1024x1024' } : delivered.has('icon') ? { src: new URL('icons/icon-512.png', location.href).href, sizes: '512x512', type: 'image/png' } : null,
    });
  });
}

function setArt(el, t, size = 'thumb') {
  const seed = albumOf(t);
  const n = hashIndex(seed, 8);
  el.dataset.art = t.artKey ?? '';
  el.classList.remove('has-art');
  el.style.setProperty('--h', hashIndex(seed, 360));
  el.style.backgroundImage = delivered.has(`art-${n + 1}`) ? `url(assets/art/art-${n + 1}.webp)` : '';
  fillArt(el, size);
}

function updateNow() {
  if ($('now').hidden) return;
  const t = tracks.get(queue.current) ?? player.track;
  if (!t) return;
  const src = queue.source ?? {};
  $('nowFromKind').textContent = { album: 'Playing from album', artist: 'Playing from artist', search: 'Playing from search' }[src.kind] ?? 'Playing from';
  $('nowFromName').textContent = src.label ?? 'Your Library';
  $('nowTitle').textContent = titleOf(t);
  $('nowArtist').textContent = artistOf(t);
  setArt($('nowArt'), t, 'full');
  const hue = hashIndex(albumOf(t), 360);
  const tile = !t.artKey && delivered.has(`art-${hashIndex(albumOf(t), 8) + 1}`) ? hashIndex(albumOf(t), 8) + 1 : 0;
  const paint = (tc) => {
    const c = artColors.get(t.artKey) ?? tc;
    $('nowBg').style.background = c
      ? `linear-gradient(180deg, rgb(${c.join(',')}) 0%, rgba(${c.join(',')}, .35) 55%, var(--bg) 100%)`
      : `linear-gradient(180deg, hsl(${hue} 45% 32%) 0%, hsl(${hue} 40% 18% / .5) 55%, var(--bg) 100%)`;
  };
  paint();
  if (t.artKey) artUrl(t.artKey, 'thumb').then(() => paint());
  else if (tile) tileColor(tile).then((c) => { if (c && queue.current === t.id) paint(c); });
  const shuffleBtn = $('shuffleBtn');
  shuffleBtn.innerHTML = icon('shuffle');
  shuffleBtn.setAttribute('aria-pressed', String(queue.shuffle));
  shuffleBtn.classList.toggle('on', queue.shuffle);
  const repeatBtn = $('repeatBtn');
  repeatBtn.innerHTML = icon(queue.repeat === 'one' ? 'repeatOne' : 'repeat');
  repeatBtn.classList.toggle('on', queue.repeat !== 'off');
  repeatBtn.setAttribute('aria-label', `Repeat: ${{ off: 'off', all: 'all', one: 'this song' }[queue.repeat]}`);
  repeatBtn.title = repeatBtn.getAttribute('aria-label');
  updateSleepBadge();
  updateProgress();
}

let scrubbing = false;
function updateProgress() {
  const d = player.duration;
  const t = player.time;
  const frac = d ? Math.min(1, t / d) : 0;
  $('miniFill').style.transform = `scaleX(${frac})`;
  if (!$('now').hidden && !scrubbing) {
    $('seek').value = String(Math.round(frac * 1000));
    $('seek').style.setProperty('--p', `${frac * 100}%`);
    $('tNow').textContent = formatTime(t);
    $('tLeft').textContent = d ? `-${formatTime(Math.max(0, d - t))}` : '–:––';
    $('seek').setAttribute('aria-valuetext', `${formatTime(t)} of ${formatTime(d)}`);
  }
}

let raf = 0;
function loop() {
  if (raf) return;
  const tick = () => {
    raf = 0;
    if (player.paused || document.hidden) return;
    updateProgress();
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) { updateProgress(); loop(); } else saveSession(); });

// Seek bar: the label follows the thumb while dragging, the jump happens on release.
$('seek').addEventListener('input', () => {
  scrubbing = true;
  const frac = Number($('seek').value) / 1000;
  const d = player.duration;
  $('seek').style.setProperty('--p', `${frac * 100}%`);
  $('tNow').textContent = formatTime(frac * d);
  $('tLeft').textContent = `-${formatTime(Math.max(0, d - frac * d))}`;
});
$('seek').addEventListener('change', () => {
  scrubbing = false;
  player.seek((Number($('seek').value) / 1000) * player.duration);
});

// ---------------------------------------------------------------- queue page

function renderQueue() {
  const now = tracks.get(queue.current);
  const queued = queue.manual.map((id) => tracks.get(id)).filter(Boolean);
  const upcoming = queue.upcoming().map((id) => tracks.get(id)).filter(Boolean);
  const qrow = (t, i, kind) => `<li class="row" data-id="${esc(t.id)}" data-qkind="${kind}" data-qi="${i}">
    <button class="row-main" type="button"><span ${artAttrs(t.artKey, albumOf(t))}></span><span class="meta"><span class="t">${esc(titleOf(t))}</span><span class="s">${esc(artistOf(t))}</span></span></button>
    ${kind === 'manual' ? `<button class="icon-btn" type="button" data-qremove="${i}" aria-label="Remove from the queue">${icon('close')}</button>` : ''}
  </li>`;
  $('queueBody').innerHTML = `
    ${now ? `<h3 class="section">Now playing</h3><ol class="rows"><li class="row current" data-id="${esc(now.id)}"><div class="row-main static"><span ${artAttrs(now.artKey, albumOf(now))}>${eqHtml()}</span><span class="meta"><span class="t">${esc(titleOf(now))}</span><span class="s">${esc(artistOf(now))}</span></span></div></li></ol>` : ''}
    ${queued.length ? `<div class="section-row"><h3 class="section">Next in queue</h3><button class="text-btn" type="button" data-qclear>Clear queue</button></div>
      <ol class="rows">${queued.map((t, i) => qrow(t, i, 'manual')).join('')}</ol>` : ''}
    <h3 class="section">Next from: ${esc(queue.source?.label ?? 'Your Library')}</h3>
    ${upcoming.length ? `<ol class="rows">${upcoming.slice(0, 200).map((t, i) => qrow(t, i, 'ctx')).join('')}</ol>` : `<p class="nothing">${queue.repeat === 'all' ? 'The list starts again after this song.' : 'Nothing after this song.'}</p>`}
    ${upcoming.length > 200 ? `<p class="nothing">and ${upcoming.length - 200} more</p>` : ''}`;
  watchArt($('queueBody'));
}

$('queueBody').addEventListener('click', (e) => {
  const rm = e.target.closest('[data-qremove]');
  if (rm) { queue.removeQueued(Number(rm.dataset.qremove)); renderQueue(); saveSession(); return; }
  if (e.target.closest('[data-qclear]')) { queue.clearQueued(); renderQueue(); saveSession(); return; }
  const row = e.target.closest('.row[data-qkind]');
  if (!row || !e.target.closest('.row-main')) return;
  const i = Number(row.dataset.qi);
  const id = row.dataset.qkind === 'manual' ? queue.jumpQueued(i) : queue.jumpUpcoming(i);
  if (id) startTrack(id);
});

// ---------------------------------------------------------------- sheets, toasts

let sheetOpener = null;
let sheetResolve = null;

/** Show an action sheet or dialog; resolves with the chosen value (or null). */
function sheet(html, { onClick, label = 'Options' } = {}) {
  closeSheet(null);
  const panel = $('sheetPanel');
  panel.innerHTML = `<div class="sheet-grab" aria-hidden="true"></div>${html}`;
  panel.setAttribute('aria-label', label);
  sheetOpener = document.activeElement;
  $('sheet').hidden = false;
  requestAnimationFrame(() => $('sheet').classList.add('open'));
  (panel.querySelector('button, input, [tabindex]:not([tabindex="-1"])') ?? panel).focus({ preventScroll: true });
  watchArt(panel);
  return new Promise((resolve) => {
    sheetResolve = resolve;
    panel.onclick = (e) => {
      const b = e.target.closest('[data-v]');
      if (!b) return;
      if (onClick && onClick(b.dataset.v, b) === false) return;
      closeSheet(b.dataset.v);
    };
  });
}

function closeSheet(value = null) {
  if ($('sheet').hidden) return;
  $('sheet').classList.remove('open');
  $('sheet').hidden = true;
  $('sheetPanel').onclick = null;
  const r = sheetResolve;
  sheetResolve = null;
  r?.(value);
  sheetOpener?.focus?.({ preventScroll: true });
}

$('sheet').addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeSheet(null); });

const item = (v, ic, text, extra = '') => `<button class="sheet-item ${extra}" type="button" data-v="${v}">${icon(ic)}<span>${text}</span></button>`;

function confirmSheet({ title, body, ok, danger = false }) {
  return sheet(`<h3 class="sheet-title">${esc(title)}</h3><p class="sheet-body">${body}</p>
    <div class="sheet-buttons"><button class="pill" type="button" data-v="no">Cancel</button><button class="pill ${danger ? 'danger' : 'primary'}" type="button" data-v="yes">${esc(ok)}</button></div>`, { label: title })
    .then((v) => v === 'yes');
}

let toastTimer = 0;
let toastActionFn = null;
function toast(text, { action, onAction, ms = 3200 } = {}) {
  $('toastText').textContent = text;
  const btn = $('toastAction');
  btn.hidden = !action;
  btn.textContent = action ?? '';
  toastActionFn = onAction ?? null;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('toast').hidden = true; toastActionFn = null; }, ms);
}
$('toastAction').addEventListener('click', () => {
  const fn = toastActionFn;
  $('toast').hidden = true;
  toastActionFn = null;
  fn?.();
});

// ---------------------------------------------------------------- menus

async function trackMenu(id) {
  const t = tracks.get(id);
  if (!t) return;
  const custom = ui.route.name === 'library' && prefs.tab === 'songs' && prefs.sort === 'custom' && !ui.query;
  const v = await sheet(`<div class="sheet-track"><span ${artAttrs(t.artKey, albumOf(t))}></span><span class="meta"><span class="t">${esc(titleOf(t))}</span><span class="s">${esc(artistOf(t))} · ${esc(albumOf(t))}</span></span></div>
    ${item('next', 'playNext', 'Play next')}
    ${item('queue', 'addQueue', 'Add to queue')}
    ${item('album', 'album', 'Go to album')}
    ${item('artist', 'person', 'Go to artist')}
    ${custom ? item('top', 'arrowUp', 'Move to the top') + item('bottom', 'arrowDown', 'Move to the bottom') : ''}
    ${item('remove', 'trash', 'Remove from library', 'danger')}`, { label: titleOf(t) });
  if (v === 'next') { queue.playNext(id); toast('Plays next'); saveSession(); }
  else if (v === 'queue') { queue.addToQueue(id); toast('Added to the queue'); saveSession(); }
  else if (v === 'album') go({ name: 'album', key: albumKey(t) });
  else if (v === 'artist') go({ name: 'artist', key: fold(artistOf(t)) });
  else if (v === 'top' || v === 'bottom') {
    const from = order.indexOf(id);
    setOrder(moveItem(order, from, v === 'top' ? 0 : order.length));
    rerender();
  } else if (v === 'remove') removeTracks([id]);
  if (overlay === 'queue') renderQueue();
}

async function sortMenu() {
  const v = await sheet(`<h3 class="sheet-title">Sort songs by</h3>${Object.entries(SORTS).map(([k, label]) =>
    `<button class="sheet-item${prefs.sort === k ? ' on' : ''}" type="button" data-v="${k}" aria-pressed="${prefs.sort === k}">${icon(prefs.sort === k ? 'check' : 'sort')}<span>${label}</span></button>`).join('')}`, { label: 'Sort' });
  if (!v || v === prefs.sort) return;
  prefs.sort = v;
  if (v !== 'custom') ui.editing = false;
  savePrefs();
  rerender();
}

function folderSupported() {
  return !isIOS && 'webkitdirectory' in document.createElement('input');
}

async function addMenu() {
  const v = await sheet(`<h3 class="sheet-title">Add music</h3>
    ${item('files', 'file', 'Choose songs')}
    ${folderSupported() ? item('folder', 'folder', 'Choose a folder') : ''}
    <p class="sheet-body fine">${isIOS ? 'Songs come from the Files app. ' : ''}Each song is copied into this app’s own storage, so it plays offline. Your files are never changed.</p>`, { label: 'Add music' });
  if (v === 'files') $('pickFiles').click();
  if (v === 'folder') $('pickFolder').click();
}

const formatBytes = (n) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)} GB` : `${Math.round((n || 0) / 1e6)} MB`);

async function settingsMenu() {
  const [{ usage, quota }, safe] = await Promise.all([store.estimate(), store.persisted()]);
  const all = visibleTracks();
  const total = all.reduce((s, t) => s + (t.duration || 0), 0);
  const v = await sheet(`<h3 class="sheet-title">Settings</h3>
    <div class="facts">
      <div><span>Library</span><b>${plural(all.length, 'song')}${total ? ` · ${formatTotal(total)}` : ''}</b></div>
      <div><span>Space used</span><b>${usage != null ? formatBytes(usage) : 'unknown'}${quota ? ` of ${formatBytes(quota)} available to this app` : ''}</b></div>
      <div><span>Kept safe</span><b>${safe ? 'Yes: the browser won’t clear your library to free space' : 'Not yet'}</b></div>
    </div>
    ${safe ? '' : item('persist', 'shield', 'Keep my library safe')}
    ${item('add', 'plus', 'Add music')}
    ${all.length ? item('clear', 'trash', 'Remove all songs', 'danger') : ''}
    <p class="sheet-body fine">Removing songs only deletes this app’s copies; the files on your device stay where they are.
    ${matchMedia('(pointer: fine)').matches ? '<br>Keys: Space play/pause · ← → seek 10 s · Shift ← → previous/next · / search' : ''}</p>`, { label: 'Settings' });
  if (v === 'persist') {
    const ok = await store.persist();
    toast(ok ? 'Your library is kept safe.' : 'The browser didn’t agree yet. Adding the app to your home screen usually helps.', { ms: 5000 });
  } else if (v === 'add') addMenu();
  else if (v === 'clear') {
    if (await confirmSheet({ title: 'Remove all songs?', body: `All ${plural(all.length, 'song')} leave this app. The files on your device stay where they are.`, ok: 'Remove all', danger: true })) {
      player.stop();
      queue = new Queue();
      await store.clearAll();
      tracks.clear();
      order = [];
      for (const p of artUrls.values()) p.then((u) => u && URL.revokeObjectURL(u));
      artUrls.clear();
      saveSession();
      updateTrackUI();
      go({ name: 'library' }, { replace: true });
    }
  }
}

async function nowMenu() {
  const t = tracks.get(queue.current);
  if (!t) return;
  const v = await sheet(`<div class="sheet-track"><span ${artAttrs(t.artKey, albumOf(t))}></span><span class="meta"><span class="t">${esc(titleOf(t))}</span><span class="s">${esc(artistOf(t))}</span></span></div>
    ${item('album', 'album', 'Go to album')}
    ${item('artist', 'person', 'Go to artist')}
    ${item('queue', 'queue', 'Queue')}
    ${item('sleep', 'timer', ui.sleep ? `Sleep timer: ${sleepLabel()}` : 'Sleep timer')}
    ${item('remove', 'trash', 'Remove from library', 'danger')}`, { label: titleOf(t) });
  if (v === 'album') go({ name: 'album', key: albumKey(t) });
  else if (v === 'artist') go({ name: 'artist', key: fold(artistOf(t)) });
  else if (v === 'queue') openOverlay('queue');
  else if (v === 'sleep') sleepMenu();
  else if (v === 'remove') removeTracks([t.id]);
}

// ---------------------------------------------------------------- sleep timer

function sleepLabel() {
  if (!ui.sleep) return 'Off';
  if (ui.sleep.endOfTrack) return 'end of song';
  return `${Math.max(1, Math.ceil((ui.sleep.until - Date.now()) / 60000))} min left`;
}

async function sleepMenu() {
  const opts = [['off', 'Off'], ['5', '5 minutes'], ['15', '15 minutes'], ['30', '30 minutes'], ['45', '45 minutes'], ['60', '1 hour'], ['end', 'End of this song']];
  const v = await sheet(`<h3 class="sheet-title">Sleep timer</h3>${opts.map(([k, label]) => item(k, k === 'off' ? 'close' : 'timer', label)).join('')}`, { label: 'Sleep timer' });
  if (!v) return;
  setSleep(v === 'off' ? null : v === 'end' ? { endOfTrack: true } : { until: Date.now() + Number(v) * 60000 });
  toast(v === 'off' ? 'Sleep timer off' : `Music stops ${v === 'end' ? 'at the end of this song' : `in ${opts.find((o) => o[0] === v)[1]}`}`);
}

function setSleep(s) {
  ui.sleep = s;
  updateSleepBadge();
}

function checkSleep() {
  if (ui.sleep?.until && Date.now() >= ui.sleep.until) {
    setSleep(null);
    player.pause();
  }
  updateSleepBadge();
}

function updateSleepBadge() {
  const b = $('sleepBadge');
  b.hidden = !ui.sleep;
  if (ui.sleep) b.innerHTML = `${icon('timer')}<span>${sleepLabel()}</span>`;
}

// ---------------------------------------------------------------- adding music

const testAudio = document.createElement('audio');
const canPlay = (mime) => !mime || testAudio.canPlayType(mime) !== '';
let importing = null;

function isAudioFile(f) {
  return !!AUDIO_EXT[extOf(f.name)] || (f.type || '').startsWith('audio/');
}

/** @param {File[]} files (folder picks include their relative paths) */
async function importFiles(files) {
  if (importing) { toast('Still adding the last batch…'); return; }
  const pathOf = (f) => f.webkitRelativePath || f.relPath || f.name;
  const byPath = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  const audioFiles = files.filter(isAudioFile).sort((a, b) => byPath.compare(pathOf(a), pathOf(b)));
  const covers = new Map(); // folder → cover image file
  for (const f of files) {
    const path = f.webkitRelativePath || f.relPath || '';
    if (COVER_NAME.test(f.name)) covers.set(path.split('/').slice(0, -1).join('/'), f);
  }
  if (!audioFiles.length) { toast(files.length ? 'No music files there.' : 'Nothing was picked.'); return; }
  const known = new Set(visibleTracks().map((t) => t.sourceKey));
  const job = { cancelled: false };
  importing = job;
  const card = $('importCard');
  card.hidden = false;
  let added = 0, skipped = 0, unplayable = 0, failed = 0, probeMisses = 0;
  let lastRender = performance.now();
  const coverKeys = new Map();
  for (let i = 0; i < audioFiles.length && !job.cancelled; i++) {
    const f = audioFiles[i];
    $('importText').textContent = `Adding ${i + 1} of ${audioFiles.length}: ${f.name}`;
    $('importFill').style.transform = `scaleX(${i / audioFiles.length})`;
    const path = f.webkitRelativePath || f.relPath || '';
    const sourceKey = `${path || f.name}|${f.size}|${f.lastModified}`;
    if (known.has(sourceKey)) { skipped++; continue; }
    const ext = extOf(f.name);
    const mime = AUDIO_EXT[ext] ?? f.type;
    if (!canPlay(mime)) { unplayable++; continue; }
    try {
      const tags = await readTags(f);
      const guess = fromFileName(f.name, path.split('/').slice(1).join('/')); // without the picked folder itself
      const blob = new Blob([await f.arrayBuffer()], { type: f.type || mime.split(';')[0] });
      let duration = tags.duration;
      if (!duration && probeMisses < 2) {
        const p = await probe(blob, 3000);
        if (!p.ok) { unplayable++; continue; }
        if (p.duration) duration = p.duration; else probeMisses++;
      }
      let artKey;
      if (tags.picture) artKey = await saveArt(tags.picture.data, tags.picture.mime);
      if (!artKey) {
        const dir = path.split('/').slice(0, -1).join('/');
        const cover = covers.get(dir);
        if (cover) {
          if (!coverKeys.has(dir)) coverKeys.set(dir, await saveArt(new Uint8Array(await cover.arrayBuffer()), cover.type));
          artKey = coverKeys.get(dir);
        }
      }
      const t = {
        id: crypto.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`,
        sourceKey, fileName: f.name, path, size: f.size, type: blob.type,
        title: tags.title ?? guess.title, artist: tags.artist ?? guess.artist, albumArtist: tags.albumArtist,
        album: tags.album ?? guess.album, track: tags.track ?? guess.track, disc: tags.disc ?? guess.disc,
        year: tags.year, genre: tags.genre, duration, artKey, addedAt: Date.now() + i / 1000,
      };
      for (const k of Object.keys(t)) if (t[k] === undefined) delete t[k];
      await store.addTrack(t, blob);
      tracks.set(t.id, t);
      order.push(t.id);
      known.add(sourceKey);
      added++;
      if (added === 1) store.persist();
      if (performance.now() - lastRender > 1500) { lastRender = performance.now(); refreshAfterChange(); }
    } catch (err) {
      if (err?.name === 'QuotaExceededError') {
        toast('This browser has no more room for songs. Remove some, or free space on the device.', { ms: 7000 });
        job.cancelled = true;
        failed++;
        break;
      }
      failed++;
    }
  }
  importing = null;
  card.hidden = true;
  saveOrder();
  refreshAfterChange();
  const notes = [];
  if (skipped) notes.push(`${skipped} already in the library`);
  if (unplayable) notes.push(`${unplayable} this browser can’t play`);
  if (failed) notes.push(`${failed} couldn’t be read`);
  toast(`${added ? `Added ${plural(added, 'song')}` : 'No new songs'}${notes.length ? ` (${notes.join(', ')})` : ''}.`, { ms: 5000 });
}

function refreshAfterChange() {
  if (queue.source?.kind === 'songs' && prefs.sort === 'custom') queue.reorderContext(order.filter((id) => tracks.has(id)));
  rerender();
}

$('importCancel').addEventListener('click', () => { if (importing) importing.cancelled = true; });

for (const id of ['pickFiles', 'pickFolder']) {
  $(id).addEventListener('change', (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    if (files.length) importFiles(files);
  });
}

// Drag and drop, including whole folders.
let dragDepth = 0;
const hasFiles = (e) => [...(e.dataTransfer?.types ?? [])].includes('Files');
addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; e.preventDefault(); dragDepth++; $('dropzone').hidden = false; });
addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; $('dropzone').hidden = true; } });
addEventListener('drop', async (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  dragDepth = 0;
  $('dropzone').hidden = true;
  const entries = [...e.dataTransfer.items].map((it) => it.webkitGetAsEntry?.()).filter(Boolean);
  const files = entries.length ? (await Promise.all(entries.map((en) => readEntry(en, '')))).flat() : [...e.dataTransfer.files];
  importFiles(files);
});

async function readEntry(entry, prefix) {
  if (entry.isFile) {
    return new Promise((resolve) => entry.file((f) => { f.relPath = prefix + f.name; resolve([f]); }, () => resolve([])));
  }
  if (!entry.isDirectory) return [];
  const reader = entry.createReader();
  const out = [];
  for (;;) {
    const batch = await new Promise((resolve) => reader.readEntries(resolve, () => resolve([])));
    if (!batch.length) break;
    for (const child of batch) out.push(...(await readEntry(child, `${prefix}${entry.name}/`)));
  }
  return out;
}

// ---------------------------------------------------------------- removing

function removeTracks(ids) {
  const list = ids.map((id) => ({ t: tracks.get(id), at: order.indexOf(id) })).filter((x) => x.t);
  if (!list.length) return;
  let wasPlaying = false;
  const resumeAfter = !player.paused;
  for (const { t } of list) {
    t.removed = true;
    store.putTrack(t).catch(() => {});
    tracks.delete(t.id);
    if (queue.remove(t.id)) wasPlaying = true;
  }
  order = order.filter((id) => tracks.has(id));
  saveOrder();
  if (wasPlaying) {
    const id = queue.next();
    if (id) startTrack(id, { play: resumeAfter });
    else { player.stop(); queue.current = null; updateTrackUI(); }
  }
  saveSession();
  rerender();
  if (overlay === 'queue') renderQueue();
  const batch = Symbol('removal');
  const finish = () => {
    pendingRemovals.delete(batch);
    const keep = new Set(visibleTracks().map((t) => t.artKey).filter(Boolean));
    store.deleteTracks(list.map((x) => x.t.id), keep).catch(() => {});
  };
  pendingRemovals.set(batch, { list, timer: setTimeout(finish, 8000) });
  toast(list.length === 1 ? `Removed “${titleOf(list[0].t)}”` : `Removed ${plural(list.length, 'song')}`, {
    action: 'Undo', ms: 8000,
    onAction: () => {
      const p = pendingRemovals.get(batch);
      if (!p) return;
      clearTimeout(p.timer);
      pendingRemovals.delete(batch);
      for (const { t, at } of [...list].sort((a, b) => a.at - b.at)) {
        delete t.removed;
        store.putTrack(t).catch(() => {});
        tracks.set(t.id, t);
        order.splice(at < 0 ? order.length : Math.min(at, order.length), 0, t.id);
      }
      saveOrder();
      refreshAfterChange();
    },
  });
}

// ---------------------------------------------------------------- reordering

function setOrder(next) {
  order = next;
  saveOrder();
  refreshAfterChange();
}

/** Drag a row by its grip; neighbours slide out of the way, the page scrolls at the edges. */
function startDrag(e, grip) {
  const row = grip.closest('.row');
  const list = row.parentElement;
  const rows = [...list.children];
  const from = rows.indexOf(row);
  const h = row.getBoundingClientRect().height;
  const startY = e.clientY;
  const startScroll = scrollY;
  let y = e.clientY;
  let to = from;
  let scrollRaf = 0;
  grip.setPointerCapture(e.pointerId);
  row.classList.add('dragging');
  list.classList.add('sorting');
  const layout = () => {
    const dy = y - startY + (scrollY - startScroll);
    to = Math.max(0, Math.min(rows.length - 1, from + Math.round(dy / h)));
    row.style.transform = `translateY(${dy}px)`;
    rows.forEach((r, i) => {
      if (r === row) return;
      const shift = from < to && i > from && i <= to ? -h : to < from && i >= to && i < from ? h : 0;
      r.style.transform = shift ? `translateY(${shift}px)` : '';
    });
  };
  const edgeScroll = () => {
    scrollRaf = 0;
    const edge = 80;
    const bottomEdge = innerHeight - (document.body.classList.contains('has-mini') ? 140 : 0);
    const speed = y < edge ? -(edge - y) / 4 : y > bottomEdge - edge ? (y - (bottomEdge - edge)) / 4 : 0;
    if (speed) { scrollBy(0, speed); layout(); scrollRaf = requestAnimationFrame(edgeScroll); }
  };
  const move = (ev) => { y = ev.clientY; layout(); if (!scrollRaf) scrollRaf = requestAnimationFrame(edgeScroll); };
  const end = () => {
    grip.removeEventListener('pointermove', move);
    grip.removeEventListener('pointerup', end);
    grip.removeEventListener('pointercancel', end);
    cancelAnimationFrame(scrollRaf);
    for (const r of rows) r.style.transform = '';
    row.classList.remove('dragging');
    list.classList.remove('sorting');
    if (to !== from) {
      const ids = rows.map((r) => r.dataset.id);
      const fromIdx = order.indexOf(ids[from]);
      const toIdx = order.indexOf(ids[to]);
      setOrder(moveItem(order, fromIdx, toIdx));
      requestAnimationFrame(() => document.querySelector(`.row[data-id="${CSS.escape(ids[from])}"] .grip`)?.focus({ preventScroll: true }));
    }
  };
  grip.addEventListener('pointermove', move);
  grip.addEventListener('pointerup', end);
  grip.addEventListener('pointercancel', end);
}

// ---------------------------------------------------------------- view events

view.addEventListener('click', (e) => {
  const t = e.target;
  const tab = t.closest('[data-tab]');
  if (tab) { prefs.tab = tab.dataset.tab; ui.editing = false; savePrefs(); render(); return; }
  const act = t.closest('[data-act]')?.dataset.act;
  if (act === 'add-files') return $('pickFiles').click();
  if (act === 'add-folder') return $('pickFolder').click();
  if (act === 'sort') return sortMenu();
  if (act === 'edit') {
    ui.editing = !ui.editing;
    if (ui.editing && (prefs.sort !== 'custom' || ui.query)) { prefs.sort = 'custom'; ui.query = ''; savePrefs(); }
    return rerender();
  }
  if (act === 'back') return history.state?.depth > 0 ? history.back() : go({ name: 'library' }, { replace: true });
  if (act === 'play-all' || act === 'shuffle-all') { const ctx = contextFor('songs'); return playFrom(ctx, undefined, { shuffle: act === 'shuffle-all' }); }
  if (act === 'play-ctx' || act === 'shuffle-ctx') {
    const ctx = contextFor(t.closest('[data-ctx]').dataset.ctx);
    return playFrom(ctx, undefined, { shuffle: act === 'shuffle-ctx' });
  }
  const album = t.closest('[data-album]');
  if (album) return go({ name: 'album', key: album.dataset.album });
  const artist = t.closest('[data-artist]');
  if (artist) return go({ name: 'artist', key: artist.dataset.artist });
  const row = t.closest('.row[data-id]');
  if (!row) return;
  const id = row.dataset.id;
  if (t.closest('.more')) return trackMenu(id);
  if (t.closest('.remove')) return removeTracks([id]);
  if (t.closest('.grip')) return;
  if (t.closest('.row-main')) {
    if (ui.editing) return;
    if (id === queue.current && player.track) return player.paused ? player.play() : openOverlay('now');
    playFrom(contextFor(row.closest('[data-context]')?.dataset.context ?? 'songs'), id);
  }
});

view.addEventListener('pointerdown', (e) => {
  const grip = e.target.closest('.grip');
  if (!grip || e.button > 0 || ui.query || prefs.sort !== 'custom') return;
  e.preventDefault();
  startDrag(e, grip);
});

view.addEventListener('keydown', (e) => {
  const grip = e.target.closest?.('.grip');
  if (!grip || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') || ui.query || prefs.sort !== 'custom') return;
  e.preventDefault();
  const id = grip.closest('.row').dataset.id;
  const from = order.indexOf(id);
  setOrder(moveItem(order, from, from + (e.key === 'ArrowUp' ? -1 : 1)));
  document.querySelector(`.row[data-id="${CSS.escape(id)}"] .grip`)?.focus();
});

view.addEventListener('contextmenu', (e) => {
  const row = e.target.closest('.row[data-id]');
  if (!row || ui.editing) return;
  e.preventDefault();
  trackMenu(row.dataset.id);
});

let searchTimer = 0;
view.addEventListener('input', (e) => {
  if (e.target.id !== 'q') return;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { ui.query = e.target.value.trim(); rerender(); }, 120);
});

// ---------------------------------------------------------------- player controls

$('miniOpen').addEventListener('click', () => openOverlay('now'));
$('miniPlay').addEventListener('click', togglePlay);
$('miniNext').addEventListener('click', () => next());
$('miniPrev').addEventListener('click', prev);
$('playBtn').addEventListener('click', togglePlay);
$('nextBtn').addEventListener('click', () => next());
$('prevBtn').addEventListener('click', prev);
$('nowClose').addEventListener('click', closeOverlay);
$('nowMore').addEventListener('click', nowMenu);
$('queueBtn').addEventListener('click', () => openOverlay('queue'));
$('queueClose').addEventListener('click', closeOverlay);
$('shuffleBtn').addEventListener('click', () => { queue.setShuffle(!queue.shuffle); updateNow(); saveSession(); toast(queue.shuffle ? 'Shuffle on' : 'Shuffle off', { ms: 1400 }); });
$('repeatBtn').addEventListener('click', () => { const r = queue.cycleRepeat(); updateNow(); saveSession(); toast({ off: 'Repeat off', all: 'Repeating the list', one: 'Repeating this song' }[r], { ms: 1400 }); });
$('nowArtist').addEventListener('click', () => { const t = tracks.get(queue.current); if (t) go({ name: 'artist', key: fold(artistOf(t)) }); });
$('nowFromName').addEventListener('click', () => {
  const s = queue.source;
  if (s?.kind === 'album') go({ name: 'album', key: s.id });
  else if (s?.kind === 'artist') go({ name: 'artist', key: s.id });
  else go({ name: 'library' });
});
$('addBtn').addEventListener('click', addMenu);
$('settingsBtn').addEventListener('click', settingsMenu);

// Swipe the cover sideways to skip, down to close.
{
  const wrap = $('nowArtWrap');
  let sx = 0, sy = 0, active = false;
  wrap.addEventListener('pointerdown', (e) => { active = true; sx = e.clientX; sy = e.clientY; });
  wrap.addEventListener('pointermove', (e) => {
    if (!active) return;
    const dx = e.clientX - sx;
    if (Math.abs(dx) > Math.abs(e.clientY - sy) && !reducedMotion.matches) $('nowArt').style.transform = `translateX(${dx * 0.6}px) rotate(${dx * 0.02}deg)`;
  });
  const end = (e) => {
    if (!active) return;
    active = false;
    $('nowArt').style.transform = '';
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? next() : prev());
    else if (dy > 110 && Math.abs(dy) > Math.abs(dx) * 1.5) closeOverlay();
  };
  wrap.addEventListener('pointerup', end);
  wrap.addEventListener('pointercancel', () => { active = false; $('nowArt').style.transform = ''; });
}

// Volume (where the page may set it; on iOS the side buttons do).
if (player.volumeSettable()) {
  const vol = $('volume');
  const paintVol = () => {
    vol.style.setProperty('--p', `${vol.value}%`);
    $('volIcon').innerHTML = icon('volume');
    $('volIcon').classList.toggle('muted', Number(vol.value) === 0);
  };
  vol.value = String(Math.round((prefs.volume ?? 1) * 100));
  player.el.volume = Number(vol.value) / 100;
  paintVol();
  vol.addEventListener('input', () => { player.el.volume = Number(vol.value) / 100; prefs.volume = player.el.volume; paintVol(); savePrefs(); });
} else {
  $('volumeWrap').hidden = true;
}

// Keyboard.
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!$('sheet').hidden) { closeSheet(null); e.preventDefault(); return; }
    if (overlay) { closeOverlay(); e.preventDefault(); return; }
    if (ui.editing) { ui.editing = false; rerender(); return; }
  }
  if (!$('sheet').hidden || e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = e.target.tagName;
  const typing = tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable;
  if (typing) return;
  if (e.key === ' ' && tag !== 'BUTTON') { e.preventDefault(); togglePlay(); }
  else if (e.key === 'ArrowRight' && e.shiftKey) { e.preventDefault(); next(); }
  else if (e.key === 'ArrowLeft' && e.shiftKey) { e.preventDefault(); prev(); }
  else if (e.key === 'ArrowRight' && !e.target.closest('.grip')) { if (player.track) { e.preventDefault(); player.seek(player.time + 10); } }
  else if (e.key === 'ArrowLeft' && !e.target.closest('.grip')) { if (player.track) { e.preventDefault(); player.seek(player.time - 10); } }
  else if (e.key === '/' && ui.route.name === 'library' && prefs.tab === 'songs') { e.preventDefault(); $('q')?.focus(); }
});

// iOS lets a page start sound only from a tap; the first tap anywhere unlocks
// the audio element so later plays (after reading the song from storage) work.
{
  // 0.05 s of 8-bit silence as a WAV data URL.
  const n = 400;
  const wav = new Uint8Array(44 + n).fill(128);
  const dv = new DataView(wav.buffer);
  [...'RIFF'].forEach((c, i) => { wav[i] = c.charCodeAt(0); });
  dv.setUint32(4, 36 + n, true);
  [...'WAVEfmt '].forEach((c, i) => { wav[8 + i] = c.charCodeAt(0); });
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true);
  [...'data'].forEach((c, i) => { wav[36 + i] = c.charCodeAt(0); });
  dv.setUint32(40, n, true);
  const silent = `data:audio/wav;base64,${btoa(String.fromCharCode(...wav))}`;
  const unlock = (e) => {
    // The play buttons start sound inside the tap themselves.
    if (e.target.closest?.('#playBtn, #miniPlay')) return void removeEventListener('pointerup', unlock, true);
    removeEventListener('pointerup', unlock, true);
    removeEventListener('keydown', unlock, true);
    const el = player.el;
    if (player.track) {
      // A restored song: a muted blip of play unlocks it without a sound.
      if (!el.paused) return;
      const at = el.currentTime;
      el.muted = true;
      el.play().then(() => { el.pause(); el.currentTime = at; }).catch(() => {}).finally(() => { el.muted = false; });
      return;
    }
    el.src = silent;
    el.play().then(() => { if (el.src === silent) el.pause(); }).catch(() => {}).finally(() => { if (el.src === silent) el.removeAttribute('src'); });
  };
  addEventListener('pointerup', unlock, true);
  addEventListener('keydown', unlock, true);
}

// ---------------------------------------------------------------- session

let saveTimer = 0;
function saveSession() {
  save(SESSION_KEY, { queue: queue.toJSON(), time: player.track ? player.time : 0 });
}
function throttledSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => { saveTimer = 0; saveSession(); }, 5000);
}
addEventListener('pagehide', () => {
  saveSession();
  for (const [batch, p] of pendingRemovals) {
    clearTimeout(p.timer);
    pendingRemovals.delete(batch);
    const keep = new Set(visibleTracks().map((t) => t.artKey).filter(Boolean));
    store.deleteTracks(p.list.map((x) => x.t.id), keep).catch(() => {});
  }
});

// ---------------------------------------------------------------- boot

async function loadAssets() {
  try {
    const list = await (await fetch('data/asset-list.json')).json();
    delivered = new Set(list.filter((a) => a.status === 'delivered' || a.status === 'revise').map((a) => a.id));
  } catch { /* stand-ins everywhere */ }
  if (delivered.has('logo')) {
    $('brandLogo').src = 'assets/ui/logo.webp';
    $('brandLogo').hidden = false;
    $('brandText').hidden = true;
    $('brandMark').hidden = true;
  }
}

async function boot() {
  $('addBtn').innerHTML = icon('plus');
  $('settingsBtn').innerHTML = icon('gear');
  $('miniPrev').innerHTML = icon('prev');
  $('miniNext').innerHTML = icon('next');
  $('prevBtn').innerHTML = icon('prev');
  $('nextBtn').innerHTML = icon('next');
  $('nowClose').innerHTML = icon('down');
  $('nowMore').innerHTML = icon('more');
  $('queueBtn').innerHTML = icon('queue');
  $('queueClose').innerHTML = icon('down');
  updatePlayState();
  await loadAssets();
  try {
    await loadLibrary();
  } catch (err) {
    view.innerHTML = `<section class="welcome"><h1>Can’t open the library</h1><p>${esc(err?.message || 'This browser blocks storage for this page (a private window can do this).')}</p></section>`;
    return;
  }
  const session = load(SESSION_KEY, null);
  queue = Queue.from(session?.queue, (id) => tracks.has(id));
  history.replaceState({ route: { name: 'library' }, depth: 0 }, '');
  render();
  if (queue.current) {
    updateTrackUI();
    startTrack(queue.current, { play: false, at: session?.time ?? 0 });
  }
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}

boot();
