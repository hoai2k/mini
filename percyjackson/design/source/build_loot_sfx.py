#!/usr/bin/env python3
"""Synthesise the loot sound effects of Half-Blood Quests (no network, no API key).

The pickup, drop, chest and boss-loot sounds of design/loot-design.md, built
from sine, triangle and bell partials, filtered noise and a synthetic room
reverb with numpy, then levelled and encoded to MP3 with ffmpeg the same way
build_sfx.py levels its recorded effects. Each sound is seeded, so a rerun
writes the same audio.

    python3 percyjackson/design/source/build_loot_sfx.py           # write the files and index.json
    python3 percyjackson/design/source/build_loot_sfx.py --check   # every file present, index up to date
    python3 percyjackson/design/source/build_loot_sfx.py --wav DIR # also keep the WAVs (for listening)

Output: game/assets/sfx/<id>-<n>.mp3, and game/assets/sfx/index.json is
rewritten from build_sfx.index(), so the game's loader (audio.js loadSfx)
finds them. The same ids are listed in build_sfx.py's SFX table with prompts
for the ElevenLabs generator: a keyed run of `build_sfx.py --force <id>`
replaces a synthesised file with a recorded one (and this script would put the
synthesised one back, so run only one of the two for an id).

Needs numpy and ffmpeg.
"""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_sfx  # noqa: E402  (its SFX table and index())

OUT = build_sfx.OUT
SR = 44100
TAU = 2 * np.pi

# Notes (Hz). The game's music sits in C major / A minor, so the loot chimes do too.
N = {
    'C3': 130.81, 'G3': 196.00, 'C4': 261.63, 'E4': 329.63, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.26, 'F#5': 739.99, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
    'C6': 1046.50, 'D6': 1174.66, 'E6': 1318.51, 'F#6': 1479.98, 'G6': 1567.98, 'A6': 1760.00, 'B6': 1975.53,
    'C7': 2093.00, 'D7': 2349.32, 'E7': 2637.02, 'G7': 3135.96,
}


# ---------------------------------------------------------------- building blocks
def secs(d: float) -> np.ndarray:
    return np.arange(int(round(d * SR))) / SR


def hann(d: float) -> np.ndarray:
    return np.hanning(int(round(d * SR)))


def canvas(d: float) -> np.ndarray:
    return np.zeros(int(round(d * SR)))


def put(buf: np.ndarray, sig: np.ndarray, at: float, gain: float = 1.0) -> None:
    i = int(round(at * SR))
    if i >= len(buf):
        return
    n = min(len(sig), len(buf) - i)
    buf[i:i + n] += sig[:n] * gain


def attack(sig: np.ndarray, a: float) -> np.ndarray:
    n = max(1, int(a * SR))
    out = sig.copy()
    out[:n] *= np.linspace(0, 1, min(n, len(out)))
    return out


def osc(freq, d: float, shape: str = 'sine', harmonics: int = 16) -> np.ndarray:
    """An oscillator; `freq` is a number or an array the length of the sound (a glide)."""
    n = int(round(d * SR))
    f = np.full(n, float(freq)) if np.isscalar(freq) else np.asarray(freq)[:n]
    ph = TAU * np.cumsum(f) / SR
    if shape == 'sine':
        return np.sin(ph)
    if shape == 'tri':
        return (2 / np.pi) * np.arcsin(np.sin(ph))
    if shape == 'saw':   # additive, so it never aliases
        top = max(1, min(harmonics, int(17000 / max(f.max(), 1))))
        return sum(np.sin(k * ph) / k for k in range(1, top + 1)) * (2 / np.pi)
    raise ValueError(shape)


def glide(f0: float, f1: float, d: float) -> np.ndarray:
    return f0 * (f1 / f0) ** (secs(d) / max(d, 1e-6))


def bell(freq: float, d: float, decay: float = 0.35, bright: float = 1.0) -> np.ndarray:
    """A small struck bell: slightly inharmonic partials, the high ones dying first."""
    t = secs(d)
    parts = [(1.0, 1.0), (2.0, 0.42 * bright), (2.76, 0.32 * bright), (4.07, 0.16 * bright), (5.43, 0.09 * bright)]
    out = np.zeros_like(t)
    for ratio, amp in parts:
        if freq * ratio > 18000:
            continue
        out += amp * np.sin(TAU * freq * ratio * t) * np.exp(-t / (decay / ratio ** 0.7))
    return attack(out, 0.002)


