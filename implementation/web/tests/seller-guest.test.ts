import test from "node:test";
import assert from "node:assert/strict";
import { assertAuthorized } from "../src/lib/auth.ts";
import { listAuditLogs, signInUser } from "../src/lib/authStore.ts";
import { getMemoryStore } from "../src/lib/memoryStore.ts";
import { upsertOrganiserEvent } from "../src/lib/operationsStore.ts";
import { cancelDemoBooking, createDemoBooking, getEventDetail } from "../src/lib/repository.ts";
import {
  completeApprovedBookingPayment,
  decideBookingApproval,
  duplicateOrganiserEvent,
  exportEventGuestList,
  getApprovalBookingByToken,
  getPublicStorefront,
  importCsvGuestList,
  issueManualGuestPass,
  replaceEventQuestions,
  updateOrganizationStorefront
} from "../src/lib/sellerGuestService.ts";

const DEMO_PASS = process.env.NIGHTLIFEZ_SANDBOX_DEMO_PASSWORD || "NightlifezDemo#2026";

test("storefront access & privacy: approved org visible, pending org hidden, private/unpublished excluded", async () => {
  const pub = await getPublicStorefront("nightlifez-originals");
  assert.ok(pub);
  assert.equal(pub.organization.isVerified, true);
  assert.equal("legalName" in pub.organization, false);
  assert.equal("contactEmail" in pub.organization, false);
  assert.ok(pub.upcomingEvents.length >= 1);
  assert.ok(pub.upcomingEvents.every((e) => e.lifecycleStatus === "PUBLISHED" && (e.visibility ?? "PUBLIC") === "PUBLIC"));

  // Pending org must NOT be publicly accessible
  const pending = await getPublicStorefront("coastal-sounds-guild");
  assert.equal(pending, null);

  // Unpublished DRAFT and UNLISTED events must NOT appear on public storefront
  const orgSession = await signInUser({ email: "organiser@nightlifez.test", password: DEMO_PASS });
  const draftEvt = await upsertOrganiserEvent(
    {
      organizationId: "org-nightlifez-originals",
      title: "Secret Draft Party",
      category: "parties",
      citySlug: "bengaluru",
      venueSlug: "skyline-amphitheatre-bengaluru",
      startsAt: "2027-02-01T19:00:00+05:30",
      endsAt: "2027-02-01T23:00:00+05:30",
      dateLabel: "Mon, 1 Feb · 7:00 PM",
      summary: "Private draft event that must stay hidden from storefront.",
      lifecycleStatus: "DRAFT",
      visibility: "PUBLIC",
      tiers: [{ sectionId: "sec-ga", name: "GA", description: "General", priceInr: 500, totalQuota: 50, maxPerOrder: 4 }]
    },
    { id: orgSession.user!.id, email: orgSession.user!.email, role: "organiser_owner" }
  );
  const unlistedEvt = await upsertOrganiserEvent(
    {
      organizationId: "org-nightlifez-originals",
      title: "Unlisted VIP Gathering",
      category: "parties",
      citySlug: "bengaluru",
      venueSlug: "skyline-amphitheatre-bengaluru",
      startsAt: "2027-02-02T19:00:00+05:30",
      endsAt: "2027-02-02T23:00:00+05:30",
      dateLabel: "Tue, 2 Feb · 7:00 PM",
      summary: "Unlisted published event accessible only via direct link.",
      lifecycleStatus: "PUBLISHED",
      visibility: "UNLISTED",
      tiers: [{ sectionId: "sec-ga", name: "GA", description: "General", priceInr: 750, totalQuota: 30, maxPerOrder: 2 }]
    },
    { id: orgSession.user!.id, email: orgSession.user!.email, role: "organiser_owner" }
  );

  const pubAfter = await getPublicStorefront("nightlifez-originals");
  assert.ok(pubAfter);
  assert.equal(pubAfter.upcomingEvents.some((e) => e.id === draftEvt.id), false);
  assert.equal(pubAfter.upcomingEvents.some((e) => e.id === unlistedEvt.id), false);

  await updateOrganizationStorefront(
    "org-nightlifez-originals",
    { bioIntro: "Updated storefront bio for QA." },
    { id: orgSession.user!.id, email: orgSession.user!.email, role: "organiser_owner" }
  );
  const logs = await listAuditLogs(20);
  assert.ok(logs.some((l) => l.action === "STOREFRONT_UPDATED" && l.targetId === "org-nightlifez-originals"));
});

