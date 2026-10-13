// Copy Cat: the owner runs ten prompts, each asking for a facial expression
// ("😮 Open wide!"). Every player's own browser measures their own face and,
// once the expression has been held for 300 ms, reports how long it took
// since that player first saw the prompt (measured locally, so network delay
// does not matter). The owner scores each prompt: 1st 3 points, 2nd 2, the
// rest 1, nothing for those who timed out after 6 s. Players whose camera
// cannot see a face get an "I did it!" button instead, marked with a 🙈 so
// friends can laugh. Solo play works.
//
// Friends' live faces sit in a strip beside your own (to the side on wide
// screens, underneath on tall ones), never over your face or the prompt; each
// lights up green with a tick, and pops, the moment their match for the
// current prompt reaches the referee.
//
// Referee state (owner only writes it):
//   { phase: 'lobby' | 'prompt' | 'reveal' | 'over', match, round, idx, prompts,
//     promptAt, endsAt, nextAt, names, matched: { id: { ms, fb } },
//     reveal: { id: { ms, fb, pts } }, points: { id: n } }

const PROMPTS = 10;
const TIME_MS = 6000;
const HOLD_MS = 300;
const REVEAL_MS = 1100;
const FONT = 'ui-rounded, system-ui, sans-serif';

// What each prompt asks for and how it is measured from api.face().
const EXPRS = [
  { emoji: '😄', text: 'Smile!', thr: 0.6, get: f => f.smile },
  { emoji: '😮', text: 'Open wide!', thr: 0.55, get: f => f.mouthOpen },
  { emoji: '😗', text: 'Pucker your lips!', thr: 0.6, get: f => f.pucker },
  { emoji: '🤨', text: 'Raise your eyebrows!', thr: 0.6, get: f => f.browUp },
  { emoji: '🐡', text: 'Puff your cheeks!', thr: 0.45, get: () => puff.score },
  { emoji: '☹️', text: 'Frown!', thr: 0.45, get: f => f.frown },
  { emoji: '😉', text: 'Close one eye!', thr: 0.5, get: f => oneEye(f) },
];

// One eye shut and the other open. Forgiving on purpose: the open eye
// usually squints along, and the tracker's blink score for the shut one often
// stops short. Either signal is enough: the blink scores a quarter apart
// (full marks at 0.4), or one eyelid gap under ~60% of the other's.
const LIDS = { l: [159, 145, 33, 133], r: [386, 374, 362, 263] };
function eyeOpen(pts, [top, bottom, a, b]) {
  const d = (i, j) => Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
  const w = d(a, b);
  return w > 0 ? d(top, bottom) / w : 0;
}
function oneEye(f) {
  const blink = clamp((Math.abs(f.blinkL - f.blinkR) - 0.05) / 0.35, 0, 1);
  let lids = 0;
  if (f.pts?.length >= 400) {
    const l = eyeOpen(f.pts, LIDS.l), r = eyeOpen(f.pts, LIDS.r);
    const hi = Math.max(l, r), lo = Math.min(l, r);
    if (hi > 0.12) lids = clamp((0.8 - lo / hi) / 0.4, 0, 1);
  }
  return Math.max(blink, lids);
}

