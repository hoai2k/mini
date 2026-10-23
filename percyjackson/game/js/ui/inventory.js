// Inventory and the forge, Minecraft Dungeons style, made simple for 8-14s.
//   • Top: the hero's level, drachmas, enchantment points and Power (the
//     average power of what the hero wears); whose gear (your hero, or
//     playing alone a companion).
//   • Left: the hero in their gear (a turning 3D view, ui/heroPreview.js: an
//     item chosen in the stash is tried on), the four slots the hero wears,
//     tabs by kind (with counts) and the
//     stash, new finds first (they glow), then the strongest, then the most
//     recent (loot.js sortItems). A green ▲ marks an item stronger than what
//     it would replace; a coloured dot an item another hero wears.
//   • Right: the item: its power against what you wear (▲ green / ▼ red),
//     what changes if you swap (each stat, before → after), its enchantments
//     in plain words, and big buttons: Equip, Salvage, Unequip (the forge
//     adds Temper and Re-roll).
//   • Choosing: focus (pad, keys) or a click / tap shows an item; pressing it
//     again (A, Enter, a second click or tap) equips it. X salvages; LB / RB
//     (Q / E) change tabs; B / Esc closes. Every control is a button, so the
//     shared focus navigation (ui.js) works with every device.
//   • Animations: an item flies into its slot when equipped, the slot
//     flashes (gold on a swap), salvage pops drachmas up to the counter, new
//     items glow. (Shorter with prefers-reduced-motion: style.css.)
import { h, toast, confirmDialog } from './ui.js';
import { HEROES } from '../heroes/index.js';
import { BLESSED, ENCHANTS, KIND_LABEL, itemInfo, itemRarity, itemTier, salvageValue, enchCost, spentPoints, gearStats, temperCost, rerollCost, rerollRow, sortItems, slotFor, isUpgrade, TEMPER_STEP, boonName, boonText, reforgeCost, reforgeTarget, canReforge, reforge, isOutdated } from '../loot.js';
import { iconNode } from './icons.js';
import { coinText } from './lootkit.js';
import { heroPreview } from './heroPreview.js';
import { gearOf } from '../entities/gear/equip.js';
import { temperCap } from '../progression.js';
import { flaskCooldown, quiverMax } from '../resources.js';
import { t as tx, tn } from '../text_config.js';

const SLOT_NAMES = [tx('inventory.slots.weapon'), tx('inventory.slots.armor'), tx('inventory.slots.artifact1'), tx('inventory.slots.artifact2')];
const SLOT_ICON = ['🗡️', '🛡️', '✨', '✨'];
const FILTERS = [['all', tx('inventory.filters.all')], ['weapon', tx('inventory.filters.weapon')], ['armor', tx('inventory.filters.armor')], ['artifact', tx('inventory.filters.artifact')], ['heroic', tx('inventory.filters.heroic')]];
// a tab's items: a kind, or Heroic and Legendary finds
const inFilter = (it, f) => f === 'all' || (f === 'heroic' ? ['heroic', 'unique'].includes(itemTier(it)) : itemInfo(it).kind === f);
const roman = ['', 'I', 'II', 'III'];

// Heroes this player may outfit: their own, plus AI companions when alone.
function editable(game, player) {
  const own = [player];
  if (game.party && !player.ai) for (const q of game.party) if (q !== player && q.ai) own.push(q);
  return own;
}
// The hero (other than `who`) wearing an item, if any.
function wornBy(d, uid, who) {
  for (const [hid, hs] of Object.entries(d.heroes)) if (hid !== who && hs.gear?.includes(uid)) return hid;
  return null;
}

