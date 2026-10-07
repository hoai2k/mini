# The Ice-Cream Cone Coot

A field guide of rare birds from Arnold Lobel's *The Ice-Cream Cone Coot and
Other Rare Birds* (1971), with a Mario Party-style minigame for each bird:
catch scoops as the Ice-Cream Cone Coot, pour tea into the Cupadee, take
pictures as the Shuttercluck, and so on through ten birds.

The game is being built. Until it is published:

- [`design/design.md`](design/design.md): the flow, the controls and the ten
  minigames.
- [`design/image-requests.md`](design/image-requests.md): the image requests
  (logo, title, paper, ten bird portraits, ten minigame scenes), generated from
  [`design/source/build_requests.py`](design/source/build_requests.py), which
  also writes `game/src/asset-list.js`. Edit the data there and rerun it.
  Generated images go in [`intake/`](intake/README.md).
- [`reference/`](reference/README.md): photos of the book's pages and notes on
  its style and its birds, for the image generator. They are reference only and
  are never published.

```sh
python3 icecreamcone/design/source/build_requests.py --check
```
