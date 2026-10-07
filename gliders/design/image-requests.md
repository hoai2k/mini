# Gliders: image requests

Artwork for Gliders in `gliders/`. Generated from `source/build_requests.py`; edit the data there and rerun it, which also rewrites `gliders/game/src/asset-list.js`.

## How to use this list

1. Each prompt is complete on its own: paste it as it stands. The shared style text is already in every prompt.
2. Save each image under the file name in its **File** line and drop it in `gliders/intake/`. On integration it moves to that path under `gliders/game/`, its status flips to `delivered` and the game loads it in place of its stand-in.
3. Logos, icons and portraits need transparency. If the generator cannot produce alpha, use a flat pure magenta `#FF00FF` background as the prompts say; it is keyed out on integration.
4. Opaque images are listed as `.webp`; PNG or JPEG is fine too, they are converted on integration.
5. Nothing here blocks the game: the levels and the gliders are built in code, and every image has a stand-in.

## Status

0 requested, 9 delivered, 9 in total.

## Brand

The title screen, the browser tab and the game library card.

### GL-U01 · Title logo

- **File:** `gliders/game/assets/ui/logo.png`
- **Size:** 1600 x 640, transparent
- **Used for:** The title screen above Press Start, the pause menu header, and the card on the game library page.
- **Stand-in until delivered:** The word GLIDERS set in the page's font, each letter a different block colour.
- **Status:** delivered

```text
A polished video-game title logo. Clean, bold, slightly italic geometric letterforms with a subtle bevel, as if cut from the same coloured blocks as the game's world: each letter a different colour of the palette coral, tangerine, butter yellow, mint, teal, periwinkle, lilac, with a thin white highlight on the top edges and a soft deep-indigo outline and drop shadow so it reads on both a bright sky and a dark screen. No other text, no watermark. The single word "GLIDERS" in capitals, spelled exactly G-L-I-D-E-R-S. A soft swoosh of contrail curves from under the G up and over the word to end in a small sparkle above the final S, as if something just glided past. Wide landscape composition, the word filling about 85% of the width, even margins. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### GL-U02 · Title background

- **File:** `gliders/game/assets/ui/title-bg.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Full-screen behind the title screen; also the cover of the game library card.
- **Stand-in until delivered:** A live flyover of the first level with a glider circling through it.
- **Status:** delivered

```text
Polished stylised 3D render, like key art for an indie flying game: soft global illumination, gentle rim light, clean shapes, rich but not garish colour, strong sense of speed and depth. The animals are appealing stylised versions of the real species, anatomically recognisable, not cartoon mascots with human expressions. No text, no watermark, no UI, no photographic noise. The world of Gliders: huge abstract structures of clean geometric blocks (towers, arches, hollow frames, tunnels, slabs and spires) floating in an endless soft sky above a sea of clouds, in the style of the game Superflight. The blocks are flat-coloured with crisp edges and soft light, in a vivid but harmonious palette (coral, tangerine, butter yellow, mint, teal, periwinkle, lilac), fading into pastel atmospheric haze with distance. A wide establishing view: in the middle distance a flying squirrel and a four-winged Microraptor glide side by side through a tall coral and teal arch, trailing thin glowing contrails (one aqua, one gold), while a flying fish with its blue pectoral fins spread skims past a tangerine tower in the foreground on the right. Bright late-afternoon light, peach and lavender sky, clouds far below. Keep the upper-middle third calm and open (soft sky and distant blocks only) for the logo, and the bottom-right corner quiet for buttons. Full-bleed 16:9, no border.
```

### GL-U03 · App icon and favicon

