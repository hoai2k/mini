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

540 delivered, 9 requested, 549 in total.

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

### CH-U04 · iOS app icon

- **File:** `chat/assets/ui/ios-app-icon.png`
- **Size:** 1024 x 1024, opaque
- **Used for:** The Games Chat app icon on iPhone and iPad home screens and in TestFlight / the App Store.
- **Stand-in until delivered:** The 512 px web icon scaled up onto an aqua square.
- **Status:** delivered

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. The Games Chat app icon: a chunky game controller inside a rounded speech bubble, pink and yellow, glossy with a thick dark-purple outline, centred on a full-bleed bright aqua to violet gradient background that fills the whole square edge to edge. Square with NO rounded corners and NO transparency (iOS rounds the corners itself); keep the bubble inside the middle 80% so nothing important is cut off. Bold and simple so it reads at 40 px.
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

### CH-G25 · Go Fish card: Anomalocaris

- **File:** `chat/assets/games/gofish-anomalocaris.png`
- **Size:** 512 x 512, transparent
- **Used for:** Go Fish: the picture on the Anomalocaris card (Cambrian).
- **Stand-in until delivered:** A canvas drawing of the creature.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Anomalocaris, the big Cambrian hunter, in side view swimming: a long flat segmented body in warm red and coral, a fan of overlapping swimming flaps down each side, a tail fan of three pairs of blades, big stalked eyes on top of the head, and two curled spiky grabbing arms in front of a round mouth. A fun, friendly, colourful take for a children's card game, scientifically recognisable, one creature only, centred and filling the frame, no background scenery. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G26 · Go Fish card: Opabinia

- **File:** `chat/assets/games/gofish-opabinia.png`
- **Size:** 512 x 512, transparent
- **Used for:** Go Fish: the picture on the Opabinia card (Cambrian).
- **Stand-in until delivered:** A canvas drawing of the creature.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Opabinia in side view: a small soft segmented body in bright blues, a row of swimming flaps along each side, a fan tail, FIVE mushroom-like stalked eyes on its head, and one long flexible nozzle reaching forward with a little grabbing claw at its tip. A fun, friendly, colourful take for a children's card game, scientifically recognisable, one creature only, centred and filling the frame, no background scenery. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G27 · Go Fish card: Hallucigenia

- **File:** `chat/assets/games/gofish-hallucigenia.png`
- **Size:** 512 x 512, transparent
- **Used for:** Go Fish: the picture on the Hallucigenia card (Cambrian).
- **Stand-in until delivered:** A canvas drawing of the creature.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Hallucigenia walking on the sea floor in side view: a thin tube-shaped worm body in orange, seven pairs of long stilt-like tentacle legs underneath, two rows of tall pointed spines along its back, and a small round head with tiny eyes. A fun, friendly, colourful take for a children's card game, scientifically recognisable, one creature only, centred and filling the frame, no background scenery. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G28 · Go Fish card: Pikaia

- **File:** `chat/assets/games/gofish-pikaia.png`
- **Size:** 512 x 512, transparent
- **Used for:** Go Fish: the picture on the Pikaia card (Cambrian).
- **Stand-in until delivered:** A canvas drawing of the creature.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Pikaia, a small early chordate, swimming in side view: a slim leaf-shaped ribbon body in mint green with faint zigzag muscle bands, a tiny head with two little tentacles, and a soft fin along the tail; cute and wriggly. A fun, friendly, colourful take for a children's card game, scientifically recognisable, one creature only, centred and filling the frame, no background scenery. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G29 · Go Fish card: Burgessomedusa

- **File:** `chat/assets/games/gofish-burgessomedusa.png`
- **Size:** 512 x 512, transparent
- **Used for:** Go Fish: the picture on the Burgessomedusa card (Cambrian).
- **Stand-in until delivered:** A canvas drawing of the creature.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Burgessomedusa, an ancient jellyfish: a tall translucent pink bell with a gentle glow, about ninety short fine tentacles trailing from the rim like a fringe, swimming upwards. A fun, friendly, colourful take for a children's card game, scientifically recognisable, one creature only, centred and filling the frame, no background scenery. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G30 · Go Fish card: Trilobite

- **File:** `chat/assets/games/gofish-trilobite.png`
- **Size:** 512 x 512, transparent
- **Used for:** Go Fish: the picture on the Trilobite card (Cambrian to Permian).
- **Stand-in until delivered:** A canvas drawing of the creature.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A trilobite seen from above at a slight angle: an oval armoured body split into three lobes lengthwise and many segments across, a half-moon head shield with two crescent compound eyes, short spines at the corners, in ochre and warm brown with glossy plates. A fun, friendly, colourful take for a children's card game, scientifically recognisable, one creature only, centred and filling the frame, no background scenery. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G31 · Go Fish card: Nautilus

- **File:** `chat/assets/games/gofish-nautilus.png`
- **Size:** 512 x 512, transparent
- **Used for:** Go Fish: the picture on the Nautilus card (living fossil).
- **Stand-in until delivered:** A canvas drawing of the creature.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A nautilus swimming in side view: a smooth coiled shell in cream with bold red-brown tiger stripes, a soft hood, one big round eye and a bunch of many short tentacles below. A fun, friendly, colourful take for a children's card game, scientifically recognisable, one creature only, centred and filling the frame, no background scenery. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G32 · Go Fish card: Dunkleosteus

- **File:** `chat/assets/games/gofish-dunkleosteus.png`
- **Size:** 512 x 512, transparent
- **Used for:** Go Fish: the picture on the Dunkleosteus card (Devonian).
- **Stand-in until delivered:** A canvas drawing of the creature.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Dunkleosteus, the armoured Devonian giant fish, in side view with its jaws wide open: a heavy head and shoulder covered in slate-blue bony armour plates, sharp bony blades instead of teeth, a small round eye in the armour, and a sleek shark-like tail behind. A fun, friendly, colourful take for a children's card game, scientifically recognisable, one creature only, centred and filling the frame, no background scenery. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G33 · Go Fish card: Tiktaalik

- **File:** `chat/assets/games/gofish-tiktaalik.png`
- **Size:** 512 x 512, transparent
- **Used for:** Go Fish: the picture on the Tiktaalik card (Devonian).
- **Stand-in until delivered:** A canvas drawing of the creature.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Tiktaalik in side view propping itself up in shallow water: a flat crocodile-like head with eyes on top, a real neck, scaly lime-green body with darker spots, and sturdy fleshy front fins pushing up like arms. A fun, friendly, colourful take for a children's card game, scientifically recognisable, one creature only, centred and filling the frame, no background scenery. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G34 · Go Fish card: Helicoprion

- **File:** `chat/assets/games/gofish-helicoprion.png`
- **Size:** 512 x 512, transparent
- **Used for:** Go Fish: the picture on the Helicoprion card (Permian).
- **Stand-in until delivered:** A canvas drawing of the creature.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Helicoprion, the buzz-saw shark, in side view: a sleek teal shark-like fish whose lower jaw holds a coiled spiral whorl of triangular teeth, like a round saw blade, clearly visible. A fun, friendly, colourful take for a children's card game, scientifically recognisable, one creature only, centred and filling the frame, no background scenery. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G35 · Go Fish card: Ichthyosaur

- **File:** `chat/assets/games/gofish-ichthyosaur.png`
- **Size:** 512 x 512, transparent
- **Used for:** Go Fish: the picture on the Ichthyosaur card (Triassic to Cretaceous).
- **Stand-in until delivered:** A canvas drawing of the creature.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. An ichthyosaur leaping in side view: a dolphin-shaped sea reptile in golden yellow with a long toothy snout, a HUGE round eye with a bony ring, a tall half-moon tail fin and a back fin. A fun, friendly, colourful take for a children's card game, scientifically recognisable, one creature only, centred and filling the frame, no background scenery. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G36 · Go Fish card: Plesiosaur

- **File:** `chat/assets/games/gofish-plesiosaur.png`
- **Size:** 512 x 512, transparent
- **Used for:** Go Fish: the picture on the Plesiosaur card (Jurassic).
- **Stand-in until delivered:** A canvas drawing of the creature.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A plesiosaur swimming in side view: a round body in purple, a very long curving neck with a small smiling toothy head, four big paddle flippers and a short tail. A fun, friendly, colourful take for a children's card game, scientifically recognisable, one creature only, centred and filling the frame, no background scenery. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G37 · Go Fish card: Mosasaur

- **File:** `chat/assets/games/gofish-mosasaur.png`
- **Size:** 512 x 512, transparent
- **Used for:** Go Fish: the picture on the Mosasaur card (Cretaceous).
- **Stand-in until delivered:** A canvas drawing of the creature.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A mosasaur in side view: a huge dark green sea lizard with a long crocodile-like toothy head, a long body with paddle flippers, and a shark-like tail fin bending down. A fun, friendly, colourful take for a children's card game, scientifically recognisable, one creature only, centred and filling the frame, no background scenery. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G38 · Go Fish card back

- **File:** `chat/assets/games/gofish-back.png`
- **Size:** 512 x 704, transparent
- **Used for:** Go Fish: the face-down cards in the pond and in other players' hands.
- **Stand-in until delivered:** A CSS wave pattern.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. The back of a playing card with rounded corners: deep turquoise water with gentle wave bands, a few ammonite and trilobite silhouettes in a lighter tint, a small fishing hook emblem in the middle, symmetrical. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G39 · Go Fish pond

- **File:** `chat/assets/games/gofish-pond.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** Go Fish: the pond players cast into, seen from above, with fish shadows drawn on top by the game.
- **Stand-in until delivered:** A canvas-drawn pond.
- **Status:** delivered

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A calm pond seen straight from above: clear teal-green water getting deeper towards the middle, soft caustic light ripples, a few lily pads and reeds around the edges and a little wooden jetty poking in from the bottom edge. No fish, no animals, no people.
```

### CH-G40 · Bacon

- **File:** `chat/assets/games/burger-bacon.png`
- **Size:** 512 x 192, transparent
- **Used for:** Burger Stack: a falling topping to catch, then a layer of the burger.
- **Stand-in until delivered:** A drawn shape.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Side view of two crispy wavy strips of bacon side by side, the same flat burger-layer shape and width as the other toppings, so it stacks. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G41 · Ketchup

- **File:** `chat/assets/games/burger-ketchup.png`
- **Size:** 512 x 192, transparent
- **Used for:** Burger Stack: a falling topping to catch, then a layer of the burger.
- **Stand-in until delivered:** A drawn shape.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Side view of a glossy red zigzag squiggle of ketchup lying flat, like a sauce layer, the same flat burger-layer shape and width as the other toppings, so it stacks. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G42 · Pickles

- **File:** `chat/assets/games/burger-pickles.png`
- **Size:** 512 x 192, transparent
- **Used for:** Burger Stack: a falling topping to catch, then a layer of the burger.
- **Stand-in until delivered:** A drawn shape.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Side view of four round green pickle slices in a row, slightly overlapping, the same flat burger-layer shape and width as the other toppings, so it stacks. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G43 · Onion

- **File:** `chat/assets/games/burger-onion.png`
- **Size:** 512 x 192, transparent
- **Used for:** Burger Stack: a falling topping to catch, then a layer of the burger.
- **Stand-in until delivered:** A drawn shape.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Side view of three white-and-purple onion rings in a row, slightly overlapping, the same flat burger-layer shape and width as the other toppings, so it stacks. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G44 · Fried egg

- **File:** `chat/assets/games/burger-egg.png`
- **Size:** 512 x 192, transparent
- **Used for:** Burger Stack: a falling topping to catch, then a layer of the burger.
- **Stand-in until delivered:** A drawn shape.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Side view of a fried egg with a round yellow yolk and wavy white edges, the same flat burger-layer shape and width as the other toppings, so it stacks. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G46 · Baseball

- **File:** `chat/assets/games/baseball-ball.png`
- **Size:** 256 x 256, transparent
- **Used for:** Baseball: the ball.
- **Stand-in until delivered:** A drawn ball.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A white baseball with red stitching, slightly tilted. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G50 · Whack field

