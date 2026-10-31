// Zoom transitions prototype page: the twelve world-to-world transitions of
// Micro Zoom (six forward, six reverse), each playable from the menu, plus the
// whole chain as play (reach the destination, the next frame is highlighted,
// zoom into it). The rendering and the transitions are engine.js, the same
// code the game plays through player.js. See README.md.
//
// ?embed=1&from=<world>&to=<world>&dir=in|out plays that one transition and
// posts `done` to the game shell (shared/embed.js), then holds.
import { createPad, BTN } from '../shared/pad.js';
import { mountHud } from '../shared/hud.js';
import { createControls, hudControls } from '../shared/controls.js';
import { createFeatures } from '../shared/features.js';
import { createAudio } from '../shared/audio.js';
import { embed } from '../shared/embed.js';
import { createEngine, DEFAULT_OPTS, HL_NAMES, STRAT_IDS, STRAT_NAMES, NT } from './engine.js';
import { WORLDS, TRANSITIONS, IDS } from './chain.js';
import { listTransitions, transitionFor } from './player.js';

// The embedded single transition (the game's 'microscope' transition style).
const params = new URLSearchParams(location.search);
const EMBED = params.get('embed') === '1' && params.get('from') && params.get('to');
let embedT = null;
if (EMBED) {
  try { embedT = transitionFor(params.get('from'), params.get('to'), params.get('dir')); embed.provide('transition'); }
  catch (e) { console.error(`[micro] zoom embed: ${e.message}`); }
}

const canvas = document.querySelector('canvas.view');
const pad = createPad();
const ctl = createControls(pad);
const hud = mountHud({
  title: 'Zoom transitions',
  sub: 'The twelve world-to-world transitions of Micro Zoom: pick one in the menu to play it, or play the chain: reach the spot, see the next screen framed, zoom into it.',
  controls: hudControls({
    move: 'Move the creature (a demo drives it if you leave it)',
    dash: 'Dash · on the framed spot: zoom now · hold: skip the highlight · while scrubbing: resume',
    attack: 'Frame flash style',
    defend: 'Reverse: zoom back out',
    special: 'Play the transition selected in the menu',
    analog: 'Scrub the transition (LT back, RT forward)',
    secondary: 'Menu: previous / next transition',
    look: 'Strategy: recommended / look first / during / zoom first / crossfade / cut',
    zoom: 'Menu: previous / next transition',
  }),
  note: 'One specimen at every scale: the highlighted frame is exactly the next world’s screen. Field widths, the scale bar and the magnification (180 mm ÷ field, a 10× eyepiece) are true; creature speeds are real except the amoeba’s (×10, as in its prototype) and the tun’s revival.',
});

// ---------------------------------------------------------------- features
const opts = { ...DEFAULT_OPTS, noCap: params.get('hq') === '1' };
let eng = null;
const features = createFeatures({ key: 'zoom', pad });
const strategyChoices = STRAT_IDS.map((s) => STRAT_NAMES[s]);
features.add({ id: 'strategy', group: 'Rendering', label: 'Style transition strategy', choices: strategyChoices, value: STRAT_NAMES.auto,
  about: 'Recommended: each transition’s best strategy from the contact sheets (README). Look first: morph world N’s optics into N+1’s at N’s scale, then zoom. Look during: the optics morph with the zoom. Zoom first: zoom in N’s look, then morph. Crossfade: as during, but the two finished images cross-fade. Cut: the look switches at the hand-off. In the hand-offs (no zoom) “zoom first” falls back to “during”.',
  onChange: (v) => { opts.strategy = STRAT_IDS[strategyChoices.indexOf(v)] || 'auto'; eng?.retime(); } });
features.add({ id: 'hl', group: 'Rendering', label: 'Highlight: the next world’s frame', choices: HL_NAMES, value: HL_NAMES[0],
  about: 'The highlight is exactly the rectangle the next world’s screen will show (its field width × the screen’s aspect). Frame flash: the frame and its inside flash twice; pulsing frame; or darken everything outside it. The zoom is a pure scaling about one fixed point, so that rectangle grows to fill the screen exactly.',
  onChange: (v) => { opts.hl = HL_NAMES.includes(v) ? v : HL_NAMES[0]; } });
features.add({ id: 'zoomDur', group: 'Motion', label: 'Zoom duration', choices: ['2 s', '3.5 s', '6 s'], value: '3.5 s',
  about: 'How long the zoom takes, whatever the magnification ratio (2× to 150×). Hand-offs last this plus 1.5 s (at least 4.5 s).', onChange: (v) => { opts.zoomDur = parseFloat(v); eng?.retime(); } });
