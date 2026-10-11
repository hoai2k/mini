#!/usr/bin/env python3
"""Generate the short music stingers for Half-Blood Quests with ElevenLabs.

The prompts are the stinger entries in design/music-requests.md. Each one is
composed with the ElevenLabs music API (falling back to the sound-generation
API, which takes shorter clips), then trimmed to its length with a short
fade, levelled and written to game/assets/music/<id>.mp3. The raw generations
are kept in local/percyjackson-stingers/ (ignored by Git) so processing can be
re-run without paying for new generations.

    ELEVENLABS_API_KEY=... python3 percyjackson/design/source/build_stingers.py [--force] [ids...]
    python3 percyjackson/design/source/build_stingers.py --process   # re-process raw files only
    python3 percyjackson/design/source/build_stingers.py --check     # list which stingers exist

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
OUT = os.path.join(ROOT, 'game', 'assets', 'music')
RAW = os.path.join(ROOT, '..', 'local', 'percyjackson-stingers')
MUSIC_API = 'https://api.elevenlabs.io/v1/music'
SFX_API = 'https://api.elevenlabs.io/v1/sound-generation'

STYLE = ('Epic fantasy adventure game score, ancient Greek instruments (lyre, bouzouki, aulos, frame drum) '
         'blended with modern orchestra, instrumental, no vocals except wordless choir. ')

# id: (seconds, prompt)
STINGERS = {
    'victory': (8, 'Triumphant short fanfare for completing a quest. Brass and wordless choir on a heroic six-note '
                   'theme in D, a lyre flourish, timpani roll, ends cleanly on a bright major chord with a short ring-out.'),
    'defeat': (6, 'Short somber sting for a lost battle. Low strings and a fading aulos phrase, soft frame drum, '
                  'unresolved but not hopeless, ends in quiet.'),
    'prophecy-line': (5, 'Mystical reveal sting as a line of an ancient prophecy comes true. Shimmering bells, a '
                         'whispered wordless choir swell, a lyre glissando, ending on a suspended chord.'),
    'claimed': (7, 'Glorious reveal sting as a young hero is claimed by their godly parent. A rising harp and string '
                   'swell, wordless choir blooming into a major chord, a single deep bell, a sea-wave cymbal swell.'),
}


def post(url, body, key):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method='POST', headers={
        'xi-api-key': key, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'})
    with urllib.request.urlopen(req, timeout=300) as r:
        return r.read()


def generate(key, sid):
    seconds, prompt = STINGERS[sid]
    try:
        # the music API composes at least ten seconds; the clip is trimmed afterwards
        return post(MUSIC_API, {'prompt': STYLE + prompt, 'music_length_ms': max(10000, int(seconds * 1000) + 2000)}, key)
    except urllib.error.HTTPError as e:
        print(f'{sid}: music API HTTP {e.code} {e.read()[:200]!r}; trying sound generation')
    try:
        return post(SFX_API, {'text': STYLE + prompt, 'duration_seconds': min(22, seconds + 1), 'prompt_influence': 0.6}, key)
    except urllib.error.HTTPError as e:
        raise SystemExit(f'{sid}: HTTP {e.code} {e.read()[:300]!r}')


def levels(path):
    out = subprocess.run(['ffmpeg', '-hide_banner', '-i', path, '-af', 'volumedetect', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    get = lambda k: next((float(l.split(':')[1].split()[0]) for l in out.splitlines() if k in l), -91.0)
    return get('mean_volume'), get('max_volume')


def process(sid):
    """Raw generation -> game asset: trim the lead-in silence, cut to length with a fade, level."""
    seconds = STINGERS[sid][0]
    src, dest = os.path.join(RAW, sid + '.mp3'), os.path.join(OUT, sid + '.mp3')
    fade = 1.2
    filters = ['silenceremove=start_periods=1:start_threshold=-45dB', f'atrim=0:{seconds}',
               f'afade=t=out:st={max(0, seconds - fade)}:d={fade}', 'highpass=f=35']
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        tmp = f.name
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-af', ','.join(filters),
                    '-ar', '44100', tmp], check=True)
    mean, peak = levels(tmp)
    gain = min(-16 - mean, -1.0 - peak)  # common loudness, never clipping
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', tmp, '-af', f'volume={gain:.2f}dB',
                    '-b:a', '160k', dest], check=True)
    os.unlink(tmp)
    print('wrote', os.path.relpath(dest, ROOT))


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if '--check' in sys.argv:
        for sid in STINGERS:
            print(f"{sid}: {'delivered' if os.path.exists(os.path.join(OUT, sid + '.mp3')) else 'not yet'}")
        return
    unknown = [a for a in args if a not in STINGERS]
    if unknown:
        raise SystemExit(f'unknown ids: {unknown}')
    force, only_process = '--force' in sys.argv, '--process' in sys.argv
    key = os.environ.get('ELEVENLABS_API_KEY')
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(RAW, exist_ok=True)
    for sid in STINGERS:
        if args and sid not in args:
            continue
        raw = os.path.join(RAW, sid + '.mp3')
        if not only_process and (force or not os.path.exists(raw)):
            if not key:
                raise SystemExit('set ELEVENLABS_API_KEY to generate stingers')
            for _ in range(3):
                with open(raw, 'wb') as f:
                    f.write(generate(key, sid))
                if levels(raw)[1] > -40:  # a near-silent generation is retried
                    break
                print('near-silent, retrying', sid)
            print('generated', sid)
        if os.path.exists(raw):
            process(sid)


if __name__ == '__main__':
    main()
