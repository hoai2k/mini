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

153 requested, 153 in total.

## Brand

The title screen and the browser tab.

### CH-U01 · Title logo

- **File:** `chat/assets/ui/logo.png`
- **Size:** 1600 x 800, transparent
- **Used for:** The title screen logo above Press Start, and the card on the game library page.
- **Stand-in until delivered:** The words in the page's rounded font with a gradient in the player's colour.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No other text, no watermark, no photorealism. A bold, playful video-game logo reading "Games Chat" on two lines: "GAMES" large on top and "CHAT" slightly smaller beneath it. Chunky rounded 3D letters with a thick dark-purple outline, a bright top highlight and a soft inner gradient: GAMES in hot pink to sunny yellow, CHAT in aqua to sky blue. The O-shaped counter of the A in GAMES is replaced by a small game controller, and CHAT sits inside a rounded speech bubble whose tail points down-left. A few sparkles, a see-through soap bubble and a tiny basketball float around the edges. Spell it exactly: Games Chat. Centred, slight upward tilt, wide landscape composition with even margins. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-U02 · Title background

- **File:** `chat/assets/ui/title-bg.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Behind the title screen and the join form.
- **Stand-in until delivered:** A CSS gradient with drifting canvas bubbles.
- **Status:** requested

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A dreamy pastel sky full of floating translucent iridescent bubbles of many sizes, some holding tiny reflections of smiling faces, soft lilac to aqua gradient, lots of calm empty space in the middle third for the logo and buttons. Full-bleed background, no border.
```

### CH-U03 · App icon and favicon

- **File:** `chat/assets/ui/icon.png`
- **Size:** 512 x 512, transparent
- **Used for:** The browser tab icon and the card on the game library page.
- **Stand-in until delivered:** An emoji favicon.
- **Status:** requested

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
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Two floppy brown-and-cream puppy ears hanging from the top of the head on either side, and a shiny black puppy nose centred on the nose tip. Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F02 · Puppy tongue

- **File:** `chat/assets/fx/puppy-tongue.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Puppy: drops out when you open your mouth.
- **Stand-in until delivered:** A canvas-drawn tongue.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A long pink cartoon puppy tongue with a centre crease, its top edge at the mouth centre (512, 740), hanging straight down to about y = 960. Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F03 · Alien antennae

- **File:** `chat/assets/fx/alien-antennae.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Alien: two wobbly antennae on top of the head (the app also tints the face green and enlarges the eyes).
- **Stand-in until delivered:** Canvas-drawn antennae.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Two springy lime-green alien antennae with glowing magenta ball tips, rising from the top of the head at about x = 420 and x = 604 and curving outwards to the top corners. Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F04 · Heart

- **File:** `chat/assets/fx/heart.png`
- **Size:** 256 x 256, transparent
- **Used for:** Heart Eyes: covers each eye and floats up when you smile. Memory Match uses it too.
- **Stand-in until delivered:** A canvas-drawn heart.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. One plump glossy red cartoon heart, centred, filling the frame. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F05 · Pixel sunglasses

- **File:** `chat/assets/fx/sunglasses.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Deal With It: the glasses drop onto your eyes when you smile.
- **Stand-in until delivered:** Canvas-drawn pixel glasses.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Black 8-bit pixel-art "deal with it" sunglasses with white pixel glints, the lenses centred on the two eyes and the bar across the brow line. Crisp square pixels. Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F06 · Crown

- **File:** `chat/assets/fx/crown.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Royalty: a crown on top of the head.
- **Stand-in until delivered:** A canvas-drawn crown.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A jewelled golden cartoon crown with five points and red, blue and green gems, its base band sitting on the top of the head at y = 220 and the points rising to about y = 20. Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F07 · Handlebar mustache

- **File:** `chat/assets/fx/mustache.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Fancy: a mustache between nose and mouth.
- **Stand-in until delivered:** A canvas-drawn mustache.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A grand dark-brown curly handlebar mustache centred at (512, 692), between the nose tip and the mouth, the curls reaching out to about x = 300 and x = 724. Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F08 · Monocle

- **File:** `chat/assets/fx/monocle.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Fancy: a monocle that pops off when you raise your eyebrows.
- **Stand-in until delivered:** A canvas-drawn monocle.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A gold-rimmed monocle with a glassy highlight, its ring centred on the image-right eye (632, 520) with a radius of about 80 px, and a thin gold chain hanging down to (700, 900). Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F09 · Clown wig and nose

- **File:** `chat/assets/fx/clown.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Clown: a rainbow afro and a red nose.
- **Stand-in until delivered:** A canvas-drawn wig and nose.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A big curly rainbow clown afro covering the top and sides of the head (from y = 60 down to about y = 560 at the sides, leaving the face open), and a shiny round red clown nose centred on the nose tip. Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F10 · Dragon horns

- **File:** `chat/assets/fx/dragon-horns.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Dragon: horns on the head; open your mouth to breathe fire.
- **Stand-in until delivered:** Canvas-drawn horns.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Two curved ivory-and-orange dragon horns rising from the top of the head at about x = 400 and x = 624, sweeping back and outwards, with small scaly ridges. Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F11 · Storm cloud

