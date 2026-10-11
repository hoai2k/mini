// Reading a question: what it is about (its topics) and what kind of answer
// it wants (a yes or no, a when, a why). The reading uses this to choose which
// counsel comes first, how the page is ordered and what it fetches online.

export const TOPICS = {
  love:       { label: 'Love & partnership', zh: '情', words: ['love', 'lover', 'partner', 'boyfriend', 'girlfriend', 'husband', 'wife', 'spouse', 'marr', 'dating', 'date', 'relationship', 'crush', 'romanc', 'romantic', 'ex', 'divorce', 'wedding', 'soulmate', 'kiss', 'break up', 'breakup', 'propose', 'engage', 'attract', 'flirt', 'heart'] },
  work:       { label: 'Work & calling', zh: '業', words: ['job', 'career', 'work', 'boss', 'manager', 'colleague', 'coworker', 'business', 'promot', 'interview', 'company', 'startup', 'project', 'client', 'team', 'office', 'hire', 'hiring', 'fired', 'quit', 'resign', 'profession', 'launch', 'employ', 'founder', 'venture', 'contract', 'deadline'] },
  money:      { label: 'Wealth & resources', zh: '財', words: ['money', 'invest', 'stock', 'share', 'crypto', 'buy', 'sell', 'house', 'rent', 'debt', 'loan', 'saving', 'financ', 'rich', 'wealth', 'price', 'salary', 'pay', 'budget', 'mortgage', 'afford', 'income', 'profit', 'cost', 'spend', 'property', 'bank'] },
  health:     { label: 'Health & body', zh: '康', words: ['health', 'sick', 'ill', 'doctor', 'body', 'sleep', 'diet', 'weight', 'exercise', 'pain', 'heal', 'anxi', 'stress', 'tired', 'energy', 'surgery', 'medic', 'therap', 'mental', 'burnout', 'recover', 'fitness', 'injur', 'drink', 'smok'] },
  family:     { label: 'Family & friends', zh: '家', words: ['family', 'mother', 'father', 'mom', 'mum', 'dad', 'parent', 'child', 'kid', 'son', 'daughter', 'sister', 'brother', 'baby', 'pregnan', 'grandm', 'grandf', 'grandp', 'home', 'sibling', 'friend', 'cousin', 'aunt', 'uncle', 'in-law', 'neighbo', 'household'] },
  creativity: { label: 'Creative work', zh: '藝', words: ['write', 'writing', 'novel', 'book', 'art', 'paint', 'music', 'song', 'band', 'album', 'creat', 'design', 'film', 'poem', 'poetry', 'inspir', 'idea', 'craft', 'game', 'draw', 'photo', 'dance', 'perform', 'compose', 'studio', 'gallery'] },
  study:      { label: 'Study & learning', zh: '學', words: ['study', 'school', 'exam', 'test', 'universit', 'college', 'degree', 'learn', 'course', 'thesis', 'teacher', 'class', 'grade', 'scholarship', 'phd', 'master', 'student', 'research', 'language', 'skill', 'train'] },
  travel:     { label: 'Journeys & moves', zh: '旅', words: ['travel', 'trip', 'move', 'moving', 'relocat', 'abroad', 'journey', 'visit', 'flight', 'fly', 'vacation', 'holiday', 'city', 'country', 'emigrat', 'migrat', 'overseas', 'road', 'leave town', 'new place'] },
  spirit:     { label: 'Spirit & meaning', zh: '道', words: ['meaning', 'purpose', 'life', 'soul', 'spirit', 'god', 'faith', 'path', 'destiny', 'fate', 'happy', 'happiness', 'peace', 'myself', 'calling', 'meditat', 'pray', 'believ', 'universe', 'wisdom', 'grief', 'death', 'die', 'lonely', 'alone', 'fear', 'afraid'] },
  conflict:   { label: 'Conflict & rivals', zh: '訟', words: ['fight', 'argu', 'conflict', 'lawsuit', 'sue', 'court', 'legal', 'lawyer', 'enemy', 'rival', 'compet', 'dispute', 'war', 'angry', 'anger', 'betray', 'justice', 'negotiat', 'quarrel', 'revenge', 'forgive', 'apolog', 'blame', 'trust'] },
};

export const KINDS = {
  decision: { label: 'A choice to make', test: /^(should|shall|must|ought|do i|is it (wise|right|time|worth)|would it|will it|can i|may i)\b|\b(or not|whether|should i|should we|is it worth|worth it|decide|decision|choose|choice)\b/ },
  timing:   { label: 'A question of time', test: /\b(when|how (long|soon)|what time|until|yet|right time|too late|too early|this year|next year|soon)\b/ },
  why:      { label: 'A search for understanding', test: /^(why|what does|what is the meaning|what am i)\b|\bwhy\b/ },
  how:      { label: 'A search for a way', test: /^(how|what can i|what should i|what do i)\b/ },
  open:     { label: 'An open question', test: /.^/ },
};

const STOP = new Set('a an the and or but if then so to of in on at for with from by about into over after before is are was were be been being am do does did doing have has had having i me my mine we us our you your he him his she her it its they them their this that these those what which who whom whose when where why how will would shall should can could may might must not no yes there here just very really more most some any all each other than too also only own same such get got make let go going want need know think feel like now ever'.split(' '));

function words(text) {
  return (text.toLowerCase().match(/[\p{L}\p{N}'-]+/gu) || []).map((w) => w.replace(/^'+|'+$/g, ''));
}

/** Content words of a question, without stop words, longest first. */
export function keywords(text) {
  const seen = new Set();
  return words(text)
    .filter((w) => w.length > 2 && !STOP.has(w) && !seen.has(w) && seen.add(w))
    .sort((a, b) => b.length - a.length);
}

/** Classify a question: ranked topics, the kind of answer and its key words. */
export function classify(text) {
  const t = ` ${String(text || '').toLowerCase()} `;
  const ws = words(t);
  const scores = Object.entries(TOPICS).map(([key, topic]) => {
    let score = 0;
    for (const stem of topic.words) {
      if (stem.includes(' ')) { if (t.includes(stem)) score += 2; continue; }
      for (const w of ws) {
        if (w === stem) score += 2;
        else if (stem.length >= 4 && w.startsWith(stem)) score += 1.5;
      }
    }
    return { key, score };
  }).filter((s) => s.score > 0).sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));

  const trimmed = t.trim();
  const kind = ['decision', 'timing', 'why', 'how'].find((k) => KINDS[k].test.test(trimmed)) || 'open';

  return {
    topics: scores,
    primary: scores[0]?.key || null,
    secondary: scores[1]?.key || null,
    kind,
    keywords: keywords(text),
  };
}
