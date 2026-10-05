// Act I — The Crossing. The voyage (board.js), then the ending from
// design/acts.md: land ho, a celebration on the deck set, the witch's turn,
// the wreck and the sinking guitar. Headless: drawing is in act1-art.js.
import { createBoard, step as stepBoard, LEAVES, TUNING } from '../board.js';
import { BEAT_WINDOW, beatHit } from './shared.js';
import * as art from './act1-art.js';

// Ending timeline, seconds per phase.
export const ENDING = { landho: 3, party: 15, turn: 6, wreck: 6.5, sink: 4.5, iris: 1.4 };
export const LANTERNS = 8; // paper lanterns lit on the beat during the party

const ORDER = ['landho', 'party', 'turn', 'wreck', 'sink', 'iris'];

// Scenes, for checkpoints and the scene select. Scenes 1-3 begin just past
// each tea leaf (where it floats by, at TUNING.keepsakeAt).
export const SCENES = [
  { name: 'Setting Sail' },
  { name: 'Toward the Second Leaf', progress: 0.25 },
  { name: 'Toward the Third Leaf', progress: 0.53 },
  { name: 'The Last Stretch', progress: 0.81 },
  { name: 'The Celebration' },
  { name: "The Witch's Turn" },
];

export default {
  id: 1, key: 'crossing', kicker: 'Act I', title: 'The Crossing', size: 130,
  sub: 'The witch will turn the wind.\nGather the three tea leaves for the reading.',
  action: 'A: leap',
  scenes: SCENES,

  // `from` (optional): { scene } to start at a scene, plus the fields of a
  // checkpoint this act made (progress, leaves, spawned, score, pearls).
  create({ seed, from = null }) {
    const st = {
      board: createBoard(seed), phase: 'voyage', phaseT: 0,
      status: 'play', statusT: 0, events: [], result: null,
      party: { lit: 0, beats: new Set(), revelry: false },
      witchAt: null, checkpoint: null,
    };
    const k = from?.scene | 0;
    if (k <= 0) return st;
    const b = st.board;
    // Leaves gathered before this scene count as gathered.
    b.leaves = from.leaves ?? Math.min(k, LEAVES);
    b.keepsakesSpawned = from.spawned ?? Math.min(k, LEAVES);
    b.score = from.score ?? b.leaves * 100;
    b.pearls = from.pearls ?? 0;
    if (k <= 3) {
      b.progress = from.progress ?? SCENES[k].progress;
      b.wind.next = TUNING.wind.first; // a calm few seconds to settle in
    } else {
      b.progress = 1; b.phase = 'done'; b.ship.x = 560; b.pickups = [];
      st.phase = k === 4 ? 'party' : 'turn';
      if (k === 4) st.events.push({ type: 'cheer' });
      else st.events.push({ type: 'spirits' });
    }
    st.checkpoint = { ...from, scene: k };
    return st;
  },

  step(st, dt, input) {
    st.statusT += dt;
    st.beat = input.beat;
    if (st.status !== 'play') return;
    st.phaseT += dt;
    const b = st.board;

    if (st.phase === 'voyage') {
      stepBoard(b, dt, { moveX: input.moveX, rowUp: input.up, rowDown: input.down, leap: input.a });
      // Each tea leaf gathered is a checkpoint: a retry starts just past it.
      if (b.events.some((e) => e.type === 'keepsake')) {
        st.checkpoint = { scene: Math.min(3, b.keepsakesSpawned), progress: b.progress, leaves: b.leaves, spawned: b.keepsakesSpawned, score: b.score, pearls: b.pearls };
      }
      st.events.push(...b.events); b.events.length = 0;
      if (b.phase === 'wrecked' && b.phaseT > 2.2) { st.status = 'lost'; st.statusT = 0; }
      if (b.phase === 'done') next(st);
      return;
    }
    // The stage keeps scrolling gently behind the ending.
    stepBoard(b, dt, {}); b.events.length = 0;

    if (st.phase === 'party') {
      if (input.a && st.party.lit < LANTERNS) {
        const k = beatHit(input.beat, BEAT_WINDOW);
        if (k != null && !st.party.beats.has(k)) {
          st.party.beats.add(k);
          st.party.lit++;
          st.events.push({ type: 'partyHit', n: st.party.lit });
          if (st.party.lit === LANTERNS) { st.party.revelry = true; b.score += 200; st.events.push({ type: 'revelry' }); }
        }
      }
    }
    if (st.phase === 'turn' && st.phaseT >= 2.4 && !st.struck) { st.struck = true; st.events.push({ type: 'strike' }); }
    if (st.phase === 'turn') st.witchAt = { x: 900, y: 170 };
    if (st.phase === 'wreck' && st.phaseT >= 3 && !st.broken) { st.broken = true; st.events.push({ type: 'shipBreak' }); }
    if (st.phase === 'wreck' && st.phaseT >= 4.6 && !st.splashed) { st.splashed = true; st.witchAt = { x: 1500, y: 150 }; st.events.push({ type: 'splash' }); }

    if (st.phaseT >= ENDING[st.phase]) next(st);
  },

  hud(st) {
    const b = st.board;
    const leaves = Array.from({ length: LEAVES }, (_, i) => ({ id: 'leaf', have: i < b.leaves }));
    if (st.phase === 'voyage' || st.phase === 'landho') {
      return { lanterns: b.ship.hull, maxLanterns: 3, pearls: b.pearls, progress: b.progress, keepsakes: leaves,
        wind: st.phase === 'voyage' ? { dir: b.wind.dir, warn: b.wind.warn } : null };
    }
    if (st.phase === 'party') return { lanterns: b.ship.hull, maxLanterns: 3, pearls: b.pearls, progress: null, keepsakes: leaves };
    return null;
  },

  announce(e) {
    if (e.type === 'hit') return `Hit. ${e.hull} lantern${e.hull === 1 ? '' : 's'} left.`;
    if (e.type === 'keepsake') return `Tea leaf ${e.n} of 3.`;
    if (e.type === 'windWarn') return e.to > 0 ? 'The wind is turning behind you.' : 'The wind is turning against you.';
    if (e.type === 'arrive') return "Widow's Bay in sight.";
    if (e.type === 'cheer') return 'A celebration on deck! Press A on the beat to light the lanterns.';
    if (e.type === 'revelry') return 'Every lantern lit.';
    if (e.type === 'strike') return 'The witch strikes the mast.';
    if (e.type === 'shipBreak') return 'The ship breaks apart.';
    return null;
  },

  draw: art.draw, drawOver: art.drawOver, onEvent: art.onEvent,
};

function next(st) {
  const i = st.phase === 'voyage' ? 0 : ORDER.indexOf(st.phase) + 1;
  if (i >= ORDER.length) {
    const b = st.board;
    st.status = 'won'; st.statusT = 0;
    st.result = { keepsakes: { tea: b.leaves }, score: b.score, pearls: b.pearls, revelry: st.party.revelry };
    return;
  }
  st.phase = ORDER[i]; st.phaseT = 0;
  const b = st.board;
  if (st.phase === 'party' || st.phase === 'turn') {
    st.checkpoint = { scene: st.phase === 'party' ? 4 : 5, leaves: b.leaves, spawned: b.keepsakesSpawned, score: b.score, pearls: b.pearls };
  }
  if (st.phase === 'landho') st.events.push({ type: 'landho' });
  if (st.phase === 'party') st.events.push({ type: 'cheer' });
  if (st.phase === 'turn') st.events.push({ type: 'spirits' });
  if (st.phase === 'sink') st.events.push({ type: 'guitarSink' });
}
