// Half-Blood Quests online protocol: constants and validation of everything
// that arrives from other players. Every presence and topic carries
// v: PROTO; anything else, or a malformed field, is ignored (never thrown on),
// so a bad packet can't put NaN into the physics or HTML into the page.
import { t } from '../text_config.js';
export const PROTO = 2;
export const GAME = 'halfbloodquests';
export const PEOPLE = 4;            // humans per room, across every browser
export const SOCKETS = 6;           // room capacity in connections (room for a lingering socket during a reconnect)
export const HZ = 15;               // hero and world updates per second
export const HEARTBEAT = 5;         // seconds between presence re-sends when nothing changes

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const num = (v, lo, hi, def = 0) => (typeof v === 'number' && Number.isFinite(v) ? clamp(v, lo, hi) : def);
export const int = (v, lo, hi, def = 0) => (typeof v === 'number' && Number.isFinite(v) ? clamp(Math.round(v), lo, hi) : def);
export const str = (v, max, def = '') => (typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, '').slice(0, max) : def);
export const ID_RE = /^[a-z0-9]{6,16}$/;
export const KEY_RE = /^(ai:[a-z_]{1,16}|[a-z0-9]{6,16})$/;
export const ROOM_RE = /^[A-Za-z0-9_-]{1,64}$/;
export const r2 = (v) => Math.round(v * 100) / 100;
export const r3 = (v) => Math.round(v * 1000) / 1000;
export function cleanName(s, def = t('profiles.demigod')) {
  const n = String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  return n || def;
}
// Room codes: five letters and digits that are hard to confuse when read out.
export const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newCode() { let s = ''; for (let i = 0; i < 5; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; return s; }
export const roomIdFor = (code) => 'hbq-' + code;
export function codeOf(roomId) { const m = /^hbq-([A-Z0-9]{5})(?:-g\d+)?$/.exec(String(roomId ?? '')); return m ? m[1] : null; }
export function baseOf(roomId) { const m = /^(.*)-g(\d+)$/.exec(String(roomId ?? '')); return m ? { base: m[1], gen: +m[2] } : { base: String(roomId ?? ''), gen: 0 }; }

// One hero in presence (the owner's view of it):
//   k key (profile id, or ai:<hero> for an AI companion)   i owner's player index   h hero id
//   n name   ai 1 if AI-driven   x y z   f facing   vx vy vz   hp mh   d 0 up / 1 downed / 2 dead
//   a action type   s action style   t action progress (0..1)   c Power (ce)   r dodge (1 rolling)
export function readHero(o) {
  if (!o || typeof o !== 'object' || typeof o.k !== 'string' || !KEY_RE.test(o.k)) return null;
  const x = o.x, y = o.y, z = o.z;
  if (![x, y, z].every((v) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 1e5)) return null;
  return {
    k: o.k, i: int(o.i, 0, 7), h: str(o.h, 16) || 'percy', n: cleanName(o.n), ai: o.ai === 1,
    x, y, z, f: num(o.f, -100, 100), vx: num(o.vx, -80, 80), vy: num(o.vy, -80, 80), vz: num(o.vz, -80, 80),
    hp: num(o.hp, -1e4, 1e5, 100), mh: num(o.mh, 1, 1e5, 100), d: int(o.d, 0, 2), a: str(o.a, 16) || null, s: str(o.s, 16) || null,
    t: num(o.t, 0, 1), c: num(o.c, 0, 1e4), r: o.r === 1,
  };
}
