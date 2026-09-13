// Count a pageview, and nothing more than a pageview.
//
// Every page under /mini/sites/ loads this one line:
//
//   <script type="module" src="../stats/counter.js"></script>
//
// The question it exists to answer is "is anyone I don't know looking at
// these?", which needs roughly where a visit came from, what linked it, and
// what it was read on — and nothing else. So this loads GoatCounter's counter
// and stops there: no identifiers of our own, no per-page events, no scroll or
// click tracking. What GoatCounter records is on its own privacy page
// (https://www.goatcounter.com/help/privacy) and is deliberately thin: country
// from the IP, referrer, browser, OS, screen width, language, path and time.
// It stores no IP addresses, no full User-Agent and no tracker ID, and it sets
// no cookies, so there is no consent banner to add.
//
// Failure here must never cost the page anything. The script is appended async
// and its errors are swallowed: an ad blocker eating gc.zgo.at is the common
// case, the visit simply goes uncounted, and the reader never learns that
// anything was meant to happen.
//
// Local viewing is not counted. count.js skips localhost, 127.x, 10.x,
// 192.168.x and file:// on its own, which is what you want — the dashboard
// should be other people, not you reloading a page you are building.
//
// The stats page itself deliberately does not load this. A back office that
// counts its own visits inflates exactly the number it is there to report.

import { GOATCOUNTER_SITE, countEndpoint } from './config.js';

const COUNT_JS = 'https://gc.zgo.at/count.js';

function isLocal() {
  return (
    /^(localhost|127\.|\[?::1)/.test(location.hostname) ||
    location.protocol === 'file:'
  );
}

/** Attach the counter. Safe to call on a page that is not configured for it. */
export function installStats() {
  const endpoint = countEndpoint(GOATCOUNTER_SITE);
  if (!endpoint) {
    // Quiet on a dev machine — there is nothing wrong with a local page not
    // counting. Loud on the published site, because there "nobody has ever
    // visited" and "the counter was never switched on" look identical from the
    // stats page, and this is the only place that can tell them apart.
    if (!isLocal()) {
      console.info(
        '[stats] visitor stats are off — set GOATCOUNTER_SITE in sites/stats/config.js',
      );
    }
    return;
  }

  const tag = document.createElement('script');
  tag.async = true;
  tag.src = COUNT_JS;
  tag.dataset.goatcounter = endpoint;
  tag.addEventListener('error', () => {
    console.info('[stats] counter blocked or unreachable — this visit went uncounted');
  });
  document.head.append(tag);
}

installStats();
