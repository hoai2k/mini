// Names over heroes: online, every human's profile name (and "AI" companions),
// and on one screen with several players, each player's profile name. Plain
// DOM labels placed over the heroes' heads each frame; names come from other
// players, so they are set as text, never as HTML.
import * as THREE from 'three/webgpu';
import { HEROES } from '../heroes/index.js';

const v = new THREE.Vector3();

export class NameTags {
  constructor(game) {
    this.game = game;
    this.el = document.createElement('div');
    this.el.className = 'name-tags';
    this.el.setAttribute('aria-hidden', 'true');
    Object.assign(this.el.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '6', overflow: 'hidden' });
    document.body.appendChild(this.el);
    this.tags = new Map();   // player -> span
  }
  label(p) {
    const g = this.game, on = g.online;
    if (p.remote) return p.remote.ai ? `${HEROES[p.hero]?.name ?? p.hero} · AI` : (p.remote.missing ? `${p.remote.name} (reconnecting…)` : p.remote.name);
    const humans = g.players.filter((q) => !q.ai && !q.remote).length;
    if (p.ai) return on?.live ? `${HEROES[p.hero]?.name ?? p.hero} · AI${p.heldFor ? ' (holding)' : ''}` : null;
    if (!on?.live && humans < 2) return null;
    return g.profileName?.(p) ?? null;
  }
  update() {
    const g = this.game, cam = g.rig?.camera;
    const show = g.state === 'playing' && cam && !g.ui?.stack?.some((s) => !s.opts?.passive && s.id !== 'online');
    const seen = new Set();
    if (show) {
      const W = window.innerWidth, H = window.innerHeight;
      for (const p of g.players) {
        const text = p.dead ? null : this.label(p);
        if (!text) continue;
        v.set(p.pos.x, p.pos.y + (p.height ?? 1.8) + 0.55, p.pos.z).project(cam);
        if (v.z > 1 || v.x < -1.2 || v.x > 1.2 || v.y < -1.2 || v.y > 1.2) continue;
        let s = this.tags.get(p);
        if (!s) {
          s = document.createElement('span');
          Object.assign(s.style, { position: 'absolute', left: '0', top: '0', transform: 'translate(-50%,-100%)', font: '700 13px/1.1 "Alegreya Sans",sans-serif', color: '#fff', padding: '2px 7px', borderRadius: '9px', background: 'rgba(16,12,8,.62)', whiteSpace: 'nowrap', textShadow: '0 1px 2px #000' });
          this.el.appendChild(s); this.tags.set(p, s);
        }
        if (s.textContent !== text) s.textContent = text;
        s.style.borderBottom = `2px solid ${p.ai ? '#9a8a70' : p.color ?? '#fff'}`;
        s.style.opacity = p.downed ? '0.6' : '1';
        s.style.left = ((v.x + 1) / 2 * W).toFixed(1) + 'px';
        s.style.top = ((1 - v.y) / 2 * H).toFixed(1) + 'px';
        seen.add(p);
      }
    }
    for (const [p, s] of this.tags) if (!seen.has(p)) { s.remove(); this.tags.delete(p); }
  }
}
