# Bronze Drum: design notes

## The pitch

Two sisters, one bronze drum, an army of women. The player leads the Trưng
sisters' uprising by **drumming**. Every order to the army is a four-beat phrase
played on the drum, and the army answers on the next four beats. The drum is the
title object, the controller and the HUD.

Sources:

- **The story:** Phong Nguyen's novel *Bronze Drum* (2022) and the historical
  uprising of 40–43 CE. The novel is in copyright, so an adaptation of it needs
  the author's or the publisher's permission. The history and the legend are free
  to use. Until rights are settled, the prototype draws only on the history.
- **The look:** backlit hand-cut paper, inspired by Sarah Nguyen's suspended
  paper and fibre panels, and the friezes on Đông Sơn bronze drums. See
  [image-requests.md](image-requests.md) for the full art direction and the rule
  that prompts describe the qualities of her work and never name her.

## Core loop (what the prototype tests)

| Stroke | Who | Input |
| --- | --- | --- |
| **tùng**, the deep centre | Trưng Trắc, the elder: steady and disciplined | LB / LT / X / D-pad ←, keys F D A ←, left half of the screen |
| **cắc**, the rim | Trưng Nhị, the younger: fierce and free | RB / RT / B / D-pad →, keys J K L →, right half of the screen |

The two leads' temperaments are built into the controls: Trắc holds the beat and
Nhị decorates it.

- **Command.** Play four strokes on four consecutive beats. The army answers
  during the next four beats while the player rests.
- **Flourish.** During the answer, rim strokes placed exactly between beats add
  10% power each, up to four. Any other stroke during the answer is a stumble and
  breaks the chain.
- **Chain.** Starting the next command on the first beat after the answer keeps
  the chain going. Four in a row wakes the drum (*trống thức*) and makes every
  command 1.5× as strong.

| Command | Pattern | Effect | Unlocked |
| --- | --- | --- | --- |
| Tiến · March | tùng tùng tùng cắc | advance, stopping at the enemy line | ch. 1 |
| Đánh · Strike | cắc cắc tùng cắc | spears hit the front enemy; archers shoot | ch. 1 |
| Thủ · Shields | cắc tùng cắc tùng | take 20% of the damage for three measures | ch. 2 |
| Hô · Rally | cắc tùng tùng tùng | restore strength | ch. 3 |
| Voi · Elephant charge | tùng tùng cắc cắc | only with the drum awake: trample everything near the elephant; spends the drum's spirit | ch. 3 |

**Chapters:**

1. The Garden at Mê Linh: training on straw targets.
2. The Outpost on the Hát River: crossbows and a palisade.
3. The Citadel at Luy Lâu: the war elephant at night.

**Balance check.** The battle tests play every chapter with a scripted drummer.
A steady, accurate drummer wins all three with a quarter or more of the army
left. A sloppy drummer (every stroke "good", never waking the drum) still clears
chapters 1 and 2. Chapter 3 needs the waking drum.

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

- **Rights.** Adapt the novel with permission, or base the game on the history
  alone?
- **Style.** White paper and lamplight, coloured papers, or shadow theatre
  (style frames S01–S03)?
- **Music.** The drum carries the rhythm. Is there a score under it (đàn bầu,
  đàn tranh, gongs), and does it follow each chapter's tempo?
- **A cultural reader.** Someone Vietnamese should check the costumes, names and
  how the Han are portrayed before production art.
