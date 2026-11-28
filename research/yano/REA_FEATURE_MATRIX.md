# Yano × NIGHTLIFEZ — REA Targeted Feature Matrix

**Research Date:** 2026-11-27  
**Target Domain:** `https://yano.club` (bounded to 5 target URLs)  
**Toolkit:** REA (`rea-agents` v6.10.1 MCP — `capture_browser_scenario`, `inspect_analysis_view`, `export_evidence_bundle`)  
**Scope:** Publicly observable product features on `/features`, `/sell`, `/solutions`, `/paid-groups`, and `/trips` only. No accounts created, no OTPs sent, no payments submitted, no private dashboards accessed.

---

## 1. Evidence & Capture Inventory

| Target URL | Page Title | REA Capture Evidence ID | Interactions Performed | Screenshots (SHA-256 prefix) |
| :--- | :--- | :--- | :--- | :--- |
| `https://yano.club/features` | `Everything Yano can do · Yano` | `ev_e42d5eee78f6da3fdb594f15ad8aa041e1f3ba46a86e0676ebd2b30cb8308c09` | Initial load + settle (`wait_for_timeout`) | `6fc7eb09ed6e` (`features_step1`) |
| `https://yano.club/sell` | `Sell to your followers · Yano` | `ev_7ad09ea622dd4cf11e1f28a971c60e676d38b6dcdc53203f1cb26a0d35323024` | Initial load + settle (`wait_for_timeout`) | `941001105af9` (`sell_step1`) |
| `https://yano.club/solutions` | `All kinds of events · Yano` | `ev_1cf9a2c551fe041111c847e5710f2ea54e9976761a4bb348053bbd2073c55928` | Initial load + settle (`wait_for_timeout`) | `987ac7982104` (`solutions_step1`) |
| `https://yano.club/paid-groups` | `Run a paid WhatsApp or Telegram group in India · Yano` | `ev_dcb758ce7b94af530f56ce888ccb472cddb7ed22f840a0511a29248e952d6261`, `ev_6efd428ed3626e81e2bbd0cc353677cbc2846a832ed73838777c2935210e4979` | Initial load + 3 FAQ `<summary>` clicks | `b70918692d8a` (`paid-groups_step1`), `381e16e6a6f9` (`paid-groups_step3`) |
| `https://yano.club/trips` | `For trip hosts — curated group trips, advances and boarding without the WhatsApp chaos · Yano` | `ev_430244dfa1512a54d32b9272dbc03d3cd9a9251678cfb7f8be61e321bafe713c`, `ev_7e52ff133cbc818d20384d482e2c2f40ab4314de7004a5509e9315f9e35c5469` | Initial load + 6 FAQ `<summary>` clicks | `7e4a32aa5575` (`trips_step1`), `4486c1799c14` (`trips_step6`) |

*Retained full Evidence bundle exported via `export_evidence_bundle` (`2,031,918` bytes; 35 records). DOM and accessibility snapshots were verified for all 5 pages.*

---

## 2. Page-by-Page Product Analysis

### 2.1 `https://yano.club/features`
- **Purpose:** Plain-language feature directory grouped into 9 functional domains (`Sell`, `Your page`, `Get paid`, `Guests`, `Run the door`, `Booking rules`, `Grow`, `Money`, `Help and safety`).
- **User Types & Roles:** Seller/Creator, Promoter, Guest/Buyer, Door Team Helper (gate scanner), Platform Trust/Safety (issue reporting).
- **Visible Features & Controls:**
  - *Sell:* Events & parties, 1:1/group Calls, Guides & recordings (digital links), Memberships, Physical goods ("Things you make" with postal address + courier tracking), "Run it again" (listing duplication), "Try booking as a guest" (dry-run preview without charge/email/save).
  - *Your page:* Link-in-bio storefront (`name`, `cover photo`, `Instagram`, `one-line intro`, `contact phone`).
  - *Get paid:* Direct UPI ID (manual seller approval in dashboard) or seller's own Razorpay/Cashfree (automatic pass issuance).
  - *Guests:* Pre-payment guest approval (with Instagram handle), manual guest creation (cash/VIP/walk-in), guest-list import (Google Form/sheet/WhatsApp paste), A4/PDF printable guest list, custom booking questions.
  - *Run the door:* Browser-based QR scanner (single-use pass), Door team link + gate code (no access to seller money).
  - *Booking rules:* Minimum guest goal (join free, pay once reached), 50:50 crowd balance (men's/women's auto-pause), pickup points, multi-day & all-days passes, advance + balance at door, discount codes & auto-applied promo links.
  - *Grow:* Seller-configured promoters, promoter marketplace ("Promote what others sell"), website embed snippet (WordPress/Wix/any site), optional "Show it on Find" visibility toggle, post-event WhatsApp thank-you message generator with photo link.
  - *Money & Safety:* Monthly money breakdown, prepaid credits + tax receipts, promoter payout tracking ("I've paid"), buyer pass lookup (`/my-tickets` by phone + email), buyer issue reporting (open issues shown on seller page until settled), seller verification guide (`/help/check-a-seller`), self-serve account deletion preserving shared booking records.
