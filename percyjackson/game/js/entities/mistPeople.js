// People in the Mist (chapters with Mist: the museum first): mortals milling
// around, some of them real (always harmless) and some monsters in disguise.
// While the Mist is on, nobody who looks like a person can be hurt: a swing
// or a shot that would hit them makes them recoil and scold the hero, then
// they go back to what they were doing (disguised monsters too, so they
// don't give themselves away). True Sight (mist.js) turns the disguised ones
// into creatures that look nothing like people: serpents, spiders, ghosts.
// Real mortals stay people (with a soft, calm outline under True Sight).
// Pure data and rules (the node tests load it); entities/enemy.js runs them.

// What disguised monsters really are, by chapter (chapters.js mistForms;
// this when a chapter names none).
export const MIST_FORMS = ['serpent', 'spider', 'ghost'];
// A disguised monster's true kind (r in [0, 1)).
export function mistForm(forms, r) {
  const list = forms?.length ? forms : MIST_FORMS;
  return list[Math.min(list.length - 1, Math.floor(r * list.length))];
}

// Seconds before the same person scolds again (each hit still makes them flinch).
export const SCOLD_EVERY = 3;
export const RECOIL = 0.55;      // seconds they step back, arms up
export const SETTLE = 1.6;       // seconds they glare at the hero before going back to their business

export const SCOLD = {
  teacher: ['Young man! Detention!', 'I beg your pardon?!', 'I’m telling Mr. Brunner!', 'That is quite enough!'],
  student: ['Hey! Watch it!', 'Dude, what?!', 'I’m telling Mr. Brunner!', 'Ow! Weirdo!'],
  tourist: ['Excuse me?!', 'Hey, I’m taking a picture here!', 'How rude!', 'Is this some kind of show?'],
  guard: ['No horseplay in the museum!', 'Hands to yourself, kid.', 'Do I need to call your teacher?', 'Walk, don’t swing!'],
  old_lady: ['Well, I never!', 'Mind your manners, dear!', 'Young people these days!', 'I’ll knit you some manners!'],
  bellhop: ['Sir! Please!', 'Easy there, valued guest!', 'Have a lotus and calm down.', 'No roughhousing in the lobby!'],
  farmer: ['Hey now!', 'Watch where you swing that thing!', 'Get off my land!'],
  salesman: ['Whoa there, friend!', 'No touching the merchandise!', 'Is that how you haggle?'],
};
// A line for a mortal of this kind (r in [0, 1)); `last` is avoided if it can be.
export function scoldLine(id, r, last = null) {
  const lines = SCOLD[id] ?? SCOLD.student;
  let i = Math.min(lines.length - 1, Math.floor(r * lines.length));
  if (lines[i] === last && lines.length > 1) i = (i + 1) % lines.length;
  return lines[i];
}
// May this person say something now? (the last line at `lastT`, now `t`)
export const mayScold = (lastT, t) => lastT == null || t - lastT >= SCOLD_EVERY;
