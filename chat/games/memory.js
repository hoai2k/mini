// Memory Match: ten pairs of face-effect cards on a 4x5 grid. Players take
// turns flipping two cards; a match scores a pair and keeps the turn, a miss
// shows both cards for a second and passes the turn on. Solo play works too
// (fewest moves counts). The owner holds the whole game in shared state,
// including the time the cards flip back (flipBackAt), so a new owner simply
// finishes the turn. Everyone else sends 'flip' and draws from shared().

const PAIRS = 10;
const CARDS = PAIRS * 2;
const MAX_PLAYERS = 4;
const SHOW_MISS = 1000;   // ms a mismatched pair stays face up

// Card faces, in order: the face-effect emoji and the delivered icon name.
const FACES = [
  { e: '🫧', img: 'fx-bubble' },
  { e: '🐶', img: 'fx-puppy' },
  { e: '😍', img: 'fx-hearteyes' },
  { e: '🐉', img: 'fx-dragon' },
  { e: '🌈', img: 'fx-rainbow' },
  { e: '👀', img: 'fx-bigeyes' },
  { e: '🎎', img: 'fx-bobblehead' },
  { e: '👽', img: 'fx-alien' },
  { e: '😎', img: 'fx-dealwithit' },
  { e: '👑', img: 'fx-crown' },
];

const CSS = `
.mm { position: absolute; inset: 0; display: flex; flex-direction: column; }
.mm-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 4px 8px; padding: 6px 10px 0; font-weight: 800; }
.mm-chip { display: inline-flex; align-items: center; gap: 6px; padding: 2px 10px; border-radius: 999px; background: rgba(0,0,0,0.25); border: 2px solid transparent; max-width: 48%; }
.mm-chip.turn { border-color: var(--sun); box-shadow: 0 0 12px rgba(255,212,59,0.5); }
.mm-chip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mm-chip b { color: var(--sun); }
.mm-status { flex: 1 1 100%; text-align: center; font-weight: 900; font-size: 1.05rem; }
.mm-area { position: relative; flex: 1; min-height: 0; display: grid; place-items: center; padding: 6px; }
.mm-grid { display: grid; gap: var(--gap, 8px); }
.mm-card { --w: 80px; width: var(--w); height: calc(var(--w) * 1.375); padding: 0; border: 0; background: none; perspective: 700px; cursor: pointer; border-radius: 12px; font: inherit; }
.mm-in { position: relative; display: block; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform 0.45s cubic-bezier(.3,1.3,.5,1); }
.mm-card.up .mm-in { transform: rotateY(180deg); }
.mm-card:hover:not(.up) .mm-in { transform: translateY(-3px) rotateZ(-1deg); }
.mm-face, .mm-back { position: absolute; inset: 0; display: grid; place-items: center; border-radius: 12px; backface-visibility: hidden; -webkit-backface-visibility: hidden; overflow: hidden; box-shadow: 0 4px 0 rgba(0,0,0,0.35), 0 6px 12px rgba(0,0,0,0.3); }
.mm-back { background:
    radial-gradient(circle at 28% 24%, rgba(255,255,255,0.75) 0 7%, transparent 8%),
    radial-gradient(circle at 70% 36%, rgba(255,255,255,0.6) 0 5%, transparent 6%),
    radial-gradient(circle at 42% 72%, rgba(255,255,255,0.65) 0 9%, transparent 10%),
    radial-gradient(circle at 80% 80%, rgba(255,255,255,0.5) 0 6%, transparent 7%),
    linear-gradient(160deg, #ff86b9, var(--pink) 45%, #7b4bd6); border: 3px solid #fff; }
.mm-back img { width: 100%; height: 100%; object-fit: cover; }
.mm-face { transform: rotateY(180deg); background: linear-gradient(180deg, #fff, #ffeaf4); color: #333; font-size: calc(var(--w) * 0.6); line-height: 1; border: 3px solid #fff; }
.mm-face img { width: 82%; height: 82%; object-fit: contain; }
.mm-card.done .mm-face { background: linear-gradient(180deg, #fff, #d5fbf6); }
.mm-card.done .mm-in { animation: mm-hop 0.5s ease-out; }
.mm-card .mm-tag { position: absolute; left: 0; right: 0; bottom: 3px; text-align: center; font-size: calc(var(--w) * 0.16); font-weight: 900; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.8); transform: rotateY(180deg); backface-visibility: hidden; -webkit-backface-visibility: hidden; }
@keyframes mm-hop { 0% { margin-top: 0; } 40% { margin-top: -10px; } 100% { margin-top: 0; } }
.mm-card[aria-disabled="true"] { cursor: default; }
.mm-over { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; background: rgba(20,12,40,0.88); text-align: center; padding: 16px; }
.mm-over[hidden] { display: none; }
.mm-over { animation: mm-fade 0.4s 0.9s both; }
@keyframes mm-fade { from { opacity: 0; } to { opacity: 1; } }
`;

