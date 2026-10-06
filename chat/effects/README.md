# Face effects

Each face effect is one ES module in this folder that default-exports a plain
object. `index.js` lists them in tray order and loads each on its own, so a
broken effect drops out of the tray instead of breaking the app.

The studio (`../js/studio.js`) draws every frame of the video I send:

1. the camera image, mirrored like a selfie, either drawn as is or through the
   effect's WebGL **shader**;
2. then the effect's **draw** function paints on top with Canvas 2D.

Peers receive the finished video, so they see the effect without running it.

## The effect object

```js
export default {
  id: 'puppy',               // same as the file name and the id in index.js
  name: 'Puppy',             // tray label
  emoji: '🐶',               // tray icon until the icon art (fx-<id>) arrives
  hint: 'Open your mouth!',  // one short line shown when the effect is picked
  needs: { face: true },     // face: track my face every frame
                             // segmentation: also compute a person mask
  start(state, info) {},     // optional; state is a fresh {} for this effect
  draw(ctx, frame) {},       // optional; Canvas 2D on top of the video
  stop(state) {},            // optional
  shader: `vec4 effect(vec2 uv) { return cam(uv); }`, // optional GLSL, see below
  uniforms(frame) { return { u_amount: 0.5 }; },     // optional extra uniforms
  background(frame) { return canvasOrImage; },       // optional u_bg texture
};
```

`frame` holds:

| Field | Meaning |
| --- | --- |
| `ctx`, `w`, `h` | the output canvas (about 640 x 480, sometimes portrait) |
| `t`, `dt` | seconds since the studio started, seconds since the last frame |
| `face` | my face or `null` (see below) |
| `camOn` | false when the camera is off (an avatar card is drawn instead) |
| `input.held`, `input.pressed` | Space, a held press on my own video, or RT on a controller: the stand-in for a face gesture when no face is tracked |
| `peers` | how many other people are in the chat |
| `state` | the effect's own object, kept between frames |
| `img(name)` | delivered artwork by asset name (`'puppy'`, `'heart'`…) or `null` until it arrives |
| `sfx(name)` | play a sound: `pop blow whoosh click score miss bounce win lose tick join leave zap fire bang flap honk` |
| `emit(type, data)` | send an event to the app (Bubble Blow uses `'bubble'`) |

## The face

All positions are in output-canvas pixels, already mirrored (image-left is
the viewer's left).

| Field | Meaning |
| --- | --- |
| `eyeL`, `eyeR`, `eyeMid`, `nose`, `mouth`, `chin`, `forehead`, `center` | `{x, y}` points (`mouth` is between the lips, `forehead` is the hairline) |
| `box` | `{x, y, w, h}` around the face |
| `scale` | distance between the eyes in pixels: size everything by it |
| `roll` | head tilt in radians: rotate stickers by it |
| `mouthOpen`, `smile`, `pucker`, `browUp`, `frown`, `cheekPuff`, `blinkL`, `blinkR`, `wink` | 0 to 1 |
| `pts` | all 478 MediaPipe landmarks `{x, y, z}` |

Helpers in `../js/face.js`:

- `withTemplate(ctx, face, ctx => { ... })` draws in **face-template**
  coordinates (1024 x 1024; eyes at (392, 520) and (632, 520), nose tip (512,
  640), mouth (512, 740), chin (512, 880), top of head (512, 220)), so a sticker
  drawn there lands on the face at the right size and tilt.
- `drawTemplate(ctx, face, image)` draws a delivered face-template sticker.
- `templatePoint(face, x, y)` maps one template point to canvas pixels.

## Artwork and stand-ins

Delivered artwork is listed in `../js/asset-list.js` (generated from
`../design/source/build_requests.py`). `frame.img(name)` returns `null` until
the art is delivered, so every effect draws its own stand-in with canvas paths
in the meantime, and switches to the image when it exists:

```js
withTemplate(ctx, face, c => {
  const art = frame.img('crown');
  if (art) c.drawImage(art, 0, 0, 1024, 1024);
  else drawCrownStandIn(c);   // canvas paths in template coordinates
});
```

## Shaders

A shader effect writes `vec4 effect(vec2 uv)`. `uv` runs 0..1 across the
canvas with y pointing down. The prelude (in `studio.js`) provides:

- `cam(uv)`: the camera image at that position (mirrored);
- `personMask(uv)`: 1 on the person, 0 on the room (with `needs.segmentation`);
- `bg(uv)`: the image returned by `background(frame)`;
- `toPx(uv)`, `toUv(px)`, and `bulge(px, centre, radius, amount)`, a lens
  warp in pixels (amount > 0 magnifies, < 0 shrinks);
- uniforms in pixels: `u_res`, `u_eyeL`, `u_eyeR`, `u_nose`, `u_mouth`,
  `u_center`, `u_faceSize`, `u_scale`, `u_roll`; expressions `u_mouthOpen`,
  `u_smile`, `u_pucker`, `u_browUp`; `u_time`; `u_hasFace` (0 or 1).

Declare any extra uniforms in the shader and return their values from
`uniforms(frame)` (numbers or arrays of 2 to 4 numbers). Guard face warps with
`u_hasFace` so the picture is untouched when no face is found.

## Previewing

`../test/fx.html?fx=<id>` runs one effect on the camera with a synthetic face
(add `&smile=1&mouthOpen=1&pucker=1&browUp=1&frown=1&roll=0.2&held=1`, or
`&animate=1` to cycle expressions). `node chat/test/fx-shots.mjs [ids…]`
screenshots effects into `local/chat-shots/` with Chromium's fake camera.
