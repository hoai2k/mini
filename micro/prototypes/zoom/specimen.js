// The whole zoom chain as ONE multi-scale specimen: a bog pool's edge with a
// Sphagnum capitulum, whose leaves carry a water film, whose tip dips into the
// pool, where a biofilm coats a leaf, where a bacterium carries phages. Every
// world is a scale band of this one specimen (plus its protagonist), so the
// thing being zoomed into IS the next world: the hand-off cannot cut to an
// unrelated picture. Each layer lives in its own frame (µm, origin at the zoom
// target that leads into it) so float precision holds from 18 mm down to
// 0.6 µm, and fades in or out by pixel size (sub-pixel things keep their
// integrated amount, so a biofilm reads as texture before its cells resolve).
//
// Output: the specimen field of shared/techniques/zoom-optics.js (optical
// path, scatter, height, coverage · absorbance, fluorophore · albedo, gloss).
import { CHAIN_CONST } from './chain.js';

const v2 = (a) => `vec2(${a[0].toFixed(3)}, ${a[1].toFixed(3)})`;

export const FIELD_VS = /* glsl */ `
precision highp float;
in vec3 position;
out vec2 vUv;
void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export const FIELD_FS = /* glsl */ `
precision highp float;
in vec2 vUv;
uniform vec2 uCenter, uHalf;
uniform float uPx, uTime, uHBase;
uniform vec2 uOff[6];
uniform vec4 uCr[6];   // x, y, heading, gait phase (native frame)
uniform vec4 uCrB[6];  // state, visible, base height, extra
uniform vec4 uLayers;  // lawn, algae, bacteria, host
uniform vec3 uBgAlb;
uniform vec4 uMisc;    // x host swell, y springtail ripple time, z leaf top height near the biofilm
layout(location = 0) out vec4 o0;
layout(location = 1) out vec4 o1;
layout(location = 2) out vec4 o2;

#define PI 3.14159265
const vec2 CAP0 = ${v2(CHAIN_CONST.cap0)};
const float CAPR = ${CHAIN_CONST.capR.toFixed(1)};
const float GRID = ${CHAIN_CONST.capGrid.toFixed(1)};
const vec2 T1 = ${v2(CHAIN_CONST.T1)};      // frame 1: the wet axil (the tun)
const vec2 T2W1 = ${v2(CHAIN_CONST.T2W1)};  // frame 1: the leaf tip in the pool
const vec2 T3W3 = ${v2(CHAIN_CONST.T3W3)};  // frame 3: the biofilm patch
const vec2 HOST = ${v2(CHAIN_CONST.host)};  // frame 5: the host cell's centre
const float HOSTR = ${CHAIN_CONST.hostR.toFixed(4)};
const float HOSTL = ${CHAIN_CONST.hostL.toFixed(4)};

struct S { float opd, scat, h, cov; vec3 ab; float fl; vec3 alb; float gloss; };

