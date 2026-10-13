// The chase kit (design.md, "Chases"): one snatcher after one holder on a
// ground plane (x across, y into the scene), with cover to hide in. Every move
// has an answer and a cost, so neither side has a button that always wins:
//
//   sprint  beats a straight race, but drains stamina; empty, you are winded
//   lunge   catches a sprinter, but a dodge makes it miss and you stumble
//   dodge   beats a lunge, but has a cooldown; waste it and you are open
//   grab    starts a tug that stamina decides: tire the holder out first
//   hide    in cover, still: the computer loses sight of you; moving rustles;
//           but a snatcher who waits right over your cover flushes you out
//
// Pure logic, no drawing: chapters own a Chase, feed it each side's input
// (a player's, or the AI's from aiSnatcher/aiHolder) and draw from its state.

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const len = (x, y) => Math.hypot(x, y);

// Tunable per creature: speeds in px/s, times in s.
export const DEFAULT_MOVER = {
  speed: 260, sprint: 470, accel: 2200, turn: 1, radius: 40,
  stamina: 1, drain: 0.45, regen: 0.15, regenStill: 0.4, windedTime: 1.6, windedSpeed: 0.55,
  lungeSpeed: 980, lungeTime: 0.32, lungeCooldown: 1.8, stumbleTime: 1.1, lungeRange: 420, lungeCost: 0.25,
  dodgeSpeed: 820, dodgeTime: 0.22, dodgeCooldown: 1.4, dodgeCost: 0.26,
  grabRange: 70, hopsLogs: true, canHide: true, flies: false, flushTime: 1.1,
};

export function makeMover(opts = {}) {
  return {
    ...DEFAULT_MOVER, ...opts,
    x: opts.x ?? 0, y: opts.y ?? 0, vx: 0, vy: 0, facing: 1,
    st: 1, // stamina 0..1
    winded: 0, mode: 'move', modeT: 0, cool: 0, dirX: 1, dirY: 0,
    hidden: false, inCover: null, rustle: 0, sprinting: false, travelled: 0,
  };
}

// The tug of a grab: 0 = the holder breaks free, 1 = the snatcher has it.
export function makeTug(snatcher, holder) {
  // A tired holder starts the tug nearer to losing it.
  return { v: clamp(0.5 + (0.5 - holder.st) * 0.12, 0.4, 0.6), t: 0 };
}

export function makeChase({ snatcher, holder, bounds, cover = [], obstacles = [], rng = Math.random, gentle = [false, false] }) {
  return {
    s: snatcher, h: holder, bounds, cover, obstacles, rng, gentle,
    tug: null, done: false, result: null, events: [], t: 0, lastSeen: { x: holder.x, y: holder.y, t: 0 },
    fakeRustle: 0, flushT: 0,
  };
}

function coverAt(c, x, y) {
  return c.cover.find((k) => ((x - k.x) / k.rx) ** 2 + ((y - k.y) / k.ry) ** 2 < 1) || null;
}

