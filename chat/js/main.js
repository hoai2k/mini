// Games Chat: the page. Wires the title screen, the shared room (net.js),
// the calls (rtc.js), my camera and effects (studio.js), the minigames
// (gamehost.js) and the controls together.

import { createNet } from './net.js';
import { createRtc, STUN_SERVERS } from './rtc.js';
import { createStudio } from './studio.js';
import { createGameHost } from './gamehost.js';
import { createGamepad } from './gamepad.js';
import { createFlyer } from './flyer.js';
import { loadEffects } from '../effects/index.js';
import { loadGames } from '../games/index.js';
import { load, save, randomId } from './store.js';
import { sfx, unlockAudio, setVolume, setSfxMuted, sfxMuted } from './audio.js';
import { assetUrl, iconUrl, setIconTheme } from './assets.js';
import { applyIcons, ICONS } from './icons.js';
import { makeSheet } from './sheet.js';
import { createVotes, voteButtons } from './votes.js';

const COLORS = ['#ff5fa2', '#ff8c42', '#ffd43b', '#69db7c', '#3fe0d0', '#4dabf7', '#9775fa', '#f783ac'];
const $ = sel => document.querySelector(sel);

const settings = {
  name: '',
  color: COLORS[Math.floor(Math.random() * COLORS.length)],
  volume: 0.6,
  reduceMotion: false,
  autoLight: true,
  theme: 'teen',
  ...load('settings', {}),
};
const saveSettings = () => save('settings', settings);

// The player's colour accents the whole interface. Text on it is dark or
// light depending on how bright the colour is.
function applyAccent(color) {
  const root = document.documentElement.style;
  root.setProperty('--accent', color);
  const n = parseInt(color.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  root.setProperty('--on-accent', lum > 0.62 ? '#1d1533' : '#fff');
}
applyAccent(settings.color);

// The theme (Settings > Theme): the look of the whole UI (themes.css), the
// icon set and the title art.
const THEMES = ['teen', 'kid', 'art', 'classic'];
function applyTheme(t) {
  const theme = THEMES.includes(t) ? t : 'teen';
  document.documentElement.dataset.theme = theme;
  setIconTheme(theme);
  updateTitleArt(theme);
  refreshIcons();
}
setVolume(settings.volume);
document.body.classList.toggle('reduce-motion', !!settings.reduceMotion);

// A fresh ID per page load: a reload is a new person to the others, which
// keeps their calls simple.
const me = { id: randomId(), name: settings.name, color: settings.color };

let studio = null, net = null, rtc = null, games = null, flyer = null, votes = null;
let fxVotes = null, gameVotes = null;
let effects = [];
let started = false;
const tiles = new Map(); // clientId -> tile record
let chatUnread = 0;

// --- small UI helpers ------------------------------------------------------

function toast(text) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  $('#toasts').append(el);
  setTimeout(() => el.remove(), 3300);
}

function colorPicker(container, onPick) {
  container.textContent = '';
  for (const c of COLORS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.style.background = c;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-label', `Colour ${c}`);
    b.setAttribute('aria-checked', String(c === settings.color));
    b.addEventListener('click', () => {
      settings.color = c;
      applyAccent(c);
      container.querySelectorAll('.swatch').forEach(s => s.setAttribute('aria-checked', String(s === b)));
      onPick?.(c);
      saveSettings();
    });
    container.append(b);
  }
}

function openDialog(id) {
  const d = document.getElementById(id);
  if (!d.open) d.showModal();
}

const standalone = () => matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone === true;
const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;

// Asks for full screen wherever the browser has a way to (including the
// prefixed one iPhone Safari offers, which doesn't report itself as enabled).
// Only if nothing happens is Add to Home Screen explained.
function toggleFullscreen(fromStart = false) {
  const doc = document;
  if (fullscreenElement()) {
    try { (doc.exitFullscreen || doc.webkitExitFullscreen)?.call(doc)?.catch?.(() => {}); } catch {}
    return;
  }
  const el = doc.documentElement;
  let asked = false;
  try {
    if (el.requestFullscreen) {
      el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
      asked = true;
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
      asked = true;
    }
  } catch {}
  if (fromStart) return;
  if (!asked) return openDialog('fullscreen-help');
  setTimeout(() => { if (!fullscreenElement()) openDialog('fullscreen-help'); }, 900);
}

document.addEventListener('click', e => {
  const opener = e.target.closest('[data-open]');
  if (opener) {
    opener.closest('dialog')?.close();
    openDialog(opener.dataset.open);
  }
  if (e.target.closest('[data-action="fullscreen"]')) toggleFullscreen();
});
applyIcons();
// Already running full screen from the home screen: no button needed.
if (standalone()) document.querySelectorAll('[data-action="fullscreen"]').forEach(b => { b.hidden = true; });
const markFullscreen = () => document.querySelectorAll('[data-action="fullscreen"]').forEach(b => b.setAttribute('aria-pressed', String(!!fullscreenElement())));
document.addEventListener('fullscreenchange', markFullscreen);
document.addEventListener('webkitfullscreenchange', markFullscreen);

// --- title screen ----------------------------------------------------------

// The title logo and background for a theme: its own art when delivered.
// Kid and Teen fall back to the original art; Art and Classical draw a
// styled text logo on a CSS background until theirs arrive.
function updateTitleArt(theme) {
  const own = n => assetUrl(`${n}-${theme}`);
  const original = theme === 'kid' || theme === 'teen';
  const logo = theme === 'kid' ? assetUrl('logo') : own('logo') ?? (original ? assetUrl('logo') : null);
  $('#logo-img').hidden = !logo;
  if (logo) $('#logo-img').src = logo;
  $('#logo').classList.toggle('has-img', !!logo);
  const bg = theme === 'kid' ? assetUrl('title-bg') : own('title-bg') ?? (original ? assetUrl('title-bg') : null);
  $('#title').style.backgroundImage = bg ? `url("${bg}")` : '';
  $('#title').classList.toggle('has-bg', !!bg);
}

// Swaps every effect and game icon for the current theme's.
function refreshIcons() {
  document.querySelectorAll('#effect-list .fx-item[data-fx]').forEach(b => {
    const fx = effects.find(e => e.id === b.dataset.fx);
    if (fx) setButtonIcon(b, iconUrl('fx', fx.id), fx.emoji);
  });
  document.querySelectorAll('.game-card[data-game]').forEach(b => {
    const g = games?.games.get(b.dataset.game);
    if (!g) return;
    const ico = b.querySelector('.ico');
    const url = iconUrl('game', g.id);
    ico.textContent = '';
    if (url) {
      const im = document.createElement('img');
      im.src = url;
      im.alt = '';
      ico.append(im);
    } else ico.textContent = g.emoji;
  });
  const fav = $('#fav-list');
  if (fav) {
    delete fav.dataset.sig;
    if (openTab === 'favs') renderFavorites();
  }
}

function initTitle() {
  const favicon = assetUrl('icon');
  if (favicon) $('#favicon').href = favicon;
  applyTheme(settings.theme);
  $('#name-input').value = settings.name;
  colorPicker($('#color-picker'));
  $('#join-form').addEventListener('submit', e => {
    e.preventDefault();
    start();
  });
  if (!settings.name) $('#name-input').focus();
  else $('#start-btn').focus();
  backgroundBubbles();
}

