// Side quests in the open world. People stand about the regions (added by
// each region's build with add.npc); talk to one to hear what they need. A
// quest is a list of steps, done in order:
//   { type: 'kill', kind?, count, region? }   beat monsters (any kind if no kind)
//   { type: 'collect', count }                pick up the quest's items (add.item({ quest }))
//   { type: 'reach', x, z, radius? }          go somewhere
//   { type: 'camp' | 'champion' | 'shrine' | 'chest', id }   clear / beat / win / open it
//   { type: 'return' }                        go back to the person who asked
// then a reward: { xp, coins, item: 'common' | 'rare' | 'heroic' | 'unique' } (no item rarity: the quest table).
// requires: [questId] — offered only once those are done.
//
// Text (js/text_config.js, sq.<questId>): title, offer: [lines], steps: [one
// line per step; {n} and {count} fill in], thanks: [lines]. People's names
// are people.<npcId>.
//
// Progress lives in save.data.ow.quests: { [id]: { step, n, done } }, and the
// quest the tracker shows in save.data.ow.track.
import * as THREE from 'three/webgpu';
import { h, toast } from '../ui/ui.js';
import { t } from '../text_config.js';
import { buildHeroModel, buildNpc } from '../entities/models.js';
import { buildMortal } from '../entities/mortals.js';
import { buildPerson, isPerson } from '../entities/people.js';
import { rollItem, powerFor } from '../loot.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export class Quests {
  constructor(game, ow) { this.game = game; this.ow = ow; this.people = new Map(); this.itemObjs = new Map(); this.list = []; }
  get data() { return this.ow.data.quests; }
  def(id) { return this.list.find((q) => q.id === id); }
  state(id) { return this.data[id] ?? null; }
  step(q) { const s = this.state(q.id); return s && !s.done ? q.steps[s.step] : null; }
  active() { return this.list.filter((q) => this.state(q.id) && !this.state(q.id).done); }
  available(q) { return !this.state(q.id) && (q.requires ?? []).every((r) => this.state(r)?.done); }
  // ---------------------------------------------------------------- setup
  setup() {
    const g = this.game, reg = this.ow.reg;
    this.list = reg.quests ?? [];
    for (const n of reg.npcs) {
      const rig = this.buildPerson(n.model);
      if (!rig) continue;
      rig.root.position.copy(n.pos); rig.root.rotation.y = n.yaw ?? 0;
      this.ow.addProp(rig.root);
      // a gold "!" over people with a quest to give, a grey "?" while one of theirs is under way
      const mark = makeMark(); mark.position.y = 2.7 * (rig.root.scale.y || 1); rig.root.add(mark);
      const person = { n, rig, mark, quests: this.list.filter((q) => q.giver === n.id) };
      this.people.set(n.id, person);
      g.interactables.push({ id: 'npc-' + n.id, pos: n.pos, radius: 2.6, label: t('ow.quest.talk', { name: n.name }), action: () => this.talk(person), enabled: () => !g.online?.isGuest });
    }
    for (const it of reg.items) { it.got = !!this.state(it.quest)?.got?.includes(it.id); this.itemObjs.set(it, null); }
    this.refresh();
  }
  dispose() { this.people.clear(); this.itemObjs.clear(); }
  buildPerson(model = 'mortal:farmer') {
    const [kind, id] = String(model).split(':');
    try {
      // npc:<id>: the open world's own people (people.js), else Chiron or Mr. D
      if (kind === 'npc') return isPerson(id) ? buildPerson(id) : buildNpc(id);
      if (kind === 'hero') return buildHeroModel(id);
      return buildMortal(id);
    } catch (e) { console.warn('openworld: no model for', model, e); return null; }
  }
  // ---------------------------------------------------------------- per frame
  update(dt) {
    const g = this.game;
    for (const p of this.people.values()) {
      if (!g.players.some((q) => q.pos.distanceTo(p.n.pos) < 40)) continue;
      p.rig.animate?.({ dt, speed: 0, vel: V(0, 0, 0), action: null });
      p.mark.rotation.y += dt * 2;
      // turn to face a hero who comes close
      const near = g.players.find((q) => !q.ai && q.pos.distanceTo(p.n.pos) < 5);
      if (near) { const want = Math.atan2(near.pos.x - p.n.pos.x, near.pos.z - p.n.pos.z); p.rig.root.rotation.y += Math.atan2(Math.sin(want - p.rig.root.rotation.y), Math.cos(want - p.rig.root.rotation.y)) * Math.min(1, dt * 6); }
    }
    for (const q of this.active()) {
      const st = this.step(q);
      if (st?.type === 'reach' && g.players.some((p) => !p.remote && Math.hypot(p.pos.x - (st.x + 0.5), p.pos.z - (st.z + 0.5)) < (st.radius ?? 5))) this.advance(q);
    }
  }
  // ---------------------------------------------------------------- talking
  talk(person) {
    const g = this.game;
    const mine = person.quests;
    const ready = mine.find((q) => this.step(q)?.type === 'return');
    const offer = mine.find((q) => this.available(q));
    const under = mine.find((q) => this.state(q.id) && !this.state(q.id).done);
    if (ready) return this.dialog(person, t(`sq.${ready.id}.thanks`), () => this.complete(ready), t('ow.quest.handIn'));
    if (offer) return this.dialog(person, t(`sq.${offer.id}.offer`), () => this.accept(offer), t('ow.quest.accept'), t('ow.quest.later'));
    if (under) return this.dialog(person, [this.stepText(under)], null, t('ow.quest.ok'));
    const done = mine.length && mine.every((q) => this.state(q.id)?.done);
    this.dialog(person, [t(done ? 'ow.quest.allDone' : 'ow.quest.nothing')], null, t('ow.quest.ok'));
    void g;
  }
  // A speech panel: the person's name, their lines, and one or two buttons.
  dialog(person, lines, onYes, yes, no = null) {
    const g = this.game, ui = g.ui, list = Array.isArray(lines) ? lines : [lines];
    const close = () => { ui.close('npc'); g.paused = false; };
    g.paused = true;
    ui.open('npc', (el) => {
      el.appendChild(h('div', { class: 'panel menu-col', role: 'dialog', 'aria-label': person.n.name, style: 'max-width:min(560px,94vw);text-align:left' },
        h('h2', {}, person.n.name),
        ...list.map((L) => h('p', { style: 'font-size:17px;line-height:1.45;margin:0 0 10px' }, L)),
        h('div', { style: 'display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;margin-top:6px' },
          no ? h('button', { class: 'btn', onclick: close }, no) : null,
          h('button', { class: 'btn primary', 'data-autofocus': true, onclick: () => { close(); onYes?.(); } }, yes))));
    }, { dim: true, onBack: close });
  }
  accept(q) {
    this.data[q.id] = { step: 0, n: 0, done: false };
    this.ow.data.track = q.id;
    toast(t('ow.quest.accepted', { title: t(`sq.${q.id}.title`) }), 'big');
    this.game.save.write?.();
    this.skipDone(q);
    this.refresh();
  }
  complete(q) {
    const g = this.game, st = this.data[q.id];
    st.done = true; st.step = q.steps.length;
    if (this.ow.data.track === q.id) this.ow.data.track = this.active()[0]?.id ?? null;
    const R = q.reward ?? {}, lvl = this.ow.lay.REGION[q.region]?.level?.[1] ?? 1;
    const xp = R.xp ?? 60 * lvl;
    for (const sv of g.localSaves()) if (sv.addXp(xp)) g.levelUp(sv);
    const giver = this.people.get(q.giver)?.n.pos ?? g.players[0].pos;
    g.pickups.coins(giver, R.coins ?? 20 * lvl, { fountain: true });
    const humans = g.players.filter((p) => !p.ai && !p.remote);
    for (const p of humans) {
      // the quest's own rarity if it names one, else the quest table (progression.js RARITY_WEIGHTS)
      const it = rollItem(powerFor(lvl, g.saveFor(p).data.level, Math.random, 'quest'), { ...(g.lootOpts?.(p, giver) ?? { hero: p.hero }), source: 'quest', rarity: ['unique', 'heroic', 'rare', 'common'].includes(R.item) ? R.item : null });
      setTimeout(() => g.loot.drop(it, giver, p), 400);
    }
    toast(t('ow.quest.completed', { title: t(`sq.${q.id}.title`), xp }), 'big');
    g.audio?.levelUp?.();
    g.save.write?.();
    this.refresh();
  }
  // ---------------------------------------------------------------- progress
  onEvent(ev) {
    for (const q of this.active()) {
      const st = this.step(q); if (!st) continue;
      if (st.type === 'kill' && ev.type === 'kill' && (!st.kind || st.kind === ev.kind || (Array.isArray(st.kind) && st.kind.includes(ev.kind))) && (!st.region || st.region === ev.region)) this.bump(q);
      else if (['camp', 'champion', 'shrine', 'chest'].includes(st.type) && ev.type === st.type && ev.id === st.id) this.advance(q);
    }
  }
  bump(q) {
    const s = this.data[q.id], st = q.steps[s.step];
    s.n++;
    if (s.n >= (st.count ?? 1)) this.advance(q);
    else { this.game.tracker && this.ow.data.track === q.id && this.trackGoal(); toast(this.stepText(q)); }
  }
  advance(q) {
    const s = this.data[q.id];
    s.step++; s.n = 0;
    this.skipDone(q);
    if (s.step < q.steps.length) toast(this.stepText(q));
    this.game.audio?.energy?.('heal');
    this.game.save.write?.();
    this.refresh();
  }
  // a step about a camp already cleared (and so on) when the quest is taken: done at once
  skipDone(q) {
    const s = this.data[q.id], d = this.ow.data;
    while (s.step < q.steps.length) {
      const st = q.steps[s.step];
      const done = (st.type === 'chest' && d.chests[st.id]);
      if (!done) break;
      s.step++;
    }
  }
  collect(it) {
    const q = this.def(it.quest); if (!q) return;
    const st = this.step(q); if (st?.type !== 'collect') return;
    this.game.fx.heal(it.pos, 0xffd84a); this.game.audio?.lootPickup?.('common');
    it.got = true;
    const s = this.data[q.id]; (s.got ??= []).push(it.id);   // (saved, so a picked-up item stays picked up)
    this.bump(q);
    this.refresh();
  }
  stepText(q) {
    const s = this.state(q.id), st = q.steps[s.step];
    const lines = t(`sq.${q.id}.steps`);
    const line = Array.isArray(lines) ? lines[s.step] ?? '' : '';
    return line.replace('{n}', s.n).replace('{count}', st?.count ?? 1);
  }
  // ---------------------------------------------------------------- what shows
  refresh() {
    const g = this.game;
    for (const p of this.people.values()) {
      const has = p.quests.some((q) => this.available(q) || this.step(q)?.type === 'return');
      const busy = p.quests.some((q) => this.state(q.id) && !this.state(q.id).done);
      p.mark.visible = has || busy;
      p.mark.userData.set(has ? 'gold' : 'grey');
    }
    // quest items show while their quest is on its collect step
    for (const [it, obj] of this.itemObjs) {
      const q = this.def(it.quest), want = q && this.step(q)?.type === 'collect' && !it.got;
      if (want && !obj) {
        const o = makeSparkle(); o.position.copy(it.pos); this.ow.addProp(o); this.itemObjs.set(it, o);
        g.interactables.push({ id: 'qitem-' + it.id, pos: it.pos, radius: 2, label: t('ow.quest.pickUp'), action: () => this.collect(it), enabled: () => !it.got && this.step(q)?.type === 'collect' });
      } else if (!want && obj) { obj.visible = false; }
      else if (want && obj) obj.visible = true;
    }
    this.trackGoal();
  }
  // The tracker: the tracked side quest's next place, else the next chapter (main.js updateCampGoal).
  trackGoal() {
    const g = this.game, id = this.ow.data.track, q = id && this.def(id);
    if (id && !q && this.data[id] && !this.data[id].done) { g.updateCampGoal?.(true); return; }   // (a quest of the other area: kept, the next chapter shows here)
    if (!q || !this.step(q)) { this.ow.data.track = this.active()[0]?.id ?? null; if (!this.ow.data.track) { g.updateCampGoal?.(true); return; } return this.trackGoal(); }
    const pos = this.stepPos(q);
    g.tracker?.setGoal({ title: t(`sq.${q.id}.title`), desc: this.stepText(q), pos, radius: 3 });
  }
  stepPos(q) {
    const st = this.step(q), reg = this.ow.reg, g = this.game;
    const by = (list, id) => list.find((x) => x.id === id)?.pos;
    switch (st.type) {
      case 'return': return this.people.get(q.giver)?.n.pos ?? null;
      case 'reach': return V(st.x + 0.5, g.world.groundBelow(st.x + 0.5, st.z + 0.5, g.world.sy - 1), st.z + 0.5);
      case 'camp': return by(reg.camps, st.id);
      case 'champion': return by(reg.champions, st.id);
      case 'shrine': return by(reg.shrines, st.id);
      case 'chest': return by(reg.chests, st.id);
      case 'collect': { const lead = g.players[0]?.pos; const left = reg.items.filter((it) => it.quest === q.id && !it.got); left.sort((a, b) => a.pos.distanceTo(lead) - b.pos.distanceTo(lead)); return left[0]?.pos ?? null; }
      default: { if (st.at) return V(st.at[0] + 0.5, g.world.groundBelow(st.at[0] + 0.5, st.at[1] + 0.5, g.world.sy - 1), st.at[1] + 0.5); return this.people.get(q.giver)?.n.pos ?? null; }
    }
  }
}

// A floating "!" over a person (gold: a quest to give or hand in; grey: one under way).
function makeMark() {
  const g = new THREE.Group();
  const gold = new THREE.MeshBasicNodeMaterial({ color: 0xffd23a }), grey = new THREE.MeshBasicNodeMaterial({ color: 0xb8b8b8 });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.16), gold); bar.position.y = 0.32;
  const dot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), gold);
  g.add(bar, dot);
  g.userData.set = (c) => { bar.material = dot.material = c === 'gold' ? gold : grey; };
  return g;
}
// A quest item lying about: a small glowing gold shard that bobs.
function makeSparkle() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), new THREE.MeshStandardNodeMaterial({ color: 0xffe080, emissive: 0xffb030, emissiveIntensity: 1.6, roughness: 0.3 }));
  m.position.y = 0.8; g.add(m);
  const t0 = Math.random() * 6;
  m.onBeforeRender = () => { const tt = performance.now() / 1000 + t0; m.position.y = 0.8 + Math.sin(tt * 2.4) * 0.15; m.rotation.y = tt * 1.6; };
  return g;
}
