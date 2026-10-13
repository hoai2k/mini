// Connect Four: two players drop red and yellow discs into a 7x6 grid; four in
// a row wins. The first two members of the session play and everyone else
// waits in line (js/seatqueue.js): the front of the line takes over a seat
// when a player leaves, and after a game with someone waiting the winner
// stays on, the loser goes to the back of the line and the next in line sits
// down (after a draw, whoever has sat longest makes way). The owner holds the whole game
// in shared state and validates every move sent by the other player, so the
// game carries on from shared() alone if the owner leaves. Each device keeps a
// win/loss/draw record against every opponent name.

import { readLineup, syncSeats, rotateSeats, queueLabel, swapText } from '../js/seatqueue.js';

const COLS = 7;
const ROWS = 6;
const EMPTY = '.';
const COLOR = { r: '#ff4d6d', y: '#ffd43b' };
const DARK = { r: '#b3123a', y: '#c79500' };
const NAME = { r: 'Red', y: 'Yellow' };


// --- rules ---------------------------------------------------------------

// seats, q (the line of watchers), sat (when each seat sat down) and swap
// (who just rotated in, for the announcement) come from js/seatqueue.js.
function freshShared(game, first, seats, q = [], sat = [0, 0], swap = null) {
  return { board: EMPTY.repeat(COLS * ROWS), seats, q, sat, swap, turn: first, first, winner: null, line: [], last: -1, game };
}

// Lowest empty row in a column, or -1 when the column is full.
function dropRow(board, col) {
  for (let row = ROWS - 1; row >= 0; row--) if (board[row * COLS + col] === EMPTY) return row;
  return -1;
}

// Four-in-a-row through `cell`: returns the winning cell indexes or [].
function findLine(board, cell) {
  const who = board[cell];
  if (!who || who === EMPTY) return [];
  const r0 = Math.floor(cell / COLS), c0 = cell % COLS;
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const line = [cell];
    for (const s of [1, -1]) {
      let r = r0 + dr * s, c = c0 + dc * s;
      while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r * COLS + c] === who) {
        line.push(r * COLS + c);
        r += dr * s;
        c += dc * s;
      }
    }
    if (line.length >= 4) return line.sort((a, b) => a - b);
  }
  return [];
}

// Shared state is untrusted after an owner change; reject anything malformed.
function validShared(s) {
  return s && typeof s.board === 'string' && s.board.length === COLS * ROWS && /^[.ry]+$/.test(s.board)
    && Array.isArray(s.seats) && s.seats.length === 2 && (s.turn === 'r' || s.turn === 'y') && Number.isFinite(s.game);
}

const CSS = `
.c4 { position: absolute; inset: 0; display: flex; flex-direction: column; }
.c4-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 4px 10px; padding: 6px 10px 2px; font-weight: 800; }
.c4-chip { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px 3px 6px; border-radius: 999px; border: 2px solid transparent; background: rgba(0,0,0,0.25); max-width: 45%; }
.c4-chip.turn { border-color: var(--sun); box-shadow: 0 0 12px rgba(255,212,59,0.5); }
.c4-chip i { width: 16px; height: 16px; border-radius: 50%; flex: none; }
.c4-chip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.c4-status { flex: 1 1 100%; text-align: center; font-size: 1.15rem; font-weight: 900; min-height: 1.4em; }
.c4-rec { flex: 1 1 100%; text-align: center; font-size: 0.8rem; color: var(--muted); }
.c4-stage { position: relative; flex: 1; min-height: 0; }
.c4-stage canvas { cursor: pointer; }
.c4-again { margin: 2px 0 4px; }
.c4-again[hidden] { display: none; }
`;