- **File:** `chat/assets/games/whack-field.webp`
- **Size:** 1600 x 1200, opaque
- **Used for:** Mob Whack: the field the mobs pop up in.
- **Stand-in until delivered:** A canvas-drawn field.
- **Status:** delivered

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. Blocky voxel game art in the style of Minecraft: everything built from cubes, chunky 16-pixel textures on each face, flat lighting with simple shading per face. A grassy blocky meadow seen slightly from above at dusk: grass blocks with dirt sides, a few blocky trees and flowers at the edges, and a 3 by 3 grid of nine round dark holes dug into the grass, evenly spaced across the middle of the picture. No creatures.
Exactly NINE dark ROUND oval holes, arranged in exactly THREE rows of THREE. No other holes, pits, cavities, trenches or openings anywhere including foreground and edges. Camera more overhead, small oval holes all same size, all fully contained inside central grassy meadow. Preserve voxel style landscape, trees and flowers only at edges.
```

### CH-G51 · Zombie

- **File:** `chat/assets/games/whack-zombie.png`
- **Size:** 512 x 512, transparent
- **Used for:** Mob Whack: zombie popping up out of a hole.
- **Stand-in until delivered:** A drawn blocky figure.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Blocky voxel game art in the style of Minecraft: everything built from cubes, chunky 16-pixel textures on each face, flat lighting with simple shading per face. a blocky zombie: green square head with dark hollow eyes, cyan shirt, arms stretched forward, front view, from the waist up as if rising out of a hole (the bottom edge is cut off straight). Centred. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G52 · Creeper

- **File:** `chat/assets/games/whack-creeper.png`
- **Size:** 512 x 512, transparent
- **Used for:** Mob Whack: creeper popping up out of a hole.
- **Stand-in until delivered:** A drawn blocky figure.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Blocky voxel game art in the style of Minecraft: everything built from cubes, chunky 16-pixel textures on each face, flat lighting with simple shading per face. a blocky creeper: tall green mottled body with four short legs and the famous sad dark face, front view, from the waist up as if rising out of a hole (the bottom edge is cut off straight). Centred. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G53 · Creeper about to explode

- **File:** `chat/assets/games/whack-creeper-flash.png`
- **Size:** 512 x 512, transparent
- **Used for:** Mob Whack: creeper about to explode popping up out of a hole.
- **Stand-in until delivered:** A drawn blocky figure.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Blocky voxel game art in the style of Minecraft: everything built from cubes, chunky 16-pixel textures on each face, flat lighting with simple shading per face. the same blocky creeper, swollen and flashing white, about to explode, front view, from the waist up as if rising out of a hole (the bottom edge is cut off straight). Centred. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G54 · Villager

- **File:** `chat/assets/games/whack-villager.png`
- **Size:** 512 x 512, transparent
- **Used for:** Mob Whack: villager popping up out of a hole.
- **Stand-in until delivered:** A drawn blocky figure.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Blocky voxel game art in the style of Minecraft: everything built from cubes, chunky 16-pixel textures on each face, flat lighting with simple shading per face. a blocky villager: big nose, single unibrow, brown robe with hands folded in the sleeves, looking worried, front view, from the waist up as if rising out of a hole (the bottom edge is cut off straight). Centred. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G55 · Enderman

- **File:** `chat/assets/games/whack-enderman.png`
- **Size:** 512 x 512, transparent
- **Used for:** Mob Whack: enderman popping up out of a hole.
- **Stand-in until delivered:** A drawn blocky figure.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Blocky voxel game art in the style of Minecraft: everything built from cubes, chunky 16-pixel textures on each face, flat lighting with simple shading per face. a blocky enderman: very tall thin black body, long arms, glowing purple eyes, front view, from the waist up as if rising out of a hole (the bottom edge is cut off straight). Centred. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G56 · Explosion

- **File:** `chat/assets/games/whack-explosion.png`
- **Size:** 512 x 512, transparent
- **Used for:** Mob Whack: a creeper going off.
- **Stand-in until delivered:** Drawn squares.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Blocky voxel game art in the style of Minecraft: everything built from cubes, chunky 16-pixel textures on each face, flat lighting with simple shading per face. A chunky pixel explosion: a burst of white, yellow and orange cube particles and grey smoke puffs. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G57 · Teleport sparkles

- **File:** `chat/assets/games/whack-teleport.png`
- **Size:** 256 x 256, transparent
- **Used for:** Mob Whack: where an enderman vanishes and reappears.
- **Stand-in until delivered:** Drawn squares.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Blocky voxel game art in the style of Minecraft: everything built from cubes, chunky 16-pixel textures on each face, flat lighting with simple shading per face. A cloud of small purple and magenta square particles, swirling. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G58 · Hammer

- **File:** `chat/assets/games/whack-hammer.png`
- **Size:** 512 x 512, transparent
- **Used for:** Mob Whack: the hammer that follows your finger and swings.
- **Stand-in until delivered:** A drawn hammer.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Blocky voxel game art in the style of Minecraft: everything built from cubes, chunky 16-pixel textures on each face, flat lighting with simple shading per face. A blocky iron hammer (pixel-art tool) held diagonally, handle at the bottom right, head at the top left. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G59 · Kart from behind

- **File:** `chat/assets/games/kart-back.png`
- **Size:** 512 x 512, transparent
- **Used for:** Kart Dash: every player's kart (the game tints it in their colour and puts their face in the seat).
- **Stand-in until delivered:** A drawn kart.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Bright glossy cartoon racing-game art, chunky shapes, saturated colours. A go-kart seen straight from behind, driving away: chunky white body panels (so the game can tint them), black tyres, exhaust pipes, a big rear spoiler, and an EMPTY round seat with no driver (the game draws the player's face there). Low and wide, filling the frame. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G60 · Kart turning left

- **File:** `chat/assets/games/kart-left.png`
- **Size:** 512 x 512, transparent
- **Used for:** Kart Dash: every player's kart (the game tints it in their colour and puts their face in the seat).
- **Stand-in until delivered:** A drawn kart.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Bright glossy cartoon racing-game art, chunky shapes, saturated colours. A go-kart seen from behind and slightly to the side, leaning into a left turn, front wheels turned left: chunky white body panels (so the game can tint them), black tyres, exhaust pipes, a big rear spoiler, and an EMPTY round seat with no driver (the game draws the player's face there). Low and wide, filling the frame. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G61 · Kart turning right

- **File:** `chat/assets/games/kart-right.png`
- **Size:** 512 x 512, transparent
- **Used for:** Kart Dash: every player's kart (the game tints it in their colour and puts their face in the seat).
- **Stand-in until delivered:** A drawn kart.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Bright glossy cartoon racing-game art, chunky shapes, saturated colours. A go-kart seen from behind and slightly to the side, leaning into a right turn, front wheels turned right: chunky white body panels (so the game can tint them), black tyres, exhaust pipes, a big rear spoiler, and an EMPTY round seat with no driver (the game draws the player's face there). Low and wide, filling the frame. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G62 · Sky and hills

- **File:** `chat/assets/games/kart-sky.webp`
- **Size:** 2048 x 512, opaque
- **Used for:** Kart Dash: the horizon behind the track; scrolls sideways as you turn.
- **Stand-in until delivered:** A drawn gradient.
- **Status:** delivered

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. Bright glossy cartoon racing-game art, chunky shapes, saturated colours. A wide panorama of a bright blue sky with puffy clouds over rolling green hills and a few distant mountains; the bottom edge is the horizon line in flat green. Tiles seamlessly left to right.
```

### CH-G63 · Grass ground

- **File:** `chat/assets/games/kart-grass.webp`
- **Size:** 512 x 512, opaque
- **Used for:** Kart Dash: the ground beside the track, seen from above.
- **Stand-in until delivered:** A green fill.
- **Status:** delivered

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A seamlessly tiling top-down texture of short bright cartoon grass with a few tiny flowers. Flat, no shadows.
```

### CH-G64 · Road surface

- **File:** `chat/assets/games/kart-road.webp`
- **Size:** 512 x 512, opaque
- **Used for:** Kart Dash: the track surface, seen from above.
- **Stand-in until delivered:** A grey fill.
- **Status:** delivered

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A seamlessly tiling top-down texture of smooth grey cartoon asphalt with subtle speckles. Flat, no lines.
```

### CH-G65 · Item box

- **File:** `chat/assets/games/kart-itembox.png`
- **Size:** 256 x 256, transparent
- **Used for:** Kart Dash: item box.
- **Stand-in until delivered:** A drawn shape.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Bright glossy cartoon racing-game art, chunky shapes, saturated colours. a floating translucent rainbow cube with a big white question mark on its faces, glowing. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G66 · Boost rocket

- **File:** `chat/assets/games/kart-boost.png`
- **Size:** 256 x 256, transparent
- **Used for:** Kart Dash: boost rocket.
- **Stand-in until delivered:** A drawn shape.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Bright glossy cartoon racing-game art, chunky shapes, saturated colours. a small red and yellow rocket booster with flames, power-up icon. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G67 · Banana peel

- **File:** `chat/assets/games/kart-banana.png`
- **Size:** 256 x 256, transparent
- **Used for:** Kart Dash: banana peel.
- **Stand-in until delivered:** A drawn shape.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Bright glossy cartoon racing-game art, chunky shapes, saturated colours. a slippery yellow banana peel lying on the ground. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G68 · Bouncing bomb

- **File:** `chat/assets/games/kart-bomb.png`
- **Size:** 256 x 256, transparent
- **Used for:** Kart Dash: bouncing bomb.
- **Stand-in until delivered:** A drawn shape.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Bright glossy cartoon racing-game art, chunky shapes, saturated colours. a round shiny black cartoon bomb with a lit fuse and little springy feet. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
Production canvas: 256 x 256. Single standalone harmless cartoon videogame pickup sprite. Actual transparent alpha, clean edges, no cast shadow behind subject.
```

### CH-G69 · Rainbow star

- **File:** `chat/assets/games/kart-star.png`
- **Size:** 256 x 256, transparent
- **Used for:** Kart Dash: rainbow star.
- **Stand-in until delivered:** A drawn shape.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Bright glossy cartoon racing-game art, chunky shapes, saturated colours. a sparkling five-pointed star glowing in rainbow colours, power-up icon. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
Production canvas: 256 x 256. Single standalone harmless cartoon videogame pickup sprite. Actual transparent alpha, clean edges, no cast shadow behind subject.
```

### CH-G70 · Flying kart parts

- **File:** `chat/assets/games/kart-parts.png`
- **Size:** 768 x 512, transparent
- **Used for:** Kart Dash: flying kart parts.
- **Stand-in until delivered:** A drawn shape.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Bright glossy cartoon racing-game art, chunky shapes, saturated colours. a sprite sheet of six separate kart pieces flying apart, arranged in a 3 by 2 grid with space between: a wheel, a bolt, a bent white body panel, a spoiler, a spring and an exhaust pipe. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
Production canvas: 768 x 512. Single standalone harmless cartoon videogame pickup sprite. Actual transparent alpha, clean edges, no cast shadow behind subject.
```

### CH-G71 · Tyre stack

- **File:** `chat/assets/games/kart-tyres.png`
- **Size:** 256 x 256, transparent
- **Used for:** Kart Dash: tyre stack.
- **Stand-in until delivered:** A drawn shape.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Bright glossy cartoon racing-game art, chunky shapes, saturated colours. a stack of three black tyres with red and white stripes, a trackside barrier. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
Production canvas: 256 x 256. Single standalone harmless cartoon videogame pickup sprite. Actual transparent alpha, clean edges, no cast shadow behind subject.
```

### CH-G72 · Trackside tree

