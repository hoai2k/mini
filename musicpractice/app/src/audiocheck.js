// Audio check: what the browser reports about the mic, speakers and
// permission, how takes will play as a result, and the choices it allows
// (microphone, speaker). Opened from any settings sheet.

import { listDevices, isBluetooth, micPermission, canChooseSpeaker, isWebKit, diag, allowedInAdvance, QUICK_GRANT_MS } from './devices.js';
import { freesMicForPlayback, promptWasSuspected } from './recorder.js';
import { reportedLatency, unlock } from './audio.js';
import { playSamples } from './player.js';
import { TEXT, rich } from './text.js';

const A = TEXT.audioCheck;
const R = A.report;

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

const tag = (label) => (isBluetooth(label) ? A.bluetoothName(label) : label);

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
    summary = el('p', { class: 'ac-status bad' }, A.blocked);
  } else if (!frees) {
    summary = el('p', { class: 'ac-status warn' },
      promptWasSuspected() ? A.askedAgain : '',
      A.keptOpen,
      A.toUseBluetooth);
    steps = allowSteps({ pictures: true });
  }

  // Microphone choice
  const micSelect = el('select', { class: 'select', id: 'ac-mic', disabled: !labelled || null },
    el('option', { value: 'auto' }, A.micAuto),
    inputs.filter((d) => d.deviceId && d.deviceId !== 'default' && d.deviceId !== 'communications')
      .map((d) => el('option', { value: d.deviceId }, tag(d.label || A.micDefaultName))));
  micSelect.value = [...micSelect.options].some((o) => o.value === ctl.settings.mic) ? ctl.settings.mic : 'auto';
  micSelect.addEventListener('change', async () => { await ctl.onMic(micSelect.value); render(); });

  // Speaker choice, where the browser allows it
  const realOutputs = outputs.filter((d) => d.deviceId && d.deviceId !== 'default' && d.deviceId !== 'communications');
  let speaker = null;
  if (canChooseSpeaker() && realOutputs.length) {
    const sel = el('select', { class: 'select', id: 'ac-speaker' },
      el('option', { value: 'default' }, A.speakerDefault),
      realOutputs.map((d) => el('option', { value: d.deviceId }, tag(d.label || A.speakerDefaultName))));
    sel.value = [...sel.options].some((o) => o.value === ctl.settings.speaker) ? ctl.settings.speaker : 'default';
    sel.addEventListener('change', async () => {
      const ok = await ctl.onSpeaker(sel.value);
      if (!ok) sel.value = 'default';
    });
    speaker = el('label', { class: 'row' }, el('span', {}, A.speaker), sel);
  }

  // Test sound, played the way takes are
  const testBtn = el('button', { type: 'button', class: 'pill', id: 'ac-test' }, A.testSound);
  testBtn.addEventListener('click', async () => {
    unlock();
    const { samples, sampleRate } = chime();
    try { await playSamples(samples, sampleRate); } catch { testBtn.textContent = A.testFailed; }
  });

  const rows = [
    [R.engine, isWebKit() ? R.engineWebKit : R.engineOther],
    [R.permission, R.permissions[permission] || permission],
    [R.firstRequest, diag.firstRequestMs == null ? R.firstRequestNone
      : allowedInAdvance() ? R.firstRequestQuick(diag.firstRequestMs) : R.firstRequestSlow(diag.firstRequestMs, QUICK_GRANT_MS)],
    [R.duringPlayback, frees ? R.freed : R.kept],
    [R.micNow, rec?.holdsMic ? (rec.micOpen ? R.inUse : R.heldOff) : R.notHeld],
    [R.microphones, labelled ? inputs.map((d) => tag(d.label)).filter(Boolean).join(', ') || R.none : R.hiddenCount(inputs.length)],
    [R.speakers, outputs.length ? (labelled ? outputs.map((d) => tag(d.label)).filter(Boolean).join(', ') : R.hiddenCount(outputs.length)) : R.speakersNotShown],
    [R.bluetooth, btNames.length ? btNames.join(', ') : R.bluetoothNone],
    [R.delay, latencyMs == null ? R.delayUnknown : R.delayMs(latencyMs)],
    [R.safariMode, navigator.audioSession ? `${navigator.audioSession.type}${navigator.audioSession.state ? ` (${navigator.audioSession.state})` : ''}` : R.notAvailable],
    [R.lastTake, lastPlaybackText()],
  ];

  // The metronome: how much later the visuals show each beat, and the sync
  // bar that sets it by eye and ear or from taps.
  const m = ctl.metronome;
  let metronome = null;
  if (m) {
    const out = el('b', {}, TEXT.common.ms(m.syncMs()));
    const slider = el('input', { type: 'range', class: 'slider', id: 'ac-sync', min: -200, max: 500, step: 10, value: m.syncMs(), disabled: !m.usable || null });
    slider.addEventListener('input', () => { m.setSync(Number(slider.value)); out.textContent = TEXT.common.ms(m.syncMs()); });
    const open = el('button', { type: 'button', class: 'pill', id: 'ac-sync-open', disabled: !m.usable || null, onclick: () => m.openSync() }, TEXT.metronome.settings.openSync);
    metronome = el('details', { class: 'ac-section', id: 'ac-metronome', open: metOpen ?? m.open },
      el('summary', {}, A.metronome),
      el('div', { class: `ac-section-body${m.usable ? '' : ' disabled'}` },
        el('label', { class: 'row' }, el('span', {}, `${TEXT.metronome.settings.sync} `, out), slider),
        open));
    metronome.addEventListener('toggle', () => { metOpen = metronome.open; });
  }

  body.replaceChildren(...[
    summary,
    steps,
    steps ? el('button', { type: 'button', class: 'pill', onclick: () => location.reload() }, TEXT.common.reload) : null,
    el('div', { class: 'ac-test' }, testBtn),
    el('label', { class: 'row' }, el('span', {}, A.microphone), micSelect),
    speaker,
    metronome,
    el('details', { class: 'ac-details' }, el('summary', {}, A.reportTitle),
      el('dl', {}, rows.map(([k, v]) => [el('dt', {}, k), el('dd', {}, v)]))),
  ].filter(Boolean));
}