features.add({ id: 'morphDur', group: 'Motion', label: 'Look morph duration (look first / zoom first)', choices: ['1 s', '2.5 s', '4 s'], value: '2.5 s',
  onChange: (v) => { opts.morphDur = parseFloat(v); eng?.retime(); } });
features.add({ id: 'hlDur', group: 'Motion', label: 'Highlight duration', choices: ['1.2 s', '2.2 s', '3.5 s'], value: '2.2 s',
  onChange: (v) => { opts.hlDur = parseFloat(v); eng?.retime(); } });
const EASE_NAMES = { log: 'Constant zoom speed (log)', smooth: 'Ease in and out', arrive: 'Fast start, slow arrival' };
features.add({ id: 'ease', group: 'Motion', label: 'Zoom easing', choices: Object.values(EASE_NAMES), value: EASE_NAMES.log,
  about: 'The field width is interpolated in log space, so “constant” means the same magnification per second all the way down.',
  onChange: (v) => { opts.ease = Object.keys(EASE_NAMES).find((k) => EASE_NAMES[k] === v) || 'log'; } });
features.add({ id: 'miteLook', group: 'Optics', label: 'Mite world look', choices: ['SEM', 'Stereo microscope'], value: 'SEM',
  about: 'The mite prototype’s SEM, or the reflected-light stereo microscope the spec names for the capitulum.', onChange: (v) => { opts.miteLook = v === 'SEM' ? 'sem' : 'stereo'; } });
features.add({ id: 'bactLook', group: 'Optics', label: 'Bacteria world look', choices: ['Phase contrast', 'Fluorescence'], value: 'Phase contrast',
  onChange: (v) => { opts.bactLook = v === 'Phase contrast' ? 'phase' : 'fluor'; } });
features.add({ id: 'scale', group: 'Rendering', label: 'Render scale', choices: ['50%', '75%', '100%'], value: '75%',
  about: 'Resolution of the specimen field (two worlds are drawn at once during a zoom). A software renderer is capped at 35 %.', onChange: (v) => { opts.scale = parseFloat(v) / 100; eng?.resize(); } });
features.add({ id: 'specimen', group: 'World', label: 'One multi-scale specimen', fixed: true,
  about: 'Every world is a scale band of one specimen: capitulum leaves carry the cell lattice the DIC resolves, the film runs down a leaf into the pool, the amoeba crawls on the pool floor below, the biofilm’s cells are the texture the brightfield shows. Each layer fades in by pixel size, so N’s detail blurs out as N+1’s structures resolve, aligned.' });
features.add({ id: 'optics', group: 'Optics', label: 'One image-formation model (zoom-optics.js)', fixed: true,
  about: 'Macro, stereo, SEM, DIC, brightfield, phase, fluorescence, cryo-EM and the illustration are all one formula with different lamps and settings, so a morph moves the instrument, not just pixels.' });
features.add({ id: 'logzoom', group: 'Optics', label: 'Log-scale zoom, honest scale bar (zoom-path.js)', fixed: true });
features.add({ id: 'demo', group: 'Controls', label: 'Demo when idle', on: true, about: 'The creature walks, crawls or swims to the destination by itself after a moment without input.', onChange: (v) => { opts.demo = v; } });
features.add({ id: 'auto', group: 'Controls', label: 'Continue into the next transition', on: true, about: 'After arriving, the next world’s destination is live, so the whole chain plays through.', onChange: (v) => { opts.auto = EMBED ? false : v; } });
const audio = createAudio(['springtail/amb-bog', 'mite/amb-moss', 'tardigrade/amb-film', 'amoeba/amb-pool', 'paramecium/amb-pool', 'bacterium/amb-sediment', 'mite/step', 'tardigrade/step', 'tardigrade/revive']);
audio.addToFeatures(features);
if (EMBED) { opts.auto = false; opts.demo = false; opts.strategy = params.get('strategy') && STRAT_IDS.includes(params.get('strategy')) ? params.get('strategy') : 'auto'; }

// ---------------------------------------------------------------- engine
eng = createEngine({ canvas, size: () => [innerWidth, innerHeight], audio, opts });
addEventListener('resize', () => eng.resize());
const S = eng.S;
eng.on('toast', ({ text, ms }) => { if (!EMBED) hud.toast(text, ms); });
eng.on('dash', () => pad.rumble(120, 0.3, 0.2));

