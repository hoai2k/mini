// One <audio> element playing songs from the library, with the lock screen,
// headphone and keyboard media keys wired through the Media Session API.

import * as store from './store.js';

export class Player extends EventTarget {
  constructor() {
    super();
    this.el = new Audio();
    this.el.preload = 'auto';
    this.el.setAttribute('playsinline', '');
    this.url = null;
    this.track = null;
    this.loadToken = 0;
    for (const type of ['play', 'pause', 'timeupdate', 'durationchange', 'ended', 'error', 'waiting', 'playing', 'ratechange', 'volumechange']) {
      this.el.addEventListener(type, () => {
        if (type === 'play' || type === 'pause' || type === 'durationchange' || type === 'ratechange') this.#position();
        if ((type === 'play' || type === 'pause') && 'mediaSession' in navigator) navigator.mediaSession.playbackState = this.el.paused ? 'paused' : 'playing';
        this.dispatchEvent(new Event(type));
      });
    }
  }

  get paused() { return this.el.paused; }
  get time() { return this.el.currentTime || 0; }
  get duration() { return Number.isFinite(this.el.duration) ? this.el.duration : this.track?.duration ?? 0; }

  /** Whether the page may set the volume (iOS ignores it; the hardware buttons rule there). */
  volumeSettable() {
    const a = new Audio();
    a.volume = 0.5;
    return a.volume === 0.5;
  }

  /** Load a song; plays when `play` is true, else waits at `at` seconds. */
  async load(track, { play = false, at = 0 } = {}) {
    const token = ++this.loadToken;
    const blob = await store.audio(track.id);
    if (token !== this.loadToken) return false;
    if (!blob) throw new Error('missing audio');
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = URL.createObjectURL(blob);
    this.track = track;
    this.el.src = this.url;
    if (at > 0) {
      const seek = () => { try { this.el.currentTime = Math.min(at, (this.el.duration || at + 1) - 0.5); } catch { /* not seekable yet */ } };
      if (this.el.readyState >= 1) seek(); else this.el.addEventListener('loadedmetadata', seek, { once: true });
    }
    if (play) await this.play();
    return true;
  }

  async play() {
    try {
      await this.el.play();
      return true;
    } catch (err) {
      if (err?.name !== 'AbortError') this.dispatchEvent(new CustomEvent('blocked', { detail: err }));
      return false;
    }
  }

  pause() { this.el.pause(); }
  toggle() { return this.el.paused ? this.play() : (this.pause(), true); }

  seek(sec) {
    const d = this.duration;
    if (!this.track) return;
    this.el.currentTime = Math.max(0, Math.min(d ? d - 0.05 : sec, sec));
    this.#position();
  }

  stop() {
    this.el.pause();
    this.el.removeAttribute('src');
    this.el.load();
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = null;
    this.track = null;
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
    }
  }

  /** Show the song on the lock screen and in the system media controls. */
  setMetadata({ title, artist, album, artwork }) {
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
    navigator.mediaSession.metadata = new MediaMetadata({ title, artist, album, artwork: artwork ? [artwork] : [] });
  }

  /** handlers: { play, pause, prev, next, seek(sec) } */
  bindSession(handlers) {
    if (!('mediaSession' in navigator)) return;
    const set = (action, fn) => { try { navigator.mediaSession.setActionHandler(action, fn); } catch { /* unsupported action */ } };
    set('play', () => handlers.play());
    set('pause', () => handlers.pause());
    set('stop', () => handlers.pause());
    set('previoustrack', () => handlers.prev());
    set('nexttrack', () => handlers.next());
    set('seekto', (d) => { if (d.seekTime != null) handlers.seek(d.seekTime); });
    set('seekbackward', (d) => handlers.seek(this.time - (d.seekOffset || 10)));
    set('seekforward', (d) => handlers.seek(this.time + (d.seekOffset || 10)));
  }

  #position() {
    if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
    const duration = this.duration;
    if (!duration || !Number.isFinite(duration)) return;
    try {
      navigator.mediaSession.setPositionState({ duration, playbackRate: this.el.playbackRate || 1, position: Math.min(this.time, duration) });
    } catch { /* position out of range during a load */ }
  }
}

/** Duration of an audio blob from the browser's own decoder (null if it can't play it). */
export function probe(blob, timeout = 8000) {
  return new Promise((resolve) => {
    const a = new Audio();
    const url = URL.createObjectURL(blob);
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      a.removeAttribute('src');
      a.load();
      URL.revokeObjectURL(url);
      resolve(value);
    };
    const timer = setTimeout(() => finish({ ok: true, duration: undefined }), timeout);
    a.preload = 'metadata';
    a.addEventListener('loadedmetadata', () => finish({ ok: true, duration: Number.isFinite(a.duration) ? a.duration : undefined }));
    a.addEventListener('error', () => finish({ ok: false }));
    a.src = url;
  });
}
