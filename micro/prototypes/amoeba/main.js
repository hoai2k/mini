// Amoeba prototype: Amoeba proteus crawling on a wet-mount slide, hunting by
// forming a food cup around prey. See README.md for the biology, the
// simulation and the labelled departures.
import * as THREE from '../shared/vendor/three.module.min.js';
import { createPad, BTN } from '../shared/pad.js';
import { mountHud } from '../shared/hud.js';
import { loadTexture } from '../shared/assets.js';
import { createFeatures } from '../shared/features.js';
import { Body, N } from '../shared/techniques/amoeba-softbody.js';
import { Cytoplasm } from './cytoplasm.js';
import { SPECIES, makePrey } from './prey.js';
import { buildWorld, worldColliders, addResidue, wetMountCanvas, cytoplasmCanvas, meanColor } from './world.js';
import { View } from './render.js';
import { rng, TAU, clamp } from './util.js';

const MODES = ['Brightfield', 'Phase contrast', 'Darkfield', 'Immersive (hypothetical)'];
const OBJECTIVES = [{ name: '10×', field: 1800 }, { name: '20×', field: 900 }];
const AMOEBA_TIME = { 'Amoeba ×10': 1, 'Amoeba ×3': 0.3, 'Amoeba ×1 (real time)': 0.1 };
const SWIM_TIME = { 'Swimmers ×0.1': 1, 'Swimmers ×0.3': 3, 'Swimmers real speed': 10 };
const GRANULES = { '2600 granules': 2600, '1300 granules': 1300, '600 granules': 600 };
const CUP_WRAP = 3.3; // radians (≈ 190°) of membrane around the prey before A can close

