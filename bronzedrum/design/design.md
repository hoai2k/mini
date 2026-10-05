# Bronze Drum: design notes

## The pitch

Two sisters, one bronze drum, an army of women. The player leads the Trưng
sisters' uprising by **drumming**. Every order to the army is a four-beat phrase
played on the drum, and the army answers on the next four beats. The drum is the
title object, the controller and the HUD.

Sources:

- **The story:** Phong Nguyen's novel *Bronze Drum* (2022), which tells the
  uprising of 40–43 CE. The game adapts the novel with the author's blessing, so
  its characters, scenes and structure are ours to use.
- **The look:** backlit hand-cut paper, inspired by Sarah Nguyen's suspended
  paper and fibre panels, and the friezes on Đông Sơn bronze drums. See
  [image-requests.md](image-requests.md) for the full art direction and the rule
  that prompts describe the qualities of her work and never name her.

## Core loop (what the prototype tests)

| Action | Who | Controller | Keyboard | Touch |
| --- | --- | --- | --- | --- |
| **tùng**, the deep centre | Trưng Trắc, the elder: steady and disciplined | LB / LT / X / D-pad ← | F D A ← | left half of the screen |
| **cắc**, the rim | Trưng Nhị, the younger: fierce and free | RB / RT / B / D-pad → | J K L → | right half of the screen |
| **Shield** | the army's shield wall | A | Space | tap the bronze drum |
| **Reset the rhythm** | | Y | R / Backspace | (the phrase fades by itself) |

The two leads' temperaments are built into the controls: Trắc holds the beat and
Nhị decorates it.

**No metronome; evenness.** A command is a four-beat rhythm, and the player
plays it at any speed from about 45 to 200 BPM. The reader fits a tempo to the
strokes and judges whether they are *even*: every gap must match the pattern at
that tempo, within about ±37% ("perfect" within ±15%). The phrase fades as soon
as no pattern can still be finished in time, or when a stroke breaks the rhythm.
Y resets it at once.

**Pairs, triplets and tiers.** A beat can hold one stroke, a pair (two) or a
triplet (three). Every command has three tiers. Tier I is four plain strokes;
tiers II and III add pairs and triplets. The deep tùng needs room to ring, so
two tùng strokes are always at least a beat apart. The quick strokes are on
the rim (cắc), and a pair opens with at most one tùng. A test enforces this
for every pattern.

**Power.** Each tier is ×1.4 the one below (×1, ×1.4, ×1.96). Evenness scales
power from ×0.72 at the edge of the window to ×1 when perfect, which covers
almost the whole gap between tiers. A sloppy tier II still just beats a perfect
tier I, and a sloppy tier III a perfect tier II. Power also scales with beat
length (×1 at 100 BPM), so the army does the same work per second whether the
player drums fast or slow: the Han keep their own war drum.

**The answer.** When a rhythm is accepted, the army answers for four beats at
the player's tempo:
- The army's drums play the rhythm back.
- The figures move on the drummed strokes: march steps, spear thrusts on tùng,
  arrows loosed on cắc, the elephant's stomps.
- The accepted pattern stays lit above the drum until it glows ready.

A march or a strike carries on in the same rhythm for up to two more rounds, at
reduced power (×0.6 and ×0.5), until the player starts the next phrase. Strokes
during the answer don't start a phrase. Rim strokes between the answer's beats
are Nhị's flourishes (+10% each, up to four).

**Chain.** Starting the next command within two beats of the drum glowing ready
keeps the chain. Four in a row wakes the drum (*trống thức*), and every command
becomes ×1.5 as strong.

**The shield.** Defence is separate from the drum. Han attacks travel and can
be seen coming: crossbow bolts fly for 0.9 s, the fort's volleys for 1.1 s, and
a spearman draws back for 0.7 s before his thrust lands. Pressing shield raises
a translucent dome rimmed with bronze shields over the whole army. It stays up
at least 0.5 s, and in any case until everything already in the air has landed,
so pressing while an attack is visibly on its way always deflects it fully.
Feedback is "Defended" under the drum, a ringing sound and sparks. Raising the
shield with nothing incoming makes it slower to be ready again (0.9 s against
0.3 s). A red "!" marks a Han soldier winding up for his first blow.

**Confirmations.** "Cleared" (Y) and "Defended" (a deflected attack) appear
under the drum. When the rhythm is cleared, its dots tumble away.

| Command | Tier I | Tier II | Tier III | Effect | Unlocked |
| --- | --- | --- | --- | --- | --- |
| Tiến · March | `L L L R` | `L L LR R` | `L RRR L R` | advance, stopping at the enemy line | ch. 1 |
| Đánh · Strike | `R R L R` | `RR R L R` | `RRR R L R` | spears hit the front enemy; archers shoot | ch. 1 |