// ---------- helpers ----------
float hash11(float p) { p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
float sdEll(vec2 p, vec2 r) { float k0 = length(p / r); float k1 = length(p / (r * r)); return k0 * (k0 - 1.0) / max(k1, 1e-9); }
float sdSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
/** Anti-aliased coverage of a signed distance (µm). */
float cover(float d) { return clamp(0.5 - d / uPx, 0.0, 1.0); }
/** A round body of radius r at distance d from its axis/centre: chord (thickness) and coverage,
    widened to a pixel with its integrated amount kept when it is finer than that. */
vec2 thin(float d, float r) {
  float r2 = max(r, 0.6 * uPx);
  float k = r / r2;
  float c = clamp(0.5 - (d - r2) / uPx, 0.0, 1.0);
  float ch = 2.0 * sqrt(max(r2 * r2 - d * d, 0.0)) * k;
  return vec2(ch, c * k);
}
void put(inout S s, float m, float h, vec3 alb, float gloss) {
  s.h = mix(s.h, max(s.h, h), m); s.alb = mix(s.alb, alb, m); s.gloss = mix(s.gloss, gloss, m); s.cov = max(s.cov, m);
}
void optic(inout S s, float opd, vec3 ab, float fl) { s.opd += opd; s.ab += ab; s.fl += fl; }

// ---------- the Sphagnum lawn (frame 1, µm) ----------
float edgeX(float y) { return -1250.0 + 600.0 * sin((y + 600.0) / 5000.0) + 150.0 * sin(y / 1300.0 + 2.0); }
float capDome(float s, float R) { float x = s / R; return 500.0 + 2400.0 * max(1.0 - x * x, 0.0); }

struct Leaf { float h, c, L, W, seed, s, k; vec2 uv; vec3 col; };

void capLeaves(vec2 q, float R, float seed, vec3 col, inout Leaf best) {
  float r = length(q);
  if (r > R + 900.0) return;
  float a = atan(q.y, q.x);
  const float NB = 12.0;
  float sec = 2.0 * PI / NB;
  float tw = 0.45 * r / R + seed * 6.2832;
  float k0 = floor((a - tw) / sec + 0.5);
  for (int dk = -1; dk <= 1; dk++) {
    float k = k0 + float(dk);
    float da = a - (k * sec + tw);
    da = mod(da + PI, 2.0 * PI) - PI;
    vec2 st = vec2(r, r * da);
    float hk = hash12(vec2(mod(k, NB), seed * 31.0));
    const float SP = 260.0;
    float m0 = floor(st.x / SP);
    for (int dm = -2; dm <= 1; dm++) {
      float m = m0 + float(dm);
      if (m < 1.0) continue;
      float sm = (m + 0.5) * SP;
      if (sm > R) continue;
      float side = mod(m, 2.0) < 1.0 ? 1.0 : -1.0;
      float hm = hash12(vec2(mod(k, NB) * 7.0 + m, seed * 13.0));
      float L = 640.0 + 260.0 * hm, W = 300.0 + 70.0 * hm;
      float phi = side * (0.4 + 0.18 * hm);
      vec2 uv = rot(phi) * (st - vec2(sm, side * 45.0));
      vec2 e = vec2(uv.x - L * 0.47, uv.y * (1.0 + 0.5 * clamp(uv.x / L, 0.0, 1.0)));
      float d = sdEll(e, vec2(L * 0.5, W * 0.5));
      float c = cover(d);
      if (c <= 0.0) continue;
      float u = clamp(uv.x / L, 0.0, 1.0);
      float h = capDome(sm, R) + 80.0 * (hk - 0.5) + 26.0 * (1.0 - pow(clamp(uv.y / (W * 0.5), -1.0, 1.0), 2.0)) - 120.0 * u * u - 18.0 * m;
      if (h > best.h) { best.h = h; best.c = c; best.L = L; best.W = W; best.seed = hm + seed; best.s = sm; best.k = k; best.uv = uv;
        best.col = col * (0.78 + 0.44 * hm) * mix(1.0, 1.25, u * u); }
    }
  }
}

/** The leaf cell lattice (hyaline lens cells in a green chlorophyllose network), leaf-local µm. */
void lattice(vec2 uv, out float hyal, out float wall, out float pore, out float fib) {
  const float CL = 118.0, CW = 30.0;
  float row = floor(uv.y / CW);
  float sh = mod(row, 2.0) * 0.5 * CL;
  float cu = (fract((uv.x + sh) / CL) - 0.5) * CL;
  float cv = (fract(uv.y / CW) - 0.5) * CW;
  float hw = (CW * 0.5 - 3.6) * pow(max(1.0 - pow(2.0 * cu / CL, 2.0), 0.0), 0.55);
  float dl = abs(cv) - hw;
  float aa = max(uPx, 0.4);
  hyal = clamp(0.5 - dl / aa, 0.0, 1.0);
  wall = exp(-pow(dl / max(1.4, aa), 2.0));
  float ps = mod(row, 2.0) < 1.0 ? 1.0 : -1.0;
  pore = clamp(0.5 - (length(vec2(cu - ps * CL * 0.24, cv)) - 4.2) / aa, 0.0, 1.0) * hyal;
  fib = hyal * smoothstep(0.55, 0.9, abs(sin((uv.x + uv.y * 0.35) * PI / 5.5))) * (1.0 - smoothstep(0.6, 1.4, uPx));
}

void lawn(vec2 p, inout S s) {
  float ex = edgeX(p.y);
  bool water = p.x < ex;
  Leaf best; best.h = -1e9; best.c = 0.0;
  vec2 g = (p - CAP0) / GRID;
  vec2 i0 = floor(g);
  for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++) {
    vec2 id = i0 + vec2(float(i), float(j));
    bool home = id.x == 0.0 && id.y == 0.0;
    vec2 jit = home ? vec2(0.0) : (hash22(id + 3.1) - 0.5) * 1800.0;
    vec2 c = CAP0 + id * GRID + jit;
    if (!home && c.x < edgeX(c.y) + 1800.0) continue;
    float hs = hash12(id + 9.7);
    float R = home ? CAPR : CAPR * (0.85 + 0.3 * hs);
    vec3 col = hs < 0.4 ? vec3(0.20, 0.36, 0.08) : hs < 0.75 ? vec3(0.50, 0.40, 0.12) : vec3(0.42, 0.11, 0.09);
    if (home) col = vec3(0.30, 0.40, 0.10);
    capLeaves(p - c, R, hs, col, best);
  }
  // under the leaves: the pool, or the deep lawn
  float rip = 0.0;
  if (water) {
    vec2 sp = uCr[0].xy;
    float dsp = length(p - sp);
    rip = 9.0 * sin(dsp / 85.0 - uMisc.y * 7.0) * exp(-dsp / 1600.0) * smoothstep(250.0, 500.0, dsp)
        + 3.0 * (fbm(p / 900.0 + uTime * 0.05) - 0.5);
    s.h = rip; s.alb = vec3(0.032, 0.024, 0.014); s.gloss = 1.0; s.cov = 0.0;
  } else {
    float n = fbm(p / 300.0);
    s.h = 150.0 + 220.0 * n; s.alb = vec3(0.05, 0.06, 0.03) * (0.6 + n); s.gloss = 0.05; s.cov = 1.0;
    s.ab += vec3(2.5);
  }
  // the water film in the axil, running down the leaf to the pool (frame 1)
  float fd = min(length(p - T1) - 330.0 - 40.0 * (fbm(p / 120.0) - 0.5), sdSeg(p, T1, T2W1) - 95.0);
  float wet = water ? 1.0 : smoothstep(0.0, 70.0, -fd);
  float tf = 28.0 * smoothstep(0.0, 70.0, -fd);
  if (best.c > 0.0) {
    float lf = 1.0 - smoothstep(5.0, 12.0, uPx);
    float hy, wa, po, fi;
    lattice(best.uv, hy, wa, po, fi);
    hy = mix(0.55, hy, lf); wa *= lf; po *= lf;
    float green = 1.0 - hy;
    float relief = 3.0 * wa - 2.5 * hy * lf - 6.0 * po + 0.8 * fi;
    float h = best.h + relief * (1.0 - 0.7 * wet) + tf;
    vec3 alb = mix(best.col, vec3(0.70, 0.72, 0.58), 0.28 * hy) * (1.0 - 0.15 * wa);
    alb *= mix(1.0, 0.75, wet);
    float m = best.c;
    s.h = mix(s.h, h, m); s.alb = mix(s.alb, alb, m); s.gloss = mix(s.gloss, mix(0.12, 1.0, wet), m); s.cov = max(s.cov, m);
    float thick = 15.0;
    s.opd += m * (0.04 * thick + 0.25 * wa - 0.45 * po + 0.08 * fi);
    s.ab = mix(s.ab, vec3(0.0), m) + m * green * vec3(0.55, 0.16, 0.62) * (best.col.r > 0.38 && best.col.g < 0.2 ? 1.6 : 1.0);
    s.scat += m * 0.2 * wa;
    // spores and hyphae on the leaves (frame 1), resolved below ~8 µm per pixel
    if (uPx < 9.0) {
      vec2 cid = floor(p / 70.0);
      float hs = hash12(cid + 5.5);
      if (hs < 0.16) {
        vec2 c = (cid + 0.5 + (hash22(cid) - 0.5) * 0.6) * 70.0;
        float r = 4.0 + 5.0 * hash12(cid + 1.3);
        vec2 t = thin(length(p - c), r);
        put(s, t.y * m, s.h + t.x * 0.6, vec3(0.55, 0.46, 0.32), 0.1);
        optic(s, t.x * 0.05 * m, t.x * vec3(0.02, 0.035, 0.06) * m, 0.0);
      }
      float yh = -430.0 + 240.0 * sin(p.x / 410.0) + 60.0 * sin(p.x / 97.0);
      float dh = abs(p.y - yh) / sqrt(1.0 + pow(240.0 / 410.0 * cos(p.x / 410.0), 2.0));
      vec2 hy2 = thin(dh, 2.3);
      float onH = step(-1900.0, p.x) * step(p.x, 600.0);
      put(s, hy2.y * m * onH, s.h + hy2.x * 0.8, vec3(0.72, 0.70, 0.62), 0.1);
      optic(s, hy2.x * 0.04 * m * onH, vec3(hy2.x * 0.01) * m * onH, 0.0);
    }
  }
  // optical path is measured against water: dry leaf surfaces sit in air (an
  // offset that only shows where the film's meniscus changes it)
  s.opd += -10.0 * (1.0 - wet);
  s.gloss = max(s.gloss, wet * 0.9);
}

