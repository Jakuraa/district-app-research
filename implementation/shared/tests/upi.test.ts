import test from "node:test";
import assert from "node:assert/strict";
import {
  buildUpiPaymentUri,
  canTransitionBookingStatus,
  hasPermission,
  isValidUpiVpa,
  submitUpiPaymentClaimSchema,
  upsertOrganiserPaymentProfileSchema,
  verifyOrganiserPaymentSchema,
  type AppRole
} from "../src/index.ts";

test("UPI VPA validation accepts valid VPAs and rejects invalid ones", () => {
  assert.equal(isValidUpiVpa("nightlifez.events@okicici"), true);
  assert.equal(isValidUpiVpa("club-99@ybl"), true);
  assert.equal(isValidUpiVpa("merchant_1@paytm"), true);

  assert.equal(isValidUpiVpa(""), false);
  assert.equal(isValidUpiVpa(null), false);
  assert.equal(isValidUpiVpa("no-at-sign"), false);
  assert.equal(isValidUpiVpa("a@b"), false);
  assert.equal(isValidUpiVpa("bad space@okaxis"), false);
  assert.equal(isValidUpiVpa("user@bank.com"), false);
});

test("buildUpiPaymentUri encodes payee, amount, currency INR, and reference", () => {
  const uri = buildUpiPaymentUri({
    upiId: "club@okicici",
    payeeName: "Club Pulse",
    amountInr: 1499,
    referenceCode: "NLZ-TEST123"
  });
  assert.ok(uri.startsWith("upi://pay?"));
  const parsed = new URL(uri);
  assert.equal(parsed.searchParams.get("pa"), "club@okicici");
  assert.equal(parsed.searchParams.get("pn"), "Club Pulse");
  assert.equal(parsed.searchParams.get("am"), "1499.00");
  assert.equal(parsed.searchParams.get("cu"), "INR");
  assert.equal(parsed.searchParams.get("tr"), "NLZ-TEST123");
});

test("upsertOrganiserPaymentProfileSchema enforces VPA and payeeDisplayName when upiEnabled=true", () => {
  const valid = upsertOrganiserPaymentProfileSchema.safeParse({
    upiEnabled: true,
    upiId: "organiser@okhdfcbank",
    payeeDisplayName: "Afterdark Events",
    paymentInstructions: "Include booking ref in remarks"
  });
  assert.equal(valid.success, true);

  const missingVpa = upsertOrganiserPaymentProfileSchema.safeParse({
    upiEnabled: true,
    upiId: "",
    payeeDisplayName: "Afterdark Events"
  });
  assert.equal(missingVpa.success, false);

  const badVpa = upsertOrganiserPaymentProfileSchema.safeParse({
    upiEnabled: true,
    upiId: "not-a-vpa",
    payeeDisplayName: "Afterdark Events"
  });
  assert.equal(badVpa.success, false);

  const disabledOk = upsertOrganiserPaymentProfileSchema.safeParse({
    upiEnabled: false,
    upiId: null,
    payeeDisplayName: null
  });
  assert.equal(disabledOk.success, true);
});

test("submitUpiPaymentClaimSchema and verifyOrganiserPaymentSchema validate inputs", () => {
  assert.equal(
    submitUpiPaymentClaimSchema.safeParse({
      claimedPaid: true,
      transactionRef: "UTR4129837465",
      expectedAmountInr: 1500
    }).success,
    true
  );
  assert.equal(
    submitUpiPaymentClaimSchema.safeParse({
      claimedPaid: false
    }).success,
    false
  );
  assert.equal(
    verifyOrganiserPaymentSchema.safeParse({
      decision: "APPROVE",
      expectedAmountInr: 1500
    }).success,
    true
  );
  assert.equal(
    verifyOrganiserPaymentSchema.safeParse({
      decision: "REJECT",
      rejectionReason: "Credit not received in bank statement"
    }).success,
    true
  );
});

test("booking state machine transitions for AWAITING_PAYMENT_VERIFICATION", () => {
  assert.equal(canTransitionBookingStatus("AWAITING_PAYMENT_VERIFICATION", "CONFIRMED_DEMO"), true);
  assert.equal(canTransitionBookingStatus("AWAITING_PAYMENT_VERIFICATION", "CANCELLED"), true);
  assert.equal(canTransitionBookingStatus("AWAITING_PAYMENT_VERIFICATION", "EXPIRED"), true);
  assert.equal(canTransitionBookingStatus("AWAITING_PAYMENT_VERIFICATION", "PENDING_APPROVAL"), false);
  assert.equal(canTransitionBookingStatus("CONFIRMED_DEMO", "AWAITING_PAYMENT_VERIFICATION"), false);
  assert.equal(canTransitionBookingStatus("EXPIRED", "CONFIRMED_DEMO"), false);
  assert.equal(canTransitionBookingStatus("CANCELLED", "CONFIRMED_DEMO"), false);
});

test("org:payments:manage RBAC is restricted to org owner/admin and super admin for their org", () => {
  const makeAssignments = (role: AppRole, organizationId: string | null) => [
    { role, organizationId, venueSlug: null, eventId: null }
  ];

  assert.equal(hasPermission(makeAssignments("organiser_owner", "org_a"), "org:payments:manage", { organizationId: "org_a" }), true);
  assert.equal(hasPermission(makeAssignments("organiser_admin", "org_a"), "org:payments:manage", { organizationId: "org_a" }), true);
  assert.equal(hasPermission(makeAssignments("organiser_owner", "org_a"), "org:payments:manage", { organizationId: "org_b" }), false);
  assert.equal(hasPermission(makeAssignments("event_manager", "org_a"), "org:payments:manage", { organizationId: "org_a" }), false);
  assert.equal(hasPermission(makeAssignments("box_office", "org_a"), "org:payments:manage", { organizationId: "org_a" }), false);
  assert.equal(hasPermission(makeAssignments("checkin_staff", "org_a"), "org:payments:manage", { organizationId: "org_a" }), false);
  assert.equal(hasPermission(makeAssignments("attendee", null), "org:payments:manage", { organizationId: "org_a" }), false);
  assert.equal(hasPermission(makeAssignments("platform_super_admin", null), "org:payments:manage", { organizationId: "org_b" }), true);
});
