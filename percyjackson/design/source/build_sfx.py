#!/usr/bin/env python3
"""Generate Half-Blood Quests sound effects with the ElevenLabs sound-generation API.

Each effect has a few variants (the game picks one at random and nudges its
pitch, so repeats don't sound identical). Raw generations are kept in
local/percyjackson-sfx/ (ignored by Git); processing trims the lead-in
silence, cuts to length with a short fade, levels to a common loudness and
writes game/assets/sfx/<id>-<n>.mp3 plus game/assets/sfx/index.json, which
the game reads to know which effects exist.

    ELEVENLABS_API_KEY=... python3 percyjackson/design/source/build_sfx.py [--force] [ids...]
    python3 percyjackson/design/source/build_sfx.py --process   # re-process raw files only
    python3 percyjackson/design/source/build_sfx.py --check     # verify index.json matches the files

The key is read from the environment only; never commit it. Needs ffmpeg.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'game', 'assets', 'sfx')
RAW = os.path.join(ROOT, '..', 'local', 'percyjackson-sfx')
API = 'https://api.elevenlabs.io/v1/sound-generation'

# Clean, close, dry game sound effects: no music, no ambience bed.
STYLE = 'Single isolated video game sound effect, close and clean, dry studio recording, no music, no background noise. '

# id: (variants, seconds, prompt influence, loudness target dB, prompt)
SFX = {
    'swing': (3, 0.6, 0.55, -20, 'A quick sword swing whoosh through the air, a short bronze blade slicing, fast and light.'),
    'hit': (3, 0.5, 0.55, -17, 'A punchy melee hit on a monster: a blade striking a leathery creature, solid thump with a little crunch, no voice.'),
    'clang': (2, 0.7, 0.55, -18, 'A bronze sword striking a bronze shield, bright metallic clang with a short ring.'),
    'dust': (2, 1.0, 0.5, -21, 'A defeated monster bursting into a cloud of golden dust: a soft magical poof with a sparkling shimmer that fades.'),
    'coin': (2, 0.5, 0.6, -22, 'A single small gold coin landing and clinking on stone, bright and short.'),
    'loot': (1, 1.4, 0.5, -20, 'A magical treasure item dropping to the ground: a soft thud followed by a warm rising chime and sparkle.'),
    'chest': (1, 1.6, 0.5, -19, 'An old wooden treasure chest creaking open with iron hinges, then a gentle magical shimmer from inside.'),
    'break_wood': (2, 0.7, 0.55, -18, 'A wooden crate being smashed apart, planks cracking and splintering.'),
    'break_pot': (2, 0.7, 0.55, -18, 'A clay amphora pot shattering into pieces on a stone floor.'),
    'roll': (2, 0.5, 0.5, -22, 'A quick dodge roll on the ground: cloth and leather armor rustling with a soft thud.'),
    'bark': (3, 0.8, 0.5, -18, 'A large monstrous hellhound giving one deep, snarling bark, growly and menacing.'),
    'screech': (2, 0.9, 0.5, -20, 'A harpy creature giving a short shrill bird-like screech, half woman half bird, angry.'),
    'hiss': (2, 0.9, 0.5, -20, 'A large snake-woman monster hissing sharply, a long menacing hiss.'),
    'click': (2, 0.7, 0.55, -21, 'A small bronze mechanical spider skittering: rapid metallic clicking legs and tiny gears whirring.'),
    'roar': (2, 1.8, 0.5, -16, 'A huge bull-headed monster bellowing a deep angry roar with a snort, powerful and echoing.'),
    'boss': (1, 2.8, 0.5, -16, 'A dramatic boss appearance: a deep bronze gong hit with a low rumbling swell underneath.'),
    'heal': (1, 1.0, 0.5, -22, 'Drinking a magical healing nectar: a gentle sparkling shimmer rising, warm and soothing.'),
    'splash': (2, 1.0, 0.5, -18, 'A powerful wave of water surging and splashing, a quick magical water attack.'),
    'thunder': (2, 1.6, 0.5, -16, 'A sharp lightning strike crack with a short thunder boom, close.'),
    'gate': (1, 1.6, 0.5, -19, 'A glowing magical barrier dissolving: a rising energy hum that shatters softly into sparkles.'),
    'sight': (1, 0.9, 0.5, -22, 'A mystical vision activating: a soft airy whoosh with a high glassy shimmer.'),
    'rattle': (2, 0.8, 0.5, -21, 'A skeleton warrior moving: dry bones rattling and clacking together, a short menacing clatter.'),
    'moan': (2, 1.4, 0.5, -22, 'A ghost from the underworld: a low hollow moan that drifts and fades, eerie but not too scary for kids.'),
    'grind': (2, 1.0, 0.5, -20, 'A stone statue coming to life: heavy stone grinding and cracking, gravel trickling.'),
    'arrow': (2, 0.6, 0.55, -21, 'A bow releasing an arrow: a taut string twang and a fast arrow whoosh.'),
}


def generate(key, sid):
    _, seconds, influence, _, prompt = SFX[sid]
    body = {'text': STYLE + prompt, 'duration_seconds': max(0.5, seconds + 0.4), 'prompt_influence': influence}
    req = urllib.request.Request(API, data=json.dumps(body).encode(), method='POST', headers={
        'xi-api-key': key, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        raise SystemExit(f'{sid}: HTTP {e.code} {e.read()[:300]!r}')


def levels(path):
    out = subprocess.run(['ffmpeg', '-hide_banner', '-i', path, '-af', 'volumedetect', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    get = lambda k: next((float(l.split(':')[1].split()[0]) for l in out.splitlines() if k in l), -91.0)
    return get('mean_volume'), get('max_volume')


def process(sid, n):
    seconds, target = SFX[sid][1], SFX[sid][3]
    src, dest = os.path.join(RAW, f'{sid}-{n}.mp3'), os.path.join(OUT, f'{sid}-{n}.mp3')
    fade = min(0.25, seconds / 3)
    filters = ['silenceremove=start_periods=1:start_threshold=-40dB', f'atrim=0:{seconds}',
               f'afade=t=out:st={max(0, seconds - fade)}:d={fade}', 'highpass=f=40']
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        tmp = f.name
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-af', ','.join(filters),
                    '-ac', '1', '-ar', '44100', tmp], check=True)
    mean, peak = levels(tmp)
    gain = min(target - mean, -1.0 - peak)
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', tmp, '-af', f'volume={gain:.2f}dB',
                    '-b:a', '96k', dest], check=True)
    os.unlink(tmp)


def index():
    out = {}
    for sid, (variants, *_rest) in SFX.items():
        have = [n for n in range(1, variants + 1) if os.path.exists(os.path.join(OUT, f'{sid}-{n}.mp3'))]
        if have:
            out[sid] = have
    return out


def main():
    if '--check' in sys.argv:
        path = os.path.join(OUT, 'index.json')
        cur = json.load(open(path)) if os.path.exists(path) else {}
        if cur != index():
            raise SystemExit('sfx/index.json is out of date: run build_sfx.py --process')
        print(f'sfx index up to date ({sum(len(v) for v in cur.values())} files)')
        return
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    unknown = [a for a in args if a not in SFX]
    if unknown:
        raise SystemExit(f'unknown ids: {unknown}')
    force, only_process = '--force' in sys.argv, '--process' in sys.argv
    key = os.environ.get('ELEVENLABS_API_KEY')
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(RAW, exist_ok=True)
    for sid, (variants, *_rest) in SFX.items():
        if args and sid not in args:
            continue
        for n in range(1, variants + 1):
            raw = os.path.join(RAW, f'{sid}-{n}.mp3')
            if not only_process and (force or not os.path.exists(raw)):
                if not key:
                    raise SystemExit('set ELEVENLABS_API_KEY to generate sound effects')
                for _ in range(3):
                    with open(raw, 'wb') as f:
                        f.write(generate(key, sid))
                    if levels(raw)[1] > -40:   # a near-silent generation is retried
                        break
                print('generated', sid, n)
            if os.path.exists(raw):
                process(sid, n)
    with open(os.path.join(OUT, 'index.json'), 'w') as f:
        json.dump(index(), f, indent=1, sort_keys=True)
        f.write('\n')
    print('wrote sfx/index.json')


if __name__ == '__main__':
    main()
