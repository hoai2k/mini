// The studio owns my camera and microphone and draws what I send: each frame
// it takes the camera image, tracks my face, runs the current effect (a WebGL
// shader pass and/or 2D drawing on top) and paints the result on `canvas`.
// `stream` is that canvas as video plus my microphone, which is what peers
// receive, so everyone sees my effects without running anything themselves.
//
// An effect is a plain object (see effects/README.md):
//   { id, name, emoji, hint, needs: { face, segmentation },
//     shader, uniforms(frame), background(frame),
//     start(state, frame), draw(ctx, frame), stop(state) }

import { loadLandmarker, loadSegmenter, faceFromResult } from './face.js';
import { img } from './assets.js';
import { sfx } from './audio.js';
import { createMotion } from './motion.js';

const MAX_W = 640;

const VERTEX = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

// Every effect shader gets this prelude and must define `vec4 effect(vec2 uv)`.
// uv is 0..1 across the output canvas, y pointing down. Face uniforms are in
// canvas pixels; u_res converts.
export const SHADER_PRELUDE = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform sampler2D u_mask;
uniform sampler2D u_bg;
uniform vec2 u_res;
uniform float u_time;
uniform float u_hasFace;
uniform float u_hasMask;
uniform vec2 u_eyeL;
uniform vec2 u_eyeR;
uniform vec2 u_nose;
uniform vec2 u_mouth;
uniform vec2 u_center;
uniform vec2 u_faceSize;
uniform float u_scale;
uniform float u_roll;
uniform float u_mouthOpen;
uniform float u_smile;
uniform float u_pucker;
uniform float u_browUp;
uniform float u_yaw;
uniform float u_pitch;
uniform float u_gain;
// The camera image at canvas position uv (mirrored like a selfie). A dim
// image is lifted (u_gain > 1, auto light) with a curve that leaves white
// white.
vec4 cam(vec2 uv) {
  vec4 c = texture2D(u_tex, vec2(1.0 - uv.x, uv.y));
  c.rgb = c.rgb * u_gain / (1.0 + (u_gain - 1.0) * c.rgb);
  return c;
}
// 1 where the person is, 0 for the room behind them (needs.segmentation).
float personMask(vec2 uv) { return u_hasMask > 0.5 ? texture2D(u_mask, vec2(1.0 - uv.x, uv.y)).r : 1.0; }
// The effect's background image, covering the canvas.
vec4 bg(vec2 uv) { return texture2D(u_bg, uv); }
// The 360 panorama in u_bg (equirectangular, 2:1) seen looking towards
// (u_yaw, u_pitch) with a horizontal field of view of fov radians.
vec4 pano(vec2 uv, float fov) {
  float aspect = u_res.x / u_res.y;
  float t = tan(fov * 0.5);
  vec3 d = normalize(vec3((uv.x - 0.5) * 2.0 * t, -(uv.y - 0.5) * 2.0 * t / aspect, 1.0));
  float cp = cos(u_pitch), sp = sin(u_pitch);
  d = vec3(d.x, d.y * cp + d.z * sp, -d.y * sp + d.z * cp);
  float cy = cos(u_yaw), sy = sin(u_yaw);
  d = vec3(d.x * cy + d.z * sy, d.y, -d.x * sy + d.z * cy);
  float u = atan(d.x, d.z) / 6.2831853 + 0.5;
  float v = acos(clamp(d.y, -1.0, 1.0)) / 3.1415927;
  return texture2D(u_bg, vec2(fract(u), v));
}
vec2 toPx(vec2 uv) { return uv * u_res; }
vec2 toUv(vec2 px) { return px / u_res; }
// Pulls pixels towards (amount > 0) or pushes them away from (amount < 0) a
// centre inside radius r (pixels): a bulge or pinch lens.
vec2 bulge(vec2 px, vec2 c, float r, float amount) {
  vec2 d = px - c;
  float dist = length(d);
  if (dist >= r) return px;
  float k = 1.0 - dist / r;
  return c + d * (1.0 - amount * k * k);
}
`;

// The plain camera through the shader, so auto light can lift it.
const PASS = { id: '__pass', shader: 'vec4 effect(vec2 uv) { return cam(uv); }' };

const FACE_UNIFORMS = ['u_eyeL', 'u_eyeR', 'u_nose', 'u_mouth', 'u_center'];

export function createStudio() {
  const canvas = document.createElement('canvas');
  canvas.width = MAX_W;
  canvas.height = 480;
  canvas.className = 'studio-canvas';
  const ctx = canvas.getContext('2d');

  const glCanvas = document.createElement('canvas');
  const gl = glCanvas.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: false });

  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');

  const out = canvas.captureStream(30);
  const listeners = new Map();
  const programs = new Map();

  let camStream = null;
  let micTrack = null;
  let camOn = false;
  let micOn = false;
  // While the tab is in the background the camera and microphone are paused
  // without changing the user's own on/off choices, which come back with it.
  // On phones the microphone stays on while away (you may just be glancing
  // at another app); only the camera pauses.
  let away = false, keepMicAway = false;
  const camLive = () => camOn && !away;
  const micLive = () => micOn && !(away && !keepMicAway);
  function applyTracks() {
    camStream?.getVideoTracks().forEach(t => { t.enabled = camLive(); });
    if (micTrack) micTrack.enabled = micLive();
  }
  let effect = null;
  let effectState = {};
  let face = null;
  let mask = null; // { data, w, h, version }
  let landmarker = null;
  let segmenter = null;
  let faceWanted = 0; // > 0 when something needs face tracking every frame
  let lastTs = 0;
  let frameNo = 0;
  let last = performance.now();
  const start = last;
  const input = { held: false, pressed: false, wasHeld: false };
  const avatar = { name: '', color: '#ff5fa2' };
  const textures = {};
  let quad = null;
  let bgSource = null;
  let fakeFace = null;
  const motion = createMotion();
  // Per-frame canvases made on demand: the plain camera image, the person cut
  // out of it, and a short history of both for the time effects.
  const camCanvas = document.createElement('canvas');
  const camCtx = camCanvas.getContext('2d', { willReadFrequently: false });
  const personCanvas = document.createElement('canvas');
  const personCtx = personCanvas.getContext('2d');
  const maskCanvas = document.createElement('canvas');
  const maskCtx = maskCanvas.getContext('2d');
  let maskDrawn = -1;
  let camFrameNo = -1, personFrameNo = -1;
  const history = []; // { t, cam, person } newest last
  const pool = [];
  let lastHist = 0;
  let peerCount = 0;
  let fakeMask = null; // tests: fn(w, h) -> Uint8Array mask in camera (unmirrored) space
  let fakeView = null; // tests: { yaw, pitch }
  let faceStatus = 'idle'; // idle | loading | ready | failed
  // How the video loop is coping, for the Connection panel and its report.
  // Face tracking that runs slow is thinned out (every 2nd or 3rd frame) so
  // it can't starve the page; a gap of over 0.7 s between frames while the
  // tab is in front is counted as a freeze.
  const perf = { fps: 0, frameMs: 0, trackMs: 0, every: 1, stalls: 0, worst: 0, worstAt: 0, worstFx: '' };
  let shownAt = performance.now();
  document.addEventListener('visibilitychange', () => { shownAt = performance.now(); });
  const ema = (old, v, k = 0.1) => (old ? old + (v - old) * k : v);
  // Brightness of the camera image, measured a few times a second while an
  // effect that wants brightening is on: gain lifts the middle of the frame
  // (where you are) towards mid-grey, at most 2.4 times.
  let gain = 1, gainFrame = 0;
  const lumaCanvas = document.createElement('canvas');
  lumaCanvas.width = 24;
  lumaCanvas.height = 18;
  const lumaCtx = lumaCanvas.getContext('2d', { willReadFrequently: true });
  // Auto light (on by default, like most video-chat apps): the brightness of
  // my face (or the middle of the picture before a face is found) sets how
  // much a dim picture is lifted, up to 2.8 times; effects marked brighten
  // aim a little higher to match their bright scenes. Never darkens.
  let autoLight = true;
  function measureGain() {
    const want = autoLight || effect?.brighten;
    if (!want || !camLive() || video.readyState < 2) {
      gain = 1;
      return;
    }
    if (frameNo - gainFrame < 8) return;
    gainFrame = frameNo;
    try {
      lumaCtx.drawImage(video, 0, 0, 24, 18);
      // The face box in the (unmirrored) 24 x 18 copy, or the middle.
      let x0 = 5, y0 = 3, x1 = 19, y1 = 15;
      if (face?.box && canvas.width) {
        const cx = (1 - face.center.x / canvas.width) * 24, cy = (face.center.y / canvas.height) * 18;
        const hw = Math.max(1, (face.box.w / canvas.width) * 12 * 0.8), hh = Math.max(1, (face.box.h / canvas.height) * 9 * 0.8);
        x0 = Math.max(0, Math.floor(cx - hw)); x1 = Math.min(24, Math.ceil(cx + hw));
        y0 = Math.max(0, Math.floor(cy - hh)); y1 = Math.min(18, Math.ceil(cy + hh));
      }
      const d = lumaCtx.getImageData(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0)).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      const mean = sum / (d.length / 4) / 255;
      // Solve the curve for the gain that takes the face's mean to the target.
      const target = effect?.brighten ? 0.47 : 0.42;
      const max = effect?.brighten ? 3 : 2.8;
      const g = mean > 0.01 ? (target * (1 - mean)) / (mean * (1 - target)) : max;
      gain += (Math.max(1, Math.min(max, g)) - gain) * 0.25;
    } catch {}
  }
  // A camera image drawn without a shader gets the same lift: screening the
  // image over itself brightens darks most, close to the shader's curve.
  function lift(c, w, h) {
    if (gain <= 1.03) return;
    c.save();
    c.globalCompositeOperation = 'screen';
    c.globalAlpha = Math.min(1, gain - 1);
    c.drawImage(c.canvas, 0, 0, w, h);
    c.restore();
  }

  function on(type, cb) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(cb);
    return () => listeners.get(type).delete(cb);
  }
  function emit(type, data) {
    listeners.get(type)?.forEach(cb => {
      try { cb(data); } catch (e) { console.error(e); }
    });
  }

  // --- camera and microphone ---------------------------------------------

  // Starts (or restarts) whichever of the camera and microphone isn't
  // running. Never hangs: iPhones can leave getUserMedia unanswered while
  // another app (a phone or video call) holds the microphone, so each step
  // gives up after a while and reports why. A stream that turns up after
  // giving up is stopped again; Try again asks afresh.
  async function startDevices({ timeoutMs = 8000 } = {}) {
    const result = { camera: !!camStream, mic: !!micTrack, error: null };
    const timeout = (p, ms, onLate) => new Promise(resolve => {
      let done = false;
      const t = setTimeout(() => {
        done = true;
        const e = new Error('The camera or microphone did not start in time.');
        e.name = 'Timeout';
        result.error = e;
        resolve(null);
      }, ms);
      p.then(v => {
        if (done) return onLate?.(v);
        done = true;
        clearTimeout(t);
        resolve(v);
      }, e => {
        if (done) return;
        done = true;
        clearTimeout(t);
        result.error = e;
        resolve(null);
      });
    });
    const stopLate = st => st?.getTracks?.().forEach(t => t.stop());
    const tryGet = c => timeout(navigator.mediaDevices.getUserMedia(c), timeoutMs, stopLate);
    if (!navigator.mediaDevices?.getUserMedia) {
      result.error = new Error('This browser cannot use a camera here (it needs HTTPS).');
      return result;
    }
    const wantV = !camStream, wantA = !micTrack;
    if (!wantV && !wantA) return result;
    const videoC = { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } };
    const audioC = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
    let s = await tryGet({ video: wantV && videoC, audio: wantA && audioC });
    // One of the two may work on its own (no camera, say), unless the
    // browser simply never answered.
    if (!s && wantV && wantA && result.error?.name !== 'Timeout') {
      const v = await tryGet({ video: videoC });
      const a = await tryGet({ audio: audioC });
      s = new MediaStream([...(v?.getTracks() ?? []), ...(a?.getTracks() ?? [])]);
    }
    const vt = s?.getVideoTracks()[0];
    const at = s?.getAudioTracks()[0];
    if (vt) {
      camStream = new MediaStream([vt]);
      video.srcObject = camStream;
      await Promise.race([video.play().catch(() => {}), new Promise(r => setTimeout(r, 3000))]);
      camOn = true;
      vt.enabled = camLive();
      result.camera = true;
      vt.addEventListener('ended', () => lost('camera', vt));
      ensureFace();
    }
    if (at) {
      micTrack = at;
      out.addTrack(at);
      micOn = true;
      at.enabled = micLive();
      result.mic = true;
      at.addEventListener('ended', () => lost('mic', at));
    }
    if (result.camera && result.mic) result.error = null;
    return result;
  }

  // A device taken away mid-call (another app grabbed it, or it was
  // unplugged): forget it so Try again can start it afresh.
  function lost(kind, track) {
    if (kind === 'camera' && camStream?.getVideoTracks()[0] === track) {
      camStream = null;
      camOn = false;
    } else if (kind === 'mic' && micTrack === track) {
      out.removeTrack(track);
      micTrack = null;
      micOn = false;
    } else return;
    emit('device-lost', kind);
  }

  function ensureFace() {
    if (faceStatus !== 'idle') return;
    faceStatus = 'loading';
    emit('face-status', faceStatus);
    loadLandmarker().then(l => {
      landmarker = l;
      faceStatus = 'ready';
      emit('face-status', faceStatus);
    }).catch(e => {
      console.warn('face tracking unavailable', e);
      faceStatus = 'failed';
      emit('face-status', faceStatus);
    });
  }

  function ensureSegmenter() {
    if (segmenter) return;
    loadSegmenter().then(s => { segmenter = s; }).catch(e => console.warn('segmentation unavailable', e));
  }

  // --- WebGL --------------------------------------------------------------

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error(log);
    }
    return sh;
  }

  function programFor(fx) {
    if (programs.has(fx.id)) return programs.get(fx.id);
    let prog = null;
    try {
      const p = gl.createProgram();
      gl.attachShader(p, compile(gl.VERTEX_SHADER, VERTEX));
      gl.attachShader(p, compile(gl.FRAGMENT_SHADER, `${SHADER_PRELUDE}\n${fx.shader}\nvoid main() { gl_FragColor = effect(v_uv); }`));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      prog = { p, locs: new Map() };
    } catch (e) {
      console.error(`shader for effect "${fx.id}" failed`, e);
    }
    programs.set(fx.id, prog);
    return prog;
  }

  function texture(name) {
    if (!textures[name]) {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
      textures[name] = t;
    }
    return textures[name];
  }

  function uniform(prog, name, value) {
    if (!prog.locs.has(name)) prog.locs.set(name, gl.getUniformLocation(prog.p, name));
    const loc = prog.locs.get(name);
    if (loc === null) return;
    if (typeof value === 'number') gl.uniform1f(loc, value);
    else if (value.length === 2) gl.uniform2f(loc, value[0], value[1]);
    else if (value.length === 3) gl.uniform3f(loc, value[0], value[1], value[2]);
    else if (value.length === 4) gl.uniform4f(loc, value[0], value[1], value[2], value[3]);
  }

  function runShader(fx, frame) {
    const prog = programFor(fx);
    if (!prog) return false;
    const { w, h } = frame;
    if (glCanvas.width !== w || glCanvas.height !== h) {
      glCanvas.width = w;
      glCanvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.useProgram(prog.p);
    if (!quad) {
      quad = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    const aPos = gl.getAttribLocation(prog.p, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture('cam'));
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    setSampler(prog, 'u_tex', 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture('mask'));
    if (mask && mask.uploaded !== mask.version) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, mask.w, mask.h, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, mask.data);
      mask.uploaded = mask.version;
    }
    setSampler(prog, 'u_mask', 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, texture('bg'));
    const bgImg = fx.background?.(frame);
    if (bgImg && (bgImg !== bgSource || bgImg.dirty)) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bgImg);
      bgSource = bgImg;
      bgImg.dirty = false;
    }
    setSampler(prog, 'u_bg', 2);

    uniform(prog, 'u_res', [w, h]);
    uniform(prog, 'u_time', frame.t);
    uniform(prog, 'u_gain', gain);
    uniform(prog, 'u_hasMask', mask && fx.needs?.segmentation ? 1 : 0);
    uniform(prog, 'u_yaw', frame.view?.yaw ?? 0);
    uniform(prog, 'u_pitch', frame.view?.pitch ?? 0);
    const f = frame.face;
    uniform(prog, 'u_hasFace', f ? 1 : 0);
    if (f) {
      const pts = { u_eyeL: f.eyeL, u_eyeR: f.eyeR, u_nose: f.nose, u_mouth: f.mouth, u_center: f.center };
      for (const name of FACE_UNIFORMS) uniform(prog, name, [pts[name].x, pts[name].y]);
      uniform(prog, 'u_faceSize', [f.box.w, f.box.h]);
      uniform(prog, 'u_scale', f.scale);
      uniform(prog, 'u_roll', f.roll);
      uniform(prog, 'u_mouthOpen', f.mouthOpen);
      uniform(prog, 'u_smile', f.smile);
      uniform(prog, 'u_pucker', f.pucker);
      uniform(prog, 'u_browUp', f.browUp);
    }
    const extra = fx.uniforms?.(frame);
    if (extra) for (const [k, v] of Object.entries(extra)) uniform(prog, k, v);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    ctx.drawImage(glCanvas, 0, 0, w, h);
    return true;
  }

  function setSampler(prog, name, unit) {
    if (!prog.locs.has(name)) prog.locs.set(name, gl.getUniformLocation(prog.p, name));
    const loc = prog.locs.get(name);
    if (loc !== null) gl.uniform1i(loc, unit);
  }

  // --- the frame loop -----------------------------------------------------

  function drawAvatar(w, h) {
    ctx.fillStyle = avatar.color;
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w / 2, h * 0.4, 10, w / 2, h / 2, w * 0.7);
    g.addColorStop(0, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.round(h * 0.32)}px ui-rounded, system-ui, sans-serif`;
    ctx.fillText((avatar.name || '?').trim().charAt(0).toUpperCase(), w / 2, h * 0.45);
    ctx.font = `700 ${Math.round(h * 0.07)}px ui-rounded, system-ui, sans-serif`;
    ctx.fillText(away ? `${avatar.name || ''} · away` : avatar.name || '', w / 2, h * 0.78);
  }

  function track(now) {
    if (fakeMask && effect?.needs?.segmentation) {
      const data = fakeMask(256, 256, (now - start) / 1000);
      mask = { data, w: 256, h: 256, version: (mask?.version ?? 0) + 1, uploaded: mask?.uploaded };
    }
    if (fakeFace) {
      face = typeof fakeFace === 'function' ? fakeFace((now - start) / 1000, canvas.width, canvas.height) : fakeFace;
      return;
    }
    if (!camLive() || video.readyState < 2) {
      face = null;
      return;
    }
    // Every frame while an effect or game needs it, otherwise a few times a
    // second so friends' bubbles know where my face is.
    if (faceWanted <= 0 && frameNo % 6 !== 0) return;
    if (faceWanted > 0 && frameNo % perf.every !== 0) return;
    const ts = Math.max(lastTs + 1, Math.round(now));
    lastTs = ts;
    if (landmarker) {
      const t0 = performance.now();
      try {
        face = faceFromResult(landmarker.detectForVideo(video, ts), canvas.width, canvas.height, face);
      } catch (e) {
        face = null;
      }
      const ms = performance.now() - t0;
      perf.trackMs = ema(perf.trackMs, ms);
      if (ms > 500) console.warn(`face tracking took ${Math.round(ms)} ms`);
      perf.every = ms > 500 || perf.trackMs > 40 ? 3 : perf.trackMs > 25 ? 2 : perf.trackMs < 15 ? 1 : perf.every;
    }
    if (segmenter && effect?.needs?.segmentation) {
      try {
        segmenter.segmentForVideo(video, ts, res => {
          const m = res.confidenceMasks?.[0];
          if (!m) return;
          const f32 = m.getAsFloat32Array();
          const data = mask && mask.data.length === f32.length ? mask.data : new Uint8Array(f32.length);
          for (let i = 0; i < f32.length; i++) data[i] = f32[i] * 255;
          mask = { data, w: m.width, h: m.height, version: (mask?.version ?? 0) + 1, uploaded: mask?.uploaded };
        });
      } catch {}
    }
  }

  // The mirrored camera image without any effect.
  function cameraFrame(w, h) {
    if (camFrameNo === frameNo) return camCanvas;
    camFrameNo = frameNo;
    if (camCanvas.width !== w || camCanvas.height !== h) {
      camCanvas.width = w;
      camCanvas.height = h;
    }
    if (camLive() && video.readyState >= 2) {
      camCtx.save();
      camCtx.translate(w, 0);
      camCtx.scale(-1, 1);
      camCtx.drawImage(video, 0, 0, w, h);
      camCtx.restore();
      lift(camCtx, w, h);
    } else {
      camCtx.drawImage(canvas, 0, 0, w, h);
    }
    return camCanvas;
  }

  // The camera image with the room made transparent, or null until the
  // segmenter has produced a mask (needs.segmentation).
  function personFrame(w, h) {
    if (!mask) return null;
    if (personFrameNo === frameNo) return personCanvas;
    personFrameNo = frameNo;
    if (maskDrawn !== mask.version) {
      if (maskCanvas.width !== mask.w || maskCanvas.height !== mask.h) {
        maskCanvas.width = mask.w;
        maskCanvas.height = mask.h;
      }
      const img = maskCtx.createImageData(mask.w, mask.h);
      for (let i = 0; i < mask.data.length; i++) img.data[i * 4 + 3] = mask.data[i];
      maskCtx.putImageData(img, 0, 0);
      maskDrawn = mask.version;
    }
    if (personCanvas.width !== w || personCanvas.height !== h) {
      personCanvas.width = w;
      personCanvas.height = h;
    }
    personCtx.globalCompositeOperation = 'copy';
    personCtx.drawImage(cameraFrame(w, h), 0, 0);
    personCtx.globalCompositeOperation = 'destination-in';
    personCtx.save();
    personCtx.translate(w, 0);
    personCtx.scale(-1, 1);
    personCtx.drawImage(maskCanvas, 0, 0, w, h);
    personCtx.restore();
    personCtx.globalCompositeOperation = 'source-over';
    return personCanvas;
  }

  // Keeps up to needs.history seconds of half-size frames, 30 a second.
  function record(fr) {
    if (fr.t - lastHist < 1 / 31) return;
    lastHist = fr.t;
    const keep = Math.min(4, effect.needs.history);
    const hw = Math.round(fr.w / 2), hh = Math.round(fr.h / 2);
    while (history.length && history[0].t < fr.t - keep) pool.push(history.shift());
    const entry = pool.pop() || { cam: document.createElement('canvas'), person: null };
    if (entry.cam.width !== hw || entry.cam.height !== hh) {
      entry.cam.width = hw;
      entry.cam.height = hh;
    }
    entry.cam.getContext('2d').drawImage(cameraFrame(fr.w, fr.h), 0, 0, hw, hh);
    const person = effect.needs.segmentation ? personFrame(fr.w, fr.h) : null;
    if (person) {
      entry.person ??= document.createElement('canvas');
      if (entry.person.width !== hw || entry.person.height !== hh) {
        entry.person.width = hw;
        entry.person.height = hh;
      }
      const pc = entry.person.getContext('2d');
      pc.clearRect(0, 0, hw, hh);
      pc.drawImage(person, 0, 0, hw, hh);
      entry.hasPerson = true;
    } else {
      entry.hasPerson = false;
    }
    entry.t = fr.t;
    history.push(entry);
  }

  // The recorded frame closest to time t: { t, cam, person } (canvases at
  // half size; person is null without a mask), or null before any.
  function pastFrame(t) {
    if (!history.length) return null;
    let best = history[0];
    for (const e of history) {
      if (Math.abs(e.t - t) < Math.abs(best.t - t)) best = e;
    }
    return { t: best.t, cam: best.cam, person: best.hasPerson ? best.person : null };
  }

  function frame(now) {
    const gap = now - last;
    const dt = Math.min(0.1, gap / 1000);
    last = now;
    frameNo++;
    if (!document.hidden && now - shownAt > 1500 && frameNo > 30) {
      perf.fps = ema(perf.fps, 1000 / Math.max(1, gap), 0.05);
      if (gap > 700) {
        perf.stalls++;
        if (gap > perf.worst) Object.assign(perf, { worst: gap, worstAt: Date.now(), worstFx: effect?.id || 'no effect' });
        console.warn(`video loop stalled for ${Math.round(gap)} ms (${effect?.id || 'no effect'})`);
      }
    }
    const frameStart = performance.now();

    if (camLive() && video.videoWidth) {
      const w = Math.min(MAX_W, video.videoWidth);
      const h = Math.round((w * video.videoHeight) / video.videoWidth);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }
    const w = canvas.width, h = canvas.height;
    track(now);
    measureGain();

    input.pressed = input.held && !input.wasHeld;
    input.wasHeld = input.held;

    const t = (now - start) / 1000;
    const view = fakeView ? { ...fakeView, source: 'test' } : motion.view(face, dt);
    const fr = {
      ctx, w, h, video, face, camOn: camLive(), view,
      camera: () => cameraFrame(w, h),
      person: () => personFrame(w, h),
      past: secondsAgo => pastFrame(t - secondsAgo),
      history,
      t,
      dt,
      input,
      peers: peerCount,
      state: effectState,
      img,
      sfx,
      emit: (type, data) => emit('fx-event', { type, data }),
    };

    const showCam = camLive() || (fakeFace && !away);
    if (!showCam) {
      drawAvatar(w, h);
    } else if (!(camLive() && gl && (effect?.shader || gain > 1.03) && runShader(effect?.shader ? effect : PASS, fr))) {
      if (camLive()) {
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, w, h);
        ctx.restore();
        lift(ctx, w, h);
      } else {
        drawAvatar(w, h);
      }
    }
    if (effect?.needs?.history) record(fr);
    if (effect?.draw) {
      try { effect.draw(ctx, fr); } catch (e) { console.error(`effect ${effect.id}`, e); }
    }
    emit('frame', fr);
    perf.frameMs = ema(perf.frameMs, performance.now() - frameStart);
  }

  let rafId = 0, timerId = 0;
  function loop() {
    cancelAnimationFrame(rafId);
    clearTimeout(timerId);
    const tick = () => {
      frame(performance.now());
      loop();
    };
    // requestAnimationFrame stops in background tabs, which would freeze the
    // video peers see, so fall back to a timer while hidden.
    if (document.hidden) timerId = setTimeout(tick, 1000 / 24);
    else rafId = requestAnimationFrame(tick);
  }
  document.addEventListener('visibilitychange', loop);
  loop();

  return {
    canvas,
    stream: out,
    video,
    on,
    get face() { return face; },
    get faceStatus() { return faceStatus; },
    get perf() { return perf; },
    get gain() { return gain; },
    // Auto light on or off (Settings).
    setAutoLight(on) {
      autoLight = !!on;
    },
    get camOn() { return camOn; },
    get micOn() { return micOn; },
    get hasCamera() { return !!camStream; },
    get hasMic() { return !!micTrack; },
    get effect() { return effect; },
    input,
    startDevices,
    setAvatar(name, color) {
      avatar.name = name;
      avatar.color = color;
    },
    setCamera(onOff) {
      if (!camStream) return false;
      camOn = onOff;
      applyTracks();
      return camOn;
    },
    setMic(onOff) {
      if (!micTrack) return false;
      micOn = onOff;
      applyTracks();
      return micOn;
    },
    get away() { return away; },
    // Pauses the camera and microphone while the tab is in the background.
    setAway(yes, { keepMic = false } = {}) {
      away = !!yes;
      keepMicAway = keepMic;
      applyTracks();
    },
    get micLive() { return !!micTrack && micLive(); },
    setEffect(fx) {
      if (effect?.stop) {
        try { effect.stop(effectState); } catch (e) { console.error(e); }
      }
      if (effect?.needs?.face || effect?.needs?.segmentation) faceWanted--;
      effect = fx;
      effectState = {};
      history.forEach(e => pool.push(e));
      history.length = 0;
      motion.reset();
      bgSource = null;
      if (fx?.needs?.face || fx?.needs?.segmentation) faceWanted++;
      if (fx?.needs?.segmentation) ensureSegmenter();
      if (fx?.start) {
        try { fx.start(effectState, { w: canvas.width, h: canvas.height, img, sfx }); } catch (e) { console.error(e); }
      }
    },
    // How many other people are in the chat (effects can check frame.peers).
    setPeerCount(n) {
      peerCount = n;
    },
    // Turns on the phone's motion sensor (iPhones need this from a tap).
    requestMotion: () => motion.request(),
    tilt: () => motion.tilt(),
    get motionStatus() { return motion.status; },
    // Games that read my face call wantFace(true) while running.
    wantFace(yes) {
      faceWanted += yes ? 1 : -1;
    },
    // Tests and previews: a face object, or fn(t, w, h) -> face. null to stop.
    setFakeFace(f) {
      fakeFace = f;
    },
    setFakeMask(fn) {
      fakeMask = fn;
    },
    setFakeView(v) {
      fakeView = v;
    },
  };
}
