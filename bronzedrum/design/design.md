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
| **Guard** | the army's shields | A | Space | tap the bronze drum |
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
tiers II and III add pairs and triplets.

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

**The guard.** Defence is separate from the drum. A Han soldier about to strike
shows a red "!" one beat of his war drum ahead, ringed by a circle that closes
on the moment of impact. Guarding within 0.5 s before the blow takes ×0.35 of
it; within 0.2 s, ×0.1 (a perfect block). The guard then needs about a second
before it can be raised again. It neither reads nor changes the rhythm, the
chain or the army's orders. Each Han soldier winds up for one beat before his
first blow, so the warning always comes first.

| Command | Tier I | Tier II | Tier III | Effect | Unlocked |
| --- | --- | --- | --- | --- | --- |
| Tiến · March | `L L L R` | `L L LL R` | `L LLL L R` | advance, stopping at the enemy line | ch. 1 |
| Đánh · Strike | `R R L R` | `RR R L R` | `RRR R L R` | spears hit the front enemy; archers shoot | ch. 1 |
| Hô · Rally | `R L L L` | `R LL L L` | `R LLL L L` | restore strength | ch. 3 |
| Voi · Elephant charge | `L L R R` | `LL L R R` | `LLL L RR R` | only with the drum awake: trample everything near the elephant; spends the drum's spirit | ch. 3 |

In the patterns, L is tùng and R is cắc. Spaces separate the four beats; letters
written together share a beat. Chapter 1 allows tiers I and II, and the later
chapters allow all three.

**Chapters:**

1. The Garden at Mê Linh: training on straw targets.
2. The Outpost on the Hát River: crossbows and a palisade.
3. The Citadel at Luy Lâu: the war elephant at night.

**Balance check.** The battle tests play every chapter with a scripted player
who drums a phrase, waits for the answer, and starts the next at once.
- A steady player using only tier I and guarding loosely (0.4 s early) wins all
  three chapters with a fifth or more of the army left.
- Higher tiers win faster, and sharper guarding (0.1 s) saves more of the army.
- Sloppy drumming, fast or slow, still clears chapters 1 and 2.

## Structure for the full game

The novel has two halves, and the game follows them:

- **Part one, the training years.** Short, quiet chapters at home: the garden,
  lessons, the sisters' friction, the father's death. These teach the rhythms
  through small scenes rather than battles. Nhị's off-beat flourishes come from
  her character here.
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
- **Music.** The player now sets the tempo. Should the score follow the
  player's speed (stems that stretch, or a set of tempos), or stay with the Han
  war drum as it does now?
- **A cultural reader.** Someone Vietnamese should check the costumes, names and
  how the Han are portrayed before production art.
