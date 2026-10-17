# Bookzam image requests

Bookzam draws stand-ins until these arrive: a plain SVG icon
(`app/icons/icon.svg`, a white open book on a blue disc), a text wordmark, and
CSS-drawn round buttons. Drop finished files in `bookzam/intake/`.

The look: bright and friendly, like a music-recognition app for books. Brand
colours are a royal blue `#1652F0` blending to sky blue `#00B8FF`, with white,
and a warm yellow `#FFD23F` for the find ring. Flat shapes with soft gradients,
no photographic texture, no text unless the entry asks for it.

| # | File | Size | Status |
| --- | --- | --- | --- |
| 1 | `app/icons/icon-1024.png` | 1024 × 1024 PNG | requested |
| 2 | `app/assets/ui/logo.png` | 1200 × 300 PNG, transparent | requested |
| 3 | `app/assets/ui/empty-catalogue.png` | 800 × 600 PNG, transparent | requested |
| 4 | `app/assets/ui/empty-find.png` | 800 × 600 PNG, transparent | requested |
| 5 | `app/assets/ui/share.jpg` | 1200 × 630 JPEG | requested |

## 1. App icon

`app/icons/icon-1024.png`, 1024 × 1024, **opaque** (iPhone shows any
transparency as black), full bleed: the art reaches every edge, and the system
rounds the corners itself.

> App icon for "Bookzam", a Shazam-style app that recognises books. A bold white
> open book seen from the front, its two pages curving up, centred on a
> glossy circular gradient from sky blue (#00B8FF, top left) to royal blue
> (#1652F0, bottom right). Two or three thin white sound-wave arcs on each side
> of the book, as if the book is being "heard". The background behind the disc
> is the same royal blue so the square is fully filled. Flat vector style,
> soft highlight on the disc, no text, centred, legible at 32 px.

It replaces `icons/icon.svg` and the three PNG sizes (180, 192, 512), and the
favicon.

## 2. Wordmark

`app/assets/ui/logo.png`, 1200 × 300, transparent background.

> The word "Bookzam" as a logo wordmark, white, heavy rounded geometric sans
> serif, slightly tight letter spacing, the "oo" drawn as two small open books
> seen from above (or as two eyes looking), "zam" a touch lighter in weight.
> Transparent background, no shadow, no other elements. Must read on a blue
> gradient.

Shown in the top bar at 30 px high, beside the icon.

## 3. Empty catalogue illustration

`app/assets/ui/empty-catalogue.png`, 800 × 600, transparent background.

> A friendly flat illustration of a phone held up to a small bookshelf: the
> phone screen shows a blue circle with a white plus sign, and little sparkles
> fly from the shelf's colourful book spines and a board game box into the
> phone. Soft blues with warm book colours (brick red, mustard, teal, plum),
> rounded shapes, no text, transparent background, generous empty space around
> the subject.

Shown above "Snap a shelf" when the catalogue is empty, about 260 px wide.

## 4. Find Book illustration

`app/assets/ui/empty-find.png`, 800 × 600, transparent background.

> Flat illustration of a tall bookshelf full of colourful spines, one spine
> circled with a hand-drawn bright yellow (#FFD23F) ring and a small yellow
> sparkle beside it; a magnifying glass rests against the shelf. Same palette
> and style as the empty catalogue picture: rounded flat shapes, soft blue
> shadows, no text, transparent background.

Shown on the Find Book tab before a photo is taken, about 260 px wide.

## 5. Share image

`app/assets/ui/share.jpg`, 1200 × 630.

> Social sharing card for "Bookzam": the blue gradient (#1652F0 to #00B8FF) as
> background, on the left a phone showing a photo of a bookshelf with one spine
> circled in yellow, on the right the white wordmark "Bookzam" and beneath it
> the line "Snap a shelf. Find any book." in white. Clean, flat, plenty of
> margin; keep everything 60 px clear of the edges.

Used as the page's `og:image` when the link is shared.
