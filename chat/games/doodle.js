// Doodle Guess: Pictionary. Players take turns as the drawer: pick one of
// three words (10 s, else random), then draw it in 75 s while everyone else
// types guesses. The owner is the referee and keeps the whole match in shared
// state (phase, drawer, turn, clock, scores), so a new owner can carry on.
//
//   drawer -> owner   'chosen' { len }            the word's length only
//   anyone -> all     'guess'  text               shown in a little feed
//   drawer -> all     'correct' { id }            the drawer checks guesses
//   drawer -> owner   'reveal' { word }           sent when the turn ends
//   drawer -> all     'ink' { t, s, c, w, pts }   stroke batches (~60 ms)
//                     'clear' / 'undo' / 'sync'   board edits and a full copy
//
// Only the drawer ever knows the word; guessers see underscores.

const ROUNDS = 3;
const MAX_PLAYERS = 8;
const CHOOSE_MS = 10000;
const DRAW_MS = 75000;
const REVEAL_MS = 4000;
const CHOOSE_GRACE_MS = 3000;   // owner waits this long for a missing drawer
const SHOW_DELAY_MS = 350;      // a guess shows after this unless it turns out correct
const INK_MS = 60;
const SYNC_LIMIT = 38000;       // bytes of JSON for a board sync

const PALETTE = ['#222222', '#ff4d5e', '#ff9f43', '#ffd43b', '#4fcf70', '#3fa0ff', '#9b6bff', '#ff5fa2'];
const ERASER = 8;
const WIDTHS = [0.006, 0.014, 0.03];   // pen sizes as a fraction of the board width
const PAPER = '#fffdf5';

const WORDS = `
  apple banana cherry grapes lemon orange pear strawberry watermelon pineapple carrot tomato
  potato corn pizza burger sandwich cookie cake donut cupcake icecream popcorn egg cheese
  bread pancake candy lollipop sun moon star cloud rainbow rain snowman lightning tree
  flower leaf mountain volcano island river beach ocean wave rock cactus mushroom dog cat
  fish bird horse cow pig sheep duck chicken rabbit mouse elephant giraffe lion tiger monkey
  bear zebra snake turtle frog penguin owl butterfly bee spider ant snail whale dolphin
  shark octopus crab crocodile kangaroo dinosaur dragon unicorn ghost robot alien pirate
  wizard princess knight clown ninja house castle tent bridge tower lighthouse windmill barn
  church school door window key lock clock watch lamp candle bed chair table sofa mirror
  umbrella bucket ladder broom scissors hammer pencil book envelope balloon gift crown ring
  necklace glasses hat shoe sock shirt dress mitten scarf backpack car bus train airplane
  helicopter rocket boat ship bicycle truck tractor submarine skateboard guitar piano drum
  trumpet violin microphone headphones camera phone television computer keyboard flashlight
  battery magnet soccerball basketball football tennis bowling kite yoyo puzzle dice trophy
  medal flag anchor compass map telescope parachute teapot spoon fork knife cup bottle bowl
  pan toothbrush soap towel bathtub
`.split(/\s+/);

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = v => typeof v === 'number' && Number.isFinite(v);
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

// A guess matches if it is the word, or the word with an "s" added or dropped.
function matches(guess, word) {
  const g = norm(guess), w = norm(word);
  if (!g || !w) return false;
  return g === w || g === w + 's' || g + 's' === w;
}

function pick3() {
  const out = [];
  while (out.length < 3) {
    const w = WORDS[Math.floor(Math.random() * WORDS.length)];
    if (!out.includes(w)) out.push(w);
  }
  return out;
}

// Shared state as the owner published it, or null when missing or broken.
function parseShared(sh) {
  if (!sh || !['choose', 'draw', 'reveal', 'lobby'].includes(sh.phase)) return null;
  const scores = {};
  if (sh.scores && typeof sh.scores === 'object') {
    for (const [k, v] of Object.entries(sh.scores)) if (num(v)) scores[k] = v;
  }
  return {
    phase: sh.phase,
    drawer: typeof sh.drawer === 'string' ? sh.drawer : '',
    wordLen: num(sh.wordLen) ? clamp(sh.wordLen | 0, 0, 30) : 0,
    round: num(sh.round) ? sh.round | 0 : 0,
    turn: num(sh.turn) ? sh.turn | 0 : 0,
    base: num(sh.base) ? sh.base | 0 : 0,
    endsAt: num(sh.endsAt) ? sh.endsAt : 0,
    scores,
    guessed: Array.isArray(sh.guessed) ? sh.guessed.filter(x => typeof x === 'string') : [],
    order: Array.isArray(sh.order) ? sh.order.filter(x => typeof x === 'string').slice(0, MAX_PLAYERS) : [],
    word: typeof sh.word === 'string' ? sh.word.slice(0, 30) : '',
    final: !!sh.final,
  };
}

