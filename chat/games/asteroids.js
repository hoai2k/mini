// Asteroid Dodge: fly a rocket up a scrolling starfield, steering by tilting
// your head or moving it sideways (or phone tilt, drag, arrow keys,
// controller stick). Dodge the asteroids, grab the stars, and see how far you
// get on three shields. Everyone flies the same field: the owner puts a seed
// and a start time in shared state and the asteroids are derived from the
// seed by distance, so friends' see-through ghost rockets (published in
// setState about ten times a second) are comparable with yours.

const SPACING = 330;          // distance between rows of rocks
const FIRST = 900;            // distance of the first row
const FIELD = 1000;           // field width in world units
const SHIELDS = 3;
const PUBLISH_MS = 100;
const FONT = 'ui-rounded, system-ui, sans-serif';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const initial = name => (String(name || '?').trim()[0] || '?').toUpperCase();

// Small seeded PRNG (mulberry32).
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The field for a seed: row(i) = { d, rocks: [{x, r, spin, lump}], stars: [{x, dy}] }.
// Rows are generated lazily in order, so every player gets the same field.
function makeField(seed) {
  const rnd = mulberry32(seed);
  const rows = [];
  function gen(i) {
    const d = FIRST + i * SPACING;
    const want = 1 + (rnd() < 0.45 + i * 0.01 ? 1 : 0) + (rnd() < i * 0.008 ? 1 : 0);
    const rocks = [];
    for (let k = 0; k < want; k++) {
      const r = 45 + rnd() * 40;
      const rock = { x: 90 + rnd() * (FIELD - 180), r, spin: (rnd() - 0.5) * 1.6, lump: rnd() * 6 };
      rocks.push(rock);
      // Always leave a gap the rocket can slip through.
      const edges = rocks.slice().sort((a, b) => a.x - b.x);
      let ok = false, prev = 0;
      for (const e of [...edges, { x: FIELD + 60, r: 0 }]) {
        if (e.x - e.r - prev > 230) ok = true;
        prev = e.x + e.r;
      }
      if (!ok) rocks.pop();
    }
    const stars = [];
    if (rnd() < 0.7) {
      // A star (sometimes a short line of them) between this row and the next.
      let sx = 80 + rnd() * (FIELD - 160);
      const n = rnd() < 0.3 ? 3 : 1;
      for (let k = 0; k < n; k++) {
        const dy = SPACING * 0.5 + k * 70;
        if (!rocks.some(r => Math.abs(r.x - sx) < r.r + 40 && dy < 60)) stars.push({ x: sx, dy });
        sx = clamp(sx + (rnd() - 0.5) * 120, 60, FIELD - 60);
      }
    }
    return { d, rocks, stars };
  }
  return {
    seed,
    row(i) {
      while (rows.length <= i) rows.push(gen(rows.length));
      return rows[i];
    },
  };
}

// --- stand-in art ---------------------------------------------------------

