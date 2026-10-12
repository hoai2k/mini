// Audio check: what the browser reports about the mic, speakers and
// permission, how takes will play as a result, and the choices it allows
// (microphone, speaker, pendulum sync). Opened from any settings sheet.

import { listDevices, isBluetooth, micPermission, canChooseSpeaker, isWebKit, diag, allowedInAdvance, QUICK_GRANT_MS } from './devices.js';
import { freesMicForPlayback, promptWasSuspected } from './recorder.js';
import { reportedLatency, unlock } from './audio.js';
import { playSamples } from './player.js';

const $ = (id) => document.getElementById(id);
let ctl = null;

/** A short rising chime, played the way takes are, to hear where sound goes. */
function chime(sampleRate = 44100) {
  const notes = [523.25, 659.25, 783.99];
  const len = Math.round(sampleRate * 0.28);
  const out = new Float32Array(len * notes.length);
  notes.forEach((hz, n) => {
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      out[n * len + i] = 0.35 * Math.sin(2 * Math.PI * hz * t) * Math.min(1, t / 0.01) * Math.exp(-t * 6);
    }
  });
  return { samples: out, sampleRate };
}

const SVG_TAGS = new Set(['svg', 'path', 'circle', 'rect', 'g']);

function el(tag, attrs = {}, ...children) {
  const e = SVG_TAGS.has(tag) ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.setAttribute('class', v);
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) if (c != null && c !== false) e.append(c);
  return e;
}

const tag = (label) => (isBluetooth(label) ? `${label} (Bluetooth)` : label);

