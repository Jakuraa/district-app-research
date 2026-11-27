import { NextResponse } from "next/server";
import { createWalletAccessToken } from "@/lib/organiserPaymentService";
import { checkSharedRateLimit, getTrustedClientIp } from "@/lib/rateLimit";
import { listBookings } from "@/lib/repository";

const WALLET_COOKIE_NAME = "nlz_wallet";

const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer"
};

export async function POST(request: Request) {
  const ip = getTrustedClientIp(request);
  const allowed = await checkSharedRateLimit(`wallet-recover:${ip}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many recovery attempts. Please wait a minute." },
      { status: 429, headers: SECURITY_HEADERS }
    );
  }

  try {
    const body = (await request.json()) as { referenceCode?: string; attendeeEmail?: string };
    const ref = body.referenceCode?.trim().toUpperCase();
    const email = body.attendeeEmail?.trim().toLowerCase();
    if (!ref || !email) {
      return NextResponse.json(
        { error: "Reference code and attendee email are required." },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const matches = await listBookings({ email });
    const booking = matches.find((b) => b.referenceCode.toUpperCase() === ref);
    if (!booking) {
      return NextResponse.json(
        { error: "No matching booking found." },
        { status: 404, headers: SECURITY_HEADERS }
      );
    }

    const token = createWalletAccessToken(booking.id, booking.referenceCode);
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
