# Court booking: what JustBookIt exposes, and the options

The live site's "Reserve a Court / Register Online" link goes to
`https://justbookit.ca/imgr/str`, the club's instance of **JustBookIt**
(internal app name `imgr`; `str` is the club's three-letter code). Findings
from inspecting it on 12 September 2026, without logging in.

## What it is

- A Java web application (Struts-style `*.do` actions behind nginx), rendered
  server-side with **jQuery Mobile 1.4.5** and jQuery UI. Every page is HTML;
  there is no JSON API, no CORS headers, no published developer docs, and no
  public site at `justbookit.ca/` or `www.justbookit.ca` (both 404). Web
  searches turn up no API documentation either.
- Public pages (no login needed):
  - `srv/LoginMenu.do?tla=str` — sign in and "Quick Registration" form
  - `srv/PreEnroll.do?tla=str` — membership registration / renewal menu
  - `srv/Schedule.do?tla=str&xDate=MM/DD/YYYY` and
    `srv/ScheduleVenue.do?resourceTypeId=10&xDate=…` — the court schedule for
    a day: six courts, hourly slots 7 am – 9 pm, each slot marked booked
    (with a type: Regular, Private Lesson, Round Robin, Clinic, Closed) or
    available, plus an "n available" total per hour. No player names.
  - `srv/TournamentList.do?tla=str` — tournament sign-ups (empty today)
- Booking itself, round-robin sign-up, ladders and account/payment pages sit
  behind the member login (`j_jaspic` form login, session cookie, XSRF
  token). The only XHR calls in the shared JavaScript are internal helpers
  (`EntityEntry.do`, `RosterFilter.do`, `SchedulePackageTemplateGet.do`,
  `FormatCurrency.do`) that return HTML fragments for the logged-in UI.

## Can we use its "API"?

**No, not as an API.** There is nothing designed for machine access. What we
*could* do:

1. **Deep-link** to it (what this prototype does): "Book a court" opens the
   JustBookIt site in a new tab. Zero risk, zero maintenance, but the member
   lands in a visibly different, dated UI.
2. **Read-only availability widget by scraping.** Because
   `ScheduleVenue.do` is public HTML, a tiny server-side job (a Cloudflare
   Worker, a GitHub Action on a schedule, or a small Node/Python cron)
   could fetch today's schedule every few minutes, parse the slot grid, and
   publish a JSON file our page reads to show "3 courts free at 6 pm" with a
   button that jumps into JustBookIt. It cannot be done purely in the
   browser (no CORS), and the markup is undocumented so it could change
   without notice; but it is a day's work and purely additive.
3. **Write actions (actually booking) through their forms.** Technically
   possible by replaying the login and booking POSTs on behalf of a member,
   but it would mean handling members' JustBookIt passwords and would
   almost certainly breach their terms. Not recommended.

## Can their UI be customised?

Only skin-deep. The page loads a per-club stylesheet,
`imgr/str/style/main.css`, which today sets the font, the pale-green page
background and the club logo in the header; everything else is JustBookIt's
shared jQuery Mobile CSS. So the club (or JustBookIt on the club's behalf)
can restyle colours, fonts and the logo to match this design, but cannot
change layout, wording or flow. Worth asking JustBookIt what they will let a
club change in that file and whether they offer an embeddable schedule
widget or a JSON feed on request — small vendors sometimes will.

## Building our own booking system

If the club wants the booking experience to match the site, the realistic
route is replacing JustBookIt rather than integrating with it. Scope, based
on what the club uses today:

| Piece | Effort | Notes |
| --- | --- | --- |
| Member accounts and login | small | Magic-link email login avoids passwords; ~200–400 members |
| Court schedule and booking rules | medium | 6 courts × hourly slots, member limits, 10-minute release, blocks for lessons/round robins/closed |
| Round robin / clinic / ladder sign-ups with waitlists | medium | This is where most of the club's day-to-day admin happens |
| Membership registration and fees | medium | Fee table above, e-transfer today; online card payment means Stripe and its fees |
| Admin views for the manager and pros | medium | Block courts, add lessons, manage waitlists, export lists |
| Tournaments | small–medium | Sign-up lists; draws can stay on paper |

A serviceable version is about **four to six weeks** for one developer using
an off-the-shelf backend (Supabase or Firebase for auth and database, a
static front end like this one, a scheduled function for reminders). The
hard part is not the code but the operations: someone has to own it,
handle "I can't log in" at 7 am, and keep it running for years. A
volunteer-run club should weigh that seriously against paying a vendor.

## Off-the-shelf alternatives worth a look

Several modern services do court booking, programs and memberships with an
embeddable, restyle-able widget or a documented API, which would let a
site like this one keep members "inside" the design:
[CourtReserve](https://courtreserve.com/), [Playtomic](https://playtomic.io/)
(padel-focused but supports tennis), [Skedda](https://www.skedda.com/),
[eBookingOnline](https://ebookingonline.net/), and
[Planyo](https://www.planyo.com/tennis-court-reservation-system.php), which
has an open API. Pricing is typically per month per club; the club's current
JustBookIt fee is the number to compare against.

## Recommendation

Ship the design with deep links (option 1) now. If the club likes it, add
the read-only availability strip (option 2) as a quick win, and in parallel
ask JustBookIt about restyling `main.css` to match. Decide on a full
replacement only if the club wants online payments or is unhappy with
JustBookIt's member experience, and then prefer a vendor with an API over a
custom build.
