// Don't Smile: everyone's live face sits in a tile, and after a 3-2-1 the
// screen gets silly on purpose: googly eyes wobble on your own video, ducks
// and moustaches land on faces, joke cards and honks go off. Your own camera
// spots your smile (face.smile above half for 200 ms) and tells the owner,
// who stamps SMILED on your tile and gives your face a giant cartoon grin.
// The last straight face wins the round; alone you play for the longest time.
//
// The owner referees from shared state { phase, round, seed, startAt, ready,
// smiled: {id: ms}, scores, last }. The silly events are derived from the
// seed and the clock, so every client shows the same ones at the same time
// and a new owner can carry on from shared() alone.

const MAX_PLAYERS = 6;
const COUNT_MS = 3400;        // 3-2-1 before the round starts
const ROUND_MS = 30000;       // a round with several players ends here
const SOLO_MS = 40000;        // a solo round ends here
const SMILE_ON = 0.5;
const SMILE_HOLD_MS = 200;
const SLOT_MS = 3000;         // one silly event slot
const CONTROLS_H = 70;
const FONT = 'ui-rounded, system-ui, sans-serif';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const initial = name => (String(name || '?').trim()[0] || '?').toUpperCase();

const JOKES = [
  ['Why did the scarecrow win an award?', 'He was outstanding in his field.'],
  ['What do you call a fake noodle?', 'An impasta.'],
  ['Why don’t eggs tell jokes?', 'They’d crack each other up.'],
  ['What did the ocean say to the beach?', 'Nothing, it just waved.'],
  ['Why did the bicycle fall over?', 'It was two tired.'],
  ['What do you call a bear with no teeth?', 'A gummy bear.'],
  ['Why can’t you trust stairs?', 'They’re always up to something.'],
  ['What did one wall say to the other?', 'I’ll meet you at the corner.'],
  ['Why did the banana go to the doctor?', 'It wasn’t peeling well.'],
  ['What do you call cheese that isn’t yours?', 'Nacho cheese.'],
  ['Why do cows wear bells?', 'Because their horns don’t work.'],
  ['What’s orange and sounds like a parrot?', 'A carrot.'],
];
const OVERLAYS = ['duck', 'moustache', 'nose', 'shades', 'hat'];

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

// What is happening in slot `slot` of a round with this seed: overlays on a
// few players (by index), and maybe a joke or a honk. Same everywhere.
function slotEvent(seed, slot, n) {
  const rnd = mulberry32(seed * 31 + slot * 7919);
  const overlays = [];
  const count = n > 2 && rnd() < 0.5 ? 2 : 1;
  for (let i = 0; i < count; i++) overlays.push({ who: Math.floor(rnd() * n), kind: OVERLAYS[Math.floor(rnd() * OVERLAYS.length)] });
  const r = rnd();
  const extra = slot === 0 ? null : r < 0.4 ? 'joke' : r < 0.72 ? 'honk' : null;
  return { overlays, extra, joke: JOKES[Math.floor(rnd() * JOKES.length)] };
}

const fmt = ms => `${(ms / 1000).toFixed(1)} s`;

