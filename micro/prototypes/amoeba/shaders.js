// GLSL for the amoeba prototype.
//
// Every object is drawn, additively, into an "optical property" buffer rather
// than as colour: R = phase (optical path difference, from thickness and
// refractive index), G/B/A = optical density for red, green and blue light
// (absorption: chlorophyll, brown pigments, granules). One composite pass then
// turns that buffer into an image for the chosen optics (brightfield, phase
// contrast, darkfield, or an immersive lit view), so every object changes
// consistently when the optics change.

export const COMMON = /* glsl */ `
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + 1.), u.x), u.y); }
float fbm(vec2 p) { float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.03; a *= .5; } return s; }
vec2 rot(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x + s * p.y, -s * p.x + c * p.y); }
const vec3 OD_CHL = vec3(0.95, 0.22, 0.85);   // chlorophyll: absorbs red and blue, passes green
const vec3 OD_BROWN = vec3(0.22, 0.42, 0.95); // fucoxanthin / humic brown: absorbs blue most
const vec3 OD_RED = vec3(0.05, 0.75, 0.7);    // eyespot carotenoid
`;

export const QUAD_VS = /* glsl */ `
uniform vec2 uSize;
varying vec2 vL;
varying vec2 vW;
void main() {
  vL = position.xy * uSize;
  vec4 w = modelMatrix * vec4(position, 1.);
  vW = w.xy;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;



// --- the amoeba itself -------------------------------------------------------
export const BODY_FS = /* glsl */ `
${COMMON}
uniform sampler2D uMask, uSdf, uCyto;
uniform vec2 uRes; uniform vec3 uGrid;
uniform vec3 uCytoMean; uniform vec2 uCytoOff; uniform float uCytoTile;
uniform vec4 uOrgA[12]; uniform vec4 uOrgB[12]; uniform int uOrgN;
uniform vec4 uTips[5];
uniform vec3 uUroid; uniform float uFlat, uTime, uDrain;
varying vec2 vW;
void main() {
  float m = texture2D(uMask, gl_FragCoord.xy / uRes).r;
  if (m < 0.004) discard;
  vec2 g = (vW - uGrid.xy) / uGrid.z;
  float d = texture2D(uSdf, g).r * 63.75;     // distance from the membrane, µm
  // Thickness: a dome rising from the edge (A. proteus is roughly 30–50 µm thick).
  float h = sqrt(clamp(d / 46., 0., 1.));
  h = max(h, 0.11) * uFlat;
  // Ectoplasm: a clear gel rim; the hyaline cap at each advancing tip.
  float endo = smoothstep(3., 15., d);
  for (int i = 0; i < 5; i++) {
    vec4 t = uTips[i];
    float cap = t.z * (1. - smoothstep(8., 36., distance(vW, t.xy)));
    endo *= 1. - clamp(cap * 1.4, 0., 1.);
  }
  float clear = 1.;
  float phase = h;
  vec3 od = h * vec3(0.045, 0.05, 0.075);
  // Organelles: nucleus, contractile vacuole, food vacuoles.
  for (int i = 0; i < 12; i++) {
    if (i >= uOrgN) break;
    vec4 a = uOrgA[i]; vec4 b = uOrgB[i];
    vec2 q = rot(vW - a.xy, b.y) / a.zw;
    float e = length(q);
    float de = (e - 1.) * min(a.z, a.w);
    float inside = 1. - smoothstep(-0.7, 0.7, de);
    float rim = exp(-de * de / 1.4);
    if (b.x < 0.5) {
      // Discoid nucleus: slightly denser, finely granular, many small peripheral nucleoli.
      float nuc = smoothstep(0.55, 0.8, vnoise(vW * 0.9 + 7.)) * smoothstep(-1., -6., de) * smoothstep(-9., -4., de);
      phase += inside * 0.2 * h + rim * 0.1 + nuc * 0.18 + inside * 0.06 * vnoise(vW * 0.6);
      od += inside * vec3(0.03, 0.035, 0.05) + nuc * vec3(0.05, 0.06, 0.08);
      clear *= 1. - inside * 0.85;
    } else if (b.x < 1.5) {
      // Contractile vacuole: a clear bubble with a crisp edge.
      phase -= inside * 0.8 * h; phase += rim * 0.25 * b.z;
      clear *= 1. - inside;
    } else {
      // Food vacuole: clear fluid around the prey (drawn separately), a thin edge.
      phase -= inside * 0.5 * h; phase += rim * 0.16;
      od += inside * vec3(0.0, 0.01, 0.03) * b.z;
      clear *= 1. - inside;
    }
  }
  // Endoplasm: granular, faintly olive (stored food and algal remnants).
  vec3 c = texture2D(uCyto, (vW + uCytoOff) / uCytoTile).rgb;
  vec3 cod = -log(clamp(c / uCytoMean, 0.08, 4.));
  // Drained by a fungus: the cytoplasm darkens and turns brown as it is sucked out.
  float e2 = endo * clear;
  od += e2 * (vec3(0.1, 0.1, 0.15) + h * vec3(0.5, 0.5, 0.66) + cod * 0.4);
  phase += e2 * (0.08 + dot(cod, vec3(0.08)));
  // The uroid: the crumpled rear, denser and darker.
  float u = 1. - smoothstep(0., uUroid.z, distance(vW, uUroid.xy));
  od += u * endo * vec3(0.11, 0.12, 0.16) * (0.6 + 0.8 * fbm(vW * 0.08));
  od += uDrain * (0.35 + endo) * vec3(0.55, 0.47, 0.32) * (0.7 + 0.6 * fbm(vW * 0.05));
  phase += uDrain * 0.25 * endo;
  gl_FragColor = vec4(phase, od) * m;
}`;

// --- granules and crystals (THREE.Points) ------------------------------------
export const GRAN_VS = /* glsl */ `
attribute vec3 aInfo; // kind, size µm, seed
uniform float uPx;
varying vec3 vInfo; varying float vPS; varying float vR;
void main() {
  vInfo = aInfo;
  vR = max(0.75, 0.5 * aInfo.y * uPx);
  vPS = ceil(vR * 2.6 + 2.);
  gl_PointSize = vPS;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}`;

export const GRAN_FS = /* glsl */ `
uniform float uTime;
varying vec3 vInfo; varying float vPS; varying float vR;
void main() {
  vec2 q = (gl_PointCoord - 0.5) * vPS;
  float k = vInfo.x, seed = vInfo.z;
  float tw = 0.75 + 0.25 * sin(uTime * (0.7 + seed * 2.3) + seed * 40.);
  float r = length(q) / vR;
  float sph = sqrt(clamp(1. - r * r, 0., 1.));
  float edge = 1. - smoothstep(0.85, 1.15, r);
  float ph = 0.; vec3 od = vec3(0.);
  if (k < 0.5) { ph = 0.18 * sph; od = vec3(0.3, 0.31, 0.38) * edge; }
  else if (k < 1.5) { ph = 0.22 * sph; od = vec3(0.05) * edge; }
  else if (k < 2.5) {
    // Bipyramidal crystal: a strongly refractile diamond outline.
    float c = cos(seed * 6.28), s = sin(seed * 6.28);
    vec2 p = vec2(c * q.x + s * q.y, -s * q.x + c * q.y) / vR;
    float dia = abs(p.x) * 0.75 + abs(p.y) * 1.25;
    ph = 0.55 * (1. - smoothstep(0.8, 1.05, dia));
    od = vec3(0.03) * (1. - smoothstep(0.8, 1.05, dia));
  }
  else if (k < 3.5) { ph = 0.3 * sph; od = vec3(0.02, 0.04, 0.12) * edge; }
  else if (k < 4.5) { ph = 0.18 * sph; od = vec3(0.95, 0.22, 0.85) * 0.35 * edge; }
  else { ph = 0.15 * sph; od = vec3(0.18, 0.48, 0.36) * 0.55 * edge; }
  gl_FragColor = vec4(ph * tw, od);
}`;

// --- prey ---------------------------------------------------------------------
export const PREY_FS = /* glsl */ `
${COMMON}
uniform float uKind, uL, uW, uTime, uDigest, uAlive, uDischT, uDischAng, uSeed, uSc, uPx, uDim;
varying vec2 vL;
float flag(vec2 p, vec2 base, float ang, float len, float amp, float k, float ph, float w) {
  vec2 d = rot(p - base, ang);
  if (d.x < 0. || d.x > len) return 0.;
  float y = amp * (0.3 + 0.7 * d.x / len) * sin(k * d.x - ph);
  return exp(-pow((d.y - y) / w, 2.));
}
void main() {
  float a = uL * 0.5 * uSc, b0 = uW * 0.5 * uSc;
  vec2 p = vL;
  float xn = p.x / a;
  float yc = 0., b = b0;
  if (uKind < 0.5) { yc = 0.2 * b0 * (1. - xn * xn); b = b0 * (0.86 + 0.14 * xn); }
  else if (uKind < 1.5) { b = b0 * (1. - 0.08 * xn); }
  else if (uKind < 2.5) { b = b0 * (0.84 - 0.2 * xn); }
  else if (uKind < 3.5) { yc = 0.18 * b0 * (1. - xn * xn); b = b0 * (0.95 - 0.06 * xn); }
  else { b = b0 * (1. + 0.07 * xn - 0.12 * xn * xn); }
  vec2 q = vec2(xn, (p.y - yc) / b);
  if (uKind > 3.5 && xn < 0.) q.x *= 1. + 0.12 * (-xn); // caudatum: the posterior is more pointed
  float e = length(q);
  float sd = (e - 1.) * min(b, a);
  float wpx = max(0.55, 0.9 / uPx);
  float body = 1. - smoothstep(-wpx, wpx, sd);
  float h = sqrt(clamp(-sd / (b * 0.85), 0., 1.));
  float alive = uAlive;
  float ph = h * 0.55 * body;
  vec3 od = h * vec3(0.03, 0.035, 0.05) * body;
  vec2 s = p + uSeed * 97.;
  float gr = smoothstep(0.68, 0.92, vnoise(s * 0.55)) * h;
  if (uKind < 0.5) {
    // Chilomonas: colourless, starch grains, an anterior gullet; two flagella.
    float starch = smoothstep(0.72, 0.9, vnoise(s * 0.45 + 3.)) * h * smoothstep(0.3, -0.2, xn);
    ph += starch * 0.45;
    ph -= 0.12 * exp(-pow((q.y + 0.2) / 0.18, 2.)) * smoothstep(0.2, 0.8, xn) * body;
    for (int i = 0; i < 2; i++) {
      float fi = float(i);
      ph += 0.3 * flag(p, vec2(a * 0.88, 0.25 * b0), 3.14159 * 0.12 - fi * 0.5 + 0.25 * sin(uTime * 9. + fi * 2.), uL * (0.9 - fi * 0.2), 2.2, 0.55, uTime * 22. * alive + fi, wpx) * alive;
    }
  } else if (uKind < 1.5) {
    // Chlamydomonas: cup-shaped green chloroplast, pyrenoid, red eyespot, two flagella (breaststroke).
    float cup = smoothstep(0.35, 0.55, e) + smoothstep(0.2, -0.4, xn);
    od += OD_CHL * clamp(cup, 0., 1.) * h * 1.25 * body;
    ph += 0.3 * exp(-dot(p - vec2(-0.25 * a, 0.), p - vec2(-0.25 * a, 0.)) / 4.);
    od += OD_RED * 0.9 * exp(-dot(p - vec2(0.3 * a, 0.75 * b), p - vec2(0.3 * a, 0.75 * b)) / 1.3);
    float beat = sin(uTime * 6.3 * alive);
    for (int i = 0; i < 2; i++) {
      float sg = i == 0 ? 1. : -1.;
      ph += 0.3 * flag(p, vec2(a * 0.95, 0.), -sg * (0.5 + 0.7 * (0.5 + 0.5 * beat)), uL * 1.3, 1.6, 0.4, uTime * 10. * alive, wpx) * alive;
    }
  } else {
    // Ciliates: kineties (rows of cilia) as fine longitudinal stripes, food vacuoles, a contractile vacuole.
    float kin = 0.5 + 0.5 * sin(q.y * (uKind > 3.5 ? 46. : 22.) + q.x * 3.);
    ph += 0.035 * kin * h;
    od += gr * vec3(0.2, 0.24, 0.32);
    ph += gr * 0.25;
    float fv = smoothstep(0.78, 0.92, vnoise(s * 0.18 + 11.)) * h;
    od += fv * OD_BROWN * 0.5;
    vec2 cvp = vec2(-0.55 * a, 0.25 * b);
    float cvr = (uKind > 3.5 ? 6.5 : 4.) * (0.6 + 0.4 * sin(uTime * 0.9 + uSeed * 20.));
    float cvd = length(p - cvp) - cvr;
    ph -= 0.25 * (1. - smoothstep(-0.5, 0.5, cvd)) * h;
    if (uKind > 3.5) {
      // Paramecium: oral groove, macronucleus, a second contractile vacuole with radiating canals,
      // the trichocyst layer under the pellicle.
      vec2 cv2 = vec2(0.52 * a, 0.2 * b);
      float cd2 = length(p - cv2) - cvr;
      ph -= 0.25 * (1. - smoothstep(-0.5, 0.5, cd2)) * h;
      float ang1 = atan(p.y - cvp.y, p.x - cvp.x), ang2 = atan(p.y - cv2.y, p.x - cv2.x);
      float can = smoothstep(0.85, 1., cos(ang1 * 7.)) * smoothstep(22., 6., length(p - cvp)) + smoothstep(0.85, 1., cos(ang2 * 7.)) * smoothstep(22., 6., length(p - cv2));
      ph -= 0.08 * can * h;
      float groove = length((p - vec2(0.22 * a, -0.62 * b)) / vec2(0.5 * a, 0.22 * b));
      ph -= 0.18 * (1. - smoothstep(0.8, 1.05, groove)) * h;
      ph += 0.12 * exp(-pow((groove - 1.) / 0.06, 2.)) * body;
      float mac = length((p - vec2(-0.05 * a, 0.05 * b)) / vec2(0.22 * a, 0.45 * b));
      ph += 0.12 * (1. - smoothstep(0.85, 1.05, mac));
      od += vec3(0.02, 0.025, 0.04) * (1. - smoothstep(0.85, 1.05, mac));
      ph += 0.12 * smoothstep(-3.5, -1.5, sd) * (1. - smoothstep(-1.2, 0., sd)) * (0.5 + 0.5 * sin(atan(q.y, q.x) * 160.));
    }
    // Cilia: a shimmering fringe with metachronal waves; a longer caudal tuft on Paramecium.
    float cl = uKind > 3.5 ? (xn < -0.88 ? 22. : 10.) : 7.;
    if (sd > 0. && sd < cl) {
      float ang = atan(q.y, q.x);
      float wave = 0.55 + 0.45 * sin(ang * 14. - uTime * 9. * alive);
      float fine = 0.6 + 0.4 * sin(ang * (uKind > 3.5 ? 220. : 90.));
      ph += 0.14 * (1. - sd / cl) * wave * fine * (0.3 + 0.7 * alive);
    }
  }
  // Trichocysts: a local burst of long thin threads (they shoot out in milliseconds).
  if (uKind > 3.5 && uDischT < 3.) {
    float ang = atan(p.y, p.x);
    float sector = exp(-pow(mod(ang - uDischAng + 3.14159, 6.28318) - 3.14159, 2.) / 0.5);
    float bin = ang * 90. / 6.28318;
    float line = 1. - smoothstep(0.08, 0.3, abs(fract(bin) - 0.5) * 2. - 0.6);
    float len = (16. + 22. * hash12(vec2(floor(bin), uSeed))) * min(1., uDischT * 25.);
    float th = step(0., sd) * (1. - smoothstep(len - 2., len, sd));
    float head = exp(-pow((sd - len + 1.5) / 1.5, 2.));
    float fade = 1. - smoothstep(0.8, 3., uDischT);
    ph += (0.22 * line * th + 0.25 * head * line) * sector * fade;
  }
  // Digestion: contents fade and brown.
  ph *= 1. - 0.65 * uDigest;
  od = od * (1. - 0.4 * uDigest) + h * body * uDigest * OD_BROWN * 0.35;
  gl_FragColor = vec4(ph, od) * uDim;
}`;

// --- obstacles --------------------------------------------------------------
export const SPIRO_FS = /* glsl */ `
${COMMON}
uniform float uL, uW, uSeed, uCell, uPitch, uStrands, uPx, uDim;
varying vec2 vL;
void main() {
  vec2 p = vL;
  float r = uW * 0.5;
  float dx = max(abs(p.x) - (uL * 0.5 - r), 0.);
  float sd = length(vec2(dx, p.y)) - r;
  float wpx = max(0.5, 0.9 / uPx);
  float body = 1. - smoothstep(-wpx, wpx, sd);
  float yn = clamp(p.y / r, -1., 1.);
  float h = sqrt(max(1. - yn * yn, 0.)) * body;
  float ph = h * 0.6 + 0.25 * exp(-sd * sd / 1.2);
  vec3 od = h * vec3(0.02, 0.02, 0.03) + OD_CHL * 0.12 * h;
  // Cross walls between cells.
  float cw = abs(fract((p.x + uSeed * 300.) / uCell) - 0.5) * uCell;
  float wall = smoothstep(uCell * 0.5 - 1.6, uCell * 0.5 - 0.3, cw) * body;
  ph += wall * 0.3;
  // Helical chloroplast ribbons with serrated edges and pyrenoids.
  float chl = 0.;
  float pyr = 0.;
  for (int i = 0; i < 3; i++) {
    if (float(i) >= uStrands) break;
    float th = 6.28318 * (p.x / uPitch) + float(i) * 6.28318 / uStrands + uSeed * 6.;
    float yr = r * 0.8 * cos(th);
    float w = 4.5 + 4.5 * abs(sin(th));
    float serr = 0.75 + 0.5 * vnoise(vec2(p.x * 0.6, float(i) * 9. + uSeed * 20.));
    float band = 1. - smoothstep(w * serr * 0.6, w * serr, abs(p.y - yr));
    float front = 0.7 + 0.3 * sin(th);
    chl += band * front;
    float pp = fract(p.x / 9. + float(i) * 0.37);
    pyr += band * exp(-pow((pp - 0.5) * 9., 2.)) * exp(-pow((p.y - yr) / 1.6, 2.));
  }
  // Cells near each wall are a little paler (chloroplast ends).
  od += OD_CHL * clamp(chl, 0., 1.2) * 0.7 * body * (0.75 + 0.25 * vnoise(p * 0.3));
  ph += chl * 0.12 + pyr * 0.35;
  // A thin mucilage sheath.
  ph += 0.05 * (1. - smoothstep(0., 4., sd)) * step(0., sd);
  gl_FragColor = vec4(ph, od) * uDim;
}`;

export const DIATOM_FS = /* glsl */ `
${COMMON}
uniform float uL, uW, uSeed, uGirdle, uPx, uDim;
varying vec2 vL;
void main() {
  vec2 p = vL;
  float a = uL * 0.5, b0 = uW * 0.5;
  float xn = p.x / a;
  float wpx = max(0.5, 0.9 / uPx);
  float sd, b;
  if (uGirdle > 0.5) {
    b = b0 * 1.15;
    vec2 d = abs(p) - vec2(a - 3., b - 3.);
    sd = length(max(d, 0.)) + min(max(d.x, d.y), 0.) - 3.;
  } else {
    b = b0 * pow(max(1. - xn * xn, 0.), 0.62);
    sd = abs(xn) < 1. ? (abs(p.y) - b) * 0.95 : length(vec2(abs(p.x) - a, p.y));
  }
  float body = 1. - smoothstep(-wpx, wpx, sd);
  float h = sqrt(clamp(-sd / max(b, 1.), 0., 1.)) * body;
  float ph = h * 0.4 + 0.35 * exp(-sd * sd / 0.8) * step(abs(xn), 1.02);
  vec3 od = h * vec3(0.02, 0.03, 0.05);
  if (uGirdle > 0.5) {
    ph += 0.15 * exp(-pow((abs(p.y) - b * 0.55) / 0.7, 2.)) * body;
    od += OD_BROWN * 0.9 * body * smoothstep(0.75, 0.2, abs(p.y) / b) * smoothstep(1., 0.8, abs(xn));
  } else {
    // Raphe with a central nodule; transverse striae; two girdle-side plastids; oil droplets.
    ph += 0.28 * exp(-p.y * p.y / 0.35) * step(2.5, abs(p.x)) * step(abs(xn), 0.92);
    ph += 0.25 * exp(-dot(p, p) / 4.);
    ph += 0.06 * (0.5 + 0.5 * sin(p.x * 6.28318 / 2.6)) * smoothstep(0.15, 0.4, abs(p.y) / max(b, 1.)) * body;
    float pl = smoothstep(0.15, 0.35, abs(p.y) / max(b, 1.)) * smoothstep(0.95, 0.7, abs(p.y) / max(b, 1.)) * smoothstep(0.85, 0.6, abs(xn));
    od += OD_BROWN * 0.95 * pl * body * (0.8 + 0.3 * vnoise(p * 0.5 + uSeed * 40.));
    for (int i = 0; i < 2; i++) {
      vec2 c = vec2((float(i) - 0.5) * a * 0.9, 0.);
      ph += 0.4 * exp(-dot(p - c, p - c) / 3.5);
    }
  }
  gl_FragColor = vec4(ph, od) * uDim;
}`;

// A zoopagalean trap hypha (Stylopage / Zoopage type): a thin, septate,
// colourless hypha with adhesive knobs that glue passing amoebae.
// uGrow (0..1): how much of it has grown, from its -x end (a calm opening:
// the hyphae are absent at first and grow in later). uActive: adhesive knobs
// sticky (1) or dormant (0, small and pale). uKnobs 0: a haustorium (no knobs).
export const TRAP_FS = /* glsl */ `
${COMMON}
uniform float uL, uW, uSeed, uPx, uDim, uGrow, uActive, uKnobs;
varying vec2 vL;
void main() {
  vec2 p = vL;
  float r = uW * 0.5;
  float tipX = -uL * 0.5 + uGrow * uL;
  if (uGrow < 0.002 || p.x > tipX + r) discard;
  float hl = uL * 0.5 - r;
  float dx = max(max(-p.x - hl, p.x - min(hl, tipX - r)), 0.);
  float sd = length(vec2(dx, p.y)) - r;
  float wpx = max(0.5, 0.9 / uPx);
  float body = 1. - smoothstep(-wpx, wpx, sd);
  float yn = clamp(p.y / r, -1., 1.);
  float h = sqrt(max(1. - yn * yn, 0.)) * body;
  float ph = h * 0.35 + 0.22 * exp(-sd * sd / 1.0);
  float cw = abs(fract((p.x + uSeed * 200.) / 40.) - 0.5) * 40.;
  ph += smoothstep(19., 19.8, cw) * body * 0.25;
  float q = (p.x + uSeed * 91.) / 26.;
  float side = mod(floor(q), 2.) * 2. - 1.;
  vec2 kc = vec2((floor(q) + 0.5) * 26. - uSeed * 91., side * (r + 3.5));
  float kd = length(p - kc) - (1.6 + 1.6 * uActive);
  float onH = step(abs(p.x), uL * 0.5 - 4.) * step(p.x, tipX - 4.) * uKnobs;
  float knob = (1. - smoothstep(-wpx, wpx, kd)) * onH;
  ph += knob * (0.2 + 0.25 * uActive) + 0.2 * uActive * exp(-kd * kd / 1.5) * onH;
  vec3 od = (h * (1. + 1.5 * (1. - uKnobs)) + knob * (0.5 + 0.5 * uActive)) * vec3(0.03, 0.035, 0.05);
  gl_FragColor = vec4(ph, od) * uDim;
}`;

export const FLAKE_FS = /* glsl */ `
${COMMON}
uniform float uL, uW, uSeed, uPx, uDim, uResidue;
varying vec2 vL;
void main() {
  vec2 p = vL;
  float ang = atan(p.y, p.x);
  float n = fbm(vec2(cos(ang), sin(ang)) * 1.6 + uSeed * 31.);
  float e = length(p / vec2(uL * 0.5, uW * 0.5));
  float r = 0.7 + (n - 0.5) * 0.9;
  float wpx = max(0.04, 1.4 / (uPx * uL * 0.5));
  float body = 1. - smoothstep(r - wpx, r + wpx, e);
  float tex = fbm(p / 4. + uSeed * 13.);
  float h = sqrt(clamp((r - e) / r, 0., 1.)) * body;
  float ph = h * (0.25 + 0.3 * tex) + 0.2 * exp(-pow((e - r) / (wpx * 1.5), 2.));
  vec3 tint = mix(OD_BROWN, vec3(0.45, 0.5, 0.6), uResidue);
  vec3 od = tint * body * (0.25 + 0.75 * smoothstep(0.35, 0.8, tex)) * (0.6 + 0.4 * h);
  // Bacteria and small debris stuck to it.
  od += vec3(0.3) * smoothstep(0.8, 0.95, vnoise(p * 0.9 + uSeed * 7.)) * body;
  gl_FragColor = vec4(ph, od) * uDim;
}`;

/** MP-A03 delivered: a colour photo turned into optical density, drawn in the out-of-focus layer. */
export const PHOTO_FS = /* glsl */ `
uniform sampler2D uTex; uniform vec3 uMean; uniform float uDim; uniform vec2 uTile;
varying vec2 vL; varying vec2 vW;
void main() {
  vec3 c = texture2D(uTex, vW / uTile + 0.5).rgb;
  vec3 od = -log(clamp(c / uMean, 0.05, 4.));
  gl_FragColor = vec4(dot(od, vec3(0.2)) * 0.4, od) * uDim;
}`;

// --- a piece of the cell lost to a pinch-off ----------------------------------
// It rounds up (the outline is moved by the CPU), turns dark and granular as
// it dies, and breaks up from the edge inward.
export const FRAG_FS = /* glsl */ `
${COMMON}
uniform vec3 uC;      // centre and equal-area radius, µm
uniform float uAge;   // 0 when cut off, 1 when gone
uniform float uSeed;
varying vec2 vW;
void main() {
  float r = distance(vW, uC.xy) / max(uC.z, 1.);
  float h = max(sqrt(clamp(1. - r * r, 0., 1.)), 0.15) * 0.75;
  // Disintegration: a ragged front from the rim inward.
  float n = fbm(vW * 0.06 + uSeed * 17.);
  float keep = smoothstep(uAge * 1.25 - 0.08, uAge * 1.25 + 0.02, n * 0.8 + (1. - r) * 0.4);
  float dots = smoothstep(0.62, 0.78, vnoise(vW * 0.45 + uSeed * 9.));
  float dark = 0.4 + 2.2 * uAge;
  float phase = h * (0.9 + 0.3 * uAge) + dots * 0.15;
  vec3 od = h * vec3(0.1, 0.1, 0.14) * dark + dots * vec3(0.25, 0.26, 0.3) * dark;
  gl_FragColor = vec4(phase, od) * keep;
}`;
