// The practice recorder: opens the microphone, keeps a couple of seconds of
// pre-roll while waiting, starts a take when PlayDetector hears playing,
// ends it after the chosen silence, trims it and hands it back.
//
// States: 'off' (mic closed), 'waiting' (listening for the first note),
// 'recording', 'playing' (the take is being played back; the mic is ignored),
// 'paused' (the player is using the takes list; the mic is ignored).

import { analyzeFrame, PlayDetector, trimBounds, cut, FRAME } from './detect.js';
import { listDevices, preferredMic, micPermission, noteFirstRequest, allowedInAdvance } from './devices.js';

const PREROLL_SEC = 2;
const WORKLET_LOADED = new WeakSet(); // contexts with the capture worklet

/*
 * Asking for the mic again can bring the permission prompt back (Safari and
 * every iPhone browser ask again unless the site's microphone is set to
 * Allow), and a prompt would stall the listen → record → play back loop. But
 * while a page holds the mic, phones stay in call mode and won't play on a
 * Bluetooth speaker. So:
 *
 * - where the browser reports mic permission as granted for good, the mic is
 *   freed for each playback (Bluetooth works) and taken back afterwards
 *   without a prompt;
 * - otherwise it is held for the whole visit, its track switched off when
 *   not listening, and asked for again only if the browser reports it dead.
 *
 * If taking it back ever takes long enough to suggest a prompt appeared
 * after all, the mic is held for the rest of the visit.
 */
let promptSuspected = false;
const PROMPT_SUSPECT_MS = 900;

/** Is the mic freed while takes play (so a Bluetooth speaker can be used)? */
export function freesMicForPlayback() {
  return (micPermission() === 'granted' || allowedInAdvance()) && !promptSuspected;
}
export const promptWasSuspected = () => promptSuspected;
const SETTLE_SEC = 0.35; // ignore the mic this long after playback (room echo)

export class Recorder extends EventTarget {
  /** @param {AudioContext} ctx */
  constructor(ctx) {
    super();
    this.ctx = ctx;
    this.state = 'off';
    this.stream = null;
    this.pos = 0; // samples received so far
    this.preroll = []; // { at, data } chunks while waiting
    this.chunks = [];
    this.base = 0; // sample position of chunks[0]
    this.ignoreUntil = 0;
    this.detector = new PlayDetector({ sampleRate: ctx.sampleRate });
    this.pending = new Float32Array(0); // samples not yet in a full frame
    this.micChoice = 'auto';
    this.freedOnPurpose = false;
  }

  configure({ silenceSec, sensitivity, startOn, autoPlay = true }) {
    this.detector.configure({ silenceSec, sensitivity, mode: startOn, maxSec: 600 });
    this.autoPlayback = autoPlay;
  }

  set(state) {
    if (this.state === state) return;
    this.state = state;
    this.dispatchEvent(new CustomEvent('state', { detail: state }));
  }

  get recordingSec() {
    return this.state === 'recording' ? (this.pos - this.detector.startAt) / this.ctx.sampleRate : 0;
  }

  /** Open the microphone and start listening. Throws if access is refused. */
  async on() {
    if (this.state !== 'off') return;
    await this.openMic();
    this.listen();
  }

  /** Close the microphone. A take in progress is kept (without playback). */
  off() {
    if (this.state === 'recording') this.finish(false);
    this.closeMic(); // also cancels a mic that is still opening
    this.set('off');
  }

  /**
   * Stop listening to the mic but stay on (while a take plays back). The mic
   * is freed where it can be taken back without a prompt, so the phone leaves
   * call mode and plays on a Bluetooth speaker; returns true if it was.
   */
  release() {
    if (this.state === 'off') return false;
    const had = !!this.stream;
    if (this.state === 'recording') this.finish(false);
    this.closeMic();
    return had && !this.stream;
  }

  /** Which mic to use: 'auto' (built-in preferred) or a deviceId. Reopens it if open. */
  async chooseMic(choice) {
    this.micChoice = choice || 'auto';
    if (!this.stream) return;
    const listening = !!this.graph;
    this.closeMic(true);
    if (listening) {
      await this.openMic();
      if (this.state === 'waiting' || this.state === 'recording') this.listen();
    }
  }

  /** The name of the mic in use, if the browser shows it. */
  get micLabel() {
    return this.stream?.getAudioTracks()[0]?.label || '';
  }

  /** Is the mic still held (it always is once granted, unless it died)? */
  get holdsMic() {
    return !!this.stream;
  }