// Drifting bubbles behind the title screen.
function backgroundBubbles() {
  const c = $('#bg-bubbles');
  const ctx = c.getContext('2d');
  const bubbles = Array.from({ length: 26 }, () => ({ x: Math.random(), y: Math.random(), r: 8 + Math.random() * 46, s: 0.02 + Math.random() * 0.05, h: Math.random() * 360 }));
  let last = performance.now();
  const tick = now => {
    if (started) {
      c.remove();
      return;
    }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    c.width = innerWidth;
    c.height = innerHeight;
    const reduce = settings.reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const b of bubbles) {
      if (!reduce) b.y -= b.s * dt;
      if (b.y < -0.1) { b.y = 1.1; b.x = Math.random(); }
      const x = b.x * c.width, y = b.y * c.height;
      const g = ctx.createRadialGradient(x - b.r * 0.3, y - b.r * 0.3, b.r * 0.1, x, y, b.r);
      g.addColorStop(0, 'rgba(255,255,255,0.02)');
      g.addColorStop(0.85, `hsla(${b.h},90%,75%,0.10)`);
      g.addColorStop(1, `hsla(${b.h + 60},95%,80%,0.35)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// --- starting the call -----------------------------------------------------

async function start() {
  if (started) return;
  const name = $('#name-input').value.trim().slice(0, 20);
  if (!name) {
    $('#name-input').focus();
    toast('Type your name first');
    return;
  }
  started = true;
  settings.name = name;
  me.name = name;
  me.color = settings.color;
  saveSettings();
  unlockAudio();
  if (!standalone()) toggleFullscreen(true);
  $('#start-btn').disabled = true;

  $('#title').classList.remove('active');
  $('#call').classList.add('active');
  document.body.classList.add('in-call');

  studio = createStudio();
  studio.setAutoLight(settings.autoLight !== false);
  studio.setAvatar(me.name, me.color);
  addSelfTile();
  layout();

  updateDeviceButtons();
  studio.on('face-status', updateFaceStatus);
  studio.on('device-lost', kind => {
    updateDeviceButtons();
    showDeviceProblem({ lost: kind });
  });
  updateFaceStatus();

  net = createNet({ game: 'chat', room: 'everyone', me });
  votes = createVotes({ server: MiniRooms.defaultServer() });
  net.setPresence({ cam: studio.camOn, mic: studio.micOn, away: studio.away, fx: null });
  // While the tab is in the background or the window loses focus the camera
  // pauses (and comes back as it was on return); see syncAway below.
  const syncAway = () => {
    const away = document.hidden || !document.hasFocus();
    if (away === studio.away) return;
    // The microphone stays on (you may just be glancing at another app or
    // window; talking carries on both ways), only the camera pauses, and the
    // app's own sound effects go quiet.
    studio.setAway(away, { keepMic: true });
    setSfxMuted(away);
    updateDeviceButtons();
  };
  document.addEventListener('visibilitychange', syncAway);
  window.addEventListener('blur', syncAway);
  window.addEventListener('focus', syncAway);
  syncAway();
  // Test hooks: ?rtcdrop=1 withholds ICE candidates so calls can't connect,
  // ?rtcfast=0.2 runs the call watchdog's timers five times faster.
  const q = new URLSearchParams(location.search);
  rtc = createRtc({
    net,
    stream: studio.stream,
    iceServers: STUN_SERVERS,
    test: { dropCandidates: q.get('rtcdrop') === '1', timeScale: parseFloat(q.get('rtcfast')) || 1 },
  });
  rtc.on('stream', onRemoteStream);
  rtc.on('state', onCallState);
  rtc.on('info', onCallInfo);
  loadIceServers();
  // The camera and microphone start alongside joining, so a device that is
  // slow or busy never holds up the chat.
  startDevices();
  net.on('peers', onPeers);
  net.on('status', updateStatus);

  flyer = createFlyer($('#fly'), {
    geom: id => {
      const t = tiles.get(id);
      if (!t || !t.el.isConnected) return null;
      const media = t.media;
      const w = media.videoWidth || media.width, h = media.videoHeight || media.height;
      if (!w || !h) return null;
      return { rect: t.el.getBoundingClientRect(), w, h };
    },
    face: id => {
      if (id === me.id) {
        const f = studio.face;
        return f ? { x: f.center.x / studio.canvas.width, y: f.center.y / studio.canvas.height, s: f.scale / studio.canvas.width } : null;
      }
      const f = net.peers.get(id)?.face;
      return Array.isArray(f) && f.length === 3 ? { x: f[0], y: f[1], s: f[2] } : null;
    },
    onPop: f => {
      sfx('pop');
      const t = tiles.get(f.to);
      if (t) {
        t.el.classList.remove('popped');
        void t.el.offsetWidth;
        t.el.classList.add('popped');
      }
      if (f.to === me.id) toast(`${nameOf(f.from)} popped a bubble on you!`);
    },
  });
  studio.on('fx-event', onEffectEvent);
  net.onTopic('bubble', (d, from) => {
    if (!d || typeof d !== 'object' || !tiles.has(from)) return;
    const n = v => Math.max(-0.5, Math.min(1.5, Number(v) || 0));
    flyer.launch({ from, to: tiles.has(d.to) ? d.to : me.id, x: n(d.x), y: n(d.y), r: Math.min(0.5, Math.abs(Number(d.r) || 0.05)), hue: Number(d.hue) || 300 });
  });

  // Tell friends roughly where my face is, so their bubbles land on it.
  let lastFace = 0, lastFaceSig = '';
  studio.on('frame', fr => {
    const now = performance.now();
    if (now - lastFace < 200) return;
    lastFace = now;
    const f = fr.face;
    const face = f ? [f.center.x / fr.w, f.center.y / fr.h, f.scale / fr.w].map(v => Math.round(v * 1000) / 1000) : null;
    const sig = JSON.stringify(face);
    if (sig !== lastFaceSig) {
      lastFaceSig = sig;
      net.setPresence({ face });
    }
  });

  initChat();
  initEffects();
  initGames();
  initControls();
  addEventListener('beforeunload', () => {
    rtc?.closeAll();
    net?.leave();
  });
}

const nameOf = id => (id === me.id ? 'You' : net?.peers.get(id)?.name || 'Someone');

// --- tiles -----------------------------------------------------------------

function makeTile(id, media) {
  const el = document.createElement('div');
  el.className = 'tile';
  el.dataset.id = id;
  const label = document.createElement('div');
  label.className = 'name';
  const flags = document.createElement('div');
  flags.className = 'flags';
  el.append(media, label, flags);
  const rec = { id, el, media, label, flags, sig: '', name: '', phase: null };
  tiles.set(id, rec);
  tileGestures(rec);
  return rec;
}

// With two people one video fills the screen and the other floats in a
// corner (normally mine). Tapping the floating one swaps them; dragging it
// moves it to another corner.
let swapped = false;
let pipCorner = 'tr';
function updatePip() {
  const two = tiles.size === 2;
  if (!two) swapped = false;
  const other = [...tiles.keys()].find(id => id !== me.id);
  const pipId = two ? (swapped ? other : me.id) : null;
  for (const rec of tiles.values()) {
    const pip = rec.id === pipId;
    rec.el.classList.toggle('pip', pip);
    if (pip) rec.el.dataset.corner = pipCorner;
    else delete rec.el.dataset.corner;
  }
  $('#stage').classList.toggle('swapped', two && swapped);
  updateGrabButton();
}

// Pressing and holding my own tile is the Bubble Blow gesture, wherever it is.
function tileGestures(rec) {
  const el = rec.el;
  const self = () => rec.id === me.id;
  let drag = null;
  el.addEventListener('pointerdown', e => {
    if (e.button > 0 || e.target.closest('button')) return;
    el.setPointerCapture?.(e.pointerId);
    drag = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false, rect: el.getBoundingClientRect() };
    if (self()) studio.input.held = true;
  });
  el.addEventListener('pointermove', e => {
    if (!drag || !el.classList.contains('pip') || games?.current) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 10) return;
    if (!drag.moved) {
      drag.moved = true;
      if (self()) studio.input.held = false;
      el.classList.add('dragging');
    }
    el.style.transform = `translate(${dx}px, ${dy}px)`;
  });
  const up = e => {
    if (!drag) return;
    if (self()) studio.input.held = false;
    if (drag.moved) {
      // Snap to the corner nearest to where it was dropped.
      const cx = drag.rect.left + drag.rect.width / 2 + (e.clientX - drag.x);
      const cy = drag.rect.top + drag.rect.height / 2 + (e.clientY - drag.y);
      pipCorner = (cy < innerHeight / 2 ? 't' : 'b') + (cx < innerWidth / 2 ? 'l' : 'r');
      el.dataset.corner = pipCorner;
      el.style.transform = '';
      el.classList.remove('dragging');
    } else if (e.type === 'pointerup' && el.classList.contains('pip') && !games?.current && performance.now() - drag.t < 350) {
      swapped = !swapped;
      layout();
      for (const t of tiles.values()) flashName(t, 2000);
    }
    drag = null;
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
}

function addSelfTile() {
  const rec = makeTile(me.id, studio.canvas);
  rec.el.classList.add('self');
  rec.el.title = 'Hold to blow a bubble (Bubble Blow)';
  $('#stage').append(rec.el);
  updateTileLabel(rec, { name: `${me.name} (you)`, color: me.color, mic: true, cam: true });
}

// Names show on the videos only for a moment (when someone arrives, renames
// or the videos swap), leaving the picture clear.
function flashName(rec, ms = 3500) {
  rec.el.classList.add('show-name');
  clearTimeout(rec.nameTimer);
  rec.nameTimer = setTimeout(() => rec.el.classList.remove('show-name'), ms);
}

function updateTileLabel(rec, p) {
  const sig = JSON.stringify([p.name, p.color, p.mic, p.cam, p.away, rec.quality]);
  if (sig === rec.sig) return;
  rec.sig = sig;
  if (p.name && p.name !== rec.name) flashName(rec);
  rec.name = p.name || rec.name;
  rec.label.textContent = p.name || '…';
  rec.el.style.setProperty('--c', p.color || '#ff5fa2');
  rec.flags.textContent = '';
  const flag = (text, cls) => {
    const f = document.createElement('span');
    f.className = `flag ${cls || ''}`;
    if (cls === 'muted') {
      f.innerHTML = ICONS.mic;
      f.setAttribute('aria-label', 'Muted');
    } else {
      f.textContent = text;
    }
    rec.flags.append(f);
  };
  if (p.away) flag('Away', 'away');
  else if (p.mic === false) flag('', 'muted');
  if (rec.quality) {
    const q = document.createElement('span');
    q.className = `flag bars q${rec.quality}`;
    q.setAttribute('aria-label', ['', 'Poor connection', 'Fair connection', 'Good connection'][rec.quality]);
    q.title = q.getAttribute('aria-label');
    for (let i = 1; i <= 3; i++) q.append(document.createElement('i'));
    rec.flags.append(q);
  }
}

function onPeers(peers) {
  rtc.sync([...peers.keys()]);
  studio.setPeerCount(peers.size);
  queueMicrotask(updateGrabButton);
  for (const [id, p] of peers) {
    let rec = tiles.get(id);
    if (!rec) {
      const v = document.createElement('video');
      v.autoplay = true;
      v.playsInline = true;
      v.setAttribute('playsinline', '');
      rec = makeTile(id, v);
      rec.overlay = document.createElement('div');
      rec.overlay.className = 'call-status';
      rec.el.append(rec.overlay);
      const stream = rtc.streamOf(id);
      if (stream) v.srcObject = stream;
      $('#stage').insertBefore(rec.el, tiles.get(me.id).el);
      if (p.name) {
        toast(`${p.name} joined`);
        sfx('join');
      }
      rec.announced = !!p.name;
    } else if (!rec.announced && p.name) {
      rec.announced = true;
      toast(`${p.name} joined`);
      sfx('join');
    }
    updateTileLabel(rec, p);
    if (rec.phase === null) onCallInfo(id, rtc.info(id));
  }
  for (const [id, rec] of tiles) {
    if (id === me.id || peers.has(id)) continue;
    tiles.delete(id);
    rec.el.remove();
    toast(`${rec.name || 'Someone'} left`);
    sfx('leave');
  }
  layout();
  updateStatus();
  updateSessions();
}

function onRemoteStream(id, stream) {
  const rec = tiles.get(id);
  if (!rec) return;
  if (rec.media.srcObject !== stream) rec.media.srcObject = stream;
  playRemote(rec);
}

// Browsers may refuse to start a video with sound until the page is tapped.
// Then play it muted (so the picture shows) and offer a tap to hear.
function playRemote(rec) {
  const v = rec.media;
  v.play?.().catch(() => {
    v.muted = true;
    v.play().catch(() => {});
    showTapToHear();
  });
}

function showTapToHear() {
  if ($('#tap-to-hear')) return;
  const b = document.createElement('button');
  b.id = 'tap-to-hear';
  b.type = 'button';
  b.className = 'pill tap-to-hear';
  b.textContent = '🔈 Tap to hear your friends';
  b.addEventListener('click', () => {
    for (const rec of tiles.values()) {
      if (rec.id === me.id) continue;
      rec.media.muted = false;
      rec.media.play?.().catch(() => {});
    }
    b.remove();
  });
  document.body.append(b);
}

function onCallState() {
  updateStatus();
}

const PHASE_TEXT = {
  connecting: name => [`Connecting to ${name}…`, ''],
  retrying: name => [`Still connecting to ${name}…`, 'Trying another way'],
  failed: name => [`Can't connect video with ${name}`, rtc?.turn
    ? 'Your networks are blocking the call. Chat and games still work.'
    : 'Your networks are blocking a direct connection. Chat and games still work.'],
  reconnecting: name => [`Reconnecting to ${name}…`, 'The connection dropped'],
  frozen: name => [`${name}'s video has paused`, 'Waiting for their picture'],
};

// Shows how each call is doing on its tile, and in the status pill.
function onCallInfo(id, info) {
  const rec = tiles.get(id);
  if (!rec || rec.id === me.id) return;
  const prev = rec.phase;
  rec.phase = info.phase;
  rec.info = info;
  const name = rec.name || 'your friend';
  const ov = rec.overlay;
  if (ov) {
    const text = PHASE_TEXT[info.phase]?.(name);
    ov.hidden = !text;
    ov.dataset.phase = info.phase;
    if (text && (ov.dataset.sig !== text.join('|'))) {
      ov.dataset.sig = text.join('|');
      ov.textContent = '';
      const spin = document.createElement('span');
      spin.className = info.phase === 'failed' ? 'call-icon' : 'spinner';
      if (info.phase === 'failed') spin.textContent = '⚠️';
      const t = document.createElement('strong');
      t.textContent = text[0];
      ov.append(spin, t);
      if (text[1]) {
        const sub = document.createElement('span');
        sub.className = 'sub';
        sub.textContent = text[1];
        ov.append(sub);
      }
      if (info.phase === 'failed' || info.phase === 'retrying') {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn';
        b.textContent = 'Try again';
        b.addEventListener('click', () => {
          rtc.retry(id);
          toast(`Trying again with ${name}…`);
        });
        ov.append(b);
      }
    }
  }
  // Signal bars from round-trip time and packet loss.
  let quality = 0;
  if (info.phase === 'connected') {
    const rtt = info.rttMs ?? 0, loss = info.loss ?? 0;
    quality = rtt > 600 || loss > 8 ? 1 : rtt > 250 || loss > 3 ? 2 : 3;
  }
  if (quality !== rec.quality) {
    rec.quality = quality;
    const p = net.peers.get(id);
    if (p) updateTileLabel(rec, p);
  }
  if (prev && prev !== info.phase) {
    if (info.phase === 'connected' && (prev === 'retrying' || prev === 'failed' || prev === 'reconnecting')) toast(`Video connected with ${name}`);
    if (info.phase === 'failed') toast(`Can't connect video with ${name}`);
    if (info.phase === 'connected') playRemote(rec);
  }
  updateStatus();
  if ($('#connection')?.open) renderConnection();
}

// TURN credentials come from the relay (multiplayer/server, GET /turn). Until
// they arrive, or if the relay has none, calls use STUN only.
async function loadIceServers() {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`${MiniRooms.defaultServer()}/turn`, { signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    if (Array.isArray(data.iceServers) && data.iceServers.length) rtc.setIceServers(data.iceServers);
  } catch (e) {
    console.info('no TURN servers from the relay; calls use STUN only', e);
  }
}

function layout() {
  const n = tiles.size;
  const stage = $('#stage');
  stage.dataset.count = n <= 6 ? String(n) : 'many';
  updatePip();
  // Tiles touching the top or bottom edge keep their labels clear of the
  // floating bars.
  requestAnimationFrame(() => {
    const h = innerHeight;
    for (const rec of tiles.values()) {
      const r = rec.el.getBoundingClientRect();
      rec.el.classList.toggle('top-row', r.top < 4);
      rec.el.classList.toggle('bottom-row', r.bottom > h - 4);
    }
  });
  let wait = $('#waiting');
  if (n === 1) {
    if (!wait) {
      wait = document.createElement('div');
      wait.id = 'waiting';
      wait.className = 'stage-note';
      wait.textContent = `Waiting for friends. Send them this page: ${location.host}${location.pathname}`;
      stage.append(wait);
    }
  } else {
    wait?.remove();
  }
}
addEventListener('resize', () => { if (started) layout(); });

// The status pill: the relay connection, then the calls. Green when
// everything works, amber while something is connecting, red when stuck.
function updateStatus() {
  if (!net) return;
  const el = $('#status');
  const n = net.peers.size;
  let level = 'ok', text;
  if (net.status !== 'connected') {
    level = net.status === 'connecting' ? 'busy' : 'warn';
    text = {
      connecting: 'Connecting…',
      reconnecting: 'Reconnecting to the chat…',
      full: 'The chat is full (16 people). Retrying…',
    }[net.status] || 'Offline';
  } else if (n === 0) {
    text = 'Just you so far';
  } else {
    const phases = [...tiles.values()].filter(r => r.id !== me.id).map(r => r.phase || 'connecting');
    const failed = phases.filter(p => p === 'failed').length;
    const pending = phases.filter(p => p !== 'connected').length;
    text = `${n + 1} here`;
    if (failed) {
      level = 'bad';
      text += ' · no video';
    } else if (pending) {
      level = 'busy';
      text += ' · connecting…';
    }
  }
  el.textContent = '';
  const dot = document.createElement('span');
  dot.className = 'dot';
  el.append(dot, document.createTextNode(text));
  el.dataset.level = level;
  el.classList.toggle('warn', level !== 'ok');
}

// The connection panel: what the chat relay and every call are doing.
function renderConnection() {
  const body = $('#connection-body');
  body.textContent = '';
  const row = (k, v) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = k;
    const td = document.createElement('td');
    td.textContent = v;
    tr.append(th, td);
    return tr;
  };
  const table = document.createElement('table');
  table.className = 'keys conn';
  table.append(
    row('Chat relay', { connected: 'Connected', connecting: 'Connecting…', reconnecting: 'Reconnecting…', full: 'Full' }[net?.status] || 'Offline'),
    row('Relay server for video (TURN)', rtc?.turn ? 'Available' : 'Not set up (direct connections only)'),
    row('Video loop', perfText()),
    row('Camera / microphone', `${studio?.hasCamera ? (studio.camOn ? 'on' : 'off') : 'none'} / ${studio?.hasMic ? (studio.micOn ? 'on' : 'off') : 'none'}${studio?.away ? ' (paused: tab in background)' : ''}`),
  );
  body.append(table);
  const others = [...tiles.values()].filter(r => r.id !== me.id);
  if (!others.length) {
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'Nobody else is here yet.';
    body.append(p);
  }
  for (const rec of others) {
    const i = rtc.info(rec.id);
    const h = document.createElement('h3');
    h.textContent = rec.name || 'Someone';
    const t = document.createElement('table');
    t.className = 'keys conn';
    const phaseText = { connecting: 'Connecting…', retrying: 'Still connecting (retrying)', failed: "Can't connect", connected: 'Connected', reconnecting: 'Reconnecting…', frozen: 'Connected, video paused' }[i.phase] || i.phase;
    t.append(row('Video call', phaseText));
    if (i.route) t.append(row('Route', i.route === 'relay' ? 'Through the relay server' : 'Direct'));
    if (i.rttMs != null) t.append(row('Round trip', `${i.rttMs} ms`));
    if (i.fps != null) t.append(row('Their video', `${i.fps} fps, ${i.kbpsIn ?? 0} kbit/s in`));
    if (i.kbpsOut != null) t.append(row('My video to them', `${i.kbpsOut} kbit/s`));
    if (i.loss != null) t.append(row('Packet loss', `${i.loss}%`));
    if (i.restarts) t.append(row('Retries', String(i.restarts)));
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ghost';
    b.textContent = `Reconnect video with ${rec.name || 'them'}`;
    b.addEventListener('click', () => {
      rtc.retry(rec.id);
      renderConnection();
    });
    body.append(h, t, b);
  }
}

