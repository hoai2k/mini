// Staring Contest: everyone's live video fills the screen and nobody may
// blink. Each player's own browser watches their own face: a blink (both eyes
// shut for more than 80 ms) or looking away (face lost for 1.5 s) knocks them
// out, and they tell the owner. The last player staring wins. Harmless
// distractions (a fly, a bubble, a bouncing emoji) cross every screen at the
// same moments to tempt a blink; they are derived from the round's start time
// so every client draws the same ones with no messages.
//
// Referee state (owner only writes it):
//   { phase: 'lobby' | 'play' | 'over', round, startAt, ids, names,
//     out: { id: msSinceStart }, winner, endAt }
// 'play' covers both the 3-2-1 countdown (before startAt) and the stare.
// Ready tokens: a player is ready when state.ready === round (lobby) or
// round + 1 (after a finished round).

const COUNT_MS = 3000;
const BLINK_LEVEL = 0.55;
const BLINK_MS = 80;
const LOST_MS = 1500;
const FONT = 'ui-rounded, system-ui, sans-serif';
const BOUNCERS = ['🤡', '🦆', '🐸', '🍌', '👻', '🐙'];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Small deterministic hash so every client agrees on distraction details.
function rnd(seed, k) {
  let x = (seed ^ Math.imul(k + 1, 0x9e3779b1)) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

function fmt(ms) {
  const s = Math.max(0, ms) / 1000;
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
}

function outlined(ctx, text, x, y, size, fill, weight = 900) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.lineWidth = Math.max(3, size * 0.2);
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

// Picks the column count that gives the biggest 4:3-ish tiles.
function layout(n, w, h) {
  let best = { cols: 1, rows: n, tw: 0, th: 0 };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const gap = 8;
    let tw = (w - gap * (cols + 1)) / cols;
    let th = (h - gap * (rows + 1)) / rows;
    // Keep tiles near 4:3 so the video is not cropped to a sliver.
    if (tw / th > 1.5) tw = th * 1.5;
    else if (th / tw > 1.2) th = tw * 1.2;
    if (tw * th > best.tw * best.th) best = { cols, rows, tw, th };
  }
  return best;
}

// Draws a video or canvas into a rounded tile with object-fit: cover maths.
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

