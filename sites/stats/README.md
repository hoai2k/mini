# Visitor stats

**Where:** https://hoai2k.github.io/mini/sites/stats/ (which redirects to
https://games.hoai.net/mini/sites/stats/).

**Question it answers:** is anyone I don't know looking at these sites or
playing the game, which ones, and roughly where are they?

Nothing links to this page from the sites or the game. It is the back office,
and it is `noindex`.

## Why it works this way

GitHub Pages serves files and runs nothing. There is no request handler to log
a visit and no log to read one back from, so the only place a count can
originate is the visitor's browser, and the only place it can be stored is
somewhere that is not Pages.

That somewhere is [GoatCounter](https://www.goatcounter.com), an open-source
counter with a free hosted tier — the same one the game repos use, so there is
one thing to learn rather than two. Three small files and no build step, which
is why it was chosen over running our own collector: a Cloudflare Worker with a
KV store would give richer numbers, but it is a second deployment to keep alive
for a question a counter already answers.

| File | What it is |
| --- | --- |
| `config.js` | The site code, the validation around it, and the lists of what is counted |
| `counter.js` | The one line every site page loads; appends GoatCounter's `count.js` |
| `index.html` | This dashboard: overview plus a tab per site and per game |
| `smoke.mjs` | Checks the wiring, offline |

And outside this folder, for the game:

| File | What it is |
| --- | --- |
| `hopper/index.html` | An inline `import(/* @vite-ignore */ '../sites/stats/counter.js')` |

## One counter, everything

The sites and the game share a single GoatCounter site, because the path
GoatCounter records is already the name of the thing visited.
`/mini/sites/railway/`, `/mini/sites/ygent/` and `/mini/hopper/` arrive as
different pages in one dashboard, so the overview is everything together and a
per-site view is the same dashboard with a path filter. That is what the tabs
on the page do; the dashboard's own *filter paths* box does the same job by
hand.

Adding a site later means two things: add it to `SITES` in `config.js`, and add
the counter line to its pages. `smoke.mjs` fails if you do one and not the
other.

### Why the game is wired differently

A hand-written page can load `counter.js` with a script tag. Hopper cannot: it
is a Vite app, and the counter is deployed beside the game rather than built
into it, so the path has to survive the build and be resolved by the browser.
Two obvious ways to write it both fail, in opposite directions:

- `<script type="module" src="../sites/stats/counter.js">` **fails the build.**
  Vite resolves that src against the source tree, where the deployed path does
  not exist.
- A plain inline `import('../sites/stats/counter.js')` **builds fine and is
  worse.** Vite follows it and inlines the whole counter as a base64 `data:`
  module — a second copy of the GoatCounter code, whose own import of
  `config.js` then resolves against the data URL and breaks.

Marking it `/* @vite-ignore */` is Vite's escape hatch: the literal path
survives into the built HTML, and the browser resolves it at load time against
`/mini/hopper/`, landing on `/mini/sites/stats/counter.js`. One code, in one
file, for both. `smoke.mjs` guards every part of that — the import, the absence
of a module src, the marker, and the absence of `GOATCOUNTER_SITE` in the entry
page, which is the shape each mistake would take.

Adding another game means the same one line and an entry in `GAMES`.

## Switching it on and off

It is **on**. `GOATCOUNTER_SITE` in [`config.js`](config.js) is `hoai`, so
visits go to `https://hoai.goatcounter.com/count` and the stats page frames
that dashboard. That one value serves every site under `sites/` and the Hopper
game; there is nothing else to change.

- **To point it elsewhere**, put a different bare code in `config.js`. The bare
  code, not the URL — a pasted URL is refused with a console error rather than
  silently 404ing once per visit.
- **To switch counting off**, set it to `""`. Nothing is sent anywhere, and the
  stats page says so and gives the setup steps rather than showing an empty
  dashboard, which would read as "nobody has ever visited".
- **If the frame on the stats page is blank**, GoatCounter's *Settings → Sites
  that can embed GoatCounter* needs `hoai2k.github.io` and `games.hoai.net`.
  Without them the dashboard still works at its own address, and the link
  beside the frame still opens it.

Counting starts at the deploy that lands the code. There is no history before
that: Pages kept no log to backfill from.

## What it records

Per visit: country (derived from the IP and then discarded), referrer, browser,
operating system, screen width, language, page and time. Not recorded: IP
addresses, the full User-Agent, any tracker ID, and any cookie — theirs or
ours, which is why there is no consent banner. GoatCounter's
[privacy page](https://www.goatcounter.com/help/privacy) is the authority here,
not this paragraph.

Nothing from inside a page or the game is recorded: no clicks, no scrolling, no
time on page, no which-track-was-played, no episode reached. The game counts one
visit when it is opened, whether that visitor presses Start or closes the tab.
Going further needs a collector we control, and that is the reason to revisit
the Worker option if the interesting question ever becomes "what did they do"
rather than "who came".

## Reading it honestly

- **Your own visits are not counted.** `count.js` skips `localhost`, private
  addresses and `file://`, so the dashboard is other people rather than you
  reloading a page you are building. That also means a local preview can never
  be used to check that counting works; only the deployed site can.
- **It undercounts.** Ad blockers block `gc.zgo.at`, and that visit goes
  unrecorded with no sign on either end. Treat every number as a floor.
- **There is no history before switch-on.** Pages kept no log, so there is
  nothing to backfill from. Day one is the day the code lands.
- **Country is coarse and occasionally wrong.** It comes from an IP database;
  a VPN reports wherever the exit node is.
- **A game visit is a page load, not a play.** Hopper reports one visit when
  the page opens. Whether anyone got past the title screen is not something
  this can tell you.

## Checking it still works

```sh
node sites/stats/smoke.mjs
```

No browser, no network, no server. It asserts the part that can rot without
showing: that every page of every site still loads the counter, that every site
directory on disk is listed in `SITES`, that the game's entry page still reaches
the shared counter through the import the bundler leaves alone, that the stats
page does not count itself, that the configured code reaches the right endpoint,
and that a pasted URL is refused.

When anything under `hopper/game/` changes, the game's own checks apply too:

```sh
cd hopper/game && pnpm test && pnpm typecheck && pnpm lint && pnpm build:pages
```
