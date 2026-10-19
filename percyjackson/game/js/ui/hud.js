// In-game HUD in the black-and-gold ornamental look: a hero card per human
// player (portrait, wave-scroll health, Power bar, round ability icons,
// Battle Sense pip), party portraits, the True Sight meter, the objective
// ribbon, the boss bar, drachmas, the Greek-key minimap frame and prompts.
import * as THREE from 'three/webgpu';
import { h } from './ui.js';
import { demigodText, GREEK } from './greekText.js';
import { HEROES } from '../heroes/index.js';
import { settings } from '../settings.js';
import { isMobile } from '../util.js';
import { ammoInfo } from '../resources.js';
import { PAD_LABEL, KEY_LABEL } from '../padmap.js';
import { t as tx, tn } from '../text_config.js';

const KEYS = KEY_LABEL;   // the keyboard layout (padmap.js)
const PADKEYS = PAD_LABEL;   // the Xbox layout (padmap.js)
const tmp = new THREE.Vector3();
const EYE = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M2 16C6 9 11 6 16 6s10 3 14 10c-4 7-9 10-14 10S6 23 2 16z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="16" r="5" fill="currentColor"/><circle cx="16" cy="16" r="2" fill="#17130f"/></svg>';
const COIN = '<svg viewBox="0 0 32 32" aria-hidden="true"><defs><radialGradient id="cg" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffe9a0"/><stop offset=".6" stop-color="#e0a93a"/><stop offset="1" stop-color="#8a5a14"/></radialGradient></defs><circle cx="16" cy="16" r="14" fill="url(#cg)" stroke="#6a4410" stroke-width="2"/><circle cx="16" cy="16" r="10" fill="none" stroke="#8a5a14" stroke-width="1.5"/><path d="M11 21V11h5a3.5 3.5 0 0 1 0 7h-5" fill="none" stroke="#6a4410" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" transform="translate(1 1) scale(.9)"/></svg>';
const heroName = (p) => HEROES[p.hero]?.name ?? p.hero;
const switchKey = (p) => (p?.device?.startsWith('pad') ? tx('hud.dpadDown') : p?.device === 'touch' ? '' : 'F');
const sightKey = (p) => (p?.device?.startsWith('pad') ? 'RS' : p?.device === 'touch' ? '' : 'V');