- **File:** `chat/assets/games/kart-tree.png`
- **Size:** 256 x 384, transparent
- **Used for:** Kart Dash: trackside tree.
- **Stand-in until delivered:** A drawn shape.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Bright glossy cartoon racing-game art, chunky shapes, saturated colours. a round cartoon tree with a short brown trunk. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
Production canvas: 256 x 384. Single standalone harmless cartoon videogame pickup sprite. Actual transparent alpha, clean edges, no cast shadow behind subject.
```

### CH-G73 · Block tile

- **File:** `chat/assets/games/blocks-tile.webp`
- **Size:** 128 x 128, opaque
- **Used for:** Block Drop: one square cell of a falling piece (the game tints it per piece colour).
- **Stand-in until delivered:** A drawn bevelled square.
- **Status:** delivered

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. Bright glossy puzzle-game art, clean shapes, soft highlights. A single square block seen straight on, filling the frame: a WHITE glossy jelly-like cube face with a bevelled rim, a bright highlight in the top left and a soft shadow at the bottom right, so the game can tint it any colour. No outline outside the square.
STRICT CANVAS: entirely opaque white square face, no rounded outer corners, no black corners, no transparent margin. Straight edges flush against ALL four image boundaries, square bevel shading contained INSIDE the square. Only white and neutral light grey tones; no background.
```

### CH-G74 · Block Drop backdrop

- **File:** `chat/assets/games/blocks-bg.webp`
- **Size:** 1080 x 1920, opaque
- **Used for:** Block Drop: behind the well (an upright phone screen).
- **Stand-in until delivered:** A drawn gradient.
- **Status:** delivered

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. Bright glossy puzzle-game art, clean shapes, soft highlights. A calm deep-purple and indigo night sky with soft glowing bokeh dots and faint geometric outlines of falling square blocks, darker in the middle where the playing well sits. No text.
STRICT BACKGROUND ONLY: simple abstract quiet deep-purple and indigo gradient night sky, small soft bokeh dots, faint outline squares mainly along edges. Dark nearly empty central vertical region. No people, animals, characters, faces, cats, rabbits, moon character, game board, well, grid, UI, buildings, foreground pieces or solid colourful blocks. Portrait 1080x1920.
```

### CH-G75 · Runner sprite sheet

- **File:** `chat/assets/games/temple-runner.png`
- **Size:** 1536 x 512, transparent
- **Used for:** Temple Dash: every player's runner seen from behind (the game puts their face on the head and tints the shirt).
- **Stand-in until delivered:** A drawn runner.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Bright cartoon adventure-game art, chunky shapes, warm jungle colours, soft cel shading. A sprite sheet of six frames side by side, each 256 wide by 512 tall, of the same explorer seen from BEHIND, running away from the camera: frames 1-4 a running cycle, frame 5 jumping with knees up, frame 6 sliding low on one hip. WHITE shirt (so the game can tint it), khaki shorts, brown boots, a backpack. The head is a plain round skin-coloured shape with no hair, hat or features (the game draws the player's face there). Feet at the same baseline in every frame. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
Production canvas aspect ratio 1536:512, intended export 1536 x 512. Genuine transparent alpha, clean edges, no exterior glow or shadow. Exactly SIX equal-width 256x512 cells across a single 1536x512 row; each figure fully contained in its cell, no overlap; all heads plain bald skin coloured from BEHIND. Frames 1-4 running with alternating legs, 5 jump, 6 slide. No dividers, labels or guides.
```

### CH-G76 · Stone path

- **File:** `chat/assets/games/temple-path.webp`
- **Size:** 512 x 1024, opaque
- **Used for:** Temple Dash: the ancient stone walkway you run along, seen from above.
- **Stand-in until delivered:** A drawn fill.
- **Status:** delivered

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A seamlessly tiling top-down texture of a weathered temple walkway: big sandy-grey flagstones in three lanes with moss in the cracks. Tiles top to bottom. Flat, even lighting.
Production canvas aspect ratio 512:1024, intended export 512 x 1024. Opaque full-bleed art.
```

### CH-G77 · Temple wall

- **File:** `chat/assets/games/temple-wall.webp`
- **Size:** 512 x 512, opaque
- **Used for:** Temple Dash: the carved stone edge and walls beside the path.
- **Stand-in until delivered:** A drawn fill.
- **Status:** delivered

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. Bright cartoon adventure-game art, chunky shapes, warm jungle colours, soft cel shading. A seamlessly tiling texture of mossy carved temple stone blocks with vines and small carved glyphs. Tiles in both directions. Flat, even lighting.
Production canvas aspect ratio 512:512, intended export 512 x 512. Opaque full-bleed art.
```

### CH-G78 · Jungle horizon

- **File:** `chat/assets/games/temple-sky.webp`
- **Size:** 2048 x 512, opaque
- **Used for:** Temple Dash: the horizon ahead; scrolls sideways when the path turns.
- **Stand-in until delivered:** A drawn gradient.
- **Status:** delivered

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. Bright cartoon adventure-game art, chunky shapes, warm jungle colours, soft cel shading. A wide panorama of a golden sunset sky over misty jungle treetops with distant temple pyramids and waterfalls; the bottom edge is dark green treetops. Tiles seamlessly left to right.
Production canvas aspect ratio 2048:512, intended export 2048 x 512. Opaque full-bleed art.
```

### CH-G79 · Tree root

- **File:** `chat/assets/games/temple-root.png`
- **Size:** 512 x 256, transparent
- **Used for:** Temple Dash: tree root.
- **Stand-in until delivered:** A drawn shape.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Bright cartoon adventure-game art, chunky shapes, warm jungle colours, soft cel shading. a thick gnarled tree root arching across the stone path, low enough to jump over, seen from in front. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
STRICT ISOLATED OBSTACLE: only ONE long thick brown gnarled root lying horizontally at ankle height. Slight shallow upward hump at its middle, not a doorway or tall arch. No ground, paving, plants, rocks, foliage, path or backdrop. Game obstacle the runner jumps OVER. Transparent background. Wide 512x256.
```

### CH-G81 · Fire trap

- **File:** `chat/assets/games/temple-fire.png`
- **Size:** 256 x 256, transparent
- **Used for:** Temple Dash: fire trap.
- **Stand-in until delivered:** A drawn shape.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Bright cartoon adventure-game art, chunky shapes, warm jungle colours, soft cel shading. a row of carved stone fire vents with tall orange flames, spanning one lane, seen from in front. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
Production canvas aspect ratio 256:256, intended export 256 x 256. Genuine transparent alpha, clean edges, no exterior glow or shadow.
```

### CH-G82 · Gold coin

- **File:** `chat/assets/games/temple-coin.png`
- **Size:** 128 x 128, transparent
- **Used for:** Temple Dash: gold coin.
- **Stand-in until delivered:** A drawn shape.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Bright cartoon adventure-game art, chunky shapes, warm jungle colours, soft cel shading. a shiny gold temple coin with a carved sun on it, seen straight on. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
Production canvas aspect ratio 128:128, intended export 128 x 128. Genuine transparent alpha, clean edges, no exterior glow or shadow.
```

### CH-G83 · Chasing monkeys

- **File:** `chat/assets/games/temple-monkeys.png`
- **Size:** 1024 x 512, transparent
- **Used for:** Temple Dash: chasing monkeys.
- **Stand-in until delivered:** A drawn shape.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Bright cartoon adventure-game art, chunky shapes, warm jungle colours, soft cel shading. three mischievous cartoon temple monkeys with glowing eyes running towards the camera, side by side, filling the frame. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
Production canvas aspect ratio 1024:512, intended export 1024 x 512. Genuine transparent alpha, clean edges, no exterior glow or shadow.
```

### CH-G84 · Low beam (slide under)

- **File:** `chat/assets/games/temple-beam.png`
- **Size:** 1024 x 512, transparent
- **Used for:** Temple Dash: the obstacle you slide under. It spans the whole walkway, all three lanes, so the only way past is to slide (it replaces the open archway, which looked tall enough to run through).
- **Stand-in until delivered:** A drawn beam.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Bright cartoon adventure-game art, chunky shapes, warm jungle colours, soft cel shading. Seen straight from the front: one massive horizontal carved stone beam lying across the FULL width of the image, thick and heavy, with carved glyphs and moss on top and a few short vines hanging from its underside. The beam's top edge is about 20% down from the top of the image and its flat underside about 62% down. Below the beam the image is EMPTY (transparent) right across, except two short broken stone blocks at the very left and right edges (each under 8% of the width) that hold the beam up. Vines stop well above the bottom third. No archway, no rounded opening, nothing in the middle below the beam. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
Production canvas: 1024 x 512, aspect ratio 1024:512. Genuine transparent alpha, no background glow or cast shadow.
```

### CH-G85 · Tabletop baseball board

- **File:** `chat/assets/games/bb2-board.webp`
- **Size:** 1080 x 1920, opaque
- **Used for:** Baseball: the whole board, seen from above on an upright phone (the game draws the pockets, their labels, the fielders and the ball on top).
- **Stand-in until delivered:** A drawn board.
- **Status:** delivered

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. Retro tabletop toy game art seen from directly above: glossy printed tin and moulded plastic, bright primary colours, crisp clean shapes, soft even lighting. A top-down tabletop baseball game board filling the frame: a green outfield printed like turf with mowing stripes, a tan dirt infield diamond with three white bases, home plate near the bottom centre, the pitcher's mound in the middle of the diamond with a short white groove running from it down to home plate, foul lines in white, and a raised blue plastic outfield wall curving round the top with a printed crowd and flags behind it. Leave the outfield and infield grass plain: NO holes, NO pockets, NO numbers and NO text anywhere.
STRICT production background, portrait 1080x1920. Camera directly overhead at 90 degrees: orthographic printed toy board surface only, no sky/horizon or perspective view. The entire bottom quarter is flat green printed board with the tan home-plate area, no apparatus. Absolutely no ball pockets anywhere, no holes, no launchers, no flippers, no levers, no buttons, no balls, no toy players, no scoreboard, no words, no numbers. Only field, diamond, three bases, home plate, mound with SHORT white groove to home, printed crowd/flags and blue outfield border. Printed crowd is a flat decorative band along top edge.
```

### CH-G86 · Flipper bat

- **File:** `chat/assets/games/bb2-bat.png`
- **Size:** 512 x 128, transparent
- **Used for:** Baseball: the spring-loaded bat that swings round at home plate, seen from above.
- **Stand-in until delivered:** A drawn bat.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Retro tabletop toy game art seen from directly above: glossy printed tin and moulded plastic, bright primary colours, crisp clean shapes, soft even lighting. A wooden toy baseball bat seen from directly above, lying flat, the knob and handle at the LEFT end and the thick barrel at the RIGHT, glossy varnish, filling the width. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
Production canvas: 512 x 128, aspect ratio 512:128. Genuine transparent alpha, no background glow or cast shadow.
```

### CH-G87 · Fielder figure

