/*
 * Tank Wars sound: arcade sound effects and a sparse music loop, all
 * synthesised with Web Audio (square, pulse and triangle tones plus noise, in
 * the manner of an early-80s arcade board). No audio files.
 *
 * Everything goes through TankWarsSound.audible() (menu.js): nothing plays
 * while muted, while the tab is hidden or while the window is unfocused, and
 * the master volume drops to zero at once when any of those happen.
 *
 * API (window.TankWarsSfx):
 *   play(name, { pan, vol, key })  one-shot effect, see EFFECTS below
 *   shot(flags, { pan, vol, key }) a tank's shot, voiced by its power-ups
 *   pickup(typeId, { pan, vol })   a power-up collected, one sound per type
 *   music(mode, intensity)         'play' | 'menu' | 'off'; intensity 0..1 speeds up the play loop
 *   refresh()                      re-check audibility now (mute toggled, focus changed)
 */
(function () {
    const AC = window.AudioContext || window.webkitAudioContext;
    let ac = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null, pulseWave = null, buzzWave = null;
    const lastPlayed = new Map();
    const MASTER_VOL = 0.55, MUSIC_VOL = 0.32;

    const audible = () => !!window.TankWarsSound?.audible?.();
    const midi = m => 440 * Math.pow(2, (m - 69) / 12);

    function init() {
        if (ac || !AC) return ac;
        try {
            ac = new AC();
            const comp = ac.createDynamicsCompressor();
            comp.threshold.value = -14; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.15;
            master = ac.createGain(); master.gain.value = audible() ? MASTER_VOL : 0;
            sfxBus = ac.createGain(); sfxBus.gain.value = 1;
            musicBus = ac.createGain(); musicBus.gain.value = MUSIC_VOL;
            sfxBus.connect(master); musicBus.connect(master); master.connect(comp); comp.connect(ac.destination);
            noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
            const data = noiseBuf.getChannelData(0);
            // Stepped noise (a sample-and-hold every few samples) sounds grittier, like a hardware noise channel.
            let v = 0;
            for (let i = 0; i < data.length; i++) { if (i % 3 === 0) v = Math.random() * 2 - 1; data[i] = v; }
            // A 25% pulse, and a buzzy wave with strong odd and even harmonics for the "distorted" arcade tones.
            const n = 32, re = new Float32Array(n), im = new Float32Array(n), re2 = new Float32Array(n), im2 = new Float32Array(n);
            for (let k = 1; k < n; k++) {
                im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * 0.25);
                im2[k] = (k % 2 ? 1 : 0.6) / Math.pow(k, 0.8);
            }
            pulseWave = ac.createPeriodicWave(re, im);
            buzzWave = ac.createPeriodicWave(re2, im2);
        } catch (err) {
            ac = null;
        }
        return ac;
    }

    function unlock() {
        if (!init()) return;
        if (ac.state === 'suspended') ac.resume().catch(() => {});
        refresh();
    }
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, unlock, { passive: true, capture: true }));

    function refresh() {
        if (!ac) return;
        const on = audible();
        const now = ac.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setTargetAtTime(on ? MASTER_VOL : 0, now, on ? 0.05 : 0.01);
        if (!on) music.stopAll();
    }
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('blur', refresh);
    window.addEventListener('focus', refresh);

    // Effects play only when audible and the context is running; repeated keys inside `gap` seconds are dropped.
    function ready(key, gap) {
        if (!audible() || !init() || ac.state !== 'running') {
            if (ac && ac.state === 'suspended' && audible()) ac.resume().catch(() => {});
            return false;
        }
        if (key) {
            const t = ac.currentTime, last = lastPlayed.get(key);
            if (last !== undefined && t - last < gap) return false;
            lastPlayed.set(key, t);
        }
        return true;
    }

    function out(bus, pan) {
        if (!pan || !ac.createStereoPanner) return bus;
        const p = ac.createStereoPanner();
        p.pan.value = Math.max(-1, Math.min(1, pan));
        p.connect(bus);
        return p;
    }

    function setWave(osc, type) {
        if (type === 'pulse') osc.setPeriodicWave(pulseWave);
        else if (type === 'buzz') osc.setPeriodicWave(buzzWave);
        else osc.type = type;
    }

    // One tone with a pitch sweep from f0 to f1 and a short attack / exponential decay.
    function tone({ type = 'square', f0 = 440, f1 = f0, dur = 0.1, vol = 0.2, delay = 0, attack = 0.004, pan = 0, vib = 0, vibRate = 0, bus = sfxBus, at }) {
        const t0 = (at ?? ac.currentTime) + delay;
        const osc = ac.createOscillator(), g = ac.createGain();
        setWave(osc, type);
        osc.frequency.setValueAtTime(Math.max(20, f0), t0);
        if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
        if (vib) {
            const lfo = ac.createOscillator(), lg = ac.createGain();
            lfo.frequency.value = vibRate || 12; lg.gain.value = vib;
            lfo.connect(lg); lg.connect(osc.frequency);
            lfo.start(t0); lfo.stop(t0 + dur + 0.05);
        }
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(vol, t0 + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(g); g.connect(out(bus, pan));
        osc.start(t0); osc.stop(t0 + dur + 0.02);
    }

    // Filtered noise burst; the filter sweeps from f0 to f1.
    function noise({ dur = 0.2, vol = 0.3, f0 = 4000, f1 = 300, q = 0.7, filter = 'lowpass', delay = 0, pan = 0, attack = 0.002, bus = sfxBus, at }) {
        const t0 = (at ?? ac.currentTime) + delay;
        const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
        src.buffer = noiseBuf; src.loop = true;
        f.type = filter; f.Q.value = q;
        f.frequency.setValueAtTime(f0, t0);
        f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dur);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(vol, t0 + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(f); f.connect(g); g.connect(out(bus, pan));
        src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.02);
    }

    // A quick run of notes (MIDI numbers, null for a rest).
    function arp(notes, { step = 0.06, len = step * 0.9, type = 'square', vol = 0.15, pan = 0, delay = 0, slide = 1 } = {}) {
        notes.forEach((m, i) => {
            if (m === null) return;
            const f = midi(m);
            tone({ type, f0: f, f1: f * slide, dur: len, vol, pan, delay: delay + i * step });
        });
    }

    const EFFECTS = {
        // Menus
        menuMove: o => tone({ type: 'pulse', f0: 1320, dur: 0.035, vol: 0.07 * o.vol }),
        menuSelect: o => { tone({ type: 'square', f0: 660, dur: 0.05, vol: 0.09 * o.vol }); tone({ type: 'square', f0: 990, dur: 0.07, vol: 0.09 * o.vol, delay: 0.05 }); },
        menuBack: o => { tone({ type: 'square', f0: 660, dur: 0.05, vol: 0.08 * o.vol }); tone({ type: 'square', f0: 440, dur: 0.07, vol: 0.08 * o.vol, delay: 0.05 }); },
        pause: o => arp([84, 79, 72], { step: 0.05, type: 'pulse', vol: 0.1 * o.vol }),
        resume: o => arp([72, 79, 84], { step: 0.05, type: 'pulse', vol: 0.1 * o.vol }),

        // Round flow
        start: o => { arp([60, 64, 67, 72, null, 67, 72], { step: 0.08, type: 'square', vol: 0.12 * o.vol }); arp([36, null, 43, null, 48], { step: 0.08, type: 'triangle', vol: 0.3 * o.vol, len: 0.12 }); },
        coin: o => { tone({ type: 'square', f0: midi(83), dur: 0.07, vol: 0.12 * o.vol, pan: o.pan }); tone({ type: 'square', f0: midi(88), dur: 0.35, vol: 0.12 * o.vol, delay: 0.07, pan: o.pan }); },
        levelClear: o => { arp([72, 76, 79, 84, 79, 84, 88, null, 91], { step: 0.09, type: 'pulse', vol: 0.13 * o.vol, len: 0.11 }); arp([48, null, 55, null, 60, null, 55, null, 60], { step: 0.09, type: 'triangle', vol: 0.3 * o.vol, len: 0.16 }); },
        levelFail: o => { arp([67, 66, 65, 64, 63, 62, 61, 60], { step: 0.12, type: 'buzz', vol: 0.12 * o.vol, len: 0.14, slide: 0.97 }); tone({ type: 'triangle', f0: 98, f1: 40, dur: 1.1, vol: 0.32 * o.vol, delay: 0.96 }); },

        // Combat
        hit: o => { noise({ dur: 0.08, vol: 0.18 * o.vol, f0: 3000, f1: 800, pan: o.pan }); tone({ type: 'square', f0: 220, f1: 110, dur: 0.08, vol: 0.12 * o.vol, pan: o.pan }); },
        shieldHit: o => { tone({ type: 'triangle', f0: 2093, dur: 0.18, vol: 0.18 * o.vol, pan: o.pan }); tone({ type: 'triangle', f0: 3136, dur: 0.12, vol: 0.1 * o.vol, pan: o.pan, delay: 0.02 }); },
        reflect: o => { tone({ type: 'square', f0: 300, f1: 1800, dur: 0.14, vol: 0.13 * o.vol, pan: o.pan, vib: 60, vibRate: 30 }); },
        bounce: o => tone({ type: 'pulse', f0: 1760, f1: 1200, dur: 0.04, vol: 0.08 * o.vol, pan: o.pan }),
        wallHit: o => noise({ dur: 0.04, vol: 0.06 * o.vol, f0: 2500, f1: 600, pan: o.pan }),
        bomb: o => { noise({ dur: 0.7, vol: 0.45 * o.vol, f0: 1800, f1: 60, pan: o.pan }); tone({ type: 'triangle', f0: 120, f1: 30, dur: 0.6, vol: 0.4 * o.vol, pan: o.pan }); },
        explode: o => { noise({ dur: 0.45, vol: 0.32 * o.vol, f0: 3500, f1: 120, pan: o.pan }); tone({ type: 'buzz', f0: 180, f1: 40, dur: 0.35, vol: 0.12 * o.vol, pan: o.pan }); },
        // A player losing a life: the falling, wobbling whine of an arcade player death, then a thump.
        playerDeath: o => {
            noise({ dur: 0.6, vol: 0.35 * o.vol, f0: 4000, f1: 100, pan: o.pan });
            tone({ type: 'buzz', f0: 1200, f1: 90, dur: 0.9, vol: 0.14 * o.vol, pan: o.pan, vib: 80, vibRate: 18 });
            tone({ type: 'triangle', f0: 90, f1: 35, dur: 0.5, vol: 0.35 * o.vol, pan: o.pan, delay: 0.1 });
        },
        playerOut: o => {
            EFFECTS.playerDeath(o);
            arp([64, 60, 57, 52], { step: 0.16, type: 'pulse', vol: 0.12 * o.vol, len: 0.15, delay: 0.75 });
        },
        respawn: o => arp([60, 67, 72, 79, 84], { step: 0.045, type: 'pulse', vol: 0.09 * o.vol, pan: o.pan }),
        stunned: o => tone({ type: 'buzz', f0: 70, dur: 0.5, vol: 0.12 * o.vol, pan: o.pan, vib: 20, vibRate: 25 }),

        // Power-ups appearing on the map
        puSpawn: o => { tone({ type: 'triangle', f0: midi(91), dur: 0.08, vol: 0.12 * o.vol, pan: o.pan }); tone({ type: 'triangle', f0: midi(96), dur: 0.16, vol: 0.12 * o.vol, pan: o.pan, delay: 0.08 }); }
    };

    // One pickup sound per power-up type, keyed by PU_TYPES id in game.js.
    const PICKUPS = {
        1: o => arp([60, 64, 67, 72, 76, 79, 84], { step: 0.03, type: 'pulse', vol: 0.12 * o.vol, pan: o.pan }), // SPEED: fast run up
        2: o => { tone({ type: 'triangle', f0: midi(76), dur: 0.4, vol: 0.18 * o.vol, pan: o.pan, vib: 12, vibRate: 9 }); tone({ type: 'triangle', f0: midi(83), dur: 0.4, vol: 0.14 * o.vol, pan: o.pan, delay: 0.08, vib: 12, vibRate: 9 }); }, // SHIELD: shimmer
        3: o => tone({ type: 'pulse', f0: 220, f1: 1760, dur: 0.45, vol: 0.12 * o.vol, pan: o.pan }), // DISTANCE: long slide up
        4: o => { arp([72, 76, 79], { step: 0.04, type: 'square', vol: 0.16 * o.vol, pan: o.pan - 0.3 }); arp([76, 79, 84], { step: 0.04, type: 'square', vol: 0.16 * o.vol, pan: o.pan + 0.3, delay: 0.12 }); }, // SPRAY: fanned stabs
        5: o => { tone({ type: 'square', f0: 400, f1: 3200, dur: 0.12, vol: 0.12 * o.vol, pan: o.pan }); tone({ type: 'square', f0: 800, f1: 4000, dur: 0.1, vol: 0.08 * o.vol, pan: o.pan, delay: 0.12 }); }, // FAST BULLET: zip zip
        6: o => { arp([36, 43, 48], { step: 0.1, type: 'buzz', vol: 0.16 * o.vol, len: 0.12, pan: o.pan }); tone({ type: 'triangle', f0: 65, dur: 0.4, vol: 0.3 * o.vol, pan: o.pan, delay: 0.3 }); }, // BIG BULLET: heavy steps
        7: o => arp([84, 84, 84, 84, 84, 84, 88, 88], { step: 0.035, len: 0.02, type: 'square', vol: 0.11 * o.vol, pan: o.pan }), // RAPID FIRE: stutter
        8: o => arp([72, 76, 79, 84, 88], { step: 0.07, type: 'triangle', vol: 0.22 * o.vol, len: 0.14, pan: o.pan }), // HEAL: gentle major run
        9: o => [-0.8, 0.8, -0.8, 0.8].forEach((p, i) => tone({ type: 'pulse', f0: midi(i < 2 ? 79 : 84), dur: 0.06, vol: 0.12 * o.vol, pan: p, delay: i * 0.07 })), // SIDE SHOT: left, right
        10: o => { tone({ type: 'square', f0: 2400, f1: 400, dur: 0.4, vol: 0.08 * o.vol, pan: o.pan }); noise({ dur: 0.25, vol: 0.28 * o.vol, f0: 1500, f1: 80, pan: o.pan, delay: 0.4 }); }, // BOMB: falling whistle, boom
        11: o => [0, 0.12, 0.21, 0.27, 0.31].forEach((d, i) => tone({ type: 'pulse', f0: midi(88 - i * 2), dur: 0.05, vol: 0.12 * o.vol, pan: o.pan + (i % 2 ? 0.3 : -0.3), delay: d })), // RICOCHET: bouncing ball
        12: o => tone({ type: 'square', f0: 330, f1: 660, dur: 0.5, vol: 0.12 * o.vol, pan: o.pan, vib: 90, vibRate: 14 }), // KINETIC SHIELD: wow-wow
        13: o => { [0, 0.14].forEach(d => { tone({ type: 'square', f0: 110, f1: 80, dur: 0.1, vol: 0.16 * o.vol, pan: o.pan, delay: d }); noise({ dur: 0.08, vol: 0.2 * o.vol, f0: 5000, f1: 1500, filter: 'bandpass', q: 3, pan: o.pan, delay: d }); }); }, // CHOBHAM ARMOUR: clank clank
        14: o => { tone({ type: 'buzz', f0: 2000, f1: 60, dur: 0.8, vol: 0.18 * o.vol, pan: o.pan, vib: 300, vibRate: 40 }); noise({ dur: 0.8, vol: 0.25 * o.vol, f0: 8000, f1: 200, filter: 'bandpass', q: 2, pan: o.pan }); } // EMP PULSE: zzzap
    };
    function opts(o = {}) { return { pan: o.pan || 0, vol: o.vol ?? 1, key: o.key }; }

    function play(name, o) {
        const fx = EFFECTS[name];
        const op = opts(o);
        if (!fx || !ready(op.key || name, op.key ? 0.04 : 0.03)) return;
        fx(op);
    }

    function pickup(typeId, o) {
        const fx = PICKUPS[typeId];
        const op = opts(o);
        if (!fx || !ready('pickup' + typeId, 0.05)) return;
        fx(op);
    }

    // A shot, voiced by the power-ups behind it. flags: { spray, big, fast, rapid, bomb, rico, dist, side }.
    function shot(f = {}, o) {
        const op = opts(o);
        if (!ready(op.key || 'shot', 0.04)) return;
        const v = op.vol, pan = op.pan;
        if (f.bomb) { tone({ type: 'triangle', f0: 220, f1: 70, dur: 0.18, vol: 0.3 * v, pan }); noise({ dur: 0.08, vol: 0.1 * v, f0: 1200, f1: 200, pan }); return; }
        const base = f.big ? 380 : (f.fast ? 1800 : 1100);
        const end = f.big ? 90 : (f.fast ? 500 : 180);
        const dur = (f.rapid ? 0.06 : 0.1) * (f.dist ? 1.6 : 1) * (f.big ? 1.6 : 1);
        tone({ type: f.big ? 'buzz' : 'square', f0: base, f1: end, dur, vol: (f.big ? 0.16 : 0.1) * v, pan, vib: f.rico ? 120 : 0, vibRate: 35 });
        if (f.spray) [-1, 1].forEach(s => tone({ type: 'pulse', f0: base * (1 + s * 0.12), f1: end, dur: dur * 0.9, vol: 0.05 * v * Math.min(3, f.spray), pan: pan + s * 0.3 }));
        if (f.side) [-0.7, 0.7].forEach(p => tone({ type: 'pulse', f0: base * 0.75, f1: end, dur: dur * 0.8, vol: 0.05 * v, pan: p }));
        if (f.big) noise({ dur: 0.1, vol: 0.12 * v, f0: 2500, f1: 300, pan });
    }

    /*
     * Music: a sparse, pulsing bass ostinato in the game (it quickens as the CPU
     * tanks fall) with an occasional high bleep, and a slower, quieter version
     * in the menus. Scheduled a little ahead on a timer.
     */
    const PLAY_BASS = [40, null, null, null, 40, null, null, null, 43, null, null, null, 40, null, null, null,
                       45, null, null, null, 43, null, null, null, 40, null, null, null, 38, null, 39, null];
    const PLAY_LEAD = [[76, 79, 81], [83, null, 81, 79], [76, null, 74, 76], [88, 86, 83]];
    const MENU_BASS = [40, null, null, null, null, null, null, null, 47, null, null, null, null, null, null, null,
                       45, null, null, null, null, null, null, null, 43, null, null, null, 42, null, null, null];
    const MENU_LEAD = [[64, 67, 71, 74], [62, 66, 69, 74], [64, 67, 71, 76], null];

    const music = {
        mode: 'off', intensity: 0, step: 0, nextTime: 0, timer: null,
        set(mode, intensity = 0) {
            this.intensity = Math.max(0, Math.min(1, intensity || 0));
            if (mode === this.mode) return;
            this.mode = mode; this.step = 0;
            if (mode === 'off') { this.stopAll(); return; }
            if (!this.timer) this.timer = setInterval(() => this.tick(), 50);
            if (ac) this.nextTime = ac.currentTime + 0.1;
        },
        stopAll() {
            if (!ac) return;
            // Fade out what is already scheduled by swapping in a fresh music bus.
            const old = musicBus;
            old.gain.setTargetAtTime(0, ac.currentTime, 0.02);
            setTimeout(() => old.disconnect(), 400);
            musicBus = ac.createGain(); musicBus.gain.value = MUSIC_VOL; musicBus.connect(master);
            this.nextTime = ac.currentTime + 0.1;
        },
        tick() {
            if (this.mode === 'off') { clearInterval(this.timer); this.timer = null; return; }
            if (!ac || ac.state !== 'running' || !audible()) { if (ac) this.nextTime = ac.currentTime + 0.1; return; }
            const playing = this.mode === 'play';
            const bpm = playing ? 104 + this.intensity * 56 : 76;
            const stepDur = 60 / bpm / 4;
            if (this.nextTime < ac.currentTime) this.nextTime = ac.currentTime + 0.05;
            while (this.nextTime < ac.currentTime + 0.2) {
                this.note(this.step, this.nextTime, playing, stepDur);
                this.step++;
                this.nextTime += stepDur;
            }
        },
        note(step, at, playing, stepDur) {
            const bass = playing ? PLAY_BASS : MENU_BASS;
            const m = bass[step % bass.length];
            if (m !== null) {
                tone({ type: 'triangle', f0: midi(m), dur: playing ? 0.16 : 0.5, vol: playing ? 0.55 : 0.4, bus: musicBus, at, attack: 0.005 });
                if (playing) tone({ type: 'pulse', f0: midi(m + 12), dur: 0.05, vol: 0.06, bus: musicBus, at });
            }
            // Every fourth bar (64 sixteenths) carries a short high phrase in the play loop; every other bar in the menu.
            const barLen = 16, bar = Math.floor(step / barLen), inBar = step % barLen;
            if (playing && bar % 4 === 3 && inBar >= 8 && inBar % 2 === 0) {
                const phrase = PLAY_LEAD[Math.floor(bar / 4) % PLAY_LEAD.length];
                const n = phrase[(inBar - 8) / 2];
                if (n !== null && n !== undefined) tone({ type: 'pulse', f0: midi(n), dur: stepDur * 1.6, vol: 0.07, bus: musicBus, at, vib: 4, vibRate: 6 });
            } else if (!playing && bar % 2 === 1 && inBar % 4 === 0) {
                const phrase = MENU_LEAD[Math.floor(bar / 2) % MENU_LEAD.length];
                const n = phrase?.[inBar / 4];
                if (n !== undefined && n !== null) tone({ type: 'triangle', f0: midi(n + 12), dur: stepDur * 3.5, vol: 0.12, bus: musicBus, at });
            }
            // A soft hi-hat tick on the off-beats while playing, for drive.
            if (playing && step % 4 === 2) noise({ dur: 0.025, vol: 0.05, f0: 9000, f1: 6000, filter: 'highpass', bus: musicBus, at });
        }
    };

    // Buttons and menu items blip when used, by mouse, touch, keys or controller (menu.js clicks the
    // selected item). Bubbling runs after the button's own handler, so turning sound on is heard.
    window.addEventListener('click', e => {
        if (e.target.closest?.('button, .nav-item')) play('menuSelect');
    });

    window.TankWarsSfx = {
        play,
        shot,
        pickup,
        music: (mode, intensity) => music.set(mode, intensity),
        refresh,
        effects: Object.keys(EFFECTS),
        pickups: Object.keys(PICKUPS).map(Number)
    };
})();
