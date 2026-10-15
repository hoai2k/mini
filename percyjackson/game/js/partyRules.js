// The party rules, as pure functions (no Three.js, no DOM), so the node tests
// can check them; party.js, the hero select (ui/partySelect.js) and the
// online room (net/online.js) run them.
//
// Who plays:
//   the opening   (the Manhattan prologue, chapter 1 in the museum, chapter 2
//                 on Half-Blood Hill and their cutscenes; story/opening.js)
//                 follows the story: one hero per person, in story order, and
//                 no AI companions. Player 1 is Percy, player 2 Grover, player
//                 3 Annabeth, player 4 Clarisse (the next Book 1 demigod).
//                 Joining or leaving adds or removes the matching hero.
//   from camp on  each person picks any hero they have met or unlocked, and
//                 the AI fills the party up to three (from the unlocked heroes
//                 only, so never more than those).
//
// Companions follow their leader and never start a fight: they only go for a
// monster that is already in the battle (companionShouldEngage).

// The heroes of the opening, in the order people join (player 1 first).
export const STORY_HEROES = ['percy', 'grover', 'annabeth', 'clarisse'];
export const PARTY_MIN = 3;   // from camp on, the AI fills the party to this many heroes

// The heroes of the opening for `humans` people.
export function storyHeroes(humans) { return STORY_HEROES.slice(0, Math.max(1, Math.min(STORY_HEROES.length, humans | 0))); }

// How many AI companions a party of `humans` people has. `available`: how many
// heroes are unlocked (the AI only plays those).
export function companionsWanted(humans, { opening = false, available = Infinity } = {}) {
  if (opening) return 0;
  return Math.max(0, Math.min(PARTY_MIN, available) - humans);
}

// In the opening: which hero each person plays. `heroes` is what each plays
// now, in player order. The wanted set is the story's first n; whoever plays
// one of them keeps it (the first one only, on a tie), the others get the
// missing ones in story order. -> a list as long as `heroes`.
export function storyAssign(heroes) {
  const want = storyHeroes(heroes.length);
  const out = heroes.map(() => null), taken = new Set();
  heroes.forEach((h, i) => { if (want.includes(h) && !taken.has(h)) { out[i] = h; taken.add(h); } });
  const free = want.filter((h) => !taken.has(h));
  return out.map((h) => h ?? free.shift());
}

// The hero select: the heroes slot `i` may choose. In the opening only its
// story hero; after it, every playable hero (unlocked ones; `ids` in order).
export function selectOptions(i, { opening = false, ids = [], unlocked = () => true } = {}) {
  if (opening) return [STORY_HEROES[Math.min(i, STORY_HEROES.length - 1)]];
  return ids.filter((id) => unlocked(id));
}

// Should an AI companion go for this monster? Only one already in the battle:
//   - it is fighting (aggro: it noticed a person, was hit, or its group's
//     alarm went up), or a hero is its target;
//   - a person (not the AI) has hit it (hitBy holds who hit it);
//   - it is rearing up at a hero it noticed, or its group is awake (a group's
//     alarm reaching it; a rat merely eyeing someone doesn't count);
//   - a boss (only met in its arena, which the party walked into).
// A monster milling about, a scout at its post, a sleeping statue or anything
// hidden by the Mist is left to the people, who pick the fights.
// `isHuman(hero)`: is this hero played by a person?
export function companionShouldEngage(e, { isHuman = (h) => !h?.ai } = {}) {
  if (!e || e.dead || e.untargetable || e.disguised || e.isDummy || e.def?.mortal) return false;
  if (e.isBoss) return true;
  if (e.aggro) return true;
  if (e.target && e.target.isPlayer) return true;
  if (e.hitBy) for (const h of e.hitBy.keys()) if (h && isHuman(h)) return true;
  if (e.lastAttacker?.isPlayer && isHuman(e.lastAttacker)) return true;   // (online: a guest's hits reach the host this way)
  const L = e.loiter;
  if (L) {
    if (L.joinT != null || L.pack?.alarmed) return true;
    if (L.alertT != null && (L.kind === 'pack' || L.dashing)) return true;
  }
  return false;
}
// May this hero wake a monster just by being seen? People yes, AI companions
// no (they walk behind a person and must not start fights for them).
export const wakesMonsters = (hero) => !!hero && !hero.ai;
