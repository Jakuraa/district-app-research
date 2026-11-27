import test from "node:test";
import assert from "node:assert/strict";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { buildUpiPaymentUri, hasPermission } from "@nightlifez/shared";
import { getMemoryStore } from "../src/lib/memoryStore.ts";
import {
  createUpiClaimToken,
  createWalletAccessToken,
  expireStaleUpiBookings,
  getClaimTokenSecret,
  getPublicOrganiserPaymentInfo,
  listOrganiserPaymentVerifications,
  submitAttendeeUpiClaim,
  upsertOrganiserPaymentProfile,
  verifyOrganiserUpiPayment,
  verifyUpiClaimToken,
  verifyWalletAccessToken
} from "../src/lib/organiserPaymentService.ts";
import {
  checkSharedRateLimit,
  getTrustedClientIp,
  resetMemoryRateLimitsForTests
} from "../src/lib/rateLimit.ts";
import { getOrganiserPaymentAdapter, LIVE_GATEWAY_ENABLED } from "../src/lib/paymentAdapter.ts";
import { createDemoBooking, listCitiesAndEvents } from "../src/lib/repository.ts";

test("payment adapter keeps LIVE_GATEWAY disabled and DirectOrganiserUpiAdapter never auto-confirms", async () => {
  assert.equal(LIVE_GATEWAY_ENABLED, false);
  assert.throws(() => getOrganiserPaymentAdapter("LIVE_GATEWAY"), /disabled/i);

  const directAdapter = getOrganiserPaymentAdapter("ORGANISER_UPI");
  assert.equal(directAdapter.supportsAutoConfirm, false);
  const initRes = await directAdapter.initiatePayment({
    amountInr: 1200,
    referenceCode: "NLZ-ADAPTER1",
    upiId: "club@okicici",
    payeeDisplayName: "Club Pulse"
  });
  assert.equal(initRes.state, "PENDING");
  assert.equal(initRes.requiresManualVerification, true);
  assert.ok(initRes.upiUri?.startsWith("upi://pay?"));
});