  /** Reopen the microphone after release() and listen again. */
  async restore() {
    if (this.state === 'off') return;
    if (this.graph && !this.micAlive()) this.closeMic(); // cut off while we weren't listening
    if (!this.graph) {
      try {
        await this.openMic();
      } catch (err) {
        this.set('off');
        throw err;
      }
    }
    if (this.state !== 'off') this.listen();
  }

  get micOpen() {
    return !!this.graph;
  }

  /** Is the open mic still delivering? Phones cut it when the app is left. */
  micAlive() {
    return !!this.stream && this.stream.getTracks().every((t) => t.readyState === 'live' && !t.muted);
  }

  /** Seconds since the mic last delivered sound. */
  get silentFor() {
    return (performance.now() - this.lastChunkAt) / 1000;
  }

  /**
   * Reconnect the mic after it stopped delivering. The held mic is reused if
   * the browser still reports it alive; only a dead one is asked for again.
   * A take in progress is kept, without playback.
   */
  async reopen() {
    if (this.state === 'off') return;
    if (this.state === 'recording') this.finish(false);
    this.closeMic(!this.micAlive());
    await this.openMic();
    if (this.state !== 'off' && this.state !== 'playing' && this.state !== 'paused') this.listen();
  }

  /**
   * Echo cancellation keeps a take being played from being heard as playing,
   * but it also dulls the recording, so it is only used while recording
   * during playback is allowed. Applied to a held mic when it is next used.
   */
  set echoCancel(on) {
    this.echo = !!on;
  }

