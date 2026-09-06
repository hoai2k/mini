import assert from 'node:assert/strict';
class Param {
  value = 0;
  setTargetAtTime(value) {
    this.value = value;
  }
  setValueAtTime(value) {
    this.value = value;
  }
  exponentialRampToValueAtTime() {}
  linearRampToValueAtTime() {}
}
class Node {
  gain = new Param();
  frequency = new Param();
  threshold = new Param();
  knee = new Param();
  ratio = new Param();
  attack = new Param();
  release = new Param();
  connect() {}
  disconnect() {}
  start() {}
  stop() {
    this.onended?.();
  }
}
let oscillatorCount = 0;
const contexts = [];
class Context {
  currentTime = 0;
  state = 'running';
  sampleRate = 44100;
  destination = new Node();
  suspends = 0;
  resumes = 0;
  constructor() {
    contexts.push(this);
  }
  suspend() {
    this.suspends++;
    this.state = 'suspended';
    return Promise.resolve();
  }
  resume() {
    this.resumes++;
    this.state = 'running';
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
  createGain() {
    return new Node();
  }
  createDynamicsCompressor() {
    return new Node();
  }
  createBuffer() {
    return { getChannelData: () => new Float32Array(44100) };
  }
  createOscillator() {
    oscillatorCount++;
    return new Node();
  }
  createBufferSource() {
    return new Node();
  }
  createBiquadFilter() {
    return new Node();
  }
}
const tracks = [];
globalThis.Audio = class {
  volume = 1;
  plays = 0;
  pauses = 0;
  paused = true;
  currentTime = 0;
  cleared = false;
  loads = 0;
  deferred = null;
  constructor(url) {
    this.url = url;
    tracks.push(this);
  }
  play() {
    assert(
      tracks.every((t) => t === this || t.paused),
      'music tracks must never overlap',
    );
    this.plays++;
    this.paused = false;
    return this.deferred || Promise.resolve();
  }
  pause() {
    this.pauses++;
    this.paused = true;
  }
  removeAttribute() {
    this.cleared = true;
  }
  load() {
    this.loads++;
  }
};
globalThis.window = { AudioContext: Context };
const { GameAudio } = await import('../../src/game/audio.ts');
const audio = new GameAudio('/theme.mp3', '/grass-march.mp3'),
  [theme, level] = tracks;
assert.equal(tracks.length, 2);
for (const track of tracks) {
  assert(track.loop);
  assert.equal(track.preload, 'metadata');
  assert.equal(track.plays, 0);
}
audio.setScene('menu');
audio.playLevel();
assert.equal(theme.plays + level.plays, 0, 'scene intent cannot autoplay');
audio.effect('shield');
assert.equal(oscillatorCount, 0);
await audio.unlock();
assert.equal(theme.plays, 0);
assert.equal(level.plays, 1, 'unlock follows latest queued scene');
level.currentTime = 37.5;
audio.setScene('menu');
assert(level.paused);
assert(!theme.paused);
assert.equal(level.currentTime, 37.5);
theme.currentTime = 19.25;
audio.setScene('gameplay');
assert(theme.paused);
assert(!level.paused);
assert.equal(level.currentTime, 37.5, 'game resumes its own position');
assert.equal(theme.currentTime, 19.25);
const priorPlays = level.plays;
audio.setScene('gameplay');
await audio.unlock();
assert.equal(
  level.plays,
  priorPlays,
  'same scene/gesture does not restart music',
);
audio.playTheme();
assert(!theme.paused && level.paused);
assert.equal(theme.currentTime, 19.25, 'menu theme also resumes position');
audio.playLevel();
assert(theme.paused && !level.paused);
audio.setVolumes(0.5, 0.4, 0.7);
assert.equal(theme.volume, 0.2);
assert.equal(level.volume, 0.2);
audio.setMuted(true);
assert.equal(theme.volume, 0);
assert.equal(level.volume, 0);
audio.effect('shield');
assert.equal(oscillatorCount, 0);
audio.setMuted(false);
audio.effect('shield');
assert.equal(oscillatorCount, 2);
audio.effect('shield');
assert.equal(oscillatorCount, 2, 'shield hum rate limited');
audio.effect('laser');
assert.equal(oscillatorCount, 4);
audio.effect('laser');
assert.equal(oscillatorCount, 4, 'laser rate limited');
audio.pauseTheme();
assert(theme.paused && level.paused);
const pauses = theme.pauses + level.pauses;
audio.pauseTheme();
assert.equal(
  theme.pauses + level.pauses,
  pauses,
  'pause only touches playing tracks',
);
audio.resumeTheme();
assert(theme.paused && !level.paused);
assert.equal(level.currentTime, 37.5);
// A hidden or unfocused tab silences music and effects without losing position.
const [context] = contexts;
level.currentTime = 51.75;
audio.setBackground(true);
assert(theme.paused && level.paused, 'leaving the tab pauses every track');
assert.equal(context.suspends, 1, 'the effect context is suspended too');
audio.effect('jump');
assert.equal(oscillatorCount, 4, 'a suspended context plays no effects');
const backgroundPlays = theme.plays + level.plays;
audio.setScene('menu');
audio.setScene('gameplay');
audio.resumeTheme();
assert(
  theme.paused && level.paused,
  'scene changes stay silent while backgrounded',
);
assert.equal(theme.plays + level.plays, backgroundPlays);
audio.setBackground(true);
assert.equal(context.suspends, 1, 'a repeated background request does nothing');
audio.setBackground(false);
assert(!level.paused && theme.paused, 'returning resumes the selected track');
assert.equal(level.currentTime, 51.75, 'the track keeps its position');
assert.equal(context.state, 'running');
audio.pauseTheme();
let resolveTheme;
theme.deferred = new Promise((resolve) => {
  resolveTheme = resolve;
});
audio.playTheme();
audio.playLevel();
resolveTheme();
await Promise.resolve();
await Promise.resolve();
assert(
  theme.paused && !level.paused,
  'late play promise cannot restore outgoing track',
);
audio.setVolumes(5, -2, NaN);
assert.equal(theme.volume, 0);
assert.equal(level.volume, 0);
audio.dispose();
for (const track of tracks) {
  assert(track.paused);
  assert(track.cleared);
  assert.equal(track.loads, 1);
}
const totalPlays = theme.plays + level.plays;
audio.playTheme();
audio.playLevel();
await audio.unlock();
assert.equal(theme.plays + level.plays, totalPlays);
console.log(
  'PASS: two-track routing, deferred scene intent, no autoplay/overlap, independent positions, pause/resume, background suspension, volume/mute/clamping, shield/laser limits, stale play promises, and disposal.',
);