- **File:** `chat/assets/games/bb2-fielder.png`
- **Size:** 256 x 256, transparent
- **Used for:** Baseball: the little fielders standing on the board (the game tints the cap and shirt).
- **Stand-in until delivered:** A drawn figure.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Retro tabletop toy game art seen from directly above: glossy printed tin and moulded plastic, bright primary colours, crisp clean shapes, soft even lighting. A small moulded plastic baseball fielder figurine seen from directly above: round WHITE cap (so the game can tint it), shoulders, and a brown glove held out to one side, standing on a round base. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
Production canvas: 256 x 256, aspect ratio 256:256. Genuine transparent alpha, no background glow or cast shadow.
```

### CH-G88 · Guppy sprite

- **File:** `chat/assets/games/aq-guppy.png`
- **Size:** 256 x 256, transparent
- **Used for:** Aquarium: the guppy swimming in the shared tank and on its card in the fish picker (the game flips it to swim left and squashes it for the chomp and puff animations).
- **Stand-in until delivered:** A drawn fish.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Bright glossy cartoon aquarium-game art for kids: chunky friendly shapes, big expressive eyes, saturated tropical colours, thick soft outlines in a darker shade of each fill, a single soft highlight, gentle cel shading. Every fish in the set shares this style and the same lighting. Seen from the side, facing RIGHT, the whole fish filling about 90% of the frame, mouth at the right edge. a tiny playful guppy with a slim orange-and-cream body and a big flowing fan tail in bright rainbow blue, purple and pink speckles. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G89 · Neon tetra sprite

- **File:** `chat/assets/games/aq-tetra.png`
- **Size:** 256 x 256, transparent
- **Used for:** Aquarium: the neon tetra swimming in the shared tank and on its card in the fish picker (the game flips it to swim left and squashes it for the chomp and puff animations).
- **Stand-in until delivered:** A drawn fish.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Bright glossy cartoon aquarium-game art for kids: chunky friendly shapes, big expressive eyes, saturated tropical colours, thick soft outlines in a darker shade of each fill, a single soft highlight, gentle cel shading. Every fish in the set shares this style and the same lighting. Seen from the side, facing RIGHT, the whole fish filling about 90% of the frame, mouth at the right edge. a tiny shy neon tetra: slim silver body with a glowing electric-blue stripe along the top half and a vivid red stripe along the lower back half. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G90 · Clownfish sprite

- **File:** `chat/assets/games/aq-clown.png`
- **Size:** 256 x 256, transparent
- **Used for:** Aquarium: the clownfish swimming in the shared tank and on its card in the fish picker (the game flips it to swim left and squashes it for the chomp and puff animations).
- **Stand-in until delivered:** A drawn fish.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Bright glossy cartoon aquarium-game art for kids: chunky friendly shapes, big expressive eyes, saturated tropical colours, thick soft outlines in a darker shade of each fill, a single soft highlight, gentle cel shading. Every fish in the set shares this style and the same lighting. Seen from the side, facing RIGHT, the whole fish filling about 90% of the frame, mouth at the right edge. a small bold clownfish: rounded bright orange body with three white bands edged in black, black-rimmed orange fins, a determined little face. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G91 · Betta sprite

- **File:** `chat/assets/games/aq-betta.png`
- **Size:** 256 x 256, transparent
- **Used for:** Aquarium: the betta swimming in the shared tank and on its card in the fish picker (the game flips it to swim left and squashes it for the chomp and puff animations).
- **Stand-in until delivered:** A drawn fish.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Bright glossy cartoon aquarium-game art for kids: chunky friendly shapes, big expressive eyes, saturated tropical colours, thick soft outlines in a darker shade of each fill, a single soft highlight, gentle cel shading. Every fish in the set shares this style and the same lighting. Seen from the side, facing RIGHT, the whole fish filling about 90% of the frame, mouth at the right edge. a show-off betta fighting fish: a small deep royal-blue and crimson body with huge flowing veil fins and tail flaring out dramatically, a proud cocky face. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G92 · Angelfish sprite

- **File:** `chat/assets/games/aq-angel.png`
- **Size:** 256 x 256, transparent
- **Used for:** Aquarium: the angelfish swimming in the shared tank and on its card in the fish picker (the game flips it to swim left and squashes it for the chomp and puff animations).
- **Stand-in until delivered:** A drawn fish.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Bright glossy cartoon aquarium-game art for kids: chunky friendly shapes, big expressive eyes, saturated tropical colours, thick soft outlines in a darker shade of each fill, a single soft highlight, gentle cel shading. Every fish in the set shares this style and the same lighting. Seen from the side, facing RIGHT, the whole fish filling about 90% of the frame, mouth at the right edge. a curious freshwater angelfish: a tall flat triangular silver body with bold black vertical stripes, a touch of gold on the head, very long trailing top and bottom fins, big wondering eyes. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G93 · Pufferfish sprite

- **File:** `chat/assets/games/aq-puffer.png`
- **Size:** 256 x 256, transparent
- **Used for:** Aquarium: the pufferfish swimming in the shared tank and on its card in the fish picker (the game flips it to swim left and squashes it for the chomp and puff animations).
- **Stand-in until delivered:** A drawn fish.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Bright glossy cartoon aquarium-game art for kids: chunky friendly shapes, big expressive eyes, saturated tropical colours, thick soft outlines in a darker shade of each fill, a single soft highlight, gentle cel shading. Every fish in the set shares this style and the same lighting. Seen from the side, facing RIGHT, the whole fish filling about 90% of the frame, mouth at the right edge. a cute round pufferfish, NOT puffed up: a plump yellow-and-cream body with brown spots, tiny fins, small soft spines lying flat, a little pouting mouth and huge eyes. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G94 · Catfish sprite

- **File:** `chat/assets/games/aq-catfish.png`
- **Size:** 512 x 256, transparent
- **Used for:** Aquarium: the catfish swimming in the shared tank and on its card in the fish picker (the game flips it to swim left and squashes it for the chomp and puff animations).
- **Stand-in until delivered:** A drawn fish.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Bright glossy cartoon aquarium-game art for kids: chunky friendly shapes, big expressive eyes, saturated tropical colours, thick soft outlines in a darker shade of each fill, a single soft highlight, gentle cel shading. Every fish in the set shares this style and the same lighting. Seen from the side, facing RIGHT, the whole fish filling about 90% of the frame, mouth at the right edge. a lazy armoured bottom-dwelling catfish: a long low body, flat belly, brown and olive with darker spots, long whiskers (barbels) at the mouth, sleepy half-closed eyes. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G95 · Piranha sprite

- **File:** `chat/assets/games/aq-piranha.png`
- **Size:** 256 x 256, transparent
- **Used for:** Aquarium: the piranha swimming in the shared tank and on its card in the fish picker (the game flips it to swim left and squashes it for the chomp and puff animations).
- **Stand-in until delivered:** A drawn fish.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Bright glossy cartoon aquarium-game art for kids: chunky friendly shapes, big expressive eyes, saturated tropical colours, thick soft outlines in a darker shade of each fill, a single soft highlight, gentle cel shading. Every fish in the set shares this style and the same lighting. Seen from the side, facing RIGHT, the whole fish filling about 90% of the frame, mouth at the right edge. a feisty cartoon piranha: a deep silver-grey body with a bright red belly, an underbite with a neat row of small white triangular teeth, frowning eyebrows, funny rather than scary. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G96 · Lionfish sprite

- **File:** `chat/assets/games/aq-lionfish.png`
- **Size:** 512 x 512, transparent
- **Used for:** Aquarium: the lionfish swimming in the shared tank and on its card in the fish picker (the game flips it to swim left and squashes it for the chomp and puff animations).
- **Stand-in until delivered:** A drawn fish.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Bright glossy cartoon aquarium-game art for kids: chunky friendly shapes, big expressive eyes, saturated tropical colours, thick soft outlines in a darker shade of each fill, a single soft highlight, gentle cel shading. Every fish in the set shares this style and the same lighting. Seen from the side, facing RIGHT, the whole fish filling about 90% of the frame, mouth at the right edge. a dramatic lionfish: red, cream and maroon zebra stripes, a fan of long striped spiky fins and feathery pectoral fins spread wide like a lion's mane, a sly patient face. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G97 · Reef shark sprite

- **File:** `chat/assets/games/aq-shark.png`
- **Size:** 512 x 256, transparent
- **Used for:** Aquarium: the reef shark swimming in the shared tank and on its card in the fish picker (the game flips it to swim left and squashes it for the chomp and puff animations).
- **Stand-in until delivered:** A drawn fish.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Bright glossy cartoon aquarium-game art for kids: chunky friendly shapes, big expressive eyes, saturated tropical colours, thick soft outlines in a darker shade of each fill, a single soft highlight, gentle cel shading. Every fish in the set shares this style and the same lighting. Seen from the side, facing RIGHT, the whole fish filling about 90% of the frame, mouth at the right edge. a small cartoon reef shark, the tank's top predator: a sleek grey-blue body with a white belly, black-tipped fins, a tall dorsal fin, a cheeky toothy grin, friendly rather than scary. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G98 · Aquarium tank

- **File:** `chat/assets/games/aq-tank.webp`
- **Size:** 2048 x 1024, opaque
- **Used for:** Aquarium: the water behind the fish. The tank is wider than the screen, so it tiles sideways; an upright phone shows a slice of it, a computer a wider one.
- **Stand-in until delivered:** A drawn tank.
- **Status:** requested

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. Bright glossy cartoon aquarium-game art for kids: chunky friendly shapes, big expressive eyes, saturated tropical colours, thick soft outlines in a darker shade of each fill, a single soft highlight, gentle cel shading. Every fish in the set shares this style and the same lighting. A wide side view inside a bright freshwater aquarium: clear turquoise water fading to deeper blue at the bottom, soft light rays slanting down from the surface at the top, a sandy pebble floor across the bottom 12% with a few smooth rocks, and a few tall green swaying plants rooted in the sand. Leave the middle of the water open (the fish swim there). No fish, no text. Tiles seamlessly left to right.
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

### CH-I97 · Go Fish icon

- **File:** `chat/assets/icons/game-gofish.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Go Fish card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Edit attached Games Chat Go Fish icon. Preserve its red Anomalocaris playing card, hook and splash design, but make it an APP ICON TILE as requested: whole composition scaled down with generous margins, neatly contained within one rounded-square badge with corner radius22% of canvas and a bright cool blue-to-purple gradient backing, a clear thick dark-purple outer keyline like a glossy sticker app tile. No part except tiny highlight may cross badge boundary. Transparent alpha ONLY outside the rounded badge. Square256x256 readable at48px. Card, fishing hook and creature no text. Simplify splash and pond leaves to keep all inside badge and make the creature the clear focal point.
```

### CH-I98 · Baseball icon

- **File:** `chat/assets/icons/game-baseball.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Baseball card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a baseball flying off a swinging bat with motion lines, in front of a stadium. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
Production canvas: 256 x 256. Single app icon tile. Actual transparent alpha strictly outside rounded tile, no exterior glow. Keep all scene elements neatly contained inside tile. Use drawn illustration, not photorealism.
```

### CH-I99 · Mob Whack icon

- **File:** `chat/assets/icons/game-whack.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Mob Whack card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a blocky hammer about to whack a blocky green zombie popping out of a hole, with a creeper peeking from another hole. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
Production canvas: 256 x 256. Single app icon tile. Actual transparent alpha strictly outside rounded tile, no exterior glow. Keep all scene elements neatly contained inside tile. Use drawn illustration, not photorealism.
```

### CH-I100 · Kart Dash icon

- **File:** `chat/assets/icons/game-kart.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Kart Dash card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a cartoon go-kart drifting round a bend with sparks, a rainbow star and a banana peel flying. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
Only an unoccupied cartoon go-kart drifting around a bend with sparks, rainbow star and banana peel. No driver, no animal, no dog, no person. All three elements neatly contained inside the rounded-square gradient tile.
```

### CH-I101 · Block Drop icon

- **File:** `chat/assets/icons/game-blocks.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Block Drop card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of colourful falling square-block puzzle pieces stacking into neat rows, one row flashing as it clears. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
Single square app icon. Keep the requested game scene contained inside its rounded-square theme tile. Genuine transparent alpha outside tile, no exterior glow. No text or additional interface.
```

### CH-I102 · Temple Dash icon

- **File:** `chat/assets/icons/game-temple.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Temple Dash card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of an explorer running away down a jungle temple path past a carved stone arch, gold coins ahead and monkeys chasing behind. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
Single square app icon. Keep the requested game scene contained inside its rounded-square theme tile. Genuine transparent alpha outside tile, no exterior glow. No text or additional interface.
```

### CH-I103 · Mouth Eyes icon

- **File:** `chat/assets/icons/fx-moutheyes.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Mouth Eyes button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a face where both eyes have been replaced by copies of its own mouth, so it has three identical open smiling mouths, two where the eyes should be and one in the usual place. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
Single 256x256 square app icon. Keep scene contained within its rounded-square theme badge; actual transparent alpha outside badge, no outer glow. The specific face distortion is the whole subject, no extra characters or interface. Exactly three identical smiling mouths: two horizontal mouths replace the eyes; third is the normal mouth. Zero eyeballs, zero normal eyes.
```

### CH-I104 · Huge Features icon

- **File:** `chat/assets/icons/fx-hugefeatures.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Huge Features button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** delivered

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a face whose own eyes and mouth have been cut out and pasted back enormous: two giant eyes and a giant mouth so wide they stick out past both sides of the head, on a normal-sized face. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
Single 256x256 square app icon. Keep scene contained within its rounded-square theme badge; actual transparent alpha outside badge, no outer glow. The specific face distortion is the whole subject, no extra characters or interface. Normal-sized head with two visibly oversized pasted-on eyes and one hugely enlarged smiling mouth extending laterally beyond the face outline; humorous clean collage distortion.
```

### CH-I105 · Aquarium icon

- **File:** `chat/assets/icons/game-aquarium.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Aquarium card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a bright fish tank with a clownfish, a pufferfish, a school of neon tetras and a little shark, food flakes sprinkling down from the top. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
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
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person in profile with pursed lips blowing a big shimmering soap bubble that drifts away towards the edge, a second small bubble popping with a burst of droplets. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent outside the paper tile, not magenta.
```

### CH-N02 · Puppy icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-puppy.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Puppy button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face wearing realistic-looking floppy brown dog ears and a black dog nose, mouth open with a long pink dog tongue hanging out. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent outside the paper tile, not magenta.
```