- **File:** `chat/assets/fx/storm-cloud.png`
- **Size:** 768 x 384, transparent
- **Used for:** Storm Cloud: a little rain cloud that follows your head.
- **Stand-in until delivered:** A canvas-drawn cloud.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A fluffy dark-grey cartoon rain cloud with a grumpy face, slightly flat on the bottom, centred and filling the frame. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F12 · Lightning bolt

- **File:** `chat/assets/fx/lightning.png`
- **Size:** 256 x 512, transparent
- **Used for:** Storm Cloud: strikes when you frown.
- **Stand-in until delivered:** A canvas-drawn bolt.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. One zig-zag cartoon lightning bolt in electric yellow with a white core, top at the top centre, tip at the bottom centre. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F13 · Fish 1

- **File:** `chat/assets/fx/fish-1.png`
- **Size:** 384 x 256, transparent
- **Used for:** Under the Sea: swims across your video.
- **Stand-in until delivered:** A canvas-drawn fish.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A round orange-and-white clownfish swimming to the right, side view, centred. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F14 · Fish 2

- **File:** `chat/assets/fx/fish-2.png`
- **Size:** 384 x 256, transparent
- **Used for:** Under the Sea: swims across your video.
- **Stand-in until delivered:** A canvas-drawn fish.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A slim electric-blue tang fish with a yellow tail swimming to the right, side view, centred. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F15 · Fish 3

- **File:** `chat/assets/fx/fish-3.png`
- **Size:** 384 x 256, transparent
- **Used for:** Under the Sea: swims across your video.
- **Stand-in until delivered:** A canvas-drawn fish.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A puffy spotted yellow pufferfish swimming to the right, side view, centred. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F16 · Outer space backdrop

- **File:** `chat/assets/fx/space.webp`
- **Size:** 1280 x 720, opaque
- **Used for:** Outer Space: replaces the room behind you.
- **Stand-in until delivered:** A canvas-drawn starfield with a planet.
- **Status:** requested

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A cheerful cartoon outer-space scene: deep violet space, scattered stars, a ringed pink planet in the upper left, a small smiling moon on the right and a distant rocket. Keep the centre darker and calmer, since a person sits in front of it. Full-bleed, no border.
```

### CH-F17 · Flower crown

- **File:** `chat/assets/fx/flower-crown.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Flower Crown: a ring of flowers on the head.
- **Stand-in until delivered:** Canvas-drawn flowers.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A lush crown of pink peonies, white daisies, small yellow roses and green leaves, resting across the top of the head from about (300, 300) over (512, 220) to (724, 300), slightly curved like a band seen from the front. Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F18 · Kitty ears, nose and whiskers

- **File:** `chat/assets/fx/kitty.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Kitty: cat ears, a pink nose and whiskers.
- **Stand-in until delivered:** Canvas-drawn ears, nose and whiskers.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Two pointed fluffy cat ears (grey tabby with pink insides) on top of the head at about x = 360 and x = 664, a small pink triangular cat nose on the nose tip, and three thin white whiskers fanning out on each cheek from beside the nose. Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F19 · Bunny ears and nose

- **File:** `chat/assets/fx/bunny.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Bunny: tall bunny ears and a twitchy nose.
- **Stand-in until delivered:** Canvas-drawn ears and nose.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Two tall upright white bunny ears with pink insides rising from the top of the head (bases at about x = 420 and x = 604, tips reaching y = 0), one slightly bent, and a small pink bunny nose on the nose tip. Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F20 · Devil horns

- **File:** `chat/assets/fx/devil.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Devil: little red horns.
- **Stand-in until delivered:** Canvas-drawn horns.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Two small glossy red devil horns curving up from the top of the head at about x = 400 and x = 624, with a faint orange glow. Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F21 · Angel halo

- **File:** `chat/assets/fx/halo.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Angel: a glowing halo floating above the head.
- **Stand-in until delivered:** A canvas-drawn halo.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A glowing golden halo ring seen slightly from the front, floating above the head centred at (512, 140), about 360 px wide, with a soft warm glow. Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F22 · Pirate hat and eyepatch

- **File:** `chat/assets/fx/pirate.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Pirate: a tricorn hat and an eyepatch.
- **Stand-in until delivered:** A canvas-drawn hat and patch.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A black pirate tricorn hat with gold trim and a small white skull, sitting on the top of the head (brim at y = 240), and a black eyepatch over the image-left eye (392, 520) with its strap running diagonally across the forehead. Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F23 · Viking helmet

- **File:** `chat/assets/fx/viking.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Viking: a horned helmet.
- **Stand-in until delivered:** A canvas-drawn helmet.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A round iron Viking helmet with riveted bands and two big curved ivory horns, the rim sitting on the forehead at about y = 330, covering the top of the head. Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F24 · Wizard hat

