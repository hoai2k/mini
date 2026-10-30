// The microphone and the Playback Recorder. One Recorder (recorder.js) holds
// the mic for both the Playback Recorder and the Tuner, so permission is
// asked once; this keeps it listening, recovers it when a phone cuts it off,
// and draws the recorder's screen: its state, the waveform, playing a take
// back (and scrubbing it), the takes (rename, save as MP3, delete with undo)
// and its settings. main.js passes in what it shares and uses what this returns.
import { TEXT, setRich } from './text.js';
import { audio, existingAudio, replaceAudio, useRate, audioWasAway, markStale, unlock, setSession, keepAwake } from './audio.js';
import { playSamples, primeFromTap, outputSettled, setPlaybackVolume, setPlaybackRate } from './player.js';
import { PLAY_RATES } from './settings.js';
import { forPlayback, playbackLevel } from './loudness.js';
import { dlog } from './debuglog.js';
import { encodeMp3 } from './mp3.js';
import { renderMicTip } from './audiocheck.js';
import { diag, isWebKit, isIOS, micPermission, onPermissionChange, noteMicRefused, openAppSettings } from './devices.js';
import { Recorder, freesMicForPlayback, freeReason } from './recorder.js';
import { isApp } from './native.js';
import { isPro, requirePro, openPaywall } from './pro.js';
import { FREE_TAKES } from './pro-config.js';
import { Waveform, drawThumb } from './waveform.js';
import * as store from './takes.js';
import { tuckedVolume } from './tuckedvolume.js';
import { $, chips, note, saveFile } from './ui.js';

/**
 * `tuner` is the Tuner's screen (tunerui.js), fed from the same mic;
 * `screen()` the screen showing; `routineRunning()` whether a Practice
 * Routine is going (it keeps the phone awake too); `recordDuringPlayback()`
 * the parked setting.
 */