export class HUD {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('hud');
    this.build();
    this.t = 0;
  }
  build() {
    const r = this.root; r.innerHTML = '';
    this.cards = h('div', { class: 'pcards' }); r.appendChild(this.cards);
    this.sight = h('div', { class: 'sight hidden', role: 'img', 'aria-label': tx('hud.trueSight.meter') }, h('div', { class: 'ring' }, h('span', { class: 'eye', html: EYE })), h('span', { class: 'skey' }), h('span', { class: 'slabel' }, tx('hud.trueSight.label')));
    r.appendChild(this.sight);
    this.top = h('div', { class: 'topc' });
    this.obj = h('div', { class: 'ribbon hidden' }, h('div', { class: 't' }), h('div', { class: 'd' }));
    this.boss = h('div', { class: 'bossbar hidden' }, h('div', { class: 'n' }), h('div', { class: 'bbar' }, h('b'), h('i')));
    this.top.append(this.obj, this.boss); r.appendChild(this.top);
    this.mini = h('canvas', { class: 'minimap hidden', width: 128, height: 128, 'aria-label': tx('minimap.label') });
    r.appendChild(h('div', { class: 'mini-frame' }, this.mini));
    this.coins = h('div', { class: 'coins', 'aria-label': tx('hud.drachmas') }, h('span', { class: 'coin', html: COIN }), h('span', { class: 'n' }, '0'));
    r.appendChild(this.coins);
    this.join = h('div', { class: 'join-hint' }, isMobile ? '' : tx('hud.joinHint')); r.appendChild(this.join);
    this.prompts = new Map();
    this.says = [];   // speech bubbles over people (say())
    this.cardEls = []; this.partyEls = [];
    this.sig = '';
    this.objKey = '';
  }
  show(on) { this.root.classList.toggle('hidden', !on); }
  humans() { const g = this.game; const hs = g.players.filter((p) => !p.ai); return hs.length ? hs : g.players; }
  signature() {
    const g = this.game;
    return this.humans().map((p) => `${p.index}:${p.hero}:${p.device}:${p.kit?.constructor?.name}:${['t1', 't2', 't3'].map((k) => p.kit?.slots?.[k]?.power).join('.')}:${p.artifacts.map((a) => a.it.uid).join('.')}`).join('|') +
      '#' + (g.party ?? []).map((q) => q.hero + (q.ai ? 'a' : 'h')).join(',');
  }
  rebuildCards() {
    this.cards.innerHTML = ''; this.cardEls = []; this.partyEls = [];
    const hs = this.humans();
    this.cards.classList.toggle('multi', hs.length > 1);
    for (const p of hs) this.cards.appendChild(this.buildCard(p));
    const party = this.game.party;
    if (party && party.some((q) => q.ai)) this.cards.appendChild(this.buildParty(hs.find((q) => !q.remote) ?? hs[0], party));   // net: also with two humans (the shared companion)
    this.sig = this.signature();
  }
  buildCard(p) {
    const info = HEROES[p.hero] ?? { name: p.hero, color: '#c9963a' };
    const color = info.color ?? p.color;
    const hpI = h('i'), hpB = h('b'), pwI = h('i');
    const hpTxt = h('span', { class: 'bt' });
    const extra = h('span', { class: 'ex' });
    const bs = h('span', { class: 'bs', title: tx('hud.battleSense'), 'aria-label': tx('hud.battleSense') });
    // the hero's face (preloaded with the title, ui/art.js); a missing picture leaves the hero's colour
    const port = h('div', { class: 'port has-face', style: `--hc:${color};background-image:url(assets/heroes/${p.hero}-face.jpg)` }, bs);
    const hp = h('div', { class: 'hbar hp' }, hpB, hpI, hpTxt);
    const pw = h('div', { class: 'hbar pw', title: tx('hud.power') }, pwI);
    const abs = h('div', { class: 'hc-abs' });
    const card = h('div', { class: 'hcard', style: `--pc:${p.color};--hc:${color}` }, port,
      h('div', { class: 'hc-main' }, h('div', { class: 'hc-name' }, h('span', {}, this.humans().length > 1 ? tx('hud.playerName', { n: p.index + 1, name: info.name }) : info.name), extra), hp, pw, abs));
    const els = this.buildAbilities(p, abs);
    const c = { p, hpI, hpB, hpTxt, pwI, pw, extra, bs, port, card, els, last: {} };
    this.cardEls.push(c);
    return card;
  }
  buildAbilities(p, row) {
    const keys = p.device?.startsWith('pad') ? PADKEYS : KEYS;
    const els = {};
    const mk = (slot, ab, ult = false) => {
      const cd = h('div', { class: 'cd' }), cnt = h('div', { class: 'cnt' });
      const el = h('div', { class: 'ab' + (ult ? ' ult' : ''), title: ab?.name ?? '', role: 'img', 'aria-label': ab?.name ?? slot }, h('span', { class: 'ic' }, ab?.icon ?? '·'), cd, cnt, h('div', { class: 'key' }, keys[slot] ?? ''));
      row.appendChild(el); els[slot] = { el, cd, cnt };
    };
    const k = p.kit;
    for (const slot of ['ranged', 't1', 't2', 't3']) {
      if (!k?.slots?.[slot]) continue;
      mk(slot, k.slots[slot]);
      // the quiver: shots left for the basic ranged attack, next to its slot
      if (slot === 'ranged') {
        const n = h('b', {}, String(p.ammo ?? ''));
        const el = h('div', { class: 'ammo', title: tx('hud.quiver', { name: ammoInfo(p.hero).name }), role: 'img', 'aria-label': tx('hud.ammo') }, h('span', { class: 'ai' }, ammoInfo(p.hero).icon), n);
        row.appendChild(el); els.ammo = { el, n, ammo: true };
      }
    }
    mk('heal', { name: tx('hud.ambrosia'), icon: '🟨' });
    p.artifacts.forEach((a, i) => mk('art' + (i + 1), { name: a.base.name, icon: a.base.icon }));
    if (k?.domain) mk('domain', { name: tx('hud.godlyPower', { name: k.domain.name }), icon: k.domain.icon ?? '⚡' }, true);
    return els;
  }
  buildParty(human, party) {
    const wrap = h('div', { class: 'party-strip' });
    const row = h('div', { class: 'pm-row' });
    for (const q of party) {
      if (q === human || (!q.ai && this.humans().length > 1)) continue;   // net: with several humans, only the companions
      const info = HEROES[q.hero] ?? { name: q.hero, color: '#999' };
      const el = h('div', { class: 'pm has-face', title: info.name, role: 'img', 'aria-label': tx('hud.companion', { name: info.name }), style: `--hc:${info.color};--face:url(assets/heroes/${q.hero}-face.jpg)` });
      row.appendChild(el); this.partyEls.push({ q, el, last: -1 });
    }
    const k = switchKey(human);
    wrap.append(row, k ? h('div', { class: 'switch' }, h('b', {}, k), tx('hud.switch')) : null);
    return wrap;
  }
  setObjective(title, desc) {
    this.obj.classList.toggle('hidden', !title);
    const key = (title || '') + '\u0001' + (desc || '');
    if (key === this.objKey) return;
    this.objKey = key;
    const [t, d] = this.obj.children;
    // (an instruction: plain English, readable at once)
    t.textContent = title || ''; d.textContent = title ? desc || '' : '';
  }
  setBoss(boss) {
    this.bossRef = boss;
    this.boss.classList.toggle('hidden', !boss);
    // the boss's name appears in Greek letters and settles into English
    const name = boss ? boss.displayName ?? boss.name : null;
    if (boss && (this.bossShown?.b !== boss || this.bossShown.name !== name)) { this.bossShown = { b: boss, name }; this.bossH?.cancel?.(); this.bossH = demigodText(this.boss.children[0], name, { timing: GREEK.boss }); }
    if (!boss) this.bossShown = null;
  }
  // A speech bubble over someone (a person in the Mist telling a hero off), for `secs`.
  // o.boss: a boss speaking (chapter 1's Mrs. Dodds): a wider, darker bubble that stays up
  // while she isn't in disguise.
  say(ent, text, secs = 2.4, o = {}) {
    const old = this.says.find((s) => s.ent === ent); if (old) { old.el.remove(); this.says.splice(this.says.indexOf(old), 1); }
    const el = h('div', { class: o.boss ? 'say boss' : 'say', role: 'status' }, text);
    this.root.appendChild(el);
    this.says.push({ ent, el, t: secs, any: !!o.boss });
    this.placeSays(0);
  }
  placeSays(dt) {
    for (let i = this.says.length - 1; i >= 0; i--) {
      const s = this.says[i]; s.t -= dt;
      if (s.t <= 0 || s.ent.dead || (!s.any && !s.ent.disguised)) { s.el.remove(); this.says.splice(i, 1); continue; }
      const v = tmp.set(s.ent.pos.x, s.ent.pos.y + (s.any ? (s.ent.hover ?? 0) + (s.ent.height ?? 3) * 0.85 : (s.ent.height ?? 1.9) + 0.5), s.ent.pos.z).project(this.game.rig.camera);
      s.el.style.left = ((v.x * 0.5 + 0.5) * window.innerWidth).toFixed(0) + 'px';
      // (a boss's line never tucks under the objective ribbon and the boss bar)
      s.el.style.top = Math.max(s.any ? s.el.offsetHeight + 120 : 0, (-v.y * 0.5 + 0.5) * window.innerHeight).toFixed(0) + 'px';
      s.el.classList.toggle('out', s.t < 0.3 || v.z > 1);
    }
  }
  // world-anchored prompt ("E  Talk")
  prompt(id, pos, text, onTap) {
    let el = this.prompts.get(id);
    if (!el) { el = h('div', { class: 'prompt' }); if (onTap) el.addEventListener('pointerdown', (e) => { e.stopPropagation(); onTap(); }); this.root.appendChild(el); this.prompts.set(id, el); }
    if (el.textContent !== text) el.textContent = text;
    el.dataset.seen = '1';
    const v = tmp.copy(pos).project(this.game.rig.camera);
    el.style.left = ((v.x * 0.5 + 0.5) * window.innerWidth) + 'px';
    el.style.top = ((-v.y * 0.5 + 0.5) * window.innerHeight) + 'px';
  }
  update(dt) {
    const g = this.game;
    this.t += dt;
    for (const [id, el] of this.prompts) { if (!el.dataset.seen) { el.remove(); this.prompts.delete(id); } else delete el.dataset.seen; }
    if (this.says.length) this.placeSays(dt);
    if (this.sig !== this.signature()) this.rebuildCards();
    const bsOn = settings.battleSense !== false;
    for (const c of this.cardEls) {
      const p = c.p;
      const hp = Math.max(0, p.hp / p.maxHp), pw = Math.min(1, (p.ce ?? p.power ?? 0) / (p.maxCe ?? p.maxPower ?? 100));
      if (c.last.hp !== hp) { c.hpI.style.width = (hp * 100).toFixed(1) + '%'; c.hpB.style.width = (hp * 100).toFixed(1) + '%'; c.last.hp = hp; c.hpTxt.textContent = `${Math.ceil(Math.min(p.hp, p.maxHp))} / ${Math.ceil(p.maxHp)}`; c.card.classList.toggle('low', hp < 0.3 && hp > 0); }
      if (c.last.pw !== pw) { c.pwI.style.width = (pw * 100).toFixed(1) + '%'; c.pw.classList.toggle('full', pw >= 1); c.last.pw = pw; }
      const ex = p.dead ? tx('hud.down') : p.downed ? tx('hud.revive', { n: Math.ceil(p.downT) }) : '';
      if (c.last.ex !== ex) { c.extra.textContent = ex; c.last.ex = ex; }
      const bs = bsOn && p.battleSense !== undefined ? Math.max(0, Math.min(1, p.battleSense)) : -1;
      if (c.last.bs !== bs) { c.last.bs = bs; c.bs.classList.toggle('hidden', bs < 0); c.bs.style.setProperty('--m', (bs * 360).toFixed(0) + 'deg'); c.bs.classList.toggle('ready', bs >= 1); }
      for (const slot in c.els) {
        const e = c.els[slot];
        if (e.ammo) {
          // the quiver count: amber when low, red and flashing when empty (or a dry click)
          const a = p.ammo ?? 0, mx = p.ammoMax ?? 1, key = `${a}/${mx}/${p.dryFlashT > 0}`;
          p.dryFlashT = Math.max(0, (p.dryFlashT ?? 0) - dt);
          if (e.last !== key) { e.last = key; e.n.textContent = String(a); e.el.classList.toggle('low', a > 0 && a <= mx * 0.25); e.el.classList.toggle('empty', a <= 0); e.el.classList.toggle('dry', p.dryFlashT > 0); }
          if (p.device === 'touch') g.touch?.setCount?.('ranged', String(a));
          continue;
        }
        let frac = 0, ready = true, cnt = '';
        if (slot === 'heal') {
          // one flask: a radial fill while it refills, a glow when it's ready and you're hurt
          const f = p.flask ?? { left: 0, max: 1 };
          frac = f.max > 0 ? f.left / f.max : 0; ready = f.left <= 0;
          cnt = ready ? '' : String(Math.ceil(f.left));
          e.el.classList.toggle('want', ready && !p.dead && !p.downed && p.hp < p.maxHp * 0.7);
        }
        else if (slot.startsWith('art')) { const a = p.artifacts[+slot[3] - 1]; if (!a) continue; ready = (a.charges ?? 1) > 0; frac = ready ? 0 : a.cdLeft / (a.cd * (1 - p.stats.cdr)); if ((a.maxCharges ?? 1) > 1) cnt = String(a.charges ?? 0); }   // (charges: gearEffects.js)
        else if (slot === 'domain') { frac = 1 - pw; ready = pw >= 1 && !g.domain; }
        else { const ab = p.kit.slots[slot]; if (!ab) continue; frac = ab.cdLeft / Math.max(0.01, ab.cd * p.kit.cdr); ready = ab.cdLeft <= 0 && (p.ce ?? 0) >= (ab.ce ?? 0); if (ab.maxCharges > 1) cnt = String(ab.chargesLeft ?? ''); }
        e.cd.style.setProperty('--p', (Math.min(1, frac) * 100).toFixed(0) + '%');
        e.el.classList.toggle('ready', ready);
        if (e.cnt.textContent !== cnt) e.cnt.textContent = cnt;
        if (p.device === 'touch') g.touch?.setCooldown(slot, Math.min(1, frac), ready);
      }
    }
    for (const pe of this.partyEls) {
      const q = pe.q, f = q.dead ? 0 : Math.max(0, q.hp / q.maxHp), k = f.toFixed(2);
      if (pe.last !== k) { pe.last = k; pe.el.style.setProperty('--m', (f * 360).toFixed(0) + 'deg'); pe.el.classList.toggle('down', !!(q.dead || q.downed)); pe.el.classList.toggle('low', f > 0 && f < 0.3); }
    }
    // True Sight meter (hidden when there is no Mist in this place)
    const mist = g.mist, showSight = !!mist && mist.thickness > 0;
    this.sight.classList.toggle('hidden', !showSight);
    if (showSight) {
      const m = Math.max(0, Math.min(1, mist.meter ?? 0));
      this.sight.style.setProperty('--m', (m * 360).toFixed(0) + 'deg');
      this.sight.classList.toggle('active', !!mist.active); this.sight.classList.toggle('low', m < 0.2);
      const sk = this.sight.querySelector('.skey'), key = sightKey(this.humans()[0]);
      if (sk.textContent !== key) sk.textContent = key;
    }
    // boss
    if (this.bossRef) {
      const b = this.bossRef; const f = Math.max(0, b.hp / b.maxHp);
      this.boss.querySelector('i').style.width = (f * 100).toFixed(1) + '%';
      this.boss.querySelector('b').style.width = (f * 100).toFixed(1) + '%';
      if (b.dead) this.setBoss(null);
    }
    const coins = g.run?.coins ?? g.save?.data?.coins ?? 0;
    if (this.lastCoins !== coins) { this.coins.querySelector('.n').textContent = String(coins); this.lastCoins = coins; }
    const canJoin = !isMobile && g.players.length < 4 && g.state === 'playing';
    this.join.classList.toggle('hidden', !canJoin);
  }
}
