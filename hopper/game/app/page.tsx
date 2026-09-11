'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  BookOpen,
  Settings,
  Maximize,
  Pause,
  ArrowLeft,
  Play,
  RotateCcw,
  ChevronRight,
  Gamepad2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { InputManager } from '@/src/game/input';
import { GameAudio } from '@/src/game/audio';
import {
  Engine,
  type GameSnapshot,
  type GameSettings,
} from '@/src/game/engine';
import {
  editionFromLocation,
  saveKey,
  type GameEngine,
} from '@/src/game/game-engine';
import { Engine3D } from '@/src/game3d/engine3d';

const edition = typeof location !== 'undefined' ? editionFromLocation() : '3d';

type Screen =
  | 'title'
  | 'select'
  | 'playing'
  | 'pause'
  | 'instructions'
  | 'settings'
  | 'missions'
  | 'complete';
const initial: GameSettings = {
  master: 0.8,
  music: 0.55,
  sfx: 0.65,
  shake: true,
  assist: false,
  cameraSensitivity: 0.5,
  invertY: false,
  landingGuide: true,
};
const missions = [
  'Earthbound Thunder',
  'The Iron Migration',
  'Beyond the Black Sun',
];
const episodeBlurbs = [
  'Fields · metropolis · mountains',
  'Foundries · storm docks · launchworks',
  'Red basin · blue drift · violet cathedral',
];
export default function Home() {
  'use no memo'; // The real-time canvas loop intentionally owns mutable control state.
  const canvas = useRef<HTMLCanvasElement>(null),
    root = useRef<HTMLElement>(null),
    engine = useRef<GameEngine | null>(null),
    input = useRef<InputManager | null>(null),
    audio = useRef<GameAudio | null>(null);
  const [screen, setScreen] = useState<Screen>('title'),
    screenRef = useRef<Screen>('title'),
    returnTo = useRef<Screen>('title');
  const [ready, setReady] = useState(false),
    [load, setLoad] = useState(0),
    [error, setError] = useState(''),
    [connected, setConnected] = useState(false),
    [notice, setNotice] = useState(''),
    [settings, setSettings] = useState(initial),
    settingsRef = useRef(initial),
    [focus, setFocus] = useState(0),
    focusRef = useRef(0);
  // Sound reads off when the player muted it or when the browser is still
  // refusing music: either way the button is the thing to press.
  const [soundOff, setSoundOff] = useState(false);
  /** Shown while a district's assets load, before play or across a seam. */
  const [preparing, setPreparing] = useState<{
    label: string;
    progress: number;
  } | null>(null);
  const [hud, setHud] = useState<GameSnapshot | null>(null),
    [saved, setSaved] = useState(false),
    [unlocked, setUnlocked] = useState(0);
  function change(next: Screen) {
    if (next === 'title' || next === 'select') {
      try {
        setSaved(!!localStorage.getItem(saveKey(edition, 'save')));
        setUnlocked(
          Math.min(
            2,
            Number(localStorage.getItem(saveKey(edition, 'unlocked')) || 0),
          ),
        );
      } catch {}
    }
    screenRef.current = next;
    setScreen(next);
    focusRef.current = 0;
    setFocus(0);
    input.current?.resetEdges();
    engine.current?.setPaused(next !== 'playing');
    // The title and play-select screens own the menu theme. Pausing keeps
    // whatever is playing and simply lowers it, so the level track resumes
    // where it left off.
    if (next === 'title' || next === 'select') audio.current?.setScene('menu');
    else if (next === 'playing') audio.current?.setScene('gameplay');
    audio.current?.setDucked(
      next !== 'playing' && next !== 'title' && next !== 'select',
    );
  }
  function fullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void root.current?.requestFullscreen?.().catch(() => {
      setNotice(
        'Fullscreen is available with the ⛶ button or your browser’s fullscreen shortcut.',
      );
    });
  }
  /**
   * The title screen carries one action. Taking it is the gesture that starts
   * the music where autoplay was refused and asks for fullscreen, and it opens
   * the play-select screen rather than dropping straight into an episode.
   */
  function enterSelect() {
    void audio.current?.unlock();
    if (!document.fullscreenElement)
      void root.current
        ?.requestFullscreen?.()
        .catch(() => setNotice('Press ⛶ for fullscreen.'));
    change('select');
    setNotice('');
  }
  /**
   * Enter play. The district's paintings are loaded first, behind a progress
   * bar, so the world is never built half-textured and filled in afterwards.
   * Idle prefetching usually means the bar is gone before it is read.
   */
  function begin(mission = 0, resume = false) {
    if (!ready || preparing) return;
    audio.current?.setLevelTrack(mission);
    audio.current?.setScene('gameplay');
    audio.current?.setDucked(false);
    void audio.current?.unlock();
    if (!document.fullscreenElement)
      void root.current
        ?.requestFullscreen?.()
        .catch(() => setNotice('Press ⛶ for fullscreen.'));
    setNotice('');
    const engineRef = engine.current;
    if (!engineRef?.prepare) {
      engineRef?.start(mission, resume);
      change('playing');
      return;
    }
    setPreparing({ label: missions[mission] || '', progress: 0 });
    void engineRef
      .prepare(mission, resume, (progress) =>
        setPreparing((p) => (p ? { ...p, progress } : p)),
      )
      .catch(() => {})
      .then(() => {
        setPreparing(null);
        engineRef.start(mission, resume);
        change('playing');
      });
  }
  /**
   * The button does what its icon promises. Deriving that from the audio at
   * click time would race the pointerdown unlock, which has already started
   * the music by then and would turn a "sound on" press into a mute.
   */
  function toggleSound() {
    const a = audio.current;
    if (!a) return;
    const turningOn = soundOff;
    a.setMuted(!turningOn);
    if (turningOn) {
      void a.unlock();
      a.retryMusic();
    }
    setSoundOff(!turningOn);
    try {
      localStorage.setItem('hopper.muted', turningOn ? '' : '1');
    } catch {}
  }
  function open(next: Screen) {
    returnTo.current =
      screenRef.current === 'playing' ? 'pause' : screenRef.current;
    change(next);
  }
  function back() {
    change(returnTo.current === 'playing' ? 'pause' : returnTo.current);
  }
  function setting(key: keyof GameSettings, value: number | boolean) {
    const s = { ...settingsRef.current, [key]: value };
    settingsRef.current = s;
    setSettings(s);
    engine.current?.configure(s);
    audio.current?.setVolumes(s.master, s.music, s.sfx);
    try {
      localStorage.setItem('hopper.settings', JSON.stringify(s));
    } catch {}
  }
  const actionsRef = useRef({
    begin,
    change,
    open,
    back,
    fullscreen,
    setting,
    enterSelect,
    toggleSound,
  });
  useLayoutEffect(() => {
    actionsRef.current = {
      begin,
      change,
      open,
      back,
      fullscreen,
      setting,
      enterSelect,
      toggleSound,
    };
  });
  useEffect(() => {
    let alive = true,
      raf = 0,
      previous = performance.now(),
      uiClock = 0;
    // The title theme carries on into the first episode; the later episodes
    // have their own recordings.
    const a = new GameAudio('./audio/theme.mp3', [
        './audio/theme.mp3',
        './audio/grass-march.mp3',
        './audio/dark-moon.mp3',
      ]),
      i = new InputManager(canvas.current!);
    audio.current = a;
    // Restore a saved mute before the theme is asked to play, so a muted
    // player never hears the opening bar.
    let startMuted = false;
    try {
      startMuted = !!localStorage.getItem('hopper.muted');
    } catch {}
    if (startMuted) a.setMuted(true);
    queueMicrotask(() => {
      if (alive) setSoundOff(startMuted);
    });
    a.setScene('menu');
    input.current = i;
    let s = initial;
    try {
      s = {
        ...initial,
        ...JSON.parse(localStorage.getItem('hopper.settings') || '{}'),
      };
      queueMicrotask(() => {
        if (alive) {
          setSaved(!!localStorage.getItem(saveKey(edition, 'save')));
          setUnlocked(
            Number(localStorage.getItem(saveKey(edition, 'unlocked')) || 0),
          );
        }
      });
    } catch {}
    settingsRef.current = s;
    queueMicrotask(() => {
      if (alive) setSettings(s);
    });
    a.setVolumes(s.master, s.music, s.sfx);
    const onSnapshot = (snapshot: GameSnapshot) => {
      if (alive) {
        setHud(snapshot);
        if (snapshot.completed) {
          setUnlocked((v) => Math.max(v, Math.min(2, snapshot.mission + 1)));
          actionsRef.current.change('complete');
        }
      }
    };
    const e: GameEngine =
      edition === '3d'
        ? new Engine3D(canvas.current!, a, onSnapshot)
        : new Engine(canvas.current!, a, onSnapshot);
    engine.current = e;
    e.rumble = (strength, duration) => i.vibrate(strength, duration);
    e.configure(s);
    void e
      .load((v) => alive && setLoad(v))
      .then(() => {
        if (alive) setReady(true);
      })
      .catch((err) => alive && setError(String(err)));
    const modelContext = (
      document as unknown as {
        modelContext?: {
          registerTool: (tool: unknown, options: unknown) => Promise<void>;
        };
      }
    ).modelContext;
    const lifecycle = new AbortController();
    const register = (
      name: string,
      description: string,
      execute: (input: Record<string, unknown>) => unknown,
      schema: object = {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      readOnly = false,
    ) => {
      try {
        void Promise.resolve(
          modelContext?.registerTool(
            {
              name,
              description,
              inputSchema: schema,
              annotations: { readOnlyHint: readOnly },
              execute: (v: Record<string, unknown>) => {
                if (!v || typeof v !== 'object')
                  throw new Error('Expected an object');
                return execute(v);
              },
            },
            { signal: lifecycle.signal },
          ),
        ).catch(() => {});
      } catch {}
    };
    register(
      'get_game_status',
      'Read the current episode, armor, checkpoint and menu.',
      () => ({
        screen: screenRef.current,
        ...e.snapshot(),
        player: { ...e.player },
      }),
      undefined,
      true,
    );
    register(
      'pause_game',
      'Pause the adventure and open the pause menu.',
      () => {
        actionsRef.current.change('pause');
        return { screen: 'pause' };
      },
    );
    register(
      'open_game_instructions',
      'Open the controller diagram and gameplay instructions.',
      () => {
        actionsRef.current.open('instructions');
        return { screen: 'instructions' };
      },
    );
    if (
      ['localhost', '127.0.0.1'].includes(location.hostname) &&
      e instanceof Engine
    ) {
      const e2d = e;
      register(
        'qa_preview_scene',
        'Local development only. Preview a campaign environment, boss, or animation pose with the real renderer.',
        (v) => {
          const mission = Number(v.mission),
            area = Number(v.area);
          if (
            !Number.isInteger(mission) ||
            mission < 0 ||
            mission > 2 ||
            !Number.isInteger(area) ||
            area < 0 ||
            area > 2
          )
            throw new Error('Mission and area must be integers 0–2');
          actionsRef.current.change('playing');
          e2d.preview(
            mission,
            area,
            typeof v.pose === 'string' ? v.pose : 'idle',
          );
          return e2d.snapshot();
        },
        {
          type: 'object',
          properties: {
            mission: { type: 'integer', minimum: 0, maximum: 2 },
            area: { type: 'integer', minimum: 0, maximum: 2 },
            pose: {
              type: 'string',
              enum: [
                'idle',
                'run',
                'rise',
                'fall',
                'kick',
                'laser',
                'boss',
                'inverted',
                'explosion',
                'parry',
                'shield',
              ],
            },
          },
          required: ['mission', 'area'],
          additionalProperties: false,
        },
      );
      register(
        'qa_step_game',
        'Local development only. Advance real fixed-step movement and combat for a bounded number of frames.',
        (v) => {
          const frames = Number(v.frames);
          if (!Number.isInteger(frames) || frames < 1 || frames > 600)
            throw new Error('Frames must be 1–600');
          e2d.auditStep(frames, {
            moveX: Number(v.moveX) || 0,
            jumpPressed: !!v.jump,
            jumpHeld: !!v.jump,
            kickPressed: !!v.kick,
            shootHeld: !!v.shoot,
            blockHeld: !!v.block,
            lookX: 0,
            lookY: 0,
          });
          return { ...e2d.snapshot(), player: { ...e2d.player } };
        },
        {
          type: 'object',
          properties: {
            frames: { type: 'integer', minimum: 1, maximum: 600 },
            moveX: { type: 'number', minimum: -1, maximum: 1 },
            jump: { type: 'boolean' },
            kick: { type: 'boolean' },
            shoot: { type: 'boolean' },
            block: { type: 'boolean' },
          },
          required: ['frames'],
          additionalProperties: false,
        },
      );
    }
    const unlock = () => void a.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    const pause = () => {
      if (screenRef.current === 'playing') actionsRef.current.change('pause');
    };
    // A hidden or unfocused tab keeps no music or effects playing.
    const background = () =>
      a.setBackground(document.hidden || !document.hasFocus());
    const leave = () => {
      pause();
      background();
    };
    window.addEventListener('blur', leave);
    window.addEventListener('focus', background);
    document.addEventListener('visibilitychange', leave);
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      const f = i.update(dt);
      const action = actionsRef.current;
      uiClock += dt;
      if (uiClock > 0.2) {
        setConnected(f.connected);
        setSoundOff(a.isMuted() || a.musicBlocked());
        uiClock = 0;
      }
      if (f.disconnected && screenRef.current === 'playing') {
        setNotice('Controller disconnected · reconnect or use the keyboard.');
        action.change('pause');
      }
      if (f.anyPressed) a.retryMusic();
      const mode = screenRef.current;
      if (mode === 'playing') {
        if (f.pausePressed) action.change('pause');
        else if (f.instructionsPressed) action.open('instructions');
      } else if (
        mode === 'title' &&
        (f.confirmPressed ||
          f.jumpPressed ||
          (f.anyPressed && f.active === 'gamepad'))
      ) {
        action.enterSelect();
      } else {
        const list = Array.from(
          root.current?.querySelectorAll<HTMLElement>('[data-nav]') || [],
        ).filter(
          (el) => el.offsetParent !== null && !el.hasAttribute('disabled'),
        );
        if (f.menuY || (mode !== 'settings' && f.menuX)) {
          const current = list.indexOf(document.activeElement as HTMLElement);
          focusRef.current =
            ((current >= 0 ? current : focusRef.current) +
              (f.menuY || f.menuX) +
              list.length) %
            Math.max(1, list.length);
          setFocus(focusRef.current);
          list[focusRef.current]?.focus();
        }
        if (mode === 'settings' && f.menuX) {
          const keys: (keyof GameSettings)[] = [
            'master',
            'music',
            'sfx',
            'shake',
            'assist',
            ...(edition === '3d'
              ? (['cameraSensitivity', 'invertY', 'landingGuide'] as const)
              : []),
          ];
          const k = keys[focusRef.current];
          if (k) {
            const v = settingsRef.current[k];
            action.setting(
              k,
              typeof v === 'boolean'
                ? !v
                : Math.max(0, Math.min(1, v + f.menuX * 0.1)),
            );
          }
        }
        if (f.confirmPressed && f.active === 'gamepad')
          list[focusRef.current]?.click();
        if (f.backPressed || f.pausePressed) {
          if (mode === 'pause') action.change('playing');
          else if (mode === 'complete' || mode === 'select')
            action.change('title');
          else if (mode !== 'title') action.back();
        }
      }
      e.tick(
        dt,
        mode === 'playing' && screenRef.current === 'playing' ? f : undefined,
      );
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      lifecycle.abort();
      alive = false;
      cancelAnimationFrame(raf);
      e.dispose();
      i.dispose();
      a.dispose();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('blur', leave);
      window.removeEventListener('focus', background);
      document.removeEventListener('visibilitychange', leave);
    };
  }, []);
  useEffect(() => {
    if (screen === 'playing' || screen === 'title') return;
    const id = requestAnimationFrame(() =>
      root.current
        ?.querySelector<HTMLElement>('[data-nav]')
        ?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(id);
  }, [screen]);
  useLayoutEffect(() => {
    focusRef.current = focus;
  }, [focus]);
  /**
   * Idle prefetching. The title screen warms episode one (or the saved one);
   * moving the selection on play-select points it at that episode instead, so
   * the assets arriving are the ones about to be needed.
   */
  const [aimed, setAimed] = useState(0);
  useEffect(() => {
    if (!ready || screen === 'playing' || preparing) return;
    const id = setTimeout(() => engine.current?.prefetch?.(aimed), 400);
    return () => clearTimeout(id);
  }, [ready, screen, aimed, preparing]);

  // Continue takes the first focus slot when there is a save, so every later
  // control on the play-select screen shifts down by one.
  const episodeBase = saved ? 1 : 0;
  const nav = (index: number, aim?: number) => ({
    'data-nav': true,
    'data-selected': focus === index,
    onFocus: () => {
      setFocus(index);
      if (aim !== undefined) setAimed(aim);
    },
  });
  return (
    <main
      ref={root}
      className={`game-shell ${screen === 'title' || screen === 'select' ? 'at-title' : ''}`}
    >
      <canvas
        ref={canvas}
        aria-label={
          edition === '3d'
            ? 'Hopper the Grasshopper 3D world. A jumps and hovers, X spin kicks, Y dives, B guards, RT fires, LT locks on.'
            : 'Hopper the Grasshopper game world. Use A or Space to jump, X or J to kick behind, B or L to guard the front, RT or K to fire.'
        }
        tabIndex={-1}
      />
      {screen === 'title' && (
        <div className="title-screen">
          <div className="poster" />
          <div className="poster-shade" />
          <div className="edition">
            <span className="tiny-star">✦</span> A MECHA ADVENTURE{' '}
            <span className="edition-line" /> ORIGINAL SERIES · 01
          </div>
          <div className="title-content">
            <Image
              width={1672}
              height={941}
              unoptimized
              className="game-logo"
              src="./assets/hopper-logo.png"
              alt="Hopper the Grasshopper"
            />
            <p className="title-tagline">
              A small boy. A giant leap. A world to save.
            </p>
            <Button
              {...nav(0)}
              className="start-button"
              disabled={!ready}
              onClick={enterSelect}
            >
              {ready ? (
                <>
                  <span className="start-diamond">◆</span> PRESS START{' '}
                  <span className="start-diamond">◆</span>
                </>
              ) : error ? (
                'ASSET LOAD FAILED'
              ) : (
                `PREPARING ADVENTURE · ${Math.round(load * 100)}%`
              )}
            </Button>
            <p className="start-hint">
              Press any controller button <span> / </span> ENTER
            </p>
          </div>
          <div className="title-footer">
            <p>THREE WORLDS. ONE EXTRAORDINARY FRIEND.</p>
            <span>
              <Gamepad2 size={17} />
              {connected ? 'CONTROLLER CONNECTED' : 'XBOX CONTROLLER READY'}
            </span>
          </div>
        </div>
      )}
      {screen === 'select' && (
        <div className="title-screen select-screen">
          <div className="poster" />
          <div className="poster-shade select-shade" />
          <div className="edition">
            <span className="tiny-star">✦</span> A MECHA ADVENTURE{' '}
            <span className="edition-line" />{' '}
            {edition === '3d' ? '3D EDITION' : 'ORIGINAL SERIES · 01'}
          </div>
          <div className="select-layout">
            <div className="select-play">
              <Image
                width={1672}
                height={941}
                unoptimized
                className="select-logo"
                src="./assets/hopper-logo.png"
                alt="Hopper the Grasshopper"
              />
              <h2 className="select-heading">Choose your horizon.</h2>
              {saved && (
                <Button
                  {...nav(0)}
                  className="continue-button"
                  onClick={() => begin(0, true)}
                >
                  <Play />
                  <div>
                    <strong>Continue</strong>
                    <small>Pick up from your last checkpoint</small>
                  </div>
                  <ChevronRight />
                </Button>
              )}
              <div className="episode-list">
                {missions.map((name, n) => (
                  <Button
                    {...nav(episodeBase + n, n)}
                    key={name}
                    disabled={n > unlocked}
                    onClick={() => begin(n)}
                    onPointerEnter={() => setAimed(n)}
                  >
                    <span>0{n + 1}</span>
                    <div>
                      <strong>{name}</strong>
                      <small>
                        {n > unlocked
                          ? 'Complete the previous episode'
                          : episodeBlurbs[n]}
                      </small>
                    </div>
                    <ChevronRight />
                  </Button>
                ))}
              </div>
            </div>
            <div className="select-controls">
              <span className="select-controls-label">
                <Gamepad2 size={15} />
                {connected ? 'CONTROLLER CONNECTED' : 'XBOX CONTROLLER READY'}
              </span>
              <Image
                width={1440}
                height={580}
                unoptimized
                className="select-diagram"
                src={
                  edition === '3d'
                    ? './assets/controller-3d.svg'
                    : './assets/controller.svg'
                }
                alt={
                  edition === '3d'
                    ? 'Xbox controller: left stick move, right stick camera, A jump and glide, X spin kick, Y dive stomp, B guard, RT eye lasers, LT lock-on, RB sprint, LB dash, right-stick click Horizon View, Menu pause, View instructions.'
                    : 'Xbox controller: left stick or D-pad move, right stick look around, A jump, X rear spin kick and parry, B forward guard, RT shoot, Menu pause, View instructions.'
                }
              />
              {edition === '3d' ? (
                <ul className="control-key">
                  <li>
                    <b className="pad a">A</b> Jump · hover · glide
                  </li>
                  <li>
                    <b className="pad x">X</b> Spin kick
                  </li>
                  <li>
                    <b className="pad y">Y</b> Dive stomp
                  </li>
                  <li>
                    <b className="pad b">B</b> Guard
                  </li>
                  <li>
                    <b className="trigger">RT</b> Eye lasers
                  </li>
                  <li>
                    <b className="trigger">LT</b> Lock-on
                  </li>
                  <li>
                    <b className="trigger">LS</b> Move
                  </li>
                  <li>
                    <b className="trigger">RS</b> Camera
                  </li>
                </ul>
              ) : (
                <ul className="control-key">
                  <li>
                    <b className="pad a">A</b> Jump
                  </li>
                  <li>
                    <b className="pad x">X</b> Rear kick · parry
                  </li>
                  <li>
                    <b className="pad b">B</b> Guard front
                  </li>
                  <li>
                    <b className="trigger">RT</b> Eye lasers
                  </li>
                  <li>
                    <b className="trigger">LS</b> Move
                  </li>
                  <li>
                    <b className="trigger">RS</b> Look around
                  </li>
                </ul>
              )}
              <p className="control-key-keyboard">
                {edition === '3d' ? (
                  <>
                    KEYBOARD <span>WASD</span> move <span>SPACE</span> jump{' '}
                    <span>J</span> kick <span>F</span> dive <span>K</span>{' '}
                    lasers <span>L</span> guard <span>Q</span> lock-on{' '}
                    <span>SHIFT</span> sprint <span>E</span> dash
                  </>
                ) : (
                  <>
                    KEYBOARD <span>← →</span> move <span>SPACE</span> jump{' '}
                    <span>J</span> kick <span>K</span> lasers <span>L</span>{' '}
                    guard
                  </>
                )}
              </p>
              <Button
                {...nav(episodeBase + 3)}
                className="quiet-button"
                onClick={() => open('instructions')}
              >
                <BookOpen /> Full controls
              </Button>
              {/* A full navigation (not next/link) so the module-level
                  `edition` re-reads location.search on a fresh load. */}
              {edition === '3d' ? (
                // oxlint-disable-next-line no-html-link-for-pages
                <a
                  {...nav(episodeBase + 4)}
                  className="quiet-button edition-link"
                  href="?render=2d"
                >
                  Play the original 2D edition
                </a>
              ) : (
                // oxlint-disable-next-line no-html-link-for-pages
                <a
                  {...nav(episodeBase + 4)}
                  className="quiet-button edition-link"
                  href="?render=3d"
                >
                  Play the 3D edition
                </a>
              )}
            </div>
          </div>
          <div className="corner-controls">
            <Button
              {...nav(episodeBase + 5)}
              size="icon"
              onClick={() => change('title')}
              aria-label="Back to title"
            >
              <ArrowLeft />
            </Button>
            <Button
              {...nav(episodeBase + 6)}
              size="icon"
              className={soundOff ? 'sound-off' : ''}
              onClick={toggleSound}
              aria-label={soundOff ? 'Turn sound on' : 'Turn sound off'}
              aria-pressed={soundOff}
            >
              {soundOff ? <VolumeX /> : <Volume2 />}
            </Button>
            <Button
              {...nav(episodeBase + 7)}
              size="icon"
              onClick={() => open('settings')}
              aria-label="Settings"
            >
              <Settings />
            </Button>
            <Button
              {...nav(episodeBase + 8)}
              size="icon"
              onClick={fullscreen}
              aria-label="Fullscreen"
            >
              <Maximize />
            </Button>
          </div>
        </div>
      )}
      {screen !== 'title' && screen !== 'select' && hud && (
        <>
          <div className="hud" inert={screen !== 'playing'}>
            <div className="pilot-badge">
              <Image
                src="./assets/hopper-icon-192.png"
                alt=""
                width={192}
                height={192}
                unoptimized
              />
              <div>
                <span className="hud-label">HOPPER</span>
                <div
                  className="health"
                  aria-label={`Armor ${hud.hp} of ${hud.maxHp}`}
                >
                  {Array.from({ length: hud.maxHp }, (_, n) => (
                    <i className={n < hud.hp ? 'filled' : ''} key={n} />
                  ))}
                </div>
                <div className="heat">
                  <i style={{ width: `${hud.heat * 100}%` }} />
                </div>
                <div
                  className="shield-meter"
                  aria-label={`Shield ${Math.round(hud.shield * 100)} percent`}
                >
                  <i style={{ width: `${hud.shield * 100}%` }} />
                </div>
                <span className="heat-label">
                  {hud.shieldBroken
                    ? 'SHIELD RECHARGING'
                    : hud.overheated
                      ? 'EYES COOLING'
                      : 'EYE REACTOR'}
                </span>
              </div>
            </div>
            <div className="hud-right">
              <span className="signal-count">
                ✧ {hud.signals} <small>/ 9</small>
              </span>
              <Button
                size="icon"
                className={soundOff ? 'sound-off' : ''}
                onClick={toggleSound}
                aria-label={soundOff ? 'Turn sound on' : 'Turn sound off'}
                aria-pressed={soundOff}
              >
                {soundOff ? <VolumeX /> : <Volume2 />}
              </Button>
              <Button size="icon" onClick={fullscreen} aria-label="Fullscreen">
                <Maximize />
              </Button>
              <Button
                size="icon"
                onClick={() => change('pause')}
                aria-label="Pause game"
              >
                <Pause />
              </Button>
            </div>
          </div>
          {hud.height !== undefined && hud.height > 4 && (
            <div className="height-ticks">{Math.round(hud.height)} m</div>
          )}
          {hud.standIns && (
            <div
              className="stand-in-tag"
              title={`Placeholder art on screen: ${hud.standIns}`}
            >
              STAND-IN ART · {hud.standIns}
            </div>
          )}
          {/* Everything informational sits low, in the corners or along the
              bottom edge: the top middle of the frame is the way ahead, and
              stays clear. */}
          <div className="game-bottom">
            <div className="game-bottom-status">
              <div className="location">
                <span>
                  EPISODE {String(hud.mission + 1).padStart(2, '0')} <b> / </b>{' '}
                  {hud.area.toUpperCase()}
                </span>
                <p>{hud.chapter}</p>
                <div className="route-progress">
                  <i style={{ width: `${hud.progress * 100}%` }} />
                </div>
                {hud.landmark && (
                  <div className="compass">
                    ▲ {hud.landmark.name} · {Math.round(hud.landmark.distance)}{' '}
                    m
                  </div>
                )}
              </div>
              <div className="status-right">
                {hud.stronghold && (
                  <div className="stronghold-bar">
                    <span className="stronghold-name">
                      {hud.stronghold.name}
                    </span>
                    <span className="stronghold-host">
                      {Array.from({ length: hud.stronghold.total }, (_, i) => (
                        <i
                          key={i}
                          className={
                            i <
                            hud.stronghold!.total - hud.stronghold!.remaining
                              ? 'down'
                              : ''
                          }
                        />
                      ))}
                    </span>
                    <span className="stronghold-count">
                      {hud.stronghold.remaining} left
                    </span>
                  </div>
                )}
                {hud.target && !hud.boss && (
                  <div
                    className={`target-hud ${hud.target.locked ? 'locked' : ''}`}
                  >
                    <span>
                      {hud.target.name}
                      {hud.target.locked && <small>LOCKED</small>}
                    </span>
                    <div>
                      <i style={{ width: `${hud.target.health * 100}%` }} />
                    </div>
                  </div>
                )}
                <span className="gravity-note">
                  {hud.gravity < 0
                    ? '↑ INVERTED GRAVITY'
                    : hud.gravity === 1
                      ? ''
                      : `${hud.gravity.toFixed(2)}g GRAVITY`}
                </span>
              </div>
            </div>
            <div className="game-bottom-row">
              {edition === '3d' ? (
                <span>
                  <b className="pad a">A</b> JUMP <b className="pad x">X</b>{' '}
                  KICK <b className="pad y">Y</b> DIVE{' '}
                  <b className="trigger">RT</b> LASERS{' '}
                  <b className="pad b">B</b> GUARD
                </span>
              ) : (
                <span>
                  <b className="pad a">A</b> JUMP <b className="pad x">X</b>{' '}
                  KICK BEHIND <b className="trigger">RT</b> EYE LASERS{' '}
                  <b className="pad b">B</b> GUARD FRONT
                </span>
              )}
            </div>
            {hud.hint && <div className="game-bottom-hint">{hud.hint}</div>}
          </div>
          {hud.transitionImage &&
            (hud.transitionFade ?? 0) > 0 && (
              // A data URL of the frame just left, held for a second: an
              // optimising image loader has nothing to do here.
              // oxlint-disable-next-line no-img-element
              <img
                className="district-dissolve"
                src={hud.transitionImage}
                alt=""
                aria-hidden="true"
                style={{ opacity: hud.transitionFade }}
              />
            )}
          {hud.banner && screen === 'playing' && (
            <div className="area-banner">
              <span>{hud.bannerSmall}</span>
              <h2>{hud.banner}</h2>
            </div>
          )}
          {hud.boss && (
            <div className="boss-hud">
              <span>
                {hud.boss.name} <small>PHASE {hud.boss.phase}</small>
              </span>
              <div>
                <i style={{ width: `${hud.boss.health * 100}%` }} />
              </div>
              <p>{hud.boss.tell}</p>
            </div>
          )}
        </>
      )}
      {screen !== 'title' && screen !== 'select' && screen !== 'playing' && (
        <div className="menu-scrim">
          <dialog
            open
            onKeyDown={(event) => {
              if (event.key !== 'Tab') return;
              const items = Array.from(
                event.currentTarget.querySelectorAll<HTMLElement>(
                  'button:not(:disabled),input:not(:disabled),[role="switch"],a[href]',
                ),
              ).filter((el) => el.offsetParent !== null);
              const first = items[0],
                last = items[items.length - 1];
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
              }
            }}
            className={`menu-panel ${screen === 'instructions' ? 'instructions-panel' : ''}`}
            aria-modal="true"
            aria-label={screen}
          >
            <div className="menu-eyebrow">
              HOPPER THE GRASSHOPPER <span>✦</span>
            </div>
            {screen === 'pause' && (
              <>
                <h1>Take a breath.</h1>
                <p className="menu-description">The stars can wait a moment.</p>
                <div className="menu-list">
                  <Button {...nav(0)} onClick={() => change('playing')}>
                    <Play /> Resume adventure
                  </Button>
                  <Button
                    {...nav(1)}
                    onClick={() => {
                      engine.current?.respawn();
                      change('playing');
                    }}
                  >
                    <RotateCcw /> Restart from checkpoint
                  </Button>
                  <Button {...nav(2)} onClick={() => open('instructions')}>
                    <BookOpen /> How to play
                  </Button>
                  <Button {...nav(3)} onClick={() => open('settings')}>
                    <Settings /> Settings
                  </Button>
                  <Button {...nav(4)} onClick={() => open('missions')}>
                    <ChevronRight /> Episodes
                  </Button>
                  <Button {...nav(5)} onClick={() => change('title')}>
                    <ArrowLeft /> Title screen
                  </Button>
                </div>
                <p className="menu-footnote">
                  Progress saves automatically at every checkpoint.
                </p>
              </>
            )}
            {screen === 'instructions' && (
              <>
                <h1>Built to leap.</h1>
                <p className="menu-description">
                  Keep moving. Fight in every direction.
                </p>
                <div className="instructions-grid">
                  <Image
                    width={1440}
                    height={580}
                    unoptimized
                    src={
                      edition === '3d'
                        ? './assets/controller-3d.svg'
                        : './assets/controller.svg'
                    }
                    alt={
                      edition === '3d'
                        ? 'Xbox controller: left stick move, right stick camera, A jump and glide, X spin kick, Y dive stomp, B guard, RT eye lasers, LT lock-on, RB sprint, LB dash, right-stick click Horizon View, Menu pause, View instructions.'
                        : 'Xbox controller: left stick or D-pad move, right stick look around, A jump, X rear spin kick and parry, B forward guard, RT shoot, Menu pause, View instructions.'
                    }
                  />
                  {edition === '3d' ? (
                    <div className="control-notes">
                      <p>
                        <b className="pad a">A</b>
                        <strong>Jump</strong> Tap to jump. Hold A in the air and
                        the wings beat: Hopper hovers in place for a breath,
                        then glides down while you keep holding. Release to
                        drop. Jump at a wall to kick off it; the front legs haul
                        up over a ledge on their own. Hopper always faces the
                        way you are going: pulling back backpedals, sideways
                        strafes.
                      </p>
                      <p>
                        <b className="pad x">X</b>
                        <strong>Spin kick</strong> The hind legs sweep all the
                        way round, on the ground or in the air. Timed as a shot
                        arrives, it parries and sends the shot back.
                      </p>
                      <p>
                        <b className="pad y">Y</b>
                        <strong>Dive stomp · charge</strong> In the air, dive
                        straight down and stomp on landing; a shockwave knocks
                        shadows into the air. On the ground, tap for a quick hop
                        back, or hold to crouch and charge a super leap.
                      </p>
                      <p>
                        <b className="pad b">B</b>
                        <strong>Guard</strong> A shield in front of Hopper. In
                        the air it brakes.
                      </p>
                      <p>
                        <b className="trigger">RT</b>
                        <strong>Eye lasers</strong> They lock onto the nearest
                        shadow in view; heat builds while held and cools when
                        released.
                      </p>
                      <p>
                        <b className="trigger">LT</b>
                        <strong>Lock-on</strong> Hold to aim over Hopper&apos;s
                        shoulder with the shadow in the crosshair; tap to
                        switch.
                      </p>
                      <p>
                        <b className="trigger">RB</b>
                        <strong>Sprint</strong> Hold to run flat out; the speed
                        carries into a jump.
                      </p>
                      <p>
                        <b className="trigger">LB</b>
                        <strong>Dash</strong> A fast burst the way the stick
                        points, on the ground or in the air. Held with the stick
                        centred, it fires the moment you move.
                      </p>
                      <p>
                        <strong>The view faces the way forward</strong> Turn it
                        up to 45° with the right stick; click the stick for
                        Horizon View. Hopper can turn round and run toward the
                        camera whenever he needs to.
                      </p>
                      <p>
                        <strong>Falling never hurts</strong> Every drop has a
                        way back up; only shadows can hurt Hopper. Land on a
                        flyer to bounce off it.
                      </p>
                    </div>
                  ) : (
                    <div className="control-notes">
                      <p>
                        <b className="pad a">A</b>
                        <strong>Jump</strong> Hold to soar; release for a
                        precise landing. Your back legs strike behind you at
                        takeoff. Land on shadows to crush them. Pull back in the
                        air to brake without turning; facing changes after
                        landing.
                      </p>
                      <p>
                        <b className="pad x">X</b>
                        <strong>Rear spin kick · parry</strong> Sweep your
                        powerful hind legs behind you and overhead. It breaks
                        armor, and timed as a blow lands from behind or straight
                        down it parries: the shadow staggers wide open and a
                        parried shot flies back at its shooter. It reaches
                        nothing in front of you.
                      </p>
                      <p>
                        <b className="trigger">RT</b>
                        <strong>Eye lasers</strong> Lock onto the nearest shadow
                        ahead, including one on a shelf below you. Brief bursts
                        keep the reactor cool. Turn with the stick to choose a
                        side.
                      </p>
                      <p>
                        <b className="pad b">B</b>
                        <strong>Forward guard</strong> Hold to parry everything
                        arriving from the front, turning shots back at their
                        shooter. It leaves your back open, does no damage of its
                        own, spends energy while held and when struck, and
                        breaks briefly if drained. Release to recharge.
                        Keyboard: L.
                      </p>
                      <p>
                        <strong>Take a hit</strong> Shadows knock Hopper back a
                        real distance, so fight with your back away from the
                        edge. Fall just short of a ledge while reaching for it
                        and Hopper hauls up onto the lip. Jump the instant you
                        touch a wall to kick off it.
                      </p>
                      <p>
                        <strong>Look around</strong> Right stick pushes the
                        camera ahead, behind, up or down and widens the view;
                        let go and it settles back.
                      </p>
                      <p>
                        <strong>Move & explore</strong> Left stick / D-pad.
                        Follow the ivory landing edges. Seek nine ✧ signals in
                        each episode. Orange seams warn of hazards.
                      </p>
                    </div>
                  )}
                </div>
                <div className="keyboard-line">
                  {edition === '3d' ? (
                    <>
                      KEYBOARD <span>WASD</span> move <span>SPACE</span> jump{' '}
                      <span>J</span> kick <span>F</span> dive <span>K</span>{' '}
                      lasers <span>L</span> guard <span>Q</span> lock-on{' '}
                      <span>SHIFT</span> sprint <span>E</span> dash{' '}
                      <span>TAB</span> horizon view · click the game to turn the
                      view with the mouse
                    </>
                  ) : (
                    <>
                      KEYBOARD <span>← → / A D</span> move <span>SPACE</span>{' '}
                      jump <span>J</span> rear kick <span>K</span> lasers{' '}
                      <span>L</span> forward guard <span>ESC</span> pause
                    </>
                  )}
                </div>
                <p className="menu-footnote">
                  Menu: D-pad / stick to select · A to confirm · B to go back.
                  Losing a controller pauses the game.
                </p>
                <Button {...nav(0)} onClick={back}>
                  <ArrowLeft /> Back
                </Button>
              </>
            )}
            {screen === 'settings' && (
              <>
                <h1>Make it yours.</h1>
                <p className="menu-description">
                  A comfortable cockpit makes a better pilot.
                </p>
                <div className="setting-list">
                  {(['master', 'music', 'sfx'] as const).map((key, n) => (
                    <div className="setting-row" key={key}>
                      <label htmlFor={key}>
                        {key === 'sfx'
                          ? 'Sound effects'
                          : key === 'music'
                            ? 'Music'
                            : 'Master volume'}
                      </label>
                      <input
                        {...nav(n)}
                        id={key}
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={settings[key]}
                        onChange={(e) => setting(key, Number(e.target.value))}
                      />
                      <output>{Math.round(settings[key] * 100)}%</output>
                    </div>
                  ))}
                  <div className="setting-row">
                    <label htmlFor="shake">Impact shake & motion</label>
                    <Switch
                      {...nav(3)}
                      id="shake"
                      checked={settings.shake}
                      onCheckedChange={(v) => setting('shake', v)}
                    />
                  </div>
                  <div className="setting-row">
                    <label htmlFor="assist">Assist · gentler damage</label>
                    <Switch
                      {...nav(4)}
                      id="assist"
                      checked={settings.assist}
                      onCheckedChange={(v) => setting('assist', v)}
                    />
                  </div>
                  {edition === '3d' && (
                    <>
                      <div className="setting-row">
                        <label htmlFor="cameraSensitivity">
                          Camera sensitivity
                        </label>
                        <input
                          {...nav(5)}
                          id="cameraSensitivity"
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={settings.cameraSensitivity}
                          onChange={(e) =>
                            setting('cameraSensitivity', Number(e.target.value))
                          }
                        />
                        <output>
                          {Math.round(settings.cameraSensitivity * 100)}%
                        </output>
                      </div>
                      <div className="setting-row">
                        <label htmlFor="invertY">Invert camera Y</label>
                        <Switch
                          {...nav(6)}
                          id="invertY"
                          checked={settings.invertY}
                          onCheckedChange={(v) => setting('invertY', v)}
                        />
                      </div>
                      <div className="setting-row">
                        <label htmlFor="landingGuide">Landing guide</label>
                        <Switch
                          {...nav(7)}
                          id="landingGuide"
                          checked={settings.landingGuide}
                          onCheckedChange={(v) => setting('landingGuide', v)}
                        />
                      </div>
                    </>
                  )}
                </div>
                <Button {...nav(edition === '3d' ? 8 : 5)} onClick={back}>
                  <ArrowLeft /> Back
                </Button>
                <p className="menu-footnote">
                  Use ← → to adjust values. Settings are saved on this device.
                </p>
              </>
            )}
            {screen === 'missions' && (
              <>
                <h1>Choose your horizon.</h1>
                <div className="episode-list">
                  {missions.map((name, n) => (
                    <Button
                      {...nav(n, n)}
                      key={name}
                      disabled={n > unlocked}
                      onClick={() => begin(n)}
                      onPointerEnter={() => setAimed(n)}
                    >
                      <span>0{n + 1}</span>
                      <div>
                        <strong>{name}</strong>
                        <small>
                          {n > unlocked
                            ? 'Complete the previous episode'
                            : episodeBlurbs[n]}
                        </small>
                      </div>
                      <ChevronRight />
                    </Button>
                  ))}
                </div>
                <Button {...nav(3)} onClick={back}>
                  <ArrowLeft /> Back
                </Button>
              </>
            )}
            {screen === 'complete' && (
              <>
                <div className="victory-star">✦</div>
                <h1>
                  {hud?.mission === 2 ? 'The dawn returns.' : 'A shadow falls.'}
                </h1>
                <p className="menu-description">
                  {hud?.mission === 2
                    ? 'One small boy. One extraordinary friend. Three worlds brought back into the light.'
                    : `${missions[hud?.mission || 0]} — episode complete.`}
                </p>
                <div className="results">
                  <span>✧ {hud?.signals} / 9 signals</span>
                  <span>{hud?.score.toLocaleString()} points</span>
                </div>
                <div className="menu-list">
                  <Button
                    {...nav(0)}
                    onClick={() =>
                      begin(hud?.mission === 2 ? 0 : (hud?.mission || 0) + 1)
                    }
                  >
                    <Play />
                    {hud?.mission === 2 ? 'Fly again' : 'Next episode'}
                  </Button>
                  <Button {...nav(1)} onClick={() => change('title')}>
                    <ArrowLeft /> Title screen
                  </Button>
                </div>
              </>
            )}
          </dialog>
        </div>
      )}
      {(preparing || hud?.loading) && (
        <output className="loading-screen" aria-live="polite">
          <div className="loading-panel">
            <span className="loading-eyebrow">
              {preparing ? 'Preparing' : 'Next district'}
            </span>
            <h2>{(preparing ?? hud?.loading)?.label}</h2>
            <progress
              className="loading-bar"
              max={100}
              value={Math.round(
                ((preparing ?? hud?.loading)?.progress || 0) * 100,
              )}
            />
            <p>
              {Math.round(((preparing ?? hud?.loading)?.progress || 0) * 100)}%
              <span> · loading the artwork for this district</span>
            </p>
          </div>
        </output>
      )}
      {notice && (
        <output className="notice">
          {notice}
          <Button
            size="icon"
            onClick={() => setNotice('')}
            aria-label="Dismiss notice"
          >
            ×
          </Button>
        </output>
      )}
      {error && (
        <div className="load-error" role="alert">
          {error}
          <Button onClick={() => location.reload()}>Retry loading</Button>
        </div>
      )}
    </main>
  );
}
