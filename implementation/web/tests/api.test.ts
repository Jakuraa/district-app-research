import test from "node:test";
import assert from "node:assert/strict";
import {
  cancelDemoBooking,
  createDemoBooking,
  getEventDetail,
  getVenueDetail,
  listCitiesAndEvents
} from "../src/lib/repository.ts";

test("listCitiesAndEvents filters by city and category", async () => {
  const all = await listCitiesAndEvents();
  assert.ok(all.cities.length >= 4);
  assert.ok(all.events.length >= 4);

  const blr = await listCitiesAndEvents({ city: "bengaluru" });
  assert.equal(blr.events.length, 1);
  assert.equal(blr.events[0].slug, "solstice-soundwave-bengaluru-2026");
});

test("createDemoBooking decrements quota and cancelDemoBooking restores it", async () => {
  const detailBefore = await getEventDetail("southern-cipher-live-coimbatore-2026");
  assert.ok(detailBefore);
  const tierBefore = detailBefore.event.tiers.find((t) => t.id === "tier-indie-ga");
  assert.ok(tierBefore);
  const initialQuota = tierBefore.remainingQuota;

  const booking = await createDemoBooking({
    eventSlug: "southern-cipher-live-coimbatore-2026",
    attendeeName: "Karthik Raja",
    attendeeEmail: "karthik@example.com",
    offerCode: "CULT15",
    items: [{ tierId: "tier-indie-ga", quantity: 2 }]
  });

  assert.equal(booking.status, "CONFIRMED_DEMO");
  assert.equal(booking.offerCode, "CULT15");
  assert.equal(booking.discountInr, 210); // 15% of 1398 = 210

  const detailAfter = await getEventDetail("southern-cipher-live-coimbatore-2026");
  const tierAfter = detailAfter?.event.tiers.find((t) => t.id === "tier-indie-ga");
  assert.equal(tierAfter?.remainingQuota, initialQuota - 2);

  const cancelled = await cancelDemoBooking(booking.id);
  assert.equal(cancelled.status, "CANCELLED");

  const detailRestored = await getEventDetail("southern-cipher-live-coimbatore-2026");
  const tierRestored = detailRestored?.event.tiers.find((t) => t.id === "tier-indie-ga");
  assert.equal(tierRestored?.remainingQuota, initialQuota);
});

test("getVenueDetail resolves venue timings and upcoming events", async () => {
  const v = await getVenueDetail("skyline-amphitheatre-bengaluru");
  assert.ok(v);
  assert.equal(v.venue.timings.length, 7);
  assert.ok(v.upcomingEvents.length >= 1);
});

import { assertAuthorized } from "../src/lib/auth.ts";
import { signInUser, signUpUser } from "../src/lib/authStore.ts";
import { getMemoryStore } from "../src/lib/memoryStore.ts";
import { syncOfflineScans, upsertOrganiserEvent, verifyAndCheckInTicket } from "../src/lib/operationsStore.ts";
import { createInventoryHold, createRefundRequest, decideRefundRequest } from "../src/lib/repository.ts";

test("authentication, RBAC, and tenant isolation block unauthorized scope access", async () => {
  const demoPass = process.env.NIGHTLIFEZ_SANDBOX_DEMO_PASSWORD || "NightlifezDemo#2026";
  const orgSession = await signInUser({ email: "organiser@nightlifez.test", password: demoPass });
  assert.equal(orgSession.user?.email, "organiser@nightlifez.test");

  // Organiser cannot access platform admin
  const adminCheck = assertAuthorized(orgSession, "platform:kpi:read");
  assert.equal(adminCheck.ok, false);
  if (!adminCheck.ok) assert.equal(adminCheck.response.status, 403);

  // Organiser owns org-nightlifez-originals, not org-coastal-pending
  const ownOrgCheck = assertAuthorized(orgSession, "org:events:write", {
    organizationId: "org-nightlifez-originals"
  });
  assert.equal(ownOrgCheck.ok, true);

  const foreignOrgCheck = assertAuthorized(orgSession, "org:events:write", {
    organizationId: "org-coastal-pending"
  });
  assert.equal(foreignOrgCheck.ok, false);

  // Staff scoped to evt-solstice-2026 cannot scan evt-harbor-comedy-2026
  const staffSession = await signInUser({ email: "staff@nightlifez.test", password: demoPass });
  const allowedEventScan = assertAuthorized(staffSession, "staff:tickets:scan", {
    eventId: "evt-solstice-2026"
  });
  assert.equal(allowedEventScan.ok, true);
  const crossEventScan = assertAuthorized(staffSession, "staff:tickets:scan", {
    eventId: "evt-harbor-comedy-2026"
  });
  assert.equal(crossEventScan.ok, false);
});