### CH-N03 · Heart Eyes icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-hearteyes.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Heart Eyes button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's grinning face with glowing red heart shapes in place of the eyes, three small hearts floating up from the head. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent outside the paper tile, not magenta.
```

### CH-N04 · Dragon icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-dragon.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Dragon button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person with small curved dragon horns and scaly cheeks, mouth wide open blasting a jet of orange fire sideways. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent outside the paper tile, not magenta.
```

### CH-N05 · Rainbow Mouth icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-rainbow.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Rainbow Mouth button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face with mouth wide open and a thick bright rainbow pouring out of it and curving down out of frame. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent outside the paper tile, not magenta.
```

### CH-N06 · Big Eyes icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-bigeyes.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Big Eyes button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face with eyes magnified huge like a bulging lens, the rest of the face normal, a subtle warp ring around each eye. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent outside the paper tile, not magenta.
```

### CH-N07 · Bobblehead icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-bobblehead.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Bobblehead button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person drawn with a giant head on a small body, the head tilted mid-wobble with two motion arcs. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent outside the paper tile, not magenta.
```

### CH-N08 · Alien icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-alien.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Alien button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face tinted lime green with large glossy black almond eyes and two antennae with glowing tips. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent outside the paper tile, not magenta.
```

### CH-N09 · Deal With It icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-dealwithit.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Deal With It button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: pixel-art black sunglasses dropping down onto a smirking person's face, motion lines above them. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent outside the paper tile, not magenta.
```

### CH-N10 · Royalty icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-crown.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Royalty button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a confident person wearing a heavy gold jewelled crown slightly tilted, a few gold sparkles. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent outside the paper tile, not magenta.
```

### CH-N11 · Fancy icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-fancy.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Fancy button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person with raised eyebrows, a curled handlebar mustache and a gold monocle on a chain falling from one eye. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent outside the paper tile, not magenta.
```

### CH-N12 · Clown icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-clown.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Clown button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person with a round red clown nose and a huge rainbow curly afro wig, mouth open in a honk. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent outside the paper tile, not magenta.
```

### CH-N13 · Storm Cloud icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-storm.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Storm Cloud button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a small dark rain cloud hovering over a person's frowning head, rain falling on them and a lightning bolt striking. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent outside the paper tile, not magenta.
```

### CH-N14 · Noodle Face icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-noodle.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Noodle Face button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face stretched long and wavy like in a funhouse mirror, eyes and mouth pulled into a tall S-curve. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent outside the paper tile, not magenta.
```

### CH-N15 · Swirl icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-swirl.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Swirl button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face twisted into a spiral around the nose, as if being pulled down a whirlpool. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent outside the paper tile, not magenta.
```

### CH-N16 · Outer Space icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-space.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Outer Space button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's head and shoulders cut out against a deep starfield with a ringed planet and a nebula behind them. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent outside the paper tile, not magenta.
```

### CH-N17 · Under the Sea icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-underwater.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Under the Sea button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's head and shoulders in blue-green water light, rippling caustics on the face, bubbles rising and a small tropical fish passing. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent outside the paper tile, not magenta.
```

### CH-N18 · 8-Bit icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-pixel.png`
- **Size:** 256 x 256, transparent
- **Used for:** The 8-Bit button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face rendered in big chunky square pixels with a limited retro console palette, half the face still smooth to show the change. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent outside the paper tile, not magenta.
```

### CH-N19 · Comic Book icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-comic.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Comic Book button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face in comic-book style with halftone dots and bold ink lines, mouth open and a jagged POW burst shape beside it. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent outside the paper tile, not magenta.
```

### CH-N20 · Heat Vision icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-thermal.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Heat Vision button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face as a thermal camera image, hot yellow and red cheeks fading to purple and blue at the edges. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent outside the paper tile, not magenta.
```

### CH-N21 · Flower Crown icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-flowercrown.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Flower Crown button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person wearing a crown of pink peonies, white daisies and green leaves, soft petals drifting. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside the paper tile, not magenta.
```

### CH-N22 · Kitty icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-kitty.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Kitty button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person with pointed cat ears, a small pink cat nose and thin white whiskers, mouth open mid-meow. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside the paper tile, not magenta.
```

### CH-N23 · Bunny icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-bunny.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Bunny button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person with tall white rabbit ears, one ear flopped over, and a little pink bunny nose. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside the paper tile, not magenta.
```

### CH-N24 · Hotdog icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-hotdog.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Hotdog button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person dressed in a full hotdog costume, face showing through the bun, jumping in the air. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside the paper tile, not magenta.
```

### CH-N25 · Laser Eyes icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-lasereyes.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Laser Eyes button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person with raised eyebrows firing two straight red laser beams from the eyes towards the viewer, glowing hot. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside the paper tile, not magenta.
```

### CH-N26 · Waterworks icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-crying.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Waterworks button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face crying two exaggerated arcing fountains of tears from the corners of the eyes, splashing below. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside the paper tile, not magenta.
```

### CH-N27 · Devil icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-devil.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Devil button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person with a sly smile and two small glossy red devil horns, a faint red glow and a few embers behind. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside the paper tile, not magenta.
```

### CH-N28 · Angel icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-angel.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Angel button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person with a golden halo floating above the head and soft white feathered wings behind the shoulders. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside the paper tile, not magenta.
```

### CH-N29 · Pirate icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-pirate.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Pirate button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person in a black tricorn pirate hat with a skull emblem and a black eyepatch, mid-shout. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside the paper tile, not magenta.
```

### CH-N30 · Viking icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-viking.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Viking button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person in a horned steel Viking helmet with a braided orange beard. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside the paper tile, not magenta.
```

### CH-N31 · Wizard icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-wizard.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Wizard button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person in a tall starry midnight-blue wizard hat, eyebrows raised, purple magic sparks bursting around the head. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside the paper tile, not magenta.
```

### CH-N32 · Butterflies icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-butterflies.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Butterflies button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's head with a ring of blue and pink butterflies circling it, two flying off. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside the paper tile, not magenta.
```

### CH-N33 · Glam icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-makeup.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Glam button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face with bold winged eyeliner, glossy red lips and contoured cheeks, a sparkle on the cheekbone. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside the paper tile, not magenta.
```

### CH-N34 · Beach 360 icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-beach360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Beach 360 button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person cut out in front of a tropical beach with palm trees and turquoise sea, a circular 360-degree arrow around the scene. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside the paper tile, not magenta.
```

### CH-N35 · Space 360 icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-space360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Space 360 button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person cut out in front of a space-station window looking down at Earth, a circular 360-degree arrow around the scene. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside the paper tile, not magenta.
```

### CH-N36 · Reef 360 icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-reef360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Reef 360 button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person cut out in front of a coral reef with a sea turtle, a circular 360-degree arrow around the scene. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside the paper tile, not magenta.
```

### CH-N37 · Forest 360 icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-forest360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Forest 360 button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person cut out in front of a misty fantasy forest with a waterfall and glowing mushrooms, a circular 360-degree arrow. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside the paper tile, not magenta.
```

### CH-N38 · City 360 icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-city360-v2.png`
- **Size:** 256 x 256, transparent
- **Used for:** The City 360 button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person cut out on a rooftop in front of neon skyscrapers at night, a circular 360-degree arrow around the scene. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Edit: Remove ONLY the cigarette from the man's lips and all cigarette smoke. Preserve his silhouette, rooftop skyline, circular arrows, Nouvelle Vague cut-paper inks, off-white rounded tile and transparent exterior. No other changes.
```

### CH-N39 · Snow 360 icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-snow360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Snow 360 button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person cut out in front of snowy mountain peaks and a wooden cabin, a circular 360-degree arrow. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside the paper tile, not magenta.
```

### CH-N40 · Candy 360 icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-candy360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Candy 360 button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person cut out in front of a candy land with lollipop trees and a gingerbread house, a circular 360-degree arrow. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside the paper tile, not magenta.
```

### CH-N41 · Volcano 360 icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-volcano360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Volcano 360 button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person cut out in front of an erupting volcano and rivers of glowing lava, a circular 360-degree arrow. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N42 · Blur icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-blurbg.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Blur button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a crisp, sharply drawn person in the foreground, and behind them a bedroom so heavily out of focus that nothing in it has an edge: only big soft round bokeh discs of warm and violet light and smeared colour shapes, like a phone's portrait mode turned all the way up. The contrast between the sharp person and the completely blurred room is the whole point of the icon; draw no sharp object anywhere behind them. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N43 · Colour Pop icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-colorpop.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Colour Pop button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person in full vivid colour in front of a room that is entirely black and white. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N44 · Neon Aura icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-neonaura.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Neon Aura button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a dark silhouette of a person outlined by a glowing neon pink and cyan aura on a black background. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N45 · Disco icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-disco.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Disco button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person lit by coloured disco beams from a mirror ball above, light spots on the face, dark room behind. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N46 · Code Rain icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-matrix.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Code Rain button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person with a green-tinted face in front of falling columns of green code characters on black. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N47 · Sunset icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-sunset.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Sunset button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a black silhouette of a person's head and shoulders against a huge orange and pink sunset over the sea. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N48 · Time Trails icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-echo.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Time Trails button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person mid-move leaving a trail of four fading see-through copies, each tinted a different rainbow colour. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N49 · Delay Ghost icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-delayghost.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Delay Ghost button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person with a pale translucent ghost copy of themselves a step behind, copying their pose a moment late. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N50 · Time Warp icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-timewarp.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Time Warp button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face stretched and frozen above a glowing blue horizontal scan line moving down the picture. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N51 · Side Warp icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-timewarpside.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Side Warp button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face smeared sideways into a long streak left of a glowing blue vertical scan line. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N52 · Wobble Time icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-slitscan.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Wobble Time button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face sliced into horizontal bands, each band shifted in time so the face ripples like a wave. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N53 · Stop Motion icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-strobe.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Stop Motion button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: three frozen film frames of a person in jerky poses side by side, like stop-motion animation on a film strip. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N54 · Clones icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-clones.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Clones button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: three identical copies of the same person in different poses side by side in one room. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N55 · Motion Glow icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-motionglow.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Motion Glow button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person waving one hand, the hand leaving bright neon light-painting trails in the air. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N56 · Tiny Face icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-tinyface-v2.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Tiny Face button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's big round head with a comically small face bunched in the very middle: two bold black dot eyes with short brows, a small nose line and small red lips, all squeezed close together and filling about a third of the face so they still read clearly at 48 px; lots of empty off-white cheek and forehead around them. The face must never look blank. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-N57 · Chubby Cheeks icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-chubby-v2.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Chubby Cheeks button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face with hugely puffed-out round cheeks, lips pressed together holding air. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Edit: Make this clearly show cheeks inflated like a chipmunk holding air: balloon the cheek silhouette strongly outward on both sides and draw tightly pursed tiny lips. Remove the flat red blush circles. Keep natural eyes, off-white face, black ink contours, mustard outfit, teal background shapes and Nouvelle Vague paper grain. Same rounded paper tile and transparent exterior. No text.
```

