#!/usr/bin/env python3
"""Generate Widow's Bay sound effects with the ElevenLabs sound-generation API.

The prompts below are the source of truth for every effect. Each id matches a
sound name played by src/audio.js. Run:

    ELEVENLABS_API_KEY=... python3 widowsbay/design/source/build_sfx.py [--force] [ids...]

Raw generations are kept in design/source/sfx-raw/<id>.mp3; existing ones are
reused unless --force is given or their ids are listed. Every raw file is then
processed into widowsbay/assets/sfx/<id>.mp3 and the `sfx` table in
assets/manifest.json is rewritten. `--process` skips the API and only
reprocesses. The key is read from the environment only; never commit it.

Processing matches the band's recording (assets/audio/widowsbay.mp3), which
measures as F major, about 76 BPM in 4/4, warm and dark (53% of its energy in
the low mids, 1.5% above 6 kHz), compressed, and wide in a 60s style. So
effects are rolled off above 9 kHz and below 40 Hz, levelled to a common
loudness, and tonal ones are retuned into F (see TUNE).

Style: the game is a 1900s toy theatre, so effects are period stage foley
(wave machine, wind machine, thunder sheet, ropes and pulleys) rather than
realistic field recordings.
"""
import json
import os
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'assets', 'sfx')
MANIFEST = os.path.join(ROOT, 'assets', 'manifest.json')
API = 'https://api.elevenlabs.io/v1/sound-generation'

RAW = os.path.join(ROOT, 'design', 'source', 'sfx-raw')

# Semitone shifts that put each tonal effect's main partial in F major,
# measured from the raw generations: pearl's chime peaks at C9 (too bright for
# the mix, so down an octave), the keepsake harp at B4 (a tritone against F),
# the harbour bell's strongest partial just under E6.
TUNE = {'pearl': -12, 'keepsake': 1, 'arrive': 1.48,
        # the ship's bell onto F; the lantern chime (6.6 kHz, too bright) down to A
        'landho': -1.84, 'partyHit': -10.8}

# id: (seconds, prompt influence, loop, prompt)
SFX = {
    'sea': (12, 0.45, True,
            'Gentle night sea made by a Victorian theatre wave machine: dried peas rolling slowly '
            'inside a large wooden ocean drum, soft continuous swells, calm and seamless.'),
    'leap': (0.8, 0.5, False,
             'A small wooden toy ship jerked upward on creaking hemp ropes and a pulley, '
             'with a short whoosh of sea spray.'),
    'row': (0.5, 0.6, False,
            'A stagehand turns a wooden crank handle: one short ratcheting wooden clack.'),
    'pearl': (0.6, 0.6, False,
              'A single tiny bright glass chime, like a pearl dropped on a music box comb.'),
    'keepsake': (1.6, 0.5, False,
                 'An enchanted upward harp glissando with a soft celesta sparkle at the top.'),
    'hit': (1.0, 0.5, False,
            'A wooden ship hull thuds hard against rock: cracking timber and a splash.'),
    'wreck': (2.5, 0.45, False,
              'A wooden toy ship breaks apart and sinks: splintering timbers, groaning wood, '
              'a big splash, then bubbling water.'),
    'windWarn': (2.2, 0.45, False,
                 'A sea witch cackles in the distance while a theatre wind machine, canvas over '
                 'a turning wooden drum, starts to howl and rise.'),
    'wind': (1.2, 0.5, False,
             'One gust from a Victorian theatre wind machine, canvas over a wooden drum, '
             'whooshing up then settling.'),
    'boltWarn': (1.4, 0.5, False,
                 'Low distant rolling thunder made with a hanging theatre thunder sheet, '
                 'an ominous building rumble.'),
    'strike': (1.0, 0.5, False,
               'A lightning strike: a sharp electric crack followed by a loud theatre thunder '
               'sheet crash.'),
    'rockWarn': (0.9, 0.5, False,
                 'Water churning and bubbling up from below the surface, gurgling.'),
    'rockUp': (0.8, 0.5, False,
               'A heavy stone stage prop rising through a wooden trapdoor: grinding, a thump, '
               'water splashing off it.'),
    'arrive': (2.5, 0.45, False,
               'A harbour bell rings twice across calm night water, distant seagulls.'),
    'done': (1.5, 0.55, False,
             'A music box plays a short, gentle, resolving three-note flourish.'),
    'curtain': (2.0, 0.5, False,
                'Heavy velvet theatre curtains drawn open on a creaking rope pulley.'),
    'ui': (0.5, 0.6, False,
           'A soft wooden click, like a small toy theatre lever.'),
    # Act I ending: land ho, the deck party, the turn, the wreck, the guitar.
    'landho': (1.8, 0.55, False,
               "A ship's brass bell rung three times briskly, bright and joyful, with a little sea air."),
    'cheer': (2.0, 0.5, False,
              'A small theatre company of a dozen voices cheering and laughing on a wooden deck, a hatch '
              'banging open, feet stamping.'),
    'partyHit': (0.7, 0.6, False,
                 'A single warm glass chime as a paper lantern lights, with a soft puff of confetti.'),
    'revelry': (2.0, 0.5, False,
                'A crowd of revellers on a ship give a big cheer with whistles and a tambourine shake.'),
    'spirits': (3.0, 0.45, False,
                'An eerie airy choir of ghostly voices made by a wet finger on glass rims, rising over a '
                'theatre wind machine.'),
    'shipBreak': (2.0, 0.5, False,
                  'A wooden ship splitting in two: a huge timber crack, splintering planks, a mast groaning '
                  'and falling.'),
    'splash': (1.6, 0.5, False,
               'Two heavy halves of a wooden ship plunging into the sea, a deep splash and churning water.'),
    'guitarSink': (3.0, 0.45, False,
                   'An acoustic guitar sinking underwater: one muffled, detuned strum heard through water, '
                   'then slow rising bubbles.'),
}


