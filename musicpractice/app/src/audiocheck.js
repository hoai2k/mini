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

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
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
    steps = isWebKit()
      ? el('ol', { class: 'ac-steps' },
          el('li', {}, 'In Safari, tap ', el('b', {}, 'aA'), ' (or the page menu) at the left of the address bar.'),
          el('li', {}, 'Tap ', el('b', {}, 'Website Settings'), '.'),
          el('li', {}, 'Set ', el('b', {}, 'Microphone'), ' to ', el('b', {}, 'Allow'), '.'),
          el('li', {}, 'Come back and tap ', el('b', {}, 'Reload'), ' below.'))
      : el('ol', { class: 'ac-steps' },
          el('li', {}, 'Tap the icon at the left of the address bar (site information).'),
          el('li', {}, 'Set ', el('b', {}, 'Microphone'), ' to ', el('b', {}, 'Allow'), ' (always, not just this time).'),
          el('li', {}, 'Tap ', el('b', {}, 'Reload'), ' below.'));
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

export function openAudioCheck(controls) {
  ctl = controls;
  const dialog = $('audio-check');
  render();
  if (!dialog.open) dialog.showModal();
}

navigator.mediaDevices?.addEventListener?.('devicechange', () => {
  if ($('audio-check')?.open) render();
});
