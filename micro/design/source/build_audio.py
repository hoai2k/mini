#!/usr/bin/env python3
"""Generate the Micro prototypes' sound effects with ElevenLabs, and their audio list.

Edit the data in this file, then run:

    python3 micro/design/source/build_audio.py                    # make missing sounds
    python3 micro/design/source/build_audio.py --force mite/close
    python3 micro/design/source/build_audio.py --check            # verify up to date

The key is read from ELEVENLABS_API_KEY or ~/.config/elevenlabs.key; it is
never written to the repository. Generation needs ffmpeg. Adapted from
gliders/design/source/build_audio.py.

Outputs:
    micro/prototypes/assets/audio/<prototype>/<name>[-n].mp3
    micro/prototypes/shared/audio-list.js   what the prototypes load
    micro/design/sound-effects.md           the prompts, for regenerating by hand
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

ROOT = Path(__file__).resolve().parents[2]  # micro/
OUT = ROOT / "prototypes" / "assets" / "audio"
LIST = ROOT / "prototypes" / "shared" / "audio-list.js"
DOC = ROOT / "design" / "sound-effects.md"
API = "https://api.elevenlabs.io/v1/sound-generation"
XFADE = 1.5

NATURE = ("Sound design for a nature documentary about the microscopic world, like a BBC wildlife film: "
          "rich, organic, hyper-real cinematic foley, natural and warm, never electronic or mechanical. ")
CLEAN = "No music, no narration, no voices, no speech."
CLOSE = "Extremely close-miked, tiny, intimate, detailed. " + CLEAN


def S(id, kind, seconds, used, prompt, influence=0.55, variants=1, volume=1):
    return {"id": id, "kind": kind, "seconds": seconds, "used": used, "prompt": NATURE + prompt,
            "influence": influence, "variants": variants, "volume": volume}


GROUPS = [
    ("springtail", "Springtail (bog surface)"),
    ("mite", "Mite (moss canopy, SEM)"),
    ("tardigrade", "Tardigrade (water film)"),
    ("amoeba", "Amoeba (pool)"),
    ("paramecium", "Paramecium (pool)"),
    ("bacterium", "Bacterium (sediment)"),
]

SOUNDS = [
    # Springtail: the bog surface, the only level with real outdoor air.
    S("springtail/amb-bog", "loop", 12, "Ambience: the bog pool surface at springtail height.",
      "Calm outdoor ambience at the edge of a still bog pool on a mild day: a soft breeze over moss, faint water lapping, "
      "a distant insect hum, very sparse faraway birdsong. Even level, continuous, seamless. " + CLEAN, 0.5),
    S("springtail/jump", "oneshot", 0.6, "A (dash): the furcula jump.",
      "A tiny sharp springy snap-click followed by a very short airy whoosh, like a miniature catapult releasing. " + CLOSE, variants=3),
    S("springtail/land-water", "oneshot", 0.5, "Landing on the water film.",
      "A tiny soft plip of something very light landing on a still water surface, delicate, almost no splash. " + CLOSE, variants=3),
    S("springtail/land-sticky", "oneshot", 1.0, "Landing on a sundew leaf: stuck.",
      "A small wet sticky squelch and a stretchy tacky pull, like a fingertip pressed into honey. " + CLOSE),
    S("springtail/eat", "oneshot", 0.6, "X (eat): grazing pollen and spores.",
      "Tiny dry crunchy nibbling, a few quick crisp bites on a grain. " + CLOSE, variants=2),
    S("springtail/raindrop", "oneshot", 1.5, "A raindrop cratering the pool next to you.",
      "A single big heavy raindrop plunking into a calm pond right beside the microphone, deep resonant bloop and a ring of ripples. " + CLEAN),
    S("springtail/stenus-skim", "oneshot", 1.2, "The rove beetle skimming across the water.",
      "A fast thin hissing zip across a water surface, like a tiny speedboat streaking past, fading quickly. " + CLEAN),
    S("springtail/stenus-strike", "oneshot", 0.5, "The rove beetle's harpoon strike.",
      "An instant sharp sticky thwip, a tiny elastic tongue shooting out and snapping back. " + CLOSE),
    # Mite: moss and litter, plus the electron microscope's own hum.
    S("mite/amb-moss", "loop", 12, "Ambience: inside the moss cushion.",
      "Muffled, close, damp ambience deep inside a cushion of moss: very soft rustling, faint creaks of stems, a distant muted breeze "
      "overhead. Low and even, continuous, seamless. " + CLEAN, 0.5),
    S("mite/step", "oneshot", 0.5, "Footfalls (rate follows the gait).",
      "One tiny dry hard tap, like the tip of a beetle's leg clicking on a dry leaf. " + CLOSE, variants=4, volume=0.5),
    S("mite/dash", "oneshot", 1.0, "A (dash): the scramble.",
      "A quick flurry of tiny dry clicking scrabbles, many little hard legs scurrying fast over dry leaves. " + CLOSE),
    S("mite/close", "oneshot", 0.8, "B: closing into the armoured capsule.",
      "A small hollow hard clack-thunk of an armoured shell snapping shut, like a tiny seed pod closing. " + CLOSE),
    S("mite/open", "oneshot", 0.8, "Opening up again.",
      "A small hollow creak and soft click of a hard little shell hinging open. " + CLOSE),
    S("mite/bite", "oneshot", 0.5, "X: chelicerae bite.",
      "A tiny crisp pinching crunch, like snipping a thin dry fibre. " + CLOSE, variants=2),
    S("mite/blade", "oneshot", 0.8, "Pushing past a moss blade, which springs back.",
      "A soft swish and springy rustle of a thin green blade bending and flicking back. " + CLOSE, variants=3, volume=0.6),
    S("mite/predator", "oneshot", 1.5, "The predatory mite closing in.",
      "Fast, light, menacing skittering of long thin legs approaching quickly over dry leaves. " + CLOSE),
    # Tardigrade: the water film, wet and slow.
    S("tardigrade/amb-film", "loop", 12, "Ambience: inside the water film on a moss leaf.",
      "Close underwater ambience in a very thin layer of water: soft muffled bubbling, slow gentle gurgles, faint fizz, "
      "a dull distant pressure. Even, continuous, seamless. " + CLEAN, 0.5),
    S("tardigrade/step", "oneshot", 0.5, "Footfalls: a padded squish with a claw tick.",
      "A soft small squishy padded step with a tiny click of a claw at the end, underwater. " + CLOSE, variants=4, volume=0.5),
    S("tardigrade/dash", "oneshot", 1.0, "A (dash): the scramble.",
      "A hurried patter of soft squishy little steps underwater, clumsy and quick. " + CLOSE),
    S("tardigrade/bite", "oneshot", 0.6, "X: stylets pierce a cell.",
      "A tiny wet pop and a short sucking slurp, like piercing a grape skin with a needle and sipping. " + CLOSE, variants=2),
    S("tardigrade/tun", "oneshot", 2.5, "Y: drying into a tun.",
      "A slow shrinking dry crinkle and a soft deflating sigh, like a damp leaf curling up as it dries. " + CLOSE),
    S("tardigrade/revive", "oneshot", 2.5, "Rehydrating out of the tun.",
      "A slow gentle watery swelling gurgle, like a sponge soaking up water and plumping out. " + CLOSE),
    S("tardigrade/rain", "oneshot", 4.0, "Rain arriving on the moss.",
      "Rain beginning to fall on a moss cushion, heard muffled from inside: soft pattering building up, water trickling down. " + CLEAN),
    S("tardigrade/milnesium", "oneshot", 1.5, "The predatory tardigrade lunging.",
      "A heavy wet lunge and a deep sucking gulp underwater, ominous and close. " + CLOSE),
    # Amoeba: thick and viscous.
    S("amoeba/amb-pool", "loop", 12, "Ambience: the pool, very viscous and slow.",
      "Deep, slow, thick underwater ambience: a low rumbling murmur, occasional very slow viscous bubbles, muffled and calm. "
      "Even, continuous, seamless. " + CLEAN, 0.5),
    S("amoeba/stretch", "oneshot", 1.5, "A pseudopod flowing out.",
      "A slow soft gooey stretching sound, thick slime being pulled and flowing, wet and elastic. " + CLOSE, variants=3, volume=0.6),
    S("amoeba/boost", "oneshot", 1.0, "A (dash): the surge.",
      "A quick gooey surging whoosh, thick liquid rushing forward inside something soft. " + CLOSE),
    S("amoeba/engulf", "oneshot", 1.5, "X: the food cup closing round prey.",
      "A wet enveloping squelch and a soft closing gulp, slime folding around something and sealing. " + CLOSE),
    S("amoeba/vacuole", "oneshot", 0.5, "The contractile vacuole emptying.",
      "One soft round watery bubble pop. " + CLOSE, variants=2, volume=0.6),
    S("amoeba/digest", "oneshot", 2.0, "Digesting a food vacuole.",
      "A slow low gentle stomach-like gurgle, muffled. " + CLOSE),
    # Paramecium: a fast swimmer in the pond.
    S("paramecium/amb-pool", "loop", 12, "Ambience: open pond water.",
      "Faint underwater ambience in clear pond water: a very soft airy hiss, tiny distant ticks and fizzes, calm. "
      "Even, continuous, seamless. " + CLEAN, 0.5, volume=0.35),
    S("paramecium/swim", "loop", 6, "The cilia beating (volume and rate follow the swim speed).",
      "A soft continuous rhythmic shimmering rustle, like thousands of tiny feathers fluttering in water, steady. "
      "Continuous, seamless. " + CLOSE, 0.6, volume=0.7),
    S("paramecium/dash", "oneshot", 0.8, "A (dash): the sprint.",
      "A quick rushing underwater swish, a fast swimmer darting forward. " + CLOSE),
    S("paramecium/gulp", "oneshot", 0.6, "X: a feeding gulp.",
      "A small quick watery suction gulp. " + CLOSE, variants=2),
    S("paramecium/trichocysts", "oneshot", 0.8, "X when touched: trichocyst discharge.",
      "A sharp burst of many tiny needle-like snaps fired all at once, a crackling spray. " + CLOSE),
    S("paramecium/reverse", "oneshot", 0.8, "B: the avoidance reaction.",
      "A quick swirling reversing whoosh underwater, a sudden back-pedal and turn. " + CLOSE),
    S("paramecium/didinium", "oneshot", 1.5, "Didinium closing in.",
      "An ominous fast fluttering whirr approaching underwater, a spinning hunter getting closer, tense. " + CLOSE),
    S("paramecium/held", "oneshot", 1.5, "Held by Didinium's proboscis.",
      "A tense squeezing creak and a wet struggling stretch underwater. " + CLOSE),
    # Bacterium: Brownian fizz and the rotary motor.
    S("bacterium/amb-sediment", "loop", 12, "Ambience: Brownian motion in the sediment.",
      "A dense soft crackling fizz of a busy microbial world in pond mud, like tiny bubbles and grains jostling, constant tiny random pops, even and continuous, seamless. "
      + CLEAN, 0.5),
    S("bacterium/run", "loop", 4, "The flagellar motor during a run (rate follows speed).",
      "A fine soft continuous whirring hum, like a tiny insect wing or a spinning seed heard very close, organic and steady. Continuous, seamless. "
      + CLOSE, 0.6, volume=0.6),
    S("bacterium/tumble", "oneshot", 0.6, "B: a tumble.",
      "A short fluttering stutter, a tiny whirl faltering and flicking round in a new direction. " + CLOSE, variants=2),
    S("bacterium/sprint", "oneshot", 1.0, "A (dash): the sprint run.",
      "A quick rising whirr, a tiny organism surging forward with a soft high rush, then easing. " + CLOSE),
    S("bacterium/eat", "oneshot", 0.6, "X: absorbing nutrients.",
      "A tiny soft fizzy absorbing sip, bubbles dissolving. " + CLOSE, variants=2),
    S("bacterium/phage", "oneshot", 0.5, "A phage latching on.",
      "A tiny sharp sticky click, something minute latching firmly onto a soft surface. " + CLOSE),
    S("bacterium/graze", "oneshot", 2.0, "A grazer's feeding current pulling at you.",
      "A deep slow sucking current whoosh, a big drain pulling water in. " + CLEAN),
]


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
        data[s["id"]] = {"kind": s["kind"], "files": present, "volume": s.get("volume", 1)}
    return (
        "// Generated by micro/design/source/build_audio.py. Do not edit by hand.\n"
        "// Sounds listed with no files are not generated yet; the game synthesises\n"
        "// nothing (or its own stand-in) for them. Paths are relative to micro/prototypes/.\n"
        "export const SOUNDS = " + json.dumps(data, indent=2) + ";\n"
    )


def document():
    out = [
        "# Micro prototypes: sound effects",
        "",
        "Generated with ElevenLabs sound effects (`eleven_text_to_sound_v2`) by "
        "[`source/build_audio.py`](source/build_audio.py); edit the data there and rerun it. "
        "Loops are generated as loops and crossfaded tail-to-head so they repeat seamlessly; "
        "everything is loudness-matched (loops at -20 LUFS, one-shots at -17). The prototypes play "
        "them through `micro/prototypes/shared/audio.js`.",
        "",
        "Nothing makes a sound we could hear at these scales, so this is nature-documentary foley, as a "
        "wildlife film of these scenes would score them: each sound is "
        "what the action would feel like if you could hear it, scaled to the creature. The deeper the "
        "zoom, the more abstract it gets: bog and moss sounds for the springtail and mite, wet and "
        "viscous sounds for the water film and the pool, fizzing and rotary motor sounds for the bacterium.",
        "",
    ]
    for proto, title in GROUPS:
        out += [f"## {title}", "", "| Id | Kind | Length | Files | Used for |", "| --- | --- | --- | --- | --- |"]
        for s in [s for s in SOUNDS if s["id"].split("/")[0] == proto]:
            out.append(f"| `{s['id']}` | {s['kind']} | {s['seconds']} s | {len(files(s))} | {s['used']} |")
        out.append("")
    out += ["## Prompts", ""]
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
