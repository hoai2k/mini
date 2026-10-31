// The zoom transitions as a module the game imports: the same engine the
// prototype page runs (engine.js), with no page chrome and no player input.
//
//   import { createTransitionPlayer } from '../prototypes/zoom/player.js';
//   const player = createTransitionPlayer({ container: el });       // or { canvas }
//   await player.play('mite', 'tardigrade');                         // forward ('in')
//   await player.play('tardigrade', 'mite', { dir: 'out' });         // reverse
//   player.skip();      // jump to the end of the current transition (its promise resolves)
//   player.dispose();   // stop, free the GL context, remove the canvas it made
//
// World ids: 'springtail', 'mite', 'tardigrade', 'amoeba', 'paramecium',
// 'bacterium', 'phage' (WORLD_IDS). from and to must be neighbours. dir
// defaults to 'in' when `to` is the finer world and 'out' when it is the
// coarser one. strategy: 'first' | 'during' | 'after' | 'cross' | 'cut' |
// 'auto' (default: each transition's recommended strategy). highlight:
// 'Frame flash' (default) | 'Pulsing frame' | 'Darken outside'.
// The promise resolves with { from, to, dir, skipped } when the new world
// fills the screen in its own look; the last frame stays drawn until the next
// play() or dispose(). audio: a shared/audio.js instance (createAudio([...]))
// for the worlds' ambiences and the tun's revival, or null for silence.
import { createEngine, DEFAULT_OPTS, HL_NAMES } from './engine.js';
import { IDS, TRANSITIONS, WORLDS } from './chain.js';

export const WORLD_IDS = IDS;
export const HIGHLIGHTS = HL_NAMES;

/** Which transition joins two worlds: { k (1..6, world k-1 → k), dir }, or throws. */
export function transitionFor(from, to, dir) {
  const i = IDS.indexOf(from), j = IDS.indexOf(to);
  if (i < 0 || j < 0) throw new Error(`zoom player: unknown world ${i < 0 ? from : to} (worlds: ${IDS.join(', ')})`);
  if (Math.abs(i - j) !== 1) throw new Error(`zoom player: ${from} and ${to} are not neighbours in the chain`);
  const d = dir === 'in' || dir === 'out' ? dir : j > i ? 'in' : 'out';
  return { k: Math.max(i, j), dir: d };
}

/** The twelve transitions (6 forward, 6 reverse), for menus. */
export function listTransitions() {
  const out = [];
  for (let k = 1; k < TRANSITIONS.length; k++) out.push({ k, dir: 'in', from: IDS[k - 1], to: IDS[k], title: TRANSITIONS[k].title, handoff: !!TRANSITIONS[k].handoff });
  for (let k = TRANSITIONS.length - 1; k >= 1; k--) out.push({ k, dir: 'out', from: IDS[k], to: IDS[k - 1], title: `${WORLDS[k].short} → ${WORLDS[k - 1].short}`, handoff: !!TRANSITIONS[k].handoff });
  return out;
}

export function createTransitionPlayer({ container = null, canvas = null, audio = null, opts = {} } = {}) {
  let made = false;
  let cv = canvas;
  if (!cv) {
    if (!container) throw new Error('zoom player: pass a container or a canvas');
    cv = document.createElement('canvas');
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    container.appendChild(cv);
    made = true;
  }
  const host = container || cv.parentElement || document.body;
  const size = () => [cv.clientWidth || host.clientWidth || innerWidth, cv.clientHeight || host.clientHeight || innerHeight];
  const eng = createEngine({ canvas: cv, size, audio, opts: { ...DEFAULT_OPTS, demo: false, auto: false, ...opts } });
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { eng.resize(); if (!raf) eng.render(); }) : null;
  ro?.observe(host);

  let raf = 0, last = 0, current = null, disposed = false;
  const stopLoop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
  function loop(now) {
    raf = 0;
    if (disposed) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    eng.update(dt, null);
    eng.render();
    if (current) raf = requestAnimationFrame(loop);
  }
  function finish(skipped) {
    if (!current) return;
    const c = current;
    current = null;
    c.off();
    eng.render();
    c.resolve({ from: c.from, to: c.to, dir: c.dir, skipped: skipped || !!c.skip });
  }

  return {
    canvas: cv,
    engine: eng,
    /** Play one transition; resolves when it has arrived. A play() during another skips that one first. */
    play(from, to, { dir, strategy = 'auto', highlight } = {}) {
      if (disposed) return Promise.reject(new Error('zoom player: disposed'));
      const t = transitionFor(from, to, dir);
      if (current) finish(true);
      eng.opts.strategy = strategy;
      if (highlight) eng.opts.hl = HL_NAMES.includes(highlight) ? highlight : HL_NAMES[0];
      if (t.dir === 'in') eng.playForward(t.k); else eng.playReverse(t.k);
      return new Promise((resolve) => {
        const offs = [eng.on('arrive', () => finish(false)), eng.on('reversed', () => finish(false))];
        current = { resolve, from, to, dir: t.dir, k: t.k, off: () => offs.forEach((f) => f()) };
        last = 0;
        if (!raf) raf = requestAnimationFrame(loop);
      });
    },
    /** Jump to the end of the current transition (its promise resolves with skipped: true). */
    skip() {
      if (!current) return;
      const S = eng.S;
      current.skip = true;
      if (S.phase === 'trans') { S.tau = S.dir > 0 ? S.tl.end : 0; S.hold = false; eng.update(0, null); }
      finish(true);
    },
    /** The current scale readout ({ bar, field, mag, look, instrument }). */
    readout() { return eng.readout(cv.clientWidth || innerWidth); },
    get playing() { return !!current; },
    dispose() {
      if (disposed) return;
      if (current) finish(true);
      disposed = true;
      stopLoop();
      ro?.disconnect();
      eng.dispose();
      if (made) cv.remove();
    },
  };
}
