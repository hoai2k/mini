// Artwork for the shell: delivered images from micro/image-requests.md (the
// launcher cards MP-U01–U07, and the game's own MP-G01–G13 once delivered),
// with drawn stand-ins in the same style until then. Paths in asset-list.js
// are relative to micro/prototypes/, which sits at ../../prototypes/ from
// this module both in the repository (micro/game/src/) and when published
// (micro/game/src/ beside micro/prototypes/).
import { ASSETS } from '../../prototypes/shared/asset-list.js';

export const PROTO = new URL('../../prototypes/', import.meta.url);

/** URL of a delivered image, or null while it is still requested. */
export function delivered(id) {
  const a = ASSETS[id];
  return a && a.status === 'delivered' ? new URL(a.file, PROTO).href : null;
}

const cache = new Map();

// A stand-in plate for a world: its two tints, soft out-of-focus discs and,
// for the phage (whose card is not delivered yet), an inked T4 silhouette.
function drawStandIn(world, w = 900, h = 600) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(w * 0.55, h * 0.45, 10, w * 0.5, h * 0.5, w * 0.75);
  grad.addColorStop(0, world.tint[0]);
  grad.addColorStop(1, world.tint[1]);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  let seed = world.n * 9301;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.globalCompositeOperation = 'screen';
  for (let i = 0; i < 26; i++) {
    const r = 10 + rnd() * 70;
    const x = rnd() * w, y = rnd() * h;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, 'rgba(255,240,210,0.22)');
    rg.addColorStop(1, 'rgba(255,240,210,0)');
    g.fillStyle = rg;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  g.globalCompositeOperation = 'source-over';
  if (world.id === 'phage') {
    g.save();
    g.translate(w * 0.5, h * 0.5);
    g.rotate(-0.25);
    g.strokeStyle = '#1b1a17'; g.lineWidth = 6; g.lineJoin = 'round';
    // head (an elongated icosahedron in outline)
    g.fillStyle = '#e9b968';
    g.beginPath();
    g.moveTo(0, -200); g.lineTo(62, -170); g.lineTo(62, -80); g.lineTo(0, -50); g.lineTo(-62, -80); g.lineTo(-62, -170); g.closePath();
    g.fill(); g.stroke();
    g.fillStyle = '#d58a4a';
    g.beginPath(); g.moveTo(0, -200); g.lineTo(62, -170); g.lineTo(0, -140); g.lineTo(-62, -170); g.closePath(); g.fill(); g.stroke();
    // collar, sheath, baseplate
    g.fillStyle = '#5aa59c';
    g.fillRect(-26, -50, 52, 16); g.strokeRect(-26, -50, 52, 16);
    for (let y = -34; y < 70; y += 13) { g.fillRect(-20, y, 40, 11); g.strokeRect(-20, y, 40, 11); }
    g.fillStyle = '#3f7f7a';
    g.beginPath(); g.moveTo(-40, 78); g.lineTo(40, 78); g.lineTo(28, 96); g.lineTo(-28, 96); g.closePath(); g.fill(); g.stroke();
    // tail fibres
    g.lineWidth = 5;
    for (const s of [-1, 1]) for (const k of [0.6, 1.1, 1.6]) {
      g.beginPath(); g.moveTo(s * 30, 88);
      g.lineTo(s * (70 + k * 40), 120 - k * 10); g.lineTo(s * (90 + k * 50), 190 + k * 8); g.stroke();
    }
    g.restore();
  }
  return c.toDataURL('image/jpeg', 0.86);
}

/** The world's card art: the delivered launcher card, or the stand-in. */
export function cardArt(world) {
  const key = `card:${world.id}`;
  if (!cache.has(key)) cache.set(key, delivered(world.card) || drawStandIn(world));
  return cache.get(key);
}

/** The world's intro plate (MP-G07–G13), falling back to the card art. */
export function introArt(world) {
  return delivered(world.intro) || cardArt(world);
}

/** Preload an image; resolves to the element, or null on failure. */
export function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => { console.error(`[micro zoom] image failed to load: ${src.slice(0, 80)}`); resolve(null); };
    img.src = src;
  });
}
