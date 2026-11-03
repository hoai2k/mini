// A landing can immediately become the next take-off. Keep one jump intention
// per player, including a tap or charged release made during the current arc.
export const RECOCK_TIME = 0.08;
const CHARGE_TIME = 0.7;
const GROUND_BUFFER = 0.18;

export function updateJumpInput(player, input, dt, aim) {
  player.cock = Math.min(1, player.cock + dt / RECOCK_TIME);
  const free = player.mode === 'air' || player.mode === 'film' || player.mode === 'moss';
  if (!free || input.defend || player.hunker >= 0.5) {
    player.charging = false;
    player.charge = 0;
    player.queuedJump = null;
    return;
  }
  if (player.queuedJump && player.mode !== 'air') {
    player.queuedJump.left -= dt;
    if (player.queuedJump.left <= 0) player.queuedJump = null;
  }
  if (input.dashDown) {
    player.queuedJump = null;
    player.charging = true;
    player.charge = Math.min(1, player.charge + dt / CHARGE_TIME);
    player.aim = { ...aim };
  } else if (player.charging || input.dashPressed) {
    player.queuedJump = { ...aim, power: 0.12 + 0.88 * player.charge, left: GROUND_BUFFER };
    player.charging = false;
    player.charge = 0;
  }
}

export function takeQueuedJump(player) {
  if (!player.queuedJump || player.cock < 1 || (player.mode !== 'film' && player.mode !== 'moss')) return null;
  const jump = player.queuedJump;
  player.queuedJump = null;
  return jump;
}
