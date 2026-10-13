// Choosing what to play next from the player's skill profile (skills.js).
//
// Adaptive: every skill has its own level. A melody is fair when it doesn't
// ask more of any skill than that skill's level allows; most picks stretch
// the player's weakest skill at the lowest level they slip at, and the rest
// are fair melodies near their overall level.
//
// Focus works on one weak skill at a time, until it is reliable:
// - test: a real melody that uses the skill, at the skill's level;
// - slipped: drills (made-up exercises) aimed at it, a step harder after each
//   clean one, a step easier after a slip;
// - after clean drills up to step 3 (two in a row): check, with a different real
//   melody of the same kind. A clean check after a slip is a turnaround (the
//   measure of whether Focus works); a slip goes back to drills;
// - three clean results in a row, from at least two different melodies: the
//   skill is reliable for now, and Focus moves to the next weak skill.
// Every third pick is something else entirely (a melody without the skill, or
// a review of a skill fixed earlier), so the player learns the skill rather
// than the exercise. The profile leans on recent play, so a skill learned
// since yesterday is tested before it is drilled.
import { SKILLS, has, skillsOf, levelOf, accuracy, weakSkills, reliable } from './skills.js';
import { makeDrill } from './drills.js';

const round = (x) => Math.max(1, Math.min(5, Math.round(x)));

/** A fair melody asks no skill for more than its level (plus `slack`). */
export function fair(m, ears, slack = 0.75) {
  for (const s of Object.keys(skillsOf(m))) if (m.level > levelOf(ears, s) + slack) return false;
  return true;
}

/** Of `cands`, the ones not played lately, unsolved first (then fewest stars). */
function freshest(cands, { best = {}, recent = [], rng = Math.random }) {
  if (!cands.length) return null;
  const fresh = cands.filter((m) => !recent.includes(m.id));
  const pool = fresh.length ? fresh : cands;
  const score = (m) => best[m.id] ?? -1;
  const lowest = Math.min(...pool.map(score));
  const tier = pool.filter((m) => score(m) === lowest);
  return tier[Math.floor(rng() * tier.length)];
}

/** Real melodies that use `skill`, at the level nearest `level` that has any (and fair otherwise). */
export function melodiesFor(pool, ears, skill, level, { exclude = [] } = {}) {
  const using = pool.filter((m) => has(m, skill) && !exclude.includes(m.id));
  const target = round(level);
  for (let d = 0; d <= 4; d++) {
    const at = using.filter((m) => Math.abs(m.level - target) === d || (d && Math.abs(m.level - target) < d));
    const fairOnes = at.filter((m) => fair(m, ears, 1.25));
    if (fairOnes.length) return fairOnes;
    if (at.length && d >= 2) return at;
  }
  return using;
}

// ---------------------------------------------------------------- Adaptive
export function pickAdaptive(pool, ears, { now = Date.now(), rng = Math.random, ...opts } = {}) {
  const weak = weakSkills(ears, now).filter((w) => pool.some((m) => has(m, w.id)));
  if (weak.length && rng() < 0.6) {
    // The weakest skill (or one of the three weakest), at the lowest level it slips at.
    const w = weak[Math.floor(rng() * Math.min(3, weak.length))];
    const got = freshest(melodiesFor(pool, ears, w.id, levelOf(ears, w.id)), { ...opts, rng });
    if (got) return { melody: got, skill: w.id };
  }
  // Otherwise a fair melody that stretches something a little.
  const fairOnes = pool.filter((m) => fair(m, ears));
  const edge = (m) => Math.max(...Object.keys(skillsOf(m)).map((s) => m.level - levelOf(ears, s)));
  const stretch = fairOnes.filter((m) => edge(m) >= -0.5);
  const cands = stretch.length >= 6 ? stretch : fairOnes.length ? fairOnes : pool.filter((m) => m.level === 1);
  return { melody: freshest(cands.length ? cands : pool, { ...opts, rng }), skill: null };
}

// ---------------------------------------------------------------- Focus
export function newFocus() {
  return { skill: null, stage: 'test', drill: 1, drillOk: 0, drills: 0, streak: 0, items: [], slip: null, sinceMix: 0, fixed: [], n: 0 };
}

/** The next weak skill to work on (not one just fixed), or null. */
function chooseSkill(pool, ears, focus, now) {
  const recentFix = new Set(focus.fixed.slice(-3).map((f) => f.skill));
  const weak = weakSkills(ears, now).filter((w) => !recentFix.has(w.id) || w.acc < 0.5);
  return weak[0]?.id || null;
}

/**
 * The next thing to play in Focus: { melody, kind, skill } where kind is
 * 'test' | 'drill' | 'check' | 'mix' | 'review' | 'explore'.
 */
