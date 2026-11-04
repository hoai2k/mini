// The overlay every prototype shows: title, one line on what it is, the
// controls as Xbox button chips, a scale note, and a link back to the list.
// The View button (Tab) hides and shows it.
//
// Inside the Micro Zoom shell (embed mode, see embed.js) the panel is hidden
// and the shell draws the controls card instead: mountHud posts the rows as
// `hud {title, sub, controls, note}` and View posts `view` (the shell toggles
// its card). The shell can still show this panel with `controls {show}`.
import { embed } from './embed.js';
import { t, setGlyphRenderer } from './text.js';

//
// Which glyphs the controls list shows: controller buttons whenever any
// controller is connected (the moment one connects, live), keyboard keys only
// while no controller is connected at all. The other set is in each chip's
// hover title. A list re-rendered by the page (the amoeba swaps its rows)
// follows too, as long as each chip has class "k" and the button as its text
// or in data-btn.

const CHIP = { A: 'a', B: 'b', X: 'x', Y: 'y' };
const KEYS = { 'LT/RT': 'Z / X', 'LB/RB': 'Q / F', A: 'Space', B: 'Shift', X: 'E', Y: 'R', LB: 'Q', RB: 'F', LT: 'Z', RT: 'X', LS: 'WASD', RS: 'Arrows', View: 'Tab', Menu: 'Esc', 'D-pad': '1–4',
  'LS click': 'C', 'RS click': 'V', 'D-pad ←→': '3 / 4', 'D-pad ↑↓': '1 / 2', 'D-pad ↑': '1', 'D-pad ↓': '2', 'D-pad ←': '3', 'D-pad →': '4' };

/** The keyboard key(s) for a button as printed in the controls list ('A', 'LS click', 'A + B'...). */
export function keyFor(b) {
  if (KEYS[b]) return KEYS[b];
  const parts = b.split(/\s*([/+])\s*/);
  if (parts.length > 1 && parts.every((p, i) => (i % 2 ? true : KEYS[p]))) return parts.map((p, i) => (i % 2 ? ` ${p} ` : KEYS[p])).join('');
  const head = b.split(' ')[0];
  return KEYS[head] ? KEYS[head] + b.slice(head.length) : '';
}

/** True while any controller is connected. */
export function controllerConnected() {
  try { for (const g of (navigator.getGamepads ? navigator.getGamepads() : []) || []) if (g && g.connected) return true; } catch { /* blocked */ }
  return false;
}

// The glyph set in use: '' until mountHud decides, then 'controller' or 'keyboard', live.
let hudMode = '';
const liveMode = () => hudMode || (controllerConnected() ? 'controller' : 'keyboard');

/**
 * Markup for a button named inside a line of text ({btn:A} in text_config.js):
 * the Xbox chip, or the keyboard key while no controller is connected. Each
 * carries data-btn, so a later device change repaints it (refreshInlineGlyphs).
 */
export function glyphHTML(b, mode = liveMode()) {
  const kb = keyFor(b);
  const useKb = mode === 'keyboard' && kb;
  const cls = useKb ? ' kb' : CHIP[b] ? ` ${CHIP[b]}` : '';
  const tip = useKb ? t('shared.hud.chipController', { button: b }) : (kb ? t('shared.hud.chipKeyboard', { key: kb }) : '');
  return `<span class="btn-g${cls}" data-btn="${b}"${tip ? ` title="${tip}"` : ''}>${useKb ? kb : b}</span>`;
}

/** Repaint every inline glyph under root for the device in use. */
export function refreshInlineGlyphs(root = document, mode = liveMode()) {
  if (!root || !root.querySelectorAll) return;
  for (const el of root.querySelectorAll('.btn-g[data-btn]')) {
    const tmp = document.createElement('span');
    tmp.innerHTML = glyphHTML(el.dataset.btn, mode);
    const n = tmp.firstChild;
    if (el.className !== n.className) el.className = n.className;
    if (el.textContent !== n.textContent) el.textContent = n.textContent;
    el.title = n.title;
  }
}

