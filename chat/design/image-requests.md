# Games Chat: image requests

Artwork for Games Chat in `chat/`. Generated from `source/build_requests.py`; edit the data there and rerun it, which also rewrites `chat/js/asset-list.js` and `face-template.png`.

## How to use this list

1. Each prompt is complete on its own: paste it as it stands. The shared style text is already in every prompt.
2. For prompts marked **face template**, give the generator [`face-template.png`](face-template.png) as a reference image too. It marks the eyes, nose, mouth, chin and top of the head where the app pins the sticker. Only the sticker is wanted in the result: no face.
3. Save each image under the file name in its **File** line and drop it in `chat/intake/`. On integration it moves to that path under `chat/`, its status flips to `delivered` and the app loads it in place of its stand-in.
4. Stickers and sprites need transparency. If the generator cannot produce alpha, use a flat pure magenta `#FF00FF` background as the prompts say; it is keyed out on integration.
5. Opaque images are listed as `.webp`; PNG or JPEG is fine too, they are converted on integration.
6. Nothing here blocks the app: every image has a stand-in that the app draws itself.

## Face template

Face stickers share one 1024 x 1024 template, as the viewer sees the face:

| Point | x, y |
| --- | --- |
| eye (image left) | 392, 520 |
| eye (image right) | 632, 520 |
| nose tip | 512, 640 |
| mouth centre | 512, 740 |
| chin | 512, 880 |
| top of head | 512, 220 |

## Status

261 delivered, 190 requested, 451 in total.

## Brand

The title screen and the browser tab.

### CH-U01 · Title logo

- **File:** `chat/assets/ui/logo-v3.png`
- **Size:** 1600 x 800, transparent
- **Used for:** The title screen logo above Press Start, and the card on the game library page.
- **Stand-in until delivered:** The words in the page's rounded font with a gradient in the player's colour.
- **Status:** delivered

```text
Edit the reference Games Chat logo. Change ONLY its color palette; keep the exact clean lettering, integrated controller A, two-line arrangement, rounded speech bubble, silhouette and transparent background. Use exclusively blue, green and purple hues: GAMES transitions from rich violet through cobalt blue into turquoise; CHAT in fresh mint green into teal; bubble in blue-violet; outlines deep indigo. Controller buttons in mint, teal, blue and violet. Subtle pale cool highlights, tasteful satin shading. Absolutely no orange, pink, red, yellow or magenta anywhere, including gradients, reflections and buttons. Text stays exactly GAMES CHAT. Full logo with generous clear margins on wide 1600 x 800 transparent PNG canvas. Fun but refined.
```

### CH-U02 · Title background

- **File:** `chat/assets/ui/title-bg.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind the title screen and the join form.
- **Stand-in until delivered:** A CSS gradient with drifting canvas bubbles.
- **Status:** delivered

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A dreamy pastel sky full of floating translucent iridescent bubbles of many sizes, some holding tiny reflections of smiling faces, soft lilac to aqua gradient, lots of calm empty space in the middle third for the logo and buttons. Full-bleed background, no border.
```

### CH-U03 · App icon and favicon

- **File:** `chat/assets/ui/icon.png`
- **Size:** 512 x 512, transparent
- **Used for:** The browser tab icon and the card on the game library page.
- **Stand-in until delivered:** An emoji favicon.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A chunky game controller inside a rounded speech bubble, pink and yellow on a rounded-square aqua badge, glossy, with a thick dark-purple outline. Bold and simple so it reads at 16 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

## Face effect stickers

Art the face effects draw on your video. Face stickers (marked **face template**) are drawn against the shared face template so the app can pin them to a tracked face; stretching them is fine, the app scales them to each face. Effects not listed here (bubbles, warps, colour filters, fire, rainbows, rain) are drawn by the app itself.

### CH-F01 · Puppy ears and nose

- **File:** `chat/assets/fx/puppy.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Puppy: floppy ears on the head and a button nose on the nose tip.
- **Stand-in until delivered:** Canvas-drawn ears and nose.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Two floppy brown-and-cream puppy ears hanging from the top of the head on either side, and a shiny black puppy nose centred on the nose tip. Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F02 · Puppy tongue

- **File:** `chat/assets/fx/puppy-tongue.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Puppy: drops out when you open your mouth.
- **Stand-in until delivered:** A canvas-drawn tongue.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A long pink cartoon puppy tongue with a centre crease, its top edge at the mouth centre (512, 740), hanging straight down to about y = 960. Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F03 · Alien antennae

- **File:** `chat/assets/fx/alien-antennae-v2.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Alien: two wobbly antennae on top of the head (the app also tints the face green and enlarges the eyes).
- **Stand-in until delivered:** Canvas-drawn antennae.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Two springy lime-green alien antennae with glowing magenta ball tips, rising from the top of the head at about x = 420 and x = 604 and curving outwards to the top corners. Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F04 · Heart

- **File:** `chat/assets/fx/heart-v2.png`
- **Size:** 256 x 256, transparent
- **Used for:** Heart Eyes: covers each eye and floats up when you smile. Memory Match uses it too.
- **Stand-in until delivered:** A canvas-drawn heart.
- **Status:** delivered

```text
Remove all eyes, eyebrows, mouth, tongue and cheeks from the heart; keep just ONE plain glossy red heart silhouette with a clean surface and highlight. No facial features anywhere. Keep thick dark-red outline and friendly cartoon cel shading. Transparent PNG.
```

### CH-F05 · Pixel sunglasses

- **File:** `chat/assets/fx/sunglasses.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Deal With It: the glasses drop onto your eyes when you smile.
- **Stand-in until delivered:** Canvas-drawn pixel glasses.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Black 8-bit pixel-art "deal with it" sunglasses with white pixel glints, the lenses centred on the two eyes and the bar across the brow line. Crisp square pixels. Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F06 · Crown

- **File:** `chat/assets/fx/crown.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Royalty: a crown on top of the head.
- **Stand-in until delivered:** A canvas-drawn crown.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A jewelled golden cartoon crown with five points and red, blue and green gems, its base band sitting on the top of the head at y = 220 and the points rising to about y = 20. Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F07 · Handlebar mustache

- **File:** `chat/assets/fx/mustache.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Fancy: a mustache between nose and mouth.
- **Stand-in until delivered:** A canvas-drawn mustache.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A grand dark-brown curly handlebar mustache centred at (512, 692), between the nose tip and the mouth, the curls reaching out to about x = 300 and x = 724. Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F08 · Monocle

- **File:** `chat/assets/fx/monocle.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Fancy: a monocle that pops off when you raise your eyebrows.
- **Stand-in until delivered:** A canvas-drawn monocle.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A gold-rimmed monocle with a glassy highlight, its ring centred on the image-right eye (632, 520) with a radius of about 80 px, and a thin gold chain hanging down to (700, 900). Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F09 · Clown wig and nose

- **File:** `chat/assets/fx/clown.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Clown: a rainbow afro and a red nose.
- **Stand-in until delivered:** A canvas-drawn wig and nose.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A big curly rainbow clown afro covering the top and sides of the head (from y = 60 down to about y = 560 at the sides, leaving the face open), and a shiny round red clown nose centred on the nose tip. Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F10 · Dragon horns

- **File:** `chat/assets/fx/dragon-horns.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Dragon: horns on the head; open your mouth to breathe fire.
- **Stand-in until delivered:** Canvas-drawn horns.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Two curved ivory-and-orange dragon horns rising from the top of the head at about x = 400 and x = 624, sweeping back and outwards, with small scaly ridges. Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F11 · Storm cloud

- **File:** `chat/assets/fx/storm-cloud.png`
- **Size:** 768 x 384, transparent
- **Used for:** Storm Cloud: a little rain cloud that follows your head.
- **Stand-in until delivered:** A canvas-drawn cloud.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A fluffy dark-grey cartoon rain cloud with a grumpy face, slightly flat on the bottom, centred and filling the frame. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F12 · Lightning bolt

- **File:** `chat/assets/fx/lightning.png`
- **Size:** 256 x 512, transparent
- **Used for:** Storm Cloud: strikes when you frown.
- **Stand-in until delivered:** A canvas-drawn bolt.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. One zig-zag cartoon lightning bolt in electric yellow with a white core, top at the top centre, tip at the bottom centre. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F13 · Fish 1

- **File:** `chat/assets/fx/fish-1.png`
- **Size:** 384 x 256, transparent
- **Used for:** Under the Sea: swims across your video.
- **Stand-in until delivered:** A canvas-drawn fish.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A round orange-and-white clownfish swimming to the right, side view, centred. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F14 · Fish 2

- **File:** `chat/assets/fx/fish-2.png`
- **Size:** 384 x 256, transparent
- **Used for:** Under the Sea: swims across your video.
- **Stand-in until delivered:** A canvas-drawn fish.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A slim electric-blue tang fish with a yellow tail swimming to the right, side view, centred. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F15 · Fish 3

- **File:** `chat/assets/fx/fish-3.png`
- **Size:** 384 x 256, transparent
- **Used for:** Under the Sea: swims across your video.
- **Stand-in until delivered:** A canvas-drawn fish.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A puffy spotted yellow pufferfish swimming to the right, side view, centred. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F16 · Outer space backdrop

- **File:** `chat/assets/fx/space.webp`
- **Size:** 1280 x 720, opaque
- **Used for:** Outer Space: replaces the room behind you.
- **Stand-in until delivered:** A canvas-drawn starfield with a planet.
- **Status:** delivered

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A cheerful cartoon outer-space scene: deep violet space, scattered stars, a ringed pink planet in the upper left, a small smiling moon on the right and a distant rocket. Keep the centre darker and calmer, since a person sits in front of it. Full-bleed, no border.
```

### CH-F17 · Flower crown

- **File:** `chat/assets/fx/flower-crown.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Flower Crown: a ring of flowers on the head.
- **Stand-in until delivered:** Canvas-drawn flowers.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A lush crown of pink peonies, white daisies, small yellow roses and green leaves, resting across the top of the head from about (300, 300) over (512, 220) to (724, 300), slightly curved like a band seen from the front. Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F18 · Kitty ears, nose and whiskers

- **File:** `chat/assets/fx/kitty-v2.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Kitty: cat ears, a pink nose and whiskers.
- **Stand-in until delivered:** Canvas-drawn ears, nose and whiskers.
- **Status:** delivered

```text
Remove the two eyes, both eyebrows and the curved mouth completely, leaving transparent space. Preserve ONLY both kitty ears, the small pink nose and the white whiskers in their exact current locations. Keep the full square canvas and all empty areas. No face, no eyes, no eyebrows, no mouth, no skin, no head or guide lines. Transparent PNG.
```

### CH-F19 · Bunny ears and nose

- **File:** `chat/assets/fx/bunny-v2.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Bunny: tall bunny ears and a twitchy nose.
- **Stand-in until delivered:** Canvas-drawn ears and nose.
- **Status:** delivered

```text
Remove the two eyes, both eyebrows and the mouth and tongue completely leaving transparent space. Preserve ONLY the two bunny ears and the small pink nose at their exact current locations. Keep full square canvas and empty areas. No face, no eyes, no eyebrows, no mouth, no tongue, no skin or guide lines. Transparent PNG.
```

### CH-F20 · Devil horns

- **File:** `chat/assets/fx/devil.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Devil: little red horns.
- **Stand-in until delivered:** Canvas-drawn horns.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Two small glossy red devil horns curving up from the top of the head at about x = 400 and x = 624, with a faint orange glow. Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F21 · Angel halo

- **File:** `chat/assets/fx/halo.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Angel: a glowing halo floating above the head.
- **Stand-in until delivered:** A canvas-drawn halo.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A glowing golden halo ring seen slightly from the front, floating above the head centred at (512, 140), about 360 px wide, with a soft warm glow. Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F22 · Pirate hat and eyepatch

- **File:** `chat/assets/fx/pirate.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Pirate: a tricorn hat and an eyepatch.
- **Stand-in until delivered:** A canvas-drawn hat and patch.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A black pirate tricorn hat with gold trim and a small white skull, sitting on the top of the head (brim at y = 240), and a black eyepatch over the image-left eye (392, 520) with its strap running diagonally across the forehead. Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F23 · Viking helmet

- **File:** `chat/assets/fx/viking.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Viking: a horned helmet.
- **Stand-in until delivered:** A canvas-drawn helmet.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A round iron Viking helmet with riveted bands and two big curved ivory horns, the rim sitting on the forehead at about y = 330, covering the top of the head. Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F24 · Wizard hat

- **File:** `chat/assets/fx/wizard-hat.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Wizard: a tall starry hat.
- **Stand-in until delivered:** A canvas-drawn hat.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A tall, slightly bent deep-blue wizard hat covered in small gold stars and moons, its wide brim sitting on the top of the head at y = 260 and the tip reaching the top edge. Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F25 · Butterfly

