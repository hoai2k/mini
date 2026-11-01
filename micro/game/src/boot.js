// Micro Zoom starts through the shared prototype boot, which no longer opens
// an invite door: the game is public.
import { boot } from '../../prototypes/shared/boot.js';

boot(() => import('./main.js'));
