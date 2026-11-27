import test from "node:test";
import assert from "node:assert/strict";
import { getPool, resetPoolForTests } from "../src/lib/db.ts";
import { createDemoBooking, listCitiesAndEvents } from "../src/lib/repository.ts";
import {
  requestWalletRecoveryChallenge,
  verifyWalletRecoveryChallenge,
  type EmailTransport
} from "../src/lib/walletRecoveryService.ts";

const TEST_DB_URL = process.env.TEST_DATABASE_URL?.trim();

async function createPgGuestBooking(email: string) {
  const { events } = await listCitiesAndEvents({}, { includeNonPublished: true });
  const event = events.find((e) => e.tiers.some((t) => t.remainingQuota >= 1));
  assert.ok(event, "Expected seeded event in PostgreSQL");
  const tier = event.tiers.find((t) => t.remainingQuota >= 1)!;
  return createDemoBooking(
    {
      eventSlug: event.slug,
      attendeeName: "PG Recovery Guest",
      attendeeEmail: email,
      items: [{ tierId: tier.id, quantity: 1 }],
      paymentChannel: "DEMO_SANDBOX",
      idempotencyKey: `pg-recover-${Date.now()}-${Math.random()}`
    },
    { userId: null }
  );
}

test(
  "PostgreSQL wallet recovery: cross-instance persistence, lockout, expiry, invalidation, concurrency, and DB fail-closed",
  { skip: !TEST_DB_URL ? "Set TEST_DATABASE_URL to an isolated test Postgres DB to run" : false },
  async () => {
    const prevDbUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = TEST_DB_URL;
    await resetPoolForTests();

    const pool1 = getPool();
    assert.ok(pool1, "Expected real PostgreSQL pool, not in-memory fallback");

    let capturedCode = "";
    const fakeTransport: EmailTransport = {
      async sendRecoveryEmail({ code }) {
        capturedCode = code;
        return true;
      }
    };

    try {
      const booking = await createPgGuestBooking("pg.recover@nightlifez.test");

      // 1. Request OTP on pool 1, close pool 1, verify on pool 2 (independent serverless instance)
      const req1 = await requestWalletRecoveryChallenge({
        referenceCode: booking.referenceCode,
        attendeeEmail: "pg.recover@nightlifez.test",
        emailTransport: fakeTransport
      });
      assert.equal(req1.ok, true);
      assert.match(capturedCode, /^\d{6}$/);

      await resetPoolForTests();
      const pool2 = getPool();
      assert.ok(pool2 && pool2 !== pool1, "Expected fresh PostgreSQL pool for second instance");

      const ver1 = await verifyWalletRecoveryChallenge({
        referenceCode: booking.referenceCode,
        attendeeEmail: "pg.recover@nightlifez.test",
        verificationCode: capturedCode
      });
      assert.equal(ver1.ok, true);

      // Single-use consumption: reuse must fail
      const reuse = await verifyWalletRecoveryChallenge({
        referenceCode: booking.referenceCode,
        attendeeEmail: "pg.recover@nightlifez.test",
        verificationCode: capturedCode
      });
      assert.equal(reuse.ok, false);

      // 2. Concurrent verification: only 1 of 3 simultaneous calls may succeed
      await requestWalletRecoveryChallenge({
        referenceCode: booking.referenceCode,
        attendeeEmail: "pg.recover@nightlifez.test",
        emailTransport: fakeTransport
      });
      const concurrentCode = capturedCode;
      const concurrentResults = await Promise.all([
        verifyWalletRecoveryChallenge({
          referenceCode: booking.referenceCode,
          attendeeEmail: "pg.recover@nightlifez.test",
          verificationCode: concurrentCode
        }),
        verifyWalletRecoveryChallenge({
          referenceCode: booking.referenceCode,
          attendeeEmail: "pg.recover@nightlifez.test",
          verificationCode: concurrentCode
        }),
        verifyWalletRecoveryChallenge({
          referenceCode: booking.referenceCode,
          attendeeEmail: "pg.recover@nightlifez.test",
          verificationCode: concurrentCode
        })
      ]);
      assert.equal(concurrentResults.filter((r) => r.ok).length, 1);

      // 3. Expired challenge rejected
      await requestWalletRecoveryChallenge({
        referenceCode: booking.referenceCode,
        attendeeEmail: "pg.recover@nightlifez.test",
        emailTransport: fakeTransport,
        ttlMs: -1000
      });
      const expiredRes = await verifyWalletRecoveryChallenge({
        referenceCode: booking.referenceCode,
        attendeeEmail: "pg.recover@nightlifez.test",
        verificationCode: capturedCode
      });
      assert.equal(expiredRes.ok, false);

      // 4. New challenge invalidates previous challenge & 5-attempt lockout
      await requestWalletRecoveryChallenge({
        referenceCode: booking.referenceCode,
        attendeeEmail: "pg.recover@nightlifez.test",
        emailTransport: fakeTransport
      });
      const olderCode = capturedCode;
      await requestWalletRecoveryChallenge({
        referenceCode: booking.referenceCode,
        attendeeEmail: "pg.recover@nightlifez.test",
        emailTransport: fakeTransport
      });
      const newerCode = capturedCode;

      assert.equal(
        (
          await verifyWalletRecoveryChallenge({
            referenceCode: booking.referenceCode,
            attendeeEmail: "pg.recover@nightlifez.test",
            verificationCode: olderCode
          })
        ).ok,
        false
      );

      for (let i = 0; i < 5; i++) {
        await verifyWalletRecoveryChallenge({
          referenceCode: booking.referenceCode,
          attendeeEmail: "pg.recover@nightlifez.test",
          verificationCode: "000000"
        });
      }
      assert.equal(
        (
          await verifyWalletRecoveryChallenge({
            referenceCode: booking.referenceCode,
            attendeeEmail: "pg.recover@nightlifez.test",
            verificationCode: newerCode
          })
        ).ok,
        false
      );

      // 5. Failed email delivery invalidates its challenge
      const failingTransport: EmailTransport = {
        async sendRecoveryEmail() {
          return false;
        }
      };
      const failReq = await requestWalletRecoveryChallenge({
        referenceCode: booking.referenceCode,
        attendeeEmail: "pg.recover@nightlifez.test",
        emailTransport: failingTransport
      });
      assert.equal(failReq.ok, false);
      const activeAfterFail = await pool2.query(
        `SELECT COUNT(*)::int AS cnt FROM wallet_recovery_challenges
         WHERE booking_id = $1 AND consumed_at IS NULL`,
        [booking.id]
      );
      assert.equal(activeAfterFail.rows[0].cnt, 0);

      // 6. Concurrent challenge issuance: advisory lock + partial unique index keep exactly 1 active challenge
      const sentCodes: string[] = [];
      const trackingTransport: EmailTransport = {
        async sendRecoveryEmail({ code }) {
          sentCodes.push(code);
          return true;
        }
      };
      const burst = await Promise.all(
        Array.from({ length: 4 }, () =>
          requestWalletRecoveryChallenge({
            referenceCode: booking.referenceCode,
            attendeeEmail: "pg.recover@nightlifez.test",
            emailTransport: trackingTransport
          })
        )
      );
      assert.equal(burst.every((r) => r.ok), true);
      const activeCountRes = await pool2.query(
        `SELECT COUNT(*)::int AS cnt FROM wallet_recovery_challenges
         WHERE booking_id = $1 AND consumed_at IS NULL`,
        [booking.id]
      );
      assert.equal(activeCountRes.rows[0].cnt, 1);
      // Only one of the 4 issued OTPs (the final committed one) can be consumed
      const verifyBurst = await Promise.all(
        sentCodes.map((code) =>
          verifyWalletRecoveryChallenge({
            referenceCode: booking.referenceCode,
            attendeeEmail: "pg.recover@nightlifez.test",
            verificationCode: code
          })
        )
      );
      assert.equal(verifyBurst.filter((r) => r.ok).length, 1);

      // 7. Database error fails closed on both request and verify
      await resetPoolForTests();
      process.env.DATABASE_URL = "postgres://invalid:invalid@127.0.0.1:1/nonexistent";
      const dbErrReq = await requestWalletRecoveryChallenge({
        referenceCode: booking.referenceCode,
        attendeeEmail: "pg.recover@nightlifez.test",
        emailTransport: fakeTransport
      });
      assert.equal(dbErrReq.ok, false);
      if (!dbErrReq.ok) assert.equal(dbErrReq.status, 503);

      const dbErrRes = await verifyWalletRecoveryChallenge({
        referenceCode: booking.referenceCode,
        attendeeEmail: "pg.recover@nightlifez.test",
        verificationCode: "123456"
      });
      assert.equal(dbErrRes.ok, false);
      if (!dbErrRes.ok) assert.equal(dbErrRes.status, 503);
    } finally {
      await resetPoolForTests();
      if (prevDbUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = prevDbUrl;
    }
  }
);