- **File:** `chat/assets/fx/butterfly.png`
- **Size:** 256 x 256, transparent
- **Used for:** Butterflies: they flutter around your head and land on it.
- **Stand-in until delivered:** A canvas-drawn butterfly.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. One bright blue-and-pink butterfly seen from above with wings spread, centred. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F26 · Dancing hotdog

- **File:** `chat/assets/fx/hotdog.png`
- **Size:** 512 x 768, transparent
- **Used for:** Hotdog: a dancing hotdog bops beside you.
- **Stand-in until delivered:** A canvas-drawn hotdog.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A cheerful cartoon hotdog character standing upright, with a mustard squiggle, little arms and legs mid-dance, big eyes and a wide grin, full body, centred. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F27 · Banknote

- **File:** `chat/assets/fx/money.png`
- **Size:** 256 x 128, transparent
- **Used for:** Make It Rain: notes falling all around you.
- **Stand-in until delivered:** A canvas-drawn note.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. One cartoon green banknote with a smiling bubble in the centre oval instead of a portrait, slightly curled, filling the frame. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F28 · Sunset backdrop

- **File:** `chat/assets/fx/sunset.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Sunset: the room behind you becomes a glowing sunset, and you become a silhouette.
- **Stand-in until delivered:** A canvas-drawn sunset gradient.
- **Status:** delivered

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A huge orange and pink sunset over a calm sea, the sun just touching the horizon in the centre, palm trees at the edges, warm glowing sky. Full-bleed.
```

## Minigame art

Sprites and backgrounds for the minigames.

### CH-G01 · Basketball

- **File:** `chat/assets/games/basketball.png`
- **Size:** 256 x 256, transparent
- **Used for:** Hoops: the ball, yours and your friends' ghost balls (the app tints and fades those).
- **Stand-in until delivered:** A canvas-drawn ball.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A classic orange basketball with black seams, seen straight on, centred, filling the frame. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G02 · Hoop and backboard

- **File:** `chat/assets/games/hoop.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Hoops: the target. The game's rim physics assume this layout.
- **Stand-in until delivered:** A canvas-drawn backboard, rim and net.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A basketball hoop seen straight on: a white backboard with a red square, an orange rim seen slightly from below whose front edge runs from (352, 640) to (672, 640), and a white net hanging below the rim to about y = 900. The backboard spans roughly x = 192 to 832 and y = 220 to 700. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G03 · Gym background

- **File:** `chat/assets/games/court-v3.webp`
- **Size:** 1600 x 1200, opaque
- **Used for:** Hoops: behind the hoop.
- **Stand-in until delivered:** A canvas-drawn wall and floor.
- **Status:** delivered

```text
Remove the basketball backboard, hoop, net and all its ceiling support bars entirely. Reconstruct the plain gym wall and high windows behind it. The game draws its own hoop, so the background must contain NO hoop or basketball equipment, NO people, NO ball. Keep the empty bright cartoon gym, wooden floor, blue padded walls, windows, sunlight, bleachers, same perspective and colors. Wide 1600 x 1200 opaque backdrop.
```

### CH-G04 · Flappy sky

- **File:** `chat/assets/games/flappy-sky.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Flappy Face: the scrolling background.
- **Stand-in until delivered:** A canvas-drawn sky and hills.
- **Status:** delivered

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A cheerful cartoon sky with puffy clouds and a low line of green hills and a little town along the bottom. Seamless horizontally: the left and right edges must join with no seam.
```

### CH-G05 · Flappy pillar

- **File:** `chat/assets/games/flappy-pipe-v2.png`
- **Size:** 256 x 1024, transparent
- **Used for:** Flappy Face: the obstacles (the game flips it for the pillars hanging from the top).
- **Stand-in until delivered:** Canvas-drawn pillars.
- **Status:** delivered

```text
A game obstacle sprite for Flappy Face. Thick straight vertical rectangular candy-striped pillar with pink and white diagonal stripes, glossy cartoon cel shading and dark outline. Very tall narrow canvas 256 x 1024. The shaft MUST occupy the full width edge-to-edge, at least 90% of canvas width at EVERY height. A slightly wider rounded cap at top touches both side edges. The straight solid shaft continues to the bottom edge. No ornamental narrowed waist, no pedestal, no transparent side gaps except tiny round top corners. Transparency only outside the silhouette. Game physics treats the entire width as solid. No text. Rework the reference thin pole to this thick wall-like pillar.
```

### CH-G06 · Wings

- **File:** `chat/assets/games/wings.png`
- **Size:** 768 x 384, transparent
- **Used for:** Flappy Face: a pair of wings either side of your face, which is the bird.
- **Stand-in until delivered:** Canvas-drawn wings.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A pair of fluffy white cartoon bird wings spread out to the left and right, with an empty round gap about 256 px wide in the middle where a face will go. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G07 · Showdown street

- **File:** `chat/assets/games/quickdraw.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** Quick Draw: the background of the duel.
- **Stand-in until delivered:** A canvas-drawn sunset gradient.
- **Status:** delivered

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A cartoon Wild West main street at high noon seen down the middle: saloon and general store on either side, a tumbleweed, a big bright sun, empty dusty road in the centre. Full-bleed.
```

### CH-G08 · Rock hand

- **File:** `chat/assets/games/rps-rock.png`
- **Size:** 512 x 512, transparent
- **Used for:** Rock Paper Scissors: the rock throw.
- **Stand-in until delivered:** The ✊ emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A cartoon fist (rock) seen from the back of the hand, centred. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G09 · Paper hand

- **File:** `chat/assets/games/rps-paper.png`
- **Size:** 512 x 512, transparent
- **Used for:** Rock Paper Scissors: the paper throw.
- **Stand-in until delivered:** The ✋ emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A cartoon open flat hand (paper), palm facing the viewer, centred. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G10 · Scissors hand

- **File:** `chat/assets/games/rps-scissors.png`
- **Size:** 512 x 512, transparent
- **Used for:** Rock Paper Scissors: the scissors throw.
- **Stand-in until delivered:** The ✌️ emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A cartoon hand making a V with two fingers (scissors), centred. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G11 · Air hockey table

- **File:** `chat/assets/games/airhockey-table-v2.webp`
- **Size:** 1000 x 1600, opaque
- **Used for:** Air Hockey: the table, seen from above, portrait.
- **Stand-in until delivered:** A canvas-drawn table.
- **Status:** delivered

```text
Remove both red and blue mallets and the black puck completely. Reconstruct the empty pale-blue dotted table beneath them. Remove any checkerboard outside the table and fill the entire rectangular canvas with the table artwork. Keep a straight top-down view, all goals, rails and center markings. No mallets, no puck, no text.
```

### CH-G12 · Card back

- **File:** `chat/assets/games/card-back.png`
- **Size:** 512 x 704, transparent
- **Used for:** Memory Match: the face-down cards.
- **Stand-in until delivered:** A CSS pattern.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. The back of a playing card with rounded corners: a bright aqua and pink bubble pattern with a small bubble logo in the middle, symmetrical. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G13 · Mini golf turf

- **File:** `chat/assets/games/golf-grass.webp`
- **Size:** 512 x 512, opaque
- **Used for:** Mini Golf: the putting surface (tiled).
- **Stand-in until delivered:** A canvas-drawn striped green.
- **Status:** delivered

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. Top-down bright green artificial putting turf with a fine mown stripe pattern, seamlessly tileable on all four edges, no objects.
```

### CH-G14 · Bowling lane

- **File:** `chat/assets/games/bowling-lane.webp`
- **Size:** 1080 x 1920, opaque
- **Used for:** Bowling: the lane, seen from behind the bowler looking down it.
- **Stand-in until delivered:** A canvas-drawn lane.
- **Status:** delivered

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A glossy wooden bowling lane in perspective from the bowler's end, gutters on both sides, arrows on the boards, the pin deck lit at the far end near the top centre, neon bowling alley walls. Leave the pin deck empty: the game draws the pins.
```

### CH-G15 · Bowling pin

- **File:** `chat/assets/games/bowling-pin.png`
- **Size:** 128 x 384, transparent
- **Used for:** Bowling: each pin.
- **Stand-in until delivered:** A canvas-drawn pin.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. One classic white bowling pin with two red stripes around the neck, upright, centred. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G16 · Top bun

- **File:** `chat/assets/games/burger-bun-top.png`
- **Size:** 512 x 192, transparent
- **Used for:** Burger Stack: an ingredient that falls and stacks.
- **Stand-in until delivered:** A canvas-drawn ingredient.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Side view of a domed sesame-seed top bun, filling the width, as part of a stacked cartoon burger. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G17 · Bottom bun

- **File:** `chat/assets/games/burger-bun-bottom.png`
- **Size:** 512 x 192, transparent
- **Used for:** Burger Stack: an ingredient that falls and stacks.
- **Stand-in until delivered:** A canvas-drawn ingredient.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Side view of a flat bottom bun, filling the width, as part of a stacked cartoon burger. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G18 · Patty

- **File:** `chat/assets/games/burger-patty-v2.png`
- **Size:** 512 x 192, transparent
- **Used for:** Burger Stack: an ingredient that falls and stacks.
- **Stand-in until delivered:** A canvas-drawn ingredient.
- **Status:** delivered

```text
Replace the entire burger with ONLY one single brown grilled burger patty as an isolated game sprite, clean side view, wide flattened oval, mild cartoon grill marks and glossy cel shading. No bread, no cheese, no lettuce, no tomato, no plate or other ingredients. Transparent background, even clear margins.
```

### CH-G19 · Cheese

- **File:** `chat/assets/games/burger-cheese-v2.png`
- **Size:** 512 x 192, transparent
- **Used for:** Burger Stack: an ingredient that falls and stacks.
- **Stand-in until delivered:** A canvas-drawn ingredient.
- **Status:** delivered

```text
Keep ONLY one thin yellow cheese slice as an isolated game ingredient, clean side view, wide flat slab with gently wavy edges. Remove all brown meat and anything below it. No patty, no bun, no other food, no plate. Transparent background, clean clear margins, glossy cartoon shading.
```

### CH-G20 · Lettuce

- **File:** `chat/assets/games/burger-lettuce.png`
- **Size:** 512 x 192, transparent
- **Used for:** Burger Stack: an ingredient that falls and stacks.
- **Stand-in until delivered:** A canvas-drawn ingredient.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Side view of a frilly green lettuce leaf, filling the width, as part of a stacked cartoon burger. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G21 · Tomato

- **File:** `chat/assets/games/burger-tomato.png`
- **Size:** 512 x 192, transparent
- **Used for:** Burger Stack: an ingredient that falls and stacks.
- **Stand-in until delivered:** A canvas-drawn ingredient.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Side view of two red tomato slices side by side, filling the width, as part of a stacked cartoon burger. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G22 · Asteroid

- **File:** `chat/assets/games/asteroid.png`
- **Size:** 256 x 256, transparent
- **Used for:** Asteroid Dodge: the rocks to dodge.
- **Stand-in until delivered:** A canvas-drawn rock.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. One lumpy grey-brown cartoon asteroid with craters, centred. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G23 · Rocket ship

- **File:** `chat/assets/games/rocket.png`
- **Size:** 256 x 256, transparent
- **Used for:** Asteroid Dodge: your ship, which wears your face in its window.
- **Stand-in until delivered:** A canvas-drawn rocket.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A chunky cartoon rocket ship pointing up, red and white with fins and a flame, and a big empty round porthole window in the middle (the app shows your face there). Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G24 · Beach ball

- **File:** `chat/assets/games/beach-ball.png`
- **Size:** 256 x 256, transparent
- **Used for:** Beach Bump: the ball you bump between friends.
- **Stand-in until delivered:** A canvas-drawn beach ball.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A classic six-panel beach ball in red, yellow, blue, white, green and orange, centred. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

## 360° worlds

Panoramas for the 360° background effects: the room behind you is replaced by the world, and tilting your phone (or turning your head on a laptop) looks around it. Each is a full equirectangular panorama: 2:1, the horizon exactly at half height, the left and right edges joining seamlessly, straight up at the top edge and straight down at the bottom. Keep the band around the horizon interesting all the way round, since that is what people see most. No people, no text.

### CH-W01 · Beach panorama

- **File:** `chat/assets/worlds/world-beach.webp`
- **Size:** 4096 x 2048, opaque
- **Used for:** Beach 360: the world behind you that you look around by tilting the phone.
- **Stand-in until delivered:** A canvas-drawn panorama with a sky, a horizon and a few shapes.
- **Status:** delivered

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A 360-degree equirectangular panorama of a tropical beach: turquoise sea, white sand, palm trees, a beach hut, a striped umbrella and a few seagulls, bright midday sky. Cartoon style, rich colour, everything drawn as seen from a person standing in the middle.
```