test("inventory holds, idempotency keys, duplicate check-ins, and offline sync conflict detection", async () => {
  const userSession = await signUpUser({
    email: `qa-${Date.now()}@nightlifez.test`,
    password: "StrongPassword#1",
    fullName: "QA Tester"
  });
  assert.ok(userSession.user);

  // Create hold and verify quota decrement + idempotent booking
  const hold = await createInventoryHold(
    {
      eventSlug: "solstice-soundwave-bengaluru-2026",
      tierId: "tier-solstice-ga",
      quantity: 2,
      seatLabels: []
    },
    userSession.user.id
  );
  assert.equal(hold.status, "ACTIVE");

  const idemKey = `idem-${Date.now()}`;
  const b1 = await createDemoBooking(
    {
      eventSlug: "solstice-soundwave-bengaluru-2026",
      attendeeName: "QA Tester",
      attendeeEmail: userSession.user.email ?? "qa@nightlifez.test",
      holdId: hold.id,
      idempotencyKey: idemKey,
      items: [{ tierId: "tier-solstice-ga", quantity: 2 }]
    },
    { userId: userSession.user.id }
  );
  const b2 = await createDemoBooking(
    {
      eventSlug: "solstice-soundwave-bengaluru-2026",
      attendeeName: "QA Tester",
      attendeeEmail: userSession.user.email ?? "qa@nightlifez.test",
      idempotencyKey: idemKey,
      items: [{ tierId: "tier-solstice-ga", quantity: 2 }]
    },
    { userId: userSession.user.id }
  );
  assert.equal(b1.id, b2.id);
  assert.equal(b1.tickets?.length, 2);

  // First check-in succeeds, duplicate check-in fails, offline duplicate reports CONFLICT
  const ticket = b1.tickets![0];
  const scan1 = await verifyAndCheckInTicket(
    {
      eventId: b1.eventId,
      ticketCodeOrToken: ticket.qrToken,
      deviceId: "test-gate-1"
    },
    { id: "usr-checkin-staff", email: "staff@nightlifez.test" }
  );
  assert.equal(scan1.valid, true);
  assert.equal(scan1.result, "VALID");

  const scan2 = await verifyAndCheckInTicket(
    {
      eventId: b1.eventId,
      ticketCodeOrToken: ticket.ticketCode,
      deviceId: "test-gate-1"
    },
    { id: "usr-checkin-staff", email: "staff@nightlifez.test" }
  );
  assert.equal(scan2.valid, false);
  assert.equal(scan2.result, "ALREADY_USED");

  const syncRes = await syncOfflineScans(
    {
      eventId: b1.eventId,
      deviceId: "offline-device-1",
      scans: [
        {
          clientScanId: "off-dup-1",
          ticketCodeOrToken: ticket.ticketCode,
          scannedAt: new Date().toISOString()
        },
        {
          clientScanId: "off-valid-2",
          ticketCodeOrToken: b1.tickets![1].ticketCode,
          scannedAt: new Date().toISOString()
        }
      ]
    },
    { id: "usr-checkin-staff", email: "staff@nightlifez.test" }
  );
  assert.equal(syncRes[0].result, "CONFLICT");
  assert.equal(syncRes[1].result, "VALID");
});

test("refund workflow transitions and organiser event creation produce audit logs", async () => {
  const b = await createDemoBooking({
    eventSlug: "southern-cipher-live-coimbatore-2026",
    attendeeName: "Refund User",
    attendeeEmail: "refund@nightlifez.test",
    items: [{ tierId: "tier-indie-ga", quantity: 1 }]
  });
  const refund = await createRefundRequest(
    { bookingId: b.id, reason: "Unable to attend due to travel change" },
    null
  );
  assert.equal(refund.status, "REQUESTED");

  const approved = await decideRefundRequest(
    refund.id,
    { status: "APPROVED", resolutionNote: "Approved by organiser" },
    { id: "usr-organiser-owner", email: "organiser@nightlifez.test", role: "organiser_owner" }
  );
  assert.equal(approved.status, "APPROVED");

  const processed = await decideRefundRequest(
    refund.id,
    { status: "PROCESSED", resolutionNote: "Sandbox refund settled" },
    { id: "usr-finance-ops", email: "finance@nightlifez.test", role: "finance_ops" }
  );
  assert.equal(processed.status, "PROCESSED");

  const createdEvt = await upsertOrganiserEvent(
    {
      organizationId: "org-nightlifez-originals",
      title: "Midnight Synth Showcase",
      category: "music",
      citySlug: "bengaluru",
      venueSlug: "skyline-amphitheatre-bengaluru",
      startsAt: "2026-12-30T20:00:00+05:30",
      endsAt: "2026-12-30T23:30:00+05:30",
      dateLabel: "Wed, 30 Dec · 8:00 PM",
      summary: "Late night modular synth showcase for QA regression validation.",
      lifecycleStatus: "PUBLISHED",
      tiers: [
        {
          sectionId: "sec-ga",
          name: "GA",
          description: "General Admission",
          priceInr: 799,
          totalQuota: 50,
          maxPerOrder: 4
        }
      ]
    },
    { id: "usr-organiser-owner", email: "organiser@nightlifez.test", role: "organiser_owner" }
  );
  assert.ok(createdEvt.id);
  assert.ok(getMemoryStore().auditLogs.length >= 3);
});
