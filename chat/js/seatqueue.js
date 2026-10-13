// Two-seat games (Connect Four, Battleship, Air Hockey): who plays next.
// Anyone may join a session; the first two sit down and everyone else waits
// in line. The owner keeps the line-up in shared state:
//
//   seats: [id | null, id | null]   who plays (seat 0, seat 1)
//   q:     [id, ...]                 the watchers, longest-waiting first
//   sat:   [stamp, stamp]            when each seat's player sat down
//
// When a player leaves, the front of the line takes their seat. After a game,
// if someone is waiting, the winner stays on, the loser goes to the back of
// the line and the front of the line sits down (after a draw, whoever has sat
// longest makes way). Everything here is pure, so the owner's decision can be
// tested on its own and every client draws the same line.

export const MAX_QUEUE = 32;
const isId = v => typeof v === 'string' && v.length > 0 && v.length <= 64;

// A line-up from untrusted shared state: seats are ids or null (never the
// same id twice), the queue holds distinct ids that are not seated, and sat
// is two finite numbers.
export function readLineup(s) {
  const raw = Array.isArray(s?.seats) ? s.seats : [];
  const seats = [isId(raw[0]) ? raw[0] : null, isId(raw[1]) ? raw[1] : null];
  if (seats[0] && seats[0] === seats[1]) seats[1] = null;
  const q = [];
  for (const id of Array.isArray(s?.q) ? s.q.slice(0, MAX_QUEUE * 2) : []) {
    if (isId(id) && !seats.includes(id) && !q.includes(id) && q.length < MAX_QUEUE) q.push(id);
  }
  const sat = Array.isArray(s?.sat) && s.sat.length === 2 && s.sat.every(Number.isFinite) ? [s.sat[0], s.sat[1]] : [0, 0];
  return { seats, q, sat };
}

// Matches a line-up to the people present (`ids`, in the order they joined):
// players who left lose their seat or their place, newcomers join the back of
// the line, and an empty seat goes to the front of the line. A seat filled
// here gets `stamp` as its sat time. Returns a new line-up and whether
// anything changed.
export function syncSeats(lineup, ids, stamp = Date.now()) {
  const here = new Set(ids);
  const seats = lineup.seats.map(id => (id && here.has(id) ? id : null));
  const q = lineup.q.filter(id => here.has(id) && !seats.includes(id));
  for (const id of ids) if (!seats.includes(id) && !q.includes(id) && q.length < MAX_QUEUE) q.push(id);
  const sat = lineup.sat.slice();
  for (let i = 0; i < 2; i++) {
    if (seats[i] || !q.length) continue;
    seats[i] = q.shift();
    sat[i] = stamp;
  }
  const changed = seats[0] !== lineup.seats[0] || seats[1] !== lineup.seats[1]
    || q.join('\n') !== lineup.q.join('\n') || sat[0] !== lineup.sat[0] || sat[1] !== lineup.sat[1];
  return { seats, q, sat, changed };
}

// The seat that makes way after a game: the loser's, or after a draw
// (winner -1) the one whose player has sat longest (seat 0 on a tie).
export function seatOut(lineup, winner) {
  if (winner === 0 || winner === 1) return 1 - winner;
  return lineup.sat[1] < lineup.sat[0] ? 1 : 0;
}

// After a game: with nobody waiting the line-up stays as it is (swap null).
// Otherwise the player in seatOut() goes to the back of the line and the
// front of the line takes that seat. swap: { seat, out, in }.
export function rotateSeats(lineup, winner, stamp = Date.now()) {
  const seats = lineup.seats.slice(), q = lineup.q.slice(), sat = lineup.sat.slice();
  if (!q.length || !seats[0] || !seats[1]) return { seats, q, sat, swap: null };
  const seat = seatOut(lineup, winner);
  const out = seats[seat], next = q.shift();
  seats[seat] = next;
  sat[seat] = stamp;
  q.push(out);
  return { seats, q, sat, swap: { seat, out, in: next } };
}

// 1st, 2nd, 3rd, 4th ... 11th, 12th, 13th, 21st.
export function ordinal(n) {
  const t = n % 100;
  const suffix = t >= 11 && t <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th';
  return `${n}${suffix}`;
}

// A watcher's place in line (0 = next), as shown to them: "You're up next",
// "2nd in line", ...; '' when they are not in the line.
export function queueLabel(place) {
  if (!Number.isInteger(place) || place < 0) return '';
  return place === 0 ? 'You’re up next' : `${ordinal(place + 1)} in line`;
}

// What everyone is told about a swap, from `me`'s point of view.
export function swapText(swap, me, nameOf) {
  if (!swap) return '';
  if (swap.in === me) return `You’re in! You take ${nameOf(swap.out)}’s seat.`;
  if (swap.out === me) return `${nameOf(swap.in)} takes your seat: you’re back in line.`;
  return `${nameOf(swap.in)} takes ${nameOf(swap.out)}’s seat.`;
}