### CH-W02 · Space station panorama

- **File:** `chat/assets/worlds/world-space.webp`
- **Size:** 4096 x 2048, opaque
- **Used for:** Space station 360: the world behind you that you look around by tilting the phone.
- **Stand-in until delivered:** A canvas-drawn panorama with a sky, a horizon and a few shapes.
- **Status:** delivered

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A 360-degree equirectangular panorama of inside a cosy cartoon space station with round windows looking out at Earth and the Moon, glowing control panels and floating snacks. Cartoon style, rich colour, everything drawn as seen from a person standing in the middle.
```

### CH-W03 · Coral reef panorama

- **File:** `chat/assets/worlds/world-reef.webp`
- **Size:** 4096 x 2048, opaque
- **Used for:** Coral reef 360: the world behind you that you look around by tilting the phone.
- **Stand-in until delivered:** A canvas-drawn panorama with a sky, a horizon and a few shapes.
- **Status:** delivered

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A 360-degree equirectangular panorama of underwater on a colourful coral reef: sunbeams from above, fish schools, a turtle, kelp and pink and orange corals all around. Cartoon style, rich colour, everything drawn as seen from a person standing in the middle.
```

### CH-W04 · Enchanted forest panorama

- **File:** `chat/assets/worlds/world-forest.webp`
- **Size:** 4096 x 2048, opaque
- **Used for:** Enchanted forest 360: the world behind you that you look around by tilting the phone.
- **Stand-in until delivered:** A canvas-drawn panorama with a sky, a horizon and a few shapes.
- **Status:** delivered

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A 360-degree equirectangular panorama of a glowing enchanted forest at dusk: giant mushrooms, fireflies, mossy trees and a winding path. Cartoon style, rich colour, everything drawn as seen from a person standing in the middle.
```

### CH-W05 · City rooftop panorama

- **File:** `chat/assets/worlds/world-city.webp`
- **Size:** 4096 x 2048, opaque
- **Used for:** City rooftop 360: the world behind you that you look around by tilting the phone.
- **Stand-in until delivered:** A canvas-drawn panorama with a sky, a horizon and a few shapes.
- **Status:** delivered

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A 360-degree equirectangular panorama of a city rooftop at night: neon skyscrapers all around, string lights, a water tower and a starry sky. Cartoon style, rich colour, everything drawn as seen from a person standing in the middle.
```

### CH-W06 · Snowy mountains panorama

- **File:** `chat/assets/worlds/world-snow.webp`
- **Size:** 4096 x 2048, opaque
- **Used for:** Snowy mountains 360: the world behind you that you look around by tilting the phone.
- **Stand-in until delivered:** A canvas-drawn panorama with a sky, a horizon and a few shapes.
- **Status:** delivered

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A 360-degree equirectangular panorama of a snowy mountain top: peaks in every direction, a cosy cabin, pine trees and a pink alpenglow sky. Cartoon style, rich colour, everything drawn as seen from a person standing in the middle.
```

### CH-W07 · Candy land panorama

- **File:** `chat/assets/worlds/world-candy.webp`
- **Size:** 4096 x 2048, opaque
- **Used for:** Candy land 360: the world behind you that you look around by tilting the phone.
- **Stand-in until delivered:** A canvas-drawn panorama with a sky, a horizon and a few shapes.
- **Status:** delivered

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A 360-degree equirectangular panorama of a candy land: lollipop trees, a chocolate river, gumdrop hills and candy-cane fences under a pastel sky. Cartoon style, rich colour, everything drawn as seen from a person standing in the middle.
```

### CH-W08 · Volcano island panorama

- **File:** `chat/assets/worlds/world-volcano.webp`
- **Size:** 4096 x 2048, opaque
- **Used for:** Volcano island 360: the world behind you that you look around by tilting the phone.
- **Stand-in until delivered:** A canvas-drawn panorama with a sky, a horizon and a few shapes.
- **Status:** delivered

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A 360-degree equirectangular panorama of a volcano island: a smoking volcano with glowing lava rivers, black sand, dinosaur silhouettes and a red sky. Cartoon style, rich colour, everything drawn as seen from a person standing in the middle.
```

## Effect and game icons

One icon per face effect and per minigame, shown on the effect tray and the game picker. Memory Match also uses the effect icons as its card faces. Until they arrive the app shows an emoji.

### CH-I01 · Bubble Blow icon

- **File:** `chat/assets/icons/fx-bubble.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Bubble Blow button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of puckered cartoon lips blowing a big translucent iridescent bubble. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I02 · Big Eyes icon

- **File:** `chat/assets/icons/fx-bigeyes.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Big Eyes button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a cartoon face with huge sparkly anime eyes. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I03 · Bobblehead icon

- **File:** `chat/assets/icons/fx-bobblehead.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Bobblehead button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a bobblehead figure with a giant head on a tiny body on a spring. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I04 · Noodle Face icon

- **File:** `chat/assets/icons/fx-noodle.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Noodle Face button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a cartoon face stretched tall and thin like a funhouse mirror. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I05 · Swirl icon

- **File:** `chat/assets/icons/fx-swirl.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Swirl button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a cartoon face twisted into a colourful spiral. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I06 · 8-Bit icon

- **File:** `chat/assets/icons/fx-pixel.png`
- **Size:** 256 x 256, transparent
- **Used for:** The 8-Bit button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a pixel-art smiley face made of big square pixels. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I07 · Comic Book icon

- **File:** `chat/assets/icons/fx-comic.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Comic Book button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a comic-book face with halftone dots and a POW burst. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I08 · Heat Vision icon

- **File:** `chat/assets/icons/fx-thermal.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Heat Vision button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a face shown as a thermal camera image, blue to red to yellow. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I09 · Outer Space icon

- **File:** `chat/assets/icons/fx-space.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Outer Space button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of an astronaut helmet in front of a ringed planet and stars. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I10 · Under the Sea icon

- **File:** `chat/assets/icons/fx-underwater.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Under the Sea button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a clownfish among bubbles in blue water. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I11 · Puppy icon

- **File:** `chat/assets/icons/fx-puppy.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Puppy button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a cute puppy face with floppy ears and its tongue out. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I12 · Alien icon

- **File:** `chat/assets/icons/fx-alien.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Alien button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a green alien face with big black eyes and antennae. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I13 · Heart Eyes icon

- **File:** `chat/assets/icons/fx-hearteyes.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Heart Eyes button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a smiley face with red hearts for eyes. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I14 · Deal With It icon

- **File:** `chat/assets/icons/fx-dealwithit.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Deal With It button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of black pixel sunglasses dropping onto a smug face. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I15 · Royalty icon

- **File:** `chat/assets/icons/fx-crown.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Royalty button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a golden jewelled crown. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I16 · Fancy icon

- **File:** `chat/assets/icons/fx-fancy.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Fancy button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a handlebar mustache and a gold monocle. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I17 · Clown icon

- **File:** `chat/assets/icons/fx-clown.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Clown button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a red clown nose and a rainbow afro. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I18 · Dragon icon

- **File:** `chat/assets/icons/fx-dragon.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Dragon button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a small dragon head breathing a puff of fire. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I19 · Rainbow Mouth icon

- **File:** `chat/assets/icons/fx-rainbow.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Rainbow Mouth button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a smiling mouth with a rainbow pouring out of it. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I20 · Storm Cloud icon

- **File:** `chat/assets/icons/fx-storm.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Storm Cloud button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a grumpy grey rain cloud with a lightning bolt. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I21 · Hoops icon

- **File:** `chat/assets/icons/game-hoops.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Hoops card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a basketball swishing through an orange hoop. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I22 · Flappy Face icon

- **File:** `chat/assets/icons/game-flappy.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Flappy Face card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a smiling round face with white bird wings flapping. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I23 · Staring Contest icon

- **File:** `chat/assets/icons/game-stare.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Staring Contest card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of two wide-open cartoon eyes staring, with tiny sweat drops. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I24 · Quick Draw icon

- **File:** `chat/assets/icons/game-quickdraw.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Quick Draw card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a cowboy hat and a hand-drawn "!" speech burst. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I25 · Rock Paper Scissors icon

- **File:** `chat/assets/icons/game-rps.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Rock Paper Scissors card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a fist, an open hand and a V-sign hand in a circle. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I26 · Connect Four icon

- **File:** `chat/assets/icons/game-connect4.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Connect Four card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a blue grid with red and yellow discs in a diagonal row. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I27 · Air Hockey icon

- **File:** `chat/assets/icons/game-airhockey.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Air Hockey card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of an air hockey paddle striking a puck with speed lines. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I28 · Doodle Guess icon

- **File:** `chat/assets/icons/game-doodle.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Doodle Guess card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a pencil drawing a squiggle with a question mark. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I29 · Memory Match icon

- **File:** `chat/assets/icons/game-memory.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Memory Match card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of two face-up cards with matching hearts and one face-down card. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I30 · Copy Cat icon

- **File:** `chat/assets/icons/game-copycat.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Copy Cat card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a cartoon cat making a silly face in a mirror. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I31 · Time Trails icon

- **File:** `chat/assets/icons/fx-echo.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Time Trails button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a face leaving a rainbow trail of see-through copies. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I32 · Delay Ghost icon

- **File:** `chat/assets/icons/fx-delayghost.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Delay Ghost button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a person with a translucent ghost copy one step behind. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I33 · Time Warp icon

- **File:** `chat/assets/icons/fx-timewarp.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Time Warp button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a face stretched by a glowing blue scan line sweeping down. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I34 · Side Warp icon

- **File:** `chat/assets/icons/fx-timewarpside.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Side Warp button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a face smeared sideways by a vertical blue scan line. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I35 · Wobble Time icon

- **File:** `chat/assets/icons/fx-slitscan.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Wobble Time button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a face rippling in wavy horizontal bands. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I36 · Stop Motion icon

- **File:** `chat/assets/icons/fx-strobe.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Stop Motion button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a face in three jerky film frames. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I37 · Clones icon

- **File:** `chat/assets/icons/fx-clones.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Clones button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of three identical cartoon faces in a row. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I38 · Motion Glow icon

- **File:** `chat/assets/icons/fx-motionglow.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Motion Glow button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a waving hand leaving neon outline trails. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I39 · Beach 360 icon

- **File:** `chat/assets/icons/fx-beach360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Beach 360 button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a palm tree and a turquoise sea in a round 360 frame. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I40 · Space 360 icon

- **File:** `chat/assets/icons/fx-space360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Space 360 button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of Earth seen through a round space-station window. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I41 · Reef 360 icon

- **File:** `chat/assets/icons/fx-reef360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Reef 360 button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a coral reef with a turtle in a round frame. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I42 · Forest 360 icon

- **File:** `chat/assets/icons/fx-forest360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Forest 360 button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of glowing mushrooms in a dark forest. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I43 · City 360 icon

- **File:** `chat/assets/icons/fx-city360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The City 360 button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of neon skyscrapers at night. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I44 · Snow 360 icon

- **File:** `chat/assets/icons/fx-snow360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Snow 360 button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of snowy peaks and a cabin. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I45 · Candy 360 icon

- **File:** `chat/assets/icons/fx-candy360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Candy 360 button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of lollipop trees and gumdrop hills. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I46 · Volcano 360 icon

- **File:** `chat/assets/icons/fx-volcano360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Volcano 360 button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of an erupting cartoon volcano. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I47 · Blur icon

- **File:** `chat/assets/icons/fx-blurbg.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Blur button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a sharp face in front of a soft blurry room. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I48 · Colour Pop icon

- **File:** `chat/assets/icons/fx-colorpop.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Colour Pop button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a colourful face against a grey room. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I49 · Neon Aura icon

- **File:** `chat/assets/icons/fx-neonaura.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Neon Aura button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a dark silhouette outlined in glowing neon pink and cyan. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I50 · Disco icon

- **File:** `chat/assets/icons/fx-disco.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Disco button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a glittering disco ball with coloured light beams. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I51 · Code Rain icon

- **File:** `chat/assets/icons/fx-matrix.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Code Rain button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of green falling code characters behind a silhouette. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I52 · Sunset icon

- **File:** `chat/assets/icons/fx-sunset.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Sunset button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a black silhouette against a huge orange sunset. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I53 · Tiny Face icon

