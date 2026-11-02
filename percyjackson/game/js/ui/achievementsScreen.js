// The Achievements screen (opened from Settings): every achievement with its
// badge (ui/icons.js, else its emoji), name and description; a locked one is
// greyed, a counted one shows how far along it is, an unlocked one the day it
// was won. Reads the main profile of the active save (each player's own
// profile keeps its own; the hero select chooses whose).
import { h } from './ui.js';
import { t } from '../text_config.js';
import { ACHIEVEMENTS, progress, normalizeAch } from '../achievementRules.js';
import { iconUrl } from './icons.js';

const STORY = 16;   // the first sixteen are the story and the bosses (badge sheet 1)

export function openAchievements(game, onClose) {
  const ui = game.ui;
  const close = () => { ui.close('achievements'); onClose?.(); };
  ui.open('achievements', (el) => {
    const rec = normalizeAch(game.save?.data?.achievements);
    const got = ACHIEVEMENTS.filter((a) => rec.got[a.id] != null).length;
    const card = (a) => {
      const on = rec.got[a.id] != null, pr = progress(rec, a.id);
      const u = iconUrl('ach:' + a.id);
      const badge = h('div', { class: 'ach-badge' }, u ? h('img', { src: u, alt: '' }) : a.icon);
      const foot = on ? h('div', { class: 'ach-when' }, t('achievements.gotOn', { date: new Date(rec.got[a.id]).toLocaleDateString() }))
        : pr ? h('div', { class: 'ach-prog' }, h('div', { class: 'bar' }, h('div', { class: 'fill', style: `width:${Math.round(100 * pr.n / pr.goal)}%` })), h('span', {}, t('achievements.progress', pr)))
        : h('div', { class: 'ach-when' }, t('achievements.locked'));
      return h('div', { class: 'ach-item' + (on ? ' on' : ''), 'data-nav': '', tabindex: '0', ...(a === ACHIEVEMENTS[0] ? { 'data-autofocus': true } : {}), 'aria-label': `${t(`achievements.list.${a.id}.name`)}: ${on ? '' : t('achievements.locked') + '. '}${t(`achievements.list.${a.id}.desc`)}` },
        badge, h('div', { class: 'ach-txt' }, h('div', { class: 'ach-name' }, t(`achievements.list.${a.id}.name`)), h('div', { class: 'ach-desc' }, t(`achievements.list.${a.id}.desc`)), foot));
    };
    el.appendChild(h('div', { class: 'panel ach-panel', role: 'dialog', 'aria-label': t('achievements.title'), 'aria-modal': 'true' },
      h('h2', {}, t('achievements.title')),
      h('div', { class: 'hint' }, t('achievements.count', { got, all: ACHIEVEMENTS.length })),
      h('h3', {}, t('achievements.groups.story')),
      h('div', { class: 'ach-grid' }, ...ACHIEVEMENTS.slice(0, STORY).map(card)),
      h('h3', {}, t('achievements.groups.habits')),
      h('div', { class: 'ach-grid' }, ...ACHIEVEMENTS.slice(STORY).map(card)),
      h('div', { class: 'row', style: 'margin-top:12px;justify-content:flex-end' }, h('button', { class: 'btn primary', onclick: close }, t('common.done')))));
  }, { dim: true, onBack: close });
}
