// The Metronome screen: the tempo (number, slider, − and +, the pendulum's
// weight, common tempos by style), the picture and what is under it (dots,
// big dots, the Visualizer), its settings and strong beats, its volume, and
// the sync bar. main.js passes in what it shares and uses what this returns.
import { TEXT } from './text.js';
import { audio, freshAudio, unlock, setContextSpeaker, heardNow, keepAwake, setExtraDelay } from './audio.js';
import { dlog, debugBeat } from './debuglog.js';
import { Metronome, pendulumAngle, weightAt, bpmAtWeight, tapTempo, TAP_KEEP } from './metronome.js';
import { NativeMetronome } from './nativeaudio.js';
import { GENRES, GENRE_IDS, mainTempo, nameFor, genreRange } from './tempos.js';
import { clampBpm, SAVED_MAX, METERS, SOUNDS, VIZ_BARS, TICKS, barPlan, cleanPattern, meterOf, beatStrengths, BPM_MIN, BPM_MAX } from './settings.js';
import { swingOf, placeWeight, weightFromPoint } from './art.js';
import { tuckedVolume } from './tuckedvolume.js';
import { $, chips, note } from './ui.js';

/**
 * `mic` says what the Playback Recorder is doing with the sound engine
 * ({ listening(), playing() }): the metronome never starts a fresh one under it.
 */