async function render() {
  const body = $('audio-check-body');
  const { inputs, outputs, labelled } = await listDevices();
  const permission = micPermission();
  const rec = ctl.recorder();
  const frees = freesMicForPlayback();
  const btNames = [...new Set([...inputs, ...outputs].map((d) => d.label).filter(isBluetooth).map((l) => l.replace(/^(Default|Communications) - /, '')))];
  const latency = reportedLatency();
  const latencyMs = latency == null ? null : Math.round(latency * 1000);

  // How takes will play, in plain words
  let summary;
  let steps = null;
  if (permission === 'denied') {
    summary = el('p', { class: 'ac-status bad' }, 'The microphone is blocked for this site, so the Playback Recorder can\'t listen. Allow it in your browser\'s site settings, then reload.');
  } else if (frees) {
    summary = el('p', { class: 'ac-status good' }, '✓ Takes can play on a Bluetooth speaker: the mic is freed while each take plays and taken back without asking.');
  } else {
    summary = el('p', { class: 'ac-status warn' },
      promptWasSuspected()
        ? 'Your browser asked for the microphone again, so the app keeps it for this visit. '
        : '',
      'Once the Playback Recorder has been opened, sound plays on the phone\'s own speaker rather than a Bluetooth speaker: the mic is kept open so your browser doesn\'t ask for permission after every take. ',
      'To play on Bluetooth, allow the microphone for this site permanently, then reload:');
    steps = allowSteps({ pictures: true });
  }

  // Microphone choice
  const micSelect = el('select', { class: 'select', id: 'ac-mic', disabled: !labelled || null },
    el('option', { value: 'auto' }, 'Automatic (built-in preferred)'),
    inputs.filter((d) => d.deviceId && d.deviceId !== 'default' && d.deviceId !== 'communications')
      .map((d) => el('option', { value: d.deviceId }, tag(d.label || 'Microphone'))));
  micSelect.value = [...micSelect.options].some((o) => o.value === ctl.settings.mic) ? ctl.settings.mic : 'auto';
  micSelect.addEventListener('change', async () => { await ctl.onMic(micSelect.value); render(); });
  const micHelp = el('p', { class: 'help' },
    !labelled ? 'Names appear once the microphone is allowed (open the Playback Recorder once).'
      : `In use: ${rec?.micLabel ? tag(rec.micLabel) : 'none yet'}. `,
    labelled && inputs.some((d) => isBluetooth(d.label))
      ? 'Recording through a Bluetooth mic switches that device to call-quality sound, so the built-in mic is used unless you choose otherwise.' : '');

  // Speaker choice, where the browser allows it
  const realOutputs = outputs.filter((d) => d.deviceId && d.deviceId !== 'default' && d.deviceId !== 'communications');
  let speaker;
  if (canChooseSpeaker() && realOutputs.length) {
    const sel = el('select', { class: 'select', id: 'ac-speaker' },
      el('option', { value: 'default' }, 'System default (recommended)'),
      realOutputs.map((d) => el('option', { value: d.deviceId }, tag(d.label || 'Speaker'))));
    sel.value = [...sel.options].some((o) => o.value === ctl.settings.speaker) ? ctl.settings.speaker : 'default';
    sel.addEventListener('change', async () => {
      const ok = await ctl.onSpeaker(sel.value);
      if (!ok) sel.value = 'default';
    });
    speaker = [el('label', { class: 'row toggle' }, el('span', {}, 'Speaker'), sel),
      el('p', { class: 'help' }, 'System default follows whatever your computer switches to, which is best most of the time.')];
  } else {
    speaker = [el('p', { class: 'help' }, el('b', {}, 'Speaker: '),
      'this browser doesn\'t let pages choose the speaker, so sound goes to the device\'s current output. Connect or pick the speaker in the system (on iPhone: Control Center).')];
  }

  // Pendulum sync
  const sync = el('input', { type: 'range', class: 'slider', id: 'ac-sync', min: -200, max: 500, step: 10, value: ctl.settings.syncMs });
  const syncOut = el('b', {}, `${ctl.settings.syncMs} ms`);
  sync.addEventListener('input', () => { ctl.onSync(Number(sync.value)); syncOut.textContent = `${sync.value} ms`; });

  // Test sound, played the way takes are
  const testBtn = el('button', { type: 'button', class: 'pill', id: 'ac-test' }, 'Play test sound');
  testBtn.addEventListener('click', async () => {
    unlock();
    const { samples, sampleRate } = chime();
    try { await playSamples(samples, sampleRate); } catch { testBtn.textContent = 'Couldn\'t play (tap again)'; }
  });

  const rows = [
    ['Browser engine', isWebKit() ? 'Safari / WebKit (all iPhone browsers)' : 'Not WebKit'],
    ['Mic permission (reported)', { granted: 'Allowed for this site', prompt: 'Asked each visit (not saved)', denied: 'Blocked', unknown: 'Not reported' }[permission] || permission],
    ['First mic request', diag.firstRequestMs == null ? 'Not made yet (open the Playback Recorder)'
      : `${diag.firstRequestMs} ms: ${allowedInAdvance() ? 'granted at once, so allowed in advance' : `slower than ${QUICK_GRANT_MS} ms, so the browser asked`}`],
    ['Mic during playback', frees ? 'Freed (Bluetooth can be used)' : 'Kept (avoids permission prompts)'],
    ['Mic now', rec?.holdsMic ? (rec.micOpen ? 'In use' : 'Held, switched off') : 'Not held'],
    ['Microphones', labelled ? inputs.map((d) => tag(d.label)).filter(Boolean).join(', ') || 'None' : `${inputs.length} (names hidden)`],
    ['Speakers', outputs.length ? (labelled ? outputs.map((d) => tag(d.label)).filter(Boolean).join(', ') : `${outputs.length} (names hidden)`) : 'Not shown by this browser'],
    ['Bluetooth seen', btNames.length ? btNames.join(', ') : 'None by name (a speaker without a mic can\'t be seen on iPhone)'],
    ['Output delay', latencyMs == null ? 'Start the metronome or recorder to measure' : `${latencyMs} ms${latencyMs > 100 ? ' (likely Bluetooth)' : ''}`],
    ['Safari audio mode', navigator.audioSession ? `${navigator.audioSession.type}${navigator.audioSession.state ? ` (${navigator.audioSession.state})` : ''}` : 'Not available'],
    ['Last take played', lastPlaybackText()],
  ];

  body.replaceChildren(...[
    summary,
    steps,
    steps ? el('button', { type: 'button', class: 'pill', onclick: () => location.reload() }, 'Reload') : null,
    el('div', { class: 'ac-test' }, testBtn, el('span', { class: 'help' }, 'Plays the way takes do, so you can hear where sound goes.')),
    el('label', { class: 'row toggle' }, el('span', {}, 'Microphone'), micSelect),
    micHelp,
    ...speaker,
    el('label', { class: 'row' }, el('span', {}, 'Pendulum sync ', syncOut), sync),
    el('p', { class: 'help' }, 'Bluetooth speakers play late. If the pendulum looks early compared with the click, move this right.',
      latencyMs != null ? ` The browser reports ${latencyMs} ms, which is already allowed for.` : ''),
    el('details', { class: 'ac-details' }, el('summary', {}, 'What the browser reports'),
      el('dl', {}, rows.map(([k, v]) => [el('dt', {}, k), el('dd', {}, v)]))),
  ].filter(Boolean));
}

