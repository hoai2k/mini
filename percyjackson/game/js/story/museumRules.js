// Chapter 1, the museum (objectives/museum.js runs it): the rules, kept pure
// so the node tests load them.
//
//   calm     you walk the galleries with no fighting. The people milling
//            about are in the Mist; some are monsters in disguise, and they
//            leave you alone. Mrs. Dodds waits in the Greek gallery.
//   reveal   the moment a hero first sees her: the Mist lifts on its own,
//            she turns into the Fury and tells you how to see through it,
//            naming the button of the device you play with.
//   hostile  from then on every disguised monster in the museum comes for
//            the heroes, a few at a time. Under the Mist they look like
//            ordinary people and can't be hurt, but their hits still land;
//            under True Sight they are monsters and can be fought.
// Before the reveal a hero who already knows the trick can turn True Sight
// on and fight them early: they fight back once attacked, and the ones
// killed stay gone. Mrs. Dodds fights in her room; three times, as her
// health crosses a threshold, she lets out a paralyzing shriek and flies off
// to another room, where the heroes must find her.
import { PAD_LABEL, KEY_LABEL } from '../padmap.js';

export const PHASES = ['calm', 'reveal', 'hostile'];
export const phaseAfter = (ph) => PHASES[Math.min(PHASES.length - 1, PHASES.indexOf(ph) + 1)];

// ---------------------------------------------------------------- spotting her
export const SEE_DIST = 13;      // a hero this close with a clear view sees her (or anyone in her room)
export const FIND_DIST = 9;      // after a flight: this close (with a view) and she turns to fight
export const sees = ({ dist, los, inRoom }) => !!inRoom || (dist <= SEE_DIST && !!los);
export const finds = ({ dist, los, inRoom }) => (dist <= FIND_DIST && !!los) || (!!inRoom && dist <= SEE_DIST);

// ---------------------------------------------------------------- the reveal
export const BEAT = 11;          // seconds of the reveal: she changes and talks; nobody fights yet
export const BEAT_LINES = [[0.5, 2.9], [3.5, 3.4], [7.0, 3.9]];   // her three lines: [starts at, stays up] (s)

// ---------------------------------------------------------------- the people in the Mist
// Under the Mist (True Sight off where they stand) a disguised monster looks
// like a person and can't be hurt; with True Sight on it is a monster that
// can be fought. Hostile: after the reveal, or provoked (hit) before it.
export function foeState({ phase, provoked = false, sight = false }) {
  const hostile = phase === 'hostile' || !!provoked;
  return { look: sight ? 'monster' : 'person', hurtable: !!sight, hostile, hiddenAttacks: hostile && !sight };
}
// Hits from people you can't see: at most one on a hero every HIDDEN_GAP s
// (the attack tokens of the Mist), so a crowd round you is eerie, not a blender.
export const HIDDEN_GAP = 0.9;
export const hiddenHitAllowed = (lastT, now) => lastT == null || now - lastT >= HIDDEN_GAP;
export const HIDDEN_DMG = 0.85;  // of the monster's normal hit (they are pretending, after all)
// How many of a room's group are really monsters (the rest are left out:
// spawnMortals adds the real people), by difficulty (1 = Mortal).
export const monsterShare = (diff = 1) => Math.min(0.85, 0.5 + 0.1 * (diff - 1));

// The hunt after the reveal: a group of 2-3 sent every HUNT_EVERY s while
// fewer than huntLimit() hunt the heroes; the nearest first.
export const HUNT_EVERY = 9;
export const HUNT_FIRST = 4;     // the first group after the reveal
export const huntLimit = (diff = 1, humans = 1) => 3 + Math.max(0, diff - 1) + 2 * Math.max(0, humans - 1);
export const huntGroup = (r) => 2 + (r < 0.5 ? 1 : 0);

// ---------------------------------------------------------------- the flights
export const FLIGHT_AT = [0.75, 0.5, 0.25];   // of her health: the shriek, then she flies
export const DODDS_DMG = 0.8;     // her blows here (the first boss of the game, often played alone)
export const STUN = 1.8;          // seconds the shriek paralyzes a hero
export const STUN_IMMUNE = 3;     // seconds after a stun before another can land
export const STUN_WINDUP = 1.3;   // the shriek's wind-up (a purple ring and a rising wail)
export const SHRIEK_R = 6;        // the shriek's reach: a ring to get out of in the wind-up (13 filled the room and the screen)
// The health floor for the next flight (as a fraction), or null after the third.
export const nextFloor = (flights) => (flights < FLIGHT_AT.length ? FLIGHT_AT[flights] : null);
// Hit by a shriek? Not while already held, not while immune, not when down.
export const stunnable = ({ held = false, immuneUntil = 0, now = 0, down = false }) => !held && !down && now >= immuneUntil;

