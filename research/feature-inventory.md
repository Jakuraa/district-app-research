# Feature inventory

Track one row per feature. Status values: `not-started`, `observed`, `specified`, `implemented`, `verified`.

| Area | Feature | Status | Evidence | Unknowns |
|---|---|---|---|---|
| Discovery | Home feed and category navigation | observed | `ev_b54e2a34`, `ev_522a1a64` | Personalised ranking criteria for logged-in users; Android native bottom-tab parity awaits connected device |
| Discovery | City/location selection | observed | `ev_0a8bc45b`, `ev_b54e2a34` | Full list of supported cities beyond search/current-location modal; Android GPS permission prompt awaits device |
| Search | Search input, suggestions, filters | observed | `ev_65d947cc`, `ev_522a1a64` | Full filter drawer options behind `Filters` button; live typeahead API debounce timing |
| Event page | Hero/media, event information, highlights | observed | `ev_0fafc9f7`, `ev_c8232a8d` | Android native gallery/video player behaviour awaits device |
| Event page | Facilities and policies | observed | `ev_0fafc9f7`, `ev_2edc505d` | Full overflow modal items behind `View more` |
| Event page | Offers and offer details | observed | `ev_0fafc9f7`, `ev_522a1a64` | Bank/card BIN validation at checkout requires authenticated session |
| Event page | Sales timeline | observed | `ev_c8232a8d`, `ev_0fafc9f7` | Exact countdown transition UI between Pre-sale/Fan-sale and General Sale |
| Ticketing | Ticket/section list and pricing | observed | `ev_24cea136`, `ev_6d0b905c` | Reserved seat-level map interaction vs section-level selection after quantity proceed |
| Ticketing | Venue diagram and section selection | observed | `ev_24cea136`, `ev_2edc505d` | Interactive pan/zoom SVG/Canvas internals (awaiting authenticated/desktop inspection) |
| Ticketing | Quantity selection and inventory states | observed | `ev_24cea136` | Per-tier min/max overrides vs 1–10 global modal cap |
| Checkout | Price breakdown, fees, offers | not-started | — | Requires authenticated user session; not observed without login |
| Checkout | Payment handoff and return states | not-started | — | Out of scope for automated/live transactions; requires manual observation |
| Account | Sign-in and session entry points | observed | `ev_b54e2a34`, `ev_24cea136` | OTP/passkey post-login screens require manual owner login |
| Account | My bookings and ticket display | not-started | — | Requires authenticated user session with bookings |
| Support | Cancellation, refund, help flows | not-started | — | Requires authenticated booking or `/contact` deep dive |
| UX | Loading, empty, error, and success states | observed | `ev_0fafc9f7`, `ev_2edc505d` | Error retry states on offline/5xx responses |
| UX | Android navigation, back behaviour, bottom sheets | not-started | `ev_e9d022a2` | Awaits connected authorized Android device + APK (no USB device detected) |
| Accessibility | Touch targets, labels, focus, contrast | observed | `ev_b54e2a34`, `ev_522a1a64`, `ev_24cea136` | Screen reader traversal on Android TalkBack awaits device |
| Dining / Movies / Play | Public discovery vertical routes (`/dining`, `/movies`, `/play`) | observed | `ev_413ca2ea`, `ev_8b605622`, `ev_6199e806` | Authenticated seat/table/slot checkout internals remain unknown |
| Organiser / Venue / Staff / Admin | Back-office portals, scanner, moderation, settlements | unknown | — | Not publicly observable without authorized District partner/admin portal; designed as original first-party NIGHTLIFEZ workflows |
