// World-to-world transitions: playTransition(from, to, dir) → Promise.
//
// 'microscope' style plays the zoom-transitions prototype embedded
// (prototypes/zoom/?embed=1&from=<id>&to=<id>&dir=in|out). It must declare
// embed.provide('transition'), play on `resume` and post `done`; until it
// does, the shell falls back (once per session it probes, then remembers) to
// its own specimen zoom below.
//
// The specimen zoom: the larger field's plate scales about the centre on a
// log scale (each second magnifies by the same factor) while the next
// world's plate grows from a small round field of view, brass-rimmed, until
// it fills the screen; the readout gives the true field width and an
// eyepiece-equivalent magnification (180 mm ÷ field). Mite ↔ tardigrade and
// tardigrade ↔ amoeba are the same body size, so those are hand-offs: the
// reflected lamp dims and the transmitted light comes up, with only a slight
// push. Going back up plays the same zoom in reverse.
import { listen, send } from './bus.js';
import { cardArt, loadImage } from './art.js';

const HANDOFF = new Set(['mite>tardigrade', 'tardigrade>amoeba']);
const smooth = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export function fmtField(mm) {
  if (mm >= 1) return `${mm >= 10 ? mm.toFixed(0) : mm.toFixed(1)} mm`;
  const um = mm * 1000;
  if (um >= 1) return `${um >= 100 ? um.toFixed(0) : um >= 10 ? um.toFixed(0) : um.toFixed(1)} µm`;
  return `${(um * 1000).toFixed(0)} nm`;
}
export function fmtMag(mm) {
  const m = 180 / mm;
  if (m < 10) return `${m.toFixed(1)}×`;
  if (m < 10000) return `${Math.round(m).toLocaleString('en')}×`;
  return `${(m / 1000).toFixed(0)}k×`;
}