// Seats friends who join mid-game in the drawing order. Turn t draws
// order[(t - base) % order.length], so the schedule is re-based to keep the
// current drawer and round: newcomers draw at the end of this round and in
// every later one. Returns the patch for the shared state, or null.
function addLateDrawers(s, ids, max = MAX_PLAYERS) {
  if (!s || s.phase === 'lobby' || !s.order.length) return null;
  const fresh = ids.filter(id => !s.order.includes(id)).slice(0, Math.max(0, max - s.order.length));
  if (!fresh.length) return null;
  const k = s.turn - s.base, n = s.order.length;
  if (k < 0 || k >= n * ROUNDS) return null;
  const r = Math.floor(k / n), pos = k % n;
  const order = [...s.order, ...fresh];
  const scores = { ...s.scores };
  fresh.forEach(id => { scores[id] = scores[id] || 0; });
  return { order, scores, base: s.turn - (r * order.length + pos) };
}

// Who draws turn t, and in which round (pure, for the tests).
function drawerAt(s, turn) {
  const n = s.order.length, k = turn - s.base;
  return { drawer: s.order[k % n], round: Math.floor(k / n) + 1, last: k >= n * ROUNDS };
}

// Validates a stroke from the network: palette index, size index, 0..1 points.
function cleanStroke(d) {
  if (!d || !num(d.s) || !Number.isInteger(d.c) || d.c < 0 || d.c > ERASER || !Number.isInteger(d.w) || d.w < 0 || d.w > 2) return null;
  if (!Array.isArray(d.pts) || d.pts.length > 600 || d.pts.length % 2) return null;
  if (!d.pts.every(num)) return null;
  return { s: d.s, c: d.c, w: d.w, pts: d.pts.map(v => clamp(v, 0, 1)) };
}

function drawStroke(ctx, st, bw, bh) {
  const lw = Math.max(1.5, WIDTHS[st.w] * bw * (st.c === ERASER ? 2.2 : 1));
  const color = st.c === ERASER ? PAPER : PALETTE[st.c];
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const p = st.pts;
  if (p.length === 2) {
    ctx.beginPath();
    ctx.arc(p[0] * bw, p[1] * bh, lw / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(p[0] * bw, p[1] * bh);
  for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i] * bw, p[i + 1] * bh);
  ctx.stroke();
}

// Shrinks a board to fit a message: thin the points, then drop the oldest strokes.
function packStrokes(strokes) {
  let list = strokes.map(s => ({ s: s.s, c: s.c, w: s.w, pts: s.pts.slice() }));
  const size = () => JSON.stringify(list).length;
  while (size() > SYNC_LIMIT && list.length) {
    let thinned = false;
    for (const st of list) {
      if (st.pts.length <= 8) continue;
      const out = [];
      for (let i = 0; i < st.pts.length; i += 4) out.push(st.pts[i], st.pts[i + 1]);
      out.push(st.pts[st.pts.length - 2], st.pts[st.pts.length - 1]);
      st.pts = out;
      thinned = true;
    }
    if (!thinned) list.shift();
  }
  return list;
}