// Puffed cheeks. The tracker's cheekPuff score barely moves for most faces,
// so this also measures the face itself: the width of the lower cheeks
// against the eye corners (which puffing doesn't move), compared with that
// face's own resting width. The resting width follows narrower faces at once
// and wider ones only slowly, so holding a puff doesn't become the new rest.
const puff = { base: 0, score: 0 };
const CHEEKS = [[132, 361], [58, 288]];
const EYE_CORNERS = [33, 263];
function cheekRatio(pts) {
  if (!pts || pts.length < 400) return 0;
  const d = (a, b) => Math.hypot(pts[a].x - pts[b].x, pts[a].y - pts[b].y);
  const eyes = d(...EYE_CORNERS);
  if (eyes <= 0) return 0;
  return (d(...CHEEKS[0]) + d(...CHEEKS[1])) / 2 / eyes;
}
// Called once a frame with the face (or null), so the resting width keeps
// learning between puff prompts.
function trackPuff(f) {
  if (!f) { puff.score = 0; return; }
  puff.score = puffScore(f);
}
function puffScore(f) {
  const blend = clamp((f.cheekPuff ?? 0) * 2.5, 0, 1);
  const r = cheekRatio(f.pts);
  if (!r) return blend;
  if (!puff.base) puff.base = r;
  puff.base += (r - puff.base) * (r < puff.base ? 0.2 : 0.008);
  // Puffing keeps the mouth shut; a smile or an open jaw also widens the cheeks.
  const shut = f.mouthOpen < 0.25 && f.smile < 0.4;
  const wide = shut ? clamp((r / puff.base - 1) / 0.035, 0, 1) : 0;
  return Math.max(blend, wide);
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Lays out my face and `n` friends' tiles inside the box (x, y, bw, bh)
// without overlap. Wide boxes put the friends in a block to the right of my
// face; tall ones in a strip underneath it. Tiles are portrait-ish (0.8:1).
// Returns { self: { x, y, w, h }, tiles: [{ x, y, w, h }] }.
function faceLayout(n, x, y, bw, bh, gap = 6) {
  const selfBox = (sx, sy, sw, shh) => {
    const vw = Math.min(sw, shh * 1.33);
    return { x: sx + (sw - vw) / 2, y: sy, w: vw, h: shh };
  };
  if (n <= 0) return { self: selfBox(x, y, bw, bh), tiles: [] };
  // The largest grid of n tiles that fits a box.
  const grid = (gw, gh) => {
    let best = null;
    for (let cols = 1; cols <= n; cols++) {
      const rows = Math.ceil(n / cols);
      const tw = Math.min((gw - gap * (cols - 1)) / cols, ((gh - gap * (rows - 1)) / rows) * 0.8);
      if (tw > 0 && (!best || tw > best.tw)) best = { cols, rows, tw, th: tw / 0.8 };
    }
    return best || { cols: n, rows: 1, tw: 1, th: 1.25 };
  };
  const place = (g, gx, gy, gw, gh) => {
    const tiles = [];
    const used = g.rows * g.th + (g.rows - 1) * gap;
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / g.cols), col = i % g.cols;
      const inRow = row === g.rows - 1 ? n - row * g.cols : g.cols;
      const rx = gx + (gw - inRow * g.tw - (inRow - 1) * gap) / 2;
      tiles.push({ x: rx + col * (g.tw + gap), y: gy + (gh - used) / 2 + row * (g.th + gap), w: g.tw, h: g.th });
    }
    return tiles;
  };
  if (bw >= bh * 1.05) {
    // Side: my face keeps most of the width; friends take the rest, at most
    // about a third.
    const sideW = clamp(bw * 0.3, Math.min(70, bw * 0.4), 260);
    const g = grid(sideW, bh);
    const blockW = g.cols * g.tw + (g.cols - 1) * gap;
    const vw = Math.min(bw - blockW - gap * 2, bh * 1.33);
    const x0 = x + (bw - vw - gap * 2 - blockW) / 2;
    return { self: { x: x0, y, w: vw, h: bh }, tiles: place(g, x0 + vw + gap * 2, y, blockW, bh) };
  }
  // Below: a strip of up to two rows, about a quarter of the height.
  const stripH = clamp(bh * 0.27, Math.min(56, bh * 0.35), 150);
  const g = grid(bw, stripH);
  const used = g.rows * g.th + (g.rows - 1) * gap;
  const self = selfBox(x, y, bw, bh - used - gap);
  return { self, tiles: place(g, x, y + bh - used, bw, used) };
}

// Draws a video or canvas cropped to fill a box. False when there's nothing to draw.
function drawCover(ctx, media, x, y, tw, th) {
  const sw = media?.videoWidth || media?.width || 0;
  const sh = media?.videoHeight || media?.height || 0;
  if (!media || !sw || !sh || (media.readyState !== undefined && media.readyState < 2)) return false;
  const s = Math.max(tw / sw, th / sh);
  const cw = tw / s, ch = th / s;
  try {
    ctx.drawImage(media, (sw - cw) / 2, (sh - ch) / 2, cw, ch, x, y, tw, th);
  } catch {
    return false;
  }
  return true;
}

function outlined(ctx, text, x, y, size, fill, align = 'center', weight = 900) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.lineWidth = Math.max(3, size * 0.2);
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

// Ten prompts, never the same expression twice in a row.
function makePrompts() {
  const out = [];
  while (out.length < PROMPTS) {
    const k = Math.floor(Math.random() * EXPRS.length);
    if (k !== out[out.length - 1]) out.push(k);
  }
  return out;
}

