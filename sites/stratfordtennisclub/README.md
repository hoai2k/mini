# Stratford Tennis Club — redesign prototype

A design prototype for a refreshed [stratfordtennisclub.com](https://www.stratfordtennisclub.com/):
more professional and tennis-like, still friendly and community-oriented, and
built to work equally well on a phone and a desktop. Published at
https://hoai2k.github.io/mini/sites/stratfordtennisclub/.

What is being tested here is the **design**. The content mirrors the live site
as of September 2026 (2026 fees, schedules, board, the doubles championships
recap), so the club can judge the new look with its real words and photos.

## Pages

| File | Mirrors |
| --- | --- |
| `index.html` | Home: hero, quick links, club intro, a week-at-the-club grid, news, calendar, staff, map |
| `membership.html` | Membership Information: fees (season / monthly toggle), how to pay, visitors, booking policy, terms, code of conduct |
| `adult.html` | 2026 Adult Activities: lessons, private lessons, round robins, ladders, league, tournaments |
| `junior.html` | 2026 Junior Activities: Free Kids Tennis, lessons, grand slams, championships, Optimist day |
| `lessons.html` | Group Lessons: the weekly schedule, clinic descriptions |
| `camps.html` | 2026 Summer Camps: flyer and registration link |
| `school-programs.html` | School Programs |
| `club.html` | Welcome page + Sub Committees: mission, facilities, staff, board, committee chairs, land acknowledgement |
| `gallery.html` | Photo Gallery (a curated subset) |
| `news.html` | 2026 Men's and Ladies Doubles Club Championships recap |

All pages share `styles.css`; the only script is the mobile menu and the fee
toggle, inline at the bottom of each page. The header and footer are repeated
in every file, so a nav change means editing each page (or regenerating).

## Design notes

- **Palette.** Deep club greens taken from the existing logo, a cream page
  ground, a tennis-ball chartreuse for the primary call to action, and a
  touch of clay terracotta for junior tags and callouts.
- **Type.** Fraunces (a warm, slightly old-school serif) for headings, Inter
  for everything else, both from Google Fonts with system fallbacks.
- **Layout.** A sticky header with a persistent "Book a court" button, a
  photo-led hero, and card/tile sections that collapse to one column on
  phones. Tables scroll horizontally rather than breaking the page.
- **Member-first hierarchy.** The club's own traffic is mostly existing
  members booking a court or checking what's on, so booking outranks joining
  everywhere they compete:
  - the header's booking button is the only filled button in the bar, and it
    stays visible on phones instead of hiding behind the menu;
  - the hero's primary (chartreuse) button is "Book a court", with "Become a
    member" as the outlined secondary;
  - a dark action bar sits directly under the hero with the four things
    members come for: book a court, round robin and clinic sign-up, this
    week's schedule, club news and results. Its first cell is highlighted and
    bleeds to the page edge;
  - the season/hours/courts/location facts, which used to occupy that band,
    are now a quiet one-line strip below it;
  - the home page tiles lead with booking; membership follows;
  - the top bar carries a "Member login" link;
  - nav order runs programs first, then news, then membership and about;
  - the closing band on the home page is still the pitch to join, since that
    is where a prospective member ends up, with a booking shortcut in its
    text for members who scrolled that far.
- **Booking** links go to the club's existing JustBookIt site in a new tab.
  See `BOOKING.md` for what was learned about that system and the options
  for integrating or replacing it.

## Assets

`assets/` holds web-sized copies of photos from the live site's WordPress
uploads and the club logo from the JustBookIt theme. The Google Maps embed
and Google Fonts are loaded from Google. Nothing else is external.

## Known gaps

- Committee *members* are not listed, only chairs: the source table on the
  live site is misaligned and the membership of each committee cannot be
  read from it reliably.
- Dates on the home page calendar are hand-picked from the 2026 schedule;
  there is no data feed behind them.