export default {
  id: 'dontsmile',
  name: 'Don’t Smile',
  emoji: '😐',
  blurb: 'Keep a straight face while the screen tries to make you laugh.',
  minPlayers: 1,
  maxPlayers: MAX_PLAYERS,
  needsFace: true,
  fullBleed: false,

  create(api) {
    const canvas = document.createElement('canvas');
    canvas.className = 'g-canvas';
    api.el.append(canvas);
    const ctx = canvas.getContext('2d');

    // Controls: a status line and the Ready button along the bottom.
    const bar = document.createElement('div');
    bar.style.cssText = `position:absolute;left:0;right:0;bottom:0;height:${CONTROLS_H}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:6px 12px;text-align:center;`;
    const status = document.createElement('div');
    status.style.cssText = 'font-weight:800;font-size:0.95rem;line-height:1.2;';
    const ready = document.createElement('button');
    ready.className = 'btn aqua';
    ready.textContent = 'Ready!';
    bar.append(status, ready);
    api.el.append(bar);

    let w = 0, h = 0, dpr = 1;
    let raf = 0, last = performance.now(), clock = 0;
    let smileSince = 0;        // when my smile went over the line
    let reportedRound = -1;    // the round I already reported a smile for
    let stateSig = '';
    let lastSlot = -1, lastCount = -1, lastPhaseSeen = '';
    let wins = api.store.get('wins', 0);
    let bestSolo = api.store.get('bestSolo', 0);
    const floaters = [];
    api.setState({ wins });

    function resize() {
      const r = api.el.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ro = new ResizeObserver(resize);
    ro.observe(api.el);
    resize();

    // --- referee (owner) ---------------------------------------------------
    const contestants = () => api.players().slice(0, MAX_PLAYERS);
    const isContestant = id => contestants().some(m => m.id === id);

    function initialShared() {
      return { phase: 'lobby', round: 1, seed: Math.floor(Math.random() * 1e6), startAt: 0, ready: {}, smiled: {}, scores: {}, last: null };
    }

    function ownerTick() {
      const sh = api.shared();
      if (!sh) {
        api.setShared(initialShared());
        return;
      }
      const now = Date.now();
      const list = contestants();
      if (sh.phase === 'lobby') {
        if (list.length && list.every(m => sh.ready?.[m.id])) {
          api.setShared({ ...sh, phase: 'count', startAt: now + COUNT_MS, smiled: {}, seed: Math.floor(Math.random() * 1e6) });
        }
      } else if (sh.phase === 'count') {
        if (now >= sh.startAt) api.setShared({ ...sh, phase: 'play' });
      } else if (sh.phase === 'play') {
        const solo = list.length === 1;
        const straight = list.filter(m => sh.smiled?.[m.id] == null);
        const elapsed = now - sh.startAt;
        const cap = solo ? SOLO_MS : ROUND_MS;
        if (solo ? (!straight.length || elapsed >= cap) : (straight.length <= 1 || elapsed >= cap)) finish(sh, list, straight, solo, Math.min(elapsed, cap));
      }
    }

    function finish(sh, list, straight, solo, elapsed) {
      const scores = { ...sh.scores };
      let winners;
      if (solo) {
        winners = [];
      } else if (straight.length) {
        winners = straight.map(m => m.id);
      } else {
        // Everyone smiled: whoever held out longest wins.
        const longest = Math.max(...list.map(m => sh.smiled?.[m.id] ?? 0));
        winners = list.filter(m => (sh.smiled?.[m.id] ?? 0) === longest).map(m => m.id);
      }
      for (const id of winners) scores[id] = (scores[id] || 0) + 1;
      const times = {};
      for (const m of list) times[m.id] = sh.smiled?.[m.id] ?? elapsed;
      api.setShared({
        ...sh, phase: 'lobby', round: sh.round + 1, ready: {}, scores,
        last: { round: sh.round, solo, winners, times, held: solo ? !list.some(m => sh.smiled?.[m.id] != null) : false },
      });
    }

    function handleReady(id) {
      const sh = api.shared();
      if (!sh || sh.phase !== 'lobby' || !isContestant(id)) return;
      if (sh.ready?.[id]) return;
      api.setShared({ ...sh, ready: { ...sh.ready, [id]: true } });
    }
    function handleSmiled(id, at) {
      const sh = api.shared();
      if (!sh || sh.phase !== 'play' || !isContestant(id) || sh.smiled?.[id] != null) return;
      const ms = clamp(Math.round(at - sh.startAt), 0, Date.now() - sh.startAt + 400);
      api.setShared({ ...sh, smiled: { ...sh.smiled, [id]: ms } });
    }
    api.on('ready', (d, from) => {
      if (api.isOwner()) handleReady(from);
    });
    api.on('smiled', (d, from) => {
      const sh = api.shared();
      if (!api.isOwner() || !d || !sh || d.round !== sh.round || !Number.isFinite(d.at)) return;
      handleSmiled(from, d.at);
    });

    ready.addEventListener('click', () => {
      const sh = api.shared();
      if (!sh || sh.phase !== 'lobby' || sh.ready?.[api.me.id] || !api.face()) return;
      api.sfx('click');
      if (api.isOwner()) handleReady(api.me.id);
      else api.send('ready', { round: sh.round });
    });

    // --- my smile ------------------------------------------------------------
    function watchSmile() {
      const sh = api.shared();
      if (!sh || sh.phase !== 'play' || Date.now() < sh.startAt) { smileSince = 0; return; }
      if (!isContestant(api.me.id) || sh.smiled?.[api.me.id] != null || reportedRound === sh.round) return;
      const f = api.face();
      if (f && f.smile > SMILE_ON) {
        if (!smileSince) smileSince = performance.now();
        if (performance.now() - smileSince >= SMILE_HOLD_MS) {
          reportedRound = sh.round;
          const at = Date.now() - SMILE_HOLD_MS;
          if (api.isOwner()) handleSmiled(api.me.id, at);
          else api.send('smiled', { round: sh.round, at });
        }
      } else {
        smileSince = 0;
      }
    }

    // --- layout --------------------------------------------------------------
    // Best grid for n tiles in the area above the controls.
    function layout(n) {
      // Tall panels keep a strip free for the joke cards.
      const top = 54, aw = w, ah = Math.max(60, h - CONTROLS_H - top - (h > 560 ? 100 : 0));
      let bestL = null;
      for (let cols = 1; cols <= n; cols++) {
        const rows = Math.ceil(n / cols);
        const tw = aw / cols, th = ah / rows;
        const r = Math.min(tw * 0.5 - 14, (th - 44) * 0.5);
        if (!bestL || r > bestL.r) bestL = { cols, rows, tw, th, r };
      }
      const tiles = [];
      for (let i = 0; i < n; i++) {
        const col = i % bestL.cols, row = Math.floor(i / bestL.cols);
        const inRow = row === bestL.rows - 1 ? n - bestL.cols * (bestL.rows - 1) : bestL.cols;
        const x0 = (aw - inRow * bestL.tw) / 2 + col * bestL.tw;
        tiles.push({ x: x0, y: top + row * bestL.th, w: bestL.tw, h: bestL.th, cx: x0 + bestL.tw / 2, cy: top + row * bestL.th + (bestL.th - 22) / 2, r: Math.max(14, bestL.r) });
      }
      return tiles;
    }

    // --- drawing -------------------------------------------------------------
    function text(str, x, y, size, color, align = 'center') {
      ctx.font = `900 ${size}px ${FONT}`;
      ctx.textAlign = align;
      ctx.textBaseline = 'alphabetic';
      ctx.lineWidth = Math.max(3, size * 0.2);
      ctx.strokeStyle = 'rgba(20,5,40,0.8)';
      ctx.lineJoin = 'round';
      ctx.strokeText(str, x, y);
      ctx.fillStyle = color;
      ctx.fillText(str, x, y);
    }

    // Draws the player's video as a cover-cropped circle; returns a mapper from
    // source pixels (their video) to canvas pixels, or null if no picture yet.
    function drawFace(m, t) {
      const { cx, cy, r } = t;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = m.color || '#9775fa';
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      const media = api.mediaOf(m.id);
      const sw = media?.videoWidth || media?.width || 0;
      const sh = media?.videoHeight || media?.height || 0;
      let map = null;
      if (sw > 0 && sh > 0) {
        const s = Math.max((r * 2) / sw, (r * 2) / sh);
        try {
          ctx.drawImage(media, cx - (sw * s) / 2, cy - (sh * s) / 2, sw * s, sh * s);
          map = p => ({ x: cx + (p.x - sw / 2) * s, y: cy + (p.y - sh / 2) * s, s });
        } catch (e) { /* not ready yet */ }
      }
      if (!map) {
        ctx.fillStyle = '#fff';
        ctx.font = `900 ${r}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initial(m.name), cx, cy + r * 0.05);
      }
      ctx.restore();
      return map;
    }

    // Two wobbly googly eyes at the eye positions of my own face.
    function drawGoogly(map, face) {
      for (const [k, e] of [[0, face.eyeL], [1, face.eyeR]]) {
        const p = map(e);
        const er = Math.max(6, face.scale * p.s * 0.42);
        const wob = clock * 7 + k * 2.1;
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#222';
        ctx.lineWidth = Math.max(1.5, er * 0.12);
        ctx.beginPath();
        ctx.arc(p.x, p.y, er, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(p.x + Math.sin(wob) * er * 0.38, p.y + Math.cos(wob * 1.3) * er * 0.38, er * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Funny overlays at fixed spots on the face circle.
    function drawOverlay(kind, t, age) {
      const { cx, cy, r } = t;
      ctx.save();
      if (kind === 'duck') {
        const x = cx + Math.sin(age * 3) * r * 0.55;
        const y = cy - r * 0.2 - Math.abs(Math.sin(age * 5)) * r * 0.6;
        ctx.font = `${r * 0.7}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🦆', x, y);
      } else if (kind === 'moustache') {
        ctx.translate(cx, cy + r * 0.32);
        ctx.fillStyle = '#3b2314';
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.04);
        ctx.bezierCurveTo(r * 0.2, -r * 0.2, r * 0.5, -r * 0.12, r * 0.55, r * 0.1);
        ctx.bezierCurveTo(r * 0.35, 0, r * 0.15, r * 0.08, 0, r * 0.06);
        ctx.bezierCurveTo(-r * 0.15, r * 0.08, -r * 0.35, 0, -r * 0.55, r * 0.1);
        ctx.bezierCurveTo(-r * 0.5, -r * 0.12, -r * 0.2, -r * 0.2, 0, -r * 0.04);
        ctx.fill();
      } else if (kind === 'nose') {
        ctx.fillStyle = '#ff3b3b';
        ctx.beginPath();
        ctx.arc(cx, cy + r * 0.12, r * 0.14 + Math.sin(age * 8) * r * 0.01, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.arc(cx - r * 0.04, cy + r * 0.07, r * 0.04, 0, Math.PI * 2);
        ctx.fill();
      } else if (kind === 'shades') {
        ctx.fillStyle = '#111';
        ctx.fillRect(cx - r * 0.62, cy - r * 0.28, r * 0.5, r * 0.3);
        ctx.fillRect(cx + r * 0.12, cy - r * 0.28, r * 0.5, r * 0.3);
        ctx.fillRect(cx - r * 0.15, cy - r * 0.2, r * 0.3, r * 0.05);
      } else if (kind === 'hat') {
        ctx.translate(cx, cy - r * 0.85 - Math.abs(Math.sin(age * 6)) * r * 0.08);
        ctx.fillStyle = '#ff5fa2';
        ctx.beginPath();
        ctx.moveTo(-r * 0.35, r * 0.35);
        ctx.lineTo(0, -r * 0.45);
        ctx.lineTo(r * 0.35, r * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffd43b';
        ctx.beginPath();
        ctx.arc(0, -r * 0.45, r * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // A giant cartoon grin over the lower half of the face circle.
    function drawGrin(t) {
      const { cx, cy, r } = t;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.85, cy + r * 0.08);
      ctx.bezierCurveTo(cx - r * 0.6, cy + r * 1.0, cx + r * 0.6, cy + r * 1.0, cx + r * 0.85, cy + r * 0.08);
      ctx.bezierCurveTo(cx + r * 0.4, cy + r * 0.2, cx - r * 0.4, cy + r * 0.2, cx - r * 0.85, cy + r * 0.08);
      ctx.closePath();
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.lineWidth = Math.max(3, r * 0.09);
      ctx.strokeStyle = '#c1121f';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = 'rgba(193,18,31,0.55)';
      ctx.lineWidth = Math.max(1.5, r * 0.03);
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * r * 0.2, cy);
        ctx.lineTo(cx + i * r * 0.2, cy + r);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(cx - r, cy + r * 0.38);
      ctx.lineTo(cx + r, cy + r * 0.38);
      ctx.stroke();
      ctx.restore();
      ctx.restore();
    }

    function banner(msg, y, size) {
      text(msg, w / 2, y, size, '#fff');
    }

    function render(dt) {
      const sh = api.shared();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#2a1650');
      bg.addColorStop(1, '#14082e');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      if (!sh) {
        banner('Getting ready…', h / 2, 20);
        return;
      }
      const now = Date.now();
      const list = contestants();
      const tiles = layout(Math.max(1, list.length));
      const playing = sh.phase === 'play' && now >= sh.startAt;
      const elapsed = now - sh.startAt;
      const slot = playing ? Math.floor(elapsed / SLOT_MS) : -1;
      const ev = playing ? slotEvent(sh.seed || 1, slot, list.length) : null;
      const slotAge = playing ? (elapsed % SLOT_MS) / 1000 : 0;
      if (playing && slot !== lastSlot) {
        lastSlot = slot;
        if (ev.extra === 'honk') {
          api.sfx('honk');
          floaters.push({ text: '💨 PFFFT!', x: w / 2, y: h * 0.45, t: 0 });
        }
      } else if (!playing) lastSlot = -1;

      list.forEach((m, i) => {
        const t = tiles[i];
        const smiled = sh.smiled?.[m.id];
        // Tile.
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.beginPath();
        ctx.roundRect(t.x + 4, t.y + 4, t.w - 8, t.h - 8, 16);
        ctx.fill();
        const last = sh.last;
        const won = sh.phase === 'lobby' && last?.winners?.includes(m.id);
        ctx.lineWidth = won ? 4 : 2;
        ctx.strokeStyle = won ? '#ffd43b' : 'rgba(255,255,255,0.15)';
        ctx.stroke();
        const map = drawFace(m, t);
        ctx.lineWidth = Math.max(3, t.r * 0.06);
        ctx.strokeStyle = smiled != null ? '#ff5fa2' : (m.color || '#fff');
        ctx.beginPath();
        ctx.arc(t.cx, t.cy, t.r, 0, Math.PI * 2);
        ctx.stroke();

        if (playing && smiled == null) {
          const o = ev.overlays.find(x => x.who === i);
          if (o) drawOverlay(o.kind, t, clock + slotAge);
          const face = m.me ? api.face() : null;
          if (map && face) drawGoogly(map, face);
          else if (m.me && !face) text('Can’t see your face!', t.cx, t.cy, clamp(t.r * 0.2, 11, 18), '#ff6b6b');
        }
        if (smiled != null) {
          drawGrin(t);
          ctx.save();
          ctx.translate(t.cx, t.cy - t.r * 0.1);
          ctx.rotate(-0.28);
          text('SMILED!', 0, 0, clamp(t.r * 0.42, 14, 34), '#ff3b5c');
          ctx.restore();
        }
        // Name, score and the time they held out.
        const score = sh.scores?.[m.id] || 0;
        let label = `${m.me ? 'You' : m.name} · ${score}★`;
        if (smiled != null) label += ` · ${fmt(smiled)}`;
        else if (sh.phase === 'lobby' && sh.ready?.[m.id]) label += ' · ready';
        ctx.font = `800 ${clamp(t.r * 0.2, 11, 15)}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = smiled != null ? '#ff9ec7' : (sh.phase === 'lobby' && sh.ready?.[m.id] ? '#69db7c' : '#fff');
        ctx.fillText(label, t.cx, t.y + t.h - 8);
      });

      // Header.
      if (sh.phase === 'play' && playing) {
        const frac = clamp(elapsed / (list.length === 1 ? SOLO_MS : ROUND_MS), 0, 1);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(10, 8, w - 20, 8);
        ctx.fillStyle = '#3fe0d0';
        ctx.fillRect(10, 8, (w - 20) * (1 - frac), 8);
        text(fmt(elapsed), w / 2, 28, 14, '#fff');
      } else {
        text(`Round ${sh.round}`, w / 2, 22, 16, '#ffd43b');
      }

      // Countdown.
      if (sh.phase === 'count') {
        const left = sh.startAt - now;
        const n = Math.max(1, Math.ceil(left / 1000 - 0.4));
        if (n !== lastCount) { lastCount = n; api.sfx('tick'); }
        const pulse = 1 + (1 - ((left % 1000) / 1000)) * 0.25;
        text(String(Math.min(3, n)), w / 2, (h - CONTROLS_H) / 2 + 40, 120 * pulse * Math.min(1, w / 400 + 0.3), '#ffd43b');
        text('Don’t smile!', w / 2, (h - CONTROLS_H) * 0.82, 26, '#fff');
      } else {
        lastCount = -1;
      }

      // Joke card.
      if (playing && ev.extra === 'joke') {
        const cw = Math.min(w - 24, 460), chh = 92;
        const cy = h - CONTROLS_H - chh - 6;
        ctx.fillStyle = 'rgba(255,248,225,0.96)';
        ctx.beginPath();
        ctx.roundRect((w - cw) / 2, cy, cw, chh, 14);
        ctx.fill();
        ctx.strokeStyle = '#ff5fa2';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = '#3b1f5c';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        const size = clamp(cw * 0.04, 12, 17);
        ctx.font = `800 ${size}px ${FONT}`;
        wrap(ev.joke[0], w / 2, cy + 8 + size, cw - 24, size * 1.2, 2);
        if (slotAge > 1.3) {
          ctx.fillStyle = '#d6246e';
          wrap(ev.joke[1], w / 2, cy + 18 + size * 3.2, cw - 24, size * 1.2, 2);
        }
      }

      // Floating bits.
      for (let i = floaters.length - 1; i >= 0; i--) {
        const f = floaters[i];
        f.t += dt;
        if (f.t > 1.4) { floaters.splice(i, 1); continue; }
        ctx.globalAlpha = clamp(1.4 - f.t, 0, 1);
        text(f.text, f.x, f.y - f.t * 30, 30, '#ffd43b');
        ctx.globalAlpha = 1;
      }

      // Round over: a short result banner on top.
      if (sh.phase === 'lobby' && sh.last && sh.last.round === sh.round - 1) {
        const l = sh.last;
        let msg;
        if (l.solo) msg = l.held ? `Poker face! ${fmt(l.times[api.me.id] || 0)}` : `You lasted ${fmt(l.times[api.me.id] || 0)}`;
        else if (l.winners.length === 1) msg = l.winners[0] === api.me.id ? 'You win the round!' : `${nameOf(l.winners[0])} wins the round!`;
        else msg = 'Stone faces all round: a tie!';
        text(msg, w / 2, 48, clamp(w * 0.045, 14, 22), '#fff');
      }
    }

    function nameOf(id) {
      const m = api.players().find(p => p.id === id);
      return m ? (m.me ? 'You' : m.name) : 'Someone';
    }

    // Draws wrapped, centred text; returns nothing. Truncates past maxLines.
    function wrap(str, x, y, maxW, lh, maxLines) {
      const words = str.split(' ');
      let line = '', row = 0;
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxW && line) {
          ctx.fillText(line, x, y + row * lh);
          line = word;
          if (++row >= maxLines) return;
        } else {
          line = test;
        }
      }
      ctx.fillText(line, x, y + row * lh);
    }

    // The status line and button follow the shared state.
    function updateBar() {
      const sh = api.shared();
      const face = api.face();
      const list = contestants();
      const spectating = !isContestant(api.me.id);
      let msg = '', btn = false, enabled = true;
      if (!sh) msg = 'Getting ready…';
      else if (spectating) msg = 'The game is full: watching this one.';
      else if (sh.phase === 'lobby') {
        const waiting = list.filter(m => !sh.ready?.[m.id]);
        if (!face) { msg = 'Don’t Smile needs your camera to see your face. Turn it on and face the screen.'; btn = true; enabled = false; }
        else if (sh.ready?.[api.me.id]) msg = list.length > 1 ? `Waiting for ${waiting.map(m => m.name).join(', ')}…` : 'Get your straight face on…';
        else { msg = list.length > 1 ? 'Tap Ready when you can keep a straight face.' : `Alone: see how long you can last.${bestSolo ? ` Best ${fmt(bestSolo)}.` : ''}`; btn = true; }
      } else if (sh.phase === 'count') msg = 'Get ready…';
      else if (sh.phase === 'play') {
        msg = sh.smiled?.[api.me.id] != null ? 'You smiled! Watch the others…' : 'Straight face! No smiling!';
        if (!face && sh.smiled?.[api.me.id] == null) msg = 'The camera must see your face!';
      }
      const sig = `${msg}|${btn}|${enabled}`;
      if (sig === stateSig) return;
      stateSig = sig;
      status.textContent = msg;
      ready.style.display = btn ? '' : 'none';
      ready.disabled = !enabled;
    }

    // Records: wins and the best solo time.
    function recordResult() {
      const sh = api.shared();
      if (!sh) return;
      if (sh.phase !== lastPhaseSeen) {
        const was = lastPhaseSeen;
        lastPhaseSeen = sh.phase;
        if (was === 'play' && sh.phase === 'lobby' && sh.last) {
          const l = sh.last;
          const mine = l.times?.[api.me.id] || 0;
          if (l.solo) {
            if (mine > bestSolo) { bestSolo = mine; api.store.set('bestSolo', bestSolo); api.toast('New best straight face!'); }
            api.sfx(l.held ? 'win' : 'lose');
          } else if (l.winners.includes(api.me.id)) {
            wins++;
            api.store.set('wins', wins);
            api.setState({ wins });
            api.sfx('win');
          } else {
            api.sfx('lose');
          }
        }
      }
    }

    function frame(t) {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      clock += dt;
      if (api.isOwner()) ownerTick();
      watchSmile();
      recordResult();
      updateBar();
      render(dt);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return {
      destroy() {
        cancelAnimationFrame(raf);
        ro.disconnect();
      },
      onPad(pad) {
        // A readies up (the Ready button also works with the controller's focus).
        if (pad.a || pad.pressed?.[0]) ready.click();
      },
    };
  },
};
