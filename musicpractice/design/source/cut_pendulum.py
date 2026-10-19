"""Cut each theme's delivered pendulum into its rod and its sliding weight.

Until the separate rod and weight are delivered (image requests round 10),
the app shows these interim cuts, so the weight can slide along the rod with
the tempo. For each `metronome-pendulum` image:

- the weight is the band of rows in the upper half that is much wider than
  the rod (sparkles beside it count as part of it);
- the weight image is that band cropped out (the bit of rod behind it rides
  with it, matching the rod);
- the rod image is the pendulum with that band replaced by the rod as it is
  just below the weight;
- `travel` is how far up and down the rod the weight's centre may go (from
  just under the rod's top to above the bob), in the pendulum's 200x1000
  canvas units, and `center` is the weight's own centre on the rod.

Writes app/assets/ui[/<theme>]/metronome-rod.cut.webp and
metronome-weight.cut.webp, and design/pendulum-cuts.json with the numbers
(read by build_requests.py). Rerun after a pendulum is redelivered.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
APP = ROOT / "app"
THEMES = ["classic", "deco", "sixties", "baroque", "scifi", "nouveau", "anime", "steampunk"]
CANVAS = (200, 1000)


def widths(alpha: np.ndarray) -> np.ndarray:
    """Each row's opaque extent (0 for an empty row)."""
    on = alpha > 40
    out = np.zeros(alpha.shape[0])
    for y in range(alpha.shape[0]):
        xs = np.nonzero(on[y])[0]
        if len(xs):
            out[y] = xs[-1] - xs[0] + 1
    return out


def bands(mask: np.ndarray, gap: int) -> list[tuple[int, int]]:
    """Runs of True rows, joining runs separated by fewer than `gap` rows."""
    out = []
    ys = np.nonzero(mask)[0]
    for y in ys:
        if out and y - out[-1][1] <= gap:
            out[-1][1] = y
        else:
            out.append([y, y])
    return [tuple(b) for b in out]


def cut(theme: str) -> dict:
    folder = APP / "assets" / "ui" / ("" if theme == "classic" else theme)
    src = folder / "metronome-pendulum.webp"
    im = np.array(Image.open(src).convert("RGBA"))
    h, w = im.shape[:2]
    s = w / CANVAS[0]  # pixels per canvas unit
    alpha = im[:, :, 3]
    wd = widths(alpha)
    rod = float(np.median(wd[int(h * 0.38):int(h * 0.55)][wd[int(h * 0.38):int(h * 0.55)] > 0]))
    wide = wd > rod * 1.7
    upper = wide.copy()
    upper[int(h * 0.5):] = False
    upper[: int(h * 0.04)] = False
    candidates = bands(upper, gap=int(h * 0.03))
    y0, y1 = max(candidates, key=lambda b: b[1] - b[0])
    # Out to where the rod is plain again (a collar or stem on the weight goes with it).
    while y0 > 0 and wd[y0 - 1] > rod * 1.2:
        y0 -= 1
    while y1 < h - 1 and wd[y1 + 1] > rod * 1.2:
        y1 += 1
    pad = int(h * 0.006)
    y0, y1 = max(0, y0 - pad), min(h - 1, y1 + pad)
    # The rod just below the weight, to mend the rod behind it.
    ref = y1 + 1
    while ref < h and wd[ref] > rod * 1.3:
        ref += 1
    rod_im = im.copy()
    rod_im[y0:y1 + 1] = 0
    # Clear of the weight's shadow: the typical rod a little further down.
    ref += int(h * 0.01)
    rod_im[y0:y1 + 1] = np.median(im[ref:ref + int(h * 0.02)], axis=0).astype(np.uint8)
    weight_im = im[y0:y1 + 1].copy()
    # Where the rod runs (the hub's x is on it).
    ys_rod = np.nonzero(alpha[:, :].max(axis=1) > 40)[0]
    top = ys_rod[0]
    # The bob: the topmost wide row in the lower part.
    lower = wide.copy()
    lower[: int(h * 0.5)] = False
    bob_top = np.nonzero(lower)[0][0] if lower.any() else int(h * 0.85)
    half = (y1 - y0) / 2
    t_top = top + half + h * 0.01
    t_bottom = bob_top - half - h * 0.05
    Image.fromarray(rod_im).save(folder / "metronome-rod.cut.webp", quality=92, method=6)
    Image.fromarray(weight_im).save(folder / "metronome-weight.cut.webp", quality=92, method=6)
    u = lambda px: round(float(px) / s, 1)  # noqa: E731
    return {
        "theme": theme,
        "rod": {"file": str((folder / "metronome-rod.cut.webp").relative_to(APP)), "travel": [u(t_top), u(t_bottom)], "at": u((y0 + y1) / 2)},
        "weight": {"file": str((folder / "metronome-weight.cut.webp").relative_to(APP)), "canvas": [CANVAS[0], u(y1 - y0 + 1)], "center": [CANVAS[0] / 2, u(half)]},
    }


def main() -> None:
    out = [cut(t) for t in THEMES]
    (ROOT / "design" / "pendulum-cuts.json").write_text(json.dumps(out, indent=2) + "\n")
    for c in out:
        print(c["theme"], "travel", c["rod"]["travel"], "weight at", c["rod"]["at"], "weight canvas", c["weight"]["canvas"])


if __name__ == "__main__":
    main()
