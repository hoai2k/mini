// Superflight-style scoring. Flying close to a surface fills the combo pot,
// faster the closer and quicker you go. Tricks while close (threading a gap,
// flying a tunnel, skimming, flying upside down, blazing speed, a long flow)
// raise the multiplier. Leave every surface behind for BANK_DELAY seconds and
// the pot times the multiplier is banked; crash first and it is lost.
//
// Modes: 'best' (a crash ends the run; your score is your best run) and
// 'total' (everything banked counts; a crash only loses the pot).

export const SCORING = {
  proximity: 10, // metres: closer than this fills the pot
  rate: 140, // points per second at zero distance and 40 m/s
  bankDelay: 2.0,
  skim: 2.4,
  maxMult: 30,
  bonusPoints: 300,
  gapReach: 8, // a surface within this on both sides is a gap
};

export const BONUSES = {
  THREAD: 'Threaded a gap',
  TUNNEL: 'Flew a tunnel',
  SKIM: 'Skimmed a surface',
  INVERTED: 'Upside down',
  BLAZING: 'Blazing speed',
  FLOW: 'Kept the flow',
};

export function createScore(mode = 'best') {
  return {
    mode,
    score: 0, // what counts: best run (best mode) or total banked (total mode)
    run: 0, // banked this run
    best: 0,
    total: 0,
    pot: 0,
    mult: 1,
    inProx: false,
    away: 0, // seconds since leaving proximity while a combo is open
    chain: 0, // seconds of the open combo
    closeness: 0,
    timers: { skim: 0, tunnel: 0, inverted: 0, blazing: 0, flow: 0 },
    cool: { THREAD: 0, TUNNEL: 0, SKIM: 0, INVERTED: 0, BLAZING: 0 },
    gapWas: false,
    crashes: 0,
    bestBank: 0,
    bestMult: 1,
    banks: 0,
  };
}

function bonus(s, kind, events) {
  s.mult = Math.min(SCORING.maxMult, s.mult + 1);
  s.bestMult = Math.max(s.bestMult, s.mult);
  s.pot += SCORING.bonusPoints;
  events.push({ type: 'bonus', kind, mult: s.mult });
}

function refresh(s) {
  s.score = s.mode === 'total' ? s.total : Math.max(s.best, s.run);
}

// info: { dist, speed, probes: { left, right, up, down } (distances or Infinity), inverted (bool) }
export function updateScore(s, info, dt, events = []) {
  const S = SCORING;
  for (const k in s.cool) s.cool[k] = Math.max(0, s.cool[k] - dt);
  const near = info.dist < S.proximity;
  s.inProx = near;
  s.closeness = near ? 1 - Math.max(0, info.dist) / S.proximity : 0;

  if (near) {
    if (s.pot === 0 && s.mult === 1 && s.chain === 0) events.push({ type: 'combo-start' });
    s.away = 0;
    s.chain += dt;
    s.pot += S.rate * Math.pow(s.closeness, 1.5) * (info.speed / 40) * dt;

    const t = s.timers;
    const p = info.probes || {};
    const r = S.gapReach;
    const sides = (p.left < r) + (p.right < r) + (p.up < r) + (p.down < r);
    const gap = (p.left < r && p.right < r) || (p.up < r && p.down < r);
    if (gap && !s.gapWas && s.cool.THREAD === 0) {
      bonus(s, 'THREAD', events);
      s.cool.THREAD = 0.8;
    }
    s.gapWas = gap;
    t.tunnel = sides >= 3 ? t.tunnel + dt : 0;
    if (t.tunnel > 0.5 && s.cool.TUNNEL === 0) {
      bonus(s, 'TUNNEL', events);
      s.cool.TUNNEL = 1.6;
      t.tunnel = 0;
    }
    t.skim = info.dist < S.skim ? t.skim + dt : 0;
    if (t.skim > 0.6 && s.cool.SKIM === 0) {
      bonus(s, 'SKIM', events);
      s.cool.SKIM = 1.8;
      t.skim = 0;
    }
    t.inverted = info.inverted ? t.inverted + dt : 0;
    if (t.inverted > 0.8 && s.cool.INVERTED === 0) {
      bonus(s, 'INVERTED', events);
      s.cool.INVERTED = 3;
      t.inverted = 0;
    }
    t.blazing = info.speed > 80 ? t.blazing + dt : 0;
    if (t.blazing > 0.8 && s.cool.BLAZING === 0) {
      bonus(s, 'BLAZING', events);
      s.cool.BLAZING = 3;
      t.blazing = 0;
    }
  } else {
    s.gapWas = false;
    s.timers.tunnel = s.timers.skim = s.timers.inverted = s.timers.blazing = 0;
    if (s.pot > 0 || s.mult > 1) {
      s.away += dt;
      s.chain += dt;
      if (s.away >= S.bankDelay) bank(s, events);
    }
  }
  // A long unbroken combo earns a flow bonus every six seconds.
  if (s.pot > 0) {
    s.timers.flow += dt;
    if (s.timers.flow >= 6) {
      s.timers.flow -= 6;
      bonus(s, 'FLOW', events);
    }
  }
  refresh(s);
  return events;
}

export function bank(s, events = []) {
  const amount = Math.round(s.pot * s.mult);
  if (amount > 0) {
    s.run += amount;
    s.total += amount;
    s.banks++;
    s.bestBank = Math.max(s.bestBank, amount);
    events.push({ type: 'bank', amount, mult: s.mult });
  }
  s.pot = 0;
  s.mult = 1;
  s.away = 0;
  s.chain = 0;
  s.timers.flow = 0;
  refresh(s);
  return events;
}

export function crash(s, events = []) {
  const lost = Math.round(s.pot * s.mult);
  events.push({ type: 'crash', lost });
  s.crashes++;
  s.pot = 0;
  s.mult = 1;
  s.away = 0;
  s.chain = 0;
  s.timers.flow = 0;
  if (s.mode === 'best') {
    s.best = Math.max(s.best, s.run);
    s.run = 0;
  }
  refresh(s);
  return events;
}

// The round is over: bank whatever is open (a combo in flight counts).
export function finish(s, events = []) {
  bank(s, events);
  if (s.mode === 'best') s.best = Math.max(s.best, s.run);
  refresh(s);
  return events;
}
