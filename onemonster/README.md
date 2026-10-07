# One Monster After Another

A game after Mercer Mayer's picture book *One Monster After Another* (1974),
in which Sally Ann's letter to Lucy Jane is stolen by one monster after
another on its way. You play each monster in turn, in the book's order: a
short Mario Party-style challenge doing what that monster does (creep up to
the mailbox as the Stamp-Collecting Trollusk, fly the letter over the Blue
Ocean of Bubbley Goo as the Letter-Eating Bombanat, and so on), and then the
letter passes to the next monster and you become it. With two to four
players, passing the letter means passing the controller.

The game is being built. Until then the published page is a gated "Coming
soon" placeholder (`game/index.html`, behind the shared invite gate in
`game/src/gate/gate.js`, a byte-identical copy of the one in the
`hoai2k.github.io` repository).

- [`design/design.md`](design/design.md): the flow, the controls and the
  seven monster challenges.
- [`design/image-requests.md`](design/image-requests.md): the image requests
  (logo, title, icon, the letter, the monsters, the scenes), generated from
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
