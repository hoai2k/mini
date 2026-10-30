// Every prototype page starts here: the shared invite door first (the
// prototypes are in the prototype archive, so the public-access switch does
// not open them unless public-access.json beside the page says
// { "followPublicAccess": true }), then the prototype's own main module.
// The door is off on localhost.
import { openGate } from './gate/gate.js';

export function boot(start) {
  void openGate({
    title: 'Micro prototypes',
    game: 'micro',
    blurb: 'These prototypes are for friends of Hoai Nguyen. Use your invite link, or enter your code below.',
    ignorePublicAccess: true,
    accessFile: 'public-access.json',
  }).then(start);
}