- **File:** `chat/assets/fx/wizard-hat.png`
- **Size:** 1024 x 1024, transparent, **face template**
- **Used for:** Wizard: a tall starry hat.
- **Stand-in until delivered:** A canvas-drawn hat.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A tall, slightly bent deep-blue wizard hat covered in small gold stars and moons, its wide brim sitting on the top of the head at y = 260 and the tip reaching the top edge. Draw it on the face template (`chat/design/face-template.png`): a 1024 x 1024 canvas for a head looking straight at the camera, eye centres at (392, 520) and (632, 520), nose tip at (512, 640), mouth centre at (512, 740), chin at (512, 880) and top of head at (512, 220). Only the sticker is drawn: no face, no head, no skin. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F25 · Butterfly

- **File:** `chat/assets/fx/butterfly.png`
- **Size:** 256 x 256, transparent
- **Used for:** Butterflies: they flutter around your head and land on it.
- **Stand-in until delivered:** A canvas-drawn butterfly.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. One bright blue-and-pink butterfly seen from above with wings spread, centred. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F26 · Dancing hotdog

- **File:** `chat/assets/fx/hotdog.png`
- **Size:** 512 x 768, transparent
- **Used for:** Hotdog: a dancing hotdog bops beside you.
- **Stand-in until delivered:** A canvas-drawn hotdog.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A cheerful cartoon hotdog character standing upright, with a mustard squiggle, little arms and legs mid-dance, big eyes and a wide grin, full body, centred. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F27 · Banknote

- **File:** `chat/assets/fx/money.png`
- **Size:** 256 x 128, transparent
- **Used for:** Make It Rain: notes falling all around you.
- **Stand-in until delivered:** A canvas-drawn note.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. One cartoon green banknote with a smiling bubble in the centre oval instead of a portrait, slightly curled, filling the frame. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-F28 · Sunset backdrop

- **File:** `chat/assets/fx/sunset.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Sunset: the room behind you becomes a glowing sunset, and you become a silhouette.
- **Stand-in until delivered:** A canvas-drawn sunset gradient.
- **Status:** requested

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
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A classic orange basketball with black seams, seen straight on, centred, filling the frame. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G02 · Hoop and backboard

- **File:** `chat/assets/games/hoop.png`
- **Size:** 1024 x 1024, transparent
- **Used for:** Hoops: the target. The game's rim physics assume this layout.
- **Stand-in until delivered:** A canvas-drawn backboard, rim and net.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A basketball hoop seen straight on: a white backboard with a red square, an orange rim seen slightly from below whose front edge runs from (352, 640) to (672, 640), and a white net hanging below the rim to about y = 900. The backboard spans roughly x = 192 to 832 and y = 220 to 700. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G03 · Gym background

- **File:** `chat/assets/games/court.webp`
- **Size:** 1600 x 1200, opaque
- **Used for:** Hoops: behind the hoop.
- **Stand-in until delivered:** A canvas-drawn wall and floor.
- **Status:** requested

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A bright cartoon school gym: polished wooden floor in the bottom quarter, padded blue walls, a row of high windows with sunlight, bleachers at the sides. Plain and slightly blurred in the upper middle, where the hoop is drawn. Full-bleed, no border.
```

### CH-G04 · Flappy sky

- **File:** `chat/assets/games/flappy-sky.webp`
- **Size:** 1920 x 1080, opaque
- **Used for:** Flappy Face: the scrolling background.
- **Stand-in until delivered:** A canvas-drawn sky and hills.
- **Status:** requested

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A cheerful cartoon sky with puffy clouds and a low line of green hills and a little town along the bottom. Seamless horizontally: the left and right edges must join with no seam.
```

### CH-G05 · Flappy pillar

- **File:** `chat/assets/games/flappy-pipe.png`
- **Size:** 256 x 1024, transparent
- **Used for:** Flappy Face: the obstacles (the game flips it for the pillars hanging from the top).
- **Stand-in until delivered:** Canvas-drawn pillars.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A tall candy-striped pillar with a wider cap at the top, standing upright, filling the frame, the shaft able to repeat vertically. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G06 · Wings

- **File:** `chat/assets/games/wings.png`
- **Size:** 768 x 384, transparent
- **Used for:** Flappy Face: a pair of wings either side of your face, which is the bird.
- **Stand-in until delivered:** Canvas-drawn wings.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A pair of fluffy white cartoon bird wings spread out to the left and right, with an empty round gap about 256 px wide in the middle where a face will go. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G07 · Showdown street

- **File:** `chat/assets/games/quickdraw.webp`
- **Size:** 1600 x 1000, opaque
- **Used for:** Quick Draw: the background of the duel.
- **Stand-in until delivered:** A canvas-drawn sunset gradient.
- **Status:** requested

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A cartoon Wild West main street at high noon seen down the middle: saloon and general store on either side, a tumbleweed, a big bright sun, empty dusty road in the centre. Full-bleed.
```

