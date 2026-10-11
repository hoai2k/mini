// Speaking a question. Browsers with speech recognition (Chrome, Edge,
// Safari) write the words into the box as they are spoken. Others record up
// to 30 seconds, stopping after a pause, and send the audio to the mini-rooms
// Worker, which transcribes it with Whisper on Workers AI
// (multiplayer/server/src/transcribe.js). The text is left in the box to
// check and send.

export const TRANSCRIBE_URL = 'https://mini-rooms.hoai2k.workers.dev/transcribe';
const MAX_MS = 30000;
const SILENCE_MS = 1800;

/** 'speech', 'record' or null when the browser can do neither. */
export function voiceMode(g = globalThis) {
  if (g.SpeechRecognition || g.webkitSpeechRecognition) return 'speech';
  if (g.MediaRecorder && g.navigator?.mediaDevices?.getUserMedia) return 'record';
  return null;
}

/** Join what was typed before with what was spoken. */
export function joinText(before, spoken) {
  const a = String(before || '').trimEnd();
  const b = String(spoken || '').trim();
  if (!b) return a;
  const text = a ? `${a} ${b}` : b.charAt(0).toUpperCase() + b.slice(1);
  return text.slice(0, 600);
}

function recordType() {
  for (const t of ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']) {
    if (globalThis.MediaRecorder?.isTypeSupported?.(t)) return t;
  }
  return '';
}

/**
 * Listen once. Calls onText(text) as words arrive, onState('listening' |
 * 'working' | 'idle' | 'error', message?) as it goes. Returns stop().
 */
export function listen({ onText, onState, lang = navigator.language || 'en-US' }) {
  return voiceMode() === 'speech' ? listenSpeech({ onText, onState, lang }) : listenRecord({ onText, onState, lang });
}

function listenSpeech({ onText, onState, lang }) {
  const Recognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
  const rec = new Recognition();
  rec.lang = lang;
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  let finalText = '';
  let failed = false;
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    onText(`${finalText}${interim}`);
  };
  rec.onerror = (e) => {
    failed = true;
    const msg = e.error === 'not-allowed' || e.error === 'service-not-allowed'
      ? 'The microphone is blocked for this page. Allow it in the browser to speak your question.'
      : e.error === 'no-speech' ? 'I did not hear anything. Tap the microphone and try again.'
        : 'Speech could not be understood just now. You can type instead.';
    onState('error', msg);
  };
  rec.onend = () => { if (!failed) onState('idle'); };
  onState('listening');
  try { rec.start(); } catch { onState('error', 'Speech could not start. You can type instead.'); }
  return () => { try { rec.stop(); } catch { /* already stopped */ } };
}

function listenRecord({ onText, onState, lang }) {
  let stopped = false;
  let stopNow = () => { stopped = true; };
  (async () => {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      onState('error', 'The microphone is blocked for this page. Allow it in the browser to speak your question.');
      return;
    }
    if (stopped) { stream.getTracks().forEach((t) => t.stop()); onState('idle'); return; }
    const type = recordType();
    const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

    // Stop after a pause in speech, or at 30 seconds.
    const ctx = new (globalThis.AudioContext || globalThis.webkitAudioContext)();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    const started = performance.now();
    let heard = false;
    let lastSound = started;
    const tick = () => {
      if (recorder.state !== 'recording') return;
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += v * v;
      const now = performance.now();
      if (Math.sqrt(sum / buf.length) > 0.02) { heard = true; lastSound = now; }
      if (now - started > MAX_MS || (heard && now - lastSound > SILENCE_MS)) recorder.stop();
      else requestAnimationFrame(tick);
    };
    stopNow = () => { if (recorder.state === 'recording') recorder.stop(); };

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      ctx.close?.();
      const blob = new Blob(chunks, { type: (recorder.mimeType || type || 'audio/webm').split(';')[0] });
      if (!blob.size) { onState('idle'); return; }
      onState('working');
      try {
        const res = await fetch(TRANSCRIBE_URL, { method: 'POST', headers: { 'Content-Type': blob.type, 'X-Language': lang }, body: blob });
        const data = res.ok ? await res.json() : null;
        if (data?.text) { onText(data.text); onState('idle'); }
        else onState('error', res.status === 429 ? 'Too many spoken questions just now. Try again in a few minutes, or type.' : 'I could not make out the words. You can try again or type.');
      } catch {
        onState('error', 'Speech could not be sent just now. You can type instead.');
      }
    };
    recorder.start();
    onState('listening');
    requestAnimationFrame(tick);
    if (stopped) stopNow();
  })();
  return () => stopNow();
}
