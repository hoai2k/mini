import type { InputFrame } from './input';
import type { GameSettings, GameSnapshot } from './engine';

/** What the shell needs from either edition's engine. */
export interface GameEngine {
  rumble: (strength: number, duration: number) => void;
  /** Anything the status tool may report; shape differs per edition. */
  player: object;
  load(progress: (fraction: number) => void): Promise<void>;
  configure(settings: GameSettings): void;
  start(mission: number, resume?: boolean): void;
  /**
   * Load everything the first district of `mission` needs before play starts.
   * Editions that load their whole pack up front resolve immediately.
   */
  prepare?(
    mission: number,
    resume: boolean,
    progress: (fraction: number) => void,
  ): Promise<void>;
  /** Warm assets for an episode during idle time; call again to retarget. */
  prefetch?(mission: number): void;
  setPaused(paused: boolean): void;
  tick(dt: number, frame?: InputFrame): void;
  respawn(): void;
  snapshot(): GameSnapshot;
  dispose(): void;
}

/** Which edition the shell is running; the 3D edition is the default. */
export type Edition = '2d' | '3d';

export function editionFromLocation(search = location.search): Edition {
  return new URLSearchParams(search).get('render') === '2d' ? '2d' : '3d';
}

/** localStorage key prefix for each edition's own save and unlock state. */
export function saveKey(edition: Edition, name: 'save' | 'unlocked'): string {
  return `${edition === '3d' ? 'hopper3d' : 'hopper'}.${name}`;
}
