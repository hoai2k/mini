import { precisionFactor } from './rhythm.js';

// Battle simulation. Pure and deterministic: the renderer reads the state and
// the events, it never changes them. Two clocks drive it: the army acts on the
// player's own beats (stepArmy, four per order), and the Han act on the steady
// beat of their war drum (stepEnemies, at the chapter's tempo). Times are
// seconds on the game clock.

export const ENEMY_TYPES = {
  target: { hp: 30, goal: true, faction: 'straw' },
  spear: { hp: 30, goal: false, faction: 'han' },
  crossbow: { hp: 20, goal: false, faction: 'han' },
  fort: { hp: 200, goal: true, faction: 'han' },
};

const MELEE_REACH = 3;
const ARCHER_REACH = 12;
const CONTACT_GAP = 1.5;
// The guard: shields thrown up against a blow, timed to the blow itself and
// separate from the drum (it neither reads nor changes the rhythm). Raised
// within `window` seconds before a blow lands it takes most of it; within
// `perfect` seconds, nearly all. Then a moment to recover.
export const GUARD = { window: 0.5, perfect: 0.2, good: 0.35, best: 0.1, recover: 0.45 };
const SPEAR_HIT = 1.5; // every 2 Han beats in contact
const BOLT_VOLLEY = 1.5; // every 4 Han beats in range
const FORT_VOLLEY = 2.25;

export function createBattle(stage) {
  let id = 0;
  return {
    stage: stage.id,
    elephant: stage.elephant,
    army: { x: 0, troops: stage.troops, maxTroops: stage.troops },
    enemies: stage.enemies.map((e) => {
      const type = ENEMY_TYPES[e.type];
      const hp = e.hp ?? type.hp;
      return { id: id++, type: e.type, x: e.x, hp, maxHp: hp, goal: type.goal, cooldown: 0, alive: true };
    }),
    order: null, // { command, power, beat (0..3), flourishes, u }
    guardAt: -Infinity, // when the guard was last raised (seconds)
    guardReadyAt: 0,
    time: 0,
    tick: 0, // Han beats so far
    outcome: null, // 'won' | 'lost'
  };
}

/**
 * Power of a command: its evenness (accuracy 0..1 gives ×0.72..×1), its tier
 * (×1, ×1.4, ×1.96) and the drum's spirit (×1.5).
 */
export function commandPower(accuracy, spirit, tierPower = 1) {
  return precisionFactor(accuracy) * tierPower * (spirit ? 1.5 : 1);
}

/**
 * Slower drumming gives fewer orders per second while the Han keep their own
 * beat, so an order's power scales with the beat's length: the army does the
 * same work per second at any tempo. 0.6 s per beat (100 BPM) is ×1.
 */
export function tempoFactor(u) {
  return Math.min(2, Math.max(0.55, u / 0.6));
}

/** Give the army an order for its next four beats; u is the player's beat length. */
export function issueOrder(state, command, power, u = 0.6) {
  state.order = { command, power, beat: 0, flourishes: 0, u };
}

export function addFlourish(state) {
  if (state.order) state.order.flourishes += 1;
}

function living(state) {
  return state.enemies.filter((e) => e.alive);
}

/** The nearest living enemy ahead of the army; the army cannot pass it. */
export function blocker(state) {
  let best = null;
  for (const e of living(state)) if (!best || e.x < best.x) best = e;
  return best;
}

function advance(state, dist) {
  const b = blocker(state);
  const limit = b ? b.x - CONTACT_GAP : Infinity;
  state.army.x = Math.min(state.army.x + dist, Math.max(state.army.x, limit));
}

function damage(state, enemy, amount, events, source) {
  const dealt = Math.min(enemy.hp, amount);
  enemy.hp -= dealt;
  events.push({ type: 'damage', target: enemy.id, amount: dealt, source, x: enemy.x });
  if (enemy.hp <= 0) {
    enemy.alive = false;
    events.push({ type: 'defeated', target: enemy.id, enemy: enemy.type, x: enemy.x });
  }
}

function hurtArmy(state, amount, events, source) {
  const lead = state.time - state.guardAt; // how long before the blow the guard went up
  const block = lead >= 0 && lead <= GUARD.window ? (lead <= GUARD.perfect ? 'perfect' : 'good') : null;
  const dealt = amount * (block === 'perfect' ? GUARD.best : block === 'good' ? GUARD.good : 1);
  state.army.troops = Math.max(0, state.army.troops - dealt);
  events.push({ type: 'wound', amount: dealt, shielded: !!block, block, source });
}