function drawAsteroidStandIn(ctx, x, y, r, rot, lump) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i <= 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const rr = r * (0.86 + 0.14 * Math.sin(a * 3 + lump) * Math.cos(a * 2 + lump * 2));
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#b7a595');
  g.addColorStop(1, '#6e5b4e');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.strokeStyle = '#3e3028';
  ctx.stroke();
  ctx.fillStyle = 'rgba(60,40,30,0.45)';
  for (const [cx, cy, cr] of [[-0.3, -0.1, 0.22], [0.25, 0.25, 0.16], [0.2, -0.35, 0.12]]) {
    ctx.beginPath();
    ctx.arc(cx * r, cy * r, cr * r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawStar(ctx, x, y, r, spin) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffd43b';
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.12);
  ctx.strokeStyle = '#d18b00';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

// A chunky rocket pointing up, centred at (x, y), `size` tall. The porthole
// is returned so the caller can draw a face in it.
function drawRocketStandIn(ctx, x, y, size, flame, tilt) {
  const s = size;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  // Flame.
  ctx.beginPath();
  ctx.moveTo(-s * 0.13, s * 0.4);
  ctx.quadraticCurveTo(0, s * (0.55 + flame * 0.3), s * 0.13, s * 0.4);
  ctx.closePath();
  ctx.fillStyle = '#ff9f1c';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-s * 0.07, s * 0.4);
  ctx.quadraticCurveTo(0, s * (0.5 + flame * 0.2), s * 0.07, s * 0.4);
  ctx.fillStyle = '#fff3a0';
  ctx.fill();
  // Fins.
  ctx.fillStyle = '#ff5fa2';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx * s * 0.18, s * 0.05);
    ctx.lineTo(sx * s * 0.38, s * 0.42);
    ctx.lineTo(sx * s * 0.14, s * 0.38);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, s * 0.02);
    ctx.strokeStyle = '#a02a62';
    ctx.stroke();
  }
  // Body.
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.5);
  ctx.bezierCurveTo(s * 0.3, -s * 0.28, s * 0.24, s * 0.2, s * 0.17, s * 0.4);
  ctx.lineTo(-s * 0.17, s * 0.4);
  ctx.bezierCurveTo(-s * 0.24, s * 0.2, -s * 0.3, -s * 0.28, 0, -s * 0.5);
  ctx.closePath();
  const g = ctx.createLinearGradient(-s * 0.25, 0, s * 0.25, 0);
  g.addColorStop(0, '#f3f3fa');
  g.addColorStop(0.6, '#ffffff');
  g.addColorStop(1, '#c9cbe0');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = Math.max(2, s * 0.03);
  ctx.strokeStyle = '#5a4a8a';
  ctx.stroke();
  // Nose cone.
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.5);
  ctx.bezierCurveTo(s * 0.14, -s * 0.4, s * 0.19, -s * 0.28, s * 0.2, -s * 0.2);
  ctx.lineTo(-s * 0.2, -s * 0.2);
  ctx.bezierCurveTo(-s * 0.19, -s * 0.28, -s * 0.14, -s * 0.4, 0, -s * 0.5);
  ctx.fillStyle = '#ff4d5e';
  ctx.fill();
  ctx.stroke();
  // Stripe.
  ctx.fillStyle = '#ff4d5e';
  ctx.fillRect(-s * 0.2, s * 0.25, s * 0.4, s * 0.06);
  ctx.restore();
}

