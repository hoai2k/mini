// Settings (title and pause): Audio, Gameplay, Graphics and Data tabs. Every
// control works with a controller: up/down moves, left/right changes a slider,
// A toggles. Values persist through settings.js.
import { h, toast, confirmDialog } from './ui.js';
import { settings, saveSettings, resetSettings } from '../settings.js';
import { QUALITY_LABEL } from '../gfx/renderer.js';
import { openDebugMenu } from './debugMenu.js';
import { t } from '../text_config.js';

let tab = 'audio';

export function openSettings(game, onClose) {
  const ui = game.ui;
  const close = () => { ui.close('settings'); onClose?.(); };
  ui.open('settings', (el) => {
    const gr = game.gr;
    const row = (label, input, out) => {
      // the control is named by its row's label (for screen readers)
      for (const c of [input, out]) if (c?.setAttribute && c.tagName !== 'OUTPUT') c.setAttribute('aria-label', label);
      return h('div', { class: 'setting' }, h('label', {}, label), h('div', { class: 'ctl' }, input, out ?? null));
    };
    const check = (key, after) => { const i = h('input', { type: 'checkbox', 'aria-label': key }); i.checked = !!settings[key]; i.addEventListener('change', () => { settings[key] = i.checked; saveSettings(); after?.(i.checked); }); return i; };
    const range = (key, min, max, step, after, fmt = (v) => Math.round(v * 100) + '%') => {
      const i = h('input', { type: 'range', min, max, step, value: settings[key], 'aria-label': key });
      const out = h('output', {}, fmt(settings[key]));
      i.addEventListener('input', () => { settings[key] = Number(i.value); out.textContent = fmt(settings[key]); saveSettings(); after?.(Number(i.value)); });
      return [i, out];
    };
    const rrow = (label, ...a) => { const [i, o] = range(...a); return row(label, i, o); };
    const select = (key, opts, after) => {
      const s = h('select', {}, ...opts.map(([v, text]) => { const o = h('option', { value: v }, text); if (String(settings[key]) === String(v)) o.selected = true; return o; }));
      s.addEventListener('change', () => { settings[key] = s.value; saveSettings(); after?.(s.value); }); return s;
    };
    const tabs = h('div', { class: 'tabs', role: 'tablist' }, ...[['audio', t('settings.tabs.audio')], ['game', t('settings.tabs.game')], ['graphics', t('settings.tabs.graphics')], ['data', t('settings.tabs.data')]].map(([id, text]) =>
      h('button', { class: 'tab' + (tab === id ? ' on' : ''), role: 'tab', 'aria-selected': String(tab === id), onclick: () => { tab = id; ui.refresh('settings'); } }, text)));
    const body = h('div', { class: 'set-body' });
    if (tab === 'audio') {
      body.append(
        rrow(t('settings.audio.master'), 'master', 0, 1, 0.05, () => game.audio?.applyVolumes()),
        rrow(t('settings.audio.music'), 'music', 0, 1, 0.05, () => game.audio?.applyVolumes()),
        rrow(t('settings.audio.sfx'), 'sfx', 0, 1, 0.05, () => game.audio?.applyVolumes()),
        row(t('settings.audio.vibration'), check('vibration')),
      );
    } else if (tab === 'game') {
      body.append(
        rrow(t('settings.game.shake'), 'shake', 0, 1.5, 0.1, (v) => { game.rig.shakeScale = v; }, (v) => (v === 0 ? t('settings.game.off') : Math.round(v * 100) + '%')),
        row(t('settings.game.hitstop'), check('hitstop')),
        row(t('settings.game.slowmo'), check('slowmo')),
        row(t('settings.game.battleSense'), check('battleSense')),
        row(t('settings.game.greekText'), check('greekText')),
        row(t('settings.game.reduceMotion'), check('reduceMotion')),
        row(t('settings.game.damageNumbers'), check('damageNumbers')),
        row(t('settings.game.rightStick'), select('rightStick', [['dodge', t('settings.game.rightStickDodge')], ['aim', t('settings.game.rightStickAim')]])),
        row(t('settings.game.cameraRotate'), check('cameraRotate')),
        rrow(t('settings.game.zoom'), 'cameraZoom', 12, 42, 1, (v) => { game.rig.zoomTarget = v; }, (v) => String(Math.round(v))),
      );
    } else if (tab === 'graphics') {
      const info = gr.info;
      body.append(
        h('div', { class: 'hint', style: 'margin:0 0 8px' }, t('settings.graphics.info', { gpu: info.name, backend: gr.backend, tier: QUALITY_LABEL[info.tier] })),
        row(t('settings.graphics.quality'), select('quality', [['auto', t('settings.graphics.auto', { tier: QUALITY_LABEL[info.tier] })], ['low', QUALITY_LABEL.low], ['medium', QUALITY_LABEL.medium], ['high', QUALITY_LABEL.high], ['ultra', QUALITY_LABEL.ultra + (gr.backend === 'WebGPU' ? '' : t('settings.graphics.webgl2'))]], (v) => { game.applyQuality(v); game.autoTierStepDown(); })),
        row(t('settings.graphics.dynRes'), check('dynRes', (v) => { gr.dynRes = v; if (!v) { gr.scale = 1; gr.applyPixelRatio(); } })),
        row(t('settings.graphics.motionBlur'), check('motionBlur', (v) => { gr.motionBlur = v; gr.buildPipeline(); })),
        row(t('settings.graphics.showFps'), check('showFps', (v) => game.setReadout?.(v))),
        row(t('settings.graphics.forceWebGL'), check('forceWebGL', () => { })),
        h('div', { class: 'hint' }, t('settings.graphics.hint')),
        h('div', { class: 'row', style: 'margin-top:8px' }, game.openPhotoMode ? h('button', { class: 'btn small', onclick: () => game.openPhotoMode?.() }, t('settings.graphics.photoMode')) : null, settings.forceWebGL !== game.startedWebGL ? h('button', { class: 'btn small primary', onclick: () => location.reload() }, t('settings.graphics.reload')) : null),
      );
    } else {
      body.append(
        h('div', { class: 'hint', style: 'margin:0 0 8px' }, t('settings.data.hint')),
        row(t('settings.data.resetSettings'), h('button', { class: 'btn small', onclick: () => { resetSettings(); game.rig && (game.rig.shakeScale = settings.shake); game.audio?.applyVolumes(); toast(t('settings.data.settingsReset')); ui.refresh('settings'); } }, t('settings.data.resetToDefaults'))),
        row(t('settings.data.saves'), h('button', { class: 'btn small', onclick: () => import('./saves.js').then((m) => m.openSaves(game)) }, t('settings.data.savesButton'))),   // net: save slots (make active, rename, delete, new game)
        // the opening (Manhattan, the museum, Half-Blood Hill): skip straight to camp
        game.opening && !game.opening.done && !game.online?.isGuest ? row(t('settings.data.opening'), h('button', { class: 'btn small', onclick: () => confirmDialog(game, {
          title: t('settings.data.skipTitle'), text: t('settings.data.skipText'), yes: t('settings.data.skipYes'), no: t('settings.data.skipNo'),
          onYes: () => { game.opening.skip(); toast(t('settings.data.skipped')); if (ui.isOpen('settings')) ui.refresh('settings'); },
        }) }, t('settings.data.skipButton'))) : null,
        // for testing levels and cutscenes: the menu shows on the title and pause screens too
        row(t('settings.data.debug'), check('debug', () => { ui.refresh('settings'); if (ui.isOpen('title')) ui.refresh('title'); })),
        settings.debug ? row(t('settings.data.debugMenu'), h('button', { class: 'btn small', onclick: () => openDebugMenu(game) }, t('settings.data.scenes'))) : null,
        row(t('settings.data.erase'), h('button', { class: 'btn small danger', onclick: () => confirmDialog(game, {
          title: t('settings.data.eraseTitle'), text: t('settings.data.eraseText'), yes: t('settings.data.eraseYes'), no: t('settings.data.eraseNo'), danger: true,
          onYes: () => { game.save.reset(); toast(t('settings.data.erased')); if (ui.isOpen('title')) ui.refresh('title'); },
        }) }, t('settings.data.resetSave'))),
      );
    }
    el.appendChild(h('div', { class: 'panel set-panel', role: 'dialog', 'aria-label': t('settings.title'), 'aria-modal': 'true', style: 'width:min(660px,96vw)' }, h('h2', {}, t('settings.title')), tabs, body,
      h('div', { class: 'row', style: 'margin-top:12px;justify-content:flex-end' }, h('button', { class: 'btn primary', onclick: close }, t('settings.done')))));
  }, { dim: true, onBack: close });
}
