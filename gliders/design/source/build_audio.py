#!/usr/bin/env python3
"""Generate the Gliders sound effects with ElevenLabs and the game's audio list.

Edit the data in this file, then run:

    ELEVENLABS_API_KEY=... python3 gliders/design/source/build_audio.py           # make missing sounds
    ELEVENLABS_API_KEY=... python3 gliders/design/source/build_audio.py --force wind-dive
    python3 gliders/design/source/build_audio.py --check                          # verify up to date

The key is read from ELEVENLABS_API_KEY or ~/.config/elevenlabs.key; it is
never written to the repository. Generation needs ffmpeg.

Outputs:
    gliders/game/assets/audio/<id>[-n].mp3   the sounds (loops crossfaded to loop seamlessly)
    gliders/game/src/audio-list.js           what the game loads
    gliders/design/sound-effects.md          the prompts, for regenerating by hand

The wind is the heart of the sound. The game layers the loops and crossfades
them by speed: wind-glide when slow, wind-fast in normal flight, wind-dive at
full speed; wind-close rises with proximity to a surface, flutter with speed
and when flaring. Without the files the game falls back to synthesised wind.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "game" / "assets" / "audio"
LIST = ROOT / "game" / "src" / "audio-list.js"
DOC = ROOT / "design" / "sound-effects.md"
API = "https://api.elevenlabs.io/v1/sound-generation"

NO_EXTRAS = "No music, no voices, no birds, no engines."

SOUNDS = [
    {
        "id": "wind-glide", "kind": "loop", "seconds": 12, "influence": 0.6, "variants": 1,
        "used": "Slow gliding: the bed under everything at low speed.",
        "prompt": "Constant soft airflow rushing past the ears while gliding slowly high in the open sky, "
        "smooth even airy hush with a faint low rumble, the same level the whole time, no gusts, no swells. "
        "Continuous, seamless. " + NO_EXTRAS,
    },
    {
        "id": "wind-fast", "kind": "loop", "seconds": 12, "influence": 0.6, "variants": 1,
        "used": "Normal flight at 40-80 m/s.",
        "prompt": "Strong continuous wind rushing past a wingsuit flyer at speed, full airy roar with a "
        "breathy hiss on top and gentle buffeting, steady intensity. Continuous, seamless. " + NO_EXTRAS,
    },
    {
        "id": "wind-dive", "kind": "loop", "seconds": 12, "influence": 0.65, "variants": 1,
        "used": "Full-speed dives above 90 m/s.",
        "prompt": "Extreme high-speed wind roar of a steep wingsuit dive, intense turbulent howling rush "
        "with heavy low buffeting and whistling, loud and powerful but steady. Continuous, seamless. " + NO_EXTRAS,
    },
    {
        "id": "wind-close", "kind": "loop", "seconds": 10, "influence": 0.6, "variants": 1,
        "used": "Proximity: rises as a glider skims close to a block.",
        "prompt": "Constant bright hissing rush of air streaming at high speed along a smooth stone wall "
        "right beside you, reflected tunnel-like roar, the same level the whole time, never stops or fades. "
        "Continuous, seamless. " + NO_EXTRAS,
    },
    {
        "id": "flutter", "kind": "loop", "seconds": 8, "influence": 0.55, "variants": 1,
        "used": "Wing membrane flutter: rises with speed and when flaring.",
        "prompt": "Thin taut fabric wing membrane fluttering rapidly in strong wind, fast rattling flap like "
        "a small kite edge, steady rhythm, close up, little background wind. Continuous, seamless. " + NO_EXTRAS,
    },
    {
        "id": "whoosh", "kind": "shot", "seconds": 1.2, "influence": 0.6, "variants": 3,
        "used": "A gap threaded or a tunnel cleared: a pass-by.",
        "prompt": "Very fast close whoosh of something small flying past a pillar, short sharp doppler air "
        "swish, clean, no impact. " + NO_EXTRAS,
    },
    {
        "id": "crash", "kind": "shot", "seconds": 1.4, "influence": 0.55, "variants": 2,
        "used": "A glider hits a block.",
        "prompt": "Soft heavy thump of a small flying animal bonking into a hard painted block, dull wooden "
        "knock with a puff of air and a little scatter of tumbling debris, not violent, slightly comic. " + NO_EXTRAS,
    },
]

XFADE = 0.75  # seconds of tail crossfaded onto the head of each loop


def files(s):
    if s["variants"] == 1:
        return [f"{s['id']}.mp3"]
    return [f"{s['id']}-{i + 1}.mp3" for i in range(s["variants"])]


def api_key():
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        p = Path.home() / ".config" / "elevenlabs.key"
        if p.exists():
            key = p.read_text().strip()
    if not key:
        sys.exit("No ElevenLabs key: set ELEVENLABS_API_KEY or write ~/.config/elevenlabs.key")
    return key


def request(s, key, loop):
    body = {"text": s["prompt"], "duration_seconds": s["seconds"], "prompt_influence": s["influence"],
            "model_id": "eleven_text_to_sound_v2"}
    if loop:
        body["loop"] = True
    req = urllib.request.Request(API, data=json.dumps(body).encode(), method="POST",
                                 headers={"xi-api-key": key, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as res:
        return res.read()


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                         capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def process(src, out: Path, s):
    out.parent.mkdir(parents=True, exist_ok=True)
    loud = "loudnorm=I=-20:TP=-2:LRA=11" if s["kind"] == "loop" else "loudnorm=I=-17:TP=-1.5:LRA=11"
    if s["kind"] == "loop":
        d = duration(src)
        x = min(XFADE, d / 4)
        # body + crossfade(tail -> head): plays body, then the tail fading into the
        # head, whose end leads straight back into the body. Seamless.
        graph = (
            f"[0:a]aformat=sample_rates=44100:channel_layouts=stereo,asplit=3[a][b][c];"
            f"[a]atrim={x}:{d - x},asetpts=PTS-STARTPTS[body];"
            f"[b]atrim={d - x}:{d},asetpts=PTS-STARTPTS[tail];"
            f"[c]atrim=0:{x},asetpts=PTS-STARTPTS[head];"
            f"[tail][head]acrossfade=d={x}:c1=qsin:c2=qsin[seam];"
            f"[body][seam]concat=n=2:v=0:a=1,{loud}[out]"
        )
    else:
        graph = (f"[0:a]aformat=sample_rates=44100:channel_layouts=stereo,"
                 f"silenceremove=start_periods=1:start_threshold=-55dB,afade=t=out:st={max(0.1, s['seconds'] - 0.25)}:d=0.25,{loud}[out]")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-filter_complex", graph, "-map", "[out]",
                    "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "128k", str(out)], check=True)


def levels(path):
    """Loudness in dB of each quarter second, and of the first and last 50 ms."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", "22050", "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    import array, math
    x = array.array("h", raw)
    def db(a):
        return 20 * math.log10(math.sqrt(sum(v * v for v in a) / max(1, len(a))) / 32768 + 1e-9)
    q = 22050 // 4
    return [db(x[i:i + q]) for i in range(0, len(x) - q, q)], db(x[:1100]), db(x[-1100:])


