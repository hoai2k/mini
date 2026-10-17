// Instructions: objective, rules, tips, an Xbox controller diagram with a
// callout for every action, and text tables of the controller and keyboard /
// mouse mappings. Scrolls with the controller (stick or D-pad).
import { h } from './ui.js';
import { t } from '../text_config.js';

const GOLD = '#c9963a';
// [side, key, value, sub, from(x,y), to(x,y), text y]
const L = (key, val, fx, fy, ty, sub) => ({ side: 'l', key, val, fx, fy, ty, sub });
const R = (key, val, fx, fy, ty, sub) => ({ side: 'r', key, val, fx, fy, ty, sub });
const CALLOUTS = [
  L('LT', t('instructions.callouts.lt'), 162, 20, 20),
  L('LB', t('instructions.callouts.lb'), 150, 45, 62, [t('instructions.callouts.lbSub')]),
  L(t('instructions.pad.leftStick'), t('instructions.callouts.leftStick'), 168, 125, 126, [t('instructions.callouts.leftStickSub')]),
  L(t('instructions.pad.dpad'), t('instructions.callouts.dpad'), 246, 182, 200, t('instructions.callouts.dpadSub')),
  R('RT', t('instructions.callouts.rt'), 480, 20, 20),
  R('RB', t('instructions.callouts.rb'), 490, 45, 62),
  R('Y', t('instructions.callouts.y'), 466, 100, 102),
  R('B', t('instructions.callouts.b'), 496, 128, 140),
  R('A', t('instructions.callouts.a'), 466, 158, 188, [t('instructions.callouts.aSub')]),
];
function callout(c) {
  const left = c.side === 'l';
  const tx = left ? 28 : 612, anchor = left ? 'end' : 'start';
  const lx = left ? 34 : 606;
  const subs = (c.sub ?? []).map((s, i) => `<tspan x="${tx}" dy="17" class="s">${s}</tspan>`).join('');
  return `<line x1="${c.fx}" y1="${c.fy}" x2="${lx}" y2="${c.ty - 5}" class="ld"/><circle cx="${c.fx}" cy="${c.fy}" r="3" class="dot"/>` +
    `<text x="${tx}" y="${c.ty}" text-anchor="${anchor}"><tspan class="k">${c.key}</tspan><tspan class="v"> · ${c.val}</tspan>${subs}</text>`;
}
function padSvg() {
  return `<svg viewBox="0 0 1010 450" role="img" aria-label="${t('instructions.pad.aria')}">
  <style>
    .ld{stroke:${GOLD};stroke-width:1.3;opacity:.7} .dot{fill:${GOLD}} text{font:600 15px 'Alegreya Sans',system-ui,sans-serif;fill:#f4ead5}
    .k{font-weight:800;fill:#f0c867} .s{fill:#d9cdb2;font-weight:500;font-size:14px} .body{fill:#17130f;stroke:${GOLD};stroke-width:3} .part{fill:#241d14;stroke:${GOLD};stroke-width:1.8}
    .btn-l{font:800 15px 'Alegreya Sans',sans-serif;text-anchor:middle} .sm{font:700 10px 'Alegreya Sans',sans-serif;fill:#f0c867;text-anchor:middle}
  </style>
  <g transform="translate(190 100)">
    <path class="body" d="M180 70 Q320 40 460 70 Q540 80 570 190 Q590 270 530 270 Q490 270 460 220 L180 220 Q150 270 110 270 Q50 270 70 190 Q100 80 180 70 Z"/>
    <rect class="part" x="160" y="8" width="52" height="22" rx="8"/><text class="sm" x="186" y="23">LT</text>
    <rect class="part" x="428" y="8" width="52" height="22" rx="8"/><text class="sm" x="454" y="23">RT</text>
    <rect class="part" x="148" y="36" width="74" height="18" rx="8"/><text class="sm" x="185" y="49">LB</text>
    <rect class="part" x="418" y="36" width="74" height="18" rx="8"/><text class="sm" x="455" y="49">RB</text>
    <circle class="part" cx="190" cy="125" r="23"/><circle cx="190" cy="125" r="11" fill="none" stroke="${GOLD}" stroke-width="1.5"/>
    <circle class="part" cx="380" cy="190" r="21"/><circle cx="380" cy="190" r="10" fill="none" stroke="${GOLD}" stroke-width="1.5"/>
    <path class="part" d="M240 183h16v-16h16v16h16v16h-16v16h-16v-16h-16z" transform="translate(-2 0)"/>
    <circle cx="450" cy="100" r="15" fill="#e8b830"/><text class="btn-l" x="450" y="105" fill="#17130f" style="fill:#17130f">Y</text>
    <circle cx="420" cy="128" r="15" fill="#3d7bd9"/><text class="btn-l" x="420" y="133" style="fill:#fff">X</text>
    <circle cx="480" cy="128" r="15" fill="#d9443d"/><text class="btn-l" x="480" y="133" style="fill:#fff">B</text>
    <circle cx="450" cy="156" r="15" fill="#4caf50"/><text class="btn-l" x="450" y="161" style="fill:#fff">A</text>
    <rect class="part" x="299" y="110" width="17" height="10" rx="4"/><rect x="331" y="110" width="17" height="10" rx="4" fill="${GOLD}"/>
    ${CALLOUTS.map(callout).join('')}
    <!-- X and right stick, below the pad -->
    <line class="ld" x1="420" y1="143" x2="446" y2="270"/><circle class="dot" cx="420" cy="143" r="3"/>
    <text x="450" y="290" text-anchor="start"><tspan class="k">X</tspan><tspan class="v"> · ${t('instructions.pad.melee')}</tspan><tspan x="450" dy="17" class="s">${t('instructions.pad.meleeSub')}</tspan></text>
    <line class="ld" x1="372" y1="209" x2="338" y2="270"/><circle class="dot" cx="372" cy="209" r="3"/>
    <text x="334" y="290" text-anchor="end"><tspan class="k">${t('instructions.pad.rightStick')}</tspan><tspan class="v"> · ${t('instructions.pad.rightStickFlick')}</tspan><tspan x="334" dy="17" class="s">${t('instructions.pad.rightStickAim')}</tspan><tspan x="334" dy="17" class="s">${t('instructions.pad.rightStickClick')}</tspan></text>

    <!-- View and Menu -->
    <line class="ld" x1="307" y1="109" x2="304" y2="8"/><line class="ld" x1="339" y1="109" x2="342" y2="8"/><circle class="dot" cx="307" cy="112" r="3"/><circle class="dot" cx="339" cy="112" r="3"/>
    <text x="298" y="6" text-anchor="end"><tspan class="k">${t('instructions.pad.view')}</tspan><tspan class="v"> · ${t('instructions.pad.viewMap')}</tspan></text>
    <text x="348" y="6" text-anchor="start"><tspan class="k">${t('instructions.pad.menu')}</tspan><tspan class="v"> · ${t('instructions.pad.menuPause')}</tspan></text>
  </g></svg>`;
}