export function nextFocus(pool, ears, focus, { now = Date.now(), rng = Math.random, ...opts } = {}) {
  if (!focus.skill) {
    focus.skill = chooseSkill(pool, ears, focus, now);
    Object.assign(focus, { stage: 'test', drill: 1, drillOk: 0, drills: 0, streak: 0, items: [], slip: null });
  }
  if (!focus.skill) {
    // Nothing weak yet: play fair melodies that cover the skills we know least about.
    const least = SKILLS.map((s) => ({ id: s.id, ev: accuracy(ears, s.id, now).evidence }))
      .filter((s) => pool.some((m) => has(m, s.id))).sort((a, b) => a.ev - b.ev);
    const s = least[Math.floor(rng() * Math.min(4, least.length))]?.id;
    const melody = s ? freshest(melodiesFor(pool, ears, s, levelOf(ears, s)), { ...opts, rng }) : null;
    return { melody: melody || pickAdaptive(pool, ears, { now, rng, ...opts }).melody, kind: 'explore', skill: s || null };
  }
  const skill = focus.skill;
  // Something else entirely, every third pick.
  if (focus.sinceMix >= 2) {
    const fixedBefore = focus.fixed.map((f) => f.skill).filter((s) => s !== skill);
    if (fixedBefore.length && rng() < 0.4) {
      const r = fixedBefore[Math.floor(rng() * fixedBefore.length)];
      const melody = freshest(melodiesFor(pool, ears, r, levelOf(ears, r)), { ...opts, rng });
      if (melody) return { melody, kind: 'review', skill: r };
    }
    const without = pool.filter((m) => !has(m, skill) && fair(m, ears));
    const melody = freshest(without.length ? without : pool.filter((m) => fair(m, ears)), { ...opts, rng });
    if (melody) return { melody, kind: 'mix', skill: null };
  }
  if (focus.stage === 'drill') return { melody: makeDrill(skill, focus.drill, rng), kind: 'drill', skill };
  const exclude = [...(opts.recent || []), ...focus.items, ...(focus.slip ? [focus.slip.item] : [])];
  const level = focus.stage === 'check' && focus.slip ? focus.slip.level : levelOf(ears, skill);
  const cands = melodiesFor(pool, ears, skill, level, { exclude });
  const melody = freshest(cands, { ...opts, recent: [], rng });
  if (!melody) return { melody: makeDrill(skill, Math.max(focus.drill, 3), rng), kind: 'drill', skill };
  return { melody, kind: focus.stage, skill };
}

/**
 * Update Focus after a pick was played. `scores` are the run's per-skill
 * results (0..1) from skills.record; `item` the melody. Returns an event for
 * the player, if any: { type: 'fixed' | 'turnaround' | 'slipped' | 'rest', skill }.
 */
export function afterFocus(focus, ears, pick, item, scores, now = Date.now()) {
  focus.n++;
  if (pick.kind === 'mix' || pick.kind === 'review' || pick.kind === 'explore') {
    focus.sinceMix = 0;
    return null;
  }
  focus.sinceMix++;
  const skill = focus.skill;
  const v = scores[skill];
  if (v === undefined) return null; // the skill never came up (skipped early)
  const clean = v === 1;
  if (pick.kind === 'drill') {
    focus.drills++;
    if (clean) {
      focus.drillOk++;
      if (focus.drillOk >= 2 && focus.drill >= 3) { focus.stage = 'check'; focus.drillOk = 0; }
      else focus.drill = Math.min(4, focus.drill + 1);
    } else {
      focus.drillOk = 0;
      focus.drill = Math.max(1, focus.drill - 1);
    }
    if (focus.drills >= 14 && focus.stage === 'drill') {
      // Enough for now: rest this one and come back to it later.
      focus.fixed.push({ skill, t: now, rest: true });
      focus.skill = null;
      return { type: 'rest', skill };
    }
    return null;
  }
  // A test or a check: a real melody.
  if (clean) {
    let event = null;
    if (pick.kind === 'check' && focus.slip) {
      ears.turns.push({ skill, failed: focus.slip.item, fixed: item.id, level: item.level, drills: focus.drills, t: now, took: now - focus.slip.t });
      if (ears.turns.length > 40) ears.turns.splice(0, ears.turns.length - 40);
      focus.slip = null;
      event = { type: 'turnaround', skill };
    }
    focus.streak++;
    focus.items.push(item.id);
    focus.stage = 'test';
    if (focus.streak >= 3 && reliable(ears, skill) && accuracy(ears, skill, now).acc >= 0.8) {
      focus.fixed.push({ skill, t: now });
      if (focus.fixed.length > 12) focus.fixed.shift();
      focus.skill = null;
      return { type: 'fixed', skill };
    }
    return event;
  }
  focus.streak = 0;
  if (!focus.slip) focus.slip = { item: item.id, level: item.level, t: now };
  focus.stage = 'drill';
  focus.drill = pick.kind === 'check' ? Math.max(1, focus.drill - 1) : 1;
  focus.drillOk = 0;
  return { type: 'slipped', skill };
}