// Fisher-Yates shuffle of two of each face.
function shuffledDeck() {
  const deck = [];
  for (let i = 0; i < PAIRS; i++) deck.push(i, i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function validShared(s) {
  return s && Array.isArray(s.deck) && s.deck.length === CARDS && s.deck.every(n => Number.isInteger(n) && n >= 0 && n < PAIRS)
    && s.matched && typeof s.matched === 'object' && Array.isArray(s.flipped) && s.flipped.length <= 2
    && s.scores && typeof s.scores === 'object' && Number.isFinite(s.game);
}

export default {
  id: 'memory',
  name: 'Memory Match',
  emoji: '🃏',
  blurb: 'Find the matching pairs. Take turns, or go solo for fewest moves.',
  minPlayers: 1,
  maxPlayers: MAX_PLAYERS,
  needsFace: false,

  create(api) {
    // --- dom -------------------------------------------------------------
    const root = document.createElement('div');
    root.className = 'mm';
    const style = document.createElement('style');
    style.textContent = CSS;
    const head = document.createElement('div');
    head.className = 'mm-head';
    const statusEl = document.createElement('div');
    statusEl.className = 'mm-status';
    const area = document.createElement('div');
    area.className = 'mm-area';
    const grid = document.createElement('div');
    grid.className = 'mm-grid';
    const over = document.createElement('div');
    over.className = 'mm-over';
    over.hidden = true;
    const overText = document.createElement('div');
    overText.className = 'g-big';
    const overSub = document.createElement('div');
    overSub.className = 'muted';
    const again = document.createElement('button');
    again.className = 'btn aqua';
    again.textContent = 'Play again';
    over.append(overText, overSub, again);
    area.append(grid, over);
    root.append(style, head, area);
    api.el.append(root);

    const cards = [];
    for (let i = 0; i < CARDS; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mm-card';
      const inner = document.createElement('span');
      inner.className = 'mm-in';
      const back = document.createElement('span');
      back.className = 'mm-back';
      const face = document.createElement('span');
      face.className = 'mm-face';
      const tag = document.createElement('span');
      tag.className = 'mm-tag';
      face.append(tag);
      inner.append(back, face);
      b.append(inner);
      b.addEventListener('click', () => flip(i));
      grid.append(b);
      cards.push({ b, back, face, tag, sym: -1, art: null, backArt: null });
    }

    // --- state -----------------------------------------------------------
    const best = { moves: api.store.get('best', 0) };
    let prev = null;          // last shared state drawn, for sound cues
    let announced = -1;       // game whose end was already celebrated
    let timer = 0, laterTimer = 0, destroyed = false;
    let lastSig = '';

    const sharedNow = () => {
      const s = api.shared();
      return validShared(s) ? s : null;
    };
    const seated = () => api.players().slice(0, MAX_PLAYERS);
    const nameOf = id => api.players().find(p => p.id === id)?.name ?? 'Player';
    const isOver = s => Object.keys(s.matched).length >= CARDS;

    // Player after `id` in turn order (wraps; falls back to the first player).
    function nextPlayer(id) {
      const ids = seated().map(p => p.id);
      const at = ids.indexOf(id);
      return ids[(at + 1) % ids.length] ?? ids[0];
    }

    function freshShared(game) {
      const ids = seated().map(p => p.id);
      return {
        deck: shuffledDeck(), matched: {}, flipped: [], turn: ids[0] ?? api.me.id,
        scores: {}, moves: 0, game, flipBackAt: 0,
      };
    }

    // --- owner logic -------------------------------------------------------
    // Keeps the shared state healthy and finishes a mismatch when its time is up.
    function ownerTick() {
      if (!api.isOwner()) return;
      let s = sharedNow();
      if (!s) { api.setShared(freshShared(1)); return; }
      const ids = seated().map(p => p.id);
      if (isOver(s)) return;
      // The player whose turn it was left (or was never seated): pass the turn.
      if (!ids.includes(s.turn)) {
        api.setShared({ ...s, turn: ids[0] ?? s.turn, flipped: s.flipped.length === 2 ? s.flipped : [], flipBackAt: s.flipped.length === 2 ? s.flipBackAt : 0 });
        return;
      }
      if (s.flipped.length === 2 && s.flipBackAt && Date.now() >= s.flipBackAt) {
        api.setShared({ ...s, flipped: [], flipBackAt: 0, turn: nextPlayer(s.turn) });
      }
    }

    function applyFlip(by, i, game) {
      const s = sharedNow();
      if (!s || game !== s.game || isOver(s) || s.turn !== by || !seated().some(p => p.id === by)) return;
      if (!Number.isInteger(i) || i < 0 || i >= CARDS || s.matched[i] !== undefined || s.flipped.includes(i) || s.flipped.length >= 2) return;
      if (s.flipped.length === 0) {
        api.setShared({ ...s, flipped: [i] });
        return;
      }
      const j = s.flipped[0];
      if (s.deck[i] === s.deck[j]) {
        // A pair: it is yours and you go again.
        api.setShared({
          ...s, flipped: [], flipBackAt: 0, moves: s.moves + 1,
          matched: { ...s.matched, [i]: by, [j]: by },
          scores: { ...s.scores, [by]: (s.scores[by] || 0) + 1 },
        });
      } else {
        api.setShared({ ...s, flipped: [j, i], moves: s.moves + 1, flipBackAt: Date.now() + SHOW_MISS });
      }
    }

    api.on('flip', (d, from) => {
      if (api.isOwner() && d) applyFlip(from, d.i, d.game);
    });
    api.on('again', (d, from) => {
      const s = sharedNow();
      if (api.isOwner() && s && d && d.game === s.game && isOver(s) && seated().some(p => p.id === from)) api.setShared(freshShared(s.game + 1));
    });

    function flip(i) {
      const s = sharedNow();
      if (!s || isOver(s) || s.turn !== api.me.id || s.flipped.length >= 2 || s.matched[i] !== undefined || s.flipped.includes(i)) return;
      if (api.isOwner()) applyFlip(api.me.id, i, s.game);
      else api.send('flip', { i, game: s.game });
    }

    function playAgain() {
      const s = sharedNow();
      if (!s || !isOver(s) || !seated().some(p => p.me)) return;
      if (api.isOwner()) api.setShared(freshShared(s.game + 1));
      else api.send('again', { game: s.game });
    }
    again.addEventListener('click', playAgain);

    // --- drawing -------------------------------------------------------------
    function imgEl(art) {
      const im = document.createElement('img');
      im.src = art.src;
      im.alt = '';
      im.draggable = false;
      return im;
    }

    function setFace(c, sym) {
      c.sym = sym;
      c.art = api.img(FACES[sym].img);
      c.face.replaceChildren(c.tag);
      if (c.art) c.face.prepend(imgEl(c.art));
      else c.face.prepend(document.createTextNode(FACES[sym].e));
    }

    // Updates the cards in place so the CSS flip transition plays.
    function update() {
      const s = sharedNow();
      let later = false;
      const backArt = api.img('card-back');
      const players = seated();
      const solo = players.length === 1;

      if (!s) return;
      for (let i = 0; i < CARDS; i++) {
        const c = cards[i];
        const sym = s.deck[i];
        const up = s.matched[i] !== undefined || s.flipped.includes(i);
        // A new shuffle: turn the card down first, then change its face.
        if (c.sym !== sym) {
          if (c.b.classList.contains('up')) {
            c.b.classList.remove('up');
            later = true;
            continue;
          }
          setFace(c, sym);
        } else if (!c.art && api.img(FACES[sym].img)) setFace(c, sym);   // art just arrived
        if (c.backArt !== backArt) {
          c.backArt = backArt;
          c.back.replaceChildren(...(backArt ? [imgEl(backArt)] : []));
        }
        c.b.classList.toggle('up', up);
        c.b.classList.toggle('done', s.matched[i] !== undefined);
        const owner = s.matched[i];
        c.tag.textContent = owner !== undefined && players.length > 1 ? (owner === api.me.id ? 'you' : nameOf(owner)) : '';
        const mine = s.turn === api.me.id && !isOver(s) && s.flipped.length < 2;
        c.b.setAttribute('aria-disabled', mine && !up ? 'false' : 'true');
        c.b.setAttribute('aria-label', up ? `Card ${i + 1}: ${FACES[sym].e}` : `Card ${i + 1}, face down`);
      }
      if (later && !laterTimer) {
        laterTimer = setTimeout(() => { laterTimer = 0; lastSig = ''; update(); }, 500);
      }

      // Header: a chip per player with their pairs, and whose turn it is.
      const over_ = isOver(s);
      const sig = JSON.stringify([players.map(p => [p.id, p.name, s.scores[p.id] || 0]), s.turn, s.moves, over_, best.moves]);
      if (sig !== head.dataset.sig) {
        head.dataset.sig = sig;
        head.replaceChildren();
        if (!solo) {
          for (const p of players) {
            const chip = document.createElement('div');
            chip.className = 'mm-chip' + (!over_ && s.turn === p.id ? ' turn' : '');
            chip.style.color = p.color || '';
            const nm = document.createElement('span');
            nm.textContent = p.me ? 'You' : p.name;
            const pts = document.createElement('b');
            pts.textContent = String(s.scores[p.id] || 0);
            chip.append(nm, pts);
            head.append(chip);
          }
        }
        statusEl.textContent = over_ ? '' : solo
          ? `Moves: ${s.moves}${best.moves ? ` · Best: ${best.moves}` : ''}`
          : `${s.turn === api.me.id ? 'Your turn!' : `${nameOf(s.turn)}'s turn`} · Moves: ${s.moves}`;
        head.append(statusEl);
      }

      // Game over: winner banner (or the solo result) and Play again.
      over.hidden = !over_;
      if (over_) {
        let text, sub;
        if (solo) {
          text = `Cleared in ${s.moves} moves!`;
          sub = best.moves ? (s.moves <= best.moves ? 'New best!' : `Best: ${best.moves} moves`) : '';
        } else {
          const top = Math.max(...players.map(p => s.scores[p.id] || 0));
          const winners = players.filter(p => (s.scores[p.id] || 0) === top);
          text = winners.length > 1 ? `Tie: ${winners.map(p => (p.me ? 'You' : p.name)).join(' & ')}`
            : winners[0].me ? 'You win! 🎉' : `${winners[0].name} wins!`;
          sub = `${top} pairs in ${s.moves} moves`;
        }
        overText.textContent = text;
        overSub.textContent = sub;
        again.hidden = !players.some(p => p.me);
      }
    }

    // Sound cues and records, by comparing with what was drawn last time.
    function cues() {
      const s = sharedNow();
      if (!s) return;
      if (prev && prev.game === s.game) {
        const nowMatched = Object.keys(s.matched).length, wasMatched = Object.keys(prev.matched).length;
        if (nowMatched > wasMatched) api.sfx('score');
        else if (s.flipped.length > prev.flipped.length) api.sfx(s.flipped.length === 2 ? 'miss' : 'click');
      }
      if (isOver(s) && announced !== s.game) {
        announced = s.game;
        const joinedLate = !prev || prev.game !== s.game;
        const players = seated();
        if (players.length === 1 && players[0].me) {
          if (!best.moves || s.moves < best.moves) {
            best.moves = s.moves;
            api.store.set('best', s.moves);
          }
        }
        if (!joinedLate) {
          const top = Math.max(...players.map(p => s.scores[p.id] || 0));
          if (players.length === 1 || (s.scores[api.me.id] || 0) === top) api.sfx('win');
          else api.sfx('lose');
        }
      }
      prev = s;
    }

    function refresh() {
      cues();
      update();
    }

    // --- layout --------------------------------------------------------------
    // Four columns on tall panels, five on wide ones: whichever gives bigger cards.
    function layout() {
      const r = area.getBoundingClientRect();
      const W = Math.max(1, r.width - 12), H = Math.max(1, r.height - 12);
      let pick = null;
      for (const cols of [5, 4]) {
        const rows = CARDS / cols;
        const gap = Math.max(4, Math.min(W, H) * 0.02);
        const cw = Math.max(20, Math.min((W - gap * (cols - 1)) / cols, ((H - gap * (rows - 1)) / rows) / 1.375));
        if (!pick || cw > pick.cw) pick = { cols, cw, gap };
      }
      grid.style.gridTemplateColumns = `repeat(${pick.cols}, auto)`;
      grid.style.setProperty('--gap', `${pick.gap}px`);
      for (const c of cards) c.b.style.setProperty('--w', `${Math.floor(pick.cw)}px`);
    }
    const ro = new ResizeObserver(layout);
    ro.observe(area);
    layout();

    // Cards flip back on a timer owned by whoever is owner right now.
    timer = setInterval(() => {
      if (destroyed) return;
      ownerTick();
      // Images may be delivered while playing; redraw if the sources changed.
      const sig = FACES.map(f => (api.img(f.img) ? 1 : 0)).join('') + (api.img('card-back') ? 1 : 0);
      if (sig !== lastSig) { lastSig = sig; update(); }
    }, 100);

    ownerTick();
    refresh();

    return {
      destroy() {
        destroyed = true;
        clearInterval(timer);
        clearTimeout(laterTimer);
        ro.disconnect();
      },
      onChange() {
        ownerTick();
        refresh();
      },
    };
  },
};