### CH-G08 · Rock hand

- **File:** `chat/assets/games/rps-rock.png`
- **Size:** 512 x 512, transparent
- **Used for:** Rock Paper Scissors: the rock throw.
- **Stand-in until delivered:** The ✊ emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A cartoon fist (rock) seen from the back of the hand, centred. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G09 · Paper hand

- **File:** `chat/assets/games/rps-paper.png`
- **Size:** 512 x 512, transparent
- **Used for:** Rock Paper Scissors: the paper throw.
- **Stand-in until delivered:** The ✋ emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A cartoon open flat hand (paper), palm facing the viewer, centred. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G10 · Scissors hand

- **File:** `chat/assets/games/rps-scissors.png`
- **Size:** 512 x 512, transparent
- **Used for:** Rock Paper Scissors: the scissors throw.
- **Stand-in until delivered:** The ✌️ emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A cartoon hand making a V with two fingers (scissors), centred. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G11 · Air hockey table

- **File:** `chat/assets/games/airhockey-table.webp`
- **Size:** 1000 x 1600, opaque
- **Used for:** Air Hockey: the table, seen from above, portrait.
- **Stand-in until delivered:** A canvas-drawn table.
- **Status:** requested

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A glossy arcade air-hockey table seen from directly above: icy white-blue surface with tiny air holes, a red centre line and centre circle, goal slots at the top and bottom centre about 36% of the width, and a neon rim along all four edges. Flat top-down view, no perspective, full-bleed.
```

### CH-G12 · Card back

- **File:** `chat/assets/games/card-back.png`
- **Size:** 512 x 704, transparent
- **Used for:** Memory Match: the face-down cards.
- **Stand-in until delivered:** A CSS pattern.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. The back of a playing card with rounded corners: a bright aqua and pink bubble pattern with a small bubble logo in the middle, symmetrical. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G13 · Mini golf turf

- **File:** `chat/assets/games/golf-grass.webp`
- **Size:** 512 x 512, opaque
- **Used for:** Mini Golf: the putting surface (tiled).
- **Stand-in until delivered:** A canvas-drawn striped green.
- **Status:** requested

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. Top-down bright green artificial putting turf with a fine mown stripe pattern, seamlessly tileable on all four edges, no objects.
```

### CH-G14 · Bowling lane

- **File:** `chat/assets/games/bowling-lane.webp`
- **Size:** 1080 x 1920, opaque
- **Used for:** Bowling: the lane, seen from behind the bowler looking down it.
- **Stand-in until delivered:** A canvas-drawn lane.
- **Status:** requested

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A glossy wooden bowling lane in perspective from the bowler's end, gutters on both sides, arrows on the boards, the pin deck lit at the far end near the top centre, neon bowling alley walls. Leave the pin deck empty: the game draws the pins.
```

### CH-G15 · Bowling pin

- **File:** `chat/assets/games/bowling-pin.png`
- **Size:** 128 x 384, transparent
- **Used for:** Bowling: each pin.
- **Stand-in until delivered:** A canvas-drawn pin.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. One classic white bowling pin with two red stripes around the neck, upright, centred. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G16 · Top bun

- **File:** `chat/assets/games/burger-bun-top.png`
- **Size:** 512 x 192, transparent
- **Used for:** Burger Stack: an ingredient that falls and stacks.
- **Stand-in until delivered:** A canvas-drawn ingredient.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Side view of a domed sesame-seed top bun, filling the width, as part of a stacked cartoon burger. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G17 · Bottom bun

- **File:** `chat/assets/games/burger-bun-bottom.png`
- **Size:** 512 x 192, transparent
- **Used for:** Burger Stack: an ingredient that falls and stacks.
- **Stand-in until delivered:** A canvas-drawn ingredient.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Side view of a flat bottom bun, filling the width, as part of a stacked cartoon burger. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G18 · Patty

- **File:** `chat/assets/games/burger-patty.png`
- **Size:** 512 x 192, transparent
- **Used for:** Burger Stack: an ingredient that falls and stacks.
- **Stand-in until delivered:** A canvas-drawn ingredient.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Side view of a juicy grilled beef patty with grill marks, filling the width, as part of a stacked cartoon burger. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G19 · Cheese

- **File:** `chat/assets/games/burger-cheese.png`
- **Size:** 512 x 192, transparent
- **Used for:** Burger Stack: an ingredient that falls and stacks.
- **Stand-in until delivered:** A canvas-drawn ingredient.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Side view of a slice of melting yellow cheese with drips over the edges, filling the width, as part of a stacked cartoon burger. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G20 · Lettuce

- **File:** `chat/assets/games/burger-lettuce.png`
- **Size:** 512 x 192, transparent
- **Used for:** Burger Stack: an ingredient that falls and stacks.
- **Stand-in until delivered:** A canvas-drawn ingredient.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Side view of a frilly green lettuce leaf, filling the width, as part of a stacked cartoon burger. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G21 · Tomato

- **File:** `chat/assets/games/burger-tomato.png`
- **Size:** 512 x 192, transparent
- **Used for:** Burger Stack: an ingredient that falls and stacks.
- **Stand-in until delivered:** A canvas-drawn ingredient.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Side view of two red tomato slices side by side, filling the width, as part of a stacked cartoon burger. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G22 · Asteroid

- **File:** `chat/assets/games/asteroid.png`
- **Size:** 256 x 256, transparent
- **Used for:** Asteroid Dodge: the rocks to dodge.
- **Stand-in until delivered:** A canvas-drawn rock.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. One lumpy grey-brown cartoon asteroid with craters, centred. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G23 · Rocket ship

- **File:** `chat/assets/games/rocket.png`
- **Size:** 256 x 256, transparent
- **Used for:** Asteroid Dodge: your ship, which wears your face in its window.
- **Stand-in until delivered:** A canvas-drawn rocket.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A chunky cartoon rocket ship pointing up, red and white with fins and a flame, and a big empty round porthole window in the middle (the app shows your face there). Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-G24 · Beach ball

- **File:** `chat/assets/games/beach-ball.png`
- **Size:** 256 x 256, transparent
- **Used for:** Beach Bump: the ball you bump between friends.
- **Stand-in until delivered:** A canvas-drawn beach ball.
- **Status:** requested

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
- **Status:** requested

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A 360-degree equirectangular panorama of a tropical beach: turquoise sea, white sand, palm trees, a beach hut, a striped umbrella and a few seagulls, bright midday sky. Cartoon style, rich colour, everything drawn as seen from a person standing in the middle.
```

