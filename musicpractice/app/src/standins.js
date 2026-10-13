// Stand-in art for each theme, drawn as SVG, shown until that theme's image
// is delivered (design/image-requests.md). The metronome layers carry the
// same anchor data as delivered images: canvas size, named points, swing.
// Gradients (#walnut, #brass, #cream, #gold, #lacquer, #ivory) are defined
// once in index.html.

const svg = (w, h, body) => `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true">${body}</svg>`;

// A fan of gold rays from (cx, cy) between two angles (degrees, 0 = up).
function rays(cx, cy, r, from, to, n, attrs) {
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a = ((from + ((to - from) * i) / n) * Math.PI) / 180;
    d += `M${cx} ${cy}L${(cx + r * Math.sin(a)).toFixed(1)} ${(cy - r * Math.cos(a)).toFixed(1)}`;
  }
  return `<path d="${d}" ${attrs}/>`;
}

/** The Tuner's home icon: a dial with its needle centred, and a tuning fork. */
function tunerIcon({ body, line, dial, needle, fork, accent, lineW = 2 }) {
  let ticks = '';
  for (let a = -60; a <= 60; a += 15) {
    const r = (a * Math.PI) / 180;
    const r1 = a === 0 ? 14 : 17;
    ticks += `M${(43 + r1 * Math.sin(r)).toFixed(1)} ${(64 - r1 * Math.cos(r)).toFixed(1)}L${(43 + 21 * Math.sin(r)).toFixed(1)} ${(64 - 21 * Math.cos(r)).toFixed(1)}`;
  }
  return svg(100, 100, `
    <path d="M77 14v38a5.5 5.5 0 0 0 11 0V14" fill="none" stroke="${fork}" stroke-width="3.6" stroke-linecap="round"/>
    <path d="M82.5 57.5V86" stroke="${fork}" stroke-width="4.4" stroke-linecap="round"/>
    <rect x="12" y="30" width="62" height="52" rx="11" fill="${body}" stroke="${line}" stroke-width="${lineW}"/>
    <path d="M19 66A24 24 0 0 1 67 66Z" fill="${dial}" stroke="${line}" stroke-width="${lineW * 0.6}"/>
    <path d="${ticks}" stroke="${line}" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M43 64V43" stroke="${needle}" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="43" cy="64" r="3.4" fill="${needle}"/>
    <circle cx="43" cy="74" r="3" fill="${accent}"/>`);
}

const CLASSIC = {
  'home-tuner': { html: tunerIcon({ body: 'url(#walnut)', line: '#3e2414', dial: 'url(#cream)', needle: '#9b6c25', fork: 'url(#brass)', accent: '#e5484d' }) },
  'home-metronome': { html: svg(100, 100, `
    <path d="M43 8h14l22 78H21z" fill="url(#walnut)"/>
    <path d="M46 16h8l15 58H31z" fill="url(#cream)"/>
    <path d="M47 24h6M47 32h6M47 40h6M47 48h6M47 56h6M47 64h6" stroke="#b08a5a" stroke-width="1.2"/>
    <path d="M50 74 L64 22" stroke="url(#brass)" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M58.5 39l6 1.6-2.4 7.5-5.7-1.5z" fill="url(#brass)"/>
    <circle cx="50" cy="74" r="3" fill="url(#brass)"/>
    <path d="M17 84h66v8H17z" fill="#3e2414"/>
    <path d="M70 18a20 20 0 0 1 6 10M74 13a26 26 0 0 1 8 14" fill="none" stroke="#f0cf7a" stroke-width="2" stroke-linecap="round" opacity=".7"/>`) },
  'home-record': { html: svg(100, 100, `
    <rect x="36" y="10" width="28" height="44" rx="14" fill="url(#brass)"/>
    <path d="M40 22h20M40 28h20M40 34h20M40 40h20" stroke="#7b5420" stroke-width="1.4" opacity=".7"/>
    <path d="M28 44a22 22 0 0 0 44 0" fill="none" stroke="#e9d9b9" stroke-width="4" stroke-linecap="round"/>
    <path d="M50 66v14M38 82h24" stroke="#e9d9b9" stroke-width="4" stroke-linecap="round"/>
    <circle cx="78" cy="24" r="9" fill="#e5484d"/>
    <circle cx="78" cy="24" r="13" fill="none" stroke="#e5484d" stroke-width="2" opacity=".4"/>
    <path d="M14 56c4-8 8 8 12 0" fill="none" stroke="#f0cf7a" stroke-width="2.4" stroke-linecap="round"/>`) },
  'metronome-body': {
    canvas: [800, 1200], anchors: { pivot: [400, 1000] },
    html: svg(800, 1200, `
      <path d="M362 40h76l242 1040H120z" fill="url(#walnut)"/>
      <path d="M376 110h48l182 860H194z" fill="#3a2214" opacity=".5"/>
      <path d="M384 128h32l168 820H216z" fill="url(#cream)"/>
      <path d="M370 220h60M376 300h48M370 380h60M376 460h48M370 540h60M376 620h48M370 700h60M376 780h48M370 860h60" stroke="#b08a5a" stroke-width="6" stroke-linecap="round"/>
      <path d="M90 1080h620v80H90z" fill="#3e2414"/>
      <path d="M120 1080h560" stroke="#a9744a" stroke-width="6"/>
      <circle cx="400" cy="1000" r="30" fill="#2a170c"/>`),
  },
  'metronome-pendulum': {
    canvas: [200, 1000], anchors: { hub: [100, 960] }, swing: 24,
    html: svg(200, 1000, `
      <rect x="93" y="30" width="14" height="930" rx="7" fill="url(#brass)"/>
      <path d="M58 262h84l-16 86H74z" fill="url(#brass)" stroke="#7b5420" stroke-width="4"/>
      <path d="M92 262h16v24H92z" fill="#7b5420"/>
      <circle cx="100" cy="960" r="26" fill="url(#brass)" stroke="#7b5420" stroke-width="4"/>`),
  },
};

