// Drum Practice, the shell's side: free drumming and call and answer
// (practice.js holds the rhythm logic). It runs inside the game shell
// (main.js), which hands it what it needs through ctx: its systems (sound,
// renderer, input, art), settings and storage, the clocks, the screen and
// feedback helpers, and the current game as ctx.game (read and replaced).

import { createBattle } from './battle.js';
import { PALETTE as P } from './palette.js';
import { PracticeSession, CallSession, KITS, SECONDS, loopPosition } from './practice.js';

export function createPractice(ctx) {
  const { $, art, sound, renderer, input, settings, save, practiceSettings, songTime, hitTime, heardTime, confirm, feedback, show, enterFullscreen, hideSuccess, strokeKeys, LOOKAHEAD } = ctx;

  // Free drumming and call and answer (practice.js): no right or wrong, just
  // the drum, a kit to choose, and dancers who come once the drumming gets going.

  const PRACTICE = {
    free: {
      id: 'practice-free',
      title: 'Free drumming',
      subtitle: 'Drum anything; the crew plays it back',
      intro: 'Drum any rhythm of four beats (or as many as you set), one, two or three strokes a beat. The drum crew plays it back again and again, and dancers gather at the fire. Drum along with it as long as you like; it keeps going until you clear it with A (Space, or a swipe), and then the next rhythm you drum takes its place. Pairs, triplets, pauses: anything goes.',
    },
    call: {
      id: 'practice-call',
      title: 'Call and answer',
      subtitle: 'Trade rhythms with a partner',
      intro: 'Your partner drums a call and you answer with any rhythm of the same number of beats; then the two are played back. Answer on the beat and it is your turn to lead: your partner answers your call with a riff on it. Wait, and they lead again. Nothing is wrong: copy them, or answer in your own way.',
    },
  };
  for (const st of Object.values(PRACTICE)) Object.assign(st, { mode: 'practice', sky: 'dusk', ambience: 'amb-practice', troops: 0, elephant: false, enemies: [] });

  /** The practice modes' screen (from the title). */
  function openPractice() {
    sound.start();
    sound.loadSamples().then(() => {
      if (ctx.screen === 'practice') sound.playMusic('mu-select');
    });
    enterFullscreen();
    buildPracticeCards();
    show('practice');
  }

  function buildPracticeCards() {
    const box = $('#practice-cards');
    box.innerHTML = '';
    const intro = $('#practice-intro');
    for (const [kind, st] of Object.entries(PRACTICE)) {
      const b = document.createElement('button');
      b.className = 'card';
      b.dataset.nav = '';
      const img = art.get(`card-${st.id}`);
      b.innerHTML = `<span class="card-art${img ? '' : ' plain'}" aria-hidden="true"></span><span class="num">Drum Practice</span><span class="name"></span><span class="sub"></span>`;
      if (img) b.querySelector('.card-art').style.backgroundImage = `url(${img.src})`;
      b.querySelector('.name').textContent = st.title;
      b.querySelector('.sub').textContent = st.subtitle;
      b.setAttribute('aria-description', st.intro);
      const describe = () => {
        intro.textContent = st.intro;
      };
      b.addEventListener('focus', describe);
      b.addEventListener('mouseenter', describe);
      b.addEventListener('click', () => startPractice(kind));
      box.appendChild(b);
    }
    intro.textContent = PRACTICE.free.intro;
  }

  function practiceKit() {
    return KITS[0]; // the main drum is always the bronze drum
  }

  /** The secondary drum chosen (LB and RB), the barrel drum by default. */
  function secondDrum() {
    return SECONDS.find((x) => x.id === practiceSettings.second) || SECONDS[0];
  }

  /** Sound a stroke of the rhythm on its drum: the bronze drum, or the secondary drum ('S'). */
  function voice(drum, when, gain, rate, dest) {
    if (drum === 'S') return sound.secondStroke(secondDrum().sample, when, gain, rate, dest);
    return sound.echo(drum, when, gain, rate, dest);
  }

  function startPractice(kind) {
    hideSuccess();
    if (ctx.game && ctx.game.practice) stopPractice();
    const stage = PRACTICE[kind];
    sound.start();
    sound.setKit(null);
    input.practice = true;
    ctx.game = {
      index: -1,
      stage,
      practice: kind,
      mode: 'practice',
      session: kind === 'call' ? new CallSession({ beats: practiceSettings.beats }) : new PracticeSession({ mode: kind, beats: practiceSettings.beats }),
      battle: createBattle(stage),
      clockStart: sound.now + 0.6,
      pulses: [], // strokes heard, for the dancers: { t, drum, who }
      energy: 0, // how much drumming there has been lately (dancers come with it)
      dancers: 0,
      doneAt: null, // when the last rhythm was completed (it lights up)
      lastSound: -9,
      loopBus: null,
      loopNext: 0,
      callBus: null,
      feedback: null,
      confirm: null,
      ended: false,
    };
    renderer.setStage(stage);
    renderer.dancers = [];
    sound.loadSamples().then(() => {
      if (ctx.game && ctx.game.stage === stage) {
        sound.startAmbience(stage.ambience);
        sound.stopMusic(1.5);
      }
    });
    if (document.activeElement) document.activeElement.blur();
    show('play');
  }

  /** Silence the practice loop and the partner when leaving. */
  function stopPractice() {
    const g = ctx.game;
    if (!g) return;
    for (const bus of [g.loopBus, g.callBus]) {
      if (!bus) continue;
      sound.fadeBus(bus, 0, 0.15);
      setTimeout(() => bus.disconnect(), 400);
    }
    g.loopBus = null;
    g.callBus = null;
    sound.setKit(null);
    input.practice = false;
  }

  function practiceStrike(drum, time) {
    const g = ctx.game;
    const t = hitTime(time);
    if (drum === 'L') sound.tung();
    else if (drum === 'S') {
      sound.secondStroke(secondDrum().sample);
      renderer.kick('second', songTime());
    } else sound.cac();
    if (drum !== 'S') renderer.hit(drum, songTime());
    input.rumble(drum === 'R' ? 30 : 50, drum === 'R' ? 0.3 : 0.6);
    heard(drum, songTime(), 'you', 1);
    for (const e of g.session.stroke(drum, t)) practiceEvent(e);
  }

  /** A stroke reaches the green: the dancers move to it, and the drumming builds. */
  function heard(drum, t, who, energy) {
    const g = ctx.game;
    g.pulses.push({ t, drum, who });
    if (g.pulses.length > 48) g.pulses.splice(0, g.pulses.length - 48);
    g.energy = Math.min(36, g.energy + energy);
    g.lastSound = Math.max(g.lastSound, t);
  }

  function practiceAct(action) {
    const g = ctx.game;
    const s = g.session;
    const t = songTime();
    if (action === 'guard' || action === 'reset') {
      // A (Space, a swipe on touch): clear the dots, and in free play stop the loop.
      for (const e of s.clear(t)) practiceEvent(e);
      sound.play('drum-mo', sound.now, 0.6);
      renderer.kick('mo', t);
    } else if (action === 'fewer' || action === 'more') {
      const events = s.setBeats(s.beats + (action === 'more' ? 1 : -1), t);
      if (!events.length) return sound.play('ui-back');
      sound.play('ui-move');
      for (const e of events) practiceEvent(e);
    } else if (action === 'secondNext' || action === 'secondPrev') {
      const i = SECONDS.indexOf(secondDrum());
      const next = SECONDS[(i + (action === 'secondNext' ? 1 : SECONDS.length - 1)) % SECONDS.length];
      practiceSettings.second = next.id;
      save('practice', practiceSettings);
      // Let them hear it.
      sound.secondStroke(next.sample, sound.now + 0.02);
      renderer.kick('second', songTime());
      confirm(`${next.vn} · ${next.name}`, P.bronzeLight);
    }
  }

  function practiceEvent(e) {
    const g = ctx.game;
    const level = (settings.echo / 100) * 0.9 + 0.1;
    switch (e.type) {
      case 'loop': {
        if (g.loopBus) {
          const old = g.loopBus;
          sound.fadeBus(old, 0, 0.3);
          setTimeout(() => old.disconnect(), 800);
        }
        g.loopBus = sound.bus(level);
        g.loopNext = 0;
        g.doneAt = songTime();
        confirm('Again and again', P.bronzeLight);
        break;
      }
      case 'clear':
        if (g.loopBus) {
          const old = g.loopBus;
          sound.fadeBus(old, 0, 0.2);
          setTimeout(() => old.disconnect(), 600);
          g.loopBus = null;
        }
        confirm(e.stopped ? 'Stopped' : 'Cleared', P.paperShade);
        break;
      case 'beats':
        practiceSettings.beats = e.beats;
        save('practice', practiceSettings);
        confirm(`${e.beats} beats`, P.paper);
        break;
      case 'cutCall':
        if (g.callBus) {
          const old = g.callBus;
          sound.fadeBus(old, 0, 0.06);
          setTimeout(() => old.disconnect(), 400);
          g.callBus = null;
        }
        // The strokes not played yet no longer move the dancers.
        g.pulses = g.pulses.filter((q) => q.who !== 'partner' || q.t <= songTime());
        break;
      case 'call': {
        // The partner plays the whole call now, scheduled on the audio clock.
        if (g.callBus) g.callBus.disconnect();
        g.callBus = sound.bus(0.85);
        for (const st of e.call.strokes) {
          voice(st.drum, g.clockStart + st.t, 1, 1.07, g.callBus);
          heard(st.drum, st.t, 'partner', 0.5);
        }
        break;
      }
      case 'answered':
        g.doneAt = songTime();
        confirm(e.inTime ? 'In time!' : 'Answered', P.bronzeLight);
        break;
      case 'replay': {
        // The exchange played back: the partner's call in their voice, then the
        // player's answer in the player's own drum.
        if (g.callBus) g.callBus.disconnect();
        g.callBus = sound.bus(0.85);
        const [them, you] = e.replay.parts;
        for (const st of them.strokes) {
          voice(st.drum, g.clockStart + st.t, 1, 1.07, g.callBus);
          heard(st.drum, st.t, 'partner', 0.4);
        }
        for (const st of you.strokes) {
          voice(st.drum, g.clockStart + st.t, 0.9, 1, g.callBus);
          heard(st.drum, st.t, 'loop', 0.4);
        }
        break;
      }
      case 'yourTurn':
        confirm('Your turn: lead a call', P.bronzeLight);
        break;
      case 'led':
        g.doneAt = songTime();
        break;
      case 'riff': {
        // The partner answers the player's call with a riff on it.
        if (g.callBus) g.callBus.disconnect();
        g.callBus = sound.bus(0.85);
        for (const st of e.riff.strokes) {
          voice(st.drum, g.clockStart + st.t, 1, 1.07, g.callBus);
          heard(st.drum, st.t, 'partner', 0.5);
        }
        break;
      }
      case 'takeover':
        confirm('Your partner leads', P.paperShade);
        break;
    }
  }

  function updatePractice(dt) {
    const g = ctx.game;
    const t = songTime();
    const s = g.session;
    for (const e of s.update(t)) practiceEvent(e);
    // The loop: the crew drums it round after round, just ahead of time.
    const L = s.loop;
    if (L && g.loopBus) {
      const n = L.strokes.length;
      while (true) {
        const st = L.strokes[g.loopNext % n];
        const at = L.start + Math.floor(g.loopNext / n) * L.period + st.pos * L.u;
        if (at - t > LOOKAHEAD) break;
        if (at >= t - 0.05) {
          voice(st.drum, g.clockStart + Math.max(at, t), 1, 0.97, g.loopBus);
          heard(st.drum, at, 'loop', 0.6);
        }
        g.loopNext += 1;
      }
    }
    // The drumming dies down when it stops: the dancers drift away.
    const quiet = t - g.lastSound > 2;
    g.energy = Math.max(0, g.energy - dt * (quiet ? 2.2 : 0.12));
    // The fire on the green: its crackle rises with it as the drumming builds.
    sound.ambienceLayer('amb-fire', 0.25 + 0.75 * Math.min(1, g.energy / 30));
    // A shout and a clap as each new dancer joins.
    const dancers = practiceDancers();
    if (dancers > g.dancers) sound.play('dancer-join', sound.now, 0.8);
    g.dancers = dancers;
    renderer.draw(practiceView(), dt);
  }

  /** How many dancers the drumming has drawn in: one for every five points of groove, up to six. */
  function practiceDancers() {
    return Math.min(6, Math.floor(ctx.game.energy / 5));
  }

  /**
   * What call and answer shows: the partner's row above (their call, their riff
   * on the player's call, or the call in the playback) and the player's below
   * (the answer, the player's call, or what is being drummed), with a playhead
   * on what is sounding, and a heading for the moment.
   */
  function callRows(s, t) {
    const played = (strokes, end = Infinity) => strokes.filter((st) => st.t <= Math.min(t, end)).length;
    const asPattern = (r) => ({ strokes: r.strokes, beats: r.beats, text: r.text });
    const drumming = s.phrase.length ? { entering: true } : null;
    const phase = s.phase;
    if (phase === 'replay' && s.replay) {
      const [them, you] = s.replay.parts;
      const a = played(them.strokes);
      const b = played(you.strokes);
      return {
        top: { pattern: { strokes: them.strokes, beats: s.beats }, played: a, glow: a > 0 && b === 0, label: 'Partner' },
        bottom: { pattern: { strokes: you.strokes, beats: s.beats }, played: b, glow: b > 0, label: 'You' },
        heading: 'Played back',
        headingColor: P.bronzeLight,
      };
    }
    if (phase === 'lead' || phase === 'riff') {
      const riff = s.riff;
      const sounding = riff && t >= riff.start && t < riff.end;
      return {
        top: riff ? { pattern: asPattern(riff), played: played(riff.strokes, riff.end), glow: sounding, dim: !sounding && !!drumming, label: 'Partner' } : null,
        bottom: drumming || (s.lead ? { pattern: s.lead, flash: true, dim: !!riff && t >= riff.end, label: 'You lead' } : null),
        heading: drumming
          ? `Your call: beat ${Math.min(s.beats, s.partial ? s.partial.beats : 1)} of ${s.beats}`
          : sounding ? 'Your partner answers…' : s.lead ? 'Lead again, or wait for your partner' : 'Your turn: lead a call',
        headingColor: !drumming && !sounding && !s.lead ? P.bronzeLight : P.paper,
      };
    }
    const call = s.call;
    const calling = !!call && t >= call.start - 0.05 && t < call.end && !s.phrase.length;
    return {
      top: call ? { pattern: asPattern(call), played: played(call.strokes, call.end), glow: calling } : null,
      bottom: drumming || null,
      heading: calling ? 'Listen…' : drumming ? `Beat ${Math.min(s.beats, s.partial ? s.partial.beats : 1)} of ${s.beats}` : call ? `Answer with any ${s.beats} beats` : 'Your partner is ready…',
    };
  }

  /** How each practice control is shown in the HUD for the device in use, as rich-text tokens. */
  function practiceKeys() {
    return {
      gamepad: { fewer: '⟨k:▼⟩', more: '⟨k:▲⟩', second: '⟨Y⟩', choose: '⟨k:LB⟩ ⟨k:RB⟩', clear: '⟨A⟩' },
      touch: { fewer: '−', more: '+', second: 'Tap', choose: '‹ ›', clear: 'Swipe' },
    }[input.device] || { fewer: '⟨k:−⟩', more: '⟨k:+⟩', second: '⟨k:G⟩', choose: '⟨k:[⟩ ⟨k:]⟩', clear: 'Space:' };
  }

  function practiceView() {
    const g = ctx.game;
    const t = songTime();
    const s = g.session;
    const lp = loopPosition(s.loop, t);
    const call = s.call;
    const callPlayed = call ? call.strokes.filter((st) => st.t <= Math.min(t, call.end)).length : 0;
    const calling = !!call && t >= call.start - 0.05 && t < call.end && !s.phrase.length;
    const keys = strokeKeys();
    let hint = null;
    if (settings.hints && t < 14 && !s.loops) {
      hint = s.mode === 'free'
        ? `Drum any ${s.beats} beats — ${keys.L} tùng, ${keys.R} cắc, one to three strokes a beat — and the crew plays them back`
        : `Listen to your partner, then answer with any ${s.beats} beats`;
    }
    const v = {
      battle: g.battle,
      songTime: t,
      beatFloat: lp ? lp.pos : t / 0.8,
      heron: -1,
      phraseView: null,
      ready: !s.phrase.length,
      shieldsUp: false,
      cycle: null,
      threats: [],
      incoming: 0,
      guardAt: -9,
      guardUntil: -9,
      confirm: g.confirm,
      sustaining: false,
      inResponse: false,
      responseCommand: null,
      combo: 0,
      spirit: false,
      feedback: g.feedback,
      unlocked: [],
      maxTier: 3,
      mode: 'practice',
      stage: g.stage,
      session: s,
      touch: input.device === 'touch',
      hint,
      demo: null,
      heard: heardTime(),
      success: false,
      miss: null,
      practice: {
        kind: s.mode,
        beats: s.beats,
        kit: practiceKit(),
        second: secondDrum(),
        entered: s.phrase.length,
        partial: s.partial,
        loop: s.loop,
        loopPos: lp,
        call,
        callPlayed,
        calling,
        answer: s.answer,
        // The answer stays up until the partner's next call starts.
        showAnswer: !!s.answer && !!call && t < call.start,
        rows: s.mode === 'call' ? callRows(s, t) : null,
        doneAt: g.doneAt,
        dancers: practiceDancers(),
        groove: Math.min(1, g.energy / 30),
        pulses: g.pulses,
        keys: practiceKeys(),
      },
    };
    return v;
  }

  return { PRACTICE, openPractice, startPractice, stopPractice, practiceStrike, practiceAct, updatePractice, practiceView };
}
