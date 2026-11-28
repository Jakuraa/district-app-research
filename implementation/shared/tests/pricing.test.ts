import test from "node:test";
import assert from "node:assert/strict";
import {
  calculatePriceBreakdown,
  getTierAvailability,
  SEED_EVENTS,
  createBookingSchema
} from "../src/index.ts";

test("tier availability returns AVAILABLE, NEARLY_SOLD, and SOLD_OUT accurately", () => {
  assert.equal(getTierAvailability({ remainingQuota: 0, totalQuota: 100 }), "SOLD_OUT");
  assert.equal(getTierAvailability({ remainingQuota: 10, totalQuota: 200 }), "NEARLY_SOLD");
  assert.equal(getTierAvailability({ remainingQuota: 120, totalQuota: 300 }), "AVAILABLE");
});

test("PERCENT_CAP offer enforces minOrderInr and maxDiscountInr cap", () => {
  const event = SEED_EVENTS[0];
  // 1x GA = 1499 (< 2500 minOrderInr for NIGHT15)
  const rejected = calculatePriceBreakdown({
    tiers: event.tiers,
    selections: [{ tierId: "tier-solstice-ga", quantity: 1 }],
    offers: event.offers,
    offerCode: "NIGHT15",
    now: new Date("2026-11-26T00:00:00Z")
  });
  assert.equal(rejected.discountInr, 0);
  assert.match(rejected.offerRejectionReason ?? "", /2,500/);

  // 2x GA = 2998 -> 15% = 450, capped at 400
  const applied = calculatePriceBreakdown({
    tiers: event.tiers,
    selections: [{ tierId: "tier-solstice-ga", quantity: 2 }],
    offers: event.offers,
    offerCode: "night15",
    now: new Date("2026-11-26T00:00:00Z")
  });
  assert.equal(applied.subtotalInr, 2998);
  assert.equal(applied.discountInr, 400);
  assert.equal(applied.appliedOfferCode, "NIGHT15");
  assert.equal(applied.convenienceFeeInr, Math.round((2998 - 400) * 0.06));
  assert.equal(applied.gstInr, Math.round(applied.convenienceFeeInr * 0.18));
});

test("BOGO_TIER discounts one ticket when minimum quantity is met", () => {
  const event = SEED_EVENTS[1];
  const res = calculatePriceBreakdown({
    tiers: event.tiers,
    selections: [{ tierId: "tier-indie-ga", quantity: 3 }],
    offers: event.offers,
    offerCode: "TRIO3",
    now: new Date("2026-11-26T00:00:00Z")
  });
  assert.equal(res.subtotalInr, 2097);
  assert.equal(res.discountInr, 699);
  assert.equal(res.appliedOfferCode, "TRIO3");
});

test("createBookingSchema validates payload boundaries", () => {
  const valid = createBookingSchema.safeParse({
    eventSlug: "solstice-soundwave-bengaluru-2026",
    attendeeName: "Asha Rao",
    attendeeEmail: "asha@example.com",
    items: [{ tierId: "tier-solstice-ga", quantity: 2 }]
  });
  assert.equal(valid.success, true);

  const invalidQty = createBookingSchema.safeParse({
    eventSlug: "solstice-soundwave-bengaluru-2026",
    attendeeName: "Asha Rao",
    attendeeEmail: "asha@example.com",
    items: [{ tierId: "tier-solstice-ga", quantity: 11 }]
  });
  assert.equal(invalidQty.success, false);
});

import {
  canTransitionBookingStatus,
  canTransitionEventStatus,
  canTransitionRefundStatus,
  evaluateTicketScanEligibility,
  hasPermission
} from "../src/index.ts";

test("RBAC hasPermission enforces organization and event tenant isolation", () => {
  const orgOwner = [
    {
      role: "organiser_owner" as const,
      organizationId: "org-a",
      venueSlug: null,
      eventId: null
    }
  ];
  assert.equal(hasPermission(orgOwner, "org:events:write", { organizationId: "org-a" }), true);
  assert.equal(hasPermission(orgOwner, "org:events:write", { organizationId: "org-b" }), false);
  assert.equal(hasPermission(orgOwner, "platform:kpi:read"), false);

  const gateStaff = [
    {
      role: "checkin_staff" as const,
      organizationId: "org-a",
      venueSlug: "venue-1",
      eventId: "evt-1"
    }
  ];
  assert.equal(hasPermission(gateStaff, "staff:tickets:scan", { eventId: "evt-1" }), true);
  assert.equal(hasPermission(gateStaff, "staff:tickets:scan", { eventId: "evt-2" }), false);
  assert.equal(hasPermission(gateStaff, "staff:boxoffice:sell", { eventId: "evt-1" }), false);
});

test("booking, refund, and event lifecycle state transitions reject invalid jumps", () => {
  assert.equal(canTransitionBookingStatus("CONFIRMED_DEMO", "REFUND_PENDING"), true);
  assert.equal(canTransitionBookingStatus("REFUNDED", "CONFIRMED_DEMO"), false);

  assert.equal(canTransitionRefundStatus("REQUESTED", "APPROVED"), true);
  assert.equal(canTransitionRefundStatus("PROCESSED", "REQUESTED"), false);

  assert.equal(canTransitionEventStatus("DRAFT", "PUBLISHED"), true);
  assert.equal(canTransitionEventStatus("CANCELLED", "PUBLISHED"), false);
});

test("evaluateTicketScanEligibility flags VALID, ALREADY_USED, CANCELLED, REVOKED, EXPIRED, and WRONG_EVENT", () => {
  assert.equal(
    evaluateTicketScanEligibility({
      ticket: { eventId: "evt-1", status: "VALID", checkedInAt: null },
      expectedEventId: "evt-1"
    }).result,
    "VALID"
  );
  assert.equal(
    evaluateTicketScanEligibility({
      ticket: { eventId: "evt-1", status: "USED", checkedInAt: "2026-11-26T10:00:00Z" },
      expectedEventId: "evt-1"
    }).result,
    "ALREADY_USED"
  );
  assert.equal(
    evaluateTicketScanEligibility({
      ticket: { eventId: "evt-1", status: "CANCELLED", checkedInAt: null },
      expectedEventId: "evt-1"
    }).result,
    "CANCELLED"
  );
  assert.equal(
    evaluateTicketScanEligibility({
      ticket: { eventId: "evt-1", status: "REVOKED", checkedInAt: null },
      expectedEventId: "evt-1"
    }).result,
    "REVOKED"
  );
  assert.equal(
    evaluateTicketScanEligibility({
      ticket: { eventId: "evt-1", status: "VALID", checkedInAt: null },
      expectedEventId: "evt-2"
    }).result,
    "WRONG_EVENT"
  );
});
