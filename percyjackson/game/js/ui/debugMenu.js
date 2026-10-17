// Debug: jump to any scene (the opening's prologue, its cutscenes and
// chapters, camp, any chapter at any difficulty, straight to its boss) for
// testing and auditing levels and cinematics. Turned on in Settings → Data →
// Debug; the menu opens from the title, the pause menu and Settings.
//
// Nothing is saved while debugging: the first jump swaps the save for one
// held in memory only (every hero and chapter unlocked), and the resume point
// and save-slot index stop writing. The real save is not touched; leaving
// debug reloads the page, which brings it back as it was.
import { h, toast } from './ui.js';
import { Profiles } from '../profiles.js';
import { Mission } from '../mission.js';
import { OPENING_STEPS, STEP_INFO } from '../story/opening.js';
import { CHAPTERS, chapterPlayable } from '../story/chapters.js';
import { HEROES, HERO_IDS } from '../heroes/index.js';
import { DIFFICULTIES } from './chapterMap.js';
import { t } from '../text_config.js';

const pick = { hero: 'percy', difficulty: 2, cards: false, boss: false };

// Storage that lives in memory (the shape Profiles expects of localStorage).
function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); }, key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; } };
}

// From here on nothing reaches the browser's storage (settings aside).
export function enterSandbox(g) {
  if (g.sandbox) return;
  try { clearTimeout(g.resume?.timer); } catch (e) { /* (a pending resume write is dropped: the last one stays) */ }
  g.profiles?.dispose?.();
  g.profiles = new Profiles(memoryStorage(), { prefix: 'debug:', slot: 'debug' });
  g.save = g.profiles.main;
  g.save.data.unlockAll = true; g.save.data.seenGearHint = true;
  if (g.resume) for (const k of ['flush', 'schedule', 'clear', 'touchSlot']) g.resume[k] = () => {};
  if (g.slots) for (const k of ['write', 'touch']) g.slots[k] = () => {};
  g.sandbox = true;
  showBadge(g);
}

function showBadge(g) {
  if (document.getElementById('debug-badge')) return;
  const b = h('div', { id: 'debug-badge', role: 'status', style: 'position:fixed;left:50%;top:6px;transform:translateX(-50%);z-index:60;display:flex;gap:8px;align-items:center;padding:3px 10px;border-radius:12px;background:rgba(120,20,20,.85);border:1px solid #ff8a6a;color:#fff;font:600 12px/1.4 system-ui,sans-serif;pointer-events:auto' },
    h('span', {}, t('debug.badge')),
    h('button', { class: 'btn small', style: 'padding:1px 8px;font-size:11px', onclick: () => openDebugMenu(g) }, t('debug.scenes')),
    h('button', { class: 'btn small', style: 'padding:1px 8px;font-size:11px', onclick: () => location.reload() }, t('debug.leave')));
  document.body.appendChild(b);
}

// Start a session with the chosen hero. opening: the story's own party rules
// (no companions); else the other heroes come as companions.
function session(g, { opening = false } = {}) {
  g.ui.closeAll(); g.paused = false;
  g.endCutscene?.();
  if (g.minigame) g.minigame.stop?.();
  g.opening.running = null; g.openingChapter = null;
  const hero = opening ? 'percy' : pick.hero;
  const companions = opening ? [] : HERO_IDS.filter((id) => id !== hero && HEROES[id].unlock === 'start').slice(0, 2);
  g.beginSession([{ device: g.input?.lastDevice ?? 'kbm', hero, profile: g.save.id }], { companions, start: 'hub', opening });
}