- **File:** `chat/assets/icons/fx-tinyface.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Tiny Face button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a big head with a tiny squished face in the middle. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I54 · Chubby Cheeks icon

- **File:** `chat/assets/icons/fx-chubby.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Chubby Cheeks button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a face with huge puffed-out round cheeks. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I55 · Baby Face icon

- **File:** `chat/assets/icons/fx-babyface.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Baby Face button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a baby face with big eyes and a tiny nose. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I56 · Mirror Face icon

- **File:** `chat/assets/icons/fx-symmetry.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Mirror Face button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a face split down the middle and mirrored. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I57 · Cyclops icon

- **File:** `chat/assets/icons/fx-cyclops.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Cyclops button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a cartoon face with one huge eye in the middle. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I58 · Big Mouth icon

- **File:** `chat/assets/icons/fx-bigmouth.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Big Mouth button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a face with an enormous grinning mouth. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I59 · Fisheye icon

- **File:** `chat/assets/icons/fx-fisheye.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Fisheye button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a face bulging through a round fisheye lens. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I60 · Flower Crown icon

- **File:** `chat/assets/icons/fx-flowercrown.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Flower Crown button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a crown of pink peonies and daisies. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I61 · Kitty icon

- **File:** `chat/assets/icons/fx-kitty.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Kitty button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a cute cat face with whiskers. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I62 · Bunny icon

- **File:** `chat/assets/icons/fx-bunny.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Bunny button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a bunny face with tall ears. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I63 · Devil icon

- **File:** `chat/assets/icons/fx-devil.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Devil button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a cheeky face with little red devil horns. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I64 · Angel icon

- **File:** `chat/assets/icons/fx-angel.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Angel button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a smiling face with a golden halo. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I65 · Pirate icon

- **File:** `chat/assets/icons/fx-pirate.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Pirate button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a pirate tricorn hat and eyepatch. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I66 · Viking icon

- **File:** `chat/assets/icons/fx-viking.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Viking button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a horned Viking helmet. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I67 · Wizard icon

- **File:** `chat/assets/icons/fx-wizard.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Wizard button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a starry blue wizard hat with sparkles. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I68 · Butterflies icon

- **File:** `chat/assets/icons/fx-butterflies.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Butterflies button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of blue and pink butterflies circling a head. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I69 · Glam icon

- **File:** `chat/assets/icons/fx-makeup.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Glam button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a lipstick and a blush brush with sparkles. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I70 · Waterworks icon

- **File:** `chat/assets/icons/fx-crying.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Waterworks button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a face crying two fountains of tears. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I71 · Hotdog icon

- **File:** `chat/assets/icons/fx-hotdog.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Hotdog button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a dancing cartoon hotdog. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I72 · Film Noir icon

- **File:** `chat/assets/icons/fx-noir.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Film Noir button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a black-and-white detective hat and film grain. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I73 · VHS icon

- **File:** `chat/assets/icons/fx-vhs.png`
- **Size:** 256 x 256, transparent
- **Used for:** The VHS button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a VHS tape with rainbow glitch lines. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I74 · Pop Art icon

- **File:** `chat/assets/icons/fx-popart.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Pop Art button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of four colourful pop-art copies of a face in a grid. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I75 · Kaleidoscope icon

- **File:** `chat/assets/icons/fx-kaleidoscope.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Kaleidoscope button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a colourful kaleidoscope star pattern. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I76 · Snowfall icon

- **File:** `chat/assets/icons/fx-snow.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Snowfall button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of big snowflakes falling. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I77 · Confetti icon

- **File:** `chat/assets/icons/fx-confetti.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Confetti button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a party popper bursting confetti. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I78 · Make It Rain icon

- **File:** `chat/assets/icons/fx-moneyrain.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Make It Rain button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of green banknotes falling. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I79 · Laser Eyes icon

- **File:** `chat/assets/icons/fx-lasereyes.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Laser Eyes button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a face shooting red laser beams from its eyes. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I80 · Fireworks icon

- **File:** `chat/assets/icons/fx-fireworks.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Fireworks button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of colourful fireworks bursting in a night sky. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I81 · Mini Golf icon

- **File:** `chat/assets/icons/game-minigolf.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Mini Golf card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a golf ball next to a flag in a hole on bright green turf. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I82 · Bowling icon

- **File:** `chat/assets/icons/game-bowling.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Bowling card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a bowling ball crashing into white pins. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I83 · Beach Bump icon

- **File:** `chat/assets/icons/game-beachbump.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Beach Bump card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a beach ball bouncing off a smiling face. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I84 · Burger Stack icon

- **File:** `chat/assets/icons/game-burger.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Burger Stack card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a tall wobbly burger stack with a face peeking under it. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I85 · Asteroid Dodge icon

- **File:** `chat/assets/icons/game-asteroids.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Asteroid Dodge card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a rocket weaving between asteroids. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I86 · Don't Smile icon

- **File:** `chat/assets/icons/game-dontsmile.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Don't Smile card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a straight face trying not to laugh, with a sweat drop. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I87 · Snake icon

- **File:** `chat/assets/icons/game-snake.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Snake card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of two cartoon snakes racing for an apple. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I88 · Battleship icon

- **File:** `chat/assets/icons/game-battleship.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Battleship card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a grey battleship and a red hit marker on a blue grid. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I89 · Trivia icon

- **File:** `chat/assets/icons/game-trivia.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Trivia card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a big question mark on a quiz-show buzzer. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I90 · Word Blitz icon

- **File:** `chat/assets/icons/game-wordblitz.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Word Blitz card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a 4x4 grid of letter tiles with a word path traced in gold. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I91 · Kid icon

- **File:** `chat/assets/icons/fx-kid.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Kid button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a cheerful child's face with big eyes and freckles. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I92 · Man icon

- **File:** `chat/assets/icons/fx-manface.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Man button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a grown man's face with a square jaw and stubble. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I93 · Woman icon

- **File:** `chat/assets/icons/fx-womanface.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Woman button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a woman's face with long lashes, rosy cheeks and red lips. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I94 · Thinner icon

- **File:** `chat/assets/icons/fx-thinner.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Thinner button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a tall skinny face squeezed between two inward arrows. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I95 · Fatter icon

- **File:** `chat/assets/icons/fx-fatter.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Fatter button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a wide round face stretched between two outward arrows. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I96 · Baby icon

- **File:** `chat/assets/icons/fx-baby.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Baby button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a chubby-cheeked baby's face with big round eyes, a tiny nose and a few wisps of hair. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Actual transparent alpha outside the tile, no magenta. Output canvas 256 x 256.
```

## Theme title screens

A title background and logo for each theme you can pick in Settings > Theme: Teen (the default), Art (mid-century French New Wave cinema posters) and Classical (18th-century French Rococo). The Kid theme keeps the original title art.

### CH-T01 · Teen theme: title background

- **File:** `chat/assets/themes/title-bg-teen-v2.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind the title screen and join form in the Teen theme.
- **Stand-in until delivered:** The Kid theme's title background.
- **Status:** delivered

```text
Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Full-bleed background: a deep indigo night city scene seen from a rooftop, neon signs and city lights softly out of focus, a few glowing phone screens and speech-bubble shapes drifting like lanterns. Keep the middle third calm and uncluttered for the logo and the join form. No border.  Edit: Recompose as a clean DRAWN 2D vector-style indigo rooftop city background. Remove ALL people, portrait cards, central camera logo, textbox and join button. The entire middle third is calm dark indigo negative space for a separately rendered logo and join form. Crisp vector shapes, abstract gently blurred neon skyline behind, only a few small glowing phone rectangles and speech bubbles near outer edges. No text, logos, controls or photorealism. Full bleed 1920x1080.
```

### CH-T02 · Teen theme: logo

- **File:** `chat/assets/themes/logo-teen-v2.png`
- **Size:** 1600 x 800, transparent
- **Used for:** The title screen logo in the Teen theme.
- **Stand-in until delivered:** The Kid theme's logo.
- **Status:** delivered

```text
Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No other text, no watermark, no photorealism. A sleek logo: "GAMES" in a bold modern sans serif with a soft neon glow over "CHAT" set inside a rounded speech bubble outline, white and electric violet with one hot-pink accent. Spell it exactly: Games Chat. Centred, wide landscape composition with even margins. Apart from the words Games Chat, no text. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Edit: Simplify to ONLY the lettering GAMES over CHAT inside a rounded speech-bubble outline. Remove both people, portrait cards, microphones, video controls, hangup buttons, hearts, crown and controller. Bold modern sans-serif, uppercase GAMES CHAT, white electric-violet glow with cyan and mint accents, exclusively blue/green/purple spectrum, no orange/pink/red. Crisp vector brandmark, no photographs. Generous clear margins, 1600x800 transparent.
```

### CH-T03 · Art theme: title background

- **File:** `chat/assets/themes/title-bg-art.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind the title screen and join form in the Art theme.
- **Stand-in until delivered:** The Kid theme's title background.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Full-bleed background: a Nouvelle Vague film-poster composition: two stylised faces in profile facing each other across a café table, cut-paper shapes in vermilion, black and mustard, a big abstract sun and the Eiffel Tower as a tiny black silhouette. Keep the middle third calm and uncluttered for the logo and the join form. No border. 
```

### CH-T04 · Art theme: logo

- **File:** `chat/assets/themes/logo-art-v2.png`
- **Size:** 1600 x 800, transparent
- **Used for:** The title screen logo in the Art theme.
- **Stand-in until delivered:** The Kid theme's logo.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No other text, no watermark. A film-title logo: "Games Chat" in a hand-cut condensed display face like a 1960s Nouvelle Vague title card, red and black on off-white paper, with a small cut-paper speech bubble. Spell it exactly: Games Chat. Centred, wide landscape composition with even margins. Apart from the words Games Chat, no text. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Edit: Remove the man and woman portraits and cigarette entirely. Keep ONLY Games Chat lettering, red and black hand-cut condensed 1960s film-title style on off-white letter shapes, with one SMALL red/black cut-paper speech bubble. Centre the text with generous even margins on a 1600x800 transparent canvas. No people or yellow bubble. Retain paper grain and confident Nouvelle Vague style.
```

### CH-T05 · Classical theme: title background

- **File:** `chat/assets/themes/title-bg-classic.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind the title screen and join form in the Classical theme.
- **Stand-in until delivered:** The Kid theme's title background.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Full-bleed background: a Rococo garden party at Versailles: powdered aristocrats in silks chatting on a swing and around a fountain, cherubs, roses, ribbons and pastel clouds, framed by gilt scrollwork. Keep the middle third calm and uncluttered for the logo and the join form. No border. 
```

### CH-T06 · Classical theme: logo