// Frame rate, time per frame and face tracking, and any freezes so far.
function perfText() {
  const p = studio?.perf;
  if (!p) return '—';
  let t = `${Math.round(p.fps)} fps · ${p.frameMs.toFixed(0)} ms a frame · face tracking ${p.trackMs.toFixed(0)} ms`;
  if (p.every > 1) t += ` (every ${p.every} frames)`;
  t += p.stalls ? ` · ${p.stalls} freeze${p.stalls > 1 ? 's' : ''}, longest ${(p.worst / 1000).toFixed(1)} s with ${p.worstFx} at ${new Date(p.worstAt).toLocaleTimeString()}` : ' · no freezes';
  return t;
}

function connectionReport() {
  const lines = [`Games Chat connection report ${new Date().toISOString()}`, `relay: ${net?.status}`, `turn: ${rtc?.turn}`, `video loop: ${perfText()}`, `effect: ${studio?.effect?.id || 'none'}`, `ua: ${navigator.userAgent}`];
  for (const rec of tiles.values()) {
    if (rec.id === me.id) continue;
    lines.push(`${rec.name}: ${JSON.stringify(rtc.info(rec.id))}`);
  }
  return lines.join('\n');
}

// --- controls --------------------------------------------------------------

// --- camera and microphone ---------------------------------------------------

