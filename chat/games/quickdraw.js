// Quick Draw: a Wild West reaction duel. Everyone presses Ready, the owner
// picks a secret moment (drawAt) 2-5 seconds ahead and publishes it in shared
// state. When it arrives every screen flashes "DRAW!" and each player fires
// (tap, Space, controller A, or opening their mouth when a face is tracked).
// Reaction times are measured on each player's own machine from the frame
// that showed DRAW!, so network delay never decides a duel. Firing early puts
// you out of the round. Fastest shot wins the round; first to 5 wins the match.
//
// During a duel every seated player stands as a gunslinger tile along the
// top with their live face; as each shot (or early trigger) reaches the
// referee's results it is stamped on that player's tile ("BANG 231 ms" or
// "TOO EARLY"), live, before the round's result. Anyone joining mid-duel
// watches with a "You're in next round" note and is dealt in at the next round.
//
// Referee state (owner only writes it):
//   { phase: 'lobby' | 'wait' | 'result' | 'over', match, round, drawAt, nextAt,
//     ids, names, results: { id: { ms } | { early: true } }, wins: { id: n },
//     winner, matchWinner }

const WIN_AT = 5;
const REPORT_WAIT = 2500;   // how long after DRAW! the owner waits for shots
const RESULT_TIME = 4500;   // how long a round result stays on screen
const FONT = 'ui-rounded, system-ui, sans-serif';
const POSTER = '"Rockwell Extra Bold", "Rockwell", "Clarendon", Georgia, "Times New Roman", serif';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// --- drawing helpers -------------------------------------------------------

