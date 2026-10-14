// The tuner screen. It reads the mic through the shared Recorder (its
// 'tuning' state, so the mic is the same one the recorder uses and is never
// asked for twice), shows the nearest note, or the nearest string of the
// chosen instrument, and how far off it is, and plays reference tones.

import { TEXT, setRich } from './text.js';
import { detectPitch, describe, nearestString, noteName, midiToHz, TUNINGS, TRANSPOSE, A4_MIN, A4_MAX, PitchSmoother } from './tuning.js';
import { playSamples } from './player.js';

const WINDOW = 4096; // samples analysed at a time (enough for a low B on a 5-string bass)
const HOLD_MS = 1500; // the last note stays up this long after the sound stops
const STALE_MS = 250; // after this without a reading, the display dims
const IN_TUNE = 5; // cents either way that count as in tune
const DEG_PER_CENT = 0.9; // the gauge spans ±50 cents over ±45°
const CX = 160;
const CY = 176;
const SVG = 'http://www.w3.org/2000/svg';

const $ = (id) => document.getElementById(id);

function polar(cents, r) {
  const a = (cents * DEG_PER_CENT * Math.PI) / 180;
  return [CX + r * Math.sin(a), CY - r * Math.cos(a)];
}

/** A reference tone: a few harmonics (so low notes carry on phone speakers), soft start and end. */
export function referenceTone(hz, sec = 2.5, sampleRate = 44100) {
  const n = Math.round(sec * sampleRate);
  const out = new Float32Array(n);
  const partials = [1, 0.35, 0.18, 0.1].map((w, k) => [w, hz * (k + 1)]).filter(([, f]) => f < 8000);
  const attack = 0.015 * sampleRate;
  const release = 0.35 * sampleRate;
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    let v = 0;
    for (const [w, f] of partials) v += w * Math.sin(2 * Math.PI * f * t);
    const env = Math.min(1, i / attack) * Math.min(1, (n - i) / release) * (0.55 + 0.45 * Math.exp(-t * 1.8));
    out[i] = v * env;
    peak = Math.max(peak, Math.abs(out[i]));
  }
  if (peak > 0) for (let i = 0; i < n; i++) out[i] *= 0.6 / peak;
  return out;
}