// ---------- algae and detritus in the pool (frame 3, µm) ----------
void algae(vec2 p, inout S s) {
  const float G = 230.0;
  vec2 i0 = floor(p / G);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 id = i0 + vec2(float(i), float(j));
    float hs = hash12(id + 2.2);
    if (hs > 0.5) continue;
    vec2 c = (id + 0.5) * G + (hash22(id + 4.4) - 0.5) * 120.0;
    if (length(c - T3W3) < 150.0 || length(c) < 90.0) continue;
    float ty = hash12(id + 8.8);
    float ang = hash12(id + 6.6) * 6.2832 + uTime * 0.02 * (hs - 0.25);
    vec2 q = rot(-ang) * (p - c);
    if (ty < 0.3) {
      // Closterium: a green crescent ~180 µm
      vec2 cc = vec2(0.0, -150.0);
      float rr = length(q - cc), aa = atan(q.x, (q - cc).y);
      float span = 0.55;
      float u = clamp(aa / span, -1.0, 1.0);
      float w = 12.0 * sqrt(max(1.0 - u * u, 0.0)) + 1.0;
      float d = max(abs(rr - 150.0) - w, (abs(aa) - span) * 150.0);
      float m = cover(d);
      if (m > 0.0) {
        float ch = 2.0 * sqrt(max(w * w - pow(rr - 150.0, 2.0), 0.0));
        float plast = smoothstep(0.92, 0.75, abs(u)) * smoothstep(0.02, 0.12, abs(u));
        put(s, m, s.h + ch * 0.5, mix(vec3(0.5, 0.6, 0.45), vec3(0.18, 0.42, 0.10), plast), 0.3);
        optic(s, 0.025 * ch * m, ch * m * plast * vec3(0.045, 0.012, 0.05), 0.0);
      }
    } else if (ty < 0.55) {
      // a pennate diatom ~55 µm, golden brown, striate silica
      float d = sdEll(q, vec2(28.0, 6.5));
      float m = cover(d);
      if (m > 0.0) {
        float ch = 2.0 * 6.0 * sqrt(max(1.0 - pow(length(q / vec2(28.0, 6.5)), 2.0), 0.0));
        float stri = 0.5 + 0.5 * sin(q.x * PI / 0.6) * (1.0 - smoothstep(0.2, 0.5, uPx));
        put(s, m, s.h + ch * 0.5, vec3(0.55, 0.45, 0.22), 0.4);
        optic(s, (0.05 + 0.02 * stri) * ch * m, ch * m * vec3(0.03, 0.05, 0.1), 0.0);
      }
    } else if (ty < 0.8) {
      // Chlorella-like green cells, 6 µm, in a loose clump
      for (int k = 0; k < 4; k++) {
        vec2 o = (hash22(id + float(k) * 3.3) - 0.5) * 22.0;
        vec2 t = thin(length(q - o), 3.0);
        put(s, t.y, s.h + t.x * 0.5, vec3(0.18, 0.45, 0.12), 0.3);
        optic(s, 0.03 * t.x * t.y, t.x * t.y * vec3(0.12, 0.03, 0.13), 0.0);
      }
    } else {
      // a floc of detritus, brown
      float r = 22.0 + 14.0 * hs;
      float n = fbm(q / 9.0 + id);
      float d = length(q) - r * (0.6 + 0.6 * n);
      float m = cover(d) * smoothstep(0.3, 0.6, n + 0.2);
      if (m > 0.0) {
        put(s, m, s.h + 8.0 * n, vec3(0.30, 0.22, 0.12), 0.1);
        optic(s, 0.15 * n * m, m * n * vec3(0.35, 0.5, 0.8), 0.0);
      }
    }
  }
}

