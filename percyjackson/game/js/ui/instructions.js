// Instructions: objective, rules, tips, an Xbox controller diagram with a
// callout for every action, and text tables of the controller and keyboard /
// mouse mappings. Scrolls with the controller (stick or D-pad).
import { h } from './ui.js';

const GOLD = '#c9963a';
// [side, key, value, sub, from(x,y), to(x,y), text y]
const L = (key, val, fx, fy, ty, sub) => ({ side: 'l', key, val, fx, fy, ty, sub });
const R = (key, val, fx, fy, ty, sub) => ({ side: 'r', key, val, fx, fy, ty, sub });
const CALLOUTS = [
  L('LT', 'Ambrosia (heal)', 162, 20, 20),
  L('LB', 'Ability 2', 150, 45, 62, ['Y + LB together: godly power']),
  L('Left stick', 'Move', 168, 125, 126, ['click: show the way']),
  L('D-pad', '↑ Inventory', 246, 182, 200, ['↓ Switch hero', '← → Magic items']),
  R('RT', 'Ranged attack', 480, 20, 20),
  R('RB', 'Ability 3', 490, 45, 62),
  R('Y', 'Ability 1', 466, 100, 102),
  R('B', 'Dodge forward', 496, 128, 140),
  R('A', 'Jump', 466, 158, 188, ['Interact when a prompt shows']),
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
  return `<svg viewBox="0 0 1010 450" role="img" aria-label="Xbox controller diagram. Left stick moves, click it to show the way. Right stick flicks a dodge, click it for True Sight. A jump, and interact when a prompt shows. X melee attack, in the air a jump slam. Y, LB and RB abilities 1, 2 and 3; Y plus LB together godly power. B dodge forward. LT Ambrosia, RT ranged. D-pad up inventory, down switch hero, left and right magic items. View map, Menu pause.">
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
    <text x="450" y="290" text-anchor="start"><tspan class="k">X</tspan><tspan class="v"> · Melee attack</tspan><tspan x="450" dy="17" class="s">In the air: jump slam</tspan></text>
    <line class="ld" x1="372" y1="209" x2="338" y2="270"/><circle class="dot" cx="372" cy="209" r="3"/>
    <text x="334" y="290" text-anchor="end"><tspan class="k">Right stick</tspan><tspan class="v"> · Flick to dodge</tspan><tspan x="334" dy="17" class="s">(or aim: Settings)</tspan><tspan x="334" dy="17" class="s">click: True Sight</tspan></text>

    <!-- View and Menu -->
    <line class="ld" x1="307" y1="109" x2="304" y2="8"/><line class="ld" x1="339" y1="109" x2="342" y2="8"/><circle class="dot" cx="307" cy="112" r="3"/><circle class="dot" cx="339" cy="112" r="3"/>
    <text x="298" y="6" text-anchor="end"><tspan class="k">View</tspan><tspan class="v"> · Map</tspan></text>
    <text x="348" y="6" text-anchor="start"><tspan class="k">Menu</tspan><tspan class="v"> · Pause</tspan></text>
  </g></svg>`;
}

const TABLE = [
  ['Move', 'Left stick', 'W A S D (or the arrow keys)'],
  ['Aim', 'Auto-aim (right stick in Settings → aim)', 'Mouse'],
  ['Melee attack', 'X', 'Left click'],
  ['Attack in place (stand still, face the cursor)', '—', 'Hold Shift'],
  ['Jump slam', 'X in the air after a jump', 'Q'],
  ['Jump', 'A', 'Space'],
  ['Ranged attack', 'RT', 'Right click'],
  ['Dodge (perfect dodge triggers Battle Sense)', 'B (forward), or flick the right stick (that way)', 'R or Mouse 4 (toward the cursor), Mouse 5 (forward)'],
  ['Abilities 1 · 2 · 3', 'Y · LB · RB', '1 · 2 · 3'],
  ['Godly power (when the Power bar is full)', 'Y + LB together', '4, or 1 + 2 together'],
  ['True Sight (see through the Mist)', 'Click the right stick', 'V'],
  ['Show the way to the goal', 'Click the left stick', 'Middle click'],
  ['Interact (talk, open, use)', 'A when a prompt shows', 'Left click when a prompt shows'],
  ['Ambrosia (heal)', 'LT', 'E'],
  ['Switch hero (hold for a radial)', 'D-pad ↓', 'F'],
  ['Magic items', 'D-pad ← · →', 'Z · X'],
  ['Inventory (equip, enchant, salvage)', 'D-pad ↑', 'I or Tab'],
  ['Map (in camp: the chapter map)', 'View', 'M (chapter map: J)'],
  ['Pause', 'Menu', 'Esc'],
  ['Turn the camera (if on in Settings)', '—', '[ · ]'],
  ['Menus', 'D-pad or left stick, A confirm, B back', 'Arrow keys or WASD, Enter, Esc, or the mouse'],
];

