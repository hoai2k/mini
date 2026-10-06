// Rock Paper Scissors for the whole room. Everyone picks in secret (only
// "locked in" is shared), then the owner starts a countdown to a shared
// timestamp. At that moment every client sends its throw; the owner tallies
// them, scores one point for every other player a hand beats, and publishes
// the reveal. First to 5 points wins the match. All round state lives in
// shared state, so a new owner simply carries on. Each device keeps a
// lifetime record against every opponent name.

const PICKS = ['rock', 'paper', 'scissors'];
const EMOJI = { rock: '✊', paper: '✋', scissors: '✌️' };
const BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };   // key beats value
const KEYS = { rock: 'R', paper: 'P', scissors: 'S' };
const PAD_LABEL = { rock: 'X', paper: 'Y', scissors: 'A' };
const WIN_SCORE = 5;
const COUNTDOWN = 2.4;       // seconds from "all locked" to the throw
const THROW_WAIT = 2000;     // ms to wait for late throws
const REVEAL_TIME = 3600;    // ms the reveal stays up
const PICK_PATIENCE = 30000; // ms before shooting without a slow player
const MAX_PLAYERS = 8;

const CSS = `
.rps { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 8px 10px; overflow: auto; }
.rps-score { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
.rps-p { display: flex; flex-direction: column; align-items: center; min-width: 76px; padding: 4px 8px; border-radius: 14px; background: rgba(0,0,0,0.25); border: 2px solid transparent; font-weight: 800; font-size: 0.85rem; }
.rps-p.me { border-color: var(--aqua); }
.rps-p.won { border-color: var(--sun); box-shadow: 0 0 14px rgba(255,212,59,0.6); }
.rps-p .nm { max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rps-p .pts { font-size: 1.3rem; font-weight: 900; color: var(--sun); line-height: 1.1; }
.rps-p .lk { font-size: 0.72rem; color: var(--muted); min-height: 1em; }
.rps-p .lk.on { color: var(--aqua); }
.rps-rec { font-size: 0.78rem; color: var(--muted); font-weight: 700; text-align: center; }
.rps-stage { flex: 1 0 auto; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; }
.rps-msg { font-size: clamp(1rem, calc(var(--u, 400px) * 0.06), 2rem); font-weight: 900; text-align: center; }
.rps-hands { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
.rps-hand { flex: none; --s: 96px; width: var(--s); height: var(--s); border-radius: 50%; display: grid; place-items: center; font-size: calc(var(--s) * 0.55); line-height: 1;
  background: radial-gradient(circle at 30% 25%, #fff 0%, #ffd9ec 18%, var(--pink) 60%, #b8306b 100%); box-shadow: 0 6px 0 #8a2250, 0 10px 18px rgba(0,0,0,0.35), inset 0 -6px 10px rgba(0,0,0,0.15); border: 0; padding: 0; }
.rps-hand img { width: 88%; height: 88%; object-fit: contain; }
.rps-hand.rock { background: radial-gradient(circle at 30% 25%, #fff 0%, #ffe9a0 20%, var(--sun) 60%, #c79500 100%); box-shadow: 0 6px 0 #8f6a00, 0 10px 18px rgba(0,0,0,0.35), inset 0 -6px 10px rgba(0,0,0,0.15); }
.rps-hand.paper { background: radial-gradient(circle at 30% 25%, #fff 0%, #b9f6ef 20%, var(--aqua) 60%, #1f9389 100%); box-shadow: 0 6px 0 #146b64, 0 10px 18px rgba(0,0,0,0.35), inset 0 -6px 10px rgba(0,0,0,0.15); }
.rps-hand.q { background: radial-gradient(circle at 30% 25%, #ddd 0%, #8a7fb0 60%, #4b3f78 100%); box-shadow: 0 6px 0 #2f2650; color: #fff; font-weight: 900; }
.rps-hand.pop { animation: rps-pop 0.7s cubic-bezier(.2,1.6,.4,1) both; }
.rps-hand.lose { opacity: 0.6; filter: saturate(0.5); }
.rps-hand.win { outline: 4px solid var(--sun); outline-offset: 3px; }
@keyframes rps-pop { 0% { transform: scale(0.2) rotate(-25deg); } 100% { transform: scale(1) rotate(0); } }
.rps-shake { --s: clamp(64px, calc(var(--u, 400px) * 0.3), 150px); animation: rps-shake 0.8s ease-in-out infinite; transform-origin: 50% 90%; }
@keyframes rps-shake { 0%, 100% { transform: translateY(0) rotate(0); } 25% { transform: translateY(-22px) rotate(-10deg); } 55% { transform: translateY(10px) rotate(6deg); } }
.rps-word { font-size: clamp(1.6rem, calc(var(--u, 400px) * 0.12), 3.4rem); font-weight: 900; color: var(--sun); text-shadow: 0 4px 0 #8f6a00; animation: rps-word 0.8s ease-out both; }
.rps-word.shoot { color: var(--pink); text-shadow: 0 4px 0 #8a2250; }
@keyframes rps-word { 0% { transform: scale(0.4); opacity: 0; } 30% { transform: scale(1.25); opacity: 1; } 100% { transform: scale(1); } }
.rps-pick { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
.rps-pick button { display: flex; flex-direction: column; align-items: center; gap: 6px; background: none; border: 0; color: var(--ink); cursor: pointer; font-weight: 900; font-size: 0.8rem; padding: 4px; border-radius: 22px; }
.rps-pick button .rps-hand { --s: clamp(44px, calc(var(--u, 400px) * 0.27), 112px); transition: transform 0.12s; }
.rps-pick button:hover .rps-hand, .rps-pick button:focus-visible .rps-hand { transform: translateY(-4px) scale(1.06); }
.rps-pick button.sel .rps-hand { outline: 4px solid #fff; outline-offset: 3px; }
.rps-pick button:disabled { cursor: default; opacity: 0.55; }
.rps-pick button.sel:disabled { opacity: 1; }
.rps-pick kbd { background: rgba(0,0,0,0.35); border: 1px solid var(--line); border-radius: 6px; padding: 0 6px; font: inherit; font-size: 0.7rem; }
.rps.small .rps-pick kbd { display: none; }
.rps.small .rps-pick { gap: 4px; flex-wrap: nowrap; }
.rps.small .rps-who, .rps.small .rps-rec { display: none; }
.rps.small .rps-p { min-width: 60px; padding: 2px 6px; }
.rps.small .rps-hand { --s: 60px; }
.rps-who { font-size: 0.85rem; color: var(--muted); text-align: center; max-width: 90%; }
`;

