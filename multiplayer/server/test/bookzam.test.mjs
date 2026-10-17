// Unit tests for the Bookzam answer cleaning (src/bookzam.js), no worker needed.
import { test } from "node:test";
import assert from "node:assert/strict";

// bookzam.js imports the SDK; that import is plain ESM and loads under Node.
const { readPhotoRequest, cleanScan, cleanFind, parseJsonText } = await import("../src/bookzam.js");

test("photo requests are checked", () => {
  const image = "QUJD".repeat(40);
  assert.ok(readPhotoRequest({ image, width: 800, height: 600 }, "scan"));
  assert.equal(readPhotoRequest({ image, width: 800, height: 600 }, "find"), null);
  assert.equal(readPhotoRequest({ image, width: 800, height: 600, query: "  " }, "find"), null);
  assert.equal(readPhotoRequest({ image, width: 1569, height: 600 }, "scan"), null);
  assert.equal(readPhotoRequest({ image: "a b", width: 800, height: 600 }, "scan"), null);
  assert.equal(readPhotoRequest({ image: `data:image/jpeg;base64,${image}`, width: 800, height: 600, query: "Dune" }, "find").query, "Dune");
});

test("scan answers are trimmed and deduplicated", () => {
  const out = cleanScan({
    books: [
      { title: " Dune ", author: "Frank Herbert", confidence: 0.9 },
      { title: "dune", author: "frank herbert", confidence: 0.4 },
      { title: "", author: "Nobody", confidence: 1 },
      { title: "Emma", author: "", confidence: 7 },
    ],
    games: [{ title: "Catan", publisher: "Kosmos", designer: null, year: 1995.5, confidence: "x" }],
    unreadable: -3,
  });
  assert.deepEqual(out.books, [
    { title: "Dune", author: "Frank Herbert", confidence: 0.9 },
    { title: "Emma", author: null, confidence: 1 },
  ]);
  assert.deepEqual(out.games, [{ title: "Catan", publisher: "Kosmos", designer: null, year: null, confidence: 0.5 }]);
  assert.equal(out.unreadable, 0);
  assert.deepEqual(cleanScan(null), { books: [], games: [], unreadable: 0 });
});

test("find boxes become fractions of the image", () => {
  const out = cleanFind({ found: true, title: "Dune", box: { x0: 600, y0: 300, x1: 200, y1: 100 }, where: "Top shelf.", similar: [] }, 800, 400);
  assert.deepEqual(out.box, { x0: 0.25, y0: 0.25, x1: 0.75, y1: 0.75 });
  assert.equal(out.found, true);
  const off = cleanFind({ found: true, title: "Dune", box: { x0: 10, y0: 10, x1: 10, y1: 10 }, where: "", similar: ["A", "B"] }, 800, 400);
  assert.equal(off.found, false, "a box with no size is no find");
  assert.equal(off.box, null);
  assert.deepEqual(cleanFind({ found: false, box: null, similar: [1, "", "C", "D", "E", "F", "G"] }, 800, 400).similar, ["1", "C", "D", "E", "F"]);
});

test("JSON is pulled out of a chatty answer", () => {
  assert.deepEqual(parseJsonText('Here you go:\n```json\n{"found": false}\n```'), { found: false });
  assert.throws(() => parseJsonText("no idea"));
});