// ---------------------------------------------------------------- the menu: 12 transitions
const LIST = listTransitions();
let sel = 0;
const style = document.createElement('style');
style.textContent = `
.zt-menu { position: fixed; top: 12px; left: 50%; transform: translateX(-50%); background: rgba(10,12,16,.78);
  border-radius: 10px; padding: 8px 10px; font: 12px/1.35 system-ui, sans-serif; color: #eef1f4; width: min(560px, calc(100vw - 24px)); z-index: 3; }
.zt-menu .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 8px; }
.zt-menu .h { color: #9fd0ff; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; padding: 0 6px 2px; }
.zt-menu button.row { all: unset; display: flex; gap: 6px; padding: 2px 6px; border-radius: 6px; color: #c3cbd4; white-space: nowrap; cursor: pointer; overflow: hidden; }
.zt-menu button.row:hover { background: rgba(159,208,255,.12); }
.zt-menu button.row.sel { background: rgba(255,214,110,.16); color: #fff2c8; outline: 1px solid rgba(255,214,110,.45); }
.zt-menu button.row.on { color: #fff; font-weight: 650; }
.zt-menu .row .n { width: 1.4em; font-weight: 700; } .zt-menu .row .t { overflow: hidden; text-overflow: ellipsis; }
.zt-menu .row .ho { color: #e8c37a; font-size: 11px; margin-left: auto; }
.zt-menu .bar { position: relative; height: 8px; border-radius: 4px; background: #2b3138; margin: 6px 2px 2px; overflow: hidden; }
.zt-menu .seg { position: absolute; top: 0; bottom: 0; } .zt-menu .cur { position: absolute; top: -2px; bottom: -2px; width: 3px; background: #fff; border-radius: 2px; }
.zt-menu .status { margin: 4px 2px 0; color: #eef1f4; white-space: normal; }
.zt-scale { position: fixed; left: 12px; bottom: 12px; background: rgba(10,12,16,.62); border-radius: 8px; padding: 8px 10px; color: #eef1f4;
  font: 12px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace; pointer-events: none; z-index: 3; }
.zt-scale .bar { height: 5px; background: #fff; border: 1px solid #000; border-top: 0; margin-bottom: 4px; }
.zt-scale .big { font: 600 13px system-ui, sans-serif; }
@media (max-width: 700px) { .zt-menu { top: auto; bottom: 110px; } .zt-menu .grid { grid-template-columns: 1fr; } }
`;
document.head.appendChild(style);
const menu = document.createElement('div');
menu.className = 'zt-menu';
const fwd = LIST.filter((t) => t.dir === 'in'), rev = LIST.filter((t) => t.dir === 'out');
const rowHtml = (t) => `<button class="row" data-i="${LIST.indexOf(t)}" title="${t.dir === 'in' ? 'Zoom in' : 'Zoom out'}: ${t.from} → ${t.to}"><span class="n">${t.dir === 'in' ? t.k : `${t.k}′`}</span><span class="t">${t.dir === 'in' ? t.title.replace(/ \(hand-off\)$/, '') : t.title}</span>${t.handoff ? '<span class="ho">hand-off</span>' : ''}</button>`;
menu.innerHTML = `<div class="grid"><div class="h">Forward (zoom in)</div><div class="h">Reverse (zoom out)</div>`
  + fwd.map((t, i) => rowHtml(t) + rowHtml(rev[rev.length - 1 - i])).join('')
  + '</div><div class="bar"></div><div class="status"></div>';
if (!EMBED) document.body.appendChild(menu);
const rows = [...menu.querySelectorAll('button.row')];
menu.addEventListener('click', (e) => {
  const b = e.target.closest('button.row');
  if (!b) return;
  sel = +b.dataset.i;
  playItem(LIST[sel]);
  b.blur();
});
function playItem(t) {
  if (t.dir === 'in') eng.playForward(t.k); else eng.playReverse(t.k);
  hud.toast(`${t.dir === 'in' ? 'Zoom in' : 'Zoom out'}: ${WORLDS[IDS.indexOf(t.from)].short} → ${WORLDS[IDS.indexOf(t.to)].short}`, 1400);
}
const scaleEl = document.createElement('div');
scaleEl.className = 'zt-scale';
scaleEl.innerHTML = '<div class="bar"></div><div class="big"></div><div class="mag"></div><div class="look"></div>';
document.body.appendChild(scaleEl);

