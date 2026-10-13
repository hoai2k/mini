// Temple Dash: draws the temple (geometry from temple/geo.js) with WebGL: the
// sky panorama behind everything (it turns with the camera), then the jungle
// canopy, the walkway and its walls, and the trees, with depth testing and
// haze in the distance. Without WebGL a 2D fallback draws the same triangles
// flat-shaded, far ones first.
//
// Camera (CSS pixels for the screen), as in Kart Dash:
// { x, y, z, yaw, pitch, f, cx, cy }; a point at camera-space right lx, up ly,
// depth d lands at (cx + f*lx/d, cy - f*ly'/d) after the pitch.

const SKY_VS = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;
const SKY_FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uScale;
uniform vec2 uC;
uniform float uF;
uniform vec2 uSP;
uniform float uYaw;
uniform sampler2D uSky;
uniform vec3 uHaze;
uniform vec3 uSkyTop;
uniform float uSkyRep;
uniform float uSkyH;
void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uScale;
  float dx = (p.x - uC.x) / uF;
  float dy = -(p.y - uC.y) / uF;
  float up = dy * uSP.y - uSP.x;
  float fwd = dy * uSP.x + uSP.y;
  float hz = length(vec2(dx, fwd));
  float elev = atan(up, hz);
  vec3 col;
  if (elev < 0.0) col = uHaze;
  else {
    float u = (uYaw + atan(dx, fwd)) / 6.2831853 * uSkyRep;
    float v = 1.0 - elev / uSkyH;
    if (v < 0.0) col = uSkyTop;
    else col = texture2D(uSky, vec2(u, clamp(v, 0.002, 0.998))).rgb;
  }
  gl_FragColor = vec4(col, 1.0);
}`;

const MESH_VS = `
attribute vec3 aP;
attribute vec2 aT;
attribute float aS;
uniform vec3 uCam;
uniform vec2 uFwd;
uniform vec2 uSP;
uniform vec2 uC;
uniform float uF;
uniform vec2 uView;
varying vec2 vT;
varying float vS;
varying float vD;
void main() {
  vec3 r = aP - uCam;
  float lf = r.x * uFwd.x + r.z * uFwd.y;
  float lx = -r.x * uFwd.y + r.z * uFwd.x;
  float d = lf * uSP.y - r.y * uSP.x;
  float yc = lf * uSP.x + r.y * uSP.y;
  float N = 0.25, F = 700.0;
  gl_Position = vec4(2.0 * (uC.x * d + uF * lx) / uView.x - d, d - 2.0 * (uC.y * d - uF * yc) / uView.y, d * (F + N) / (F - N) - 2.0 * F * N / (F - N), d);
  vT = aT;
  vS = aS;
  vD = d;
}`;
const MESH_FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uTex;
uniform vec3 uHaze;
uniform vec2 uFog;
uniform float uCut;
varying vec2 vT;
varying float vS;
varying float vD;
void main() {
  vec4 c = texture2D(uTex, vT);
  if (c.a < uCut) discard;
  vec3 col = c.rgb * vS;
  col = mix(col, uHaze, smoothstep(uFog.x, uFog.y, vD) * 0.92);
  gl_FragColor = vec4(col, 1.0);
}`;

const pot = n => 2 ** Math.ceil(Math.log2(Math.max(1, n)));
const BATCHES = ['jungle', 'path', 'wall', 'trees'];

// Average colour of an image (0..1 each), for the 2D fallback and the haze.
export function averageColor(src, y0 = 0, y1 = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = 8;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(src, 0, src.height * y0, src.width, Math.max(1, src.height * (y1 - y0)), 0, 0, 8, 8);
  const d = g.getImageData(0, 0, 8, 8).data;
  let r = 0, gr = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 128) continue; r += d[i]; gr += d[i + 1]; b += d[i + 2]; n++; }
  n = Math.max(1, n) * 255;
  return [r / n, gr / n, b / n];
}

export function createScene(canvas, soft = false) {
  if (soft) return softScene(canvas);
  let gl = null;
  try {
    gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: true, stencil: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
  } catch { gl = null; }
  return gl ? glScene(canvas, gl) : softScene(canvas);
}