test("organiser UPI payment flow: zero tickets before approval, claim never auto-confirms, approval issues tickets once, duplicate & mismatch rejected", async () => {
  const store = getMemoryStore();
  const { events } = await listCitiesAndEvents({}, { includeNonPublished: true });
  const event = events.find((e) => e.organizationId && e.tiers.some((t) => t.remainingQuota >= 5));
  assert.ok(event, "Expected seeded event with organizationId and available tier quota");
  const orgId = event.organizationId!;
  const tier = event.tiers.find((t) => t.remainingQuota >= 5)!;
  const quotaBefore = tier.remainingQuota;

  const orgOwnerActor = { id: "usr_org_owner", email: "owner@nightlifez.test", role: "organiser_owner" };

  try {
    // 1. Configure Direct UPI for the organiser
    const savedProfile = await upsertOrganiserPaymentProfile(
      orgId,
      {
        upiEnabled: true,
        upiId: "afterdark.club@okicici",
        payeeDisplayName: "Afterdark Club",
        paymentInstructions: "Pay via UPI and keep UTR handy"
      },
      orgOwnerActor
    );
    assert.equal(savedProfile.upiEnabled, true);
    assert.equal(savedProfile.providerMode, "DIRECT_UPI");

    const publicInfo = await getPublicOrganiserPaymentInfo(orgId);
    assert.equal(publicInfo.upiEnabled, true);
    assert.equal(publicInfo.upiId, "afterdark.club@okicici");

    // Audit log recorded for config change
    assert.ok(
      store.auditLogs.some((a) => a.action === "PAYMENT_PROFILE_UPDATED" && a.targetId === orgId),
      "Expected PAYMENT_PROFILE_UPDATED audit log"
    );

    // 2. Attendee creates Direct UPI booking
    const booking = await createDemoBooking(
      {
        eventSlug: event.slug,
        attendeeName: "Priya Sharma",
        attendeeEmail: "priya.upi@nightlifez.test",
        items: [{ tierId: tier.id, quantity: 2 }],
        paymentChannel: "ORGANISER_UPI",
        idempotencyKey: `upi-test-${Date.now()}`
      },
      { userId: "usr_priya" }
    );

    assert.equal(booking.status, "AWAITING_PAYMENT_VERIFICATION");
    assert.equal(booking.paymentStatus, "PENDING");
    assert.equal(booking.paymentChannel, "ORGANISER_UPI");
    assert.equal(booking.tickets?.length ?? 0, 0, "No tickets may be issued before organiser verification");
    assert.equal(tier.remainingQuota, quotaBefore - 2, "Inventory should be reserved while awaiting UPI");

    // Unauthenticated request on registered user's booking must be rejected
    await assert.rejects(
      () => submitAttendeeUpiClaim(booking.id, { claimedPaid: true }, null),
      /Unauthorized/i
    );

    // Another attendee cannot submit claim for Priya's booking
    await assert.rejects(
      () => submitAttendeeUpiClaim(booking.id, { claimedPaid: true }, "usr_other_attendee"),
      /Forbidden/i
    );

    // 3. Attendee submits "I've Paid" + UTR: must NOT auto-confirm or issue tickets
    const claimed = await submitAttendeeUpiClaim(
      booking.id,
      {
        claimedPaid: true,
        transactionRef: "UTR412900001122",
        expectedAmountInr: booking.totalInr
      },
      "usr_priya"
    );
    assert.equal(claimed.status, "AWAITING_PAYMENT_VERIFICATION");
    assert.equal(claimed.paymentStatus, "PENDING");
    assert.equal(claimed.paymentSubmittedRef, "UTR412900001122");
    assert.equal(claimed.tickets?.length ?? 0, 0, "UTR claim must never auto-issue tickets");

    // 4. Amount mismatch on verification must fail
    await assert.rejects(
      () =>
        verifyOrganiserUpiPayment(
          booking.id,
          { decision: "APPROVE", expectedAmountInr: booking.totalInr + 100 },
          orgOwnerActor
        ),
      /Amount mismatch/i
    );

    // 5. Organiser queue lists the pending booking
    const queue = await listOrganiserPaymentVerifications(orgId);
    assert.ok(queue.some((b) => b.id === booking.id && b.status === "AWAITING_PAYMENT_VERIFICATION"));

    // 6. Organiser approves payment -> booking confirmed & 2 signed QR tickets issued
    const approved = await verifyOrganiserUpiPayment(
      booking.id,
      { decision: "APPROVE", expectedAmountInr: booking.totalInr },
      orgOwnerActor
    );
    assert.equal(approved.status, "CONFIRMED_DEMO");
    assert.equal(approved.paymentStatus, "CONFIRMED");
    assert.equal(approved.paymentVerifiedBy, orgOwnerActor.id);
    assert.equal(approved.tickets?.length, 2);
    assert.ok(approved.tickets?.every((t) => t.qrToken.startsWith("NLZ1.")));

    // Audit log recorded for approval
    assert.ok(
      store.auditLogs.some((a) => a.action === "PAYMENT_VERIFIED_APPROVED" && a.targetId === booking.id),
      "Expected PAYMENT_VERIFIED_APPROVED audit log"
    );

    // 7. Duplicate approval must be rejected and never issue extra tickets
    await assert.rejects(
      () => verifyOrganiserUpiPayment(booking.id, { decision: "APPROVE" }, orgOwnerActor),
      /already|cannot be verified/i
    );
    const totalTicketsForBooking = store.tickets.filter((t) => t.bookingId === booking.id).length;
    assert.equal(totalTicketsForBooking, 2, "Duplicate approval must not create extra tickets");
  } finally {
    // Restore default disabled UPI state so other tests are unaffected
    await upsertOrganiserPaymentProfile(
      orgId,
      {
        upiEnabled: false,
        upiId: null,
        payeeDisplayName: null,
        paymentInstructions: null
      },
      orgOwnerActor
    );
  }
});

test("rejected and expired Direct UPI bookings release reserved inventory exactly once", async () => {
  const store = getMemoryStore();
  const { events } = await listCitiesAndEvents({}, { includeNonPublished: true });
  const event = events.find((e) => e.organizationId && e.tiers.some((t) => t.remainingQuota >= 4));
  assert.ok(event);
  const orgId = event.organizationId!;
  const tier = event.tiers.find((t) => t.remainingQuota >= 4)!;
  const orgOwnerActor = { id: "usr_org_owner", email: "owner@nightlifez.test", role: "organiser_owner" };

  try {
    await upsertOrganiserPaymentProfile(
      orgId,
      { upiEnabled: true, upiId: "venue@ybl", payeeDisplayName: "Venue Co" },
      orgOwnerActor
    );

    const quotaStart = tier.remainingQuota;

    // Booking A: rejected by organiser
    const bookingA = await createDemoBooking(
      {
        eventSlug: event.slug,
        attendeeName: "Rohan Reject",
        attendeeEmail: "rohan@nightlifez.test",
        items: [{ tierId: tier.id, quantity: 1 }],
        paymentChannel: "ORGANISER_UPI",
        idempotencyKey: `upi-reject-${Date.now()}`
      },
      { userId: "usr_rohan" }
    );
    assert.equal(tier.remainingQuota, quotaStart - 1);

    const rejected = await verifyOrganiserUpiPayment(
      bookingA.id,
      { decision: "REJECT", rejectionReason: "No credit seen in bank app" },
      orgOwnerActor
    );
    assert.equal(rejected.status, "REJECTED");
    assert.equal(rejected.paymentStatus, "FAILED");
    assert.equal(rejected.tickets?.length ?? 0, 0);
    assert.equal(tier.remainingQuota, quotaStart, "Rejection must restore reserved quota");

    // Booking B: expires due to unpaid timeout
    const bookingB = await createDemoBooking(
      {
        eventSlug: event.slug,
        attendeeName: "Mira Expire",
        attendeeEmail: "mira@nightlifez.test",
        items: [{ tierId: tier.id, quantity: 2 }],
        paymentChannel: "ORGANISER_UPI",
        idempotencyKey: `upi-expire-${Date.now()}`
      },
      { userId: "usr_mira" }
    );
    assert.equal(tier.remainingQuota, quotaStart - 2);

    // Force expiry timestamp into the past
    const memBookingB = store.bookings.find((b) => b.id === bookingB.id)!;
    memBookingB.paymentExpiresAt = new Date(Date.now() - 60_000).toISOString();

    const expiredCount1 = await expireStaleUpiBookings();
    assert.ok(expiredCount1 >= 1);
    assert.equal(memBookingB.status, "EXPIRED");
    assert.equal(tier.remainingQuota, quotaStart, "Expiry must release reserved quota");

    // Second expiry sweep must not double-release inventory
    const expiredCount2 = await expireStaleUpiBookings();
    assert.equal(expiredCount2, 0);
    assert.equal(tier.remainingQuota, quotaStart, "Repeated expiry sweep must not double-release inventory");
  } finally {
    await upsertOrganiserPaymentProfile(
      orgId,
      { upiEnabled: false, upiId: null, payeeDisplayName: null, paymentInstructions: null },
      orgOwnerActor
    );
  }
});