// The stat lines the screen shows and compares: [label, value, kind, higherIsBetter].
//   kind: 'n' a number, 'x' a multiplier (compared as a % change), 'pct' a
//   share shown as %, 'secs' seconds.
const STAT_LINES = (s) => [
  [tx('inventory.stats.health'), Math.round(s.maxHp), 'n', true],
  [tx('inventory.stats.melee'), s.meleeMult, 'x', true],
  [tx('inventory.stats.ability'), s.techMult, 'x', true],
  [tx('inventory.stats.attackSpeed'), s.attackSpeed, 'x', true],
  [tx('inventory.stats.armor'), s.armor, 'pct', true],
  [tx('inventory.stats.speed'), s.speed, 'x', true],
  [tx('inventory.stats.crit'), s.crit, 'pct', true],
  [tx('inventory.stats.cooldowns'), s.cdr, 'pct', true],
  [tx('inventory.stats.dodge'), s.evade, 'pct', true],
  [tx('inventory.stats.flask'), flaskCooldown(s), 'secs', false],
  [tx('inventory.stats.quiver'), quiverMax(s), 'n', true],
];
const fmt = (v, kind) => (kind === 'pct' ? tx('inventory.percent', { n: Math.round(v * 100) }) : kind === 'secs' ? tx('inventory.seconds', { n: v.toFixed(0) }) : kind === 'x' ? tx('inventory.times', { n: v.toFixed(2) }) : String(Math.round(v)));
// The change between two values, in words a kid reads at a glance.
function delta(a, b, kind) {
  if (kind === 'x') return tx('inventory.percent', { n: Math.round(Math.abs(b / Math.max(1e-6, a) - 1) * 100) });
  if (kind === 'pct') return tx('inventory.percent', { n: Math.round(Math.abs(b - a) * 100) });
  if (kind === 'secs') return tx('inventory.seconds', { n: Math.abs(b - a).toFixed(0) });
  return String(Math.round(Math.abs(b - a)));
}
// Compare two stat sets: the lines that changed, [{ label, from, to, up
// (better: green), more (the number grew), by }].
export function compareStats(before, after) {
  const A = STAT_LINES(before), B = STAT_LINES(after), out = [];
  A.forEach(([label, v, kind, good], i) => {
    const v2 = B[i][1];
    const small = kind === 'x' ? Math.abs(v2 / Math.max(1e-6, v) - 1) < 0.005 : kind === 'pct' ? Math.abs(v2 - v) < 0.005 : Math.abs(v2 - v) < 0.5;
    if (small) return;
    out.push({ label, from: fmt(v, kind), to: fmt(v2, kind), up: (v2 > v) === good, more: v2 > v, by: delta(v, v2, kind) });
  });
  return out;
}

// ---------------------------------------------------------------- animations
// A layer over everything for the flying icons and popping drachmas.
function fxLayer() {
  let el = document.getElementById('inv-fx');
  if (!el) { el = document.createElement('div'); el.id = 'inv-fx'; document.body.appendChild(el); }
  return el;
}
const rectOf = (el) => el?.getBoundingClientRect?.() ?? null;
// An icon flies from one rectangle to another (equip).
function flyIcon(icon, from, to, color) {
  if (!from || !to) return;
  const g = document.createElement('div');
  g.className = 'inv-fly'; g.textContent = icon; g.style.setProperty('--rc', color);
  g.style.left = `${from.left}px`; g.style.top = `${from.top}px`; g.style.width = `${from.width}px`; g.style.height = `${from.height}px`;
  fxLayer().appendChild(g);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2), dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const k = to.width / Math.max(1, from.width);
  requestAnimationFrame(() => requestAnimationFrame(() => { g.style.transform = `translate(${dx}px, ${dy}px) scale(${k})`; g.style.opacity = '0.2'; }));
  setTimeout(() => g.remove(), 520);
}
// Drachmas pop out of a spot and fly to the counter (salvage).
function popCoins(from, to, n) {
  if (!from) return;
  const L = fxLayer(), cx = from.left + from.width / 2, cy = from.top + from.height / 2;
  const plus = document.createElement('div'); plus.className = 'inv-plus'; plus.textContent = tx('inventory.coinsGained', { n });
  plus.style.left = `${cx}px`; plus.style.top = `${cy}px`; L.appendChild(plus);
  setTimeout(() => plus.remove(), 1100);
  const count = Math.max(4, Math.min(12, Math.round(n / 6)));
  for (let i = 0; i < count; i++) {
    const c = document.createElement('div'); c.className = 'inv-coin'; c.textContent = '◆';
    c.style.left = `${cx}px`; c.style.top = `${cy}px`; L.appendChild(c);
    const a = (i / count) * Math.PI * 2, r = 30 + Math.random() * 30;
    const tx1 = Math.cos(a) * r, ty1 = Math.sin(a) * r - 30;
    const tx2 = to ? to.left + to.width / 2 - cx : tx1, ty2 = to ? to.top + to.height / 2 - cy : ty1 - 60;
    c.animate?.([{ transform: 'translate(0,0) scale(.6)', opacity: 1 }, { transform: `translate(${tx1}px,${ty1}px) scale(1.2)`, opacity: 1, offset: 0.45 }, { transform: `translate(${tx2}px,${ty2}px) scale(.5)`, opacity: 0.2 }], { duration: 700 + i * 40, easing: 'ease-in-out', fill: 'forwards' });
    setTimeout(() => c.remove(), 800 + i * 40);
  }
}
// Re-run a CSS animation class on an element.
function flash(el, cls) { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 900); }