let menuKey = '';
function timelineBar() {
  const tl = S.tl;
  if (!tl) return '';
  const seg = (a, b, c) => `<div class="seg" style="left:${(a / tl.end) * 100}%;width:${((b - a) / tl.end) * 100}%;background:${c}"></div>`;
  let bar = seg(0, tl.H, '#7a6a35') + (tl.pre ? seg(tl.H, tl.zoomStart, '#4f6f9a') : '') + seg(tl.zoomStart, tl.zoomEnd, eng.isHandoff() ? '#8a5fb0' : '#3a8b2f') + (tl.post ? seg(tl.zoomEnd, tl.end, '#4f6f9a') : '');
  const x = S.phase === 'trans' ? S.tau / tl.end : 0;
  bar += `<div class="cur" style="left:calc(${x * 100}% - 1px)"></div>`;
  return bar;
}
function playingIndex() {
  if (S.phase !== 'trans') return -1;
  return LIST.findIndex((t) => t.k === S.k && t.dir === (S.dir > 0 ? 'in' : 'out'));
}
function statusText() {
  const W = WORLDS[eng.world];
  const T = TRANSITIONS[S.k];
  const handoffName = { first: 'Look first, then the hand-off', during: 'Look during the hand-off', cross: 'Crossfade during the hand-off', cut: 'Cut mid-hand-off' };
  const strat = S.tl ? (eng.isHandoff() ? handoffName[S.tl.strategy] : STRAT_NAMES[S.tl.strategy]) : '';
  const rec = opts.strategy === 'auto' ? ' (recommended)' : '';
  if (S.phase === 'end') return `${W.short}: ${W.creature}. ${S.k === NT ? 'End of the chain' : 'Free play'} · B zoom back out · Y play the selected transition`;
  if (S.phase === 'approach') {
    const w = S.k - 1;
    if (w === 2 && eng.cr[2].state < 1) return `${W.short}: the tun is rehydrating…`;
    const d = Math.hypot(eng.cr[w].pos[0] - eng.destG(w)[0], eng.cr[w].pos[1] - eng.destG(w)[1]);
    return `${W.short}: ${WORLDS[w].creature}. ${d < WORLDS[w].destR * 3 ? 'A: go' : 'Go to the destination'} · next: ${T.title} · ${strat}${rec}`;
  }
  const st = S.st;
  const what = eng.isHandoff() ? 'hand-off' : 'zoom';
  const seg = S.hold ? 'scrubbing (A resumes)' : S.dir < 0 ? (eng.isHandoff() ? 'reversing the hand-off' : 'zooming out') : st.segment === 'highlight' ? 'the next frame · A: zoom now' : st.segment === 'zoom' ? (eng.isHandoff() ? 'hand-off' : 'zooming') : st.segment === 'look' ? 'changing the look' : 'arrived';
  return `${S.dir < 0 ? 'Reverse · ' : ''}${T.title} · ${strat}${rec} · ${seg} · ${what} ${(st.zoom * 100).toFixed(0)}% · look ${(st.look * 100).toFixed(0)}%`;
}
let fps = 60;
function updateHud() {
  const r = eng.readout(innerWidth);
  scaleEl.querySelector('.bar').style.width = `${r.bar.px.toFixed(1)}px`;
  scaleEl.querySelector('.big').textContent = r.bar.label;
  scaleEl.querySelector('.mag').textContent = `field ${r.field} · ${r.mag} (10× eyepiece equiv.)`;
  scaleEl.querySelector('.look').textContent = `${r.look} · ${r.instrument}`;
  if (EMBED) return;
  const pi = playingIndex();
  const key = `${sel}|${pi}|${S.k}|${S.phase}|${S.tl?.end}|${S.phase === 'trans' ? Math.round(S.tau * 20) : 0}`;
  if (key !== menuKey) {
    rows.forEach((b) => { const i = +b.dataset.i; b.classList.toggle('sel', i === sel); b.classList.toggle('on', i === pi); });
    menu.querySelector('.bar').innerHTML = timelineBar();
    menuKey = key;
  }
  menu.querySelector('.status').textContent = statusText();
  hud.stats(`${WORLDS[eng.world].short} · ${S.phase}${S.phase === 'trans' ? ` τ ${S.tau.toFixed(2)}/${S.tl.end.toFixed(1)}` : ''}
field ${r.field} · ${(S.w / eng.zo.field.width).toPrecision(3)} µm/px · ${fps.toFixed(0)} fps`);
}

