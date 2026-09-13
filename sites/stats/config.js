// The one value that turns visitor stats on for everything under /mini/sites/,
// and the only one worth editing.
//
// These pages are static: GitHub Pages serves files and runs nothing, so there
// is no request log to read and nowhere to write one. Counting a visit
// therefore has to happen in the visitor's browser, against something that is
// not Pages. That something is GoatCounter (https://www.goatcounter.com), an
// open-source counter with a free hosted tier — the same one the games use, so
// there is one thing to learn rather than two.
//
// This is switched on. The code below is the GoatCounter site's subdomain,
// so visits land at https://hoai.goatcounter.com and the stats page frames
// that dashboard.
//
// To point it somewhere else, change the code below and nothing else — one
// value serves every site under sites/ and the Hopper game. To switch counting
// off entirely, set it to the empty string: nothing is sent anywhere, and the
// stats page says so and gives the setup steps rather than showing an empty
// dashboard, which would read as "nobody has ever visited".
//
// For the dashboard to appear inline on the stats page rather than only at its
// own address, GoatCounter's Settings → "Sites that can embed GoatCounter"
// needs `hoai2k.github.io` and `games.hoai.net`, which is where the published
// pages actually answer. Without that the frame goes blank; the link beside it
// still works.
//
// Kept as a bare code rather than a full URL because a full URL is the thing
// people paste by mistake, and half a URL glued to "/count" fails silently —
// so countEndpoint() below refuses anything that is not a code.
export const GOATCOUNTER_SITE = 'hoai';

/** Is a code shaped like one GoatCounter would have issued?
 *
 *  Their codes are lowercase alphanumeric with hyphens. Anything else is a
 *  paste accident — most often the whole `https://x.goatcounter.com/count`
 *  URL, which would otherwise be concatenated into a nonsense endpoint that
 *  404s once per pageview with nothing on screen to say why. */
export function isValidSite(code) {
  return typeof code === 'string' && /^[a-z0-9][a-z0-9-]{0,49}$/.test(code);
}

/** Where count.js sends a pageview. Null when unconfigured or malformed. */
export function countEndpoint(code = GOATCOUNTER_SITE) {
  if (!code) return null;
  if (!isValidSite(code)) {
    console.error(
      `[stats] GOATCOUNTER_SITE is "${code}", which is not a GoatCounter code. ` +
        `Use the bare code — "hoai", not "https://hoai.goatcounter.com". ` +
        `See sites/stats/config.js.`,
    );
    return null;
  }
  return `https://${code}.goatcounter.com/count`;
}

/** The dashboard for a code, for the stats page to frame and link to. */
export function dashboardUrl(code = GOATCOUNTER_SITE) {
  return isValidSite(code) ? `https://${code}.goatcounter.com` : null;
}

/** The sites this counter covers, one entry per directory under sites/.
 *
 *  One GoatCounter site covers everything, because the path it records is
 *  already the name of the thing visited — so the dashboard's Pages view is
 *  the breakdown, with no extra configuration. This list exists so the stats
 *  page can show which paths to look for, and so the smoke test knows which
 *  pages must carry the counter.
 *
 *  `rel` is relative to sites/, which is where the stats page lives. */
export const SITES = [
  { name: 'Ygent Records', dir: 'ygent', rel: 'ygent/' },
  { name: 'Space Tiber', dir: 'space-tiber', rel: 'space-tiber/' },
  { name: "Charlie's Girl Dolls", dir: 'charlies-girl-dolls', rel: 'charlies-girl-dolls/' },
  { name: 'Canagentsis', dir: 'canagentsis', rel: 'canagentsis/' },
  { name: 'Mech Mayhem', dir: 'mechmayhem', rel: 'mechmayhem/' },
  { name: 'The Railway Trio', dir: 'railway', rel: 'railway/' },
  { name: 'Stratford Tennis Club', dir: 'stratfordtennisclub', rel: 'stratfordtennisclub/' },
];

/** The games, counted by the same GoatCounter site but not living under
 *  sites/.
 *
 *  Hopper is a built Vite app, so it cannot include counter.js the way a
 *  hand-written page does: Vite resolves and bundles any module `src` in its
 *  entry page, which would bake a copy of the code above into the game's
 *  JavaScript. Its entry page uses an inline dynamic import instead, resolved
 *  by the browser at run time — see the comment in hopper/index.html.
 *  `entry` is the repo path the smoke test checks. */
export const GAMES = [
  { name: 'Hopper the Grasshopper', rel: '../hopper/', entry: 'hopper/index.html' },
];

/** Everything the counter covers, sites and games, in one list. */
export const COUNTED = [...SITES, ...GAMES];