function lastPlaybackText() {
  const p = diag.lastPlayback;
  if (!p) return R.lastTakeNone;
  const ago = Math.round((Date.now() - p.at) / 1000);
  return [
    R.lastTakeAgo(ago),
    p.micFreed ? R.lastTakeFreed(p.waitedMs) : (p.micHeld ? R.lastTakeHeld : R.lastTakeNoMic),
    R.lastTakeSafari(`${p.session ?? 'n/a'}${p.sessionState ? ` (${p.sessionState})` : ''}`),
    R.lastTakeEngine(p.engine ?? 'n/a'),
    R.lastTakeVia(p.via),
  ].join('; ');
}

/*
 * Pictures for the steps: a phone screen with the place to tap circled in
 * red. They show *where* things are rather than exactly what the buttons
 * look like, since Safari restyles its buttons between iOS versions (aA
 * became a page icon in iOS 26) while their places stay put. Labels that
 * don't change (Website Settings, Microphone, Allow) are written in.
 */
const RED = '#ff3b30';
const host = () => (location.host || A.pictures.thisSite).replace(/^www\./, '');
const PT = A.pictures;
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function figure(svg, caption = '') {
  const f = el('figure', { class: 'ios-fig' });
  f.innerHTML = svg;
  if (caption) f.append(el('figcaption', {}, caption));
  return f;
}

