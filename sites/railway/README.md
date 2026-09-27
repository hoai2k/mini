# The Railway Trio

Website for The Railway Trio, a live jazz trio from Stratford, Ontario:
Luke Robertson (guitar), Hoai Nguyen (upright bass) and Gop Intarachot
(drums). Real band, real recordings, nothing generated. Published at
https://hoai2k.github.io/mini/sites/railway/.

- `index.html`, `styles.css` — the page. Story, the three players with their
  social links, three live clips, where to find them, and bookings.
- `media/` — the original drops: full-size photographs and the raw phone
  videos. Not deployed; `sites/publish.sh` leaves every site's `media/` out.
- `assets/` — what the page actually serves: WebP copies of the photos,
  square portrait crops, and H.264 clips with poster frames. The early
  Starlight clip was 10-bit HDR HEVC and has been tone-mapped to SDR; the
  2026 Starlight clip was supplied as a web-ready H.264 MP4.

To add a clip, drop the original in `media/` and put a web-ready H.264 MP4
in `assets/`. Re-encode when the original needs conversion:

```sh
ffmpeg -i media/clip.MOV -vf "scale=720:-2,format=yuv420p" -c:v libx264 -crf 23 \
  -movflags +faststart -c:a aac -b:a 128k assets/clip.mp4
```
