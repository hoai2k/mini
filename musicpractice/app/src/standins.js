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

const STRAIGHT = {
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

export const STANDINS = { straight: STRAIGHT, deco: DECO };

/** The stand-in for an image in a theme (falling back to Straight's). */
export function standin(theme, id) {
  return (STANDINS[theme] || STRAIGHT)[id] || STRAIGHT[id];
}