// The lower part of a phone showing a web page and Safari's address bar.
function phone(inner, { menu = '' } = {}) {
  return `<svg viewBox="0 0 240 170" role="img" aria-hidden="true" class="ios-svg">
    <rect x="6" y="2" width="228" height="200" rx="26" fill="#fff" stroke="#c7c7cc" stroke-width="2"/>
    <g fill="#e5e5ea"><rect x="24" y="18" width="150" height="9" rx="4"/><rect x="24" y="34" width="190" height="7" rx="3.5"/><rect x="24" y="47" width="176" height="7" rx="3.5"/><rect x="24" y="60" width="184" height="7" rx="3.5"/><rect x="24" y="73" width="120" height="7" rx="3.5"/></g>
    ${menu}
    <rect x="18" y="124" width="204" height="34" rx="17" fill="#f2f2f7" stroke="#d1d1d6"/>
    <circle cx="38" cy="141" r="11" fill="#e5e5ea"/>
    <g stroke="#007aff" stroke-width="1.6" stroke-linecap="round"><path d="M33 138h10M33 142h10M33 146h6"/></g>
    <text x="120" y="145.5" text-anchor="middle" font-size="12" fill="#3c3c43" font-family="-apple-system,system-ui,sans-serif">${esc(host())}</text>
    <g fill="#007aff"><circle cx="196" cy="141" r="1.7"/><circle cx="202" cy="141" r="1.7"/><circle cx="208" cy="141" r="1.7"/></g>
    ${inner}
  </svg>`;
}

const PICS = {
  // 1. The button at the left end of the address bar
  pageMenu: () => figure(phone(`
    <circle cx="38" cy="141" r="17" fill="none" stroke="${RED}" stroke-width="3"/>
    <path d="M62 112 L50 128" stroke="${RED}" stroke-width="2.5" stroke-linecap="round"/>
    <text x="64" y="110" font-size="12" font-weight="700" fill="${RED}" font-family="-apple-system,system-ui,sans-serif">${esc(PT.tapHere)}</text>`),
    PT.addressBar),
  // 2. Website Settings in the menu that opens (More first, if shown)
  menu: () => figure(phone(`
    <rect x="21" y="84" width="150" height="26" rx="8" fill="none" stroke="${RED}" stroke-width="3"/>`, { menu: `
    <rect x="16" y="6" width="160" height="112" rx="14" fill="#fff" stroke="#d1d1d6"/>
    <g fill="#e5e5ea"><rect x="28" y="16" width="96" height="8" rx="4"/><rect x="28" y="34" width="110" height="8" rx="4"/><rect x="28" y="52" width="84" height="8" rx="4"/></g>
    <g font-family="-apple-system,system-ui,sans-serif" font-size="11.5" fill="#000">
      <text x="44" y="78" fill="#3c3c43">${esc(PT.more)}</text><g fill="#007aff"><circle cx="31" cy="74" r="1.5"/><circle cx="35" cy="74" r="1.5"/><circle cx="39" cy="74" r="1.5"/></g>
      <rect x="27" y="90" width="12" height="12" rx="3" fill="#8e8e93"/><text x="44" y="100">${esc(PT.websiteSettings)}</text>
    </g>` })),
  // 3. Microphone, set to Allow
  settings: (title = PT.websiteSettings) => figure(`<svg viewBox="0 0 240 170" role="img" aria-hidden="true" class="ios-svg">
    <rect x="6" y="2" width="228" height="200" rx="26" fill="#f2f2f7" stroke="#c7c7cc" stroke-width="2"/>
    <g font-family="-apple-system,system-ui,sans-serif" font-size="12">
      <text x="120" y="24" text-anchor="middle" font-weight="600" fill="#000">${esc(title)}</text>
      <rect x="18" y="34" width="204" height="90" rx="10" fill="#fff"/>
      <text x="30" y="54" fill="#000">${esc(PT.camera)}</text><text x="196" y="54" text-anchor="end" fill="#8e8e93">${esc(PT.ask)}</text><text x="206" y="54" fill="#c7c7cc">›</text>
      <path d="M30 64H222" stroke="#e5e5ea"/>
      <text x="30" y="84" fill="#000">${esc(PT.microphone)}</text><text x="196" y="84" text-anchor="end" fill="#8e8e93">${esc(PT.ask)}</text><text x="206" y="84" fill="#c7c7cc">›</text>
      <path d="M30 94H222" stroke="#e5e5ea"/>
      <text x="30" y="114" fill="#000">${esc(PT.location)}</text><text x="196" y="114" text-anchor="end" fill="#8e8e93">${esc(PT.ask)}</text><text x="206" y="114" fill="#c7c7cc">›</text>
      <rect x="20" y="68" width="200" height="24" rx="7" fill="none" stroke="${RED}" stroke-width="3"/>
      <rect x="40" y="132" width="160" height="28" rx="9" fill="#e5e5ea"/>
      <rect x="146" y="134" width="52" height="24" rx="7" fill="#fff"/>
      <text x="66" y="150" text-anchor="middle" fill="#3c3c43">${esc(PT.ask)}</text><text x="120" y="150" text-anchor="middle" fill="#3c3c43">${esc(PT.deny)}</text>
      <text x="172" y="150" text-anchor="middle" fill="#007aff" font-weight="600">${esc(PT.allow)}</text>
      <rect x="143" y="131" width="58" height="30" rx="9" fill="none" stroke="${RED}" stroke-width="3"/>
    </g>
  </svg>`),
};