// Who beats whom: returns { gained: {id: points}, beat: {id: [ids]}, lost: {id: [ids]} }.
function score(throws) {
  const ids = Object.keys(throws);
  const gained = {}, beat = {}, lost = {};
  for (const id of ids) { gained[id] = 0; beat[id] = []; lost[id] = []; }
  for (const a of ids) {
    for (const b of ids) {
      if (a !== b && BEATS[throws[a]] === throws[b]) {
        gained[a]++;
        beat[a].push(b);
        lost[b].push(a);
      }
    }
  }
  return { gained, beat, lost };
}

export default {
  id: 'rps',
  name: 'Rock Paper Scissors',
  emoji: '✊',
  blurb: 'Everyone throws at once. First to 5 points wins the match.',
  minPlayers: 2,
  maxPlayers: MAX_PLAYERS,
  needsFace: false,

  create(api) {
    const root = document.createElement('div');
    root.className = 'rps';
    const style = document.createElement('style');
    style.textContent = CSS;
    const scoreEl = document.createElement('div');
    scoreEl.className = 'rps-score';
    const stage = document.createElement('div');
    stage.className = 'rps-stage';
    const recEl = document.createElement('div');
    recEl.className = 'rps-rec';
    root.append(style, scoreEl, recEl, stage);
    api.el.append(root);
    // Sizes come from the panel, not the window: a phone strip gets compact buttons.
    const ro = new ResizeObserver(() => {
      const r = api.el.getBoundingClientRect();
      root.style.setProperty('--u', `${Math.min(r.width, r.height * 1.2)}px`);
      root.classList.toggle('small', r.height < 380);
    });
    ro.observe(api.el);

    const records = api.store.get('records', {});   // '@name' -> [wins, losses, draws]
    const throws = new Map();    // round -> { id: pick } as received
    let myPick = null;           // { round, pick } chosen locally, never shared until the throw
    let sentRound = -1;
    let beatSeen = -1;           // last countdown beat that played its sound
    let recorded = '';           // 'match:round' whose records were already updated
    let sig = '';
    let timer = 0;
    const T = () => Date.now();

    const nameOf = id => api.players().find(p => p.id === id)?.name ?? 'Player';
    // Participants: the first eight members play, anyone else watches.
    const seated = () => api.players().slice(0, MAX_PLAYERS);
    const sh = () => {
      const s = api.shared();
      return s && Number.isFinite(s.round) && typeof s.phase === 'string' ? s : null;
    };

    // --- owner: run the match from shared state ----------------------------
    function fresh(match, scores, round = 1) {
      // Rounds keep counting across matches so old "locked" values never match.
      return { phase: 'pick', round, match, scores, startedAt: T(), shootAt: 0, throws: {}, gained: {}, winner: null, revealAt: 0 };
    }

    function ownerTick() {
      if (!api.isOwner()) return;
      const players = seated();
      let s = sh();
      if (!s) { api.setShared(fresh(1, {})); return; }
      if (players.length < 2) return;
      const now = T();

      if (s.phase === 'pick') {
        const locked = players.filter(p => p.state.locked === s.round);
        const all = locked.length === players.length;
        if ((all || (locked.length >= 2 && now - s.startedAt > PICK_PATIENCE)) && locked.length >= 2) {
          api.setShared({ ...s, phase: 'shoot', shootAt: now + COUNTDOWN * 1000, parts: locked.map(p => p.id) });
        }
      } else if (s.phase === 'shoot' && now >= s.shootAt) {
        const got = throws.get(s.round) || {};
        const parts = Array.isArray(s.parts) ? s.parts : [];
        const present = parts.filter(id => players.some(p => p.id === id));
        const complete = present.every(id => got[id]);
        if (complete || now >= s.shootAt + THROW_WAIT) {
          const finalThrows = {};
          for (const id of present) if (got[id]) finalThrows[id] = got[id];
          const { gained } = score(finalThrows);
          const scores = { ...s.scores };
          for (const id of Object.keys(gained)) scores[id] = (scores[id] || 0) + gained[id];
          // Match ends when someone reaches the target and leads alone.
          const top = Math.max(...Object.values(scores));
          const leaders = Object.keys(scores).filter(id => scores[id] === top);
          const winner = top >= WIN_SCORE && leaders.length === 1 ? leaders[0] : null;
          api.setShared({ ...s, phase: 'reveal', throws: finalThrows, gained, scores, winner, revealAt: now });
        }
      } else if (s.phase === 'reveal' && now >= s.revealAt + REVEAL_TIME) {
        if (s.winner) api.setShared({ ...s, phase: 'over' });
        else api.setShared({ ...s, phase: 'pick', round: s.round + 1, startedAt: now, throws: {}, gained: {}, parts: [] });
      }
    }

    api.on('throw', (d, from) => {
      if (!d || !PICKS.includes(d.pick) || !Number.isFinite(d.round)) return;
      if (!api.players().some(p => p.id === from)) return;
      const m = throws.get(d.round) || {};
      m[from] = d.pick;
      throws.set(d.round, m);
      // Forget old rounds.
      for (const r of [...throws.keys()]) if (r < d.round - 3) throws.delete(r);
    });

    function playAgain() {
      const s = sh();
      if (!s || s.phase !== 'over') return;
      if (api.isOwner()) api.setShared(fresh(s.match + 1, {}, s.round + 1));
      else api.send('again', { match: s.match });
    }
    api.on('again', d => {
      const s = sh();
      if (api.isOwner() && s && s.phase === 'over' && d && d.match === s.match) api.setShared(fresh(s.match + 1, {}, s.round + 1));
    });

    // --- player actions ------------------------------------------------------
    function pick(p) {
      const s = sh();
      if (!s || s.phase !== 'pick' || !seated().some(m => m.me)) return;
      if (seated().length < 2) return;
      myPick = { round: s.round, pick: p };
      api.sfx('click');
      if (api.state().locked !== s.round) api.setState({ locked: s.round });
      draw();
    }

    // At the throw moment each player sends what they locked in.
    function throwNow(s) {
      if (sentRound === s.round) return;
      sentRound = s.round;
      if (myPick && myPick.round === s.round && Array.isArray(s.parts) && s.parts.includes(api.me.id)) {
        const m = throws.get(s.round) || {};
        m[api.me.id] = myPick.pick;
        throws.set(s.round, m);
        api.send('throw', { round: s.round, pick: myPick.pick });
      }
    }

    // --- records ----------------------------------------------------------
    function updateRecords(s) {
      const tag = `${s.match}:${s.round}`;
      if (recorded === tag || !s.throws[api.me.id]) return;
      recorded = tag;
      const { beat, lost } = score(s.throws);
      for (const id of Object.keys(s.throws)) {
        if (id === api.me.id) continue;
        const key = '@' + nameOf(id);
        const r = Array.isArray(records[key]) ? records[key] : [0, 0, 0];
        if (beat[api.me.id].includes(id)) r[0]++;
        else if (lost[api.me.id].includes(id)) r[1]++;
        else r[2]++;
        records[key] = r;
      }
      api.store.set('records', records);
    }

    // --- drawing ------------------------------------------------------------
    // A hand badge: delivered artwork when there is some, a big emoji otherwise.
    function hand(p, cls = '') {
      const d = document.createElement('div');
      d.className = `rps-hand ${p || 'q'} ${cls}`;
      const art = p && api.img(`rps-${p}`);
      if (art) {
        const im = document.createElement('img');
        im.src = art.src;
        im.alt = p;
        d.append(im);
      } else d.textContent = p ? EMOJI[p] : '?';
      return d;
    }

    function line(text, cls = 'rps-msg') {
      const d = document.createElement('div');
      d.className = cls;
      d.textContent = text;
      return d;
    }

    function recordText(id) {
      const r = records['@' + nameOf(id)];
      const [a, b, c] = Array.isArray(r) ? r : [0, 0, 0];
      return `You vs ${nameOf(id)}: ${a}–${b}–${c}`;
    }

    function drawScores(s, players) {
      scoreEl.replaceChildren();
      const others = players.filter(p => !p.me);
      recEl.textContent = players.some(p => p.me) ? others.slice(0, 3).map(p => recordText(p.id)).join(' · ') + (others.length > 3 ? ' …' : '') : '';
      for (const p of players) {
        const c = document.createElement('div');
        c.className = 'rps-p' + (p.me ? ' me' : '') + (s && s.winner === p.id ? ' won' : '');
        const nm = document.createElement('div');
        nm.className = 'nm';
        nm.textContent = p.me ? 'You' : p.name;
        nm.style.color = p.color || '';
        const pts = document.createElement('div');
        pts.className = 'pts';
        pts.textContent = String((s && s.scores[p.id]) || 0);
        c.append(nm, pts);
        if (s && s.phase === 'pick') {
          const lk = document.createElement('div');
          const on = p.state.locked === s.round;
          lk.className = 'lk' + (on ? ' on' : '');
          lk.textContent = on ? 'locked in' : 'choosing…';
          c.append(lk);
        }
        scoreEl.append(c);
      }
    }

    function pickButtons(s, canPick) {
      const row = document.createElement('div');
      row.className = 'rps-pick';
      for (const p of PICKS) {
        const b = document.createElement('button');
        b.type = 'button';
        b.disabled = !canPick;
        b.className = myPick && s && myPick.round === s.round && myPick.pick === p ? 'sel' : '';
        b.setAttribute('aria-label', p);
        const lab = document.createElement('div');
        lab.append(`${p[0].toUpperCase()}${p.slice(1)} `);
        const k = document.createElement('kbd');
        k.textContent = `${KEYS[p]} · ${PICKS.indexOf(p) + 1} · pad ${PAD_LABEL[p]}`;
        lab.append(k);
        b.append(hand(p), lab);
        b.addEventListener('click', () => pick(p));
        row.append(b);
      }
      return row;
    }

    function draw() {
      const s = sh();
      const players = seated();
      const imgSig = PICKS.map(p => (api.img(`rps-${p}`) ? 1 : 0)).join('');
      const iAmIn = players.some(p => p.me);
      drawScores(s, players);
      stage.replaceChildren();
      if (!s || players.length < 2) {
        stage.append(hand(null), line('Waiting for a friend to join…'));
        return imgSig;
      }
      if (s.phase === 'pick') {
        const locked = myPick && myPick.round === s.round;
        stage.append(line(!iAmIn ? 'Watching this round' : locked ? 'Locked in! Waiting for the others…' : 'Pick your hand'));
        if (iAmIn) stage.append(pickButtons(s, true));
        const waiting = players.filter(p => p.state.locked !== s.round).map(p => (p.me ? 'you' : p.name));
        if (waiting.length) stage.append(line(`Waiting for ${waiting.join(', ')}`, 'rps-who'));
        stage.append(line(`First to ${WIN_SCORE} points wins · 1 point per player you beat`, 'rps-who'));
      } else if (s.phase === 'shoot') {
        const c = hand('rock', 'rps-shake');
        c.id = 'rps-shaker';
        const word = line('', 'rps-word');
        word.id = 'rps-word';
        stage.append(word, c);
        if (iAmIn && myPick && myPick.round === s.round) stage.append(line(`Your hand: ${EMOJI[myPick.pick]} ${myPick.pick}`, 'rps-who'));
      } else {
        // reveal / over
        const parts = Object.keys(s.throws).filter(id => players.some(p => p.id === id));
        const { beat, lost } = score(s.throws);
        const hands = document.createElement('div');
        hands.className = 'rps-hands';
        for (const id of parts) {
          const box = document.createElement('div');
          box.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;font-weight:800;font-size:0.85rem';
          const h = hand(s.throws[id], 'pop' + (s.gained[id] > 0 ? ' win' : lost[id].length ? ' lose' : ''));
          const nm = document.createElement('div');
          nm.textContent = (id === api.me.id ? 'You' : nameOf(id)) + (s.gained[id] ? `  +${s.gained[id]}` : '');
          box.append(h, nm);
          hands.append(box);
        }
        let msg;
        if (s.phase === 'over' || s.winner) msg = s.winner === api.me.id ? 'You win the match! 🎉' : `${nameOf(s.winner)} wins the match!`;
        else if (s.gained && !Object.values(s.gained).some(n => n > 0)) msg = 'Draw! Go again';
        else if (s.throws[api.me.id] && beat[api.me.id]) {
          const mine = beat[api.me.id].map(nameOf), their = lost[api.me.id].map(nameOf);
          msg = mine.length ? `You beat ${mine.join(', ')}` : their.length ? `${their.join(', ')} beat${their.length === 1 ? 's' : ''} you` : 'Tie with everyone you faced';
        } else msg = 'Round over';
        stage.append(line(msg), hands);
        if (s.phase === 'over') {
          if (iAmIn) {
            const b = document.createElement('button');
            b.className = 'btn aqua';
            b.textContent = 'Play again';
            b.addEventListener('click', playAgain);
            stage.append(b);
          }
        }
      }
      return imgSig;
    }

    // --- loop ----------------------------------------------------------------
    // Cheap enough to run every 100 ms: owner logic, countdown beats, redraw on change.
    function tick() {
      ownerTick();
      const s = sh();
      const players = seated();
      if (s && s.phase === 'shoot') {
        const left = (s.shootAt - T()) / 1000;
        // Beats at -2.4 s, -1.6 s, -0.8 s: Rock, Paper, Scissors; 0: SHOOT!
        const beat = left <= 0 ? 3 : left <= 0.8 ? 2 : left <= 1.6 ? 1 : 0;
        if (beat !== beatSeen) {
          beatSeen = beat;
          const word = stage.querySelector('#rps-word');
          if (word) {
            word.textContent = ['Rock…', 'Paper…', 'Scissors…', 'SHOOT!'][beat];
            word.classList.toggle('shoot', beat === 3);
            word.style.animation = 'none';
            void word.offsetWidth;
            word.style.animation = '';
          }
          api.sfx(beat === 3 ? 'pop' : 'tick');
        }
        if (left <= 0) throwNow(s);
      } else beatSeen = -1;
      if (s && (s.phase === 'reveal' || s.phase === 'over')) {
        const before = recorded;
        updateRecords(s);
        if (recorded !== before) {
          sig = '';   // redraw with the new records
          if (s.winner) api.sfx(s.winner === api.me.id ? 'win' : 'lose');
          else if (s.gained && s.gained[api.me.id] > 0) api.sfx('score');
          else if (s.throws[api.me.id]) api.sfx('miss');
        }
      }
      const next = JSON.stringify([s, players.map(p => [p.id, p.name, p.state.locked]), myPick, PICKS.map(p => !!api.img(`rps-${p}`))]);
      if (next !== sig) {
        sig = next;
        // The shoot screen is rebuilt only when the phase changes, so the
        // countdown word keeps animating.
        draw();
        beatSeen = -1;
      }
    }
    timer = setInterval(tick, 100);

    // --- input ------------------------------------------------------------------
    const typing = e => /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName);
    function onKey(e) {
      if (typing(e) || !api.el.isConnected || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const p = k === 'r' || k === '1' ? 'rock' : k === 'p' || k === '2' ? 'paper' : k === 's' || k === '3' ? 'scissors' : null;
      if (p) pick(p);
    }
    window.addEventListener('keydown', onKey);

    ownerTick();
    tick();

    return {
      destroy() {
        clearInterval(timer);
        ro.disconnect();
        window.removeEventListener('keydown', onKey);
      },
      onChange() { tick(); },
      onPad(pad) {
        if (pad.xBtn) pick('rock');
        else if (pad.yBtn) pick('paper');
        else if (pad.a) {
          const s = sh();
          if (s && s.phase === 'over') playAgain();
          else pick('scissors');
        }
      },
    };
  },
};