async function startDevices(retry = false) {
  const r = await studio.startDevices();
  updateDeviceButtons();
  rtc?.setStream(studio.stream);
  if (r.error && (!r.camera || !r.mic)) return showDeviceProblem(r);
  $('#devices').open && $('#devices').close();
  if (retry) toast(r.camera && r.mic ? 'Camera and microphone are on' : r.camera ? 'Camera is on' : 'Microphone is on');
  else if (!r.camera && !r.mic) toast('No camera or microphone: you can still chat and play.');
  else if (!r.camera) toast('No camera found: friends will see your initial.');
  else if (!r.mic) toast('No microphone found.');
}

// Says why the camera or microphone isn't working, with Try again.
function showDeviceProblem(r) {
  const which = r.lost ? (r.lost === 'camera' ? 'Your camera' : 'Your microphone')
    : !r.camera && !r.mic ? 'Your camera and microphone' : !r.camera ? 'Your camera' : 'Your microphone';
  const n = r.error?.name;
  let why;
  if (r.lost) why = `${which} stopped, probably because another app (a phone or video call?) took it over. End that, then tap Try again.`;
  else if (n === 'NotAllowedError' || n === 'SecurityError') why = `${which} ${which.includes('and') ? 'are' : 'is'} blocked for this site. Allow access in your browser's settings for this site, then tap Try again.`;
  else if (n === 'NotReadableError' || n === 'AbortError' || n === 'TrackStartError') why = `${which} ${which.includes('and') ? 'are' : 'is'} busy in another app, probably a phone or video call. End that, then tap Try again.`;
  else if (n === 'Timeout') why = `${which} didn't start. Another app, such as a phone or video call, may be using ${which.includes('and') ? 'them' : 'it'}. End that, then tap Try again.`;
  else if (n === 'NotFoundError' || n === 'OverconstrainedError') why = `${which} wasn't found on this device.`;
  else why = `${which} couldn't start${r.error?.message ? `: ${r.error.message}` : '.'}`;
  $('#devices-msg').textContent = why;
  $('#devices-title').textContent = r.lost ? `${r.lost === 'camera' ? 'Camera' : 'Microphone'} stopped` : 'Camera and microphone';
  toast(why);
  openDialog('devices');
}

function updateDeviceButtons() {
  const mic = $('#btn-mic'), cam = $('#btn-cam');
  mic.setAttribute('aria-pressed', String(studio.micOn));
  cam.setAttribute('aria-pressed', String(studio.camOn));
  // Without a device the button stays live: tapping it tries to start it.
  mic.classList.toggle('missing', !studio.hasMic);
  cam.classList.toggle('missing', !studio.hasCamera);
  updateTileLabel(tiles.get(me.id), { name: `${me.name} (you)`, color: me.color, mic: studio.micOn, cam: studio.camOn });
  net?.setPresence({ cam: studio.camOn, mic: studio.micOn, away: studio.away });
}

// The bottom row (Favorites, Effects, Backgrounds, Games) and Messages share
// the space above the controls, so opening one closes the others. The picked
// button slides to the left (tap it again for the whole row) and the space
// to its right shows what is on, so nothing needs to sit above the strip.
const KINDS = ['effects', 'accessories', 'backgrounds'];
const trays = { favs: '#tray-favs', effects: '#tray-effects', accessories: '#tray-effects', backgrounds: '#tray-effects', games: '#tray-games', chat: '#chat-box' };
const TABS = ['favs', ...KINDS, 'games'];
let openTab = null;
function toggleTray(which, force) {
  const open = which && (force ?? openTab !== which);
  const next = open ? which : null;
  const prev = openTab;
  openTab = next;
  for (const sel of new Set(Object.values(trays))) $(sel).hidden = !next || trays[next] !== sel;
  for (const k of TABS) $(`#btn-${k}`).setAttribute('aria-expanded', String(k === next));
  for (const [k, g] of Object.entries(grids)) if (g.on && (next !== k && !(k === 'effects' && KINDS.includes(next)))) setGrid(k, false);
  if (KINDS.includes(next)) {
    if (prev !== next && grids.effects.on) setGrid('effects', false);
    showKind(next);
  } else if (next === 'favs') {
    renderFavorites();
  } else if (next === 'chat') {
    chatUnread = 0;
    updateChatBadge();
    if (matchMedia('(pointer: fine)').matches) $('#chat-input').focus();
  } else if (next === 'games') {
    $('#tray-games').querySelector('button')?.focus({ preventScroll: true });
  }
  // Picking from the row means the row is showing; closing a strip while the
  // row is away leaves nothing at level 1.
  if (next && TABS.includes(next) && next !== prev) setUiLevel(2);
  else setUiLevel(uiLevel);
  renderInfo();
}