// ---------- the biofilm on the leaf (frame 4, µm) ----------
float patchAt(vec2 p) { return 0.82 * smoothstep(150.0, 45.0, length(p) * (0.8 + 0.5 * fbm(p / 60.0))) + 0.05; }
void bacteria(vec2 p, inout S s) {
  float pa = patchAt(p);
  // extracellular matrix and fine detritus: what the patch looks like before any cell resolves
  float n = fbm(p / 4.0);
  optic(s, 0.06 * pa * n, pa * vec3(0.05, 0.08, 0.12) * (0.4 + n), 0.0);
  s.alb = mix(s.alb, vec3(0.32, 0.30, 0.18), 0.6 * pa);
  float gr = smoothstep(0.62, 0.8, fbm(p / 1.6 + 7.0)) * pa;
  optic(s, 0.05 * gr, gr * vec3(0.5, 0.7, 1.0), 0.0);
  s.h += 1.5 * gr;
  if (uPx > 1.6) return;
  const float G = 3.0;
  vec2 i0 = floor(p / G);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 id = i0 + vec2(float(i), float(j));
    vec2 cc = (id + 0.5) * G;
    float dens = patchAt(cc);
    float hs = hash12(id + 1.9);
    if (hs > dens * 0.75) continue;
    float ty = hash12(id + 2.7);
    vec2 jig = 0.12 * vec2(sin(uTime * 1.3 + hs * 40.0), cos(uTime * 1.1 + hs * 70.0));
    vec2 c = cc + (hash22(id + 5.1) - 0.5) * 1.4 + jig;
    float ang = hash12(id + 3.3) * 6.2832 + 0.15 * sin(uTime * 0.7 + hs * 9.0);
    vec2 q = rot(-ang) * (p - c);
    float r, d;
    if (ty < 0.6) { float l = 0.7 + 0.5 * hs; r = 0.33; d = sdSeg(q, vec2(-l, 0.0), vec2(l, 0.0)); }
    else if (ty < 0.85) { r = 0.42; d = length(q); }
    else { r = 0.28; float y = 0.25 * (q.x * q.x); d = sdSeg(vec2(q.x, q.y - y), vec2(-0.8, 0.0), vec2(0.8, 0.0)); }
    vec2 t = thin(d, r);
    if (t.y <= 0.0) continue;
    put(s, t.y, s.h + t.x * 0.5, vec3(0.62, 0.55, 0.48), 0.25);
    optic(s, 0.06 * t.x, t.x * vec3(0.015, 0.02, 0.03), 0.45 * t.y);
  }
  // clay and mineral specks
  vec2 k0 = floor(p / 7.0);
  for (int j = 0; j <= 1; j++) for (int i = 0; i <= 1; i++) {
    vec2 id = k0 + vec2(float(i), float(j));
    if (hash12(id + 0.77) > 0.18) continue;
    vec2 c = (id + 0.5) * 7.0 + (hash22(id + 0.3) - 0.5) * 4.0;
    float r = 0.3 + 0.9 * hash12(id + 0.9);
    float d = length(p - c) - r * (0.75 + 0.5 * vnoise((p - c) / max(r, 0.1) * 1.7 + id));
    float m = cover(d);
    put(s, m, s.h + r, vec3(0.45, 0.38, 0.30), 0.2);
    optic(s, 0.12 * r * m, m * r * vec3(0.5, 0.6, 0.8), 0.0);
  }
}

// ---------- the host cell and its phages (frame 5, µm) ----------
void phageShape(vec2 q, float spin, inout S s, float hl) {
  // T4-like: prolate head 110 × 85 nm on a 100 nm contractile tail, baseplate and fibres
  vec2 hq = q - vec2(0.0, 0.16);
  vec2 aq = abs(hq);
  float hex = max(aq.x * 0.866 + aq.y * 0.5 * 0.62, aq.x) - 0.042;
  hex = max(hex, aq.y - 0.058);
  float mh = cover(hex);
  float ch = 0.085 * clamp(1.0 - pow(length(hq / vec2(0.042, 0.058)), 2.0), 0.0, 1.0);
  vec3 headCol = mix(vec3(0.95, 0.55, 0.55), vec3(1.0, 0.75, 0.4), hl);
  put(s, mh, s.h + 0.05 + ch * 0.5, headCol, 0.2);
  optic(s, mh * (0.05 * ch + 0.0025), vec3(0.0), 0.0);
  float dt = sdSeg(q, vec2(0.0, 0.1), vec2(0.0, 0.012)) - 0.011;
  float mt = cover(dt) * (1.0 - mh);
  float stripe = 0.85 + 0.15 * sin(q.y / 0.004);
  put(s, mt, s.h + 0.02 * stripe, vec3(0.72, 0.55, 0.88) * stripe, 0.2);
  optic(s, mt * 0.0016, vec3(0.0), 0.0);
  float bp = cover(max(abs(q.x) - 0.022, abs(q.y - 0.008) - 0.006));
  put(s, bp, s.h + 0.012, vec3(0.6, 0.45, 0.8), 0.2);
  optic(s, bp * 0.0012, vec3(0.0), 0.0);
  for (int k = -1; k <= 1; k += 2) {
    float sx = float(k);
    vec2 a = vec2(sx * 0.018, 0.008), b = vec2(sx * 0.07, 0.045 + 0.01 * sin(uTime + sx)), c2 = vec2(sx * 0.11, -0.002);
    float df = min(sdSeg(q, a, b), sdSeg(q, b, c2)) - 0.003;
    float mf = cover(df);
    put(s, mf, s.h + 0.008, vec3(0.95, 0.80, 0.50), 0.2);
    optic(s, mf * 0.0005, vec3(0.0), 0.0);
  }
}