function lastPlaybackText() {
  const p = diag.lastPlayback;
  if (!p) return 'None yet';
  const ago = Math.round((Date.now() - p.at) / 1000);
  return [
    `${ago} s ago`,
    p.micFreed ? `mic freed, waited ${p.waitedMs} ms` : (p.micHeld ? 'mic held (call mode)' : 'no mic open'),
    `Safari mode ${p.session ?? 'n/a'}${p.sessionState ? ` (${p.sessionState})` : ''}`,
    `via ${p.via}`,
  ].join('; ');
}

/*
 * Small drawings of the iPhone controls each step names, in iOS's own style,
 * so it's clear what to tap. They are drawn rather than screenshots: Safari's
 * layout shifts between iOS versions (aA became a page icon in iOS 26), and
 * these stay true across them.
 */
const ios = {
  // The page menu button at the left of the address bar: aA, or a page icon.
  pageMenu: () => el('span', { class: 'ios-bar', 'aria-hidden': 'true' },
    el('span', { class: 'ios-btn' }, el('span', { class: 'ios-aa' }, el('small', {}, 'a'), 'A')),
    el('span', { class: 'ios-or' }, 'or'),
    el('span', { class: 'ios-btn' }, el('svg', { viewBox: '0 0 20 20' }, el('path', { d: 'M5 3h7l3 3v11H5z M12 3v3h3 M7.5 10h5 M7.5 13h5' }))),
    el('span', { class: 'ios-url' }, location.host || 'this site')),
  more: () => el('span', { class: 'ios-row ios-row-solo', 'aria-hidden': 'true' },
    el('span', { class: 'ios-dots' }, '•••'), el('span', {}, 'More')),
  websiteSettings: () => el('span', { class: 'ios-row', 'aria-hidden': 'true' },
    el('span', { class: 'ios-gear' }, el('svg', { viewBox: '0 0 20 20' }, el('circle', { cx: 10, cy: 10, r: 3 }), el('path', { d: 'M10 2v3M10 15v3M2 10h3M15 10h3M4.3 4.3l2.1 2.1M13.6 13.6l2.1 2.1M4.3 15.7l2.1-2.1M13.6 6.4l2.1-2.1' }))),
    el('span', {}, 'Website Settings'), el('span', { class: 'ios-chev' }, '›')),
  microphone: () => el('span', { class: 'ios-card', 'aria-hidden': 'true' },
    el('span', { class: 'ios-row' }, el('span', {}, 'Microphone'), el('span', { class: 'ios-value' }, 'Allow'), el('span', { class: 'ios-chev' }, '›')),
    el('span', { class: 'ios-options' },
      el('span', {}, 'Ask'), el('span', {}, 'Deny'), el('span', { class: 'on' }, 'Allow ✓'))),
};