const GOLD = 'stroke="url(#gold)"';

// A stepped (ziggurat) outline from its right half, mirrored about x = cx.
function stepped(right, cx) {
  const left = right.slice().reverse().map(([x, y]) => [2 * cx - x, y]);
  return 'M' + [...right, ...left].map(([x, y]) => `${x} ${y}`).join('L') + 'Z';
}
const TOWER = stepped([[428, 28], [428, 72], [450, 72], [520, 468], [542, 468], [614, 872], [636, 872], [676, 1080]], 400);

const DECO = {
  'home-tuner': { html: tunerIcon({ body: 'url(#lacquer)', line: 'url(#gold)', dial: 'url(#ivory)', needle: '#b8902a', fork: 'url(#gold)', accent: '#c0303a' }) },
  'home-metronome': { html: svg(100, 100, `
    <path d="M45 6h10v6h3l9 30h3l9 32h3l3 10H15l3-10h3l9-32h3l9-30h3z" fill="url(#lacquer)" ${GOLD} stroke-width="1.6" stroke-linejoin="miter"/>
    <path d="M47 16h6l14 58H33z" fill="url(#ivory)"/>
    <clipPath id="deco-home-face"><path d="M47 16h6l14 58H33z"/></clipPath>
    <g clip-path="url(#deco-home-face)">${rays(50, 74, 60, -40, 40, 10, `${GOLD} stroke-width=".9" opacity=".75"`)}</g>
    <path d="M50 74L62 24" ${GOLD} stroke-width="2.4" stroke-linecap="square"/>
    <path d="M56.6 35h6.4l-1 4h1.2l-1.3 5h-7.4l1.3-5h1.2z" fill="#111" ${GOLD} stroke-width="1"/>
    <circle cx="50" cy="74" r="3.2" fill="url(#gold)"/>
    <path d="M13 84h74v4H13zM9 88h82v5H9z" fill="#111" ${GOLD} stroke-width="1.2"/>
    <path d="M70 16a18 18 0 0 1 7 9M74 10a25 25 0 0 1 9 13" fill="none" ${GOLD} stroke-width="1.8"/>`) },
  'home-record': { html: svg(100, 100, `
    <rect x="35" y="8" width="30" height="46" rx="15" fill="url(#lacquer)" ${GOLD} stroke-width="2.4"/>
    <path d="M39 18h22M38 24h24M38 30h24M38 36h24M38 42h24M39 48h22" ${GOLD} stroke-width="1.2"/>
    <path d="M27 31v6a23 23 0 0 0 46 0v-6" fill="none" ${GOLD} stroke-width="2.6"/>
    <path d="M50 60v16" ${GOLD} stroke-width="3"/>
    <path d="M38 76h24v5H38zM32 81h36v6H32z" fill="#111" ${GOLD} stroke-width="1.2"/>
    <path d="M78 32l-11-11a15.5 15.5 0 0 1 22 0z" fill="#111" ${GOLD} stroke-width="1"/>
    ${rays(78, 32, 14, -42, 42, 6, `${GOLD} stroke-width=".8"`)}
    <path d="M78 22l5 5-5 5-5-5z" fill="#c0303a" stroke="#f0d78c" stroke-width=".8"/>
    <path d="M18 26a14 14 0 0 0 0 20M12 22a22 22 0 0 0 0 28" fill="none" ${GOLD} stroke-width="1.6"/>`) },
  'metronome-body': {
    canvas: [800, 1200], anchors: { pivot: [400, 1000] },
    html: svg(800, 1200, `
      <path d="${TOWER}" fill="url(#lacquer)" ${GOLD} stroke-width="8" stroke-linejoin="miter"/>
      <path d="${TOWER}" transform="translate(400 700) scale(.88 .9) translate(-400 -700)" fill="none" ${GOLD} stroke-width="2.5" opacity=".6" vector-effect="non-scaling-stroke"/>
      <clipPath id="deco-face"><path d="M388 118h24l150 822H238z"/></clipPath>
      <path d="M388 118h24l150 822H238z" fill="url(#ivory)"/>
      <g clip-path="url(#deco-face)">
        ${rays(400, 940, 820, -24, 24, 16, `${GOLD} stroke-width="4" opacity=".55"`)}
        <path d="M200 940a200 200 0 0 1 400 0z" fill="none" ${GOLD} stroke-width="5" opacity=".7"/>
        <path d="M280 940a120 120 0 0 1 240 0" fill="none" ${GOLD} stroke-width="4" opacity=".7"/>
      </g>
      <path d="M376 210h48M384 290h32M376 370h48M384 450h32M376 530h48M384 610h32M376 690h48M384 770h32" ${GOLD} stroke-width="5"/>
      <path d="M238 940h324" ${GOLD} stroke-width="6"/>
      <circle cx="400" cy="1000" r="36" fill="#0b0b0d" ${GOLD} stroke-width="6"/>
      <circle cx="400" cy="1000" r="14" fill="url(#gold)"/>
      <path d="M84 1080h632v40H84zM56 1120h688v60H56z" fill="url(#lacquer)" ${GOLD} stroke-width="6"/>
      <path d="M84 1160l28-24 28 24 28-24 28 24 28-24 28 24 28-24 28 24 28-24 28 24 28-24 28 24 28-24 28 24 28-24 28 24 28-24 28 24 28-24 28 24 28-24 28 24" fill="none" ${GOLD} stroke-width="4"/>`),
  },
  'metronome-pendulum': {
    canvas: [200, 1000], anchors: { hub: [100, 960] }, swing: 26,
    html: svg(200, 1000, `
      <path d="M100 6l14 22-14 22-14-22z" fill="url(#gold)"/>
      <rect x="94" y="40" width="12" height="920" fill="url(#gold)"/>
      <path d="M70 352h60v-22h12v-34h-12v-18h-10v-16H80v16H70v18H58v34h12z" fill="url(#lacquer)" ${GOLD} stroke-width="4"/>
      <path d="M100 318l-22-22a31 31 0 0 1 44 0z" fill="none" ${GOLD} stroke-width="3"/>
      ${rays(100, 318, 26, -45, 45, 4, `${GOLD} stroke-width="2.5"`)}
      <circle cx="100" cy="960" r="30" fill="url(#gold)"/>
      <circle cx="100" cy="960" r="18" fill="#0b0b0d"/>
      <circle cx="100" cy="960" r="7" fill="url(#gold)"/>`),
  },
};

