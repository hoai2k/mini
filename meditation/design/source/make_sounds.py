#!/usr/bin/env python3
"""Make the chime recordings in meditation/app/sounds/ from the originals.

    python3 meditation/design/source/make_sounds.py          # write
    python3 meditation/design/source/make_sounds.py --check  # every used recording is made and credited

The originals are in meditation/design/recordings/, downloaded unchanged from
Wikimedia Commons (`url`). Each is trimmed to one strike and its ring-out
(`start`, `length` in seconds), filtered below 50 Hz, peak-matched to the
synthesized chimes (-6 dBFS), faded over its last `fade` seconds and written
as mono MP3. A recording is used by the app when `sound` names its instrument
and app/src/sounds.js gives that instrument `file: 'sounds/<sound>.mp3'` and
a CREDITS entry (--check verifies both). Needs ffmpeg with libmp3lame.
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ORIGINALS = ROOT / "design" / "recordings"
OUT = ROOT / "app" / "sounds"

RECORDINGS = [
    dict(sound="rin", original="Japanese_rin_played_as_struck_idiophone.ogg",
         url="https://commons.wikimedia.org/wiki/File:Japanese_rin_played_as_struck_idiophone.ogg",
         author="MichaelMaggs", license="CC BY-SA 4.0",
         # The recording is a roll of soft taps building to one full strike at 4.6 s; keep that strike.
         start=4.57, length=15, fade=3),
    dict(sound="koshi", original="Windglockenspiel.Koshi.ogg",
         url="https://commons.wikimedia.org/wiki/File:Windglockenspiel.Koshi.ogg",
         author="Membeth", license="CC0 1.0",
         # A minute of chimes in a breeze; the first gust, from its first rod.
         start=0.2, length=9, fade=3.5),
]


def run(r: dict) -> Path:
    src = ORIGINALS / r["original"]
    out = OUT / f"{r['sound']}.mp3"
    pre = ["-ss", str(r["start"]), "-t", str(r["length"]), "-i", str(src)]
    # Measure the trimmed strike's peak, then scale it to -6 dBFS.
    probe = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", *pre, "-af", "highpass=f=50,volumedetect", "-f", "null", "-"],
                           capture_output=True, text=True, check=True).stderr
    peak = float(re.search(r"max_volume: (-?[\d.]+) dB", probe).group(1))
    fade_at = r["length"] - r["fade"]
    af = f"highpass=f=50,volume={-6 - peak:.2f}dB,afade=t=in:d=0.004,afade=t=out:st={fade_at}:d={r['fade']}"
    subprocess.run(["ffmpeg", "-hide_banner", "-v", "error", "-y", *pre, "-af", af, "-ac", "1", "-ar", "44100",
                    "-c:a", "libmp3lame", "-q:a", "3", "-map_metadata", "-1", str(out)], check=True)
    return out


def check() -> int:
    sounds_js = (ROOT / "app" / "src" / "sounds.js").read_text(encoding="utf-8")
    bad = []
    for r in RECORDINGS:
        if not (ORIGINALS / r["original"]).exists():
            bad.append(f"missing original: design/recordings/{r['original']}")
        if not (OUT / f"{r['sound']}.mp3").exists():
            bad.append(f"not made: app/sounds/{r['sound']}.mp3 (run make_sounds.py)")
        if f"file: 'sounds/{r['sound']}.mp3'" not in sounds_js:
            bad.append(f"app/src/sounds.js: {r['sound']} does not load sounds/{r['sound']}.mp3")
        if r["url"] not in sounds_js:
            bad.append(f"app/src/sounds.js: no credit for {r['url']}")
    for line in bad:
        print(line)
    return 1 if bad else 0


def main() -> int:
    if "--check" in sys.argv:
        return check()
    OUT.mkdir(parents=True, exist_ok=True)
    for r in RECORDINGS:
        out = run(r)
        print(f"wrote {out.relative_to(ROOT.parent)} ({out.stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