export default {
  id: 'copycat',
  name: 'Copy Cat',
  emoji: '🐱',
  blurb: 'Pull the faces you’re asked for, faster than your friends.',
  minPlayers: 1,
  maxPlayers: 8,
  needsFace: true,

  create(api) {
    puff.base = 0;
    puff.score = 0;
    const canvas = document.createElement('canvas');
    canvas.className = 'g-canvas';
    const ui = document.createElement('div');
    ui.className = 'g-center';
    ui.style.cssText += ';pointer-events:none;overflow:auto;font-weight:800;text-shadow:0 2px 4px rgba(0,0,0,.7)';
    const fallback = document.createElement('button');
    fallback.className = 'btn';
    fallback.textContent = '🙈 I did it!';
    fallback.style.cssText = 'position:absolute;left:50%;bottom:10px;transform:translateX(-50%);font-size:1.2rem;padding:10px 22px;z-index:2';
    fallback.hidden = true;
    api.el.append(canvas, ui, fallback);
    const ctx = canvas.getContext('2d');

    const rec = {
      best: api.store.get('best', 0),        // best total score in a match
      fastest: api.store.get('fastest', 0),  // fastest match, ms
    };
    let w = 0, h = 0, dpr = 1;
    let raf = 0;
    let uiSig = '';
    let noFaceSince = 0;
    const local = { round: -1, start: 0, hold: null, matched: false, ms: 0, announced: -1, revealed: -1 };
    // Friends' matches already seen this prompt, and when each popped in.
    const seen = { round: -1, ids: new Set(), at: new Map() };

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

    const seated = () => api.players().slice(0, 8);
    const present = id => api.players().some(p => p.id === id);
    const nameOf = (sh, id) => api.players().find(p => p.id === id)?.name || sh?.names?.[id] || 'Player';
    const colorOf = id => api.players().find(p => p.id === id)?.color || '#9775fa';
    const needToken = sh => (sh.phase === 'over' ? sh.match + 1 : sh.match);

    // --- reporting (players) ---------------------------------------------------
    function matchedNow(sh, fb) {
      local.matched = true;
      const ms = Math.round(performance.now() - local.start);
      local.ms = ms;
      api.sfx('score');
      if (!fb && (!rec.fastest || ms < rec.fastest)) {
        rec.fastest = ms;
        api.store.set('fastest', ms);
      }
      const data = { round: sh.round, ms, fb };
      api.send('match', data);
      api.setState({ rep: data });
      if (api.isOwner()) ownerRecord(api.me.id, data);
    }

    function ready() {
      const sh = api.shared();
      if (!sh || (sh.phase !== 'lobby' && sh.phase !== 'over')) return;
      if (!seated().some(p => p.id === api.me.id)) return;
      api.setState({ ready: needToken(sh) });
      api.sfx('click');
    }

    function fallbackPress() {
      const sh = api.shared();
      if (!sh || sh.phase !== 'prompt' || local.matched || fallback.hidden) return;
      matchedNow(sh, true);
    }
    fallback.addEventListener('click', fallbackPress);

    // --- owner: the referee ----------------------------------------------------
    function ownerRecord(id, d) {
      const sh = api.shared();
      if (!sh || sh.phase !== 'prompt' || !d || d.round !== sh.round || !present(id) || sh.matched[id]) return;
      if (!Number.isFinite(d.ms)) return;
      const entry = { ms: Math.round(clamp(d.ms, 0, TIME_MS + 2000)), fb: d.fb === true };
      api.setShared({ ...sh, matched: { ...sh.matched, [id]: entry } });
    }
    api.on('match', (d, from) => {
      if (api.isOwner() && typeof from === 'string') ownerRecord(from, d);
    });

    function namesOf() {
      const names = {};
      for (const p of seated()) names[p.id] = p.name;
      return names;
    }

    function ownerTick() {
      const sh = api.shared();
      if (!sh) {
        api.setShared({ phase: 'lobby', match: 1, round: 0, idx: 0, prompts: [], promptAt: 0, endsAt: 0, nextAt: 0, names: {}, matched: {}, reveal: {}, points: {} });
        return;
      }
      const t = Date.now();
      const list = seated();
      if (sh.phase === 'lobby' || sh.phase === 'over') {
        const need = needToken(sh);
        if (list.length >= 1 && list.every(p => p.state.ready === need)) {
          api.setShared({ ...sh, phase: 'prompt', match: need, round: sh.round + 1, idx: 0, prompts: makePrompts(), promptAt: t + 600, endsAt: t + 600 + TIME_MS, names: namesOf(), matched: {}, reveal: {}, points: {} });
        }
      } else if (sh.phase === 'prompt') {
        for (const p of api.players()) {
          if (p.state.rep && p.state.rep.round === sh.round) ownerRecord(p.id, p.state.rep);
        }
        const cur = api.shared();
        const here = seated().map(p => p.id);
        if (!here.length) return;
        // A little grace after endsAt so late-arriving reports still count.
        if (here.every(id => cur.matched[id]) || t > cur.endsAt + 400) {
          const ranked = Object.entries(cur.matched).filter(([id]) => present(id)).sort((a, b) => a[1].ms - b[1].ms);
          const points = { ...cur.points };
          const reveal = {};
          ranked.forEach(([id, m], i) => {
            const pts = i === 0 ? 3 : i === 1 ? 2 : 1;
            reveal[id] = { ms: m.ms, fb: m.fb, pts };
            points[id] = (points[id] || 0) + pts;
          });
          api.setShared({ ...cur, phase: 'reveal', reveal, points, names: { ...cur.names, ...namesOf() }, nextAt: t + REVEAL_MS });
        }
      } else if (sh.phase === 'reveal' && t >= sh.nextAt) {
        if (sh.idx + 1 >= PROMPTS) api.setShared({ ...sh, phase: 'over' });
        else api.setShared({ ...sh, phase: 'prompt', round: sh.round + 1, idx: sh.idx + 1, promptAt: t + 300, endsAt: t + 300 + TIME_MS, matched: {}, reveal: {} });
      }
    }

    // --- DOM panel (lobby / final scoreboard) -------------------------------------
    function line(text, size, cls) {
      const d = document.createElement('div');
      d.textContent = text;
      if (size) d.style.fontSize = size;
      if (cls) d.className = cls;
      return d;
    }

    function updateUi(sh) {
      let sig, build;
      if (!sh) {
        sig = 'connecting';
        build = () => [line('Warming up…', '', 'g-big')];
      } else if (sh.phase === 'lobby' || sh.phase === 'over') {
        const list = seated();
        const need = needToken(sh);
        const mine = api.state().ready === need;
        const imSeated = list.some(p => p.id === api.me.id);
        const rows = sh.phase === 'over' ? Object.entries(sh.points).sort((a, b) => b[1] - a[1]) : [];
        sig = JSON.stringify([sh.phase, need, mine, imSeated, rows, list.map(p => [p.id, p.name, p.state.ready === need]), rec]);
        build = () => {
          const out = [line(sh.phase === 'over' ? 'Final scores' : '🐱 Copy Cat', '', 'g-big')];
          if (sh.phase === 'over') {
            rows.forEach(([id, pts], i) => {
              const r = line(`${i === 0 ? '🏆 ' : `${i + 1}. `}${nameOf(sh, id)}  ${pts} pts`, i === 0 ? '1.3rem' : '1.05rem');
              r.style.color = colorOf(id);
              out.push(r);
            });
          } else {
            out.push(line(`Pull the face you’re asked for, ${PROMPTS} times. 1st to match gets 3 points.`, '0.95rem'));
          }
          const chips = document.createElement('div');
          chips.className = 'g-row';
          for (const p of list) {
            const c = document.createElement('span');
            c.style.cssText = `padding:3px 10px;border-radius:99px;background:rgba(30,15,60,.7);border:2px solid ${p.color}`;
            c.textContent = `${p.state.ready === need ? '✔' : '…'} ${p.name}`;
            chips.append(c);
          }
          out.push(chips);
          if (imSeated) {
            const b = document.createElement('button');
            b.className = 'btn';
            b.style.pointerEvents = 'auto';
            b.textContent = mine ? 'Ready ✔' : sh.phase === 'over' ? 'Play again!' : 'Ready!';
            b.disabled = mine;
            b.addEventListener('click', ready);
            out.push(b);
          } else out.push(line('The game is full: you’re watching.', '0.9rem'));
          out.push(line(`Best total ${rec.best} pts · Fastest match ${rec.fastest ? `${(rec.fastest / 1000).toFixed(2)} s` : '–'}`, '0.85rem'));
          return out;
        };
      } else {
        sig = 'play';
        build = () => [];
      }
      if (sig === uiSig) return;
      uiSig = sig;
      ui.replaceChildren(...build());
      ui.style.background = ui.childElementCount ? 'rgba(29,21,51,0.72)' : 'none';
    }

    // --- face measuring --------------------------------------------------------------
    function watchFace(sh, now, face) {
      if (sh.phase !== 'prompt') return;
      if (local.round !== sh.round) {
        local.round = sh.round;
        local.start = now;
        local.hold = null;
        local.matched = false;
        api.sfx('whoosh');
      }
      if (local.matched) return;
      const ex = EXPRS[sh.prompts[sh.idx]];
      if (!ex || !face) {
        local.hold = null;
        return;
      }
      if (now - local.start > TIME_MS + 300) return;
      if (ex.get(face) > ex.thr) {
        local.hold ??= now;
        if (now - local.hold >= HOLD_MS) matchedNow(sh, false);
      } else {
        local.hold = null;
      }
    }

    // --- rendering ----------------------------------------------------------------
    function drawSelf(x, y, bw, bh, glow) {
      const media = api.selfCanvas;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, bw, bh, 16);
      ctx.clip();
      ctx.fillStyle = '#2a1f4d';
      ctx.fillRect(x, y, bw, bh);
      const sw = media?.width || 0, sh = media?.height || 0;
      if (sw && sh) {
        const s = Math.max(bw / sw, bh / sh);
        const cw = bw / s, ch = bh / s;
        try { ctx.drawImage(media, (sw - cw) / 2, (sh - ch) / 2, cw, ch, x, y, bw, bh); } catch { /* not ready yet */ }
      }
      ctx.restore();
      ctx.lineWidth = glow ? 6 : 3;
      ctx.strokeStyle = glow ? '#69db7c' : 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.roundRect(x, y, bw, bh, 16);
      ctx.stroke();
    }

    // A friend's live face; green with a tick once their match is in.
    function drawFriend(sh, p, r) {
      if (!r) return;
      const m = sh.phase === 'prompt' ? sh.matched?.[p.id] : sh.reveal?.[p.id];
      const missed = sh.phase === 'reveal' && !m;
      const rad = Math.min(12, r.w * 0.14);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(r.x, r.y, r.w, r.h, rad);
      ctx.clip();
      ctx.fillStyle = '#2a1f4d';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      if (missed && ctx.filter !== undefined) ctx.filter = 'grayscale(0.8) brightness(0.7)';
      if (!drawCover(ctx, api.mediaOf(p.id), r.x, r.y, r.w, r.h)) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.globalAlpha = 1;
        outlined(ctx, (p.name[0] || '?').toUpperCase(), r.x + r.w / 2, r.y + r.h / 2, r.h * 0.4, '#fff');
      }
      ctx.filter = 'none';
      if (m) {
        ctx.fillStyle = 'rgba(105,219,124,0.28)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
      }
      const foot = clamp(r.h * 0.2, 13, 24);
      ctx.fillStyle = 'rgba(20,12,40,0.6)';
      ctx.fillRect(r.x, r.y + r.h - foot, r.w, foot);
      ctx.restore();

      ctx.lineWidth = m ? 4 : 2;
      ctx.strokeStyle = m ? '#69db7c' : p.color;
      ctx.beginPath();
      ctx.roundRect(r.x, r.y, r.w, r.h, rad);
      ctx.stroke();

      const fs = clamp(foot * 0.62, 9, 14);
      ctx.font = `800 ${fs}px ${FONT}`;
      let name = p.name;
      while (name.length > 2 && ctx.measureText(name).width > r.w - 6) name = name.slice(0, -2) + '…';
      outlined(ctx, name, r.x + r.w / 2, r.y + r.h - foot / 2, fs, '#fff', 'center', 800);
      if (m) {
        // Tick badge, with a ring that pops out as the match arrives.
        const br = clamp(r.w * 0.17, 9, 18);
        const bx = r.x + r.w - br * 0.9, by = r.y + br * 0.9;
        const age = (performance.now() - (seen.at.get(p.id) ?? -1e9)) / 1000;
        if (age < 0.5) {
          ctx.strokeStyle = `rgba(105,219,124,${1 - age / 0.5})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.roundRect(r.x - age * 24, r.y - age * 24, r.w + age * 48, r.h + age * 48, rad + age * 24);
          ctx.stroke();
        }
        const grow = age < 0.25 ? 1 + 0.5 * Math.sin((age / 0.25) * Math.PI) : 1;
        ctx.fillStyle = '#2f9e44';
        ctx.beginPath();
        ctx.arc(bx, by, br * grow, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        const label = sh.phase === 'reveal' ? `+${m.pts}` : m.fb ? '🙈' : '✔';
        outlined(ctx, label, bx, by + 1, br * (label.length > 1 && label !== '🙈' ? 0.95 : 1.2), '#fff', 'center', 900);
      } else if (missed) {
        outlined(ctx, '✖', r.x + r.w / 2, r.y + r.h * 0.42, clamp(r.h * 0.3, 12, 40), 'rgba(255,255,255,0.8)');
      }
    }

    // A pop (and a sound) as each friend's match for this prompt arrives.
    function noticeMatches(sh) {
      if (sh.phase !== 'prompt') return;
      if (seen.round !== sh.round) {
        seen.round = sh.round;
        seen.ids.clear();
        seen.at.clear();
      }
      for (const id of Object.keys(sh.matched || {})) {
        if (seen.ids.has(id)) continue;
        seen.ids.add(id);
        if (id === api.me.id) continue;
        seen.at.set(id, performance.now());
        api.sfx('pop');
      }
    }

    function render(sh, face) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#1d1533';
      ctx.fillRect(0, 0, w, h);
      if (!sh) return;
      const pad = 10;
      if (sh.phase === 'lobby' || sh.phase === 'over') {
        // Faint mirror behind the panel so you can check your framing.
        ctx.globalAlpha = 0.25;
        drawSelf(pad, pad, w - pad * 2, h - pad * 2, false);
        ctx.globalAlpha = 1;
        return;
      }
      const t = Date.now();
      const ex = EXPRS[sh.prompts[sh.idx]] || EXPRS[0];
      const small = h < 380 || w < 420;

      // Score strip and progress.
      const top = small ? 22 : 30;
      outlined(ctx, `${sh.idx + 1}/${PROMPTS}`, pad, top / 2 + 4, small ? 13 : 16, '#fff', 'left', 800);
      const ids = [...new Set([...seated().map(p => p.id), ...Object.keys(sh.points)])];
      const chipW = Math.min(110, (w - 70) / Math.max(1, ids.length));
      ids.forEach((id, i) => {
        const x = w - pad - (ids.length - i - 0.5) * chipW;
        outlined(ctx, `${nameOf(sh, id).slice(0, 8)} ${sh.points[id] || 0}`, x, top / 2 + 4, small ? 11 : 13, colorOf(id), 'center', 800);
      });

      // The prompt.
      const promptH = clamp(h * 0.2, 44, 110);
      const py = top + 4 + promptH / 2;
      const fs = clamp(Math.min(promptH * 0.8, w / 9), 20, 80);
      const ts = clamp(fs * 0.6, 16, 46);
      ctx.font = `900 ${ts}px ${FONT}`;
      const total = fs * 1.2 + ctx.measureText(ex.text).width;
      const sx = w / 2 - total / 2;
      outlined(ctx, ex.emoji, sx + fs * 0.55, py, fs * 1.1, '#fff');
      outlined(ctx, ex.text, sx + fs * 1.2, py, ts, '#ffd43b', 'left');

      // Bottom status chips: who has matched.
      const chipsH = small ? 26 : 34;
      const meterH = 16;
      const vy0 = top + 8 + promptH;
      const boxH = Math.max(60, h - vy0 - chipsH - meterH - pad * 2 - (fallback.hidden ? 0 : 50));
      // My face, and friends' faces beside or under it.
      const friends = seated().filter(p => p.id !== api.me.id);
      const L = faceLayout(friends.length, pad, vy0, w - pad * 2, boxH);
      const { x: vx, y: vy, w: vw, h: vh } = L.self;
      const val = face ? clamp(ex.get(face) / ex.thr, 0, 1.2) : 0;
      const ok = sh.phase === 'prompt' ? local.matched || val >= 1 : !!sh.reveal[api.me.id];
      drawSelf(vx, vy, vw, vh, ok);
      friends.forEach((p, i) => drawFriend(sh, p, L.tiles[i]));

      // Meter for my current expression, and the time left beneath it.
      const my = vy0 + boxH + 8;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.roundRect(vx, my, vw, meterH, 8);
      ctx.fill();
      ctx.fillStyle = val >= 1 || local.matched ? '#69db7c' : '#3fe0d0';
      ctx.beginPath();
      ctx.roundRect(vx, my, Math.max(meterH, vw * (local.matched ? 1 : Math.min(1, val))), meterH, 8);
      ctx.fill();
      if (sh.phase === 'prompt' && !local.matched) {
        const left = clamp((sh.endsAt - t) / TIME_MS, 0, 1);
        ctx.fillStyle = left < 0.3 ? '#ff5c6c' : '#ffd43b';
        ctx.fillRect(vx, my + meterH + 3, vw * left, 4);
      }
      if (local.matched && sh.phase === 'prompt') outlined(ctx, `Got it! ${(local.ms / 1000).toFixed(2)} s`, vx + vw / 2, vy + vh / 2, clamp(vw / 9, 16, 40), '#69db7c');


      // Who got it.
      const cy = h - chipsH / 2 - 4;
      const players = seated();
      const cw = Math.min(150, (w - pad * 2) / Math.max(1, players.length));
      players.forEach((p, i) => {
        const x = w / 2 + (i - (players.length - 1) / 2) * cw;
        const m = sh.matched[p.id], r = sh.reveal[p.id];
        let text = `${p.name.slice(0, 8)} …`;
        let color = 'rgba(255,255,255,0.6)';
        if (sh.phase === 'reveal') {
          text = r ? `${r.fb ? '🙈 ' : ''}${p.name.slice(0, 8)} +${r.pts}` : `${p.name.slice(0, 8)} ✖`;
          color = r ? p.color : 'rgba(255,255,255,0.45)';
        } else if (m) {
          text = `${m.fb ? '🙈 ' : '✔ '}${p.name.slice(0, 8)}`;
          color = p.color;
        }
        outlined(ctx, text, x, cy, small ? 12 : 15, color, 'center', 800);
      });
    }

    // --- loop ---------------------------------------------------------------------
    function frame(now) {
      const face = api.face();
      trackPuff(face);
      if (face) noFaceSince = 0;
      else if (!noFaceSince) noFaceSince = now;
      if (api.isOwner()) ownerTick();
      const sh = api.shared();
      if (sh) {
        watchFace(sh, now, face);
        noticeMatches(sh);
        // Sounds and records for the end of a prompt and of the match.
        if (sh.phase === 'reveal' && local.revealed !== sh.round) {
          local.revealed = sh.round;
          if (!local.matched && sh.reveal && !sh.reveal[api.me.id]) api.sfx('miss');
        }
        if (sh.phase === 'over' && local.announced !== sh.match) {
          local.announced = sh.match;
          const mine = sh.points[api.me.id] || 0;
          if (mine > rec.best) {
            rec.best = mine;
            api.store.set('best', mine);
          }
          api.sfx('win');
        }
        // The "I did it!" fallback shows when no face has been seen for a moment.
        const needFallback = sh.phase === 'prompt' && !local.matched && !!noFaceSince && now - noFaceSince > 1000 && seated().some(p => p.id === api.me.id);
        if (fallback.hidden === needFallback) fallback.hidden = !needFallback;
      } else fallback.hidden = true;
      updateUi(sh);
      render(sh, face);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    const typing = e => /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName);
    function onKey(e) {
      if (typing(e) || !api.el.isConnected || e.repeat) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (api.shared()?.phase === 'prompt') fallbackPress();
        else ready();
      }
    }
    window.addEventListener('keydown', onKey);

    return {
      destroy() {
        cancelAnimationFrame(raf);
        ro.disconnect();
        window.removeEventListener('keydown', onKey);
      },
      onChange() {
        if (api.isOwner()) ownerTick();
      },
      onPad(pad) {
        if (!pad.a) return;
        if (api.shared()?.phase === 'prompt') fallbackPress();
        else ready();
      },
    };
  },
};

export const _logic = { EXPRS, puff, puffScore, trackPuff, oneEye, cheekRatio, eyeOpen, LIDS, faceLayout };
