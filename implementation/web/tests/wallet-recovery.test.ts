import test from "node:test";
import assert from "node:assert/strict";
import { createDemoBooking, listCitiesAndEvents } from "../src/lib/repository.ts";
import {
  requestWalletRecoveryChallenge,
  resetMemoryRecoveryChallengesForTests,
  verifyWalletRecoveryChallenge,
  type EmailTransport
} from "../src/lib/walletRecoveryService.ts";

async function createSeededGuestBooking(email: string) {
  const { events } = await listCitiesAndEvents({}, { includeNonPublished: true });
  const event = events.find((e) => e.tiers.some((t) => t.remainingQuota >= 1));
  assert.ok(event);
  const tier = event.tiers.find((t) => t.remainingQuota >= 1)!;
  return createDemoBooking(
    {
      eventSlug: event.slug,
      attendeeName: "Recovery Guest",
      attendeeEmail: email,
      items: [{ tierId: tier.id, quantity: 1 }],
      paymentChannel: "DEMO_SANDBOX",
      idempotencyKey: `recover-test-${Date.now()}-${Math.random()}`
    },
    { userId: null }
  );
}

test("wallet recovery: OTP request, successful verification, and reuse rejection", async () => {
  resetMemoryRecoveryChallengesForTests();
  const booking = await createSeededGuestBooking("recover.ok@nightlifez.test");
  let capturedCode = "";
  const fakeTransport: EmailTransport = {
    async sendRecoveryEmail({ code }) {
      capturedCode = code;
      return true;
    }
  };

  const req = await requestWalletRecoveryChallenge({
    referenceCode: booking.referenceCode,
    attendeeEmail: "recover.ok@nightlifez.test",
    emailTransport: fakeTransport
  });
  assert.equal(req.ok, true);
  assert.match(capturedCode, /^\d{6}$/);

  const verified = await verifyWalletRecoveryChallenge({
    referenceCode: booking.referenceCode,
    attendeeEmail: "recover.ok@nightlifez.test",
    verificationCode: capturedCode
  });
  assert.equal(verified.ok, true);
  if (verified.ok) {
    assert.equal(verified.bookingId, booking.id);
  }

  // Reuse of consumed OTP must fail
  const reused = await verifyWalletRecoveryChallenge({
    referenceCode: booking.referenceCode,
    attendeeEmail: "recover.ok@nightlifez.test",
    verificationCode: capturedCode
  });
  assert.equal(reused.ok, false);
});

test("wallet recovery: incorrect OTP, 5 failed attempts lockout, expired OTP, and newer OTP invalidating older OTP", async () => {
  resetMemoryRecoveryChallengesForTests();
  const booking = await createSeededGuestBooking("recover.lock@nightlifez.test");
  let capturedCode = "";
  const fakeTransport: EmailTransport = {
    async sendRecoveryEmail({ code }) {
      capturedCode = code;
      return true;
    }
  };

  // Expired OTP
  await requestWalletRecoveryChallenge({
    referenceCode: booking.referenceCode,
    attendeeEmail: "recover.lock@nightlifez.test",
    emailTransport: fakeTransport,
    ttlMs: -1000
  });
  const expiredRes = await verifyWalletRecoveryChallenge({
    referenceCode: booking.referenceCode,
    attendeeEmail: "recover.lock@nightlifez.test",
    verificationCode: capturedCode
  });
  assert.equal(expiredRes.ok, false);

  // New OTP invalidates older OTP
  await requestWalletRecoveryChallenge({
    referenceCode: booking.referenceCode,
    attendeeEmail: "recover.lock@nightlifez.test",
    emailTransport: fakeTransport
  });
  const firstCode = capturedCode;
  await requestWalletRecoveryChallenge({
    referenceCode: booking.referenceCode,
    attendeeEmail: "recover.lock@nightlifez.test",
    emailTransport: fakeTransport
  });
  const secondCode = capturedCode;
  const oldCodeRes = await verifyWalletRecoveryChallenge({
    referenceCode: booking.referenceCode,
    attendeeEmail: "recover.lock@nightlifez.test",
    verificationCode: firstCode
  });
  assert.equal(oldCodeRes.ok, false);

  // 5 failed attempts followed by rejection even with correct code
  for (let i = 0; i < 5; i++) {
    const bad = await verifyWalletRecoveryChallenge({
      referenceCode: booking.referenceCode,
      attendeeEmail: "recover.lock@nightlifez.test",
      verificationCode: "000000"
    });
    assert.equal(bad.ok, false);
  }
  const afterLockout = await verifyWalletRecoveryChallenge({
    referenceCode: booking.referenceCode,
    attendeeEmail: "recover.lock@nightlifez.test",
    verificationCode: secondCode
  });
  assert.equal(afterLockout.ok, false);
});

test("wallet recovery: fails closed on missing provider credentials, failed email delivery, and missing DB in deployed env", async () => {
  resetMemoryRecoveryChallengesForTests();
  const booking = await createSeededGuestBooking("recover.fail@nightlifez.test");
  const prevResend = process.env.RESEND_API_KEY;
  const prevFrom = process.env.NIGHTLIFEZ_FROM_EMAIL;
  const prevVercel = process.env.VERCEL;
  const prevDb = process.env.DATABASE_URL;

  try {
    delete process.env.RESEND_API_KEY;
    delete process.env.NIGHTLIFEZ_FROM_EMAIL;
    const missingCreds = await requestWalletRecoveryChallenge({
      referenceCode: booking.referenceCode,
      attendeeEmail: "recover.fail@nightlifez.test"
    });
    assert.equal(missingCreds.ok, false);
    if (!missingCreds.ok) assert.equal(missingCreds.status, 503);

    const failingTransport: EmailTransport = {
      async sendRecoveryEmail() {
        return false;
      }
    };
    const failedDelivery = await requestWalletRecoveryChallenge({
      referenceCode: booking.referenceCode,
      attendeeEmail: "recover.fail@nightlifez.test",
      emailTransport: failingTransport
    });
    assert.equal(failedDelivery.ok, false);
    if (!failedDelivery.ok) assert.equal(failedDelivery.status, 502);

    // Deployed environment without DATABASE_URL fails closed during verification
    process.env.VERCEL = "1";
    delete process.env.DATABASE_URL;
    const noDbVerify = await verifyWalletRecoveryChallenge({
      referenceCode: booking.referenceCode,
      attendeeEmail: "recover.fail@nightlifez.test",
      verificationCode: "123456"
    });
    assert.equal(noDbVerify.ok, false);
    if (!noDbVerify.ok) assert.equal(noDbVerify.status, 503);
  } finally {
    if (prevResend === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prevResend;
    if (prevFrom === undefined) delete process.env.NIGHTLIFEZ_FROM_EMAIL;
    else process.env.NIGHTLIFEZ_FROM_EMAIL = prevFrom;
    if (prevVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = prevVercel;
    if (prevDb === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prevDb;
  }
});
