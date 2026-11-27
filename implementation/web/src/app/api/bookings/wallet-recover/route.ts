import { NextResponse } from "next/server";
import { createWalletAccessToken } from "@/lib/organiserPaymentService";
import { checkSharedRateLimit, getTrustedClientIp } from "@/lib/rateLimit";
import {
  requestWalletRecoveryChallenge,
  verifyWalletRecoveryChallenge
} from "@/lib/walletRecoveryService";

const WALLET_COOKIE_NAME = "nlz_wallet";

const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer"
};

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

    const submittedCode = body.verificationCode?.trim();
    if (!submittedCode) {
      const reqRes = await requestWalletRecoveryChallenge({
        referenceCode: ref,
        attendeeEmail: email
      });
      if (!reqRes.ok) {
        return NextResponse.json(
          { error: reqRes.error },
          { status: reqRes.status, headers: SECURITY_HEADERS }
        );
      }
      return NextResponse.json(
        { ok: true, message: "If a matching booking exists, a verification code has been sent to your email." },
        { headers: SECURITY_HEADERS }
      );
    }

    const verifyRes = await verifyWalletRecoveryChallenge({
      referenceCode: ref,
      attendeeEmail: email,
      verificationCode: submittedCode
    });
    if (!verifyRes.ok) {
      return NextResponse.json(
        { error: verifyRes.error },
        { status: verifyRes.status, headers: SECURITY_HEADERS }
      );
    }

    const token = createWalletAccessToken(verifyRes.bookingId, verifyRes.referenceCode);
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