/**
 * Show a line of our own text (from text_config.js, so it may hold markup and
 * {btn:X} glyphs) in an element, writing only when it changes: a HUD line set
 * every frame keeps its glyphs instead of rebuilding them.
 */
export function setHTML(el, html) {
  const h = html == null ? '' : String(html);
  if (el._microHTML === h) return;
  el._microHTML = h;
  el.innerHTML = h;
}

const GLYPH_SPAN = /<span class="btn-g[^"]*" data-btn="[^"]*"(?: title="[^"]*")?>[^<]*<\/span>/g;
const escapeText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Plain text, except the {btn:X} glyph chips in it, as safe markup. */
export function textWithGlyphs(text) {
  const s = String(text);
  let out = '', i = 0;
  for (const m of s.matchAll(GLYPH_SPAN)) { out += escapeText(s.slice(i, m.index)) + m[0]; i = m.index + m[0].length; }
  return out + escapeText(s.slice(i));
}

// Every page that loads the HUD draws {btn:X} as these chips, so its toasts,
// banners, prompts, cards and Features text show the button's icon.
setGlyphRenderer((b) => glyphHTML(b));

let kbStyle = false;
function addKeyStyle() {
  if (kbStyle) return;
  kbStyle = true;
  const css = document.createElement('style');
  css.textContent = `.hud .k.kb { border-radius: 5px; font-weight: 650; letter-spacing: .01em; }
    .hud .players { display: inline-flex; gap: 6px; align-items: center; }
    .hud .players i { font-style: normal; display: inline-flex; align-items: center; gap: 3px; }
    .hud .players i::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--pc); box-shadow: 0 0 0 1px rgba(0,0,0,.35); }
    .hud .players i.waiting { opacity: .45; }`;
  document.head.appendChild(css);
}

/** Show controller glyphs (mode 'controller') or keyboard keys ('keyboard') on every chip under root. */
function applyGlyphs(root, mode) {
  for (const k of root.querySelectorAll('.k')) {
    if (!k.dataset.btn) { k.dataset.btn = k.textContent; k.dataset.chip = CHIP[k.textContent] || ''; }
    const b = k.dataset.btn;
    const kb = keyFor(b);
    const useKb = mode === 'keyboard' && kb;
    k.textContent = useKb ? kb : b;
    k.title = useKb ? t('shared.hud.chipController', { button: b }) : (kb ? t('shared.hud.chipKeyboard', { key: kb }) : '');
    k.classList.toggle('kb', !!useKb);
    for (const c of Object.values(CHIP)) k.classList.toggle(c, !useKb && k.dataset.chip === c);
  }
}

/**
 * @param {{ title: string, sub: string, controls: [string, string][], note?: string }} opts
 *   controls: [button, action] pairs, button as printed on an Xbox pad
 *   ('A', 'LT', 'LS', 'RS', 'LS click', 'D-pad', 'View'...).
 */
export function mountHud({ title, sub, controls, note }) {
  document.title = t('shared.hud.pageTitle', { title });
  const el = document.createElement('div');
  el.className = 'hud';
  const rows = controls.map(([b, what]) => {
    const kb = keyFor(b);
    return `<li><span class="k ${CHIP[b] || ''}" data-btn="${b}" data-chip="${CHIP[b] || ''}" title="${t('shared.hud.chipKeyboard', { key: kb })}">${b}</span><span>${what}</span></li>`;
  }).join('');
  el.innerHTML = `<h1>${title}</h1><p class="sub">${sub}</p><ul>${rows}</ul>`
    + (note ? `<p class="note">${note}</p>` : '')
    + `<div class="foot">${embed.active ? '' : `<a href="../../prototypes/">${t('shared.hud.allPrototypes')}</a>`}<span class="dev">${t('shared.hud.keyboardHover')}</span></div>`;
  document.body.appendChild(el);
  addKeyStyle();
  const dev = el.querySelector('.dev');
  let playersEl = null, playersHtml = null;
  let mode = '';
  // Controller glyphs whenever any controller is connected, keys otherwise; live.
  function setMode(m) {
    if (m === mode) return;
    mode = m;
    hudMode = m;
    applyGlyphs(el, m);
    if (typeof document !== 'undefined') refreshInlineGlyphs(document, m);
    dev.textContent = m === 'controller' ? t('shared.hud.controllerConnected') : t('shared.hud.keyboardHoverController');
  }
  setMode(controllerConnected() ? 'controller' : 'keyboard');
  addEventListener('gamepadconnected', () => setMode('controller'));
  addEventListener('gamepaddisconnected', () => setTimeout(() => setMode(controllerConnected() ? 'controller' : 'keyboard'), 0));
  // A page that re-renders its list (the amoeba swaps schemes) gets the current glyphs too.
  const list = el.querySelector('ul');
  if (list && typeof MutationObserver === 'function') new MutationObserver(() => applyGlyphs(el, mode)).observe(list, { childList: true });
  let hideTimer = 0;
  const setShown = (on) => { clearTimeout(hideTimer); el.classList.toggle('hidden', !on); };
  if (embed.active) {
    // The shell draws the controls card (in its own style, with keys only when
    // no controller is connected) from these rows; View asks it to toggle.
    el.classList.add('embed', 'hidden');
    embed.post('hud', { title, sub, controls, note: note || '' });
    embed.on('controls', (d) => {
      setShown(!!d.show);
      if (d.show && d.autoHide > 0) hideTimer = setTimeout(() => setShown(false), d.autoHide * 1000);
    });
  }
  const view = () => (embed.active ? embed.post('view') : setShown(el.classList.contains('hidden')));
  const stats = document.createElement('div');
  stats.className = 'hud-stats';
  stats.hidden = true;
  let statsText = '';
  document.body.appendChild(stats);
  const toastEl = document.createElement('div');
  toastEl.className = 'hud-toast';
  document.body.appendChild(toastEl);
  let toastTimer = 0;
  return {
    toggle() { view(); },
    /** Call each frame with the pad: shows which device is in use, toggles on View. */
    update(pad) {
      if (pad.pressed(pad.BTN.VIEW)) view();
      const any = pad.anyConnected ?? pad.connected;
      setMode(any || controllerConnected() ? 'controller' : 'keyboard');
    },
    /** 'controller' or 'keyboard': the glyph set the controls list shows. */
    get glyphs() { return mode; },
    /**
     * The joined players as small coloured dots in the panel's footer
     * (players.js list: [{ slot, color, name, waiting }]). Hidden for one player.
     */
    players(list) {
      if (!playersEl) { playersEl = document.createElement('span'); playersEl.className = 'players'; dev.before(playersEl); }
      const show = !!(list && list.length > 1);
      if (playersEl.hidden !== !show) playersEl.hidden = !show;
      if (!show) return;
      // Rebuilt only when the roster's markup changes (worlds call this from onChange and per frame alike).
      const html = list.map((p) => `<i class="${p.waiting ? 'waiting' : ''}" style="--pc:${p.color}">${p.name || t('shared.hud.playerShort', { n: p.slot + 1 })}</i>`).join('');
      if (html !== playersHtml) { playersHtml = html; playersEl.innerHTML = html; }
    },
    /** Prototype-only diagnostic readout (scale, speed, state). Pass '' to hide. */
    stats(text) {
      // Written only when it changes: worlds call this every frame, often with the same text.
      const shown = !embed.active && !!text;
      if (stats.hidden !== !shown) stats.hidden = !shown;
      const t = shown ? String(text) : '';
      // Plain text, but a {btn:X} glyph in it (the amoeba's corner) shows as its chip.
      if (t !== statsText) { statsText = t; stats.innerHTML = textWithGlyphs(t); }
    },
    /** A short message; it may hold markup and {btn:X} glyphs (our own strings from text_config.js only). */
    toast(text, ms = 1800) {
      toastEl.innerHTML = text;
      toastEl.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
    },
  };
}
