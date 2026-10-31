// Micro Zoom starts behind the shared invite door (the game is in the
// prototype archive, so the public-access switch does not open it unless
// public-access.json beside index.html says { "followPublicAccess": true }).
// The door is off on localhost.
import { boot } from '../../prototypes/shared/boot.js';

boot(() => import('./main.js'));
