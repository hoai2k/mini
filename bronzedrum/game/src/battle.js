// Battle simulation, stepped once per beat. Pure and deterministic: the
// renderer reads the state and the events, it never changes them.

export const ENEMY_TYPES = {
  target: { hp: 30, goal: true, faction: 'straw' },
  spear: { hp: 30, goal: false, faction: 'han' },
  crossbow: { hp: 20, goal: false, faction: 'han' },
  fort: { hp: 200, goal: true, faction: 'han' },
};

const MELEE_REACH = 3;
const ARCHER_REACH = 12;
const CONTACT_GAP = 1.5;
const SHIELD_FACTOR = 0.2;
const SPEAR_HIT = 2; // every 2 beats in contact
const BOLT_VOLLEY = 2; // every 4 beats in range
const FORT_VOLLEY = 3;

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
    order: null, // { command, power, beat (0..3), flourishes }
    shieldUntil: -1,
    beat: 0,
    outcome: null, // 'won' | 'lost'
  };
}

/** Power of a command from its accuracy (0.6..1) and the drum's spirit. */
export function commandPower(accuracy, spirit) {
  return (0.6 + 0.4 * accuracy) * (spirit ? 1.5 : 1);
}

export function issueOrder(state, command, power) {
  state.order = { command, power, beat: 0, flourishes: 0 };
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
  const shielded = state.beat <= state.shieldUntil;
  const dealt = amount * (shielded ? SHIELD_FACTOR : 1);
  state.army.troops = Math.max(0, state.army.troops - dealt);
  events.push({ type: 'wound', amount: dealt, shielded, source });
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
    case 'shield':
      if (o.beat === 0) state.shieldUntil = state.beat + 11; // this answer, the next call and the next answer
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

/** Advance one beat. Returns the events for the renderer and audio. */
export function stepBeat(state) {
  const events = [];
  if (state.outcome) return events;
  runOrder(state, events);
  runEnemies(state, events);
  state.beat += 1;
  if (state.enemies.filter((e) => e.goal).every((e) => !e.alive)) state.outcome = 'won';
  else if (state.army.troops <= 0) state.outcome = 'lost';
  if (state.outcome) events.push({ type: 'outcome', outcome: state.outcome });
  return events;
}
