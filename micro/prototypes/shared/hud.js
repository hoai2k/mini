// The overlay every prototype shows: title, one line on what it is, the
// controls as Xbox button chips, a scale note, and a link back to the list.
// The View button (Tab) hides and shows it.
//
// Inside the Micro Zoom shell (embed mode, see embed.js) the panel is hidden
// and the shell draws the controls card instead: mountHud posts the rows as
// `hud {title, sub, controls, note}` and View posts `view` (the shell toggles
// its card). The shell can still show this panel with `controls {show}`.
import { embed } from './embed.js';

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
    k.title = useKb ? `Controller: ${b}` : (kb ? `Keyboard: ${kb}` : '');
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
  document.title = `${title} · Micro prototypes`;
  const el = document.createElement('div');
  el.className = 'hud';
  const rows = controls.map(([b, what]) => {
    const kb = keyFor(b);
    return `<li><span class="k ${CHIP[b] || ''}" data-btn="${b}" data-chip="${CHIP[b] || ''}" title="Keyboard: ${kb}">${b}</span><span>${what}</span></li>`;
  }).join('');
  el.innerHTML = `<h1>${title}</h1><p class="sub">${sub}</p><ul>${rows}</ul>`
    + (note ? `<p class="note">${note}</p>` : '')
    + `<div class="foot">${embed.active ? '' : '<a href="../">← All prototypes</a>'}<span class="dev">Keyboard (hover a button for its key)</span></div>`;
  document.body.appendChild(el);
  addKeyStyle();
  const dev = el.querySelector('.dev');
  let playersEl = null;
  let mode = '';
  // Controller glyphs whenever any controller is connected, keys otherwise; live.
  function setMode(m) {
    if (m === mode) return;
    mode = m;
    applyGlyphs(el, m);
    dev.textContent = m === 'controller' ? 'Controller connected' : 'Keyboard (hover a button for its controller button)';
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
      const show = list && list.length > 1;
      playersEl.hidden = !show;
      if (show) playersEl.innerHTML = list.map((p) => `<i class="${p.waiting ? 'waiting' : ''}" style="--pc:${p.color}">${p.name || 'P' + (p.slot + 1)}</i>`).join('');
    },
    /** Small monospace readout in the corner (scale, speed, state). Pass '' to hide. */
    stats(text) { stats.hidden = !text; stats.textContent = text; },
    toast(text, ms = 1800) {
      toastEl.textContent = text;
      toastEl.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
    },
  };
}
