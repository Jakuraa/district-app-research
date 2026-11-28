# NIGHTLIFEZ × Yano — REA Research Summary

- **Scope:** Bounded REA browser investigation of 5 public Yano pages (`/features`, `/sell`, `/solutions`, `/paid-groups`, `/trips`), 7 screenshots, 9 FAQ interactions, and full comparison against NIGHTLIFEZ (`feature/nightlifez-full-platform`).
- **Core Yano Model:** Direct-to-seller payments (seller UPI with manual approval or seller's own Razorpay/Cashfree; zero platform custody), link-in-bio storefront (`/o/yourname`), pre-payment guest approvals, and ₹6–₹10 prepaid pass credits (excluded from NIGHTLIFEZ).
- **Reusable NIGHTLIFEZ Assets:** Unified OTP/session identity, scoped RBAC (`roles.ts`), multi-tier `ticket_tiers`, `inventory_holds`, `offers`, `event_occurrences`, HMAC `NLZ1` QR scanning + offline sync (`/staff`), `refund_requests`, and `audit_logs`.
- **Key Gaps & New Modules:** Public `/o/[orgSlug]` storefront, custom questions & guest approval queue, box-office walk-ins & CSV import, min-goal pledges, Trips (pickups, advance+balance, stop boarding), Paid Groups (30-day cycles, rotatable private links, 5-day expiry reminders), Promoters (fixed commission, seller UPI payout acknowledgement), and Direct-to-Organiser Payment Adapter.
- **Guardrails Enforced:** No gender-based crowd balancing (use gender-neutral tier ratio caps); no automatic WA/TG/Discord member removal claims; zero financial access for gate/trip staff; trip boarding kept separate from event QR check-in.
- **Deliverables:**
  - [REA_FEATURE_MATRIX.md](file:///Users/pradeepjakuraa/nightlifez-dist/district-app-research/research/yano/REA_FEATURE_MATRIX.md) — Page evidence, screenshots/DOM refs, and NIGHTLIFEZ gap comparison.
  - [NIGHTLIFEZ_INTEGRATION_SPEC.md](file:///Users/pradeepjakuraa/nightlifez-dist/district-app-research/research/yano/NIGHTLIFEZ_INTEGRATION_SPEC.md) — Architecture, conceptual schema/APIs, RBAC, state machines, and milestone roadmap.