test("event duplication (Run it again) copies structure as DRAFT without bookings/tickets/check-ins", async () => {
  const orgSession = await signInUser({ email: "organiser@nightlifez.test", password: DEMO_PASS });
  const actor = { id: orgSession.user!.id, email: orgSession.user!.email, role: "organiser_owner" };

  const source = await upsertOrganiserEvent(
    {
      organizationId: "org-nightlifez-originals",
      title: "Duplication Source Night",
      category: "nightlife",
      citySlug: "bengaluru",
      venueSlug: "skyline-amphitheatre-bengaluru",
      startsAt: "2027-03-01T20:00:00+05:30",
      endsAt: "2027-03-01T23:55:00+05:30",
      dateLabel: "Mon, 1 Mar · 8:00 PM",
      summary: "Source event with custom questions and bookings.",
      lifecycleStatus: "PUBLISHED",
      tiers: [{ sectionId: "sec-ga", name: "Entry", description: "Standard", priceInr: 600, totalQuota: 10, maxPerOrder: 4 }]
    },
    actor
  );

  await replaceEventQuestions(
    source.id,
    {
      questions: [
        { label: "Instagram Handle", fieldType: "SHORT_TEXT", options: [], required: true, sortOrder: 0 }
      ]
    },
    actor
  );

  // Create a booking on source event so remainingQuota drops from 10 to 9
  const bkg = await createDemoBooking({
    eventSlug: source.slug,
    attendeeName: "Existing Guest",
    attendeeEmail: "existing-dup@nightlifez.test",
    items: [{ tierId: source.tiers[0]!.id, quantity: 1 }],
    attendees: [
      {
        tierId: source.tiers[0]!.id,
        fullName: "Existing Guest",
        email: "existing-dup@nightlifez.test",
        answers: {
          [(await getMemoryStore().bookingQuestions.find((q) => q.eventId === source.id)!).id]: "@existing"
        }
      }
    ]
  });
  assert.equal(bkg.tickets?.length, 1);

  const dup = await duplicateOrganiserEvent(
    source.id,
    {
      startsAt: "2027-04-01T20:00:00+05:30",
      endsAt: "2027-04-01T23:55:00+05:30",
      dateLabel: "Thu, 1 Apr · 8:00 PM",
      tierQuotas: [{ sourceTierId: source.tiers[0]!.id, totalQuota: 25 }]
    },
    actor
  );

  assert.equal(dup.lifecycleStatus, "DRAFT");
  assert.equal(dup.clonedFromEventId, source.id);
  assert.equal(dup.tiers[0]!.totalQuota, 25);
  assert.equal(dup.tiers[0]!.remainingQuota, 25);

  const store = getMemoryStore();
  assert.equal(store.bookings.some((b) => b.eventId === dup.id), false);
  assert.equal(store.tickets.some((t) => t.eventId === dup.id), false);
  assert.equal(store.bookingQuestions.filter((q) => q.eventId === dup.id).length, 1);

  const logs = await listAuditLogs(20);
  assert.ok(logs.some((l) => l.action === "EVENT_DUPLICATED" && l.targetId === dup.id));
});