function moveMover(c, m, inp, dt, gentle) {
  m.modeT += dt;
  m.cool = Math.max(0, m.cool - dt);
  m.winded = Math.max(0, m.winded - dt);
  const ix = inp.x || 0, iy = inp.y || 0;
  const im = len(ix, iy);
  if (im > 0.2) { m.dirX = ix / im; m.dirY = iy / im; }
  if (Math.abs(ix) > 0.2) m.facing = Math.sign(ix);

  if (m.mode === 'lunge' || m.mode === 'dodge') {
    const sp = m.mode === 'lunge' ? m.lungeSpeed : m.dodgeSpeed;
    m.vx = m.lx * sp; m.vy = m.ly * sp;
    if (m.modeT > (m.mode === 'lunge' ? m.lungeTime : m.dodgeTime)) {
      if (m.mode === 'lunge') { m.mode = 'stumble'; m.modeT = 0; c.events.push({ type: 'stumble', who: m }); } else { m.mode = 'move'; m.modeT = 0; }
    }
  } else if (m.mode === 'stumble' || m.mode === 'dazed') {
    // A missed lunge ends in a sprawl: no drifting on toward the holder.
    const k = m.mode === 'stumble' ? 30 : 8;
    m.vx *= Math.exp(-k * dt); m.vy *= Math.exp(-k * dt);
    const t = m.mode === 'stumble' ? m.stumbleTime * (gentle ? 0.7 : 1) : 1.7;
    if (m.modeT > t) { m.mode = 'move'; m.modeT = 0; }
  } else if (m.mode === 'move') {
    m.sprinting = !!inp.sprint && im > 0.2 && m.winded <= 0 && m.st > 0;
    let top = m.sprinting ? m.sprint : m.speed;
    if (m.winded > 0) top *= m.windedSpeed;
    if (m.inCover && m.canHide) top *= 0.75;
    const tx = ix * top, ty = iy * top * 0.75; // depth moves a little slower
    const k = 1 - Math.exp(-(m.accel / Math.max(1, top)) * dt);
    m.vx += (tx - m.vx) * k; m.vy += (ty - m.vy) * k;
  } else {
    m.vx = 0; m.vy = 0;
  }

  // Stamina.
  if (m.sprinting && m.mode === 'move') {
    m.st -= m.drain * dt * (gentle ? 0.7 : 1);
    if (m.st <= 0) { m.st = 0; m.winded = m.windedTime; m.sprinting = false; c.events.push({ type: 'winded', who: m }); }
  } else {
    const still = len(m.vx, m.vy) < 30;
    m.st = Math.min(m.stamina, m.st + (still ? m.regenStill : m.regen) * dt * (m.winded > 0 ? 0.5 : 1));
  }

  // Move, with obstacles and bounds.
  let nx = m.x + m.vx * dt, ny = m.y + m.vy * dt;
  for (const o of c.obstacles) {
    if (m.flies || (o.hop && m.hopsLogs)) continue;
    const dx = nx - o.x, dy = (ny - o.y) * (o.rx / o.ry);
    const d = len(dx, dy);
    const r = o.rx + m.radius * 0.6;
    if (d < r && d > 0.001) { nx = o.x + (dx / d) * r; ny = o.y + ((dy / d) * r) * (o.ry / o.rx); }
  }
  const b = c.bounds;
  nx = clamp(nx, b.x0, b.x1); ny = clamp(ny, b.y0, b.y1);
  m.travelled += len(nx - m.x, ny - m.y);
  m.x = nx; m.y = ny;

  // Cover.
  const cov = m.canHide ? coverAt(c, m.x, m.y) : null;
  m.inCover = cov;
  const speed = len(m.vx, m.vy);
  m.hidden = !!cov && speed < 40 && m.mode === 'move';
  m.rustle = cov && speed >= 40 ? Math.min(1, m.rustle + dt * 4) : Math.max(0, m.rustle - dt * 2);
  if (cov && speed >= 40 && c.rng() < dt * 3) c.events.push({ type: 'rustle', cover: cov });
}

function startLunge(c, m, tx, ty) {
  let dx = tx - m.x, dy = ty - m.y;
  const d = len(dx, dy) || 1;
  m.lx = dx / d; m.ly = dy / d;
  m.facing = Math.sign(dx) || m.facing;
  m.mode = 'lunge'; m.modeT = 0; m.cool = m.lungeCooldown;
  m.st = Math.max(0, m.st - m.lungeCost);
  c.events.push({ type: 'lunge', who: m });
}

function startDodge(c, m) {
  // Always sideways to the snatcher (a dodge is not a burst of speed away),
  // to the side the stick leans, else the side away from the nearer wall.
  const sx = m.x - c.s.x, sy = m.y - c.s.y;
  const sd = len(sx, sy) || 1;
  let px = -sy / sd, py = sx / sd;
  let side = Math.sign(m.dirX * px + m.dirY * py);
  if (!side) side = (m.y - (c.bounds.y0 + c.bounds.y1) / 2) * py > 0 ? -1 : 1;
  m.lx = px * side; m.ly = py * side;
  m.mode = 'dodge'; m.modeT = 0; m.cool = m.dodgeCooldown;
  m.st = Math.max(0, m.st - m.dodgeCost);
  c.events.push({ type: 'dodge', who: m });
}

