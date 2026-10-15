# Langan, Frost & Wane

Website for Langan, Frost & Wane, a real fantasy-folk / acid-folk trio from
West Philadelphia: Brian Langan, Robert James Frost (RJ Gilligan) and Nam
Wayne. Published at https://hoai2k.github.io/mini/sites/langanfrontandwane/.
Like `railway/`, this is a real band and not part of the Ygent catalogue.

The look is a lost late-sixties record sleeve: cream paper and brown ink,
marigold and rust type with a stacked seventies shadow (Fraunces with its
soft, wonky axes), IM Fell small caps and EB Garamond for the text, and
red-and-plum night sections taken from their stage photographs. The colours
come from the album covers and the band's own site; the woodcut of three
faces in the footer is the band's 2021 press graphic.

- `index.html`, `styles.css` — the page: hero, the new album *Tomorrow for a
  Stone* with its track list and the Widow's Bay video, shows, the trio,
  records, videos, press quotes and contact.
- `site.js` — moves shows whose date has passed to the bottom of the list
  (marked "played"; a line points to Facebook when none is left to come), and
  turns each video still into a YouTube player only when it is clicked, so
  nothing loads from YouTube until someone asks.
- `assets/` — web copies (WebP, a JPEG social card, a PNG mask) of the
  images below. `image-requests.md` lists art the page could add.

## Adding a show

Copy an `<li class="gig" data-date="YYYY-MM-DD">` in the Shows section and
change the date, venue and ticket link. Order does not matter; the script
sorts them.

## Where the content comes from

Facts and wording are rewritten from the band's own material, checked
October 2026:

- langanfrostandwane.com and its EPK PDF (bio, press quotes, venue history,
  video links, booking contact, all the band photographs).
- Spotify (album and single track lists and release dates; every track links
  there), YouTube (official videos and live clips), Showpass (the Birdhouse
  show on 23 October 2026), Glide Magazine, NEPA Scene and Music Republic
  Magazine (background, Widow's Bay).

Image sources, all copied in rather than hot-linked:

| Asset | Source |
| --- | --- |
| `hero-house*.webp`, `porch.webp`, `lfw-og.jpg` | Band photos on langanfrostandwane.com (2025 shoot) |
| `stage-red.webp`, `studio.webp`, `trio-green.webp` | Photos in the band's EPK |
| `cover-*.webp` | Album and single covers from Spotify |
| `video-*.webp`, `clip-*.webp` | YouTube thumbnails of the linked videos |
| `woodcut-faces.png` | NEPA Scene's 2021 press graphic, converted to an alpha mask |


Facebook (facebook.com/langanfrostwane) is confirmed by search results.
Instagram is linked as `@langanfrostwane` to match it; Instagram would not
show the profile without a login, so that handle is unconfirmed.
