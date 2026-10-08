// Trivia: a quiz-show party game. The owner runs the show from shared state:
// everyone votes for a category, then ten questions follow, each open for up
// to 15 seconds. Correct answers score up to 1000 points, more for answering
// faster. After each question the right answer, who picked what and the
// points gained are revealed with a mini leaderboard, and a podium closes the
// round. All round state lives in shared state, so a new owner simply carries
// on. Answers are shuffled with a seeded shuffle, so everyone sees the same
// order without it being sent.

import { QUESTIONS, CATEGORIES } from './data/trivia-questions.js';

const MAX_PLAYERS = 8;
const PER_ROUND = 10;
const QTIME = 15000;       // ms a question stays open
const GRACE = 400;         // ms of slack for answers still travelling at the deadline
const VOTE_TIME = 12000;   // ms the category vote stays open
const REVEAL_TIME = 5500;  // ms the answer and leaderboard show
const MAX_POINTS = 1000;
const MIN_POINTS = 500;
const SEEN_KEEP = 120;     // recent questions remembered so Play again does not repeat them
const PHASES = ['vote', 'question', 'reveal', 'final'];
const COLORS = ['#ff5fa2', '#3fe0d0', '#ffd43b', '#a77bff'];
const SHAPES = ['▲', '◆', '●', '■'];
const CAT_EMOJI = {
  Animals: '🐾', Space: '🚀', Food: '🍕', Geography: '🌍', 'Movies & TV': '🎬', Music: '🎵',
  Sports: '⚽', Science: '🔬', History: '🏛️', Tech: '💻', Nature: '🌳', Words: '🔤', Mixed: '🎲',
};

