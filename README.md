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

## Ride equipment and additional services

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

## Versioning

Stable website versions are marked using GitHub release tags. Earlier development milestones are documented using their corresponding Git commits.

### Releases

| Version | Commit | Description |
| --- | --- | --- |
| `v2.5.0` | `f2d29db` | Stable version before booking and services layout optimization |
| `v2.6.0` | `8814151` | Optimized booking and services layout, SK/EN synchronization and availability improvements |

The current stable release is **v2.6.0**.

### Historical milestones

| Milestone | Commit | Description |
| --- | --- | --- |
| `v1.0.0` | `50a338e` | Initial stable website version |
| `v2.0.0` | `3d236a8` | Major website redesign and English version |
| `v2.1.0` | `8a931b8` | Driver profile and profile photo section |
| `v2.2.0` | `87c4a73` | Card and mobile payment options |
| `v2.3.0` | `c157c9f` | Layout, styling and contact information improvements |
| `v2.4.0` | `49d1a79` | Availability system, branding and website URL updates |

## Copyright

Copyright © Erin Zeleňáková. All rights reserved.

This project is protected by copyright under the relevant laws of the Slovak Republic and international conventions.

All texts, graphics, source code, site structure and original visual elements of this project are the intellectual property of the author unless stated otherwise.

The content and source code of this project may not be copied, modified, redistributed, published or used to create derivative works without prior permission from the author.

## Ownership

The website and the Erinka Taxi project are owned and maintained by **Erin Zeleňáková**.

## Contact

Email: **erinkataxi@gmail.com**  
Web: **https://www.erinkataxi.sk/**