### CH-W02 · Space station panorama

- **File:** `chat/assets/worlds/world-space.webp`
- **Size:** 4096 x 2048, opaque
- **Used for:** Space station 360: the world behind you that you look around by tilting the phone.
- **Stand-in until delivered:** A canvas-drawn panorama with a sky, a horizon and a few shapes.
- **Status:** requested

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A 360-degree equirectangular panorama of inside a cosy cartoon space station with round windows looking out at Earth and the Moon, glowing control panels and floating snacks. Cartoon style, rich colour, everything drawn as seen from a person standing in the middle.
```

### CH-W03 · Coral reef panorama

- **File:** `chat/assets/worlds/world-reef.webp`
- **Size:** 4096 x 2048, opaque
- **Used for:** Coral reef 360: the world behind you that you look around by tilting the phone.
- **Stand-in until delivered:** A canvas-drawn panorama with a sky, a horizon and a few shapes.
- **Status:** requested

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A 360-degree equirectangular panorama of underwater on a colourful coral reef: sunbeams from above, fish schools, a turtle, kelp and pink and orange corals all around. Cartoon style, rich colour, everything drawn as seen from a person standing in the middle.
```

### CH-W04 · Enchanted forest panorama

- **File:** `chat/assets/worlds/world-forest.webp`
- **Size:** 4096 x 2048, opaque
- **Used for:** Enchanted forest 360: the world behind you that you look around by tilting the phone.
- **Stand-in until delivered:** A canvas-drawn panorama with a sky, a horizon and a few shapes.
- **Status:** requested

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A 360-degree equirectangular panorama of a glowing enchanted forest at dusk: giant mushrooms, fireflies, mossy trees and a winding path. Cartoon style, rich colour, everything drawn as seen from a person standing in the middle.
```

### CH-W05 · City rooftop panorama

- **File:** `chat/assets/worlds/world-city.webp`
- **Size:** 4096 x 2048, opaque
- **Used for:** City rooftop 360: the world behind you that you look around by tilting the phone.
- **Stand-in until delivered:** A canvas-drawn panorama with a sky, a horizon and a few shapes.
- **Status:** requested

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A 360-degree equirectangular panorama of a city rooftop at night: neon skyscrapers all around, string lights, a water tower and a starry sky. Cartoon style, rich colour, everything drawn as seen from a person standing in the middle.
```

### CH-W06 · Snowy mountains panorama

