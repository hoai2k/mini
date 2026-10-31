// The feature panel every prototype carries: a list of what the prototype is
// doing (rendering techniques, simulation, body, controls), each with a short
// explanation and, where it makes sense, a switch. Techniques borrowed from a
// sibling prototype are listed too, marked with where they came from, and
// start OFF so the prototype looks as designed until someone tries them.
//
// Open with the Menu button (Esc). In the panel: d-pad / left stick up and down
// to move, A to toggle (or cycle a choice), LB/RB or left/right to cycle a
// choice backwards/forwards, B or Menu to close. Mouse and touch work too.
//
// State persists per prototype in localStorage, and the address can override
// it for sharing: ?f=ssao,-grain,look:phase (on, off, choice).
//
//   const features = createFeatures({ key: 'mite', pad });
//   features.add({ id: 'sem', group: 'Rendering', label: 'SEM secondary-electron shading',
//     about: 'Brightness from surface tilt to the beam plus detector shadowing.', on: true,
//     onChange: (on) => (semPass.enabled = on) });
//   features.add({ id: 'look', group: 'Rendering', label: 'Imaging mode',
//     choices: ['SE', 'BSE', 'False colour'], value: 'SE', onChange: (v) => ... });
//   features.add({ id: 'dic', group: 'Rendering', label: 'DIC relief', from: 'tardigrade', on: false, ... });
//   features.add({ id: 'ik', group: 'Body', label: 'Two-bone leg IK', fixed: true, about: '...' });
//   ... each frame, after pad.poll(): if (features.update()) skipGameInput();
//
// Inside the Micro Zoom shell (embed mode, see embed.js) Menu belongs to the
// game: it posts `menu` (the shell pauses) instead of opening the panel, and
// the tab is hidden. The shell opens the panel from its settings
// ("Developer: world features") with `features {open}`; closing it reports
// `features {open: false}`. A `settings {invertY}` message updates the
// shared Invert Y switch if the prototype registered one (addInvertY).
import { BTN } from './pad.js';
import { embed } from './embed.js';

const GROUP_ORDER = ['Rendering', 'Optics', 'Body', 'Motion', 'Simulation', 'World', 'Controls', 'Borrowed'];

