// Kart Dash: the ground and sky, Mode-7 style. A WebGL fragment shader casts
// a ray from the camera through every pixel: above the horizon it reads the
// sky panorama, below it hits the flat ground and reads the track map (one
// big picture of the whole world) with tiling grass and asphalt texture
// multiplied in for close-up detail, fading into haze far away. The canvas
// runs at about one device pixel per CSS pixel, so even a phone fills it in
// well under a millisecond. Without WebGL a 2D fallback does the same at a
// third of the resolution, a row at a time.
//
// Camera (CSS pixels for the screen): { x, z, y (height), yaw, pitch, f, cx, cy }.
// The screen maps a camera-space direction (dx, dy, 1) to
// (cx + f*dx, cy - f*dy); the camera looks along yaw, tilted down by pitch.

const VS = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uScale;
uniform vec2 uC;
uniform float uF;
uniform vec3 uCam;
uniform vec2 uFwd;
uniform vec2 uSP;
uniform float uYaw;
uniform float uWorld;
uniform sampler2D uMap;
uniform sampler2D uGrass;
uniform sampler2D uRoad;
uniform sampler2D uSky;
uniform vec3 uGrassAvg;
uniform vec3 uRoadAvg;
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
  vec2 right = vec2(-uFwd.y, uFwd.x);
  float hz = length(vec2(dx, fwd));
  vec3 col;
  if (up < -0.002) {
    float t = uCam.y / -up;
    vec2 g = uCam.xz + t * (dx * right + fwd * uFwd);
    vec3 m = texture2D(uMap, g / uWorld).rgb;
    float road = 1.0 - clamp((m.g - max(m.r, m.b)) * 6.0, 0.0, 1.0);
    vec3 gd = texture2D(uGrass, g / 10.0).rgb / uGrassAvg;
    vec3 rd = mix(vec3(1.0), texture2D(uRoad, g / 3.0).rgb / uRoadAvg, 0.7);
    col = m * mix(gd, rd, road);
    float dist = t * hz;
    col = mix(col, uHaze, smoothstep(70.0, 230.0, dist) * 0.85);
  } else {
    float elev = atan(up, hz);
    float u = (uYaw + atan(dx, fwd)) / 6.2831853 * uSkyRep;
    float v = 1.0 - elev / uSkyH;
    if (v < 0.0) col = uSkyTop;
    else col = texture2D(uSky, vec2(u, clamp(v, 0.002, 0.998))).rgb;
  }
  gl_FragColor = vec4(col, 1.0);
}`;

// Average colour of an image (0..1 each), for normalising detail textures.
export function averageColor(src) {
  const c = document.createElement('canvas');
  c.width = c.height = 8;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(src, 0, 0, 8, 8);
  const d = g.getImageData(0, 0, 8, 8).data;
  let r = 0, gr = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; gr += d[i + 1]; b += d[i + 2]; }
  const n = d.length / 4 * 255;
  return [Math.max(0.05, r / n), Math.max(0.05, gr / n), Math.max(0.05, b / n)];
}

const pot = n => 2 ** Math.round(Math.log2(Math.max(1, n)));

// soft: skip WebGL. Throws if WebGL is there but the shader won't build (the
// caller then retries with a fresh canvas and soft = true).
export function createGround(canvas, soft = false) {
  if (soft) return softGround(canvas);
  let gl = null;
  try {
    gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
  } catch { gl = null; }
  return gl ? glGround(canvas, gl) : softGround(canvas);
}

function glGround(canvas, gl) {
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  for (const n of ['uRes', 'uScale', 'uC', 'uF', 'uCam', 'uFwd', 'uSP', 'uYaw', 'uWorld', 'uMap', 'uGrass', 'uRoad', 'uSky', 'uGrassAvg', 'uRoadAvg', 'uHaze', 'uSkyTop', 'uSkyRep', 'uSkyH']) U[n] = gl.getUniformLocation(prog, n);
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
  const maxAniso = aniso ? Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)) : 0;
  const texs = {};
  const units = { map: 0, grass: 1, road: 2, sky: 3 };
  gl.uniform1i(U.uMap, 0);
  gl.uniform1i(U.uGrass, 1);
  gl.uniform1i(U.uRoad, 2);
  gl.uniform1i(U.uSky, 3);

  // Uploads a canvas or image as a power-of-two texture.
  function upload(name, src, { repeatX = true, repeatY = true } = {}) {
    let img = src;
    const w = src.width, h = src.height;
    if (w !== pot(w) || h !== pot(h)) {
      img = document.createElement('canvas');
      img.width = pot(w);
      img.height = pot(h);
      img.getContext('2d').drawImage(src, 0, 0, img.width, img.height);
    }
    gl.activeTexture(gl.TEXTURE0 + units[name]);
    if (!texs[name]) texs[name] = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texs[name]);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repeatX ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, repeatY ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    if (maxAniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, maxAniso);
  }

  let ready = { map: false, grass: false, road: false, sky: false };
  let skyInfo = { rep: 2, h: 0.4 };
  return {
    kind: 'webgl',
    setMap(c, world) {
      upload('map', c, { repeatX: false, repeatY: false });
      gl.uniform1f(U.uWorld, world);
      ready.map = true;
    },
    setDetail(grass, grassAvg, road, roadAvg) {
      upload('grass', grass);
      upload('road', road);
      gl.uniform3fv(U.uGrassAvg, grassAvg);
      gl.uniform3fv(U.uRoadAvg, roadAvg);
      ready.grass = ready.road = true;
    },
    // rep: how many times the panorama repeats round a full turn.
    setSky(img, top, haze, rep = 2) {
      upload('sky', img, { repeatX: true, repeatY: false });
      // The panorama's height covers this much elevation (radians).
      skyInfo = { rep, h: (img.height / img.width) * ((Math.PI * 2) / rep) };
      gl.uniform3fv(U.uSkyTop, top);
      gl.uniform3fv(U.uHaze, haze);
      gl.uniform1f(U.uSkyRep, rep);
      gl.uniform1f(U.uSkyH, skyInfo.h);
      ready.sky = true;
    },
    draw(cam, scale) {
      if (!ready.map || !ready.sky || !ready.grass) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform1f(U.uScale, scale);
      gl.uniform2f(U.uC, cam.cx, cam.cy);
      gl.uniform1f(U.uF, cam.f);
      gl.uniform3f(U.uCam, cam.x, cam.y, cam.z);
      gl.uniform2f(U.uFwd, Math.cos(cam.yaw), Math.sin(cam.yaw));
      gl.uniform2f(U.uSP, Math.sin(cam.pitch), Math.cos(cam.pitch));
      gl.uniform1f(U.uYaw, cam.yaw);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    // Waits for the GPU (tests time the ground this way).
    finish() {
      const px = new Uint8Array(4);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    },
    destroy() {
      for (const t of Object.values(texs)) gl.deleteTexture(t);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

// The same picture without WebGL: the ground a row at a time into a small
// ImageData (nearest-neighbour from the map's pixels), scaled up.
function softGround(canvas) {
  const ctx = canvas.getContext('2d');
  const low = document.createElement('canvas');
  const lg = low.getContext('2d');
  let map = null, mapW = 0, world = 1, sky = null, skyTop = [0.4, 0.7, 1], rep = 2, haze = [0.7, 0.85, 0.7];
  let img = null;
  const rgb = a => `rgb(${a.map(v => Math.round(v * 255)).join(',')})`;
  return {
    kind: '2d',
    setMap(c, w) {
      mapW = 512;
      const s = document.createElement('canvas');
      s.width = s.height = mapW;
      const g = s.getContext('2d', { willReadFrequently: true });
      g.drawImage(c, 0, 0, mapW, mapW);
      map = g.getImageData(0, 0, mapW, mapW).data;
      world = w;
    },
    setDetail() {},
    setSky(i, top, hz, r = 2) { sky = i; skyTop = top; haze = hz; rep = r; },
    draw(cam, scale) {
      if (!map || !sky) return;
      const W = canvas.width / scale, H = canvas.height / scale;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.fillStyle = rgb(skyTop);
      ctx.fillRect(0, 0, W, H);
      // Sky: the panorama strip scrolled by the heading.
      const horizon = cam.cy - cam.f * Math.tan(cam.pitch);
      const turnPx = cam.f * Math.PI * 2;            // screen pixels per full turn (roughly)
      const tileW = turnPx / rep, tileH = tileW * (sky.height / sky.width);
      const x0 = ((((cam.cx - cam.f * cam.yaw) % tileW) + tileW) % tileW) - tileW;
      for (let x = x0; x < W; x += tileW) ctx.drawImage(sky, x, horizon - tileH, tileW, tileH);
      // Ground.
      const gx = Math.max(0, Math.floor(horizon + 1));
      const lw = Math.max(1, Math.round(W / 3)), lh = Math.max(1, Math.round((H - gx) / 3));
      if (lh < 1 || gx >= H) return;
      if (low.width !== lw || low.height !== lh) { low.width = lw; low.height = lh; img = lg.createImageData(lw, lh); }
      const d = img.data;
      const sp = Math.sin(cam.pitch), cp = Math.cos(cam.pitch);
      const fx = Math.cos(cam.yaw), fz = Math.sin(cam.yaw), rx = -fz, rz = fx;
      const k = mapW / world;
      for (let j = 0; j < lh; j++) {
        const sy = gx + (j + 0.5) * ((H - gx) / lh);
        const dy = -(sy - cam.cy) / cam.f;
        const up = dy * cp - sp, fwd = dy * sp + cp;
        const t = up < -0.002 ? cam.y / -up : 1e4;
        const fog = Math.min(0.85, Math.max(0, (t - 70) / 160) * 0.85);
        for (let i = 0; i < lw; i++) {
          const dx = ((i + 0.5) * (W / lw) - cam.cx) / cam.f;
          const x = cam.x + t * (dx * rx + fwd * fx), z = cam.z + t * (dx * rz + fwd * fz);
          const mx = Math.max(0, Math.min(mapW - 1, (x * k) | 0)), mz = Math.max(0, Math.min(mapW - 1, (z * k) | 0));
          const o = (mz * mapW + mx) * 4, p = (j * lw + i) * 4;
          d[p] = map[o] + (haze[0] * 255 - map[o]) * fog;
          d[p + 1] = map[o + 1] + (haze[1] * 255 - map[o + 1]) * fog;
          d[p + 2] = map[o + 2] + (haze[2] * 255 - map[o + 2]) * fog;
          d[p + 3] = 255;
        }
      }
      lg.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(low, 0, gx, W, H - gx);
    },
    finish() {},
    destroy() {},
  };
}