export function setupTuner({ settings, persist, chips }) {
  const body = $('tuner-body');
  const needle = $('needle');
  const buf = new Float32Array(WINDOW);
  let filled = 0;
  const smoother = new PitchSmoother(5);
  let reading = null; // { hz, at, cents, midi, label }
  let angle = 0;
  let tone = null; // { handle, key }
  let lastNote = null; // chromatic: the note the reference button plays

  // ---- gauge
  const ticks = $('gauge-ticks');
  for (let c = -50; c <= 50; c += 5) {
    const level = c % 50 === 0 ? 2 : c % 10 === 0 ? 1 : 0;
    const [x1, y1] = polar(c, 150);
    const [x2, y2] = polar(c, [140, 132, 122][level]);
    const line = document.createElementNS(SVG, 'line');
    Object.entries({ x1, y1, x2, y2 }).forEach(([k, v]) => line.setAttribute(k, v.toFixed(1)));
    line.setAttribute('class', ['tick', 'tick mid', 'tick major'][level]);
    ticks.append(line);
  }
  {
    const [ax, ay] = polar(-IN_TUNE, 156);
    const [bx, by] = polar(IN_TUNE, 156);
    const [cx, cy] = polar(IN_TUNE, 116);
    const [dx, dy] = polar(-IN_TUNE, 116);
    $('gauge-zone').setAttribute('d', `M${ax},${ay} A156,156 0 0 1 ${bx},${by} L${cx},${cy} A116,116 0 0 0 ${dx},${dy} Z`);
  }

  // ---- instrument and strings
  const tuning = () => TUNINGS.find((t) => t.id === settings.tuning) || TUNINGS[0];
  const select = $('tuning-select');
  for (const t of TUNINGS) select.append(new Option(t.label, t.id));
  select.value = settings.tuning;
  select.addEventListener('change', () => {
    settings.tuning = select.value;
    persist();
    stopTone();
    reset();
    render();
  });

  function stringButtons() {
    const box = $('strings');
    const t = tuning();
    box.hidden = !t.strings;
    $('ref-tone').hidden = !!t.strings;
    if (!t.strings) { box.replaceChildren(); return; }
    box.replaceChildren(...t.strings.map((midi, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'string';
      b.dataset.index = i;
      const { name, octave } = noteName(midi, { flats: settings.flats });
      b.innerHTML = `<span class="s-name"></span><span class="s-oct"></span>`;
      b.querySelector('.s-name').textContent = name;
      b.querySelector('.s-oct').textContent = octave;
      b.setAttribute('aria-label', TEXT.tuner.playString(`${name}${octave}`));
      b.addEventListener('click', () => toggleTone(midi, `s${i}`, b));
      return b;
    }));
  }

  // ---- reference tones
  function stopTone() {
    if (!tone) return;
    tone.handle?.stop();
    tone.button?.setAttribute('aria-pressed', 'false');
    tone = null;
  }

  async function toggleTone(midi, key, button) {
    if (tone?.key === key) { stopTone(); return; }
    stopTone();
    const mine = { key, button, handle: null };
    tone = mine;
    button.setAttribute('aria-pressed', 'true');
    try {
      const handle = await playSamples(referenceTone(midiToHz(midi, settings.a4)), 44100);
      if (tone !== mine) { handle.stop(); return; }
      mine.handle = handle;
      handle.ended.then(() => { if (tone === mine) stopTone(); });
    } catch {
      if (tone === mine) stopTone();
    }
  }

  const refBtn = $('ref-tone');
  refBtn.addEventListener('click', () => toggleTone(lastNote ?? 69, 'ref', refBtn));
  function refLabel() {
    const midi = lastNote ?? 69;
    const { name, octave } = noteName(midi, { flats: settings.flats, transpose: settings.transpose });
    refBtn.textContent = TEXT.tuner.playNote(`${name}${octave}`);
    refBtn.setAttribute('aria-label', TEXT.tuner.playReference(`${name}${octave}`));
  }

  // ---- readings
  function reset() {
    filled = 0;
    reading = null;
    smoother.reset();
    show();
  }

  /** Mic samples (blocks of any size) while the recorder is in its 'tuning' state. */
  function receive(data, sampleRate) {
    if (data.length >= WINDOW) {
      buf.set(data.subarray(data.length - WINDOW));
    } else {
      buf.copyWithin(0, data.length);
      buf.set(data, WINDOW - data.length);
    }
    filled = Math.min(WINDOW, filled + data.length);
    if (filled < WINDOW) return;
    const r = detectPitch(buf, sampleRate);
    const now = performance.now();
    if (r) {
      const hz = smoother.push(r.hz);
      reading = { hz, at: now, ...place(hz) };
      show();
    } else if (reading && now - reading.at > HOLD_MS) {
      reading = null;
      smoother.reset();
      show();
    }
  }

  /** Where a pitch sits: the note (or string) it is nearest, and the cents off. */
  function place(hz) {
    const t = tuning();
    if (t.strings) {
      const s = nearestString(hz, t.strings, settings.a4);
      return { midi: s.midi, cents: s.cents, string: s.index, ...noteName(s.midi, { flats: settings.flats }) };
    }
    const d = describe(hz, { a4: settings.a4, flats: settings.flats, transpose: settings.transpose });
    return { midi: d.midi, cents: d.cents, string: -1, name: d.name, octave: d.octave };
  }

  function show() {
    const r = reading;
    if (r) {
      // Re-place a held reading if the settings changed since.
      Object.assign(r, place(r.hz));
    }
    $('tn-letter').textContent = r ? r.name[0] : '–';
    $('tn-acc').textContent = r ? r.name.slice(1) : '';
    $('tn-oct').textContent = r ? r.octave : '';
    const inTune = !!r && Math.abs(r.cents) <= IN_TUNE;
    const c = r ? Math.round(r.cents) : 0;
    $('tn-cents').textContent = r ? TEXT.tuner.cents(c > 0 ? '+' : c < 0 ? '−' : '±', Math.abs(c)) : ' ';
    $('tn-hz').textContent = r ? TEXT.tuner.hz(r.hz.toFixed(1)) : '';
    const H = TEXT.tuner.hint;
    const hint = !r ? (tuning().strings ? H.playString : H.playNote)
      : inTune ? H.inTune
        : r.cents < 0 ? H.tooLow : H.tooHigh;
    if ($('tn-hint').textContent !== hint) $('tn-hint').textContent = hint;
    body.classList.toggle('live', !!r);
    body.classList.toggle('in-tune', inTune);
    body.classList.toggle('flat', !!r && !inTune && r.cents < 0);
    body.classList.toggle('sharp', !!r && !inTune && r.cents > 0);
    for (const b of document.querySelectorAll('#strings .string')) {
      b.classList.toggle('near', !!r && Number(b.dataset.index) === r.string);
      b.classList.toggle('tuned', !!r && Number(b.dataset.index) === r.string && inTune);
    }
    if (r && !tuning().strings && r.midi !== lastNote && tone?.key !== 'ref') {
      // The reference button plays the concert pitch of the note shown.
      lastNote = r.midi;
      refLabel();
    }
  }

  /** Each animation frame: ease the needle toward the reading, dim a stale one. */
  function animate() {
    const target = reading ? Math.max(-50, Math.min(50, reading.cents)) * DEG_PER_CENT : 0;
    angle += (target - angle) * (reading ? 0.3 : 0.12);
    if (Math.abs(target - angle) < 0.01) angle = target;
    needle.setAttribute('transform', `rotate(${angle.toFixed(2)} ${CX} ${CY})`);
    body.classList.toggle('held', !!reading && performance.now() - reading.at > STALE_MS);
  }

  // ---- settings
  const a4 = $('a4');
  const setA4 = (v) => {
    settings.a4 = Math.max(A4_MIN, Math.min(A4_MAX, Math.round(Number(v) || 440)));
    a4.value = settings.a4;
    setRich($('a4-label'), TEXT.common.referencePitch(settings.a4));
    persist();
    stringButtons();
    show();
  };
  a4.value = settings.a4;
  setRich($('a4-label'), TEXT.common.referencePitch(settings.a4));
  a4.addEventListener('input', () => setA4(a4.value));
  $('a4-down').addEventListener('click', () => setA4(settings.a4 - 1));
  $('a4-up').addEventListener('click', () => setA4(settings.a4 + 1));
  chips($('flats-chips'), [{ id: 'sharps', label: TEXT.tuner.settings.sharps }, { id: 'flats', label: TEXT.tuner.settings.flats }],
    () => (settings.flats ? 'flats' : 'sharps'),
    (v) => { settings.flats = v === 'flats'; persist(); render(); });
  const transpose = $('transpose');
  for (const t of TRANSPOSE) transpose.append(new Option(t.label, t.id));
  transpose.value = settings.transpose;
  transpose.addEventListener('change', () => { settings.transpose = transpose.value; persist(); render(); });

  function render() {
    stringButtons();
    refLabel();
    show();
  }
  render();

  return {
    /** Bring the controls in line with the settings (A4 may have changed on the Drone screen). */
    refresh() {
      a4.value = settings.a4;
      setRich($('a4-label'), TEXT.common.referencePitch(settings.a4));
      transpose.value = settings.transpose;
      render();
    },
    receive,
    animate,
    /** Leaving the screen or the mic closing: stop any tone and clear the reading. */
    stop() { stopTone(); reset(); },
    reset,
    /** Space bar: the reference tone (chromatic) or the nearest string's note. */
    playReference() {
      const t = tuning();
      if (!t.strings) { refBtn.click(); return; }
      const i = reading?.string ?? 0;
      document.querySelector(`#strings .string[data-index="${i}"]`)?.click();
    },
  };
}
