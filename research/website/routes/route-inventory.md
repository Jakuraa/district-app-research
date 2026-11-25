# District Website Route & Screen Inventory (Observed)

Source: REA passive CDP inspection on `https://www.district.in/` (`Chrome/158.0.8127.37`, `2026-11-26`).

## Primary Routes

| Route | Title / Purpose | Key Observed Elements | REA Evidence ID |
|---|---|---|---|
| `/` | Home (`For you`) | Location button, `Log in`, search bar -> `/search?tabId=FOR_YOU`, 5 primary tabs (`For you`, `Dining`, `Movies`, `Events`, `Play`), `Curated for you` carousel, footer links | `ev_b54e2a34` |
| `/events/` | Events Discovery | `Featured events` carousel, filter chips (`Filters`, `Today`, `Tomorrow`, `This Weekend`, `Under 10 km`, `Bowling`, `Music`, `Music Festivals`), event cards with offer badges & prices, artist strip | `ev_522a1a64` |
| `/search?tabId=EVENTS` | Search & Trending | Scope tabs (`All`, `Dining`, `Movies`, `Events`, `Play`), category shortcuts, `Trending in <City>` mixed `Event` and `Venue` results | `ev_65d947cc` |
| `/events/<slug>-buy-tickets` | Event Detail | Hero banner, title/date/venue/distance, sticky offer banner + `₹X onwards` + `Book tickets` CTA, `About`, `Highlights`, `Lineup`, `Facilities at the event`, `Things to know`, `Organized by`, `Touring In` (for tours), `Partners`, FAQs, T&C | `ev_0fafc9f7`, `ev_c8232a8d` |
| `/events/<artist-slug>/artist` | Artist Profile | Linked from homepage/events artist strip and event lineup | `ev_b54e2a34`, `ev_0fafc9f7` |
| `/events/<venue-slug>/venue-guide` | Venue Guide | `LIVE ENTERTAINMENT DESTINATION`, address, open/closed status + weekly timings modal, `Happening here` events, `Gallery (+N)`, `Venue Facilities` | `ev_2edc505d` |
| `/sgw/events/buy-page/<slug>/shows/<showId>/` | Transactional Ticket Flow | `Before you go! Select number of tickets` (`1`–`10` + `Proceed`), `Select Location` / `Use Current Location`, price filter pills, inventory legend (`Available`, `Nearly sold`, `Sold out`), partial-pay banner | `ev_24cea136`, `ev_8b0f4fed`, `ev_6d0b905c` |
| `/events/list-your-event` | Organizer Lead Entry | Linked from header/footer (`List your events`) | `ev_522a1a64` |
| `/contact`, `/policies/privacy`, `/policies/terms-of-service` | Help & Legal | Footer legal and support entry points | `ev_b54e2a34` |

## Unknowns (Not Observed Without Auth or Connected Android Device)

- Post-login checkout route (`/checkout` or payment handoff URL structure)
- Account/bookings/ticket wallet routes (`/my-bookings`, `/tickets` or equivalent)
- Native Android Activity/Deep-link routing scheme (awaits authorized Android device + APK)
