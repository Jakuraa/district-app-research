import crypto from "node:crypto";
import { ensureSchemaBootstrapped } from "./bootstrapDb.ts";
import { getPool } from "./db.ts";
import { getClaimTokenSecret } from "./organiserPaymentService.ts";
import { listBookings } from "./repository.ts";

const RECOVERY_TTL_MS = 10 * 60 * 1000;
const MAX_RECOVERY_ATTEMPTS = 5;

export interface EmailTransport {
  sendRecoveryEmail(params: {
    toEmail: string;
    referenceCode: string;
    code: string;
  }): Promise<boolean>;
}

export const ResendEmailTransport: EmailTransport = {
  async sendRecoveryEmail({ toEmail, referenceCode, code }) {
    const resendKey = process.env.RESEND_API_KEY?.trim();
    const fromEmail = process.env.NIGHTLIFEZ_FROM_EMAIL?.trim();
    if (!resendKey || !fromEmail) {
      return false;
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject: `NIGHTLIFEZ Wallet Recovery Code (${referenceCode})`,
        text: `Your one-time NIGHTLIFEZ wallet recovery code for booking ${referenceCode} is: ${code}. It expires in 10 minutes.`
      })
    });
    return res.ok;
  }
};

interface MemoryChallenge {
  id: string;
  bookingId: string;
  referenceCode: string;
  attendeeEmail: string;
  codeHash: string;
  attempts: number;
  maxAttempts: number;
  createdAtMs: number;
  expiresAtMs: number;
  consumedAtMs: number | null;
}

const memoryChallenges: MemoryChallenge[] = [];

export function resetMemoryRecoveryChallengesForTests(): void {
  memoryChallenges.length = 0;
}

function hashRecoveryCode(code: string, challengeId: string): string {
  return crypto
    .createHmac("sha256", getClaimTokenSecret())
    .update(`wallet-recover:${challengeId}:${code}`)
    .digest("hex");
}

function isDeployedEnvironment(): boolean {
  return process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
}

