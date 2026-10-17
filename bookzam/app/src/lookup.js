// Looks a catalogued book up on Open Library (free, no key, and it allows
// requests from any page) to get its edition details and cover.

import { normalize, sameItem } from './catalogue.js';

const FIELDS = 'key,title,author_name,first_publish_year,isbn,cover_i,number_of_pages_median,publisher,subject';

async function search(params, signal) {
  const url = `https://openlibrary.org/search.json?${new URLSearchParams({ ...params, limit: '5', fields: FIELDS })}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Open Library ${res.status}`);
  return (await res.json()).docs || [];
}

/** The search result that is this book, or null. */
export function pickDoc(docs, book) {
  const authorOk = (d) => !book.author || !(d.author_name || []).length
    || d.author_name.some((a) => sameItem(book, { title: book.title, author: a }));
  const titleOk = (d) => sameItem({ title: book.title }, { title: d.title });
  const prefixOk = (d) => {
    const a = normalize(d.title), b = normalize(book.title);
    // Whole words only, so "It" never matches "Itinerary".
    return a.length > 2 && b.length > 2 && (a.startsWith(`${b} `) || b.startsWith(`${a} `));
  };
  const candidates = docs.filter((d) => d?.title && authorOk(d));
  return candidates.find(titleOk) || candidates.find(prefixOk) || null;
}

export function toLookup(doc) {
  const isbn13 = (doc.isbn || []).find((i) => /^97[89]\d{10}$/.test(i));
  return {
    key: doc.key,
    title: doc.title,
    authors: doc.author_name || [],
    year: doc.first_publish_year || null,
    isbn: isbn13 || (doc.isbn || [])[0] || null,
    pages: doc.number_of_pages_median || null,
    publisher: (doc.publisher || [])[0] || null,
    subjects: (doc.subject || []).slice(0, 6),
    cover: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
  };
}

/** Open Library's record for a book ({title, author}), or null if it can't be found. */
export async function lookupBook(book, signal) {
  const tries = [];
  if (book.author) tries.push({ title: book.title, author: book.author });
  tries.push({ title: book.title });
  tries.push({ q: [book.title, book.author].filter(Boolean).join(' ') });
  for (const params of tries) {
    const doc = pickDoc(await search(params, signal), book);
    if (doc) return toLookup(doc);
  }
  return null;
}
