"""The metronome's Voice sound: the counting words in every Practice Routine voice,
generated with ElevenLabs and processed into app/assets/audio/count/<voice>/<word>.wav.

- WORDS: what is said for each word: the beats one to twelve, and between them
  "and" (eighths), "e", "and", "a" (sixteenths: "one e and a") and "trip", "let"
  (triplets: "one trip let"). Each is generated on its own, as a short sentence
  ("Seven."), so it carries a count's falling, finished delivery. "e" is asked
  for as the letter ("E."; "Ee." came back as "uh") and "a" as "Uh.".
- SETTINGS: one setting for every voice, steadier and quicker than their routine
  lines (multilingual v2, stability 0.8, speed 1.15), since a count has to be
  short. The voices are the routine's own (timer.js SPEAKERS).
- process(): raw 24 kHz PCM (no MP3, whose encoder delay would move every word
  off the beat) to 16-bit mono WAV at 24 kHz:
  - aligned: the start of the vowel (where the word first reaches 40% of its
    loudest, in 10 ms windows) is put exactly LEAD seconds into the file, by
    padding the start with silence or, for a longer lead-in, cutting it with a
    short fade in. The metronome plays every word LEAD early (metronome.js
    COUNT_LEAD), so the vowel, where a count is heard to fall, lands on the beat.
  - trimmed after the last sound (2% of the loudest) with a 10 ms fade out.
  - levelled: the vowel's first 120 ms brought to LEVEL dBFS RMS, the peak kept
    under 0.98.

Every word was checked by transcribing it (faster-whisper, small.en): numbers
and "trip", "let" come back as themselves; a word that did not ("E" heard as
"A") was generated again until it did.

Usage (the key comes from the environment and is never written to the repo):

    ELEVENLABS_API_KEY=... python3 design/source/count_voice.py [--voice lily ...]
        [--word e ...] [--force] [--process-only]

Raw generations are kept in local/count-raw/<voice>/<word>.pcm (ignored by Git),
so the words can be processed again without paying for them again.
"""
import argparse
import json
import os
import struct
import urllib.request
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]  # musicpractice/
RAW = ROOT.parent / "local" / "count-raw"
OUT = ROOT / "app" / "assets" / "audio" / "count"

VOICES = {
    "lily": "pFZP5JQG7iQjIQuC4Bku",
    "matilda": "XrExE9yKIg1WjnnlVkGX",
    "george": "JBFqnCBsd6RMkjVDRZzb",
    "clara": "Qggl4b0xRMiqOwhPtVWT",
    "autumn": "KoVIHoyLDrQyd4pGalbs",
    "theo": "UmQN7jS1Ee8B1czsUtQh",
}
MODEL = "eleven_multilingual_v2"
SETTINGS = {"stability": 0.8, "similarity_boost": 0.75, "style": 0, "use_speaker_boost": True, "speed": 1.15}
WORDS = {
    "one": "One.", "two": "Two.", "three": "Three.", "four": "Four.", "five": "Five.", "six": "Six.",
    "seven": "Seven.", "eight": "Eight.", "nine": "Nine.", "ten": "Ten.", "eleven": "Eleven.", "twelve": "Twelve.",
    "and": "And.", "e": "E.", "a": "Uh.", "trip": "Trip.", "let": "Let.",
}
RATE = 24000
LEAD = 0.12  # seconds from the file's start to the vowel (metronome.js COUNT_LEAD)
LEVEL = -12.0  # dBFS RMS over the vowel's first 120 ms


def generate(voice, word):
    key = os.environ["ELEVENLABS_API_KEY"]
    body = json.dumps({"text": WORDS[word], "model_id": MODEL, "voice_settings": SETTINGS}).encode()
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICES[voice]}?output_format=pcm_{RATE}",
        data=body, headers={"xi-api-key": key, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def process(pcm):
    x = np.frombuffer(pcm, dtype="<i2").astype(np.float64) / 32768
    win = int(RATE * 0.01)
    env = np.sqrt(np.convolve(x * x, np.ones(win) / win, "same"))
    peak = env.max()
    onset = int(np.argmax(env > peak * 0.05))
    vowel = int(np.argmax(env > peak * 0.4))
    end = len(env) - int(np.argmax(env[::-1] > peak * 0.02))
    lead = int(LEAD * RATE)
    start = vowel - lead
    y = x[max(0, start):min(len(x), end + win)].copy()
    if start < 0:
        y = np.concatenate([np.zeros(-start), y])
    elif start > onset:  # a lead-in longer than LEAD: cut, fading in
        fade = int(RATE * 0.01)
        y[:fade] *= np.linspace(0, 1, fade)
    fade = int(RATE * 0.01)
    y[-fade:] *= np.linspace(1, 0, fade)
    body = y[lead:lead + int(RATE * 0.12)]
    rms = np.sqrt(np.mean(body * body))
    gain = 10 ** (LEVEL / 20) / rms
    gain = min(gain, 0.98 / np.abs(y).max())
    return y * gain


def write_wav(path, y):
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(RATE)
        f.writeframes(b"".join(struct.pack("<h", int(round(v * 32767))) for v in y))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", nargs="*", default=list(VOICES))
    ap.add_argument("--word", nargs="*", default=list(WORDS))
    ap.add_argument("--force", action="store_true", help="generate again even if a raw take is kept")
    ap.add_argument("--process-only", action="store_true")
    a = ap.parse_args()
    for v in a.voice:
        for w in a.word:
            raw = RAW / v / f"{w}.pcm"
            if not a.process_only and (a.force or not raw.exists()):
                raw.parent.mkdir(parents=True, exist_ok=True)
                raw.write_bytes(generate(v, w))
                print(v, w, "generated")
            write_wav(OUT / v / f"{w}.wav", process(raw.read_bytes()))
    print("done")


if __name__ == "__main__":
    main()