const canvas = document.querySelector('canvas.view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.autoClear = false;

const pad = createPad();
const hud = mountHud({
  title: 'Amoeba',
  sub: 'Amoeba proteus (~450 µm) on a wet-mount slide. Push out pseudopods, cup them round prey, close the cup.',
  controls: [
    ['LS', 'Pseudopod 1: aim and extend'],
    ['RS', 'Pseudopod 2: aim and extend'],
    ['RT', 'Push harder'],
    ['LT', 'Spread out / relax'],
    ['A', 'Close the food cup round prey'],
    ['B', 'Let go / egest a food vacuole'],
    ['X', 'Optics: brightfield, phase, darkfield, immersive'],
    ['Y', 'Labels'],
    ['LB', 'Objective 10× (field 1.8 mm)'],
    ['RB', 'Objective 20× (field 0.9 mm)'],
    ['D-pad', 'Fine focus (up / down)'],
    ['View', 'Hide this panel'],
    ['Menu', 'Features: what it does, switches'],
  ],
  note: 'Release a stick to let that pseudopod flow back. Every arm takes body from somewhere else: the cell keeps its volume. Time is compressed; see the corner.',
});

const rand = rng(11);
const world = buildWorld(7);
const body = new Body(rand, 0, 0);
const cyto = new Cytoplasm(rand, body, 2600);
const prey = [];
let ambient = [];

const textures = {
  bg: new THREE.CanvasTexture(wetMountCanvas()),
  cyto: new THREE.CanvasTexture(cytoplasmCanvas()),
};
for (const t of [textures.bg, textures.cyto]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; }
textures.bgMean = meanColor(textures.bg.image);
textures.cytoMean = meanColor(textures.cyto.image);
const view = new View(renderer, { body, cyto, world, textures });

// Delivered art replaces the stand-ins when it arrives.
loadTexture('MP-A01', { srgb: false }).then((t) => { if (t) { textures.bg = t; textures.bgMean = meanColor(t.image); } });
loadTexture('MP-A02', { srgb: false }).then((t) => {
  if (t) { view.bodyMat.uniforms.uCyto.value = t; view.bodyMat.uniforms.uCytoMean.value.set(...meanColor(t.image)); }
});
loadTexture('MP-A03', { repeat: false, srgb: false }).then((t) => { if (t) view.setPhoto(t, meanColor(t.image)); });

// --- state ----------------------------------------------------------------
const S = {
  time: 0, mode: 0, focus: 0.6, objective: 1, labels: false,
  camX: 0, camY: 0, eaten: 0, cand: null, closing: null,
  amoebaK: 1, swimK: 1, granules: 2600, rumble: true,
  flags: { tie: true, refraction: true, chroma: true, dof: true, bgRefraction: true, vignette: true, grain: true, obstacles: true, above: true },
  streaming: true, brownian: true, cv: true, respawn: true,
  fps: 60, statT: 0, pending: [],
};

// --- features panel ----------------------------------------------------------
const features = createFeatures({ key: 'amoeba', pad });
const F = (o) => features.add(o);
F({ id: 'look', group: 'Optics', label: 'Optical method', choices: MODES, value: MODES[0],
  about: 'X cycles. Brightfield is the reference look; phase contrast (dark phase with bright halos), darkfield (scattered light on black) and a hypothetical immersive lit view are for comparison. All four read the same property buffer.',
  onChange: (v) => { S.mode = Math.max(0, MODES.indexOf(v)); } });
F({ id: 'propbuf', group: 'Rendering', label: 'Optical property buffer', fixed: true,
  about: 'Objects draw phase (thickness × refractive step) and red/green/blue optical density additively into a float target, not colour; one composite pass applies the optics. Module: shared/techniques/amoeba-optics.js.' });
F({ id: 'tie', group: 'Optics', label: 'Defocus contrast (transport of intensity)', on: true,
  about: 'A transparent cell is nearly invisible in focus; slight defocus gives I ≈ I0(1 − Δz∇²φ): bright and dark lines at edges and granules. Fine focus (d-pad) sets Δz and its sign.',
  onChange: (v) => { S.flags.tie = v; } });
F({ id: 'refraction', group: 'Optics', label: 'Edge refraction loss', on: true,
  about: 'Steep slopes at the membrane bend light out of the objective aperture, darkening the edge in proportion to |∇φ|².', onChange: (v) => { S.flags.refraction = v; } });
F({ id: 'chroma', group: 'Optics', label: 'Chromatic fringes', on: true,
  about: 'Red, green and blue focus at slightly different depths, so the defocus term uses a different spacing per channel: faint coloured fringes like the reference photo.', onChange: (v) => { S.flags.chroma = v; } });
F({ id: 'dof', group: 'Optics', label: 'Depth of field', on: true,
  about: 'Things floating above the focal plane are drawn to a separate half-resolution buffer and Gaussian-blurred (≈ 6 µm depth of field at 20×). Focusing up makes them sharper.', onChange: (v) => { S.flags.dof = v; } });
F({ id: 'bgrefr', group: 'Optics', label: 'Background refraction', on: true,
  about: 'The slide texture is sampled through the phase gradient, so the field wobbles slightly behind the cell like a lens.', onChange: (v) => { S.flags.bgRefraction = v; } });
F({ id: 'vignette', group: 'Rendering', label: 'Vignette', on: true, about: 'Illumination falls off towards the edge of the field.', onChange: (v) => { S.flags.vignette = v; } });
F({ id: 'grain', group: 'Rendering', label: 'Sensor grain', on: true, about: 'A little per-pixel noise, like a camera on a microscope.', onChange: (v) => { S.flags.grain = v; } });
F({ id: 'dome', group: 'Rendering', label: 'Thickness dome from a distance grid', fixed: true,
  about: 'Each frame the membrane polygon is rasterised on the CPU and an exact distance transform gives distance-from-edge; thickness rises as its square root. It drives phase, absorption and the ectoplasm rim. Module: shared/techniques/amoeba-sdfgrid.js.' });
F({ id: 'mask', group: 'Rendering', label: 'MSAA membrane mask', fixed: true,
  about: 'The membrane ring, Catmull-Rom subdivided and triangulated (earcut), is drawn into a 4× multisampled mask for a clean edge.' });
F({ id: 'wrinkle', group: 'Body', label: 'Crumpled uroid', on: true,
  about: 'Small folds at the rear (the uroid) where the membrane is being taken back in.', onChange: (v) => { view.flags.wrinkle = v; } });
F({ id: 'caps', group: 'Body', label: 'Hyaline caps', on: true,
  about: 'A clear cap of cytoplasm at each advancing tip, free of granules.', onChange: (v) => { view.flags.caps = v; cyto.caps = v; } });
F({ id: 'area', group: 'Body', label: 'Volume conservation (area pressure)', on: true,
  about: 'An exact area projection after each step: any arm pushed out is paid for elsewhere. Off, the cell shrinks under tension and arms are free. Module: shared/techniques/amoeba-softbody.js.',
  onChange: (v) => { body.opts.area = v; } });
F({ id: 'rear', group: 'Body', label: 'Rear retraction (uroid)', on: true,
  about: 'The area correction is weighted to the membrane facing away from the active pseudopods, so the rear retracts and the cell crawls. Off, it shrinks evenly.', onChange: (v) => { body.opts.rearWeight = v; } });
F({ id: 'self', group: 'Body', label: 'Self-contact', on: true,
  about: 'Membrane nodes that are far apart along the ring repel when they meet, so two pseudopods can press together round prey without crossing.', onChange: (v) => { body.opts.selfContact = v; } });
F({ id: 'idle', group: 'Body', label: 'Idle pseudopods (polypodial)', on: true,
  about: 'A resting A. proteus probes with several pseudopods at once; up to three weak ones come and go when you are not steering.', onChange: (v) => { body.opts.idlePods = v; } });
F({ id: 'overdamped', group: 'Motion', label: 'Overdamped (low Reynolds number)', fixed: true,
  about: 'Displacement is proportional to force each step; nothing coasts. Stop protruding and the cell stops.' });
F({ id: 'atime', group: 'Motion', label: 'Amoeba time compression', choices: Object.keys(AMOEBA_TIME), value: 'Amoeba ×10',
  about: 'A. proteus advances about 1–4 µm/s. ×10 makes a pseudopod grow in seconds; ×1 is real time (very slow).', onChange: (v) => { S.amoebaK = AMOEBA_TIME[v] ?? 1; } });
F({ id: 'stime', group: 'Motion', label: 'Swimmer speed', choices: Object.keys(SWIM_TIME), value: 'Swimmers ×0.1',
  about: 'Ciliates swim at 0.3–1 mm/s: far too fast to catch on a ×10 amoeba clock, so swimmers are slowed. Real speed shows why amoebae ambush.', onChange: (v) => { S.swimK = SWIM_TIME[v] ?? 1; } });
F({ id: 'stream', group: 'Simulation', label: 'Fountain streaming', on: true,
  about: 'Endoplasm granules flow towards each advancing tip, about twice as fast as the tip, along the cell axis; the gel rim stays put.', onChange: (v) => { S.streaming = v; } });
F({ id: 'brown', group: 'Simulation', label: 'Brownian / saltatory jitter', on: true, about: 'Random jiggling of granules.', onChange: (v) => { S.brownian = v; } });
F({ id: 'gran', group: 'Simulation', label: 'Granules', choices: Object.keys(GRANULES), value: '2600 granules',
  about: 'Particles carried by the endoplasm: fine granules, bipyramidal crystals, lipid droplets, algal remnants. Fewer for slow GPUs.', onChange: (v) => { S.granules = GRANULES[v] ?? 2600; } });
F({ id: 'cv', group: 'Simulation', label: 'Contractile vacuole cycle', on: true,
  about: 'Fills slowly (≈ 40 s here, minutes in life), then empties in about a second; faster while food vacuoles shed water.', onChange: (v) => { S.cv = v; } });
F({ id: 'cup', group: 'Simulation', label: 'Food cup and food vacuoles', fixed: true,
  about: 'The membrane run near a prey cell is measured by how far it winds round it; when the rims meet, the lining zips shut and the cup becomes a food vacuole that sheds water, then digests.' });
F({ id: 'avoid', group: 'Simulation', label: 'Avoidance reaction, trichocysts', fixed: true,
  about: 'Ciliates that touch the membrane back up, pivot and swim off. A Paramecium in a closing cup fires a local burst of trichocysts that shoves it clear (three bursts).' });
F({ id: 'obstacles', group: 'World', label: 'Obstacles on the slide', on: true,
  about: 'Spirogyra filaments, gliding diatoms and detritus flakes the cell must flow round.', onChange: (v) => { S.flags.obstacles = v; } });
F({ id: 'above', group: 'World', label: 'Out-of-focus layer', on: true,
  about: 'Filaments and flakes floating above the focal plane (MP-A03 when delivered).', onChange: (v) => { S.flags.above = v; } });
F({ id: 'rumble', group: 'Controls', label: 'Rumble', on: true, about: 'Controller rumble on contact, trichocyst bursts and captures.', onChange: (v) => { S.rumble = v; } });
F({ id: 'sticks', group: 'Controls', label: 'Two sticks, two pseudopods', fixed: true,
  about: 'Each stick grows one pseudopod from the part of the membrane facing its direction; turning the stick bends it; centring the stick lets it flow back. A game interpretation of chemotactic protrusion.' });

// --- prey ------------------------------------------------------------------
const MIX = ['chilomonas', 'chilomonas', 'chilomonas', 'chilomonas', 'chilomonas', 'chlamydomonas', 'chlamydomonas', 'chlamydomonas',
  'tetrahymena', 'tetrahymena', 'tetrahymena', 'colpidium', 'colpidium', 'paramecium'];

function freeSpot(rMin, rMax) {
  for (let k = 0; k < 40; k++) {
    const a = rand() * TAU, d = rand.range(rMin, rMax);
    const x = body.cx + Math.cos(a) * d, y = body.cy + Math.sin(a) * d;
    const col = worldColliders(world, 0);
    let ok = body.grid.sample(x, y) < -40;
    for (const c of col.capsules) {
      const ex = c.bx - c.ax, ey = c.by - c.ay, l2 = ex * ex + ey * ey;
      const t = clamp(((x - c.ax) * ex + (y - c.ay) * ey) / l2, 0, 1);
      if (Math.hypot(x - c.ax - ex * t, y - c.ay - ey * t) < c.r + 60) ok = false;
    }
    if (ok) return [x, y];
  }
  return [body.cx + rMax, body.cy];
}

function spawn(key, rMin = 260, rMax = 850) {
  const [x, y] = freeSpot(rMin, rMax);
  const p = makePrey(key, x, y, rand() * TAU, rand);
  prey.push(p);
  return p;
}

function despawn(p) {
  const i = prey.indexOf(p);
  if (i >= 0) prey.splice(i, 1);
  view.removePrey(p);
}

// --- input -----------------------------------------------------------------
const test = { input: null, presses: new Set() };
function readInput() {
  if (test.input) {
    const t = test.input;
    const st = (s) => { const m = Math.min(1, Math.hypot(s?.x || 0, s?.y || 0)); return m > 0 ? { m, dx: s.x / m, dy: -s.y / m } : { m: 0, dx: 1, dy: 0 }; };
    return { pods: [st(t.ls), st(t.rs)], push: t.rt || 0, spread: t.lt || 0 };
  }
  const ls = pad.ls(), rs = pad.rs();
  const st = (s) => (s.m > 0 ? { m: s.m, dx: s.x / Math.hypot(s.x, s.y), dy: -s.y / Math.hypot(s.x, s.y) } : { m: 0, dx: 1, dy: 0 });
  return { pods: [st(ls), st(rs)], push: pad.rt(), spread: pad.lt() };
}
const pressed = (b) => pad.pressed(b) || test.presses.has(b);

function rumble(ms, weak, strong) { if (S.rumble) pad.rumble(ms, weak, strong); }

// --- game logic ---------------------------------------------------------------
function tryClose() {
  const c = S.cand;
  if (!c) { hud.toast('No prey in the cup: wrap pseudopods round one first'); return; }
  if (c.cup.wrap < CUP_WRAP) {
    hud.toast(`Not enclosed yet: ${Math.round((c.cup.wrap * 180) / Math.PI)}° of ${Math.round((CUP_WRAP * 180) / Math.PI)}°`);
    return;
  }
  S.closing = { prey: c.prey, t: 0, low: 0 };
  hud.toast(`Closing the food cup round the ${c.prey.sp.name}…`);
}

function cancelClose(msg) {
  S.closing = null;
  body.closing = null;
  if (msg) hud.toast(msg);
}

function capture(p, cup) {
  // Sealed across the mouth (cup) or already enclosed by the membrane (no cup).
  const area = cup ? body.seal(cup) : 1.3 * Math.PI * (p.sp.L / 2) * (p.sp.W / 2);
  if (!cup) { body.A0 += area; body.closing = null; }
  const { L, W } = p.sp;
  const rx0 = L / 2 + 5, ry0 = W / 2 + 5;
  const v = {
    x: p.x, y: p.y, rx0, ry0, rx: rx0, ry: ry0, ang: p.heading, spin: rand.range(-0.03, 0.03),
    scale: Math.max(1, Math.sqrt(area / (Math.PI * rx0 * ry0))), fit: 1,
    digest: 0, digestTime: p.sp.digest, nutrition: 0.35 * Math.PI * (L / 2) * (W / 2), age: 0, prey: p,
  };
  v.rx = rx0 * v.scale; v.ry = ry0 * v.scale;
  cyto.addVacuole(v);
  p.captured = v;
  S.eaten++;
  S.closing = null;
  hud.toast(`${p.sp.name} engulfed: a food vacuole forms`);
  rumble(300, 0.5, 0.2);
}

cyto.onEgest = (v) => {
  const p = v.prey;
  if (p && p.alive && v.digest < 0.15) {
    p.captured = null;
    p.x = body.ux; p.y = body.uy;
    p.th = Math.atan2(body.uy - body.cy, body.ux - body.cx);
    p.state = 'swim'; p.speedK = 1.6; p.sc = 1;
    hud.toast(`Let go: the ${p.sp.name} swims off`);
  } else {
    if (p) despawn(p);
    const fx = body.ux + (body.ux - body.cx) * 0.08, fy = body.uy + (body.uy - body.cy) * 0.08;
    addResidue(world, fx, fy, Math.max(14, Math.max(v.rx, v.ry) * 1.6), rand());
    if (p && S.respawn) S.pending.push({ key: Object.keys(SPECIES).find((k) => SPECIES[k] === p.sp), t: 6 });
    hud.toast('Food vacuole egested at the uroid');
  }
};

function egest() {
  const v = cyto.vacuoles.filter((x) => !x.egest).sort((a, b) => b.digest - a.digest || b.age - a.age)[0];
  if (!v) { hud.toast('Nothing to let go'); return; }
  v.egest = true;
}

const tmp = {};
function stepPrey(dt, col) {
  const swim = S.swimK;
  const subs = Math.ceil(swim / 2);
  for (const p of prey.slice()) {
    if (p.captured) {
      p.update(dt);
      if (p.captured.digest >= 1 && !p.done) {
        p.done = true;
        despawn(p);
        p.captured.prey = null;
        p.captured.residue = true;
        if (S.respawn) S.pending.push({ key: Object.keys(SPECIES).find((k) => SPECIES[k] === p.sp), t: 8 });
      }
      continue;
    }
    for (let s = 0; s < subs; s++) p.update((dt * swim) / subs);
    p.updateCircles();
    // The membrane yields to the prey it is closing round, so it is not squeezed out.
    const share = S.closing && S.closing.prey === p ? 0.2 : p.sp.kind === 4 ? 0.55 : 0.85;
    let touched = false;
    for (const c of p.circles) {
      for (const cap of col.capsules) {
        const ex = cap.bx - cap.ax, ey = cap.by - cap.ay, l2 = ex * ex + ey * ey || 1;
        const t = clamp(((c.x - cap.ax) * ex + (c.y - cap.ay) * ey) / l2, 0, 1);
        const qx = c.x - cap.ax - ex * t, qy = c.y - cap.ay - ey * t;
        const d = Math.hypot(qx, qy), r = cap.r + c.r;
        if (d < r && d > 1e-3) { p.x += (qx / d) * (r - d); p.y += (qy / d) * (r - d); p.avoid(0.7); }
      }
      for (const o of col.circles) {
        const qx = c.x - o.x, qy = c.y - o.y, d = Math.hypot(qx, qy), r = o.r + c.r;
        if (d < r && d > 1e-3) { p.x += (qx / d) * (r - d); p.y += (qy / d) * (r - d); p.avoid(0.7); }
      }
      body.collideCircle(c.x, c.y, c.r + 1.5, share, tmp);
      if (tmp.hits) { p.x += tmp.x; p.y += tmp.y; touched = true; }
    }
    const near = body.nearest(p.x, p.y);
    if (near.d - p.sp.W / 2 < p.sp.sense || touched) {
      if (!p.touch) rumble(60, 0.15, 0);
      p.touch = 1;
      p.avoid();
    } else p.touch = 0;
    const d = body.grid.sample(p.x, p.y);
    if (d > 0) {
      body.grid.grad(p.x, p.y, tmp);
      p.x -= tmp.x * (d + p.sp.W / 2); p.y -= tmp.y * (d + p.sp.W / 2);
    }
    if (S.respawn && Math.hypot(p.x - body.cx, p.y - body.cy) > 1500) {
      const [x, y] = freeSpot(700, 950);
      p.x = x; p.y = y; p.th = Math.atan2(body.cy - y, body.cx - x) + rand.range(-0.8, 0.8);
    }
  }
}

function updateCup(dt) {
  // The best cup candidate: the prey the membrane wraps furthest.
  let best = null;
  for (const p of prey) {
    if (p.captured || p.layer !== 'focus') continue;
    if (Math.hypot(p.x - body.cx, p.y - body.cy) > body.req + 450) continue;
    const reach = Math.max(p.sp.L, p.sp.W) / 2 + 130;
    const cup = body.cupAround(p.x, p.y, reach);
    if (cup && (!best || cup.wrap > best.cup.wrap)) best = { prey: p, cup };
  }
  S.cand = best && best.cup.wrap > 1.6 ? best : null;

  const C = S.closing;
  if (!C) { body.closing = null; return; }
  const p = C.prey;
  C.t += dt;
  const reach = Math.max(p.sp.L, p.sp.W) / 2 + 130;
  const cup = body.cupAround(p.x, p.y, reach);
  if (!cup || cup.wrap < 2.1) C.low += dt; else C.low = 0;
  if (C.low > 0.8 || C.t > 14) { cancelClose(`The ${p.sp.name} slipped away`); return; }
  if (!cup) return;
  body.closing = { i0: cup.i0, i1: cup.i1, mx: cup.mx, my: cup.my, px: p.x, py: p.y, run: cup.run };
  // A Paramecium caught in a closing cup fires its trichocysts.
  if (p.sp.kind === 4 && p.charges > 0 && p.cool <= 0 && cup.wrap > 2.4) {
    const n = body.nearest(p.x, p.y);
    if (p.discharge(body.x[n.i], body.y[n.i])) {
      body.blast(p.x, p.y, 140, 30);
      rumble(450, 0.9, 1);
      hud.toast(p.charges ? 'Trichocysts! The Paramecium blasts the cup open' : 'Its last nearby trichocysts are spent');
    }
  }
  if (body.grid.sample(p.x, p.y) > p.sp.W * 0.25) { capture(p, null); return; }
  if (cup.gap < 16) {
    const { inside } = body.cupContains(cup, p.x, p.y);
    if (inside) capture(p, cup);
    else cancelClose(`The ${p.sp.name} got out before the rims met`);
  }
}

function simStep(dt) {
  const input = readInput();
  const col = S.flags.obstacles ? worldColliders(world, dt) : { capsules: [], circles: [] };
  const adt = dt * S.amoebaK;
  body.step(adt, input, col);
  body.grid.build(body.x, body.y, N);
  updateCup(adt);
  stepPrey(dt, col);
  // Optional parts of the cytoplasm simulation.
  const saved = body.pods.map((p) => p.s);
  if (!S.streaming) for (const p of body.pods) p.s = 0;
  const cvT = cyto.cv.t;
  cyto.brownian = S.brownian;
  cyto.update(adt, body, S.time);
  if (!S.cv) { cyto.cv.t = cvT; cyto.cv.r = Math.max(cyto.cv.r, 6); cyto.cv.systole = 0; }
  body.pods.forEach((p, k) => { p.s = saved[k]; });
  for (const q of ambient) { q.update(dt * S.swimK); if (Math.hypot(q.x - S.camX, q.y - S.camY) > 1400) { q.x = S.camX - Math.cos(q.th) * 1100; q.y = S.camY - Math.sin(q.th) * 1100; } }
  for (const pe of S.pending) pe.t -= dt;
  for (const pe of S.pending.filter((x) => x.t <= 0)) { spawn(pe.key, 750, 1000); }
  S.pending = S.pending.filter((x) => x.t > 0);
  S.time += dt;
}

// --- labels and the cup reticle (DOM) ----------------------------------------------------
const overlay = document.createElement('div');
overlay.style.cssText = 'position:fixed;inset:0;pointer-events:none;font:12px/1.2 system-ui,sans-serif;color:#1d2228;';
document.body.appendChild(overlay);
const reticle = document.createElement('div');
reticle.style.cssText = 'position:absolute;border:1.5px dashed rgba(40,60,90,.55);border-radius:50%;display:none;transform:translate(-50%,-50%);';
const retText = document.createElement('div');
retText.style.cssText = 'position:absolute;transform:translate(-50%,0);white-space:nowrap;background:rgba(255,255,255,.55);padding:1px 6px;border-radius:8px;display:none;';
overlay.append(reticle, retText);
const labelPool = [];
function label(i, x, y, text) {
  let el = labelPool[i];
  if (!el) {
    el = document.createElement('div');
    el.style.cssText = 'position:absolute;white-space:nowrap;padding:1px 5px;border-radius:6px;background:rgba(255,255,255,.6);transform:translate(8px,-50%);';
    const dot = document.createElement('i');
    dot.style.cssText = 'position:absolute;left:-8px;top:50%;width:5px;height:5px;margin-top:-3px;border-radius:50%;background:#c33;';
    el.appendChild(dot);
    el.appendChild(document.createElement('span'));
    overlay.appendChild(el);
    labelPool[i] = el;
  }
  const [sx, sy] = toScreen(x, y);
  el.style.left = `${sx}px`; el.style.top = `${sy}px`;
  el.lastChild.textContent = text;
  el.style.display = sx < -50 || sy < -20 || sx > innerWidth + 50 || sy > innerHeight + 20 ? 'none' : '';
}
function toScreen(x, y) {
  const [l, b, w, h] = view.view;
  return [((x - l) / w) * innerWidth, (1 - (y - b) / h) * innerHeight];
}
function updateOverlay() {
  const dark = S.mode === 2 || S.mode === 3;
  overlay.style.color = dark ? '#eef' : '#1d2228';
  const c = S.closing ? { prey: S.closing.prey } : S.cand;
  if (c) {
    const p = c.prey;
    const [sx, sy] = toScreen(p.x, p.y);
    const r = (Math.max(p.sp.L, p.sp.W) / 2 + 22) * view.cssPerUm;
    reticle.style.display = retText.style.display = '';
    reticle.style.left = `${sx}px`; reticle.style.top = `${sy}px`;
    reticle.style.width = reticle.style.height = `${2 * r}px`;
    const ready = S.closing || (S.cand && S.cand.cup.wrap >= CUP_WRAP);
    reticle.style.borderColor = ready ? 'rgba(40,140,60,.8)' : 'rgba(40,60,90,.5)';
    retText.style.left = `${sx}px`; retText.style.top = `${sy + r + 4}px`;
    const deg = S.cand ? Math.round((S.cand.cup.wrap * 180) / Math.PI) : 0;
    retText.textContent = S.closing ? 'closing…' : ready ? `${deg}° wrapped: A to close` : `${deg}° wrapped`;
  } else {
    reticle.style.display = retText.style.display = 'none';
  }
  let i = 0;
  if (S.labels) {
    const nu = cyto.nucleus;
    label(i++, nu.x, nu.y, 'nucleus (discoid, ~45 µm)');
    label(i++, cyto.cv.x, cyto.cv.y, 'contractile vacuole');
    label(i++, body.ux, body.uy, 'uroid (rear)');
    for (const pod of body.pods) if (pod.s > 0.2 && !pod.idle) label(i++, pod.x, pod.y, 'hyaline cap');
    for (const v of cyto.vacuoles) label(i++, v.x + v.rx, v.y, v.prey ? `food vacuole (${v.prey.sp.name})` : 'food vacuole (residue)');
    const gx = body.cx + (body.ux - body.cx) * 0.35, gy = body.cy + (body.uy - body.cy) * 0.35;
    label(i++, gx, gy, 'granular endoplasm (sol)');
    const e = body.nearest(body.cx + 1000 * body.fy, body.cy - 1000 * body.fx);
    label(i++, body.x[e.i], body.y[e.i], 'ectoplasm (clear gel rim)');
    for (const p of prey) if (!p.captured) label(i++, p.x + p.sp.L / 2, p.y, `${p.sp.name} ${p.sp.real.split(',')[0]}`);
    let k = 0;
    for (const o of world.obstacles) {
      if (o.layer !== 'focus' || k > 6) continue;
      const [sx, sy] = toScreen(o.x, o.y);
      if (sx < 0 || sy < 0 || sx > innerWidth || sy > innerHeight) continue;
      label(i++, o.x, o.y, o.type === 'spiro' ? 'Spirogyra (alga)' : o.type === 'diatom' ? 'diatom' : 'detritus'); k++;
    }
  }
  for (; i < labelPool.length; i++) labelPool[i].style.display = 'none';
}

// --- frame loop -----------------------------------------------------------------
function resize() { view.setSize(innerWidth, innerHeight); }
addEventListener('resize', resize);
resize();

// Warm up: a polypodial resting cell, prey scattered round it.
for (const k of MIX) spawn(k);
ambient = [makePrey('paramecium', -500, 300, 0.4, rand), makePrey('colpidium', 400, -200, 2.4, rand)];
for (const a of ambient) a.layer = 'above';
for (let i = 0; i < 600; i++) {
  const saved = test.input;
  test.input = { ls: null, rs: null };
  simStep(1 / 60);
  test.input = saved;
}
S.camX = body.cx; S.camY = body.cy;

let last = performance.now();
let acc = 0;
function frame(now) {
  if (paused && !renderOnce) { last = now; requestAnimationFrame(frame); return; }
  renderOnce = false;
  const dtReal = clamp((now - last) / 1000, 0, 0.1);
  last = now;
  S.fps += (1 / Math.max(dtReal, 1e-3) - S.fps) * 0.05;
  pad.poll();
  const menu = features.update();
  if (!menu) {
    hud.update(pad);
    if (pressed(BTN.A)) { if (!S.closing) tryClose(); }
    if (pressed(BTN.B)) { if (S.closing) cancelClose('Let go: the cup opens'); else egest(); }
    if (pressed(BTN.X)) features.set('look', MODES[(S.mode + 1) % MODES.length]);
    if (pressed(BTN.Y)) S.labels = !S.labels;
    if (pressed(BTN.LB)) S.objective = 0;
    if (pressed(BTN.RB)) S.objective = 1;
    if (pad.down(BTN.UP)) S.focus = clamp(S.focus + dtReal * 0.8, -1, 1);
    if (pad.down(BTN.DOWN)) S.focus = clamp(S.focus - dtReal * 0.8, -1, 1);
  }
  test.presses.clear();
  if (!menu && !paused) {
    acc += dtReal;
    let steps = 0;
    while (acc >= 1 / 60 && steps < 4) { simStep(1 / 60); acc -= 1 / 60; steps++; }
    if (steps === 4) acc = 0;
  }
  // Camera: follow the cell, gently, leading a little in the direction of travel.
  const tx = body.cx + body.fx * 60 * Math.min(1, body.fm), ty = body.cy + body.fy * 60 * Math.min(1, body.fm);
  S.camX += (tx - S.camX) * Math.min(1, dtReal * 0.8);
  S.camY += (ty - S.camY) * Math.min(1, dtReal * 0.8);
  view.setView(S.camX, S.camY, OBJECTIVES[S.objective].field * (innerWidth > innerHeight ? 1 : 0.6));
  view.render({ time: S.time, prey: [...prey, ...ambient], mode: S.mode, focus: S.focus, flags: S.flags, granuleCount: S.granules });
  updateOverlay();
  S.statT -= dtReal;
  if (S.statT <= 0) {
    S.statT = 0.25;
    let L = 0;
    for (let i = 0; i < N; i += 4) for (let j = i + 8; j < N; j += 4) L = Math.max(L, Math.hypot(body.x[i] - body.x[j], body.y[i] - body.y[j]));
    const ob = OBJECTIVES[S.objective];
    const amoebaX = Math.round(10 * S.amoebaK);
    const swimX = (0.1 * S.swimK).toFixed(1).replace(/\.0$/, '');
    hud.stats([
      `${MODES[S.mode]} · ${ob.name} objective, field ${(ob.field / 1000).toFixed(1)} mm · focus ${S.focus >= 0 ? '+' : ''}${S.focus.toFixed(2)}`,
      `Time: amoeba ×${amoebaX} · swimmers ×${swimX} of real speed`,
      `Cell ${Math.round(L)} µm long · ${Math.round(body.A0 / 1000)}×10³ µm² · eaten ${S.eaten}`,
      `${S.cand ? `Cup: ${Math.round((S.cand.cup.wrap * 180) / Math.PI)}° round ${S.cand.prey.sp.name}` : 'Cup: none'}${S.closing ? ' · closing' : ''}`,
      `${Math.round(S.fps)} fps`,
    ].join('\n'));
  }
  requestAnimationFrame(frame);
}
let paused = false;
let renderOnce = false;
requestAnimationFrame(frame);

// --- headless review ----------------------------------------------------------------
window.__micro = {
  THREE, renderer, camera: view.camera, scene: view.focusScene, scenes: { mask: view.maskScene, focus: view.focusScene, above: view.aboveScene },
  view, body, cyto, prey, world, state: S, features,
  set input(v) { test.input = v; }, get input() { return test.input; },
  press(name) { test.presses.add(BTN[name]); },
  setMode(i) { features.set('look', MODES[i]); },
  pause(v = true) { paused = v; },
  /** While paused: draw one frame (for screenshots). */
  renderOnce() { renderOnce = true; },
  /** Run the simulation for `sec` seconds of game time without rendering. */
  advance(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) simStep(1 / 60); S.camX = body.cx; S.camY = body.cy; },
  spawnPrey(key, x, y, th = 0) { const p = makePrey(key, x, y, th, rand); prey.push(p); return p; },
  clearPrey() { for (const p of prey.slice()) if (!p.captured) despawn(p); S.respawn = false; },
  close: tryClose,
  /** Test hook: make the cell a fresh disc at its centroid (organelles kept). */
  resetBody() {
    const R = Math.sqrt(body.A0 / Math.PI);
    for (let i = 0; i < N; i++) { const a = (i / N) * TAU; body.x[i] = body.cx + R * Math.cos(a); body.y[i] = body.cy + R * Math.sin(a); }
    for (const p of body.pods) { p.s = 0; p.target = 0; p.active = false; p.ret = 0; }
    body.grid.build(body.x, body.y, N);
  },
};