function drawFly(ctx, x, y, size, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 20) * 0.4);
  const flap = Math.sin(t * 90) * 0.5 + 0.5;
  ctx.fillStyle = 'rgba(210,235,255,0.65)';
  ctx.strokeStyle = 'rgba(40,40,60,0.5)';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * size * 0.5, -size * 0.3, size * (0.55 + flap * 0.15), size * 0.28, side * -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#1b1b22';
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.32, size * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d22';
  ctx.beginPath();
  ctx.arc(-size * 0.14, -size * 0.45, size * 0.12, 0, Math.PI * 2);
  ctx.arc(size * 0.14, -size * 0.45, size * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBubble(ctx, x, y, r, pop) {
  if (pop > 0) {
    // Pop: a ring of droplets flying out.
    ctx.strokeStyle = `rgba(190,240,255,${1 - pop})`;
    ctx.lineWidth = 3;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * (1 + pop * 0.4), y + Math.sin(a) * r * (1 + pop * 0.4));
      ctx.lineTo(x + Math.cos(a) * r * (1.25 + pop * 0.8), y + Math.sin(a) * r * (1.25 + pop * 0.8));
      ctx.stroke();
    }
    return;
  }
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,0.75)');
  g.addColorStop(0.7, 'rgba(120,220,255,0.18)');
  g.addColorStop(1, 'rgba(255,120,220,0.45)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

export default {
  id: 'stare',
  name: 'Staring Contest',
  emoji: '👁️',
  blurb: 'Don’t blink! Last one staring wins. Flies and bubbles will try to make you.',
  minPlayers: 2,
  maxPlayers: 6,
  needsFace: true,

  create(api) {
    const canvas = document.createElement('canvas');
    canvas.className = 'g-canvas';
    const ui = document.createElement('div');
    ui.style.cssText = 'position:absolute;left:0;right:0;bottom:0;display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 12px 12px;pointer-events:none;text-align:center;font-weight:800;text-shadow:0 2px 4px rgba(0,0,0,.8)';
    api.el.append(canvas, ui);
    const ctx = canvas.getContext('2d');

    let w = 0, h = 0, dpr = 1;
    let raf = 0, last = performance.now();
    let uiSig = '';
    let noFaceSince = 0;       // lobby: when my face was last missing
    let noFace = false;        // camera cannot see my face (3 s)
    let blinkSince = null;     // when both eyes went shut
    let lostSince = null;      // when my face disappeared
    let lastCount = -1;
    const fxDone = new Set();  // distractions whose sound has played
    const local = { round: -1, blinked: false, announced: -1 };
    const record = { wins: api.store.get('wins', 0), longest: api.store.get('longest', 0) };

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

    const typing = e => /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName);
    function onKey(e) {
      if (typing(e) || !api.el.isConnected || e.repeat) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        ready();
      }
    }
    window.addEventListener('keydown', onKey);

    const seated = () => api.players().slice(0, 6);
    const present = id => api.players().some(p => p.id === id);
    const nameOf = (sh, id) => api.players().find(p => p.id === id)?.name || sh?.names?.[id] || 'Player';
    const colorOf = id => api.players().find(p => p.id === id)?.color || '#9775fa';

    // --- reporting (players) ---------------------------------------------------
    function blinked(sh) {
      local.blinked = true;
      const at = Math.max(0, Date.now() - sh.startAt);
      api.sfx('lose');
      const data = { round: sh.round, at };
      api.send('blinked', data);
      api.setState({ rep: data });
      if (api.isOwner()) ownerRecord(api.me.id, data);
    }

    function ready() {
      const sh = api.shared();
      if (!sh || (sh.phase !== 'lobby' && sh.phase !== 'over') || noFace) return;
      api.setState({ ready: sh.phase === 'over' ? sh.round + 1 : sh.round });
      api.sfx('click');
    }

    // --- owner: the referee ----------------------------------------------------
    function ownerRecord(id, d) {
      const sh = api.shared();
      if (!sh || sh.phase !== 'play' || !d || d.round !== sh.round || !sh.ids.includes(id) || id in sh.out) return;
      if (!Number.isFinite(d.at)) return;
      api.setShared({ ...sh, out: { ...sh.out, [id]: Math.round(clamp(d.at, 0, 3600000)) } });
    }
    api.on('blinked', (d, from) => {
      if (api.isOwner() && typeof from === 'string') ownerRecord(from, d);
    });

    function ownerTick() {
      const sh = api.shared();
      if (!sh) {
        api.setShared({ phase: 'lobby', round: 1, startAt: 0, ids: [], names: {}, out: {}, winner: null, endAt: 0 });
        return;
      }
      const t = Date.now();
      const list = seated();
      if (sh.phase === 'lobby' || sh.phase === 'over') {
        const need = sh.phase === 'over' ? sh.round + 1 : sh.round;
        if (list.length >= 2 && list.every(p => p.state.ready === need)) {
          const names = {};
          for (const p of list) names[p.id] = p.name;
          api.setShared({ phase: 'play', round: need, startAt: t + COUNT_MS, ids: list.map(p => p.id), names, out: {}, winner: null, endAt: 0 });
        }
        return;
      }
      // Playing: pick up any report a message dropped, then see who is left.
      for (const p of api.players()) {
        if (p.state.rep && p.state.rep.round === sh.round) ownerRecord(p.id, p.state.rep);
      }
      const cur = api.shared();
      const here = cur.ids.filter(present);
      if (here.length < 2 && t < cur.startAt) {
        // Someone left during the countdown: back to the lobby with fresh Ready buttons.
        api.setShared({ ...cur, phase: 'lobby', round: cur.round + 1 });
        return;
      }
      if (t < cur.startAt) return;
      const alive = here.filter(id => !(id in cur.out));
      if (alive.length <= 1) {
        // Winner: the last one staring, or if the last two blinked together, whoever lasted longest.
        let winner = alive[0] ?? null;
        if (!winner) {
          let bestAt = -1;
          for (const id of cur.ids) if ((cur.out[id] ?? -1) > bestAt) { bestAt = cur.out[id]; winner = id; }
        }
        const out = { ...cur.out };
        // Anyone who left without reporting is counted out when they went.
        for (const id of cur.ids) if (id !== winner && !(id in out)) out[id] = Math.max(0, t - cur.startAt);
        api.setShared({ ...cur, phase: 'over', out, winner, endAt: t });
      }
    }

    // --- DOM bar (Ready button and messages) ------------------------------------
    function textLine(text, size) {
      const d = document.createElement('div');
      d.textContent = text;
      if (size) d.style.fontSize = size;
      return d;
    }

    function updateUi(sh) {
      let sig, build;
      if (!sh) {
        sig = 'connecting';
        build = () => [textLine('Warming up…')];
      } else if (sh.phase === 'lobby' || sh.phase === 'over') {
        const list = seated();
        const need = sh.phase === 'over' ? sh.round + 1 : sh.round;
        const mine = api.state().ready === need;
        const imSeated = list.some(p => p.id === api.me.id);
        sig = JSON.stringify([sh.phase, need, mine, noFace, imSeated, list.map(p => [p.id, p.state.ready === need])]);
        build = () => {
          const out = [];
          if (noFace) out.push(textLine('📷 The camera must see your face to play. Look at the camera!'));
          if (list.length < 2) out.push(textLine('Waiting for a friend to join…'));
          else if (!imSeated) out.push(textLine('The contest is full: you’re watching.'));
          else {
            const b = document.createElement('button');
            b.className = 'btn';
            b.style.pointerEvents = 'auto';
            b.textContent = mine ? 'Ready ✔' : sh.phase === 'over' ? 'Ready again!' : 'Ready!';
            b.disabled = mine || noFace;
            b.addEventListener('click', ready);
            out.push(b);
            const waiting = list.filter(p => p.state.ready !== need).map(p => p.name);
            if (mine && waiting.length) out.push(textLine(`Waiting for ${waiting.join(', ')}…`, '0.85rem'));
          }
          out.push(textLine(`Wins ${record.wins} · Longest stare ${record.longest.toFixed(1)} s`, '0.85rem'));
          return out;
        };
      } else {
        sig = 'play';
        build = () => [];
      }
      if (sig === uiSig) return;
      uiSig = sig;
      ui.replaceChildren(...build());
    }

    // --- blink detection ----------------------------------------------------------
    function watchFace(sh, t) {
      const face = api.face();
      const inPlay = sh && sh.phase === 'play' && t >= sh.startAt && sh.ids.includes(api.me.id) && !(api.me.id in sh.out) && !local.blinked;
      if (!inPlay) {
        blinkSince = null;
        lostSince = null;
        return;
      }
      const now = performance.now();
      if (!face) {
        lostSince ??= now;
        blinkSince = null;
        if (now - lostSince > LOST_MS) blinked(sh);
        return;
      }
      lostSince = null;
      if (face.blinkL > BLINK_LEVEL && face.blinkR > BLINK_LEVEL) {
        blinkSince ??= now;
        if (now - blinkSince > BLINK_MS) blinked(sh);
      } else {
        blinkSince = null;
      }
    }

    // --- rendering ----------------------------------------------------------------
    function drawTile(sh, id, x, y, tw, th, t) {
      const out = sh.phase !== 'lobby' && id in sh.out;
      const isWinner = sh.phase === 'over' && sh.winner === id;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, tw, th, 14);
      ctx.clip();
      ctx.fillStyle = '#2a1f4d';
      ctx.fillRect(x, y, tw, th);
      if (out && ctx.filter !== undefined) ctx.filter = 'grayscale(0.9) brightness(0.7)';
      const media = present(id) ? api.mediaOf(id) : null;
      if (!drawCover(ctx, media, x, y, tw, th)) {
        ctx.fillStyle = colorOf(id);
        ctx.globalAlpha = 0.35;
        ctx.fillRect(x, y, tw, th);
        ctx.globalAlpha = 1;
        outlined(ctx, (nameOf(sh, id)[0] || '?').toUpperCase(), x + tw / 2, y + th / 2, th * 0.4, '#fff');
      }
      ctx.filter = 'none';
      if (out) {
        ctx.fillStyle = 'rgba(40,0,20,0.35)';
        ctx.fillRect(x, y, tw, th);
      }
      ctx.restore();

      ctx.lineWidth = isWinner ? 6 : 3;
      ctx.strokeStyle = isWinner ? '#ffd43b' : colorOf(id);
      ctx.beginPath();
      ctx.roundRect(x, y, tw, th, 14);
      ctx.stroke();

      const fs = clamp(th * 0.075, 12, 22);
      outlined(ctx, `${isWinner ? '👑 ' : ''}${nameOf(sh, id)}`, x + tw / 2, y + th - fs * 0.9, fs, '#fff', 800);
      if (sh.phase === 'lobby' || sh.phase === 'over') {
        const need = sh.phase === 'over' ? sh.round + 1 : sh.round;
        const p = api.players().find(m => m.id === id);
        if (p?.state.ready === need) outlined(ctx, '✔ Ready', x + tw / 2, y + fs * 1.1, fs, '#69db7c', 800);
      }
      if (out) {
        // Big rubber stamp over the face.
        ctx.save();
        ctx.translate(x + tw / 2, y + th / 2);
        ctx.rotate(-0.22);
        const size = clamp(tw * 0.17, 16, 64);
        ctx.font = `900 ${size}px ${FONT}`;
        const label = 'BLINKED!';
        const lw = ctx.measureText(label).width + size * 0.7;
        ctx.strokeStyle = '#ff3b4e';
        ctx.lineWidth = Math.max(3, size * 0.14);
        ctx.fillStyle = 'rgba(255,255,255,0.78)';
        ctx.beginPath();
        ctx.roundRect(-lw / 2, -size * 0.75, lw, size * 1.5, size * 0.25);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#e0223a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 0, 0);
        ctx.restore();
        outlined(ctx, `${(sh.out[id] / 1000).toFixed(1)} s`, x + tw / 2, y + th / 2 + clamp(tw * 0.17, 16, 64) * 1.1, fs * 1.1, '#fff');
      }
    }

    // The same distractions on every screen, derived from the round start.
    function drawDistractions(sh, elapsed) {
      const T0 = 3500, STEP = 3300;
      const kMax = Math.floor((elapsed - T0) / STEP) + 1;
      for (let k = Math.max(0, kMax - 2); k <= kMax; k++) {
        const t0 = T0 + k * STEP + rnd(sh.startAt, k * 7) * 1200;
        const kind = Math.floor(rnd(sh.startAt, k * 7 + 1) * 3);
        const dur = [2600, 1500, 2600][kind];
        const p = (elapsed - t0) / dur;
        if (p < 0 || p > 1) continue;
        const ry = rnd(sh.startAt, k * 7 + 2), rx = rnd(sh.startAt, k * 7 + 3);
        const s = clamp(Math.min(w, h) / 600, 0.6, 1.4);
        if (kind === 0) {
          const dir = rx > 0.5 ? 1 : -1;
          const x = (dir > 0 ? -30 + p * (w + 60) : w + 30 - p * (w + 60)) + Math.sin(p * 40) * 30 * s;
          const y = h * (0.2 + 0.6 * ry) + Math.sin(p * 23) * h * 0.14 + Math.cos(p * 57) * 18 * s;
          drawFly(ctx, x, y, 22 * s, elapsed / 1000);
        } else if (kind === 1) {
          const r = (24 + p * 50) * s;
          const pop = p > 0.8 ? (p - 0.8) / 0.2 : 0;
          if (pop > 0 && !fxDone.has(`${sh.round}:${k}`)) {
            fxDone.add(`${sh.round}:${k}`);
            api.sfx('pop');
          }
          drawBubble(ctx, w * (0.15 + 0.7 * rx), h * (0.85 - p * 0.55), r, pop);
        } else {
          if (!fxDone.has(`${sh.round}:${k}`)) {
            fxDone.add(`${sh.round}:${k}`);
            api.sfx('bounce');
          }
          const size = 56 * s;
          const x = w * (0.1 + 0.8 * p);
          const y = h * 0.9 - Math.abs(Math.sin(p * Math.PI * 4)) * h * (0.3 + 0.3 * ry) * (1 - p * 0.3);
          ctx.font = `${size}px ${FONT}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(Math.sin(p * 20) * 0.4);
          ctx.fillText(BOUNCERS[Math.floor(rnd(sh.startAt, k * 7 + 4) * BOUNCERS.length)], 0, 0);
          ctx.restore();
        }
      }
    }

    function announce(sh) {
      if (sh.phase !== 'over' || local.announced === sh.round) return;
      local.announced = sh.round;
      if (!sh.ids.includes(api.me.id)) return;
      const secs = (sh.winner === api.me.id ? sh.endAt - sh.startAt : sh.out[api.me.id] ?? 0) / 1000;
      if (secs > record.longest) {
        record.longest = secs;
        api.store.set('longest', secs);
      }
      if (sh.winner === api.me.id) {
        record.wins++;
        api.store.set('wins', record.wins);
        api.sfx('win');
      }
    }

    function render(sh) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#1d1533';
      ctx.fillRect(0, 0, w, h);
      if (!sh) return;
      const t = Date.now();
      const ids = sh.phase === 'lobby' ? seated().map(p => p.id) : sh.ids;
      const top = 46;
      const bottom = sh.phase === 'play' ? 6 : 96;
      const L = layout(Math.max(1, ids.length), w, Math.max(60, h - top - bottom));
      ids.forEach((id, i) => {
        const col = i % L.cols, row = Math.floor(i / L.cols);
        // Centre a short last row.
        const inRow = row === L.rows - 1 ? ids.length - row * L.cols : L.cols;
        const x0 = (w - inRow * L.tw - (inRow - 1) * 8) / 2;
        const x = x0 + col * (L.tw + 8);
        const y = top + 8 + row * (L.th + 8) + (h - top - bottom - L.rows * (L.th + 8)) / 2;
        drawTile(sh, id, x, y, L.tw, L.th, t);
      });

      // Header: timer counting up (or the countdown / result).
      if (sh.phase === 'play') {
        const elapsed = t - sh.startAt;
        if (elapsed < 0) {
          const n = Math.ceil(-elapsed / 1000);
          if (n !== lastCount) {
            lastCount = n;
            api.sfx('tick');
          }
          ctx.fillStyle = 'rgba(20,10,40,0.45)';
          ctx.fillRect(0, 0, w, h);
          outlined(ctx, String(n), w / 2, h / 2, Math.min(w, h) * 0.45, '#ffd43b');
          outlined(ctx, 'Get ready to stare…', w / 2, 22, 18, '#fff', 800);
        } else {
          if (lastCount !== 0) {
            lastCount = 0;
            api.sfx('tick');
          }
          outlined(ctx, `👁️ ${fmt(elapsed)}`, w / 2, 22, 26, '#fff');
          if (elapsed < 1200) outlined(ctx, 'STARE!', w / 2, h / 2, Math.min(w, h) * 0.2, '#ff5fa2');
          drawDistractions(sh, elapsed);
        }
      } else if (sh.phase === 'over') {
        const winner = sh.winner ? nameOf(sh, sh.winner) : 'Nobody';
        outlined(ctx, `${winner} wins! ${fmt(sh.endAt - sh.startAt)}`, w / 2, 22, clamp(w / 18, 16, 30), '#ffd43b');
      } else {
        outlined(ctx, 'Staring Contest', w / 2, 22, 24, '#fff');
      }
    }

    // --- loop ---------------------------------------------------------------------
    function frame(now) {
      last = now;
      const t = Date.now();
      // Lobby: if my face is missing for 3 s the player is told to show it.
      if (api.face()) noFaceSince = 0;
      else if (!noFaceSince) noFaceSince = now;
      noFace = !!noFaceSince && now - noFaceSince > 3000;
      if (api.isOwner()) ownerTick();
      const sh = api.shared();
      if (sh) {
        if (sh.round !== local.round) {
          local.round = sh.round;
          local.blinked = false;
          lastCount = -1;
        }
        if (sh.phase === 'play' && sh.out && api.me.id in sh.out) local.blinked = true;
        watchFace(sh, t);
        announce(sh);
      }
      updateUi(sh);
      render(sh);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

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
        if (pad.a) ready();
      },
    };
  },
};
