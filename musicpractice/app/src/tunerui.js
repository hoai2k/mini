// The tuner screen. It reads the mic through the shared Recorder (its
// 'tuning' state, so the mic is the same one the recorder uses and is never
// asked for twice), shows the nearest note, or the nearest string of the
// chosen instrument, and how far off it is, and plays reference tones.

import { TEXT, setRich } from './text.js';
import { detectPitch, describe, nearestString, noteName, midiToHz, TUNINGS, TRANSPOSE, A4_MIN, A4_MAX, PitchSmoother } from './tuning.js';
import { playSamples } from './player.js';
import { forPlayback } from './loudness.js';
import { ScaleListener, resultTier, correctedRate, judgeNote, scaleRule, scoreOutOf10, celebrates, scoreText, SCORE_PARTS, LEVEL_IDS, MEASURES } from './scaletest.js';
import { confetti } from './confetti.js';

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

  const toggleTone = (midi, key, button) => toggleSound(key, button, referenceTone(midiToHz(midi, settings.a4)), 44100);
  /** Play `samples` (one sound at a time: a second press of the same button stops it). */
  async function toggleSound(key, button, samples, sampleRate) {
    if (tone?.key === key) { stopTone(); return; }
    stopTone();
    const mine = { key, button, handle: null };
    tone = mine;
    button.setAttribute('aria-pressed', 'true');
    try {
      const handle = await playSamples(samples, sampleRate);
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

  // ---- Fitting the screen: the tuner takes the window's height and no more.
  // Where it would scroll, the scale test's card loses its subtitle, then
  // shrinks, then loses the space above its rule and its box (the strip under
  // the rule is the button), and only then does the gauge give up the rest (never below
  // 100 px). Measured, since the controls' height varies by theme, font,
  // instrument and window.
  function fit() {
    const scr = $('tuner');
    if (scr.hidden) return;
    const card = $('scale-test');
    const root = document.documentElement;
    const over = () => root.scrollHeight - innerHeight;
    card.classList.remove('compact', 'tight', 'bare');
    body.classList.remove('tight');
    body.style.removeProperty('--gauge-max');
    for (const step of ['compact', 'tight', 'bare']) if (over() > 0) card.classList.add(step);
    // The gauge, a few times over (a smaller gauge can move other things).
    for (let k = 0; k < 4; k++) {
      const o = over();
      if (o <= 0) break;
      const g = $('gauge').getBoundingClientRect().height;
      if (g <= 72) break;
      body.style.setProperty('--gauge-max', `${Math.max(72, Math.floor(g - o - 2))}px`);
    }
    if (over() > 0) body.classList.add('tight');
  }
  let fitQueued = 0;
  function queueFit() { cancelAnimationFrame(fitQueued); fitQueued = requestAnimationFrame(fit); }
  addEventListener('resize', queueFit);
  visualViewport?.addEventListener('resize', queueFit);
  document.fonts?.ready.then(queueFit);
  document.addEventListener('art-applied', queueFit);
  // A status line, the strings of an instrument or a mic tip coming and going.
  if (typeof ResizeObserver === 'function') new ResizeObserver(queueFit).observe(body);

  // ---- Test My Scale Intonation. A sheet: how it works and a record button;
  // pressed, it listens for the scale and follows it; three seconds of quiet
  // and the results show there.
  const sheet = $('scale-sheet');
  const rec = $('scale-rec');
  let scale = null; // { listener, shownAt } while it listens
  function scaleStep(step) {
    sheet.dataset.step = step;
    const S = TEXT.tuner.scale;
    const l = scale?.listener;
    rec.dataset.state = step !== 'listening' ? 'off' : l?.state === 'listening' ? 'recording' : 'waiting';
    rec.setAttribute('aria-pressed', String(step === 'listening'));
    $('scale-rec-label').textContent = step === 'listening' ? S.stop : S.record;
    $('scale-status').textContent = step !== 'listening' ? S.ready
      : !l || l.state === 'waiting' ? S.waiting : S.listening(l.notes().length);
  }
  function startScale() {
    stopTone(); // a note of the last results, still playing
    scale = { listener: null, shownAt: 0 };
    scaleStep('listening');
  }
  /** Stop listening (the stop button, closing the sheet, leaving the tuner). */
  function stopScale() {
    scale = null;
    if (sheet.dataset.step === 'listening') scaleStep('ready');
  }
  $('scale-open').addEventListener('click', () => {
    scaleStep('ready');
    stopTone();
    reset(); // the tuner pauses while the sheet is up (receive), showing nothing
    sheet.showModal();
  });
  // Stop: once the scale has begun, its results at once (no waiting out the
  // three seconds of quiet); before it has, back to ready.
  rec.addEventListener('click', () => {
    if (!scale) { startScale(); return; }
    const { listener } = scale;
    if (listener?.state === 'listening') {
      listener.finish();
      scale = null;
      showScaleResults(listener.result, listener);
    } else stopScale();
  });
  $('scale-again').addEventListener('click', startScale);
  sheet.addEventListener('close', () => { stopTone(); stopScale(); });
  sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); });

  // The chime for the results (assets/audio/scale/<tier>.mp3, design/chime-sounds.md),
  // decoded once and played like the reference tones.
  const resultSounds = {};
  function resultChime(tier) {
    resultSounds[tier] ||= fetch(new URL(`../assets/audio/scale/${tier}.mp3`, import.meta.url))
      .then((r) => r.arrayBuffer())
      .then((data) => new OfflineAudioContext(1, 1, 44100).decodeAudioData(data))
      .catch(() => { delete resultSounds[tier]; return null; });
    resultSounds[tier].then((b) => { if (b) playSamples(b.getChannelData(0), b.sampleRate).catch(() => {}); });
  }

  const scaleRuleNow = () => scaleRule(settings.scaleLevel, { tolerance: settings.scaleTolerance, attack: settings.scaleAttack });
  let lastScale = null; // the last test's notes, judged again if the difficulty changes on its results
  function showScaleResults(notes, listener, { quiet = false } = {}) {
    lastScale = { notes, listener };
    const S = TEXT.tuner.scale;
    const rule = scaleRuleNow();
    // Each note judged by the difficulty's rule; `cents` is what it is judged by.
    const judged = notes.map((n) => ({ ...n, ...judgeNote(n, rule), measured: n.cents }));
    const good = judged.filter((n) => n.verdict === 'good').length;
    if (!quiet) resultChime(resultTier(good, notes.length));
    sheet.dataset.tier = resultTier(good, notes.length);
    $('scale-summary').textContent = notes.length ? S.summary(good, notes.length) : S.none;
    const sc = scoreOutOf10(judged, settings.scaleLevel, rule.tolerance);
    $('scale-notes').replaceChildren(...judged.map((n, i) => {
      const v = n.verdict;
      const c = Math.round(Math.abs(n.cents));
      const { name, octave } = noteName(n.midi, { flats: settings.flats, transpose: settings.transpose });
      const li = document.createElement('li');
      li.className = `scale-note ${v}`;
      li.innerHTML = '<span class="sn-note"><span class="sn-name"></span><span class="sn-oct"></span></span><span class="sn-mark" aria-hidden="true"></span><span class="sn-verdict"></span>';
      li.querySelector('.sn-name').textContent = name;
      li.querySelector('.sn-oct').textContent = octave;
      li.querySelector('.sn-mark').textContent = v === 'good' ? '✓' : v === 'flat' ? '↓' : '↑';
      // Which part was right: a note in tune by only part of it says which;
      // one out of tune whose start or end was right says so too.
      const others = n.parts.filter((p) => p !== n.by);
      // At the full-score levels, what else it lost points for (a tone not
      // quite clear, in tune but off the middle), and how many.
      const flaws = sc.marks ? sc.marks[i].flaws.map((f) => (f === 'weakTone' ? S.weakTone : S.offCentre(c, n.cents > 0))) : [];
      li.querySelector('.sn-verdict').textContent = [v === 'good'
        ? (n.parts.length === MEASURES.length ? S.good : S.goodBy(S.measures[n.by]))
        : [v === 'flat' ? S.flat(c) : S.sharp(c), ...(others.length ? [S.partly(S.measures[others[0]])] : [])].join(' · '), ...flaws].join(' · ');
      // A flaw always shows what it cost (at least 0.01, so it never reads as nothing).
      // In tenths like the score; a flaw that cost less than 0.05 reads "<0.1".
      const lost = sc.lost ? sc.lost[i] : 0;
      if (lost >= 0.05 || flaws.length) {
        const x = lost >= 0.05 ? lost.toFixed(1) : '<0.1';
        const tag = Object.assign(document.createElement('span'), { className: 'sn-lost', textContent: S.lost(x) });
        tag.setAttribute('aria-label', S.lostLabel(x === '<0.1' ? 'Less than 0.1' : x));
        li.querySelector('.sn-verdict').after(tag);
      }
      // Out of tune: hear the note as it was played, and the same sound
      // pitch-shifted onto the note it was meant to be (played at a sample
      // rate that much higher or lower, so a little shorter or longer too).
      if (v !== 'good' && listener) {
        const clip = forPlayback(listener.clip(n), listener.sampleRate); // brought up like a take (loudness.js)
        const play = document.createElement('span');
        play.className = 'sn-play';
        for (const [kind, rate] of [['asPlayed', listener.sampleRate], ['corrected', correctedRate(listener.sampleRate, n.measured)]]) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'pill sn-play-btn';
          b.dataset.kind = kind;
          b.setAttribute('aria-pressed', 'false');
          b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg><span></span>';
          b.querySelector('span').textContent = S[kind];
          b.setAttribute('aria-label', S[`${kind}Label`](`${name}${octave}`));
          b.addEventListener('click', () => toggleSound(`scale-${n.start}-${kind}`, b, clip, rate));
          play.append(b);
        }
        li.append(play);
      }
      return li;
    }));
    const by = new Intl.ListFormat('en', { type: 'disjunction' }).format(rule.use.map((k) => S.measures[k]));
    $('scale-help').textContent = S.help(TEXT.tuner.settings.scaleLevels[settings.scaleLevel], rule.tolerance, by);
    // The score out of 10 (scoreOutOf10), counted up as the sheet shows it, on
    // what each note was judged by; its parts only at the levels that have them.
    $('scale-score').hidden = !notes.length;
    const parts = $('scale-score-parts');
    parts.hidden = sc.simple || !notes.length;
    // Each part out of 10 of its own (in tune is worth 6 of the score, closeness 2.5, clear tone 1.5).
    const of10 = (x, k) => scoreText(Math.round((x / (SCORE_PARTS[k] / 100)) * 100) / 10);
    if (!sc.simple) parts.textContent = S.parts(of10(sc.parts.inTune, 'inTune'), of10(sc.parts.close, 'close'), of10(sc.parts.clear, 'clear'));
    const num = $('scale-score-num');
    const t0 = performance.now();
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const count = (t) => {
      const k = still ? 1 : Math.min(1, (t - t0) / 1100);
      num.textContent = scoreText(k < 1 ? Math.round(sc.score * (1 - (1 - k) ** 3) * 10) / 10 : sc.score); // counted in tenths
      if (k < 1 && sheet.dataset.step === 'results') requestAnimationFrame(count);
    };
    requestAnimationFrame(count);
    scaleStep('results');
    if (!sheet.open) sheet.showModal();
    // A perfect result: confetti, and a small crowd cheering just after the chime.
    if (!quiet && notes.length && celebrates(sc)) {
      setTimeout(() => confetti(sheet, $('scale-score').getBoundingClientRect()), still ? 0 : 900);
      setTimeout(() => { const a = new Audio(new URL('../assets/audio/scale/cheer.mp3', import.meta.url).href); a.play().catch(() => {}); }, 500);
    }
  }

  /** Mic samples (blocks of any size) while the recorder is in its 'tuning' state. */
  function receive(data, sampleRate) {
    if (scale) {
      scale.listener ||= new ScaleListener(sampleRate, { a4: settings.a4 });
      const event = scale.listener.push(data);
      if (event === 'done') {
        const { listener } = scale;
        scale = null;
        showScaleResults(listener.result, listener);
      } else if (event || performance.now() - scale.shownAt > 400) {
        scale.shownAt = performance.now();
        scaleStep('listening');
      }
    }
    // The tuner rests behind the scale test's sheet (it would only distract).
    if (sheet.open) return;
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

  // Test My Scale Intonation's difficulty, and Custom's own threshold and measure.
  const T = TEXT.tuner.settings;
  const level = $('scale-level');
  const tol = $('scale-tol');
  const attack = $('scale-attack');
  level.replaceChildren(...LEVEL_IDS.map((id) => new Option(T.scaleLevels[id], id)));
  attack.replaceChildren(...['mid', 'start', 'end'].map((id) => new Option(T.scaleAttacks[id], id)));
  function showLevel() {
    level.value = settings.scaleLevel;
    tol.value = settings.scaleTolerance;
    attack.value = settings.scaleAttack;
    $('scale-tol-label').textContent = T.scaleTolerance(settings.scaleTolerance);
    $('scale-custom').hidden = settings.scaleLevel !== 'custom';
  }
  // A change while results are showing judges them again at the new difficulty.
  const rejudge = () => { if (lastScale && sheet.dataset.step === 'results') showScaleResults(lastScale.notes, lastScale.listener, { quiet: true }); };
  level.addEventListener('change', () => { settings.scaleLevel = level.value; persist(); showLevel(); rejudge(); });
  tol.addEventListener('input', () => { settings.scaleTolerance = Number(tol.value); persist(); showLevel(); rejudge(); });
  attack.addEventListener('change', () => { settings.scaleAttack = attack.value; persist(); rejudge(); });
  showLevel();

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
    /** Leaving the tuner ends a scale test that is listening. */
    stopScale,
    fit: queueFit,
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