export function setupMetronome({ settings, persist, useNative, mic }) {
  let metronome = null; // a Metronome, or a NativeMetronome in the apps
  let preview = null; // plays a click when a sound is chosen
  const pendulum = $('pendulum');
  const bpmInput = $('bpm-input');
  const bpmSlider = $('bpm-slider');

  /** The name under the number, in the tempo picker's style (Allegro, Medium swing, Waltz…). */
  function marking(bpm) {
    const genre = settings.tempoGenre;
    return tempoName(genre, nameFor(genre, bpm, settings.tempoPicked));
  }
  const tempoName = (genre, id) => (genre === 'classical' ? TEXT.metronome.markings[id] : TEXT.metronome.tempos.names[genre][id]);
  function showMarking() {
    $('marking').textContent = marking(settings.bpm);
    $('marking').setAttribute('aria-label', TEXT.metronome.tempos.open(marking(settings.bpm)));
  }

  let weightDrag = null; // the pendulum's weight while it is dragged (below)
  let weightMoved = false;
  function setBpm(v, { fromInput = false } = {}) {
    settings.bpm = clampBpm(v);
    if (!fromInput || document.activeElement !== bpmInput) bpmInput.value = settings.bpm;
    bpmSlider.value = settings.bpm;
    showMarking();
    if (!weightDrag) showWeight();
    metronome?.configure(settings);
    persist();
  }

  /** No bars: shown as four even beats (dots and Visualizer rows), none strong. */
  const shownBeats = () => (meterOf(settings.meter).beats === 1 ? [0, 0, 0, 0] : barPlan(settings).strengths);

  function renderBeats() {
    const list = $('beats');
    const strengths = shownBeats();
    list.replaceChildren(...strengths.map((s) => {
      const li = document.createElement('li');
      if (s === 2) li.className = 'strong';
      if (s === 1) li.className = 'mid';
      return li;
    }));
    // The Visualizer: a row per bar of music, a shape per beat, the strong beat red.
    $('met-bars').replaceChildren(...Array.from({ length: settings.vizBars }, () => {
      const row = document.createElement('div');
      row.className = 'met-measure';
      row.append(...strengths.map((s) => {
        const bar = document.createElement('i');
        bar.className = `met-bar${s === 2 ? ' strong' : s === 1 ? ' mid' : ''}`;
        // The bar's shape is its child, so a theme can cut it (Art Deco's angled
        // ends, Robot Future's chamfer) and the glow, drawn round the bar, still follows it.
        bar.append(Object.assign(document.createElement('i'), { className: 'met-shape' }));
        return bar;
      }));
      return row;
    }));
    $('met-bars').style.setProperty('--n', strengths.length);
    list.style.setProperty('--n', strengths.length);
    $('met-bars').style.setProperty('--rows', settings.vizBars);
    const m = meterOf(settings.meter);
    const accent = !settings.accent ? 'off' : settings.accentPattern ? 'custom' : 'on';
    $('meter-note').textContent = m.beats === 1 ? TEXT.metronome.noBars : TEXT.metronome.meterNote(m.id, accent);
    $('accent-label').textContent = accent === 'custom' ? TEXT.metronome.accents.custom : TEXT.metronome.settings.accent;
    $('accent').checked = settings.accent;
  }

  function metronomeConfigured() {
    renderBeats();
    queueFit();
    metronome?.configure(settings);
    persist();
  }

  /**
   * The context to start sound on from a tap: a fresh one if the old one may be
   * stuck on another output, but never while the mic is in use on it (a new
   * one would cut the Playback Recorder off mid-take).
   */
  const soundCtx = () => (mic.listening() || mic.playing() ? audio() : freshAudio());

  function startMetronome() {
    if (useNative) {
      if (!metronome?.native) metronome = new NativeMetronome();
      metronome.configure(settings);
      metronome.start().catch(() => { note(TEXT.metronome.couldntStart); stopMetronome(); });
    } else {
      // A fresh context if the old one may be stuck on another output (this is a
      // tap, so the new one may start), unless the mic is using it.
      const ctx = soundCtx();
      unlock();
      if (!metronome || metronome.ctx !== ctx) {
        metronome = new Metronome(ctx);
        if (settings.speaker !== 'default') setContextSpeaker(settings.speaker);
      }
      metronome.configure(settings);
      metronome.start();
    }
    dlog('metronome-start', { native: useNative, volume: settings.volume, sound: settings.sound, bpm: settings.bpm, ctx: metronome.ctx?.state ?? null, speaker: settings.speaker === 'default' ? 'default' : 'picked' });
    setTimeout(debugBeat, 1500); // how loud it came out, once it has been playing a moment
    pendulum.classList.remove('resting');
    $('met-toggle').setAttribute('aria-pressed', 'true');
    $('met-toggle-label').textContent = TEXT.metronome.stop;
    keepAwake(true);
  }

  function stopMetronome() {
    if (metronome?.running) { metronome.stop(); dlog('metronome-stop'); }
    pendulum.classList.add('resting');
    pendulum.style.transform = 'rotate(0deg)';
    for (const li of $('beats').children) { li.classList.remove('on'); li.style.removeProperty('--g'); }
    for (const b of $('met-bars').querySelectorAll('.met-bar')) b.style.setProperty('--lit', '0');
    $('metronome-art').style.setProperty('--lit', '0');
    $('met-toggle').setAttribute('aria-pressed', 'false');
    $('met-toggle-label').textContent = TEXT.metronome.start;
    keepAwake(false);
  }

  $('met-toggle').addEventListener('click', () => (metronome?.running ? stopMetronome() : startMetronome()));

  // Tap tempo: from the second tap the tempo follows the taps (tapTempo in metronome.js).
  let tapTimes = [];
  let tapLit = 0;
  function tap(at = performance.now()) {
    tapTimes = [...tapTimes, at].slice(-TAP_KEEP - 1);
    const bpm = tapTempo(tapTimes);
    if (bpm) { settings.tempoPicked = null; setBpm(bpm); }
    const b = $('tap-tempo');
    b.classList.add('hit');
    clearTimeout(tapLit);
    tapLit = setTimeout(() => b.classList.remove('hit'), 120);
  }
  // On the finger coming down (the moment of the beat), not on its release.
  $('tap-tempo').addEventListener('pointerdown', (e) => { if (!e.button) tap(e.timeStamp); });
  $('tap-tempo').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(); } });

  bpmSlider.min = BPM_MIN;
  bpmSlider.max = BPM_MAX;
  bpmSlider.addEventListener('input', () => setBpm(bpmSlider.value));
  bpmInput.addEventListener('input', () => {
    const n = Number(bpmInput.value);
    if (bpmInput.value !== '' && n >= BPM_MIN && n <= BPM_MAX) setBpm(n, { fromInput: true });
  });
  bpmInput.addEventListener('change', () => setBpm(bpmInput.value === '' ? settings.bpm : bpmInput.value));
  bpmInput.addEventListener('blur', () => setBpm(bpmInput.value === '' ? settings.bpm : bpmInput.value));
  bpmInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { setBpm(bpmInput.value || settings.bpm); bpmInput.blur(); }
    if (e.key === 'Escape') { bpmInput.value = settings.bpm; bpmInput.blur(); e.stopPropagation(); }
  });
  bpmInput.addEventListener('focus', () => bpmInput.select());

  // − and +: one beat per tap, faster while held.
  for (const [id, d] of [['bpm-down', -1], ['bpm-up', 1]]) {
    const b = $(id);
    let timer = null;
    const stop = () => { clearTimeout(timer); timer = null; };
    const repeat = (delay, n) => {
      timer = setTimeout(() => { setBpm(settings.bpm + d * (n > 12 ? 5 : 1)); repeat(n > 4 ? 60 : 120, n + 1); }, delay);
    };
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); setBpm(settings.bpm + d); repeat(450, 0); });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, stop);
    b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setBpm(settings.bpm + d); } });
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  const metSettings = $('met-settings');
  $('met-settings-btn').addEventListener('click', () => metSettings.showModal());
  const meterSelect = $('meter');
  meterSelect.replaceChildren(...METERS.map((m) => new Option(m.beats === 1 ? TEXT.metronome.noBars : m.id, m.id)));
  meterSelect.value = settings.meter;
  /** A new time signature. Custom strong beats belong to their time signature: a new one starts from Strong beat on 1, unless this visit already set it its own. */
  function setMeter(id) {
    if (id === settings.meter) return;
    const had = settings.accentPattern;
    if (had) customAccents.set(settings.meter, had);
    settings.meter = id;
    meterSelect.value = id;
    settings.accentPattern = customAccents.get(settings.meter) || null;
    if (had || settings.accentPattern) settings.accent = true;
    metronomeConfigured();
  }
  meterSelect.addEventListener('change', () => setMeter(meterSelect.value));
  const soundSelect = $('sound');
  soundSelect.replaceChildren(...SOUNDS.map((o) => new Option(o.label, o.id)));
  soundSelect.value = settings.sound;
  soundSelect.addEventListener('change', () => {
    settings.sound = soundSelect.value;
    metronomeConfigured();
    // Let them hear it (through Web Audio, also in the apps).
    if (!metronome?.running) {
      const ctx = audio();
      unlock();
      if (!preview || preview.ctx !== ctx) preview = new Metronome(ctx);
      preview.configure(settings);
      preview.voice(ctx.currentTime + 0.02, 2);
    }
  });
  // Extra notes between the beats: a switch saying which (Add eighth notes), and
  // a pencil to choose triplets or sixteenths instead.
  function showSub() {
    $('sub-label').textContent = TEXT.metronome.settings.subAdd[settings.subKind];
    $('sub-on').checked = settings.subOn;
  }
  function setSub(on, kind = settings.subKind) {
    settings.subOn = on;
    settings.subKind = kind;
    settings.subdivision = on ? kind : 1;
    showSub();
    metronomeConfigured();
  }
  $('sub-on').addEventListener('change', () => setSub($('sub-on').checked));
  const syncSubChips = chips($('sub-chips'), [2, 3, 4].map((n) => ({ id: n, label: TEXT.metronome.settings.subdivisions[n] })), () => settings.subKind, (n) => {
    setSub(true, n); // choosing one turns them on
    $('sub-editor').close();
  });
  $('sub-edit').addEventListener('click', () => { syncSubChips(); $('sub-editor').showModal(); });
  showSub();
  $('accent').checked = settings.accent;
  $('accent').addEventListener('change', () => {
    settings.accent = $('accent').checked;
    // Off forgets a custom pattern for the time being; on brings back this visit's.
    if (!settings.accent && settings.accentPattern) customAccents.set(settings.meter, settings.accentPattern);
    settings.accentPattern = settings.accent ? customAccents.get(settings.meter) || null : null;
    metronomeConfigured();
  });

  // ---------------------------------------------------------------- strong beats

  /*
   * Custom strong beats: the pencil beside Strong beat on 1 opens every place a
   * click falls in the bar (beats, and the eighths, triplets or sixteenths when
   * those are on). Positions are kept in twelfths of a beat (TICKS in
   * settings.js), so a pattern set with eighths still means the same with
   * sixteenths; one the current clicks don't fall on is kept, just not shown.
   * Each time signature keeps its own pattern for this visit; only the one in
   * use is saved.
   */
  const customAccents = new Map(); // meter -> pattern, this visit only
  if (settings.accentPattern) customAccents.set(settings.meter, settings.accentPattern);
  const accentEditor = $('accent-editor');
  let editing = null; // { on: Set of positions, hidden: positions not on this grid }

  function openAccents() {
    const m = meterOf(settings.meter);
    const sub = settings.subdivision;
    const shown = new Set();
    for (let b = 0; b < m.beats; b++) for (let k = 0; k < sub; k++) shown.add(b * TICKS + (k * TICKS) / sub);
    const current = strongPositions();
    editing = { on: new Set(current.filter((p) => shown.has(p))), hidden: current.filter((p) => !shown.has(p)) };
    const counts = TEXT.metronome.accents.counts[sub] || [];
    $('accent-grid').replaceChildren(...Array.from({ length: m.beats }, (_, b) => {
      const group = document.createElement('div');
      group.className = 'accent-beat';
      for (let k = 0; k < sub; k++) {
        const at = b * TICKS + (k * TICKS) / sub;
        const label = k === 0 ? String(b + 1) : counts[k - 1];
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = `accent-cell${k === 0 ? ' on-beat' : ''}`;
        cell.textContent = label;
        const show = () => {
          const on = editing.on.has(at);
          cell.setAttribute('aria-pressed', String(on));
          cell.setAttribute('aria-label', TEXT.metronome.accents.cell(label, on));
        };
        cell.addEventListener('click', () => { editing.on.has(at) ? editing.on.delete(at) : editing.on.add(at); show(); applyStrong(); });
        cell.show = show;
        show();
        group.append(cell);
      }
      return group;
    }));
    accentEditor.showModal();
  }
  $('accent-edit').addEventListener('click', openAccents);
  $('accent-clear').addEventListener('click', () => {
    editing.on.clear();
    for (const c of $('accent-grid').querySelectorAll('.accent-cell')) c.show();
    applyStrong();
  });
  /** Each change is heard at once, on a running metronome too; Done (or closing) keeps it. */
  const applyStrong = () => setStrong([...editing.on, ...editing.hidden]);
  /** The strong positions as they are now (Strong beat on 1's, or the custom pattern's). */
  function strongPositions() {
    if (!settings.accent) return [];
    return settings.accentPattern ? settings.accentPattern.pos
      : beatStrengths(settings.meter, true).flatMap((s, b) => (s === 2 ? [b * TICKS] : []));
  }
  /** Make these positions the strong ones (none turns Strong beat on 1 off). */
  function setStrong(pos) {
    if (!pos.length) {
      // Nothing strong: the switch goes off.
      settings.accent = false;
      settings.accentPattern = null;
      customAccents.delete(settings.meter);
    } else {
      settings.accent = true;
      settings.accentPattern = cleanPattern({ meter: settings.meter, pos }, settings.meter); // null for beat 1 alone
      if (settings.accentPattern) customAccents.set(settings.meter, settings.accentPattern);
      else customAccents.delete(settings.meter);
    }
    metronomeConfigured();
  }
  $('accent-done').addEventListener('click', () => accentEditor.close());
  // Pressing and holding the beat dots, or the Visualizer, opens the strong
  // beats (a tap switches between the two). Not with no bars: there is no bar
  // to set beats in.
  const HOLD_MS = 500;
  let hold = null; // { timer, x, y }
  let held = false; // the press just opened the strong beats: not a tap too
  const foot = $('met-foot');
  foot.addEventListener('pointerdown', (e) => {
    held = false;
    if (e.button) return;
    if (meterOf(settings.meter).beats === 1) return;
    clearTimeout(hold?.timer);
    hold = { x: e.clientX, y: e.clientY, timer: setTimeout(() => { hold = null; held = true; openAccents(); }, HOLD_MS) };
  });
  foot.addEventListener('pointermove', (e) => {
    if (hold && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > 10) { clearTimeout(hold.timer); hold = null; }
  });
  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
    foot.addEventListener(type, () => { clearTimeout(hold?.timer); hold = null; });
  }
  $('met-visual').addEventListener('contextmenu', (e) => e.preventDefault());

  // ---------------------------------------------------------------- common tempos

  /*
   * The marking under the number opens common tempos by style (tempos.js): a
   * button per named tempo, and beside it a chevron with that name's other
   * common tempos. Choosing one there plays it and makes it the name's button
   * from then on. The style and those choices are remembered.
   */
  const tempoGenre = $('tempo-genre');
  tempoGenre.replaceChildren(...GENRE_IDS.map((g) => new Option(TEXT.metronome.tempos.genres[g], g)));
  // A new style names the tempo in its own terms at once (the number stays).
  tempoGenre.addEventListener('change', () => { settings.tempoGenre = tempoGenre.value; settings.tempoPicked = null; persist(); renderTempos(); showMarking(); showWeight(); });

  function renderTempos() {
    const T = TEXT.metronome.tempos;
    const genre = settings.tempoGenre;
    tempoGenre.value = genre;
    $('tempo-list').replaceChildren(...GENRES[genre].map((t) => {
      const name = tempoName(genre, t.id);
      const bpm = mainTempo(genre, t.id, settings.tempoDefaults);
      const row = document.createElement('div');
      row.className = 'tempo-row';
      const label = document.createElement('span');
      label.className = 'tempo-name';
      label.textContent = name;
      const pick = document.createElement('div');
      pick.className = 'tempo-pick';
      const main = document.createElement('button');
      main.type = 'button';
      main.className = 'chip tempo-main';
      main.textContent = String(bpm);
      main.setAttribute('aria-label', T.play(name, bpm));
      main.setAttribute('aria-pressed', String(settings.bpm === bpm));
      main.addEventListener('click', () => { settings.tempoPicked = t.id; setBpm(bpm); $('tempo-picker').close(); });
      const more = document.createElement('select');
      more.className = 'select tempo-more';
      more.setAttribute('aria-label', T.more(name));
      more.replaceChildren(...t.list.map((v) => new Option(T.bpm(v), String(v))));
      more.value = String(bpm);
      more.addEventListener('change', () => {
        const v = Number(more.value);
        settings.tempoDefaults = { ...settings.tempoDefaults, [`${genre}:${t.id}`]: v };
        settings.tempoPicked = t.id;
        setBpm(v);
        $('tempo-picker').close();
      });
      pick.append(main, more);
      row.append(label, pick);
      return row;
    }));
  }

  /*
   * Saved tempos: the player's own, at the top of the tempo sheet. Save keeps
   * the tempo and time signature now (named after them until renamed); a tap
   * brings both back; the name is renamed where it stands, and ✕ deletes.
   */
  const ST = TEXT.metronome.tempos;
  const savedName = (t) => t.name || ST.savedDefault(t.bpm, t.meter);
  function renderSaved() {
    const list = settings.savedTempos;
    $('saved-none').hidden = list.length > 0;
    const save = $('save-tempo');
    save.textContent = ST.save(settings.bpm, settings.meter);
    // Offered only for a tempo not saved yet (and while there is room).
    save.hidden = list.length >= SAVED_MAX || list.some((t) => t.bpm === settings.bpm && t.meter === settings.meter);
    $('saved-list').replaceChildren(...list.map((t) => {
      const li = document.createElement('li');
      li.className = 'saved-row';
      li.innerHTML = '<button type="button" class="chip saved-use"></button><button type="button" class="saved-name"></button><button type="button" class="icon-btn saved-del"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
      const use = li.querySelector('.saved-use');
      use.textContent = String(t.bpm);
      use.setAttribute('aria-label', ST.use(savedName(t), t.bpm, t.meter));
      use.setAttribute('aria-pressed', String(t.bpm === settings.bpm && t.meter === settings.meter));
      use.addEventListener('click', () => { settings.tempoPicked = null; setMeter(t.meter); setBpm(t.bpm); $('tempo-picker').close(); });
      const name = li.querySelector('.saved-name');
      name.textContent = savedName(t);
      name.setAttribute('aria-label', ST.rename(savedName(t)));
      name.addEventListener('click', () => renameSaved(t, name));
      const del = li.querySelector('.saved-del');
      del.setAttribute('aria-label', ST.remove(savedName(t)));
      del.addEventListener('click', () => { settings.savedTempos = settings.savedTempos.filter((x) => x !== t); persist(); renderSaved(); });
      return li;
    }));
  }
  function renameSaved(t, name) {
    const input = Object.assign(document.createElement('input'), { type: 'text', className: 'saved-input', maxLength: 40, value: t.name, placeholder: ST.savedDefault(t.bpm, t.meter) });
    input.setAttribute('aria-label', ST.nameField);
    input.enterKeyHint = 'done';
    name.replaceWith(input);
    input.focus();
    input.select();
    let done = false;
    const finish = (keep) => {
      if (done) return;
      done = true;
      if (keep) { t.name = input.value.trim().slice(0, 40); persist(); }
      renderSaved();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); }
    });
    input.addEventListener('blur', () => finish(true));
  }
  $('save-tempo').addEventListener('click', () => {
    const id = `t${Date.now().toString(36)}`;
    settings.savedTempos = [...settings.savedTempos, { id, name: '', bpm: settings.bpm, meter: settings.meter }];
    persist();
    renderSaved();
    // Named where it stands, straight away (a name is optional: leaving it keeps "120 · 4/4").
    const row = $('saved-list').lastElementChild;
    row?.querySelector('.saved-name')?.click();
  });

  $('marking').addEventListener('click', () => {
    renderTempos();
    renderSaved();
    $('tempo-picker').showModal();
    $('tempo-list').querySelector('[aria-pressed="true"]')?.focus();
  });
  // Something always shows the beat (the dots at least), so Audio check's
  // visual sync is always worth having.
  const visualsShown = () => true;
  // Pendulum swing: the setting, and a tap on the metronome. It eases in and
  // out (animateMetronome) rather than jumping.
  $('pend-on').checked = settings.swing;
  $('pend-on').addEventListener('change', () => setSwing($('pend-on').checked));
  function setSwing(on) {
    settings.swing = on;
    persist();
    $('pend-on').checked = on;
    showMetView();
    if (!metronome?.running) pendulum.style.transform = 'rotate(0deg)';
  }
  const art = $('metronome-art');
  const toggleSwing = () => setSwing(!settings.swing);

  /*
   * The pendulum's weight slides along the rod with the tempo, as on a real
   * metronome (high is slow, low is fast; weightAt), and dragging it sets the
   * tempo (bpmAtWeight). While it is dragged the pendulum eases upright (the
   * clicks go on, at the new tempo); a tap on it without a drag is a tap on
   * the metronome, as before.
   */
  const weightEl = $('pend-weight');
  /** The chosen genre's slowest to fastest named tempo: the rod's range. */
  function weightRange() { return genreRange(settings.tempoGenre); }
  function showWeight(t = weightAt(settings.bpm, weightRange())) { placeWeight(pendulum, t); }
  weightEl.addEventListener('pointerdown', (e) => {
    if (e.button) return;
    const at = weightFromPoint(pendulum, e.clientY);
    if (at == null) return;
    weightDrag = { id: e.pointerId, x: e.clientX, y: e.clientY, offset: weightAt(settings.bpm, weightRange()) - at, moved: false };
    weightEl.setPointerCapture(e.pointerId);
  });
  weightEl.addEventListener('pointermove', (e) => {
    const d = weightDrag;
    if (!d || e.pointerId !== d.id) return;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 4) return;
    if (!d.moved) { d.moved = true; weightEl.classList.add('held'); }
    const at = weightFromPoint(pendulum, e.clientY);
    if (at == null) return;
    const t = Math.min(1, Math.max(0, at + d.offset));
    showWeight(t);
    const bpm = Math.round(bpmAtWeight(t, weightRange()));
    if (bpm !== settings.bpm) setBpm(bpm);
  });
  for (const type of ['pointerup', 'pointercancel']) {
    weightEl.addEventListener(type, (e) => {
      const d = weightDrag;
      if (!d || e.pointerId !== d.id) return;
      weightDrag = null;
      weightEl.classList.remove('held');
      weightMoved = d.moved;
      if (d.moved) setTimeout(() => { weightMoved = false; }, 0); // only the click this release makes
      showWeight();
    });
  }

  /*
   * Everything you see follows heardNow(): the time of the sound reaching your
   * ears (the output delay the browser knows, plus the Sound and visuals sync
   * adjustment), looked one frame ahead because a frame drawn now appears on
   * screen about a frame later. So the pendulum reaches the end of its swing,
   * the pulse flashes and the beat dot lights as each click is heard.
   */
  let lastFrame = 0;
  let frameSec = 1 / 60;
  let swingAmt = 0; // how much of the swing shows: eased to 1 when swinging, 0 when not
  function animateMetronome() {
    if (!metronome?.running) return;
    const t = performance.now();
    if (lastFrame && t - lastFrame < 100) frameSec = frameSec * 0.9 + ((t - lastFrame) / 1000) * 0.1;
    lastFrame = t;
    const now = metronome.native ? metronome.heardNow(frameSec) : heardNow(frameSec);
    const beat = metronome.beatAt(now);
    // The pendulum swings in either view (small above the Visualizer). Turned
    // on or off it eases in or out over about half a second, never jumping.
    const swingTo = settings.swing && !weightDrag ? 1 : 0; // held upright while its weight is dragged
    swingAmt += (swingTo - swingAmt) * Math.min(1, frameSec / 0.16);
    if (Math.abs(swingTo - swingAmt) < 0.002) swingAmt = swingTo;
    const angle = swingAmt ? swingAmt * pendulumAngle(beat, now, metronome.period, swingOf(pendulum)) : 0;
    pendulum.classList.remove('resting');
    pendulum.style.transform = `rotate(${angle.toFixed(2)}deg)`;
    const dots = $('beats').children;
    // With no bars the dots count four even beats.
    const idx = !beat ? -1 : meterOf(settings.meter).beats === 1 ? beat.count % dots.length : beat.beat;
    const pulse = settings.footView === 'big';
    if (pulse && beat) {
      // Pulse: the dot swells into its beat, peaks on it and eases away (a
      // bell, not a flash), while the next one starts to swell into its own.
      const p = metronome.period;
      // Brightest exactly on the beat: a short swell into it, a longer fade after.
      const w = Math.min(0.07, p * 0.12); // the swell before the beat
      const after = now - beat.time;
      const out = Math.exp(-((after / (Math.min(0.24, p * 0.4))) ** 2));
      const into = p - after > 0 ? Math.exp(-(((p - after) / w) ** 2)) : 0;
      const next = (idx + 1) % dots.length;
      for (let i = 0; i < dots.length; i++) {
        const g = i === idx ? Math.max(out, i === next ? into : 0) : i === next ? into : 0;
        dots[i].style.setProperty('--g', g.toFixed(3));
        dots[i].classList.remove('on');
      }
    } else {
      for (let i = 0; i < dots.length; i++) {
        dots[i].classList.toggle('on', idx === i);
        dots[i].style.removeProperty('--g');
      }
    }
    // The Visualizer: read like music, left to right and down a row a bar. The
    // beat's shape lights and fades; with the trail, the beats played so far in
    // this pass stay faintly lit until it starts again at the top.
    if (settings.footView === 'bars') {
      const cells = $('met-bars').querySelectorAll('.met-bar');
      const n = dots.length || 1;
      const at = beat ? (Math.floor((beat.count - idx) / n) % settings.vizBars) * n + idx : -1;
      const lit = beat ? Math.exp(-(now - beat.time) / Math.min(0.35, metronome.period * 0.55)) : 0;
      const trail = VIZ_TRAIL; // the beats played in this pass stay faintly lit
      for (let i = 0; i < cells.length; i++) {
        const v = i === at ? Math.max(lit, trail) : i < at ? trail : 0;
        cells[i].style.setProperty('--lit', v.toFixed(3));
      }
    }
  }

  const VIZ_TRAIL = 0.28; // how lit a beat already played in this pass stays

  /** What is under the metronome (small dots, big dots or the Visualizer), and the buttons' names. */
  function showMetView() {
    const view = settings.footView;
    // The metronome shrinks as the dots grow big or open into the Visualizer
    // under it, and back (styles.css).
    $('met-visual').classList.toggle('bars', view === 'bars');
    $('met-visual').classList.toggle('pulse', view === 'big');
    $('met-viz').inert = view !== 'bars';
    art.setAttribute('aria-label', TEXT.metronome.swingButton(settings.swing));
    foot.setAttribute('aria-label', `${TEXT.metronome.footNext[view]} ${TEXT.metronome.footHold}`);
    for (const b of $('met-bars').querySelectorAll('.met-bar')) b.style.setProperty('--lit', '0');
    fitPicture();
  }
  /** Changes made here (view, effect) animate; sizing to the window doesn't. */
  let morphEnd = 0;
  function morph() {
    $('met-visual').classList.add('morph');
    clearTimeout(morphEnd);
    morphEnd = setTimeout(() => $('met-visual').classList.remove('morph'), 800);
  }
  /** Show `view` under the metronome: the dots grow or shrink in place; to or from the Visualizer is a cross-zoom. */
  function setFootView(view) {
    const from = settings.footView;
    if (from === view) return;
    const zoom = (from === 'bars' || view === 'bars') && !matchMedia('(prefers-reduced-motion: reduce)').matches && $('beats').children.length;
    // A cross-zoom measures what is drawn now (part way through another one,
    // if a tap came before it ended), puts the dots at their new size at once,
    // measures where everything rests, and animates from the one to the other.
    const before = zoom ? zoomBoxes() : null;
    // Turned back to the dots before big dots had gone into the Visualizer:
    // they zoom back at the size they are drawn, then shrink in place.
    const backFromBig = zoom && view === 'dots' && $('met-visual').classList.contains('pulse');
    const keepBig = zoom && from === 'big';
    morph();
    if (zoom) {
      for (const a of zooms) a.cancel();
      // Big dots going into the Visualizer stay as they are drawn, even part
      // way through growing (their transitions are held where they are); any
      // other cross-zoom puts the dots at their new size at once.
      if (keepBig) for (const a of $('beats').getAnimations({ subtree: true })) a.pause();
      else $('met-visual').classList.add('settle');
    }
    settings.footView = view;
    persist();
    showMetView();
    // Big dots going into the Visualizer keep their own size while they zoom
    // away (the small row spaces its dots differently, so they could not be
    // drawn where they were from it); they are made small, unseen, once gone.
    if (keepBig || backFromBig) $('met-visual').classList.add('pulse');
    if (zoom) {
      const after = zoomBoxes(); // reading it lays the new view out now
      $('met-visual').classList.remove('settle');
      const [out] = crossZoom(view === 'bars', before, after);
      if (backFromBig) {
        void $('beats').offsetWidth;
        $('met-visual').classList.remove('pulse'); // the dots' own transition shrinks them
      }
      if (keepBig) {
        out.finished.then(() => {
          if (settings.footView === 'big') return;
          $('met-visual').classList.add('settle');
          $('met-visual').classList.remove('pulse');
          void $('beats').offsetWidth; // the new size, now, with no transition
          $('met-visual').classList.remove('settle');
        }).catch(() => {});
      }
    }
  }
  const FOOT_CYCLE = { dots: 'big', big: 'bars', bars: 'dots' };

  /*
   * Dots to Visualizer and back, as a cross-zoom: the outgoing one fades out
   * (over the first half) while it is drawn from the box it filled on screen
   * into the incoming one's box, and the incoming one fades in (overlapping, so
   * the place never goes blank) while it is drawn from the outgoing one's box
   * to its own. Every step is a transform and an opacity of a layout that no
   * longer changes (the dots were put at their new size at once), so nothing
   * jumps: the first frame is what was drawn and the last is what will be.
   *
   * What was drawn is measured on screen, through the zoom that may still be
   * running, from the box of the element that zoom moves (the dots' row, the
   * Visualizer) and never from what is inside it: a theme can turn, scale or
   * glow its dots however it likes (Art Deco's diamonds) without moving a
   * measurement. So a tap in the middle of a cross-zoom starts the next one
   * from exactly where things were, at the opacity they had, rather than from
   * where they would have rested.
   */
  const MORPH_MS = 600;
  const MORPH_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';
  /**
   * The dots' row and the Visualizer's rows as drawn, in page pixels, each
   * with the element that carries it, the content's place inside that element
   * (local, unscaled pixels) and the element's opacity now.
   */
  function zoomBoxes() {
    const box = (el, content) => {
      // The content's box inside the element, from layout.
      const lx = Math.min(...content.map((c) => c.offsetLeft));
      const ly = Math.min(...content.map((c) => c.offsetTop));
      const lw = Math.max(...content.map((c) => c.offsetLeft + c.offsetWidth)) - lx;
      const lh = Math.max(...content.map((c) => c.offsetTop + c.offsetHeight)) - ly;
      // The element on screen is its layout box through its zoom, a scale and
      // a shift; carried through the same map, the content is where it is drawn.
      const r = el.getBoundingClientRect();
      const kx = r.width / (el.offsetWidth || 1), ky = r.height / (el.offsetHeight || 1);
      return { el, lx, ly, lw, lh, x: r.left + lx * kx, y: r.top + ly * ky, w: lw * kx, h: lh * ky, op: +getComputedStyle(el).opacity };
    };
    return { d: box($('beats'), [...$('beats').children]), v: box($('met-viz'), [$('met-bars')]) };
  }
  let zooms = [];
  function crossZoom(toBars, before, after) {
    for (const a of zooms) a.cancel();
    // Draw element `a` (resting as box `a`) where box `b` is: a scale about
    // the content's bottom centre, then a shift taking that point onto b's.
    const onto = (a, b) => {
      const sx = b.w / a.w, sy = b.h / a.h;
      const dx = (b.x + b.w / 2) - (a.x + a.w / 2);
      const dy = (b.y + b.h) - (a.y + a.h);
      return `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
    };
    const origin = (a) => `${(a.lx + a.lw / 2).toFixed(2)}px ${(a.ly + a.lh).toFixed(2)}px`;
    const out = toBars ? 'd' : 'v';
    const inn = toBars ? 'v' : 'd';
    // The incoming one comes out of the outgoing one's box, unless it can
    // still be seen (this tap turned a cross-zoom back): then from its own.
    const from = before[inn].op > 0.01 ? before[inn] : before[out];
    const o = after[out], i = after[inn];
    const opts = { duration: MORPH_MS, easing: MORPH_EASE };
    zooms = [
      o.el.animate([
        { transformOrigin: origin(o), transform: onto(o, before[out]), opacity: before[out].op },
        { transformOrigin: origin(o), opacity: 0, offset: 0.55 },
        { transformOrigin: origin(o), transform: onto(o, i), opacity: 0 },
      ], opts),
      i.el.animate([
        { transformOrigin: origin(i), transform: onto(i, from), opacity: before[inn].op },
        { transformOrigin: origin(i), opacity: before[inn].op, offset: 0.12 },
        { transformOrigin: origin(i), opacity: 1, offset: 0.75 },
        { transformOrigin: origin(i), transform: 'none', opacity: 1 },
      ], opts),
    ];
    return zooms;
  }
  // Tapping the dots shows the next of small dots, big dots and the
  // Visualizer; tapping the metronome turns the swing on or off.
  const switchView = () => setFootView(FOOT_CYCLE[settings.footView]);
  foot.addEventListener('click', () => {
    if (held) { held = false; return; } // that was a press and hold
    if (metVolume.swallowedTap(foot)) return; // that tap folded the volume away
    switchView();
  });
  art.addEventListener('click', () => {
    if (weightMoved) { weightMoved = false; return; } // that was the weight being dragged
    if (metVolume.swallowedTap(art)) return;
    toggleSwing();
  });
  for (const [el, act] of [[foot, switchView], [art, toggleSwing]]) {
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      e.stopPropagation(); // not the page's Space (start and stop)
      act();
    });
  }

  // ---------------------------------------------------------------- volume

  // The metronome's volume, tucked away at the picture's top right (tuckedvolume.js).
  let volSent = 0;
  let volLater = 0;
  const metVolume = tuckedVolume($('met-vol'), {
    get: () => settings.volume,
    set: (v) => {
      settings.volume = v;
      settings.volumeChosen = true;
      // To the sound at most every 60 ms (the apps' mixer is told over the bridge).
      clearTimeout(volLater);
      const send = () => { volSent = performance.now(); metronome?.configure(settings); persist(); };
      if (performance.now() - volSent > 60) send();
      else volLater = setTimeout(send, 60);
    },
  });

  /*
   * On a phone (one column), the picture, pendulum or Visualizer, takes all
   * the height the controls leave, so the page fills the screen without
   * scrolling or a gap below: measured, since the controls' height varies by
   * theme, font and window. Side by side, the stylesheet sizes it.
   */
  function fitPicture() {
    const scr = $('metronome');
    if (scr.hidden) return;
    const body = scr.querySelector('.met-body');
    scr.classList.remove('tight');
    if (getComputedStyle(body).flexDirection !== 'column') {
      // Side by side: the picture as tall as the stylesheet asks, or the room
      // below the bar if that is less; and if the controls still don't fit
      // beside it, smaller controls (#metronome.tight).
      scr.style.removeProperty('--pic-h');
      const fit = () => {
        const vis = $('met-visual');
        const css = getComputedStyle(vis);
        const extra = (parseFloat(css.getPropertyValue('--gap')) || 0) + (parseFloat(css.getPropertyValue('--dots')) || 0);
        const pad = parseFloat(getComputedStyle(scr).paddingBottom) || 0;
        const room = innerHeight - pad - body.getBoundingClientRect().top - extra - 1;
        const P = $('metronome-art').offsetHeight;
        if (P > room) scr.style.setProperty('--pic-h', `${Math.round(Math.max(100, room))}px`);
      };
      fit();
      if (document.documentElement.scrollHeight > innerHeight + 1) { scr.classList.add('tight'); scr.style.removeProperty('--pic-h'); fit(); }
      sizeFoot();
      return;
    }
    // The picture (metronome and dots, or the small metronome and the
    // Visualizer) is --P plus the dots' row and the gap, in either view; so
    // measure what is above and below it rather than the picture itself, which
    // may be in the middle of changing view.
    const fit = () => {
      const stage = scr.querySelector('.met-stage').getBoundingClientRect();
      const last = Math.max(...[...scr.querySelectorAll('.met-controls > *, .sync-bar > *')]
        .filter((e) => e.offsetParent).map((e) => e.getBoundingClientRect().bottom));
      const below = last - stage.bottom;
      const vis = getComputedStyle($('met-visual'));
      const extra = (parseFloat(vis.getPropertyValue('--gap')) || 0) + (parseFloat(vis.getPropertyValue('--dots')) || 0);
      const pad = parseFloat(getComputedStyle(scr).paddingBottom) || 0;
      const room = innerHeight - pad - stage.top - below - extra - 1;
      scr.style.setProperty('--pic-h', `${Math.round(Math.max(120, Math.min(560, room)))}px`);
    };
    fit();
    // The picture at its smallest and still no room: smaller controls.
    if (document.documentElement.scrollHeight > innerHeight + 1) { scr.classList.add('tight'); fit(); }
    sizeFoot();
  }

  /*
   * What goes under the metronome, in pixels: the Visualizer as tall as its
   * rows need (and no taller), and how far the metronome scales down toward
   * its top to make room for it, or for Pulse's big dots, so the picture's
   * height never changes (styles.css: --V, --row, --rg, --s-bars, --s-pulse).
   */
  function sizeFoot() {
    const vis = $('met-visual');
    const P = $('metronome-art').offsetHeight; // its own height: the scale is a transform
    if (!P) return;
    const css = getComputedStyle(vis);
    const dots = parseFloat(css.getPropertyValue('--dots')) || 26;
    const rows = settings.vizBars;
    const rg = Math.max(8, Math.min(16, P * 0.03));
    let row = Math.max(12, Math.min(30, P * 0.075));
    const most = (P + dots) * 0.64; // the metronome keeps at least about a third of its height
    if (rows * row + (rows - 1) * rg > most) row = Math.max(8, (most - (rows - 1) * rg) / rows);
    const V = rows * row + (rows - 1) * rg;
    const big = P * 0.34;
    vis.style.setProperty('--row', `${row.toFixed(1)}px`);
    vis.style.setProperty('--rg', `${rg.toFixed(1)}px`);
    vis.style.setProperty('--V', `${V.toFixed(1)}px`);
    vis.style.setProperty('--s-bars', ((P + dots - V) / P).toFixed(4));
    vis.style.setProperty('--s-pulse', ((P + dots - big) / P).toFixed(4));
    // The small dots' row, scaled down to the foot's width where there are
    // many (12/8) and the foot is narrow (beside the controls on a phone on its side).
    const dotsEl = [...$('beats').children];
    const first = dotsEl[0], last = dotsEl[dotsEl.length - 1];
    const dotsW = last ? last.offsetLeft + last.offsetWidth - first.offsetLeft : 0; // offsets ignore the scale
    const fitDots = dotsW ? Math.min(1, $('met-foot').clientWidth / dotsW) : 1;
    vis.style.setProperty('--dots-fit', fitDots.toFixed(3));
  }
  let fitQueued = 0;
  const queueFit = () => { cancelAnimationFrame(fitQueued); fitQueued = requestAnimationFrame(fitPicture); };
  addEventListener('resize', queueFit);
  visualViewport?.addEventListener('resize', queueFit);
  document.fonts?.ready.then(queueFit);
  document.fonts?.addEventListener?.('loadingdone', queueFit); // a theme's fonts can arrive later
  const vizBars = $('viz-bars');
  vizBars.replaceChildren(...VIZ_BARS.map((n) => new Option(String(n), String(n))));
  vizBars.value = String(settings.vizBars);
  vizBars.addEventListener('change', () => { settings.vizBars = Number(vizBars.value); renderBeats(); sizeFoot(); persist(); });


  // ---------------------------------------------------------------- visual sync

  /*
   * Bluetooth plays late (often 150-300 ms), and not every browser says by how
   * much. The sync bar adjusts the delay while watching and listening, or
   * measures it from taps along with the clicks.
   */
  const syncBar = $('sync-bar');
  let taps = [];
  function showSync() {
    $('sync-val').textContent = TEXT.metronome.sync.value(settings.syncMs);
  }
  function setSync(ms) {
    settings.syncMs = Math.max(-200, Math.min(500, Math.round(ms / 10) * 10));
    setExtraDelay(settings.syncMs / 1000);
    persist();
    showSync();
  }
  function openSync() {
    metSettings.close();
    taps = [];
    $('sync-status').textContent = '';
    syncBar.hidden = false;
    document.querySelector('.met-controls').hidden = true;
    queueFit();
    showSync();
    if (!metronome?.running) startMetronome();
  }
  function closeSync() {
    syncBar.hidden = true;
    document.querySelector('.met-controls').hidden = false;
    queueFit();
  }
  showSync();
  showMetView();
  $('sync-done').addEventListener('click', closeSync);
  $('sync-down').addEventListener('click', () => setSync(settings.syncMs - 10));
  $('sync-up').addEventListener('click', () => setSync(settings.syncMs + 10));
  const TAPS_NEEDED = 8;
  $('sync-tap').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (!metronome?.running) { startMetronome(); return; }
    const native = !!metronome.native;
    const c = metronome.ctx;
    // When the finger came down, in the scheduling clock (the system clock for the apps' native metronome).
    const pressed = Math.max(0, performance.now() - e.timeStamp) / 1000;
    const at = native ? Date.now() / 1000 - pressed : c.currentTime - pressed;
    // How long after a click was scheduled the tap came: that's the delay to
    // the ears (taps come a little late from the screen and a little early from
    // anticipation, which roughly cancel). Up to a beat, less a little.
    const p = metronome.period;
    // The native metronome's beat times are when they're heard, so only the delay it can't know is left.
    const recent = native ? metronome.beatsUntil(at + 0.1) : metronome.recent.filter((b) => b.time <= at + 0.1);
    const b = recent[recent.length - 1];
    if (!b) return;
    let off = at - b.time;
    if (off > p - 0.1) off -= p;
    taps.push(off);
    if (taps.length <= 2) { $('sync-status').textContent = TEXT.metronome.sync.keepTapping(taps.length, TAPS_NEEDED); return; }
    const use = taps.slice(2).sort((x, y) => x - y);
    if (taps.length < TAPS_NEEDED) { $('sync-status').textContent = TEXT.metronome.sync.keepTapping(taps.length, TAPS_NEEDED); return; }
    const median = use[use.length >> 1];
    const spread = use[use.length - 1] - use[0];
    // Already allowed for: the output delay the browser reports.
    const known = native ? 0 : c.currentTime - heardNow() - settings.syncMs / 1000;
    if (spread > 0.15) {
      $('sync-status').textContent = TEXT.metronome.sync.uneven;
    } else {
      setSync((median - known) * 1000);
      $('sync-status').textContent = TEXT.metronome.sync.set(settings.syncMs, Math.round(median * 1000));
    }
    taps = [];
  });

  return {
    get metronome() { return metronome; },
    pendulum, metSettings, meterSelect, soundSelect, metVolume,
    setBpm, renderBeats, shownBeats, metronomeConfigured, startMetronome, stopMetronome, soundCtx, setSub,
    showWeight, queueFit, animateMetronome, visualsShown, setSync, openSync, closeSync, tap,
  };
}