- **Restrictions & Limitations:** Yano explicitly states it never holds funds; all dashboard feature cards redirect to `/login?next=%2Fdashboard%2Feverything` (authenticated UI internals are unobserved).
- **Confidence:** `OBSERVED` (feature descriptions); `UNKNOWN` (exact authenticated dashboard form fields).

### 2.2 `https://yano.club/sell`
- **Purpose:** Seller onboarding & value proposition explaining direct-to-seller payouts, storefront link-in-bio, promoter network, and credit pricing.
- **User Types & Roles:** Seller (creator/host), Buyer/Follower, Promoter (affiliate), External Gateway (Razorpay/Cashfree).
- **Visible Features & Controls:**
  - *Example storefront mockup (`aria-hidden` DOM + screenshot `941001105af9`):* Public URL pattern `yano.club/o/yourname`, `FROM RIYA` (own listings with schedule/price), `RIYA RECOMMENDS` (promoted listings from other sellers e.g. `Pool Night by Kabir`), `FIND RIYA` (YouTube, WhatsApp), live payout callout (`₹299 paid to Riya's UPI`, `Kabir owes Riya ₹450 · 3 sales from her link`).
  - *4-step seller journey:* Make listing -> Share link -> Buyers pay seller -> Post-event summary email with 1-tap "Run it again" duplication.
  - *Payment modes:* Direct UPI ID (`₹0` gateway fee, manual "Approve" button after checking UPI app) vs. own Razorpay/Cashfree (automated pass issuance, bank settlement per gateway schedule).
  - *Promoter model:* Seller sets fixed INR amount per paid sale; must be `>= 10%` of lowest ticket price to appear to new promoters on Yano; live marketplace stat observed (`8 listings from 8 sellers`, `₹3 to ₹110` per paid sale); free/cancelled excluded; seller pays promoter via own UPI app and taps `I've paid`; on-time payment record displayed to promoters.
  - *Pricing:* `1 prepaid credit (₹6–₹10)` per confirmed paid sale (including promoter-attributed paid sales); `10 free credits` on signup; `₹0` commission, `₹0` monthly fee, free listings stay free, credits never expire.
- **Refunds & Restrictions:** Seller is solely responsible for refund decisions and buyer Q&A; Yano exposes seller contact and problem-reporting flow.
- **Confidence:** `OBSERVED`.

### 2.3 `https://yano.club/solutions`
- **Purpose:** Use-case catalog mapping Yano's shared booking/payment/QR-pass core across 15 vertical templates.
- **Visible Categories & Templates:**
  - *Parties & nights out:* Pool parties/club nights/DJ events (stag/female/couple balanced passes), House parties/living-room gigs (approve every guest, hide address until approved), Singles mixers/blind dates/speed dating (curated balanced guest list), Garba & Dandiya (9-night multi-day + gate day awareness), Kavi sammelan/comedy/open mics (minimum commitment goal), Festivals on own website (website embed + own gateway).
  - *Clubs & communities:* Games nights & social clubs, Run/book clubs & meetups, Bhajan sandhya/satsang (free passes, orderly entry).
  - *Trips & travel:* Trips & getaways with strangers (curated + balance at boarding), Bus yatras & tours (advance + door balance).
  - *Classes & workshops:* Workshops (pottery/art/dance/baking), Coaching batches (direct UPI).
  - *More:* Schools (trips/camps/annual days), Colleges & universities (fests/clubs/alumni).
- **Important Restriction:** Sub-pages (`/solutions/*`) were intentionally not crawled per bounded 5-page limit.
- **Confidence:** `OBSERVED` (template list & summaries); `UNKNOWN` (template-specific default field presets).