  async openMic() {
    if (this.graph) return;
    const ticket = (this.ticket = (this.ticket || 0) + 1);
    let stream = this.stream;
    if (stream && this.micAlive()) {
      // Reuse the mic we hold: no new request, so no prompt.
      for (const t of stream.getAudioTracks()) {
        t.enabled = true;
        if (t.getSettings?.().echoCancellation !== undefined && t.getSettings().echoCancellation !== !!this.echo) {
          try { await t.applyConstraints({ echoCancellation: !!this.echo, noiseSuppression: false, autoGainControl: false }); } catch { /* keep as is */ }
        }
      }
      if (ticket !== this.ticket) return;
    } else {
      if (stream) this.dropStream();
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
      const asked = performance.now();
      stream = await this.request();
      // Taking back a mic we freed should be instant; a long wait means the
      // browser asked again, so hold the mic from now on.
      if (this.freedOnPurpose && performance.now() - asked > PROMPT_SUSPECT_MS) promptSuspected = true;
      if (!this.freedOnPurpose) noteFirstRequest(performance.now() - asked);
      this.freedOnPurpose = false;
      stream = await this.preferBuiltIn(stream);
      this.keepStream(stream);
      // Turned off (or closed again) while the browser was opening it: hold it, switched off.
      if (ticket !== this.ticket) {
        for (const t of stream.getTracks()) t.enabled = false;
        return;
      }
    }
    this.lastChunkAt = performance.now();
    const src = this.ctx.createMediaStreamSource(stream);
    const sink = this.ctx.createGain();
    sink.gain.value = 0;
    sink.connect(this.ctx.destination);
    let node;
    try {
      if (!WORKLET_LOADED.has(this.ctx)) {
        await this.ctx.audioWorklet.addModule(new URL('./capture-worklet.js', import.meta.url));
        WORKLET_LOADED.add(this.ctx);
      }
      node = new AudioWorkletNode(this.ctx, 'capture', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1, channelCountMode: 'explicit' });
      node.port.onmessage = (e) => this.receive(e.data);
    } catch {
      node = this.ctx.createScriptProcessor(2048, 1, 1);
      node.onaudioprocess = (e) => this.receive(new Float32Array(e.inputBuffer.getChannelData(0)));
    }
    src.connect(node).connect(sink);
    this.graph = { src, node, sink };
  }

  constraints(deviceId) {
    return {
      audio: {
        echoCancellation: !!this.echo,
        noiseSuppression: false,
        autoGainControl: false,
        ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      },
    };
  }

  /** Ask for the preferred mic (names are known once permission was granted). */
  async request() {
    const { inputs, labelled } = await listDevices();
    const id = labelled ? preferredMic(inputs, this.micChoice) : null;
    try {
      return await navigator.mediaDevices.getUserMedia(this.constraints(id));
    } catch (err) {
      if (!id) throw err;
      return navigator.mediaDevices.getUserMedia(this.constraints(null)); // that device is gone
    }
  }

  /**
   * First time in, names were unknown: if the default turned out to be a
   * Bluetooth mic and a built-in one exists, switch to it. The new mic is
   * asked for while the first is still open, so there is no second prompt.
   */
  async preferBuiltIn(stream) {
    const { inputs } = await listDevices();
    const want = preferredMic(inputs, this.micChoice);
    const have = stream.getAudioTracks()[0]?.getSettings?.().deviceId;
    if (!want || want === have) return stream;
    try {
      const better = await navigator.mediaDevices.getUserMedia(this.constraints(want));
      stream.getTracks().forEach((t) => t.stop());
      return better;
    } catch {
      return stream;
    }
  }

  keepStream(stream) {
    this.stream = stream;
    for (const t of stream.getTracks()) {
      const lost = () => { if (this.stream === stream && this.graph) this.dispatchEvent(new Event('miclost')); };
      t.addEventListener('ended', lost);
      t.addEventListener('mute', lost);
    }
  }

  dropStream() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  /**
   * Stop processing the mic. It stays held, its tracks switched off, ready to
   * be reused without asking again; only a dead one is let go (`dead`).
   */
  closeMic(dead = false) {
    this.ticket = (this.ticket || 0) + 1;
    if (this.graph) {
      this.graph.src.disconnect();
      this.graph.node.disconnect();
      this.graph.sink.disconnect();
      if (this.graph.node.port) this.graph.node.port.onmessage = null;
      else this.graph.node.onaudioprocess = null;
      this.graph = null;
    }
    if (dead) {
      this.dropStream();
    } else if (this.stream && freesMicForPlayback()) {
      // Allowed in advance: close it, so the phone leaves call mode (full
      // volume, Bluetooth speakers); it comes back without a prompt.
      this.dropStream();
      this.freedOnPurpose = true;
    } else {
      this.stream?.getTracks().forEach((t) => { t.enabled = false; });
    }
  }

  /** Stop paying attention to the mic for a while (the takes list is in use). */
  pause() {
    if (this.state === 'off' || this.state === 'paused') return;
    if (this.state === 'recording') this.finish(false);
    this.closeMic(); // closed, or held switched off; listen() brings it back
    this.set('paused');
  }

  /** Back to waiting for the first note (after playback or a pause). */
  listen() {
    if (!this.graph) return;
    this.detector.reset();
    this.preroll = [];
    this.chunks = [];
    this.pending = new Float32Array(0);
    this.ignoreUntil = this.pos + SETTLE_SEC * this.ctx.sampleRate;
    this.set('waiting');
  }

  receive(data) {
    this.lastChunkAt = performance.now();
    const at = this.pos;
    this.pos += data.length;
    this.dispatchEvent(new CustomEvent('chunk', { detail: { data, state: this.state } }));
    if (this.state !== 'waiting' && this.state !== 'recording') return;
    if (at < this.ignoreUntil) return;

    if (this.state === 'waiting') {
      this.preroll.push({ at, data });
      const keep = PREROLL_SEC * this.ctx.sampleRate;
      while (this.preroll.length > 1 && at - this.preroll[1].at > keep) this.preroll.shift();
    } else {
      this.chunks.push(data);
    }

    // Analyse in whole frames whatever block size the browser delivers.
    let buf = this.pending.length ? concat(this.pending, data) : data;
    let start = at - this.pending.length;
    while (buf.length >= FRAME) {
      const frame = buf.subarray(0, FRAME);
      const event = this.detector.feed(analyzeFrame(frame, this.ctx.sampleRate), start, FRAME);
      buf = buf.subarray(FRAME);
      start += FRAME;
      if (event?.type === 'start') {
        this.chunks = this.preroll.map((c) => c.data);
        this.base = this.preroll[0].at;
        this.preroll = [];
        this.set('recording');
      } else if (event?.type === 'end') {
        this.pending = new Float32Array(0);
        const emitted = this.finish(true);
        // A take that will play back goes straight to 'playing' (no moment of
        // listening while it is saved); otherwise listen again.
        if (this.state === 'recording') {
          if (emitted && this.autoPlayback) this.hold();
          else this.listen();
        }
        return;
      }
    }
    this.pending = buf.slice();
  }

  /** Trim the take and announce it. */
  finish(playBack) {
    const d = this.detector;
    const all = concat(...this.chunks);
    const last = d.lastActiveEnd > 0 ? d.lastActiveEnd : this.pos;
    const b = trimBounds(all, this.ctx.sampleRate, d.startAt - this.base, last - this.base, d.floor);
    const samples = cut(all, b.start, b.end, this.ctx.sampleRate);
    this.chunks = [];
    d.reset();
    if (samples.length > this.ctx.sampleRate * 0.25) {
      this.dispatchEvent(new CustomEvent('take', { detail: { samples, sampleRate: this.ctx.sampleRate, playBack } }));
      return true;
    }
    return false;
  }

  /** The take is being played back: ignore the mic until listen(). */
  hold() {
    if (this.state !== 'off') this.set('playing');
  }
}

function concat(...parts) {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
