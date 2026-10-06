// Copy Cat: the owner runs ten prompts, each asking for a facial expression
// ("😮 Open wide!"). Every player's own browser measures their own face and,
// once the expression has been held for 300 ms, reports how long it took
// since that player first saw the prompt (measured locally, so network delay
// does not matter). The owner scores each prompt: 1st 3 points, 2nd 2, the
// rest 1, nothing for those who timed out after 6 s. Players whose camera
// cannot see a face get an "I did it!" button instead, marked with a 🙈 so
// friends can laugh. Solo play works.
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
  { emoji: '🐡', text: 'Puff your cheeks!', thr: 0.45, get: f => f.cheekPuff },
  { emoji: '☹️', text: 'Frown!', thr: 0.45, get: f => f.frown },
  { emoji: '😉', text: 'Wink!', thr: 0.5, get: f => f.wink },
  { emoji: '😌', text: 'Close both eyes!', thr: 0.6, get: f => Math.min(f.blinkL, f.blinkR) },
];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

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
      const vy = top + 8 + promptH;
      const vh = Math.max(60, h - vy - chipsH - meterH - pad * 2 - (fallback.hidden ? 0 : 50));
      const vw = Math.min(w - pad * 2, vh * 1.33);
      const vx = (w - vw) / 2;
      const val = face ? clamp(ex.get(face) / ex.thr, 0, 1.2) : 0;
      const ok = sh.phase === 'prompt' ? local.matched || val >= 1 : !!sh.reveal[api.me.id];
      drawSelf(vx, vy, vw, vh, ok);

      // Meter for my current expression, and the time left beneath it.
      const my = vy + vh + 8;
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
      if (local.matched && sh.phase === 'prompt') outlined(ctx, `Got it! ${(local.ms / 1000).toFixed(2)} s`, w / 2, vy + vh / 2, clamp(vw / 9, 16, 40), '#69db7c');

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
      if (face) noFaceSince = 0;
      else if (!noFaceSince) noFaceSince = now;
      if (api.isOwner()) ownerTick();
      const sh = api.shared();
      if (sh) {
        watchFace(sh, now, face);
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