### CH-N58 · Baby Face icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-babyface.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Baby Face button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face turned into a baby's: huge round eyes, a button nose, chubby cheeks and a tiny mouth. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N59 · Mirror Face icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-symmetry.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Mirror Face button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face split down the middle with one half mirrored onto the other, a thin glowing line down the centre. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N60 · Cyclops icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-cyclops.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Cyclops button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face with a single large eye in the middle of the forehead instead of two. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N61 · Big Mouth icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-bigmouth.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Big Mouth button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face with an enormous wide grinning mouth taking up the lower half of the face. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N62 · Fisheye icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-fisheye.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Fisheye button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person leaning close to the lens, nose and face bulging out through a round fisheye distortion. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N63 · Film Noir icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-noir.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Film Noir button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person in black and white with film grain and a dramatic slatted window shadow across the face. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N64 · VHS icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-vhs.png`
- **Size:** 256 x 256, transparent
- **Used for:** The VHS button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face on an old VHS tape picture with colour bleeding, tracking lines and a glitch band across the middle. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N65 · Pop Art icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-popart.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Pop Art button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: four copies of the same person's face in a 2x2 grid, each in a different loud pop-art colour scheme. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N66 · Kaleidoscope icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-kaleidoscope.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Kaleidoscope button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face repeated into a symmetrical kaleidoscope star pattern in bright colours. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N67 · Snowfall icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-snow.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Snowfall button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person in a beanie with big snowflakes falling around them and a few settling on the hat. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N68 · Confetti icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-confetti.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Confetti button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a smiling person with bursts of multicoloured confetti and streamers exploding around their head. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N69 · Make It Rain icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-moneyrain.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Make It Rain button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person with mouth open while green banknotes rain down and flutter around them. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N70 · Fireworks icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-fireworks.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Fireworks button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person with mouth open as a firework launches upward and bursts into a big colourful flower in the night sky behind. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N71 · Man icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-manface.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Man button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a split face: left half a person, right half the same person as a grown man with a squarer jaw, heavier brows and stubble. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N72 · Woman icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-womanface.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Woman button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a split face: left half a person, right half the same person with winged eyeliner, fuller lips and a slimmer jaw. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N73 · Thinner icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-thinner-v2.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Thinner button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's head and shoulders squeezed narrow from both sides, two arrows pressing inward. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Edit: Make the entire person's head and shoulders visibly squeezed horizontally to HALF the natural width, a very tall skinny distorted head. Keep two large red arrows pushing inward toward the head. Preserve cut-paper black/red/mustard inks, off-white rounded tile, paper grain and transparent exterior. No text.
```

### CH-N74 · Fatter icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-fatter-v2.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Fatter button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's head and shoulders stretched wide sideways, two arrows pulling outward. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Edit: Make the entire person's head AND shoulders comically stretched horizontally to DOUBLE normal width, especially a broad flat face filling most tile width; it must visibly show the sideways-stretch effect. Keep two red arrows pulling outward. Preserve cut-paper black/red/mustard inks, off-white rounded tile, paper grain and transparent exterior. No text.
```

### CH-N75 · Baby icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-baby.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Baby button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a split face: left half a person, right half the same person as a baby, with a big round head, fat cheeks, large eyes, a tiny button nose and smooth skin. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N76 · Hoops icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-hoops.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Hoops card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a hand flicking a basketball up towards a hoop with a glass backboard, a faint ghost ball in another colour following. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N77 · Flappy Face icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-flappy.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Flappy Face card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face as a round bird with small white wings, flapping through a gap between two tall pillars. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N78 · Air Hockey icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-airhockey.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Air Hockey card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a top-down air hockey table, a paddle striking the puck with speed lines towards the goal. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N79 · Connect Four icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-connect4.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Connect Four card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a blue Connect Four grid with red and yellow discs, the last disc dropping in to make four in a row. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N80 · Quick Draw icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-quickdraw.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Quick Draw card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: two cowboy silhouettes facing off on a dusty street at sunset, one already drawing. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or UI controls.
```

### CH-N82 · Copy Cat icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-copycat.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Copy Cat card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: two faces side by side pulling the same silly expression, tongue out and one eye shut. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or extraneous app interface.
```

### CH-N83 · Rock Paper Scissors icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-rps.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Rock Paper Scissors card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: three hands thrown at once in a circle: a fist, a flat hand and a V for scissors. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or extraneous app interface.
```

### CH-N84 · Doodle Guess icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-doodle-v2.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Doodle Guess card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a hand-drawn marker sketch of a cat on a whiteboard with a speech bubble guessing with a question mark. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Edit: Make the cat a simple amateur marker LINE DRAWING on a clearly bordered whiteboard, with an oversized marker pen lying along its edge. Keep the red speech bubble with question mark. No actual cat silhouette, show the drawn sketch clearly. Preserve Nouvelle Vague flat paper/black/red/mustard graphic style, grain and off-white rounded tile with transparent exterior.
```

### CH-N85 · Memory Match icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-memory.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Memory Match card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a grid of face-down cards with two flipped face-up showing the same effect picture. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or extraneous app interface.
```

### CH-N86 · Mini Golf icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-minigolf.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Mini Golf card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a golf ball rolling across bright turf towards a flag in the hole, a dashed aiming line behind it. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or extraneous app interface.
```

### CH-N87 · Bowling icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-bowling.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Bowling card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a bowling ball curving down a lane and smashing into white pins mid-strike. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or extraneous app interface.
```

### CH-N88 · Beach Bump icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-beachbump.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Beach Bump card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a beach ball bouncing off a person's forehead as they nod, motion lines and a sunny beach behind. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or extraneous app interface.
```

### CH-N89 · Burger Stack icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-burger.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Burger Stack card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a tall wobbly burger tower being caught on a bun, a lettuce leaf falling in and a boot to dodge. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or extraneous app interface.
```

### CH-N90 · Asteroid Dodge icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-asteroids.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Asteroid Dodge card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a small rocket weaving between tumbling asteroids in space, a gold star to grab. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or extraneous app interface.
```

### CH-N92 · Snake icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-snake.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Snake card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: two neon snakes of different colours racing across a dark grid towards a glowing apple. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or extraneous app interface.
```

### CH-N93 · Battleship icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-battleship.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Battleship card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a top-down grid of sea with a grey battleship and a red explosion hit marker on it. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or extraneous app interface.
```

### CH-N94 · Trivia icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-trivia-v2.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Trivia card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a quiz-show buzzer being slammed with four coloured answer panels behind it. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Edit: Show exactly FOUR distinct coloured rectangular answer panels behind the person in a clearly separated 2x2 layout: top-left red, top-right mustard yellow, bottom-left teal, bottom-right black. No text in them. Keep the woman's hand slamming the red quiz buzzer, current Nouvelle Vague cut-paper inks, grain and off-white rounded tile with transparent exterior.
```

### CH-N95 · Word Blitz icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-wordblitz.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Word Blitz card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a 4x4 grid of letter tiles with a glowing path swiped through them spelling a word. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile. Actual transparent alpha outside paper tile, not magenta. No added cigarettes or extraneous app interface.
```

### CH-N96 · Go Fish icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-gofish.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Go Fish card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Edit attached Games Chat ART theme Go Fish icon. Preserve French New Wave screen-print style, limited ink palette, fisherman, rounded off-white tile black keyline, composition and transparent outside. CRITICAL the fisherman is catching a PLAYING CARD, not a loose animal. Enclose the red Anomalocaris at right inside a clearly visible tilted tall cream rectangular PLAYING CARD with a thin black outline, rounded corners, a mustard rim. Hook attaches to the card's upper edge. The red animal is a flat picture printed on that card, entirely contained within its edges. Splash below the card. No lettering or numerals on the card. Still one clean readable256square appicon with48pxreadability.
```

### CH-N97 · Baseball icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-baseball.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Baseball card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a baseball flying off a swinging bat with motion lines, in front of a stadium. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
Production canvas: 256 x 256. Single app icon tile. Actual transparent alpha strictly outside rounded tile, no exterior glow. Keep all scene elements neatly contained inside tile. Use drawn illustration, not photorealism.
```

### CH-N98 · Mob Whack icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-whack.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Mob Whack card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a blocky hammer about to whack a blocky green zombie popping out of a hole, with a creeper peeking from another hole. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
Production canvas: 256 x 256. Single app icon tile. Actual transparent alpha strictly outside rounded tile, no exterior glow. Keep all scene elements neatly contained inside tile. Use drawn illustration, not photorealism.
```

### CH-N99 · Kart Dash icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-kart.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Kart Dash card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a cartoon go-kart drifting round a bend with sparks, a rainbow star and a banana peel flying. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
Production canvas: 256 x 256. Single app icon tile. Actual transparent alpha strictly outside rounded tile, no exterior glow. Keep all scene elements neatly contained inside tile. Use drawn illustration, not photorealism.
```

### CH-N100 · Block Drop icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-blocks.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Block Drop card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: colourful falling square-block puzzle pieces stacking into neat rows, one row flashing as it clears. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
Single square app icon. Keep the requested game scene contained inside its rounded-square theme tile. Genuine transparent alpha outside tile, no exterior glow. No text or additional interface.
```

### CH-N101 · Temple Dash icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-temple.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Temple Dash card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: an explorer running away down a jungle temple path past a carved stone arch, gold coins ahead and monkeys chasing behind. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
Single square app icon. Keep the requested game scene contained inside its rounded-square theme tile. Genuine transparent alpha outside tile, no exterior glow. No text or additional interface.
```

### CH-N102 · Mouth Eyes icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-moutheyes.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Mouth Eyes button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face, where both eyes have been replaced by copies of its own mouth, so it has three identical open smiling mouths, two where the eyes should be and one in the usual place. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
Single 256x256 square app icon. Keep scene contained within its rounded-square theme badge; actual transparent alpha outside badge, no outer glow. The specific face distortion is the whole subject, no extra characters or interface. Exactly three identical smiling mouths: two horizontal mouths replace the eyes; third is the normal mouth. Zero eyeballs, zero normal eyes.
```

### CH-N103 · Huge Features icon (Art theme)

- **File:** `chat/assets/icons-art/art-fx-hugefeatures.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Huge Features button on the effect strips in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a person's face whose own eyes and mouth have been cut out and pasted back enormous: two giant eyes and a giant mouth so wide they stick out past both sides of the head, on a normal-sized face. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
Single 256x256 square app icon. Keep scene contained within its rounded-square theme badge; actual transparent alpha outside badge, no outer glow. The specific face distortion is the whole subject, no extra characters or interface. Normal-sized head with two visibly oversized pasted-on eyes and one hugely enlarged smiling mouth extending laterally beyond the face outline; humorous clean collage distortion.
```

### CH-N104 · Aquarium icon (Art theme)

- **File:** `chat/assets/icons-art/art-game-aquarium.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Aquarium card in the game picker in the Art theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Mid-century French New Wave cinema poster art, like late-1950s and 1960s Nouvelle Vague film posters and title sequences: bold flat shapes that look cut from coloured paper, a limited palette of two or three strong inks (vermilion red, ink black, mustard yellow, teal) on warm off-white paper, visible paper grain and a slight print misregistration, confident brush-and-scissors silhouettes, chic, graphic and a little moody and witty. People are stylish, drawn with a few elegant lines. Not cubist, not Picasso, not cartoon, no photorealism. No text, no watermark. Icon: a bright fish tank with a clownfish, a pufferfish, a school of neon tetras and a little shark, food flakes sprinkling down from the top. Square icon: the image fills about 85% of the 256 x 256 frame on an off-white paper rounded-square tile (corner radius about 22%) with a thin black keyline, the same backing for every icon in the set. Readable at 48 px: one clear idea, big flat shapes. Transparent outside the tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

## Effect and game icons, Classical theme

The Classical theme's icon for every effect and game: 18th-century French Rococo painting in a gilt frame, each showing what the effect or game does. Until one arrives the theme shows the Teen icon.