In the patterns, L is tùng and R is cắc. Spaces separate the four beats, and
letters written together share a beat. Chapter 1 allows tiers I and II, and the
later chapters allow all three. The first stroke says what kind of order it
is: movement (march) starts on tùng, attacks (strike) on cắc.

**Two families.** There are only march and strike. Rally (healing) was removed:
the shield now does the defensive work. The elephant charge (Voi) is no longer
a rhythm of its own. In chapter 3, with the war elephant, a strike played while
the drum is awake becomes the charge: the elephant stomps on the drummed
strokes and tramples everything near it, and the charge spends the drum's
spirit. The women's cheer that was Rally's sound now plays when the drum wakes.

**Chapters** (in story order):

| # | Chapter | Mode | What the player does |
| --- | --- | --- | --- |
| 1 | The Garden at Mê Linh | battle | training on straw targets: march and strike, tiers I–II |
| 2 | The Oath | echo | a slow mourning drum calls five rhythms; each even answer lights an incense stick for the father |
| 3 | Casting the Drums | casting | repeat the hammer rhythm `L RR L RR` at one steady speed: each steady phrase pours, drifting more than ±12% from the first phrase's tempo cracks the mould; three drums |
| 4 | The Villages Answer | echo, tempo | six village drummers call harder rhythms; echo each evenly at about their speed (±30%) to light its lanterns |
| 5 | The Outpost on the Hát River | battle | crossbows and a palisade |
| 6 | The Citadel at Luy Lâu | battle | the war elephant at night; a strike on a waking drum is the charge |
| 7 | The Coronation at Mê Linh | echo | festival drummers call six rich rhythms; graded on evenness, no failing |
| 8 | Mã Viện Returns | hold the line | Han columns arrive in waves; hold the ford for 90 s. Built around the shield |
| 9 | The Drums Are Melted | echo | epilogue: each answered call silences one of five drums gathered for melting |

In the echo chapters the caller plays first and the player answers. Strokes
during the call are ignored ("listen first"). An unanswered call is played
again, and the chapter ends when every call has been answered, with the
player's average evenness. Call rhythms follow the same deep-stroke rule as
the commands. The reader accepts only the call's rhythm, so any even
performance of it counts.

**Balance check.** The battle tests play every battle chapter with a scripted player
who drums a phrase, waits for the answer, and starts the next at once.
- A steady player using only tier I and shielding each volley wins every battle
  chapter with most of the army left.
- Holding the ford needs the shield: without it a perfect drummer barely
  survives, and with it most of the army does.
- Without shielding, they still win with about 40% left.
- Higher tiers win faster.
- Sloppy drumming, fast or slow, still clears chapters 1 and 2.

## Structure for the full game

The novel has two halves, and the game follows them:

- **Part one, the training years.** Short, quiet chapters at home: the garden,
  lessons, the sisters' friction, the father's death. These teach the rhythms
  through small scenes rather than battles. Nhị's off-beat flourishes come from
  her character here.
Chapters 2–4 and 7–9 now cover the training years, the uprising and the
ending in playable form. What remains for the full game:

- **Part two, the uprising.** A campaign across the face of a bronze drum. Its
  rings are the regions to win over, and Mê Linh is the star at the centre.
  Each allied group (the mountain archers, the metalworkers of Nhật Nam, the
  river villages) adds a command or a unit.
- **The ending** is not a victory screen. The Han general Mã Viện collects and
  melts down the Lạc Việt drums. A quiet last scene about what is lost carries
  the book's point that the victory did not last.

## Art direction in one paragraph

Each depth is a panel of cut paper hung one in front of another, with a lamp
behind them all. The cuts glow, edges catch a rim of light, and each panel
throws a soft shadow on the one behind. The haze between panels is the lamp's
light. Figures are silhouettes whose detail is carried by cut holes: bead
collars, skirt bands, the lamellar slots of Han armour. Hits tear paper scraps
loose instead of drawing blood. The moon changes every chapter.
[image-requests.md](image-requests.md) has three style frames to settle how much
colour the paper carries before the full set is generated.

## Open questions

- **Style.** White paper and lamplight, coloured papers, or shadow theatre
  (style frames S01–S03)?
- **Music (settled).** Because the player sets the tempo, nothing that plays
  during a chapter has a beat: each chapter has a beatless bed under the
  ambience, and a swell plays when the drum wakes. Themes with melody and metre
  play on the title and chapter select, with stings on the results and the
  ending piece after the epilogue. See `music-requests.md`.
- **A cultural reader.** Someone Vietnamese should check the costumes, names and
  how the Han are portrayed before production art.