function glScene(canvas, gl) {
  const compile = (vs, fs) => {
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    return prog;
  };
  const sky = compile(SKY_VS, SKY_FS), mesh = compile(MESH_VS, MESH_FS);
  const uni = (prog, names) => Object.fromEntries(names.map(n => [n, gl.getUniformLocation(prog, n)]));
  const SU = uni(sky, ['uRes', 'uScale', 'uC', 'uF', 'uSP', 'uYaw', 'uSky', 'uHaze', 'uSkyTop', 'uSkyRep', 'uSkyH']);
  const MU = uni(mesh, ['uCam', 'uFwd', 'uSP', 'uC', 'uF', 'uView', 'uTex', 'uHaze', 'uFog', 'uCut']);
  const skyLoc = gl.getAttribLocation(sky, 'p');
  const aP = gl.getAttribLocation(mesh, 'aP'), aT = gl.getAttribLocation(mesh, 'aT'), aS = gl.getAttribLocation(mesh, 'aS');
  const tri = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tri);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const bufs = {}, counts = {};
  for (const b of BATCHES) { bufs[b] = gl.createBuffer(); counts[b] = 0; }
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
  const maxAniso = aniso ? Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)) : 0;
  const texs = {};
  function upload(name, src, { repeatY = true, alpha = false } = {}) {
    let img = src;
    if (src.width !== pot(src.width) || src.height !== pot(src.height)) {
      img = document.createElement('canvas');
      img.width = pot(src.width);
      img.height = pot(src.height);
      img.getContext('2d').drawImage(src, 0, 0, img.width, img.height);
    }
    if (!texs[name]) texs[name] = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texs[name]);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    const fmt = alpha ? gl.RGBA : gl.RGB;
    gl.texImage2D(gl.TEXTURE_2D, 0, fmt, fmt, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, alpha ? gl.CLAMP_TO_EDGE : gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, repeatY ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    if (maxAniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, maxAniso);
  }
  let look = null;   // { haze, skyTop, rep, skyH }
  return {
    kind: 'webgl',
    // { path, wall, jungle, trees, sky } images; haze and skyTop colours 0..1.
    setTextures(t, haze, skyTop, rep = 2) {
      upload('path', t.path);
      upload('wall', t.wall);
      upload('jungle', t.jungle);
      upload('trees', t.trees, { repeatY: false, alpha: true });
      upload('sky', t.sky, { repeatY: false });
      look = { haze, skyTop, rep, skyH: (t.sky.height / t.sky.width) * ((Math.PI * 2) / rep) };
    },
    setGeometry(geo) {
      for (const b of BATCHES) {
        gl.bindBuffer(gl.ARRAY_BUFFER, bufs[b]);
        gl.bufferData(gl.ARRAY_BUFFER, geo[b], gl.DYNAMIC_DRAW);
        counts[b] = geo[b].length / 6;
      }
    },
    draw(cam, scale, w, h) {
      if (!look) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false);
      gl.useProgram(sky);
      gl.bindBuffer(gl.ARRAY_BUFFER, tri);
      gl.enableVertexAttribArray(skyLoc);
      gl.vertexAttribPointer(skyLoc, 2, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texs.sky);
      gl.uniform1i(SU.uSky, 0);
      gl.uniform2f(SU.uRes, canvas.width, canvas.height);
      gl.uniform1f(SU.uScale, scale);
      gl.uniform2f(SU.uC, cam.cx, cam.cy);
      gl.uniform1f(SU.uF, cam.f);
      gl.uniform2f(SU.uSP, Math.sin(cam.pitch), Math.cos(cam.pitch));
      gl.uniform1f(SU.uYaw, cam.yaw);
      gl.uniform3fv(SU.uHaze, look.haze);
      gl.uniform3fv(SU.uSkyTop, look.skyTop);
      gl.uniform1f(SU.uSkyRep, look.rep);
      gl.uniform1f(SU.uSkyH, look.skyH);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disableVertexAttribArray(skyLoc);
      // The temple.
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.depthMask(true);
      gl.clearDepth(1);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.useProgram(mesh);
      gl.uniform3f(MU.uCam, cam.x, cam.y, cam.z);
      gl.uniform2f(MU.uFwd, Math.cos(cam.yaw), Math.sin(cam.yaw));
      gl.uniform2f(MU.uSP, Math.sin(cam.pitch), Math.cos(cam.pitch));
      gl.uniform2f(MU.uC, cam.cx, cam.cy);
      gl.uniform1f(MU.uF, cam.f);
      gl.uniform2f(MU.uView, w, h);
      gl.uniform3fv(MU.uHaze, look.haze);
      gl.uniform1i(MU.uTex, 0);
      gl.enableVertexAttribArray(aP);
      gl.enableVertexAttribArray(aT);
      gl.enableVertexAttribArray(aS);
      for (const b of BATCHES) {
        if (!counts[b]) continue;
        gl.bindBuffer(gl.ARRAY_BUFFER, bufs[b]);
        gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 24, 0);
        gl.vertexAttribPointer(aT, 2, gl.FLOAT, false, 24, 12);
        gl.vertexAttribPointer(aS, 1, gl.FLOAT, false, 24, 20);
        gl.bindTexture(gl.TEXTURE_2D, texs[b]);
        gl.uniform1f(MU.uCut, b === 'trees' ? 0.5 : -1);
        if (b === 'jungle') gl.uniform2f(MU.uFog, 40, 300);
        else gl.uniform2f(MU.uFog, 90, 330);
        gl.drawArrays(gl.TRIANGLES, 0, counts[b]);
      }
      gl.disableVertexAttribArray(aP);
      gl.disableVertexAttribArray(aT);
      gl.disableVertexAttribArray(aS);
    },
    finish() {
      const px = new Uint8Array(4);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    },
    destroy() {
      for (const t of Object.values(texs)) gl.deleteTexture(t);
      for (const b of Object.values(bufs)) gl.deleteBuffer(b);
      gl.deleteBuffer(tri);
      gl.deleteProgram(sky);
      gl.deleteProgram(mesh);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

// Without WebGL: the sky strip scrolled by the heading, a flat jungle below
// the horizon, and the temple's triangles flat-shaded, far ones first.
const NEAR = 0.3;
function softScene(canvas) {
  const ctx = canvas.getContext('2d');
  let geo = null, cols = {}, sky = null, look = null;
  const rgb = (a, k = 1) => `rgb(${a.map(v => Math.max(0, Math.min(255, Math.round(v * 255 * k)))).join(',')})`;
  return {
    kind: '2d',
    setTextures(t, haze, skyTop, rep = 2) {
      sky = t.sky;
      look = { haze, skyTop, rep };
      cols = { path: averageColor(t.path), wall: averageColor(t.wall), jungle: averageColor(t.jungle), trees: [0.2, 0.4, 0.22] };
    },
    setGeometry(g) { geo = g; },
    draw(cam, scale, w, h) {
      if (!look) return;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.fillStyle = rgb(look.skyTop);
      ctx.fillRect(0, 0, w, h);
      const horizon = cam.cy - cam.f * Math.tan(cam.pitch);
      const tileW = (cam.f * Math.PI * 2) / look.rep, tileH = tileW * (sky.height / sky.width);
      const x0 = ((((cam.cx - cam.f * cam.yaw) % tileW) + tileW) % tileW) - tileW;
      for (let x = x0; x < w; x += tileW) ctx.drawImage(sky, x, horizon - tileH, tileW, tileH);
      ctx.fillStyle = rgb(look.haze.map((v, i) => v * 0.45 + cols.jungle[i] * 0.55));
      ctx.fillRect(0, horizon, w, h - horizon);
      if (!geo) return;
      const fx = Math.cos(cam.yaw), fz = Math.sin(cam.yaw), sp = Math.sin(cam.pitch), cp = Math.cos(cam.pitch);
      const tris = [];
      for (const b of ['path', 'wall']) {
        const a = geo[b];
        for (let i = 0; i < a.length; i += 18) {
          // Camera space, then clipped to the near plane (d >= NEAR).
          const vs = [];
          for (let j = 0; j < 3; j++) {
            const o = i + j * 6;
            const rx = a[o] - cam.x, ry = a[o + 1] - cam.y, rz = a[o + 2] - cam.z;
            const lf = rx * fx + rz * fz;
            vs.push([-rx * fz + rz * fx, lf * sp + ry * cp, lf * cp - ry * sp]);
          }
          const poly = [];
          for (let j = 0; j < 3; j++) {
            const p = vs[j], q = vs[(j + 1) % 3];
            if (p[2] >= NEAR) poly.push(p);
            if ((p[2] >= NEAR) !== (q[2] >= NEAR)) {
              const t = (NEAR - p[2]) / (q[2] - p[2]);
              poly.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, NEAR]);
            }
          }
          if (poly.length < 3) continue;
          const pts = [];
          let dsum = 0;
          for (const [lx, yc, d] of poly) { pts.push(cam.cx + (cam.f * lx) / d, cam.cy - (cam.f * yc) / d); dsum += d; }
          tris.push({ pts, d: dsum / poly.length, col: cols[b], s: a[i + 5] });
        }
      }
      tris.sort((p, q) => q.d - p.d);
      for (const t of tris) {
        const fog = Math.min(0.92, Math.max(0, (t.d - 90) / 240));
        const c = t.col.map((v, i) => v * t.s * (1 - fog) + look.haze[i] * fog);
        ctx.fillStyle = rgb(c);
        ctx.beginPath();
        ctx.moveTo(t.pts[0], t.pts[1]);
        for (let k = 2; k < t.pts.length; k += 2) ctx.lineTo(t.pts[k], t.pts[k + 1]);
        ctx.closePath();
        ctx.fill();
      }
    },
    finish() {},
    destroy() {},
  };
}