// ---------------------------------------------------------------- generated stand-ins
// The later themes share one drawing, varied by shape and palette, so each
// looks like its theme until its own art arrives. Same anchors as the others:
// body pivot (400, 1000) in 800×1200, pendulum hub (100, 960) in 200×1000.

function gear(cx, cy, r, teeth, fill, stroke = 'none', sw = 0) {
  const pts = [];
  for (let i = 0; i < teeth * 4; i++) {
    const a = (i / (teeth * 4)) * Math.PI * 2;
    const rr = i % 4 < 2 ? r : r * 0.8;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `<path d="M${pts.join('L')}Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/><circle cx="${cx}" cy="${cy}" r="${(r * 0.35).toFixed(1)}" fill="${stroke === 'none' ? '#000' : stroke}" opacity=".55"/>`;
}

function star(cx, cy, r, points = 5, inner = 0.45) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * inner : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}

// Case outlines (800×1200) and their face panels.
const SHAPES = {
  rounded: { body: 'M350 70H450L650 1060H150Z', face: 'M384 170H416L548 930H252Z', round: 60 },
  arched: { body: 'M300 300Q400 10 500 300L655 1060H145Z', face: 'M338 360Q400 170 462 360L552 935H248Z' },
  whiplash: { body: 'M310 290Q400 0 490 290Q520 720 670 1060H130Q280 720 310 290Z', face: 'M345 360Q400 175 455 360Q470 720 550 935H250Q330 720 345 360Z' },
  chamfer: { body: 'M360 40H440L480 110L650 990L600 1060H200L150 990L320 110Z', face: 'M386 150H414L440 190L560 900L535 935H265L240 900L360 190Z' },
  plates: { body: 'M345 50H455L665 1060H135Z', face: 'M382 150H418L560 935H240Z' },
};