// How much of the bottom UI shows, stepped by dragging it down and up:
//   2  the bottom row (and the open strip above it)
//   1  just the strip, sitting at the bottom (only while a strip is open)
//   0  nothing but a small grip to pull it all back up
// Dragging an open strip up past level 2 turns it into a grid.
let uiLevel = 2;
const stripOpen = () => openTab === 'favs' || KINDS.includes(openTab);
const stripKey = () => (openTab === 'favs' ? 'favs' : 'effects');
function setUiLevel(n) {
  uiLevel = n === 1 && !stripOpen() ? 0 : Math.max(0, Math.min(2, n));
  $('#call').dataset.ui = String(uiLevel);
  $('#ui-grip').hidden = uiLevel !== 0;
}
function lowerUi() {
  if (uiLevel === 2) setUiLevel(stripOpen() ? 1 : 0);
  else setUiLevel(0);
}
function raiseUi() {
  if (uiLevel === 0) setUiLevel(stripOpen() ? 1 : 2);
  else if (uiLevel === 1) setUiLevel(2);
  else if (stripOpen()) setGrid(stripKey(), true);
}

// A strip that can be dragged up into a grid (and pulled back down).
const grids = { effects: { on: false, tray: '#tray-effects', list: '#effect-list' }, favs: { on: false, tray: '#tray-favs', list: '#fav-list' } };
function setGrid(key, on) {
  const g = grids[key];
  g.on = on;
  $(g.tray).classList.toggle('grid', on);
  const list = $(g.list);
  if (on) {
    list.scrollLeft = 0;
    const sel = list.querySelector('[aria-selected="true"]:not([hidden])');
    list.scrollTop = 0;
    if (sel) list.scrollTop = Math.max(0, sel.offsetTop - list.clientHeight / 2 + sel.offsetHeight / 2);
  } else {
    list.scrollTop = 0;
    if (key === 'effects') centerEffect(studio?.effect?.id ?? '', false, false);
  }
}
const effectGrid = () => grids.effects.on;

function initSheets() {
  for (const key of Object.keys(grids)) {
    const g = grids[key];
    // Up: bring back the row, then open the grid. Down: close the grid,
    // then tuck the row away, then the strip.
    makeSheet($(g.tray), {
      onDismiss: () => toggleTray(null),
      scroller: g.list,
      onExpand: () => (uiLevel < 2 ? raiseUi() : setGrid(key, true)),
      // A short favourites list has nothing more to show in a grid.
      canExpand: () => !g.on && (uiLevel < 2 || key !== 'favs' || $(g.list).scrollWidth > $(g.list).clientWidth + 8),
      collapsible: () => true,
      onCollapse: () => (g.on ? setGrid(key, false) : lowerUi()),
    });
    $(`${g.tray} .sheet-grip`).addEventListener('click', () => {
      if (g.on || key !== 'favs' || $(g.list).scrollWidth > $(g.list).clientWidth + 8) setGrid(key, !g.on);
    });
  }
  // The row itself: drag it down to tuck it away (with the strip above it
  // following), up to open the grid; the grip brings everything back.
  makeSheet($('#controls'), { collapsible: () => true, onCollapse: lowerUi, onExpand: raiseUi });
  makeSheet($('#ui-grip'), { onExpand: raiseUi });
  $('#ui-grip').addEventListener('click', raiseUi);
  makeSheet($('#tray-games'), { onDismiss: () => toggleTray(null), scroller: '.sheet-body' });
  makeSheet($('#chat-box'), { onDismiss: () => toggleTray(null), scroller: '.chat-log' });
}

// Escape / controller B: close the topmost thing that is open.
function back() {
  const dialog = document.querySelector('dialog[open]');
  if (dialog) return dialog.close();
  if (openTab) return toggleTray(null);
  if (games?.current) return games.close();
}

function initControls() {
  $('#status').addEventListener('click', () => {
    renderConnection();
    openDialog('connection');
  });
  $('#copy-report').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(connectionReport());
      toast('Copied the connection report');
    } catch {
      toast("Couldn't copy here");
    }
  });
  setInterval(() => { if ($('#connection').open) renderConnection(); }, 2000);
  $('#devices-retry').addEventListener('click', () => startDevices(true));
  $('#btn-mic').addEventListener('click', () => {
    if (!studio.hasMic) return startDevices(true);
    studio.setMic(!studio.micOn);
    updateDeviceButtons();
  });
  $('#btn-cam').addEventListener('click', () => {
    if (!studio.hasCamera) return startDevices(true);
    studio.setCamera(!studio.camOn);
    updateDeviceButtons();
  });
  for (const k of TABS) $(`#btn-${k}`).addEventListener('click', () => toggleTray(k));
  $('#open-chat').addEventListener('click', () => {
    $('#settings').close();
    toggleTray('chat', true);
  });
  $('#chat-close').addEventListener('click', () => toggleTray(null));
  $('#fx-info').addEventListener('click', () => showEffectInfo(studio.effect));
  $('#fx-share').addEventListener('click', shareEffect);
  initSheets();
  $('#btn-leave').addEventListener('click', () => {
    rtc.closeAll();
    net.leave();
    location.reload();
  });

  const typing = e => /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName);
  addEventListener('keydown', e => {
    if (e.key === 'Escape') return back();
    if (typing(e) || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]')) return;
    if (games?.current && e.code === 'Space') return; // games use Space
    const key = e.key.toLowerCase();
    if (e.code === 'Space' && !e.repeat) {
      studio.input.held = true;
      if (document.activeElement === document.body || !document.activeElement?.matches('button')) e.preventDefault();
    } else if (key === 'e') toggleTray('effects');
    else if (key === 'a') toggleTray('accessories');
    else if (key === 'b') toggleTray('backgrounds');
    else if (key === 'g') toggleTray('games');
    else if (key === 'f') toggleTray('favs');
    else if (key === 'm') $('#btn-mic').click();
  });
  addEventListener('keyup', e => {
    if (e.code === 'Space') studio.input.held = false;
  });
}

// What the space beside the picked button says: the effect that's on (with
// its thumbs, ⓘ and share) or a line about the tab.
// The row stays whole (with the picked button lit) until something is on:
// only then does the button slide left and the others fold away to make room
// for its name and controls; picking "no effect" brings the row back.
function renderInfo() {
  const ctrls = $('#controls');
  const compact = (() => {
    const fx = studio?.effect;
    if (!fx) return false;
    if (KINDS.includes(openTab)) return fx.kind === openTab;
    return openTab === 'favs' && votes?.mine(`fx-${fx.id}`) === 1;
  })();
  if (compact) ctrls.dataset.tab = openTab;
  else delete ctrls.dataset.tab;
  $('#ctrl-info').hidden = !compact;
  if (!compact) return;
  const fx = studio?.effect;
  const name = $('#info-name'), sub = $('#info-sub');
  let showFx = false;
  if (KINDS.includes(openTab)) {
    showFx = !!fx && fx.kind === openTab;
    name.textContent = showFx ? `${fx.emoji} ${fx.name}` : { effects: 'Effects', accessories: 'Accessories', backgrounds: 'Backgrounds' }[openTab];
    sub.textContent = faceStatusText() || (showFx ? '' : 'Swipe to try one');
  } else if (openTab === 'favs') {
    const n = favoriteItems().length;
    showFx = !!fx && votes?.mine(`fx-${fx.id}`) === 1;
    name.textContent = showFx ? `${fx.emoji} ${fx.name}` : 'Favorites';
    sub.textContent = n ? (showFx ? '' : 'Tap one to use it') : 'Thumbs up things to keep them here';
  } else if (openTab === 'games') {
    name.textContent = 'Games';
    sub.textContent = 'Start one and friends can join';
  }
  sub.hidden = !sub.textContent;
  if (votes) {
    if (!fxVotes) {
      fxVotes = voteButtons(votes, 'fx-none', { compact: true });
      $('#fx-votes').append(fxVotes);
    }
    if (fx) fxVotes.setItem(`fx-${fx.id}`);
  }
  $('#info-actions').hidden = !showFx;
}

function faceStatusText() {
  if (!studio) return '';
  if (!studio.hasCamera) return 'No camera: effects show on your initial';
  return { idle: '', loading: 'Loading face tracking…', ready: '', failed: 'Face tracking unavailable' }[studio.faceStatus];
}

// --- effects ---------------------------------------------------------------