test("custom booking questions validate per-attendee answers and guest approval lifecycle (approve, pay, reject, expire)", async () => {
  const orgSession = await signInUser({ email: "organiser@nightlifez.test", password: DEMO_PASS });
  const actor = { id: orgSession.user!.id, email: orgSession.user!.email, role: "organiser_owner" };

  const evt = await upsertOrganiserEvent(
    {
      organizationId: "org-nightlifez-originals",
      title: "Curated Approval Mixer",
      category: "parties",
      citySlug: "bengaluru",
      venueSlug: "skyline-amphitheatre-bengaluru",
      startsAt: "2027-03-10T19:00:00+05:30",
      endsAt: "2027-03-10T23:00:00+05:30",
      dateLabel: "Wed, 10 Mar · 7:00 PM",
      summary: "Approval-gated mixer with custom attendee questions.",
      lifecycleStatus: "PUBLISHED",
      approvalRequired: true,
      tiers: [{ sectionId: "sec-ga", name: "Pass", description: "Entry", priceInr: 800, totalQuota: 20, maxPerOrder: 4 }]
    },
    actor
  );

  const qs = await replaceEventQuestions(
    evt.id,
    {
      questions: [
        { label: "Age", fieldType: "NUMBER", options: [], required: true, sortOrder: 0 },
        { label: "Meal", fieldType: "DROPDOWN", options: ["Veg", "Non-Veg"], required: true, sortOrder: 1 },
        { label: "Agree to house rules", fieldType: "CHECKBOX", options: [], required: true, sortOrder: 2 }
      ]
    },
    actor
  );

  // Missing/invalid answers must fail on server
  await assert.rejects(
    () =>
      createDemoBooking({
        eventSlug: evt.slug,
        attendeeName: "Bad Request",
        attendeeEmail: "bad@nightlifez.test",
        items: [{ tierId: evt.tiers[0]!.id, quantity: 1 }],
        attendees: [
          {
            tierId: evt.tiers[0]!.id,
            fullName: "Bad Request",
            email: "bad@nightlifez.test",
            answers: { [qs[0]!.id]: "not-a-number", [qs[1]!.id]: "InvalidOption", [qs[2]!.id]: false }
          }
        ]
      }),
    /must be a valid number/i
  );

  // Valid request enters PENDING_APPROVAL with 0 tickets and 0 quota decrement
  const req1 = await createDemoBooking({
    eventSlug: evt.slug,
    attendeeName: "Aarav Mehta",
    attendeeEmail: "aarav@nightlifez.test",
    items: [{ tierId: evt.tiers[0]!.id, quantity: 1 }],
    attendees: [
      {
        tierId: evt.tiers[0]!.id,
        fullName: "Aarav Mehta",
        email: "aarav@nightlifez.test",
        answers: { [qs[0]!.id]: 26, [qs[1]!.id]: "Veg", [qs[2]!.id]: true }
      }
    ]
  });
  assert.equal(req1.status, "PENDING_APPROVAL");
  assert.equal(req1.tickets?.length ?? 0, 0);
  assert.equal((await getEventDetail(evt.id))?.event.tiers[0]!.remainingQuota, 20);

  // Approve -> generates expiring token -> complete payment -> issues ticket & decrements quota
  const approved = await decideBookingApproval(req1.id, { decision: "APPROVE", expiresInHours: 24 }, actor);
  assert.equal(approved.status, "APPROVED_AWAITING_PAYMENT");
  assert.ok(approved.approvalToken);
  assert.ok(approved.approvedAt);

  const paid = await completeApprovedBookingPayment(approved.approvalToken!);
  assert.equal(paid.status, "CONFIRMED_DEMO");
  assert.equal(paid.tickets?.length, 1);
  assert.equal((await getEventDetail(evt.id))?.event.tiers[0]!.remainingQuota, 19);

  // Reject flow
  const req2 = await createDemoBooking({
    eventSlug: evt.slug,
    attendeeName: "Declined User",
    attendeeEmail: "declined@nightlifez.test",
    items: [{ tierId: evt.tiers[0]!.id, quantity: 1 }],
    attendees: [
      {
        tierId: evt.tiers[0]!.id,
        fullName: "Declined User",
        email: "declined@nightlifez.test",
        answers: { [qs[0]!.id]: 24, [qs[1]!.id]: "Non-Veg", [qs[2]!.id]: true }
      }
    ]
  });
  const rejected = await decideBookingApproval(req2.id, { decision: "REJECT", reason: "Full" }, actor);
  assert.equal(rejected.status, "REJECTED");
  assert.ok(rejected.rejectedAt);

  // Cancel pending approval does not inflate quota
  const req3 = await createDemoBooking({
    eventSlug: evt.slug,
    attendeeName: "Cancel Pending",
    attendeeEmail: "cancelp@nightlifez.test",
    items: [{ tierId: evt.tiers[0]!.id, quantity: 1 }],
    attendees: [
      {
        tierId: evt.tiers[0]!.id,
        fullName: "Cancel Pending",
        email: "cancelp@nightlifez.test",
        answers: { [qs[0]!.id]: 25, [qs[1]!.id]: "Veg", [qs[2]!.id]: true }
      }
    ]
  });
  await cancelDemoBooking(req3.id);
  assert.equal((await getEventDetail(evt.id))?.event.tiers[0]!.remainingQuota, 19);

  // Expired approval flow
  const req4 = await createDemoBooking({
    eventSlug: evt.slug,
    attendeeName: "Expired User",
    attendeeEmail: "expired@nightlifez.test",
    items: [{ tierId: evt.tiers[0]!.id, quantity: 1 }],
    attendees: [
      {
        tierId: evt.tiers[0]!.id,
        fullName: "Expired User",
        email: "expired@nightlifez.test",
        answers: { [qs[0]!.id]: 27, [qs[1]!.id]: "Veg", [qs[2]!.id]: true }
      }
    ]
  });
  const apv4 = await decideBookingApproval(req4.id, { decision: "APPROVE", expiresInHours: 1 }, actor);
  apv4.approvalExpiresAt = new Date(Date.now() - 60_000).toISOString();
  const checkedExpired = await getApprovalBookingByToken(apv4.approvalToken!);
  assert.equal(checkedExpired?.status, "EXPIRED");
  await assert.rejects(() => completeApprovedBookingPayment(apv4.approvalToken!), /expired/i);
});

