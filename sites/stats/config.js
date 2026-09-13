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
// Setup, once, about five minutes:
//
//   1. Register a site at https://www.goatcounter.com/signup. The "code" you
//      pick becomes the subdomain: code `hoai-sites` gives you the dashboard
//      https://hoai-sites.goatcounter.com.
//   2. Put that code below.
//   3. In GoatCounter's Settings → "Sites that can embed GoatCounter", add
//      `hoai2k.github.io` (and `games.hoai.net`, which is where the published
//      pages actually answer) so /sites/stats/ can show the dashboard inline.
//   4. Push to main. The next Pages deploy starts counting.
//
// Empty is the honest default: nothing is sent anywhere, the stats page says
// so and repeats these steps, and nobody has to trust a subdomain this repo
// does not own. Kept as a bare code rather than a full URL because a full URL
// is the thing people paste by mistake, and half a URL glued to "/count" fails
// silently — so countEndpoint() below refuses anything that is not a code.
export const GOATCOUNTER_SITE = '';

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
        `Use the bare code — "hoai-sites", not "https://hoai-sites.goatcounter.com". ` +
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

/** The sites this counter covers, and the path each one reports.
 *
 *  One GoatCounter site covers all of them, because the path it records is
 *  already the name of the site — so the dashboard's Pages view is the
 *  per-site breakdown, with no extra configuration. This list exists so the
 *  stats page can show which paths to look for, and so the smoke test knows
 *  which pages must carry the counter. */
export const SITES = [
  { name: 'Ygent Records', dir: 'ygent' },
  { name: 'Space Tiber', dir: 'space-tiber' },
  { name: "Charlie's Girl Dolls", dir: 'charlies-girl-dolls' },
  { name: 'Canagentsis', dir: 'canagentsis' },
  { name: 'Mech Mayhem', dir: 'mechmayhem' },
  { name: 'The Railway Trio', dir: 'railway' },
  { name: 'Stratford Tennis Club', dir: 'stratfordtennisclub' },
];