- **File:** `chat/assets/worlds/world-snow.webp`
- **Size:** 4096 x 2048, opaque
- **Used for:** Snowy mountains 360: the world behind you that you look around by tilting the phone.
- **Stand-in until delivered:** A canvas-drawn panorama with a sky, a horizon and a few shapes.
- **Status:** requested

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A 360-degree equirectangular panorama of a snowy mountain top: peaks in every direction, a cosy cabin, pine trees and a pink alpenglow sky. Cartoon style, rich colour, everything drawn as seen from a person standing in the middle.
```

### CH-W07 · Candy land panorama

- **File:** `chat/assets/worlds/world-candy.webp`
- **Size:** 4096 x 2048, opaque
- **Used for:** Candy land 360: the world behind you that you look around by tilting the phone.
- **Stand-in until delivered:** A canvas-drawn panorama with a sky, a horizon and a few shapes.
- **Status:** requested

```text
Bright glossy cartoon illustration for a playful video-chat app. Clean shapes, soft outlines, saturated candy colours, gentle cel shading, friendly and silly. No text, no watermark, no photorealism. A 360-degree equirectangular panorama of a candy land: lollipop trees, a chocolate river, gumdrop hills and candy-cane fences under a pastel sky. Cartoon style, rich colour, everything drawn as seen from a person standing in the middle.
```

### CH-W08 · Volcano island panorama

- **File:** `chat/assets/worlds/world-volcano.webp`
- **Size:** 4096 x 2048, opaque
- **Used for:** Volcano island 360: the world behind you that you look around by tilting the phone.
- **Stand-in until delivered:** A canvas-drawn panorama with a sky, a horizon and a few shapes.
- **Status:** requested

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
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of puckered cartoon lips blowing a big translucent iridescent bubble. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I02 · Big Eyes icon

- **File:** `chat/assets/icons/fx-bigeyes.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Big Eyes button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a cartoon face with huge sparkly anime eyes. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I03 · Bobblehead icon

- **File:** `chat/assets/icons/fx-bobblehead.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Bobblehead button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a bobblehead figure with a giant head on a tiny body on a spring. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I04 · Noodle Face icon

- **File:** `chat/assets/icons/fx-noodle.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Noodle Face button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a cartoon face stretched tall and thin like a funhouse mirror. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I05 · Swirl icon

- **File:** `chat/assets/icons/fx-swirl.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Swirl button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a cartoon face twisted into a colourful spiral. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I06 · 8-Bit icon

- **File:** `chat/assets/icons/fx-pixel.png`
- **Size:** 256 x 256, transparent
- **Used for:** The 8-Bit button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a pixel-art smiley face made of big square pixels. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I07 · Comic Book icon

- **File:** `chat/assets/icons/fx-comic.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Comic Book button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a comic-book face with halftone dots and a POW burst. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I08 · Heat Vision icon

- **File:** `chat/assets/icons/fx-thermal.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Heat Vision button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a face shown as a thermal camera image, blue to red to yellow. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I09 · Outer Space icon

- **File:** `chat/assets/icons/fx-space.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Outer Space button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of an astronaut helmet in front of a ringed planet and stars. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I10 · Under the Sea icon

- **File:** `chat/assets/icons/fx-underwater.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Under the Sea button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a clownfish among bubbles in blue water. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I11 · Puppy icon

- **File:** `chat/assets/icons/fx-puppy.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Puppy button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a cute puppy face with floppy ears and its tongue out. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I12 · Alien icon

- **File:** `chat/assets/icons/fx-alien.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Alien button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a green alien face with big black eyes and antennae. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I13 · Heart Eyes icon

- **File:** `chat/assets/icons/fx-hearteyes.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Heart Eyes button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a smiley face with red hearts for eyes. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I14 · Deal With It icon

- **File:** `chat/assets/icons/fx-dealwithit.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Deal With It button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of black pixel sunglasses dropping onto a smug face. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I15 · Royalty icon

- **File:** `chat/assets/icons/fx-crown.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Royalty button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a golden jewelled crown. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I16 · Fancy icon

- **File:** `chat/assets/icons/fx-fancy.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Fancy button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a handlebar mustache and a gold monocle. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I17 · Clown icon

- **File:** `chat/assets/icons/fx-clown.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Clown button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a red clown nose and a rainbow afro. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I18 · Dragon icon

- **File:** `chat/assets/icons/fx-dragon.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Dragon button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a small dragon head breathing a puff of fire. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I19 · Rainbow Mouth icon

- **File:** `chat/assets/icons/fx-rainbow.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Rainbow Mouth button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a smiling mouth with a rainbow pouring out of it. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I20 · Storm Cloud icon

- **File:** `chat/assets/icons/fx-storm.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Storm Cloud button on the effect tray.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a grumpy grey rain cloud with a lightning bolt. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I21 · Hoops icon

- **File:** `chat/assets/icons/game-hoops.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Hoops card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a basketball swishing through an orange hoop. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I22 · Flappy Face icon

- **File:** `chat/assets/icons/game-flappy.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Flappy Face card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a smiling round face with white bird wings flapping. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I23 · Staring Contest icon

- **File:** `chat/assets/icons/game-stare.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Staring Contest card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of two wide-open cartoon eyes staring, with tiny sweat drops. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I24 · Quick Draw icon

- **File:** `chat/assets/icons/game-quickdraw.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Quick Draw card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a cowboy hat and a hand-drawn "!" speech burst. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I25 · Rock Paper Scissors icon

- **File:** `chat/assets/icons/game-rps.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Rock Paper Scissors card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a fist, an open hand and a V-sign hand in a circle. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I26 · Connect Four icon

