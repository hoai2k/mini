# Fibre Art: design

A shifting collage. The screen is one of Hanneke de Neve's pictures, built as
a live patchwork: a painted or quilted ground with cut pieces laid on it
(moons, hearts, trees, faces, figures, birds), threads and stitches over the
top, and patches of fabric showing through. The controllers reach into it.
A stick might stretch one moon, turn a whole panel, or set the entire picture
swirling. A button might make a single heart bloom, or dissolve the picture
into the next one. Some controls do small things and some do large ones.
Part of the play is finding the large ones, and part is using the small ones
to set them up: a moon nudged to the middle so the next swirl takes the whole
sky with it. When the scene shifts, the controls are dealt out again.

There is nothing to win and no way to lose. The aim is the feeling of her
work in motion: a dream that rearranges itself, one piece calling for another
("work creates more work, each new piece calls for another"), which you
learn to play a little like an instrument: a few small touches, then one
large gesture, and the picture is somewhere new.

This is a first design, written so the art can be requested. The prototype
waits for the images; how far the ideas below survive depends on how well the
generated pieces stretch, turn and dissolve.

## The picture

Each picture is a **tableau**, after one of her works (the list is in
[`image-requests.md`](image-requests.md)). A tableau has four layers, back to
front:

1. **Ground.** The full picture with the loose pieces taken out and the
   ground completed underneath them. It can itself be warped (a slow swirl, a
   ripple, a tide), panel by panel or as a whole.
2. **Panels.** Most of her pictures are divided into compartments: rooms,
   windows, quilt blocks, a framed scene inside a border. The game cuts the
   ground into those panels (rectangles or polygons defined per tableau) so a
   panel can slide, turn, fade or be swapped for the same panel of another
   tableau.
3. **Pieces.** The cut-out motifs, each its own transparent image: a moon, a
   heart, a tree, a face, a figure, a bird, a cloud. They are the main things
   that move.
4. **Threads.** Stitches, couched threads and ribbons, drawn on top: they
   trail behind moving pieces, sew pieces down when they settle, and unravel
   when something dissolves.

Fabric **textures** fill shapes and backgrounds where a panel is torn away or
a piece is stretched past its edges. **Dissolve masks** decide how one image
gives way to another: along a torn-paper edge, as a watercolour bloom, seam by
seam, thread by thread.

Every piece has a **home**: where it sits in the tableau's composition. Left
alone, pieces drift gently back toward home and the picture settles into the
painting it came from. Pushed, they leave it. The composition image is both
the reference the pieces are drawn from and the resting state of the game.

## Verbs

What an input can do to its target:

| Verb | Small | Large |
| --- | --- | --- |
| **Nudge** | A piece slides a little and springs back. | A panel slides out of its frame and the ground shows through. |
| **Stretch** | A moon pulls into an oval. | The whole picture pulls like cloth in one direction. |
| **Turn** | A face tilts. | A panel or the whole tableau rotates, pieces holding on. |
| **Fade** | A piece turns translucent. | A layer (all pieces, all threads) fades out, then back. |
| **Swirl** | A small eddy around one piece. | The picture twists into a slow whirlpool and unwinds. |
| **Bloom** | A heart swells and its stitches loosen. | Every piece of one kind swells together. |
| **Morph** | A piece steps along its morph chain (moon to sun). | Every piece on a chain steps at once. |
| **Dissolve** | A piece frays away and returns as another piece. | The tableau dissolves into the next one through a mask. |
| **Pour** | A wash of colour spreads from a piece. | The palette of the next tableau floods in. |
| **Stitch** | A thread runs from one piece to another. | Threads sew the whole picture back together and it settles. |

## Controls

Each player holds a controller. In every scene each input is **bound** to a
target and a verb at a scale: the left stick *stretches* the *crescent moon*
(small), the right trigger *swirls* the *whole picture* (large), A *blooms*
the *hearts* (medium), and so on.

- **Sticks** are continuous: direction and amount drive the verb, and letting
  go eases the target home.
- **Triggers** are continuous one-way amounts: how far to swirl, fade or pour.
- **Face buttons and bumpers** are events: bloom, morph a step, dissolve,
  stitch, swap two pieces.
- **D-pad** steps through targets of the same kind (the next moon, the next
  face) without changing the verb.
- **Menu** pauses; **View** shows the bindings found so far as a card.

### Finding the big controls

Each scene deals out its bindings when it begins and keeps them while it
lasts. Most do small things: a moon slides, a face tilts, one heart swells.
A few do large things: the whole picture swirls, a panel turns over, the
palette of the next scene pours in. Nothing says which is which. The player
finds out by trying, and the first time an input is used the target lights
up with a running stitch, so a found control stays known.

The large controls are what shift the scene. Finding one and leaning on it
is how the picture is carried somewhere new: a big swirl that leaves every
piece in a new place, a pour that turns the night quilt to dawn, a dissolve
into the next tableau.

### Small moves set up big ones

The large effects are not fixed in place. Each has an **anchor**, a piece it
is centred on, and a **reach** that depends on how the picture is arranged.
That is what the small controls are for:

- **Placing the anchor.** The swirl turns around the violet sun. Nudging the
  sun into the middle of the wood with a small control makes the next swirl
  take the whole wood with it; left in a corner, the same swirl only stirs
  that corner.
- **Linking pieces.** Effects travel along links. Two pieces of one morph
  chain that touch (a moon resting against a heart), or that a thread has
  sewn together, act as one: bloom one and the other blooms; morph the moon
  and the heart morphs with it. A few small moves can chain a large part of
  the picture together, so one button then moves all of it.
