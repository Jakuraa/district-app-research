import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createWalletAccessToken, getClaimTokenSecret } from "@/lib/organiserPaymentService";
import { checkSharedRateLimit, getTrustedClientIp } from "@/lib/rateLimit";
import { listBookings } from "@/lib/repository";

const WALLET_COOKIE_NAME = "nlz_wallet";
const RECOVERY_TTL_MS = 10 * 60 * 1000;

const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer"
};

interface RecoveryRecord {
  codeHash: string;
  expiresAtMs: number;
  bookingId: string;
  referenceCode: string;
}

const recoveryChallenges = new Map<string, RecoveryRecord>();

function hashRecoveryCode(code: string, key: string): string {
  return crypto
    .createHmac("sha256", getClaimTokenSecret())
    .update(`wallet-recover:${key}:${code}`)
    .digest("hex");
}

async function sendRecoveryEmail(toEmail: string, referenceCode: string, code: string): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.NIGHTLIFEZ_FROM_EMAIL?.trim() || "noreply@nightlifez.in";
  if (!resendKey) {
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

export async function POST(request: Request) {
  const ip = getTrustedClientIp(request);
  const ipAllowed = await checkSharedRateLimit(`wallet-recover:ip:${ip}`, 10, 60_000);
  if (!ipAllowed) {
    return NextResponse.json(
      { error: "Too many recovery attempts. Please wait a minute." },
      { status: 429, headers: SECURITY_HEADERS }
    );
  }

  try {
    const body = (await request.json()) as {
      referenceCode?: string;
      attendeeEmail?: string;
      verificationCode?: string;
    };
    const ref = body.referenceCode?.trim().toUpperCase();
    const email = body.attendeeEmail?.trim().toLowerCase();
    if (!ref || !email) {
      return NextResponse.json(
        { error: "Reference code and attendee email are required." },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const emailAllowed = await checkSharedRateLimit(`wallet-recover:email:${email}`, 5, 60_000);
    if (!emailAllowed) {
      return NextResponse.json(
        { error: "Too many recovery attempts for this email. Please wait." },
        { status: 429, headers: SECURITY_HEADERS }
      );
    }

    const challengeKey = `${ref}:${email}`;
    const submittedCode = body.verificationCode?.trim();

    if (!submittedCode) {
      if (!process.env.RESEND_API_KEY?.trim()) {
        return NextResponse.json(
          { error: "Email verification provider is not configured." },
          { status: 503, headers: SECURITY_HEADERS }
        );
      }

      const matches = await listBookings({ email });
      const booking = matches.find((b) => b.referenceCode.toUpperCase() === ref);
      if (booking) {
        const otp = String(crypto.randomInt(100000, 1000000));
        recoveryChallenges.set(challengeKey, {
          codeHash: hashRecoveryCode(otp, challengeKey),
          expiresAtMs: Date.now() + RECOVERY_TTL_MS,
          bookingId: booking.id,
          referenceCode: booking.referenceCode
        });
        const sent = await sendRecoveryEmail(email, booking.referenceCode, otp);
        if (!sent) {
          recoveryChallenges.delete(challengeKey);
          return NextResponse.json(
            { error: "Could not deliver verification email." },
            { status: 502, headers: SECURITY_HEADERS }
          );
        }
      }

      return NextResponse.json(
        { ok: true, message: "If a matching booking exists, a verification code has been sent to your email." },
        { headers: SECURITY_HEADERS }
      );
    }

    const record = recoveryChallenges.get(challengeKey);
    if (!record || record.expiresAtMs <= Date.now()) {
      recoveryChallenges.delete(challengeKey);
      return NextResponse.json(
        { error: "Invalid or expired verification code." },
        { status: 401, headers: SECURITY_HEADERS }
      );
    }

    const expectedHash = hashRecoveryCode(submittedCode, challengeKey);
    const a = Buffer.from(expectedHash, "utf8");
    const b = Buffer.from(record.codeHash, "utf8");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return NextResponse.json(
        { error: "Invalid or expired verification code." },
        { status: 401, headers: SECURITY_HEADERS }
      );
    }

    recoveryChallenges.delete(challengeKey);
    const token = createWalletAccessToken(record.bookingId, record.referenceCode);
    const res = NextResponse.json({ ok: true }, { headers: SECURITY_HEADERS });
    res.cookies.set(WALLET_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 60 * 60
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Could not recover wallet." }, { status: 400, headers: SECURITY_HEADERS });
  }
}