/**
 * @param {object} t palette and shape:
 *   shape, caseFill, caseLine, lineW, face, tick, metal, metalLine, accent, base,
 *   weight ('boomerang'|'shell'|'blade'|'bud'|'star'|'cog'), extras(svg)
 */
function themed(t) {
  const sh = SHAPES[t.shape];
  const lw = t.lineW ?? 8;
  const rounded = sh.round ? ` stroke-linejoin="round"` : ' stroke-linejoin="miter"';
  const outline = sh.round
    ? `<path d="${sh.body}" fill="${t.caseFill}" stroke="${t.caseLine}" stroke-width="${sh.round + lw * 2}"${rounded}/><path d="${sh.body}" fill="${t.caseFill}" stroke="${t.caseFill}" stroke-width="${sh.round}"${rounded}/>`
    : `<path d="${sh.body}" fill="${t.caseFill}" stroke="${t.caseLine}" stroke-width="${lw}"${rounded}/>`;
  let ticks = '';
  for (let y = 240, i = 0; y <= 860; y += 62, i++) ticks += `M${i % 2 ? 380 : 368} ${y}H${i % 2 ? 420 : 432}`;
  const rivets = t.rivets
    ? Array.from({ length: 9 }, (_, i) => {
        const y = 140 + i * 105, k = (y - 50) / 1010;
        const xl = 345 - 210 * k + 26, xr = 455 + 210 * k - 26;
        return `<circle cx="${xl.toFixed(0)}" cy="${y}" r="9" fill="${t.metal}"/><circle cx="${xr.toFixed(0)}" cy="${y}" r="9" fill="${t.metal}"/>`;
      }).join('')
    : '';
  const bodyInner = `
    ${t.behind || ''}
    ${outline}
    ${rivets}
    <path d="${sh.face}" fill="${t.face}" stroke="${t.faceLine || t.caseLine}" stroke-width="${Math.max(3, lw / 2)}"/>
    <path d="${ticks}" stroke="${t.tick}" stroke-width="7" stroke-linecap="round"/>
    <path d="M100 1060H700V1150H100Z" fill="${t.base}" stroke="${t.caseLine}" stroke-width="${lw}" stroke-linejoin="round"/>
    ${t.extras || ''}
    <circle cx="400" cy="1000" r="34" fill="${t.caseLine}"/>`;

  const W = {
    boomerang: `<path d="M50 300Q100 250 150 300Q150 330 120 330Q100 310 80 330Q50 330 50 300Z" fill="${t.accent}" stroke="${t.metalLine}" stroke-width="4"/>`,
    shell: `<path d="M60 340A40 40 0 0 1 140 340Z" fill="${t.metal}" stroke="${t.metalLine}" stroke-width="4"/><path d="M100 340L72 312M100 340L86 302M100 340L100 298M100 340L114 302M100 340L128 312" stroke="${t.metalLine}" stroke-width="3"/>`,
    blade: `<path d="M70 280H130L146 310L130 340H70L54 310Z" fill="${t.caseFill}" stroke="${t.metal}" stroke-width="5"/><circle cx="100" cy="310" r="9" fill="${t.accent}"/>`,
    bud: `<path d="M100 270C130 300 134 336 100 352C66 336 70 300 100 270Z" fill="${t.metal}" stroke="${t.metalLine}" stroke-width="4"/><path d="M100 286V346" stroke="${t.metalLine}" stroke-width="3"/>`,
    star: `<path d="${star(100, 312, 46)}" fill="${t.accent}" stroke="${t.caseLine}" stroke-width="6" stroke-linejoin="round"/>`,
    cog: gear(100, 312, 42, 10, t.accent, t.metalLine, 3),
  };
  const glow = t.glow ? ` filter="drop-shadow(0 0 6px ${t.glow})"` : '';
  const pendInner = `
    <rect x="${t.rodOutline ? 90 : 94}" y="30" width="${t.rodOutline ? 20 : 12}" height="930" rx="6" fill="${t.rodOutline || t.metal}"/>
    ${t.rodOutline ? `<rect x="95" y="34" width="10" height="922" rx="5" fill="${t.metal}"/>` : ''}
    ${W[t.weight]}
    <circle cx="100" cy="960" r="30" fill="${t.metal}" stroke="${t.metalLine}" stroke-width="5"/>
    <circle cx="100" cy="960" r="11" fill="${t.metalLine}"/>`;

  // Home icons reuse the drawing: the metronome mid-swing, and a microphone.
  const homeMetronome = `<svg viewBox="0 0 100 100" aria-hidden="true">
    <g transform="translate(19 4) scale(0.0775)">${bodyInner}
      <g transform="rotate(18 400 1000)"><g transform="translate(300 40)"${glow}>${pendInner}</g></g></g></svg>`;
  const homeRecord = `<svg viewBox="0 0 100 100" aria-hidden="true">
    <rect x="35" y="8" width="30" height="46" rx="${t.shape === 'chamfer' ? 4 : 15}" fill="${t.metal}" stroke="${t.metalLine}" stroke-width="2.4"/>
    <path d="M39 20h22M38 27h24M38 34h24M38 41h24M39 48h22" stroke="${t.metalLine}" stroke-width="1.6" opacity=".7"/>
    <path d="M27 33v4a23 23 0 0 0 46 0v-4" fill="none" stroke="${t.caseLine}" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M50 60v15" stroke="${t.caseLine}" stroke-width="3.4"/>
    <path d="M34 76h32v8H34z" fill="${t.base}" stroke="${t.caseLine}" stroke-width="2" stroke-linejoin="round"/>
    ${t.weight === 'cog' ? gear(80, 26, 10, 8, t.metal, t.metalLine, 1) : ''}
    <circle cx="${t.weight === 'cog' ? 80 : 79}" cy="${t.weight === 'cog' ? 50 : 25}" r="8" fill="${t.record}" stroke="${t.caseLine}" stroke-width="1.6"/>
    ${t.weight === 'star' ? `<path d="${star(18, 22, 7, 4, 0.3)}" fill="${t.accent}"/><path d="${star(86, 72, 5, 4, 0.3)}" fill="${t.metal}"/>` : ''}
    </svg>`;

  return {
    'home-metronome': { html: homeMetronome },
    'home-record': { html: homeRecord },
    'home-tuner': { html: tunerIcon({ body: t.caseFill, line: t.caseLine, dial: t.face, needle: t.metalLine, fork: t.metal, accent: t.record, lineW: Math.max(2, Math.min(3, (t.lineW ?? 8) / 3)) }) },
    'metronome-body': { canvas: [800, 1200], anchors: { pivot: [400, 1000] }, html: svg(800, 1200, bodyInner) },
    'metronome-pendulum': {
      canvas: [200, 1000], anchors: { hub: [100, 960] }, swing: 24,
      html: svg(200, 1000, `<g${glow}>${pendInner}</g>`),
    },
  };
}

