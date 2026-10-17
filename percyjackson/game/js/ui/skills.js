// The skill tree screen (Chiron's training in camp, and the pause menu):
//   • the three equipped powers at the top: pick a slot, then the power
//     for it (any power the hero knows; one already slotted swaps over);
//   • the hero's three branches, each node a button that buys its next rank,
//     showing its cost, what it needs, what it does now and at the next rank;
//   • in camp, a free reset that gives every point back.
// The rules (costs, requirements, gates, loadouts) are in heroes/skillRules.js;
// this file only shows them. Every control is a button, so mouse, touch,
// keyboard and controller (ui.js focus navigation) all work.
import { h, toast, confirmDialog } from './ui.js';
import { HEROES } from '../heroes/index.js';
import { KEY_LABEL, PAD_LABEL } from '../padmap.js';
import { treeOf, rankOf, canRank, rankUp, equip, respec, knownPowers, powerInfo, validLoadout, pointsFor, pointsLeft, branchPoints, treeCost, GATES, SLOTS } from '../heroes/skillRules.js';

const KIND = { power: 'New power', upgrade: 'Upgrade', passive: 'Passive' };

export function openSkills(game, player) {
  const ui = game.ui, save = game.saveFor?.(player) ?? game.save;   // net: this player's profile
  const hero = player.hero, T = treeOf(hero);
  // a free reset only in camp: there the choice can be tried again at leisure,
  // in a chapter what you picked is what you fight with
  const inCamp = game.mode === 'hub' && !game.chapter && !game.mission;
  let pick = -1;   // the slot being filled
  game.paused = true;
  const close = () => { ui.close('skills'); game.paused = false; };
  // redraw, keeping the focus on the same control (by its data-k)
  const redraw = (k) => { ui.refresh('skills'); const el = k && document.querySelector(`#scr-skills [data-k="${k}"]`); if (el) ui.setFocus(el); };
  const changed = () => { save.write(); player.refreshLoadout(); };
  ui.open('skills', (el) => {
    const S = save.hero(hero), level = save.data.level, left = pointsLeft(hero, S, level);
    const eq = validLoadout(hero, S.skills, S.equip);
    const keys = player.device?.startsWith('pad') ? PAD_LABEL : KEY_LABEL;
    // ---- the equipped powers
    const slotBtn = (i) => {
      const pw = powerInfo(hero, eq[i]);
      return h('button', { class: 'lslot' + (pick === i ? ' picking' : ''), 'data-k': 'slot' + i, 'data-autofocus': i === 0 ? true : undefined, 'aria-label': `Slot ${i + 1}: ${pw?.name ?? 'empty'}, change`, onclick: () => { pick = pick === i ? -1 : i; game.audio?.ui('move'); redraw(pick >= 0 ? 'pw0' : 'slot' + i); } },
        h('span', { class: 'lk' }, keys[SLOTS[i]] ?? String(i + 1)), h('span', { class: 'li' }, pw?.icon ?? '·'), h('span', { class: 'ln' }, pw?.name ?? 'Empty'));
    };
    const picker = pick >= 0 ? h('div', { class: 'picker', role: 'group', 'aria-label': `Choose the power for slot ${pick + 1}` },
      h('div', { class: 'hint pk-h' }, `Choose the power for slot ${pick + 1}:`),
      ...knownPowers(hero, S.skills).map((id, j) => {
        const pw = powerInfo(hero, id), at = eq.indexOf(id);
        return h('button', { class: 'pcard' + (at === pick ? ' on' : ''), 'data-k': 'pw' + j, onclick: () => {
          const slot = pick; equip(hero, S, slot, id); pick = -1; changed(); game.audio?.ui('buy'); redraw('slot' + slot);
        } }, h('span', { class: 'li' }, pw.icon), h('span', {}, h('b', {}, pw.name), at >= 0 ? h('span', { class: 'tag' }, ` · in slot ${at + 1}`) : null, h('div', { class: 'sd' }, pw.desc)));
      }),
      h('button', { class: 'btn small', 'data-k': 'pkx', onclick: () => { const s = pick; pick = -1; game.audio?.ui('back'); redraw('slot' + s); } }, 'Cancel')) : null;
    // ---- the branches
    const nodeBtn = (n) => {
      const r = rankOf(S.skills, n.id), c = canRank(hero, S, level, n.id), full = r >= n.max;
      const locked = !full && !c.ok && !c.poor, slotted = n.kind === 'power' ? eq.indexOf(n.id) : -1;
      const cls = ['snode', n.kind, full ? 'full' : c.ok ? 'open' : locked ? 'locked' : 'poor', r > 0 ? 'owned' : '', slotted >= 0 && r > 0 ? 'equipped' : ''].filter(Boolean).join(' ');
      const now = r > 0 ? h('div', { class: 'now' }, 'Now: ', n.at(r)) : null;
      const next = full ? null : h('div', { class: 'next' }, r === 0 ? (n.kind === 'power' ? 'Learn: ' : 'First rank: ') : 'Next rank: ', n.at(r + 1));
      const cost = full ? 'Max' : `${c.cost} pt${c.cost === 1 ? '' : 's'}`;
      return h('button', { class: cls, 'data-k': 'n-' + n.id, 'aria-label': `${n.name}, ${KIND[n.kind]}, rank ${r} of ${n.max}${full ? '' : `, ${cost}`}${c.ok || full ? '' : `, ${c.why}`}`, onclick: () => {
        if (!rankUp(hero, S, level, n.id)) { game.audio?.ui('back'); if (!full) toast(c.why); return; }
        changed(); game.audio?.levelUp();
        if (n.kind === 'power' && r === 0) toast(`${n.name} learned: choose a slot for it above`);
        redraw('n-' + n.id);
      } },
        h('div', { class: 'sh' }, n.icon ? h('span', { class: 'si' }, n.icon) : null, h('span', { class: 'sn' }, n.name), h('span', { class: 'sk' }, KIND[n.kind])),
        h('div', { class: 'sd' }, n.desc),
        now, next,
        h('div', { class: 'sf' }, h('span', { class: 'pips' }, '◆'.repeat(r) + '◇'.repeat(n.max - r)), h('span', { class: 'cost' }, cost)),
        !full && !c.ok ? h('div', { class: 'why' }, c.why) : null,
        slotted >= 0 && r > 0 ? h('div', { class: 'eqd' }, `Equipped in slot ${slotted + 1}`) : null);
    };
    const branch = (b) => {
      const nodes = T.nodes.filter((n) => n.branch === b.id), tiers = [...new Set(nodes.map((n) => n.tier))].sort();
      return h('div', { class: 'branch' },
        h('div', { class: 'bh' }, h('div', { class: 'bn' }, b.name), h('div', { class: 'bd' }, `${b.desc} · ${branchPoints(hero, S.skills, b.id)} spent`)),
        ...tiers.flatMap((t) => [t > 1 ? h('div', { class: 'gate' + (branchPoints(hero, S.skills, b.id, t) >= GATES[t - 1] ? ' met' : '') }, `Tier ${t} · ${GATES[t - 1]} points in this branch's tiers above`) : null, ...nodes.filter((n) => n.tier === t).map(nodeBtn)]));
    };
    const reset = inCamp
      ? h('button', { class: 'btn small', 'data-k': 'reset', onclick: () => confirmDialog(game, {
        title: 'Reset the skill tree?', text: `Every point comes back (${pointsFor(level)} in all) and the three starting powers go back in their slots. Free in camp.`, yes: 'Reset', no: 'Keep it',
        onYes: () => { respec(hero, S, level); pick = -1; changed(); game.audio?.ui('buy'); toast('Skill points refunded'); redraw('reset'); },
      }) }, 'Reset points (free)')
      : h('span', { class: 'hint', style: 'margin:0 8px 0 0' }, 'Reset the tree with Chiron in camp (free).');
    el.appendChild(h('div', { class: 'panel skills-panel' },
      h('h2', {}, `Skill Tree · ${HEROES[hero]?.name ?? hero}`),
      h('div', { class: 'hint', style: 'margin:0 0 8px' }, h('b', { class: 'pts' }, `${left} point${left === 1 ? '' : 's'} to spend`), ` · Level ${level} · one point a level · the whole tree costs ${treeCost(hero)}`),
      h('div', { class: 'loadout', role: 'group', 'aria-label': 'Equipped powers' }, h('span', { class: 'lt' }, 'Equipped'), ...SLOTS.map((_, i) => slotBtn(i))),
      picker,
      h('div', { class: 'branches' }, ...T.branches.map(branch)),
      h('div', { class: 'row', style: 'justify-content:flex-end;align-items:center;margin-top:10px;flex-wrap:wrap' }, reset, h('button', { class: 'btn', 'data-k': 'close', onclick: close }, 'Close'))));
  }, { dim: true, onBack: () => { if (pick >= 0) { const s = pick; pick = -1; redraw('slot' + s); } else close(); } });
}
