# Erinka Taxi

Official website of **Erinka Taxi**, a pre-booked taxi service in Košice and surrounding areas.

Primary website: **https://www.erinkataxi.sk/**  
Additional domains: **https://www.taxierinka.sk/** and **https://www.erinkataxi.eu/**

## Website structure

The project is intentionally lightweight and static. It uses HTML5, embedded CSS and vanilla JavaScript and is suitable for GitHub Pages hosting.

```text
/
├── index.html              # Slovak version
├── availability.js         # Shared SK/EN availability renderer + Google Calendar availability
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
12. Customer reviews
13. Main price cards
14. Expandable full price list
15. Target customer groups
16. Legal information and downloadable documents
17. Footer

The booking area is deliberately compact: standard operating hours are shown only in the dedicated booking-hours box, while the two-column booking box contains **How to book** and **Included in the ride**. Payment methods are displayed below both columns.

## Responsive layout

The page uses a mobile-friendly single-column width (`max-width: 600px`). At smaller viewport widths:

- contact details stack vertically,
- booking/service columns stack vertically,
- legal-information columns stack vertically,
- reservation notices adapt to the available width,
- live status remains compact and clearly visible,
- short-term calendar availability remains compact and readable.

## Live driver status

The website displays the current Erinka Taxi operating status using `status.js`.

Four states are supported:

- `available` — **Available – accepting rides**
- `driving` — **Driving – please text me**
- `booking` — **Accepting bookings**
- `offline` — **Offline**

The Slovak and English labels are selected automatically according to the page language.

The `driving` state is intended for periods when the driver is actively driving or handling scheduled rides and may not be able to answer phone calls. Customers are advised to use SMS instead.

The public status is retrieved from the Erinka Taxi Cloudflare Worker and periodically refreshed by the website without requiring a page reload.

The status backend uses Cloudflare Workers and KV storage. Status changes are performed through protected administrative endpoints and are not exposed through the public website interface.

A scheduled Cloudflare Cron Trigger provides automatic nightly offline handling. During the configured night period the public status is forced to `offline`, preventing an outdated active status from remaining visible overnight.

Legacy `online` and `busy` status values remain supported by the backend for compatibility.

## Availability system

Availability is split into two independent layers:

- **short-term availability** — loaded automatically from Google Calendar,
- **long-term availability** — maintained manually in `availability.js` for holidays and longer closures.

This means ordinary booked rides no longer have to be entered manually into the website.

### Google Calendar integration

The short-term availability flow is:

```text
Google Calendar
      ↓
Google Calendar API / FreeBusy
      ↓
Cloudflare Worker
      ↓
/availability endpoint
      ↓
availability.js
      ↓
Slovak + English website
```

The website currently requests:

```text
/availability?days=31
```

so short-term busy periods are loaded for the upcoming **31 days**.

The calendar remains the operational source of truth for ordinary bookings. A ride entered into the Erinka Taxi Google Calendar automatically becomes visible on the website as an occupied time slot.

The website receives only busy time intervals. Event names, passenger details, route information, notes and other private calendar content are not rendered on the public website.

### Calendar backend

The calendar integration uses:

- Google Calendar API,
- a dedicated Google Cloud service account,
- Cloudflare Worker server-side authentication,
- Cloudflare environment variables / secrets,
- the Google Calendar `freeBusy` data model.

Credentials and private keys are stored outside the public repository and must never be committed to GitHub.

### Short-term rendering

`availability.js`:

- fetches busy intervals from the Cloudflare Worker,
- converts them to the `Europe/Bratislava` timezone,
- groups multiple occupied slots by date,
- detects full-day blocks,
- renders localized Slovak or English labels,
- displays compact rows using separate date / lock / time columns.

Example:

```text
09. 09. 2026     🔒     08:00–09:00
11. 09. 2026     🔒     07:45–08:00
12. 09. 2026     🔒     celý deň
```

If more than one booking exists on the same date, the time slots are displayed on one line:

```text
11. 09. 2026     🔒     05:20–06:00 · 07:45–08:30 · 16:30–17:15
```

### Long-term availability

Longer closures, holidays and similar exceptions remain intentionally manual.

They are configured in the `longTerm` array in `availability.js`.

Example:

```js
longTerm: [
    {
        date: "24. 09. – 11. 10. 2026",
        time: "",
        icon: "🌴",

        startDate: "2026-09-24",
        endDate: "2026-10-11",

        text_sk: "V tomto termíne budem na dovolenke.",
        text_en: "I will be on holiday during this period.",

        nextAvailableDate: "12. 10. 2026",
        nextAvailableTime: "04:00"
    }
]
```

`endDate` is used to automatically stop rendering an expired long-term notice after the configured period ends.

`nextAvailableDate` and `nextAvailableTime` can optionally show customers when new bookings resume.

### Availability switch

The availability notice can still be disabled globally without deleting stored long-term entries:

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

- child seat 9–36 kg,
- booster seat 22–36 kg,
- own infant carrier below 9 kg,
- pets,
- wheelchair,
- stroller,
- bicycle,
- larger luggage.

A child seat or booster seat should normally be requested at least **6 hours in advance**. For shorter notice, availability is not guaranteed.

## SEO and language versions

The Slovak page is canonical at `https://www.erinkataxi.sk/` and the English page at `https://www.erinkataxi.sk/en/`.

