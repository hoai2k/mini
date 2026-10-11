// POST /transcribe: speech to text for spoken questions in Ai-Ching
// (aiching/), for browsers without their own speech recognition. The body is
// the recorded audio itself (webm, ogg, mp4 or wav, up to 30 s); the answer is
// {text}. Runs Whisper on Workers AI.

export const TRANSCRIBE_MODEL = "@cf/openai/whisper-large-v3-turbo";
const MAX_BYTES = 1_500_000;
const RATE = 12; // transcriptions per IP per 10 minutes, per isolate
const rates = new Map();

function limited(ip) {
  const now = Date.now();
  const recent = (rates.get(ip) || []).filter((t) => now - t < 600_000);
  if (recent.length >= RATE) return true;
  recent.push(now);
  rates.set(ip, recent);
  if (rates.size > 5000) rates.clear();
  return false;
}

function base64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export async function handleTranscribe(request, env, headers) {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers });
  const type = (request.headers.get("Content-Type") || "").split(";")[0].trim();
  if (!/^audio\/(webm|ogg|mp4|mpeg|wav|x-wav|aac)$/.test(type)) return Response.json({ error: "bad_type" }, { status: 415, headers });
  const buf = new Uint8Array(await request.arrayBuffer());
  if (!buf.length || buf.length > MAX_BYTES) return Response.json({ error: "bad_size" }, { status: 413, headers });
  if (!env.AI) return Response.json({ error: "unavailable" }, { status: 503, headers });
  if (limited(request.headers.get("CF-Connecting-IP") || "local")) return Response.json({ error: "rate_limited" }, { status: 429, headers });
  try {
    const lang = (request.headers.get("X-Language") || "").slice(0, 2).toLowerCase();
    const out = await env.AI.run(TRANSCRIBE_MODEL, { audio: base64(buf), ...( /^[a-z]{2}$/.test(lang) ? { language: lang } : {}), vad_filter: true });
    const text = String(out?.text || "").replace(/\s+/g, " ").trim().slice(0, 600);
    return Response.json({ text }, { headers });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "model_failed" }, { status: 502, headers });
  }
}
