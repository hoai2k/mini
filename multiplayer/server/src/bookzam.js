// POST /bookzam/scan and POST /bookzam/find: read a photo for Bookzam
// (bookzam/). The page sends one JPEG, already shrunk to at most 1568 px on
// its long edge, as {image: <base64>, width, height}; /find adds {query}.
//
//   scan -> {books: [{title, author, confidence}],
//            games: [{title, publisher, designer, year, confidence}],
//            unreadable, source}
//   find -> {found, title, box: {x0, y0, x1, y1} | null, where, similar, source}
//           (box edges are fractions of the image, 0..1)
//
// Claude reads the photo when the ANTHROPIC_API_KEY secret is set
// (npx wrangler secret put ANTHROPIC_API_KEY); otherwise a Workers AI vision
// model does, which reads fewer spines and places boxes more loosely. The
// prompts are built here, so the routes only ever read shelves.

import Anthropic from "@anthropic-ai/sdk";

export const CLAUDE_MODEL = "claude-opus-5-5";
export const WORKERS_AI_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";
const MAX_IMAGE_BYTES = 3_000_000; // base64 characters
const MAX_EDGE = 1568; // Claude's own limit before it shrinks an image again
const MAX_QUERY = 200;
const RATE = 40; // photos per IP per 10 minutes, per isolate
const rates = new Map();

const text = (s, max) => String(s ?? "").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

/** Validate the page's request; null if it is not a photo (and query) we can read. */
export function readPhotoRequest(body, mode) {
  if (!body || typeof body !== "object") return null;
  const image = typeof body.image === "string" ? body.image.replace(/^data:image\/jpeg;base64,/, "") : "";
  if (!image || image.length > MAX_IMAGE_BYTES || !/^[A-Za-z0-9+/]+={0,2}$/.test(image)) return null;
  const width = Number(body.width), height = Number(body.height);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 64 || height < 64 || width > MAX_EDGE || height > MAX_EDGE) return null;
  const query = text(body.query, MAX_QUERY);
  if (mode === "find" && !query) return null;
  return { image, width, height, query };
}

const nullable = (type) => ({ type: [type, "null"] });

const SCAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["books", "games", "unreadable"],
  properties: {
    books: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "author", "confidence"],
        properties: { title: { type: "string" }, author: nullable("string"), confidence: { type: "number" } },
      },
    },
    games: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "publisher", "designer", "year", "confidence"],
        properties: {
          title: { type: "string" },
          publisher: nullable("string"),
          designer: nullable("string"),
          year: nullable("integer"),
          confidence: { type: "number" },
        },
      },
    },
    unreadable: { type: "integer" },
  },
};

const FIND_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["found", "title", "box", "where", "similar"],
  properties: {
    found: { type: "boolean" },
    title: nullable("string"),
    box: {
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["x0", "y0", "x1", "y1"],
          properties: { x0: { type: "integer" }, y0: { type: "integer" }, x1: { type: "integer" }, y1: { type: "integer" } },
        },
        { type: "null" },
      ],
    },
    where: { type: "string" },
    similar: { type: "array", items: { type: "string" } },
  },
};

export function scanPrompt() {
  return [
    "This photo shows books and/or board games, on shelves, in a pile or on a table. Catalogue every one whose title you can read or identify with confidence, from spines, covers or boxes.",
    "Put books (novels, non-fiction, comics, cookbooks, children's books) in books. Put board games, card games, party games, roleplaying boxed sets and jigsaw puzzles in games.",
    "Write each title as the item itself would, in title case, including a subtitle only when it is printed prominently. Give the author as a full name when you are sure who it is, otherwise as printed, or null if no author shows and you do not know it.",
    "For games, give publisher, designer and first-published year only when printed or when you know them for certain; otherwise null.",
    "Never guess a title from a fragment you cannot read: count such items in unreadable instead. List each physical item once, in reading order: top shelf first, left to right.",
    "confidence is 0 to 1: how sure you are of the title.",
  ].join("\n");
}

