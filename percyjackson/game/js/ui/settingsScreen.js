// Settings (title and pause): Audio, Gameplay, Graphics and Data tabs. Every
// control works with a controller: up/down moves, left/right changes a slider,
// A toggles. Values persist through settings.js.
import { h, toast, confirmDialog } from './ui.js';
import { settings, saveSettings, resetSettings } from '../settings.js';
import { QUALITY_LABEL } from '../gfx/renderer.js';

let tab = 'audio';

export function openSettings(game, onClose) {
  const ui = game.ui;
  const close = () => { ui.close('settings'); onClose?.(); };
  ui.open('settings', (el) => {
    const gr = game.gr;
    const row = (label, input, out) => h('div', { class: 'setting' }, h('label', {}, label), h('div', { class: 'ctl' }, input, out ?? null));
    const check = (key, after) => { const i = h('input', { type: 'checkbox', 'aria-label': key }); i.checked = !!settings[key]; i.addEventListener('change', () => { settings[key] = i.checked; saveSettings(); after?.(i.checked); }); return i; };
    const range = (key, min, max, step, after, fmt = (v) => Math.round(v * 100) + '%') => {
      const i = h('input', { type: 'range', min, max, step, value: settings[key], 'aria-label': key });
      const out = h('output', {}, fmt(settings[key]));
      i.addEventListener('input', () => { settings[key] = Number(i.value); out.textContent = fmt(settings[key]); saveSettings(); after?.(Number(i.value)); });
      return [i, out];
    };
    const rrow = (label, ...a) => { const [i, o] = range(...a); return row(label, i, o); };
    const select = (key, opts, after) => {
      const s = h('select', {}, ...opts.map(([v, t]) => { const o = h('option', { value: v }, t); if (String(settings[key]) === String(v)) o.selected = true; return o; }));
      s.addEventListener('change', () => { settings[key] = s.value; saveSettings(); after?.(s.value); }); return s;
    };
    const tabs = h('div', { class: 'tabs', role: 'tablist' }, ...[['audio', 'Audio'], ['game', 'Gameplay'], ['graphics', 'Graphics'], ['data', 'Data']].map(([id, t]) =>
      h('button', { class: 'tab' + (tab === id ? ' on' : ''), role: 'tab', 'aria-selected': String(tab === id), onclick: () => { tab = id; ui.refresh('settings'); } }, t)));
    const body = h('div', { class: 'set-body' });
    if (tab === 'audio') {
      body.append(
        rrow('Master volume', 'master', 0, 1, 0.05, () => game.audio?.applyVolumes()),
        rrow('Music', 'music', 0, 1, 0.05, () => game.audio?.applyVolumes()),
        rrow('Sound effects', 'sfx', 0, 1, 0.05, () => game.audio?.applyVolumes()),
        row('Controller vibration', check('vibration')),
      );
    } else if (tab === 'game') {
      body.append(
        rrow('Screen shake', 'shake', 0, 1.5, 0.1, (v) => { game.rig.shakeScale = v; }, (v) => (v === 0 ? 'Off' : Math.round(v * 100) + '%')),
        row('Hit-stop pauses', check('hitstop')),
        row('Slow-motion moments', check('slowmo')),
        row('Battle Sense (slow time on a perfect dodge)', check('battleSense')),
        row('Greek text effect (letters settle into English)', check('greekText')),
        row('Reduce motion', check('reduceMotion')),
        row('Damage numbers', check('damageNumbers')),
        row('Camera rotation (Z / C)', check('cameraRotate')),
        rrow('Default zoom', 'cameraZoom', 12, 42, 1, (v) => { game.rig.zoomTarget = v; }, (v) => String(Math.round(v))),
      );
    } else if (tab === 'graphics') {
      const info = gr.info;
      body.append(
        h('div', { class: 'hint', style: 'margin:0 0 8px' }, `GPU: ${info.name} · Backend: ${gr.backend} · Detected tier: ${QUALITY_LABEL[info.tier]}`),
        row('Quality', select('quality', [['auto', `Auto (${QUALITY_LABEL[info.tier]})`], ['low', QUALITY_LABEL.low], ['medium', QUALITY_LABEL.medium], ['high', QUALITY_LABEL.high], ['ultra', QUALITY_LABEL.ultra + (gr.backend === 'WebGPU' ? '' : ' (WebGL2)')]], (v) => game.applyQuality(v))),
        row('Dynamic resolution', check('dynRes', (v) => { gr.dynRes = v; if (!v) { gr.scale = 1; gr.applyPixelRatio(); } })),
        row('Motion blur (Ultra)', check('motionBlur', (v) => { gr.motionBlur = v; gr.buildPipeline(); })),
        row('Show FPS / mode', check('showFps', (v) => game.setReadout?.(v))),
        row('Force WebGL2 (reload)', check('forceWebGL', () => { })),
        h('div', { class: 'hint' }, 'Ultra uses WebGPU: light bounce, reflections, soft shadows and depth of field. High: soft shadows, ambient occlusion, bloom and water reflections. Resolution drops automatically before effects if FPS falls below target.'),
        h('div', { class: 'row', style: 'margin-top:8px' }, game.openPhotoMode ? h('button', { class: 'btn small', onclick: () => game.openPhotoMode?.() }, 'Photo mode') : null, settings.forceWebGL !== game.startedWebGL ? h('button', { class: 'btn small primary', onclick: () => location.reload() }, 'Reload to apply') : null),
      );
    } else {
      body.append(
        h('div', { class: 'hint', style: 'margin:0 0 8px' }, 'Settings are saved in this browser. Your progress (heroes, drachmas, completed chapters) is saved separately.'),
        row('Reset settings', h('button', { class: 'btn small', onclick: () => { resetSettings(); game.rig && (game.rig.shakeScale = settings.shake); game.audio?.applyVolumes(); toast('Settings reset'); ui.refresh('settings'); } }, 'Reset to defaults')),
        row('Saves', h('button', { class: 'btn small', onclick: () => import('./saves.js').then((m) => m.openSaves(game)) }, 'Saves…')),   // net: save slots (make active, rename, delete, new game)
        // the opening (Manhattan, the museum, Half-Blood Hill): skip straight to camp
        game.opening && !game.opening.done && !game.online?.isGuest ? row('The opening', h('button', { class: 'btn small', onclick: () => confirmDialog(game, {
          title: 'Skip the opening?', text: 'You go straight to Camp Half-Blood. Chapters 1 and 2 can still be played from their quest markers and the chapter map.', yes: 'Skip to camp', no: 'Keep the story',
          onYes: () => { game.opening.skip(); toast('The opening is skipped: welcome to camp'); if (ui.isOpen('settings')) ui.refresh('settings'); },
        }) }, 'Skip the opening…')) : null,
        row('Erase progress', h('button', { class: 'btn small danger', onclick: () => confirmDialog(game, {
          title: 'Erase all progress?', text: 'The main profile of the active save loses its heroes, drachmas, loot and completed chapters. This cannot be undone.', yes: 'Erase everything', no: 'Keep my progress', danger: true,
          onYes: () => { game.save.reset(); toast('Progress erased'); if (ui.isOpen('title')) ui.refresh('title'); },
        }) }, 'Reset save…')),
      );
    }
    el.appendChild(h('div', { class: 'panel set-panel', role: 'dialog', 'aria-label': 'Settings', 'aria-modal': 'true', style: 'width:min(660px,96vw)' }, h('h2', {}, 'Settings'), tabs, body,
      h('div', { class: 'row', style: 'margin-top:12px;justify-content:flex-end' }, h('button', { class: 'btn primary', onclick: close }, 'Done'))));
  }, { dim: true, onBack: close });
}