// Effects, Accessories and Backgrounds share one strip, each showing its own kind: swipe
// it sideways and whichever lens stops in the ring is put on, so you can
// preview each in turn. Tapping a lens scrolls it into the ring. Dragging
// the strip up opens them all as a grid that scrolls up and down (tap one to
// put it on); pulling the grid down goes back to the strip.
let quietUntil = 0; // programmatic scrolling of the strip mustn't pick an effect

function showKind(kind) {
  const list = $('#effect-list');
  list.dataset.kind = kind;
  for (const b of list.children) {
    const fx = effects.find(e => e.id === b.dataset.fx);
    b.hidden = !!fx && fx.kind !== kind;
  }
  const fx = studio?.effect;
  // Showing the other tab doesn't take off what's on: centre "none" quietly.
  centerEffect(fx?.kind === kind ? fx.id : '', false, false);
}

// Puts an icon (or the emoji) on a lens button, keeping its label.
function setButtonIcon(b, url, emoji) {
  const label = b.querySelector('.fx-label');
  b.textContent = '';
  if (url) {
    const im = document.createElement('img');
    im.src = url;
    im.alt = '';
    b.append(im);
  } else {
    b.append(document.createTextNode(emoji));
  }
  // Themed icons (all but the first set) bring their own tile: show it whole and big.
  b.classList.toggle('tile-icon', !!url && !/\/assets\/icons\//.test(url));
  if (label) b.append(label);
}

function effectButton(fx, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'fx-item';
  b.setAttribute('aria-label', fx.name);
  b.title = fx.name;
  const label = document.createElement('span');
  label.className = 'fx-label';
  label.textContent = fx.name;
  b.append(label);
  setButtonIcon(b, fx.icon, fx.emoji);
  b.addEventListener('click', onClick);
  return b;
}

async function initEffects() {
  effects = await loadEffects();
  const list = $('#effect-list');
  const none = { id: null, name: 'No effect', emoji: '🚫' };
  for (const fx of [none, ...effects]) {
    const b = effectButton({ ...fx, icon: fx.id && iconUrl('fx', fx.id) }, () => {
      if (effectGrid()) selectEffect(effects.find(e => e.id === b.dataset.fx) || null);
      else centerEffect(b.dataset.fx, true);
    });
    b.dataset.fx = fx.id ?? '';
    b.setAttribute('role', 'option');
    b.setAttribute('aria-selected', String(fx.id === null));
    b.addEventListener('focus', () => { if (!effectGrid()) centerEffect(b.dataset.fx, true); });
    list.append(b);
  }
  let settle = 0;
  list.addEventListener('scroll', () => {
    if (effectGrid() || performance.now() < quietUntil) return;
    clearTimeout(settle);
    settle = setTimeout(pickCenteredEffect, 110);
  }, { passive: true });
  addEventListener('keydown', e => {
    if ($('#tray-effects').hidden || /INPUT|TEXTAREA/.test(e.target?.tagName)) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const items = [...list.children].filter(b => !b.hidden);
    const i = items.findIndex(b => b.getAttribute('aria-selected') === 'true');
    const next = items[Math.max(0, Math.min(items.length - 1, i + (e.key === 'ArrowLeft' ? -1 : 1)))];
    if (effectGrid()) {
      selectEffect(effects.find(fx => fx.id === next.dataset.fx) || null);
      next.scrollIntoView({ block: 'nearest' });
    } else centerEffect(next.dataset.fx, true);
  });
  votes?.onChange(() => {
    if (openTab === 'favs') renderFavorites();
    renderInfo();
  });
  net.onTopic('fxshare', (d, from) => {
    const fx = effects.find(e => e.id === d?.fx);
    if (fx) showEffectOffer(from, fx);
  });
  updateFaceStatus();
}

// Scrolls a lens into the ring; with select, it's put on once the scroll settles.
function centerEffect(id, smooth, select = true) {
  const b = $(`#effect-list [data-fx="${id}"]`);
  if (!b) return;
  const list = $('#effect-list');
  if (!select) quietUntil = performance.now() + (smooth ? 600 : 250);
  list.scrollTo({ left: b.offsetLeft - (list.clientWidth - b.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'auto' });
  clearTimeout(centerEffect.t);
  if (select) centerEffect.t = setTimeout(pickCenteredEffect, smooth ? 450 : 30);
}

function pickCenteredEffect() {
  if (effectGrid() || $('#tray-effects').hidden) return;
  const list = $('#effect-list');
  const mid = list.getBoundingClientRect().left + list.clientWidth / 2;
  let best = null, bestD = Infinity;
  for (const b of list.children) {
    if (b.hidden) continue;
    const r = b.getBoundingClientRect();
    const d = Math.abs(r.left + r.width / 2 - mid);
    if (d < bestD) { bestD = d; best = b; }
  }
  if (!best) return;
  const id = best.dataset.fx;
  if ((studio.effect?.id ?? '') === id) return;
  // "None" in one tab only takes off an effect of that tab.
  if (!id && studio.effect && studio.effect.kind !== list.dataset.kind) return;
  selectEffect(effects.find(e => e.id === id) || null);
}

// iPhones only hand out the motion sensor from a tap (Safari counts touchend
// and click as taps, not pointerup), and say so if it was refused.
let motionAsk = null;
function askForMotion() {
  const st = studio.motionStatus;
  if (st === 'off') return toast('Motion access was refused: turn your head to look around, or reload to ask again');
  if (st !== 'needs-permission' || motionAsk) return;
  toast('Tap the screen, then turn around with your phone to look around');
  motionAsk = async () => {
    removeEventListener('touchend', motionAsk, true);
    removeEventListener('click', motionAsk, true);
    motionAsk = null;
    const got = await studio.requestMotion();
    if (got === 'off') toast('Motion access was refused: turn your head to look around instead');
  };
  addEventListener('touchend', motionAsk, true);
  addEventListener('click', motionAsk, true);
}

function selectEffect(fx) {
  studio.setEffect(fx);
  // 360 worlds look around with the phone's motion sensor; iPhones only
  // allow it after a tap, so ask on the next one.
  if (fx?.needs?.orientation) askForMotion();
  if (fx?.needs?.face && studio.faceStatus === 'failed') toast(`${fx.name}: face tracking isn't available in this browser`);
  else if (fx?.needs?.face && !studio.camOn) toast(`${fx.name} needs your camera on`);
  net.setPresence({ fx: fx?.id ?? null });
  document.querySelectorAll('.fx-item[data-fx]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.fx === (fx?.id ?? ''))));
  document.querySelectorAll('#fav-list .fx-item').forEach(b => b.setAttribute('aria-selected', String(b.dataset.item === `fx-${fx?.id}`)));
  // Put on from elsewhere (favourites, a share, a friend's): bring the strip along.
  const list = $('#effect-list');
  if (!$('#tray-effects').hidden && !effectGrid() && fx?.kind === list.dataset.kind) centerEffect(fx.id, true, false);
  sfx('click');
  renderInfo();
  updateGrabButton();
}

// ⓘ: how the effect that's on works, from its hint and what it needs.
function showEffectInfo(fx) {
  if (!fx) return;
  $('#fx-about-title').textContent = `${fx.emoji} ${fx.name}`;
  const body = $('#fx-about-body');
  body.textContent = '';
  const p = text => {
    const el = document.createElement('p');
    el.textContent = text;
    body.append(el);
  };
  if (fx.hint) p(`${fx.hint}.`.replace(/\.\.$/, '.').replace(/([!?])\.$/, '$1'));
  const n = fx.needs || {};
  if (n.face) p('It follows your face, so keep your face in view of the camera. With no face found, hold Space or press and hold your own video instead.');
  if (n.segmentation) p('It cuts you out from the room behind you. It works best with good light and some space between you and the wall.');
  if (n.orientation) p('Turn all the way round with your phone, and tilt it up and down, to look around the world. On a laptop, turn your head instead.');
  if (n.history) p(`It replays the last ${n.history < 1 ? 'moment' : `${n.history} seconds`} of your video, so move around to see it.`);
  if (fx.brighten) p('A dim camera image is brightened to match the scene.');
  p('Everyone sees it, because it is drawn on the video you send. Tap share to offer it to them too.');
  openDialog('fx-about');
}

// Share: offer the effect that's on to everyone.
function shareEffect() {
  const fx = studio.effect;
  if (!fx) return;
  net.send('fxshare', { fx: fx.id });
  toast(`Shared ${fx.emoji} ${fx.name} with everyone`);
}

function showEffectOffer(from, fx) {
  const el = document.createElement('div');
  el.className = 'invite';
  const text = document.createElement('span');
  text.textContent = `${nameOf(from)} shared ${fx.emoji} ${fx.name}`;
  const yes = document.createElement('button');
  yes.type = 'button';
  yes.className = 'btn aqua';
  yes.textContent = 'Try it';
  yes.addEventListener('click', () => {
    el.remove();
    selectEffect(fx);
  });
  const no = document.createElement('button');
  no.type = 'button';
  no.className = 'btn ghost';
  no.textContent = '✕';
  no.setAttribute('aria-label', 'No thanks');
  no.addEventListener('click', () => el.remove());
  el.append(text, yes, no);
  $('#invites').append(el);
  sfx('join');
  setTimeout(() => el.remove(), 15000);
}

// With a friend's video big, a button to put their effect on me too.
function updateGrabButton() {
  let btn = $('#grab-fx');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'grab-fx';
    btn.type = 'button';
    btn.className = 'grab-fx';
    btn.hidden = true;
    btn.innerHTML = `${ICONS.download}<span class="emoji"></span>`;
    btn.addEventListener('click', () => {
      const fx = effects.find(e => e.id === btn.dataset.fx);
      if (fx) {
        selectEffect(fx);
        toast(`You've got ${fx.emoji} ${fx.name} on too`);
      }
    });
    $('#call').append(btn);
  }
  const friend = tiles.size === 2 && !swapped && !games?.current ? [...tiles.keys()].find(id => id !== me.id) : null;
  const fxId = friend ? net?.peers.get(friend)?.fx : null;
  const fx = fxId && effects.find(e => e.id === fxId);
  const show = !!fx && studio?.effect?.id !== fx.id;
  btn.hidden = !show;
  if (show) {
    btn.dataset.fx = fx.id;
    btn.querySelector('.emoji').textContent = fx.emoji;
    btn.setAttribute('aria-label', `Put ${nameOf(friend)}'s ${fx.name} on me`);
    btn.title = `Put ${nameOf(friend)}'s ${fx.name} on me too`;
  }
}

// --- favourites --------------------------------------------------------------

// Everything I gave a thumbs up that still exists, effects first.
function favoriteItems() {
  if (!votes) return [];
  const out = [];
  for (const fx of effects) if (votes.mine(`fx-${fx.id}`) === 1) out.push({ item: `fx-${fx.id}`, fx });
  for (const g of games?.games.values() ?? []) if (votes.mine(`game-${g.id}`) === 1) out.push({ item: `game-${g.id}`, game: g });
  return out;
}

function renderFavorites() {
  const list = $('#fav-list');
  const items = favoriteItems();
  const sig = items.map(i => i.item).join(',');
  if (list.dataset.sig !== sig) {
    list.dataset.sig = sig;
    list.textContent = '';
    for (const it of items) {
      const src = it.fx || it.game;
      const b = effectButton({ name: src.name, emoji: src.emoji, icon: iconUrl(it.fx ? 'fx' : 'game', src.id) }, () => {
        if (it.fx) selectEffect(studio.effect?.id === it.fx.id ? null : it.fx);
        else {
          sfx('click');
          games.open(it.game.id);
        }
      });
      b.dataset.item = it.item;
      if (it.game) b.classList.add('is-game');
      b.setAttribute('aria-selected', String(it.fx && studio.effect?.id === it.fx.id));
      list.append(b);
    }
  }
  $('#fav-empty').hidden = items.length > 0;
  if (!items.length && grids.favs.on) setGrid('favs', false);
}

function updateFaceStatus() {
  if (!studio) return;
  const s = studio.faceStatus;
  document.querySelectorAll('#effect-list .fx-item').forEach(b => {
    const fx = effects.find(e => e.id === b.dataset.fx);
    b.classList.toggle('disabled', !!fx?.needs?.face && (s === 'failed' || !studio.hasCamera) && fx.id !== 'bubble');
  });
  renderInfo();
}

// A released bubble: send it to a friend (a random one when there are several).
function onEffectEvent({ type, data }) {
  if (type !== 'bubble') return;
  const others = [...tiles.keys()].filter(id => id !== me.id);
  if (!others.length) return;
  const to = others[Math.floor(Math.random() * others.length)];
  net.send('bubble', { ...data, to });
  flyer.launch({ from: me.id, to, ...data });
}

// --- games -----------------------------------------------------------------

// The height of the phone's home-bar area (0 on most screens).
function safeBottom() {
  let probe = $('#safe-probe');
  if (!probe) {
    probe = document.createElement('div');
    probe.id = 'safe-probe';
    probe.style.cssText = 'position:fixed;left:0;bottom:0;width:0;height:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none';
    document.body.append(probe);
  }
  return Math.ceil(probe.getBoundingClientRect().height);
}

async function initGames() {
  games = createGameHost({
    net,
    studio,
    mediaOf: id => tiles.get(id)?.media ?? null,
    // How much of a full-bleed game the floating bars cover, in pixels.
    insets: () => ({
      top: Math.ceil($('#topbar').getBoundingClientRect().bottom),
      // No bottom bar while a game is on, just the phone's home-bar area.
      bottom: safeBottom() + 8,
    }),
    toast,
    onOpen: c => {
      $('#game-mount').append(c.el);
      $('#game-panel').hidden = false;
      $('#game-panel').classList.toggle('full-bleed', !!c.game.fullBleed);
      $('#call').classList.add('has-game');
      $('#game-head').hidden = false;
      $('#game-title').textContent = `${c.game.emoji} ${c.game.name}`;
      if (!gameVotes) {
        gameVotes = voteButtons(votes, 'game-none', { compact: true });
        $('#game-votes').append(gameVotes);
      }
      gameVotes.setItem(`game-${c.game.id}`);
      toggleTray(null);
      updateSessions();
      updateGrabButton();
    },
    onClose: c => {
      c.el.remove();
      $('#game-panel').hidden = true;
      $('#call').classList.remove('has-game');
      $('#game-head').hidden = true;
      updateSessions();
      updateGrabButton();
    },
  });
  games.register(await loadGames());
  $('#game-close').addEventListener('click', () => games.close());

  const list = $('#game-list');
  for (const g of games.games.values()) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'game-card';
    b.dataset.game = g.id;
    const ico = document.createElement('span');
    ico.className = 'ico';
    const gameIcon = iconUrl('game', g.id);
    if (gameIcon) {
      const im = document.createElement('img');
      im.src = gameIcon;
      im.alt = '';
      ico.append(im);
    } else {
      ico.textContent = g.emoji;
    }
    const txt = document.createElement('span');
    txt.className = 'txt';
    const nm = document.createElement('span');
    nm.className = 'nm';
    nm.textContent = g.name;
    const bl = document.createElement('span');
    bl.className = 'bl';
    bl.textContent = g.minPlayers > 1 ? `${g.minPlayers}+ players` : 'Solo or together';
    b.title = g.blurb;
    txt.append(nm, bl);
    b.append(ico, txt);
    b.addEventListener('click', () => {
      sfx('click');
      games.open(g.id);
    });
    const wrap = document.createElement('div');
    wrap.className = 'game-cell';
    wrap.append(b, voteButtons(votes, `game-${g.id}`, { compact: true }));
    list.append(wrap);
  }

  net.onTopic('invite', (d, from) => {
    if (!d || typeof d.sid !== 'string' || !games.games.has(d.id)) return;
    if (games.current?.sid === d.sid) return;
    showInvite(from, d);
  });
  net.on('peers', () => updateSessions());
}

let sessionsSig = '';
function updateSessions() {
  if (!games) return;
  const sessions = games.sessions();
  const sig = JSON.stringify(sessions.map(s => [s.sid, s.people.map(p => p.name)])) + (games.current?.sid ?? '');
  if (sig === sessionsSig) return;
  sessionsSig = sig;
  const badge = $('#games-badge');
  badge.hidden = !sessions.length;
  badge.textContent = String(sessions.length);
  const list = $('#session-list');
  list.textContent = '';
  for (const s of sessions) {
    const row = document.createElement('div');
    row.className = 'session';
    const who = document.createElement('span');
    who.className = 'who';
    who.textContent = `${s.game.emoji} ${s.game.name}: ${s.people.map(p => p.name).join(', ')}`;
    const join = document.createElement('button');
    join.type = 'button';
    join.className = 'btn aqua';
    join.textContent = 'Join';
    join.addEventListener('click', () => games.join(s));
    row.append(who, join);
    list.append(row);
  }
}

function showInvite(from, d) {
  const g = games.games.get(d.id);
  const el = document.createElement('div');
  el.className = 'invite';
  const text = document.createElement('span');
  text.textContent = `${nameOf(from)} started ${g.emoji} ${g.name}`;
  const join = document.createElement('button');
  join.type = 'button';
  join.className = 'btn aqua';
  join.textContent = 'Join';
  join.addEventListener('click', async () => {
    el.remove();
    // The invite can arrive a moment before the presence that lists the
    // game, so give it a couple of seconds to show up.
    for (let i = 0; i < 25; i++) {
      const s = games.sessions().find(x => x.sid === d.sid);
      if (s) return games.join(s);
      await new Promise(r => setTimeout(r, 100));
    }
    toast('That game has ended');
  });
  const x = document.createElement('button');
  x.type = 'button';
  x.className = 'btn ghost';
  x.textContent = '✕';
  x.setAttribute('aria-label', 'Dismiss');
  x.addEventListener('click', () => el.remove());
  el.append(text, join, x);
  $('#invites').append(el);
  sfx('join');
  setTimeout(() => el.remove(), 12000);
}

// --- text chat -------------------------------------------------------------

function addMessage(text, from, color) {
  const log = $('#chat-log');
  const el = document.createElement('div');
  if (!from) {
    el.className = 'msg sys';
    el.textContent = text;
  } else {
    el.className = from === me.id ? 'msg mine' : 'msg';
    const who = document.createElement('span');
    who.className = 'from';
    who.textContent = from === me.id ? 'You' : nameOf(from);
    who.style.setProperty('--c', color || '');
    el.append(who, document.createTextNode(text));
  }
  log.append(el);
  while (log.childElementCount > 200) log.firstChild.remove();
  log.scrollTop = log.scrollHeight;
}

// Unread messages show on the settings button (where Messages lives) and on
// the Messages button inside settings.
function updateChatBadge() {
  for (const id of ['#chat-badge', '#settings-badge']) {
    $(id).hidden = !chatUnread;
    $(id).textContent = String(chatUnread);
  }
}

function initChat() {
  $('#chat-form').addEventListener('submit', e => {
    e.preventDefault();
    const input = $('#chat-input');
    const text = input.value.trim().slice(0, 200);
    if (!text) return;
    input.value = '';
    net.send('chat', { text });
    addMessage(text, me.id, me.color);
  });
  net.onTopic('chat', (d, from) => {
    if (!d || typeof d.text !== 'string') return;
    addMessage(d.text.slice(0, 200), from, net.peers.get(from)?.color);
    if ($('#chat-box').hidden) {
      chatUnread++;
      updateChatBadge();
      toast(`${nameOf(from)}: ${d.text.slice(0, 60)}`);
    }
    sfx('tick');
  });
}

// --- settings --------------------------------------------------------------

// Everyone's thumbs, best first, so the ones nobody likes can be dropped.
function renderRatings() {
  const body = $('#ratings-body');
  body.textContent = '';
  if (!votes) {
    $('#ratings-note').textContent = 'Join the chat to see the ratings.';
    return;
  }
  $('#ratings-note').textContent = votes.shared
    ? 'Totals from everyone who has voted. Vote with the thumbs on the effect strip, the game cards or the bar of a running game.'
    : 'Shared totals aren’t available yet (the relay hasn’t been updated), so these are only your own votes.';
  const groups = [
    ['Effects', effects.map(f => ({ id: `fx-${f.id}`, name: `${f.emoji} ${f.name}` }))],
    ['Games', [...(games?.games.values() ?? [])].map(g => ({ id: `game-${g.id}`, name: `${g.emoji} ${g.name}` }))],
  ];
  for (const [title, items] of groups) {
    const h = document.createElement('h3');
    h.textContent = title;
    const table = document.createElement('table');
    table.className = 'keys';
    const head = table.insertRow();
    for (const t of ['', '👍', '👎', 'Score']) {
      const th = document.createElement('th');
      th.textContent = t;
      head.append(th);
    }
    const rows = items.map(it => ({ ...it, ...votes.counts(it.id) })).sort((a, b) => (b.up - b.down) - (a.up - a.down) || b.up - a.up);
    for (const r of rows) {
      const tr = table.insertRow();
      for (const v of [r.name, r.up, r.down, r.up - r.down]) tr.insertCell().textContent = String(v);
    }
    body.append(h, table);
  }
}

function initSettings() {
  $('#open-ratings').addEventListener('click', async () => {
    $('#settings').close();
    await votes?.refresh();
    renderRatings();
    openDialog('ratings');
  });
  const name = $('#set-name');
  const vol = $('#set-volume');
  const motion = $('#set-motion');
  const themeSel = $('#set-theme');
  themeSel.addEventListener('change', () => {
    settings.theme = themeSel.value;
    applyTheme(settings.theme);
    saveSettings();
  });
  const light = $('#set-light');
  light.addEventListener('change', () => {
    settings.autoLight = light.checked;
    studio?.setAutoLight(light.checked);
    saveSettings();
  });
  $('#settings').addEventListener('close', () => {
    const v = name.value.trim().slice(0, 20);
    if (v && v !== settings.name) {
      settings.name = v;
      $('#name-input').value = v;
      if (started) {
        me.name = v;
        studio.setAvatar(v, me.color);
        net.setPresence({ name: v });
        updateDeviceButtons();
      }
    }
    saveSettings();
  });
  // The name shows as text; tapping it turns it into a field to change it.
  const nameShow = $('#set-name-show');
  nameShow.addEventListener('click', () => {
    nameShow.hidden = true;
    name.hidden = false;
    name.focus();
    name.select();
  });
  name.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      $('#set-name-text').textContent = name.value.trim() || settings.name;
      name.hidden = true;
      nameShow.hidden = false;
      nameShow.focus();
    }
  });
  document.querySelectorAll('[data-open="settings"]').forEach(b => b.addEventListener('click', () => {
    name.value = settings.name;
    name.hidden = true;
    nameShow.hidden = false;
    $('#set-name-text').textContent = settings.name || 'Pick a name';
    vol.value = settings.volume;
    motion.checked = !!settings.reduceMotion;
    themeSel.value = settings.theme || 'teen';
    light.checked = settings.autoLight !== false;
    colorPicker($('#set-colors'), c => {
      colorPicker($('#color-picker'));
      if (started) {
        me.color = c;
        studio.setAvatar(me.name, c);
        net.setPresence({ color: c });
        updateDeviceButtons();
      }
    });
  }));
  vol.addEventListener('input', () => {
    settings.volume = parseFloat(vol.value);
    setVolume(settings.volume);
    unlockAudio();
    sfx('pop');
  });
  motion.addEventListener('change', () => {
    settings.reduceMotion = motion.checked;
    document.body.classList.toggle('reduce-motion', motion.checked);
  });
}

