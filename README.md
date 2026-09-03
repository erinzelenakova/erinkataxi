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
├── status.js               # Live driver status renderer
├── reviews.js              # Customer reviews data and renderer
├── cennik.pdf              # Slovak downloadable price list
├── Prepravny_poriadok_ErinkaTAXI_revizia_k_datumu_20260828.pdf
├── IMG_8532.jpeg           # Profile photo
├── sitemap.xml
├── robots.txt
├── CNAME
├── README.md
└── en/
    ├── index.html          # English version
    └── cennik-en.pdf       # English downloadable price list
```

## Page layout

Both language versions follow the same general structure:

1. Header and language switch
2. Ride / airport-transfer reservation
3. Standard operating hours
4. Live driver / booking status
5. Contact details
6. Dynamic availability exceptions and booked time slots
7. Booking instructions + services included in the ride
8. Payment methods
9. Advance-booking notice
10. About Erinka Taxi
11. Driver profile
12. Main price cards
13. Expandable full price list
14. Customer reviews
15. Target customer groups
16. Legal information and downloadable documents
17. Footer

The booking area is deliberately compact: standard operating hours are shown only in the dedicated booking-hours box, while the two-column booking box contains **How to book** and **Included in the ride**. Payment methods are displayed below both columns.

## Responsive layout

The page uses a mobile-first-friendly single-column width (`max-width: 600px`). At smaller viewport widths:

- contact details stack vertically,
- booking/service columns stack vertically,
- legal-information columns stack vertically,
- reservation notices adapt to the available width,
- live status remains compact and clearly visible.

## Live driver status

The website displays the current Erinka Taxi operating status using `status.js`.

Four states are supported:

- `available` — **Available – accepting rides**
- `driving` — **Driving – please text me**
- `booking` — **Accepting bookings**
- `offline` — **Offline**

The Slovak and English labels are selected automatically according to the page language.

The `driving` state is intended for periods when the driver is actively driving or handling scheduled rides
and may not be able to answer phone calls. Customers are advised to use SMS instead.

The public status is retrieved from the Erinka Taxi Cloudflare Worker and periodically refreshed by the website without requiring a page reload.

The status backend uses Cloudflare Workers and KV storage. 
Status changes are performed through protected administrative endpoints and are not exposed through the public website interface.

A scheduled Cloudflare Cron Trigger provides automatic nightly offline handling. 
During the configured night period the public status is forced to `offline`, preventing an outdated active status from remaining visible overnight.

Legacy `online` and `busy` status values remain supported by the backend for compatibility.

## Availability system

Temporary exceptions are maintained in `availability.js`, independently of the HTML pages.

The shared data structure contains:

- `shortTerm` — individual unavailable or tentative time slots,
- `longTerm` — longer unavailable periods,
- `nextAvailableDate` / `nextAvailableTime` — optional information about when bookings resume,
- SK and EN text variants where translation is required.

Both pages contain an initially hidden availability element which is populated by JavaScript when temporary availability information exists.

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

## Customer reviews

Selected customer reviews are maintained separately in `reviews.js`.

The review data is rendered dynamically on the website, keeping review content separate from the main HTML structure and making future updates easier.

## Price lists and transport regulations

The website provides downloadable documents for customers:

- Slovak price list — `cennik.pdf`
- English price list — `en/cennik-en.pdf`
- Erinka Taxi transport regulations — `Prepravny_poriadok_ErinkaTAXI_revizia_k_datumu_20260828.pdf`

The HTML price presentation and downloadable price lists are maintained together so that published pricing information remains consistent.

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

| Version | Description |
| --- | --- |
| `v2.5.0` | Stable version before booking and services layout optimization |
| `v2.6.0` | Optimized booking and services layout, SK/EN synchronization and availability improvements |
| `v2.7.0` | Live driver status, customer reviews, updated price lists, transport regulations and further availability/layout improvements |

The current stable release is **v2.7.0**.

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