- **File:** `chat/assets/icons/game-connect4.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Connect Four card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a blue grid with red and yellow discs in a diagonal row. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I27 · Air Hockey icon

- **File:** `chat/assets/icons/game-airhockey.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Air Hockey card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of an air hockey paddle striking a puck with speed lines. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I28 · Doodle Guess icon

- **File:** `chat/assets/icons/game-doodle.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Doodle Guess card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a pencil drawing a squiggle with a question mark. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I29 · Memory Match icon

- **File:** `chat/assets/icons/game-memory.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Memory Match card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of two face-up cards with matching hearts and one face-down card. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I30 · Copy Cat icon

- **File:** `chat/assets/icons/game-copycat.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Copy Cat card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a cartoon cat making a silly face in a mirror. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I31 · Time Trails icon

- **File:** `chat/assets/icons/fx-echo.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Time Trails button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a face leaving a rainbow trail of see-through copies. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I32 · Delay Ghost icon

- **File:** `chat/assets/icons/fx-delayghost.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Delay Ghost button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a person with a translucent ghost copy one step behind. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I33 · Time Warp icon

- **File:** `chat/assets/icons/fx-timewarp.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Time Warp button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a face stretched by a glowing blue scan line sweeping down. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I34 · Side Warp icon

- **File:** `chat/assets/icons/fx-timewarpside.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Side Warp button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a face smeared sideways by a vertical blue scan line. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I35 · Wobble Time icon

- **File:** `chat/assets/icons/fx-slitscan.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Wobble Time button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a face rippling in wavy horizontal bands. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I36 · Stop Motion icon

- **File:** `chat/assets/icons/fx-strobe.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Stop Motion button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a face in three jerky film frames. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I37 · Clones icon

- **File:** `chat/assets/icons/fx-clones.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Clones button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of three identical cartoon faces in a row. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I38 · Motion Glow icon

- **File:** `chat/assets/icons/fx-motionglow.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Motion Glow button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a waving hand leaving neon outline trails. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I39 · Beach 360 icon

- **File:** `chat/assets/icons/fx-beach360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Beach 360 button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a palm tree and a turquoise sea in a round 360 frame. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I40 · Space 360 icon

- **File:** `chat/assets/icons/fx-space360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Space 360 button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of Earth seen through a round space-station window. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I41 · Reef 360 icon

- **File:** `chat/assets/icons/fx-reef360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Reef 360 button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a coral reef with a turtle in a round frame. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I42 · Forest 360 icon

- **File:** `chat/assets/icons/fx-forest360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Forest 360 button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of glowing mushrooms in a dark forest. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I43 · City 360 icon

- **File:** `chat/assets/icons/fx-city360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The City 360 button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of neon skyscrapers at night. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I44 · Snow 360 icon

- **File:** `chat/assets/icons/fx-snow360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Snow 360 button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of snowy peaks and a cabin. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I45 · Candy 360 icon

- **File:** `chat/assets/icons/fx-candy360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Candy 360 button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of lollipop trees and gumdrop hills. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I46 · Volcano 360 icon

- **File:** `chat/assets/icons/fx-volcano360.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Volcano 360 button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of an erupting cartoon volcano. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I47 · Blur icon

- **File:** `chat/assets/icons/fx-blurbg.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Blur button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a sharp face in front of a soft blurry room. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I48 · Colour Pop icon

- **File:** `chat/assets/icons/fx-colorpop.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Colour Pop button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a colourful face against a grey room. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I49 · Neon Aura icon

- **File:** `chat/assets/icons/fx-neonaura.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Neon Aura button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a dark silhouette outlined in glowing neon pink and cyan. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I50 · Disco icon

- **File:** `chat/assets/icons/fx-disco.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Disco button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a glittering disco ball with coloured light beams. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I51 · Code Rain icon

- **File:** `chat/assets/icons/fx-matrix.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Code Rain button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of green falling code characters behind a silhouette. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I52 · Sunset icon

- **File:** `chat/assets/icons/fx-sunset.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Sunset button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a black silhouette against a huge orange sunset. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I53 · Tiny Face icon

- **File:** `chat/assets/icons/fx-tinyface.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Tiny Face button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a big head with a tiny squished face in the middle. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I54 · Chubby Cheeks icon

- **File:** `chat/assets/icons/fx-chubby.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Chubby Cheeks button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a face with huge puffed-out round cheeks. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I55 · Baby Face icon

- **File:** `chat/assets/icons/fx-babyface.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Baby Face button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a baby face with big eyes and a tiny nose. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I56 · Mirror Face icon

- **File:** `chat/assets/icons/fx-symmetry.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Mirror Face button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a face split down the middle and mirrored. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I57 · Cyclops icon

- **File:** `chat/assets/icons/fx-cyclops.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Cyclops button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a cartoon face with one huge eye in the middle. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I58 · Big Mouth icon

- **File:** `chat/assets/icons/fx-bigmouth.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Big Mouth button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a face with an enormous grinning mouth. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I59 · Fisheye icon

- **File:** `chat/assets/icons/fx-fisheye.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Fisheye button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a face bulging through a round fisheye lens. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I60 · Flower Crown icon