// [action, controller, keyboard and mouse], from the text config
const TABLE = t('instructions.table');

export function openInstructions(game, onClose) {
  const ui = game.ui;
  const close = () => { ui.close('instructions'); onClose?.(); };
  let last = performance.now();
  ui.open('instructions', (el) => {
    const sec = (title, ...kids) => h('section', { class: 'ins-sec' }, h('h3', {}, title), ...kids);
    // text with **bold** runs
    const rich = (str) => str.split('**').map((part, i) => (i % 2 ? h('b', {}, part) : part));
    const body = h('div', { class: 'ins-scroll', tabindex: 0, 'aria-label': t('instructions.title') },
      sec(t('instructions.quest.heading'),
        h('p', {}, ...rich(t('instructions.quest.objective'))),
        h('p', {}, ...rich(t('instructions.quest.winning'))),
        h('p', {}, ...rich(t('instructions.quest.heroes')))),
      sec(t('instructions.tips.heading'), h('ul', { class: 'tips' },
        ...['trueSight', 'battleSense', 'switching', 'reviving', 'godly', 'ambrosia', 'ammo', 'gear'].map((k) => h('li', {}, ...rich(t(`instructions.tips.${k}`)))))),
      sec(t('instructions.pad.heading'), h('div', { class: 'pad-diagram', html: padSvg() })),
      sec(t('instructions.controls.heading'),
        h('div', { class: 'tbl-wrap' }, h('table', { class: 'map-table' },
          h('thead', {}, h('tr', {}, h('th', {}, t('instructions.controls.action')), h('th', {}, t('instructions.controls.controller')), h('th', {}, t('instructions.controls.keyboard')))),
          h('tbody', {}, ...TABLE.map(([a, c, k]) => h('tr', {}, h('td', {}, a), h('td', {}, c), h('td', {}, k))))))),
      sec(t('instructions.together.heading'),
        h('p', {}, ...rich(t('instructions.together.join'))),
        h('p', {}, ...rich(t('instructions.together.touch')))));
    el.appendChild(h('div', { class: 'panel ins-panel', role: 'dialog', 'aria-label': t('instructions.title'), 'aria-modal': 'true' },
      h('h2', {}, t('instructions.heading')), body,
      h('div', { class: 'row', style: 'justify-content:space-between;margin-top:10px' }, h('span', { class: 'hint', style: 'margin:0' }, t('instructions.scrollHint')),
        h('button', { class: 'btn primary', 'data-autofocus': true, onclick: close }, t('instructions.close')))));
  }, {
    dim: true, onBack: close, onClose: () => { /* keep */ },
    onNav: (m) => {
      const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
      const sc = ui.top()?.el.querySelector('.ins-scroll'); if (!sc) return;
      let dy = 0;
      const k = game.input.keys;
      if (k.has('ArrowDown') || k.has('KeyS')) dy += 1; if (k.has('ArrowUp') || k.has('KeyW')) dy -= 1;
      for (const p of game.input.pads()) {
        const ay = Math.abs(p.axes[1] ?? 0) > 0.25 ? p.axes[1] : 0, ry = Math.abs(p.axes[3] ?? 0) > 0.25 ? p.axes[3] : 0;
        dy += ay + ry + (p.buttons[13]?.pressed ? 1 : 0) - (p.buttons[12]?.pressed ? 1 : 0);
      }
      if (dy) sc.scrollTop += Math.max(-2, Math.min(2, dy)) * 560 * dt;
      m.up = m.down = false;
    },
  });
}
