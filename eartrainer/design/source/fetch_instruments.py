#!/usr/bin/env python3
"""Download and prepare the other instruments (Settings → Sound).

The pianos come from fetch_samples.py. These are the rest: one sample every
minor third from C2 to C7 (the melodies' whole range), from the MusyngKite
General MIDI soundfont.

    python3 eartrainer/design/source/fetch_instruments.py [name ...]

Source: MusyngKite by Michael Kite, CC BY-SA 3.0, rendered note by note by
Benjamin Gleitzman (https://github.com/gleitz/midi-js-soundfonts). The
prepared samples here are shared under the same CC BY-SA 3.0 terms.

How each file is prepared:
- Leading silence is trimmed. Bowed and blown notes that swell in slowly
  start where the swell has reached half its height, so every note begins
  clearly (the app adds a short attack of its own).
- Plucked and struck notes ("decay") are cut to 3 s with a fade, as they ring.
- Held notes ("sustain") keep 2.4 s, and the steady part from 0.8 s is made
  into a seamless loop (its end crossfaded into the audio just before its
  start), so a held key sounds for as long as it is held. The loop points
  are written to loops.json beside the samples.
- Levels are matched with a plain gain; mono, 80 kbit/s MP3.
- Each finished file's pitch is measured (a harmonic sum, to 2 cents) and the
  offset from its note written to tune.json, which the app corrects for, so
  neighbouring samples agree.
"""

from __future__ import annotations

import json
import subprocess
import sys
import urllib.request
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "eartrainer" / "app" / "assets" / "samples"
URL = "https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/MusyngKite/{}-mp3/{}.mp3"
FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
SR = 44100

# app name: (General MIDI name, kind, lowest and highest sample)
INSTRUMENTS = {
    "epiano2": ("electric_piano_2", "decay", 36, 96),
    "harpsichord": ("harpsichord", "decay", 36, 96),
    "vibraphone": ("vibraphone", "decay", 36, 96),
    "marimba": ("marimba", "decay", 36, 96),
    "celesta": ("celesta", "decay", 48, 96),  # lower, its samples go out of tune
    "musicbox": ("music_box", "decay", 48, 96),
    "organ": ("church_organ", "sustain", 36, 96),
    "jazzorgan": ("drawbar_organ", "sustain", 36, 96),
    "accordion": ("accordion", "sustain", 36, 96),
    "nylon": ("acoustic_guitar_nylon", "decay", 36, 96),
    "steel": ("acoustic_guitar_steel", "decay", 36, 96),
    "jazzguitar": ("electric_guitar_jazz", "decay", 36, 96),
    "cleanguitar": ("electric_guitar_clean", "decay", 36, 96),
    "harp": ("orchestral_harp", "decay", 36, 96),
    "violin": ("violin", "sustain", 36, 96),
    "cello": ("cello", "sustain", 36, 96),
    "strings": ("string_ensemble_1", "sustain", 36, 96),
    "flute": ("flute", "sustain", 36, 96),
    "clarinet": ("clarinet", "sustain", 36, 96),
    "sax": ("alto_sax", "sustain", 36, 96),
    "trumpet": ("trumpet", "sustain", 36, 96),
}

def decode(data: bytes):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-f", "f32le", "-ac", "1", "-ar", str(SR), "pipe:1"],
                         input=data, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def envelope(x, win=0.02):
    n = int(win * SR)
    k = len(x) // n
    return np.sqrt(np.mean(x[: k * n].reshape(k, n) ** 2, axis=1) + 1e-12), n


