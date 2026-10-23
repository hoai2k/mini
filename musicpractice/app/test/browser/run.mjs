// Every browser check, on one browser and one server:
//
//   node test/browser/run.mjs            (from musicpractice/app)
//
// Each can also run alone (readability.mjs, flows.mjs). They take a few
// minutes, so they run on demand rather than on every deploy: before a push
// that changes the app's screens, styles or routine.
import { start } from './lib.mjs';
import { run as readability } from './readability.mjs';
import { run as flows } from './flows.mjs';

const env = await start();
let failed = 0;
for (const check of [flows, readability]) failed += await check(env);
await env.stop();
console.log(failed ? `${failed} failed` : 'all browser checks passed');
process.exitCode = failed ? 1 : 0;