### 2.4 `https://yano.club/paid-groups`
- **Purpose:** Dedicated product flow for monetising WhatsApp, Telegram, or Discord groups via monthly passes.
- **User Types & Roles:** Group Admin/Seller, Paid Member, Non-paying/Expired Member.
- **Visible Features & Controls:**
  - 3-step setup (`/login?next=%2Fdashboard%2Fnew-listing%3Fkind%3Dmembership%26template%3Dmembers`): (1) Paste WhatsApp/Telegram/Discord invite link; (2) Set monthly price & benefits description; (3) Share listing link.
  - *Link privacy:* Invite link is revealed **only on paid passes**, never on the public listing page.
  - *Renewals & Expiry (verified via 3 FAQ clicks):* Fixed **1 month (30 days)** per payment (no 3-month multi-period checkout "yet"); **no auto-debit / UPI Autopay**; Yano emails renewal link **5 days before expiry**; on expiry, pass stops opening the invite link and seller's `Members list` shows the member as `ended`.
  - *Link rotation:* Seller can reset invite link in WhatsApp/Telegram and update it in Yano; every active paid pass updates automatically.
  - *Discovery exclusion:* Paid groups are **not listed on Yano's Find page**.
- **Restrictions & Limitations:** Yano explicitly does **not** add or remove members in WhatsApp, Telegram, or Discord; admin manually removes ended members. Legal/tax/SEBI compliance (e.g., stock-tips groups) is seller's responsibility.
- **Confidence:** `OBSERVED`.