export function createTransitions({ layer, sound, protoBase, reduced }) {
  const canvas = layer.querySelector('canvas');
  const g = canvas.getContext('2d');
  const dirEl = layer.querySelector('.tr-dir');
  const titleEl = layer.querySelector('.tr-title');
  const fieldEl = layer.querySelector('.tr-field');
  const magEl = layer.querySelector('.tr-mag');
  let playerKnown = null; // null: not probed yet; true/false after the first try

  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const w = layer.clientWidth || innerWidth, h = layer.clientHeight || innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    return { w, h, dpr };
  }

  function drawCover(img, cx, cy, r, scaleTo) {
    if (!img) return;
    const s = scaleTo / Math.min(img.width, img.height);
    g.drawImage(img, cx - img.width * s / 2, cy - img.height * s / 2, img.width * s, img.height * s);
  }

  function rim(cx, cy, r, a) {
    if (a <= 0.01) return;
    g.save();
    g.globalAlpha = a;
    g.lineWidth = Math.max(2, r * 0.035);
    const grd = g.createLinearGradient(cx, cy - r, cx, cy + r);
    grd.addColorStop(0, '#f2d48d'); grd.addColorStop(0.5, '#8f6c2c'); grd.addColorStop(1, '#e2bd6c');
    g.strokeStyle = grd;
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(242,212,141,.6)'; g.lineWidth = 1;
    for (let i = 0; i < 72; i++) {
      const ang = (i / 72) * Math.PI * 2, r0 = r * 1.03, r1 = r * (i % 6 ? 1.06 : 1.1);
      g.beginPath(); g.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0); g.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1); g.stroke();
    }
    g.restore();
  }

  // One frame of the specimen zoom, p = 0 (outer world) … 1 (inner world).
  function render(outer, inner, A, B, p, handoff, view) {
    const { w, h, dpr } = view;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#050806'; g.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, D = Math.hypot(w, h);
    if (handoff) {
      // Same scale: the light changes. Reflected lamp down, transmitted up.
      const z = 1 + 0.18 * p;
      const down = smooth(p / 0.6), up = smooth((p - 0.35) / 0.65);
      g.globalAlpha = 1;
      drawCover(outer, cx, cy, D / 2, D * z);
      g.fillStyle = `rgba(4,7,5,${0.85 * down})`; g.fillRect(0, 0, w, h);
      g.globalAlpha = up;
      drawCover(inner, cx, cy, D / 2, D * (0.94 + 0.06 * p));
      g.globalAlpha = 1;
      const glare = Math.sin(Math.PI * smooth((p - 0.3) / 0.5)) * 0.55;
      if (glare > 0) { g.fillStyle = `rgba(255,250,232,${glare})`; g.fillRect(0, 0, w, h); }
      return;
    }
    const R = Math.min(400, Math.max(1.6, A.fieldMm / B.fieldMm));
    const z = Math.pow(R, p);
    g.save();
    if (g.filter !== undefined) g.filter = `blur(${(Math.max(0, p - 0.35) * 9).toFixed(1)}px)`;
    drawCover(outer, cx, cy, D / 2, D * z);
    g.restore();
    const r = (D / 2 / R) * z * 1.02;
    const a = smooth(p / 0.25);
    // Darken outside the next field: the eye goes to the spot.
    g.fillStyle = `rgba(4,7,5,${0.5 * a * (1 - smooth((p - 0.7) / 0.3))})`;
    g.beginPath(); g.rect(0, 0, w, h); g.arc(cx, cy, r, 0, Math.PI * 2, true); g.fill();
    g.save();
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
    g.globalAlpha = a;
    drawCover(inner, cx, cy, r, Math.max(2 * r, 1));
    const vg = g.createRadialGradient(cx, cy, r * 0.5, cx, cy, r);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${0.5 * (1 - p)})`);
    g.fillStyle = vg; g.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    g.restore();
    rim(cx, cy, r, a * (1 - smooth((p - 0.75) / 0.25)));
  }

  async function specimenZoom(from, to, dir) {
    const zoomIn = dir === 'in';
    const A = zoomIn ? from : to; // the larger field
    const B = zoomIn ? to : from;
    const [outer, inner] = await Promise.all([loadImage(cardArt(A)), loadImage(cardArt(B))]);
    const handoff = HANDOFF.has(`${A.id}>${B.id}`);
    dirEl.textContent = handoff ? 'Changing the light' : zoomIn ? 'Zooming in' : 'Zooming out';
    titleEl.textContent = `${from.name} → ${to.name}`;
    const dur = reduced() ? 1.1 : handoff ? 2.4 : 2.9;
    sound.zoom(dir, dur);
    let view = size();
    const onResize = () => { view = size(); };
    addEventListener('resize', onResize);
    await new Promise((resolve) => {
      const t0 = performance.now();
      const step = (now) => {
        const u = Math.min(1, (now - t0) / 1000 / dur);
        const e = handoff ? smooth(u) : ease(u);
        const p = zoomIn ? e : 1 - e;
        render(outer, inner, A, B, p, handoff, view);
        const f = A.fieldMm * Math.pow(B.fieldMm / A.fieldMm, handoff ? p : p);
        fieldEl.textContent = `Field ${fmtField(f)}`;
        magEl.textContent = `${fmtMag(f)}`;
        layer.dataset.progress = u.toFixed(2);
        if (u < 1) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });
    removeEventListener('resize', onResize);
  }

  // The zoom prototype, embedded. Resolves true if it played the transition.
  function microscope(from, to, dir) {
    return new Promise((resolve) => {
      const f = document.createElement('iframe');
      f.title = 'Zoom transition';
      f.allow = 'autoplay; gamepad';
      f.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;opacity:0;transition:opacity .4s;z-index:1';
      f.src = new URL(`zoom/?embed=1&from=${from.id}&to=${to.id}&dir=${dir}`, protoBase).href;
      layer.appendChild(f);
      let stop = () => {};
      let timer = 0;
      const finish = (ok) => { clearTimeout(timer); stop(); f.style.opacity = '0'; setTimeout(() => f.remove(), 400); resolve(ok); };
      stop = listen(f.contentWindow, (m) => {
        if (m.type === 'ready') {
          if (!(m.provides || []).includes('transition')) { playerKnown = false; finish(false); return; }
          playerKnown = true;
          f.style.opacity = '1';
          send(f, 'resume');
          clearTimeout(timer);
          timer = setTimeout(() => finish(true), 30000);
        } else if (m.type === 'done') finish(true);
      });
      timer = setTimeout(() => { playerKnown = false; finish(false); }, 8000);
    });
  }

  return {
    /** Play the transition from one world to another; dir 'in' (forward) or 'out' (back). */
    async playTransition(from, to, dir, { style = 'microscope' } = {}) {
      layer.hidden = false;
      layer.dataset.progress = '0';
      try {
        if (style === 'microscope' && playerKnown !== false) {
          // Hold the first frame of the specimen zoom while the player loads.
          const ok = await microscope(from, to, dir);
          if (ok) return;
        }
        await specimenZoom(from, to, dir);
      } finally {
        layer.classList.add('leaving');
      }
    },
    /** Hide the layer once the next world is on screen. */
    hide() { layer.hidden = true; layer.classList.remove('leaving'); },
    get playerAvailable() { return playerKnown; },
  };
}
