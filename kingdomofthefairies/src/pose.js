// A pose sprite drawn with its feet at (x, by), at the scale of a character
// `standH` stage px tall whose standing figure is `std` art px tall in that
// sprite family (the prince's movement and pose frames 360, the crew and the
// courtiers 420). The audit's character-size correction (POSE_FIT) is applied
// by the loader. `face` -1 mirrors; `rot` turns it about a point `pivot` px
// above the feet. False when the sprite has not been delivered.
export function drawPose(k, id, x, by, standH, { std = 360, face = 1, rot = 0, pivot = 0, alpha = null } = {}) {
  const im = k.img(id);
  if (!im) return false;
  const s = standH / std, w = (im.naturalWidth || im.width) * s, h = (im.naturalHeight || im.height) * s;
  const c = k.c;
  c.save();
  c.translate(x, by - pivot);
  if (rot) c.rotate(rot);
  if (face < 0) c.scale(-1, 1);
  if (alpha != null) c.globalAlpha *= alpha;
  const drawn = k.asset(id, 0, pivot, w, h);
  c.restore();
  return drawn;
}

// The film cast's id for a classic crew id (the crew's own pose sprites are
// named after it), or null outside the film's crew.
export const CREW_OF = { 'reveller-yellow': 'crew-squire', 'reveller-shaggy': 'crew-bosun', 'reveller-jester': 'crew-helmsman', 'reveller-lady': 'crew-manatarms' };