const SIXTIES = themed({
  shape: 'rounded', caseFill: '#b4693a', caseLine: '#5b3518', lineW: 6, face: '#e8b23a', faceLine: '#5b3518',
  tick: '#fff3d6', metal: '#d9dde0', metalLine: '#6b7277', accent: '#e0622a', base: '#2a8a86', record: '#e0622a',
  weight: 'boomerang',
  extras: `<path d="${star(600, 190, 54, 8, 0.3)}" fill="#e0622a"/><circle cx="600" cy="190" r="10" fill="#fff3d6"/>`,
});

const BAROQUE = themed({
  shape: 'arched', caseFill: '#5a3420', caseLine: '#c99a3f', lineW: 10, face: '#f7efdc', faceLine: '#c99a3f',
  tick: '#8a6a3a', metal: '#d8b25a', metalLine: '#7a5a1e', accent: '#7c1f2c', base: '#4a2a18', record: '#7c1f2c',
  weight: 'shell',
  extras: `<circle cx="400" cy="138" r="22" fill="#d8b25a"/><path d="M400 116V92" stroke="#d8b25a" stroke-width="10" stroke-linecap="round"/>
    <path d="M190 1040c-40 0-60-40-30-60M610 1040c40 0 60-40 30-60" fill="none" stroke="#d8b25a" stroke-width="10" stroke-linecap="round"/>`,
});

