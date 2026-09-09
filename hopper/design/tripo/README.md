# Hopper and rider — 3D source images

The reference images the 3D characters were generated from, and the prompts that
made them. This directory holds artwork and prompt data only. The models these
produced are delivered in [`hopper/models/`](../../models/README.md), which the
3D edition loads; nothing here is loaded at runtime.

## The images

All nine are illustrated proposals drawn from the canonical 2D art, not
registered orthographic renders of one object. Where views disagree about
joints, markings, saddle construction or proportion, the master wins.

| File | Subject | Size | Role |
| --- | --- | --- | --- |
| `hopper-master.png` | Hopper, side three-quarter, empty saddle | 1536×1024 | Primary input; the model was generated from this |
| `hopper-front.png` | Hopper, front | 1536×1024 | Both hind legs visible; the anatomy comparison |
| `hopper-left/right/back.png` | Hopper, profiles and rear | 1536×1024 | Supporting shape reference |
| `rider-master.png` | Boy, front A-pose | 1024×1536 | Primary input for the rider |
| `rider-left/right/back.png` | Boy, profiles and rear | 1024×1536 | Supporting shape reference |
| `contact-sheet.jpg` | All nine together | 1500×1200 | Review only — never submit the collage as a model input |

Side names are the subject's own: the left profile faces image-left.

Two JPEGs are renders of the finished model rather than generation inputs:
`rig-preview.jpg` (1080²) shows rest and posed checks of the rig, and
`scale-study.jpg` (1200×800) puts Hopper on a metre grid beside the boy, four
metre lamps and block buildings. The study exists because the model read as a
toy in an empty viewer: the delivered GLBs use metre scale, Hopper around 30 m
long, and it takes ground contact, familiar-size objects and a restrained satin
finish — not a texture change alone — to make that scale legible.

`generation-prompts.json` records the prompt, output file and reference image
for each of the nine. `correction-prompts.json` records two repairs: the first
master and left-view drafts drew a seventh leg, and the extra limb was removed.
The corrected left view still has overlapping far-side feet, so it is a shape
reference rather than a limb-count guide.

## What was made from them

Single-image generation from the two masters, not multiview from all nine — the
views are independently drawn and disagree in detail, which multiview treats as
one object's geometry. The Hopper front view was generated a second time as a
comparison: it shows the hind legs more symmetrically, but invents forms on the
hidden back and rebuilds the saddle poorly, so the master remained the source.

Cleanup, mechanical rigging, animation and skinning repair happened in Blender
afterwards. The results are the three delivered GLBs, verified in
[`hopper/models/validation.json`](../../models/validation.json):

| Model | Triangles | Clips |
| --- | ---: | ---: |
| `hopper.glb` | 64,925 | 20 |
| `rider.glb` | 30,000 | 13 |
| `hopper-rider.glb` | 94,925 | 25 |

Every Hopper vertex carries exactly one rigid bone weight and no triangle
crosses a rigid part, so armour does not bend. Clip names, socket names, event
windows and loop flags are in [`hopper/models/manifest.json`](../../models/manifest.json);
[`attachments.js`](../../models/attachments.js) is the Three.js helper for
sockets and seat binding.

## Known limits of this source

These are generated surfaces, not hand-retopologised models, and the limits
below come from the images above rather than from the rigging:

- Articulation seams and sculpted irregularities show at close range.
- Hands are simplified; fingers and facial expressions are not individually rigged.
- Saddle rails and antenna curvature differ slightly between the views, so the
  rebuilt rails are an interpretation of the master.
- Extreme poses can expose intersections at joints inherited from the generation.

Heavy working files — the untouched Tripo output, Blender masters, intermediate
exports and inspection renders — stay in the Git-ignored `local/` workspace.
They are not needed to load or use the delivered models.