export function setupRecorder({ settings, persist, tuner, screen, routineRunning, routineItem = () => null, recordDuringPlayback }) {

  let recorder = null;
  let wave = null;
  let takes = []; // newest first
  let playing = null; // { take, auto, handle: { ended, progress(), stop() } once sound starts, loop: { from, to? } | null }
  let recError = '';
  let recordingSince = 0; // when the take being recorded began (the routine card's clock)

  const ST = TEXT.recorder.state;
  const STATUS = {
    off: [ST.off, () => recError || ST.offHint],
    waiting: [ST.waiting, () => ST.waitingHint],
    recording: [ST.recording('0:00'), () => ST.recordingHint(fmtSec(settings.silenceSec))],
    playing: [ST.playing, () => ST.playingHint],
    paused: [ST.paused, () => ST.pausedHint],
    tuning: [ST.off, () => ''], // the tuner has the mic (never shown: the screens are separate)
  };

  const fmtSec = (s) => (Number.isInteger(s) ? String(s) : s.toFixed(1));
  const fmtDur = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  function fmtWhen(ms) {
    const d = new Date(ms);
    const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return time;
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
  }

  function showState() {
    const state = recorder?.state || 'off';
    const btn = $('rec-toggle');
    btn.dataset.state = state;
    btn.setAttribute('aria-pressed', String(state !== 'off'));
    $('rec-toggle-label').textContent = state === 'off' ? TEXT.recorder.turnOn : TEXT.recorder.turnOff;
    const [title, hint] = STATUS[state];
    $('rec-state').textContent = state === 'recording' ? ST.recording(fmtDur(recorder.recordingSec)) : title;
    let h = hint();
    if (state === 'waiting' && needsTap) h = ST.tapToRestart;
    else if (state === 'waiting' && audio().state !== 'running') h = ST.tapToHear;
    $('rec-hint').textContent = h;
    $('rec-hint').classList.toggle('error', state === 'off' && !!recError);
    // Recording during playback: the take plays while the mic keeps listening.
    if (playing?.auto && state === 'waiting') {
      $('rec-state').textContent = ST.playing;
      $('rec-hint').textContent = ST.playingDuringHint;
    }
    $('rec-skip').hidden = !(playing && playing.auto);
  }

  function configureRecorder() {
    if (recorder) {
      recorder.configure(settings);
      recorder.echoCancel = recordDuringPlayback();
    }
    setRich($('silence-label'), TEXT.recorder.settings.silence(fmtSec(settings.silenceSec)));
    $('takes-empty').textContent = TEXT.recorder.takesEmpty(fmtSec(settings.silenceSec));
    persist();
    showState();
  }

  /**
   * The one Recorder, shared by the recorder and the tuner, so the mic one
   * grants is the mic the other uses and permission is never asked twice.
   */
  function ensureRecorder() {
    const ctx = audio();
    if (!wave) wave = new Waveform($('wave'));
    // A new recorder when the context was replaced (the old one is off by then).
    if (!recorder || recorder.ctx !== ctx) {
      const old = recorder;
      recorder = new Recorder(ctx);
      // Hand over a mic the old recorder still holds, so there is no new prompt.
      if (old?.stream) { recorder.keepStream(old.stream); old.stream = null; }
      recorder.addEventListener('state', () => {
        if (recorder.state === 'recording') recordingSince = performance.now();
        interruptPlayback();
        showState();
        showTunerState();
        keepAwake(recorder.state !== 'off' || routineRunning());
      });
      recorder.addEventListener('chunk', (e) => {
        recoverTries = 0;
        if (needsTap && existingAudio()?.state === 'running') { needsTap = false; showState(); showTunerState(); }
        if (e.detail.state === 'tuning') tuner.receive(e.detail.data, recorder.ctx.sampleRate);
        else wave.push(e.detail.data, recorder.ctx.sampleRate, e.detail.state);
      });
      recorder.addEventListener('take', (e) => onTake(e.detail));
      recorder.addEventListener('miclost', () => { if (document.visibilityState === 'visible') recoverMic(); });
    }
    recorder.micChoice = settings.mic;
    return recorder;
  }

  async function startRecorder() {
    setSession('auto');
    unlock();
    ensureRecorder();
    recorder.configure(settings);
    recorder.echoCancel = recordDuringPlayback();
    recorder.micChoice = settings.mic;
    recError = '';
    try {
      await recorder.on();
    } catch (err) {
      recError = micError(err);
    }
    if (checkMicRate()) return;
    if (recorder.micOpen) markStale('mic-open-recorder');
    showMicTip();
    showState();
  }

  /**
   * Opening the Playback Recorder leaves it off until the record button is
   * pressed, but asks for the microphone straight away where it hasn't been
   * allowed yet (and lets it go again), so the permission question, or the
   * news that it is blocked, comes now rather than when you start to play.
   */
  let micChecked = false;
  async function checkRecorderMic() {
    showState();
    if (micChecked || recorder?.micOpen || micPermission() === 'granted') return;
    micChecked = true;
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      for (const t of stream.getTracks()) t.stop();
      recError = '';
    } catch (err) {
      recError = micError(err);
    }
    showMicOff();
    showState();
  }

  /**
   * iPhone only: once the recorder has the mic, if it isn't set to Allow (so the
   * app has to keep it open and takes stay off Bluetooth), say so and how to
   * fix it. Its title folds it to one line (remembered); it only goes away for
   * good once the mic is allowed.
   */
  function showMicTip() {
    const tip = $('mic-tip');
    const show = isIOS() && !!recorder?.holdsMic && !freesMicForPlayback() && micPermission() !== 'denied';
    if (show && !tip.firstChild) {
      renderMicTip(tip, {
        collapsed: settings.micTipCollapsed,
        onToggle: (c) => { settings.micTipCollapsed = c; persist(); },
      });
    }
    tip.hidden = !show;
  }

  /**
   * In the apps, while the phone has the mic off: a note on the Tuner and the
   * Playback Recorder (the screens that use the mic, and nowhere else) with a
   * button to the app's page in Settings. It goes once the mic is on again
   * (checked on coming back to the app).
   */
  function micOffNote(el) {
    const M = TEXT.micOff;
    el.replaceChildren(
      Object.assign(document.createElement('b'), { textContent: M.title }),
      Object.assign(document.createElement('p'), { textContent: M.body }),
      Object.assign(document.createElement('button'), { type: 'button', className: 'pill', textContent: M.open, onclick: openAppSettings }),
    );
  }
  function showMicOff() {
    const off = isApp() && micPermission() === 'denied';
    for (const id of ['rec-mic-off', 'tn-mic-off']) {
      const el = $(id);
      if (off && !el.firstChild) micOffNote(el);
      el.hidden = !off;
    }
  }
  onPermissionChange(showMicOff);
  showMicOff();

  /** Why the mic couldn't open, for the recorder or (`tuner`) the tuner, whose button is Try again. */
  function micError(err, tuner = false) {
    const t = TEXT.micErrors;
    if (err?.name === 'NotAllowedError') noteMicRefused();
    // In the apps the Microphone is off note (with its Settings button) says it.
    if (err?.name === 'NotAllowedError') return isApp() ? '' : (tuner ? t.tunerRefused : t.refused);
    if (err?.message === 'unsupported') return t.unsupported;
    return tuner ? t.tunerFailed : t.failed;
  }

  /** Listen again after playback or a pause, reopening the mic if it was closed. */
  async function resumeListening() {
    if (!recorder || recorder.state === 'off') return;
    setSession('auto');
    unlock(); // the audio engine may have been suspended for playback
    recError = '';
    try {
      await recorder.restore();
    } catch (err) {
      recError = micError(err);
    }
    if (checkMicRate()) return;
    showState();
  }

  /*
   * On an iPhone or iPad, a microphone running at another rate than the audio
   * engine comes through broken up and slowed down (WebKit resamples it
   * badly), and every take is recorded that way until the page is reloaded.
   * The device can change its rate during a visit (playback and recording
   * use the hardware differently, a Bluetooth device comes or goes), so each
   * time the mic opens its rate is checked; if it isn't the engine's, the
   * engine is replaced by one at the mic's rate and listening starts again
   * on it. Twice at most in a row: a device that won't give that rate is
   * left as it is (and the debug log says so).
   */
  let rateFixes = 0;
  function checkMicRate() {
    if (!recorder?.micOpen) return false;
    if (!recorder.rateMismatch) { rateFixes = 0; return false; }
    const mic = recorder.micRate();
    const ctx = recorder.ctx.sampleRate;
    if (!isWebKit() || rateFixes >= 2) {
      dlog('mic-rate-mismatch', { mic, ctx, fixed: false, webkit: isWebKit(), tries: rateFixes });
      return false;
    }
    rateFixes++;
    dlog('mic-rate-mismatch', { mic, ctx, fixed: true, tries: rateFixes });
    const tuning = recorder.state === 'tuning';
    stopPlayback({ resume: false });
    recorder.off();
    useRate(mic);
    replaceAudio('mic-rate');
    // Outside a tap the new engine may not start: then the next tap starts it (Tap to restart).
    setTimeout(() => {
      if (existingAudio()?.state !== 'running' && listeningActive()) { needsTap = true; showState(); showTunerState(); }
    }, 600);
    if (tuning) startTuner();
    else startRecorder();
    return true;
  }

  /**
   * Reconnect the mic if it stopped delivering while listening or recording.
   * The held mic is reused; it is asked for again only if it is dead.
   */
  let reopening = false;
  let recoverTries = 0; // reset whenever the mic delivers
  function recoverMic(force = false) {
    if (!recorder || reopening || !recorder.micOpen) return;
    if (!['waiting', 'recording', 'tuning'].includes(recorder.state)) return;
    if (!force && recorder.micAlive()) return;
    // First reconnect the mic we hold; if that stays silent, it is dead even
    // if the browser says it's fine: ask for it again. If even that gets
    // nothing, the engine is at fault, and the next tap replaces it.
    recoverTries++;
    if (recoverTries > 2) {
      if (!needsTap) { needsTap = true; showState(); showTunerState(); }
      return;
    }
    reopening = true;
    recorder.reopen({ fresh: recoverTries > 1 })
      .then(() => checkMicRate())
      .catch((err) => { recError = micError(err); tunerError = micError(err, true); recorder.off(); })
      .finally(() => { reopening = false; showState(); showTunerState(); });
  }

  /** Is the mic in use (listening, recording or tuning)? */
  function listeningActive() {
    return !!recorder && ['waiting', 'recording', 'tuning'].includes(recorder.state);
  }

  /** Does listening need a new audio engine (only a tap can start one)? */
  let needsTap = false;
  function engineStuck() {
    const c = existingAudio();
    if (!c) return false;
    return needsTap || (c.state !== 'running' && (c.state === 'interrupted' || audioWasAway()));
  }

  /** Is listening on but getting nothing (a stuck engine or a silent mic)? */
  function listeningStuck() {
    if (!listeningActive()) return false;
    if (engineStuck() || existingAudio()?.state !== 'running') return true;
    return recorder.micOpen && recorder.silentFor > 1.5;
  }

  /**
   * Start listening (or tuning) again from scratch: a new audio engine, and the
   * mic reconnected (asked for again only if it turns out to be dead). Call it
   * from a tap, which a new engine needs on phones.
   */
  let restartedAt = -1e9;
  function restartListening() {
    restartedAt = performance.now();
    needsTap = false;
    recoverTries = 0;
    const tuning = recorder?.state === 'tuning';
    stopPlayback({ resume: false });
    recorder?.off();
    replaceAudio();
    primeFromTap();
    if (tuning) startTuner();
    else startRecorder();
  }

  // Coming back to the app: phones suspend sound, pause media and cut the mic
  // while it is away. Pick everything up again where it was; if the engine
  // won't start again by itself, the next tap starts a new one.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    markStale('back-from-background'); // the output may have changed while away; the next Start gets a fresh context
    const c = existingAudio();
    if (c && c.state !== 'running' && c.state !== 'closed') c.resume().catch(() => { /* the next tap resumes it */ });
    if (playing?.handle?.isPaused?.()) playing.handle.resume().catch(() => stopPlayback());
    recoverMic();
    showState();
    showTunerState();
  });

  // Starting a new take while a take plays back (record during playback) stops the playback.
  function interruptPlayback() {
    if (playing?.auto && recorder?.state === 'recording') stopPlayback({ resume: false });
  }

  function stopRecorder() {
    stopPlayback({ resume: false });
    recorder?.off();
    hideToast(true);
    showState();
  }

  $('rec-toggle').addEventListener('click', () => {
    if (performance.now() - restartedAt < 1000) return; // this tap already started listening again
    if (!recorder || recorder.state === 'off') {
      // After a trip to another app, start on a new engine (this is a tap).
      if (audioWasAway() || existingAudio()?.state !== 'running') replaceAudio();
      startRecorder();
    } else if (listeningStuck()) {
      restartListening(); // it says it's listening but hears nothing: start again rather than stop
    } else {
      stopRecorder();
    }
  });
  $('rec-skip').addEventListener('click', () => stopPlayback());

  async function onTake({ samples, sampleRate, playBack }) {
    const take = { id: 0, created: Date.now(), sampleRate, samples };
    // In a routine, a take is named after the item practised ("Scales 2").
    const item = routineItem();
    if (item) take.name = store.routineTakeName(item, takes);
    takes.unshift(take);
    renderTakes();
    take.id = await store.add(samples, sampleRate, take.created);
    if (take.name) await store.rename(take.id, take.name);
    if (playBack && settings.autoPlay && recorder.state !== 'off' && recorder.state !== 'paused') {
      play(take, { auto: true });
    }
  }

  /**
   * Play a take. Playing from the list pauses listening. Unless "Record during
   * playback" is on, the mic is closed first and the take waits for the phone
   * to move sound back to its normal output (a Bluetooth speaker, say), since
   * an open mic puts phones in call mode, quieter and on the phone's own
   * speaker; listening resumes when the take ends. With "Record during
   * playback" on, the mic stays open and playing again starts the next take.
   */
  let playToken = 0;
  async function play(take, { auto = false } = {}) {
    stopPlayback({ resume: false });
    const token = ++playToken;
    const hadMic = !!recorder?.holdsMic;
    if (recorder && recorder.state !== 'off') {
      if (!auto) recorder.pause();
      else if (!recordDuringPlayback()) recorder.hold();
      if (!recordDuringPlayback() && recorder.micOpen) recorder.release();
    }
    const freed = hadMic && !recorder?.holdsMic; // the mic was just closed
    // Playback mode only when no mic is held: switching while Safari holds one
    // could cut it off and interrupt the record-play-record loop.
    if (!recorder?.holdsMic) setSession('playback');
    playing = { take, auto, handle: null, loop: null };
    wave?.showTake(take.samples);
    $('wave').classList.add('scrub');
    $('wave').setAttribute('aria-label', TEXT.recorder.waveformTake);
    renderTakes();
    showState();
    // With the mic freed, also suspend the audio engine: it ran the mic, and a
    // running one can keep iOS in call mode (WebKit bugs 198545, 218012); the
    // take plays through an audio element, not Web Audio. Then give the phone
    // a moment to move sound back to its normal output (a Bluetooth speaker).
    const engine = existingAudio();
    if (freed && engine?.state === 'running') {
      try { await engine.suspend(); } catch { /* keep going */ }
    }
    const waitStart = performance.now();
    // iOS stays in call mode for several hundred ms after the mic closes.
    if (freed) await outputSettled(isWebKit() ? 1000 : 700);
    if (token !== playToken) return; // stopped or replaced while waiting
    // What happened, for Audio check (to tell why a take didn't reach Bluetooth).
    const record = {
      at: Date.now(),
      micFreed: freed,
      micHeld: !!recorder?.holdsMic,
      waitedMs: Math.round(performance.now() - waitStart),
      session: navigator.audioSession?.type ?? null,
      sessionState: navigator.audioSession?.state ?? null,
      engine: existingAudio()?.state ?? 'none',
      via: 'audio element',
    };
    diag.lastPlayback = record;
    let handle;
    try {
      handle = await playSamples(forPlayback(take.samples, take.sampleRate), take.sampleRate); // brought up to a streaming loudness (loudness.js)
    } catch {
      handle = playWithWebAudio(take); // the browser refused the media element
      record.via = 'Web Audio (the audio element was refused)';
    }
    dlog('take-play', { ...record, auto, recordDuringPlayback: recordDuringPlayback(), playVolume: settings.playVolume, level: playbackLevel(take.samples), mic: freeReason() });
    if (token !== playToken) { handle.stop(); return; }
    playing.handle = handle;
    handle.ended.then(() => { if (token === playToken) stopPlayback(); });
    renderTakes(); // the loop button can be used now
  }

  /** The old way: Web Audio. Used only if the media element is refused. */
  function playWithWebAudio(take) {
    const ctx = audio(); // not freshAudio(): the recorder may still be using it
    unlock();
    const buf = ctx.createBuffer(1, take.samples.length, take.sampleRate);
    buf.copyToChannel(forPlayback(take.samples, take.sampleRate), 0);
    const gain = ctx.createGain();
    gain.gain.value = settings.playVolume;
    gain.connect(ctx.destination);
    let finish;
    const ended = new Promise((resolve) => { finish = resolve; });
    let source = null;
    let startedAt = 0; // context time at which the take's start would have played
    let heldAt = null; // the position held while scrubbing, or null
    const at = () => (heldAt !== null ? heldAt : Math.min(1, Math.max(0, (ctx.currentTime - startedAt) / buf.duration)));
    const start = (f) => {
      if (source) { source.onended = null; try { source.stop(); } catch { /* ended */ } }
      source = ctx.createBufferSource();
      source.buffer = buf;
      source.connect(gain);
      source.onended = () => finish();
      const when = ctx.currentTime + 0.03;
      source.start(when, f * buf.duration);
      startedAt = when - f * buf.duration;
    };
    start(0);
    webAudioGain = gain;
    return {
      ended,
      progress: at,
      stop: () => { if (source) { source.onended = null; try { source.stop(); } catch { /* ended */ } } webAudioGain = null; finish(); },
      hold: () => { heldAt = at(); if (source) { source.onended = null; try { source.stop(); } catch { /* ended */ } source = null; } },
      seek: (f) => { const c = Math.max(0, Math.min(1, f)); if (heldAt !== null) heldAt = c; else start(c); },
      go: async () => { const f = heldAt ?? at(); heldAt = null; start(f); },
    };
  }
  let webAudioGain = null;

  function stopPlayback({ resume = true } = {}) {
    if (!playing) return;
    const { handle } = playing;
    playing = null;
    playToken++;
    handle?.stop();
    scrub = null;
    wave?.setLoop(null);
    wave?.showLive();
    $('wave').classList.remove('scrub');
    $('wave').setAttribute('aria-label', TEXT.recorder.waveform);
    if (resume && recorder && (recorder.state === 'playing' || recorder.state === 'paused') && toastTimer === null) resumeListening();
    renderTakes();
    showState();
  }

  // Playback volume: the faint speaker beside the record button (tuckedvolume.js).
  setPlaybackVolume(settings.playVolume);
  setPlaybackRate(settings.playRate);

  /*
   * The playing take's tools. Speed (50, 75 or 100%, the pitch kept) is kept
   * between visits. The loop button marks a start where the take has got to,
   * then an end; until the end is marked, reaching the take's end goes back to
   * the start. A third tap stops looping.
   */
  function stepLoop() {
    const handle = playing?.handle;
    if (!handle?.setLoop) return;
    const at = scrub ? scrub.f : handle.progress();
    const l = playing.loop;
    if (!l) playing.loop = { from: at };
    else if (l.to === undefined) {
      // Tapped again too soon (or after scrubbing back): a loop needs some length.
      const [from, to] = at >= l.from ? [l.from, at] : [at, l.from];
      playing.loop = to - from < 0.01 ? { from } : { from, to };
    } else playing.loop = null;
    const now = playing.loop;
    handle.setLoop(now && { from: now.from, to: now.to ?? 1 });
    wave?.setLoop(now && { from: now.from, to: now.to ?? null });
    renderTakes();
  }

  function syncTools(li, take) {
    li.syncSpeed();
    const btn = li.querySelector('.take-loop');
    const mine = playing?.take === take;
    const l = mine ? playing.loop : null;
    const T = TEXT.recorder.tools;
    const dur = take.samples.length / take.sampleRate;
    btn.disabled = !mine || !playing.handle?.setLoop;
    btn.dataset.state = !l ? 'off' : l.to === undefined ? 'armed' : 'on';
    btn.textContent = !l ? T.loopOff : l.to === undefined ? T.loopArmed : T.loopOn;
    btn.setAttribute('aria-label', !l ? T.loopOffHint : l.to === undefined ? T.loopArmedHint
      : T.loopOnHint(fmtDur(l.from * dur), fmtDur(l.to * dur)));
  }
  const recVolume = tuckedVolume($('rec-vol'), {
    get: () => settings.playVolume,
    set: (v) => {
      settings.playVolume = v;
      setPlaybackVolume(v);
      if (webAudioGain) webAudioGain.gain.setTargetAtTime(v, webAudioGain.context.currentTime, 0.02);
      persist();
    },
  });

  /*
   * Scrubbing: while a take plays, press the waveform to move the playhead
   * there (it holds still while dragged) and let go to play on from that
   * point, to hear a passage again and again.
   */
  let scrub = null; // { id, f } while the playhead is held
  const waveEl = $('wave');
  const waveAt = (e) => {
    const r = waveEl.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  };
  waveEl.addEventListener('pointerdown', (e) => {
    const handle = playing?.handle;
    if (e.button || !handle?.hold || recVolume.swallowedTap(waveEl)) return;
    e.preventDefault();
    waveEl.setPointerCapture(e.pointerId);
    handle.hold();
    scrub = { id: e.pointerId, f: waveAt(e) };
    handle.seek(scrub.f);
  });
  waveEl.addEventListener('pointermove', (e) => {
    if (!scrub || e.pointerId !== scrub.id) return;
    scrub.f = waveAt(e);
    playing?.handle?.seek(scrub.f);
  });
  function endScrub(e) {
    if (!scrub || e.pointerId !== scrub.id) return;
    const handle = playing?.handle;
    scrub = null;
    handle?.go().catch(() => stopPlayback());
  }
  waveEl.addEventListener('pointerup', endScrub);
  waveEl.addEventListener('pointercancel', endScrub);

  /**
   * Rename a take: its title turns into a text field. Enter or leaving the
   * field keeps the name, Escape cancels, and an empty name goes back to the
   * default. Listening pauses while typing, like any use of the list.
   */
  function renameTake(take, li) {
    const title = li.querySelector('.title');
    if (!title) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'title-input';
    input.maxLength = 60;
    input.value = take.name || '';
    input.placeholder = li.dataset.label;
    input.setAttribute('aria-label', TEXT.recorder.takeNameField);
    input.enterKeyHint = 'done';
    const pausedHere = recorder && (recorder.state === 'waiting' || recorder.state === 'recording');
    if (pausedHere) recorder.pause();
    title.replaceWith(input);
    input.focus();
    input.select();
    let done = false;
    const finish = async (keep) => {
      if (done) return;
      done = true;
      const name = input.value.trim().slice(0, 60);
      input.replaceWith(title);
      if (keep && name !== (take.name || '')) {
        take.name = name;
        renderTakes();
        await store.rename(take.id, name);
      }
      if (pausedHere && !playing && toastTimer === null && recorder?.state === 'paused') resumeListening();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); }
    });
    input.addEventListener('blur', () => finish(true));
  }

  /**
   * Save a take as an MP3. On phones it opens the share sheet (Save to Files,
   * AirDrop, Messages, Voice Memos…), the way iPhone saves files from the web;
   * elsewhere, or if sharing isn't offered, it downloads. The MP3 is made once
   * and kept with the take. iPhone only opens the share sheet straight from a
   * tap; if making a long take's MP3 used that up, the button says it's ready
   * and the next tap shares it at once.
   */
  async function saveTake(take, label, button) {
    if (button.classList.contains('busy')) return;
    button.classList.remove('ready');
    const base = (label || TEXT.recorder.takeFile).replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 60) || TEXT.recorder.takeFile;
    if (!take.mp3) {
      button.classList.add('busy');
      button.setAttribute('aria-label', TEXT.recorder.makingMp3);
      try {
        take.mp3 = await encodeMp3(take.samples, take.sampleRate);
      } catch {
        note(TEXT.recorder.mp3Failed);
        return;
      } finally {
        button.classList.remove('busy');
        renderTakes();
      }
    }
    const file = new File([take.mp3], `${base}.mp3`, { type: 'audio/mpeg' });
    const how = await saveFile(file, base);
    if (how === 'failed') note(TEXT.recorder.saveFailed);
    if (how === 'needsTap') {
      button.classList.add('ready');
      button.setAttribute('aria-label', TEXT.recorder.mp3Ready);
      note(TEXT.recorder.mp3ReadyNote);
    }
  }

  function renderTakes() {
    const list = $('takes');
    $('takes-empty').hidden = takes.length > 0;
    $('takes-count').textContent = takes.length ? TEXT.recorder.takesCount(takes.length) : '';
    // Without Pro (in the apps) the newest few show; the rest are kept for when Pro is on.
    const shown = isPro() ? takes : takes.slice(0, FREE_TAKES);
    const rows = shown.map((take, i) => {
      let li = list.querySelector(`[data-key="${take.created}"]`);
      if (!li) {
        li = document.createElement('li');
        li.className = 'take';
        li.dataset.key = take.created;
        li.innerHTML = `
        <button class="play" type="button"><svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg><svg class="i-stop" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg></button>
        <div class="meta"><div class="name"><button type="button" class="title"></button><span></span></div><canvas aria-hidden="true"></canvas></div>
        <button class="save" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14"/></svg></button>
        <button class="del" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button>
        <div class="take-tools"><div class="chips take-speed"></div><button class="pill take-loop" type="button"></button></div>
        <span class="bar-progress" aria-hidden="true"></span>`;
        const speed = li.querySelector('.take-speed');
        speed.setAttribute('aria-label', TEXT.recorder.tools.speed);
        li.syncSpeed = chips(speed, PLAY_RATES.map((r) => ({ id: r, label: TEXT.recorder.tools.rate(r) })), () => settings.playRate, (r) => {
          settings.playRate = r;
          setPlaybackRate(r);
          persist();
        });
        li.querySelector('.take-loop').addEventListener('click', stepLoop);
        li.querySelector('.play').addEventListener('click', () => (playing?.take === take ? stopPlayback() : play(take)));
        li.querySelector('.del').addEventListener('click', () => removeTake(take));
        li.querySelector('.save').addEventListener('click', (e) => { if (requirePro('takes')) saveTake(take, li.dataset.label, e.currentTarget); });
        li.querySelector('.title').addEventListener('click', () => { if (requirePro('takes')) renameTake(take, li); });
        const canvas = li.querySelector('canvas');
        canvas.redraw = () => drawThumb(canvas, take.samples);
        requestAnimationFrame(canvas.redraw);
      }
      const n = takes.length - i;
      const dur = take.samples.length / take.sampleRate;
      const title = li.querySelector('.title');
      const len = li.querySelector('.name > span');
      const label = take.name || TEXT.recorder.takeName(n, fmtWhen(take.created));
      li.dataset.label = label;
      if (title) {
        title.textContent = label;
        title.setAttribute('aria-label', TEXT.recorder.renameTake(label));
      }
      len.textContent = fmtDur(Math.max(1, Math.round(dur)));
      li.querySelector('.play').setAttribute('aria-label', playing?.take === take ? TEXT.recorder.stopTake(n) : TEXT.recorder.playTake(n));
      li.querySelector('.del').setAttribute('aria-label', TEXT.recorder.deleteTake(n));
      const save = li.querySelector('.save');
      if (!save.classList.contains('busy') && !save.classList.contains('ready')) save.setAttribute('aria-label', TEXT.recorder.saveTake(n));
      li.classList.toggle('playing', playing?.take === take);
      syncTools(li, take);
      if (playing?.take !== take) li.querySelector('.bar-progress').style.width = '0';
      return li;
    });
    const hidden = takes.length - shown.length;
    if (hidden > 0) {
      let more = list.querySelector('.takes-more');
      if (!more) {
        more = document.createElement('li');
        more.className = 'takes-more';
        more.innerHTML = '<span></span> <button type="button" class="link-btn"></button>';
        more.querySelector('button').textContent = TEXT.recorder.keepEvery;
        more.querySelector('button').addEventListener('click', () => openPaywall('older'));
      }
      more.querySelector('span').textContent = TEXT.recorder.olderKept(hidden);
      rows.push(more);
    }
    list.replaceChildren(...rows);
  }

  // Deleting: the take goes at once, with a few seconds to undo. Listening is
  // paused while the list is in use.
  let toastTimer = null;
  let lastDeleted = null;

  function removeTake(take) {
    if (playing?.take === take) stopPlayback({ resume: false });
    if (recorder && recorder.state !== 'off') recorder.pause();
    const index = takes.indexOf(take);
    takes.splice(index, 1);
    if (lastDeleted) store.remove(lastDeleted.take.id);
    lastDeleted = { take, index };
    renderTakes();
    $('toast-text').textContent = TEXT.recorder.takeDeleted;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => hideToast(), 4000);
    showState();
  }

  function hideToast(final = false) {
    clearTimeout(toastTimer);
    toastTimer = null;
    $('toast').hidden = true;
    if (lastDeleted) store.remove(lastDeleted.take.id);
    lastDeleted = null;
    if (!final && !playing && recorder?.state === 'paused') resumeListening();
  }

  $('toast-undo').addEventListener('click', () => {
    if (lastDeleted) {
      takes.splice(Math.min(lastDeleted.index, takes.length), 0, lastDeleted.take);
      lastDeleted = null;
      renderTakes();
    }
    hideToast();
  });

  const recSettings = $('rec-settings');
  $('rec-settings-btn').addEventListener('click', () => recSettings.showModal());
  $('silence').value = settings.silenceSec;
  $('silence').addEventListener('input', () => { settings.silenceSec = Number($('silence').value); configureRecorder(); });
  const RS = TEXT.recorder.settings;
  chips($('starton-chips'), [{ id: 'music', label: RS.startOnMusic }, { id: 'any', label: RS.startOnAny }], () => settings.startOn, (v) => { settings.startOn = v; configureRecorder(); });
  chips($('sens-chips'), [{ id: 'low', label: RS.low }, { id: 'medium', label: RS.medium }, { id: 'high', label: RS.high }], () => settings.sensitivity, (v) => { settings.sensitivity = v; configureRecorder(); });
  $('autoplay').checked = settings.autoPlay;
  $('autoplay').addEventListener('change', () => { settings.autoPlay = $('autoplay').checked; configureRecorder(); });
  $('rec-during').checked = recordDuringPlayback();
  $('rec-during').addEventListener('change', () => {
    settings.recordDuringPlayback = $('rec-during').checked;
    configureRecorder();
    // Reopen an idle mic so echo cancellation matches the new choice.
    if (recorder?.state === 'waiting' && recorder.micOpen && !playing) {
      recorder.release();
      resumeListening();
    }
  });

  function animateRecorder() {
    if (!wave) return;
    if (playing) {
      const p = scrub ? scrub.f : playing.handle ? playing.handle.progress() : 0;
      wave.setProgress(p);
      const row = $('takes').querySelector(`[data-key="${playing.take.created}"] .bar-progress`);
      if (row) row.style.width = `${(p * 100).toFixed(1)}%`;
    }
    if (recorder?.state === 'recording') $('rec-state').textContent = ST.recording(fmtDur(recorder.recordingSec));
    // A mic that has gone quiet while the sound is running was cut off: reopen it.
    if (recorder?.micOpen && (recorder.state === 'waiting' || recorder.state === 'recording')
        && audio().state === 'running' && recorder.silentFor > 2.5) recoverMic(true);
    wave.draw();
  }

  // The tuner's use of the microphone (its screen is tunerui.js).
  let tunerError = '';

  /** Open the mic for the tuner: the same held mic as the recorder's, so no new prompt. */
  // While the mic is being opened the tuner shows nothing about it: neither
  // "the microphone is off" nor Try again, which would flash up for the moment
  // it takes and go (the answer is shown once there is one).
  let tunerStarting = false;
  async function startTuner() {
    setSession('auto');
    unlock();
    ensureRecorder();
    tunerError = '';
    tuner.reset();
    tunerStarting = true;
    showTunerState();
    try {
      await recorder.tune();
    } catch (err) {
      tunerError = micError(err, true);
    }
    tunerStarting = false;
    if (checkMicRate()) return;
    if (recorder.micOpen) markStale('mic-open-tuner');
    showTunerState();
  }

  function stopTuner() {
    tuner.stop();
    if (recorder?.state === 'tuning') recorder.off();
    showTunerState();
  }

  function showTunerState() {
    if (screen() !== 'tuner') return;
    const state = recorder?.state || 'off';
    const status = $('tuner-status');
    let text = '';
    const opening = tunerStarting && state === 'off';
    if (opening) text = '';
    else if (state === 'off') text = tunerError || TEXT.tuner.micOff;
    else if (needsTap) text = TEXT.tuner.tapToRestart;
    else if (audio().state !== 'running') text = TEXT.tuner.tapToHear;
    status.textContent = text;
    status.hidden = !text;
    status.classList.toggle('error', state === 'off');
    $('tuner-retry').hidden = state !== 'off' || opening;
    if (state === 'off') tuner.reset();
  }
  $('tuner-retry').addEventListener('click', () => {
    if (performance.now() - restartedAt < 1000) return;
    if (audioWasAway() || existingAudio()?.state !== 'running') replaceAudio();
    startTuner();
  });

  const tunerSettings = $('tuner-settings');
  $('tuner-settings-btn').addEventListener('click', () => { tuner.refresh(); tunerSettings.showModal(); });

  let tunerHintShown = '';
  function animateTuner() {
    tuner.animate();
    if (recorder?.micOpen && recorder.state === 'tuning' && audio().state === 'running' && recorder.silentFor > 2.5) recoverMic(true);
    // The "tap anywhere" note goes once the sound engine runs.
    const running = existingAudio()?.state === 'running';
    if (String(running) !== tunerHintShown) { tunerHintShown = String(running); showTunerState(); }
  }

  /** Takes saved on this device, added to any made since the page opened. */
  function loadTakes() {
    store.list().then((saved) => {
      takes = [...takes, ...saved.filter((s) => !takes.some((t) => t.created === s.created))];
      renderTakes();
    });
  }

  /** A microphone chosen in Audio check: used at once if one is open. */
  async function chooseMic(id) {
    settings.mic = id;
    persist();
    if (recorder) {
      try { await recorder.chooseMic(id); } catch (err) { recError = micError(err); recorder.off(); }
      showState();
    }
  }

  /** A tap didn't get the sound engine going: the next one starts a new engine. */
  function markNeedsTap() {
    needsTap = true;
    showState();
    showTunerState();
  }


  return {
    get recorder() { return recorder; },
    get playing() { return playing; },
    get takes() { return takes; },
    get wave() { return wave; },
    get recordingSince() { return recordingSince; },
    recVolume,
    listeningActive, engineStuck, restartListening, markNeedsTap, recoverMic, ensureRecorder, micError,
    showState, configureRecorder, startRecorder, stopRecorder, checkRecorderMic, renderTakes, loadTakes, animateRecorder,
    chooseMic, startTuner, stopTuner, showTunerState, animateTuner,
  };
}
