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
} from 'lucide-react';
import { InputManager } from '@/src/game/input';
import { GameAudio } from '@/src/game/audio';
import {
  Engine,
  type GameSnapshot,
  type GameSettings,
} from '@/src/game/engine';

type Screen =
  | 'title'
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
};
const missions = [
  'Earthbound Thunder',
  'The Iron Migration',
  'Beyond the Black Sun',
];
export default function Home() {
  'use no memo'; // The real-time canvas loop intentionally owns mutable control state.
  const canvas = useRef<HTMLCanvasElement>(null),
    root = useRef<HTMLElement>(null),
    engine = useRef<Engine | null>(null),
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
  const [hud, setHud] = useState<GameSnapshot | null>(null),
    [saved, setSaved] = useState(false),
    [unlocked, setUnlocked] = useState(0);
  function change(next: Screen) {
    if (next === 'title') {
      try {
        setSaved(!!localStorage.getItem('hopper.save'));
        setUnlocked(
          Math.min(2, Number(localStorage.getItem('hopper.unlocked') || 0)),
        );
      } catch {}
    }
    screenRef.current = next;
    setScreen(next);
    focusRef.current = 0;
    setFocus(0);
    input.current?.resetEdges();
    engine.current?.setPaused(next !== 'playing');
    // The title screen owns the menu theme. Pausing keeps whatever is playing
    // and simply lowers it, so the level track resumes where it left off.
    if (next === 'title') audio.current?.setScene('menu');
    else if (next === 'playing') audio.current?.setScene('gameplay');
    audio.current?.setDucked(next !== 'playing' && next !== 'title');
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
  function begin(mission = 0, resume = false) {
    if (!ready) return;
    audio.current?.setScene('gameplay');
    audio.current?.setDucked(false);
    void audio.current?.unlock();
    if (!document.fullscreenElement)
      void root.current
        ?.requestFullscreen?.()
        .catch(() => setNotice('Press ⛶ for fullscreen.'));
    engine.current?.start(mission, resume);
    change('playing');
    setNotice('');
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
  const actionsRef = useRef({ begin, change, open, back, fullscreen, setting });
  useLayoutEffect(() => {
    actionsRef.current = { begin, change, open, back, fullscreen, setting };
  });
  useEffect(() => {
    let alive = true,
      raf = 0,
      previous = performance.now(),
      uiClock = 0;
    const a = new GameAudio('./audio/theme.mp3', './audio/grass-march.mp3'),
      i = new InputManager(canvas.current!);
    audio.current = a;
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
          setSaved(!!localStorage.getItem('hopper.save'));
          setUnlocked(Number(localStorage.getItem('hopper.unlocked') || 0));
        }
      });
    } catch {}
    settingsRef.current = s;
    queueMicrotask(() => {
      if (alive) setSettings(s);
    });
    a.setVolumes(s.master, s.music, s.sfx);
    const e = new Engine(canvas.current!, a, (snapshot) => {
      if (alive) {
        setHud(snapshot);
        if (snapshot.completed) {
          setUnlocked((v) => Math.max(v, Math.min(2, snapshot.mission + 1)));
          actionsRef.current.change('complete');
        }
      }
    });
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
    if (['localhost', '127.0.0.1'].includes(location.hostname)) {
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
          e.preview(
            mission,
            area,
            typeof v.pose === 'string' ? v.pose : 'idle',
          );
          return e.snapshot();
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
          e.auditStep(frames, {
            moveX: Number(v.moveX) || 0,
            jumpPressed: !!v.jump,
            jumpHeld: !!v.jump,
            kickPressed: !!v.kick,
            shootHeld: !!v.shoot,
            blockHeld: !!v.block,
            lookX: 0,
            lookY: 0,
          });
          return { ...e.snapshot(), player: { ...e.player } };
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
        uiClock = 0;
      }
      if (f.disconnected && screenRef.current === 'playing') {
        setNotice('Controller disconnected · reconnect or use the keyboard.');
        action.change('pause');
      }
      const mode = screenRef.current;
      if (mode === 'playing') {
        if (f.pausePressed) action.change('pause');
        else if (f.instructionsPressed) action.open('instructions');
      } else if (mode === 'title' && f.anyPressed && f.active === 'gamepad') {
        action.begin(0, !!localStorage.getItem('hopper.save'));
      } else if (mode === 'title' && (f.confirmPressed || f.jumpPressed)) {
        action.begin(0, !!localStorage.getItem('hopper.save'));
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
          else if (mode === 'complete') action.change('title');
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
  const nav = (index: number) => ({
    'data-nav': true,
    'data-selected': focus === index,
    onFocus: () => {
      setFocus(index);
    },
  });
  return (
    <main
      ref={root}
      className={`game-shell ${screen === 'title' ? 'at-title' : ''}`}
    >
      <canvas
        ref={canvas}
        aria-label="Hopper the Grasshopper game world. Use A or Space to jump, X or J to kick behind, B or L to guard the front, RT or K to fire."
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
              onClick={() => begin(0, saved)}
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
              {saved
                ? 'Continue your adventure'
                : 'Press any controller button'}{' '}
              <span> / </span> ENTER
            </p>
            {saved && (
              <Button
                {...nav(1)}
                className="quiet-button"
                onClick={() => open('missions')}
              >
                Choose an episode <ChevronRight />
              </Button>
            )}
          </div>
          <div className="title-footer">
            <p>THREE WORLDS. ONE EXTRAORDINARY FRIEND.</p>
            <span>
              <Gamepad2 size={17} />
              {connected ? 'CONTROLLER CONNECTED' : 'XBOX CONTROLLER READY'}
            </span>
          </div>
          <div className="corner-controls">
            <Button
              {...nav(2)}
              size="icon"
              onClick={() => open('instructions')}
              aria-label="Instructions"
            >
              <BookOpen />
            </Button>
            <Button
              {...nav(3)}
              size="icon"
              onClick={() => open('settings')}
              aria-label="Settings"
            >
              <Settings />
            </Button>
            <Button
              {...nav(4)}
              size="icon"
              onClick={fullscreen}
              aria-label="Fullscreen"
            >
              <Maximize />
            </Button>
          </div>
        </div>
      )}
      {screen !== 'title' && hud && (
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
            <div className="location">
              <span>
                EPISODE {String(hud.mission + 1).padStart(2, '0')} <b> / </b>{' '}
                {hud.area.toUpperCase()}
              </span>
              <p>{hud.chapter}</p>
              <div className="route-progress">
                <i style={{ width: `${hud.progress * 100}%` }} />
              </div>
            </div>
            <div className="hud-right">
              <span className="signal-count">
                ✧ {hud.signals} <small>/ 9</small>
              </span>
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
          <div className="game-bottom">
            <span>
              <b className="pad a">A</b> JUMP <b className="pad x">X</b> KICK
              BEHIND <b className="trigger">RT</b> EYE LASERS{' '}
              <b className="pad b">B</b> GUARD FRONT
            </span>
            <span>
              {hud.gravity < 0
                ? '↑ INVERTED GRAVITY'
                : hud.gravity === 1
                  ? ''
                  : `${hud.gravity.toFixed(2)}g GRAVITY`}
            </span>
          </div>
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
      {screen !== 'title' && screen !== 'playing' && (
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
                    src="./assets/controller-diagram.png"
                    alt="Xbox controller: left stick or D-pad move, right stick look around, A jump, X rear spin kick and parry, B forward guard, RT shoot, Menu pause, View instructions."
                  />
                  <div className="control-notes">
                    <p>
                      <b className="pad a">A</b>
                      <strong>Jump</strong> Hold to soar; release for a precise
                      landing. Your back legs strike behind you at takeoff. Land
                      on shadows to crush them. Pull back in the air to brake
                      without turning; facing changes after landing.
                    </p>
                    <p>
                      <b className="pad x">X</b>
                      <strong>Rear spin kick · parry</strong> Sweep your
                      powerful hind legs behind you and overhead. It breaks
                      armor, and timed as a blow lands from behind or straight
                      down it parries: the shadow staggers wide open and a
                      parried shot flies back at its shooter. It reaches nothing
                      in front of you.
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
                      own, spends energy while held and when struck, and breaks
                      briefly if drained. Release to recharge. Keyboard: L.
                    </p>
                    <p>
                      <strong>Take a hit</strong> Shadows knock Hopper back a
                      real distance, so fight with your back away from the edge.
                      Fall just short of a ledge while reaching for it and
                      Hopper hauls up onto the lip. Jump the instant you touch a
                      wall to kick off it.
                    </p>
                    <p>
                      <strong>Look around</strong> Right stick pushes the camera
                      ahead, behind, up or down and widens the view; let go and
                      it settles back.
                    </p>
                    <p>
                      <strong>Move & explore</strong> Left stick / D-pad. Follow
                      the ivory landing edges. Seek nine ✧ signals in each
                      episode. Orange seams warn of hazards.
                    </p>
                  </div>
                </div>
                <div className="keyboard-line">
                  KEYBOARD <span>← → / A D</span> move <span>SPACE</span> jump{' '}
                  <span>J</span> rear kick <span>K</span> lasers <span>L</span>{' '}
                  forward guard <span>ESC</span> pause
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
                </div>
                <Button {...nav(5)} onClick={back}>
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
                      {...nav(n)}
                      key={name}
                      disabled={n > unlocked}
                      onClick={() => begin(n)}
                    >
                      <span>0{n + 1}</span>
                      <div>
                        <strong>{name}</strong>
                        <small>
                          {n > unlocked
                            ? 'Complete the previous episode'
                            : n === 0
                              ? 'Fields · metropolis · mountains'
                              : n === 1
                                ? 'Foundries · storm docks · launchworks'
                                : 'Red basin · blue drift · violet cathedral'}
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
