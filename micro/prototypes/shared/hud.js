// The overlay every prototype shows: title, one line on what it is, the
// controls as Xbox button chips, a scale note, and a link back to the list.
// The View button (Tab) hides and shows it.

const CHIP = { A: 'a', B: 'b', X: 'x', Y: 'y' };
const KEYS = { 'LT/RT': 'Z / X', 'LB/RB': 'Q / F', A: 'Space', B: 'Shift', X: 'E', Y: 'R', LB: 'Q', RB: 'F', LT: 'Z', RT: 'X', LS: 'WASD', RS: 'Arrows', View: 'Tab', Menu: 'Esc', 'D-pad': '1–4' };

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
    const kb = KEYS[b] || KEYS[b.split(' ')[0]] || '';
    return `<li><span class="k ${CHIP[b] || ''}" title="Keyboard: ${kb}">${b}</span><span>${what}</span></li>`;
  }).join('');
  el.innerHTML = `<h1>${title}</h1><p class="sub">${sub}</p><ul>${rows}</ul>`
    + (note ? `<p class="note">${note}</p>` : '')
    + `<div class="foot"><a href="../">← All prototypes</a><span class="dev">Keyboard (hover a button for its key)</span></div>`;
  document.body.appendChild(el);
  const stats = document.createElement('div');
  stats.className = 'hud-stats';
  stats.hidden = true;
  document.body.appendChild(stats);
  const toastEl = document.createElement('div');
  toastEl.className = 'hud-toast';
  document.body.appendChild(toastEl);
  let toastTimer = 0;
  return {
    toggle() { el.classList.toggle('hidden'); },
    /** Call each frame with the pad: shows which device is in use, toggles on View. */
    update(pad) {
      if (pad.pressed(pad.BTN.VIEW)) el.classList.toggle('hidden');
      el.querySelector('.dev').textContent = pad.connected ? 'Controller connected' : 'Keyboard (hover a button for its key)';
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