- **File:** `chat/assets/themes/logo-classic-v2.png`
- **Size:** 1600 x 800, transparent
- **Used for:** The title screen logo in the Classical theme.
- **Stand-in until delivered:** The Kid theme's logo.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No other text, no watermark. An ornate Rococo cartouche logo: "Games Chat" in elegant engraved copperplate script with gold leaf, inside a gilded scrolling frame with ribbons and a small cherub. Spell it exactly: Games Chat. Centred, wide landscape composition with even margins. Apart from the words Games Chat, no text. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration. Edit: Remove the two aristocrat figures on the sides entirely. Keep the ornate gilded Rococo cartouche, elegant copperplate Games Chat lettering, ribbons and small top cherub. Centre and balance the cartouche logo within 1600x800 with even clear margins and actual transparent background. Preserve painterly style and gold leaf.
```

## Effect and game icons, Art theme

The Art theme's icon for every effect and game: mid-century French New Wave cinema poster art, each showing what the effect or game does. Until one arrives the theme shows the Teen icon.

### CH-N01 · Bubble Blow icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-bubble.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Bubble Blow button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person in profile with pursed lips blowing a big shimmering soap bubble that drifts away towards the edge, a second small bubble popping with a burst of droplets. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N02 · Puppy icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-puppy.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Puppy button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face wearing realistic-looking floppy brown dog ears and a black dog nose, mouth open with a long pink dog tongue hanging out. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N03 · Heart Eyes icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-hearteyes.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Heart Eyes button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's grinning face with glowing red heart shapes in place of the eyes, three small hearts floating up from the head. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N04 · Dragon icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-dragon.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Dragon button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person with small curved dragon horns and scaly cheeks, mouth wide open blasting a jet of orange fire sideways. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N05 · Rainbow Mouth icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-rainbow.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Rainbow Mouth button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face with mouth wide open and a thick bright rainbow pouring out of it and curving down out of frame. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N06 · Big Eyes icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-bigeyes.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Big Eyes button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face with eyes magnified huge like a bulging lens, the rest of the face normal, a subtle warp ring around each eye. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N07 · Bobblehead icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-bobblehead.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Bobblehead button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person drawn with a giant head on a small body, the head tilted mid-wobble with two motion arcs. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N08 · Alien icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-alien.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Alien button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face tinted lime green with large glossy black almond eyes and two antennae with glowing tips. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N09 · Deal With It icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-dealwithit.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Deal With It button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: pixel-art black sunglasses dropping down onto a smirking person's face, motion lines above them. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N10 · Royalty icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-crown.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Royalty button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a confident person wearing a heavy gold jewelled crown slightly tilted, a few gold sparkles. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N11 · Fancy icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-fancy.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Fancy button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person with raised eyebrows, a curled handlebar mustache and a gold monocle on a chain falling from one eye. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N12 · Clown icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-clown.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Clown button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person with a round red clown nose and a huge rainbow curly afro wig, mouth open in a honk. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N13 · Storm Cloud icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-storm.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Storm Cloud button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a small dark rain cloud hovering over a person's frowning head, rain falling on them and a lightning bolt striking. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N14 · Noodle Face icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-noodle.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Noodle Face button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face stretched long and wavy like in a funhouse mirror, eyes and mouth pulled into a tall S-curve. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N15 · Swirl icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-swirl.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Swirl button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face twisted into a spiral around the nose, as if being pulled down a whirlpool. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N16 · Outer Space icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-space.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Outer Space button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's head and shoulders cut out against a deep starfield with a ringed planet and a nebula behind them. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N17 · Under the Sea icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-underwater.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Under the Sea button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's head and shoulders in blue-green water light, rippling caustics on the face, bubbles rising and a small tropical fish passing. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N18 · 8-Bit icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-pixel.png`
- **Size:** 256 x 256, transparent
- **Used for:** The 8-Bit button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face rendered in big chunky square pixels with a limited retro console palette, half the face still smooth to show the change. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N19 · Comic Book icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-comic.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Comic Book button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face in comic-book style with halftone dots and bold ink lines, mouth open and a jagged POW burst shape beside it. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N20 · Heat Vision icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-thermal.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Heat Vision button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face as a thermal camera image, hot yellow and red cheeks fading to purple and blue at the edges. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N21 · Flower Crown icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-flowercrown.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Flower Crown button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person wearing a crown of pink peonies, white daisies and green leaves, soft petals drifting. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N22 · Kitty icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-kitty.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Kitty button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person with pointed cat ears, a small pink cat nose and thin white whiskers, mouth open mid-meow. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N23 · Bunny icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-bunny.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Bunny button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person with tall white rabbit ears, one ear flopped over, and a little pink bunny nose. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N24 · Hotdog icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-hotdog.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Hotdog button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person dressed in a full hotdog costume, face showing through the bun, jumping in the air. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N25 · Laser Eyes icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-lasereyes.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Laser Eyes button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person with raised eyebrows firing two straight red laser beams from the eyes towards the viewer, glowing hot. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N26 · Waterworks icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-crying.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Waterworks button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face crying two exaggerated arcing fountains of tears from the corners of the eyes, splashing below. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N27 · Devil icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-devil.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Devil button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person with a sly smile and two small glossy red devil horns, a faint red glow and a few embers behind. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N28 · Angel icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-angel.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Angel button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person with a golden halo floating above the head and soft white feathered wings behind the shoulders. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N29 · Pirate icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-pirate.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Pirate button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person in a black tricorn pirate hat with a skull emblem and a black eyepatch, mid-shout. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N30 · Viking icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-viking.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Viking button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person in a horned steel Viking helmet with a braided orange beard. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N31 · Wizard icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-wizard.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Wizard button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person in a tall starry midnight-blue wizard hat, eyebrows raised, purple magic sparks bursting around the head. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N32 · Butterflies icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-butterflies.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Butterflies button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's head with a ring of blue and pink butterflies circling it, two flying off. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N33 · Glam icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-makeup.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Glam button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face with bold winged eyeliner, glossy red lips and contoured cheeks, a sparkle on the cheekbone. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N34 · Beach 360 icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-beach360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Beach 360 button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person cut out in front of a tropical beach with palm trees and turquoise sea, a circular 360-degree arrow around the scene. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N35 · Space 360 icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-space360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Space 360 button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person cut out in front of a space-station window looking down at Earth, a circular 360-degree arrow around the scene. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N36 · Reef 360 icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-reef360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Reef 360 button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person cut out in front of a coral reef with a sea turtle, a circular 360-degree arrow around the scene. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N37 · Forest 360 icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-forest360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Forest 360 button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person cut out in front of a misty fantasy forest with a waterfall and glowing mushrooms, a circular 360-degree arrow. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N38 · City 360 icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-city360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The City 360 button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person cut out on a rooftop in front of neon skyscrapers at night, a circular 360-degree arrow around the scene. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N39 · Snow 360 icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-snow360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Snow 360 button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person cut out in front of snowy mountain peaks and a wooden cabin, a circular 360-degree arrow. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N40 · Candy 360 icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-candy360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Candy 360 button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person cut out in front of a candy land with lollipop trees and a gingerbread house, a circular 360-degree arrow. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N41 · Volcano 360 icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-volcano360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Volcano 360 button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person cut out in front of an erupting volcano and rivers of glowing lava, a circular 360-degree arrow. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N42 · Blur icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-blurbg.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Blur button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a crisp, sharply drawn person in the foreground, and behind them a bedroom so heavily out of focus that nothing in it has an edge: only big soft round bokeh discs of warm and violet light and smeared colour shapes, like a phone's portrait mode turned all the way up. The contrast between the sharp person and the completely blurred room is the whole point of the icon; draw no sharp object anywhere behind them. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N43 · Colour Pop icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-colorpop.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Colour Pop button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person in full vivid colour in front of a room that is entirely black and white. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N44 · Neon Aura icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-neonaura.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Neon Aura button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a dark silhouette of a person outlined by a glowing neon pink and cyan aura on a black background. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N45 · Disco icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-disco.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Disco button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person lit by coloured disco beams from a mirror ball above, light spots on the face, dark room behind. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N46 · Code Rain icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-matrix.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Code Rain button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person with a green-tinted face in front of falling columns of green code characters on black. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N47 · Sunset icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-sunset.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Sunset button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a black silhouette of a person's head and shoulders against a huge orange and pink sunset over the sea. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N48 · Time Trails icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-echo.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Time Trails button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person mid-move leaving a trail of four fading see-through copies, each tinted a different rainbow colour. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N49 · Delay Ghost icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-delayghost.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Delay Ghost button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person with a pale translucent ghost copy of themselves a step behind, copying their pose a moment late. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N50 · Time Warp icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-timewarp.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Time Warp button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face stretched and frozen above a glowing blue horizontal scan line moving down the picture. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N51 · Side Warp icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-timewarpside.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Side Warp button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face smeared sideways into a long streak left of a glowing blue vertical scan line. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N52 · Wobble Time icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-slitscan.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Wobble Time button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face sliced into horizontal bands, each band shifted in time so the face ripples like a wave. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N53 · Stop Motion icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-strobe.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Stop Motion button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: three frozen film frames of a person in jerky poses side by side, like stop-motion animation on a film strip. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N54 · Clones icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-clones.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Clones button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: three identical copies of the same person in different poses side by side in one room. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N55 · Motion Glow icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-motionglow.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Motion Glow button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person waving one hand, the hand leaving bright neon light-painting trails in the air. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N56 · Tiny Face icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-tinyface.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Tiny Face button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a normal-sized person head with comically tiny eyes, nose and mouth squeezed together in the middle. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N57 · Chubby Cheeks icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-chubby.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Chubby Cheeks button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face with hugely puffed-out round cheeks, lips pressed together holding air. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N58 · Baby Face icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-babyface.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Baby Face button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face turned into a baby's: huge round eyes, a button nose, chubby cheeks and a tiny mouth. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N59 · Mirror Face icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-symmetry.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Mirror Face button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face split down the middle with one half mirrored onto the other, a thin glowing line down the centre. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N60 · Cyclops icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-cyclops.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Cyclops button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face with a single large eye in the middle of the forehead instead of two. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N61 · Big Mouth icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-bigmouth.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Big Mouth button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face with an enormous wide grinning mouth taking up the lower half of the face. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N62 · Fisheye icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-fisheye.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Fisheye button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person leaning close to the lens, nose and face bulging out through a round fisheye distortion. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N63 · Film Noir icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-noir.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Film Noir button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person in black and white with film grain and a dramatic slatted window shadow across the face. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N64 · VHS icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-vhs.png`
- **Size:** 256 x 256, transparent
- **Used for:** The VHS button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face on an old VHS tape picture with colour bleeding, tracking lines and a glitch band across the middle. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N65 · Pop Art icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-popart.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Pop Art button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: four copies of the same person's face in a 2x2 grid, each in a different loud pop-art colour scheme. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N66 · Kaleidoscope icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-kaleidoscope.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Kaleidoscope button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face repeated into a symmetrical kaleidoscope star pattern in bright colours. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N67 · Snowfall icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-snow.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Snowfall button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person in a beanie with big snowflakes falling around them and a few settling on the hat. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N68 · Confetti icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-confetti.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Confetti button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a smiling person with bursts of multicoloured confetti and streamers exploding around their head. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N69 · Make It Rain icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-moneyrain.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Make It Rain button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person with mouth open while green banknotes rain down and flutter around them. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N70 · Fireworks icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-fireworks.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Fireworks button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person with mouth open as a firework launches upward and bursts into a big colourful flower in the night sky behind. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N71 · Man icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-manface.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Man button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a split face: left half a person, right half the same person as a grown man with a squarer jaw, heavier brows and stubble. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N72 · Woman icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-womanface.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Woman button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a split face: left half a person, right half the same person with winged eyeliner, fuller lips and a slimmer jaw. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N73 · Thinner icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-thinner.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Thinner button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's head and shoulders squeezed narrow from both sides, two arrows pressing inward. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N74 · Fatter icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-fatter.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Fatter button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's head and shoulders stretched wide sideways, two arrows pulling outward. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N75 · Baby icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-baby.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Baby button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a split face: left half a person, right half the same person as a baby, with a big round head, fat cheeks, large eyes, a tiny button nose and smooth skin. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N76 · Hoops icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-hoops.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Hoops card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a hand flicking a basketball up towards a hoop with a glass backboard, a faint ghost ball in another colour following. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N77 · Flappy Face icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-flappy.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Flappy Face card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face as a round bird with small white wings, flapping through a gap between two tall pillars. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N78 · Air Hockey icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-airhockey.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Air Hockey card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a top-down air hockey table, a paddle striking the puck with speed lines towards the goal. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N79 · Connect Four icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-connect4.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Connect Four card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a blue Connect Four grid with red and yellow discs, the last disc dropping in to make four in a row. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N80 · Quick Draw icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-quickdraw.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Quick Draw card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: two cowboy silhouettes facing off on a dusty street at sunset, one already drawing. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N81 · Staring Contest icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-stare.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Staring Contest card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: two faces nose to nose glaring, wide-open eyes, a fly buzzing between them. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N82 · Copy Cat icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-copycat.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Copy Cat card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: two faces side by side pulling the same silly expression, tongue out and one eye shut. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N83 · Rock Paper Scissors icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-rps.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Rock Paper Scissors card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: three hands thrown at once in a circle: a fist, a flat hand and a V for scissors. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N84 · Doodle Guess icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-doodle.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Doodle Guess card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a hand-drawn marker sketch of a cat on a whiteboard with a speech bubble guessing with a question mark. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N85 · Memory Match icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-memory.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Memory Match card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a grid of face-down cards with two flipped face-up showing the same effect picture. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N86 · Mini Golf icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-minigolf.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Mini Golf card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a golf ball rolling across bright turf towards a flag in the hole, a dashed aiming line behind it. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N87 · Bowling icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-bowling.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Bowling card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a bowling ball curving down a lane and smashing into white pins mid-strike. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N88 · Beach Bump icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-beachbump.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Beach Bump card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a beach ball bouncing off a person's forehead as they nod, motion lines and a sunny beach behind. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N89 · Burger Stack icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-burger.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Burger Stack card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a tall wobbly burger tower being caught on a bun, a lettuce leaf falling in and a boot to dodge. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N90 · Asteroid Dodge icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-asteroids.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Asteroid Dodge card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a small rocket weaving between tumbling asteroids in space, a gold star to grab. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N91 · Don't Smile icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-dontsmile.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Don't Smile card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person with a dead-straight face, lips pressed tight, trying not to laugh, a bead of sweat. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N92 · Snake icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-snake.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Snake card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: two neon snakes of different colours racing across a dark grid towards a glowing apple. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N93 · Battleship icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-battleship.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Battleship card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a top-down grid of sea with a grey battleship and a red explosion hit marker on it. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N94 · Trivia icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-trivia.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Trivia card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a quiz-show buzzer being slammed with four coloured answer panels behind it. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N95 · Word Blitz icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-wordblitz.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Word Blitz card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a 4x4 grid of letter tiles with a glowing path swiped through them spelling a word. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

## Effect and game icons, Classical theme

The Classical theme's icon for every effect and game: 18th-century French Rococo painting in a gilt frame, each showing what the effect or game does. Until one arrives the theme shows the Teen icon.

### CH-R01 · Bubble Blow icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-bubble.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Bubble Blow button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person in profile with pursed lips blowing a big shimmering soap bubble that drifts away towards the edge, a second small bubble popping with a burst of droplets. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R02 · Puppy icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-puppy.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Puppy button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face wearing realistic-looking floppy brown dog ears and a black dog nose, mouth open with a long pink dog tongue hanging out. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R03 · Heart Eyes icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-hearteyes.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Heart Eyes button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's grinning face with glowing red heart shapes in place of the eyes, three small hearts floating up from the head. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R04 · Dragon icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-dragon.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Dragon button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person with small curved dragon horns and scaly cheeks, mouth wide open blasting a jet of orange fire sideways. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R05 · Rainbow Mouth icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-rainbow.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Rainbow Mouth button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face with mouth wide open and a thick bright rainbow pouring out of it and curving down out of frame. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R06 · Big Eyes icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-bigeyes.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Big Eyes button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face with eyes magnified huge like a bulging lens, the rest of the face normal, a subtle warp ring around each eye. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R07 · Bobblehead icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-bobblehead.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Bobblehead button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person drawn with a giant head on a small body, the head tilted mid-wobble with two motion arcs. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R08 · Alien icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-alien.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Alien button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face tinted lime green with large glossy black almond eyes and two antennae with glowing tips. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R09 · Deal With It icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-dealwithit.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Deal With It button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: pixel-art black sunglasses dropping down onto a smirking person's face, motion lines above them. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R10 · Royalty icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-crown.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Royalty button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a confident person wearing a heavy gold jewelled crown slightly tilted, a few gold sparkles. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R11 · Fancy icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-fancy.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Fancy button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person with raised eyebrows, a curled handlebar mustache and a gold monocle on a chain falling from one eye. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R12 · Clown icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-clown.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Clown button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person with a round red clown nose and a huge rainbow curly afro wig, mouth open in a honk. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R13 · Storm Cloud icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-storm.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Storm Cloud button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a small dark rain cloud hovering over a person's frowning head, rain falling on them and a lightning bolt striking. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R14 · Noodle Face icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-noodle.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Noodle Face button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face stretched long and wavy like in a funhouse mirror, eyes and mouth pulled into a tall S-curve. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R15 · Swirl icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-swirl.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Swirl button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face twisted into a spiral around the nose, as if being pulled down a whirlpool. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R16 · Outer Space icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-space.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Outer Space button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's head and shoulders cut out against a deep starfield with a ringed planet and a nebula behind them. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R17 · Under the Sea icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-underwater.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Under the Sea button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's head and shoulders in blue-green water light, rippling caustics on the face, bubbles rising and a small tropical fish passing. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R18 · 8-Bit icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-pixel.png`
- **Size:** 256 x 256, transparent
- **Used for:** The 8-Bit button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face rendered in big chunky square pixels with a limited retro console palette, half the face still smooth to show the change. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R19 · Comic Book icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-comic.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Comic Book button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face in comic-book style with halftone dots and bold ink lines, mouth open and a jagged POW burst shape beside it. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R20 · Heat Vision icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-thermal.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Heat Vision button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face as a thermal camera image, hot yellow and red cheeks fading to purple and blue at the edges. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R21 · Flower Crown icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-flowercrown.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Flower Crown button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person wearing a crown of pink peonies, white daisies and green leaves, soft petals drifting. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R22 · Kitty icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-kitty.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Kitty button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person with pointed cat ears, a small pink cat nose and thin white whiskers, mouth open mid-meow. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R23 · Bunny icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-bunny.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Bunny button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person with tall white rabbit ears, one ear flopped over, and a little pink bunny nose. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R24 · Hotdog icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-hotdog.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Hotdog button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person dressed in a full hotdog costume, face showing through the bun, jumping in the air. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R25 · Laser Eyes icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-lasereyes.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Laser Eyes button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person with raised eyebrows firing two straight red laser beams from the eyes towards the viewer, glowing hot. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R26 · Waterworks icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-crying.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Waterworks button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face crying two exaggerated arcing fountains of tears from the corners of the eyes, splashing below. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R27 · Devil icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-devil.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Devil button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person with a sly smile and two small glossy red devil horns, a faint red glow and a few embers behind. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R28 · Angel icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-angel.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Angel button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person with a golden halo floating above the head and soft white feathered wings behind the shoulders. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R29 · Pirate icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-pirate.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Pirate button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person in a black tricorn pirate hat with a skull emblem and a black eyepatch, mid-shout. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R30 · Viking icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-viking.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Viking button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person in a horned steel Viking helmet with a braided orange beard. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R31 · Wizard icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-wizard.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Wizard button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person in a tall starry midnight-blue wizard hat, eyebrows raised, purple magic sparks bursting around the head. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R32 · Butterflies icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-butterflies.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Butterflies button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's head with a ring of blue and pink butterflies circling it, two flying off. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R33 · Glam icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-makeup.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Glam button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face with bold winged eyeliner, glossy red lips and contoured cheeks, a sparkle on the cheekbone. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R34 · Beach 360 icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-beach360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Beach 360 button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person cut out in front of a tropical beach with palm trees and turquoise sea, a circular 360-degree arrow around the scene. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R35 · Space 360 icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-space360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Space 360 button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person cut out in front of a space-station window looking down at Earth, a circular 360-degree arrow around the scene. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R36 · Reef 360 icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-reef360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Reef 360 button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person cut out in front of a coral reef with a sea turtle, a circular 360-degree arrow around the scene. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R37 · Forest 360 icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-forest360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Forest 360 button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person cut out in front of a misty fantasy forest with a waterfall and glowing mushrooms, a circular 360-degree arrow. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R38 · City 360 icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-city360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The City 360 button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person cut out on a rooftop in front of neon skyscrapers at night, a circular 360-degree arrow around the scene. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R39 · Snow 360 icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-snow360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Snow 360 button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person cut out in front of snowy mountain peaks and a wooden cabin, a circular 360-degree arrow. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R40 · Candy 360 icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-candy360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Candy 360 button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person cut out in front of a candy land with lollipop trees and a gingerbread house, a circular 360-degree arrow. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R41 · Volcano 360 icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-volcano360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Volcano 360 button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person cut out in front of an erupting volcano and rivers of glowing lava, a circular 360-degree arrow. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R42 · Blur icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-blurbg.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Blur button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a crisp, sharply drawn person in the foreground, and behind them a bedroom so heavily out of focus that nothing in it has an edge: only big soft round bokeh discs of warm and violet light and smeared colour shapes, like a phone's portrait mode turned all the way up. The contrast between the sharp person and the completely blurred room is the whole point of the icon; draw no sharp object anywhere behind them. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R43 · Colour Pop icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-colorpop.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Colour Pop button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person in full vivid colour in front of a room that is entirely black and white. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R44 · Neon Aura icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-neonaura.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Neon Aura button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a dark silhouette of a person outlined by a glowing neon pink and cyan aura on a black background. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R45 · Disco icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-disco.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Disco button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person lit by coloured disco beams from a mirror ball above, light spots on the face, dark room behind. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R46 · Code Rain icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-matrix.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Code Rain button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person with a green-tinted face in front of falling columns of green code characters on black. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R47 · Sunset icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-sunset.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Sunset button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a black silhouette of a person's head and shoulders against a huge orange and pink sunset over the sea. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R48 · Time Trails icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-echo.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Time Trails button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person mid-move leaving a trail of four fading see-through copies, each tinted a different rainbow colour. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R49 · Delay Ghost icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-delayghost.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Delay Ghost button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person with a pale translucent ghost copy of themselves a step behind, copying their pose a moment late. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R50 · Time Warp icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-timewarp.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Time Warp button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face stretched and frozen above a glowing blue horizontal scan line moving down the picture. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R51 · Side Warp icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-timewarpside.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Side Warp button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face smeared sideways into a long streak left of a glowing blue vertical scan line. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R52 · Wobble Time icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-slitscan.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Wobble Time button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face sliced into horizontal bands, each band shifted in time so the face ripples like a wave. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R53 · Stop Motion icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-strobe.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Stop Motion button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: three frozen film frames of a person in jerky poses side by side, like stop-motion animation on a film strip. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R54 · Clones icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-clones.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Clones button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: three identical copies of the same person in different poses side by side in one room. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R55 · Motion Glow icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-motionglow.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Motion Glow button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person waving one hand, the hand leaving bright neon light-painting trails in the air. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R56 · Tiny Face icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-tinyface.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Tiny Face button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a normal-sized person head with comically tiny eyes, nose and mouth squeezed together in the middle. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R57 · Chubby Cheeks icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-chubby.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Chubby Cheeks button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face with hugely puffed-out round cheeks, lips pressed together holding air. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R58 · Baby Face icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-babyface.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Baby Face button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face turned into a baby's: huge round eyes, a button nose, chubby cheeks and a tiny mouth. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R59 · Mirror Face icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-symmetry.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Mirror Face button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face split down the middle with one half mirrored onto the other, a thin glowing line down the centre. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R60 · Cyclops icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-cyclops.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Cyclops button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face with a single large eye in the middle of the forehead instead of two. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R61 · Big Mouth icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-bigmouth.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Big Mouth button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face with an enormous wide grinning mouth taking up the lower half of the face. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R62 · Fisheye icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-fisheye.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Fisheye button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person leaning close to the lens, nose and face bulging out through a round fisheye distortion. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R63 · Film Noir icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-noir.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Film Noir button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person in black and white with film grain and a dramatic slatted window shadow across the face. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R64 · VHS icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-vhs.png`
- **Size:** 256 x 256, transparent
- **Used for:** The VHS button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face on an old VHS tape picture with colour bleeding, tracking lines and a glitch band across the middle. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R65 · Pop Art icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-popart.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Pop Art button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: four copies of the same person's face in a 2x2 grid, each in a different loud pop-art colour scheme. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R66 · Kaleidoscope icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-kaleidoscope.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Kaleidoscope button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face repeated into a symmetrical kaleidoscope star pattern in bright colours. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R67 · Snowfall icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-snow.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Snowfall button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person in a beanie with big snowflakes falling around them and a few settling on the hat. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R68 · Confetti icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-confetti.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Confetti button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a smiling person with bursts of multicoloured confetti and streamers exploding around their head. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R69 · Make It Rain icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-moneyrain.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Make It Rain button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person with mouth open while green banknotes rain down and flutter around them. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R70 · Fireworks icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-fireworks.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Fireworks button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person with mouth open as a firework launches upward and bursts into a big colourful flower in the night sky behind. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R71 · Man icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-manface.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Man button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a split face: left half a person, right half the same person as a grown man with a squarer jaw, heavier brows and stubble. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R72 · Woman icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-womanface.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Woman button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a split face: left half a person, right half the same person with winged eyeliner, fuller lips and a slimmer jaw. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R73 · Thinner icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-thinner.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Thinner button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's head and shoulders squeezed narrow from both sides, two arrows pressing inward. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R74 · Fatter icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-fatter.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Fatter button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's head and shoulders stretched wide sideways, two arrows pulling outward. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R75 · Baby icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-baby.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Baby button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a split face: left half a person, right half the same person as a baby, with a big round head, fat cheeks, large eyes, a tiny button nose and smooth skin. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R76 · Hoops icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-hoops.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Hoops card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a hand flicking a basketball up towards a hoop with a glass backboard, a faint ghost ball in another colour following. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R77 · Flappy Face icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-flappy.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Flappy Face card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face as a round bird with small white wings, flapping through a gap between two tall pillars. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R78 · Air Hockey icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-airhockey.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Air Hockey card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a top-down air hockey table, a paddle striking the puck with speed lines towards the goal. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R79 · Connect Four icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-connect4.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Connect Four card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a blue Connect Four grid with red and yellow discs, the last disc dropping in to make four in a row. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R80 · Quick Draw icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-quickdraw.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Quick Draw card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: two cowboy silhouettes facing off on a dusty street at sunset, one already drawing. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R81 · Staring Contest icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-stare.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Staring Contest card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: two faces nose to nose glaring, wide-open eyes, a fly buzzing between them. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R82 · Copy Cat icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-copycat.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Copy Cat card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: two faces side by side pulling the same silly expression, tongue out and one eye shut. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R83 · Rock Paper Scissors icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-rps.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Rock Paper Scissors card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: three hands thrown at once in a circle: a fist, a flat hand and a V for scissors. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R84 · Doodle Guess icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-doodle.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Doodle Guess card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a hand-drawn marker sketch of a cat on a whiteboard with a speech bubble guessing with a question mark. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R85 · Memory Match icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-memory.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Memory Match card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a grid of face-down cards with two flipped face-up showing the same effect picture. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R86 · Mini Golf icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-minigolf.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Mini Golf card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a golf ball rolling across bright turf towards a flag in the hole, a dashed aiming line behind it. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R87 · Bowling icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-bowling.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Bowling card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a bowling ball curving down a lane and smashing into white pins mid-strike. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R88 · Beach Bump icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-beachbump.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Beach Bump card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a beach ball bouncing off a person's forehead as they nod, motion lines and a sunny beach behind. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R89 · Burger Stack icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-burger.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Burger Stack card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a tall wobbly burger tower being caught on a bun, a lettuce leaf falling in and a boot to dodge. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R90 · Asteroid Dodge icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-asteroids.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Asteroid Dodge card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a small rocket weaving between tumbling asteroids in space, a gold star to grab. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R91 · Don't Smile icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-dontsmile.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Don't Smile card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person with a dead-straight face, lips pressed tight, trying not to laugh, a bead of sweat. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R92 · Snake icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-snake.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Snake card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: two neon snakes of different colours racing across a dark grid towards a glowing apple. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R93 · Battleship icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-battleship.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Battleship card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a top-down grid of sea with a grey battleship and a red explosion hit marker on it. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R94 · Trivia icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-trivia.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Trivia card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a quiz-show buzzer being slammed with four coloured answer panels behind it. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R95 · Word Blitz icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-wordblitz.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Word Blitz card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a 4x4 grid of letter tiles with a glowing path swiped through them spelling a word. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

## Effect and game icons, second set (teen style)

A new icon for every effect and game, replacing the first set as each one arrives (the app keeps the first-set icon, or the emoji, until then). Aimed at teenagers: sharper and less childish, on one shared dark tile, and each picture shows what the effect or game actually does: the face with the effect on, or the moment of play.

### CH-K96 · Baby icon (second set)

- **File:** `chat/assets/icons2/fx2-baby.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Baby button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a split face: left half a teen, right half the same person as a baby, with a big round head, fat cheeks, large eyes, a tiny button nose and smooth skin. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside the tile, no magenta. Output canvas 256 x 256.
```

### CH-K01 · Bubble Blow icon (second set)

- **File:** `chat/assets/icons2/fx2-bubble.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Bubble Blow button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen in profile with pursed lips blowing a big shimmering soap bubble that drifts away towards the edge, a second small bubble popping with a burst of droplets. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K02 · Puppy icon (second set)