const CSS = `
.dd { position: absolute; inset: 0; display: flex; flex-direction: column; gap: 6px; padding: 8px; font-family: var(--font); color: var(--ink); min-height: 0; }
.dd [hidden] { display: none !important; }
.dd-head { display: flex; align-items: center; gap: 8px; font-weight: 900; }
.dd-info { font-size: 12px; color: var(--muted); white-space: nowrap; }
.dd-word { flex: 1; min-width: 0; text-align: center; font-size: clamp(15px, 3.4vw, 26px); letter-spacing: 0.16em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dd-time { min-width: 34px; text-align: right; font-variant-numeric: tabular-nums; }
.dd-bar { height: 6px; border-radius: 3px; background: rgba(255,255,255,0.14); overflow: hidden; flex: none; }
.dd-bar > i { display: block; height: 100%; width: 100%; background: var(--aqua); transform-origin: left; }
.dd-main { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 6px; }
.dd.wide .dd-main { flex-direction: row; }
.dd-left { flex: 1; min-height: 0; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.dd-stage { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; }
.dd-stage canvas { background: ${PAPER}; border-radius: 10px; box-shadow: 0 4px 14px rgba(0,0,0,0.4); touch-action: none; }
.dd-tools { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; justify-content: center; }
.dd-sw { width: 24px; height: 24px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.45); padding: 0; cursor: pointer; }
.dd-sw.on { border-color: #fff; box-shadow: 0 0 0 2px var(--pink); }
.dd-tb { min-width: 30px; height: 26px; padding: 0 9px; border-radius: 13px; border: 1px solid var(--line); background: rgba(255,255,255,0.08); color: var(--ink); font: 800 12px var(--font); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.dd-tb.on { background: var(--pink); border-color: var(--pink); color: #fff; }
.dd-dot { display: block; border-radius: 50%; background: currentColor; }
.dd-side { display: flex; flex-direction: column; gap: 6px; min-height: 0; }
.dd.wide .dd-side { width: 250px; flex: none; }
.dd-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.dd.wide .dd-chips { flex-direction: column; flex-wrap: nowrap; }
.dd-chip { display: flex; gap: 6px; align-items: center; padding: 2px 9px; border-radius: 999px; background: rgba(255,255,255,0.1); border-left: 5px solid var(--pink); font-size: 12px; font-weight: 800; white-space: nowrap; }
.dd-chip b { margin-left: auto; font-variant-numeric: tabular-nums; }
.dd-chip.done { background: rgba(63,224,208,0.22); }
.dd-feed { flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end; font-size: 12px; line-height: 1.35; }
.dd:not(.wide) .dd-feed { flex: none; max-height: 48px; }
.dd-line b { font-weight: 900; }
.dd-line.ok { color: var(--aqua); font-weight: 900; }
.dd-guess { display: flex; gap: 6px; }
.dd-guess input { flex: 1; min-width: 0; height: 32px; border-radius: 16px; border: 1px solid var(--line); background: rgba(255,255,255,0.1); color: var(--ink); padding: 0 12px; font: 700 14px var(--font); }
.dd-guess .btn { height: 32px; padding: 0 14px; }
.dd-card { z-index: 5; background: rgba(20,10,40,0.72); }
.dd-card .dd-pick { font-size: 1.1rem; padding: 10px 18px; }
.dd-card .dd-rank { display: flex; flex-direction: column; gap: 4px; min-width: 200px; max-height: 45%; overflow: auto; font-weight: 800; }
.dd-card .dd-rank div { display: flex; gap: 10px; padding: 3px 12px; border-radius: 10px; background: rgba(255,255,255,0.1); }
.dd-card .dd-rank b { margin-left: auto; }
.dd-card .dd-word-big { font-size: clamp(1.8rem, 6vw, 3rem); font-weight: 900; letter-spacing: 0.1em; color: var(--sun); }
`;