def generate(key, sid, seconds, influence, loop):
    body = {'text': SFX[sid][3], 'duration_seconds': seconds, 'prompt_influence': influence}
    if loop:
        body['loop'] = True
    req = urllib.request.Request(API, data=json.dumps(body).encode(), method='POST', headers={
        'xi-api-key': key, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        if loop and e.code in (400, 422):  # older models reject `loop`
            return generate(key, sid, seconds, influence, False)
        raise SystemExit(f'{sid}: HTTP {e.code} {e.read()[:300]!r}')


def levels(path):
    out = subprocess.run(['ffmpeg', '-hide_banner', '-i', path, '-af', 'volumedetect', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    get = lambda k: next(float(l.split(':')[1].split()[0]) for l in out.splitlines() if k in l)
    return get('mean_volume'), get('max_volume')


def process(sid, loop):
    """Raw generation -> game asset: retune, warm roll-off, trim, level."""
    src, dest = os.path.join(RAW, sid + '.mp3'), os.path.join(OUT, sid + '.mp3')
    filters = []
    if TUNE.get(sid):
        filters.append(f'asetrate={44100 * 2 ** (TUNE[sid] / 12):.1f},aresample=44100')
    filters += ['highpass=f=40', 'lowpass=f=9000']
    if not loop:
        filters.append('silenceremove=start_periods=1:start_threshold=-50dB')
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        tmp = f.name
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-af', ','.join(filters),
                    '-ar', '44100', tmp], check=True)
    mean, peak = levels(tmp)
    gain = min(-19 - mean, -1.5 - peak)  # common loudness, never clipping
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', tmp, '-af', f'volume={gain:.2f}dB',
                    '-b:a', '128k', dest], check=True)
    os.unlink(tmp)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    force, only_process = '--force' in sys.argv, '--process' in sys.argv
    unknown = [a for a in args if a not in SFX]
    if unknown:
        raise SystemExit(f'unknown ids: {unknown}')
    key = os.environ.get('ELEVENLABS_API_KEY')
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(RAW, exist_ok=True)
    for sid, (seconds, influence, loop, _) in SFX.items():
        raw = os.path.join(RAW, sid + '.mp3')
        wanted = (force and (not args or sid in args)) or sid in args or not os.path.exists(raw)
        if wanted and not only_process:
            if not key:
                raise SystemExit('set ELEVENLABS_API_KEY to generate sound effects')
            with open(raw, 'wb') as f:
                f.write(generate(key, sid, seconds, influence, loop))
            print('generated', sid)
        if os.path.exists(raw):
            process(sid, loop)
    m = json.load(open(MANIFEST))
    m['sfx'] = {sid: {'status': 'delivered' if os.path.exists(os.path.join(OUT, sid + '.mp3')) else 'standin',
                      'file': f'sfx/{sid}.mp3', 'loop': SFX[sid][2]} for sid in SFX}
    with open(MANIFEST, 'w') as f:
        json.dump(m, f, indent=2)
        f.write('\n')
    print('processed', len(m['sfx']), 'effects; manifest updated')


if __name__ == '__main__':
    main()
