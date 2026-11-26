# Attendee Discovery-to-Ticketing Journey (Website Observed)

- **Journey name and goal**: Discover an event in a selected city, inspect details and eligible offers, and enter ticket selection.
- **Starting screen/state**: Unauthenticated visitor on `https://www.district.in/` with inferred/default location (`ATT Colony, Gopalapuram, Coimbatore`).
- **Preconditions/account permissions**: None for discovery, event details, and pre-checkout ticket quantity selection. Authentication (`Log in`) is visible in header and required before finalizing checkout (exact gate step not crossed).

## Numbered Actions & Visible Results

1. **Open `/`** (`ev_b54e2a34`): Top bar shows location selector button, profile/`Log in` button, rounded search pill, and 5 primary navigation tabs (`For you`, `Dining`, `Movies`, `Events`, `Play`).
2. **Navigate to `/events/`** (`ev_522a1a64`): Displays `Featured events` poster carousel, quick-filter chips (`Filters`, `Today`, `Tomorrow`, `This Weekend`, `Under 10 km`, category chips), and event cards showing date/time, venue, starting price (`₹... onwards`), and inline offer tags (`offer Get 15% OFF up to ₹300`).
3. **Navigate to `/search?tabId=EVENTS`** (`ev_65d947cc`): Displays scope tabs (`All`, `Dining`, `Movies`, `Events`, `Play`), rotating search hint (`Search for 'Home Festival'`), and `Trending in Coimbatore` mixing `Event` and `Venue` items.
4. **Open Event Detail `/events/cult-nights-coimbatore-2026-buy-tickets`** (`ev_0fafc9f7`): Displays title, date/time, venue + distance (`8.9 km away`), `About` (with `Read more`), `Highlights`, `Lineup`, `Facilities at the event`, `Things to know`, `Organized by`, and a sticky bottom bar pairing `Get 10% OFF up to ₹100 | 2 offers` with `₹699 onwards` + `Book tickets`.
5. **Open Multi-City Tour Detail `/events/gorillaz-the-mountain-tour-bengaluru-2027-buy-tickets`** (`ev_c8232a8d`): Adds `Touring In` city pills, `General Sale is live now` phase indicator, `Pay only 25% to reserve your booking` callout, organizer approval rating (`67% liked`), and `Partners` strip.
6. **Click `Book tickets`** (`ev_8b0f4fed`, `ev_24cea136`): Transitions to `/sgw/events/buy-page/<slug>/shows/<showId>/` (`District Events Transactional-flow`). Presents a `"Before you go! Select number of tickets"` (`1`–`10`) bottom sheet over the venue/tier workspace with inventory legend (`Available`, `Nearly sold`, `Sold out`) and price quick-filter pills (`₹5,000`, `₹9,500`, `₹26,500`).
7. **Select quantity (`2`) and click `Proceed`** (`ev_6d0b905c`): Dismisses/advances past the quantity sheet within the buy-page flow.

## Loading, Error, Empty, and Success States

- **Empty facilities state**: Venue guide DOM includes fallback copy `"No facilities available at the moment"` (`ev_2edc505d`).
- **Waitlist / registration confirmation modals**: Event detail DOM includes modal copy `"Registration successful!"` and `"You're all set! We'll send you an email notification before tickets go on sale"` (`ev_0fafc9f7`).
- **Disabled-until-valid action**: `Proceed` button on quantity selector remains disabled until a ticket count `1`–`10` is chosen (`ev_24cea136`).

## Responsive & Accessibility Observations

- Default Headless Chrome capture (`800x600` screenshot in `capture-web-screenshot`) renders the mobile/compact sticky bottom purchase bar on event detail and full-width bottom-sheet modal on the buy-page.
- Interactive controls expose semantic ARIA roles (`button`, `link`, `heading`, `textbox`, `navigation`).

## Unknowns

- Authenticated checkout price breakdown, convenience fee calculation, promo code validation API, payment gateway handoff, and post-purchase ticket wallet/QR rendering.
- Native Android app screen transitions, hardware back behaviour, and bottom-sheet gestures (awaits connected Android device).

## Original NIGHTLIFEZ Adaptation Proposal

Build an independent, high-clarity 4-stage attendee funnel (`Discover` -> `Event Detail & Offers` -> `Tier/Section & Quantity` -> `Review & Demo Reservation`) with real PostgreSQL-backed inventory, sales-phase state machines, offer eligibility rules, and deterministic fee calculations—without copying District branding, copy, or assets.
