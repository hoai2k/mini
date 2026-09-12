# The Railway Trio

Website for The Railway Trio, a live jazz trio from Stratford, Ontario:
Luke Robertson (guitar), Hoai Nguyen (upright bass) and Gop Intarachot
(drums). Real band, real recordings, nothing generated. Published at
https://hoai2k.github.io/mini/sites/railway/.

- `index.html`, `styles.css` — the page. Story, the three players with their
  social links, the repertoire, two live clips, where to find them, bookings.
- `media/` — the original drops: full-size photographs and the raw phone
  videos. Not deployed; `sites/publish.sh` leaves every site's `media/` out.
- `assets/` — what the page actually serves: WebP copies of the photos,
  square portrait crops, and the two clips re-encoded to web H.264 (the
  Starlight clip was 10-bit HDR HEVC and has been tone-mapped to SDR) with
  poster frames.

To add a clip, drop the original in `media/` and re-encode it into `assets/`:

```sh
ffmpeg -i media/clip.MOV -vf "scale=720:-2,format=yuv420p" -c:v libx264 -crf 23 \
  -movflags +faststart -c:a aac -b:a 128k assets/clip.mp4
```
