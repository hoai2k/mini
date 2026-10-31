// Button glyphs for the shell's instructions, intro and controls card:
// Xbox buttons whenever any controller is connected, keyboard keys only while
// none is (GAME_GUIDELINES.md, and the owner's request to prefer controller
// instructions). `world` keys are the prototypes' keyboard fallback
// (shared/pad.js); `menu` keys are the shell's own.

const CHIP = { A: 'a', B: 'b', X: 'x', Y: 'y' };
const WORLD_KEYS = {
  A: 'Space', B: 'Shift', X: 'E', Y: 'R', LB: 'Q', RB: 'F', LT: 'Z', RT: 'X', 'LT/RT': 'Z / X', 'LB/RB': 'Q / F',
  LS: 'WASD', RS: 'Arrows', View: 'Tab', Menu: 'Esc', 'LS click': 'C', 'RS click': 'V',
  'D-pad': '1–4', 'D-pad ↑↓': '1 / 2', 'D-pad ←→': '3 / 4', 'D-pad ↑': '1', 'D-pad ↓': '2',
};
const MENU_KEYS = { A: 'Enter', B: 'Esc', LS: 'Arrows', 'D-pad': 'Arrows', Menu: 'Esc', View: 'Tab', Y: 'R' };

export function controllerConnected() {
  try { for (const g of navigator.getGamepads ? navigator.getGamepads() : []) if (g && g.connected) return true; } catch { /* blocked */ }
  return false;
}

export const glyphMode = () => (controllerConnected() ? 'controller' : 'keyboard');

function keyFor(b, keys) {
  if (keys[b]) return keys[b];
  const head = b.split(' ')[0];
  return keys[head] || '';
}

/** HTML for one glyph. */
export function glyph(btn, { mode = glyphMode(), ctx = 'world' } = {}) {
  const kb = keyFor(btn, ctx === 'menu' ? MENU_KEYS : WORLD_KEYS);
  if (mode === 'keyboard' && kb) return `<span class="g kb" title="Controller: ${btn}">${kb}</span>`;
  return `<span class="g ${CHIP[btn] || ''}"${kb ? ` title="Keyboard: ${kb}"` : ''}>${btn}</span>`;
}

/** Refresh every placeholder <span class="g" data-btn="A"> under root. */
export function refreshGlyphs(root, ctx = 'menu') {
  const mode = glyphMode();
  for (const el of root.querySelectorAll('.g[data-btn]')) {
    const tmp = document.createElement('span');
    tmp.innerHTML = glyph(el.dataset.btn, { mode, ctx });
    const n = tmp.firstChild;
    el.className = n.className;
    el.textContent = n.textContent;
    el.title = n.title;
  }
}

/** The controls list as <li> rows. */
export function controlRows(rows, opts) {
  return rows.map(([b, what]) => `<li>${glyph(b, opts)}<span>${what}</span></li>`).join('');
}
