# Micro workbench

Tools for trying out Micro Zoom's parts outside the game. Open
`micro/workbench/index.html` through a local server that serves `micro/`
(the workbench reaches the game at `../game/`), or on the site at
https://hoai2k.github.io/mini/micro/workbench/ while
`micro/deploy_config.json` says `includeWorkbenches: true`.

## Audio tab

- **Triggers**: every moment in the game that plays a sound (each
  `audio.play` / `audio.loop` call in `micro/game/`), grouped by world, with
  a play button for what it plays in each sound set: **Default** (the original
  sounds) and **Experimental** (the sounds added on 2 November 2026, which
  the game's Settings → Sound effects switches on). Each plays at the game's
  own volume and speed for that moment; a volume or speed the game works out
  while playing is shown and played at 1. Loops play until pressed again.
  Above the worlds, the menus' sounds (the shell's real `game/src/sound.js`,
  switched to each set for the one sound, without changing the game's
  setting) and the two songs.
- **Sounds**: every sound file by folder, each take on its own button, with
  what it is for, its generation prompt and the command that regenerates it.
- **Marks**: Keep, Use in Default, Regenerate or Drop, plus a note, on any
  Experimental or listed sound. They stay in this browser; **Copy marks**
  copies them as a list to paste into a request.
- Filters: a world, sounds that differ between the sets, only the
  Experimental sounds, only what is marked, and a search.

`audio-triggers.js` is generated from the game's code, `game/shared/audio-list.js`
and `design/sound-effects.md`; rerun the builder after changing any sound call
or regenerating sounds:

```bash
node micro/workbench/build_audio_triggers.mjs
```

## Checks

```bash
node micro/workbench/check.mjs
```

It fails if `audio-triggers.js` is stale, on any page error or failed request,
and plays a trigger and a menu sound in each set, a song and a take.
