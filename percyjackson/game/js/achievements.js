// Achievements in play: the game tells this what happens (achievementRules.js
// decides what it earns), each unlock is credited to the profile of the
// person who did it (or every person on this screen, for what the party
// does), shown in a card at the top of the screen and saved. AI companions
// and other screens' heroes earn nothing here (online, each screen credits
// its own players). In the debug sandbox the save is in memory, so nothing
// sticks.
import { ACH, ACHIEVEMENTS, grant, bump, onChapterDone, onBossDown, onBelongings, normalizeAch } from './achievementRules.js';
import { t } from './text_config.js';
import { iconUrl } from './ui/icons.js';

export class Achievements {
  constructor(game) { this.game = game; this.queue = []; this.showing = null; this.checkT = 0; }
  rec(sv) { const d = sv.data; if (!d.achievements?.got) d.achievements = normalizeAch(d.achievements); return d.achievements; }
  // whose profiles a deed counts for: a person's hero -> theirs; none -> everyone on this screen
  saves(p) {
    const g = this.game;
    if (p) return p.ai || p.remote ? [] : [g.saveFor(p)].filter(Boolean);
    return g.localSaves?.() ?? (g.save ? [g.save] : []);
  }
  apply(p, fn) {
    for (const sv of this.saves(p)) {
      const ids = fn(this.rec(sv)) ?? [];
      const list = Array.isArray(ids) ? ids : ids ? [ids] : [];
      if (!list.length) continue;
      sv.write();
      for (const id of list) this.announce(id, sv);
    }
  }
  count(stat, p = null, by = 1) { this.apply(p, (r) => bump(r, stat, by)); }
  grant(id, p = null) { this.apply(p, (r) => (grant(r, id) ? [id] : [])); }
  chapterDone(info) { this.apply(null, (r) => onChapterDone(r, info)); }
  bossDown(fight) { if (fight) this.apply(null, (r) => onBossDown(r, fight)); }
  // now and then: drachmas, a Unique, the Heroic outfit
  update(dt) {
    this.checkT -= dt;
    if (this.checkT <= 0) {
      this.checkT = 2.5;
      for (const sv of this.saves(null)) {
        const d = sv.data, equipped = Object.values(d.heroes ?? {}).map((h) => h.gear);
        const ids = onBelongings(this.rec(sv), { coins: d.coins, inv: d.inventory, equipped });
        if (ids.length) { sv.write(); for (const id of ids) this.announce(id, sv); }
      }
    }
    if (this.showing && (this.showing.t -= dt) <= 0) { this.showing.el.classList.remove('in'); const el = this.showing.el; setTimeout(() => el.remove(), 400); this.showing = null; }
    if (!this.showing && this.queue.length) this.show(this.queue.shift());
  }
  announce(id, sv) {
    if (!ACH[id]) return;
    const many = (this.game.localSaves?.() ?? []).length > 1;
    this.queue.push({ id, who: many ? sv.name : null });
  }
  show({ id, who }) {
    if (typeof document === 'undefined') return;
    const a = ACH[id], el = document.createElement('div');
    el.className = 'ach-card'; el.setAttribute('role', 'status');
    const badge = document.createElement('div'); badge.className = 'ach-badge';
    const u = iconUrl('ach:' + id);
    if (u) { const img = document.createElement('img'); img.src = u; img.alt = ''; badge.append(img); } else badge.textContent = a.icon;
    const txt = document.createElement('div'); txt.className = 'ach-txt';
    const k = document.createElement('div'); k.className = 'ach-kicker'; k.textContent = who ? t('achievements.unlockedBy', { name: who }) : t('achievements.unlocked');
    const n = document.createElement('div'); n.className = 'ach-name'; n.textContent = t(`achievements.list.${id}.name`);
    const dsc = document.createElement('div'); dsc.className = 'ach-desc'; dsc.textContent = t(`achievements.list.${id}.desc`);
    txt.append(k, n, dsc); el.append(badge, txt);
    (document.getElementById('toast-layer') ?? document.body).appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    this.showing = { el, t: 4.2 };
    this.game.audio?.levelUp?.();
  }
}
// all of them, for the screen
export const ACH_LIST = ACHIEVEMENTS;