- **File:** `chat/assets/icons/fx-flowercrown.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Flower Crown button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a crown of pink peonies and daisies. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I61 · Kitty icon

- **File:** `chat/assets/icons/fx-kitty.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Kitty button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a cute cat face with whiskers. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I62 · Bunny icon

- **File:** `chat/assets/icons/fx-bunny.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Bunny button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a bunny face with tall ears. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I63 · Devil icon

- **File:** `chat/assets/icons/fx-devil.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Devil button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a cheeky face with little red devil horns. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I64 · Angel icon

- **File:** `chat/assets/icons/fx-angel.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Angel button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a smiling face with a golden halo. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I65 · Pirate icon

- **File:** `chat/assets/icons/fx-pirate.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Pirate button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a pirate tricorn hat and eyepatch. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I66 · Viking icon

- **File:** `chat/assets/icons/fx-viking.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Viking button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a horned Viking helmet. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I67 · Wizard icon

- **File:** `chat/assets/icons/fx-wizard.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Wizard button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a starry blue wizard hat with sparkles. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I68 · Butterflies icon

- **File:** `chat/assets/icons/fx-butterflies.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Butterflies button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of blue and pink butterflies circling a head. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I69 · Glam icon

- **File:** `chat/assets/icons/fx-makeup.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Glam button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a lipstick and a blush brush with sparkles. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I70 · Waterworks icon

- **File:** `chat/assets/icons/fx-crying.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Waterworks button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a face crying two fountains of tears. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I71 · Hotdog icon

- **File:** `chat/assets/icons/fx-hotdog.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Hotdog button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a dancing cartoon hotdog. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I72 · Film Noir icon

- **File:** `chat/assets/icons/fx-noir.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Film Noir button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a black-and-white detective hat and film grain. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I73 · VHS icon

- **File:** `chat/assets/icons/fx-vhs.png`
- **Size:** 256 x 256, transparent
- **Used for:** The VHS button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a VHS tape with rainbow glitch lines. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I74 · Pop Art icon

- **File:** `chat/assets/icons/fx-popart.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Pop Art button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of four colourful pop-art copies of a face in a grid. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I75 · Kaleidoscope icon

- **File:** `chat/assets/icons/fx-kaleidoscope.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Kaleidoscope button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a colourful kaleidoscope star pattern. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I76 · Snowfall icon

- **File:** `chat/assets/icons/fx-snow.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Snowfall button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of big snowflakes falling. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I77 · Confetti icon

- **File:** `chat/assets/icons/fx-confetti.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Confetti button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a party popper bursting confetti. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I78 · Make It Rain icon

- **File:** `chat/assets/icons/fx-moneyrain.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Make It Rain button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of green banknotes falling. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I79 · Laser Eyes icon

- **File:** `chat/assets/icons/fx-lasereyes.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Laser Eyes button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a face shooting red laser beams from its eyes. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I80 · Fireworks icon

- **File:** `chat/assets/icons/fx-fireworks.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Fireworks button on the effect strip.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of colourful fireworks bursting in a night sky. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I81 · Mini Golf icon

- **File:** `chat/assets/icons/game-minigolf.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Mini Golf card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a golf ball next to a flag in a hole on bright green turf. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I82 · Bowling icon

- **File:** `chat/assets/icons/game-bowling.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Bowling card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a bowling ball crashing into white pins. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I83 · Beach Bump icon

- **File:** `chat/assets/icons/game-beachbump.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Beach Bump card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a beach ball bouncing off a smiling face. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I84 · Burger Stack icon

- **File:** `chat/assets/icons/game-burger.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Burger Stack card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a tall wobbly burger stack with a face peeking under it. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I85 · Asteroid Dodge icon

- **File:** `chat/assets/icons/game-asteroids.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Asteroid Dodge card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a rocket weaving between asteroids. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I86 · Don't Smile icon

- **File:** `chat/assets/icons/game-dontsmile.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Don't Smile card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a straight face trying not to laugh, with a sweat drop. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I87 · Snake icon

- **File:** `chat/assets/icons/game-snake.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Snake card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of two cartoon snakes racing for an apple. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I88 · Battleship icon

- **File:** `chat/assets/icons/game-battleship.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Battleship card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a grey battleship and a red hit marker on a blue grid. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I89 · Trivia icon

- **File:** `chat/assets/icons/game-trivia.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Trivia card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a big question mark on a quiz-show buzzer. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```

### CH-I90 · Word Blitz icon

- **File:** `chat/assets/icons/game-wordblitz.png`
- **Size:** 256 x 256, transparent
- **Used for:** The Word Blitz card in the game picker.
- **Stand-in until delivered:** An emoji.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. Icon of a 4x4 grid of letter tiles with a word path traced in gold. App icon tile: the subject centred on a rounded-square badge in a bright gradient, filling about 80% of the 256 x 256 frame, readable at 48 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
```
