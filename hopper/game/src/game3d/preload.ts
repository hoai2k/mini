/**
 * Asset preloading for the 3D edition.
 *
 * Two jobs. `preloadDistrict` guarantees every painting a district draws is in
 * the texture cache before play starts, so the world never appears untextured
 * and fills in. `Prefetcher` spends idle time on the title and play-select
 * screens warming the same cache for the episode the player is looking at, so
 * that guarantee usually costs no visible wait.
 *
 * Both go through `painting()` in textures3d, sharing its cache and its option
 * sets, so a warmed entry is the very texture the build later asks for.
 */
import { MISSIONS, type District } from './district';
import {
  FLOOR_SURFACE,
  horizonCards,
  OPTS,
  painting,
  HOPPER_SHEET,
  PROP_SHEET,
} from './textures3d';

type Job = { path: string; opts: Parameters<typeof painting>[1] };

/** Sheets and atlases every district uses, loaded once for the whole game. */
function sharedJobs(): Job[] {
  return [
    { path: HOPPER_SHEET, opts: OPTS.sheet },
    { path: PROP_SHEET, opts: OPTS.sheet },
    { path: 'effects/stomp-shockwave.png', opts: OPTS.sheet },
    { path: 'effects/laser-impact.png', opts: OPTS.sheet },
    { path: 'effects/kick-spark.png', opts: OPTS.sheet },
    { path: 'ui/lock-on.png', opts: OPTS.sheet },
    { path: 'ui/lock-on-locked.png', opts: OPTS.sheet },
    { path: 'creatures/shadow-hide.png', opts: OPTS.creature },
    { path: 'creatures/shadow-hide-emissive.png', opts: OPTS.creatureEmissive },
  ];
}

/** Everything a single district paints: sky, horizon, terrain, trim, floor. */
export function districtJobs(district: District): Job[] {
  const region = district.region;
  const jobs: Job[] = [
    { path: `sky/${region}-preview.jpg`, opts: OPTS.sky },
    { path: `trim/${region}.png`, opts: OPTS.trim },
    { path: `trim/${region}-emissive.png`, opts: OPTS.trimEmissive },
  ];
  for (const file of ['ground', 'cliff', 'path'])
    jobs.push({ path: `terrain/${region}/${file}.png`, opts: OPTS.terrain });
  const surface = FLOOR_SURFACE[region];
  if (surface) {
    jobs.push({ path: `surface/${surface}.png`, opts: OPTS.surface });
    jobs.push({
      path: `surface/${surface}-detail.png`,
      opts: OPTS.surfaceDetail,
    });
  }
  const landmarkAngle = Math.atan2(district.landmark.z, district.landmark.x);
  for (const { ring, n } of horizonCards(region, landmarkAngle))
    jobs.push({
      path: `horizon/${region}-${ring}-${n}.png`,
      opts: OPTS.horizon,
    });
  return jobs;
}

function dedupe(jobs: Job[]): Job[] {
  const seen = new Set<string>();
  return jobs.filter((j) => {
    const key = `${j.path}|${JSON.stringify(j.opts)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** The district the player is about to enter, plus the shared sheets. */
export function jobsFor(mission: number, districtIndex: number): Job[] {
  const district = MISSIONS[mission]?.[districtIndex];
  return dedupe([
    ...sharedJobs(),
    ...(district ? districtJobs(district()) : []),
  ]);
}

/** Every district of an episode, nearest first: what idle time works through. */
export function missionJobs(mission: number, from = 0): Job[] {
  const districts = MISSIONS[mission] || [];
  const ordered = [...districts.slice(from), ...districts.slice(0, from)];
  return dedupe([
    ...sharedJobs(),
    ...ordered.flatMap((d) => districtJobs(d())),
  ]);
}

/**
 * Load a district's assets, reporting 0..1. Resolves when every one has
 * settled; a missing painting resolves null and still counts, because the
 * stand-in covers it and the player should not wait on a 404.
 */
export async function preloadDistrict(
  mission: number,
  districtIndex: number,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  const jobs = jobsFor(mission, districtIndex);
  if (!jobs.length) {
    onProgress?.(1);
    return;
  }
  let done = 0;
  onProgress?.(0);
  await Promise.all(
    jobs.map((j) =>
      painting(j.path, j.opts).then(() => {
        done++;
        onProgress?.(done / jobs.length);
      }),
    ),
  );
  onProgress?.(1);
}

/**
 * Idle-time warming. One asset at a time so the title screen keeps its frame
 * rate, retargetable the moment the player looks at another episode: the queue
 * is rebuilt from the new target and already-cached entries cost nothing.
 */
export class Prefetcher {
  private queue: Job[] = [];
  private running = false;
  private stopped = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** Which episode is being warmed, so a repeat target is not restarted. */
  private target = -1;

  /** Point idle time at an episode. Cheap to call on every focus change. */
  retarget(mission: number, fromDistrict = 0): void {
    if (this.stopped || (this.target === mission && this.running)) return;
    this.target = mission;
    this.queue = missionJobs(mission, fromDistrict);
    if (!this.running) this.pump();
  }
  /** Stop for good: play has started, or the shell is going away. */
  stop(): void {
    this.stopped = true;
    this.queue = [];
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
  get idle(): boolean {
    return !this.running;
  }
  private pump(): void {
    if (this.stopped) return;
    const job = this.queue.shift();
    if (!job) {
      this.running = false;
      return;
    }
    this.running = true;
    void painting(job.path, job.opts).then(() => {
      if (this.stopped) return;
      // A breath between files keeps decoding off the animation frame.
      this.timer = setTimeout(() => this.pump(), 60);
    });
  }
}
