// The AI opening: two or three sentences above a reading that show the
// question was understood and introduce the answer. Chrome's built-in model
// writes it on the device when the browser has one ready; otherwise the
// mini-rooms Worker asks Workers AI (multiplayer/server/src/oracle.js). If
// neither answers, the reading simply has no opening. Openings are kept in
// localStorage per reading, so a reading always shows the same one.

import { TOPICS, KINDS } from './topics.js';

export const ORACLE_URL = 'https://mini-rooms.hoai2k.workers.dev/oracle';
const OFF_KEY = 'aiching:ai';
const CHROME_TIMEOUT_MS = 30000;
const WORKER_TIMEOUT_MS = 20000;

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* blocked */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* blocked */ } },
};

export const aiEnabled = () => store.get(OFF_KEY) !== 'off';
export function setAiEnabled(on) { if (on) store.del(OFF_KEY); else store.set(OFF_KEY, 'off'); }

/** What the model is told about a reading. Mirrors readOracleRequest in oracle.js. */
export function oraclePayload(r) {
  return {
    question: r.question.slice(0, 600),
    day: r.day,
    seed: r.seed,
    kind: KINDS[r.about.kind].label,
    topic: r.about.primary ? TOPICS[r.about.primary].label : '',
    hexagram: { n: r.primary.n, name: r.primary.name, zh: r.primary.zh, essence: r.primary.essence },
    relating: r.relating ? { n: r.relating.n, name: r.relating.name, essence: r.relating.essence } : null,
    lines: r.focus.stressed.slice(0, 3).map((l) => l.text),
    counsel: r.counsel[0]?.text || '',
  };
}

// Keep in step with oracleMessages() in multiplayer/server/src/oracle.js.
export const SYSTEM_PROMPT = 'You open a reading of the I Ching for someone who asked a question. Write 2 or 3 short sentences, warm and plain, in the second person. '
  + 'First sentence: show you understood what they are really asking or feeling, in your own words, without repeating the question. '
  + 'Then write one sentence that begins exactly with "The coins answered with" followed by the hexagram name you are given, and says how it answers them, using only the meaning given to you. '
  + 'Do not invent other I Ching meanings, do not predict specific events, do not give medical, legal or financial instructions, no lists, no headings, no quotation marks, under 75 words.';

export function factsText(p) {
  return [
    `Question: ${p.question}`,
    p.kind ? `Kind of question: ${p.kind}` : '',
    p.topic ? `About: ${p.topic}` : '',
    `Hexagram: ${p.hexagram.n}, ${p.hexagram.zh} ${p.hexagram.name}. Meaning: ${p.hexagram.essence}`,
    p.counsel ? `Counsel for this question: ${p.counsel}` : '',
    p.lines.length ? `Changing lines: ${p.lines.join(' | ')}` : 'No changing lines: the situation is settled.',
    p.relating ? `It is turning into hexagram ${p.relating.n}, ${p.relating.name}: ${p.relating.essence}` : '',
  ].filter(Boolean).join('\n');
}

/** Tidy a model's answer: one paragraph, no wrapping quotes, a sane length. */
export function tidy(s) {
  let t = String(s || '').replace(/\s+/g, ' ').trim().replace(/^["'“]+|["'”]+$/g, '');
  if (t.length > 700) t = `${t.slice(0, 700).replace(/[^.!?]*$/, '')}`.trim() || t.slice(0, 700);
  return t;
}

function withTimeout(promise, ms, onTimeout) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => { timer = setTimeout(() => { onTimeout?.(); reject(new Error('timeout')); }, ms); }),
  ]);
}

const LM_OPTIONS = { expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] };

/** Chrome's built-in model, only when it is already on the device. */
export async function chromeOpening(p, onText, lm = globalThis.LanguageModel) {
  if (!lm?.availability || !lm.create) return null;
  let status;
  try { status = await lm.availability(LM_OPTIONS); } catch { return null; }
  if (status !== 'available') return null; // never start a model download unasked
  const ctrl = new AbortController();
  const run = (async () => {
    const session = await lm.create({ ...LM_OPTIONS, signal: ctrl.signal, initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }] });
    try {
      let acc = '';
      if (session.promptStreaming) {
        const stream = session.promptStreaming(factsText(p), { signal: ctrl.signal });
        for await (const chunk of stream) {
          // Older Chrome builds sent the whole text so far; newer ones send deltas.
          acc = chunk.startsWith(acc) && acc ? chunk : acc + chunk;
          onText?.(tidy(acc));
        }
      } else {
        acc = await session.prompt(factsText(p), { signal: ctrl.signal });
      }
      return tidy(acc);
    } finally {
      session.destroy?.();
    }
  })();
  const text = await withTimeout(run, CHROME_TIMEOUT_MS, () => ctrl.abort());
  return text ? { text, source: 'chrome' } : null;
}

/** Workers AI through the mini-rooms Worker. */
export async function workerOpening(p, fetchImpl = globalThis.fetch) {
  const ctrl = new AbortController();
  const res = await withTimeout(fetchImpl(ORACLE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(p),
    signal: ctrl.signal,
  }), WORKER_TIMEOUT_MS, () => ctrl.abort());
  if (!res.ok) return null;
  const data = await res.json();
  const text = tidy(data.opening);
  return text ? { text, source: 'workers-ai' } : null;
}

/**
 * The opening for a reading: cached, else Chrome, else the Worker, else null.
 * onText receives the text as it streams in (Chrome only).
 */
export async function aiOpening(r, { onText, lm, fetchImpl } = {}) {
  const key = `aiching:open2:${r.day}:${r.seed}`;
  const hit = store.get(key);
  if (hit) { try { return JSON.parse(hit); } catch { store.del(key); } }
  const p = oraclePayload(r);
  let out = null;
  try { out = await chromeOpening(p, onText, lm); } catch { out = null; }
  if (!out) { try { out = await workerOpening(p, fetchImpl); } catch { out = null; } }
  if (out) store.set(key, JSON.stringify(out));
  return out;
}
