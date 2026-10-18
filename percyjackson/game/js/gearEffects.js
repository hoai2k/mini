// What a hero's weapon enchantments do when a melee hit lands, Minecraft
// Dungeons style: life steal, fire, a chance to freeze, chain lightning and
// a shoving burst. combat.js calls hitEffects after every hit a hero deals;
// the numbers come from loot.js PROC (the same ones the inventory shows).
//
// Pure (no Three.js): the game passes `api`, so the node tests can run it
// with plain objects.
//   api.time                    the game clock (s)
//   api.near(e, radius, max)    living monsters near e (not e), nearest first
//   api.damage(t, amount, o)    a hero's hit on t (combat.damageEnemy); o.knockFrom
//                               and o.knockSpeed ask for a shove away from a point
//   api.fx?.chain(e, list) / shock(e) / freeze(e) / burn(e)   the look of it
import { PROC } from './loot.js';

// Set a monster burning (as heroes/kit.js burn: statusTick deals it).
export function burnOn(e, dps, dur, src, now) {
  if (e.dead) return;
  const keep = e.pjBurn && e.pjBurn.until > now ? e.pjBurn.dps : 0;
  e.pjBurn = { until: now + dur, dps: Math.max(dps, keep), src, tick: e.pjBurn?.tick ?? 0.3 };
}
// Freeze a monster solid: held in place and its attack cancelled (not a boss).
export function freezeSolid(e, dur, now) {
  if (e.dead || e.isBoss || e.isDummy) return false;
  e.sealT = Math.max(e.sealT ?? 0, dur);
  e.cancelAttack?.();
  if (e.state === 'windup' || e.state === 'recover') { e.state = 'idle'; e.stateT = 0; }
  e.pjFrozenUntil = now + dur;
  return true;
}

// After a hero's hit on e lands: `base` is the hit before the hero's
// multipliers, `dealt` what it did. Returns what happened, for the tests:
// [['heal', n], ['burn', dps], ['freeze'], ['chain', [targets]], ['shock', n]].
export function hitEffects(src, e, base, dealt, o, api, rng = Math.random) {
  const out = [];
  if (!src?.isPlayer || !o?.melee || dealt <= 0) return out;
  const P = src.procs ?? {}, own = !o.proc;   // procs don't set off more procs (no chain of chains)
  // Vampire's Kiss: heals a share of the melee damage dealt
  const ls = src.stats?.lifesteal ?? 0;
  if (ls > 0) { const n = dealt * ls; src.heal?.(n, true); out.push(['heal', n]); }
  // Boreas's Chill: slows always, sometimes freezes solid
  if (P.freeze) {
    e.slowT = Math.max(e.slowT ?? 0, 1 + P.freeze * 0.4);
    if (own && rng() < PROC.freeze(P.freeze) && freezeSolid(e, PROC.freezeFor, api.time)) { out.push(['freeze']); api.fx?.freeze?.(e); }
  }
  if (!own) return out;
  // Forge Flame: sets the monster burning
  if (P.burn && !e.dead) { const dps = base * PROC.burn(P.burn); burnOn(e, dps, PROC.burnFor, src, api.time); out.push(['burn', dps]); api.fx?.burn?.(e); }
  // Chain Lightning: leaps to the monsters near the one hit
  if (P.chain && rng() < PROC.chain(P.chain)) {
    const list = api.near(e, PROC.chainRange, PROC.chainTargets(P.chain));
    for (const t of list) api.damage(t, base * PROC.chainDmg, { proc: true, unblockable: true, stagger: 0.35, color: '#bfe0ff' });
    out.push(['chain', list]); api.fx?.chain?.(e, list);
  }
  // Poseidon's Shove: a burst round the monster hit that shoves its neighbours away
  if (P.shock && rng() < PROC.shock(P.shock)) {
    const list = api.near(e, PROC.shockRadius, 8);
    for (const t of list) api.damage(t, base * PROC.shockDmg, { proc: true, stagger: 0.4, knockFrom: e.pos, knockSpeed: PROC.shockKnock, color: '#9ae8ff' });
    out.push(['shock', list.length]); api.fx?.shock?.(e);
  }
  return out;
}

// ---------------------------------------------------------------- magic items
// A magic item with charges (loot.js `charges`): each use spends one, and one
// comes back every cooldown; a short gate keeps a held button from emptying
// it at once. A one-charge item works as a plain cooldown. art: { cd, cdLeft,
// charges, maxCharges, gate } (gearStats makes it); cdr: the hero's cooldown cut.
export const ARTIFACT_GATE = 0.35;
export function tickArtifact(art, dt, cdr = 0) {
  art.gate = Math.max(0, (art.gate ?? 0) - dt);
  const max = art.maxCharges ?? 1;
  if ((art.charges ?? max) < max) {
    art.cdLeft -= dt;
    if (art.cdLeft <= 0) { art.charges = (art.charges ?? 0) + 1; art.cdLeft = art.charges < max ? art.cd * (1 - cdr) + art.cdLeft : 0; }
  } else art.cdLeft = 0;
  return art;
}
export const artifactReady = (art) => (art.charges ?? 1) > 0 && (art.gate ?? 0) <= 0;
// Spend a charge (false if none is ready).
export function spendArtifact(art, cdr = 0) {
  if (!artifactReady(art)) return false;
  const max = art.maxCharges ?? 1;
  if ((art.charges ?? max) >= max) art.cdLeft = art.cd * (1 - cdr);   // the recharge starts with the first use
  art.charges = (art.charges ?? max) - 1; art.gate = ARTIFACT_GATE;
  return true;
}
