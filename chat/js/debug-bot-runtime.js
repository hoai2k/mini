import { createNet } from './net.js';
import { createRtc } from './rtc.js';
import { createStudio } from './studio.js';
import { createGameHost } from './gamehost.js';
import { syntheticFace } from './face.js';
import { setSfxMuted } from './audio.js';
import { loadEffects } from '../effects/index.js';
import { loadGames } from '../games/index.js';
import { driveRookie } from './rookie.js';

// No permissions or microphone: the bot's camera is a drawing and its face
// expressions are simulated. Nobody needs another device to test multiplayer.
window.startDebugBot = async ({ me, ownerId, rooms, mediaOf, room = 'everyone' }) => {
  setSfxMuted(true);
  const [effects, loadedGames] = await Promise.all([loadEffects(), loadGames()]);
  const camera = document.createElement('canvas');
  camera.width = 640; camera.height = 480;
  const ctx = camera.getContext('2d');
  const expressions = {};
  function paint() {
    ctx.fillStyle = '#172b45'; ctx.fillRect(0, 0, 640, 480);
    ctx.fillStyle = me.color;
    ctx.beginPath(); ctx.roundRect(205, 105, 230, 245, 65); ctx.fill();
    const blink = expressions.blinkL || expressions.blinkR;
    ctx.fillStyle = '#172b45';
    for (const x of [270, 370]) { ctx.beginPath(); ctx.ellipse(x, 205, 18, blink ? 3 : 22, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.lineWidth = 9; ctx.strokeStyle = '#172b45';
    ctx.beginPath(); ctx.arc(320, 255, 36, 0.15, Math.PI - 0.15); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold 24px sans-serif';
    ctx.fillText(me.name, 320, 410);
  }
  paint();
  const studio = createStudio({ cameraStream: camera.captureStream(24) });
  studio.setAvatar(me.name, me.color);
  studio.setFakeFace((t, w, h) => syntheticFace(w, h, expressions));
  // Background effects also get a simple person mask, without loading an ML model.
  studio.setFakeMask((w, h) => {
    const data = new Uint8Array(w * h);
    for (let y = Math.floor(h * 0.22); y < h * 0.73; y++) data.fill(255, y * w + Math.floor(w * 0.32), y * w + Math.floor(w * 0.68));
    return data;
  });
  const net = createNet({ game: 'chat', room, me, rooms });
  const rtc = createRtc({ net, stream: studio.stream });
  const videos = new Map();
  rtc.on('stream', (id, stream) => {
    let v = videos.get(id);
    if (!v) { v = document.createElement('video'); v.muted = true; v.playsInline = true; videos.set(id, v); }
    v.srcObject = stream; v.play().catch(() => {});
  });
  const memory = new Map();
  const host = createGameHost({
    net, studio, mediaOf: id => mediaOf(id) || videos.get(id) || null,
    toast: () => {},
    storeFor: id => ({ get: (k, fallback) => memory.get(`${id}/${k}`) ?? fallback, set: (k, v) => memory.set(`${id}/${k}`, v) }),
    onOpen: c => { setEffect(null); document.querySelector('#bot-game').append(c.el); },
    onClose: c => c.el.remove(),
  });
  host.register(loadedGames);
  let preferred = effects.find(e => e.id === ['crown', 'dealwithit', 'bunny', 'hearteyes'][Number(me.name.match(/\d+/)?.[0] || 1) - 1]) || effects.find(e => e.id === 'crown');
  function setEffect(fx) { studio.setEffect(fx); net.setPresence({ fx: fx?.id ?? null }); }
  net.onTopic('fxshare', d => {
    const fx = effects.find(e => e.id === d?.fx);
    if (!fx) return;
    preferred = fx;
    if (!host.current) setEffect(fx);
  });
  const sync = () => {
    studio.setPeerCount(net.peers.size);
    rtc.sync([...net.peers].filter(([id, p]) => id !== ownerId && p.debugOwner !== ownerId).map(([id]) => id));
    for (const [id, v] of videos) if (!net.peers.has(id)) { v.srcObject = null; videos.delete(id); }
    const owner = net.peers.get(ownerId);
    const humanGame = owner?.game || [...net.peers.values()].find(p => !p.debugOwner && p.game)?.game;
    if (humanGame && host.games.has(humanGame.id)) {
      if (host.current?.sid !== humanGame.sid) host.open(humanGame.id, humanGame.sid);
    } else if (host.current) {
      host.close();
      setEffect(preferred);
    }
  };
  net.setPresence({ cam: true, mic: false, away: false, fx: null });
  setEffect(preferred);
  net.on('peers', sync);
  let step = 0;
  const timer = setInterval(() => {
    step++;
    sync();
    for (const k of Object.keys(expressions)) expressions[k] = 0;
    const pose = ['smile', 'mouthOpen', 'pucker', 'browUp', 'frown', 'blinkL', 'blinkR', 'cheekPuff'][Math.floor(Math.random() * 8)];
    expressions[pose] = Math.random() > 0.4 ? 1 : 0;
    studio.input.held = step % 4 < 2;
    paint();
    if (host.current) driveRookie(host.current, step);
    const f = studio.face;
    if (f) net.setPresence({ face: [f.center.x / studio.canvas.width, f.center.y / studio.canvas.height, f.scale / studio.canvas.width] });
  }, 400);
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    host.close(); rtc.closeAll(); net.leave(); studio.destroy();
    for (const v of videos.values()) v.srcObject = null;
  };
  window.addEventListener('pagehide', stop, { once: true });
  window.debugBot = { host, net };   // for test/bot-app-check.mjs
  return { net, studio, host, stop };
};