def steady(path):
    """A wind loop must never drop out, stay even, and match level across the seam."""
    segs, head, tail = levels(path)
    return min(segs) > -42 and max(segs) - min(segs) < 15 and abs(head - tail) < 6


def generate(s, key, force=False):
    for name in files(s):
        out = OUT / name
        if out.exists() and not force:
            continue
        for attempt in range(4):
            try:
                raw = request(s, key, s["kind"] == "loop")
            except urllib.error.HTTPError as e:
                raise SystemExit(f"{name}: ElevenLabs returned {e.code}: {e.read()[:300]!r}")
            with tempfile.NamedTemporaryFile(suffix=".mp3") as tmp:
                tmp.write(raw)
                tmp.flush()
                process(tmp.name, out, s)
            if s["kind"] != "loop" or steady(out):
                break
            print(f"  {name}: uneven take, trying again")
        else:
            print(f"  {name}: kept the last take, still uneven")
        print(f"made {out.relative_to(ROOT.parent)} ({duration(str(out)):.2f} s)")


def audio_list():
    data = {}
    for s in SOUNDS:
        present = [f"assets/audio/{n}" for n in files(s) if (OUT / n).exists()]
        data[s["id"]] = {"kind": s["kind"], "files": present}
    return (
        "// Generated by gliders/design/source/build_audio.py. Do not edit by hand.\n"
        "// Sounds listed with no files are not generated yet; the game synthesises\n"
        "// a stand-in for them.\n"
        "export const SOUNDS = " + json.dumps(data, indent=2) + ";\n"
    )


def document():
    out = [
        "# Gliders: sound effects",
        "",
        "Generated with ElevenLabs sound effects (`eleven_text_to_sound_v2`) by "
        "[`source/build_audio.py`](source/build_audio.py); edit the data there and rerun it. "
        "Loops are generated as loops and then crossfaded tail-to-head so they repeat seamlessly; "
        "everything is loudness-matched (loops at -20 LUFS, one-shots at -17).",
        "",
        "The wind layers are mixed by speed in `game/src/audio.js`: glide below about 35 m/s, fast "
        "from 35 to 90, dive above; close rises with proximity, flutter with speed and flaring.",
        "",
        "| Id | Kind | Length | Files | Used for |",
        "| --- | --- | --- | --- | --- |",
    ]
    for s in SOUNDS:
        out.append(f"| `{s['id']}` | {s['kind']} | {s['seconds']} s | {len(files(s))} | {s['used']} |")
    out += ["", "## Prompts", ""]
    for s in SOUNDS:
        out += [f"### {s['id']}", "", "```text", s["prompt"], "```", ""]
    return "\n".join(out).rstrip() + "\n"


def main() -> int:
    args = sys.argv[1:]
    if "--check" in args:
        stale = []
        for p, text in {LIST: audio_list(), DOC: document()}.items():
            if not p.exists() or p.read_text() != text:
                stale.append(p)
        for p in stale:
            print(f"out of date: {p.relative_to(ROOT.parent)} (rerun build_audio.py)")
        return 1 if stale else 0
    force = set(args[args.index("--force") + 1:]) if "--force" in args else set()
    key = None
    for s in SOUNDS:
        missing = any(not (OUT / n).exists() for n in files(s))
        if missing or s["id"] in force:
            key = key or api_key()
            generate(s, key, force=s["id"] in force)
    LIST.write_text(audio_list())
    DOC.write_text(document())
    print(f"wrote {LIST.relative_to(ROOT.parent)} and {DOC.relative_to(ROOT.parent)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