const CSS = `
.tv { position: absolute; inset: 0; display: flex; flex-direction: column; --fs: 1; font-size: calc(1rem * var(--fs)); }
.tv.tight { --fs: 0.8; }
.tv.roomy { --fs: 1.2; }
.tv-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 12px 2px; font-weight: 900; }
.tv-top .meta { color: var(--muted); font-size: 0.85em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tv-top .score { color: var(--sun); white-space: nowrap; }
.tv-bar { position: relative; margin: 2px 12px 4px; height: 12px; border-radius: 999px; background: rgba(0,0,0,0.35); overflow: hidden; flex: none; }
.tv-bar i { position: absolute; left: 0; top: 0; bottom: 0; width: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--aqua), var(--sun)); transform-origin: left; }
.tv-bar.low i { background: linear-gradient(90deg, var(--danger), var(--sun)); }
.tv-bar.off i { opacity: 0.25; }
.tv-main { position: relative; flex: 1; min-height: 0; overflow: auto; display: flex; flex-direction: column; align-items: stretch; gap: 8px; padding: 4px 12px 12px; }
.tv-q { flex: none; margin: 2px auto 0; max-width: 46em; text-align: center; font-weight: 900; font-size: 1.35em; line-height: 1.25; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
.tv-sub { text-align: center; color: var(--muted); font-weight: 800; min-height: 1.3em; }
.tv-sub b { color: var(--sun); }
.tv-ans { flex: 1 0 auto; display: grid; gap: 8px; grid-template-columns: 1fr; grid-auto-rows: minmax(2.6em, 1fr); width: 100%; max-width: 54em; margin: 0 auto; }
.tv-ans.two { grid-template-columns: 1fr 1fr; }
.tv-a { position: relative; display: flex; align-items: center; gap: 10px; min-width: 0; padding: 8px 12px; border: 3px solid rgba(255,255,255,0.85); border-radius: 16px; color: #1b1030; font: inherit; font-weight: 900; font-size: 1.05em; text-align: left; cursor: pointer; background: var(--c); box-shadow: 0 4px 0 rgba(0,0,0,0.35), 0 8px 14px rgba(0,0,0,0.25); transition: transform 0.12s, opacity 0.2s, filter 0.2s; }
.tv-a:hover:not(:disabled) { transform: translateY(-2px); }
.tv-a:active:not(:disabled) { transform: translateY(2px); box-shadow: 0 1px 0 rgba(0,0,0,0.35); }
.tv-a:disabled { cursor: default; }
.tv-a .key { flex: none; display: grid; place-items: center; width: 1.9em; height: 1.9em; border-radius: 50%; background: rgba(255,255,255,0.85); font-size: 0.95em; }
.tv-a .txt { flex: 1; min-width: 0; line-height: 1.2; overflow-wrap: anywhere; }
.tv-a .who { flex: none; display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 3px; max-width: 45%; }
.tv-a.mine { outline: 4px solid #fff; outline-offset: 2px; }
.tv-a.dim { opacity: 0.4; filter: saturate(0.5); }
.tv-a.right { background: #5bdc6f; animation: tv-pop 0.5s ease-out; }
.tv-a.wrong { background: #6a5a8e; color: #fff; opacity: 0.6; }
.tv-a.padfocus { outline: 4px solid var(--focus); outline-offset: 3px; }
.tv-a .gain { flex: none; font-size: 0.85em; background: rgba(0,0,0,0.35); color: #fff; border-radius: 999px; padding: 1px 8px; }
@keyframes tv-pop { 0% { transform: scale(0.94); } 60% { transform: scale(1.04); } 100% { transform: scale(1); } }
.tv-av { display: grid; place-items: center; width: 1.7em; height: 1.7em; border-radius: 50%; border: 2px solid #fff; color: #1b1030; font-size: 0.8em; font-weight: 900; box-shadow: 0 1px 3px rgba(0,0,0,0.5); text-transform: uppercase; }
.tv-board { flex: none; width: 100%; max-width: 30em; margin: 0 auto; display: flex; flex-direction: column; gap: 3px; }
.tv-row { display: flex; align-items: center; gap: 8px; padding: 3px 10px; border-radius: 999px; background: rgba(0,0,0,0.28); font-weight: 800; }
.tv-row.me { background: rgba(255,212,59,0.22); box-shadow: inset 0 0 0 2px var(--sun); }
.tv-row .rk { width: 1.3em; text-align: center; color: var(--muted); }
.tv-row .nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tv-row .pts { color: var(--sun); }
.tv-row .add { color: #5bdc6f; min-width: 3.4em; text-align: right; font-size: 0.9em; }
.tv-center { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; flex: 1; text-align: center; }
.tv-pod { display: flex; align-items: flex-end; justify-content: center; gap: 10px; margin: 6px auto 0; min-height: 11em; }
.tv-pod .col { display: flex; flex-direction: column; align-items: center; width: 6.2em; min-width: 0; }
.tv-pod .col .nm { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 900; }
.tv-pod .col .pts { color: var(--sun); font-weight: 900; font-size: 0.9em; }
.tv-pod .block { width: 100%; display: grid; place-items: start center; padding-top: 4px; border-radius: 12px 12px 0 0; font-size: 1.6em; font-weight: 900; color: #1b1030; box-shadow: 0 4px 0 rgba(0,0,0,0.3); animation: tv-rise 0.7s cubic-bezier(.3,1.3,.5,1) both; }
.tv-pod .col.p1 .block { background: linear-gradient(#ffe27a, var(--sun)); height: 5.5em; }
.tv-pod .col.p2 .block { background: linear-gradient(#f2f2f8, #bfc3d6); height: 4em; animation-delay: 0.15s; }
.tv-pod .col.p3 .block { background: linear-gradient(#f0b27a, #c9803d); height: 3em; animation-delay: 0.3s; }
@keyframes tv-rise { from { transform: scaleY(0); } to { transform: scaleY(1); } }
.tv-pod .col { transform-origin: bottom; }
.tv-pod .block { transform-origin: bottom; }
`;

// --- helpers ---------------------------------------------------------------

// Small seeded generator (mulberry32) so every player derives the same shuffle.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(list, rand) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Display order of a question's answers: perm[k] is the index into q.a shown
// on button k. Index 0 of q.a is always the right answer.
function permFor(s) {
  const rand = rng((s.seed ^ Math.imul(s.round, 7919) ^ Math.imul(s.qIndex + 1, 104729)) >>> 0);
  return shuffled([0, 1, 2, 3], rand);
}

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const isId = id => typeof id === 'string' && id.length > 0 && id.length < 64;