- **File:** `chat/assets/icons2/fx2-puppy-v2.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Puppy button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Style correction: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen's face wearing realistic-looking floppy brown dog ears and a black dog nose, mouth open with a long pink dog tongue hanging out. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K03 · Heart Eyes icon (second set)

- **File:** `chat/assets/icons2/fx2-hearteyes.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Heart Eyes button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen's grinning face with glowing red heart shapes in place of the eyes, three small hearts floating up from the head. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K04 · Dragon icon (second set)

- **File:** `chat/assets/icons2/fx2-dragon.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Dragon button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen with small curved dragon horns and scaly cheeks, mouth wide open blasting a jet of orange fire sideways. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K05 · Rainbow Mouth icon (second set)

- **File:** `chat/assets/icons2/fx2-rainbow.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Rainbow Mouth button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen's face with mouth wide open and a thick bright rainbow pouring out of it and curving down out of frame. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K06 · Big Eyes icon (second set)

- **File:** `chat/assets/icons2/fx2-bigeyes-v2.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Big Eyes button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Style correction: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen's face with eyes magnified huge like a bulging lens, the rest of the face normal, a subtle warp ring around each eye. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K07 · Bobblehead icon (second set)

- **File:** `chat/assets/icons2/fx2-bobblehead.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Bobblehead button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen drawn with a giant head on a small body, the head tilted mid-wobble with two motion arcs. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K08 · Alien icon (second set)