// ---------------------------------------------------------------- the screen
export function openInventory(game, player, { forge = false } = {}) {
  const ui = game.ui, save = game.saveFor?.(player) ?? game.save;   // net: this player's profile
  let who = player, sel = null, filter = 'all';
  let after = null;   // what to animate once the screen is rebuilt
  let quiet = false;  // while rebuilding: focus moving by itself doesn't choose an item
  game.paused = true;
  const device = String(player.device ?? 'kbm');
  const hintKey = device.startsWith('pad') ? 'pad' : device === 'touch' ? 'touch' : 'kbm';
  const close = () => {
    for (const it of save.data.inventory) delete it.isNew;
    save.data.newCount = 0;
    save.write();
    ui.close('inventory'); game.paused = false; game.last = performance.now();
  };
  const apply = () => { for (const q of game.players) if (q.hero === who.hero) q.refreshLoadout(); };
  const scr = () => document.getElementById('scr-inventory');
  const byK = (k) => scr()?.querySelector(`[data-k="${k}"]`);
  // Rebuild, then focus `k` and play what `after` asks for.
  const redraw = (k) => {
    quiet = true; ui.refresh('inventory'); quiet = false;
    const el = k === 'grid0' ? scr()?.querySelector('.inv-grid .item') ?? byK('close') : k && byK(k);
    if (el) ui.setFocus(el);
    const a = after; after = null;
    if (a) requestAnimationFrame(() => a());
  };

  // ---- actions
  const equipTo = (it, slot) => {
    const S = save.hero(who.hero), gear = S.gear, b = itemInfo(it);
    const from = rectOf(byK('it-' + it.uid)) ?? rectOf(byK('equip'));
    const had = gear[slot];
    for (let i = 0; i < gear.length; i++) if (gear[i] === it.uid) gear[i] = null;   // (a magic item moving between its two slots)
    gear[slot] = it.uid; delete it.isNew;
    save.write(); apply(); game.audio?.ui('buy');
    toast(had ? tx('inventory.swapped', { name: b.name }) : tx('inventory.equips', { hero: HEROES[who.hero].name, name: b.name }));
    after = () => { const to = byK('slot-' + slot); flyIcon(b.icon, from, rectOf(to), itemRarity(it).color); setTimeout(() => flash(to, had ? 'swap-flash' : 'equip-flash'), 380); };
    redraw('slot-' + slot);
  };
  const unequip = (it) => {
    const gear = save.hero(who.hero).gear, i = gear.indexOf(it.uid); if (i < 0) return;
    gear[i] = null; save.write(); apply(); game.audio?.ui('back');
    after = () => flash(byK('it-' + it.uid), 'equip-flash');
    redraw('it-' + it.uid);
  };
  const salvage = (it) => {
    const d = save.data, b = itemInfo(it), coins = salvageValue(it), pts = spentPoints(it);
    if (save.hero(who.hero).gear.includes(it.uid)) { toast(tx('inventory.unequipFirst')); game.audio?.ui('back'); return; }
    const doIt = () => {
      const from = rectOf(byK('it-' + it.uid)) ?? rectOf(byK('salvage'));
      d.coins += coins; d.enchantPoints += pts;
      d.inventory = d.inventory.filter((x) => x !== it);
      for (const hs of Object.values(d.heroes)) hs.gear = hs.gear.map((u) => (u === it.uid ? null : u));
      sel = null; save.write(); game.audio?.coin?.();
      toast(pts ? tx('inventory.salvagedPoints', { coins, points: pts }) : tx('inventory.salvaged', { coins }));
      after = () => { const to = byK('coins'); popCoins(from, rectOf(to), coins); setTimeout(() => flash(to, 'ichip-pop'), 600); };
      redraw('grid0');
    };
    const other = wornBy(d, it.uid, who.hero);
    if (itemTier(it) !== 'common' || it.blessed || pts || other) {
      confirmDialog(game, { title: tx('inventory.salvageTitle'), text: (other ? tx('inventory.salvageWorn', { hero: HEROES[other]?.name ?? other }) + ' ' : '') + (pts ? tx('inventory.salvageTextPoints', { name: b.name, coins, points: pts }) : tx('inventory.salvageText', { name: b.name, coins })), yes: tx('inventory.salvageYes'), no: tx('inventory.salvageNo'), danger: true, onYes: doIt });
    } else doIt();
  };
  // A press on an item: show it, or (already shown) equip it.
  const press = (it) => {
    const gear = save.hero(who.hero).gear;
    if (sel !== it.uid) { sel = it.uid; game.audio?.ui('move'); showDetail(); return; }
    if (gear.includes(it.uid)) return;
    equipTo(it, slotFor(it, gear.map((u) => (u ? save.item(u) : null))));
  };

  let showDetail = () => {};
  ui.open('inventory', (el) => {
    const d = save.data, S = save.hero(who.hero), gear = S.gear;
    const cur = gear.map((u) => (u ? save.item(u) : null));
    const all = d.inventory.filter((it) => !gear.includes(it.uid));
    const items = sortItems(all.filter((it) => inFilter(it, filter)));
    const stats = gearStats(cur, who.hero).s;
    // ---- the header: level, drachmas, points, Power
    const chips = h('div', { class: 'inv-chips' },
      h('span', { class: 'ichip' }, tx('inventory.level', { n: d.level })),
      h('span', { class: 'ichip ic-coins', 'data-k': 'coins' }, coinText(tx('inventory.coins', { n: d.coins }))),
      h('span', { class: 'ichip ic-pts' + (d.enchantPoints ? ' has' : '') }, tn('inventory.points', d.enchantPoints)),
      h('span', { class: 'ichip ic-power', title: tx('inventory.heroPowerTip', { hero: HEROES[who.hero].name }) }, tx('inventory.heroPower', { n: stats.heroPower })));
    const heroes = editable(game, player);
    const heroRow = heroes.length > 1 ? h('div', { class: 'row inv-heroes' }, ...heroes.map((q) => h('button', { class: 'btn small' + (q === who ? ' primary' : ''), onclick: () => { who = q; sel = null; redraw(); } }, q.ai ? tx('inventory.companion', { hero: HEROES[q.hero].name }) : HEROES[q.hero].name))) : null;
    // ---- a tile
    const tile = (it, k, slotIdx = -1) => {
      const b = itemInfo(it), R = itemRarity(it), worn = slotIdx >= 0, other = worn ? null : wornBy(d, it.uid, who.hero);
      const up = !worn && isUpgrade(it, cur, who.hero), old = worn && isOutdated(it, d.level);
      const t = h('button', { class: `item ${itemTier(it)}${it.blessed ? ' blessed' : ''}${worn ? ' equipped' : ''}${sel === it.uid ? ' selected' : ''}${it.isNew ? ' new' : ''}`, 'data-k': k, style: `--rc:${R.color}`,
        'aria-label': tx(worn ? 'inventory.itemLabelEquipped' : 'inventory.itemLabel', { name: b.name, power: it.power }) + (up ? ' · ' + tx('inventory.better') : ''),
        onclick: () => press(it) },
        h('span', { class: 'ico' }, iconNode(b)), h('span', { class: 'pw' }, String(it.power)),
        old ? h('span', { class: 'badge-old', title: tx('inventory.outdatedTitle') }) : null,
        it.isNew ? h('span', { class: 'badge-new' }, tx('inventory.new')) : null,
        up ? h('span', { class: 'badge-up', title: tx('inventory.better') }, '▲') : null,
        b.hero === who.hero ? h('span', { class: 'badge-fav', title: tx('inventory.favouriteTitle', { hero: HEROES[who.hero].name }) }, '★') : null,
        other ? h('span', { class: 'badge-worn', title: tx('inventory.wornBy', { hero: HEROES[other]?.name ?? other }), style: `background:${HEROES[other]?.color ?? '#888'}` }) : null,
        worn ? h('span', { class: 'slot-label' }, SLOT_NAMES[slotIdx]) : null);
      t.addEventListener('navfocus', () => { if (!quiet && sel !== it.uid) { sel = it.uid; showDetail(); } });
      return t;
    };
    const eqRow = h('div', { class: 'slots-eq' }, ...cur.map((it, i) => it ? tile(it, 'slot-' + i, i)
      : h('button', { class: 'item empty', 'data-k': 'slot-' + i, title: SLOT_NAMES[i], onclick: () => { filter = i === 0 ? 'weapon' : i === 1 ? 'armor' : 'artifact'; redraw('grid0'); } },
        h('span', { class: 'slot-ico' }, SLOT_ICON[i]), h('span', { class: 'slot-name' }, SLOT_NAMES[i]))));
    const count = (k) => all.filter((it) => inFilter(it, k)).length;
    const tabs = h('div', { class: 'row inv-filters', role: 'tablist' }, ...FILTERS.map(([k, label]) => h('button', { class: 'btn small tab' + (filter === k ? ' primary' : ''), 'data-k': 'tab-' + k, role: 'tab', 'aria-selected': filter === k ? 'true' : 'false', onclick: () => { filter = k; redraw('tab-' + k); } }, tx('inventory.tabCount', { label, n: count(k) }))));
    const grid = h('div', { class: 'inv-grid' }, ...(items.length ? items.map((it) => tile(it, 'it-' + it.uid)) : [h('div', { class: 'hint' }, tx('inventory.empty'))]));
    // opening: the top of the stash (the newest, strongest find) is chosen and focused
    if (items.length && sel == null) grid.firstChild.setAttribute('data-autofocus', '');
    const detail = h('div', { class: 'detail', 'aria-live': 'polite' });
    // the hero in their gear (ui/heroPreview.js), with a weapon or armour chosen in the stash tried on
    const preview = () => {
      const g = gearOf(cur), it = sel ? save.item(sel) : null, b = it && itemInfo(it);
      let tryOn = null;
      if (it && !gear.includes(it.uid) && (b.kind === 'weapon' || b.kind === 'armor')) {
        if (b.kind === 'weapon') { g.weapon = b.id; g.tier = itemTier(it); } else g.armor = b.id;
        tryOn = tx('inventory.tryingOn');
      }
      return heroPreview(who.hero, g, { tryOn, label: tx('inventory.previewLabel', { hero: HEROES[who.hero].name }) });
    };

    // ---- the detail panel
    const enchLine = (id, level, extra = null, cls = '') => {
      const E = ENCHANTS[id]; if (!E) return null;
      return h('div', { class: 'ench ' + cls },
        h('div', { class: 'eh' }, h('span', { class: 'ei' }, E.icon ?? '✦'), h('b', {}, E.name), h('span', { class: 'lv' }, roman[level] ?? ''), extra ? h('span', { class: 'tag' }, extra) : null),
        h('div', { class: 'ep' }, tx(`enchantments.${id}.plain`)),
        h('div', { class: 'ed' }, E.desc(level)));
    };
    showDetail = () => {
      preview();
      for (const t of el.querySelectorAll('.item.selected')) t.classList.remove('selected');
      const it = sel ? save.item(sel) : null;
      for (const t of el.querySelectorAll('.item')) if (it && t.dataset.k === 'it-' + it.uid) t.classList.add('selected');
      for (let i = 0; i < 4; i++) if (it && gear[i] === it.uid) byK('slot-' + i)?.classList.add('selected');
      detail.textContent = '';
      if (!it) {
        detail.append(h('div', { class: 'iname' }, HEROES[who.hero].full), h('div', { class: 'hint' }, tx('inventory.choose')),
          ...STAT_LINES(stats).map(([l, v, k]) => h('div', { class: 'stat-line' }, l, h('b', {}, fmt(v, k)))));
        return;
      }
      const b = itemInfo(it), R = itemRarity(it), eqIdx = gear.indexOf(it.uid);
      const slot = eqIdx >= 0 ? eqIdx : slotFor(it, cur);
      const there = eqIdx >= 0 ? null : cur[slot];
      const alt = [...cur]; alt[slot] = it;
      const lines = eqIdx >= 0 ? [] : compareStats(stats, gearStats(alt, who.hero).s);
      const dp = there ? it.power - there.power : 0;
      const other = wornBy(d, it.uid, who.hero);
      const btn = (k, cls, label, fn, extra = {}) => h('button', { class: 'btn ' + cls, 'data-k': k, onclick: fn, ...extra }, label);
      const forgeRow = forge ? h('div', { class: 'row inv-forge' },
        btn('temper', 'small', coinText(tx('forge.temper', { n: TEMPER_STEP, cost: temperCost(it) })), () => {
          if (it.power >= temperCap(d.level)) { toast(tx('forge.temperCap')); return; }
          const c = temperCost(it); if (d.coins < c) { toast(tx('forge.noDrachmas')); return; }
          d.coins -= c; it.power += TEMPER_STEP; save.write(); apply(); game.audio?.impact?.(0.6);
          after = () => flash(byK('it-' + it.uid) ?? byK('slot-' + eqIdx), 'equip-flash');
          redraw('temper');
        }),
        // Reforge to level: straight up to what drops now (the rarer, the dearer)
        btn('reforge', 'small', canReforge(it, d.level) ? coinText(tx('forge.reforge', { power: reforgeTarget(it, d.level), cost: reforgeCost(it, d.level) })) : tx('forge.reforgeNone'), () => {
          if (!canReforge(it, d.level)) { toast(tx('forge.reforgeNone')); return; }
          const c = reforgeCost(it, d.level); if (d.coins < c) { toast(tx('forge.noDrachmas')); return; }
          d.coins -= c; reforge(it, d.level); save.write(); apply(); game.audio?.impact?.(0.8); game.audio?.upgrade?.();
          toast(tx('forge.reforged', { n: it.power }));
          after = () => flash(byK('it-' + it.uid) ?? byK('slot-' + eqIdx), 'equip-flash');
          redraw('reforge');
        }, canReforge(it, d.level) ? {} : { disabled: true })) : null;
      detail.append(...[
        h('div', { class: 'iname', style: `color:${R.color}` }, h('span', { class: 'big-ico' }, iconNode(b)), ` ${it.blessed ? tx('loot.blessedName', { name: b.name }) : b.name}`),
        h('div', { class: 'rar', style: `color:${R.color}` }, tx('inventory.rarityLine', { rarity: R.label, kind: KIND_LABEL[b.kind], power: it.power })),
        eqIdx >= 0 ? h('div', { class: 'cmp-chip same' }, tx('inventory.wearing')) : there ? h('div', { class: 'cmp-chip ' + (dp > 0 ? 'up' : dp < 0 ? 'down' : 'same') }, dp ? tx('inventory.powerVs', { arrow: dp > 0 ? '▲' : '▼', n: Math.abs(dp), name: itemInfo(there).name }) : tx('inventory.samePower', { name: itemInfo(there).name })) : h('div', { class: 'cmp-chip up' }, tx('inventory.fillsSlot', { slot: SLOT_NAMES[slot] })),
        other ? h('div', { class: 'hint' }, tx('inventory.wornBy', { hero: HEROES[other]?.name ?? other })) : null,
        eqIdx >= 0 && isOutdated(it, d.level) ? h('div', { class: 'cmp-chip down outdated' }, tx('inventory.outdated')) : null,
        b.hero && HEROES[b.hero] ? h('div', { class: 'fav' }, tx('inventory.favourite', { hero: HEROES[b.hero].name })) : null,
        h('div', { class: 'desc' }, b.desc, b.cd ? h('span', { class: 'cd' }, ' ' + tx('inventory.cooldown', { n: b.cd })) : null, (b.charges ?? 1) > 1 ? h('span', { class: 'cd' }, ' ' + tx('inventory.charges', { n: b.charges })) : null),
        // boons: the small rolled bonuses (loot.js BOONS)
        it.boons?.length ? h('div', { class: 'boons' }, h('div', { class: 'hint small' }, tx('inventory.boonsHeading')), ...it.boons.map((x) => h('div', { class: 'boon' }, h('b', {}, boonName(x)), ' ' + boonText(x)))) : null,
        // the action buttons first, so A and a tap are always close by
        h('div', { class: 'row inv-actions' },
          eqIdx >= 0
            ? btn('unequip', 'small', tx('inventory.unequip'), () => unequip(it))
            : btn('equip', 'primary', there ? tx('inventory.swapIn') : tx('inventory.equipBtn'), () => equipTo(it, slot)),
          b.kind === 'artifact' && eqIdx < 0 && cur[2] && cur[3] ? btn('equip2', 'small', tx('inventory.equip', { slot: SLOT_NAMES[slot === 2 ? 3 : 2] }), () => equipTo(it, slot === 2 ? 3 : 2)) : null,
          eqIdx < 0 ? btn('salvage', 'small danger', coinText(tx('inventory.salvage', { coins: salvageValue(it) })), () => salvage(it)) : null),
        forgeRow,
        eqIdx < 0 ? h('div', { class: 'cmp-box' },
          h('div', { class: 'hint' }, there ? tx('inventory.compareTitle', { name: itemInfo(there).name }) : tx('inventory.compareEmpty', { slot: SLOT_NAMES[slot] })),
          ...(lines.length ? lines.map((c) => h('div', { class: 'cmp ' + (c.up ? 'up' : 'down') }, h('span', { class: 'arrow' }, c.up ? '▲' : '▼'), h('span', { class: 'lbl' }, c.label), h('span', { class: 'ft' }, tx('inventory.fromTo', { from: c.from, to: c.to })), h('b', {}, (c.more ? '+' : '−') + c.by)))
            : [h('div', { class: 'cmp same' }, tx('inventory.compareSame'))])) : null,
        h('h3', {}, tn('inventory.enchantHeading', d.enchantPoints)),
        it.ench.length ? h('div', { class: 'hint small' }, tx('inventory.enchantHelp')) : null,
        ...it.ench.map((e, row) => {
          if (e.fixed) return enchLine(e.pick, e.level, tx('inventory.builtIn'), 'fixed');
          if (!e.pick) {
            return h('div', { class: 'ench-row' }, h('div', { class: 'hint' }, tx('inventory.chooseOne')), ...e.options.map((id, j) => {
              const E = ENCHANTS[id], cost = enchCost(id, 1);
              return h('button', { class: 'ench-opt' + (E.powerful ? ' powerful' : ''), 'data-k': `eo-${row}-${j}`, disabled: d.enchantPoints < cost ? true : undefined, onclick: () => {
                if (d.enchantPoints < cost) return; d.enchantPoints -= cost; e.pick = id; e.level = 1; save.write(); apply(); game.audio?.ui('buy');
                after = () => flash(byK(`en-${row}`), 'equip-flash'); redraw(`en-${row}`);
              } },
                h('span', { class: 'ei' }, E.icon ?? '✦'), h('span', { class: 'eo' }, h('b', {}, E.name + (E.powerful ? ' ✦' : '')), h('span', {}, tx(`enchantments.${id}.plain`)), h('small', {}, E.desc(1))), h('i', {}, tx('inventory.pointCost', { n: cost })));
            }), forge ? h('button', { class: 'btn small', 'data-k': `rr-${row}`, onclick: () => {
              const c = rerollCost(it); if (d.coins < c) { toast(tx('forge.noDrachmas')); return; }
              d.coins -= c; rerollRow(it, row); save.write(); game.audio?.ui('buy'); redraw(`rr-${row}`);
            } }, coinText(tx('forge.reroll', { cost: rerollCost(it) }))) : null);
          }
          const next = e.level + 1, cost = enchCost(e.pick, next);
          const line = enchLine(e.pick, e.level);
          line.dataset.k = `en-${row}`;
          line.append(e.level < 3 ? h('button', { class: 'btn small', 'data-k': `up-${row}`, disabled: d.enchantPoints < cost ? true : undefined, onclick: () => {
            if (d.enchantPoints < cost) return; d.enchantPoints -= cost; e.level = next; save.write(); apply(); game.audio?.ui('buy');
            after = () => flash(byK(`en-${row}`), 'equip-flash'); redraw(`up-${row}`);
          } }, tx('inventory.levelCost', { level: roman[next], cost })) : h('span', { class: 'hint' }, tx('inventory.max')));
          return line;
        }),
        it.blessed ? enchLine(it.blessed.id, 3, tx('inventory.godsBlessing'), 'blessed') : null,
      ].filter(Boolean));
    };
    showDetail();
    el.appendChild(h('div', { class: 'panel inv-panel inv2', style: 'width:min(1040px,97vw)' },
      h('div', { class: 'inv-head' }, h('h2', {}, forge ? tx('forge.title') : tx('inventory.title')), chips),
      forge ? h('div', { class: 'hint', style: 'margin:0 0 6px' }, tx('forge.help')) : null,
      heroRow,
      h('div', { class: 'inv' },
        h('div', { class: 'inv-left' }, h('h3', {}, tx('inventory.equipped', { hero: HEROES[who.hero].name })), h('div', { class: 'inv-hero' }, preview(), eqRow), tabs, h('div', { class: 'hint small' }, tx('inventory.sortHint')), grid),
        detail),
      h('div', { class: 'inv-foot' }, h('div', { class: 'hint' }, tx(`inventory.hints.${hintKey}`)), h('button', { class: 'btn', 'data-k': 'close', onclick: close }, tx('inventory.close')))));
  }, {
    dim: true, onBack: close,
    // X salvages the focused item, LB / RB (Q / E) change tabs
    onNav: () => {
      const pressed = navButtons(game);
      if (!pressed) return;
      if (pressed === 'tabL' || pressed === 'tabR') {
        const i = FILTERS.findIndex(([k]) => k === filter), j = (i + (pressed === 'tabR' ? 1 : FILTERS.length - 1)) % FILTERS.length;
        filter = FILTERS[j][0]; game.audio?.ui('move'); redraw('tab-' + filter);
      } else if (pressed === 'salvage') {
        const it = sel ? save.item(sel) : null;
        if (it) salvage(it);
      }
    },
  });
}

// Pad X / LB / RB and keys X / Delete / Q / E, on the frame they go down.
const prevNav = new Map();
function navButtons(game) {
  let out = null;
  const keys = game.input?.keys ?? new Set();
  const cur = { salvage: keys.has('KeyX') || keys.has('Delete'), tabL: keys.has('KeyQ'), tabR: keys.has('KeyE') };
  for (const p of game.input?.pads?.() ?? []) {
    cur.salvage ||= !!p.buttons[2]?.pressed; cur.tabL ||= !!p.buttons[4]?.pressed; cur.tabR ||= !!p.buttons[5]?.pressed;
  }
  for (const k in cur) { if (cur[k] && !prevNav.get(k)) out = k; prevNav.set(k, cur[k]); }
  return out;
}

// The forge in camp: the inventory with tempering and re-rolling.
export function openForge(game, player) { openInventory(game, player, { forge: true }); }
export { BLESSED };