void hostCell(vec2 p, inout S s) {
  float R = HOSTR * uMisc.x;
  float dax = sdSeg(p, HOST - vec2(HOSTL, 0.0), HOST + vec2(HOSTL, 0.0));
  float d = dax - R;
  float m = cover(d);
  float ch = 2.0 * sqrt(max(R * R - dax * dax, 0.0));
  float fine = 1.0 - smoothstep(0.004, 0.012, uPx);
  // molecular detail (fades in below ~10 nm per pixel)
  vec3 alb = vec3(0.55, 0.60, 0.86);
  float extra = 0.0, hh = 0.0;
  if (fine > 0.0) {
    float dd = d; // negative inside
    float om = exp(-pow((dd + 0.003) / 0.0016, 2.0)) + exp(-pow((dd + 0.0085) / 0.0016, 2.0));
    float pg = exp(-pow((dd + 0.0155) / 0.0022, 2.0));
    float im = exp(-pow((dd + 0.025) / 0.0016, 2.0)) + exp(-pow((dd + 0.0305) / 0.0016, 2.0));
    float lps = smoothstep(0.012, 0.0, dd) * step(0.0, dd) * smoothstep(0.35, 0.75, vnoise(p * vec2(380.0, 900.0)));
    vec2 rid = floor(p / 0.028);
    vec2 rc = (rid + 0.5 + (hash22(rid) - 0.5) * 0.5) * 0.028;
    float rib = step(hash12(rid + 0.5), 0.55) * smoothstep(0.0105, 0.008, length(p - rc)) * step(dd, -0.035);
    float dna = smoothstep(0.62, 0.72, fbm(p * 60.0)) * smoothstep(-0.12, -0.25, dd) * step(dd, -0.035);
    extra = (om + im) * 0.006 + pg * 0.004 + rib * 0.006 + dna * 0.004 + lps * 0.002;
    alb = dd > -0.012 ? mix(alb, vec3(0.97, 0.78, 0.38), clamp(om * 1.2 + lps, 0.0, 1.0))
        : dd > -0.02 ? mix(vec3(0.86, 0.92, 0.74), vec3(0.62, 0.85, 0.40), pg)
        : dd > -0.034 ? mix(vec3(0.86, 0.92, 0.74), vec3(0.97, 0.74, 0.36), clamp(im, 0.0, 1.0))
        : mix(mix(vec3(0.52, 0.56, 0.86), vec3(0.88, 0.45, 0.72), rib), vec3(0.98, 0.62, 0.45), dna);
    hh = 0.012 * (om + im + pg) + 0.009 * rib + 0.006 * dna + 0.004 * lps;
    extra *= fine; hh *= fine;
    float mm = max(m, lps * fine);
    put(s, mm, s.h + ch * 0.4 + hh, alb, 0.2);
  } else {
    put(s, m, s.h + ch * 0.4, alb, 0.2);
  }
  optic(s, 0.06 * ch + extra, ch * vec3(0.01, 0.012, 0.016), 0.6 * ch * m * smoothstep(0.0, -0.2, d));
  // phages stuck to the envelope: 0.2 µm, invisible in any light microscope
  if (uPx < 0.08) {
    for (int k = 0; k < 6; k++) {
      float fx = -0.82 + 0.33 * float(k);
      float tilt = 0.35 * (hash11(float(k) + 0.3) - 0.5);
      vec2 base = vec2(fx, HOST.y + R);
      vec2 up = vec2(sin(tilt), cos(tilt));
      vec2 q = p - base;
      vec2 lq = vec2(dot(q, vec2(up.y, -up.x)), dot(q, up));
      phageShape(lq, 0.0, s, k == 2 ? 1.0 : 0.0);
    }
  }
}

