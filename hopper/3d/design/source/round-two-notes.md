# Modelling notes for round-two art

The sheets preserve the canonical 2D identities and illustrate the proposed new views and mechanisms. They are **ready for art review, not approval to begin modelling**. Keep the existing model requests' socket names, clip names, axes and collision behavior. Exact dimensions below come from the model request data; a generated drawing is not an engineering measurement.

## Authority and scale

Use the original canonical sprite for identity; the new turnaround for back/top interpretation and pose intent; the numeric model contract for target bounds, landings, joints and sockets. Unseen surfaces are proposed continuations, not recovered ground truth. If two views disagree, resolve the geometry explicitly before sculpting instead of averaging mismatched anatomy.

Hopper is shown as a 14 m gameplay scale reference on kit sheets. The existing combined GLB has larger measured bounds (including appendages); apply a uniform scene scale, never deform its body to fit a ruler. The boy stays seated on the red couch behind and below the handlebars, with pelvis attached to Hopper.Seat. His reaction clips remain local to that anchor. Existing six-leg insect rig, two wing hinges, head and antenna chains remain authoritative. Do not copy an accidental extra appendage from a drawing.

Kit model dimensions are X width, Y height, Z depth in metres. Landable tops must remain within 0.5 m of the stand-in surface contract. Painted highlights and arrows are readability cues, not extra collision ridges. Small insets may use an enlarged illustration scale; never infer dimensions from thumbnail size. Keep the authored 2D style, flat albedo and restrained emission; avoid glossy PBR and normal-map microdetail.

## Canonical identity conflicts found during preparation

These are proposed reconciliations for review, not silent edits to the model contracts or rigs:

| Request | Conflict | Proposed modelling resolution |
|---|---|---|
| M-004 Seed Spitter | Sprite is a spiked four-legged bulb; placeholder description is a rooted ink flower with a stalk. | Preserve the bulb and four braced legs. Root the actor in place for gameplay; inflate its throat inside the shell and articulate six mouth plates. Add leg support joints rather than turning the silhouette into a stalk flower. Core remains near the protected base. |
| M-013 Coil Wraith | Sprite has hooded torso, two clawed arms and coiled serpentine tail; placeholder is a ribbon between two nodes. | Use a spline spine/tail plus two arm chains. Keep Node.Top.Core and Node.Bottom.Core as named energy targets near the head/body and tail end. Preserve lane-beam behavior with an effect, not a featureless ribbon mesh. |
| M-020 Gravity Cantor | Sprite is a crowned floating figure with two arms, mantle and round chest core; placeholder is a spinning ring with four prongs. | Keep the figure. Chest Core and four crown/hem emitter anchors can preserve the behavior. Add arm and mantle pivots; do not replace the body with a ring. |
| M-018 Phase Skate | Canonical sprite has three flowing tails; requested rig lists three rigid tail shards. | Preserve all three tail silhouettes. Use short chains or carefully segmented rigid pivots with concealed joins rather than visibly disconnected debris. |
| M-011 Chain Manta | Canonical sprite trails two hooked chains; model contract has one gameplay tether. | Model both chain roots and hooks. Retain the requested active TetherNode as the gameplay target; the second chain can be secondary motion. |
| M-070 Signal cage | Existing canonical cage is cyan/ivory machinery with a captive inside; description requests shadow bars. | Preserve the mechanical frame and cyan bars, remove the captive from the cage asset, add a violet lock crown and retract/open state. The enemy and collectible remain separate actors. |
| M-017 Veil Medusa | Illustration has many fine filaments; rig requests ten chains. | Rig ten major tendrils and make the extra hair-fine filaments decorative followers rather than inventing a separate heavy chain for each painted line. |

## Animation interpretation

Hopper's charge compresses the large rear femurs, then extends them for launch. Airborne legs remain in an air pose until near contact. Kicks use the large rear legs; front feet may hook a ledge but are not striking hands. Wing open/close refers to the existing paired hinges; do not generate extra wing pairs. Distinguish folding the legs from merely rotating the whole robot. Stomp contact, maximum compression and recovery are different keys. Glide, dive, wall kick and mantle need genuinely distinct silhouettes. `Hopper.Wing.L/R` tip sockets follow the two wing tips.

Rider reactions keep the pelvis fixed to the seat. Glide lean, dive tuck and stomp brace affect torso/arms/head; pointing and cheering must not detach the boy from the couch. Keep hands/feet on plausible supports except for the deliberate pointing/cheering arm gestures.

## Using these files downstream

Inspect the full-size sheet and its native-size preview together. Larger PNG sizes are upscaled delivery sizes, not native 8K detail. Each JSON stores the actual source resolution, prompt, canonical input paths and relevant model contracts. Use isolated views if a modelling tool expects a single object image; do not feed an entire multi-object kit or pose collage as though it were one object. Treat orthographic-looking art as a drawing guide; verify dimensions and limb counts in the resulting 3D geometry.

## Pose plate reading order

- Flight: columns are folded, half-open, spread. Side view above, three-quarter below. Closing reverses the sequence. Rider close-ups govern the boy's pose over the tiny rider in whole-Hopper views.
- Impact: dive, contact compression, recovery; side above, three-quarter below.
- Kick/mantle: air kick, wall plant, ledge pull; side above, three-quarter below.
- Charge: top row is **maximum, medium, minimum compression** (read right to left when charging). Bottom row is hop-back air pose, super-leap extension, strafe. The drawings show articulation; actual travel direction is animation/controller data and must not flip facing during an airborne brake.
- Rider: glide lean back, dive tuck, stomp brace; then point, look up, cheer. Pelvis remains seated. Use the existing rig's seat and hand sockets, not the drawing's apparent pixel distances.

The props effects plate shows Hopper only for scale and attachment context: do not bake him into a laser, shield or dissolve mesh. The shadow dissolve applies to enemies; Hopper shown behind it is a scale proxy. Effects arrows and action strokes are not solid geometry.