// Advance the chase. inS / inH: { x, y, sprint, action, actionPressed } for
// the snatcher and the holder. Returns events that happened this step.
export function stepChase(c, inS, inH, dt) {
  c.events = [];
  if (c.done) return c.events;
  c.t += dt;
  const { s, h } = c;

  if (c.tug) {
    // Mash A to pull; pull the stick away (holder) or toward yourself (snatcher) to pull harder.
    const ax = Math.sign(h.x - s.x) || 1;
    let pull = 0;
    // A press counts once per 0.12 s at most: no thumb (or turbo button) wins by speed alone.
    const counted = (m, pressed) => {
      if (!pressed || c.t - (m.lastPull || -1) < 0.12) return false;
      m.lastPull = c.t;
      return true;
    };
    if (counted(s, inS.actionPressed)) pull += 0.075 * (0.35 + 0.9 * s.st) * (c.gentle[0] ? 1.15 : 1);
    if (counted(h, inH.actionPressed)) pull -= 0.075 * (0.35 + 0.9 * h.st) * (c.gentle[1] ? 1.15 : 1);
    if ((inS.x || 0) * -ax > 0.5) pull += 0.12 * dt * (0.5 + s.st);
    if ((inH.x || 0) * ax > 0.5) pull -= 0.12 * dt * (0.5 + h.st);
    c.tug.t += dt;
    // A stalled tug doesn't go on for ever: after 4 s the rope slides toward
    // whoever has more breath left (a dead heat: the holder wriggles free).
    if (c.tug.t > 4) pull += (s.st > h.st + 0.05 ? 1 : -1) * 0.05 * (c.tug.t - 4) * dt;
    c.tug.v = clamp(c.tug.v + pull, 0, 1);
    h.st = Math.max(0, h.st - 0.05 * dt);
    s.st = Math.max(0, s.st - 0.05 * dt);
    if (pull) c.events.push({ type: 'tug' });
    if (c.tug.v >= 1) {
      c.done = true; c.result = 'snatched'; c.tug = null;
      c.events.push({ type: 'snatch' });
    } else if (c.tug.v <= 0) {
      c.tug = null;
      s.mode = 'dazed'; s.modeT = 0;
      h.mode = 'move'; h.modeT = 0;
      const ax2 = Math.sign(h.x - s.x) || 1;
      h.vx = ax2 * h.sprint; h.x += ax2 * 40;
      h.cool = 0;
      h.st = Math.max(0, h.st - 0.25); // breaking free takes it out of you
      c.events.push({ type: 'free' });
    }
    return c.events;
  }

  // Actions.
  const d = len(h.x - s.x, h.y - s.y);
  // (A hidden holder can't be grabbed or lunged at: over their cover, Action
  // does nothing, and waiting there flushes them out.)
  const overCover = h.hidden && h.inCover && ((s.x - h.inCover.x) / (h.inCover.rx * 1.3)) ** 2 + ((s.y - h.inCover.y) / (h.inCover.ry * 1.6)) ** 2 < 1;
  if (inS.actionPressed && s.mode === 'move' && !overCover) {
    if (d < s.grabRange + s.radius && !h.hidden) beginTug(c);
    else if (s.cool <= 0 && s.winded <= 0 && d < s.lungeRange && !h.hidden) startLunge(c, s, h.x, h.y);
    else if (s.cool <= 0 && s.winded <= 0) startLunge(c, s, s.x + s.dirX * 200, s.y + s.dirY * 200);
  }
  if (inH.actionPressed && h.mode === 'move' && h.cool <= 0 && h.winded <= 0) startDodge(c, h);

  moveMover(c, s, inS, dt, c.gentle[0]);
  moveMover(c, h, inH, dt, c.gentle[1]);
  if (c.tug) return c.events;

  // A lunge that reaches a holder who is not mid-dodge grabs them.
  const d2 = len(h.x - s.x, h.y - s.y);
  if (s.mode === 'lunge' && d2 < s.grabRange + s.radius && h.mode !== 'dodge' && !h.hidden) beginTug(c);
  if (s.mode === 'lunge' && d2 < s.grabRange + s.radius && h.mode === 'dodge') c.events.push({ type: 'dodged' });

  // Flushing: a snatcher waiting right over the holder's cover scares them out.
  if (h.hidden && h.inCover) {
    const k = h.inCover;
    const over = ((s.x - k.x) / (k.rx * 1.3)) ** 2 + ((s.y - k.y) / (k.ry * 1.6)) ** 2 < 1;
    if (over && Math.hypot(s.vx, s.vy) < 160 && s.mode === 'move') c.flushT += dt; else c.flushT = Math.max(0, c.flushT - dt);
    if (c.flushT > s.flushTime) {
      c.flushT = 0;
      h.hidden = false;
      // The holder bolts out the far side of the bush: a head start, not a stun.
      const bx = h.x - s.x, by = h.y - s.y, bd = len(bx, by) || 1;
      h.lx = bx / bd; h.ly = by / bd;
      h.mode = 'dodge'; h.modeT = -0.15;
      c.events.push({ type: 'flushed', cover: k });
    }
  } else c.flushT = 0;

  // What the snatcher can see.
  if (!h.hidden) c.lastSeen = { x: h.x, y: h.y, t: c.t };
  return c.events;
}