export function findPrompt(r) {
  return [
    `This photo is ${r.width} x ${r.height} pixels. Someone is looking for this book or game in it: "${r.query}".`,
    "Look along every spine, cover and box. The query may be partial, misspelt or only an author.",
    "If you find it, set found to true, title to its title as printed, and box to a tight rectangle around the whole spine, cover or box in pixel coordinates of this image (x0,y0 top-left, x1,y1 bottom-right).",
    "where is one short sentence telling them where to look, such as \"Second shelf from the top, about a third of the way in from the left.\"",
    "If it is not there, set found to false and box to null, where to a short sentence saying so, and list in similar up to five visible titles that are closest to what they asked for.",
    "If there are several copies, box the clearest one.",
  ].join("\n");
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

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const conf = (v) => (Number.isFinite(Number(v)) ? Math.round(clamp01(Number(v)) * 100) / 100 : 0.5);

/** Trim and check a scan answer from either model. */
export function cleanScan(out) {
  const seen = new Set();
  const once = (title, by) => {
    const key = `${title}|${by}`.toLowerCase();
    if (!title || seen.has(key)) return false;
    seen.add(key);
    return true;
  };
  const books = (Array.isArray(out?.books) ? out.books : []).slice(0, 300)
    .map((b) => ({ title: text(b?.title, 200), author: text(b?.author, 120) || null, confidence: conf(b?.confidence) }))
    .filter((b) => once(b.title, b.author));
  const games = (Array.isArray(out?.games) ? out.games : []).slice(0, 300)
    .map((g) => {
      const year = Number(g?.year);
      return {
        title: text(g?.title, 200),
        publisher: text(g?.publisher, 120) || null,
        designer: text(g?.designer, 120) || null,
        year: Number.isInteger(year) && year > 1000 && year < 2100 ? year : null,
        confidence: conf(g?.confidence),
      };
    })
    .filter((g) => once(g.title, g.publisher));
  const unreadable = Math.max(0, Math.min(999, Math.round(Number(out?.unreadable) || 0)));
  return { books, games, unreadable };
}

/** Trim and check a find answer; turns the pixel box into fractions of the image. */
export function cleanFind(out, width, height) {
  const b = out?.box;
  let box = null;
  if (b && typeof b === "object") {
    const x0 = clamp01(Math.min(b.x0, b.x1) / width), x1 = clamp01(Math.max(b.x0, b.x1) / width);
    const y0 = clamp01(Math.min(b.y0, b.y1) / height), y1 = clamp01(Math.max(b.y0, b.y1) / height);
    if ([x0, x1, y0, y1].every(Number.isFinite) && x1 - x0 > 0.002 && y1 - y0 > 0.002) {
      box = { x0: +x0.toFixed(4), y0: +y0.toFixed(4), x1: +x1.toFixed(4), y1: +y1.toFixed(4) };
    }
  }
  const found = Boolean(out?.found) && box !== null;
  return {
    found,
    title: text(out?.title, 200) || null,
    box: found ? box : null,
    where: text(out?.where, 300),
    similar: (Array.isArray(out?.similar) ? out.similar : []).map((s) => text(s, 200)).filter(Boolean).slice(0, 5),
  };
}

/** The first JSON object in a model's text answer. */
export function parseJsonText(s) {
  const str = String(s ?? "");
  const start = str.indexOf("{"), end = str.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON in response");
  return JSON.parse(str.slice(start, end + 1));
}

async function askClaude(env, mode, r) {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const response = await client.beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: { type: "json_schema", schema: mode === "scan" ? SCAN_SCHEMA : FIND_SCHEMA } },
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: r.image } },
        { type: "text", text: mode === "scan" ? scanPrompt() : findPrompt(r) },
      ],
    }],
  });
  if (response.stop_reason === "refusal") throw new Error("refused");
  const answer = response.content.find((block) => block.type === "text");
  if (!answer) throw new Error("no text in response");
  return JSON.parse(answer.text);
}

async function askWorkersAI(env, mode, r) {
  const schema = JSON.stringify(mode === "scan" ? SCAN_SCHEMA : FIND_SCHEMA);
  const out = await env.AI.run(WORKERS_AI_MODEL, {
    messages: [
      { role: "system", content: `Answer with one JSON object only, matching this JSON schema: ${schema}` },
      {
        role: "user",
        content: [
          { type: "text", text: mode === "scan" ? scanPrompt() : findPrompt(r) },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${r.image}` } },
        ],
      },
    ],
    max_tokens: 4096,
    temperature: 0.1,
  });
  const response = out?.response;
  return typeof response === "object" && response ? response : parseJsonText(response);
}

export async function handleBookzam(request, env, mode, headers) {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers });
  if (mode !== "scan" && mode !== "find") return new Response("Not found", { status: 404, headers });
  let body;
  try { body = await request.json(); } catch { body = null; }
  const r = readPhotoRequest(body, mode);
  if (!r) return Response.json({ error: "bad_request" }, { status: 400, headers });
  const useClaude = Boolean(env.ANTHROPIC_API_KEY);
  if (!useClaude && !env.AI) return Response.json({ error: "unavailable" }, { status: 503, headers });
  if (limited(request.headers.get("CF-Connecting-IP") || "local")) {
    return Response.json({ error: "rate_limited" }, { status: 429, headers });
  }
  try {
    let out, source = "workers-ai";
    if (useClaude) {
      // A failed Claude call (a bad key, an outage) still gets an answer from Workers AI.
      try { out = await askClaude(env, mode, r); source = "claude"; } catch (e) { if (!env.AI) throw e; console.error(e); }
    }
    if (!out) out = await askWorkersAI(env, mode, r);
    const result = mode === "scan" ? cleanScan(out) : cleanFind(out, r.width, r.height);
    return Response.json({ ...result, source }, { headers });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "model_failed" }, { status: 502, headers });
  }
}
