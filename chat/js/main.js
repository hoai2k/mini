// Games Chat: the page. Wires the title screen, the shared room (net.js),
// the calls (rtc.js), my camera and effects (studio.js), the minigames
// (gamehost.js) and the controls together.

import { createNet } from './net.js';
import { createRtc } from './rtc.js';
import { createStudio } from './studio.js';
import { createGameHost } from './gamehost.js';
import { createGamepad } from './gamepad.js';
import { createFlyer } from './flyer.js';
import { loadEffects } from '../effects/index.js';
import { loadGames } from '../games/index.js';
import { load, save, randomId } from './store.js';
import { sfx, unlockAudio, setVolume } from './audio.js';
import { assetUrl } from './assets.js';
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

const fullscreenSupported = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
const standalone = () => matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone === true;

// iPhones have no fullscreen for web pages (only for videos); there the
// button explains Add to Home Screen, which opens the app full screen.
function toggleFullscreen(fromStart = false) {
  const doc = document;
  if (doc.fullscreenElement || doc.webkitFullscreenElement) {
    (doc.exitFullscreen || doc.webkitExitFullscreen)?.call(doc);
    return;
  }
  if (!fullscreenSupported()) {
    if (!fromStart) openDialog('fullscreen-help');
    return;
  }
  const el = doc.documentElement;
  try {
    if (el.requestFullscreen) el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    else el.webkitRequestFullscreen?.();
  } catch {}
}

document.addEventListener('click', e => {
  const opener = e.target.closest('[data-open]');
  if (opener) openDialog(opener.dataset.open);
  if (e.target.closest('[data-action="fullscreen"]')) toggleFullscreen();
});
applyIcons();
// Already running full screen from the home screen: no button needed.
if (standalone()) document.querySelectorAll('[data-action="fullscreen"]').forEach(b => { b.hidden = true; });
document.addEventListener('fullscreenchange', () => {
  document.querySelectorAll('[data-action="fullscreen"]').forEach(b => b.setAttribute('aria-pressed', String(!!document.fullscreenElement)));
});

// --- title screen ----------------------------------------------------------

function initTitle() {
  const logo = assetUrl('logo');
  if (logo) {
    $('#logo-img').src = logo;
    $('#logo-img').hidden = false;
    $('#logo').classList.add('has-img');
  }
  const bg = assetUrl('title-bg');
  if (bg) {
    $('#title').style.backgroundImage = `url("${bg}")`;
    $('#title').classList.add('has-bg');
  }
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

  studio = createStudio();
  studio.setAvatar(me.name, me.color);
  addSelfTile();
  layout();

  const devices = await studio.startDevices();
  if (!devices.camera && !devices.mic) toast('No camera or microphone: you can still chat and play.');
  else if (!devices.camera) toast('No camera found: friends will see your initial.');
  else if (!devices.mic) toast('No microphone found.');
  updateDeviceButtons();
  studio.on('face-status', updateFaceStatus);
  updateFaceStatus();

  net = createNet({ game: 'chat', room: 'everyone', me });
  votes = createVotes({ server: MiniRooms.defaultServer() });
  net.setPresence({ cam: studio.camOn, mic: studio.micOn, fx: null });
  rtc = createRtc({ net, stream: studio.stream });
  rtc.on('stream', onRemoteStream);
  rtc.on('state', onCallState);
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
  const rec = { id, el, media, label, flags, sig: '', name: '' };
  tiles.set(id, rec);
  return rec;
}

// My own tile. Pressing and holding it is the Bubble Blow gesture; with two
// people it floats in a corner, and dragging it moves it to another corner.
function addSelfTile() {
  const rec = makeTile(me.id, studio.canvas);
  const el = rec.el;
  el.classList.add('self');
  el.dataset.corner = 'tr';
  el.title = 'Hold to blow a bubble (Bubble Blow)';
  let drag = null;
  el.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    el.setPointerCapture?.(e.pointerId);
    drag = { x: e.clientX, y: e.clientY, moved: false, rect: el.getBoundingClientRect() };
    studio.input.held = true;
  });
  el.addEventListener('pointermove', e => {
    if (!drag || $('#stage').dataset.count !== '2' || games?.current) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 10) return;
    if (!drag.moved) {
      drag.moved = true;
      studio.input.held = false;
      el.classList.add('dragging');
    }
    el.style.transform = `translate(${dx}px, ${dy}px)`;
  });
  const up = e => {
    if (!drag) return;
    studio.input.held = false;
    if (drag.moved) {
      // Snap to the corner nearest to where it was dropped.
      const cx = drag.rect.left + drag.rect.width / 2 + (e.clientX - drag.x);
      const cy = drag.rect.top + drag.rect.height / 2 + (e.clientY - drag.y);
      el.dataset.corner = (cy < innerHeight / 2 ? 't' : 'b') + (cx < innerWidth / 2 ? 'l' : 'r');
      el.style.transform = '';
      el.classList.remove('dragging');
    }
    drag = null;
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  $('#stage').append(el);
  updateTileLabel(rec, { name: `${me.name} (you)`, color: me.color, mic: true, cam: true });
}

