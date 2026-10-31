// One clock keeps the closing tableau, credits and score in sync.
export const FINALE = { celebrate: 5, roll: 30, fade: 8, black: 2 };
export const FINALE_END = FINALE.celebrate + FINALE.roll + FINALE.fade + FINALE.black;
export const CREDITS = [
  { y: 0, text: 'Kingdom of the Fairies', size: 48, title: true },
  { y: 68, text: 'A hand-tinted toy theatre', size: 25 },
  { y: 190, text: 'Principal Game Designer', size: 24 },
  { y: 240, text: 'Hoai Nguyen', size: 38 },
  { y: 365, text: 'After the film', size: 24 },
  { y: 415, text: 'Le Royaume des fées (1903)', size: 34 },
  { y: 465, text: 'Georges Méliès', size: 32 },
  { y: 590, text: 'Wedding Theme', size: 24 },
  { y: 640, text: 'Procession Royale', size: 36 },
  { y: 790, text: 'Thank you for playing', size: 38 },
];
export function finaleFrame(time) {
  const clamp = n => Math.max(0, Math.min(1, n));
  const roll = clamp((time - FINALE.celebrate) / FINALE.roll);
  const fade = clamp((time - FINALE.celebrate - FINALE.roll) / FINALE.fade);
  return { roll, fade, music: 1 - fade, creditsY: 720 - roll * 1430, done: time >= FINALE_END };
}