- **File:** `gliders/game/assets/ui/icon.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Browser tab, home-screen icon (scaled to 512, 192 and 180 px).
- **Stand-in until delivered:** A drawn SVG icon: a white glider silhouette on a coral-to-violet rounded square.
- **Status:** delivered

```text
Polished stylised 3D render, like key art for an indie flying game: soft global illumination, gentle rim light, clean shapes, rich but not garish colour, strong sense of speed and depth. The animals are appealing stylised versions of the real species, anatomically recognisable, not cartoon mascots with human expressions. No text, no watermark, no UI, no photographic noise. App icon: a stylised flying squirrel seen from below and slightly behind, gliding up and to the right with its membrane fully spread, over a single mint-green block arch, on a rounded-square tile with a coral-to-violet sky gradient. Bold, simple, readable at 48 px; the squirrel fills about 70% of the tile. The rounded square fills the frame with transparent corners. Transparent corners (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

## Glider portraits

One badge per playable glider. The models in play are built in code; these badges stand for each glider in the HUD, on the character cards and on the results podium.

### GL-P01 · Flying Squirrel

- **File:** `gliders/game/assets/portraits/squirrel.png`
- **Size:** 512 x 512, transparent
- **Used for:** The Flying Squirrel badge.
- **Stand-in until delivered:** A snapshot of the in-game 3D model, taken when the game loads.
- **Status:** delivered

```text
Polished stylised 3D render, like key art for an indie flying game: soft global illumination, gentle rim light, clean shapes, rich but not garish colour, strong sense of speed and depth. The animals are appealing stylised versions of the real species, anatomically recognisable, not cartoon mascots with human expressions. No text, no watermark, no UI, no photographic noise. A northern flying squirrel (Glaucomys) with soft grey-brown back fur, cream belly, big dark glossy eyes, its furry gliding membrane stretched taut between wrists and ankles, flat fluffy tail streaming behind. Character badge for the player HUD and results podium: the animal alone, gliding toward the viewer at a three-quarter angle from slightly above, wings or fins fully spread, filling about 85% of a square frame, centred, with a clean silhouette that reads at 64 px. Lit by a warm sun from the upper left with a cool sky fill. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### GL-P02 · Microraptor

- **File:** `gliders/game/assets/portraits/microraptor.png`
- **Size:** 512 x 512, transparent
- **Used for:** The Microraptor badge.
- **Stand-in until delivered:** A snapshot of the in-game 3D model, taken when the game loads.
- **Status:** delivered

```text
Polished stylised 3D render, like key art for an indie flying game: soft global illumination, gentle rim light, clean shapes, rich but not garish colour, strong sense of speed and depth. The animals are appealing stylised versions of the real species, anatomically recognisable, not cartoon mascots with human expressions. No text, no watermark, no UI, no photographic noise. A Microraptor gui, the small four-winged feathered dinosaur: long flight feathers on both arms and legs forming four wings, a long tail ending in a feather fan, toothed narrow snout, iridescent glossy black plumage with blue-green sheen, alert amber eye. Character badge for the player HUD and results podium: the animal alone, gliding toward the viewer at a three-quarter angle from slightly above, wings or fins fully spread, filling about 85% of a square frame, centred, with a clean silhouette that reads at 64 px. Lit by a warm sun from the upper left with a cool sky fill. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### GL-P03 · Flying Fish

- **File:** `gliders/game/assets/portraits/flyingfish.png`
- **Size:** 512 x 512, transparent
- **Used for:** The Flying Fish badge.
- **Stand-in until delivered:** A snapshot of the in-game 3D model, taken when the game loads.
- **Status:** delivered

```text
Polished stylised 3D render, like key art for an indie flying game: soft global illumination, gentle rim light, clean shapes, rich but not garish colour, strong sense of speed and depth. The animals are appealing stylised versions of the real species, anatomically recognisable, not cartoon mascots with human expressions. No text, no watermark, no UI, no photographic noise. A flying fish (Exocoetidae): streamlined body, deep cobalt-blue back fading to silver belly, huge translucent blue pectoral fins spread like wings with fine fin rays, smaller pelvic fins spread too, forked tail with a longer lower lobe, a few water droplets flying off. Character badge for the player HUD and results podium: the animal alone, gliding toward the viewer at a three-quarter angle from slightly above, wings or fins fully spread, filling about 85% of a square frame, centred, with a clean silhouette that reads at 64 px. Lit by a warm sun from the upper left with a cool sky fill. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### GL-P04 · Draco Lizard

- **File:** `gliders/game/assets/portraits/draco.png`
- **Size:** 512 x 512, transparent
- **Used for:** The Draco Lizard badge.
- **Stand-in until delivered:** A snapshot of the in-game 3D model, taken when the game loads.
- **Status:** delivered

```text
Polished stylised 3D render, like key art for an indie flying game: soft global illumination, gentle rim light, clean shapes, rich but not garish colour, strong sense of speed and depth. The animals are appealing stylised versions of the real species, anatomically recognisable, not cartoon mascots with human expressions. No text, no watermark, no UI, no photographic noise. A Draco volans flying lizard: slender mottled brown-green body, long thin tail, its rib-supported patagium wings spread wide on both sides, bright orange with black bars and yellow edges, small yellow throat dewlap extended. Character badge for the player HUD and results podium: the animal alone, gliding toward the viewer at a three-quarter angle from slightly above, wings or fins fully spread, filling about 85% of a square frame, centred, with a clean silhouette that reads at 64 px. Lit by a warm sun from the upper left with a cool sky fill. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### GL-P05 · Flying Frog

- **File:** `gliders/game/assets/portraits/frog.png`
- **Size:** 512 x 512, transparent
- **Used for:** The Flying Frog badge.
- **Stand-in until delivered:** A snapshot of the in-game 3D model, taken when the game loads.
- **Status:** delivered

```text
Polished stylised 3D render, like key art for an indie flying game: soft global illumination, gentle rim light, clean shapes, rich but not garish colour, strong sense of speed and depth. The animals are appealing stylised versions of the real species, anatomically recognisable, not cartoon mascots with human expressions. No text, no watermark, no UI, no photographic noise. Wallace's flying frog: bright leaf-green back, yellow flanks, large dark gold-rimmed eyes, all four limbs splayed with enormous webbed feet, the webbing black with yellow streaks, used as parachutes, skin flaps along the forearms. Character badge for the player HUD and results podium: the animal alone, gliding toward the viewer at a three-quarter angle from slightly above, wings or fins fully spread, filling about 85% of a square frame, centred, with a clean silhouette that reads at 64 px. Lit by a warm sun from the upper left with a cool sky fill. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### GL-P06 · Paradise Tree Snake

- **File:** `gliders/game/assets/portraits/snake.png`
- **Size:** 512 x 512, transparent
- **Used for:** The Paradise Tree Snake badge.
- **Stand-in until delivered:** A snapshot of the in-game 3D model, taken when the game loads.
- **Status:** delivered

```text
Polished stylised 3D render, like key art for an indie flying game: soft global illumination, gentle rim light, clean shapes, rich but not garish colour, strong sense of speed and depth. The animals are appealing stylised versions of the real species, anatomically recognisable, not cartoon mascots with human expressions. No text, no watermark, no UI, no photographic noise. A paradise tree snake (Chrysopelea paradisi) gliding: its body flattened into a ribbon and bent into a wide S-shaped wave, black scales edged in bright green with a row of red-orange spots along the back, head raised and looking forward. One continuous slender flattened body, with no wings, fins, limbs or separate membranes. Character badge for the player HUD and results podium: the animal alone, gliding toward the viewer at a three-quarter angle from slightly above, filling about 85% of a square frame, centred, with a clean silhouette that reads at 64 px. Lit by a warm sun from the upper left with a cool sky fill. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```