export function createFeatures({ key, pad }) {
  const items = [];
  const store = `micro.features.${key}`;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(store) || '{}') || {}; } catch { /* private mode */ }
  const fromUrl = {};
  try {
    const f = new URL(location.href).searchParams.get('f');
    if (f) for (const part of f.split(',')) {
      const [k, v] = part.split(':');
      if (v !== undefined) fromUrl[k] = v;
      else if (k.startsWith('-')) fromUrl[k.slice(1)] = false;
      else if (k) fromUrl[k] = true;
    }
  } catch { /* bad address */ }

  const persist = () => {
    const out = {};
    for (const it of items) if (!it.fixed) out[it.id] = it.choices ? it.value : it.on;
    try { localStorage.setItem(store, JSON.stringify(out)); } catch { /* private mode */ }
  };

  // Panel DOM.
  const style = document.createElement('style');
  style.textContent = `
    .mf { position: fixed; top: 12px; right: 12px; bottom: 12px; width: min(380px, calc(100vw - 24px)); overflow: auto;
      background: rgba(10,12,16,.86); backdrop-filter: blur(8px); color: #eef1f4; border-radius: 12px; padding: 12px 14px;
      font: 13px/1.4 system-ui, -apple-system, 'Segoe UI', sans-serif; z-index: 20; display: none; }
    .mf.open { display: block; }
    .mf h2 { font-size: 15px; margin: 0 0 2px; } .mf .hint { color: #a9b2bc; font-size: 12px; margin: 0 0 8px; }
    .mf h3 { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #9fd0ff; margin: 12px 0 4px; }
    .mf .row { display: grid; grid-template-columns: 1fr auto; gap: 2px 10px; padding: 6px 8px; border-radius: 8px; cursor: pointer; }
    .mf .row.sel { background: rgba(159,208,255,.16); outline: 1px solid rgba(159,208,255,.5); }
    .mf .row.fixed { cursor: default; }
    .mf .lab { font-weight: 600; } .mf .from { color: #e8c37a; font-weight: 500; font-size: 11px; margin-left: 4px; }
    .mf .about { grid-column: 1 / -1; color: #a9b2bc; font-size: 12px; }
    .mf .val { font-size: 12px; font-weight: 700; padding: 1px 8px; border-radius: 999px; background: #2b3138; align-self: start; white-space: nowrap; }
    .mf .val.on { background: #3a8b2f; } .mf .val.off { background: #4a2a2a; color: #d9b3b3; } .mf .val.fixed { background: transparent; color: #a9b2bc; }
    .mf-tab { position: fixed; top: 12px; right: 12px; z-index: 19; background: rgba(10,12,16,.62); color: #eef1f4; border: 0;
      border-radius: 999px; padding: 6px 12px; font: 600 12px system-ui, sans-serif; cursor: pointer; }
  `;
  document.head.appendChild(style);
  const panel = document.createElement('div');
  panel.className = 'mf';
  const tab = document.createElement('button');
  tab.className = 'mf-tab';
  tab.textContent = 'Features (Menu)';
  tab.onclick = () => setOpen(true);
  document.body.append(panel, tab);

  let open = false;
  let sel = 0;
  let stickHeld = 0;
  const switchable = () => items.filter((it) => !it.fixed);

  if (embed.active) tab.hidden = true;
  function setOpen(v) {
    const was = open;
    open = v;
    panel.classList.toggle('open', open);
    tab.style.display = open || embed.active ? 'none' : '';
    render();
    if (was !== open) embed.post('features', { open });
  }
  if (embed.active) {
    embed.on('features', (d) => setOpen(!!d.open));
    embed.on('settings', (d) => {
      if (typeof d.invertY === 'boolean' && items.some((x) => x.id === 'invertY')) api.set('invertY', d.invertY);
    });
  }

  function valueText(it) {
    if (it.fixed) return 'always';
    if (it.choices) return it.value;
    return it.on ? 'ON' : 'OFF';
  }

  function render() {
    if (!open) return;
    const groups = [...new Set(items.map((it) => it.group))].sort((a, b) => {
      const ia = GROUP_ORDER.indexOf(a), ib = GROUP_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    const sw = switchable();
    panel.innerHTML = '<h2>What this prototype is doing</h2><p class="hint">Menu/Esc closes · up/down move · A toggles · LB/RB cycle · B back</p>';
    for (const g of groups) {
      const h = document.createElement('h3');
      h.textContent = g;
      panel.appendChild(h);
      for (const it of items.filter((x) => x.group === g)) {
        const row = document.createElement('div');
        row.className = 'row' + (it.fixed ? ' fixed' : '') + (sw[sel] === it ? ' sel' : '');
        const cls = it.fixed ? 'fixed' : it.choices ? '' : it.on ? 'on' : 'off';
        row.innerHTML = `<span class="lab"></span><span class="val ${cls}"></span><span class="about"></span>`;
        row.querySelector('.lab').textContent = it.label;
        if (it.from) {
          const f = document.createElement('span');
          f.className = 'from';
          f.textContent = `from ${it.from}`;
          row.querySelector('.lab').appendChild(f);
        }
        row.querySelector('.val').textContent = valueText(it);
        row.querySelector('.about').textContent = it.about || '';
        if (!it.fixed) row.onclick = () => { sel = sw.indexOf(it); activate(it, 1); };
        panel.appendChild(row);
      }
    }
    const cur = panel.querySelector('.row.sel');
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  }

  function apply(it) {
    try { it.onChange?.(it.choices ? it.value : it.on); } catch (e) { console.error(`[micro] feature ${it.id}:`, e); }
  }

  function activate(it, dir) {
    if (it.fixed) return;
    if (it.choices) {
      const i = it.choices.indexOf(it.value);
      it.value = it.choices[(i + dir + it.choices.length) % it.choices.length];
    } else it.on = !it.on;
    apply(it);
    persist();
    render();
  }

  const api = {
    /**
     * Register a feature. Returns a getter for its current state.
     * @param {{id:string, group:string, label:string, about?:string, on?:boolean,
     *   choices?:string[], value?:string, fixed?:boolean, from?:string,
     *   onChange?:(v:boolean|string)=>void}} f
     *   fixed: always on, listed only to say what the prototype does.
     *   from: the prototype a borrowed technique came from (start it off).
     */
    add(f) {
      const it = { on: true, ...f };
      if (it.fixed) it.on = true;
      else if (it.choices) {
        it.value = it.value ?? it.choices[0];
        const v = fromUrl[it.id] ?? saved[it.id];
        if (typeof v === 'string' && it.choices.includes(v)) it.value = v;
      } else {
        const v = fromUrl[it.id] ?? saved[it.id];
        if (typeof v === 'boolean') it.on = v;
      }
      items.push(it);
      apply(it);
      render();
      return () => (it.choices ? it.value : it.on);
    },
    /** Current value: boolean for switches, the choice string for choices. */
    get(id) {
      const it = items.find((x) => x.id === id);
      if (!it) throw new Error(`unknown feature ${id}`);
      return it.choices ? it.value : it.on;
    },
    /** Set from code (e.g. a button that cycles the look); persists and refreshes the panel. */
    set(id, v) {
      const it = items.find((x) => x.id === id);
      if (!it || it.fixed) return;
      if (it.choices) it.value = v; else it.on = !!v;
      apply(it);
      persist();
      render();
    },
    get open() { return open; },
    /**
     * Call each frame after pad.poll(). Returns true while the panel is open,
     * so the prototype should ignore game input that frame.
     */
    update() {
      if (pad.pressed(BTN.MENU)) {
        if (embed.active && !open) { embed.menu(); return false; }
        setOpen(!open);
      }
      if (!open) return false;
      if (pad.pressed(BTN.B)) { setOpen(false); return true; }
      const sw = switchable();
      if (!sw.length) return true;
      const s = pad.ls();
      const sy = Math.abs(s.y) > 0.6 ? Math.sign(s.y) : 0;
      let move = (pad.pressed(BTN.DOWN) ? 1 : 0) - (pad.pressed(BTN.UP) ? 1 : 0);
      if (!move && sy && !stickHeld) move = sy;
      stickHeld = sy;
      if (move) { sel = (sel + move + sw.length) % sw.length; render(); }
      const it = sw[sel];
      if (pad.pressed(BTN.A)) activate(it, 1);
      if (it.choices && (pad.pressed(BTN.RB) || pad.pressed(BTN.RIGHT))) activate(it, 1);
      if (it.choices && (pad.pressed(BTN.LB) || pad.pressed(BTN.LEFT))) activate(it, -1);
      return true;
    },
  };
  return api;
}
