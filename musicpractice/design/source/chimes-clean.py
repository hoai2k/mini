# Clean up chime takes (design/chime-sounds.md): start at the strike, fade the
# tail into true silence, even out loudness. Run from a work folder holding
# raw/chime-*.mp3 (ElevenLabs takes); writes proc/<name>.mp3 and a spectrogram
# PNG each, and prints the measurements a listener cannot take by ear here.
import subprocess, sys, json, glob, os, numpy as np
D = os.getcwd()
PREFIX = os.environ.get("PREFIX", "chime")
os.makedirs(f'{D}/proc', exist_ok=True)
SR = 44100
def load(f):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
def db(x): return 20 * np.log10(max(x, 1e-9))
rows = []
for f in sorted(glob.glob(f"{D}/raw/{PREFIX}-*.mp3")):
    name = os.path.basename(f)[:-4]
    x = load(f)
    mono = np.abs(x).max(1)
    peak = mono.max()
    # envelope, 10 ms windows
    w = SR // 100
    env = np.array([mono[i:i + w].max() for i in range(0, len(mono), w)])
    onset = int(np.argmax(env > peak * 0.05))  # first window above -26 dB of peak
    start = max(0, onset * w - int(0.01 * SR))
    # tail: last window above -54 dB of peak
    above = np.nonzero(env > peak * 0.002)[0]
    end_w = above[-1] + 1 if len(above) else len(env)
    end = min(len(x), end_w * w + int(0.3 * SR))
    y = x[start:end].copy()
    # fade-in 5 ms; fade-out over the last 1.5 s (or a third, if short)
    fi = int(0.005 * SR); y[:fi] *= np.linspace(0, 1, fi)[:, None]
    fo = min(int(1.5 * SR), len(y) // 3); y[-fo:] *= (np.linspace(1, 0, fo) ** 2)[:, None]
    # loudness: match RMS of the first 2 s to a common level, peaks capped at -1 dBFS
    head = y[:2 * SR]
    rms = np.sqrt((head ** 2).mean())
    g = min(10 ** (-20 / 20) / max(rms, 1e-9), 10 ** (-1 / 20) / np.abs(y).max())
    y *= g
    noise = db(np.sqrt((x[:max(start, 1)] ** 2).mean())) if start > SR // 50 else None
    # strikes: count big envelope jumps
    e = env[onset:end_w]
    jumps = int(np.sum((e[1:] > e[:-1] * 2.5) & (e[1:] > peak * 0.1)))
    out = f'{D}/proc/{name}.mp3'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-i', '-', '-c:a', 'libmp3lame', '-b:a', '160k', out], input=y.astype(np.float32).tobytes())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', out, '-filter_complex', 'showspectrumpic=s=600x200:legend=0,format=rgb24', f'{D}/proc/{name}.png'])
    rows.append(dict(name=name, raw_s=round(len(x) / SR, 1), lead_s=round(start / SR, 2), out_s=round(len(y) / SR, 1), extra_strikes=jumps, gain_db=round(db(g), 1), clipped=bool(np.abs(x).max() >= 0.999)))
for r in rows: print(json.dumps(r, default=float))