// ---------- creatures (native frames) ----------
// 0 springtail · 1 mite · 2 tardigrade (tun → active) · 3 Paramecium · 4 spirillum · 5 phage
void springtail(vec2 p, vec4 cr, vec4 cb, inout S s) {
  vec2 q = rot(-cr.z) * (p - cr.xy);
  if (length(q) > 1400.0) return;
  float base = cb.z;
  // feet dimpling the water film
  for (int i = 0; i < 3; i++) for (int sd = -1; sd <= 1; sd += 2) {
    float x = 330.0 - 200.0 * float(i) + 55.0 * sin(cr.w + float(i) * PI + float(sd) * PI * 0.5);
    vec2 f = vec2(x, float(sd) * 330.0);
    float dd = length(q - f);
    s.h -= 16.0 * exp(-pow(dd / 70.0, 2.0)) * step(0.5, s.gloss);
    float dl = sdSeg(q, vec2(x - 40.0, float(sd) * 140.0), f) - 26.0;
    float ml = cover(dl);
    put(s, ml, base + 120.0, vec3(0.06, 0.065, 0.09), 0.2);
    optic(s, 0.0, vec3(4.0) * ml, 0.0);
  }
  for (int sd = -1; sd <= 1; sd += 2) {
    float sw = 0.12 * sin(uTime * 2.0 + float(sd));
    vec2 a = vec2(760.0, float(sd) * 70.0), b = a + vec2(cos(float(sd) * (0.5 + sw)), sin(float(sd) * (0.5 + sw))) * 420.0;
    float dl = sdSeg(q, a, b) - 22.0;
    float ml = cover(dl);
    put(s, ml, base + 220.0, vec3(0.07, 0.07, 0.1), 0.2);
    optic(s, 0.0, vec3(4.0) * ml, 0.0);
  }
  vec2 e = q - vec2(-60.0, 0.0);
  float d = sdEll(e, vec2(720.0, 205.0 - 40.0 * smoothstep(200.0, 700.0, e.x)));
  float hd = sdEll(q - vec2(640.0, 0.0), vec2(170.0, 150.0));
  float dm = min(d, hd);
  float m = cover(dm);
  if (m <= 0.0) return;
  float rho = d < hd ? length(e / vec2(720.0, 205.0)) : length((q - vec2(640.0, 0.0)) / vec2(170.0, 150.0));
  float h = base + 330.0 * sqrt(max(1.0 - rho * rho, 0.0)) - 14.0 * smoothstep(0.82, 1.0, abs(sin(q.x * PI / 175.0)));
  vec3 alb = vec3(0.045, 0.05, 0.085) * (1.0 + 0.6 * smoothstep(0.7, 1.0, abs(sin(q.x * PI / 175.0)))) + vec3(0.02, 0.02, 0.03) * vnoise(q / 25.0);
  put(s, m, h, alb, 0.3);
  s.ab = mix(s.ab, vec3(5.0), m);
}

void mite(vec2 p, vec4 cr, vec4 cb, inout S s) {
  vec2 q = rot(-cr.z) * (p - cr.xy);
  if (length(q) > 700.0) return;
  float base = cb.z;
  // eight legs, tetrapod gait (alternating groups, a small back-to-front lag)
  for (int k = 0; k < 4; k++) for (int sd = 0; sd < 2; sd++) {
    float side = sd == 0 ? 1.0 : -1.0;
    float off = mod(float(k + sd), 2.0) * 0.5 + float(3 - k) * 0.035;
    float ph = fract(cr.w + off);
    float swing = ph < 0.36 ? sin(ph / 0.36 * PI - PI * 0.5) : 1.0 - 2.0 * (ph - 0.36) / 0.64;
    float a0 = (0.75 + 0.5 * float(k)) * side + 0.18 * swing * side * (cb.w > 0.5 ? 1.0 : 0.15);
    vec2 hip = vec2(170.0 - 95.0 * float(k), side * 150.0);
    vec2 knee = hip + vec2(cos(a0), sin(a0)) * 165.0;
    vec2 foot = knee + vec2(cos(a0 + side * 0.35), sin(a0 + side * 0.35)) * 175.0;
    float d1 = sdSeg(q, hip, knee) - 19.0, d2 = sdSeg(q, knee, foot) - 13.0;
    float dl = min(d1, d2);
    float ml = cover(dl);
    if (ml > 0.0) {
      float hk = d1 < d2 ? base + 150.0 : base + 150.0 - 140.0 * clamp(dot(q - knee, foot - knee) / dot(foot - knee, foot - knee), 0.0, 1.0);
      put(s, ml, hk, vec3(0.20, 0.09, 0.05), 0.7);
      optic(s, 0.0, vec3(5.0) * ml, 0.0);
    }
  }
  vec2 e = q;
  float d = sdEll(e, vec2(300.0 - 40.0 * smoothstep(0.0, 300.0, e.x), 215.0));
  float da = sdEll(q - vec2(270.0, 0.0), vec2(120.0, 105.0));
  float m = cover(min(d, da));
  if (m <= 0.0) return;
  float rho = d < da ? length(e / vec2(300.0, 215.0)) : length((q - vec2(270.0, 0.0)) / vec2(120.0, 105.0)) ;
  float hz = d < da ? 280.0 : 170.0;
  float h = base + hz * sqrt(max(1.0 - rho * rho, 0.0)) + 3.0 * vnoise(q / 12.0) * (1.0 - smoothstep(2.0, 6.0, uPx));
  vec3 alb = vec3(0.19, 0.075, 0.035) * (0.85 + 0.3 * vnoise(q / 60.0));
  put(s, m, h, alb, 0.85);
  s.ab = mix(s.ab, vec3(5.0), m);
}