function beginTug(c) {
  c.tug = makeTug(c.s, c.h);
  c.s.mode = 'grabbing'; c.s.modeT = 0;
  c.h.mode = 'grabbed'; c.h.modeT = 0;
  c.s.vx = c.s.vy = c.h.vx = c.h.vy = 0;
  c.events.push({ type: 'grab' });
}

// ---------- the computer players ----------
// skill 0..1: how quickly they react and how often they choose well. Each
// keeps its own little memory in `brain`.

// A computer player's sprint comes in committed windows: once it decides to
// sprint it keeps it up for 0.8-1.3 s (unless its breath runs out), then rests
// at least 0.7 s before deciding again, so its running pose doesn't flicker
// with a decision made afresh every frame. `want()` is that decision.
function sprintWindow(brain, m, dt, rng, want) {
  brain.sprintT = (brain.sprintT || 0) - dt;
  if (brain.sprintT <= 0) {
    brain.sprintOn = want();
    brain.sprintT = brain.sprintOn ? 0.8 + rng() * 0.5 : 0.7;
    brain.sprintOff = 0;
  } else if (brain.sprintOn) {
    // A window ends early when the reason for it has gone (for a quarter of a
    // second, so a flicker at a threshold doesn't end it), or breath is gone.
    brain.sprintOff = want() ? 0 : (brain.sprintOff || 0) + dt;
    if (brain.sprintOff > 0.25 || m.st < 0.08 || m.winded > 0) { brain.sprintOn = false; brain.sprintT = 0.5; }
  }
  return brain.sprintOn;
}

