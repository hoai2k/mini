// POST /oracle: a few sentences from Workers AI that open an Ai-Ching
// reading (aiching/). The page sends the question and what the coins said;
// the prompt is built here, so the route cannot be used as a general chatbot.
// Answers are cached per reading (question + day + seed) for a day, so the
// same reading gets the same opening and costs one model call.

export const ORACLE_MODEL = "@cf/meta/llama-3.2-3b-instruct";
const MAX_QUESTION = 600;
const RATE = 20; // model calls per IP per 10 minutes, per isolate
const rates = new Map();

const text = (s, max) => String(s ?? "").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

/** Validate and trim the page's request; null if it is not a reading. */
export function readOracleRequest(body) {
  if (!body || typeof body !== "object") return null;
  const question = text(body.question, MAX_QUESTION);
  const h = body.hexagram || {};
  const n = Number(h.n);
  if (!question || !Number.isInteger(n) || n < 1 || n > 64) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.day)) || !/^[a-z0-9]{1,32}$/.test(String(body.seed))) return null;
  const r = body.relating || null;
  return {
    question,
    day: String(body.day),
    seed: String(body.seed),
    kind: text(body.kind, 20),
    topic: text(body.topic, 40),
    hexagram: { n, name: text(h.name, 60), zh: text(h.zh, 8), essence: text(h.essence, 400) },
    relating: r && Number.isInteger(Number(r.n)) ? { n: Number(r.n), name: text(r.name, 60), essence: text(r.essence, 400) } : null,
    lines: (Array.isArray(body.lines) ? body.lines : []).slice(0, 3).map((l) => text(l, 300)),
    counsel: text(body.counsel, 400),
  };
}

/** The chat messages for a reading. Shared with the page's Chrome prompt. */
export function oracleMessages(r) {
  const system = "You open a reading of the I Ching for someone who asked a question. Write 2 or 3 short sentences, warm and plain, in the second person. "
    + "First sentence: show you understood what they are really asking or feeling, in your own words, without repeating the question. "
    + "Then name the hexagram they received and say in one sentence how it answers them, using only the meaning given to you. "
    + "Do not invent other I Ching meanings, do not predict specific events, do not give medical, legal or financial instructions, no lists, no headings, no quotation marks, under 75 words.";
  const facts = [
    `Question: ${r.question}`,
    r.kind ? `Kind of question: ${r.kind}` : "",
    r.topic ? `About: ${r.topic}` : "",
    `Hexagram: ${r.hexagram.n}, ${r.hexagram.zh} ${r.hexagram.name}. Meaning: ${r.hexagram.essence}`,
    r.counsel ? `Counsel for this question: ${r.counsel}` : "",
    r.lines.length ? `Changing lines: ${r.lines.join(" | ")}` : "No changing lines: the situation is settled.",
    r.relating ? `It is turning into hexagram ${r.relating.n}, ${r.relating.name}: ${r.relating.essence}` : "",
  ].filter(Boolean).join("\n");
  return [{ role: "system", content: system }, { role: "user", content: facts }];
}

function limited(ip) {
  const now = Date.now();
  const recent = (rates.get(ip) || []).filter((t) => now - t < 600_000);
  if (recent.length >= RATE) return true;
  recent.push(now);
  rates.set(ip, recent);
  if (rates.size > 5000) rates.clear();
  return false;
}

async function cacheKey(r) {
  const data = new TextEncoder().encode(`${r.question.toLowerCase()}|${r.day}|${r.seed}|${r.hexagram.n}`);
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", data))].map((b) => b.toString(16).padStart(2, "0")).join("");
  return new Request(`https://oracle.cache/${hash}`);
}

export async function handleOracle(request, env, ctx, headers) {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers });
  let body;
  try { body = await request.json(); } catch { body = null; }
  const r = readOracleRequest(body);
  if (!r) return Response.json({ error: "bad_request" }, { status: 400, headers });
  if (!env.AI) return Response.json({ error: "unavailable" }, { status: 503, headers });

  const cache = globalThis.caches?.default;
  const key = await cacheKey(r);
  const hit = cache && await cache.match(key);
  if (hit) return Response.json(await hit.json(), { headers });

  if (limited(request.headers.get("CF-Connecting-IP") || "local")) {
    return Response.json({ error: "rate_limited" }, { status: 429, headers });
  }
  try {
    const out = await env.AI.run(ORACLE_MODEL, { messages: oracleMessages(r), max_tokens: 180, temperature: 0.6 });
    const opening = text(out?.response, 700).replace(/^["']|["']$/g, "");
    if (!opening) throw new Error("empty response");
    const result = { opening, source: "workers-ai" };
    if (cache) ctx.waitUntil(cache.put(key, new Response(JSON.stringify(result), { headers: { "Cache-Control": "max-age=86400" } })));
    return Response.json(result, { headers });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "model_failed" }, { status: 502, headers });
  }
}
