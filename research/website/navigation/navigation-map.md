# District Website Navigation & State Map (Observed)

Source: REA passive CDP observations (`ev_b54e2a34`, `ev_522a1a64`, `ev_65d947cc`, `ev_0fafc9f7`, `ev_c8232a8d`, `ev_2edc505d`, `ev_24cea136`, `ev_8b0f4fed`, `ev_6d0b905c`).

```mermaid
flowchart TD
  Home["/ (For You Home)"] -->|"Location pill"| CityModal["Select Location Modal"]
  Home -->|"Search pill"| Search["/search?tabId=EVENTS"]
  Home -->|"Events tab"| Events["/events/"]
  Home -->|"Log in button"| AuthGate["Auth Modal / Flow (unknown internals)"]

  Events -->|"Filter chips / Apply Filters"| Events
  Events -->|"Event Card"| EventDetail["/events/<slug>-buy-tickets"]
  Search -->|"Event Result"| EventDetail
  Search -->|"Venue Result"| VenueGuide["/events/<venue-slug>/venue-guide"]
  EventDetail -->|"Venue link"| VenueGuide
  EventDetail -->|"View offers"| OffersSheet["Offers Sheet"]
  EventDetail -->|"Touring In city link"| EventDetail

  EventDetail -->|"Book tickets CTA"| BuyGate["/sgw/events/buy-page/<slug>/shows/<showId>/"]
  BuyGate -->|"Before you go! Qty 1-10 -> Proceed"| BuySections["Section & Tier Selection"]
  BuySections -->|"Proceed to checkout"| Checkout["Authenticated Checkout (unknown - awaits manual login)"]
```

## Notes
- Unauthenticated public traversal ends at the transactional buy-page (`/sgw/events/buy-page/...`) after selecting ticket quantity (`1`–`10`) and clicking `Proceed`.
- Auth-gated checkout, payment handoff, and post-purchase ticket wallet screens remain marked `unknown` pending manual owner authentication.
