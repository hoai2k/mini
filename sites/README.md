# Sites

Static web pages that live alongside the games. Each site is a folder with an
`index.html`, its own stylesheet and scripts, and an `assets/` folder holding
optimised copies of whatever art it uses. `sites/publish.sh` copies every such
folder into the GitHub Pages output, so a site at `sites/<name>/` is published
at https://hoai2k.github.io/mini/sites/<name>/.

- [`space-tiber/`](space-tiber/) — artist page for Space Tiber, the band that
  made the music for Hopper the Grasshopper. Published at
  https://hoai2k.github.io/mini/sites/space-tiber/. Its player streams the
  three recordings from the deployed game (`/mini/hopper/audio/`) rather than
  carrying a second copy.
- [`charlies-girl-dolls/`](charlies-girl-dolls/) — artist page for Charlie's
  Girl Dolls, the girl group that sings the American Girl Doll Race soundtrack.
  Published at https://hoai2k.github.io/mini/sites/charlies-girl-dolls/. World
  backdrops and power-up icons are web-sized copies of the race game's art; the
  five songs stream from the game. The hero has a slot for the group poster:
  drop it in `sites/images/` as `charlies_girl_dolls.png` and export it to
  `charlies-girl-dolls/assets/charlies-girl-dolls.webp` (plus member crops) and
  the page picks it up.
- [`images/`](images/) — source images dropped by the user for use in sites.
  Sites keep their own web-sized copies under `assets/`; the originals stay
  here.