/** How to set this site's microphone to Allow, for this browser. */
export function allowSteps({ pictures = false } = {}) {
  const pic = (f) => (pictures ? f() : null);
  const S = A.steps;
  const step = (line, ...extra) => el('li', {}, rich(line), ...extra);
  if (isWebKit()) {
    const standalone = globalThis.navigator?.standalone || matchMedia('(display-mode: standalone)').matches;
    if (standalone) {
      return el('ol', { class: 'ac-steps' },
        step(S.appOpenSettings),
        step(S.appChooseAllow, pic(() => PICS.settings(PT.microphoneTitle))),
        step(S.comeBackReload));
    }
    return el('ol', { class: 'ac-steps' },
      step(S.safariPageMenu, pic(PICS.pageMenu)),
      step(S.safariWebsiteSettings, pic(PICS.menu)),
      step(S.setMicAllow, pic(() => PICS.settings())),
      step(S.comeBackReload),
      pictures ? el('li', { class: 'ac-alt' }, rich(S.everySite)) : null);
  }
  return el('ol', { class: 'ac-steps' },
    step(S.otherSiteInfo),
    step(S.otherSetMicAllow),
    step(S.otherReload));
}

/**
 * On iPhone, opening the Playback Recorder with the mic not set to Allow:
 * a card at the top of the screen says so and shows how to fix it. Its title
 * folds it away (remembered); it goes for good once the mic is allowed. It
 * doesn't block recording.
 */
export function renderMicTip(container, { collapsed, onToggle }) {
  const body = el('div', { class: 'mic-tip-body', id: 'mic-tip-body' },
    el('p', {}, A.micTip.body),
    allowSteps({ pictures: true }),
    el('div', { class: 'mic-tip-actions' },
      el('button', { type: 'button', class: 'pill', onclick: () => location.reload() }, TEXT.common.reload)));
  const head = el('button', { type: 'button', class: 'mic-tip-title', 'aria-expanded': String(!collapsed), 'aria-controls': 'mic-tip-body' },
    el('span', {}, A.micTip.title),
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

let metOpen = null; // the Metronome section, as it was left while Audio check stays open

export function openAudioCheck(controls) {
  ctl = controls;
  metOpen = null;
  const dialog = $('audio-check');
  render();
  if (!dialog.open) dialog.showModal();
}

navigator.mediaDevices?.addEventListener?.('devicechange', () => {
  if ($('audio-check')?.open) render();
});
