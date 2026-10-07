# One Monster After Another

A game after Mercer Mayer's picture book *One Monster After Another* (1974),
in which Sally Ann's letter to Lucy Jane is stolen by one monster after
another on its way. You play each monster in turn, in the book's order, as it
snatches the letter from the one that has it: a short Mario Party-style
challenge (creep up to the mailbox as the Stamp-Collecting Trollusk, swoop on
the fleeing Trollusk as the Letter-Eating Bombanat, and so on), a celebration
with the prize, and then the next monster is spotted eyeing it. Up to four
players can take turns, and in *Snatch & Keep* two players go head to head,
one snatching and one keeping the letter, swapping sides each chapter.

The game is being built. Until then the published page is a gated "Coming
soon" placeholder (`game/index.html`, behind the shared invite gate in
`game/src/gate/gate.js`, a byte-identical copy of the one in the
`hoai2k.github.io` repository).

- [`design/design.md`](design/design.md): the flow, the controls, the
  two-player mode, the nine snatches, how each creature moves, and the sprite
  rigs.
- [`design/image-requests.md`](design/image-requests.md): the image requests
  (logo, title, icon and letter; for each monster a canonical model sheet and,
  drawn from it, a portrait and the sprite parts, swaps and key poses of its
  animation rig; the people, the props, the scenes and the story pages), generated from
  [`design/source/build_requests.py`](design/source/build_requests.py), which
  also writes `game/src/asset-list.js`. Edit the data there and rerun it.
  Generated images go in [`intake/`](intake/README.md).
- [`reference/`](reference/README.md): photos of the book and notes on its
  story, style and monsters, for the image generator. They are reference only
  and are never published.

Checks:

```sh
python3 onemonster/design/source/build_requests.py --check
onemonster/publish.sh local/pages/onemonster
```