// ---------------------------------------------------------------- input
function readInput() {
  const panel = features.update();
  hud.update(pad);
  if (Object.values(BTN).some((b) => pad.pressed(b))) audio.unlock();
  if (panel || EMBED) return null;
  const step = -ctl.zoomStep() + (ctl.rb.pressed() ? 1 : 0) - (ctl.lb.pressed() ? 1 : 0);
  if (step) { sel = (sel + Math.sign(step) + LIST.length) % LIST.length; const t = LIST[sel]; hud.toast(`${t.dir === 'in' ? 'Zoom in' : 'Zoom out'}: ${t.from} → ${t.to} (Y plays it)`, 1300); }
  const ls = ctl.lookStep();
  if (ls) {
    const i = (STRAT_IDS.indexOf(opts.strategy) + ls + STRAT_IDS.length) % STRAT_IDS.length;
    features.set('strategy', STRAT_NAMES[STRAT_IDS[i]]);
    hud.toast(`Strategy: ${STRAT_NAMES[STRAT_IDS[i]]}`, 1200);
  }
  if (ctl.attack.pressed()) {
    const i = (HL_NAMES.indexOf(opts.hl) + 1) % HL_NAMES.length;
    features.set('hl', HL_NAMES[i]);
    hud.toast(`Highlight: ${HL_NAMES[i]}`, 1200);
  }
  if (ctl.special.pressed()) playItem(LIST[sel]);
  return { move: ctl.move(), dashPressed: ctl.dash.pressed(), dashDown: ctl.dash.down(), analog: ctl.analog(), reversePressed: ctl.defend.pressed() };
}

// ---------------------------------------------------------------- loop
let last = performance.now();
let embedDone = false;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  fps = fps * 0.95 + (1 / Math.max(dt, 1e-3)) * 0.05;
  pad.poll();
  const inp = readInput();
  eng.update(dt, inp);
  eng.render();
  updateHud();
  requestAnimationFrame(frame);
}

if (EMBED && embedT) {
  // the game shell holds our frames until `resume`; the transition starts on the first one
  const finish = () => { if (embedDone) return; embedDone = true; embed.done({ from: params.get('from'), to: params.get('to'), dir: embedT.dir }); S.stop = true; };
  eng.on('arrive', finish);
  eng.on('reversed', finish);
  if (embedT.dir === 'in') eng.playForward(embedT.k); else eng.playReverse(embedT.k);
  sel = LIST.findIndex((t) => t.k === embedT.k && t.dir === embedT.dir);
} else eng.select(1);

// Test hooks (contact sheets, the smoke check).
window.__micro = {
  engine: eng, S, cr: eng.cr, opts, features, LIST,
  setTransition(k) { eng.select(k); },
  /** Jump into transition k's timeline, paused (dir 'in' at its start, 'out' at its end). */
  start(k = S.k, dir = 'in') { if (dir === 'in') eng.playForward(k); else eng.playReverse(k); S.hold = true; },
  setZoom(p) { if (S.phase !== 'trans') this.start(S.k); eng.seekZoom(p); },
  setProgress(s) { if (S.phase !== 'trans') this.start(S.k); eng.seek(s * S.tl.end); },
  setStrategy(id) { features.set('strategy', STRAT_NAMES[id]); },
  setHighlight(name) { features.set('hl', name); },
  /** The next world's frame on screen (drawing-buffer px, y up) and the screen size. */
  rect() { const [W, H] = eng.drawingSize; return { rect: S.phase === 'trans' ? eng.nextRect() : null, W, H, cam: S.cam, w: S.w }; },
  hideHud(on = true) { document.querySelector('.hud').classList.toggle('hidden', on); menu.style.display = on ? 'none' : ''; },
  /** Render now and return the canvas as a data URL plus the scale readout (for contact sheets). */
  snap() {
    eng.render(); updateHud();
    return { img: canvas.toDataURL('image/jpeg', 0.88), scale: [...scaleEl.children].map((e) => e.textContent).filter(Boolean).join(' | '), status: statusText() };
  },
  profile() { return eng.profile(); },
  state() { return { k: S.k, phase: S.phase, dir: S.dir, tau: S.tau, st: S.st, field: S.w, look: S.look.label, world: eng.world, embedDone }; },
};
requestAnimationFrame((n) => { last = n; frame(n); });
