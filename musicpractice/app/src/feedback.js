// Send feedback: a short form in Settings whose message lands as a row in a
// private Google Sheet, with an email to say it arrived.
//
// THE SAME INBOX AS THE CAMBRIAN GAMES. The back end is the shared feedback
// Apps Script (hoai2k.github.io, tools/feedback/Code.gs; set up as described
// in the cambrian repository's docs/FEEDBACK.md). Nothing there lists the
// games: `game` is a plain string that lands in its own column, so Music
// Practice sends 'musicpractice' and needs no change on that side. This is a
// port of cambrian's src/shared/feedback.ts for a no-build site, with the same
// payload and the same defences: a honeypot field, a compose floor, and the
// script's own caps and formula-defusing.
//
// The script takes { game, email, message, elapsed, hp, who, version, client }
// and nothing more, so the topic and the device details (the Audio check's
// readings, which make an audio bug fixable) travel inside the message, below
// what the person wrote. They then also reach the notification email.
//
// NOTHING HERE IS A SECRET. The endpoint ships in every bundle that uses it
// (cambrian's too); what stops abuse is on the far side. Empty it and the
// Send feedback button disappears.

import { isApp, platform, call } from './native.js';
import { TEXT } from './text-config.js';
import { $ } from './ui.js';

export const ENDPOINT = 'https://script.google.com/macros/s/AKfycbyu8lINxYMmtqFhFarxqqIwHbGupWWoWjmeN_OW-kNSPW6Hgh6-KdkQuZAaWOcamTFF/exec';
export const GAME = 'musicpractice';
export const feedbackEnabled = () => ENDPOINT !== '';

/** The floor the script enforces (3 s); Send waits until then, so a person never meets it. */
export const MIN_COMPOSE_MS = 3000;
/** The script cuts messages at 4000 characters. */
export const MAX_MESSAGE = 4000;

/** What the browser says about itself (self-reported, as in cambrian's clientInfo). */
export function clientInfo() {
  const safe = (f, fallback = '') => { try { return f(); } catch { return fallback; } };
  return {
    tz: safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone),
    lang: safe(() => navigator.language),
    screen: safe(() => `${screen.width}x${screen.height}`),
    ua: safe(() => navigator.userAgent).slice(0, 300),
    ref: safe(() => document.referrer).slice(0, 300),
  };
}

/** A friend's name, if they came through the invite gate of another game on this site (gate.pass). */
function who() {
  try {
    const raw = localStorage.getItem('gate.pass');
    return raw ? String(JSON.parse(raw)?.name ?? '') : '';
  } catch { return ''; }
}

/** Where this came from: 'web', or the app and its version ('ios 1.0 (3)'). */
export async function version() {
  if (!isApp()) return 'web';
  try {
    const info = await call('App', 'getInfo');
    return `${platform()} ${info.version} (${info.build})`;
  } catch {
    return platform();
  }
}

/**
 * The message as sent: the topic, what they wrote, then the details (if any),
 * kept within the script's cap by shortening what they wrote last.
 */
export function compose({ topic, message, details, debug }) {
  const head = topic ? `[${topic}] ` : '';
  const tail = (details ? `\n\n— Details —\n${details}` : '') + (debug ? `\n\n— Debug —\n${debug}` : '');
  const room = Math.max(200, MAX_MESSAGE - head.length - tail.length);
  return (head + message.trim().slice(0, room) + tail).slice(0, MAX_MESSAGE);
}

/**
 * Send it. Resolves true when the script said ok. Posted as text/plain on
 * purpose: a JSON content-type makes the browser send a CORS preflight, which
 * an Apps Script web app can't answer. The body is JSON regardless.
 */
export async function sendFeedback({ email, topic, message, details, debug, elapsed, hp }) {
  if (!ENDPOINT) return false;
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        kind: 'feedback',
        game: GAME,
        email: email.trim() || NO_EMAIL,
        message: compose({ topic, message, details, debug }),
        elapsed,
        hp,
        turnstile: '',
        who: who(),
        version: await version(),
        client: clientInfo(),
      }),
    });
    return (await res.json())?.ok === true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- the dialog

