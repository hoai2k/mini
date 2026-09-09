# Hopper the Grasshopper design review

The illustrated proposal is `Hopper_Game_Design.docx`. It contains 21 pages and 11 embedded images: nine generated concept/branding images, the supplied inspiration, and an authored Xbox controller diagram.

## Review guide

- Page 3: canonical Hopper and rider.
- Page 4: Xbox diagram and controls.
- Pages 5–7: movement, combat and animation direction.
- Pages 8, 10 and 12: all nine environment atmospheres.
- Pages 9, 11 and 13: routes, challenges and 18 enemy behaviors.
- Page 14: gravity rules.
- Pages 15–17: boss and enemy art, plus boss mechanics.
- Page 18: generated logo, favicon and interface behavior.
- Pages 19–21: progression, audio, accessibility and proposed production sequence.

## Assets and reproducibility

`assets/` contains the original generated masters, unchanged inspiration copy, controller diagram, transparent logo, favicon ICO, and PNG icon exports at 16, 32, 48, 180, 192 and 512 pixels.

`asset-manifest.json` records the full prompt set and source references for all nine generated images. Generation used the built-in imagegen tool. Character action and branding generations reference `hopper-canonical-v1.png`. The concept sheets need registered animation production after artistic approval; they are not ready-made sprite atlases.

`source/design.md` is the editable text source, `source/build_document.py` builds the Word document, and `source/export_icons.cjs` packages favicon sizes from the generated icon master. `source/controller.svg` is the editable instruction diagram. The document was rendered and visually checked. The final PDF is `Hopper_Game_Design.pdf`; internal render iterations are kept locally under `../../local/hopper/design/qa/`.

## 3D source generation

`tripo/` is the generation kit and provenance record for the 3D characters: the master and multiview images the models were generated from, the prompts, and the generation, processing, animation and skinning-repair reports. See [tripo/README.md](tripo/README.md).

The models those reports produced are delivered in [`../models/`](../models/README.md) and are loaded by the 3D edition; `tripo/` holds no runtime files and no second copy of the model metadata.

This proposal records the original design. The implemented game and its current controls are documented in `../game/README.md`.