Both pages define `hreflang` links for `sk`, `en` and `x-default`.

`sitemap.xml` contains both language URLs and `robots.txt` allows crawling and points search engines to the sitemap.

## Technology stack

### Frontend

- HTML5
- embedded CSS
- vanilla JavaScript
- GitHub Pages

### Backend services

- Cloudflare Workers
- Cloudflare KV
- Cloudflare Cron Triggers
- Google Calendar API
- Google Cloud service account

The website itself remains static. Dynamic status and calendar availability are provided through the Cloudflare Worker API.

## Security and privacy

The public website does not contain administrative credentials, Google private keys or Cloudflare secrets.

Sensitive values are stored as Cloudflare Worker secrets or environment variables.

The calendar integration exposes only availability intervals required for customer-facing scheduling. Private calendar event metadata is kept outside the public website.

## Versioning

Stable website versions are marked using GitHub release tags. Earlier development milestones are documented using their corresponding Git commits.

### Releases

| Version | Description |
| --- | --- |
| `v2.5.0` | Stable version before booking and services layout optimization |
| `v2.6.0` | Optimized booking and services layout, SK/EN synchronization and availability improvements |
| `v2.7.0` | Live driver status, customer reviews, updated price lists, transport regulations and further availability/layout improvements |
| `v2.8.0` | Extended live status system with separate available, driving, booking and offline states |
| `v3.0.0` | Google Calendar powered short-term availability, Cloudflare Worker calendar API integration, automatic booked-slot rendering and compact availability layout |

The current stable release is planned as **v3.0.0**.

### Historical milestones

| Milestone | Commit | Description |
| --- | --- | --- |
| `v1.0.0` | `50a338e` | Initial stable website version |
| `v2.0.0` | `3d236a8` | Major website redesign and English version |
| `v2.1.0` | `8a931b8` | Driver profile and profile photo section |
| `v2.2.0` | `87c4a73` | Card and mobile payment options |
| `v2.3.0` | `c157c9f` | Layout, styling and contact information improvements |
| `v2.4.0` | `49d1a79` | Availability system, branding and website URL updates |

## v3.0.0 release highlights

The `v3.0.0` release introduces a major operational improvement to the availability system.

### Added

- Google Calendar integration for short-term booked time slots
- dedicated Google Cloud service account
- Cloudflare Worker authentication to Google Calendar
- public `/availability` endpoint
- 31-day forward availability window
- automatic SK/EN rendering of calendar busy intervals
- grouping of multiple bookings by date
- full-day availability detection
- compact date / lock / time grid layout
- automatic hiding of expired long-term notices using `endDate`

### Changed

- `shortTerm` is no longer maintained manually in `availability.js`
- Google Calendar is now the source of truth for ordinary booked rides
- long-term closures remain manually controlled
- public availability output is limited to busy time intervals
- availability presentation is more compact and easier to scan

### Operational impact

The driver can now manage ordinary bookings directly from the calendar already used on the phone.

There is no need to:

1. enter a booking into Google Calendar,
2. open the website repository,
3. edit `availability.js`,
4. duplicate the same booking manually,
5. commit and deploy the change.

A calendar booking is enough. The website updates from the shared availability backend automatically.

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