function runOrder(state, events) {
  const o = state.order;
  if (!o) return;
  const p = o.power * (1 + 0.1 * o.flourishes);
  const front = state.army.x;
  switch (o.command) {
    case 'march':
      advance(state, 2 * o.power);
      break;
    case 'strike':
      if (o.beat === 1 || o.beat === 3) {
        const near = living(state).filter((e) => e.x - front <= MELEE_REACH + CONTACT_GAP);
        const melee = near.sort((a, b) => a.x - b.x)[0];
        if (melee) damage(state, melee, 12 * p, events, 'spear');
        const shot = blocker(state);
        if (shot && shot.x - front <= ARCHER_REACH) {
          events.push({ type: 'volley', from: front - 3, to: shot.x });
          damage(state, shot, 6 * p, events, 'arrow');
        }
      }
      break;
    case 'rally':
      if (o.beat === 1 || o.beat === 3) {
        const before = state.army.troops;
        state.army.troops = Math.min(state.army.maxTroops, before + 5 * p);
        events.push({ type: 'rally', amount: state.army.troops - before });
      }
      break;
    case 'charge':
      if (!state.elephant) break;
      if (o.beat < 3) advance(state, 2 * o.power);
      else {
        events.push({ type: 'trample', x: state.army.x });
        for (const e of living(state)) {
          if (e.x - state.army.x <= 5) damage(state, e, (e.type === 'fort' ? 60 : 30) * p, events, 'elephant');
        }
      }
      break;
  }
  o.beat += 1;
  if (o.beat >= 4) state.order = null;
}

function runEnemies(state, events) {
  const front = state.army.x;
  for (const e of living(state)) {
    const dist = e.x - front;
    e.cooldown = Math.max(0, e.cooldown - 1);
    const inReach =
      (e.type === 'spear' && dist <= CONTACT_GAP + 0.6) ||
      (e.type === 'crossbow' && dist <= 14) ||
      (e.type === 'fort' && dist <= 13);
    if (inReach && !e.engaged) {
      // A beat of wind-up before the first blow, so the warning shows.
      e.engaged = true;
      e.cooldown = Math.max(e.cooldown, 1);
      continue;
    }
    if (e.type === 'spear') {
      if (dist <= CONTACT_GAP + 0.6) {
        if (e.cooldown === 0) {
          hurtArmy(state, SPEAR_HIT, events, e.id);
          e.cooldown = 2;
        }
      } else if (dist <= 18) {
        const ahead = living(state).filter((o) => o !== e && o.x < e.x && o.x > front);
        const stop = ahead.length ? Math.max(...ahead.map((o) => o.x)) + 0.9 : front + CONTACT_GAP;
        e.x = Math.max(stop, e.x - 0.8);
      }
    } else if ((e.type === 'crossbow' && dist <= 14) || (e.type === 'fort' && dist <= 13)) {
      if (e.cooldown === 0) {
        events.push({ type: 'bolts', from: e.x, to: front, enemy: e.type });
        hurtArmy(state, e.type === 'fort' ? FORT_VOLLEY : BOLT_VOLLEY, events, e.id);
        e.cooldown = 4;
      }
    }
  }
}

/** Raise the guard at time t. Returns false while the army is still recovering. */
export function guard(state, time) {
  if (state.outcome || time < state.guardReadyAt) return false;
  state.guardAt = time;
  state.guardReadyAt = time + GUARD.window + GUARD.recover;
  return true;
}

/** Whether the shields are up at time t: for the guard's window after it is raised. */
export function shieldsUp(state, time = state.time) {
  const lead = time - state.guardAt;
  return lead >= 0 && lead <= GUARD.window;
}

/** Han who will strike on their next beat: the warning the guard answers. */
export function aboutToAttack(state) {
  const front = state.army.x;
  return state.enemies.filter((e) => {
    if (!e.alive || e.cooldown > 1) return false;
    const dist = e.x - front;
    if (e.type === 'spear') return dist <= CONTACT_GAP + 0.6;
    if (e.type === 'crossbow') return dist <= 14;
    if (e.type === 'fort') return dist <= 13;
    return false;
  });
}

function checkOutcome(state, events) {
  if (state.outcome) return;
  if (state.enemies.filter((e) => e.goal).every((e) => !e.alive)) state.outcome = 'won';
  else if (state.army.troops <= 0) state.outcome = 'lost';
  if (state.outcome) events.push({ type: 'outcome', outcome: state.outcome });
}

/** One of the army's beats, at the player's tempo. */
export function stepArmy(state, time = state.time) {
  const events = [];
  if (state.outcome) return events;
  state.time = Math.max(state.time, time);
  runOrder(state, events);
  checkOutcome(state, events);
  return events;
}

/** One beat of the Han war drum. */
export function stepEnemies(state, time = state.time) {
  const events = [];
  if (state.outcome) return events;
  state.time = Math.max(state.time, time);
  runEnemies(state, events);
  state.tick += 1;
  checkOutcome(state, events);
  return events;
}