function updateTileLabel(rec, p) {
  const sig = JSON.stringify([p.name, p.color, p.mic, p.cam, rec.state]);
  if (sig === rec.sig) return;
  rec.sig = sig;
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
  if (p.mic === false) flag('', 'muted');
  if (rec.state && rec.state !== 'connected' && rec.id !== me.id) {
    flag(rec.state === 'failed' ? 'video can’t connect' : 'connecting…');
  }
}

function onPeers(peers) {
  rtc.sync([...peers.keys()]);
  studio.setPeerCount(peers.size);
  for (const [id, p] of peers) {
    let rec = tiles.get(id);
    if (!rec) {
      const v = document.createElement('video');
      v.autoplay = true;
      v.playsInline = true;
      v.setAttribute('playsinline', '');
      rec = makeTile(id, v);
      rec.state = 'new';
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
  rec.media.play?.().catch(() => {
    // Autoplay with sound was blocked: play on the next tap anywhere.
    toast('Tap anywhere to hear your friends');
    addEventListener('pointerdown', () => rec.media.play().catch(() => {}), { once: true });
  });
}

function onCallState(id, state) {
  const rec = tiles.get(id);
  if (!rec) return;
  rec.state = state;
  const p = net.peers.get(id);
  if (p) updateTileLabel(rec, p);
}

function layout() {
  const n = tiles.size;
  const stage = $('#stage');
  stage.dataset.count = n <= 6 ? String(n) : 'many';
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

function updateStatus() {
  if (!net) return;
  const el = $('#status');
  const n = net.peers.size;
  const text = {
    connecting: 'Connecting…',
    reconnecting: 'Reconnecting…',
    full: 'The chat is full (16 people). Retrying…',
    connected: n === 0 ? 'Just you so far' : `${n + 1} here`,
  }[net.status];
  el.textContent = text;
  el.classList.toggle('warn', net.status !== 'connected');
}

// --- controls --------------------------------------------------------------

function updateDeviceButtons() {
  const mic = $('#btn-mic'), cam = $('#btn-cam');
  mic.setAttribute('aria-pressed', String(studio.micOn));
  cam.setAttribute('aria-pressed', String(studio.camOn));
  mic.disabled = !studio.hasMic;
  cam.disabled = !studio.hasCamera;
  updateTileLabel(tiles.get(me.id), { name: `${me.name} (you)`, color: me.color, mic: studio.micOn, cam: studio.camOn });
  net?.setPresence({ cam: studio.camOn, mic: studio.micOn });
}

// The effects strip, the games sheet and the chat sheet share the space above
// the controls, so opening one closes the others.
const trays = { effects: '#tray-effects', games: '#tray-games', chat: '#chat-box' };
function toggleTray(which, force) {
  for (const [k, sel] of Object.entries(trays)) {
    const open = k === which ? (force ?? $(sel).hidden) : false;
    $(sel).hidden = !open;
    $(`#btn-${k}`).setAttribute('aria-expanded', String(open));
  }
  if (which === 'effects' && !$('#tray-effects').hidden) {
    centerEffect(studio?.effect?.id ?? '', false);
  } else if (studio?.effect) {
    renderEffectHint(true);
  }
  if (which === 'chat' && !$('#chat-box').hidden) {
    chatUnread = 0;
    $('#chat-badge').hidden = true;
    if (matchMedia('(pointer: fine)').matches) $('#chat-input').focus();
  } else if (which === 'games' && !$('#tray-games').hidden) {
    $('#tray-games').querySelector('button')?.focus({ preventScroll: true });
  }
}

function initSheets() {
  makeSheet($('#tray-effects'), { onDismiss: () => toggleTray(null) });
  makeSheet($('#tray-games'), { onDismiss: () => toggleTray(null), scroller: '.sheet-body' });
  makeSheet($('#chat-box'), { onDismiss: () => toggleTray(null), scroller: '.chat-log' });
}

// Escape / controller B: close the topmost thing that is open.
function back() {
  const dialog = document.querySelector('dialog[open]');
  if (dialog) return dialog.close();
  if (Object.values(trays).some(sel => !$(sel).hidden)) return toggleTray(null);
  if (games?.current) return games.close();
}

function initControls() {
  $('#btn-mic').addEventListener('click', () => {
    studio.setMic(!studio.micOn);
    updateDeviceButtons();
  });
  $('#btn-cam').addEventListener('click', () => {
    studio.setCamera(!studio.camOn);
    updateDeviceButtons();
  });
  $('#btn-effects').addEventListener('click', () => toggleTray('effects'));
  $('#btn-games').addEventListener('click', () => toggleTray('games'));
  $('#btn-chat').addEventListener('click', () => toggleTray('chat'));
  initSheets();
  $('#btn-leave').addEventListener('click', () => {
    rtc.closeAll();
    net.leave();
    location.reload();
  });

  const typing = e => /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName);
  addEventListener('keydown', e => {
    if (e.key === 'Escape') return back();
    if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (games?.current && e.code === 'Space') return; // games use Space
    if (e.code === 'Space' && !e.repeat) {
      studio.input.held = true;
      if (document.activeElement === document.body || !document.activeElement?.matches('button')) e.preventDefault();
    } else if (e.key === 'e' || e.key === 'E') toggleTray('effects');
    else if (e.key === 'g' || e.key === 'G') toggleTray('games');
    else if (e.key === 'm' || e.key === 'M') $('#btn-mic').click();
  });
  addEventListener('keyup', e => {
    if (e.code === 'Space') studio.input.held = false;
  });
}

// --- effects ---------------------------------------------------------------

// The effects strip: swipe it sideways and whichever lens stops in the ring
// is put on, so you can preview each in turn. Tapping a lens scrolls it into
// the ring.
async function initEffects() {
  effects = await loadEffects();
  const list = $('#effect-list');
  const none = { id: null, name: 'No effect', emoji: '🚫', hint: '' };
  for (const fx of [none, ...effects]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'fx-item';
    b.dataset.fx = fx.id ?? '';
    b.setAttribute('role', 'option');
    b.setAttribute('aria-selected', String(fx.id === null));
    b.setAttribute('aria-label', fx.name);
    b.title = fx.hint || fx.name;
    const iconUrl = fx.id && assetUrl(`fx-${fx.id}`);
    if (iconUrl) {
      const im = document.createElement('img');
      im.src = iconUrl;
      im.alt = '';
      b.append(im);
    } else {
      b.textContent = fx.emoji;
    }
    b.addEventListener('click', () => centerEffect(b.dataset.fx, true));
    b.addEventListener('focus', () => centerEffect(b.dataset.fx, true));
    list.append(b);
  }
  let settle = 0;
  list.addEventListener('scroll', () => {
    clearTimeout(settle);
    settle = setTimeout(pickCenteredEffect, 110);
  }, { passive: true });
  addEventListener('keydown', e => {
    if ($('#tray-effects').hidden || /INPUT|TEXTAREA/.test(e.target?.tagName)) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const items = [...list.children];
    const i = items.findIndex(b => b.getAttribute('aria-selected') === 'true');
    const next = items[Math.max(0, Math.min(items.length - 1, i + (e.key === 'ArrowLeft' ? -1 : 1)))];
    centerEffect(next.dataset.fx, true);
  });
  updateFaceStatus();
}

function centerEffect(id, smooth) {
  const b = $(`#effect-list [data-fx="${id}"]`);
  if (!b) return;
  const list = $('#effect-list');
  list.scrollTo({ left: b.offsetLeft - (list.clientWidth - b.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'auto' });
  if (!smooth) renderEffectHint();
  // Selecting happens when the scroll settles; if it is already there, now.
  clearTimeout(centerEffect.t);
  centerEffect.t = setTimeout(pickCenteredEffect, smooth ? 450 : 30);
}

function pickCenteredEffect() {
  const list = $('#effect-list');
  const mid = list.getBoundingClientRect().left + list.clientWidth / 2;
  let best = null, bestD = Infinity;
  for (const b of list.children) {
    const r = b.getBoundingClientRect();
    const d = Math.abs(r.left + r.width / 2 - mid);
    if (d < bestD) { bestD = d; best = b; }
  }
  if (!best) return;
  const id = best.dataset.fx;
  if ((studio.effect?.id ?? '') === id) return;
  selectEffect(effects.find(e => e.id === id) || null);
}

let hintTimer = 0;
function selectEffect(fx) {
  studio.setEffect(fx);
  // 360 worlds look around with the phone's motion sensor; iPhones only
  // allow it after a tap, so ask on the next one.
  if (fx?.needs?.orientation && studio.motionStatus === 'needs-permission') {
    toast('Tap the screen, then tilt your phone to look around');
    addEventListener('pointerup', () => studio.requestMotion(), { once: true });
  }
  net.setPresence({ fx: fx?.id ?? null });
  document.querySelectorAll('.fx-item').forEach(b => b.setAttribute('aria-selected', String(b.dataset.fx === (fx?.id ?? ''))));
  sfx('click');
  renderEffectHint(true);
}

function renderEffectHint(flash) {
  const fx = studio?.effect;
  const el = $('#effect-hint');
  let text = fx?.hint || '';
  if (fx?.needs?.face && studio.faceStatus === 'failed') text = `${fx.name}: face tracking isn't available in this browser`;
  else if (fx?.needs?.face && !studio.camOn) text = `${fx.name} needs your camera on`;
  // With the strip open the name and hint sit above it; otherwise the hint
  // floats above the controls for a few seconds.
  const trayOpen = !$('#tray-effects').hidden;
  $('#fx-name').textContent = fx?.name ?? 'No effect';
  if (votes) {
    if (!fxVotes) {
      fxVotes = voteButtons(votes, 'fx-none');
      $('#fx-votes').append(fxVotes);
    }
    fxVotes.hidden = !fx;
    if (fx) fxVotes.setItem(`fx-${fx.id}`);
  }
  $('#tray-hint').textContent = text || (fx ? '' : 'Swipe to try an effect');
  el.textContent = text;
  el.hidden = !text || trayOpen || flash === undefined || !!games?.current;
  clearTimeout(hintTimer);
  if (!el.hidden) hintTimer = setTimeout(() => { el.hidden = true; }, 5000);
}

function updateFaceStatus() {
  if (!studio) return;
  const s = studio.faceStatus;
  $('#face-status').textContent = !studio.hasCamera
    ? 'No camera: effects show on your initial'
    : { idle: '', loading: 'Loading face tracking…', ready: '', failed: 'Face tracking unavailable' }[s];
  document.querySelectorAll('.fx-item').forEach(b => {
    const fx = effects.find(e => e.id === b.dataset.fx);
    b.classList.toggle('disabled', !!fx?.needs?.face && (s === 'failed' || !studio.hasCamera) && fx.id !== 'bubble');
  });
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

async function initGames() {
  games = createGameHost({
    net,
    studio,
    mediaOf: id => tiles.get(id)?.media ?? null,
    // How much of a full-bleed game the floating bars cover, in pixels.
    insets: () => ({
      top: Math.ceil($('#topbar').getBoundingClientRect().bottom),
      bottom: Math.ceil(innerHeight - $('#controls').getBoundingClientRect().top),
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
    },
    onClose: c => {
      c.el.remove();
      $('#game-panel').hidden = true;
      $('#call').classList.remove('has-game');
      $('#game-head').hidden = true;
      updateSessions();
    },
  });
  games.register(await loadGames());
  $('#game-close').addEventListener('click', () => games.close());

  const list = $('#game-list');
  for (const g of games.games.values()) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'game-card';
    const ico = document.createElement('span');
    ico.className = 'ico';
    const iconUrl = assetUrl(`game-${g.id}`);
    if (iconUrl) {
      const im = document.createElement('img');
      im.src = iconUrl;
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
  join.addEventListener('click', () => {
    el.remove();
    const s = games.sessions().find(x => x.sid === d.sid);
    if (s) games.join(s);
    else toast('That game has ended');
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
      $('#chat-badge').hidden = false;
      $('#chat-badge').textContent = String(chatUnread);
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
  document.querySelectorAll('[data-open="settings"]').forEach(b => b.addEventListener('click', () => {
    name.value = settings.name;
    vol.value = settings.volume;
    motion.checked = !!settings.reduceMotion;
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
  get tiles() { return tiles; },
  me,
  selectEffect: id => selectEffect(effects.find(e => e.id === id) || null),
};