### CH-R01 · Bubble Blow icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-bubble.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Bubble Blow button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person in profile with pursed lips blowing a big shimmering soap bubble that drifts away towards the edge, a second small bubble popping with a burst of droplets. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R02 · Puppy icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-puppy.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Puppy button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face wearing realistic-looking floppy brown dog ears and a black dog nose, mouth open with a long pink dog tongue hanging out. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R03 · Heart Eyes icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-hearteyes.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Heart Eyes button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's grinning face with glowing red heart shapes in place of the eyes, three small hearts floating up from the head. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R04 · Dragon icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-dragon.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Dragon button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person with small curved dragon horns and scaly cheeks, mouth wide open blasting a jet of orange fire sideways. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R05 · Rainbow Mouth icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-rainbow.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Rainbow Mouth button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face with mouth wide open and a thick bright rainbow pouring out of it and curving down out of frame. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R06 · Big Eyes icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-bigeyes.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Big Eyes button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face with eyes magnified huge like a bulging lens, the rest of the face normal, a subtle warp ring around each eye. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R07 · Bobblehead icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-bobblehead.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Bobblehead button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person drawn with a giant head on a small body, the head tilted mid-wobble with two motion arcs. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R08 · Alien icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-alien.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Alien button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face tinted lime green with large glossy black almond eyes and two antennae with glowing tips. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R09 · Deal With It icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-dealwithit.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Deal With It button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: pixel-art black sunglasses dropping down onto a smirking person's face, motion lines above them. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R10 · Royalty icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-crown.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Royalty button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a confident person wearing a heavy gold jewelled crown slightly tilted, a few gold sparkles. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R11 · Fancy icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-fancy.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Fancy button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person with raised eyebrows, a curled handlebar mustache and a gold monocle on a chain falling from one eye. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R12 · Clown icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-clown.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Clown button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person with a round red clown nose and a huge rainbow curly afro wig, mouth open in a honk. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R13 · Storm Cloud icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-storm.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Storm Cloud button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a small dark rain cloud hovering over a person's frowning head, rain falling on them and a lightning bolt striking. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R14 · Noodle Face icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-noodle.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Noodle Face button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face stretched long and wavy like in a funhouse mirror, eyes and mouth pulled into a tall S-curve. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R15 · Swirl icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-swirl.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Swirl button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face twisted into a spiral around the nose, as if being pulled down a whirlpool. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R16 · Outer Space icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-space.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Outer Space button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's head and shoulders cut out against a deep starfield with a ringed planet and a nebula behind them. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R17 · Under the Sea icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-underwater.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Under the Sea button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's head and shoulders in blue-green water light, rippling caustics on the face, bubbles rising and a small tropical fish passing. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R18 · 8-Bit icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-pixel.png`
- **Size:** 256 x 256, transparent
- **Used for:** The 8-Bit button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face rendered in big chunky square pixels with a limited retro console palette, half the face still smooth to show the change. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R19 · Comic Book icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-comic.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Comic Book button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face in comic-book style with halftone dots and bold ink lines, mouth open and a jagged POW burst shape beside it. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R20 · Heat Vision icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-thermal.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Heat Vision button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face as a thermal camera image, hot yellow and red cheeks fading to purple and blue at the edges. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R21 · Flower Crown icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-flowercrown.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Flower Crown button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person wearing a crown of pink peonies, white daisies and green leaves, soft petals drifting. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R22 · Kitty icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-kitty.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Kitty button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person with pointed cat ears, a small pink cat nose and thin white whiskers, mouth open mid-meow. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R23 · Bunny icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-bunny.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Bunny button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person with tall white rabbit ears, one ear flopped over, and a little pink bunny nose. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R24 · Hotdog icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-hotdog.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Hotdog button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person dressed in a full hotdog costume, face showing through the bun, jumping in the air. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R25 · Laser Eyes icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-lasereyes.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Laser Eyes button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person with raised eyebrows firing two straight red laser beams from the eyes towards the viewer, glowing hot. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R26 · Waterworks icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-crying.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Waterworks button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face crying two exaggerated arcing fountains of tears from the corners of the eyes, splashing below. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R27 · Devil icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-devil.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Devil button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person with a sly smile and two small glossy red devil horns, a faint red glow and a few embers behind. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R28 · Angel icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-angel.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Angel button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person with a golden halo floating above the head and soft white feathered wings behind the shoulders. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R29 · Pirate icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-pirate.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Pirate button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person in a black tricorn pirate hat with a skull emblem and a black eyepatch, mid-shout. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R30 · Viking icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-viking.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Viking button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person in a horned steel Viking helmet with a braided orange beard. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R31 · Wizard icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-wizard.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Wizard button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person in a tall starry midnight-blue wizard hat, eyebrows raised, purple magic sparks bursting around the head. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R32 · Butterflies icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-butterflies.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Butterflies button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's head with a ring of blue and pink butterflies circling it, two flying off. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R33 · Glam icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-makeup.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Glam button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face with bold winged eyeliner, glossy red lips and contoured cheeks, a sparkle on the cheekbone. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R34 · Beach 360 icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-beach360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Beach 360 button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person cut out in front of a tropical beach with palm trees and turquoise sea, a circular 360-degree arrow around the scene. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R35 · Space 360 icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-space360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Space 360 button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person cut out in front of a space-station window looking down at Earth, a circular 360-degree arrow around the scene. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R36 · Reef 360 icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-reef360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Reef 360 button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person cut out in front of a coral reef with a sea turtle, a circular 360-degree arrow around the scene. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R37 · Forest 360 icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-forest360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Forest 360 button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person cut out in front of a misty fantasy forest with a waterfall and glowing mushrooms, a circular 360-degree arrow. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R38 · City 360 icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-city360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The City 360 button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person cut out on a rooftop in front of neon skyscrapers at night, a circular 360-degree arrow around the scene. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R39 · Snow 360 icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-snow360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Snow 360 button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person cut out in front of snowy mountain peaks and a wooden cabin, a circular 360-degree arrow. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R40 · Candy 360 icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-candy360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Candy 360 button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person cut out in front of a candy land with lollipop trees and a gingerbread house, a circular 360-degree arrow. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R41 · Volcano 360 icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-volcano360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Volcano 360 button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person cut out in front of an erupting volcano and rivers of glowing lava, a circular 360-degree arrow. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R42 · Blur icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-blurbg.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Blur button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a crisp, sharply drawn person in the foreground, and behind them a bedroom so heavily out of focus that nothing in it has an edge: only big soft round bokeh discs of warm and violet light and smeared colour shapes, like a phone's portrait mode turned all the way up. The contrast between the sharp person and the completely blurred room is the whole point of the icon; draw no sharp object anywhere behind them. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R43 · Colour Pop icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-colorpop.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Colour Pop button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person in full vivid colour in front of a room that is entirely black and white. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R44 · Neon Aura icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-neonaura.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Neon Aura button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a dark silhouette of a person outlined by a glowing neon pink and cyan aura on a black background. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R45 · Disco icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-disco.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Disco button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person lit by coloured disco beams from a mirror ball above, light spots on the face, dark room behind. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R46 · Code Rain icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-matrix.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Code Rain button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person with a green-tinted face in front of falling columns of green code characters on black. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R47 · Sunset icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-sunset.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Sunset button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a black silhouette of a person's head and shoulders against a huge orange and pink sunset over the sea. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R48 · Time Trails icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-echo.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Time Trails button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person mid-move leaving a trail of four fading see-through copies, each tinted a different rainbow colour. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R49 · Delay Ghost icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-delayghost.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Delay Ghost button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person with a pale translucent ghost copy of themselves a step behind, copying their pose a moment late. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R50 · Time Warp icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-timewarp.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Time Warp button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
A playful video filter icon, square, transparent outside a slim ornate rounded-square gilt frame. 18th-century French Rococo oil painting, pastel powder blue, mint, cream and burnished gold. Bust portrait of an adult male courtier in a powdered wig and fully buttoned silk coat. A glowing blue horizontal scanner line crosses the middle of the painted portrait; ABOVE the line, the painted portrait is stretched vertically like a funhouse mirror, BELOW it the painted portrait remains normal. An unmistakable friendly Time Warp scan effect. Delicate painted brushwork, warm garden light, simple composition readable at 48 pixels. No text, no watermark. Match the existing Classical icons in Games Chat. Deliver square PNG with alpha; target 256x256.
```

### CH-R51 · Side Warp icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-timewarpside.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Side Warp button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face smeared sideways into a long streak left of a glowing blue vertical scan line. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R52 · Wobble Time icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-slitscan.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Wobble Time button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face sliced into horizontal bands, each band shifted in time so the face ripples like a wave. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R53 · Stop Motion icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-strobe.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Stop Motion button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: three frozen film frames of a person in jerky poses side by side, like stop-motion animation on a film strip. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R54 · Clones icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-clones.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Clones button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: three identical copies of the same person in different poses side by side in one room. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R55 · Motion Glow icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-motionglow.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Motion Glow button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person waving one hand, the hand leaving bright neon light-painting trails in the air. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R56 · Tiny Face icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-tinyface.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Tiny Face button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a normal-sized person head with comically tiny eyes, nose and mouth squeezed together in the middle. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R57 · Chubby Cheeks icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-chubby.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Chubby Cheeks button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face with hugely puffed-out round cheeks, lips pressed together holding air. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R58 · Baby Face icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-babyface.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Baby Face button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face turned into a baby's: huge round eyes, a button nose, chubby cheeks and a tiny mouth. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R59 · Mirror Face icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-symmetry.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Mirror Face button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face split down the middle with one half mirrored onto the other, a thin glowing line down the centre. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R60 · Cyclops icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-cyclops.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Cyclops button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face with a single large eye in the middle of the forehead instead of two. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R61 · Big Mouth icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-bigmouth.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Big Mouth button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face with an enormous wide grinning mouth taking up the lower half of the face. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R62 · Fisheye icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-fisheye.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Fisheye button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person leaning close to the lens, nose and face bulging out through a round fisheye distortion. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R63 · Film Noir icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-noir.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Film Noir button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person in black and white with film grain and a dramatic slatted window shadow across the face. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R64 · VHS icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-vhs.png`
- **Size:** 256 x 256, transparent
- **Used for:** The VHS button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face on an old VHS tape picture with colour bleeding, tracking lines and a glitch band across the middle. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R65 · Pop Art icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-popart.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Pop Art button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: four copies of the same person's face in a 2x2 grid, each in a different loud pop-art colour scheme. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R66 · Kaleidoscope icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-kaleidoscope.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Kaleidoscope button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face repeated into a symmetrical kaleidoscope star pattern in bright colours. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R67 · Snowfall icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-snow.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Snowfall button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person in a beanie with big snowflakes falling around them and a few settling on the hat. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R68 · Confetti icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-confetti.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Confetti button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a smiling person with bursts of multicoloured confetti and streamers exploding around their head. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R69 · Make It Rain icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-moneyrain.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Make It Rain button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person with mouth open while green banknotes rain down and flutter around them. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R70 · Fireworks icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-fireworks.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Fireworks button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person with mouth open as a firework launches upward and bursts into a big colourful flower in the night sky behind. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R71 · Man icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-manface.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Man button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a split face: left half a person, right half the same person as a grown man with a squarer jaw, heavier brows and stubble. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R72 · Woman icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-womanface.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Woman button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a split face: left half a person, right half the same person with winged eyeliner, fuller lips and a slimmer jaw. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R73 · Thinner icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-thinner.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Thinner button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's head and shoulders squeezed narrow from both sides, two arrows pressing inward. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R74 · Fatter icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-fatter.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Fatter button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's head and shoulders stretched wide sideways, two arrows pulling outward. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R75 · Baby icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-baby.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Baby button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a split face: left half a person, right half the same person as a baby, with a big round head, fat cheeks, large eyes, a tiny button nose and smooth skin. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R76 · Hoops icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-hoops.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Hoops card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a hand flicking a basketball up towards a hoop with a glass backboard, a faint ghost ball in another colour following. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R77 · Flappy Face icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-flappy.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Flappy Face card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face as a round bird with small white wings, flapping through a gap between two tall pillars. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R78 · Air Hockey icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-airhockey.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Air Hockey card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a top-down air hockey table, a paddle striking the puck with speed lines towards the goal. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R79 · Connect Four icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-connect4.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Connect Four card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a blue Connect Four grid with red and yellow discs, the last disc dropping in to make four in a row. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R80 · Quick Draw icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-quickdraw.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Quick Draw card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: two cowboy silhouettes facing off on a dusty street at sunset, one already drawing. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R82 · Copy Cat icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-copycat.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Copy Cat card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: two faces side by side pulling the same silly expression, tongue out and one eye shut. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R83 · Rock Paper Scissors icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-rps.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Rock Paper Scissors card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: three hands thrown at once in a circle: a fist, a flat hand and a V for scissors. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R84 · Doodle Guess icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-doodle.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Doodle Guess card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a hand-drawn marker sketch of a cat on a whiteboard with a speech bubble guessing with a question mark. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R85 · Memory Match icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-memory.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Memory Match card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a grid of face-down cards with two flipped face-up showing the same effect picture. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R86 · Mini Golf icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-minigolf.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Mini Golf card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a golf ball rolling across bright turf towards a flag in the hole, a dashed aiming line behind it. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R87 · Bowling icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-bowling.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Bowling card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a bowling ball curving down a lane and smashing into white pins mid-strike. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R88 · Beach Bump icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-beachbump.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Beach Bump card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a beach ball bouncing off a person's forehead as they nod, motion lines and a sunny beach behind. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R89 · Burger Stack icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-burger.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Burger Stack card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a tall wobbly burger tower being caught on a bun, a lettuce leaf falling in and a boot to dodge. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R90 · Asteroid Dodge icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-asteroids.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Asteroid Dodge card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a small rocket weaving between tumbling asteroids in space, a gold star to grab. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R92 · Snake icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-snake.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Snake card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: two neon snakes of different colours racing across a dark grid towards a glowing apple. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R93 · Battleship icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-battleship.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Battleship card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a top-down grid of sea with a grey battleship and a red explosion hit marker on it. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R94 · Trivia icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-trivia.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Trivia card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a quiz-show buzzer being slammed with four coloured answer panels behind it. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R95 · Word Blitz icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-wordblitz.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Word Blitz card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a 4x4 grid of letter tiles with a glowing path swiped through them spelling a word. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
```

### CH-R96 · Go Fish icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-gofish.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Go Fish card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Edit attached CLASSICAL theme Games Chat Go Fish icon. Preserve the Rococo painting, young aristocratic fisherman, pond, pastelpalette, rounded square ornate gilt frame and transparent outside. Critical change: he is lifting a PLAYING CARD from the pond, not a loose giant animal. Place the existing red Anomalocaris as a PAINTED PICTURE inside one clearly visible tall cream playing-card rectangle with softly rounded corners and slim gold rim, slightly tilted in the right half. All parts of the red creature entirely inside cardedges. Fishing hook attaches to top cardedge. Splash below the card. Card occupies roughly30% canvaswidth. No numbers or lettering. Readable at48px as fishing for a card. Preserve originalpaintedstyle, no glossycartoon.
```