export function openInstructions(game, onClose) {
  const ui = game.ui;
  const close = () => { ui.close('instructions'); onClose?.(); };
  let last = performance.now();
  ui.open('instructions', (el) => {
    const sec = (title, ...kids) => h('section', { class: 'ins-sec' }, h('h3', {}, title), ...kids);
    const body = h('div', { class: 'ins-scroll', tabindex: 0, 'aria-label': 'Instructions' },
      sec('Your quest',
        h('p', {}, h('b', {}, 'Objective. '), 'You are a demigod. Clear each chapter: defeat the monsters, see through the Mist, solve the myth that beats the boss, and fulfil the prophecy line by line. Between quests you train at Camp Half-Blood.'),
        h('p', {}, h('b', {}, 'Winning. '), 'Finish the chapter\'s goal, defeat its boss and reach the exit. ', h('b', {}, 'Losing. '), 'If every hero is knocked out, the chapter ends and you can try again. Monsters burst into golden dust, and nobody gets hurt for real.'),
        h('p', {}, h('b', {}, 'Heroes. '), 'Every hero plays differently: a melee combo, a ranged move, three abilities, a dodge roll and a godly power. Play alone with up to two companions, or with up to four players on one screen.')),
      sec('Tips', h('ul', { class: 'tips' },
        h('li', {}, h('b', {}, 'True Sight'), ' (click the right stick, or V) rewrites the world in the gods\' gold-and-teal style. Disguised monsters show their true form, and hidden doors and paths appear. It drains the Sight meter and refills in the Mist.'),
        h('li', {}, h('b', {}, 'Battle Sense. '), 'Dodge the instant before a hit lands and time slows for the whole team. A meter stops it being spammed; you can switch it off in Settings.'),
        h('li', {}, h('b', {}, 'Switching heroes. '), 'Playing alone, press D-pad ↓ (or F) to take over a companion. Held, it opens a radial menu.'),
        h('li', {}, h('b', {}, 'Reviving. '), 'A downed teammate can be revived: stand next to them until the ring fills.'),
        h('li', {}, h('b', {}, 'Godly power. '), 'Fighting fills the Power bar. When it is full, press Y + LB together (or 4) to unleash your hero\'s godly power.'),
        h('li', {}, h('b', {}, 'Ambrosia'), ' (LT, or E) heals about two thirds of your health. You carry one square: after a bite it refills over about 20 seconds, shown round its icon, and the icon glows when it\'s ready and you\'re hurt. Gear with Hebe\'s Cup refills it faster. Collect drachmas to spend at the camp store.'),
        h('li', {}, h('b', {}, 'Ammo. '), 'The ranged attack (RT, or right click) shoots from a quiver of 20 (knives, water, notes… the count is next to its icon). A second after you stop shooting it refills, one shot every couple of seconds, and ammo bundles dropped by monsters, crates and chests top it up. Abilities don\'t use ammo.'),
        h('li', {}, h('b', {}, 'Gear. '), 'Press D-pad ↑ (or I) to open the inventory: equip what you find, spend enchantment points and salvage the rest. The forge in camp tempers and re-rolls items.'))),
      sec('Xbox controller', h('div', { class: 'pad-diagram', html: padSvg() })),
      sec('Controls',
        h('div', { class: 'tbl-wrap' }, h('table', { class: 'map-table' },
          h('thead', {}, h('tr', {}, h('th', {}, 'Action'), h('th', {}, 'Xbox controller'), h('th', {}, 'Keyboard and mouse'))),
          h('tbody', {}, ...TABLE.map(([a, c, k]) => h('tr', {}, h('td', {}, a), h('td', {}, c), h('td', {}, k))))))),
      sec('Playing together',
        h('p', {}, 'On the hero screen each player presses ', h('b', {}, 'A'), ' or ', h('b', {}, 'Start'), ' on their own controller to join (the keyboard player presses Enter). Pick a hero, press A to be ready. During play a controller can join by pressing Start.'),
        h('p', {}, h('b', {}, 'Touch. '), 'On a phone or tablet drag on the left to move; the buttons on the right attack, dodge and use abilities. Play in landscape.')));
    el.appendChild(h('div', { class: 'panel ins-panel', role: 'dialog', 'aria-label': 'Instructions', 'aria-modal': 'true' },
      h('h2', {}, 'How to Play'), body,
      h('div', { class: 'row', style: 'justify-content:space-between;margin-top:10px' }, h('span', { class: 'hint', style: 'margin:0' }, 'Scroll: stick, D-pad, arrow keys or mouse wheel · B or Esc to close'),
        h('button', { class: 'btn primary', 'data-autofocus': true, onclick: close }, 'Close'))));
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
