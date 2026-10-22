# Bebop theme (archived)

A ninth Music Practice theme, kept here as a possible expansion. It was
designed, its 20 images delivered (image requests Round 13), and it was in
Settings → Theme for a short while before being taken out: the owner wasn't
satisfied with it yet. Nothing in the app refers to it now; a saved choice of
Bebop shows Classic.

**The look:** a 1950s modern-jazz record sleeve in a late-night club.
Midnight blue and ink with cream, saxophone brass, an amber spotlight glow and
one club-sign red; Bebas Neue capitals and Barlow; a fine halftone texture;
home cards like record sleeves (a cream rule inside the edge, a red stripe
down one side); pill buttons; the Visualizer's bars shaped like piano keys.
Dark by design; its light mode is a cream sleeve printed in midnight-blue ink.
It passed the readability audit (contrast and size in every settings sheet)
in both modes.

## What is here

- `ui/`: its 13 own images, as shipped (WebP): the metronome body, pendulum,
  rod and weight; the Metronome, Recorder, Tuner, Drone and Routine home
  buttons; the drone cello, bow and organ; the music stand
  (`practice-default`). Its other seven routine pictures are Classic's
  (`SHARED_PICTURES` in `design/source/build_requests.py`). PNG masters, the
  contact sheet and every prompt are in `design/generated/round-13/` and
  `design/image-deliveries-round-13.json` (which also holds the measured
  anchors: pivot, hub, rod travel, weight centre, bow frog and tip).
- `theme.css`: its rules from `app/styles.css`, with where each part went.
- `fonts/`: the licences of its two fonts (SIL Open Font License), for the
  apps' bundle.

## To bring it back

1. Move `ui/` back to `musicpractice/app/assets/ui/bebop/`.
2. In `design/source/build_requests.py`, take `bebop` out of
   `ARCHIVED_THEMES` and add `dict(id=BEBOP["id"], name=BEBOP["name"])` to
   `THEMES`; run it (`--check` must be clean). Its requests come back as
   delivered, from the delivery record.
3. `app/src/settings.js`, at the end of `THEMES`:

   ```js
   { id: 'bebop', label: TEXT.themes.bebop, mode: 'dark', color: '#0a1022', fonts: 'family=Bebas+Neue&family=Barlow:wght@500;600;700' },
   ```

   `app/src/text-config.js`, in `themes`: `bebop: 'Bebop',`. In
   `app/index.html`'s early script, add `'bebop'` to `ids` and to the dark
   list.
4. `app/src/standins.js`, before `STANDINS` (and `bebop: BEBOP` in it):

   ```js
   const BEBOP = themed({
     shape: 'plates', caseFill: '#14204a', caseLine: '#d9a63e', lineW: 8, face: '#f3ead6', faceLine: '#d9a63e',
     tick: '#0a1022', metal: '#e6b450', metalLine: '#7a5718', accent: '#d23a3a', base: '#0a1022', record: '#ee3b34',
     weight: 'bud',
     extras: `<path d="M165 960H635" stroke="#d23a3a" stroke-width="16"/><path d="${star(600, 200, 30, 4, 0.28)}" fill="#f3ead6"/><path d="${star(210, 420, 18, 4, 0.28)}" fill="#f2c45a"/>`,
   });
   ```

5. Put `theme.css`'s three parts back in `app/styles.css` where it says.
6. In `app/test/settings.test.mjs`, beside the other `resolveMode` cases:
   `assert.equal(resolveMode('bebop', 'default', false), 'dark');`
7. For the apps: move `fonts/*` back to `mobile/fonts/licenses/` and run
   `mobile/fonts/fetch_fonts.py`.
8. Note it in `README.md`'s theme list, run the tests and the readability
   audit, and look at every screen in both modes.