// Where she flies: three different rooms with room to fight in, that the
// heroes can walk to from the start (by open doors; never the secret room
// or a trap), never the room she flies from. The biggest first among those
// nearest her room, then on from each. rooms: [{ type, role, x0, x1, z0,
// z1, links: [{ a, b, kind }], cx, cz }]; from: the index she starts in.
export const MIN_AREA = 120;      // square metres: room to fight round her
export function reachable(rooms, startIdx = 0) {
  const seen = new Set([startIdx]), q = [startIdx];
  while (q.length) {
    const r = rooms[q.shift()];
    for (const l of r.links ?? []) {
      if (l.kind === 'secret') continue;
      const o = rooms.indexOf(l.a === r ? l.b : l.a);
      if (o >= 0 && !seen.has(o)) { seen.add(o); q.push(o); }
    }
  }
  return seen;
}
const area = (r) => (r.x1 - r.x0 + 1) * (r.z1 - r.z0 + 1);
export function flightPlan(rooms, from, n = FLIGHT_AT.length) {
  const start = Math.max(0, rooms.findIndex((r) => r.type === 'start'));
  const can = reachable(rooms, start);
  const ok = (r, i) => can.has(i) && i !== from && r.type !== 'secret' && r.role !== 'trap';
  let pool = rooms.map((r, i) => i).filter((i) => ok(rooms[i], i) && rooms[i].type !== 'start' && area(rooms[i]) >= MIN_AREA);
  if (pool.length < n) pool = [...new Set([...pool, ...rooms.map((r, i) => i).filter((i) => ok(rooms[i], i) && area(rooms[i]) >= 60)])];
  const out = [];
  let at = from;
  while (out.length < n && pool.length) {
    const here = rooms[at];
    // nearest on the grid first (a hunt, not a trek), the bigger room on a tie
    pool.sort((a, b) => (gridDist(here, rooms[a]) - gridDist(here, rooms[b])) || (area(rooms[b]) - area(rooms[a])) || (a - b));
    const next = pool.shift();
    out.push(next); at = next;
  }
  // a tiny level: go back and forth rather than nowhere (never the same room twice in a row)
  const alt = rooms.map((r, i) => i).filter((i) => can.has(i) && rooms[i].type !== 'secret');
  while (out.length < n && alt.length > 1) { const last = out.length ? out[out.length - 1] : from; out.push(alt.find((i) => i !== last)); }
  return out;
}
const gridDist = (a, b) => Math.abs((a.cx ?? 0) - (b.cx ?? 0)) + Math.abs((a.cz ?? 0) - (b.cz ?? 0));

// ---------------------------------------------------------------- moving through the museum
// A hunter far from its hero follows the walkable way (a distance field to
// the hero, ui/tracker.js distanceField): the step to the neighbouring cell
// nearest the goal. Returns [dx, dz] (unit) or null when there is no way.
export function flowDir(field, x, z) {
  if (!field) return null;
  const { d, W, D } = field, cx = Math.floor(x), cz = Math.floor(z);
  const at = (a, b) => (a < 0 || b < 0 || a >= W || b >= D ? Infinity : d[b * W + a]);
  const here = at(cx, cz);
  let best = here, bx = 0, bz = 0;
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dz) continue;
    const v = at(cx + dx, cz + dz) + (dx && dz ? 0.01 : 0);
    if (v < best) { best = v; bx = dx; bz = dz; }
  }
  if (!isFinite(best) || (!bx && !bz)) return null;
  const l = Math.hypot(bx, bz);
  return [bx / l, bz / l];
}

// ---------------------------------------------------------------- what she says
// Plain English, in her voice; the button named for the device being
// played ('kbm', 'touch', 'pad0'...), from padmap.js.
const SIGHT = {
  pad: `click the right stick (${PAD_LABEL.sight})`,
  kbm: `press ${KEY_LABEL.sight}`,
  touch: 'tap the 👁 button',
};
const cap = (s) => s[0].toUpperCase() + s.slice(1);
export const deviceKind = (device = 'kbm') => (String(device).startsWith('pad') ? 'pad' : device === 'touch' ? 'touch' : 'kbm');
export const sightWords = (device) => SIGHT[deviceKind(device)];
export function doddsLine(id, device = 'kbm') {
  const s = sightWords(device);
  switch (id) {
    case 'reveal1': return 'Enough pretending, honey. You’ve been a very bad student.';
    case 'reveal2': return `Your eyes believe the Mist. ${cap(s)} to see what’s really here… and what’s coming for you.`;
    case 'reveal3': return 'With the Mist up my pets look like nice people. They still bite, and you can’t touch them. Now, class is in session!';
    case 'flee1': return 'You’ll have to catch me first, honey!';
    case 'flee2': return 'Hide and seek? I always win.';
    case 'flee3': return 'One more lesson, and it’s your last!';
    case 'found1': return 'Pop quiz!';
    case 'found2': return 'Found me? Lucky guess.';
    case 'found3': return 'No more running. For you.';
    default: return '';
  }
}
// The one-time hint when something you can't see is hurting you.
export function mistHurtHint(device = 'kbm') {
  return `Something you can’t see is hurting you! ${cap(sightWords(device))} for True Sight, then fight back.`;
}
export const GONE = 'She’s gone… find her!';