// --- controller ------------------------------------------------------------

function initGamepad() {
  createGamepad({
    layer: () => document.querySelector('dialog[open]')
      || (!$('#tray-effects').hidden && $('#tray-effects'))
      || (!$('#tray-games').hidden && $('#tray-games'))
      || (!$('#chat-box').hidden && $('#chat-box'))
      || document.querySelector('.screen.active'),
    onActive: () => {
      if (!started) $('#pad-hint').hidden = false;
    },
    onStick: pad => {
      if (studio && !games?.current) studio.input.held = pad.rt > 0.5 || (studio.input.held && pad.rt > 0.2);
    },
    routeToGame: pad => {
      const inst = games?.current?.instance;
      if (!inst?.onPad || document.querySelector('dialog[open]') || !$('#tray-effects').hidden || !$('#tray-games').hidden) return false;
      if (pad.b) {
        games.close();
        return true;
      }
      inst.onPad(pad);
      return true;
    },
    onButton: (i, pad) => {
      if (!started) {
        // On the idle title screen any fresh button starts.
        if (i === 0 && document.activeElement?.matches('button, input')) {
          if (document.activeElement.id === 'name-input') start();
          else document.activeElement.click();
        } else if (i === 1) back();
        else if (i !== 0 && (i === 9 || !document.activeElement || document.activeElement === document.body || document.activeElement.id === 'start-btn')) start();
        return;
      }
      if (i === 0) document.activeElement?.click?.();
      else if (i === 1) back();
      else if (i === 2) toggleTray('effects');
      else if (i === 3) toggleTray('games');
      else if (i === 8) $('#btn-mic').click();
    },
  });
}

initTitle();
initSettings();
initGamepad();

// Hooks for the browser checks in test/.
window.__chat = {
  get studio() { return studio; },
  get net() { return net; },
  get rtc() { return rtc; },
  get games() { return games; },
  get votes() { return votes; },
  get tiles() { return tiles; },
  me,
  selectEffect: id => selectEffect(effects.find(e => e.id === id) || null),
  toggleTray: (k, force) => toggleTray(k, force),
  get uiLevel() { return uiLevel; },
  setUiLevel: n => setUiLevel(n),
  sfxMuted,
};
