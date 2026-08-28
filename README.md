# Erinka Taxi

Official website of **Erinka Taxi**, a pre-booked taxi service in Košice and surrounding areas.

Primary website: **https://www.erinkataxi.sk/**  
Additional domains: **https://www.taxierinka.sk/** and **https://www.erinkataxi.eu/**

## Website structure

The project is intentionally lightweight and static. It uses HTML5, embedded CSS and vanilla JavaScript and is suitable for GitHub Pages hosting.

```text
/
├── index.html              # Slovak version
├── availability.js         # Shared SK/EN availability data and renderer
├── cennik.pdf              # Downloadable price list
├── IMG_8532.jpeg           # Profile photo
├── sitemap.xml
├── robots.txt
├── CNAME
├── README.md
└── en/
    └── index.html          # English version
```

## Page layout

Both language versions follow the same structure:

1. Header and language switch
2. Ride / airport-transfer reservation
3. Standard operating hours
4. Contact details
5. Dynamic availability exceptions and booked time slots
6. Booking instructions + services included in the ride
7. Payment methods
8. Advance-booking notice
9. About Erinka Taxi
10. Driver profile
11. Main price cards
12. Expandable full price list
13. Target customer groups
14. Legal information
15. Footer

The booking area is deliberately compact: standard operating hours are shown only in the dedicated booking-hours box, while the two-column booking box contains **How to book** and **Included in the ride**. Payment methods are displayed below both columns.

## Responsive layout

The page uses a mobile-first-friendly single-column width (`max-width: 600px`). At widths below `520px`:

- contact details stack vertically,
- booking/service columns stack vertically,
- legal-information columns stack vertically,
- reservation notices use left-aligned text.

## Availability system

Temporary exceptions are maintained in `availability.js`, independently of the HTML pages.

The shared data structure contains:

- `shortTerm` — individual unavailable or tentative time slots,
- `longTerm` — longer unavailable periods,
- `nextAvailableDate` / `nextAvailableTime` — optional information about when bookings resume,
- SK and EN text variants where translation is required.

Both pages contain an initially hidden element:

```html
<section id="availability-notice" class="availability-notice" style="display:none;"></section>
```

The JavaScript detects the page language from `<html lang="...">`, renders the appropriate SK/EN text and shows the notice only when availability is enabled and at least one item exists.

### Normal availability update

For ordinary schedule changes, edit only the `availabilityData` block at the top of `availability.js`. The renderer below it should normally remain unchanged.

To hide all temporary notices without deleting the stored entries:

```js
const availabilityData = {
    enabled: false,
    // ...
};
```

## Payments

Supported payment methods shown on the website:

- payment card
- Apple Pay
- Google Pay
- QR payment
- cash

## Included services

Depending on prior arrangement and vehicle capacity, the booking section highlights:

- child seat / booster seat
- pets
- wheelchair
- stroller
- bicycle
- larger luggage

## SEO and language versions

The Slovak page is canonical at `https://www.erinkataxi.sk/` and the English page at `https://www.erinkataxi.sk/en/`.

Both pages define `hreflang` links for `sk`, `en` and `x-default`. `sitemap.xml` contains both language URLs and `robots.txt` allows crawling and points search engines to the sitemap.

## Versioning and Git tags

Release tags mark stable website milestones, not every content edit. Use semantic-style tags: `vMAJOR.MINOR.PATCH`.

Suggested historical milestones based on the repository commit history:

| Tag | Date | Stable milestone / commit to tag |
| --- | --- | --- |
| `v1.0.0` | 2025-07-21 | first published site (`Create index.html`) |
| `v2.0.0` | 2026-06-13 | redesign + English version (`redesign page, create en page`) |
| `v2.1.0` | 2026-06-26 | profile-photo section |
| `v2.2.0` | 2026-07-22 | card and mobile payment options |
| `v2.3.0` | 2026-07-27 | layout/style/contact refactor |
| `v2.4.0` | 2026-08-18 | availability feature + Erinka Taxi branding/URL cleanup; tag the last stable commit of that set |
| `v2.5.0` | 2026-08-25 | booking-hours section + availability presentation; tag the last stable commit of that day |
| `v2.6.0` | 2026-08-28 | compact booking/services layout, SK/EN sync, availability.js cleanup and README refresh |

For future releases:

- increment **PATCH** for text fixes, small CSS corrections and bugs (`v2.6.1`),
- increment **MINOR** for a new backward-compatible feature (`v2.7.0`),
- increment **MAJOR** for a substantial architecture change (`v3.0.0`).

Annotated tag example:

```bash
git tag -a v2.6.0 -m "Erinka Taxi website v2.6.0"
git push origin v2.6.0
```

Past tags should be created on the matching historical commit, not on the current HEAD. The commit-history export does not contain commit hashes, so use the date + commit message above to locate each target in GitHub/Git before tagging it.

## Copyright notice

All texts, graphics, site structure and overall visuals are the intellectual property of the author.

This project is protected by copyright under the relevant laws of the Slovak Republic and international conventions.

- It is not allowed to copy, modify, share or distribute any part of this project without permission.
- It is not allowed to create derivative versions or imitate the visual or content of this site without permission.
- It is not allowed to use any part of the code, design or texts for commercial or non-commercial purposes without permission.

## Ownership

The owner and sole author of this project is **Erin Zeleňáková**.

## Contact

Email: **erinkataxi@gmail.com**  
Web: **https://www.erinkataxi.sk/**