// Cowboy-poster lettering: heavy serif capitals with a dark outline and a
// chunky offset shadow.
function poster(ctx, text, x, y, size, fill = '#ffd43b', rot = 0, align = 'center') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.font = `900 ${size}px ${POSTER}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#2a1206';
  ctx.fillText(text, size * 0.05, size * 0.07);
  ctx.strokeStyle = '#2a1206';
  ctx.lineWidth = Math.max(3, size * 0.16);
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = fill;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function plain(ctx, text, x, y, size, fill = '#fff', align = 'center', weight = 800) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(30,10,0,0.75)';
  ctx.lineWidth = Math.max(3, size * 0.22);
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function cactus(g, x, base, s) {
  g.fillStyle = '#2b1736';
  const arm = (dx, up, len) => {
    g.fillRect(x + dx * s, base - (up + len) * s, 9 * s, len * s);
    g.fillRect(Math.min(x, x + dx * s), base - up * s, Math.abs(dx) * s + 9 * s, 9 * s);
  };
  g.fillRect(x, base - 80 * s, 14 * s, 80 * s);
  g.beginPath();
  g.arc(x + 7 * s, base - 80 * s, 7 * s, 0, Math.PI * 2);
  g.fill();
  arm(-20, 30, 26);
  arm(24, 44, 22);
}

// Sunset desert: sky gradient, sun, layered mesas, sand and cactus silhouettes.
function drawStandIn(g, w, h) {
  const horizon = h * 0.62;
  const sky = g.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#3a2a6e');
  sky.addColorStop(0.5, '#e8566b');
  sky.addColorStop(1, '#ffc15e');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, horizon + 2);
  const sun = g.createRadialGradient(w * 0.7, horizon, 0, w * 0.7, horizon, h * 0.3);
  sun.addColorStop(0, 'rgba(255,248,200,1)');
  sun.addColorStop(0.25, 'rgba(255,224,130,0.9)');
  sun.addColorStop(1, 'rgba(255,190,90,0)');
  g.fillStyle = sun;
  g.fillRect(0, 0, w, horizon + 2);
  // Mesas: flat-topped silhouettes, far ones lighter.
  const mesas = [
    { c: '#8a3d5a', y: 0.1, spots: [[0.05, 0.22], [0.5, 0.18], [0.85, 0.26]] },
    { c: '#5a2a52', y: 0.06, spots: [[0.22, 0.3], [0.68, 0.24]] },
  ];
  for (const m of mesas) {
    g.fillStyle = m.c;
    for (const [cx, mw] of m.spots) {
      const x0 = (cx - mw / 2) * w, x1 = (cx + mw / 2) * w, top = horizon - m.y * h * 1.6, inset = mw * w * 0.1;
      g.beginPath();
      g.moveTo(x0 - inset, horizon + 2);
      g.lineTo(x0, top + h * 0.05);
      g.lineTo(x0 + inset, top);
      g.lineTo(x1 - inset, top);
      g.lineTo(x1, top + h * 0.05);
      g.lineTo(x1 + inset, horizon + 2);
      g.fill();
    }
  }
  // Sand.
  const sand = g.createLinearGradient(0, horizon, 0, h);
  sand.addColorStop(0, '#e7a65c');
  sand.addColorStop(1, '#a8582f');
  g.fillStyle = sand;
  g.fillRect(0, horizon, w, h - horizon);
  g.strokeStyle = 'rgba(90,40,20,0.25)';
  g.lineWidth = 2;
  for (let i = 1; i < 7; i++) {
    const y = horizon + (h - horizon) * (i * i) / 55;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(w, y);
    g.stroke();
  }
  const s = clamp(h / 700, 0.5, 1.5);
  cactus(g, w * 0.08, horizon + (h - horizon) * 0.35, s * 1.2);
  cactus(g, w * 0.9, horizon + (h - horizon) * 0.5, s * 1.5);
  cactus(g, w * 0.3, horizon + (h - horizon) * 0.12, s * 0.7);
}

// Where the gunslinger tiles go: a row along the top, portrait tiles as big
// as fit (at most about 30% of the height). Returns { tw, th, y, xs, bottom }.
function tileLayout(n, w, h) {
  const gap = 8, side = 8;
  const maxTh = clamp(h * 0.3, 60, 220);
  const tw = Math.max(20, Math.min((w - side * 2 - gap * (n - 1)) / Math.max(1, n), maxTh * 0.8));
  const th = tw / 0.8;
  const x0 = (w - n * tw - (n - 1) * gap) / 2;
  const y = 8;
  return { tw, th, y, xs: Array.from({ length: n }, (_, i) => x0 + i * (tw + gap)), bottom: y + th };
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

// A tilted rubber stamp across a tile: a big first line and an optional
// smaller second one, shrunk to fit `maxW`.
function stamp(ctx, cx, cy, maxW, size, line1, line2, color, rot = -0.18) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.font = `900 ${size}px ${POSTER}`;
  const w1 = ctx.measureText(line1).width;
  const s = w1 + size * 0.6 > maxW ? size * (maxW / (w1 + size * 0.6)) : size;
  const s2 = s * 0.62;
  ctx.font = `900 ${s}px ${POSTER}`;
  let bw = ctx.measureText(line1).width;
  if (line2) {
    ctx.font = `900 ${s2}px ${FONT}`;
    bw = Math.max(bw, ctx.measureText(line2).width);
  }
  bw += s * 0.6;
  const bh = s * (line2 ? 1.85 : 1.25);
  ctx.fillStyle = 'rgba(255,248,225,0.86)';
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2.5, s * 0.12);
  ctx.beginPath();
  ctx.roundRect(-bw / 2, -bh / 2, bw, bh, s * 0.2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${s}px ${POSTER}`;
  ctx.fillText(line1, 0, line2 ? -s * 0.3 : s * 0.04);
  if (line2) {
    ctx.font = `900 ${s2}px ${FONT}`;
    ctx.fillText(line2, 0, s * 0.52);
  }
  ctx.restore();
}

// What goes on a player's tile for their entry in the results (or null).
function stampFor(r) {
  if (!r || typeof r !== 'object') return null;
  if (r.early === true) return { line1: 'TOO EARLY', line2: '', color: '#d0233a' };
  if (Number.isFinite(r.ms)) return { line1: 'BANG', line2: `${Math.round(r.ms)} ms`, color: '#b5480c' };
  return null;
}

