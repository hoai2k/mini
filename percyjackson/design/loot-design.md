# Half-Blood Quests: loot design (drops, power, variety and pickup feedback)

This document compares our loot with *Minecraft Dungeons II* (MCD2, 2026), and
with the original *Minecraft Dungeons* (MCD1) where that helps. It then
proposes the numbers, items, feedback and sounds that bring us in line with
MCD2. It is the phase-1 research and design. Phase 2 (the code) follows the
plan at the end and is in the game; section 2 describes the game as it was
before it, and "Phase 2: as built" at the end of section 7 lists where the
code differs from this design.

Sources are listed at the end and cited inline as [S1], [S2] and so on. Most
MCD2 figures come from fan sites that read the game's data files, not from
Mojang. Each section says how far its figures can be trusted.

---

## 1. Minecraft Dungeons II: what the research found

### 1.1 Rarity tiers and effects

| Tier | Random effects | Fixed effect | Item power offset | Source |
| --- | --- | --- | --- | --- |
| Common | 0 | — | −2 | [S1] [S3] [S4] |
| Rare | 1 | — | −2 | [S1] [S3] [S4] |
| Special | 2 | — | −1 | [S1] [S3] [S4] |
| Unique | 1 | 1 signature (often one no other item can roll) | 0 | [S3] [S4] [S5] |

- A Unique is not on a loot table of its own. It is a base item that rolled
  Unique and became its named version, so the Pike becomes Stormcaller [S2].
  The minecraft.wiki says Uniques "can only drop with the unique rarity" [S5].
- Soul Storm rewards add one extra random effect to Rare, Special and Unique
  items [S3] [S4]. No item carries more than four effects [S1].
- Talismans and artifacts **cannot** roll Unique, and talismans have no rarity
  at all [S6].
- **Colours:** we found no written source for the MCD2 colours. One guide
  calls Uniques "orange-bordered" [S2]. MCD1 used white (Common),
  green-turquoise (Rare) and orange (Unique) [S7]. *Uncertain:* the colour of
  Special.
- Effects are grouped by tags, and a re-roll "draws mostly from its own
  theme" [S4] [S8]. The fan wiki lists 76 item effects. Some of them affect
  loot: **Raider** gives a chance of higher-rarity drops, **Looter** a chance
  of extra drops, and **Luck** a chance of duplicate drops [S9]. The Looter's
  Charm talisman adds +1%, +2% or +4% chance (tiers I to III) that a defeated
  enemy drops loot [S10].

### 1.2 Rarity odds by source

These are from metabot.gg, which works them out from the game's weights for
build 1.1.1.0 [S1] [S2]. They are not official figures.

| Source | Common | Rare | Special | Unique | Weights / rule |
| --- | --- | --- | --- | --- | --- |
| Regular enemy | 50% | 25% | 20% | 5% | 50 / 25 / 20 / 5 |
| Wooden chest | 33.3% | 33.3% | 26.7% | 6.7% | Commons halved |
| Fancy chest, mini-boss, "piggy bank" mob | 0 | 50% | 40% | 10% | no Commons |
| Boss | 0 | 50% | 33.3% | 16.7% | Rare 30, Special 20, Unique 10 |
| Soul Storm reward chest | 0 | ~1% | 79.2% | 19.8% | Rare × 0.01 |
| Default quest reward | 22.2% | 44.4% | 29.6% | 3.7% | |

- **Level ramp** (from the in-game weights quoted by the fan wiki [S11] and
  maxroll [S3]): the Common weight falls from 1 at level 1 to 0.5 by level 6.
  Rare starts at 0.6, peaks at 1 at level 5 and falls to 0.5 by level 15.
  Special cannot roll at level 1 and reaches 1 by level 11. Unique cannot roll
  at level 1 and reaches 1 by level 13. *Our reading* is that these level
  factors multiply the source weights above. metabot only says that a level-40
  hero rolls a "slightly better" table than a level-10 hero [S2].
- **Difficulty:** Easy multiplies the Special and Unique weights by zero, so
  random drops are never Special or Unique there. Normal and Hard use the full
  table, and Hard does not change the weights [S2] [S12].
- **Pity:** none is documented [S2]. Guaranteed Uniques come only from
  quests that name a specific reward, for example *The Final Souldown*: Emerald
  Hammer and two Humbler pieces on the first clear, and a Unique from the
  area's loot on every clear [S13] [S14]. One guide says a boss's first rematch
  pays a Unique once [S8] (*uncertain*, single source).
- **Area pools:** each area has a weighted pool of base items. A given Unique's
  chance is its base item's share of the pool times the source's Unique rate.
  For example, Stormcaller has 2.8% per fancy chest in Humbler Huskland, and
  the rarest Uniques run near 0.08% [S12].

### 1.3 Drop frequency and currency

| Source | Drops (average) | Source |
| --- | --- | --- |
| Any hostile mob | Emeralds: 5 tries at 2.5% each, 17% of them as blocks of 9 → **0.3** | [S15] |
| Any chest | **15** emeralds (10 + up to 10 more at 50% each) | [S15] |
| Emerald pot | **3** (1 + up to 4 more at 50%) | [S15] |
| Quests (small → extra large) | 14.6 / 40 / 75 / 108.8 emeralds | [S15] |
| Boss (Monstrous Opus) | Gear: **1 guaranteed + 6 at 50%** (1 to 7, about 4). Each piece 50% Rare, 33% Special, 17% Unique. Echo Shards 5 + 5 × 50% | [S13] |
| Boss (Prime Enchanter) | about 1.5 items a kill | [S12] |
| Mini-boss | Echo Shards 2 + 3 × 50% (3.5); gear on the mini-boss rarity table | [S15] [S1] |
| Open world | 237 chests (about 3,555 emeralds), 1,253 emerald pots (about 3,759) | [S15] |

- Mobs pay very little currency. Chests, pots and quests pay most of it.
- Item drops from ordinary mobs are uncommon. The base chance is not
  published, but it is small enough that +1% to +4% from the Looter's Charm is
  worth a talisman slot [S10] (*uncertain:* the exact base chance).
- **Co-op:** "Currency is shared equally, but each player gets separate loot
  drops," scaled to each player [S16].
- Chests restock after a log-out [S8]. Each gear type holds 80 items, and
  salvaged items can be bought back [S8]. Emeralds are capped at 99,999
  (raised from 9,999 on 1 October 2026) [S17] [S15].

### 1.4 Power level

- Your power level comes from your equipped items and decides how hard you hit
  mobs and how hard they hit you [S11]. Artifacts count toward it [S8].
- The Blacksmith raises an item's power to your hero level for emeralds [S3]
  [S18]. Raising a Rare costs ×1.1, a Special ×1.2 and a Unique ×1.3 [S2]. In
  one player's measurement the same +2 step cost 62 emeralds for a Rare and
  182 for a Unique [S8]. Item power tops out around 149 or 150 at hero level
  100 [S18] [S8] (*sources disagree by one*). One guide says your item power
  against the area's level gives a damage multiplier that peaks at 1.75×
  [S18] (*single source*).
- Each level gives an enchantment point and better rarity odds [S11].
  Monsters grow with you [S11]. The inventory warns you when an equipped item
  has fallen too far behind [S8]. Merchants never sell Uniques, and a level-3
  merchant sells Specials at most [S2].

### 1.5 Variety