test("CSV invalid rows, duplicate prevention, manual guest issuance, RBAC isolation, and audit logs", async () => {
  const orgSession = await signInUser({ email: "organiser@nightlifez.test", password: DEMO_PASS });
  const boxSession = await signInUser({ email: "boxoffice@nightlifez.test", password: DEMO_PASS });
  const staffSession = await signInUser({ email: "staff@nightlifez.test", password: DEMO_PASS });

  // RBAC: checkin_staff cannot sell box office or decide approvals or read financials
  assert.equal(assertAuthorized(staffSession, "staff:boxoffice:sell", { eventId: "evt-solstice-2026" }).ok, false);
  assert.equal(assertAuthorized(staffSession, "org:approvals:decide").ok, false);
  assert.equal(assertAuthorized(staffSession, "org:settlements:read").ok, false);

  // RBAC: box_office can sell for assigned event (evt-southern-cipher-2026), blocked on unassigned event (evt-solstice-2026) & financials
  assert.equal(
    assertAuthorized(boxSession, "staff:boxoffice:sell", {
      eventId: "evt-southern-cipher-2026",
      organizationId: "org-nightlifez-originals"
    }).ok,
    true
  );
  assert.equal(
    assertAuthorized(boxSession, "staff:boxoffice:sell", {
      eventId: "evt-solstice-2026",
      organizationId: "org-nightlifez-originals"
    }).ok,
    false
  );
  assert.equal(assertAuthorized(boxSession, "org:settlements:read").ok, false);
  assert.equal(
    assertAuthorized(orgSession, "org:guests:manage", { organizationId: "org-coastal-pending" }).ok,
    false
  );

  const actor = { id: boxSession.user!.id, email: boxSession.user!.email, role: "box_office" };
  const evt = (await getEventDetail("evt-southern-cipher-2026"))!.event;

  // Manual walk-in cash pass succeeds, second pass for same email is blocked
  const manual = await issueManualGuestPass(
    {
      eventId: evt.id,
      tierId: evt.tiers[0]!.id,
      fullName: "Walk In Guest",
      email: "walkin-unique@nightlifez.test",
      guestType: "WALK_IN_CASH"
    },
    actor
  );
  assert.equal(manual.paymentChannel, "ORGANISER_CASH");
  assert.equal(manual.tickets?.length, 1);

  await assert.rejects(
    () =>
      issueManualGuestPass(
        {
          eventId: evt.id,
          tierId: evt.tiers[0]!.id,
          fullName: "Walk In Guest",
          email: "walkin-unique@nightlifez.test",
          guestType: "VIP"
        },
        actor
      ),
    /already holds an active pass/i
  );

  // CSV import: 1 valid, 1 invalid email, 1 duplicate of existing walk-in, 1 in-batch duplicate
  const csv = [
    "name,email,phone,tier,type",
    "Priya Nair,priya-csv@nightlifez.test,9876500099,,VIP",
    "Bad Row,not-an-email,,,",
    "Walk In Dup,walkin-unique@nightlifez.test,,,COMP",
    "Priya Dup,priya-csv@nightlifez.test,,,VIP"
  ].join("\n");

  const importRes = await importCsvGuestList(
    evt.id,
    { csvText: csv, defaultTierId: evt.tiers[0]!.id, defaultGuestType: "COMPLIMENTARY" },
    { id: orgSession.user!.id, email: orgSession.user!.email, role: "organiser_owner" }
  );
  assert.equal(importRes.importedCount, 1);
  assert.equal(importRes.errors.length, 1);
  assert.equal(importRes.skippedDuplicates.length, 2);

  const exported = await exportEventGuestList(evt.id);
  assert.ok(exported.csv.includes("priya-csv@nightlifez.test"));
  assert.ok(exported.csv.includes("walkin-unique@nightlifez.test"));

  const logs = await listAuditLogs(20);
  assert.ok(logs.some((l) => l.action === "MANUAL_GUEST_CREATED"));
  assert.ok(logs.some((l) => l.action === "GUEST_LIST_IMPORTED"));
});
