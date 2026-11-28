import assert from "node:assert/strict";
import test from "node:test";
import {
  createMembershipPlan,
  createMembershipRequest,
  createPromoter,
  createTripBookingRequest,
  createTripListing,
  listOrganiserPromoters,
  lookupMembershipAccess,
  recordPromoterPayout,
  submitMembershipUpiClaim,
  submitTripAdvanceUpiClaim,
  updateMembershipByOrganiser,
  updateTripBookingByOrganiser
} from "../src/lib/communityModulesService.ts";
import { upsertOrganiserPaymentProfile } from "../src/lib/organiserPaymentService.ts";
import { createDemoBooking } from "../src/lib/repository.ts";

const ORG_ID = "org-nightlifez-originals";
const ACTOR = { id: "usr-organiser-owner", email: "organiser@nightlifez.test", role: "organiser_owner" };

test("promoter referral tracking computes earned commission and records organiser payout", async () => {
  const promoter = await createPromoter(
    {
      organizationId: ORG_ID,
      name: "Arjun Kapoor",
      email: "arjun@promoter.test",
      referralCode: "ARJUN15",
      commissionPercent: 10,
      commissionFlatInr: 0
    },
    ACTOR
  );

  await createDemoBooking({
    eventSlug: "solstice-soundwave-bengaluru-2026",
    attendeeName: "Referred Guest",
    attendeeEmail: "refguest@nightlifez.test",
    referralCode: "ARJUN15",
    items: [{ tierId: "tier-solstice-ga", quantity: 1 }]
  });

  const { promoters } = await listOrganiserPromoters(ORG_ID);
  const found = promoters.find((p) => p.id === promoter.id);
  assert.ok(found);
  assert.equal(found.referredBookings, 1);
  assert.ok((found.earnedCommissionInr ?? 0) > 0);

  const payout = await recordPromoterPayout(
    {
      promoterId: promoter.id,
      organizationId: ORG_ID,
      amountInr: 100,
      paymentRef: "UTR9988776655"
    },
    ACTOR
  );
  assert.equal(payout.amountInr, 100);
});

test("trips lifecycle: create trip, book with Direct UPI advance, verify, collect balance, board", async () => {
  await upsertOrganiserPaymentProfile(
    ORG_ID,
    {
      upiEnabled: true,
      upiId: "nightlifez@okaxis",
      payeeDisplayName: "NIGHTLIFEZ Originals",
      paymentInstructions: "Pay directly"
    },
    ACTOR
  );

  const trip = await createTripListing(
    {
      organizationId: ORG_ID,
      title: "Coorg Coffee & Music Retreat",
      destination: "Coorg",
      citySlug: "bengaluru",
      departureLabel: "Fri, 18 Dec · 9:00 PM",
      returnLabel: "Sun, 20 Dec · 8:00 PM",
      priceInr: 5000,
      advanceInr: 1500,
      totalSeats: 20,
      pickupPoints: [{ id: "pk_1", label: "Indiranagar Metro", timeLabel: "9:00 PM", address: "Indiranagar" }],
      summary: "2 nights retreat with acoustic sessions."
    },
    ACTOR
  );

  const req = await createTripBookingRequest({
    tripSlug: trip.slug,
    travellerName: "Kavya S",
    travellerEmail: "kavya@nightlifez.test",
    travellerPhone: "+919876500111",
    pickupPointId: "pk_1",
    seats: 2
  });
  assert.equal(req.booking.advanceInr, 3000);
  assert.ok(req.upiUri?.includes("upi://pay"));

  const claimed = await submitTripAdvanceUpiClaim(req.booking.referenceCode, "UTR1234567890");
  assert.equal(claimed.paymentStatus, "AWAITING_VERIFICATION");

  const verified = await updateTripBookingByOrganiser(
    { bookingId: claimed.id, organizationId: ORG_ID, action: "VERIFY_ADVANCE" },
    ACTOR
  );
  assert.equal(verified.paymentStatus, "ADVANCE_PAID");
  assert.equal(verified.balanceInr, 7000);

  const balanced = await updateTripBookingByOrganiser(
    { bookingId: claimed.id, organizationId: ORG_ID, action: "COLLECT_BALANCE" },
    ACTOR
  );
  assert.equal(balanced.paymentStatus, "FULLY_PAID");
  assert.equal(balanced.balanceInr, 0);

  const boarded = await updateTripBookingByOrganiser(
    { bookingId: claimed.id, organizationId: ORG_ID, action: "MARK_BOARDED" },
    ACTOR
  );
  assert.equal(boarded.boarded, true);
});

test("memberships lifecycle: gated invite link locked until organiser verifies UPI and activates", async () => {
  const plan = await createMembershipPlan(
    {
      organizationId: ORG_ID,
      name: "Midnight Circle",
      description: "VIP community access",
      priceInr: 1999,
      durationDays: 90,
      perks: ["Priority entry", "Private drops"],
      privateInviteUrl: "https://chat.whatsapp.com/secret-midnight-circle"
    },
    ACTOR
  );

  const req = await createMembershipRequest({
    planId: plan.id,
    memberName: "Rohan M",
    memberEmail: "rohan@nightlifez.test",
    memberPhone: "+919876500222"
  });
  assert.equal(req.membership.privateInviteUrl, null);

  await submitMembershipUpiClaim(req.membership.referenceCode, "UTR5544332211");

  const beforeActivation = await lookupMembershipAccess(req.membership.referenceCode, "rohan@nightlifez.test");
  assert.equal(beforeActivation?.privateInviteUrl, null);

  await updateMembershipByOrganiser(
    { membershipId: req.membership.id, organizationId: ORG_ID, action: "ACTIVATE" },
    ACTOR
  );

  const afterActivation = await lookupMembershipAccess(req.membership.referenceCode, "rohan@nightlifez.test");
  assert.equal(afterActivation?.status, "ACTIVE");
  assert.equal(afterActivation?.privateInviteUrl, "https://chat.whatsapp.com/secret-midnight-circle");
});