| Category | MCD2 count [S1] | MCD1 count [S19] |
| --- | --- | --- |
| Melee weapons | 58 | 82 (56 unique) |
| Ranged weapons | 22 | 71 (48 unique) |
| Armour | 38 sets × 4 pieces (helmet, chest, legs, boots) = 152 | 71 (40 unique) |
| Artifacts | 40 (3 slots) | 44 (3 slots) |
| Talismans | 24 (3 slots, levels I to III, no rarity) [S6] | — |
| Uniques | **sources disagree:** 116 [S14]; 20 melee + 8 ranged + 12 armour sets [S5]; 40 unique weapons [S20] | 143 |

MCD2 has a melee weapon, a ranged weapon, four armour pieces, three artifacts
and three talismans [S21] [S3]. Each item takes only one enchantment now,
where MCD1 stacked several [S21].

### 1.6 Pickup feedback and inventory presentation

**What sources confirm:**

- Loot is per player [S16]. A mini-inventory opens when you hold the
  inventory button. All four couch players can use it at once, and it doesn't
  pause anyone else [S22] [S23].
- The inventory warns you about outdated gear [S8]. It shows the total power
  of the equipped items (MCD1) [S24].
- Uniques have orange borders [S2].
- Players have asked for green/red stat comparisons, and mods add them. The
  base game shows power but not a stat-by-stat diff [S23] (*uncertain:* the
  base game may already show more).

**What we could not confirm from a written source:** whether MCD2 shows
light beams by rarity, rarity-specific pickup sounds, the layout of the pickup
toast, or a chest or boss loot fanfare. Searches of the wikis, guides and
reviews turned up nothing on these [S7]. The magnet pickup for currency exists
only as an MCD2 mod [S25], which suggests the base game does not pull gear in.
*Our design for these details (section 4) follows the genre and MCD1 as
commonly seen in play. Treat it as our own design, not as a match to MCD2.*

---

## 2. Our current system (as of this audit)

Code read: `game/js/loot.js`, `lootdrops.js`, `pickups.js`, `progression.js`,
`main.js` (`onEnemyKilled`, `onChestOpened`, `maybeDropFromMonster`),
`mission.js` (`openChest`, `onBossKilled`), `openworld/runtime.js`,
`openworld/quests.js`, `world/levelgen.js`, `audio.js`, `ui/inventory.js`
and `style.css`.

### 2.1 Items

| Kind | Common | Rare | Legendary (`unique`) | Total |
| --- | --- | --- | --- | --- |
| Weapons | 6 | 10 | 11 | **27** |
| Armour | 4 | 8 | 6 | **18** |
| Magic items | 6 | 11 | 6 | **23** |
| **All** | 16 | 29 | 23 | **68** |

The "Loot and items" section of `game-design.md` says 61 items (22, 16 and
23). It is out of date. There are 30 enchantments (15 for weapons, 15 for armour, 6 of them also on magic items), 1 ranged attack per hero
(no ranged slot), 1 armour slot and 2 magic-item slots. Rarity is fixed per
base item: there is no "Heroic" tier, and an item can't roll a higher
rarity.

### 2.2 Rarity and power (`progression.js`, `loot.js`)

- **Rarity odds** for monster drops and common chests (`rarityOdds(gl)`, where
  gl is the gear level, 1 to 12):

  | Gear level | Legendary | Rare | Common | Blessed |
  | --- | --- | --- | --- | --- |
  | 1 | 4.2% | 22.5% | 73.3% | 1.5% |
  | 3 | 6.6% | 27.5% | 65.9% | 2.1% |
  | 6 | 10.2% | 35.0% | 54.8% | 3.0% |
  | 9 | 13.8% | 42.5% | 43.7% | 3.9% |
  | 12 | 17.4% | 50.0% | 32.6% | 4.8% |

  There is no difference by source except fixed overrides. The first item of
  a rare chest is always Rare. The first item from a boss is 45% Legendary,
  otherwise Rare. A champion's drop is 35% Legendary, otherwise Rare.
  Difficulty only matters through the monster level.
- **Power:** `powerAt(gl) = 10 + 13 (gl − 1)` (power 10 to 153).
  `gearLevel` pulls the drop up to +1 level toward the player's level. Sources
  add a bonus: rare chest +0.3, boss +0.7, champion +0.8, epic chest +1, quest
  +0.3, shop −0.3. The spread is ±0.4 of a level, then ±2 power. Strength is
  `1 + 2% × (power − 10)`, so 3.86× at power 153.
- **Rarity also multiplies strength out of sight:** Common ×1.00, Rare ×1.12,
  Legendary ×1.25 (`RARITY.mult`). That comes on top of the Legendaries'
  better base stats (damage 1.35 to 1.6 against 0.9 to 1.3 for Commons), so a
  Legendary is about 1.8× a Common of the same power. The shown power doesn't
  include this.
- **Enchantment rows:** Common 1 (2 choices), Rare 2 (3 choices), Legendary 3
  (one of them the fixed signature). A Blessed item adds one enchantment at
  III and +2 power.
- **Economy:** salvage is 8 / 25 / 60 drachmas (×1.5 Blessed, × a power
  factor), the shop price is salvage × 3.2 + 10, a temper costs 10 + 0.9 ×
  power and a re-roll 15 + 0.6 × power. The shop sells Legendaries.

### 2.3 Drop sources (per human player, `main.js`, `mission.js`, `openworld/runtime.js`)

| Source | Items | Drachmas | Other |
| --- | --- | --- | --- |
| Minor monster | **0** | `def.coins`, mostly [0, 2] to [1, 3] (about 1), × (1 + 0.15 (level − 1)) | 8% heal, 12% Power orb, ammo |
| Elite-tier monster (hellhound, dracaena …) | 6% chance | [2, 4] to [7, 12] | |
| Affixed elite | 18% chance | same | |
| Champion-tier kind (cyclops) | 50% chance | [15, 25] | |
| Open-world champion | 100% (35% Legendary) + an epic chest (2 items) | | |
| Common chest | 1 | 6 to 11 (mission), 8 to 15 (open world) | 50 to 60% heal |
| Rare chest (secret room, open-world rare) | 1 Rare + 50% a second | +10 / +14 | |
| Boss (chapter) | 2 from the reward chest (45% Legendary, then random) | 40 coins on the floor | 3 heals |
| Side quest | 1 (rarity as the quest says) | by quest | |
| Chapter complete | 0 items (XP only) | | |
| Breakables (crates, barrels) | 0 | 0 | ammo |

A chapter has 3 to 5 combat rooms (45% chest chance each) and 2 to 3 side
rooms (always a chest, one of them a rare chest in the secret room). That
makes **about 3.5 to 5.5 chests**. A player therefore finds about **7 to 9
items per chapter**. About 5 of them come from chests and 2 from the boss,
with the rest from elites now and then. Normal monsters never drop gear.

**Boss drops** come from the same random pool as any chest. No boss has its
own item, and nothing is guaranteed beyond "2 items, the first Rare or
Legendary". The 12 chapters have 11 bosses (chapter 8, the casino, has none).

### 2.4 Pickup feedback (`lootdrops.js`, `pickups.js`, `audio.js`, `style.css`)

- **Item drop:** an item appears instantly 1 to 2.5 m from the source (no
  arc) as a spinning 0.45 m cube in its rarity colour. It has a 9 m beam
  (opacity 0.35) of the same height for every rarity, a ring in the owner's
  colour, a point light (2.5, 5 m), a burst of 18 particles, and
  `audio.loot(rarity)`. Chest items are staggered 260 ms apart. The hero picks
  an item up by walking within 1.5 m (no magnet).