void tardigrade(vec2 p, vec4 cr, vec4 cb, inout S s) {
  vec2 q = rot(-cr.z) * (p - cr.xy);
  if (length(q) > 260.0) return;
  float st = clamp(cb.x, 0.0, 1.0);
  float base = cb.z;
  float L = mix(110.0, 350.0, st), W = mix(78.0, 116.0, st);
  // legs: four pairs, everted as it rehydrates
  if (st > 0.12) {
    for (int k = 0; k < 4; k++) for (int sd = -1; sd <= 1; sd += 2) {
      float side = float(sd);
      float ph = fract(cr.w + (mod(float(k) + (side > 0.0 ? 0.0 : 1.0), 2.0)) * 0.5);
      float sw = sin(ph * 2.0 * PI) * 14.0 * st * cb.w;
      vec2 a, b;
      if (k < 3) { float x = (0.26 - 0.2 * float(k)) * L; a = vec2(x, side * W * 0.38); b = vec2(x + sw, side * (W * 0.5 + 38.0 * st)); }
      else { a = vec2(-0.42 * L, side * 22.0); b = vec2(-0.5 * L - 34.0 * st, side * (36.0 + sw * 0.5)); }
      float dl = sdSeg(q, a, b) - 15.0 * st;
      float ml = cover(dl);
      if (ml > 0.0) {
        float ch = 2.0 * sqrt(max(225.0 * st * st - pow(sdSeg(q, a, b), 2.0), 0.0));
        put(s, ml, base + 30.0 + ch * 0.4, vec3(0.78, 0.70, 0.56), 0.4);
        optic(s, 0.035 * ch * ml, ch * ml * vec3(0.002, 0.003, 0.006), 0.0);
      }
      // claws: dark hooks at the tip
      vec2 dir = normalize(b - a);
      for (int c = -1; c <= 1; c += 2) {
        vec2 tip = b + (dir + vec2(-dir.y, dir.x) * float(c) * 0.6) * 11.0 * st;
        vec2 t = thin(sdSeg(q, b, tip), 1.2);
        put(s, t.y, base + 20.0, vec3(0.25, 0.2, 0.15), 0.2);
        optic(s, 0.1 * t.x * t.y, vec3(1.2) * t.y, 0.0);
      }
    }
  }
  vec2 e = q;
  float wy = W * 0.5 * (1.0 - 0.18 * smoothstep(0.2, 0.5, e.x / L)) * (1.0 - 0.06 * st * sin(e.x / L * 9.0 * PI) );
  float d = sdEll(e, vec2(L * 0.5, wy));
  float m = cover(d);
  if (m <= 0.0) return;
  float rho = length(e / vec2(L * 0.5, wy));
  float H = W * 0.8;
  float ch = H * sqrt(max(1.0 - rho * rho, 0.0));
  float wr = (1.0 - st) * (4.0 * sin(q.x / 6.5 + 1.3 * sin(q.y / 9.0)) + 3.0 * vnoise(q / 8.0));
  vec3 alb = mix(vec3(0.62, 0.43, 0.20), vec3(0.80, 0.72, 0.58), st);
  put(s, m, base + ch * 0.5 + wr, alb, 0.45);
  float opd = 0.035 * ch + 0.04 * wr;
  vec3 ab = ch * mix(vec3(0.012, 0.022, 0.045), vec3(0.0015, 0.0025, 0.005), st);
  // insides (resolved when active): gut, pharynx bulb, buccal tube, eyespots, storage cells
  float lf = 1.0 - smoothstep(3.0, 7.0, uPx);
  float gut = smoothstep(1.0, 0.85, length((q - vec2(-0.05 * L, 0.0)) / vec2(0.3 * L, 0.27 * W))) * st;
  ab += gut * vec3(0.30, 0.22, 0.45);
  float bulb = smoothstep(1.0, 0.8, length(q - vec2(0.32 * L, 0.0)) / (17.0 * st + 0.01)) * st * lf;
  opd += 0.7 * bulb;
  vec2 bt = thin(sdSeg(q, vec2(0.5 * L, 0.0), vec2(0.34 * L, 0.0)), 1.6 * st);
  opd += 0.2 * bt.x * bt.y; ab += vec3(0.4) * bt.y * st;
  for (int sd = -1; sd <= 1; sd += 2) {
    vec2 t = thin(length(q - vec2(0.4 * L, float(sd) * 0.17 * W)), 3.0 * st);
    ab += vec3(1.6, 1.8, 2.0) * t.y * st;
  }
  vec2 sid = floor(q / 9.0);
  vec2 sc = (sid + 0.5 + (hash22(sid) - 0.5) * 0.5) * 9.0;
  float sto = smoothstep(4.0, 2.5, length(q - sc)) * step(rho, 0.85) * st * lf;
  opd += 0.25 * sto;
  optic(s, opd * m, ab * m, 0.0);
}