function drawTumbleweed(ctx, x, y, r, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.strokeStyle = '#6b4320';
  ctx.lineWidth = Math.max(1.5, r * 0.07);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25, r * (0.55 + (i % 3) * 0.2), a, a + Math.PI * 1.2);
    ctx.stroke();
  }
  ctx.restore();
}

export default {
  id: 'quickdraw',
  name: 'Quick Draw',
  emoji: '🤠',
  blurb: 'Wild West duel: fire the instant you see DRAW! Too early and you’re out.',
  minPlayers: 2,
  maxPlayers: 6,
  needsFace: false,

  create(api) {
    const canvas = document.createElement('canvas');
    canvas.className = 'g-canvas';
    const ui = document.createElement('div');
    ui.className = 'g-center';
    ui.style.pointerEvents = 'none';
    ui.style.gap = '8px';
    api.el.append(canvas, ui);
    const ctx = canvas.getContext('2d');

    let best = api.store.get('best', 0);          // fastest reaction ever (ms)
    let matchWins = api.store.get('matchWins', 0); // matches won on this device
    let w = 0, h = 0, dpr = 1, bgCache = null;
    let raf = 0, last = performance.now(), clock = 0;
    let armed = false;     // mouth must close once before opening counts as a shot
    let uiSig = '';
    // My view of the current round.
    const local = { round: -1, drawShownAt: null, done: false, ms: null, early: false, announced: -1 };

    function resize() {
      const r = api.el.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      bgCache = null;
    }
    const ro = new ResizeObserver(resize);
    ro.observe(api.el);
    resize();

    // --- roles ---------------------------------------------------------------
    const seated = () => api.players().slice(0, 6);
    const isSeated = id => seated().some(p => p.id === id);
    const present = id => api.players().some(p => p.id === id);
    const nameOf = (sh, id) => api.players().find(p => p.id === id)?.name || sh?.names?.[id] || 'Cowpoke';
    const colorOf = id => api.players().find(p => p.id === id)?.color || '#fff';

    // --- reporting (players) ---------------------------------------------------
    // A report goes out as a message and also sits in my state, so a new owner
    // taking over mid-round still finds it.
    function report(kind, data) {
      api.send(kind, data);
      api.setState({ rep: { kind, ...data } });
      if (api.isOwner()) ownerRecord(api.me.id, kind, data);
    }

    function syncLocal(sh) {
      if (local.round === sh.round) return;
      local.round = sh.round;
      local.drawShownAt = null;
      local.done = false;
      local.ms = null;
      local.early = false;
    }

    function fire() {
      const sh = api.shared();
      if (!sh || sh.phase !== 'wait' || !sh.ids?.includes(api.me.id)) return;
      syncLocal(sh);
      if (local.done) return;
      local.done = true;
      armed = false;
      const t = Date.now();
      if (t < sh.drawAt) {
        local.early = true;
        api.sfx('lose');
        report('early', { round: sh.round });
        return;
      }
      // Measured from the frame that showed DRAW! (or from drawAt if that
      // frame has not been drawn yet).
      const ms = Math.round(local.drawShownAt != null ? performance.now() - local.drawShownAt : t - sh.drawAt);
      local.ms = Math.max(0, ms);
      api.sfx('bang');
      if (!best || local.ms < best) {
        best = local.ms;
        api.store.set('best', best);
      }
      report('fire', { round: sh.round, ms: local.ms });
    }

    function ready() {
      const sh = api.shared();
      if (!sh || (sh.phase !== 'lobby' && sh.phase !== 'over')) return;
      if (seated().length < 2 || !isSeated(api.me.id)) return;
      api.setState({ ready: sh.phase === 'over' ? sh.match + 1 : sh.match });
      api.sfx('click');
    }

    // One action for tap / Space / pad A, whatever the phase.
    function press() {
      const sh = api.shared();
      if (!sh) return;
      if (sh.phase === 'wait') fire();
      else ready();
    }

    // --- owner: the referee ----------------------------------------------------
    function ownerRecord(id, kind, d) {
      const sh = api.shared();
      if (!sh || sh.phase !== 'wait' || !d || d.round !== sh.round) return;
      if (!sh.ids.includes(id) || sh.results[id]) return;
      let entry;
      if (kind === 'early') entry = { early: true };
      else if (kind === 'fire' && Number.isFinite(d.ms)) entry = { ms: Math.round(clamp(d.ms, 0, 20000)) };
      else return;
      api.setShared({ ...sh, results: { ...sh.results, [id]: entry } });
    }

    function startRound(sh, patch = {}) {
      const ids = seated().map(p => p.id);
      const names = {};
      for (const p of seated()) names[p.id] = p.name;
      api.setShared({
        ...sh,
        ...patch,
        phase: 'wait',
        round: sh.round + 1,
        drawAt: Date.now() + 2000 + Math.floor(Math.random() * 3000),
        ids,
        names,
        results: {},
        winner: null,
      });
    }

    function ownerTick() {
      let sh = api.shared();
      if (!sh) {
        api.setShared({ phase: 'lobby', match: 1, round: 0, wins: {}, results: {}, ids: [], names: {}, winner: null, matchWinner: null });
        return;
      }
      const t = Date.now();
      const list = seated();
      if (sh.phase === 'lobby' || sh.phase === 'over') {
        const need = sh.phase === 'over' ? sh.match + 1 : sh.match;
        if (list.length >= 2 && list.every(p => p.state.ready === need)) {
          startRound(sh, { match: need, wins: {}, matchWinner: null });
        }
      } else if (sh.phase === 'wait') {
        // Pick up reports from player state in case a message was missed
        // (for example when I just inherited the session).
        for (const p of api.players()) {
          const r = p.state.rep;
          if (r && r.round === sh.round && !api.shared().results[p.id]) ownerRecord(p.id, r.kind, r);
        }
        sh = api.shared();
        const here = sh.ids.filter(present);
        if (here.length < 2) {
          // Duel fizzled: back to the lobby with fresh Ready buttons.
          api.setShared({ ...sh, phase: 'lobby', match: sh.match + 1, wins: {}, results: {} });
        } else if (here.every(id => sh.results[id]) || t > sh.drawAt + REPORT_WAIT) {
          let winner = null, bestMs = Infinity;
          for (const id of here) {
            const r = sh.results[id];
            if (r && r.ms != null && r.ms < bestMs) { bestMs = r.ms; winner = id; }
          }
          const wins = { ...sh.wins };
          let matchWinner = null;
          if (winner) {
            wins[winner] = (wins[winner] || 0) + 1;
            if (wins[winner] >= WIN_AT) matchWinner = winner;
          }
          api.setShared({ ...sh, phase: 'result', winner, wins, matchWinner, nextAt: t + RESULT_TIME });
        }
      } else if (sh.phase === 'result' && t >= sh.nextAt) {
        if (sh.matchWinner) api.setShared({ ...sh, phase: 'over' });
        else if (seated().length < 2) api.setShared({ ...sh, phase: 'lobby', match: sh.match + 1, wins: {} });
        else startRound(sh);
      }
    }

    api.on('fire', (d, from) => ownerRecordFrom('fire', d, from));
    api.on('early', (d, from) => ownerRecordFrom('early', d, from));
    function ownerRecordFrom(kind, d, from) {
      if (api.isOwner() && typeof from === 'string') ownerRecord(from, kind, d);
    }

    // --- input -----------------------------------------------------------------
    const typing = e => /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName);
    function onKey(e) {
      if (typing(e) || !api.el.isConnected || e.repeat) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        press();
      }
    }
    window.addEventListener('keydown', onKey);
    canvas.addEventListener('pointerdown', e => {
      e.preventDefault();
      const sh = api.shared();
      if (sh && sh.phase === 'wait') fire();
    });

    // --- DOM overlay (lobby / match over) --------------------------------------
    function makeBtn(label, onClick) {
      const b = document.createElement('button');
      b.className = 'btn';
      b.textContent = label;
      b.style.pointerEvents = 'auto';
      b.addEventListener('click', onClick);
      return b;
    }

    function updateUi() {
      const sh = api.shared();
      let sig, build;
      if (!sh) {
        sig = 'connecting';
        build = () => [textLine('Saddling up…', 'g-big')];
      } else if (sh.phase === 'lobby' || sh.phase === 'over') {
        const list = seated();
        const need = sh.phase === 'over' ? sh.match + 1 : sh.match;
        const mine = api.state().ready === need;
        sig = JSON.stringify([sh.phase, need, mine, sh.matchWinner, sh.wins, list.map(p => [p.id, p.name, p.state.ready === need])]);
        build = () => {
          const out = [];
          const title = document.createElement('div');
          title.className = 'g-big';
          title.style.cssText = `font-family:${POSTER};color:#ffd43b;text-shadow:0 3px 0 #2a1206,0 0 12px #2a1206;font-size:clamp(1.4rem,min(9vw,11vh),4rem);line-height:1.05;letter-spacing:.03em`;
          title.textContent = sh.phase === 'over' ? `${nameOf(sh, sh.matchWinner)} wins the showdown!` : 'QUICK DRAW';
          out.push(title);
          if (list.length < 2) {
            out.push(textLine('Waiting for a friend to join…'));
          } else {
            out.push(textLine(`First to ${WIN_AT} wins. Fire when you see DRAW!`));
            const row = document.createElement('div');
            row.className = 'g-row';
            for (const p of list) {
              const chip = document.createElement('span');
              chip.style.cssText = `padding:4px 12px;border-radius:99px;background:rgba(30,10,0,.6);border:2px solid ${p.color};font-weight:800`;
              const wins = sh.phase === 'over' ? ` · ${sh.wins[p.id] || 0} wins` : '';
              chip.textContent = `${p.state.ready === need ? '✔' : '…'} ${p.name}${wins}`;
              row.append(chip);
            }
            out.push(row);
            if (!list.some(p => p.id === api.me.id)) out.push(textLine('The saloon is full: you’re watching.'));
            else out.push(makeBtnReady(mine, sh.phase === 'over' ? 'Rematch' : 'Ready'));
            if (best) out.push(textLine(`Your best draw: ${best} ms · matches won: ${matchWins}`, '', true));
          }
          return out;
        };
      } else {
        sig = 'play';
        build = () => [];
      }
      if (sig === uiSig) return;
      uiSig = sig;
      ui.replaceChildren(...build());
      // The panel behind the buttons is only wanted when there is something to show.
      ui.style.background = ui.childElementCount ? 'rgba(30,10,0,0.55)' : 'none';
    }

    function textLine(text, cls = '', small = false) {
      const d = document.createElement('div');
      if (cls) d.className = cls;
      d.textContent = text;
      d.style.cssText += `font-weight:800;text-shadow:0 2px 4px rgba(0,0,0,.7);${small ? 'opacity:.85;font-size:.9rem' : ''}`;
      return d;
    }

    function makeBtnReady(already, label) {
      const b = makeBtn(already ? 'Ready ✔' : `${label}!`, ready);
      b.disabled = already;
      return b;
    }

    // --- rendering -------------------------------------------------------------
    function background() {
      const art = api.img('quickdraw');
      if (bgCache && bgCache.art === art) return bgCache.canvas;
      const c = document.createElement('canvas');
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
      if (art) {
        const s = Math.max(w / art.width, h / art.height);
        g.drawImage(art, (w - art.width * s) / 2, (h - art.height * s) / 2, art.width * s, art.height * s);
      } else {
        drawStandIn(g, w, h);
      }
      bgCache = { canvas: c, art };
      return c;
    }

    function hud(sh) {
      const s = clamp(Math.min(w / 640, h / 420), 0.6, 1.3);
      const ids = sh.phase === 'lobby' || sh.phase === 'over' ? seated().map(p => p.id) : sh.ids;
      const colW = Math.min(w / Math.max(1, ids.length), 170 * s);
      const x0 = w / 2 - (colW * ids.length) / 2;
      ids.forEach((id, i) => {
        const cx = x0 + colW * (i + 0.5);
        plain(ctx, nameOf(sh, id), cx, 18 * s, 17 * s, colorOf(id));
        // Win tally as pips.
        const n = sh.wins[id] || 0;
        for (let k = 0; k < WIN_AT; k++) {
          ctx.beginPath();
          ctx.arc(cx + (k - (WIN_AT - 1) / 2) * 15 * s, 38 * s, 5.5 * s, 0, Math.PI * 2);
          ctx.fillStyle = k < n ? '#ffd43b' : 'rgba(30,10,0,0.55)';
          ctx.fill();
          ctx.strokeStyle = '#2a1206';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
      if (best) plain(ctx, `Best draw ${best} ms`, w - 10, h - 14 * s, 13 * s, '#fff', 'right');
    }

    // --- the gunslingers: one tile per seated player with their live face ------
    function drawSlinger(sh, id, x, y, tw, th) {
      const r = sh.results?.[id];
      const out = r?.early === true;
      const won = sh.phase === 'result' && sh.winner === id;
      const band = Math.min(22, th * 0.16), foot = Math.min(26, th * 0.2);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, tw, th, 12);
      ctx.clip();
      ctx.fillStyle = '#3a1d0c';
      ctx.fillRect(x, y, tw, th);
      if (out && ctx.filter !== undefined) ctx.filter = 'grayscale(0.9) brightness(0.75)';
      const media = !present(id) ? null : id === api.me.id ? (api.selfCanvas || api.mediaOf(id)) : api.mediaOf(id);
      if (!drawCover(ctx, media, x, y, tw, th)) {
        ctx.fillStyle = colorOf(id);
        ctx.globalAlpha = 0.4;
        ctx.fillRect(x, y, tw, th);
        ctx.globalAlpha = 1;
        poster(ctx, (nameOf(sh, id)[0] || '?').toUpperCase(), x + tw / 2, y + th * 0.45, th * 0.38, '#fff');
      }
      ctx.filter = 'none';
      // Dusty bands at the top and the bottom for the pips and the name.
      ctx.fillStyle = 'rgba(30,10,0,0.5)';
      ctx.fillRect(x, y, tw, band);
      ctx.fillRect(x, y + th - foot, tw, foot);
      ctx.restore();

      ctx.lineWidth = won ? 6 : 3;
      ctx.strokeStyle = won ? '#ffd43b' : colorOf(id);
      ctx.beginPath();
      ctx.roundRect(x, y, tw, th, 12);
      ctx.stroke();

      // Win tally as pips along the top.
      const n = sh.wins?.[id] || 0;
      const pr = clamp(tw / (WIN_AT * 3.4), 2.5, 6);
      for (let k = 0; k < WIN_AT; k++) {
        ctx.beginPath();
        ctx.arc(x + tw / 2 + (k - (WIN_AT - 1) / 2) * pr * 2.7, y + band / 2, pr, 0, Math.PI * 2);
        ctx.fillStyle = k < n ? '#ffd43b' : 'rgba(30,10,0,0.55)';
        ctx.fill();
        ctx.strokeStyle = '#2a1206';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      const fs = clamp(th * 0.11, 10, 17);
      ctx.font = `800 ${fs}px ${FONT}`;
      let name = `${won ? '★ ' : ''}${nameOf(sh, id)}`;
      while (name.length > 2 && ctx.measureText(name).width > tw - 10) name = name.slice(0, -2) + '…';
      plain(ctx, name, x + tw / 2, y + th - foot / 2, fs, '#fff');

      // The stamp, as soon as the referee has their shot.
      const st = stampFor(r) || (sh.phase === 'result' ? { line1: 'NO SHOT', line2: '', color: '#6b5a48' } : null);
      if (st) stamp(ctx, x + tw / 2, y + th * 0.52, tw * 0.94, clamp(tw * 0.24, 12, 40), st.line1, st.line2, st.color);
    }

    // Draws the row of gunslingers; returns where it ends.
    function slingers(sh) {
      const ids = sh.ids || [];
      if (!ids.length) return 0;
      const L = tileLayout(ids.length, w, h);
      ids.forEach((id, i) => drawSlinger(sh, id, L.xs[i], L.y, L.tw, L.th));
      return L.bottom;
    }

    // A note for anyone watching this round from the side.
    function watchNote(sh) {
      if (!sh.ids || sh.ids.includes(api.me.id)) return;
      const text = isSeated(api.me.id) ? 'You’re in next round' : 'The saloon is full: you’re watching';
      const fs = clamp(w / 22, 13, 22);
      ctx.font = `800 ${fs}px ${FONT}`;
      const bw = Math.min(w - 16, ctx.measureText(text).width + fs * 1.6), bh = fs * 2;
      const y = h - bh - 10;
      ctx.fillStyle = 'rgba(30,10,0,0.72)';
      ctx.strokeStyle = '#ffd43b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(w / 2 - bw / 2, y, bw, bh, bh / 2);
      ctx.fill();
      ctx.stroke();
      plain(ctx, text, w / 2, y + bh / 2, fs, '#ffd43b');
    }

    // The middle of the space under the tiles, and a size scale for it.
    function stage(top) {
      const room = Math.max(80, h - top);
      return { cy: top + room * 0.42, s: clamp(Math.min(w / 640, room / 300), 0.5, 1.5) };
    }

    function renderWait(sh, t, top) {
      const { cy, s } = stage(top);
      const drawn = t >= sh.drawAt;
      if (!drawn) {
        // Steady... a tumbleweed rolls past while everyone holds their nerve.
        const span = w + 200;
        const x = ((clock * 90 * s) % span) - 100;
        const gy = h * 0.8;
        const bounce = Math.abs(Math.sin(clock * 5)) * 18 * s;
        drawTumbleweed(ctx, x, gy - 30 * s - bounce, 30 * s, clock * 4);
        if (local.early) {
          poster(ctx, 'TOO EARLY!', w / 2, cy, 64 * s, '#ff5c6c', -0.05);
          plain(ctx, 'You’re out this round', w / 2, cy + 50 * s, 20 * s);
        } else {
          poster(ctx, 'STEADY…', w / 2, cy, 70 * s, '#ffd43b', -0.03);
          plain(ctx, 'Wait for it. Tap / Space / A / open wide', w / 2, cy + 50 * s, 16 * s);
        }
        return;
      }
      // DRAW! flashes red and yellow.
      if (local.drawShownAt == null) local.drawShownAt = performance.now();
      if (!local.done) {
        const flash = Math.floor(clock * 14) % 2 === 0;
        ctx.fillStyle = flash ? 'rgba(255,80,40,0.45)' : 'rgba(255,220,60,0.45)';
        ctx.fillRect(0, 0, w, h);
        const shake = (Math.random() - 0.5) * 8 * s;
        poster(ctx, 'DRAW!', w / 2 + shake, cy + shake, clamp(Math.min(w / 4.2, (h - top) / 2), 40, 190), '#fff04a', -0.04);
      } else if (local.early) {
        poster(ctx, 'TOO EARLY!', w / 2, cy, 64 * s, '#ff5c6c', -0.05);
      } else {
        poster(ctx, 'BANG!', w / 2, cy - 10 * s, 84 * s, '#ffd43b', 0.04);
        plain(ctx, `${local.ms} ms`, w / 2, cy + 52 * s, 30 * s, '#fff');
        plain(ctx, 'Waiting for the others…', w / 2, cy + 84 * s, 15 * s);
      }
    }

    function renderResult(sh, t, top) {
      const { s } = stage(top);
      const mid = sh.matchWinner ? `${nameOf(sh, sh.matchWinner)} takes the match!` : sh.winner ? `${nameOf(sh, sh.winner)} wins the round!` : 'Nobody drew in time';
      const text = mid.toUpperCase();
      let ps = clamp(36 * s * (w < 420 ? 0.7 : 1), 16, 52);
      ctx.font = `900 ${ps}px ${POSTER}`;
      ps *= Math.min(1, (w - 24) / Math.max(1, ctx.measureText(text).width + ps * 0.3));
      poster(ctx, text, w / 2, top + ps * 0.8, ps, sh.winner ? '#ffd43b' : '#ff9a8a');
      // Reaction times, fastest first, on a paper strip per player.
      const rows = sh.ids.map(id => ({ id, r: sh.results[id] }));
      rows.sort((a, b) => (a.r?.ms ?? Infinity) - (b.r?.ms ?? Infinity));
      let y = top + ps * 1.7;
      const rh = clamp((h - y - 30) / Math.max(1, rows.length), 16, 34 * s);
      const rw = Math.min(w - 24, 380 * s);
      for (const { id, r } of rows) {
        const won = id === sh.winner;
        ctx.fillStyle = won ? 'rgba(255,230,140,0.95)' : 'rgba(245,225,185,0.88)';
        ctx.strokeStyle = won ? '#ffb000' : '#5a3216';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(w / 2 - rw / 2, y, rw, rh - 6, 8);
        ctx.fill();
        ctx.stroke();
        ctx.textBaseline = 'middle';
        ctx.font = `800 ${rh * 0.45}px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#2a1206';
        ctx.fillText(`${won ? '★ ' : ''}${nameOf(sh, id)}`, w / 2 - rw / 2 + 12, y + (rh - 6) / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = r?.early ? '#c4202f' : r ? '#2a1206' : '#7a6a58';
        ctx.fillText(r?.early ? 'Too early!' : r ? `${r.ms} ms` : 'no shot', w / 2 + rw / 2 - 12, y + (rh - 6) / 2);
        y += rh;
      }
      if (!sh.matchWinner && sh.ids.includes(api.me.id)) plain(ctx, 'Next duel coming up…', w / 2, Math.min(h - 12, y + 12), 13, '#fff');
    }

    // Round announcements: sound and toast once per round.
    function announce(sh) {
      if (sh.phase !== 'result' || local.announced === sh.round) return;
      local.announced = sh.round;
      if (sh.matchWinner) {
        if (sh.matchWinner === api.me.id) {
          matchWins++;
          api.store.set('matchWins', matchWins);
          api.sfx('win');
        } else api.sfx('lose');
      } else if (sh.winner === api.me.id) api.sfx('score');
      else if (sh.winner) api.sfx('miss');
    }

    function render(sh) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.drawImage(background(), 0, 0, w, h);
      if (!sh) return;
      const t = Date.now();
      if (sh.phase === 'wait' || sh.phase === 'result') {
        const top = slingers(sh) + 8;
        if (sh.phase === 'result') renderResult(sh, t, top);
        else {
          syncLocal(sh);
          if (sh.ids.includes(api.me.id)) renderWait(sh, t, top);
          else {
            // Watching: show the beat but nobody to fire for.
            const { cy, s } = stage(top);
            poster(ctx, t >= sh.drawAt ? 'DRAW!' : 'STEADY…', w / 2, cy, 64 * s, '#ffd43b');
          }
          if (best && sh.ids.includes(api.me.id)) plain(ctx, `Best draw ${best} ms`, w - 10, h - 12, 12, '#fff', 'right');
        }
        watchNote(sh);
      } else if (sh.phase === 'over') {
        hud(sh);
      }

    }

    // --- loop ------------------------------------------------------------------
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clock += dt;
      // Opening my mouth counts as a shot, once the mouth was closed first.
      const face = api.face();
      if (face) {
        if (face.mouthOpen < 0.35) armed = true;
        else if (armed && face.mouthOpen > 0.55 && api.el.isConnected) {
          armed = false;
          const sh = api.shared();
          if (sh && sh.phase === 'wait') fire();
        }
      }
      if (api.isOwner()) ownerTick();
      const sh = api.shared();
      if (sh) announce(sh);
      updateUi();
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
        if (pad.a) press();
      },
    };
  },
};

// Exposed for tests.
export const _logic = { tileLayout, stampFor };