test("RBAC isolation prevents attendee, checkin_staff, box_office, and cross-org users from managing/verifying payments", () => {
  assert.equal(
    hasPermission([{ role: "attendee", organizationId: null, venueSlug: null, eventId: null }], "org:payments:manage", {
      organizationId: "org_1"
    }),
    false
  );
  assert.equal(
    hasPermission(
      [{ role: "checkin_staff", organizationId: "org_1", venueSlug: null, eventId: "evt_1" }],
      "org:payments:manage",
      { organizationId: "org_1" }
    ),
    false
  );
  assert.equal(
    hasPermission([{ role: "organiser_owner", organizationId: "org_2", venueSlug: null, eventId: null }], "org:payments:manage", {
      organizationId: "org_1"
    }),
    false
  );
  assert.equal(
    hasPermission([{ role: "organiser_owner", organizationId: "org_2", venueSlug: null, eventId: null }], "org:payments:manage", {
      organizationId: "org_2"
    }),
    true
  );
});

test("UPI QR encoding produces a scannable QR whose decoded payload matches the exact UPI URI", async () => {
  const expectedUri = buildUpiPaymentUri({
    upiId: "afterdark.club@okicici",
    payeeName: "Afterdark Club",
    amountInr: 1799,
    referenceCode: "NLZ-QRTEST1"
  });
  const dataUrl = await QRCode.toDataURL(expectedUri, {
    width: 224,
    margin: 2,
    errorCorrectionLevel: "M"
  });
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  const png = PNG.sync.read(Buffer.from(base64, "base64"));
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  assert.ok(decoded, "Expected jsQR to decode generated QR image");
  assert.equal(decoded.data, expectedUri);
});

test("guest UPI payment claims require a valid booking-specific signed claimToken", async () => {
  const { events } = await listCitiesAndEvents({}, { includeNonPublished: true });
  const event = events.find((e) => e.organizationId && e.tiers.some((t) => t.remainingQuota >= 2));
  assert.ok(event);
  const orgId = event.organizationId!;
  const tier = event.tiers.find((t) => t.remainingQuota >= 2)!;
  const orgOwnerActor = { id: "usr_org_owner", email: "owner@nightlifez.test", role: "organiser_owner" };

  try {
    await upsertOrganiserPaymentProfile(
      orgId,
      { upiEnabled: true, upiId: "guest.test@okicici", payeeDisplayName: "Guest Test Club" },
      orgOwnerActor
    );

    const guestBooking = await createDemoBooking(
      {
        eventSlug: event.slug,
        attendeeName: "Guest Buyer",
        attendeeEmail: "guest.buyer@nightlifez.test",
        items: [{ tierId: tier.id, quantity: 1 }],
        paymentChannel: "ORGANISER_UPI",
        idempotencyKey: `upi-guest-${Date.now()}`
      },
      { userId: null }
    );

    // Missing token rejected
    await assert.rejects(
      () => submitAttendeeUpiClaim(guestBooking.id, { claimedPaid: true }, null),
      /Forbidden/i
    );

    // Wrong/tampered token rejected
    await assert.rejects(
      () =>
        submitAttendeeUpiClaim(
          guestBooking.id,
          { claimedPaid: true, claimToken: "tampered-token-123456" },
          null
        ),
      /Forbidden/i
    );

    // Valid booking-specific claimToken succeeds
    const validToken = createUpiClaimToken(guestBooking.id, guestBooking.referenceCode);
    const claimed = await submitAttendeeUpiClaim(
      guestBooking.id,
      { claimedPaid: true, transactionRef: "UTR99887766", claimToken: validToken },
      null
    );
    assert.equal(claimed.paymentSubmittedRef, "UTR99887766");
    assert.equal(claimed.status, "AWAITING_PAYMENT_VERIFICATION");
  } finally {
    await upsertOrganiserPaymentProfile(
      orgId,
      { upiEnabled: false, upiId: null, payeeDisplayName: null, paymentInstructions: null },
      orgOwnerActor
    );
  }
});