- **File:** `chat/assets/icons2/fx2-alien-v2.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Alien button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Style correction: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen's face tinted lime green with large glossy black almond eyes and two antennae with glowing tips. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K09 · Deal With It icon (second set)

- **File:** `chat/assets/icons2/fx2-dealwithit.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Deal With It button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: pixel-art black sunglasses dropping down onto a smirking teen's face, motion lines above them. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K10 · Royalty icon (second set)

- **File:** `chat/assets/icons2/fx2-crown.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Royalty button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a confident teen wearing a heavy gold jewelled crown slightly tilted, a few gold sparkles. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K11 · Fancy icon (second set)

- **File:** `chat/assets/icons2/fx2-fancy.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Fancy button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen with raised eyebrows, a curled handlebar mustache and a gold monocle on a chain falling from one eye. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K12 · Clown icon (second set)

- **File:** `chat/assets/icons2/fx2-clown-v2.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Clown button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Style correction: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen with a round red clown nose and a huge rainbow curly afro wig, mouth open in a honk. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K13 · Storm Cloud icon (second set)

- **File:** `chat/assets/icons2/fx2-storm.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Storm Cloud button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a small dark rain cloud hovering over a teen's frowning head, rain falling on them and a lightning bolt striking. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K14 · Noodle Face icon (second set)

- **File:** `chat/assets/icons2/fx2-noodle-v2.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Noodle Face button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Style correction: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen's face stretched long and wavy like in a funhouse mirror, eyes and mouth pulled into a tall S-curve. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K15 · Swirl icon (second set)

- **File:** `chat/assets/icons2/fx2-swirl-v2.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Swirl button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Style correction: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen's face twisted into a spiral around the nose, as if being pulled down a whirlpool. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K16 · Outer Space icon (second set)

- **File:** `chat/assets/icons2/fx2-space-v2.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Outer Space button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Style correction: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen's head and shoulders cut out against a deep starfield with a ringed planet and a nebula behind them. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K17 · Under the Sea icon (second set)

- **File:** `chat/assets/icons2/fx2-underwater-v2.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Under the Sea button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Style correction: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen's head and shoulders in blue-green water light, rippling caustics on the face, bubbles rising and a small tropical fish passing. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K18 · 8-Bit icon (second set)

- **File:** `chat/assets/icons2/fx2-pixel-v2.png`
- **Size:** 256 x 256, transparent
- **Used for:** The 8-Bit button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Style correction: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen's face rendered in big chunky square pixels with a limited retro console palette, half the face still smooth to show the change. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K19 · Comic Book icon (second set)

- **File:** `chat/assets/icons2/fx2-comic-v2.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Comic Book button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen's face in comic-book style with halftone dots and bold ink lines, mouth open and a jagged POW burst shape beside it. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Edit: Change only the white video-camera glyph: remove it entirely and leave a plain white jagged comic burst with no symbol or text. Preserve the drawn face, halftone, colours, rounded dark tile and transparent exterior.
```

### CH-K20 · Heat Vision icon (second set)

- **File:** `chat/assets/icons2/fx2-thermal-v2.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Heat Vision button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Style correction: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen's face as a thermal camera image, hot yellow and red cheeks fading to purple and blue at the edges. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K21 · Flower Crown icon (second set)

- **File:** `chat/assets/icons2/fx2-flowercrown.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Flower Crown button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen wearing a crown of pink peonies, white daisies and green leaves, soft petals drifting. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K22 · Kitty icon (second set)

- **File:** `chat/assets/icons2/fx2-kitty.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Kitty button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen with pointed cat ears, a small pink cat nose and thin white whiskers, mouth open mid-meow. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K23 · Bunny icon (second set)

- **File:** `chat/assets/icons2/fx2-bunny.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Bunny button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen with tall white rabbit ears, one ear flopped over, and a little pink bunny nose. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K24 · Hotdog icon (second set)

- **File:** `chat/assets/icons2/fx2-hotdog.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Hotdog button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a person dressed in a full hotdog costume, face showing through the bun, jumping in the air. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K25 · Laser Eyes icon (second set)

- **File:** `chat/assets/icons2/fx2-lasereyes.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Laser Eyes button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen with raised eyebrows firing two straight red laser beams from the eyes towards the viewer, glowing hot. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K26 · Waterworks icon (second set)

- **File:** `chat/assets/icons2/fx2-crying.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Waterworks button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen's face crying two exaggerated arcing fountains of tears from the corners of the eyes, splashing below. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K27 · Devil icon (second set)

- **File:** `chat/assets/icons2/fx2-devil.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Devil button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen with a sly smile and two small glossy red devil horns, a faint red glow and a few embers behind. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K28 · Angel icon (second set)

- **File:** `chat/assets/icons2/fx2-angel.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Angel button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen with a golden halo floating above the head and soft white feathered wings behind the shoulders. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K29 · Pirate icon (second set)

- **File:** `chat/assets/icons2/fx2-pirate.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Pirate button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen in a black tricorn pirate hat with a skull emblem and a black eyepatch, mid-shout. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K30 · Viking icon (second set)

- **File:** `chat/assets/icons2/fx2-viking.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Viking button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen in a horned steel Viking helmet with a braided orange beard. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K31 · Wizard icon (second set)

- **File:** `chat/assets/icons2/fx2-wizard.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Wizard button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen in a tall starry midnight-blue wizard hat, eyebrows raised, purple magic sparks bursting around the head. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K32 · Butterflies icon (second set)

- **File:** `chat/assets/icons2/fx2-butterflies.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Butterflies button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen's head with a ring of blue and pink butterflies circling it, two flying off. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K33 · Glam icon (second set)

- **File:** `chat/assets/icons2/fx2-makeup.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Glam button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen's face with bold winged eyeliner, glossy red lips and contoured cheeks, a sparkle on the cheekbone. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K34 · Beach 360 icon (second set)

- **File:** `chat/assets/icons2/fx2-beach360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Beach 360 button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen cut out in front of a tropical beach with palm trees and turquoise sea, a circular 360-degree arrow around the scene. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K35 · Space 360 icon (second set)

- **File:** `chat/assets/icons2/fx2-space360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Space 360 button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen cut out in front of a space-station window looking down at Earth, a circular 360-degree arrow around the scene. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K36 · Reef 360 icon (second set)

- **File:** `chat/assets/icons2/fx2-reef360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Reef 360 button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen cut out in front of a coral reef with a sea turtle, a circular 360-degree arrow around the scene. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K37 · Forest 360 icon (second set)

- **File:** `chat/assets/icons2/fx2-forest360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Forest 360 button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen cut out in front of a misty fantasy forest with a waterfall and glowing mushrooms, a circular 360-degree arrow. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K38 · City 360 icon (second set)

- **File:** `chat/assets/icons2/fx2-city360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The City 360 button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen cut out on a rooftop in front of neon skyscrapers at night, a circular 360-degree arrow around the scene. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K39 · Snow 360 icon (second set)

- **File:** `chat/assets/icons2/fx2-snow360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Snow 360 button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen cut out in front of snowy mountain peaks and a wooden cabin, a circular 360-degree arrow. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K40 · Candy 360 icon (second set)

- **File:** `chat/assets/icons2/fx2-candy360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Candy 360 button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen cut out in front of a candy land with lollipop trees and a gingerbread house, a circular 360-degree arrow. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K41 · Volcano 360 icon (second set)

- **File:** `chat/assets/icons2/fx2-volcano360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Volcano 360 button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen cut out in front of an erupting volcano and rivers of glowing lava, a circular 360-degree arrow. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K42 · Blur icon (second set)

- **File:** `chat/assets/icons2/fx2-blurbg-v3.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Blur button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a crisp, sharply drawn teen in the foreground, and behind them a bedroom so heavily out of focus that nothing in it has an edge: only big soft round bokeh discs of warm and violet light and smeared colour shapes, like a phone's portrait mode turned all the way up. The contrast between the sharp person and the completely blurred room is the whole point of the icon; draw no sharp object anywhere behind them. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside the tile, no magenta. Output canvas 256 x 256.
```

