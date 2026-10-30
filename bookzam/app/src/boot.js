// The app's entry point, behind the shared invite door (src/gate/gate.js, a
// copy of gate/loader.js from hoai2k.github.io, which loads the shared door). The door
// is off on localhost; once through, the app itself is imported, which starts it.
import { openGate } from './gate/gate.js';

void openGate({
  title: 'Bookzam',
  game: 'bookzam',
  blurb: 'This app is for friends of Hoai Nguyen. Use your invite link, or enter your code below.',
  // In the prototype archive: the public-access switch for the finished games
  // does not open it. Only an invite pass does.
  ignorePublicAccess: true,
  // ...unless public-access.json beside index.html says
  // { "followPublicAccess": true }: then it follows the switch like the others.
  accessFile: 'public-access.json',
}).then(() => import('./main.js'));
