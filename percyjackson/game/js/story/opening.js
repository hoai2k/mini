// The opening of a new game, in story order:
//   prologue    Manhattan, the morning of the field trip: walk to the school bus
//   cut-bus     cutscene: the bus drives to the museum, the class gets out
//   lt1         chapter 1, the museum (Mrs. Dodds)
//   cut-summer  cutscene: summer, Montauk, Grover at the door, the drive in the storm
//   lt2         chapter 2, Half-Blood Hill (the Minotaur)
//   cut-wake    cutscene: Percy wakes on the porch of the Big House
//   done        Camp Half-Blood is the open hub
//
// The step is kept in the main profile of the save (data.opening) and in the
// resume point. A save from before the opening existed has no step: it is
// worked out from the chapters it finished, so a save that finished chapters
// 1 and 2 starts in camp as it always did. Pure module (no DOM, no Three.js),
// so the node tests can load it.
export const OPENING_STEPS = ['prologue', 'cut-bus', 'lt1', 'cut-summer', 'lt2', 'cut-wake', 'done'];

export const STEP_INFO = {
  prologue: { title: 'The morning of the field trip', goal: 'Get to the school bus', kind: 'level' },
  'cut-bus': { title: 'The field trip', kind: 'cutscene', cutscene: 'bus' },
  lt1: { title: 'The Pre-Algebra Teacher', kind: 'chapter', chapter: 'lt1' },
  'cut-summer': { title: 'Summer, and a storm', kind: 'cutscene', cutscene: 'summer' },
  lt2: { title: 'Half-Blood Hill', kind: 'chapter', chapter: 'lt2' },
  'cut-wake': { title: 'Camp Half-Blood', kind: 'cutscene', cutscene: 'wake' },
  done: { title: 'Camp Half-Blood', kind: 'hub' },
};

const rank = (s) => OPENING_STEPS.indexOf(s);
export const isStep = (s) => rank(s) >= 0;
export const laterStep = (a, b) => (rank(a) >= rank(b) ? a : b);

// The furthest the finished chapters prove the save has got.
export function stepFromChapters(completed = {}) {
  if (completed.lt1 && completed.lt2) return 'cut-wake';
  if (completed.lt2) return 'cut-wake';
  if (completed.lt1) return 'cut-summer';
  return 'prologue';
}

// Where this profile is in the opening.
export function openingStep(data) {
  const c = data?.completed ?? {};
  const stored = data?.opening;
  if (!isStep(stored)) return c.lt1 && c.lt2 ? 'done' : stepFromChapters(c);   // a save from before the opening
  return laterStep(stored, stepFromChapters(c));
}
export const openingDone = (data) => openingStep(data) === 'done';

export function nextStep(step) { const i = rank(step); return i < 0 || i >= OPENING_STEPS.length - 1 ? 'done' : OPENING_STEPS[i + 1]; }
// The step that follows finishing an opening chapter.
export function stepAfterChapter(id) { return id === 'lt1' ? 'cut-summer' : id === 'lt2' ? 'cut-wake' : null; }
// The opening step of a chapter (null: not part of the opening).
export function chapterStep(id) { return id === 'lt1' || id === 'lt2' ? id : null; }

// Move a profile on to `step` (never back). Returns true when it changed.
export function advanceOpening(data, step) {
  if (!data || !isStep(step)) return false;
  const cur = openingStep(data), next = laterStep(cur, step);
  if (data.opening === next) return false;
  data.opening = next;
  return true;
}