test("getClaimTokenSecret fails closed in production when missing or weak, and tokens are purpose/booking bound", () => {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevVercelEnv = process.env.VERCEL_ENV;
  const prevSecret = process.env.NIGHTLIFEZ_AUTH_SECRET;
  try {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    (process.env as Record<string, string | undefined>).VERCEL_ENV = "production";
    delete process.env.NIGHTLIFEZ_AUTH_SECRET;
    assert.throws(() => getClaimTokenSecret(), /required in deployed/i);

    process.env.NIGHTLIFEZ_AUTH_SECRET = "too-short-secret";
    assert.throws(() => getClaimTokenSecret(), /at least 32 bytes/i);

    process.env.NIGHTLIFEZ_AUTH_SECRET = "0123456789abcdef0123456789abcdef";
    assert.equal(getClaimTokenSecret(), "0123456789abcdef0123456789abcdef");

    // Purpose & cross-booking isolation
    const claimTok = createUpiClaimToken("bkg_1", "NLZ-111");
    assert.equal(verifyUpiClaimToken(claimTok, "bkg_1", "NLZ-111"), true);
    assert.equal(verifyUpiClaimToken(claimTok, "bkg_2", "NLZ-111"), false);
    assert.equal(verifyWalletAccessToken(claimTok), null);

    const walletTok = createWalletAccessToken("bkg_1", "NLZ-111");
    const verifiedWallet = verifyWalletAccessToken(walletTok);
    assert.ok(verifiedWallet);
    assert.equal(verifiedWallet.bookingId, "bkg_1");
    assert.equal(verifiedWallet.referenceCode, "NLZ-111");
    assert.ok(verifiedWallet.exp > verifiedWallet.iat);
    assert.equal(verifyWalletAccessToken(`${walletTok}tamper`), null);
    assert.equal(verifyUpiClaimToken(walletTok, "bkg_1", "NLZ-111"), false);

    // Expired wallet token rejected
    const expiredWalletTok = createWalletAccessToken("bkg_1", "NLZ-111", { ttlSeconds: -10 });
    assert.equal(verifyWalletAccessToken(expiredWalletTok), null);

    // Revoked / older version wallet token rejected when minVersion bumped
    const v1Tok = createWalletAccessToken("bkg_1", "NLZ-111", { version: 1 });
    assert.equal(verifyWalletAccessToken(v1Tok, { minVersion: 2 }), null);

    // Preview deployment also fails closed when secret is missing
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    (process.env as Record<string, string | undefined>).VERCEL_ENV = "preview";
    delete process.env.NIGHTLIFEZ_AUTH_SECRET;
    assert.throws(() => getClaimTokenSecret(), /required in deployed/i);
  } finally {
    (process.env as Record<string, string | undefined>).NODE_ENV = prevNodeEnv;
    (process.env as Record<string, string | undefined>).VERCEL_ENV = prevVercelEnv;
    if (prevSecret === undefined) delete process.env.NIGHTLIFEZ_AUTH_SECRET;
    else process.env.NIGHTLIFEZ_AUTH_SECRET = prevSecret;
  }
});

test("shared rate limiter enforces concurrent limits, window expiry, and ignores spoofed x-forwarded-for", async () => {
  resetMemoryRateLimitsForTests();
  const reqSpoofed = new Request("http://localhost/api/bookings", {
    headers: {
      "x-forwarded-for": "1.2.3.4",
      "x-vercel-forwarded-for": "203.0.113.9"
    }
  });
  assert.equal(getTrustedClientIp(reqSpoofed), "203.0.113.9");

  const results = await Promise.all(
    Array.from({ length: 5 }, () => checkSharedRateLimit("test:concurrent", 3, 50))
  );
  assert.equal(results.filter(Boolean).length, 3);
  assert.equal(results.filter((r) => !r).length, 2);

  // Wait for window expiry
  await new Promise((r) => setTimeout(r, 65));
  assert.equal(await checkSharedRateLimit("test:concurrent", 3, 50), true);
});
