# Sites

Static web pages that live alongside the games. Each site is a folder with an
`index.html`, its own stylesheet and scripts, and an `assets/` folder holding
optimised copies of whatever art it uses. `sites/publish.sh` copies every such
folder into the GitHub Pages output, so a site at `sites/<name>/` is published
at https://hoai2k.github.io/mini/sites/<name>/.

- [`ygent/`](ygent/) — Ygent Records, the label page that catalogues every
  band site here. Published at https://hoai2k.github.io/mini/sites/ygent/.
  The roster and releases render from the JSON block at the bottom of its
  `index.html`; add a new band there and copy a 640 × 640 cover into
  `ygent/assets/`.
- [`space-tiber/`](space-tiber/) — artist page for Space Tiber, the band that
  made the music for Hopper the Grasshopper. Published at
  https://hoai2k.github.io/mini/sites/space-tiber/. Its player streams the
  three Hopper recordings from the deployed game (`/mini/hopper/audio/`)
  rather than carrying a second copy; the single, Moonlit Go-go Interlude,
  plays from `space-tiber/music/` once its file is dropped there.
- [`charlies-girl-dolls/`](charlies-girl-dolls/) — artist page for Charlie's
  Girl Dolls, the girl group behind Bubblegum Radar and the songs of a
  doll-racing game. Published at
  https://hoai2k.github.io/mini/sites/charlies-girl-dolls/. Uses the group
  poster and the single cover from `images/`; the five songs stream from the
  game rather than being copied here.
- [`canagentsis/`](canagentsis/) — artist page for Canagentsis, a Cape Breton
  folk band of the 1880s moored in present-day Toronto harbour, styled after
  late-Victorian nautical print. Published at
  https://hoai2k.github.io/mini/sites/canagentsis/. Uses the deck photograph
  from `images/` and plays the band's one recording from `canagentsis/music/`;
  `canagentsis/image-requests.md` lists further art the page could take.
- [`mechmayhem/`](mechmayhem/) — artist page for Mech Mayhem, the drum &
  bass outfit of five fighters from the Mech Mayhem arena game. Published at
  https://hoai2k.github.io/mini/sites/mechmayhem/. Uses the band photo from
  `images/`, portraits and badges from the game repository's canonical art,
  and streams the game's soundtrack from its deployed site.
- [`images/`](images/) — source images dropped by the user for use in sites.
  Sites keep their own web-sized copies under `assets/`; the originals stay
  here.