function validShared(s) {
  if (!s || typeof s !== 'object' || !PHASES.includes(s.phase)) return false;
  if (!Number.isInteger(s.round) || !Number.isFinite(s.seed) || !s.scores || typeof s.scores !== 'object') return false;
  if (s.phase === 'vote') return Array.isArray(s.offer) && s.offer.length === 3 && s.votes && typeof s.votes === 'object' && Number.isFinite(s.voteEnds);
  if (!Array.isArray(s.order) || s.order.length < 1 || s.order.length > PER_ROUND) return false;
  if (!s.order.every(n => Number.isInteger(n) && n >= 0 && n < QUESTIONS.length)) return false;
  if (!Number.isInteger(s.qIndex) || s.qIndex < 0 || s.qIndex >= s.order.length) return false;
  if (!s.answers || typeof s.answers !== 'object' || !s.gains || typeof s.gains !== 'object') return false;
  return Number.isFinite(s.startedAt);
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export default {
  id: 'trivia',
  name: 'Trivia',
  emoji: '❓',
  blurb: 'Quiz-show party: vote a category, then race to answer ten questions.',
  minPlayers: 1,
  maxPlayers: MAX_PLAYERS,
  needsFace: false,
  fullBleed: false,

  create(api) {
    // --- dom -------------------------------------------------------------
    const root = el('div', 'tv');
    const style = el('style');
    style.textContent = CSS;
    const top = el('div', 'tv-top');
    const metaEl = el('span', 'meta');
    const scoreEl = el('span', 'score');
    top.append(metaEl, scoreEl);
    const bar = el('div', 'tv-bar off');
    const barFill = el('i');
    bar.append(barFill);
    const main = el('div', 'tv-main');
    root.append(style, top, bar, main);
    api.el.append(root);

    // --- local state -----------------------------------------------------
    let best = api.store.get('best', 0);
    let destroyed = false;
    let timer = 0;
    let lastSig = '';
    let myPick = null;         // { round, qIndex, choice, ms, sentAt }: my answer, shown before the owner echoes it
    let myVote = null;         // { round, idx }
    let announced = '';        // phase key whose sound/record was already handled
    let lastTickSec = -1;
    let padIdx = 0, padActive = false, padPrev = {};
    let cols = 1;
    let items = [];            // focusable buttons of the current view

    const sharedNow = () => {
      const s = api.shared();
      return validShared(s) ? s : null;
    };
    const seated = () => api.players().slice(0, MAX_PLAYERS);
    const isSeated = id => seated().some(p => p.id === id);
    const playerOf = id => api.players().find(p => p.id === id) || null;
    const nameOf = id => (id === api.me.id ? 'You' : playerOf(id)?.name || 'Player');

    // --- owner logic -----------------------------------------------------
    function pickQuestions(cat, seen) {
      const all = QUESTIONS.map((q, i) => i).filter(i => cat === 'Mixed' || QUESTIONS[i].cat === cat);
      const fresh = all.filter(i => !seen.includes(i));
      const pool = fresh.length >= PER_ROUND ? fresh : all;
      // Easier first, harder later, within what the pool offers.
      const picked = shuffled(pool, Math.random).slice(0, PER_ROUND);
      picked.sort((a, b) => QUESTIONS[a].diff - QUESTIONS[b].diff);
      return picked;
    }

    function startVote(round, scores, seen) {
      const offer = shuffled(CATEGORIES, Math.random).slice(0, 3);
      api.setShared({
        round, phase: 'vote', seed: Math.floor(Math.random() * 4294967296), scores: scores || {},
        offer, votes: {}, voteEnds: Date.now() + VOTE_TIME, seen: seen || [],
      });
    }

    function startQuestions(s) {
      // Tally the votes; the last option is Mixed. Ties are broken at random.
      const options = [...s.offer, 'Mixed'];
      const counts = options.map(() => 0);
      for (const [id, v] of Object.entries(s.votes)) if (isSeated(id) && v >= 0 && v < 4) counts[v]++;
      const most = Math.max(...counts);
      const cat = most > 0 ? options[shuffled(counts.map((c, i) => (c === most ? i : -1)).filter(i => i >= 0), Math.random)[0]] : 'Mixed';
      const order = pickQuestions(cat, s.seen || []);
      api.setShared({
        round: s.round, phase: 'question', seed: s.seed, scores: s.scores, cat, order, qIndex: 0,
        startedAt: Date.now(), answers: {}, gains: {}, seen: [...(s.seen || []), ...order].slice(-SEEN_KEEP),
      });
    }

    function closeQuestion(s) {
      const correctPos = permFor(s).indexOf(0);
      const scores = { ...s.scores };
      const gains = {};
      for (const [id, a] of Object.entries(s.answers)) {
        if (!isSeated(id) || !Array.isArray(a)) continue;
        const gain = a[0] === correctPos ? Math.round(MAX_POINTS - (MAX_POINTS - MIN_POINTS) * (clamp(a[1], 0, QTIME) / QTIME)) : 0;
        gains[id] = gain;
        scores[id] = (scores[id] || 0) + gain;
      }
      api.setShared({ ...s, phase: 'reveal', scores, gains, revealEnds: Date.now() + REVEAL_TIME });
    }

    function ownerTick() {
      if (!api.isOwner()) return;
      const s = sharedNow();
      const now = Date.now();
      if (!s) { startVote(1, {}, []); return; }
      if (s.phase === 'vote') {
        const ids = seated().map(p => p.id);
        const all = ids.length > 0 && ids.every(id => s.votes[id] !== undefined);
        if (all || now >= s.voteEnds) startQuestions(s);
      } else if (s.phase === 'question') {
        const ids = seated().map(p => p.id);
        const all = ids.length > 0 && ids.every(id => s.answers[id] !== undefined);
        if (all || now >= s.startedAt + QTIME + GRACE) closeQuestion(s);
      } else if (s.phase === 'reveal') {
        if (now >= (s.revealEnds || 0)) {
          if (s.qIndex + 1 < s.order.length) {
            api.setShared({ ...s, phase: 'question', qIndex: s.qIndex + 1, startedAt: now, answers: {}, gains: {}, revealEnds: 0 });
          } else {
            api.setShared({ ...s, phase: 'final' });
          }
        }
      }
    }

    function applyVote(by, round, idx) {
      const s = sharedNow();
      if (!s || s.phase !== 'vote' || round !== s.round || !isSeated(by) || !Number.isInteger(idx) || idx < 0 || idx > 3) return;
      api.setShared({ ...s, votes: { ...s.votes, [by]: idx } });
    }

    function applyAnswer(by, d) {
      const s = sharedNow();
      if (!s || s.phase !== 'question' || !d || d.round !== s.round || d.qIndex !== s.qIndex || !isSeated(by)) return;
      if (s.answers[by] !== undefined || !Number.isInteger(d.choice) || d.choice < 0 || d.choice > 3) return;
      const claimed = Number.isFinite(d.ms) ? d.ms : QTIME;
      // Never trust a time faster than the owner could have seen (minus some travel time).
      const ms = clamp(Math.max(claimed, Date.now() - s.startedAt - 2000), 0, QTIME);
      api.setShared({ ...s, answers: { ...s.answers, [by]: [d.choice, Math.round(ms)] } });
    }

    function applyAgain(by, round) {
      const s = sharedNow();
      if (!s || s.phase !== 'final' || round !== s.round || !isSeated(by)) return;
      startVote(s.round + 1, {}, s.seen);
    }

    api.on('vote', (d, from) => { if (api.isOwner() && d) applyVote(from, d.round, d.idx); });
    api.on('answer', (d, from) => { if (api.isOwner() && d) applyAnswer(from, d); });
    api.on('again', (d, from) => { if (api.isOwner() && d) applyAgain(from, d.round); });

    // --- my actions ----------------------------------------------------------
    function vote(idx) {
      const s = sharedNow();
      if (!s || s.phase !== 'vote' || !isSeated(api.me.id) || myVote?.round === s.round) return;
      myVote = { round: s.round, idx };
      api.sfx('click');
      if (api.isOwner()) applyVote(api.me.id, s.round, idx);
      else api.send('vote', { round: s.round, idx });
      render();
    }

    function answer(choice) {
      const s = sharedNow();
      if (!s || s.phase !== 'question' || !isSeated(api.me.id)) return;
      if (s.answers[api.me.id] !== undefined || (myPick && myPick.round === s.round && myPick.qIndex === s.qIndex)) return;
      if (Date.now() > s.startedAt + QTIME) return;
      const ms = clamp(Date.now() - s.startedAt, 0, QTIME);
      myPick = { round: s.round, qIndex: s.qIndex, choice, ms, sentAt: Date.now() };
      api.sfx('pop');
      const d = { round: s.round, qIndex: s.qIndex, choice, ms };
      if (api.isOwner()) applyAnswer(api.me.id, d);
      else api.send('answer', d);
      render();
    }

    function playAgain() {
      const s = sharedNow();
      if (!s || s.phase !== 'final' || !isSeated(api.me.id)) return;
      if (api.isOwner()) applyAgain(api.me.id, s.round);
      else api.send('again', { round: s.round });
    }

    // --- drawing -------------------------------------------------------------
    function avatar(id) {
      const p = playerOf(id);
      const a = el('span', 'tv-av', (p?.name || '?').trim().slice(0, 1) || '?');
      a.style.background = p?.color || '#ccc';
      a.title = nameOf(id);
      return a;
    }

    function myPickFor(s) {
      return myPick && myPick.round === s.round && myPick.qIndex === s.qIndex ? myPick.choice : null;
    }

    // Sorted leaderboard rows for the players here now.
    function boardRows(s, withGain) {
      const rows = seated().map(p => ({ p, pts: s.scores[p.id] || 0, gain: withGain ? s.gains[p.id] || 0 : 0 }));
      rows.sort((a, b) => b.pts - a.pts);
      return rows;
    }

    function boardEl(s, withGain) {
      const board = el('div', 'tv-board');
      boardRows(s, withGain).forEach((r, i) => {
        const row = el('div', 'tv-row' + (r.p.me ? ' me' : ''));
        const av = avatar(r.p.id);
        row.append(el('span', 'rk', String(i + 1)), av, el('span', 'nm', r.p.me ? 'You' : r.p.name), el('span', 'pts', String(r.pts)), el('span', 'add', withGain && r.gain ? `+${r.gain}` : ''));
        board.append(row);
      });
      return board;
    }

    function answerButtons(s, mode) {
      const q = QUESTIONS[s.order[s.qIndex]];
      const perm = permFor(s);
      const correctPos = perm.indexOf(0);
      const picked = {};
      for (const [id, a] of Object.entries(s.answers)) if (Array.isArray(a) && isSeated(id)) picked[id] = a[0];
      const mine = s.answers[api.me.id]?.[0] ?? myPickFor(s);
      const wrap = el('div', 'tv-ans' + (cols === 2 ? ' two' : ''));
      const btns = [];
      perm.forEach((orig, k) => {
        const b = el('button', 'tv-a');
        b.type = 'button';
        b.style.setProperty('--c', COLORS[k]);
        const key = el('span', 'key', String(k + 1));
        b.append(key, el('span', 'txt', q.a[orig]));
        if (mode === 'question') {
          if (mine != null) {
            b.disabled = true;
            b.classList.add(mine === k ? 'mine' : 'dim');
          } else {
            b.addEventListener('click', () => answer(k));
          }
        } else {
          b.disabled = true;
          b.classList.add(k === correctPos ? 'right' : 'wrong');
          if (mine === k) b.classList.add('mine');
          const who = el('span', 'who');
          for (const [id, c] of Object.entries(picked)) if (c === k) who.append(avatar(id));
          if (who.childNodes.length) b.append(who);
          if (mine === k && k === correctPos && s.gains[api.me.id]) b.append(el('span', 'gain', `+${s.gains[api.me.id]}`));
        }
        wrap.append(b);
        btns.push(b);
      });
      return { wrap, btns };
    }

    function viewVote(s) {
      const picked = myVote?.round === s.round ? myVote.idx : s.votes[api.me.id] ?? null;
      const options = [...s.offer, 'Mixed'];
      main.append(el('div', 'tv-q', 'Pick a category'));
      const sub = el('div', 'tv-sub');
      sub.dataset.role = 'vote-sub';
      main.append(sub);
      const wrap = el('div', 'tv-ans' + (cols === 2 ? ' two' : ''));
      options.forEach((cat, k) => {
        const b = el('button', 'tv-a');
        b.type = 'button';
        b.style.setProperty('--c', COLORS[k]);
        b.append(el('span', 'key', String(k + 1)), el('span', 'txt', `${CAT_EMOJI[cat] || ''} ${cat}`));
        const who = el('span', 'who');
        for (const [id, v] of Object.entries(s.votes)) if (v === k && isSeated(id)) who.append(avatar(id));
        if (who.childNodes.length) b.append(who);
        if (picked != null) {
          b.disabled = true;
          b.classList.add(picked === k ? 'mine' : 'dim');
        } else b.addEventListener('click', () => vote(k));
        wrap.append(b);
        items.push(b);
      });
      main.append(wrap);
    }

    function viewQuestion(s, reveal) {
      const q = QUESTIONS[s.order[s.qIndex]];
      main.append(el('div', 'tv-q', q.q));
      const sub = el('div', 'tv-sub');
      sub.dataset.role = reveal ? 'reveal-sub' : 'q-sub';
      main.append(sub);
      const { wrap, btns } = answerButtons(s, reveal ? 'reveal' : 'question');
      main.append(wrap);
      if (!reveal) {
        items = btns.filter(b => !b.disabled);
      } else {
        main.append(boardEl(s, true));
      }
    }

    function viewFinal(s) {
      const rows = boardRows(s, false);
      main.append(el('div', 'tv-q', rows.length > 1 ? 'Final podium' : 'Round complete!'));
      const pod = el('div', 'tv-pod');
      const order = [1, 0, 2].filter(i => rows[i]);
      for (const i of order) {
        const r = rows[i];
        const col = el('div', `col p${i + 1}`);
        col.append(avatar(r.p.id), el('div', 'nm', r.p.me ? 'You' : r.p.name), el('div', 'pts', String(r.pts)), el('div', 'block', ['🥇', '🥈', '🥉'][i]));
        pod.append(col);
      }
      main.append(pod);
      if (rows.length > 3) main.append(boardEl(s, false));
      const mine = s.scores[api.me.id] || 0;
      const line = el('div', 'tv-sub');
      line.append(document.createTextNode(`Your score: ${mine}`));
      if (best) line.append(document.createTextNode(` · Best: ${best}`));
      main.append(line);
      if (isSeated(api.me.id)) {
        const again = el('button', 'btn aqua', 'Play again');
        again.type = 'button';
        again.addEventListener('click', playAgain);
        const row = el('div', 'g-row');
        row.append(again);
        main.append(row);
        items.push(again);
      } else {
        main.append(el('div', 'tv-sub', 'The room is full: you are watching.'));
      }
    }

    // Rebuilds the view when something other than the clock changed.
    function render() {
      const s = sharedNow();
      const solo = seated().length === 1;
      const sig = JSON.stringify([
        s && [s.phase, s.round, s.qIndex, s.votes, s.answers, s.gains, s.scores, s.offer, s.order],
        seated().map(p => [p.id, p.name, p.color]), myPickFor(s || {}), myVote, cols, best,
      ]);
      if (sig === lastSig) return;
      lastSig = sig;
      main.replaceChildren();
      items = [];
      if (!s) {
        const c = el('div', 'tv-center');
        c.append(el('div', 'g-big', '❓'), el('div', 'muted', 'Getting the quiz ready…'));
        main.append(c);
        metaEl.textContent = '';
        scoreEl.textContent = '';
        return;
      }
      if (s.phase === 'vote') viewVote(s);
      else if (s.phase === 'question') viewQuestion(s, false);
      else if (s.phase === 'reveal') viewQuestion(s, true);
      else viewFinal(s);

      const total = s.order?.length || PER_ROUND;
      metaEl.textContent = s.phase === 'vote' ? 'Trivia' : s.phase === 'final' ? `${s.cat} · done` : `Question ${s.qIndex + 1} of ${total} · ${CAT_EMOJI[s.cat] || ''} ${s.cat}`;
      scoreEl.textContent = `${solo ? '' : 'You: '}${s.scores[api.me.id] || 0}`;
      padIdx = clamp(padIdx, 0, Math.max(0, items.length - 1));
      markPad();
    }

    function markPad() {
      items.forEach((b, i) => b.classList.toggle('padfocus', padActive && i === padIdx));
    }

    // The clock-driven bits: countdown bar, status lines and tick sounds.
    function frame() {
      const s = sharedNow();
      const now = Date.now();
      let frac = 0, secs = 0, active = false;
      if (s?.phase === 'question') {
        const left = clamp(s.startedAt + QTIME - now, 0, QTIME);
        frac = left / QTIME;
        secs = Math.ceil(left / 1000);
        active = true;
      } else if (s?.phase === 'vote') {
        const left = clamp(s.voteEnds - now, 0, VOTE_TIME);
        frac = left / VOTE_TIME;
        secs = Math.ceil(left / 1000);
        active = true;
      } else if (s?.phase === 'reveal') {
        const left = clamp((s.revealEnds || 0) - now, 0, REVEAL_TIME);
        frac = left / REVEAL_TIME;
      }
      bar.classList.toggle('off', !active);
      bar.classList.toggle('low', active && frac < 0.25);
      barFill.style.transform = `scaleX(${frac})`;

      const sub = main.querySelector('.tv-sub');
      if (s && sub && sub.dataset.role) {
        const role = sub.dataset.role;
        const n = seated().length;
        if (role === 'q-sub') {
          const done = seated().filter(p => s.answers[p.id] !== undefined).length;
          const mine = s.answers[api.me.id] !== undefined || myPickFor(s) != null;
          sub.textContent = isSeated(api.me.id)
            ? (mine ? `Locked in! ${done}/${n} answered` : `${secs}s left · tap an answer or press 1-4`)
            : 'Watching this question';
        } else if (role === 'vote-sub') {
          const done = seated().filter(p => s.votes[p.id] !== undefined).length;
          sub.textContent = `Most votes wins · ${done}/${n} voted · ${secs}s`;
        } else if (role === 'reveal-sub') {
          const gain = s.gains[api.me.id];
          const had = s.answers[api.me.id] !== undefined;
          sub.textContent = !isSeated(api.me.id) ? '' : gain ? `Correct! +${gain} points` : had ? 'Not this time!' : 'Too slow!';
        }
      }
      if (s?.phase === 'question' && secs <= 3 && secs > 0 && secs !== lastTickSec && s.answers[api.me.id] === undefined && myPickFor(s) == null) {
        lastTickSec = secs;
        api.sfx('tick');
      }
    }

    // Sounds and records for what changed since the last drawn state.
    let prevKey = '';
    function cues() {
      const s = sharedNow();
      if (!s) return;
      const key = `${s.round}:${s.phase}:${s.qIndex ?? ''}`;
      if (key === prevKey) return;
      const wasPrev = prevKey;
      prevKey = key;
      if (s.phase === 'question') {
        myPick = myPick && myPick.round === s.round && myPick.qIndex === s.qIndex ? myPick : null;
        lastTickSec = -1;
        padIdx = 0;
        if (wasPrev) api.sfx('whoosh');
      } else if (s.phase === 'reveal') {
        const gain = s.gains[api.me.id];
        if (isSeated(api.me.id)) api.sfx(gain ? 'score' : 'miss');
      } else if (s.phase === 'vote') {
        myVote = myVote?.round === s.round ? myVote : null;
        myPick = null;
        padIdx = 0;
      } else if (s.phase === 'final' && announced !== key) {
        announced = key;
        const mine = s.scores[api.me.id] || 0;
        if (isSeated(api.me.id) && wasPrev) {
          if (mine > best) { best = mine; api.store.set('best', mine); }
          const top = Math.max(0, ...seated().map(p => s.scores[p.id] || 0));
          api.sfx(mine >= top ? 'win' : 'lose');
        }
        padIdx = 0;
      }
    }

    function refresh() {
      cues();
      render();
      frame();
    }

    // --- layout --------------------------------------------------------------
    function layout() {
      const r = api.el.getBoundingClientRect();
      const w = r.width, h = r.height;
      root.classList.toggle('tight', w < 360 || h < 380);
      root.classList.toggle('roomy', w >= 900 && h >= 640);
      const next = w >= 520 || h < 340 ? 2 : 1;
      if (next !== cols) { cols = next; lastSig = ''; render(); }
    }
    const ro = new ResizeObserver(layout);
    ro.observe(api.el);
    layout();

    // --- input -----------------------------------------------------------------
    function onKey(e) {
      if (!api.el.isConnected || e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA' || e.ctrlKey || e.metaKey || e.altKey) return;
      const s = sharedNow();
      if (!s) return;
      const n = '1234'.indexOf(e.key);
      if (n >= 0 && e.key.length === 1) {
        if (s.phase === 'question') answer(n);
        else if (s.phase === 'vote') vote(n);
        e.preventDefault();
      } else if (e.key === 'Enter' && s.phase === 'final') {
        playAgain();
        e.preventDefault();
      }
    }
    document.addEventListener('keydown', onKey);

    // The D-pad moves a highlight over the buttons, A presses it.
    function onPad(pad) {
      if (!pad || !api.el.isConnected) return;
      const edge = k => pad[k] && !padPrev[k];
      let move = 0;
      if (edge('down')) move = cols === 2 ? 2 : 1;
      else if (edge('up')) move = cols === 2 ? -2 : -1;
      else if (edge('right')) move = 1;
      else if (edge('left')) move = -1;
      const pressA = edge('a');
      padPrev = { up: !!pad.up, down: !!pad.down, left: !!pad.left, right: !!pad.right, a: !!pad.a };
      if (!items.length) return;
      if (move) {
        padActive = true;
        const next = padIdx + move;
        if (next >= 0 && next < items.length) padIdx = next;
        markPad();
      } else if (pressA) {
        if (!padActive) { padActive = true; markPad(); return; }
        items[padIdx]?.click();
      }
    }

    // --- run ---------------------------------------------------------------------
    // An answer the owner hasn't recorded yet (lost, or it arrived before
    // the owner had moved on to this question) is sent again, so the
    // question can close as soon as everyone has answered.
    function resendAnswer() {
      const s = sharedNow();
      if (!myPick || !s || api.isOwner() || s.phase !== 'question') return;
      if (myPick.round !== s.round || myPick.qIndex !== s.qIndex || s.answers[api.me.id] !== undefined) return;
      if (Date.now() - myPick.sentAt < 700) return;
      myPick.sentAt = Date.now();
      api.send('answer', { round: s.round, qIndex: s.qIndex, choice: myPick.choice, ms: myPick.ms });
    }

    timer = setInterval(() => {
      if (destroyed) return;
      resendAnswer();
      ownerTick();
      refresh();
    }, 50);
    ownerTick();
    refresh();

    return {
      destroy() {
        destroyed = true;
        clearInterval(timer);
        ro.disconnect();
        document.removeEventListener('keydown', onKey);
        root.remove();
      },
      onChange() { if (!destroyed) { ownerTick(); refresh(); } },
      onPad,
    };
  },
};
