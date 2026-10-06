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
// The camera image at canvas position uv (mirrored like a selfie).
vec4 cam(vec2 uv) { return texture2D(u_tex, vec2(1.0 - uv.x, uv.y)); }
// 1 where the person is, 0 for the room behind them (needs.segmentation).
float personMask(vec2 uv) { return u_hasMask > 0.5 ? texture2D(u_mask, vec2(1.0 - uv.x, uv.y)).r : 1.0; }
// The effect's background image, covering the canvas.
vec4 bg(vec2 uv) { return texture2D(u_bg, uv); }
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
  let peerCount = 0;
  let faceStatus = 'idle'; // idle | loading | ready | failed

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

  async function startDevices() {
    const result = { camera: false, mic: false, error: null };
    const tryGet = async constraints => {
      try { return await navigator.mediaDevices.getUserMedia(constraints); } catch (e) { result.error = e; return null; }
    };
    if (!navigator.mediaDevices?.getUserMedia) {
      result.error = new Error('This browser cannot use a camera here (it needs HTTPS).');
      return result;
    }
    const videoC = { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } };
    const audioC = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
    let s = await tryGet({ video: videoC, audio: audioC });
    if (!s) {
      const v = await tryGet({ video: videoC });
      const a = await tryGet({ audio: audioC });
      s = new MediaStream([...(v?.getTracks() ?? []), ...(a?.getTracks() ?? [])]);
    }
    const vt = s.getVideoTracks()[0];
    const at = s.getAudioTracks()[0];
    if (vt) {
      camStream = new MediaStream([vt]);
      video.srcObject = camStream;
      try { await video.play(); } catch {}
      camOn = true;
      result.camera = true;
      ensureFace();
    }
    if (at) {
      micTrack = at;
      out.addTrack(at);
      micOn = true;
      result.mic = true;
    }
    return result;
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
    uniform(prog, 'u_hasMask', mask && fx.needs?.segmentation ? 1 : 0);
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
    ctx.fillText(avatar.name || '', w / 2, h * 0.78);
  }

  function track(now) {
    if (fakeFace) {
      face = typeof fakeFace === 'function' ? fakeFace((now - start) / 1000, canvas.width, canvas.height) : fakeFace;
      return;
    }
    if (!camOn || video.readyState < 2) {
      face = null;
      return;
    }
    // Every frame while an effect or game needs it, otherwise a few times a
    // second so friends' bubbles know where my face is.
    if (faceWanted <= 0 && frameNo % 6 !== 0) return;
    const ts = Math.max(lastTs + 1, Math.round(now));
    lastTs = ts;
    if (landmarker) {
      try {
        face = faceFromResult(landmarker.detectForVideo(video, ts), canvas.width, canvas.height, face);
      } catch (e) {
        face = null;
      }
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

  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    frameNo++;

    if (camOn && video.videoWidth) {
      const w = Math.min(MAX_W, video.videoWidth);
      const h = Math.round((w * video.videoHeight) / video.videoWidth);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }
    const w = canvas.width, h = canvas.height;
    track(now);

    input.pressed = input.held && !input.wasHeld;
    input.wasHeld = input.held;

    const fr = {
      ctx, w, h, video, face, camOn,
      t: (now - start) / 1000,
      dt,
      input,
      peers: peerCount,
      state: effectState,
      img,
      sfx,
      emit: (type, data) => emit('fx-event', { type, data }),
    };

    const showCam = camOn || fakeFace;
    if (!showCam) {
      drawAvatar(w, h);
    } else if (!(effect?.shader && camOn && gl && runShader(effect, fr))) {
      if (camOn) {
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, w, h);
        ctx.restore();
      } else {
        drawAvatar(w, h);
      }
    }
    if (effect?.draw) {
      try { effect.draw(ctx, fr); } catch (e) { console.error(`effect ${effect.id}`, e); }
    }
    emit('frame', fr);
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
      camStream.getVideoTracks().forEach(t => { t.enabled = onOff; });
      return camOn;
    },
    setMic(onOff) {
      if (!micTrack) return false;
      micOn = onOff;
      micTrack.enabled = onOff;
      return micOn;
    },
    setEffect(fx) {
      if (effect?.stop) {
        try { effect.stop(effectState); } catch (e) { console.error(e); }
      }
      if (effect?.needs?.face || effect?.needs?.segmentation) faceWanted--;
      effect = fx;
      effectState = {};
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
    // Games that read my face call wantFace(true) while running.
    wantFace(yes) {
      faceWanted += yes ? 1 : -1;
    },
    // Tests and previews: a face object, or fn(t, w, h) -> face. null to stop.
    setFakeFace(f) {
      fakeFace = f;
    },
  };
}
