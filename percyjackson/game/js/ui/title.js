// Title screen (GAME_GUIDELINES.md): the logo (loaded and keyed before the
// title shows, ui/art.js), "Press Start", and Instructions / Settings /
// Fullscreen at the bottom right. Idle: any fresh controller button starts. Moving the left
// stick (or arrows) enters utility navigation: A activates, B backs out,
// Menu/Start starts.
import { h, padSnap } from './ui.js';
import { openSettings } from './settingsScreen.js';
import { openDebugMenu } from './debugMenu.js';
import { openInstructions } from './instructions.js';
import { openSelect } from './partySelect.js';
import { isMobile } from '../util.js';
import { saveSettings, settings } from '../settings.js';
import { logoCanvas } from './art.js';
import { t as tx } from '../text_config.js';

const ICONS = {
  instructions: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h10l4 4v14H5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 11h8M8 15h8M8 7h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></g></svg>',
  soundOn: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></g></svg>',
  soundOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6M16 9l6 6"/></g></svg>',
  fullscreen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  pad: '<svg viewBox="0 0 24 24" width="1.25em" height="1.25em" aria-hidden="true" style="vertical-align:-0.25em"><path fill="currentColor" d="M7 6h10a5 5 0 0 1 4.9 6l-1 4.6a2.6 2.6 0 0 1-4.5 1.2L14.6 16H9.4l-1.8 1.8a2.6 2.6 0 0 1-4.5-1.2l-1-4.6A5 5 0 0 1 7 6zm0 3v1.5H5.5v1.5H7v1.5h1.5V12H10v-1.5H8.5V9H7zm9.5.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm2 2a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/></svg>',
  exitfs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

// Logo: assets/logo-web.png, keyed out of its magenta ground while the game
// loads (ui/art.js), so the title shows it from its first frame. Only if the
// picture is genuinely missing does the title show the game's name in type.
let entered = false;   // the logo eases in once, as the loading screen fades (never again on a refresh)
function makeLogo() {
  const wrap = h('h1', { class: 'logo-wrap' + (entered ? '' : ' enter'), 'aria-label': tx('page.gameName') });
  entered = true;
  const c = logoCanvas();
  if (c) { c.className = 'logo-img'; c.setAttribute('aria-hidden', 'true'); wrap.append(c); }
  else wrap.append(h('div', { class: 'title-type', 'aria-hidden': 'true' }, h('span', { class: 'l1' }, tx('page.nameLine1')), h('span', { class: 'key' }), h('span', { class: 'l2' }, tx('page.nameLine2'))));
  return wrap;
}

export function openTitle(game) {
  const ui = game.ui;
  let mode = 'idle';                 // 'idle' (any button starts) | 'nav' (utility navigation)
  let prev = padSnap(game);          // buttons held while the screen appears must not start the game
  let lastTick = performance.now();
  let starting = false;
  let root = null;

  const setMode = (m) => { mode = m; root?.classList.toggle('nav', m === 'nav'); const hint = root?.querySelector('.title-hint'); if (hint) hint.textContent = hintText(); };
  const hintText = () => (mode === 'nav' ? tx('title.hintNav') : (isMobile ? tx('title.hintTap') : tx('title.hintIdle')));
  const start = (device) => {
    if (starting) return; starting = true;
    if (device) game.input.lastDevice = device;
    try { const p = document.documentElement.requestFullscreen?.(); p?.catch?.(() => { /* rejected: carry on */ }); } catch (e) { /* ignore */ }
    game.audio?.ui('buy');
    cleanup(); ui.close('title'); openSelect(game);
  };
  const toggleFs = () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen?.().catch?.(() => { });
      else document.documentElement.requestFullscreen?.().catch?.(() => { });
    } catch (e) { /* ignore */ }
  };
  const resync = () => { prev = padSnap(game); lastTick = performance.now(); syncSound(); };
  const open = (fn) => fn(game, resync);

  const onKey = (e) => {
    if (e.code !== 'Space' || ui.top()?.id !== 'title' || e.repeat) return;
    e.preventDefault();
    const f = ui.focusEl; if (f && root?.contains(f)) f.click(); else start('kbm');
  };
  const onFs = () => {
    const b = root?.querySelector('[data-act=fullscreen]'); if (!b) return;
    const on = !!document.fullscreenElement;
    b.setAttribute('aria-pressed', String(on)); b.querySelector('.ic').innerHTML = on ? ICONS.exitfs : ICONS.fullscreen;
    b.setAttribute('aria-label', on ? tx('title.exitFullscreen') : tx('title.fullscreen')); b.querySelector('.lbl').textContent = on ? tx('title.exitFullscreen') : tx('title.fullscreen');
  };
  const syncSound = () => {
    const b = root?.querySelector('[data-act=sound]'); if (!b) return;
    const on = !game.audio?.muted, label = on ? tx('title.soundOn') : tx('title.soundOff');
    b.setAttribute('aria-pressed', String(on)); b.classList.toggle('off', !on);
    b.querySelector('.ic').innerHTML = on ? ICONS.soundOn : ICONS.soundOff;
    b.setAttribute('aria-label', label); b.title = label; b.querySelector('.lbl').textContent = label;
  };
  const toggleSound = () => { game.audio?.setMuted(!game.audio.muted); saveSettings(); syncSound(); };
  // "Xbox controller highly recommended": shown only while no controller is connected.
  const syncPadNote = () => {
    const note = root?.querySelector('.title-pad-note'); if (!note) return;
    note.hidden = [...(navigator.getGamepads?.() || [])].some(Boolean);
  };
  const onPads = () => setTimeout(syncPadNote, 0);
  const cleanup = () => {
    window.removeEventListener('keydown', onKey); document.removeEventListener('fullscreenchange', onFs);
    window.removeEventListener('gamepadconnected', onPads); window.removeEventListener('gamepaddisconnected', onPads);
  };

  const util = (act, label, icon, fn) => h('button', { class: 'util-btn', 'data-act': act, 'aria-label': label, title: label, onclick: fn },
    h('span', { class: 'ic', html: icon }), h('span', { class: 'lbl', 'aria-hidden': 'true' }, label));

  ui.open('title', (el) => {
    const save = game.save.data;
    root = el; el.classList.add('title-screen');
    el.append(
      h('div', { class: 'title-backdrop', 'aria-hidden': 'true' }),
      h('div', { class: 'title-vignette', 'aria-hidden': 'true' }),
      h('div', { class: 'title-center' },
        makeLogo(),
        h('button', { class: 'press-start', 'data-autofocus': true, onclick: () => start() }, h('span', {}, tx('title.pressStart'))),
        h('div', { class: 'title-hint', 'aria-live': 'polite' }, hintText()),
        h('div', { class: 'title-pad-note', html: ICONS.pad + ' ' + tx('title.padNote') })),
      h('div', { class: 'title-foot' }, tx('title.footer', { level: save.level, coins: save.coins })),
      h('div', { class: 'title-utils', role: 'group', 'aria-label': tx('title.options') },
        util('instructions', tx('title.instructions'), ICONS.instructions, () => open(openInstructions)),
        util('settings', tx('title.settings'), ICONS.settings, () => open(openSettings)),
        settings.debug ? util('debug', tx('title.debug'), ICONS.settings, () => openDebugMenu(game)) : null,
        util('sound', tx('title.soundOn'), ICONS.soundOn, toggleSound),
        util('fullscreen', tx('title.fullscreen'), ICONS.fullscreen, toggleFs)));
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFs);
    window.addEventListener('gamepadconnected', onPads); window.addEventListener('gamepaddisconnected', onPads);
    onFs(); syncSound(); syncPadNote();
  }, {
    onClose: cleanup,
    onNav: (m) => {
      const now = performance.now();
      if (now - lastTick > 150) prev = padSnap(game);    // a dialog was on top: forget what was held
      lastTick = now;
      const cur = padSnap(game);
      let fresh = null, stick = false;
      const freshBtn = (i) => { for (const [id, c] of cur) if (c.b[i] && !(prev.get(id)?.b[i] ?? c.b[i])) return id; return null; };
      for (const [id, c] of cur) {
        const p = prev.get(id);
        if (c.stick > 0.6) stick = true;
        if (p) for (let i = 0; i < c.b.length; i++) if (c.b[i] && !p.b[i]) { fresh = id; }
      }
      const padBack = freshBtn(1);
      prev = cur;
      const kb = m.keyboard;
      if (mode === 'idle') {
        if (stick || kb.up || kb.down || kb.left || kb.right) setMode('nav');
        else if (fresh) { start(fresh); return; }
        // pads do nothing else while idle; the keyboard keeps normal navigation
        Object.assign(m, kb, { start: false, device: kb.confirm ? 'kbm' : null });
      } else {
        if (m.start) { start(m.device); return; }
        if (padBack) { setMode('idle'); ui.setFocus(root.querySelector('.press-start')); m.back = false; }
      }
    },
  });
}
