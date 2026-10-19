"""The Practice Routine's spoken lines, in every voice: generated with ElevenLabs and
processed into app/assets/audio/voice/<voice>/<line>.mp3 (design/voice-samples.md).

Everything that makes a voice sound the way it does is here, so the lines can be
made again, a new kind of practice item given its lines, or the whole set made in
another language without the voices changing character:

- VOICES: each voice's ElevenLabs library voice id, model, voice settings and any
  delivery tag (v3 reads a bracketed direction such as "[softly, calmly]" and does
  not speak it). Both models are multilingual, so the same voice id with the same
  settings speaks another language in the same voice and manner.
- LINES: the text of every line, per language, as whole sentences. A line is never
  stitched from parts (that is what makes a voice sound choppy), and a translation
  gives each sentence whole too, so it can follow its own grammar.
- process(): trimmed of silence at both ends, loudness matched to -18 LUFS, mono
  96 kbps MP3 at 44.1 kHz.

Usage (the API key comes from the environment and is never written to the repo):

    ELEVENLABS_API_KEY=... python3 design/source/voice_lines.py [--lang en]
        [--voice lily ...] [--line done-arpeggios ...] [--force] [--list]

Lines already in place are skipped unless --force. Raw generations are kept in
local/voice-raw/ (ignored by Git) so a line can be re-processed without paying
for it again. English lines go to app/assets/audio/voice/<voice>/; another
language's to app/assets/audio/voice/<lang>/<voice>/ (the app reads only English
today: voiceUrl in app/src/timer.js would take the language).
"""
import argparse
import json
import os
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]  # musicpractice/
RAW = ROOT.parent / "local" / "voice-raw"
OUT = ROOT / "app" / "assets" / "audio" / "voice"

# The calm, even read each voice was chosen for (design/voice-samples.md).
SOFT = {"stability": 0.6, "similarity_boost": 0.75, "style": 0.1, "use_speaker_boost": True, "speed": 0.92}
VOICES = {
    # name: (ElevenLabs voice id, model, voice settings, tag before the text, character)
    "lily": ("pFZP5JQG7iQjIQuC4Bku", "eleven_multilingual_v2",
             {"stability": 0.85, "similarity_boost": 0.7, "style": 0, "use_speaker_boost": False, "speed": 0.85}, "",
             "warm British woman (library), read slow and very steady"),
    "matilda": ("XrExE9yKIg1WjnnlVkGX", "eleven_v3", {"stability": 0.5, "similarity_boost": 0.75}, "[softly, calmly] ",
                "warm, friendly American woman (library), read softly"),
    "george": ("JBFqnCBsd6RMkjVDRZzb", "eleven_v3", {"stability": 0.5, "similarity_boost": 0.75}, "[softly, calmly] ",
               "warm, mature British man (library), read softly"),
    "clara": ("Qggl4b0xRMiqOwhPtVWT", "eleven_multilingual_v2", SOFT, "", "relaxing, calm American woman (shared library)"),
    "autumn": ("KoVIHoyLDrQyd4pGalbs", "eleven_multilingual_v2", SOFT, "", "Autumn Veil: warm, reflective American woman (shared library)"),
    "theo": ("UmQN7jS1Ee8B1czsUtQh", "eleven_multilingual_v2", SOFT, "", "Theo Silk: deep British man, sleep and meditation (shared library)"),
}

# The lines, per language. Each kind of practice item (PRESETS in app/src/timer.js,
# and "custom" for one of the player's own) has three: done-, next- and first-<kind>.
# Lengths and typed names are never spoken.
LINES = {
    "en": {
        "kinds": {
            "intonation": ("Intonation practice is complete.", "Next, intonation practice.", "Let's begin with intonation practice."),
            "scales": ("Scales are complete.", "Next, scales.", "Let's begin with scales."),
            "rhythms": ("Clapping rhythms are complete.", "Next, clapping rhythms.", "Let's begin with clapping rhythms."),
            "ghosting": ("Ghosting is complete.", "Next, ghosting.", "Let's begin with ghosting."),
            "metronome": ("Metronome practice is complete.", "Next, metronome practice.", "Let's begin with metronome practice."),
            "arpeggios": ("Arpeggios are complete.", "Next, arpeggios.", "Let's begin with arpeggios."),
            "sight-reading": ("Sight reading is complete.", "Next, sight reading.", "Let's begin with sight reading."),
            "improvisation": ("Improvisation is complete.", "Next, improvisation.", "Let's begin with improvisation."),
            "custom": ("That practice item is complete.", "On to your next practice item.", "Let's begin."),
        },
        "finished": "That's the end of your practice routine. Well done.",
        "hello": "Hello. I'll guide you through your practice routine.",
    },
}


def lines_for(lang):
    L = LINES[lang]
    out = {}
    for kind, (done, nxt, first) in L["kinds"].items():
        out[f"done-{kind}"] = done
        out[f"next-{kind}"] = nxt
        out[f"first-{kind}"] = first
    out["finished"] = L["finished"]
    out["hello"] = L["hello"]
    return out


def generate(key, voice, text, lang, dest):
    vid, model, settings, tag, _ = VOICES[voice]
    body = {"text": tag + text, "model_id": model, "voice_settings": settings}
    if lang != "en":
        body["language_code"] = lang
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_128",
        data=json.dumps(body).encode(), headers={"xi-api-key": key, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=90) as r:
        dest.write_bytes(r.read())


def process(raw, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    trim = "silenceremove=start_periods=1:start_threshold=-45dB:start_silence={}"
    af = ",".join([trim.format(0.05), "areverse", trim.format(0.12), "areverse",
                   "loudnorm=I=-18:TP=-1.5:LRA=11", "aresample=44100"])
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-af", af, "-ac", "1",
                    "-c:a", "libmp3lame", "-b:a", "96k", str(dest)], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", default="en")
    ap.add_argument("--voice", nargs="*", default=list(VOICES))
    ap.add_argument("--line", nargs="*")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--list", action="store_true")
    a = ap.parse_args()
    lines = lines_for(a.lang)
    if a.list:
        for name, text in lines.items():
            print(f"{name:24s} {text}")
        return
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        sys.exit("Set ELEVENLABS_API_KEY.")
    out_root = OUT if a.lang == "en" else OUT / a.lang
    failed = 0
    for voice in a.voice:
        for name, text in lines.items():
            if a.line and name not in a.line:
                continue
            dest = out_root / voice / f"{name}.mp3"
            if dest.exists() and not a.force:
                continue
            raw = RAW / a.lang / voice / f"{name}.raw.mp3"
            raw.parent.mkdir(parents=True, exist_ok=True)
            try:
                if a.force or not raw.exists():
                    generate(key, voice, text, a.lang, raw)
                process(raw, dest)
                print(voice, name, "ok")
            except Exception as e:  # keep going; report at the end
                failed += 1
                print(voice, name, "FAILED", getattr(e, "code", e))
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