export async function requestWalletRecoveryChallenge(params: {
  referenceCode: string;
  attendeeEmail: string;
  emailTransport?: EmailTransport;
  ttlMs?: number;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const ref = params.referenceCode.trim().toUpperCase();
  const email = params.attendeeEmail.trim().toLowerCase();
  const transport = params.emailTransport ?? ResendEmailTransport;

  if (!params.emailTransport && (!process.env.RESEND_API_KEY?.trim() || !process.env.NIGHTLIFEZ_FROM_EMAIL?.trim())) {
    return { ok: false, status: 503, error: "Email verification provider is not configured." };
  }

  const pool = getPool();
  if (!pool && isDeployedEnvironment()) {
    return { ok: false, status: 503, error: "Database is required for wallet recovery." };
  }

  const matches = await listBookings({ email });
  const booking = matches.find((b) => b.referenceCode.toUpperCase() === ref);
  if (!booking) {
    // Anti-enumeration: do not reveal whether booking exists
    return { ok: true };
  }

  const challengeId = `wrc_${crypto.randomUUID()}`;
  const otp = String(crypto.randomInt(100000, 1000000));
  const codeHash = hashRecoveryCode(otp, challengeId);
  const ttlMs = params.ttlMs ?? RECOVERY_TTL_MS;

  if (!pool) {
    const now = Date.now();
    for (const c of memoryChallenges) {
      if (c.bookingId === booking.id && c.attendeeEmail === email && c.consumedAtMs === null) {
        c.consumedAtMs = now;
      }
    }
    memoryChallenges.push({
      id: challengeId,
      bookingId: booking.id,
      referenceCode: booking.referenceCode,
      attendeeEmail: email,
      codeHash,
      attempts: 0,
      maxAttempts: MAX_RECOVERY_ATTEMPTS,
      createdAtMs: now,
      expiresAtMs: now + ttlMs,
      consumedAtMs: null
    });
  } else {
    await ensureSchemaBootstrapped(pool);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE wallet_recovery_challenges
         SET consumed_at = NOW()
         WHERE booking_id = $1 AND attendee_email = $2 AND consumed_at IS NULL`,
        [booking.id, email]
      );
      await client.query(
        `INSERT INTO wallet_recovery_challenges
         (id, booking_id, reference_code, attendee_email, code_hash, attempts, max_attempts, expires_at)
         VALUES ($1, $2, $3, $4, $5, 0, $6, NOW() + ($7 || ' milliseconds')::interval)`,
        [challengeId, booking.id, booking.referenceCode, email, codeHash, MAX_RECOVERY_ATTEMPTS, String(ttlMs)]
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  const sent = await transport.sendRecoveryEmail({
    toEmail: email,
    referenceCode: booking.referenceCode,
    code: otp
  });
  if (!sent) {
    if (!pool) {
      const target = memoryChallenges.find((c) => c.id === challengeId);
      if (target) target.consumedAtMs = Date.now();
    } else {
      await pool.query("UPDATE wallet_recovery_challenges SET consumed_at = NOW() WHERE id = $1", [challengeId]);
    }
    return { ok: false, status: 502, error: "Could not deliver verification email." };
  }

  return { ok: true };
}

export async function verifyWalletRecoveryChallenge(params: {
  referenceCode: string;
  attendeeEmail: string;
  verificationCode: string;
}): Promise<
  | { ok: true; bookingId: string; referenceCode: string }
  | { ok: false; status: number; error: string }
> {
  const ref = params.referenceCode.trim().toUpperCase();
  const email = params.attendeeEmail.trim().toLowerCase();
  const submittedCode = params.verificationCode.trim();
  const pool = getPool();

  if (!pool && isDeployedEnvironment()) {
    return { ok: false, status: 503, error: "Database is required for wallet recovery." };
  }

  if (!pool) {
    const now = Date.now();
    const active = [...memoryChallenges]
      .reverse()
      .find(
        (c) =>
          c.referenceCode.toUpperCase() === ref &&
          c.attendeeEmail === email &&
          c.consumedAtMs === null
      );
    if (!active || active.expiresAtMs <= now || active.attempts >= active.maxAttempts) {
      return { ok: false, status: 401, error: "Invalid or expired verification code." };
    }
    active.attempts += 1;
    const expectedHash = hashRecoveryCode(submittedCode, active.id);
    const a = Buffer.from(expectedHash, "utf8");
    const b = Buffer.from(active.codeHash, "utf8");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { ok: false, status: 401, error: "Invalid or expired verification code." };
    }
    active.consumedAtMs = now;
    return { ok: true, bookingId: active.bookingId, referenceCode: active.referenceCode };
  }

  let client;
  try {
    await ensureSchemaBootstrapped(pool);
    client = await pool.connect();
    await client.query("BEGIN");
    const res = await client.query(
      `SELECT id, booking_id, reference_code, code_hash, attempts, max_attempts, expires_at, consumed_at
       FROM wallet_recovery_challenges
       WHERE UPPER(reference_code) = $1 AND attendee_email = $2 AND consumed_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [ref, email]
    );
    if (res.rowCount === 0) {
      await client.query("ROLLBACK");
      return { ok: false, status: 401, error: "Invalid or expired verification code." };
    }
    const row = res.rows[0];
    const expired = new Date(String(row.expires_at)).getTime() <= Date.now();
    const attempts = Number(row.attempts);
    const maxAttempts = Number(row.max_attempts);
    if (expired || attempts >= maxAttempts) {
      await client.query("UPDATE wallet_recovery_challenges SET consumed_at = NOW() WHERE id = $1", [row.id]);
      await client.query("COMMIT");
      return { ok: false, status: 401, error: "Invalid or expired verification code." };
    }

    await client.query("UPDATE wallet_recovery_challenges SET attempts = attempts + 1 WHERE id = $1", [row.id]);

    const expectedHash = hashRecoveryCode(submittedCode, String(row.id));
    const a = Buffer.from(expectedHash, "utf8");
    const b = Buffer.from(String(row.code_hash), "utf8");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      await client.query("COMMIT");
      return { ok: false, status: 401, error: "Invalid or expired verification code." };
    }

    await client.query("UPDATE wallet_recovery_challenges SET consumed_at = NOW() WHERE id = $1", [row.id]);
    await client.query("COMMIT");
    return {
      ok: true,
      bookingId: String(row.booking_id),
      referenceCode: String(row.reference_code)
    };
  } catch {
    if (client) await client.query("ROLLBACK").catch(() => {});
    return { ok: false, status: 503, error: "Verification temporarily unavailable." };
  } finally {
    if (client) client.release();
  }
}