/** How to set this site's microphone to Allow, for this browser. */
export function allowSteps({ pictures = false } = {}) {
  const pic = (f) => (pictures ? f() : null);
  if (isWebKit()) {
    const standalone = globalThis.navigator?.standalone || matchMedia('(display-mode: standalone)').matches;
    if (standalone) {
      return el('ol', { class: 'ac-steps' },
        el('li', {}, 'Open the ', el('b', {}, 'Settings'), ' app, then ', el('b', {}, 'Apps → Safari → Microphone'), '.'),
        el('li', {}, 'Choose ', el('b', {}, 'Allow'), '.', pic(ios.microphone)),
        el('li', {}, 'Come back and tap ', el('b', {}, 'Reload'), '.'));
    }
    return el('ol', { class: 'ac-steps' },
      el('li', {}, 'Tap the ', el('b', {}, 'page menu'), ' button at the left of the address bar (', el('b', {}, 'aA'), ' or a page icon).', pic(ios.pageMenu)),
      el('li', {}, 'If you see ', el('b', {}, 'More'), ', tap it.', pic(ios.more)),
      el('li', {}, 'Tap ', el('b', {}, 'Website Settings'), '.', pic(ios.websiteSettings)),
      el('li', {}, 'Set ', el('b', {}, 'Microphone'), ' to ', el('b', {}, 'Allow'), '.', pic(ios.microphone)),
      el('li', {}, 'Come back and tap ', el('b', {}, 'Reload'), '.'),
      pictures ? el('li', { class: 'ac-alt' }, 'Or, for every site: ', el('b', {}, 'Settings'), ' app → ', el('b', {}, 'Apps → Safari → Microphone'), ' → ', el('b', {}, 'Allow'), '.') : null);
  }
  return el('ol', { class: 'ac-steps' },
    el('li', {}, 'Tap the icon at the left of the address bar (site information).'),
    el('li', {}, 'Set ', el('b', {}, 'Microphone'), ' to ', el('b', {}, 'Allow'), ' (always, not just this time).'),
    el('li', {}, 'Tap ', el('b', {}, 'Reload'), '.'));
}

/**
 * On iPhone, opening the Playback Recorder with the mic not set to Allow:
 * a card at the top of the screen says so and shows how to fix it. Its title
 * folds it away (remembered); it goes for good once the mic is allowed. It
 * doesn't block recording.
 */
export function renderMicTip(container, { collapsed, onToggle }) {
  const body = el('div', { class: 'mic-tip-body', id: 'mic-tip-body' },
    el('p', {}, 'The microphone isn\'t set to Allow for this site yet, so Bluetooth playback won\'t work. To fix it:'),
    allowSteps({ pictures: true }),
    el('div', { class: 'mic-tip-actions' },
      el('button', { type: 'button', class: 'pill', onclick: () => location.reload() }, 'Reload')));
  const head = el('button', { type: 'button', class: 'mic-tip-title', 'aria-expanded': String(!collapsed), 'aria-controls': 'mic-tip-body' },
    el('span', {}, 'Allow the microphone for Bluetooth playback'),
    el('svg', { class: 'mic-tip-chev', viewBox: '0 0 24 24', 'aria-hidden': 'true' }, el('path', { d: 'M6 9l6 6 6-6' })));
  const set = (c) => {
    head.setAttribute('aria-expanded', String(!c));
    body.hidden = c;
    container.classList.toggle('collapsed', c);
  };
  head.addEventListener('click', () => {
    const c = head.getAttribute('aria-expanded') === 'true';
    set(c);
    onToggle(c);
  });
  container.replaceChildren(head, body);
  set(collapsed);
}

export function openAudioCheck(controls) {
  ctl = controls;
  const dialog = $('audio-check');
  render();
  if (!dialog.open) dialog.showModal();
}

navigator.mediaDevices?.addEventListener?.('devicechange', () => {
  if ($('audio-check')?.open) render();
});