const EMAIL_KEY = 'musicpractice.feedbackEmail';
/** An email is optional. The shared script still asks for an address, so a
 * message without one carries this: a reserved domain that can never be an
 * address (RFC 2606), so it reads as "no email" in the sheet. */
export const NO_EMAIL = 'no-email@feedback.invalid';
// What's sent stays these English words (the inbox reads them); what's shown comes from TEXT.
const TOPICS = ['Problem', 'Idea', 'Other'];

/**
 * Wire up the Send feedback dialog (index.html #feedback). `details()` returns
 * the device details as text; the person can see them before sending, and
 * leave them out. `debug(max)` returns the debug log's state and its most
 * recent events within `max` characters (debuglog.js), sent only if they tick
 * Include debugging data, which starts unticked every time.
 */
export function setupFeedback({ details, debug }) {
  const dialog = $('feedback');
  const openers = [...document.querySelectorAll('.open-feedback')];
  if (!feedbackEnabled() || !dialog) {
    for (const b of openers) b.hidden = true;
    return;
  }
  const email = $('fb-email');
  const text = $('fb-message');
  const include = $('fb-details-on');
  const includeDebug = $('fb-debug-on');
  const send = $('fb-send');
  const status = $('fb-status');
  let topic = 'Problem';
  let opened = 0;
  let timer = 0;
  let sending = false;

  const chips = $('fb-topic');
  chips.setAttribute('role', 'radiogroup');
  const buttons = TOPICS.map((t) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.setAttribute('role', 'radio');
    b.textContent = TEXT.feedback.topics[t];
    b.addEventListener('click', () => { topic = t; syncChips(); });
    chips.append(b);
    return b;
  });
  const syncChips = () => buttons.forEach((b, i) => b.setAttribute('aria-checked', String(TOPICS[i] === topic)));
  syncChips();

  // The message is required; an email is optional, but one that is there must look like one.
  const valid = () => {
    const e = email.value.trim();
    return (e === '' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) && text.value.trim().length > 0;
  };
  const update = () => {
    const early = performance.now() - opened < MIN_COMPOSE_MS;
    send.disabled = sending || early || !valid();
  };
  // Enter in the email field moves on to the message (it would otherwise submit the form, which closes it).
  email.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); text.focus(); } });
  email.addEventListener('input', update);
  text.addEventListener('input', update);

  function open(preset) {
    try { email.value ||= localStorage.getItem(EMAIL_KEY) || ''; } catch { /* not kept */ }
    if (preset) { topic = preset; syncChips(); }
    $('fb-details').textContent = details();
    includeDebug.checked = false;
    status.textContent = '';
    status.classList.remove('error');
    $('fb-hp').value = '';
    opened = performance.now();
    clearTimeout(timer);
    timer = setTimeout(update, MIN_COMPOSE_MS + 50);
    update();
    dialog.showModal();
    (email.value ? text : email).focus();
  }

  for (const b of openers) {
    b.addEventListener('click', () => {
      b.closest('dialog')?.close();
      open(b.dataset.topic);
    });
  }
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  send.addEventListener('click', async () => {
    if (send.disabled) return;
    sending = true;
    update();
    status.classList.remove('error');
    status.textContent = TEXT.feedback.sending;
    const shown = include.checked ? details() : '';
    // The debug log takes whatever room the message and details leave.
    const room = MAX_MESSAGE - (topic.length + 3) - text.value.trim().length - (shown ? shown.length + 16 : 0) - 16;
    const ok = await sendFeedback({
      email: email.value,
      topic,
      message: text.value,
      details: shown,
      debug: includeDebug.checked && room > 300 ? debug(room) : '',
      elapsed: Math.round(performance.now() - opened),
      hp: $('fb-hp').value,
    });
    sending = false;
    if (ok) {
      try { localStorage.setItem(EMAIL_KEY, email.value.trim()); } catch { /* not kept */ }
      text.value = '';
      status.textContent = TEXT.feedback.sent;
      setTimeout(() => { if (dialog.open && !text.value) dialog.close(); }, 1600);
    } else {
      // What they wrote stays, so trying again costs a tap.
      status.textContent = TEXT.feedback.failed;
      status.classList.add('error');
    }
    update();
  });

  return { open };
}