export function aiHolder(c, brain, skill, dt) {
  const { s, h } = c;
  brain.t = (brain.t || 0) + dt;
  brain.react = (brain.react || 0) - dt;
  const out = { x: 0, y: 0, sprint: false, action: false, actionPressed: false };
  if (c.tug) {
    // Mash at a rate that rises with skill and stamina.
    brain.mash = (brain.mash || 0) + dt * (6 + 3 * skill) * (0.75 + 0.25 * h.st);
    if (brain.mash >= 1) { brain.mash -= 1; out.actionPressed = true; }
    out.x = Math.sign(h.x - s.x) || 1;
    return out;
  }
  const dx = h.x - s.x, dy = h.y - s.y;
  const d = len(dx, dy) || 1;
  // Dodge a lunge that is coming at us (or a snatcher closing in fast), if we see it in time.
  const closing = ((s.vx * dx + s.vy * dy) / d) > 380 && d < 170;
  if ((s.mode === 'lunge' && d < 260 || closing) && h.cool <= 0 && h.winded <= 0 && brain.react <= 0) {
    brain.react = 0.25;
    if (c.rng() < 0.35 + 0.55 * skill) { out.actionPressed = true; out.x = -dy / d; out.y = dx / d; return out; }
  }
  // Rest in cover when tired and the snatcher is far away.
  const nearCover = c.cover.slice().sort((a, b) => len(a.x - h.x, a.y - h.y) - len(b.x - h.x, b.y - h.y))[0];
  if (brain.goal && brain.t > brain.until) brain.goal = null;
  if (!brain.goal) {
    if (nearCover && h.canHide && (h.st < 0.6 || d > 650) && d > 380 && len(nearCover.x - s.x, nearCover.y - s.y) > 420) {
      brain.goal = { x: nearCover.x, y: nearCover.y, hide: true }; brain.until = brain.t + 2 + c.rng() * 2;
    } else {
      // Run away, bending toward open space and away from walls.
      const b = c.bounds;
      let ax = dx / d, ay = dy / d;
      ax += ((b.x0 + b.x1) / 2 - h.x) / (b.x1 - b.x0) * 1.2;
      ay += ((b.y0 + b.y1) / 2 - h.y) / (b.y1 - b.y0) * 1.2;
      const wob = Math.sin(brain.t * 1.3) * 0.5;
      brain.goal = { x: h.x + (ax - ay * wob) * 300, y: h.y + (ay + ax * wob) * 300 }; brain.until = brain.t + 0.5 + c.rng() * 0.6;
    }
  }
  const gx = brain.goal.x - h.x, gy = brain.goal.y - h.y;
  const gd = len(gx, gy);
  if (brain.goal.hide && gd < 30) {
    // Sit still in cover; bolt if the snatcher gets close.
    if (d < 180) brain.goal = null;
    return out;
  }
  if (gd > 5) { out.x = gx / gd; out.y = gy / gd; }
  // Sprint when the snatcher is close or sprinting, and we have breath: in
  // committed bursts, not a fresh decision every frame.
  // (The luck in it is rolled once a second or so, not every frame.)
  brain.luckT = (brain.luckT || 0) - dt;
  if (brain.luckT <= 0) { brain.luck = c.rng() > (1 - skill) * 0.2; brain.luckT = 0.8 + c.rng() * 0.5; }
  out.sprint = brain.luck && h.st > 0.25 + 0.25 * skill && (d < 200 + 60 * (1 - skill) || (s.sprinting && d < 360));
  // On purpose, now and then, a mistake: a moment's hesitation.
  if (c.rng() < dt * (1 - skill) * 0.8) brain.goal = { x: h.x, y: h.y }, brain.until = brain.t + 0.3;
  return out;
}

