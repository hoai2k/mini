#!/usr/bin/env python3
"""Download and prepare the piano samples the app plays.

One sample every minor third (C, D#, F#, A) from A0 to C8; the app transposes
each by at most a semitone and a half to fill in the notes between.

    python3 eartrainer/design/source/fetch_samples.py

Sources (credited in the app and the README):
    grand   Salamander Grand Piano V3 by Alexander Holm, CC BY 3.0,
            via https://tonejs.github.io/audio/salamander/
    bright  FluidR3 GM "Bright Acoustic Piano" by Frank Wen, MIT licence,
            via https://github.com/gleitz/midi-js-soundfonts
    epiano  FluidR3 GM "Electric Piano 1" by Frank Wen, MIT licence, same source

Each file is trimmed (longer for low notes, which ring longer), faded out,
brought to a common loudness with a plain gain, and encoded as 96 kbit/s MP3.
"""

from __future__ import annotations

import subprocess
import sys
import urllib.request
from pathlib import Path

import numpy as np

OUT = Path(__file__).resolve().parents[2] / "app" / "assets" / "samples"
SHARP = {"C": "C", "D#": "Ds", "F#": "Fs", "A": "A"}
FLAT = {"C": "C", "D#": "Eb", "F#": "Gb", "A": "A"}
SETS = {
    "grand": ("https://tonejs.github.io/audio/salamander/{}.mp3", SHARP),
    "bright": ("https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FluidR3_GM/bright_acoustic_piano-mp3/{}.mp3", FLAT),
    "epiano": ("https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FluidR3_GM/electric_piano_1-mp3/{}.mp3", FLAT),
}
PCS = {"C": 0, "D#": 3, "F#": 6, "A": 9}


def notes():
    for midi in range(21, 109, 3):  # A0 .. C8, the whole piano
        pc = midi % 12
        name = next(k for k, v in PCS.items() if v == pc)
        yield midi, name, midi // 12 - 1


def decode(data: bytes):
    """MP3 bytes to stereo float32 samples at 44.1 kHz."""
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-f", "f32le", "-ac", "2", "-ar", "44100", "pipe:1"],
                         input=data, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def prepare(x, midi: int):
    """Trim leading silence, cut to length with a fade, set a common loudness.
    A plain gain keeps the piano's natural decay intact."""
    level = np.abs(x).max(axis=1)
    onset = int(np.argmax(level > 0.003))
    x = x[max(0, onset - 40):]
    length = 5.0 if midi < 60 else 4.0 if midi < 76 else 3.0
    x = x[: int(length * 44100)]
    fade = int(1.2 * 44100)
    if len(x) > fade:
        x[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 2
    rms = np.sqrt(np.mean(x[: 44100 // 2] ** 2)) + 1e-9
    x *= 0.12 / rms
    peak = np.abs(x).max()
    if peak > 0.89:
        x *= 0.89 / peak
    return x


# Recordings left out: Salamander's C8 is mostly hammer noise once its level is
# matched, so the A7 sample is transposed up to cover the top notes instead.
SKIP = {("grand", 108)}


def main() -> int:
    for kit, (url, names) in SETS.items():
        d = OUT / kit
        d.mkdir(parents=True, exist_ok=True)
        for midi, name, octave in notes():
            if (kit, midi) in SKIP:
                (d / f"{midi}.mp3").unlink(missing_ok=True)
                continue
            src = url.format(f"{names[name]}{octave}")
            x = prepare(decode(urllib.request.urlopen(src).read()), midi)
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "f32le", "-ac", "2", "-ar", "44100", "-i", "pipe:0",
                            "-b:a", "96k", str(d / f"{midi}.mp3")], input=x.astype(np.float32).tobytes(), check=True)
            print(kit, midi, src)
    return 0


if __name__ == "__main__":
    sys.exit(main())
