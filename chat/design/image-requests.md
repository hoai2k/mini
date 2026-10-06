# Bubble Chat: image requests

Artwork for Bubble Chat in `chat/`. Generated from `source/build_requests.py`; edit the data there and rerun it, which also rewrites `chat/js/asset-list.js` and `face-template.png`.

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

61 requested, 61 in total.

## Brand

The title screen and the browser tab.

### CH-U01 · Title logo

- **File:** `chat/assets/ui/logo.png`
- **Size:** 1600 x 640, transparent
- **Used for:** The title screen logo above Press Start.
- **Stand-in until delivered:** The words in the page's rounded font with a CSS gradient.
- **Status:** requested

```text
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No other text, no watermark, no photorealism. The words "Bubble Chat" as a chunky bubble-letter logo, the letters puffy and glossy like blown bubble gum in pink, aqua and sunny yellow, with a translucent soap bubble floating off the final t. Spell it exactly: Bubble Chat. Centred, wide landscape composition. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
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
Glossy cartoon sticker art for a playful video-chat app. Bold clean shapes, thick soft outlines in a darker shade of each fill colour, bright saturated candy colours, a single soft highlight on each shape, gentle cel shading. Friendly and silly, readable at small sizes. No text, no watermark, no photorealism. A single glossy pink bubble-gum bubble with a winking smiley face reflected in it, on a rounded-square aqua badge. Bold and simple so it reads at 16 px. Transparent background (PNG with alpha). If transparency is not possible, use a flat pure magenta #FF00FF background with nothing else on it and no cast shadow; it is keyed out on integration.
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