const SCIFI = themed({
  shape: 'chamfer', caseFill: '#11182b', caseLine: '#3ef2ff', lineW: 6, face: '#0a0f1c', faceLine: '#2aa7c4',
  tick: '#3ef2ff', metal: '#8ff7ff', metalLine: '#1b6b7c', accent: '#ff3cac', base: '#1a2238', record: '#ff3cac',
  weight: 'blade', glow: '#3ef2ff',
  extras: `<path d="M200 1105H600" stroke="#ff3cac" stroke-width="6"/><path d="M250 960H550" stroke="#3ef2ff" stroke-width="3" opacity=".6"/>`,
});

const NOUVEAU = themed({
  shape: 'whiplash', caseFill: '#7f9a7a', caseLine: '#b8933f', lineW: 8, face: '#f4ecd8', faceLine: '#b8933f',
  tick: '#b8933f', metal: '#cfae5e', metalLine: '#7a5f24', accent: '#b5687a', base: '#5f6f4d', record: '#b5687a',
  weight: 'bud',
  extras: `<path d="M180 1040C260 960 250 860 330 800M620 1040C540 960 550 860 470 800" fill="none" stroke="#b8933f" stroke-width="8" stroke-linecap="round"/>
    <circle cx="330" cy="800" r="14" fill="#b5687a"/><circle cx="470" cy="800" r="14" fill="#b5687a"/>`,
});

const ANIME = themed({
  shape: 'rounded', caseFill: '#ff8fc0', caseLine: '#2b2340', lineW: 12, face: '#ffffff', faceLine: '#2b2340',
  tick: '#5cc4ff', metal: '#5cc4ff', metalLine: '#2b2340', accent: '#ffd84d', base: '#b9a3ff', record: '#ff4f8b',
  weight: 'star', rodOutline: '#2b2340',
  extras: `<path d="${star(560, 150, 40, 4, 0.28)}" fill="#ffffff" stroke="#2b2340" stroke-width="6"/><path d="${star(230, 330, 22, 4, 0.28)}" fill="#ffd84d"/>`,
});

const STEAMPUNK = themed({
  shape: 'plates', caseFill: '#9a5a32', caseLine: '#d9a44a', lineW: 10, face: '#efe3c6', faceLine: '#5a3a1e',
  tick: '#2b1d12', metal: '#d9a44a', metalLine: '#5a3a1e', accent: '#b8743a', base: '#3b2414', record: '#e0482c',
  weight: 'cog', rivets: true,
  behind: gear(170, 640, 90, 12, '#8a6a2e', '#5a3a1e', 4) + gear(640, 820, 70, 10, '#b8743a', '#5a3a1e', 4),
  extras: `<circle cx="400" cy="1105" r="30" fill="#efe3c6" stroke="#d9a44a" stroke-width="8"/><path d="M400 1105L418 1088" stroke="#2b1d12" stroke-width="5"/>`,
});

export const STANDINS = {
  classic: CLASSIC, deco: DECO,
  sixties: SIXTIES, baroque: BAROQUE, scifi: SCIFI, nouveau: NOUVEAU, anime: ANIME, steampunk: STEAMPUNK,
};

/** The stand-in for an image in a theme (falling back to Classic's). */
export function standin(theme, id) {
  return (STANDINS[theme] || CLASSIC)[id] || CLASSIC[id];
}