- **Pickup:** `audio.ui('buy')` plays, the same two-tone blip for every
  rarity. A card at the bottom right shows the icon (emoji), the name in the
  rarity colour, the rarity, kind and power, and ▲ / ▼ for power, damage,
  speed, health and armour. It stays 4.2 s, three at most.
- **Coins, heal and Power orbs** pop out, bounce, and are pulled in from
  3.8 m after 0.45 s. Coins play the `coin` sample.
- **Sounds:** `audio.loot()` plays one recorded `loot` file for every rarity
  (a Legendary also adds a synthesised C-major arpeggio). A chest plays the
  `chest` sample. A boss plays nothing for its loot, and there is no pickup
  sound by rarity.
- **Audio system:** a hybrid. `audio.sample(id)` plays recorded MP3s from
  `game/assets/sfx/` (listed in `index.json`, made by
  `design/source/build_sfx.py` with the ElevenLabs API) and returns false when
  a file is missing. Callers then fall back to WebAudio synthesis
  (`tone()` / `noise()`).
- **Inventory:** the NEW badge, a green ▲ when the item beats what you wear
  (`isUpgrade`, `gearScore`), a ★ for a hero's favourites, power ▲ / ▼ chips
  and stat diffs. Icons are emoji, and there is no new-item counter on the
  HUD.

---

## 3. Side by side, and the gaps

| | Minecraft Dungeons II | Half-Blood Quests now | Gap |
| --- | --- | --- | --- |
| Rarity tiers | 4: Common, Rare, Special, Unique | 3 + Blessed overlay | **No middle tier.** Rarity is fixed per base item |
| What rarity gives | Effects: 0 / 1 / 2 / 1 + signature; power offset −2 / −2 / −1 / 0 | Rows 1 / 2 / 3 **and a hidden ×1.00 / 1.12 / 1.25 strength** | Rarity is mostly hidden power, not visible effects |
| Odds by source | Separate tables: no Commons from fancy chests, mini-bosses or bosses; Unique 5 / 6.7 / 10 / 16.7% | One curve by gear level, plus overrides | **Boss and elite tables are not distinct enough.** There is no level ramp tied to player level |
| Difficulty | Easy has no Special or Unique; Hard is the same as Normal | Only through the monster level | Harder difficulties give no rarity bonus |
| Mob drops | Uncommon but real; Looter's Charm +1 to +4% | **Minor monsters never drop gear** | Kills carry no item excitement |
| Boss drops | 1 guaranteed + 6 × 50% (≈4) on the boss table; quest-fixed Uniques on first clear | 2 from the reward chest | Too few. **No signature items, no first-clear reward** |
| Mission reward | Quest reward: fixed item(s) + random loot | XP only | No end-of-chapter item |
| Currency | Mob 0.3; chest 15; pot 3; quests 15 to 109 | Mob ≈1 (×level); chest 6 to 11; boss 40 | Mobs pay too much compared with chests; breakables pay nothing |
| Pity | None | None | (we propose a gentle one for younger players) |
| Power upgrade | Blacksmith to hero level; cost × rarity 1.1 / 1.2 / 1.3 | Temper +¼ level per step up to a cap | No "bring it up to my level" step; costs ignore rarity |
| Shop | Never sells Uniques | Sells Legendaries | Legendaries can be bought |
| Item count | ≈80 weapons, 38 armour sets, 40 artifacts, 24 talismans | 27 weapons, 18 armours, 23 magic items | About ⅓ of the variety. **No signature boss uniques** |
| Loot affixes | Effects with tags ("Raider", "Looter", "Luck") | Tyche's Luck (drachmas only) | No "more drops" or "better rarity" effects |
| Co-op | Per player, currency shared | Per player, coins to whoever picks them up | Matches |
| Drop visuals | Unconfirmed in sources | Beam same height for every rarity, instant placement | **Rarity barely shows on the ground** |
| Pickup sounds | Unconfirmed | One sound for all | **No rarity escalation in sound** |
| Inventory | Mini-inventory overlay, outdated-gear warning, 80 per type | Full menu, NEW badge, ▲ / ▼ | No outdated warning, no HUD count of new items, emoji icons |

---

## 4. Proposal

All numbers are per human player (loot stays per player, as in MCD2). They are
starting values, kept as named constants in phase 2 so they can be tuned.

### 4.1 Rarity: four tiers, effects not hidden power

