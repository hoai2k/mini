# Ai-Ching

An I Ching reader that looks like an AI prompt. Type a question of any kind;
Ai-Ching casts a hexagram from your words and the day, then reads it for that
question on a page of pictures, counsel, the day's almanac and signs of the day
gathered from Wikipedia.

Published at https://hoai2k.github.io/mini/aiching/.

## How a reading is made

1. **Seed.** The question (lower-cased, spacing tidied) and the local date are
   hashed (cyrb128) into a seeded generator (sfc32), `src/rng.js`. The same
   question on the same day gives the same reading; a new day or a new
   question casts again.
2. **Cast.** Six throws of three coins, bottom line first, with the classic
   odds (6 and 9 are changing lines, 1 in 8 each), `src/iching.js`. Changing
   lines give the hexagram it becomes; the inner lines give the nuclear
   hexagram. Which lines to stress follows Zhu Xi's rules.
3. **Read the question.** `src/topics.js` scores it against ten topics (love,
   work, money, health, family, creativity, study, travel, spirit, conflict)
   and finds what kind of answer it wants (a decision, a time, a why, a how).
4. **Shape the page.** `src/reading.js` puts the counsel for the question's
   kind and topics first, orders the sections by kind (a "when" question
   brings the almanac up, a "should I" question brings the moving lines and
   where they lead up), and picks the sage's words and the lore to fetch for
   the topic. A question with no topic gets a lens chosen by the cast.
5. **Online.** `src/online.js` loads Wikipedia's daily feed for the reading's
   date and picks the "on this day" event and news item that best match the
   question's words, its topic and the hexagram's trigrams, plus the picture
   of the day, and summaries of two or three Wikipedia articles chosen for
   the topic and the trigrams. Every source is optional and fails quietly;
   results are cached for the browser session. Each reading also links to
   Legge's 1882 translation on sacred-texts.com.
6. **Almanac.** `src/almanac.js` works out the Chinese lunar date (the
   browser's Chinese calendar), the day's stem and branch, the solar term,
   the moon and the double-hour, all offline.

The question and date live only in the URL fragment (`#q=…&d=…`), so a reading
can be shared as a link. The question is sent to a server only for the AI
opening, when the browser has no built-in model (see below).

## Files

| Path | What |
| --- | --- |
| `app/index.html`, `app/styles.css` | The page: the home prompt, the casting, the reading |
| `app/src/` | ES modules, no build step |
| `app/data/hexagrams.json` | The 64 hexagrams: names, judgment, image, changing lines, counsel by topic and kind, and a painted scene and palette for each picture. Original renderings of the traditional meanings |
| `app/data/asset-list.json` | Generated: every picture, its path and whether it is delivered |
| `app/assets/` | Delivered artwork, full size (not published) |
| `app/web/` | Web copies of the artwork, which the page loads |
| `tools/build_web.py` | Makes `app/web/` from `app/assets/` |
| `design/image-requests.md` | Generated: the 96 image prompts |
| `design/source/build_requests.py` | Generates both from its own data and `hexagrams.json` |
| `intake/` | Drop box for delivered art |

All 96 pictures were delivered in October 2026; the prompts they were made
from are recorded in `design/generated/generation-prompts.json`. The page
loads the smaller copies in `app/web/` (`tools/build_web.py`, which needs
Pillow, makes them from `app/assets/`; a reading loads about 1 MB of art).
The 24 hexagram pictures that missed their requested art style have been
replaced and their web copies rebuilt. Their final prompts are recorded in
`design/generated/replacement-prompts.json`. Checked against their styles
on 11 October 2026: all 24 now read as their medium (the three embroideries
show stitch texture close up), so there are no outstanding replacement
requests. Stand-ins (`src/art.js`) remain for any picture not
yet delivered.

## The AI opening

Above each reading, two or three sentences show that the question was
understood and introduce the answer (`src/ai.js`). They come from:

1. Chrome's built-in model (the Prompt API, `LanguageModel`) when the browser
   reports it as already available. It runs on the device; the page never
   starts a model download.
2. Otherwise `POST /oracle` on the mini-rooms Worker
   (`multiplayer/server/src/oracle.js`), which runs
   `@cf/meta/llama-3.2-3b-instruct` on Workers AI's free allowance. The Worker
   builds the prompt itself from the reading, caches each answer for a day,
   and limits each visitor to 20 calls per 10 minutes.
3. Otherwise nothing: the reading is complete without it.

Both are told to reflect the question back, name the hexagram and say how it
answers, using only the meaning in `hexagrams.json`. Openings are kept in
localStorage per reading, so a reading always shows the same one. Visitors can
turn the opening off on the home page or under any opening.

## Speaking a question

A microphone button sits beside the send button in both question boxes
(`src/voice.js`). Where the browser has speech recognition (Chrome, Edge,
Safari) the words appear as they are spoken. Elsewhere (Firefox) it records
until a pause (at most 30 seconds) and posts the audio to `POST /transcribe` on
the mini-rooms Worker (`multiplayer/server/src/transcribe.js`), which runs
Whisper (`@cf/openai/whisper-large-v3-turbo`) on Workers AI, 12 per visitor
per 10 minutes. Either way the text is left in the box to check and send.

## Checks

```sh
node --test aiching/app/test/*.test.mjs
python3 aiching/design/source/build_requests.py --check
python3 aiching/tools/build_web.py --check
aiching/publish.sh local/pages/aiching
```

To try it, serve `local/pages/` (for example `python3 -m http.server` there)
and open `/aiching/`.