### CH-K43 · Colour Pop icon (second set)

- **File:** `chat/assets/icons2/fx2-colorpop.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Colour Pop button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen in full vivid colour in front of a room that is entirely black and white. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K44 · Neon Aura icon (second set)

- **File:** `chat/assets/icons2/fx2-neonaura.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Neon Aura button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a dark silhouette of a teen outlined by a glowing neon pink and cyan aura on a black background. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K45 · Disco icon (second set)

- **File:** `chat/assets/icons2/fx2-disco.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Disco button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen lit by coloured disco beams from a mirror ball above, light spots on the face, dark room behind. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K46 · Code Rain icon (second set)

- **File:** `chat/assets/icons2/fx2-matrix.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Code Rain button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen with a green-tinted face in front of falling columns of green code characters on black. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K47 · Sunset icon (second set)

- **File:** `chat/assets/icons2/fx2-sunset.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Sunset button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a black silhouette of a teen's head and shoulders against a huge orange and pink sunset over the sea. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K48 · Time Trails icon (second set)

- **File:** `chat/assets/icons2/fx2-echo.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Time Trails button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen mid-move leaving a trail of four fading see-through copies, each tinted a different rainbow colour. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K49 · Delay Ghost icon (second set)

- **File:** `chat/assets/icons2/fx2-delayghost.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Delay Ghost button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen with a pale translucent ghost copy of themselves a step behind, copying their pose a moment late. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K50 · Time Warp icon (second set)

- **File:** `chat/assets/icons2/fx2-timewarp.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Time Warp button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen's face stretched and frozen above a glowing blue horizontal scan line moving down the picture. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K51 · Side Warp icon (second set)

- **File:** `chat/assets/icons2/fx2-timewarpside.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Side Warp button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen's face smeared sideways into a long streak left of a glowing blue vertical scan line. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K52 · Wobble Time icon (second set)

- **File:** `chat/assets/icons2/fx2-slitscan.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Wobble Time button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen's face sliced into horizontal bands, each band shifted in time so the face ripples like a wave. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K53 · Stop Motion icon (second set)

- **File:** `chat/assets/icons2/fx2-strobe.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Stop Motion button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: three frozen film frames of a teen in jerky poses side by side, like stop-motion animation on a film strip. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K54 · Clones icon (second set)

- **File:** `chat/assets/icons2/fx2-clones.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Clones button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: three identical copies of the same teen in different poses side by side in one room. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K55 · Motion Glow icon (second set)

- **File:** `chat/assets/icons2/fx2-motionglow.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Motion Glow button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen waving one hand, the hand leaving bright neon light-painting trails in the air. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K56 · Tiny Face icon (second set)

- **File:** `chat/assets/icons2/fx2-tinyface.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Tiny Face button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a normal-sized teen head with comically tiny eyes, nose and mouth squeezed together in the middle. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K57 · Chubby Cheeks icon (second set)

- **File:** `chat/assets/icons2/fx2-chubby.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Chubby Cheeks button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen's face with hugely puffed-out round cheeks, lips pressed together holding air. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K58 · Baby Face icon (second set)

- **File:** `chat/assets/icons2/fx2-babyface.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Baby Face button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen's face turned into a baby's: huge round eyes, a button nose, chubby cheeks and a tiny mouth. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K59 · Mirror Face icon (second set)

- **File:** `chat/assets/icons2/fx2-symmetry.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Mirror Face button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen's face split down the middle with one half mirrored onto the other, a thin glowing line down the centre. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K60 · Cyclops icon (second set)

- **File:** `chat/assets/icons2/fx2-cyclops.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Cyclops button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen's face with a single large eye in the middle of the forehead instead of two. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K61 · Big Mouth icon (second set)

- **File:** `chat/assets/icons2/fx2-bigmouth.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Big Mouth button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen's face with an enormous wide grinning mouth taking up the lower half of the face. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K62 · Fisheye icon (second set)

- **File:** `chat/assets/icons2/fx2-fisheye.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Fisheye button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen leaning close to the lens, nose and face bulging out through a round fisheye distortion. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K63 · Film Noir icon (second set)

- **File:** `chat/assets/icons2/fx2-noir.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Film Noir button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen in black and white with film grain and a dramatic slatted window shadow across the face. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K64 · VHS icon (second set)

- **File:** `chat/assets/icons2/fx2-vhs.png`
- **Size:** 256 x 256, transparent
- **Used for:** The VHS button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen's face on an old VHS tape picture with colour bleeding, tracking lines and a glitch band across the middle. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K65 · Pop Art icon (second set)

- **File:** `chat/assets/icons2/fx2-popart.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Pop Art button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: four copies of the same teen's face in a 2x2 grid, each in a different loud pop-art colour scheme. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K66 · Kaleidoscope icon (second set)

- **File:** `chat/assets/icons2/fx2-kaleidoscope.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Kaleidoscope button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen's face repeated into a symmetrical kaleidoscope star pattern in bright colours. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K67 · Snowfall icon (second set)

- **File:** `chat/assets/icons2/fx2-snow.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Snowfall button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen in a beanie with big snowflakes falling around them and a few settling on the hat. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K68 · Confetti icon (second set)

- **File:** `chat/assets/icons2/fx2-confetti.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Confetti button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a smiling teen with bursts of multicoloured confetti and streamers exploding around their head. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K69 · Make It Rain icon (second set)

- **File:** `chat/assets/icons2/fx2-moneyrain.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Make It Rain button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen with mouth open while green banknotes rain down and flutter around them. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K70 · Fireworks icon (second set)

- **File:** `chat/assets/icons2/fx2-fireworks.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Fireworks button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen with mouth open as a firework launches upward and bursts into a big colourful flower in the night sky behind. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K71 · Kid icon (second set)

- **File:** `chat/assets/icons2/fx2-kid.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Kid button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a split face: left half a teen, right half the same person as a young kid with a rounder face and bigger eyes. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K72 · Man icon (second set)

- **File:** `chat/assets/icons2/fx2-manface.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Man button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a split face: left half a teen, right half the same person as a grown man with a squarer jaw, heavier brows and stubble. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K73 · Woman icon (second set)

- **File:** `chat/assets/icons2/fx2-womanface.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Woman button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a split face: left half a teen, right half the same person with winged eyeliner, fuller lips and a slimmer jaw. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K74 · Thinner icon (second set)

- **File:** `chat/assets/icons2/fx2-thinner.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Thinner button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen's head and shoulders squeezed narrow from both sides, two arrows pressing inward. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K75 · Fatter icon (second set)

- **File:** `chat/assets/icons2/fx2-fatter.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Fatter button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen's head and shoulders stretched wide sideways, two arrows pulling outward. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K76 · Hoops icon (second set)

- **File:** `chat/assets/icons2/game2-hoops-v2.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Hoops card in the game picker, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a hand flicking a basketball up towards a hoop with a glass backboard, a faint ghost ball in another colour following. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Edit: Remove the magenta exterior background. Keep everything inside the dark rounded-square basketball icon exactly unchanged. Outside the rounded tile must be completely transparent alpha 0, with clean edges, no exterior pink glow. Preserve the basketball, ghost ball, flicking hand and hoop.
```

### CH-K77 · Flappy Face icon (second set)

- **File:** `chat/assets/icons2/game2-flappy.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Flappy Face card in the game picker, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a person's face as a round bird with small white wings, flapping through a gap between two tall pillars. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K78 · Air Hockey icon (second set)

- **File:** `chat/assets/icons2/game2-airhockey.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Air Hockey card in the game picker, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a top-down air hockey table, a paddle striking the puck with speed lines towards the goal. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K79 · Connect Four icon (second set)

- **File:** `chat/assets/icons2/game2-connect4.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Connect Four card in the game picker, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a blue Connect Four grid with red and yellow discs, the last disc dropping in to make four in a row. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K80 · Quick Draw icon (second set)

- **File:** `chat/assets/icons2/game2-quickdraw.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Quick Draw card in the game picker, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: two cowboy silhouettes facing off on a dusty street at sunset, one already drawing. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K81 · Staring Contest icon (second set)

- **File:** `chat/assets/icons2/game2-stare.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Staring Contest card in the game picker, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: two faces nose to nose glaring, wide-open eyes, a fly buzzing between them. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Genuinely transparent exterior, not magenta.
```

### CH-K82 · Copy Cat icon (second set)

- **File:** `chat/assets/icons2/game2-copycat.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Copy Cat card in the game picker, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: two faces side by side pulling the same silly expression, tongue out and one eye shut. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Genuinely transparent exterior, not magenta.
```

### CH-K83 · Rock Paper Scissors icon (second set)

- **File:** `chat/assets/icons2/game2-rps.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Rock Paper Scissors card in the game picker, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: three hands thrown at once in a circle: a fist, a flat hand and a V for scissors. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Genuinely transparent exterior, not magenta.
```

### CH-K84 · Doodle Guess icon (second set)

- **File:** `chat/assets/icons2/game2-doodle.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Doodle Guess card in the game picker, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a hand-drawn marker sketch of a cat on a whiteboard with a speech bubble guessing with a question mark. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Genuinely transparent exterior, not magenta.
```

### CH-K85 · Memory Match icon (second set)

- **File:** `chat/assets/icons2/game2-memory.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Memory Match card in the game picker, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a grid of face-down cards with two flipped face-up showing the same effect picture. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Genuinely transparent exterior, not magenta.
```

### CH-K86 · Mini Golf icon (second set)

- **File:** `chat/assets/icons2/game2-minigolf.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Mini Golf card in the game picker, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a golf ball rolling across bright turf towards a flag in the hole, a dashed aiming line behind it. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Genuinely transparent exterior, not magenta.
```

### CH-K87 · Bowling icon (second set)

- **File:** `chat/assets/icons2/game2-bowling.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Bowling card in the game picker, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a bowling ball curving down a lane and smashing into white pins mid-strike. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Genuinely transparent exterior, not magenta.
```

### CH-K88 · Beach Bump icon (second set)

- **File:** `chat/assets/icons2/game2-beachbump.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Beach Bump card in the game picker, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a beach ball bouncing off a person's forehead as they nod, motion lines and a sunny beach behind. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Genuinely transparent exterior, not magenta.
```

### CH-K89 · Burger Stack icon (second set)

- **File:** `chat/assets/icons2/game2-burger.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Burger Stack card in the game picker, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a tall wobbly burger tower being caught on a bun, a lettuce leaf falling in and a boot to dodge. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Genuinely transparent exterior, not magenta.
```

### CH-K90 · Asteroid Dodge icon (second set)

- **File:** `chat/assets/icons2/game2-asteroids.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Asteroid Dodge card in the game picker, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a small rocket weaving between tumbling asteroids in space, a gold star to grab. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Genuinely transparent exterior, not magenta.
```

### CH-K91 · Don't Smile icon (second set)

- **File:** `chat/assets/icons2/game2-dontsmile.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Don't Smile card in the game picker, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a person with a dead-straight face, lips pressed tight, trying not to laugh, a bead of sweat. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Genuinely transparent exterior, not magenta.
```

### CH-K92 · Snake icon (second set)

- **File:** `chat/assets/icons2/game2-snake.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Snake card in the game picker, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: two neon snakes of different colours racing across a dark grid towards a glowing apple. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Genuinely transparent exterior, not magenta.
```

### CH-K93 · Battleship icon (second set)

- **File:** `chat/assets/icons2/game2-battleship.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Battleship card in the game picker, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a top-down grid of sea with a grey battleship and a red explosion hit marker on it. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Genuinely transparent exterior, not magenta.
```

### CH-K94 · Trivia icon (second set)

- **File:** `chat/assets/icons2/game2-trivia.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Trivia card in the game picker, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a quiz-show buzzer being slammed with four coloured answer panels behind it. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Genuinely transparent exterior, not magenta.
```

### CH-K95 · Word Blitz icon (second set)

- **File:** `chat/assets/icons2/game2-wordblitz.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Word Blitz card in the game picker, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Rendering requirement: this must be visibly DRAWN 2D vector-style editorial illustration with large clean colour planes, crisp shapes, simplified hair, smooth stylised skin and subtle neon edge glow. Absolutely no photographs, skin pores, realistic individual hair strands, photographic textures or 3D renders. Natural older-teen proportions except the specific requested distortion. No added video-camera glyphs, buttons or app controls. Keep the effect clear at 48 pixels. Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a 4x4 grid of letter tiles with a glowing path swiped through them spelling a word. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Genuinely transparent exterior, not magenta.
```