### CH-R97 · Baseball icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-baseball.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Baseball card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a baseball flying off a swinging bat with motion lines, in front of a stadium. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
Production canvas: 256 x 256. Single app icon tile. Actual transparent alpha strictly outside rounded tile, no exterior glow. Keep all scene elements neatly contained inside tile. Use drawn illustration, not photorealism.
```

### CH-R98 · Mob Whack icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-whack.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Mob Whack card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a blocky hammer about to whack a blocky green zombie popping out of a hole, with a creeper peeking from another hole. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
Production canvas: 256 x 256. Single app icon tile. Actual transparent alpha strictly outside rounded tile, no exterior glow. Keep all scene elements neatly contained inside tile. Use drawn illustration, not photorealism.
```

### CH-R99 · Kart Dash icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-kart.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Kart Dash card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a cartoon go-kart drifting round a bend with sparks, a rainbow star and a banana peel flying. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
Production canvas: 256 x 256. Single app icon tile. Actual transparent alpha strictly outside rounded tile, no exterior glow. Keep all scene elements neatly contained inside tile. Use drawn illustration, not photorealism.
```

### CH-R100 · Block Drop icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-blocks.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Block Drop card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: colourful falling square-block puzzle pieces stacking into neat rows, one row flashing as it clears. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
Single square app icon. Keep the requested game scene contained inside its rounded-square theme tile. Genuine transparent alpha outside tile, no exterior glow. No text or additional interface.
```

### CH-R101 · Temple Dash icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-temple.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Temple Dash card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: an explorer running away down a jungle temple path past a carved stone arch, gold coins ahead and monkeys chasing behind. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
Single square app icon. Keep the requested game scene contained inside its rounded-square theme tile. Genuine transparent alpha outside tile, no exterior glow. No text or additional interface.
```

### CH-R102 · Mouth Eyes icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-moutheyes.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Mouth Eyes button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face, where both eyes have been replaced by copies of its own mouth, so it has three identical open smiling mouths, two where the eyes should be and one in the usual place. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
Single 256x256 square app icon. Keep scene contained within its rounded-square theme badge; actual transparent alpha outside badge, no outer glow. The specific face distortion is the whole subject, no extra characters or interface. Exactly three identical smiling mouths: two horizontal mouths replace the eyes; third is the normal mouth. Zero eyeballs, zero normal eyes.
```

### CH-R103 · Huge Features icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-fx-hugefeatures.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Huge Features button on the effect strips in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** delivered

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a person's face whose own eyes and mouth have been cut out and pasted back enormous: two giant eyes and a giant mouth so wide they stick out past both sides of the head, on a normal-sized face. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
Single 256x256 square app icon. Keep scene contained within its rounded-square theme badge; actual transparent alpha outside badge, no outer glow. The specific face distortion is the whole subject, no extra characters or interface. Normal-sized head with two visibly oversized pasted-on eyes and one hugely enlarged smiling mouth extending laterally beyond the face outline; humorous clean collage distortion.
```

### CH-R104 · Aquarium icon (Classical theme)

- **File:** `chat/assets/icons-classic/classic-game-aquarium.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Aquarium card in the game picker in the Classical theme.
- **Stand-in until delivered:** The Teen icon, then the Kid icon, then the emoji.
- **Status:** requested

```text
Lavish 18th-century French Rococo painting in the manner of Fragonard and Boucher: a soft pastel palette of powder blue, rose, cream and mint with burnished gold, delicate brushwork and glowing glazed light, powdered wigs, silks, lace, ribbons and the odd cherub where they fit, opulent but light-hearted and playful. Painted, not photographic. No text, no watermark. Icon: a bright fish tank with a clownfish, a pufferfish, a school of neon tetras and a little shark, food flakes sprinkling down from the top. Square icon: the painting fills a rounded-square tile (corner radius about 22%) edged by a slim ornate carved gilt frame, the scene filling about 85% of the 256 x 256 frame, the same frame for every icon in the set. Readable at 48 px: one clear idea, not too much detail. Transparent outside the frame (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the frame.
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

### CH-K97 · Go Fish icon (second set)

- **File:** `chat/assets/icons2/game2-gofish.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Go Fish card in the game picker, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen on a jetty casting a fishing line into a glowing pond, a playing card with a red Anomalocaris flying up out of the water on the hook. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```

### CH-K98 · Baseball icon (second set)

- **File:** `chat/assets/icons2/game2-baseball.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Baseball card in the game picker, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen playing it: a baseball flying off a swinging bat with motion lines, in front of a stadium. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
Production canvas: 256 x 256. Single app icon tile. Actual transparent alpha strictly outside rounded tile, no exterior glow. Keep all scene elements neatly contained inside tile. Use drawn illustration, not photorealism.
```

### CH-K99 · Mob Whack icon (second set)

- **File:** `chat/assets/icons2/game2-whack.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Mob Whack card in the game picker, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen playing it: a blocky hammer about to whack a blocky green zombie popping out of a hole, with a creeper peeking from another hole. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
Production canvas: 256 x 256. Single app icon tile. Actual transparent alpha strictly outside rounded tile, no exterior glow. Keep all scene elements neatly contained inside tile. Use drawn illustration, not photorealism.
```

### CH-K100 · Kart Dash icon (second set)

- **File:** `chat/assets/icons2/game2-kart.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Kart Dash card in the game picker, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen playing it: a cartoon go-kart drifting round a bend with sparks, a rainbow star and a banana peel flying. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
Production canvas: 256 x 256. Single app icon tile. Actual transparent alpha strictly outside rounded tile, no exterior glow. Keep all scene elements neatly contained inside tile. Use drawn illustration, not photorealism.
```

### CH-K101 · Block Drop icon (second set)

- **File:** `chat/assets/icons2/game2-blocks.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Block Drop card in the game picker, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen playing it: colourful falling square-block puzzle pieces stacking into neat rows, one row flashing as it clears. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
Single square app icon. Keep the requested game scene contained inside its rounded-square theme tile. Genuine transparent alpha outside tile, no exterior glow. No text or additional interface.
```

### CH-K102 · Temple Dash icon (second set)

- **File:** `chat/assets/icons2/game2-temple.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Temple Dash card in the game picker, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen playing it: an explorer running away down a jungle temple path past a carved stone arch, gold coins ahead and monkeys chasing behind. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
Single square app icon. Keep the requested game scene contained inside its rounded-square theme tile. Genuine transparent alpha outside tile, no exterior glow. No text or additional interface.
```

### CH-K103 · Mouth Eyes icon (second set)

- **File:** `chat/assets/icons2/fx2-moutheyes.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Mouth Eyes button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
RENDERING REQUIREMENT: Drawn 2D vector-style editorial illustration, large clean flat colour planes, crisp geometric shapes, simplified clumped hair, smooth stylised skin, subtle neon edge accents. Absolutely no photographic textures, skin pores, individual hair strands, realistic teeth or 3D render. Natural older-teen head proportions except requested distortion.
Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen's face, where both eyes have been replaced by copies of its own mouth, so it has three identical open smiling mouths, two where the eyes should be and one in the usual place. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
Single dark charcoal-to-indigo rounded-square tile, transparent alpha strictly outside. Exactly THREE identical open smiling mouths, two replacing the eyes, one in normal mouth position. No eyes.
```

### CH-K104 · Huge Features icon (second set)

- **File:** `chat/assets/icons2/fx2-hugefeatures.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Huge Features button on the effect strips, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** delivered

```text
RENDERING REQUIREMENT: Drawn 2D vector-style editorial illustration, large clean flat colour planes, crisp geometric shapes, simplified clumped hair, smooth stylised skin, subtle neon edge accents. Absolutely no photographic textures, skin pores, individual hair strands, realistic teeth or 3D render. Natural older-teen head proportions except requested distortion.
Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen's face whose own eyes and mouth have been cut out and pasted back enormous: two giant eyes and a giant mouth so wide they stick out past both sides of the head, on a normal-sized face. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
Single dark charcoal-to-indigo rounded-square tile, transparent alpha strictly outside. Two huge pasted-on drawn eyes and a huge smiling mouth extending past both sides of a normal-sized illustrated head. Exaggerated cutout effect.
```

### CH-K105 · Aquarium icon (second set)

- **File:** `chat/assets/icons2/game2-aquarium.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Aquarium card in the game picker, replacing the first-set icon.
- **Stand-in until delivered:** The first-set icon, or the emoji.
- **Status:** requested

```text
Sleek modern app-icon illustration for a video-chat app used by teenagers and young adults, in the confident graphic style of a polished social or music app: crisp vector shapes, subtle gradients and a soft glow, rich deep colours with one or two neon accents, clean thin outlines or none. Fun, with a little attitude and humour, but nothing babyish: no chibi proportions, no giant baby eyes, no cutesy blush, no candy-sticker gloss. People are stylish older-teen characters with natural proportions and varied looks. The picture must show what the effect or game actually does, so someone can tell what they will get before tapping it. No text, no watermark, no photorealism. Icon: a teen's hand dropping a fish into bright fish tank with a clownfish, a pufferfish, a school of neon tetras and a little shark, food flakes sprinkling down from the top. Square icon: the scene fills about 85% of the 256 x 256 frame on a dark charcoal-to-indigo rounded-square tile (corner radius about 22%), the same backing for every icon in the set, with one accent colour picked for the subject. Readable at 48 px: one clear idea, big shapes, no tiny detail. Transparent outside the rounded tile (PNG with alpha); if that is not possible, flat pure magenta #FF00FF outside the tile.
```
