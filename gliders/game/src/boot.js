// The game's entry point, behind the shared invite door (src/gate/gate.js, a
// byte-identical copy of the one in the hoai2k.github.io repository). The door
// is off on localhost; once through, the game itself is imported, which starts it.
import { openGate } from './gate/gate.js';

void openGate({
  title: 'Gliders',
  game: 'gliders',
  blurb: 'This game is for friends of Hoai Nguyen. Use your invite link, or enter your code below.',
  // In the prototype archive: the public-access switch for the finished games
  // does not open it. Only an invite pass does.
  ignorePublicAccess: true,
}).then(() => import('./main.js'));