| Tier (`id`) | Label | Colour | Enchant rows | Choices per row | Boons | Strength × (was) |
| --- | --- | --- | --- | --- | --- | --- |
| `common` | Common | `#d8cfbd` parchment | 1 | 2 | 0 | 1.00 (1.00) |
| `rare` | Rare | `#3fe0b0` turquoise (MCD1's rare green; was `#4ad0ff`) | 2 | 3 | 1 | 1.02 (1.12) |
| `heroic` *(new)* | Heroic | `#b884ff` violet (our choice; MCD2's Special colour is unconfirmed) | 2 | 3 | 2 | 1.05 (—) |
| `unique` | Legendary | `#ff9a2a` orange | 3 (one is the fixed signature) | 3 | 1 | 1.08 (1.25) |
| Blessed (overlay) | Blessed | `#ffd84a` gold | +1 enchantment at III | — | +0 | +2 power (as now) |

- **Boons** are MCD2's random effects. They are small, rolled stats that
  can't be invested in, shown as a line on the item. Each rolls uniformly
  in its range, and an item never has the same boon twice.

  | Boon | For | Range |
  | --- | --- | --- |
  | Keen | weapon | +4 to 8% melee damage |
  | Swift | weapon | +4 to 8% attack speed |
  | Giant-Slayer | weapon | +6 to 12% damage to elites, champions and bosses |
  | Vicious | weapon | +2 to 4% critical chance |
  | Long Reach | weapon | +4 to 8% reach |
  | Sturdy | armour | +8 to 15 health (× item strength) |
  | Guarded | armour | +2 to 4% damage reduction |
  | Fleet | armour | +3 to 6% move speed |
  | Focused | armour, magic | −3 to 6% cooldowns |
  | Hale | armour | +5 to 10% healing received |
  | Deep Quiver | armour | +1 to 3 shots |
  | Potent | magic | +5 to 10% ability damage |
  | Surging | magic, armour | +5 to 10% Power gain |
  | Lasting | magic | +10 to 20% duration of this magic item's effect |
  | Fortunate | any | +5 to 10% drachmas |

- **Rarity moves into effects.** The hidden strength multiplier shrinks from
  1.00 / 1.12 / 1.25 to 1.00 / 1.02 / 1.05 / 1.08, which is MCD2's −2 / −1 / 0
  offsets measured at our power scale. Legendaries keep their edge through
  base stats, the signature and three rows. *Balance check for phase 2:*
  average player damage drops about 4%. Re-run the combat and loot tests, and
  if fights feel slower, set `powerMult` to 2.1% per point.
- **Rolling an item** (`rollItem`): first roll the tier from §4.2. Then pick
  the base:
  - Common: a Common base.
  - Rare: a Rare base (70%) or a Common base raised to Rare (30%).
  - Heroic: any Common or Rare base, raised to Heroic. Heroic is a roll, not a
    kind of base, as MCD2's Special is.
  - Legendary: a Legendary base.

  The base keeps its own stats. The tier decides rows and boons. Hero
  favourites keep their 35% pull.

### 4.2 Rarity weights by source, level and difficulty

These are MCD2's source weights [S1] [S2], except the Legendary column, which
the owner raised about 1.6× (it was 5 / 10 / 10 / 5) after repeat runs found
the best weapon a few per cent weaker at levels 3 to 12:

| Source (`source`) | Common | Rare | Heroic | Legendary |
| --- | --- | --- | --- | --- |
| `monster` (minor and elite-tier) | 50 | 25 | 20 | 8 |
| `chest` (common chest) | 25 | 25 | 20 | 8 |
| `rare` (rare chest), `elite` (affixed elite), `champion` | 0 | 50 | 40 | 16 |
| `boss`, `epic` (epic chest) | 0 | 30 | 20 | 18 |
| `quest` (side quest, chapter reward) | 30 | 60 | 40 | 8 |
| `shop` | 40 | 40 | 20 | **0** (MCD2 merchants never sell Uniques) |

The weights are multiplied by **player-level factors**. These are MCD2's ramp
[S11], with a floor of 0.15 for Heroic and 0.25 for Legendary from level 2 (the
Legendary ramp is also faster, over 9 levels instead of 12), because our
campaign ends near level 35 rather than 100:

```
common(L)    = 1 − 0.5 · clamp((L − 1) / 5)
rare(L)      = L ≤ 5 ? 0.6 + 0.4 · (L − 1) / 4 : 1 − 0.5 · clamp((L − 5) / 10)
heroic(L)    = L < 2 ? 0 : max(0.15, clamp((L − 1) / 10))
legendary(L) = L < 2 ? 0 : max(0.25, clamp((L − 1) / 9))
```

Heroic and Legendary are then multiplied by the **difficulty** factor
`1 + 0.25 · (difficulty − 1)`: Mortal ×1 up to ×1.75 at the top step. We don't
copy MCD2's "Easy gives none", because a children's game should not take the
best loot away from the gentlest setting.

The resulting odds, as Common / Rare / Heroic / Legendary in %:

| Source | Level 1 | Level 4 | Level 6 | Level 10 | Level 13+ | Level 13+, top difficulty |
| --- | --- | --- | --- | --- | --- | --- |
| Monster | 77 / 23 / 0 / 0 | 53 / 34 / 9.1 / 4 | 40 / 38 / 16 / 7 | 36 / 27 / 26 / 11 | 37 / 22 / 29 / **12** | 28 / 17 / 39 / 16 |
| Common chest | 63 / 38 / 0 / 0 | 36 / 46 / 12 / 5.5 | 25 / 47 / 20 / 8.8 | 22 / 33 / 31 / 14 | 23 / 27 / 36 / **14** | 16 / 20 / 46 / 18 |
| Rare chest, elite, champion | 0 / 100 / 0 / 0 | 0 / 72 / 19 / 8.6 | 0 / 62 / 26 / 12 | 0 / 42 / 40 / 18 | 0 / 35 / 47 / **19** | 0 / 23 / 55 / 22 |
| Boss, epic chest | 0 / 100 / 0 / 0 | 0 / 69 / 15 / 15 | 0 / 59 / 21 / 21 | 0 / 38 / 31 / 31 | 0 / 32 / 36 / **32** | 0 / 21 / 41 / 37 |
| Quest, chapter reward | 45 / 55 / 0 / 0 | 23 / 60 / 13 / 3 | 16 / 59 / 21 / 4.6 | 14 / 43 / 35 / 7.7 | 15 / 36 / 40 / **8.1** | 11 / 27 / 52 / 10 |

At level 1 no random drop is Heroic or Legendary. The first boss's guaranteed
**signature legendary** (§4.4) gives chapter 1 its big moment instead.
**Blessed** keeps `blessedChance(gl)` (1.5% to 4.8%, capped at 6%), rolled on
Rare and better only.

**The Fates' Thread (gentle pity, our addition; MCD2 has none):** each profile
counts the item drops since its last Legendary (`save.data.sinceLegendary`).
At **30**, the next drop from a rare chest, elite, champion, boss or epic chest
is Legendary. Any Legendary resets the count. At about 13 drops a chapter that
is at most about 2 to 3 chapters without one. Normal play rarely reaches it
(at level 6, 30 drops miss a Legendary about 5 to 8% of the time).

### 4.3 Drop frequency

| Source | Item chance (per human player within 40 m of the kill) | Drachmas | Notes |
| --- | --- | --- | --- |
| Minor monster (`tier: 'minor'`) | **2%** (`monster` table) | 40% chance of 1 to 2 (avg 0.6) × level factor | was 0 items, ≈1 coin |
| Swarm fodder (`entities/fodder.js`) | **0.4%** | 15% chance of 1 | hordes |
| Elite-tier kind (hellhound, dracaena …) | **8%** (`monster`) | as now ([2, 4] to [7, 12]) | was 6% |
| Affixed elite (`e.elite`) | **25%** (`elite` table: no Commons) | ×2 | was 18% |
| Champion-tier kind (cyclops) | **60%** (`champion`) | as now | was 50% |
| Open-world champion | **1 + 50% a second** (`champion`) + its epic chest (2, `epic`) | as now | was 1 (35% Legendary) |
| Common chest | **1** (`chest`) | 10 + 5 × 50% (avg 12.5) × level factor | was 6 to 11 |
| Rare chest | **1 + 50% a second** (`rare`) | 18 + 8 × 50% (avg 22) | |
| Epic chest (champion, trial) | **2** (`epic`) | 35 + 10 × 50% (avg 40) | |
| Boss (on death, from the boss) | **1 guaranteed + 3 × 50%** (1 to 4, avg 2.5), `boss` table. **+ the signature item on the first win** (§4.4) | 50 + 10 × 50% (avg 55) as a drachma fountain | was 2 from the chest, 40 coins |
| Chapter complete (the exit reward chest) | **1** (`quest` table) + drachmas 20 × chapter level | | **new**: MCD2's quest reward. It shows in the results' existing `#results-loot` list |
| Side quest | as now (its `item` rarity, else the `quest` table) | as now | |
| Pots, urns, crates, barrels | 0 items | **30%: 1 + 4 × 50%** (avg 3 when it pays) | MCD2's emerald pots (we have none now) |

- **Level factor** for drachmas, as today: `1 + 0.15 (level − 1)`.
- **Drachma stacks:** a payout of 5 or more drops as stacks worth 5, like
  MCD2's blocks of 9 emeralds. There are fewer meshes and the sound is bigger
  (`coin_stack`).
- **New enchantments** (MCD2's Looter and Raider, as Percy Jackson gods):
  - **Hermes's Haul** (armour or magic item): +1 / +2 / +4% item drop chance
    from monsters (the Looter's Charm tiers [S10]).
  - **Tyche's Favour** (armour or magic item, powerful): 4 / 7 / 10% chance a
    drop rolls one tier higher (Raider [S9]).
- **Expected items per player per chapter.** This assumes about 120 minor
  kills, 8 elite-tier kills, 3 affixed elites, 4.5 chests (1 rare) and the
  boss. *Measure the real kill counts with a seed sweep in phase 2.*

  | Source | Items |
  | --- | --- |
  | Monsters | 2.4 |
  | Elites | 0.6 + 0.75 |
  | Chests | 3.5 + 1.5 |
  | Boss | 2.5 (+1 signature on the first win) |
  | Chapter reward | 1 |
  | **Total** | **≈ 12 to 13** (now ≈ 7 to 9) |

  MCD2 bosses alone give about 4 [S13], so this is in the same range.

### 4.4 Boss drops: signature legendaries

Every chapter boss has a **signature** Legendary. MCD2's quest-fixed Uniques
[S13] and its "boss rematch pays a Unique" [S8] are the model.

- **First win** over that boss on a profile: the signature drops for every
  human player, guaranteed, at boss power. It is Blessed at difficulty 3 and
  above. The win is recorded in `save.data.signatures[bossId] = difficulty`. A
  first win on a *higher* difficulty drops it again at the new power.
- **Later wins:** when the boss table rolls Legendary, the signature is picked
  **50%** of the time, otherwise any Legendary (the "farm the boss" loop,
  [S21]).
- Card and toast: "Signature drop · *Horn of the Minotaur*" (6 s, the
  Legendary card).

| Chapter | Boss | Signature | Kind | Status |
| --- | --- | --- | --- | --- |
| lt1 | Alecto (Mrs Dodds) | **Fury's Flaming Lash** `fury_lash` | weapon | new |
| lt2 | Minotaur | **Horn of the Minotaur** `minotaur_horn` | weapon | new |
| lt3 | Hellhound alpha | **Hellhound Hide** `hellhound_hide` | armour | new |
| lt4 | The Furies | **Wings of the Kindly Ones** `fury_wings` | armour | new |
| lt5 | Medusa | Medusa's Head `medusa_head` | magic | exists |
| lt6 | Chimera | **Chimera Fang Spear** `chimera_fang` | weapon | new |
| lt7 | Hephaestus's spiders (Waterland) | **Shield of Ares** `ares_shield` (the shield Percy recovers there) | magic | new |
| lt8 | — (the casino escape) | **Lotus Casino Card** `lotus_card` (the chapter reward, first clear) | magic | new |
| lt9 | Procrustes | **Procrustes's Cleaver** `procrustes_axe` | weapon | new |
| lt10 | Cerberus | **Cerberus's Red Ball** `cerberus_ball` | magic | new |
| lt11 | Ares | Burning Sword of Ares `ares_sword` | weapon | exists |
| lt12 | Luke | Backbiter `backbiter` | weapon | exists |

Open-world champions use the `champion` table. `drakon_scale` is the
signature of the drakon-type champions where one exists. Otherwise it is in
the normal Legendary pool.

### 4.5 New items (variety: 68 → 84)

There are 16 new items: 5 weapons, 6 armours and 5 magic items. Three of the
signatures (§4.4) already exist. Values follow the conventions of `loot.js`.

| id | Name | Kind | Tier | Stats | Fixed enchantment / act |
| --- | --- | --- | --- | --- | --- |
| `hunter_knives` | Hunter's Moon Knives | weapon | rare | dmg 1.0, speed 1.3, reach 0.9, `twin` | — (★ Annabeth) |
| `fury_lash` | Fury's Flaming Lash | weapon | legendary | dmg 1.3, speed 1.1, reach 1.55, arc 0.8 | `fire_aspect` |
| `minotaur_horn` | Horn of the Minotaur | weapon | legendary | dmg 1.45, speed 1.0, knock 1.7 | `rampaging` (★ Percy) |
| `chimera_fang` | Chimera Fang Spear | weapon | legendary | dmg 1.4, speed 1.0, reach 1.4, arc 0.7 | **`venom`** (new: hits poison for 4 s at 8 / 12 / 16% of the hit a second and slow 20%) (★ Clarisse) |
| `procrustes_axe` | Procrustes's Cleaver | weapon | legendary | dmg 1.55, speed 0.85, arc 1.5 | `committed` (★ Tyson) |
| `counsellor_vest` | Camp Counsellor Vest | armour | common | hp 18, armour 0.05, cdr 0.04 | — |
| `lotus_robe` | Lotus Hotel Bathrobe | armour | rare | hp 20, regen 1.2, flaskCdr 0.08 | — |
| `mist_cloak` | Cloak of the Mist | armour | rare | hp 20, evade 0.07, speed 0.04 | — (★ Grover) |
| `fury_wings` | Wings of the Kindly Ones | armour | legendary | hp 30, speed 0.1, evade 0.06 | `speed_synergy` |
| `hellhound_hide` | Hellhound Hide | armour | legendary | hp 40, armour 0.12, speed 0.06 | `thorns` |
| `drakon_scale` | Drakon-Scale Plate | armour | legendary | hp 50, armour 0.2, speed −0.04 | `protection` (★ Tyson) |
| `ares_shield` | Shield of Ares | magic | legendary | cd 16 | **act `bulwark`:** a 4 s bronze dome (r 3.5 m) that blocks shots and knocks back monsters touching it |
| `lotus_card` | Lotus Casino Card | magic | legendary | cd 24 | **act `lotus`:** monsters within 8 m are dazed for 5 s (−60% speed, take +20% damage) |
| `cerberus_ball` | Cerberus's Red Ball | magic | legendary | cd 22 | **act `fetch`:** throw the ball; a spectral three-headed pup chases it for 8 s, biting monsters on the way (40% hero damage per bite) |
| `dionysus_vine` | Dionysus's Grapevine | magic | rare | cd 14 | **act `vines`:** vines root monsters within 6 m for 3 s |
| `hermes_vitamins` | Hermes's Multivitamins | magic | rare, 2 charges | cd 15 | **act `vitamins`:** +25% speed and heal 15% over 4 s |

The totals become 32 weapons (6 / 11 / 15), 24 armours (5 / 10 / 9) and 28
magic items (6 / 13 / 9), **84 base items** plus the Heroic tier on any
Common or Rare base. Across the tiers there are 33 Legendaries, 12 of them
chapter signatures.

**Loot pools by place (MCD2's area pools [S12]):** give each item a few
`tags` (`sea`, `fire`, `storm`, `underworld`, `wild`, `forge`, `hunt`, `war`,
`mortal`). A biome or region lists 2 or 3 tags, and items carrying one of them
get **×3 weight** in that place. Examples: `trident_blade`, `sea_armor` and
`trident_charm` on the beach and at Waterland; `stygian_blade`,
`helm_of_darkness` and `hades`-tagged items in the Underworld; `lotus_*` in
the casino. This makes places feel different without locking any item away.

**Not adopted, on purpose:** MCD2's ranged slot (our heroes have an ammo
ranged attack of their own), its four armour pieces (one armour keeps couch
co-op menus short), and one enchantment per item (our rows are the
MCD1-style choices the game is built around). **Talismans** could come later
as "Camp Beads": three bead slots, no rarity, tiers I to III by XP. That is
optional, for phase 3.

### 4.6 Power curve and economy

- **Power curve unchanged:** `powerAt` 10 + 13 per gear level, 2% per point,
  ±0.4 of a level spread. Source bonuses stay as they are. Add `elite: 0.4`,
  and apply `boss: 0.7` to the boss's own drops.
- **Reforge to level** (the forge, MCD2's Blacksmith): raises an item to
  `powerAt(gearLevel(expectedArea(L), L))` in one step. It costs
  `round((10 + 0.9 × Δpower) × rarityCost)`, where rarityCost is Common 1.0,
  Rare 1.1, Heroic 1.2, Legendary 1.3 [S2]. Tempering keeps its +¼ level
  steps up to `temperCap`, and its costs also use rarityCost. A re-roll costs
  `15 + 0.6 × power`, × rarityCost.
- **Outdated-gear warning** [S8]: an equipped item more than 13 power (one
  gear level) below what now drops gets an amber dot on its slot and on the
  HUD inventory button.
- **Salvage:** Common 8, Rare 18, Heroic 30, Legendary 45 (MCD1's 1 : 2 : 5
  shape [S24], with Heroic in between), × 1.5 if Blessed, × the power factor
  as now. Shop prices stay salvage × 3.2 + 10, and **the shop never sells
  Legendaries** [S2].

---

## 5. Pickup feedback spec

MCD2's exact presentation is unconfirmed (see §1.6), so this follows the
genre and MCD1, scaled so that each tier is unmistakably bigger than the last.

### 5.1 On the ground, by rarity (`lootdrops.js`, a `LOOT_FX` table)

| | Common | Rare | Heroic | Legendary | Blessed (adds) |
| --- | --- | --- | --- | --- | --- |
| Pop-out arc | launched at 2.2 m/s out and 6.5 m/s up (apex ≈1 m, ≈0.65 s), 1 bounce at 30% | same | same + a spin flip | launched 9 m/s up (apex ≈2 m), a slow 1.1 s fall, a shockwave ring on landing | — |
| Beam (height, top radius, opacity) | 2.5 m, 0.12, 0.22 | 6 m, 0.16, 0.32 | 9 m, 0.2, 0.4 | 16 m, 0.26, 0.5 + two slow rotating light shafts | gold spiral of sparkles up the beam |
| Beam growth | 0.25 s after landing | 0.3 s | 0.35 s | 0.6 s with a flash | |
| Point light (intensity, range) | 1.0, 3 m | 2.0, 4.5 m | 3.0, 6 m | 5.0, 9 m + `lights.flash` on landing | +gold tint |
| Landing particles | 10 | 18 | 26 | 40 + a ground ripple ring | +12 gold |
| Item block | 0.4 m cube, emissive 1.0 | 0.45 m, 1.4 | 0.5 m, 1.8 | 0.6 m, 2.4, a slow pulse | |
| Ground ring | owner colour (as now) | | | owner colour + a rarity outer ring | |
| Map / off-screen | — | — | minimap dot | minimap star + **an edge-of-screen arrow** while off screen | |
| Landing sound | `loot_common` | `loot_rare` | `loot_heroic` | `loot_legendary` (heard up to 40 m) | +`pickup_rare` bell, quieter |

- **Stagger:** items from one source land 200 ms apart (boss 120 ms). The
  Legendary always lands last.
- **Magnet:** gear within **2.6 m** of its owner flies in over 0.18 s (now: a
  touch at 1.5 m). Coins, orbs and stacks are pulled in from **4.5 m** (now
  3.8 m).
- **Pickup flash:** the block shrinks into the hero along a sparkle trail in
  the rarity colour. The hero gets a 0.25 s rim glow (Legendary: 0.6 s and a
  small burst of light), then `pickup_<rarity>` plays.

### 5.2 Cards and HUD

| | Common | Rare | Heroic | Legendary |
| --- | --- | --- | --- | --- |
| Card | **compact**, one line: icon, name, power, ▲ / ▼ | full card (as now) | full card + its boons | **large card**: an orange-gold ribbon "LEGENDARY", the signature enchantment in words, a gold shimmer border |
| Time on screen | 2.5 s | 4 s | 4.5 s | 6 s |
| Stacking | 3 commons in 2 s merge into "+3 common items" | up to 3 cards | | always shown, pushes others out |

- **Upgrade:** when `isUpgrade` is true, the ▲ pulses green and `upgrade`
  plays 150 ms after the pickup sound.
- **HUD new-item counter:** a number badge on the inventory button (NEW items
  per player). The amber dot is the outdated-gear warning.
- **Inventory:** rarity frames from `ui-loot-kit`, item icons from the
  `icons-*` sheets (emoji until they arrive), boons listed under the
  enchantment rows, a Heroic filter and sort, the NEW badge (as now), and ▲ /
  ▼ (as now).

### 5.3 Chests and the boss loot moment

- **Chest open:** lid pop. The sound is `chest` (common, the existing file),
  `chest_rare` or `chest_epic`. A drachma fountain plays (`coin_stack` when
  the stacks land), then the items arc out 200 ms apart. The burst is 30 / 40
  / 60 particles by chest kind.
- **Boss defeated:**
  - t = 0: death and slow-mo (as now).
  - t = 1.0 s: `boss_loot` fanfare, a gold shockwave ring and a
    `lights.flash` at the boss.
  - t = 1.2 s: per player, the items erupt in a ring 2 to 3.5 m out, 120 ms
    apart. The signature or any Legendary comes last, with `loot_legendary`.
  - At the same time: a drachma fountain (stacks).
  - t ≈ 2.5 s: the "Signature drop" toast for a first win.
  - t = 1.9 s: the exit gate and reward chest appear (as now). The chest now
    holds the chapter reward (§4.3).

### 5.4 Sounds

Sixteen files (13 ids) are **synthesised now** by
`design/source/build_loot_sfx.py` (numpy + ffmpeg, seeded, levelled like
`build_sfx.py`) into `game/assets/sfx/`, and listed in `index.json`. The same
ids, with ElevenLabs prompts, are in `build_sfx.py`'s `SFX` table, so a keyed
`build_sfx.py --force <id>` can replace any of them with a recorded version.
The game does not play them yet. Phase 2 wires them through `audio.sample()`.

| id (variants) | Length | Level | Use | Character (as synthesised) |
| --- | --- | --- | --- | --- |
| `loot_common` (1) | 0.5 s | −25 dB | a Common lands | soft thud (sine 170 → 70 Hz) + one E7 bell glint |
| `loot_rare` (1) | 0.8 s | −23 | a Rare lands | thud + G6 and C7 bells, a few sparkles |
| `loot_heroic` (1) | 1.1 s | −21 | a Heroic lands | thud, a rising noise whoosh (700 → 5200 Hz) and a B5–E6–G6 bell run with glitter |
| `loot_legendary` (1) | 2.2 s | −18 | a Legendary lands | deep impact (95 → 32 Hz), rising shimmer, a warm C-major(add 7) "choir" swell, a G5–C7 bell cascade, a long room |
| `pickup_common` (2) | 0.4 s | −25 | Common picked up | two glassy blips G6 → C7 (variant 2: A6 → D7) |
| `pickup_rare` (2) | 0.7 s | −23 | Rare picked up | a C6–E6–G6 bell arpeggio, 55 ms apart (variant 2: D major) |
| `pickup_heroic` (1) | 1.0 s | −22 | Heroic picked up | a whoosh up into an E6–G6–B6–E7 bell arpeggio and glitter |
| `pickup_legendary` (1) | 1.7 s | −20 | Legendary picked up | low thump, a Cmaj7 swell, a C6–E7 bell cascade, sparkle |
| `coin_stack` (2) | 0.5 s | −23 | a drachma stack or a handful | 5 to 6 bright inharmonic coin clinks |
| `chest_rare` (1) | 1.3 s | −20 | a rare chest opens | lid thunk, rising sparkle, a C6–E6–G6 chime |
| `chest_epic` (1) | 1.8 s | −19 | an epic or boss chest opens | heavy lid, a wind rush, a C-major swell, an E6–E7 bell run |
| `boss_loot` (1) | 3.0 s | −17 | boss loot erupts | a 4-note brass call G4–C5–E5–G5 into a held C-major brass chord with bells |
| `upgrade` (1) | 0.5 s | −23 | the found item beats what you wear | a quick C6–E6–G6 triangle run onto a C7 bell |

**Synthesis fallbacks** (`audio.js`, for when a file is missing, using the
existing `tone()` parameters):

- `lootDrop(r)`: `noise({ dur: 0.12, gain: 0.25, freq: 400 })`, then bells as
  `tone({ type: 'triangle', dur: 0.35, gain: 0.08, rev: 0.4 })` on
  - Common: [2637]
  - Rare: [1568, 2093]
  - Heroic: [988, 1319, 1568]
  - Legendary: [784, 1047, 1319, 1568, 2093]

  at 70 ms steps. A Legendary adds
  `tone({ freq: 95, to: 32, dur: 0.5, gain: 0.3 })`.
- `lootPickup(r)`: the same note sets, shorter (`dur: 0.2`), at 55 ms steps,
  type `'sine'`.
- `bossLoot()`: `levelUp()`'s arpeggio, one octave down, then `gong()`.
- `upgrade()`: [1047, 1319, 1568] in `'triangle'`, 50 ms apart, `gain: 0.06`.

---

## 6. Art requests (added)

These are in `design/source/build_requests.py` as group "Round 6 · Loot", and
in `design/image-requests.md`. Each is game art, delivered to `game/assets/`
as a grid on flat magenta so the game can key out the background and cut it
into 256 px cells. The order follows `loot.js` `ITEMS`, then the new items
above.

| id | Size | Grid | Holds |
| --- | --- | --- | --- |
| `icons-weapons-1` | 1024 × 1024 | 4 × 4 | `training_sword` … `forge_sword` (16; generate first) |
| `icons-weapons-2` | 1024 × 1024 | 4 × 4 | the 11 Legendary weapons + `hunter_knives`, `fury_lash`, `minotaur_horn`, `chimera_fang`, `procrustes_axe` |
| `icons-armour` | 1536 × 1024 | 6 × 4 | the 18 armours + 6 new |
| `icons-magic` | 1792 × 1024 | 7 × 4 | the 23 magic items + 5 new |
| `ui-loot-kit` | 2048 × 1024 | free | rarity tile frames (4 + Blessed), NEW badge, ▲ / ▼, favourite star, Legendary ribbon, a tintable beam, glint ring and twinkle, drachma coin, stack and pouch |

---

## 7. Phase-2 implementation plan

Phase 2 waits for the `entities/` and `perf/` refactor to land. None of these
steps needs `entities/`, except that fodder kills may need a hook (step 4).

1. **`progression.js`** (pure, tested):
   - Add `RARITY_WEIGHTS[source]`, `levelFactors(L)`, `difficultyFactor(d)`
     and `rarityWeights(source, playerLevel, difficulty)`, which return
     normalised `{ common, rare, heroic, unique }`.
   - Replace `rarityOdds(gl)`, keeping a shim for old callers.
   - Add `DROP_CHANCE` (§4.3), `COIN_DROPS` and `PITY_AT = 30`.
   - `SOURCE_BONUS`: add `elite: 0.4`.
   - Add `rarityCost`.
2. **`loot.js`:**
   - `RARITY`: add `heroic`, recolour `rare`, and set `mult` to 1 / 1.02 /
     1.05 / 1.08.
   - Add the `BOONS` table, `rollBoons(kind, n, rng)`, and folding of boons in
     `gearStats`.
   - `ITEMS`: add the 16 new items, plus `tags` and `sig` (boss id).
   - Add `BOSS_SIGNATURE`.
   - `ENCHANTS`: add `venom`, `hermes_haul` and `tyche_favour`, with their
     `PROC` numbers.
   - `rollItem(power, { source, level, difficulty, biome, rarity, … })`: tier
     first, then the base (Heroic promotes a Common or Rare base), tag
     weighting, Blessed on Rare and better, `it.tier` stored on the item.
   - `normalizeItem`: give old items `tier = base rarity` and `boons = []`.
   - Add `itemTier(it)`. Update `itemRarity` and `itemStrength` to use the
     tier.
   - `rollChest(area, kind, …)`: per §4.3.
   - Add `rollBossLoot(bossId, area, { first, level, difficulty, hero })` and
     `rollChapterReward(...)`.
   - `salvageValue`: 8 / 18 / 30 / 45. `temperCost` and `rerollCost` ×
     `rarityCost`. Add `reforgeCost` and `reforgePower`.
   - `RANK`: add `heroic`. Add `isOutdated(it, level)`.
3. **Save** (`save.js`): add the `sinceLegendary`, `signatures` and
   `newCount` fields with migrations. Put the pity check in a helper in
   `loot.js` (`applyPity(save, tier, source)`) so it can be tested.
4. **`main.js`:**
   - `onEnemyKilled`: coins become chance-based (`COIN_DROPS`).
   - Rewrite `maybeDropFromMonster(e)`: per human player within 40 m, roll by
     tier with Hermes's Haul added, using source `monster`, `elite` or
     `champion`.
   - `onChestOpened`: the sound by kind and the counts per §4.3.
   - `onBossKilled`: the boss loot sequence of §5.3 (`rollBossLoot`, the
     signature on the first win).
   - `completeMission`: the chapter reward into `#results-loot`.
   - Fodder: if `entities/fodder.js` kills don't pass through
     `onEnemyKilled`, add a call after the refactor.
5. **`mission.js`:** in `onBossKilled`, move the coins to the fountain (55)
   and turn the exit chest into the chapter-reward chest (`rarity: 'reward'`).
   In `openChest`, use the new drachma amounts and chest sounds.
6. **`openworld/runtime.js`:**
   - `openChest`: use the new drachma amounts and pass `source`.
   - Champion drops: 1 + 50% from the `champion` table, plus the epic chest.
   - **`openworld/quests.js`:** accept `heroic` and use the `quest` table.
7. **`lootdrops.js`:**
   - Add a `LOOT_FX` table (§5.1) and pop-out arc physics (with a ground
     test, as in `pickups.js`).
   - Rarity beams with grow-in, and shafts for Legendaries.
   - Magnet at 2.6 m.
   - `collect()` → `audio.lootPickup(tier)`, then `audio.upgrade()` if it is
     an upgrade.
   - `card()`: the compact, full and Legendary variants, timings, merging,
     and boons.
   - Expose `offscreen()` for the HUD arrow.
8. **`pickups.js`:** a `stack` kind (worth 5, bigger mesh, `coin_stack`
   sound) and a 4.5 m magnet.
   **`combat.js`:** breakables drop coins (30%, 1 + 4 × 50%).
9. **`audio.js`:**
   - Add `lootDrop(tier)`, `lootPickup(tier)`, `chestOpen(kind)`,
     `bossLoot()` and `upgrade()`, each calling `sample('<id>')` with the
     synthesis fallbacks of §5.4.
   - `coin(stack)` → `coin_stack`.
   - Keep `loot()` as an alias.
10. **UI:**
    - `ui/inventory.js`: the Heroic class and filter, boons lines, outdated
      dot, reforge at the forge, and icon atlas tiles with emoji fallback.
    - `ui/hud.js`: the new-item count, the outdated dot and the Legendary edge
      arrow.
    - `ui/minimap.js`: Heroic and Legendary markers.
    - `ui/screens.js`: shop `source: 'shop'` (no Legendaries).
    - `ui/art.js` (or a new `ui/icons.js`): load the `icons-*` sheets, key
      out the magenta, cut 256 px cells, and map `id → cell`.
    - `style.css`: `.item.heroic`, `--rc` colours, `.loot-card.compact`,
      `.loot-card.legendary` with its ribbon, and `.badge-count`.
11. **`artifacts.js`:** the acts `bulwark`, `lotus`, `fetch`, `vines` and
    `vitamins`.
12. **`text_config.js`:** `rarity.heroic`, boon names, the 16 items, 3
    enchantments, the signature toast and the compact-card text.
13. **Tests** (`game/test/loot.test.mjs`, `progression.test.mjs`):
    - weights normalise, there are no Commons from rare, boss or epic sources,
      and the shop never gives a Legendary;
    - level 1 gives no Heroic or Legendary, and difficulty raises them;
    - pity forces a Legendary by 40;
    - the first boss win drops its signature, once per difficulty;
    - boons stay in range and never repeat;
    - salvage order is C < R < H < L;
    - old saves normalise;
    - every `ITEMS` id has an icon cell.

    Then run `npm test` in `game/` and the perf check the README lists, and
    play a chapter.
14. **Docs:** update the "Loot and items" section of `game-design.md` (the
    counts, the tiers, signatures, drops and feedback), and the README if it
    lists items.

### Phase 2: as built

The code follows sections 4 and 5, with these differences:

- **`powerMult` is 2.1% a point** (was 2%), the make-up §4.1 names. A
  time-to-kill sweep (a hero on the level curve, the best weapon of a
  chapter's drops, against pups, hellhounds, affixed hellhounds and an
  open-world cyclops champion) found the mean weapon damage of a drop within
  about 6% of before at every gear level (tested in
  `progression.test.mjs`). The best weapon of a repeat run was a few per cent
  (1.5-6%) weaker than before at gear levels 3 to 12, because Legendaries
  were rare at low levels (the MCD2 ramp). The owner therefore raised the
  Legendary odds about 1.6x (weights 5 / 10 / 10 / 5 became 8 / 16 / 18 / 8,
  the level factor `max(0.25, (L - 1) / 9)` from level 2, `PITY_AT` 30). The
  sweep's repeat-run best weapon is now within 5% of before at gear levels 3
  to 12 (-2.5%, -0.7%, -1.1%, +4.2% at 3, 6, 9, 12); gear level 1 has no
  random Legendaries and stays about 7% down. On a first win the signature
  adds to that.
- **Drachmas:** the level factor (1 + 0.15 a level) applies to every payout,
  chests, bosses and pots included, not only the common chest.
- **Signatures** count once picked up (save.data.signatures is written on
  pickup, so a signature lost by quitting drops again). On the first win the
  50% "signature instead of a Legendary" rule is off (the signature already
  drops). Saves from before the rework hold no signatures, so a boss beaten
  before drops its signature on the next win.
- **The chapter reward** comes from the exit's reward chest; a player who
  leaves without opening it (and chapter 8, which has no boss) gets it
  straight into the inventory when the chapter completes. Chapter 8's
  signature, the Lotus Casino Card, comes with it on the first clear.
- **Drachmas are shared** by everyone on one screen (a companion's pickup
  too), as MCD2 does; items stay per player. Online, each screen keeps its
  own, as before.
- **Drakon-type champions** don't exist yet: the Drakon-Scale Plate is in the
  ordinary Legendary pool, and `maybeDropFromMonster` makes it the signature
  of any champion whose kind or id names a drakon.
- **Icons:** `ui/icons.js` cuts the `icons-*` sheets once they are listed in
  `game/assets/icons.json` (empty until they are delivered; a test keeps the
  list in step with the files), so the game never requests a missing sheet.
- **Minimap marks** for Heroic and Legendary drops are on the chapter
  minimap; the open world has no minimap.

---

## Sources

- [S1] metabot.gg, *Minecraft Dungeons 2 Drop Rates: Rarity & Gear Guide*, <https://metabot.gg/en/minecraft-dungeons-2/gear>
- [S2] metabot.gg, *Minecraft Dungeons 2 Uniques: Best Farm Spots & Odds* (build 1.1.1.0), <https://metabot.gg/en/minecraft-dungeons-2/guides/unique-items-farming>
- [S3] Maxroll, *Minecraft Dungeons 2 Beginner's Guide*, <https://maxroll.gg/minecraft-dungeons-2/getting-started/minecraft-dungeons-2-beginners-guide>
- [S4] minecraft.wiki, *Dungeons II: Rarity*, <https://minecraft.wiki/w/Dungeons_II:Rarity>
- [S5] Same page as [S4] (the unique item lists).
- [S6] Search summary of talisman guides (Destructoid, allthings.how): 24 talismans, no rarity, three worn. <https://www.destructoid.com/all-talismans-in-minecraft-dungeon-2-and-how-to-get-them/>
- [S7] minecraft.wiki, *Dungeons: Rarity* (MCD1), <https://minecraft.wiki/w/Dungeons:Rarity>, and the search summaries of MCD1 rarity colours (white, turquoise, orange); no source describes drop beams.
- [S8] DungeonsDB, *Minecraft Dungeons 2 Beginner Tips: 33 Things to Know*, <https://www.dungeonsdb.com/beginner-tips>
- [S9] Fextralife, *Item Effects* (MCD2), <https://minecraftdungeons2.wiki.fextralife.com/Item_Effects>
- [S10] minecraft.wiki, *Dungeons II: Looter's Charm*, <https://minecraft.wiki/w/Dungeons_II:Looter's_Charm>
- [S11] Fextralife, *Power Level* (MCD2), <https://minecraftdungeons2.wiki.fextralife.com/Power_Level>
- [S12] metabot.gg, *Unique Drop Calculator*, <https://metabot.gg/en/minecraft-dungeons-2/uniques/drop-calculator>
- [S13] Fextralife, *Monstrous Opus*, <https://minecraftdungeons2.wiki.fextralife.com/Monstrous_Opus>
- [S14] GamingProMax, *All Unique Items and Where to Get Them*, <https://gamingpromax.com/minecraft-dungeons-2-all-unique-items/> (counts unreliable)
- [S15] dungeons.tools, *Minecraft Dungeons 2 currencies*, <https://www.dungeons.tools/2/currencies>
- [S16] All Things How, *Minecraft Dungeons 2 Co-Op and Multiplayer Modes Explained*, <https://allthings.how/minecraft-dungeons-2-co-op-and-multiplayer-modes-explained/>
- [S17] minecraft.wiki, *Dungeons II: Emerald*, <https://minecraft.wiki/w/Dungeons_II:Emerald>
- [S18] Search summary of blacksmith guides (wikily.gg, Fextralife *Blacksmith*, vgtimes): <https://minecraftdungeons2.wiki.fextralife.com/Blacksmith>, <https://vgtimes.com/guides/170286-minecraft-dungeons-ii-blacksmith-guide-how-to-upgrade-gear.html>
- [S19] minecraft.wiki, *Dungeons: Item* (MCD1 counts), <https://minecraft.wiki/w/Dungeons:Item>
- [S20] metabot.gg, *Unique Weapons: All 40*, <https://metabot.gg/en/minecraft-dungeons-2/uniques/weapons>
- [S21] Gameluster, *Minecraft Dungeons 2 Review: A Smarter Loot Chase*, <https://gameluster.com/minecraft-dungeons-2-review/>
- [S22] dungeons2.wiki, *Controls*, <https://dungeons2.wiki/guides/controls/>
- [S23] Neowin review and Minecraft feedback forum (via search): <https://www.neowin.net/reviews/minecraft-dungeons-ii-review-braving-the-sift-in-a-fun-and-blocky-co-op-adventure/>, <https://feedback.minecraft.net/hc/en-us/community/posts/49298530571789-Dungeons-2-suggested-fixes-features>, Item Stats mod <https://www.nexusmods.com/minecraftdungeons2/mods/30>
- [S24] minecraft.wiki, *Dungeons: Inventory* (MCD1 salvage 1 : 2 : 5, power total), <https://minecraft.wiki/w/Dungeons:Inventory>
- [S25] Nexus Mods, *Item Magnet – Auto Loot Vacuum* (MCD2 mod), <https://www.nexusmods.com/minecraftdungeons2/mods/131>