// A step of the opening, from a save that is just there.
function jumpOpening(g, step) {
  enterSandbox(g);
  const d = g.save.data; d.completed = {}; d.opening = step;
  session(g, { opening: true });
  g.opening.run(step);
}
function jumpCamp(g) {
  enterSandbox(g);
  const d = g.save.data; d.opening = 'done';
  session(g);
}
function jumpChapter(g, ch) {
  enterSandbox(g);
  const d = g.save.data; d.opening = 'done';
  for (const c of CHAPTERS) if (c.id !== ch.id) d.completed[c.id] = d.completed[c.id] ?? 1;
  session(g);
  const diff = pick.difficulty;
  if (pick.cards) g.startChapter(ch.id, diff);
  else g.startMission(Mission.defForChapter(ch, diff));
  if (pick.boss) toBossWhenReady(g, ch);
}
// The chapter's arena, its boss up (chapters whose boss has its own way in,
// the museum, the banner and the casino, start at the beginning instead).
export const bossJumpable = (ch) => !!ch.boss && !['museum', 'flag', 'escape'].includes(ch.objective);
function toBossWhenReady(g, ch) {
  if (!bossJumpable(ch)) { toast(t('debug.noBossJump')); return; }
  let tries = 0;
  const iv = setInterval(() => {
    const m = g.mission;
    if (++tries > 240) { clearInterval(iv); return; }
    if (!m || g.state !== 'playing' || g.ui.stack.length || !m.L?.bossRoom) return;
    clearInterval(iv);
    const room = m.L.bossRoom;
    for (const r of m.L.rooms) if (r !== room) { r.waves = []; r.packs = []; r.loose = []; r.trap = null; }
    m.obj.done = m.obj.need; m.objDone = true; g.objectiveDone = true;
    for (const gate of m.L.gates) m.openGate(gate);
    const at = m.retrySpot?.() ?? room.center.clone();
    g.placePlayers(m.standAt?.(room.center.x, room.y, room.z1 - 3) ?? at);
    m.startBoss(room);
    m.updateText?.();
  }, 250);
}

export function openDebugMenu(g) {
  const ui = g.ui;
  if (g.online?.live) { toast(t('debug.aloneOnly')); return; }
  ui.open('debug', (el) => {
    const btn = (label, fn, extra = {}) => h('button', { class: 'btn small', style: 'margin:3px', onclick: fn, ...extra }, label);
    const tog = (key, label) => { const b = btn(t('debug.toggle', { label, state: pick[key] ? t('debug.on') : t('debug.off') }), () => { pick[key] = !pick[key]; ui.refresh('debug'); }); b.setAttribute('aria-pressed', String(!!pick[key])); return b; };
    const sect = (heading, ...kids) => h('div', { style: 'margin:10px 0 2px' }, h('div', { style: 'font-weight:700;opacity:.85;margin-bottom:2px' }, heading), h('div', { style: 'display:flex;flex-wrap:wrap' }, ...kids));
    const heroes = HERO_IDS.map((id) => btn((pick.hero === id ? '● ' : '') + HEROES[id].name, () => { pick.hero = id; ui.refresh('debug'); }));
    const diffs = DIFFICULTIES.map(([name], i) => btn((pick.difficulty === i + 1 ? '● ' : '') + name, () => { pick.difficulty = i + 1; ui.refresh('debug'); }));
    const chapters = CHAPTERS.filter(chapterPlayable).map((ch) => btn(`${ch.num}. ${ch.title}${pick.boss && !bossJumpable(ch) ? t('debug.noBossJumpSuffix') : ''}`, () => jumpChapter(g, ch)));
    const opening = OPENING_STEPS.filter((s) => s !== 'done').map((s) => btn(`${STEP_INFO[s].kind === 'cutscene' ? '🎬 ' : ''}${STEP_INFO[s].title}`, () => jumpOpening(g, s)));
    el.appendChild(h('div', { class: 'panel', role: 'dialog', 'aria-label': t('debug.ariaLabel'), 'aria-modal': 'true', style: 'width:min(760px,96vw);max-height:90vh;overflow:auto' },
      h('h2', {}, t('debug.title')),
      h('div', { class: 'hint' }, g.sandbox ? t('debug.hintSandbox') : t('debug.hint')),
      sect(t('debug.opening'), ...opening),
      sect(t('debug.camp'), btn(t('debug.campButton'), () => jumpCamp(g))),
      sect(t('debug.hero'), ...heroes),
      sect(t('debug.difficulty'), ...diffs),
      sect(t('debug.options'), tog('cards', t('debug.cardsFirst')), tog('boss', t('debug.startAtBoss'))),
      sect(t('debug.chapters'), ...chapters),
      h('div', { class: 'row', style: 'margin-top:12px;justify-content:flex-end;gap:8px' },
        g.sandbox ? h('button', { class: 'btn danger', onclick: () => location.reload() }, t('debug.leaveDebug')) : null,
        h('button', { class: 'btn primary', 'data-autofocus': true, onclick: () => ui.close('debug') }, t('debug.close')))));
  }, { dim: true, onBack: () => ui.close('debug') });
}