export default {
  id: 'connect4',
  name: 'Connect Four',
  emoji: '🔴',
  blurb: 'Drop discs, get four in a row. Your record vs each friend is saved.',
  minPlayers: 2,
  maxPlayers: 8,
  needsFace: false,

  create(api) {
    // --- dom -------------------------------------------------------------
    const root = document.createElement('div');
    root.className = 'c4';
    const style = document.createElement('style');
    style.textContent = CSS;
    const head = document.createElement('div');
    head.className = 'c4-head';
    const chips = {};
    for (const k of ['r', 'y']) {
      const chip = document.createElement('div');
      chip.className = 'c4-chip';
      const dot = document.createElement('i');
      dot.style.background = COLOR[k];
      const label = document.createElement('span');
      chip.append(dot, label);
      chips[k] = { chip, label };
    }
    const statusEl = document.createElement('div');
    statusEl.className = 'c4-status';
    const recEl = document.createElement('div');
    recEl.className = 'c4-rec';
    head.append(chips.r.chip, chips.y.chip, statusEl, recEl);
    // (the Play again button joins the header further down)
    const stage = document.createElement('div');
    stage.className = 'c4-stage';
    const canvas = document.createElement('canvas');
    canvas.className = 'g-canvas';
    const again = document.createElement('button');
    again.className = 'btn aqua c4-again';
    again.textContent = 'Play again';
    again.hidden = true;
    stage.append(canvas);
    head.append(again);
    root.append(style, head, stage);
    api.el.append(root);
    const ctx = canvas.getContext('2d');

    // --- state -----------------------------------------------------------
    const records = api.store.get('records', {});   // '@name' -> [wins, losses, draws]
    let w = 0, h = 0, dpr = 1, raf = 0, destroyed = false;
    let hoverCol = 3;       // column shown with a ghost disc
    let shown = null;       // { game, board }: what the drawing has caught up with
    const drops = [];       // falling discs { cell, who, t0, landed }
    let announced = -1;     // game number whose result was already announced
    let lastSig = '';
    const T0 = performance.now();
    const clock = () => (performance.now() - T0) / 1000;

    const mySeat = s => (s ? s.seats.indexOf(api.me.id) : -1);   // 0 red, 1 yellow, -1 watching
    const myKey = s => (mySeat(s) === 0 ? 'r' : mySeat(s) === 1 ? 'y' : null);
    const nameOf = id => api.players().find(p => p.id === id)?.name ?? 'Player';
    const sharedNow = () => {
      const s = api.shared();
      return validShared(s) ? s : null;
    };

    // --- owner: keep the game and the two seats healthy ---------------------
    // Seats whose player left are given to the front of the line, newcomers
    // join the back of it (js/seatqueue.js).
    function ensure() {
      if (!api.isOwner()) return;
      const ids = api.players().map(p => p.id);
      let s = sharedNow();
      if (!s) s = freshShared(1, 'r', [null, null]);
      const lu = syncSeats(readLineup(s), ids);
      if (lu.changed || s !== api.shared()) api.setShared({ ...s, seats: lu.seats, q: lu.q, sat: lu.sat });
    }
    const lineup = s => readLineup(s);
    const placeOf = (s, id) => lineup(s).q.indexOf(id);

    // Applies one move (owner only). Returns true if it was legal.
    function applyMove(by, col, game) {
      const s = sharedNow();
      if (!s || s.winner || game !== s.game || !s.seats[0] || !s.seats[1]) return false;
      if (!Number.isInteger(col) || col < 0 || col >= COLS) return false;
      if (s.seats[s.turn === 'r' ? 0 : 1] !== by) return false;
      const row = dropRow(s.board, col);
      if (row < 0) return false;
      const cell = row * COLS + col;
      const board = s.board.slice(0, cell) + s.turn + s.board.slice(cell + 1);
      const line = findLine(board, cell);
      const full = !board.includes(EMPTY);
      api.setShared({
        ...s,
        board,
        last: cell,
        line,
        winner: line.length ? s.turn : full ? 'draw' : null,
        turn: s.turn === 'r' ? 'y' : 'r',
      });
      return true;
    }

    // New game. With someone waiting, the loser (after a draw whoever has
    // sat longest) makes way for the front of the line, who starts. Otherwise
    // the loser (or after a draw the player who did not start) goes first.
    // The players and the next in line may ask for it.
    function resetGame(by, game) {
      const s = sharedNow();
      if (!s || !s.winner || game !== s.game) return;
      const lu = lineup(s);
      if (!lu.seats.includes(by) && lu.q[0] !== by) return;
      const r = rotateSeats(lu, s.winner === 'draw' ? -1 : s.winner === 'r' ? 0 : 1);
      const first = r.swap ? (r.swap.seat === 0 ? 'r' : 'y')
        : s.winner === 'draw' ? (s.first === 'r' ? 'y' : 'r') : (s.winner === 'r' ? 'y' : 'r');
      api.setShared(freshShared(s.game + 1, first, r.seats, r.q, r.sat, r.swap && { ...r.swap, game: s.game + 1 }));
    }

    api.on('move', (d, from) => {
      if (api.isOwner() && d) applyMove(from, d.col, d.game);
    });
    api.on('again', (d, from) => {
      if (api.isOwner() && d) resetGame(from, d.game);
    });

    // Player actions: the owner applies directly, others ask the owner.
    function drop(col) {
      const s = sharedNow();
      const key = myKey(s);
      if (!s || s.winner || !key || s.turn !== key || !s.seats[0] || !s.seats[1]) return;
      if (dropRow(s.board, col) < 0) return;
      if (api.isOwner()) applyMove(api.me.id, col, s.game);
      else api.send('move', { col, game: s.game });
    }
    function playAgain() {
      const s = sharedNow();
      if (!s || !s.winner || (mySeat(s) < 0 && placeOf(s, api.me.id) !== 0)) return;
      if (api.isOwner()) resetGame(api.me.id, s.game);
      else api.send('again', { game: s.game });
    }
    again.addEventListener('click', playAgain);

    const animating = () => drops.some(d => !d.landed || clock() - d.t0 < d.dur + 0.3);

    // --- sync shared state into the drawing ----------------------------------
    // New discs start falling; a new game or a late join just snaps to the board.
    function sync() {
      const s = sharedNow();
      if (!s) return;
      if (!shown || shown.game !== s.game) {
        const fresh = !!shown;
        shown = { game: s.game, board: s.board };
        drops.length = 0;
        const sw = s.swap;
        if (fresh && sw && sw.game === s.game && typeof sw.in === 'string' && typeof sw.out === 'string') {
          api.toast(swapText(sw, api.me.id, nameOf));
          if (sw.in === api.me.id) api.sfx('win');
        }
        if (s.winner) announced = s.game;   // joined after the end: no fanfare
        return;
      }
      if (shown.board !== s.board) {
        for (let i = 0; i < s.board.length; i++) {
          if (s.board[i] !== shown.board[i] && s.board[i] !== EMPTY) {
            const row = Math.floor(i / COLS);
            drops.push({ cell: i, who: s.board[i], t0: clock(), dur: 0.18 + row * 0.07, landed: false });
          }
        }
        shown.board = s.board;
      }
    }

    // Disc position as a fraction (0 = top of the board, 1 = its slot), with a
    // small bounce after landing.
    function dropFrac(d, t) {
      const p = Math.min(1, t / d.dur);
      if (p < 1) return p * p;
      const b = (t - d.dur) / 0.28;
      return b < 1 ? 1 - 0.14 * Math.sin(Math.PI * b) * (1 - b) : 1;
    }

    // --- records ---------------------------------------------------------
    function record(oppName, idx) {
      const key = '@' + oppName;
      const r = Array.isArray(records[key]) ? records[key] : [0, 0, 0];
      r[idx]++;
      records[key] = r;
      api.store.set('records', records);
    }

    function announce(s) {
      announced = s.game;
      const key = myKey(s);
      if (!key) return;
      const opp = nameOf(s.seats[key === 'r' ? 1 : 0]);
      if (s.winner === 'draw') record(opp, 2);
      else if (s.winner === key) { record(opp, 0); api.sfx('win'); } else { record(opp, 1); api.sfx('lose'); }
    }

    // --- header ----------------------------------------------------------
    function updateHead(s) {
      const settled = !animating();
      const key = myKey(s);
      for (const [i, k] of ['r', 'y'].entries()) {
        const id = s?.seats[i];
        chips[k].label.textContent = id ? (id === api.me.id ? `You (${NAME[k]})` : nameOf(id)) : `${NAME[k]}: open seat`;
        chips[k].chip.classList.toggle('turn', !!s && !s.winner && s.turn === k && !!id);
      }
      let text = '';
      if (!s || !s.seats[0] || !s.seats[1]) text = 'Waiting for a friend to join…';
      else if (s.winner && settled) {
        text = s.winner === 'draw' ? 'Draw! The board is full.'
          : !key ? `${nameOf(s.seats[s.winner === 'r' ? 0 : 1])} wins!`
            : s.winner === key ? 'You win! 🎉' : `${nameOf(s.seats[s.winner === 'r' ? 0 : 1])} wins`;
      } else if (!key) text = `Watching · ${nameOf(s.seats[s.turn === 'r' ? 0 : 1])}'s turn`;
      else text = s.turn === key ? 'Your turn!' : `${nameOf(s.seats[s.turn === 'r' ? 0 : 1])}'s turn`;
      if (statusEl.textContent !== text) statusEl.textContent = text;

      let rec = '';
      const place = s ? placeOf(s, api.me.id) : -1;
      const q = s ? lineup(s).q : [];
      const sw = s?.swap;
      const justSwapped = s && sw && sw.game === s.game && s.board === EMPTY.repeat(COLS * ROWS) && typeof sw.in === 'string';
      if (s && key) {
        const opp = nameOf(s.seats[key === 'r' ? 1 : 0]);
        const r = records['@' + opp];
        rec = `You vs ${opp}: ${Array.isArray(r) ? r.join('–') : '0–0–0'}  (wins–losses–draws)`;
        if (q.length) rec += ` · Next up: ${nameOf(q[0])}`;
      } else if (s && place >= 0) {
        rec = place === 0 ? `${queueLabel(0)}: you play the winner.` : `${queueLabel(place)} to play.`;
      }
      if (justSwapped) rec = `${swapText(sw, api.me.id, nameOf)}${rec ? ' · ' + rec : ''}`;
      if (recEl.textContent !== rec) recEl.textContent = rec;
      again.hidden = !(s && s.winner && settled && (key || place === 0));
      const label = key ? 'Play again' : 'Play next';
      if (again.textContent !== label) again.textContent = label;
    }

    // --- drawing ---------------------------------------------------------
    function resize() {
      const r = stage.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ro = new ResizeObserver(resize);
    ro.observe(stage);
    resize();

    // Board geometry: one spare row above the grid for the ghost and the drop.
    function geo() {
      const cell = Math.max(8, Math.min(w / (COLS + 0.4), h / (ROWS + 1.5)));
      const bw = cell * COLS + cell * 0.3, bh = cell * ROWS + cell * 0.3;
      const x0 = (w - bw) / 2, y0 = Math.max(cell * 1.05, (h - bh) / 2 + cell * 0.45);
      return { cell, bw, bh, x0, y0, gx: x0 + cell * 0.15, gy: y0 + cell * 0.15 };
    }

    function disc(x, y, r, who, alpha = 1) {
      ctx.save();
      ctx.globalAlpha = alpha;
      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
      g.addColorStop(0, '#fff');
      g.addColorStop(0.25, COLOR[who]);
      g.addColorStop(1, DARK[who]);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = DARK[who];
      ctx.lineWidth = Math.max(1, r * 0.08);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = Math.max(1, r * 0.1);
      ctx.beginPath();
      ctx.arc(x, y, r * 0.62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    function render(s) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (!s) return;
      const { cell, bw, bh, x0, y0, gx, gy } = geo();
      const r = cell * 0.4;
      const t = clock();
      const key = myKey(s);
      const centre = (col, row) => [gx + (col + 0.5) * cell, gy + (row + 0.5) * cell];

      // Discs sit behind the board, so they show through its holes.
      const falling = new Map(drops.map(d => [d.cell, d]));
      for (let i = 0; i < s.board.length; i++) {
        if (s.board[i] === EMPTY || falling.has(i)) continue;
        const [x, y] = centre(i % COLS, Math.floor(i / COLS));
        disc(x, y, r, s.board[i]);
      }
      for (const d of drops) {
        const col = d.cell % COLS, row = Math.floor(d.cell / COLS);
        const [x, yEnd] = centre(col, row);
        const yStart = gy - cell * 0.5;
        const f = dropFrac(d, t - d.t0);
        disc(x, yStart + (yEnd - yStart) * f, r, d.who);
        if (!d.landed && t - d.t0 >= d.dur) {
          d.landed = true;
          api.sfx('pop');
        }
      }
      for (let i = drops.length - 1; i >= 0; i--) if (t - drops[i].t0 > drops[i].dur + 0.3) drops.splice(i, 1);

      // The blue board with round holes cut out (even-odd fill).
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x0, y0, bw, bh, cell * 0.25);
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const [x, y] = centre(col, row);
          ctx.moveTo(x + r * 1.08, y);
          ctx.arc(x, y, r * 1.08, 0, Math.PI * 2);
        }
      }
      const bg = ctx.createLinearGradient(0, y0, 0, y0 + bh);
      bg.addColorStop(0, '#5b7cff');
      bg.addColorStop(1, '#3a4fd0');
      ctx.fillStyle = bg;
      ctx.fill('evenodd');
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = Math.max(1, cell * 0.04);
      ctx.beginPath();
      ctx.roundRect(x0, y0, bw, bh, cell * 0.25);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(20,20,90,0.5)';
      ctx.lineWidth = Math.max(1, cell * 0.03);
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const [x, y] = centre(col, row);
          ctx.beginPath();
          ctx.arc(x, y, r * 1.08, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Last move marker and the winning four (once the discs have landed).
      const settled = drops.length === 0;
      if (settled && s.last >= 0 && !s.winner) {
        const [x, y] = centre(s.last % COLS, Math.floor(s.last / COLS));
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = Math.max(1.5, cell * 0.05);
        ctx.beginPath();
        ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (settled && s.winner && s.winner !== 'draw' && Array.isArray(s.line)) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 7);
        ctx.strokeStyle = `rgba(255,255,255,${0.6 + pulse * 0.4})`;
        ctx.lineWidth = Math.max(2, cell * 0.09);
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = cell * 0.3 * pulse;
        for (const i of s.line) {
          if (!Number.isInteger(i) || i < 0 || i >= COLS * ROWS) continue;
          const [x, y] = centre(i % COLS, Math.floor(i / COLS));
          ctx.beginPath();
          ctx.arc(x, y, r * 1.1, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      }

      // Ghost disc above the hovered column on my turn.
      const mine = key && !s.winner && s.turn === key && s.seats[0] && s.seats[1] && !animating();
      if (mine) {
        const col = Math.max(0, Math.min(COLS - 1, hoverCol));
        const row = dropRow(s.board, col);
        const [x] = centre(col, 0);
        const bob = Math.sin(t * 5) * cell * 0.04;
        disc(x, gy - cell * 0.5 + bob, r, key, row < 0 ? 0.2 : 0.55);
        if (row >= 0) {
          const [, yy] = centre(col, row);
          ctx.fillStyle = 'rgba(255,255,255,0.18)';
          ctx.beginPath();
          ctx.arc(x, yy, r * 0.85, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function frame() {
      if (destroyed) return;
      sync();
      const s = sharedNow();
      render(s);
      if (s && s.winner && announced !== s.game && !animating()) announce(s);
      const sig = JSON.stringify([s && s.board, s && s.winner, s && s.turn, s && s.seats, s && s.q, s && s.swap, announced, animating(), api.players().map(p => p.name)]);
      if (sig !== lastSig) {
        lastSig = sig;
        updateHead(s);
      }
      raf = requestAnimationFrame(frame);
    }

    // --- input -----------------------------------------------------------
    const colAt = e => {
      const { cell, x0 } = geo();
      return Math.max(0, Math.min(COLS - 1, Math.floor((e.offsetX - x0 - cell * 0.15) / cell)));
    };
    canvas.addEventListener('pointermove', e => {
      hoverCol = colAt(e);
    });
    canvas.addEventListener('pointerdown', e => {
      hoverCol = colAt(e);
    });
    canvas.addEventListener('pointerup', e => {
      hoverCol = colAt(e);
      drop(hoverCol);
    });

    const typing = e => /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName);
    function onKey(e) {
      if (typing(e) || !api.el.isConnected || e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[1-7]$/.test(e.key)) {
        hoverCol = Number(e.key) - 1;
        drop(hoverCol);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        hoverCol = Math.max(0, hoverCol - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        hoverCol = Math.min(COLS - 1, hoverCol + 1);
      } else if ((e.key === 'Enter' || e.key === ' ') && e.target?.tagName !== 'BUTTON') {
        e.preventDefault();
        const s = sharedNow();
        if (s && s.winner) playAgain();
        else drop(hoverCol);
      }
    }
    window.addEventListener('keydown', onKey);

    // Controller: stick / D-pad moves the cursor (one step per push), A drops.
    let padDir = 0;
    function onPad(pad) {
      const dir = pad.left || pad.x < -0.5 ? -1 : pad.right || pad.x > 0.5 ? 1 : 0;
      if (dir && dir !== padDir) hoverCol = Math.max(0, Math.min(COLS - 1, hoverCol + dir));
      padDir = dir;
      if (pad.a) {
        const s = sharedNow();
        if (s && s.winner) playAgain();
        else drop(hoverCol);
      }
    }

    ensure();
    sync();
    raf = requestAnimationFrame(frame);

    return {
      destroy() {
        destroyed = true;
        cancelAnimationFrame(raf);
        ro.disconnect();
        window.removeEventListener('keydown', onKey);
      },
      onChange() {
        ensure();
        sync();
      },
      onPad,
    };
  },
};