def prepare(x, kind: str):
    """Returns (samples, loop or None)."""
    onset = int(np.argmax(np.abs(x) > 0.003))
    x = x[max(0, onset - 40):]
    if kind == "sustain":
        env, n = envelope(x)
        top = env[: int(1.5 / 0.02)].max()
        half = int(np.argmax(env >= top * 0.5))
        if half * 0.02 > 0.08:  # a slow swell: start where it has half its height
            start = max(0, half * n - int(0.03 * SR))
            x = x[start:]
            x[: int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))
        x = x[: int(2.4 * SR)]
        m, xf = int(0.1 * SR), int(0.25 * SR)
        a, b = int(0.8 * SR), len(x) - m
        if b - a > xf * 2:
            # A seamless loop: the stretch before b fades into the stretch
            # before a, and after b comes a copy of what follows a, so around
            # b the audio is exactly the audio around a. The loop points sit in
            # the middle of that copy, so a decoder's shift of up to 50 ms
            # either way still loops on matching audio.
            t = np.linspace(0, 1, xf)
            x[b - xf:b] = x[b - xf:b] * np.sqrt(1 - t) + x[a - xf:a] * np.sqrt(t)
            x[b:b + m] = x[a:a + m]
            loop = ((a + m / 2) / SR, (b + m / 2) / SR)
        else:
            loop = None
        rms = np.sqrt(np.mean(x[int(0.1 * SR): int(0.8 * SR)] ** 2)) + 1e-9
        x *= 0.09 / rms
    else:
        x = x[: int(3.0 * SR)]
        fade = int(1.0 * SR)
        if len(x) > fade:
            x[-fade:] *= np.linspace(1, 0, fade) ** 2
        rms = np.sqrt(np.mean(x[: SR // 2] ** 2)) + 1e-9
        x *= 0.12 / rms
        loop = None
    peak = np.abs(x).max()
    if peak > 0.89:
        x *= 0.89 / peak
    return x, loop


def cents_off(x, midi: int) -> int:
    """How far a sample is from its note, in cents (a harmonic sum around it)."""
    expect = 440 * 2 ** ((midi - 69) / 12)
    seg = x[int(0.12 * SR): int(0.7 * SR)]
    seg = seg - seg.mean()
    n = 1 << 16
    sp = np.abs(np.fft.rfft(seg * np.hanning(len(seg)), n))
    best = None
    for c in range(-60, 61, 2):
        f0 = expect * 2 ** (c / 1200)
        s_ = sum(sp[max(0, i - 2): i + 3].max() for i in (int(round(f0 * h * n / SR)) for h in range(1, 7)) if i < len(sp) - 2)
        if best is None or s_ > best[0]:
            best = (s_, c)
    return best[1]


def encode(x, path: Path):
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "f32le", "-ac", "1", "-ar", str(SR), "-i", "pipe:0",
                    "-b:a", "80k", str(path)], input=x.astype(np.float32).tobytes(), check=True)


def fetch(key: str):
    gm, kind, lo, hi = INSTRUMENTS[key]
    d = OUT / key
    d.mkdir(parents=True, exist_ok=True)
    loops, tune = {}, {}
    for f in d.glob("*.mp3"):
        f.unlink()  # a narrowed range leaves no strays
    for midi in range(21, 109, 3):
        if not lo <= midi <= hi:
            continue
        name = f"{FLAT[midi % 12]}{midi // 12 - 1}"
        x, loop = prepare(decode(urllib.request.urlopen(URL.format(gm, name)).read()), kind)
        encode(x, d / f"{midi}.mp3")
        c = cents_off(decode((d / f"{midi}.mp3").read_bytes()), midi)
        if abs(c) >= 4:
            tune[midi] = c
        if loop:
            loops[midi] = [round(loop[0], 4), round(loop[1], 4)]
    (d / "loops.json").write_text(json.dumps(loops) + "\n") if loops else None
    (d / "tune.json").write_text(json.dumps(tune) + "\n")
    print(key, gm, kind, len(list(d.glob("*.mp3"))), "samples")


def main() -> int:
    keys = sys.argv[1:] or list(INSTRUMENTS)
    for k in keys:
        fetch(k)
    return 0


if __name__ == "__main__":
    sys.exit(main())