### 2.5 `https://yano.club/trips`
- **Purpose:** End-to-end trip host workflow covering Instagram curation, gender balance, minimum group goals, pickup points, advance + boarding balance collection, and trip captains.
- **User Types & Roles:** Trip Host/Seller, Traveller, Stop Coordinator / Trip Captain (door/boarding staff).
- **Visible Features & Controls (including 5 sample UI screens in DOM + 6 FAQ clicks):**
  - Setup entry: `/start/trip`.
  - *Step 1 — Seat Request:* Traveller opens link, selects boarding stop (`Majnu ka Tilla`), seat category (`Women`), answers custom questions (Instagram handle `@riya.wanders` rendered as tappable link, bio/note), pays `₹0` upfront.
  - *Step 2 — Host Approval & Pay Link:* Host sees request (`Riya Kapoor · Women · 1 seat · sent 2h ago · ₹2,000`) and taps `Approve & send pay link` or `Decline`. Approval emails a pay link (`Pay and get my pass`) and opens WhatsApp for personalised message. Declined travellers never pay -> zero refund burden.
  - *Step 3 — Traveller Pass:* Shows event/trip date & time, boarding point & boarding time (`Majnu ka Tilla — 9:30 pm`), remaining balance due at boarding (`₹6,500 to pay at boarding`), and `Trip captain · WhatsApp · Call` buttons. Recoverable via phone + email at `/my-tickets`.
  - *Step 4 — Boarding Scanner & Balance Collection:* Stop-specific browser scanner link (no app, no login, no access to host's money ledger). Shows stop manifest & remaining count (`Still to come at Majnu ka Tilla: 3 of 14`), traveller phone numbers to call, and 1-tap balance collection (`Collect ₹6,500 then tap "I received"`).
  - *Step 5 — Repeat & Follow:* 1-tap trip duplication; travellers can follow host in optional Yano Android app for quiet new-trip notifications.
  - *Additional Trip Controls:* Minimum traveller goal (`₹0` reservation until threshold met, then pay links sent); 50:50 gender auto-pausing; Google Form list import (name + mobile -> QR passes) + manual cash booking entry; Excel-ready export of payments, boarding balances collected, and custom question answers.
- **Restrictions & Limitations:** No day-by-day itinerary builder or room-sharing matrix UI was observed on `/trips`; trip booking flow works in mobile/in-app browsers (including Instagram).
- **Confidence:** `OBSERVED` (all 5 mock screens & 6 FAQs); `UNKNOWN` (structured itinerary / room-sharing configuration details).

---

## 3. Feature-by-Feature Comparison vs Existing NIGHTLIFEZ

**Allowed Statuses:** `ALREADY IMPLEMENTED` | `NEEDS EXTENSION` | `NEW MODULE REQUIRED` | `NOT SUITABLE` | `UNKNOWN — MORE EVIDENCE NEEDED`

### A. Seller and Organiser Tools

| Feature | Yano Evidence & Confidence | Existing NIGHTLIFEZ Comparison | Status |
| :--- | :--- | :--- | :--- |
| Public seller storefront / bio link | `OBSERVED` (`/sell`, `/features`): `yano.club/o/yourname` with cover, intro, IG, phone, own listings + promoted listings (`RIYA RECOMMENDS`). | `organizations` table (`schema.sql#L46-L58`) has `slug`, `name`, `rating`, `tenure_label`, but no public `/o/[slug]` storefront route exists (`app/` only has `/venues/[slug]`, `/events/[slug]`, `/artists/[slug]`). | **NEEDS EXTENSION** |
| Listing creation & duplication ("Run it again") | `OBSERVED` (`/features`, `/sell`, `/trips`): Create listing & 1-tap copy (passes, questions, payment) for a new date. | `upsertOrganiserEvent` (`operationsStore.ts#L123`) & `/organiser` (`organiser/page.tsx#L98`) create/update events & tiers; no clone/duplicate action exists. | **NEEDS EXTENSION** |
| Event & product templates | `OBSERVED` (`/features`, `/solutions`, `/paid-groups`): Events/parties, trips, calls, digital guides, memberships, physical goods, 15 solution templates. | `EventCategory` (`types.ts#L3-L11`) covers `concerts`, `festivals`, `comedy`, `nightlife`, `parties`, `music`, `sports`, `workshops`; `organizations`/`events` lack template presets; non-event verticals (`calls`, `digital`, `physical goods`) are absent. | **NEEDS EXTENSION** *(event/trip templates)* / **NEW MODULE REQUIRED** *(memberships)* |
| Multiple pass types & pricing | `OBSERVED` (`/features`, `/solutions`, `/trips`): Multi-tier passes (`stag`, `couple`, `day pass`, `all-days`). | `ticket_tiers` (`schema.sql#L144-L157`), `TicketTier` (`types.ts#L130-L141`), `BookingFlow.tsx` already support multiple tiers per event with price, quota, `maxPerOrder`. | **ALREADY IMPLEMENTED** |
| Early-bird pricing | `OBSERVED` (`/features`): Discount codes for early fans; scheduled early-bird tier pricing windows `UNKNOWN` on the 5 pages. | `SalesPhaseStatus` (`types.ts#L15-L21`) & `sales_timeline_json` (`schema.sql#L116`) already model `EARLY_ACCESS`, `PRE_SALE`, `GENERAL_SALE`, `FINAL_RELEASE` per tier/event. | **ALREADY IMPLEMENTED** *(tier phases)* |
| Guest approvals (pre-payment review) | `OBSERVED` (`/features`, `/trips`, `/solutions`): Request seat at `₹0` with Instagram/questions; host approves -> sends pay link or declines. | `bookings` (`repository.ts#L688`) goes straight to payment + `CONFIRMED_DEMO`; no pre-payment request/approval queue exists. | **NEEDS EXTENSION** |
| Custom booking questions | `OBSERVED` (`/features`, `/trips`): Host configures arbitrary questions (Instagram handle, age, T-shirt size); answers shown in request & guest list. | `createBookingSchema` (`schemas.ts#L32-L42`) only accepts `attendeeName`, `attendeeEmail`, `items`, `offerCode`; no custom question schema or response storage. | **NEEDS EXTENSION** |
| Manual guest creation (cash / VIP / walk-in) | `OBSERVED` (`/features`, `/trips`): Seller adds guest manually (cash/VIP/walk-in) and issues valid QR pass. | `box_office` role (`roles.ts#L16, L210-L215`) has `staff:boxoffice:sell` permission defined, but no API route or UI in `/organiser` or `/staff` implements manual/walk-in issuance yet. | **NEEDS EXTENSION** |
| Guest-list CSV/sheet import & export | `OBSERVED` (`/features`, `/trips`): Paste/import CSV/Google Form (name + mobile -> QR pass); export Excel-ready accounts & answers + A4 PDF printable door list. | `organiser/page.tsx#L231-L252` has client-side CSV export of bookings; no attendee/guest-list CSV import, no A4 print sheet, no custom-answer export. | **NEEDS EXTENSION** |
| Public vs private booking links & Find toggle | `OBSERVED` (`/features`, `/paid-groups`): "Show it on Find" toggle; house parties hide address until approved; website embed snippet. | `events.lifecycle_status` (`DRAFT`, `PENDING_APPROVAL`, `PUBLISHED`, `PAUSED`, `CANCELLED`) + `is_featured` (`schema.sql#L119, L129`); no `visibility` (`PUBLIC`/`UNLISTED`/`INVITE_ONLY`) or embed widget. | **NEEDS EXTENSION** |
| Dry-run "Try booking as a guest" | `OBSERVED` (`/features`): Preview own listing booking without charge, save, or email. | Preview link (`<Link href="/events/...">` in `organiser/page.tsx#L454`) opens event page, but `BookingFlow` writes real demo bookings if submitted. | **NEEDS EXTENSION** |

### B. Crowd and Booking Management

| Feature | Yano Evidence & Confidence | Existing NIGHTLIFEZ Comparison | Status |
| :--- | :--- | :--- | :--- |
| Minimum guest/group targets | `OBSERVED` (`/features`, `/trips`, `/solutions`): "Minimum guest goal" — guests reserve at `₹0`; pay links trigger only once threshold is reached. | Not present in `events` or `bookings` (`schema.sql`, `repository.ts`). | **NEW MODULE REQUIRED** *(or Event Rule extension)* |
| 50:50 gender crowd balancing | `OBSERVED` (`/features`, `/solutions`, `/trips`): Men's/women's passes auto-pause when one side gets ahead. | **Forbidden by NIGHTLIFEZ Business Rules** (Section 6: *"Do not infer gender or sensitive personal characteristics for crowd balancing"*). Must instead use gender-neutral tier quotas/ratio caps. | **NOT SUITABLE** |
| Configurable pass-category capacity controls | `OBSERVED` (`/features`, `/solutions`): Per-pass capacity and auto-pause rules. | `ticket_tiers.total_quota`, `remaining_quota`, `is_active`, `venue.sections[].capacity` (`schema.sql#L144-L157`) + `inventory_holds` (`#L159-L170`). Lacks paired-tier ratio/throttling rules. | **NEEDS EXTENSION** |
| Multi-day passes | `OBSERVED` (`/features`, `/solutions`): Day passes and all-days passes (`Garba & Dandiya`), gate scanner knows active day. | `event_occurrences` table (`schema.sql#L134-L142`) and `bookings.occurrence_id` (`#L215`) + `EventSession` (`types.ts#L165-L170`) exist in schema, but `bookings` & `tickets` check-in (`evaluateTicketScanEligibility` in `pricing.ts#L193`) do not enforce occurrence/day-pass scope yet. | **NEEDS EXTENSION** |
| Group bookings | `OBSERVED` (`/features`, `/solutions`): Group calls, multi-seat requests; exact group bundle pricing `UNKNOWN`. | `booking_items` supports multiple quantities & `seatLabels` (`maxPerOrder`, max 10 tickets/order in `repository.ts#L710`). | **ALREADY IMPLEMENTED** *(multi-ticket orders)* |
| Booking limits | `OBSERVED` (`/sell`, `/paid-groups`): One seat per mobile number for online classes; capacity limits. | `ticket_tiers.max_per_order` (`schema.sql#L153`) and order cap `10` (`repository.ts#L710`); no per-user/per-phone uniqueness limit per event. | **NEEDS EXTENSION** |
| Discount codes & auto-applied links | `OBSERVED` (`/features`): Discount codes or URL that pre-applies discount. | `offers` table (`schema.sql#L172-L188`), `evaluateOfferDiscount` (`pricing.ts#L26-L63`) support `PERCENT_CAP`, `FLAT`, `BOGO_TIER` codes; URL auto-apply query param (`?offer=`) not wired in `BookingFlow.tsx`. | **ALREADY IMPLEMENTED** *(core)* / **NEEDS EXTENSION** *(URL auto-apply)* |
| Guest extras & benefits | `UNKNOWN` on the 5 target pages (not explicitly described on `/features`, `/sell`, `/solutions`, `/paid-groups`, `/trips`). | Not present in `ticket_tiers` or `tickets` (`schema.sql`). | **UNKNOWN — MORE EVIDENCE NEEDED** |
| Waiting lists | `UNKNOWN` as post-sellout queue; pre-payment approval & min-goal reservation queues are `OBSERVED` (`/trips`, `/features`). | Not present in `schema.sql` or `repository.ts`. | **UNKNOWN — MORE EVIDENCE NEEDED** |

### C. Trips and Travel Operations

| Feature | Yano Evidence & Confidence | Existing NIGHTLIFEZ Comparison | Status |
| :--- | :--- | :--- | :--- |
| Multi-day itineraries | `INFERRED` (`/trips` shows `Spiti — 6 nights` and `Fri, 24 Oct · 9:30 pm`); structured day-by-day itinerary UI `UNKNOWN`. | `events` has `starts_at`, `ends_at`, `duration_label`, `highlights_json` (`schema.sql#L92-L121`); no multi-day itinerary table. | **NEW MODULE REQUIRED** *(Trips)* |
| Pickup locations & boarding times | `OBSERVED` (`/features`, `/trips`): Host defines stops + times (`Majnu ka Tilla — 9:30 pm`). | Not present in `events` or `venues`. | **NEW MODULE REQUIRED** |
| Pickup selection at checkout | `OBSERVED` (`/trips`): Traveller picks boarding point during seat request/checkout; displayed on pass. | Not present in `BookingFlow.tsx` or `createBookingSchema`. | **NEW MODULE REQUIRED** |
| Multiple ticket / room-sharing options | `OBSERVED` (`/trips` FAQ mentions `seat type`); explicit room-sharing matrix `UNKNOWN`. | `ticket_tiers` supports multiple priced tiers per listing, reusable for seat/sharing tiers under a Trip or Event link. | **NEEDS EXTENSION** *(reuse `ticket_tiers` or trip tiers)* |
| Custom traveller questions | `OBSERVED` (`/trips`): Instagram handle (rendered as tappable link), age, bio/notes before approval. | Not present in `schemas.ts` or `bookings`. | **NEEDS EXTENSION** *(shared custom questions)* |
| Minimum group size | `OBSERVED` (`/trips`): "Only go if enough join — Travellers reserve for ₹0; pay links go out when your minimum joins." | Not present in `events` or `bookings`. | **NEW MODULE REQUIRED** *(shared min-goal rule)* |
| Advance payment & outstanding balance | `OBSERVED` (`/features`, `/trips`): Pay advance online (`₹2,000`), pass & scanner display balance due (`₹6,500 to pay at boarding`). | `bookings` only stores single full `total_inr` (`schema.sql#L205`); no `advance_amount` / `balance_due` or split collection state. | **NEW MODULE REQUIRED** *(Trip/split-payment tracking)* |
| Passenger manifests & pickup-wise arrival status | `OBSERVED` (`/features`, `/trips`): Stop coordinator sees who is boarded vs `Still to come at Majnu ka Tilla: 3 of 14` with phone numbers. | `lookupEventTickets` (`operationsStore.ts#L834`) lists tickets per event only, with no pickup-stop grouping or phone display. | **NEW MODULE REQUIRED** |
| Boarding confirmation & balance collection | `OBSERVED` (`/trips`): Scanner shows `Collect ₹6,500 then tap "I received"` during boarding. | `verifyAndCheckInTicket` (`operationsStore.ts#L590`) only marks ticket `USED` — must remain **separate** from Trip boarding & balance collection per Business Rules (Section 6). | **NEW MODULE REQUIRED** |
| Trip staff / Trip captain / volunteer access | `OBSERVED` (`/trips`): Stop-level scanner link (no app/login/money access) + `Trip captain · WhatsApp · Call` on pass. | `checkin_staff` is event-scoped (`roles.ts#L216-L220`); lacks trip-stop scope and Trip Captain contact metadata. | **NEEDS EXTENSION** |

### D. Paid Groups and Memberships

| Feature | Yano Evidence & Confidence | Existing NIGHTLIFEZ Comparison | Status |
| :--- | :--- | :--- | :--- |
| Community membership plans | `OBSERVED` (`/features`, `/sell`, `/paid-groups`): Monthly pass for WhatsApp/Telegram/Discord/club/gym/class; excluded from `/find`. | Zero membership concepts in `schema.sql`, `types.ts`, or `api/`. | **NEW MODULE REQUIRED** |
| Monthly (30-day) membership periods | `OBSERVED` (`/paid-groups` FAQ): Strictly 1 month (`30 days`) per payment; multi-month upfront not supported ("Not yet"). | Not present in NIGHTLIFEZ. | **NEW MODULE REQUIRED** |
| Member registration & direct payment | `OBSERVED` (`/paid-groups`): Member pays seller UPI or Razorpay/Cashfree, gets pass with group link. | `paymentAdapter.ts` is demo-only (`DEMO_NO_CHARGE`); no membership checkout. | **NEW MODULE REQUIRED** |
| Active, expired & pending membership states | `OBSERVED` (`/paid-groups`, `/sell`): Active (invite link accessible), Pending (awaiting UPI approval), Ended/Expired (pass stops opening link, listed as `ended`). | Not present in NIGHTLIFEZ. | **NEW MODULE REQUIRED** |
| Renewal & manual renewal behaviour | `OBSERVED` (`/paid-groups`): No auto-debit; email reminder **5 days before expiry**; manual pay-again renewal. | Not present in NIGHTLIFEZ. | **NEW MODULE REQUIRED** |
| Expiry tracking | `OBSERVED` (`/paid-groups`): Seller `Members list` tracks whose 30-day month has ended. | Not present in NIGHTLIFEZ. | **NEW MODULE REQUIRED** |
| Access-link privacy & link rotation | `OBSERVED` (`/paid-groups`): Invite link hidden from public listing, gated on active paid pass; updating link in seller dashboard updates all active passes. | Not present in NIGHTLIFEZ. | **NEW MODULE REQUIRED** |
| WhatsApp / Telegram / Discord group access limitations | `OBSERVED` (`/paid-groups`): Explicit disclosure that Yano **cannot** add/remove members in WA/TG/Discord; seller removes ended members manually. | Must be preserved as explicit non-claim in NIGHTLIFEZ (Section 6). | **NOT SUITABLE** *(auto-removal)* / **NEW MODULE REQUIRED** *(manual roster + gated link)* |

### E. Promoters and Referrals

| Feature | Yano Evidence & Confidence | Existing NIGHTLIFEZ Comparison | Status |
| :--- | :--- | :--- | :--- |
| Unique promoter links | `OBSERVED` (`/features`, `/sell`): Sellers invite promoters or list on promoter board; promoters get unique tracking links & can showcase on their bio (`RIYA RECOMMENDS`). | No referral/promoter attribution in `bookings`, `offers`, or `roles.ts`. | **NEW MODULE REQUIRED** |
| Promoter discount codes | `INFERRED` (`/features`: links auto-apply discount codes; `/sell`: promoters share link, exact promoter-specific promo code UI `UNKNOWN`). | `offers` (`schema.sql#L172`) supports event promo codes, but has no `promoter_id` / attribution link. | **NEEDS EXTENSION** *(link `offers` to promoters)* |
| Fixed commission per paid sale | `OBSERVED` (`/sell`): Fixed INR per paid sale (`>= 10%` of lowest price to list publicly on Yano promoter board). | Not present in `ledger_entries` or `offers`. | **NEW MODULE REQUIRED** |
| Booking attribution & cancelled/refunded exclusions | `OBSERVED` (`/sell`): "Only paid sales count. Free and cancelled ones don't." | `bookings` tracks `status` (`CONFIRMED_DEMO`, `CANCELLED`, `REFUND_PENDING`, `REFUNDED`) and `payment_status`, providing exact hooks for attribution state! | **NEW MODULE REQUIRED** *(attribution records tied to `bookings.status`)* |
| Promoter earnings, amount owed & seller-controlled payout | `OBSERVED` (`/features`, `/sell`): `Owed to you`, seller pays via UPI app and taps `I've paid`, on-time record tracked. | `settlements` (`schema.sql#L331`) is platform-to-org demo settlement, not organiser-to-promoter payout acknowledgement. | **NEW MODULE REQUIRED** |

### F. Door and Staff Operations

| Feature | Yano Evidence & Confidence | Existing NIGHTLIFEZ Comparison | Status |
| :--- | :--- | :--- | :--- |
| Restricted scanner links / gate-specific access | `OBSERVED` (`/features`, `/trips`): Door team link + gate code; stop-specific view; zero access to seller money. | NIGHTLIFEZ has `checkin_staff` role (`roles.ts#L216-L220`) with `staff:events:read`, `staff:tickets:scan`, `staff:tickets:lookup` and event-scoped `/staff` console — **no financial permissions**. Unauthenticated static-code links violate NIGHTLIFEZ unified identity (Section 6), so scoped invite/session links are preferred. | **NEEDS EXTENSION** *(scoped gate/stop links within NIGHTLIFEZ auth)* |
| QR validation & duplicate scans | `OBSERVED` (`/features`): Browser camera QR scanner, single-use pass. | `signQrPayload` / `verifyQrPayload` (`auth.ts#L38-L65`), `verifyAndCheckInTicket` (`operationsStore.ts#L590`), `evaluateTicketScanEligibility` (`pricing.ts#L193`), plus offline queue + conflict detection (`syncOfflineScans`) are already implemented! | **ALREADY IMPLEMENTED** *(note: `/staff` UI currently uses text input; camera QR reader UI is an easy client extension)* |
| Walk-in guest creation | `OBSERVED` (`/features`, `/trips`): Add cash/VIP/walk-in guest -> valid QR pass. | `box_office` role & `staff:boxoffice:sell` permission (`roles.ts#L210-L215`) exist, but endpoint & UI are not yet built. | **NEEDS EXTENSION** |
| Benefits / extras redemption & mark-as-given/undo | `UNKNOWN` on the 5 target pages (`Collect ₹6,500 then tap "I received"` is observed for trip balances; non-cash perks/extras mark-as-given & undo not observed). | Not present in `tickets` or `ticket_scan_logs`. | **UNKNOWN — MORE EVIDENCE NEEDED** |
| Staff visibility restrictions | `OBSERVED` (`/features`, `/trips`): Helpers never see seller money. | `ROLE_PERMISSIONS` (`roles.ts#L210-L220`) strictly omits `org:settlements:read`, `org:reports:read`, `platform:ledger:read` from `box_office` & `checkin_staff`. | **ALREADY IMPLEMENTED** |
| Guest-list filtering | `OBSERVED` (`/trips`): Filter/count by pickup stop (`Still to come at Majnu ka Tilla: 3 of 14`). | `lookupEventTickets` (`operationsStore.ts#L834`) supports text search (`q` on `ticketCode`, `holderName`, `holderEmail`), no tier/status/stop filter. | **NEEDS EXTENSION** |

### G. Seller Payments

| Feature | Yano Evidence & Confidence | Existing NIGHTLIFEZ Comparison | Status |
| :--- | :--- | :--- | :--- |
| Direct UPI behaviour | `OBSERVED` (`/features`, `/sell`): Buyer pays seller's UPI ID directly (`₹0` payment fee); seller checks UPI app and taps `Approve` to issue pass. | `paymentAdapter.ts` (`executeDemoPaymentAdapter`) is demo-only (`DEMO_NO_CHARGE`). No UPI intent or organiser manual payment verification exists. | **NEW MODULE REQUIRED** *(Direct Organiser Payment Adapter)* |
| Gateway payment behaviour (seller's Razorpay/Cashfree) | `OBSERVED` (`/features`, `/sell`, `/trips`): Seller connects own Razorpay or Cashfree account; passes issue automatically; gateway settles to seller bank. | `paymentAdapter.ts` is demo-only; `bookings` / `payment_records` (`schema.sql#L234-L243`) already model `provider`, `mode`, `state`, `transaction_ref`. | **NEEDS EXTENSION** *(pluggable organiser gateway adapter)* |
| Manual payment approval | `OBSERVED` (`/sell`): Seller taps `Approve` after verifying UPI receipt. | `bookings.payment_status` (`schema.sql#L216`) has `PENDING` in `PaymentState` (`types.ts#L36`), but no organiser approval endpoint exists. | **NEEDS EXTENSION** |
| Outstanding balance collection | `OBSERVED` (`/features`, `/trips`): Advance online, remaining balance displayed on pass & collected at boarding (`tap "I received"`). | `bookings` assumes single full upfront total; no balance-due or split-payment ledger. | **NEW MODULE REQUIRED** |
| Refund responsibility | `OBSERVED` (`/sell`, footer): Seller holds money, decides & processes refunds directly; Yano provides buyer issue-reporting (`Open issues show on your page until settled`). | `refund_requests` (`schema.sql#L303-L315`), `decideRefundSchema`, `org:refunds:decide` (`roles.ts#L58`) + `support_cases` (`schema.sql#L345`) already support organiser refund decisions & buyer disputes! | **ALREADY IMPLEMENTED** *(workflow)* / **NEEDS EXTENSION** *(direct-to-organiser payout note)* |
| Seller settlement information | `OBSERVED` (`/features`, `/sell`): Yano never holds funds; `Money by month` summary + promoter `Owed` tracking. | `ledger_entries` & `settlements` (`schema.sql#L317-L343`) assume platform-collected sandbox ledger (`DEMO_LEDGER`) with `convenience_fee_inr` (6%) & `gst_inr` (18%). | **NEEDS EXTENSION** *(reconcile direct-to-organiser vs platform-settled modes)* |
| Platform fees / per-pass credits | `OBSERVED` (`/sell`, `/paid-groups`, `/trips`): `₹6–₹10` prepaid credit per paid pass (10 free), `₹0` commission. | **Do not copy Yano's pricing model** (Section 6). NIGHTLIFEZ already computes `convenienceFeeInr` & `gstInr` in `pricing.ts#L131-L133`. | **NOT SUITABLE** |

---

## 4. Missing Feature Summary (Gaps Identified for NIGHTLIFEZ)

1. **Public Organiser Storefront (`/o/[slug]`)** & unlisted/invite-only event visibility controls.
2. **Pre-Payment Guest Approval & Custom Booking Questions** (request -> organiser approve/decline -> payment link).
3. **Event Duplication ("Run it again") & Minimum Guest Goal** (`₹0` reservation until minimum threshold met).
4. **Guest-List CSV Import, Printable Door Manifest & Box-Office Walk-In Issuance** (wiring existing `box_office` role).
5. **Trips Module** (pickup stops/times, checkout pickup selection, advance + balance due, pickup-wise boarding & balance collection separate from event QR check-in).
6. **Paid Groups / Memberships Module** (30-day cycles, manual renewal + 5-day expiry reminders, private rotatable invite links, manual group admin roster).
7. **Promoter / Referral Tracking Module** (referral links, fixed per-sale commission on confirmed non-cancelled bookings, organiser-controlled UPI payout acknowledgement).
8. **Direct-to-Organiser Payment & Verification Layer** (organiser UPI verification + organiser-connected Razorpay/Cashfree without platform custody of seller funds).