export function aiSnatcher(c, brain, skill, dt) {
  const { s, h } = c;
  brain.t = (brain.t || 0) + dt;
  const out = { x: 0, y: 0, sprint: false, action: false, actionPressed: false };
  if (c.tug) {
    brain.mash = (brain.mash || 0) + dt * (6 + 3 * skill) * (0.75 + 0.25 * s.st);
    if (brain.mash >= 1) { brain.mash -= 1; out.actionPressed = true; }
    out.x = -(Math.sign(h.x - s.x) || 1);
    return out;
  }
  // Chase what we can see, or search where we last saw them.
  const seen = !h.hidden;
  const tx = seen ? h.x : c.lastSeen.x, ty = seen ? h.y : c.lastSeen.y;
  const dx = tx - s.x, dy = ty - s.y;
  const d = len(dx, dy) || 1;
  if (d > 8) { out.x = dx / d; out.y = dy / d; }
  const cov = !seen && c.cover.find((k) => ((c.lastSeen.x - k.x) / k.rx) ** 2 + ((c.lastSeen.y - k.y) / k.ry) ** 2 < 1.2);
  if (cov && d < 60) {
    // They went into that bush: wait right over it and flush them out.
    const kx = cov.x - s.x, ky = cov.y - s.y, kd = len(kx, ky);
    if (kd > 20) { out.x = (kx / kd) * 0.4; out.y = (ky / kd) * 0.4; }
    return out;
  }
  if (!seen && d < 40) {
    // Search: wander about the last place seen, peering into nearby cover.
    const k = c.cover[Math.floor(brain.t / 1.5) % Math.max(1, c.cover.length)];
    if (k) { const kx = k.x - s.x, ky = k.y - s.y, kd = len(kx, ky) || 1; out.x = kx / kd; out.y = ky / kd; }
    if (h.rustle > 0.3) { out.x = (h.x - s.x) / (len(h.x - s.x, h.y - s.y) || 1); out.y = (h.y - s.y) / (len(h.x - s.x, h.y - s.y) || 1); }
  }
  out.sprint = sprintWindow(brain, s, dt, c.rng, () => s.st > 0.3 && d > 200 && d < 650 && (h.st < 0.5 || c.rng() < 0.6 + 0.3 * skill));
  // Grab when close; lunge when in range, more readily at a tired or sprinting holder.
  if (seen && s.mode === 'move') {
    const dd = len(h.x - s.x, h.y - s.y);
    if (dd < s.grabRange + s.radius) out.actionPressed = true;
    else if (s.cool <= 0 && s.winded <= 0 && dd < s.lungeRange) {
      // Lunge at once when they can't dodge it; otherwise sometimes, and
      // sometimes feint (a step in and a pause) to draw out a wasted dodge.
      const open = h.cool > 0 || h.winded > 0 || h.sprinting;
      if (open && c.rng() < 0.5 + 0.5 * skill) out.actionPressed = true;
      else if (c.rng() < dt * (1.5 + 2 * skill)) out.actionPressed = true;
    }
  }
  return out;
}

// ---------- reading the state, for prompts ----------
// What a press of Action would do for the snatcher right now: 'grab' (close
// enough to take hold), 'lunge' (a lunge would reach), or null. `open` is true
// when the holder can't answer with a dodge (winded, dodge spent, held, or
// sprinting flat out): the moment to go.
export function snatchChance(c) {
  const { s, h } = c;
  const d = len(h.x - s.x, h.y - s.y);
  const open = h.mode !== 'move' || h.cool > 0 || h.winded > 0 || h.sprinting;
  if (c.tug || s.mode !== 'move' || h.hidden) return { kind: null, open, d };
  if (d < s.grabRange + s.radius) return { kind: 'grab', open, d };
  if (s.cool <= 0 && s.winded <= 0 && d < s.lungeRange) return { kind: 'lunge', open, d };
  return { kind: null, open, d };
}

// True while a lunge is coming at the holder and a dodge now would beat it.
export function dodgeChance(c) {
  const { s, h } = c;
  if (c.tug || s.mode !== 'lunge' || h.mode !== 'move' || h.cool > 0 || h.winded > 0) return false;
  const dx = h.x - s.x, dy = h.y - s.y;
  return len(dx, dy) < 340 && (s.lx * dx + s.ly * dy) > 0;
}

// How far the snatcher has got with flushing the hidden holder out, 0..1.
export function flushProgress(c) {
  return c.h.hidden ? clamp(c.flushT / c.s.flushTime, 0, 1) : 0;
}

// A tug never stalls for ever: the side ahead gains ground, faster the longer
// it has gone on, so a dead heat ends one way or the other.
export function tugDrift(c, dt) {
  const tg = c.tug;
  if (!tg) return;
  const lead = tg.v - 0.5;
  const k = 0.12 + Math.max(0, tg.t - 2.5) * 0.12;
  tg.v = clamp(tg.v + (Math.sign(lead) || 1) * k * dt, 0.001, 0.999);
}