def noise(d: float, rng: np.random.Generator) -> np.ndarray:
    return rng.uniform(-1, 1, int(round(d * SR)))


def band(x: np.ndarray, lo: float | None = None, hi: float | None = None) -> np.ndarray:
    """A gentle (4th-order-like) high-pass at `lo` and low-pass at `hi`, done in the spectrum."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR) + 1e-6
    m = np.ones_like(f)
    if lo:
        m *= 1 / np.sqrt(1 + (lo / f) ** 4)
    if hi:
        m *= 1 / np.sqrt(1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))


def swept(x: np.ndarray, f0: float, f1: float, width: float = 0.5) -> np.ndarray:
    """A band-pass whose centre glides from f0 to f1 (log), by overlap-add frames."""
    win, hop = 2048, 512
    pad = np.concatenate([np.zeros(win), x, np.zeros(win)])
    out = np.zeros_like(pad)
    w = np.hanning(win)
    f = np.fft.rfftfreq(win, 1 / SR) + 1e-6
    frames = range(0, len(pad) - win, hop)
    total = max(1, len(x))
    for s in frames:
        k = min(1.0, max(0.0, (s - win) / total))
        fc = f0 * (f1 / f0) ** k
        mask = np.exp(-0.5 * (np.log2(f / fc) / width) ** 2)
        out[s:s + win] += np.fft.irfft(np.fft.rfft(pad[s:s + win] * w) * mask, win) * w
    return out[win:win + len(x)] / 1.5


def sparkle(d: float, rng: np.random.Generator, count: int = 14, lo: float = 4200, hi: float = 9000, fade: float = 0.6) -> np.ndarray:
    """Glitter: many tiny high pings, thinning out over the sound."""
    buf = canvas(d)
    for _ in range(count):
        at = (rng.random() ** 1.6) * d * 0.85
        ping = np.sin(TAU * rng.uniform(lo, hi) * secs(0.05)) * np.exp(-secs(0.05) / 0.012)
        put(buf, attack(ping, 0.001), at, rng.uniform(0.3, 1.0) * np.exp(-at / max(fade, 1e-3)))
    return buf


def thud(d: float = 0.18, f0: float = 150, f1: float = 55, rng: np.random.Generator | None = None) -> np.ndarray:
    """Something landing on the ground: a short falling sine with a puff of low noise."""
    t = secs(d)
    body = osc(glide(f0, f1, d), d) * np.exp(-t / (d * 0.3))
    if rng is not None:
        body += 0.35 * band(noise(d, rng), hi=900) * np.exp(-t / (d * 0.15))
    return attack(body, 0.003)


def reverb(x: np.ndarray, rng: np.random.Generator, length: float = 1.2, decay: float = 0.35, mix: float = 0.25, tail: float = 0.0) -> np.ndarray:
    """A synthetic room: convolve with exponentially decaying noise (stereo-free, mono)."""
    ir_t = secs(length)
    ir = band(rng.uniform(-1, 1, len(ir_t)), lo=200, hi=7000) * np.exp(-ir_t / decay)
    ir = np.concatenate([np.zeros(int(0.012 * SR)), ir])
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    src = np.concatenate([x, np.zeros(int(tail * SR))])
    n = len(src) + len(ir)
    wet = np.fft.irfft(np.fft.rfft(src, n) * np.fft.rfft(ir, n), n)[:len(src)]
    return src * (1 - mix) + wet * mix * 2.2


def pad_chord(notes: list[float], d: float, rise: float, rng: np.random.Generator, bright: float = 2600) -> np.ndarray:
    """A soft, slightly detuned swell (a 'choir' of filtered saws) under the legendary sounds."""
    t = secs(d)
    out = np.zeros_like(t)
    for f in notes:
        for det in (-0.004, 0.0, 0.005):
            vib = 1 + 0.003 * np.sin(TAU * rng.uniform(4.5, 5.5) * t + rng.uniform(0, TAU))
            out += osc(f * (1 + det) * vib, d, 'saw', 10)
    out = band(out, lo=180, hi=bright)
    env = np.minimum(1, t / rise) * np.exp(-np.maximum(0, t - rise) / (d * 0.45))
    return out * env / (len(notes) * 3)


def brass(freq: float, d: float, rng: np.random.Generator) -> np.ndarray:
    """A short brass-like note: a saw whose brightness opens and closes ('bwaa')."""
    t = secs(d)
    raw = osc(freq * (1 + 0.002 * np.sin(TAU * 5.2 * t)), d, 'saw', 14)
    lo_part = band(raw, hi=freq * 2.2)
    hi_part = band(raw, hi=freq * 6)
    open_ = np.minimum(1, t / 0.06) * np.exp(-t / 0.5)
    env = np.minimum(1, t / 0.018) * np.exp(-np.maximum(0, t - d * 0.7) / 0.08)
    return (lo_part * (1 - open_) + hi_part * open_) * env


def clink(rng: np.random.Generator, f: float) -> np.ndarray:
    """One coin: a bright, very inharmonic metal ping."""
    t = secs(0.25)
    out = np.zeros_like(t)
    for ratio, amp, dec in ((1, 1, 0.07), (1.53, 0.6, 0.05), (2.41, 0.45, 0.035), (3.37, 0.3, 0.025)):
        out += amp * np.sin(TAU * f * ratio * t + rng.uniform(0, TAU)) * np.exp(-t / dec)
    return attack(out, 0.0008)


# ---------------------------------------------------------------- the sounds
# Each returns a mono float array. Variant n changes the notes or the seed a little.
def pickup_common(rng, n):
    a, b = (('G6', 'C7'), ('A6', 'D7'))[n - 1]
    buf = canvas(0.4)
    put(buf, osc(N[a], 0.07, 'tri') * np.exp(-secs(0.07) / 0.03), 0.0, 0.7)
    put(buf, bell(N[b], 0.3, 0.12, 0.6), 0.055, 0.8)
    return reverb(buf, rng, 0.6, 0.15, 0.18)


def pickup_rare(rng, n):
    notes = (('C6', 'E6', 'G6'), ('D6', 'F#6', 'A6'))[n - 1]
    buf = canvas(0.7)
    for i, k in enumerate(notes):
        put(buf, bell(N[k], 0.45, 0.2, 0.8), i * 0.055, 0.75)
    put(buf, sparkle(0.5, rng, 6, fade=0.3), 0.1, 0.12)
    return reverb(buf, rng, 0.9, 0.22, 0.22)


def pickup_heroic(rng, n):
    buf = canvas(1.0)
    put(buf, swept(noise(0.28, rng), 1200, 6000, 0.45) * hann(0.28), 0.0, 0.25)
    for i, k in enumerate(('E6', 'G6', 'B6', 'E7')):
        put(buf, bell(N[k], 0.55, 0.24, 0.9), 0.06 + i * 0.06, 0.7)
    put(buf, sparkle(0.8, rng, 14, fade=0.5), 0.15, 0.16)
    return reverb(buf, rng, 1.1, 0.28, 0.25)


def pickup_legendary(rng, n):
    buf = canvas(1.7)
    put(buf, thud(0.25, 110, 45, rng), 0.0, 0.5)
    put(buf, pad_chord([N['C5'], N['E5'], N['G5'], N['B5']], 1.6, 0.22, rng), 0.0, 0.55)
    for i, k in enumerate(('C6', 'E6', 'G6', 'C7', 'E7')):
        put(buf, bell(N[k], 0.9, 0.35, 1.0), 0.12 + i * 0.07, 0.6)
    put(buf, sparkle(1.3, rng, 26, fade=0.8), 0.2, 0.2)
    return reverb(buf, rng, 1.8, 0.5, 0.3)


def loot_common(rng, n):
    buf = canvas(0.5)
    put(buf, thud(0.14, 170, 70, rng), 0.0, 0.55)
    put(buf, bell(N['E7'], 0.3, 0.1, 0.4), 0.03, 0.35)
    return reverb(buf, rng, 0.6, 0.15, 0.15)


def loot_rare(rng, n):
    buf = canvas(0.8)
    put(buf, thud(0.16, 160, 60, rng), 0.0, 0.6)
    put(buf, bell(N['G6'], 0.5, 0.18, 0.7), 0.04, 0.5)
    put(buf, bell(N['C7'], 0.5, 0.18, 0.7), 0.11, 0.5)
    put(buf, sparkle(0.55, rng, 8, fade=0.35), 0.08, 0.14)
    return reverb(buf, rng, 1.0, 0.25, 0.22)


def loot_heroic(rng, n):
    buf = canvas(1.1)
    put(buf, thud(0.2, 150, 50, rng), 0.0, 0.65)
    put(buf, swept(noise(0.35, rng), 700, 5200, 0.5) * hann(0.35), 0.02, 0.3)
    for i, k in enumerate(('B5', 'E6', 'G6')):
        put(buf, bell(N[k], 0.6, 0.24, 0.9), 0.14 + i * 0.07, 0.55)
    put(buf, sparkle(0.8, rng, 14, fade=0.5), 0.18, 0.16)
    return reverb(buf, rng, 1.2, 0.3, 0.26)


def loot_legendary(rng, n):
    buf = canvas(2.2)
    put(buf, thud(0.5, 95, 32, rng), 0.0, 0.85)
    put(buf, band(noise(0.4, rng), hi=500) * np.exp(-secs(0.4) / 0.12), 0.0, 0.35)
    put(buf, swept(noise(0.6, rng), 400, 7000, 0.55) * hann(0.6), 0.05, 0.3)
    put(buf, pad_chord([N['C4'], N['G4'], N['C5'], N['E5'], N['B5']], 2.0, 0.45, rng, 3000), 0.1, 0.65)
    for i, k in enumerate(('G5', 'C6', 'E6', 'G6', 'C7')):
        put(buf, bell(N[k], 1.1, 0.42, 1.0), 0.32 + i * 0.08, 0.55)
    put(buf, sparkle(1.6, rng, 34, fade=1.0), 0.35, 0.2)
    return reverb(buf, rng, 2.2, 0.6, 0.32)


def coin_stack(rng, n):
    buf = canvas(0.5)
    for i in range(5 + n):
        put(buf, clink(rng, rng.uniform(2600, 3900)), i * rng.uniform(0.035, 0.06), rng.uniform(0.45, 0.8))
    return reverb(band(buf, lo=900), rng, 0.5, 0.1, 0.12)


def chest_rare(rng, n):
    buf = canvas(1.3)
    lid = band(noise(0.09, rng), lo=150, hi=2200) * np.exp(-secs(0.09) / 0.03)
    put(buf, lid, 0.0, 0.7)
    put(buf, thud(0.12, 210, 90), 0.0, 0.45)
    put(buf, swept(noise(0.4, rng), 900, 6000, 0.45) * hann(0.4), 0.05, 0.28)
    for i, k in enumerate(('C6', 'E6', 'G6')):
        put(buf, bell(N[k], 0.6, 0.25, 0.8), 0.18 + i * 0.07, 0.55)
    put(buf, sparkle(0.9, rng, 14, fade=0.5), 0.2, 0.15)
    return reverb(buf, rng, 1.2, 0.3, 0.25)


def chest_epic(rng, n):
    buf = canvas(1.8)
    lid = band(noise(0.12, rng), lo=120, hi=1800) * np.exp(-secs(0.12) / 0.04)
    put(buf, lid, 0.0, 0.75)
    put(buf, thud(0.25, 140, 50, rng), 0.0, 0.6)
    put(buf, swept(noise(0.55, rng), 500, 7000, 0.5) * hann(0.55), 0.05, 0.32)
    put(buf, pad_chord([N['C5'], N['E5'], N['G5']], 1.5, 0.3, rng), 0.12, 0.5)
    for i, k in enumerate(('E6', 'G6', 'C7', 'E7')):
        put(buf, bell(N[k], 0.8, 0.32, 0.9), 0.25 + i * 0.07, 0.5)
    put(buf, sparkle(1.3, rng, 24, fade=0.8), 0.25, 0.18)
    return reverb(buf, rng, 1.6, 0.45, 0.28)


def boss_loot(rng, n):
    """The boss-loot fanfare: a little brass call, then a held chord with bells."""
    buf = canvas(3.0)
    call = (('G4', 0.0, 0.16), ('C5', 0.17, 0.16), ('E5', 0.34, 0.16), ('G5', 0.51, 0.55))
    for k, at, d in call:
        put(buf, brass(N[k], d, rng), at, 0.5)
        put(buf, brass(N[k] / 2, d, rng), at, 0.25)
    for k in ('C4', 'E4', 'G4', 'C5', 'E5'):
        put(buf, brass(N[k], 1.6, rng), 1.05, 0.22)
    put(buf, thud(0.5, 80, 30, rng), 1.05, 0.6)
    for i, k in enumerate(('C6', 'E6', 'G6', 'C7', 'E7', 'G7')):
        put(buf, bell(N[k], 1.2, 0.45, 0.9), 1.1 + i * 0.07, 0.35)
    put(buf, sparkle(1.7, rng, 30, fade=1.1), 1.1, 0.16)
    return reverb(buf, rng, 2.4, 0.6, 0.3)


def upgrade(rng, n):
    """The green ▲: a found item is stronger than what you wear."""
    buf = canvas(0.5)
    for i, k in enumerate(('C6', 'E6', 'G6')):
        tone = osc(N[k], 0.09, 'tri') * np.exp(-secs(0.09) / 0.05)
        put(buf, band(tone, hi=5000), i * 0.05, 0.5)
    put(buf, bell(N['C7'], 0.35, 0.15, 0.6), 0.15, 0.6)
    return reverb(buf, rng, 0.7, 0.18, 0.2)


# id: (variants, maker, loudness target dB). Keep in step with build_sfx.SFX.
SOUNDS = {
    'pickup_common': (2, pickup_common, -25),
    'pickup_rare': (2, pickup_rare, -23),
    'pickup_heroic': (1, pickup_heroic, -22),
    'pickup_legendary': (1, pickup_legendary, -20),
    'loot_common': (1, loot_common, -25),
    'loot_rare': (1, loot_rare, -23),
    'loot_heroic': (1, loot_heroic, -21),
    'loot_legendary': (1, loot_legendary, -18),
    'coin_stack': (2, coin_stack, -23),
    'chest_rare': (1, chest_rare, -20),
    'chest_epic': (1, chest_epic, -19),
    'boss_loot': (1, boss_loot, -17),
    'upgrade': (1, upgrade, -23),
}


def level(x: np.ndarray, target: float) -> np.ndarray:
    """As build_sfx.process: mean (RMS) level to the target, peak no higher than -1 dBFS."""
    x = x - np.mean(x)
    fade = min(int(0.03 * SR), len(x) // 4)
    x[-fade:] *= np.linspace(1, 0, fade)
    rms = np.sqrt(np.mean(x ** 2)) + 1e-12
    peak = np.max(np.abs(x)) + 1e-12
    mean_db, peak_db = 20 * np.log10(rms), 20 * np.log10(peak)
    gain = min(target - mean_db, -1.0 - peak_db)
    return x * 10 ** (gain / 20)


def write_wav(path: str, x: np.ndarray) -> None:
    pcm = np.clip(np.round(x * 32767), -32768, 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def render(sid: str, n: int) -> np.ndarray:
    _, maker, target = SOUNDS[sid]
    seed = sum(ord(c) for c in sid) * 1000 + n
    return level(maker(np.random.default_rng(seed), n), target)


def write_index() -> None:
    import json
    with open(os.path.join(OUT, 'index.json'), 'w') as f:
        json.dump(build_sfx.index(), f, indent=1, sort_keys=True)
        f.write('\n')


def main() -> None:
    missing = [s for s in SOUNDS if s not in build_sfx.SFX or build_sfx.SFX[s][0] != SOUNDS[s][0]]
    if missing:
        raise SystemExit(f'add these to build_sfx.SFX with the same variant count: {missing}')
    if '--check' in sys.argv:
        absent = [f'{s}-{n}' for s, (v, *_r) in SOUNDS.items() for n in range(1, v + 1)
                  if not os.path.exists(os.path.join(OUT, f'{s}-{n}.mp3'))]
        if absent:
            raise SystemExit(f'missing loot sfx: {absent}; run build_loot_sfx.py')
        subprocess.run([sys.executable, os.path.join(HERE, 'build_sfx.py'), '--check'], check=True)
        print(f'loot sfx present ({sum(v for v, *_r in SOUNDS.values())} files)')
        return
    keep = sys.argv[sys.argv.index('--wav') + 1] if '--wav' in sys.argv else None
    if keep:
        os.makedirs(keep, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    for sid, (variants, *_r) in SOUNDS.items():
        for n in range(1, variants + 1):
            x = render(sid, n)
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
                tmp = f.name
            write_wav(tmp, x)
            if keep:
                write_wav(os.path.join(keep, f'{sid}-{n}.wav'), x)
            dest = os.path.join(OUT, f'{sid}-{n}.mp3')
            subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', tmp,
                            '-b:a', '96k', '-map_metadata', '-1', dest], check=True)
            os.unlink(tmp)
            print(f'wrote {sid}-{n}.mp3 ({len(x) / SR:.2f} s)')
    write_index()
    print('wrote sfx/index.json')


if __name__ == '__main__':
    main()