export default {
  id: 'doodle',
  name: 'Doodle Guess',
  emoji: '✏️',
  blurb: 'Take turns drawing a word while friends guess it.',
  minPlayers: 2,
  maxPlayers: 8,
  needsFace: false,

  create(api) {
    // --- DOM ---------------------------------------------------------------
    const style = document.createElement('style');
    style.textContent = CSS;
    const root = document.createElement('div');
    root.className = 'dd';
    const mk = (tag, cls, text, parent) => {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;
      if (parent) parent.append(e);
      return e;
    };
    const head = mk('div', 'dd-head', null, root);
    const infoEl = mk('div', 'dd-info', '', head);
    const wordEl = mk('div', 'dd-word', '', head);
    const timeEl = mk('div', 'dd-time', '', head);
    const bar = mk('div', 'dd-bar', null, root);
    const barFill = mk('i', '', null, bar);
    const main = mk('div', 'dd-main', null, root);
    const left = mk('div', 'dd-left', null, main);
    const stage = mk('div', 'dd-stage', null, left);
    const board = mk('canvas', '', null, stage);
    const bctx = board.getContext('2d');
    const tools = mk('div', 'dd-tools', null, left);
    const side = mk('div', 'dd-side', null, main);
    const chips = mk('div', 'dd-chips', null, side);
    const feedEl = mk('div', 'dd-feed', null, side);
    const guessRow = mk('form', 'dd-guess', null, side);
    const input = mk('input', '', null, guessRow);
    input.maxLength = 40;
    input.placeholder = 'Type your guess…';
    input.autocomplete = 'off';
    const guessBtn = mk('button', 'btn', 'Guess', guessRow);
    guessBtn.type = 'submit';
    const card = mk('div', 'g-center dd-card', null, root);
    api.el.append(style, root);

    // Drawing tools (drawer only).
    let colour = 0, size = 1;
    const swatches = PALETTE.map((c, i) => {
      const b = mk('button', 'dd-sw', null, tools);
      b.style.background = c;
      b.title = 'Colour';
      b.addEventListener('click', () => { colour = i; api.sfx('click'); syncTools(); });
      return b;
    });
    const sizeBtns = WIDTHS.map((_, i) => {
      const b = mk('button', 'dd-tb', null, tools);
      const dot = mk('span', 'dd-dot', null, b);
      dot.style.width = dot.style.height = `${5 + i * 4}px`;
      b.title = 'Pen size';
      b.addEventListener('click', () => { size = i; api.sfx('click'); syncTools(); });
      return b;
    });
    const eraserBtn = mk('button', 'dd-tb', 'Eraser', tools);
    eraserBtn.addEventListener('click', () => { colour = ERASER; api.sfx('click'); syncTools(); });
    const undoBtn = mk('button', 'dd-tb', 'Undo', tools);
    const clearBtn = mk('button', 'dd-tb', 'Clear', tools);
    function syncTools() {
      swatches.forEach((b, i) => b.classList.toggle('on', colour === i));
      sizeBtns.forEach((b, i) => b.classList.toggle('on', size === i));
      eraserBtn.classList.toggle('on', colour === ERASER);
    }
    syncTools();

    // --- state -------------------------------------------------------------
    const me = api.me;
    let strokes = [];            // the board: { s, c, w, pts: [x, y, ...] }
    let boardTurn = -1;          // turn the board belongs to
    let dirty = true;
    let bw = 0, bh = 0, dpr = 1;
    let cur = null;              // my stroke being drawn
    let pendingPts = [];         // points not yet sent
    let strokeNo = 0;
    let myWord = '';             // the word I am drawing (drawer only)
    let myWordTurn = -1;
    let choices = [];            // my three words
    let choicesTurn = -1;
    let revealSentTurn = -1;
    const solvedSent = new Set(); // guessers I already confirmed this turn
    let feed = [];               // { name, color, text, kind }
    const pending = [];          // guesses waiting to show { from, name, color, text, at }
    const knownIds = new Set(api.players().map(p => p.id));
    let lastRender = '';
    let lastChips = '';
    let lastCard = '';
    let seatSeen = null;         // [phase, in the drawing order] at the last refresh
    let lastFeed = '';
    let lastFinal = -1;
    let sec = -1;
    let raf = 0, tickTimer = 0, inkTimer = 0;

    const S = () => parseShared(api.shared());
    const present = id => api.players().some(p => p.id === id);
    const eligible = () => api.players().slice(0, MAX_PLAYERS);
    const nameOf = id => api.players().find(p => p.id === id)?.name || 'Someone';
    const colorOf = id => api.players().find(p => p.id === id)?.color || '#fff';

    // --- owner: referee ------------------------------------------------------
    function setS(patch) {
      const base = S() || { phase: 'lobby', drawer: '', wordLen: 0, round: 0, turn: 0, endsAt: 0, scores: {}, guessed: [], order: [], final: false, base: 0 };
      const next = { ...base, ...patch };
      if (!next.word) delete next.word;
      api.setShared(next);
    }

    function startGame() {
      const ids = eligible().map(p => p.id);
      if (ids.length < 2) return;
      const scores = {};
      ids.forEach(id => { scores[id] = 0; });
      const base = (S()?.turn ?? 0) + 1;   // turn numbers keep growing across games
      setS({ order: ids, scores, final: false, base });
      startTurn(base);
    }

    function startTurn(turn) {
      const s = S();
      const order = s.order;
      const total = s.base + order.length * ROUNDS;
      while (turn < total && !present(order[(turn - s.base) % order.length])) turn++;
      if (turn >= total) {
        setS({ phase: 'lobby', final: true, drawer: '', wordLen: 0, endsAt: 0, word: '', guessed: [] });
        return;
      }
      setS({ phase: 'choose', drawer: order[(turn - s.base) % order.length], wordLen: 0, round: Math.floor((turn - s.base) / order.length) + 1, turn, endsAt: Date.now() + CHOOSE_MS, guessed: [], word: '', final: false });
    }

    function endDraw() {
      setS({ phase: 'reveal', endsAt: Date.now() + REVEAL_MS });
    }

    // The drawer picked: the draw clock starts.
    function onChosen(len, from) {
      const s = S();
      if (!s || s.phase !== 'choose' || from !== s.drawer || !Number.isInteger(len) || len < 1 || len > 24) return;
      setS({ phase: 'draw', wordLen: len, endsAt: Date.now() + DRAW_MS, guessed: [] });
    }

    // The drawer says someone guessed right: award points.
    function award(id) {
      const s = S();
      if (!s || s.phase !== 'draw' || id === s.drawer || s.guessed.includes(id)) return;
      if (!eligible().some(p => p.id === id)) return;
      const frac = clamp((s.endsAt - Date.now()) / DRAW_MS, 0, 1);
      const scores = { ...s.scores };
      scores[id] = (scores[id] || 0) + 60 + Math.round(140 * frac);
      scores[s.drawer] = (scores[s.drawer] || 0) + 50;
      setS({ scores, guessed: [...s.guessed, id] });
    }

    // Runs on the owner only; everything it needs is in shared state.
    function refereeTick() {
      if (!api.isOwner()) return;
      const s = S();
      if (!s) return setS({});
      const now = Date.now();
      if (s.phase === 'lobby') return;
      if (api.players().length < 2) {
        setS({ phase: 'lobby', final: false, drawer: '', wordLen: 0, endsAt: 0, word: '', guessed: [] });
        return;
      }
      // Friends who join mid-game guess at once and draw at the end of this round.
      const late = addLateDrawers(s, eligible().map(p => p.id));
      if (late) { setS(late); return; }
      if (s.phase === 'choose') {
        if (now > s.endsAt + CHOOSE_GRACE_MS || !present(s.drawer)) startTurn(s.turn + 1);
      } else if (s.phase === 'draw') {
        const guessers = eligible().filter(p => p.id !== s.drawer);
        const all = guessers.length > 0 && guessers.every(p => s.guessed.includes(p.id));
        if (now >= s.endsAt || all || !present(s.drawer)) endDraw();
      } else if (s.phase === 'reveal') {
        if (now >= s.endsAt) startTurn(s.turn + 1);
      }
    }

    // --- drawer: word and guesses -------------------------------------------
    function chooseWord(word) {
      const s = S();
      if (!s || s.phase !== 'choose' || s.drawer !== me.id || myWordTurn === s.turn) return;
      myWord = word;
      myWordTurn = s.turn;
      api.sfx('pop');
      if (api.isOwner()) onChosen(norm(word).length, me.id);
      else api.send('chosen', { len: norm(word).length });
    }

    function drawerTick() {
      const s = S();
      if (!s || s.drawer !== me.id) return;
      if (s.phase === 'choose') {
        if (choicesTurn !== s.turn) {
          choicesTurn = s.turn;
          choices = pick3();
          solvedSent.clear();
        }
        // Out of time: take a random one.
        if (myWordTurn !== s.turn && Date.now() >= s.endsAt) chooseWord(choices[Math.floor(Math.random() * 3)]);
      } else if (s.phase === 'reveal' && myWordTurn === s.turn && revealSentTurn !== s.turn) {
        revealSentTurn = s.turn;
        if (api.isOwner()) setS({ word: myWord });
        else api.send('reveal', { word: myWord });
      }
    }

    function showGuess(from, text) {
      const p = api.players().find(x => x.id === from);
      pending.push({ from, name: p?.name || 'Someone', color: p?.color || '#fff', text, at: performance.now() + SHOW_DELAY_MS });
    }

    function addFeed(entry) {
      feed.push(entry);
      if (feed.length > 30) feed.shift();
    }

    // The drawer checks a guess. Wrong ones go straight to the feed.
    function checkGuess(from, text) {
      const s = S();
      if (!s || s.phase !== 'draw' || s.drawer !== me.id || !myWord || from === me.id) return;
      if (!eligible().some(p => p.id === from) || s.guessed.includes(from)) return;
      if (matches(text, myWord)) {
        if (solvedSent.has(from)) return;
        solvedSent.add(from);
        api.send('correct', { id: from });
        applyCorrect(from);
      } else {
        const p = api.players().find(x => x.id === from);
        addFeed({ name: p?.name || 'Someone', color: p?.color || '#fff', text, kind: 'guess' });
      }
    }

    // Everyone: a correct guess is never shown as text.
    function applyCorrect(id) {
      for (let i = pending.length - 1; i >= 0; i--) if (pending[i].from === id) pending.splice(i, 1);
      addFeed({ name: nameOf(id), color: colorOf(id), text: `${nameOf(id)} guessed it!`, kind: 'ok' });
      api.sfx(id === me.id ? 'win' : 'score');
      if (api.isOwner()) award(id);
    }

    function sendGuess(text) {
      text = String(text).trim().slice(0, 40);
      const s = S();
      if (!text || !s || s.phase !== 'draw' || s.drawer === me.id) return;
      if (!eligible().some(p => p.id === me.id) || s.guessed.includes(me.id)) return;
      showGuess(me.id, text);
      api.send('guess', text);
    }
    guessRow.addEventListener('submit', e => {
      e.preventDefault();
      sendGuess(input.value);
      input.value = '';
    });

    // --- board ---------------------------------------------------------------
    function resizeBoard() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = stage.clientWidth, H = stage.clientHeight;
      bw = Math.max(60, Math.floor(Math.min(W, (H * 4) / 3)));
      bh = Math.floor((bw * 3) / 4);
      board.style.width = `${bw}px`;
      board.style.height = `${bh}px`;
      board.width = Math.round(bw * dpr);
      board.height = Math.round(bh * dpr);
      root.classList.toggle('wide', root.clientWidth >= 720 && root.clientWidth > root.clientHeight * 1.15);
      dirty = true;
    }
    const ro = new ResizeObserver(resizeBoard);
    ro.observe(root);
    ro.observe(stage);

    function redraw() {
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bctx.fillStyle = PAPER;
      bctx.fillRect(0, 0, bw, bh);
      for (const st of strokes) drawStroke(bctx, st, bw, bh);
    }

    // Each turn starts with an empty board. Messages carry the turn so a late
    // arrival never mixes two drawings.
    function boardFor(turn) {
      if (turn < boardTurn) return false;
      if (turn > boardTurn) {
        boardTurn = turn;
        strokes = [];
        cur = null;
        pendingPts = [];
        dirty = true;
      }
      return true;
    }

    function amDrawing() {
      const s = S();
      return !!s && s.phase === 'draw' && s.drawer === me.id;
    }

    function flushInk() {
      if (!cur || !pendingPts.length) return;
      const s = S();
      for (let i = 0; i < pendingPts.length; i += 400) {
        api.send('ink', { t: s ? s.turn : 0, s: cur.s, c: cur.c, w: cur.w, pts: pendingPts.slice(i, i + 400) });
      }
      pendingPts = [];
    }

    function boardPoint(e) {
      const r = board.getBoundingClientRect();
      return [Math.round(clamp((e.clientX - r.left) / r.width, 0, 1) * 1000) / 1000, Math.round(clamp((e.clientY - r.top) / r.height, 0, 1) * 1000) / 1000];
    }
    board.addEventListener('pointerdown', e => {
      if (!amDrawing()) return;
      board.setPointerCapture?.(e.pointerId);
      const s = S();
      boardFor(s.turn);
      const [x, y] = boardPoint(e);
      cur = { s: ++strokeNo, c: colour, w: size, pts: [x, y] };
      strokes.push(cur);
      if (strokes.length > 400) strokes.shift();
      pendingPts = [x, y];
      dirty = true;
    });
    board.addEventListener('pointermove', e => {
      if (!cur) return;
      const [x, y] = boardPoint(e);
      const n = cur.pts.length;
      if (Math.hypot(x - cur.pts[n - 2], y - cur.pts[n - 1]) < 0.002 || n > 8000) return;
      cur.pts.push(x, y);
      pendingPts.push(x, y);
      dirty = true;
    });
    const endStroke = () => {
      if (!cur) return;
      flushInk();
      cur = null;
    };
    board.addEventListener('pointerup', endStroke);
    board.addEventListener('pointercancel', endStroke);
    inkTimer = setInterval(flushInk, INK_MS);

    undoBtn.addEventListener('click', () => {
      if (!amDrawing()) return;
      endStroke();
      strokes.pop();
      dirty = true;
      api.send('undo', { t: S().turn });
    });
    clearBtn.addEventListener('click', () => {
      if (!amDrawing()) return;
      endStroke();
      strokes = [];
      dirty = true;
      api.send('clear', { t: S().turn });
    });

    // A message about the board: accepted from the drawer of that turn.
    function fromDrawer(from, t) {
      const s = S();
      if (!s || !num(t) || !api.players().some(p => p.id === from)) return false;
      if (t === s.turn && from !== s.drawer) return false;
      return boardFor(t);
    }

    // --- network -------------------------------------------------------------
    api.on('chosen', (d, from) => onChosen(d?.len, from));
    api.on('reveal', (d, from) => {
      const s = S();
      if (!api.isOwner() || !s || s.phase !== 'reveal' || from !== s.drawer || typeof d?.word !== 'string') return;
      const word = d.word.replace(/[^A-Za-z ]/g, '').slice(0, 30);
      if (word) setS({ word });
    });
    api.on('guess', (text, from) => {
      if (typeof text !== 'string') return;
      text = text.trim().slice(0, 40);
      if (!text) return;
      if (!api.players().some(p => p.id === from)) return;
      // The drawer checks it (and lists wrong ones at once); everyone else shows it shortly.
      if (amDrawing()) checkGuess(from, text);
      else showGuess(from, text);
    });
    api.on('correct', (d, from) => {
      const s = S();
      if (!s || from !== s.drawer || typeof d?.id !== 'string') return;
      applyCorrect(d.id);
    });
    api.on('ink', (d, from) => {
      if (!d || !fromDrawer(from, d.t)) return;
      const st = cleanStroke(d);
      if (!st) return;
      const same = strokes.find(x => x.s === st.s);
      if (same) {
        if (same.pts.length + st.pts.length <= 8000) same.pts.push(...st.pts);
      } else {
        strokes.push(st);
        if (strokes.length > 400) strokes.shift();
      }
      dirty = true;
    });
    api.on('undo', (d, from) => {
      if (!d || !fromDrawer(from, d.t)) return;
      strokes.pop();
      dirty = true;
    });
    api.on('clear', (d, from) => {
      if (!d || !fromDrawer(from, d.t)) return;
      strokes = [];
      dirty = true;
    });
    api.on('sync', (d, from) => {
      if (!d || !Array.isArray(d.strokes) || !fromDrawer(from, d.t)) return;
      const list = d.strokes.slice(-400).map(cleanStroke).filter(Boolean);
      strokes = list;
      dirty = true;
    });
    api.on('start', (_, from) => {
      const i = api.players().findIndex(p => p.id === from);
      const s = S();
      if (api.isOwner() && i >= 0 && s && s.phase === 'lobby') startGame();
    });

    // A new player appears: the drawer sends the board so far.
    function syncNewcomers() {
      const ids = api.players().map(p => p.id);
      const fresh = ids.filter(id => !knownIds.has(id));
      knownIds.clear();
      ids.forEach(id => knownIds.add(id));
      if (fresh.length && amDrawing() && strokes.length) {
        api.send('sync', { t: S().turn, strokes: packStrokes(strokes) });
      }
    }

    // --- UI refresh ------------------------------------------------------------
    function rebuildChips(s) {
      chips.textContent = '';
      for (const p of api.players().slice(0, MAX_PLAYERS)) {
        const c = mk('div', 'dd-chip' + (s && s.guessed.includes(p.id) ? ' done' : ''), null, chips);
        c.style.borderLeftColor = p.color || '#ff5fa2';
        mk('span', '', `${s && s.phase !== 'lobby' && s.drawer === p.id ? '✏️ ' : ''}${s && s.guessed.includes(p.id) ? '✓ ' : ''}${p.name}${p.me ? ' (you)' : ''}`, c);
        mk('b', '', String(s ? s.scores[p.id] || 0 : 0), c);
      }
    }

    function rebuildFeed() {
      feedEl.textContent = '';
      for (const f of feed.slice(-8)) {
        const l = mk('div', 'dd-line' + (f.kind === 'ok' ? ' ok' : ''), null, feedEl);
        if (f.kind === 'ok') l.textContent = f.text;
        else {
          const b = mk('b', '', `${f.name}: `, l);
          b.style.color = f.color;
          mk('span', '', f.text, l);
        }
      }
    }

    function rankList(s, parent) {
      const list = mk('div', 'dd-rank', null, parent);
      const rows = api.players().slice(0, MAX_PLAYERS).map(p => ({ p, pts: s.scores[p.id] || 0 })).sort((a, b) => b.pts - a.pts);
      rows.forEach((r, i) => {
        const row = mk('div', '', null, list);
        mk('span', '', `${i + 1}. ${r.p.name}`, row).style.color = r.p.color || '#fff';
        mk('b', '', String(r.pts), row);
      });
      return rows;
    }

    function buildCard(s, key) {
      card.textContent = '';
      card.hidden = false;
      const two = api.players().length >= 2;
      if (s.phase === 'lobby') {
        if (s.final) {
          mk('div', 'g-big', 'Final scores', card);
          const rows = rankList(s, card);
          if (lastFinal !== s.turn + 1000 * s.order.length) {
            lastFinal = s.turn + 1000 * s.order.length;
            if (rows[0] && rows[0].p.me) {
              api.store.set('wins', api.store.get('wins', 0) + 1);
              api.sfx('win');
            } else api.sfx('lose');
          }
          mk('div', '', `Your wins: ${api.store.get('wins', 0)}`, card).style.color = 'var(--muted)';
        } else mk('div', 'g-big', 'Doodle Guess', card);
        if (!two) mk('div', '', 'Waiting for a friend to join…', card);
        else {
          if (!s.final) mk('div', '', 'Take turns drawing; guess the word fast for more points.', card).style.color = 'var(--muted)';
          const b = mk('button', 'btn aqua', s.final ? 'Play again' : 'Start game', card);
          b.addEventListener('click', () => (api.isOwner() ? startGame() : api.send('start', {})));
        }
      } else if (s.phase === 'choose') {
        if (s.drawer === me.id) {
          mk('div', 'g-big', 'Pick a word to draw', card);
          const row = mk('div', 'g-row', null, card);
          for (const w of choices) {
            const b = mk('button', 'btn dd-pick', w, row);
            b.addEventListener('click', () => chooseWord(w));
          }
        } else {
          mk('div', 'g-big', `${nameOf(s.drawer)} is choosing a word…`, card);
        }
      } else if (s.phase === 'reveal') {
        mk('div', '', 'The word was', card);
        mk('div', 'dd-word-big', (s.word || '???').toUpperCase(), card);
        mk('div', '', `${s.guessed.length} guessed it`, card).style.color = 'var(--muted)';
      }
      lastCard = key;
    }

    function refresh() {
      const s = S();
      const now = Date.now();
      // Pending guesses become visible unless a 'correct' removed them.
      const t = performance.now();
      for (let i = 0; i < pending.length; i++) {
        if (pending[i].at <= t) {
          const g = pending.splice(i--, 1)[0];
          addFeed({ name: g.name, color: g.color, text: g.text, kind: 'guess' });
        }
      }
      if (!s) {
        card.hidden = false;
        card.textContent = 'Starting…';
        return;
      }
      boardFor(s.turn);
      // Joined mid-game and just added to the drawing order: say when I draw.
      const seated = s.order.includes(me.id);
      if (seatSeen && seatSeen[0] !== 'lobby' && s.phase !== 'lobby' && !seatSeen[1] && seated) {
        api.toast?.(`You're in! You draw at the end of round ${s.round}`);
      }
      seatSeen = [s.phase, seated];

      // Header.
      const drawing = s.phase === 'draw' && s.drawer === me.id;
      let info = '';
      if (s.phase !== 'lobby') info = `Round ${s.round}/${ROUNDS}`;
      if (info !== infoEl.textContent) infoEl.textContent = info;
      let wtext = '';
      if (s.phase === 'draw' || s.phase === 'reveal') {
        if (s.drawer === me.id && myWordTurn === s.turn) wtext = myWord.toUpperCase();
        else if (s.phase === 'reveal' && s.word) wtext = s.word.toUpperCase();
        else wtext = Array(s.wordLen).fill('_').join(' ');
      } else if (s.phase === 'choose') wtext = s.drawer === me.id ? 'Choose a word' : '';
      if (wtext !== wordEl.textContent) wordEl.textContent = wtext;
      const total = s.phase === 'draw' ? DRAW_MS : s.phase === 'reveal' ? REVEAL_MS : CHOOSE_MS;
      const left = s.phase === 'lobby' ? 0 : Math.max(0, s.endsAt - now);
      const sc = Math.ceil(left / 1000);
      if (sc !== sec) {
        sec = sc;
        timeEl.textContent = s.phase === 'lobby' ? '' : String(sc);
        if (s.phase === 'draw' && sc > 0 && sc <= 5) api.sfx('tick');
      }
      barFill.style.transform = `scaleX(${s.phase === 'lobby' ? 0 : clamp(left / total, 0, 1)})`;
      barFill.style.background = left < 10000 && s.phase === 'draw' ? 'var(--danger)' : 'var(--aqua)';

      // Chips, feed, card, tools, guess box.
      const chipSig = JSON.stringify([api.players().map(p => [p.id, p.name]), s.scores, s.guessed, s.drawer, s.phase]);
      if (chipSig !== lastChips) {
        lastChips = chipSig;
        rebuildChips(s);
      }
      const feedSig = feed.length + ':' + (feed[feed.length - 1]?.text || '');
      if (feedSig !== lastFeed) {
        lastFeed = feedSig;
        rebuildFeed();
      }
      const cardKey = JSON.stringify([s.phase, s.drawer, s.turn, s.word, s.final, api.players().length >= 2, api.isOwner(), s.phase === 'choose' ? choices : 0, s.phase === 'lobby' ? s.scores : 0]);
      if (s.phase === 'draw') card.hidden = true;
      else if (cardKey !== lastCard) buildCard(s, cardKey);
      tools.hidden = !drawing;
      const iAmGuesser = s.phase === 'draw' && s.drawer !== me.id && eligible().some(p => p.id === me.id);
      const solved = s.guessed.includes(me.id);
      guessRow.hidden = !iAmGuesser;
      input.disabled = solved;
      guessBtn.disabled = solved;
      const ph = solved ? 'You got it!' : 'Type your guess…';
      if (input.placeholder !== ph) input.placeholder = ph;
      board.style.cursor = drawing ? 'crosshair' : 'default';
    }

    function frame() {
      if (dirty) {
        dirty = false;
        redraw();
      }
      refresh();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    // Referee and drawer logic runs on a timer so it does not depend on drawing.
    tickTimer = setInterval(() => {
      refereeTick();
      drawerTick();
    }, 200);

    // First owner creates the lobby.
    if (api.isOwner() && !S()) setS({});

    return {
      destroy() {
        cancelAnimationFrame(raf);
        clearInterval(tickTimer);
        clearInterval(inkTimer);
        ro.disconnect();
      },
      onChange() {
        if (api.isOwner() && !S()) setS({});
        syncNewcomers();
        drawerTick();
      },
    };
  },
};

// Exposed for tests.
export const _doodle = { addLateDrawers, drawerAt, ROUNDS };