void paramecium(vec2 p, vec4 cr, vec4 cb, inout S s) {
  vec2 q = rot(-cr.z) * (p - cr.xy);
  if (length(q) > 90.0) return;
  float base = cb.z;
  vec2 e = vec2(q.x, q.y * (1.0 + 0.16 * q.x / 60.0));
  float d = sdEll(e, vec2(60.0, 28.0));
  // the oral groove: a shallow notch on one side
  float g = (length((q - vec2(6.0, -27.0)) / vec2(30.0, 7.5)) - 1.0) * 7.5;
  d = max(d, -g);
  float rho = length(e / vec2(60.0, 28.0));
  // cilia: a fringe of 10 µm strands beating in metachronal waves
  float dout = d;
  if (dout > 0.0 && dout < 12.0) {
    float ang = atan(e.y / 28.0, e.x / 60.0);
    float wave = 0.5 + 0.5 * sin(ang * 46.0 - cr.w * 6.2832 * 3.0);
    float c = exp(-dout / 5.0) * (0.35 + 0.65 * wave) * (1.0 - smoothstep(0.5, 1.5, uPx) * 0.6);
    optic(s, 0.035 * c, vec3(0.004) * c, 0.0);
    s.scat += 0.3 * c;
  }
  float m = cover(d);
  if (m <= 0.0) return;
  float ch = 44.0 * sqrt(max(1.0 - rho * rho, 0.0));
  float opd = 0.028 * ch;
  vec3 ab = ch * vec3(0.0012, 0.0016, 0.003);
  float lf = 1.0 - smoothstep(1.2, 3.0, uPx);
  // symbiotic Chlorella (5 µm), turning with the cell's roll
  vec2 cq = rot(cr.w * 0.25) * q;
  vec2 cid = floor(cq / 6.4);
  vec2 cc = (cid + 0.5 + (hash22(cid + 2.0) - 0.5) * 0.4) * 6.4;
  float has = step(hash12(cid + 7.0), 0.78) * step(rho, 0.93);
  vec2 ct = thin(length(cq - cc), 2.6);
  float chl = has * ct.y;
  ab += mix(vec3(0.22, 0.06, 0.25) * 0.55, chl * ct.x * vec3(0.15, 0.04, 0.17), lf);
  opd += lf * 0.012 * ct.x * has;
  // contractile vacuoles (pulsing, clear), macronucleus, food vacuoles
  for (int k = -1; k <= 1; k += 2) {
    float r = 6.0 + 3.0 * sin(uTime * 1.6 + float(k));
    float cv = smoothstep(r, r - 1.5, length(q - vec2(float(k) * 31.0, 5.0)));
    opd -= 0.25 * cv; ab *= 1.0 - 0.8 * cv;
  }
  float mac = smoothstep(1.0, 0.8, length((q - vec2(-4.0, 4.0)) / vec2(19.0, 12.0)));
  opd += 0.3 * mac * lf;
  for (int k = 0; k < 3; k++) {
    vec2 fc = vec2(-30.0 + 22.0 * float(k), -8.0 + 9.0 * sin(float(k) * 2.1));
    float fv = smoothstep(5.0, 3.5, length(q - fc));
    ab += fv * vec3(0.25, 0.35, 0.5) * lf;
  }
  put(s, m, base + ch * 0.5, mix(vec3(0.42, 0.55, 0.30), vec3(0.20, 0.48, 0.14), 0.7), 0.35);
  optic(s, opd * m, ab * m, 0.0);
}

void spirillum(vec2 p, vec4 cr, vec4 cb, inout S s) {
  vec2 q = rot(-cr.z) * (p - cr.xy);
  if (length(q) > 4.0) return;
  float ph = cr.w * 6.2832;
  float x = clamp(q.x, -1.5, 1.5);
  float A = 0.28, k = 6.2832 / 1.05;
  float y = A * sin(k * x + ph);
  float slope = A * k * cos(k * x + ph);
  float dax = length(vec2(q.x - x, (q.y - y) / sqrt(1.0 + slope * slope)));
  vec2 t = thin(dax, 0.16);
  if (t.y > 0.0) {
    put(s, t.y, s.h + t.x * 0.5, vec3(0.60, 0.50, 0.78), 0.3);
    optic(s, 0.075 * t.x * t.y, t.x * t.y * vec3(0.03, 0.035, 0.05), 1.4 * t.y);
    // magnetosome chain: ~50 nm magnetite crystals along the axis
    float mg = step(abs(x), 0.6) * smoothstep(0.035, 0.02, length(vec2(fract(q.x / 0.1 + 0.5) - 0.5, (q.y - y) / 0.1)) * 0.1);
    s.ab += vec3(3.0) * mg * t.y;
  }
  // polar flagella, 20 nm: invisible in phase contrast, drawn with their real tiny amount
  for (int sd = -1; sd <= 1; sd += 2) {
    float sx = float(sd);
    vec2 a = vec2(sx * 1.5, A * sin(k * 1.5 * sx + ph));
    float u = (q.x - a.x) * sx;
    if (u > 0.0 && u < 1.6) {
      float fy = a.y + 0.18 * sin(u * 7.0 - ph * 2.0) * smoothstep(0.0, 0.4, u);
      vec2 ft = thin(abs(q.y - fy), 0.01);
      optic(s, 0.05 * ft.x * ft.y, vec3(0.0), 0.0);
      put(s, ft.y, s.h + ft.x, vec3(0.75, 0.6, 0.85), 0.2);
    }
  }
}

void phage(vec2 p, vec4 cr, vec4 cb, inout S s) {
  vec2 q = rot(-cr.z) * (p - cr.xy);
  if (length(q) > 0.3) return;
  phageShape(q, cr.w, s, 1.0);
}

void main() {
  vec2 p = uCenter + (vUv * 2.0 - 1.0) * uHalf;
  S s;
  s.opd = 0.0; s.scat = 0.0; s.h = 0.0; s.cov = 0.0; s.ab = vec3(0.0); s.fl = 0.0; s.alb = uBgAlb; s.gloss = 0.0;
  if (uLayers.x > 0.5) lawn(p - uOff[1], s);
  else s.h = uMisc.z;
  if (uLayers.y > 0.5) algae(p - uOff[3], s);
  if (uLayers.z > 0.5) bacteria(p - uOff[4], s);
  if (uLayers.w > 0.5) hostCell(p - uOff[5], s);
  if (uCrB[1].y > 0.5) mite(p - uOff[1], uCr[1], uCrB[1], s);
  if (uCrB[0].y > 0.5) springtail(p - uOff[0], uCr[0], uCrB[0], s);
  if (uCrB[2].y > 0.5) tardigrade(p - uOff[2], uCr[2], uCrB[2], s);
  if (uCrB[3].y > 0.5) paramecium(p - uOff[3], uCr[3], uCrB[3], s);
  if (uCrB[4].y > 0.5) spirillum(p - uOff[4], uCr[4], uCrB[4], s);
  if (uCrB[5].y > 0.5) phage(p - uOff[5], uCr[5], uCrB[5], s);
  o0 = vec4(s.opd, s.scat, s.h - uHBase, s.cov);
  o1 = vec4(s.ab, s.fl);
  o2 = vec4(s.alb, s.gloss);
}`;