- **Opening a panel.** Some large controls are sleeping and only do a small
  thing until the picture is ready: a panel turns over only when a piece of
  the right kind sits in it (a moon in the window, a face in the frame); the
  tableau dissolves only when its pieces are lined up along the horizon,
  as she starts every picture from a horizon.
- **Clearing the way.** A piece in the path of a large effect can hold it
  back: a heavy tree stops the tide at its trunk until it is moved aside.

So a scene plays as small moves that set something up, followed by a large
effect that changes everything, after which the arrangement is new and the
small controls have new things to set up. Some setups are obvious; some are
found by accident.

### When bindings change

Bindings are dealt anew when the scene shifts: a new tableau, or a large
effect big enough to rearrange the picture. Within a scene they hold still,
so what has been found can be used. A few of the old bindings carry over to
the new scene at the same scale but on new targets, so the player is never
starting from nothing. Roughly six in ten bindings are small, three medium
and one large, and every scene has at least one large control and at least
one small control that sets it up.

### Showing what is bound

A found control's target is outlined with a running stitch in the player's
thread colour, and a small line drawing in her style (a stick, a button, a
trigger) is pinned near it for a few seconds. When a setup is close to
waking a large control (the anchor nearly central, the panel nearly filled),
the threads around it tighten and shimmer. The View card shows every binding
found so far in this scene, with an Xbox controller diagram as the guidelines
require; ones not yet found show as loose thread.

**Players.** One to four controllers, each with its own thread colour (red,
saffron, teal, violet) and its own bindings, dealt from targets the others
are not holding. One player can set up what another player's large control
then sets off.

**Keyboard and pointer.** Drag a piece to nudge it; drag with the right
button to turn; the wheel stretches; keys stand in for the face buttons and
are dealt bindings on the same rules.

## Moving between tableaux

A tableau lasts until a large dissolve or pour carries it on, usually after a
few minutes; if nobody finds one, it drifts on by itself after a while. The next tableau is chosen so at least
one piece can travel: pieces that share a **morph chain** (moon, sun, heart;
bare tree, budding branch, berry tree) step along it, then hold their place
while the old ground dissolves under them and the new one appears, then
drift to their new homes. So the crescent moon of the night quilt can become
the violet sun over the green wood.

## Rendering

WebGL2 on a single canvas.

- Pieces are textured meshes (a grid of 8 × 8 or so per piece), so stretch,
  swirl and bloom bend them rather than scaling flat quads.
- Swirl, ripple and tide are displacement fields applied to the ground and
  the pieces together, so the whole picture moves as one cloth.
- Dissolve is a shader: a mask texture thresholded over time, with a narrow
  band at the edge drawn as frayed thread or paper fibre in a colour from the
  outgoing tableau.
- Morph is a cross-dissolve between two chain stages through a mask, with the
  outline warped from one silhouette toward the next, so the change looks
  grown rather than faded.
- Threads are strokes along splines, textured from the stitch sheet.

## Stand-ins

Where a request is still undelivered, `tools/build_web.py` makes a stand-in
and marks the scene's `standin` list in `web/scenes.json`:

- **Moons and hearts, The dancers (pieces):** cut by colour from each
  composition (yellow moons and hand, red hearts, blue and red dancers), or as a
  rectangle or disc for the blocks and the sun. They hold up nearly as well as
  generated pieces, because the compositions draw each motif as a clean shape
  on a plain ground.
- **Viriditas (ground):** a blurred wash of the composition over the green silk.
  It keeps the colours but loses the dense wood, so the scene reads thin.
- **Icon:** the moon chain's crescent on indigo batik.
- **Tree and bird chains:** none yet; trees and birds turn over instead of
  changing.

## What playing it with the art showed

Played through every scene in Chromium with a simulated controller (see
`game/scripts/browser-check.mjs`; screenshots were reviewed by eye):

- **The pieces hold up.** Bent on 24 × 24 meshes, stretched to twice their
  size, turned and swirled, the cut-cloth pieces stay readable, and their
  frayed edges hide the seams of the mesh. The open question about hard
  stretching is answered: stretch stays.
- **Each scene reassembles into its composition.** With homes placed by eye,
  pieces over the ground come very close to the generated composition, so the
  cross-fade into the finished picture when everything is still is gentle.
  The pieces are not pixel matches, which is fine for a collage.
- **The large swirl is a whirlpool of cloth.** At full reach it twists the
  whole picture and shows the backing fabric at the edges. It is dramatic; it
  is clamped by its own unwinding spring, and Reduce motion halves it.
- **Scene changes are the most striking moment.** Halfway through a dissolve
  the two pictures interleave through the torn-paper or unravelling mask (the
  night quilt's moons in the Viriditas wood, the Golden Lady breaking through
  the quilt), which is the organic morphing the game is after. A traveller
  piece carries across and grows into its chain partner.
- **Turning a panel over** shows the scene's fabric (green silk, indigo batik)
  as a block of pure pattern, which reads as part of the quilt.
- **Layering needed a rule:** sky pieces (bands, clouds, suns) draw behind the
  rest, or the comet band covers the two moons.
- **Pinned drawings crowd** when several controls are found at once; at most
  four show. The hand, spool and needle drawings stand in for the controls
  themselves, which led to request HK-U05.

## Open questions

- How many large controls a scene should have, and how hidden their setups
  should be, before finding them stops feeling like discovery and starts
  feeling random. Each player now has one large control (sometimes two) and the
  small one that sets it up; this wants playing with real people.
- Whether the card of controls found should say how to wake a large control
  (it does now) or leave that to be discovered.
- Sound is made in the browser (a held chord per scene, plucks, a rush for big
  movements). Recorded sounds (plucked strings, a sewing machine, cloth) could
  replace it; not requested yet.
- Online multiplayer through `multiplayer/` could let several people shape
  one collage from different places; not planned for the first build.