export default {
  id: 'asteroids',
  name: 'Asteroid Dodge',
  emoji: '☄️',
  blurb: 'Tilt your head to steer your rocket. Dodge rocks, grab stars.',
  minPlayers: 1,
  maxPlayers: 8,
  needsFace: true,
  fullBleed: true,

  create(api) {
    const canvas = document.createElement('canvas');
    canvas.className = 'g-canvas';
    api.el.append(canvas);
    const ctx = canvas.getContext('2d');

    let best = api.store.get('best', 0);
    let w = 0, h = 0, dpr = 1, s = 1, ox = 0, inset = { top: 0, bottom: 0 };
    let raf = 0, last = performance.now(), clock = 0;
    let field = null;
    let run = null;            // my current run
    const ghosts = new Map();  // id -> eased { x, d }
    let lastPub = 0;
    // Input.
    let pointerX = null, pointerDown = false;
    const keys = { left: false, right: false };
    let padX = 0;
    let lastManual = -10;
    let askedMotion = false;
    // Decorative starfield (screen space, parallax by layer).
    const rnd0 = mulberry32(7);
    const stars = Array.from({ length: 90 }, () => ({ x: rnd0(), y: rnd0(), l: rnd0() < 0.5 ? 0 : rnd0() < 0.6 ? 1 : 2 }));

    function newRun(startAt) {
      return {
        startAt, x: FIELD / 2, target: FIELD / 2, dist: 0, vel: 0, tilt: 0,
        shields: SHIELDS, hurtUntil: 0, starsGot: 0, over: false, floaters: [], taken: new Set(), shake: 0,
      };
    }

    api.setState({ x: FIELD / 2, d: 0, sh: SHIELDS, st: 0, best, over: false });

    function resize() {
      const r = api.el.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      inset = api.insets ? api.insets() : { top: 0, bottom: 0 };
      s = Math.min(w, h * 0.9) / FIELD;
      ox = (w - FIELD * s) / 2;
    }
    const ro = new ResizeObserver(resize);
    ro.observe(api.el);
    resize();

    const rocketPx = () => clamp(Math.min(w, h) * 0.2, 62, 120);
    const rocketY = () => h - inset.bottom - rocketPx() * 0.75 - 14;
    const hitR = () => (rocketPx() * 0.3) / s;
    const speedAt = d => clamp(330 + d * 0.012, 330, 760);
    const toX = x => ox + x * s;

    // --- shared state ------------------------------------------------------
    // The owner publishes the seed once; everyone else reads it.
    function sync() {
      let sh = api.shared();
      if (!sh && api.isOwner()) {
        sh = { seed: Math.floor(Math.random() * 1e9), startAt: Date.now() + 3200 };
        api.setShared(sh);
      }
      if (!sh || !Number.isFinite(sh.seed)) return false;
      if (!field || field.seed !== sh.seed) {
        field = makeField(sh.seed);
        run = newRun(Number.isFinite(sh.startAt) ? sh.startAt : Date.now() + 1500);
      }
      return true;
    }

    function restart() {
      run = newRun(Date.now() + 1800);
      lastPub = 0;
    }

    // --- play --------------------------------------------------------------
    function floater(text, x, y, color) {
      run.floaters.push({ text, x, y, t: 0, color });
    }

    function steer(dt) {
      const face = api.face();
      const cw = api.selfCanvas?.width || 0;
      const tilt = api.tilt?.();
      const manual = clock - lastManual < 1.5;
      if (keys.left || keys.right) {
        run.target = clamp(run.target + (keys.right - keys.left) * FIELD * 1.0 * dt, 0, FIELD);
        lastManual = clock;
      } else if (Math.abs(padX) > 0.15) {
        run.target = clamp(run.target + padX * FIELD * 1.0 * dt, 0, FIELD);
        lastManual = clock;
      } else if (pointerDown || (pointerX != null && manual)) {
        if (pointerX != null) run.target = clamp((pointerX - ox) / s, 0, FIELD);
      } else if (face && cw > 0 && !manual) {
        // Lean the head (roll) or slide it sideways; the camera is already mirrored.
        const slide = (face.center.x / cw - 0.5) * 1.5;
        const lean = (face.roll || 0) * 0.9;
        run.target = clamp(0.5 + slide + lean, 0, 1) * FIELD;
      } else if (tilt && !manual) {
        run.target = clamp(0.5 + tilt.x * 0.55, 0, 1) * FIELD;
      }
    }

    function update(dt) {
      if (!run) return;
      for (const f of run.floaters) f.t += dt;
      run.floaters = run.floaters.filter(f => f.t < 1.1);
      run.shake = Math.max(0, run.shake - dt);
      // Ease friends' ghosts toward their latest published position.
      for (const m of api.players()) {
        if (m.me) continue;
        const st = m.state || {};
        if (!Number.isFinite(st.x) || !Number.isFinite(st.d)) continue;
        const gh = ghosts.get(m.id) || { x: st.x, d: st.d };
        gh.x += (clamp(st.x, 0, FIELD) - gh.x) * Math.min(1, dt * 10);
        gh.d += (st.d - gh.d) * Math.min(1, dt * 8);
        ghosts.set(m.id, gh);
      }
      if (run.over) return;
      steer(dt);
      const prev = run.x;
      run.x += (run.target - run.x) * Math.min(1, dt * 9);
      run.tilt += ((run.x - prev) / Math.max(dt, 1e-3) / FIELD * 0.9 - run.tilt) * Math.min(1, dt * 8);
      if (Date.now() < run.startAt) return;
      run.vel = speedAt(run.dist);
      run.dist += run.vel * dt;

      // Collisions with nearby rows.
      const r0 = Math.max(0, Math.floor((run.dist - 250 - FIRST) / SPACING));
      const r1 = Math.floor((run.dist + 250 - FIRST) / SPACING) + 1;
      for (let i = r0; i <= r1; i++) {
        const row = field.row(i);
        row.rocks.forEach((rock, k) => {
          if (run.over) return;
          const dx = rock.x - run.x, dy = row.d - run.dist;
          if (Math.hypot(dx, dy) < rock.r * 0.82 + hitR() && Date.now() > run.hurtUntil) hit(rock, dx);
        });
        row.stars.forEach((star, k) => {
          const key = `${i}:${k}`;
          if (run.taken.has(key)) return;
          if (Math.hypot(star.x - run.x, row.d + star.dy - run.dist) < 34 + hitR()) {
            run.taken.add(key);
            run.starsGot++;
            floater('+20', toX(star.x), rocketY() - rocketPx() * 0.7, '#ffd43b');
            api.sfx('score');
          }
        });
      }
      if (clock - lastPub > PUBLISH_MS / 1000) {
        lastPub = clock;
        publish();
      }
    }

    function hit(rock, dx) {
      run.shields--;
      run.hurtUntil = Date.now() + 1400;
      run.shake = 0.35;
      // A bump sideways away from the rock.
      run.x = clamp(run.x - Math.sign(dx || 1) * 60, 0, FIELD);
      run.target = run.x;
      api.sfx(run.shields > 0 ? 'bang' : 'lose');
      floater(run.shields > 0 ? 'Ouch!' : 'Boom!', toX(run.x), rocketY() - rocketPx(), '#ff6b6b');
      if (run.shields <= 0) {
        run.over = true;
        const metres = Math.floor(run.dist / 10);
        if (metres > best) {
          best = metres;
          api.store.set('best', best);
          api.toast('New best distance!');
        }
      }
      publish();
    }

    function publish() {
      api.setState({
        x: Math.round(run.x), d: Math.round(run.dist), sh: run.shields, st: run.starsGot,
        best, over: run.over,
      });
    }

    // --- input -------------------------------------------------------------
    canvas.addEventListener('pointerdown', e => {
      canvas.setPointerCapture?.(e.pointerId);
      pointerDown = true;
      pointerX = e.clientX - canvas.getBoundingClientRect().left;
      lastManual = clock;
      if (!askedMotion) { askedMotion = true; api.requestMotion?.(); }
    });
    canvas.addEventListener('pointermove', e => {
      if (pointerDown || e.pointerType === 'mouse') {
        pointerX = e.clientX - canvas.getBoundingClientRect().left;
        lastManual = clock;
      }
    });
    const release = () => { pointerDown = false; };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);

    const typing = e => /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName);
    function onKey(e) {
      if (typing(e) || !api.el.isConnected) return;
      const down = e.type === 'keydown';
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { keys.left = down; e.preventDefault(); }
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') { keys.right = down; e.preventDefault(); }
      else if (down && run?.over && (e.code === 'Space' || e.code === 'Enter')) { restart(); e.preventDefault(); }
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);

    // --- drawing -----------------------------------------------------------
    function text(str, x, y, size, color, align = 'center') {
      ctx.font = `900 ${size}px ${FONT}`;
      ctx.textAlign = align;
      ctx.textBaseline = 'alphabetic';
      ctx.lineWidth = Math.max(3, size * 0.2);
      ctx.strokeStyle = 'rgba(10,0,40,0.75)';
      ctx.strokeText(str, x, y);
      ctx.fillStyle = color;
      ctx.fillText(str, x, y);
    }

    function drawSpace(dist) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#12062e');
      g.addColorStop(1, '#3a1a6e');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // A far-off pink planet that drifts by slowly.
      const py = ((dist * s * 0.03) % (h * 2.2)) - h * 0.3;
      ctx.fillStyle = 'rgba(255,95,162,0.35)';
      ctx.beginPath();
      ctx.arc(w * 0.2, py, Math.min(w, h) * 0.16, 0, Math.PI * 2);
      ctx.fill();
      for (const st of stars) {
        const speed = [0.04, 0.12, 0.3][st.l];
        const y = (((st.y * h + dist * s * speed) % h) + h) % h;
        ctx.globalAlpha = [0.4, 0.65, 0.95][st.l];
        ctx.fillStyle = '#fff';
        const r = [1, 1.5, 2.2][st.l];
        ctx.fillRect(st.x * w, y, r, r * (1 + st.l * 2));
      }
      ctx.globalAlpha = 1;
    }

    // My face (or an initial) in a porthole at (x, y).
    function drawPorthole(x, y, r, m) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = m.color || '#3fe0d0';
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      const face = m.me ? api.face() : null;
      const cv = api.selfCanvas;
      let drew = false;
      if (m.me && face && cv?.width) {
        // Crop a square around my face from my live canvas.
        const side = clamp((face.scale || 80) * 3.4, 40, Math.min(cv.width, cv.height));
        const sx = clamp(face.center.x - side / 2, 0, cv.width - side);
        const sy = clamp(face.center.y - side / 2, 0, cv.height - side);
        try { ctx.drawImage(cv, sx, sy, side, side, x - r, y - r, r * 2, r * 2); drew = true; } catch (e) { /* not ready */ }
      } else if (m.me && cv?.width) {
        try { ctx.drawImage(cv, 0, 0, cv.width, cv.height, x - r, y - r, r * 2, r * 2); drew = true; } catch (e) { /* not ready */ }
      }
      if (!drew) {
        ctx.fillStyle = '#fff';
        ctx.font = `900 ${r * 1.2}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initial(m.name), x, y + r * 0.05);
      }
      ctx.restore();
      ctx.lineWidth = Math.max(2, r * 0.18);
      ctx.strokeStyle = '#8f7bd6';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    function drawRocket(x, y, size, tilt, m, alpha, tint) {
      ctx.save();
      ctx.globalAlpha = alpha;
      const art = api.img('rocket');
      const flame = 0.5 + 0.5 * Math.sin(clock * 30);
      if (art) {
        ctx.translate(x, y);
        ctx.rotate(tilt);
        ctx.drawImage(art, -size * 0.5, -size * 0.5, size, size);
        ctx.rotate(-tilt);
        ctx.translate(-x, -y);
      } else {
        drawRocketStandIn(ctx, x, y, size, flame, tilt);
      }
      if (alpha > 0.9) {
        const cx = x + Math.sin(tilt) * size * 0.05, cy = y - size * 0.08;
        drawPorthole(cx, cy, size * 0.14, m);
      } else {
        // Ghosts get their colour and initial in the window instead of a face.
        ctx.fillStyle = tint;
        ctx.beginPath();
        ctx.arc(x, y - size * 0.08, size * 0.14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `900 ${size * 0.18}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initial(m.name), x, y - size * 0.07);
      }
      ctx.restore();
    }

    function render() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const now = Date.now();
      if (!run || !field) {
        drawSpace(0);
        text('Getting ready…', w / 2, h / 2, 20, '#fff');
        return;
      }
      ctx.save();
      if (run.shake > 0) ctx.translate((Math.random() - 0.5) * 12 * run.shake, (Math.random() - 0.5) * 12 * run.shake);
      drawSpace(run.dist);
      const ry = rocketY();
      const yOf = d => ry - (d - run.dist) * s;

      // Rocks and stars on screen.
      const dTop = run.dist + (ry + 100) / s, dBot = run.dist - (h - ry + 100) / s;
      const i0 = Math.max(0, Math.floor((dBot - FIRST) / SPACING) - 1), i1 = Math.floor((dTop - FIRST) / SPACING) + 1;
      for (let i = i0; i <= i1; i++) {
        const row = field.row(i);
        const asteroidArt = api.img('asteroid');
        for (const rock of row.rocks) {
          const x = toX(rock.x), y = yOf(row.d), r = rock.r * s;
          if (y < -r * 2 || y > h + r * 2) continue;
          if (asteroidArt) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(clock * rock.spin);
            ctx.drawImage(asteroidArt, -r * 1.1, -r * 1.1, r * 2.2, r * 2.2);
            ctx.restore();
          } else {
            drawAsteroidStandIn(ctx, x, y, r, clock * rock.spin, rock.lump);
          }
        }
        row.stars.forEach((star, k) => {
          if (run.taken.has(`${i}:${k}`)) return;
          const y = yOf(row.d + star.dy);
          if (y < -30 || y > h + 30) return;
          drawStar(ctx, toX(star.x), y, Math.max(9, 28 * s * 1.1), clock * 2);
        });
      }

      // Friends' ghost rockets, clamped to the screen edge when far ahead or behind.
      for (const m of api.players()) {
        if (m.me) continue;
        const gh = ghosts.get(m.id);
        if (!gh || m.state?.over) continue;
        const raw = yOf(gh.d);
        const y = clamp(raw, inset.top + 70, h - inset.bottom - 10);
        const size = rocketPx() * 0.8;
        drawRocket(toX(clamp(gh.x, 0, FIELD)), y, size, 0, m, 0.4, m.color || '#fff');
        if (raw !== y) text(raw < y ? '▲' : '▼', toX(gh.x), y + (raw < y ? -size * 0.55 : size * 0.7), 14, m.color || '#fff');
      }

      // My rocket, blinking after a hit.
      const me = api.players().find(m => m.me) || { me: true, name: api.me.name, color: api.me.color };
      if (!run.over) {
        const blink = now < run.hurtUntil && Math.floor(now / 90) % 2 === 0;
        if (!blink) drawRocket(toX(run.x), ry, rocketPx(), run.tilt, me, 1, me.color);
        if (now < run.hurtUntil) {
          ctx.strokeStyle = 'rgba(105,219,124,0.7)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(toX(run.x), ry, rocketPx() * 0.6, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();

      for (const f of run.floaters) {
        ctx.globalAlpha = clamp(1.1 - f.t, 0, 1);
        text(f.text, f.x, f.y - f.t * 50, 22, f.color);
        ctx.globalAlpha = 1;
      }

      // HUD, kept below the app's top bar.
      const hudY = inset.top + 26;
      const metres = Math.floor(run.dist / 10);
      text(`${metres} m`, 14, hudY, 24, '#fff', 'left');
      text(`⭐ ${run.starsGot} · ${metres + run.starsGot * 20} pts`, 14, hudY + 24, 15, '#ffd43b', 'left');
      ctx.font = `16px ${FONT}`;
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      for (let i = 0; i < SHIELDS; i++) {
        ctx.globalAlpha = i < run.shields ? 1 : 0.25;
        ctx.fillText('🛡️', w - 14 - (SHIELDS - 1 - i) * 24, hudY - 6);
      }
      ctx.globalAlpha = 1;
      text(`Best ${best} m`, w - 14, hudY + 16, 14, '#ffd43b', 'right');
      let ly = hudY + 48;
      for (const m of api.players()) {
        if (m.me) continue;
        const st = m.state || {};
        const dd = Number.isFinite(st.d) ? Math.floor(st.d / 10) : 0;
        text(`${m.name}: ${dd} m${st.over ? ' 💥' : ''}`, 14, ly, 13, m.color || '#fff', 'left');
        ly += 18;
      }

      // Countdown before the start.
      const left = run.startAt - now;
      if (left > 0 && !run.over) {
        text(left > 2200 ? '3' : left > 1200 ? '2' : left > 200 ? '1' : 'Go!', w / 2, h * 0.36, 72, '#fff');
        text(api.face() ? 'Tilt your head or slide it sideways' : 'Drag or use the arrow keys', w / 2, h * 0.36 + 34, clamp(w * 0.04, 13, 18), '#fff');
      } else if (left > -600 && !run.over) {
        ctx.globalAlpha = clamp((600 + left) / 600, 0, 1);
        text('Go!', w / 2, h * 0.36, 72, '#fff');
        ctx.globalAlpha = 1;
      }
    }

    // Game over card.
    const overlay = document.createElement('div');
    overlay.className = 'g-center';
    overlay.style.cssText = 'display:none;pointer-events:none;';
    const card = document.createElement('div');
    card.style.cssText = 'pointer-events:auto;text-align:center;padding:16px 22px;border-radius:16px;background:rgba(30,10,70,0.9);display:flex;flex-direction:column;align-items:center;gap:6px;';
    const title = document.createElement('div');
    title.className = 'g-big';
    title.textContent = 'Rocket down!';
    const sub = document.createElement('div');
    const again = document.createElement('button');
    again.className = 'btn aqua';
    again.textContent = 'Play again';
    again.style.marginTop = '8px';
    again.addEventListener('click', restart);
    card.append(title, sub, again);
    overlay.append(card);
    api.el.append(overlay);
    let shownOver = false;

    function frame(t) {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      clock += dt;
      if (sync()) update(dt);
      render();
      if (run?.over && !shownOver) {
        shownOver = true;
        const metres = Math.floor(run.dist / 10);
        sub.textContent = `${metres + run.starsGot * 20} pts · ${metres} m · ${run.starsGot} star${run.starsGot === 1 ? '' : 's'} · Best ${best} m`;
        overlay.style.display = 'flex';
      } else if (run && !run.over && shownOver) {
        shownOver = false;
        overlay.style.display = 'none';
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return {
      destroy() {
        cancelAnimationFrame(raf);
        ro.disconnect();
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('keyup', onKey);
      },
      onPad(pad) {
        padX = pad.x || (pad.right ? 1 : 0) - (pad.left ? 1 : 0);
        if (run?.over && (pad.a || pad.pressed?.[0])) restart();
      },
    };
  },
};
