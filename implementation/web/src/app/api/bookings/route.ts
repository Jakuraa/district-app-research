import { NextResponse } from "next/server";
import { hasPermission } from "@nightlifez/shared";
import { getSessionFromRequest } from "@/lib/authStore";
import {
  createUpiClaimToken,
  createWalletAccessToken,
  verifyWalletAccessToken
} from "@/lib/organiserPaymentService";
import { checkSharedRateLimit, getTrustedClientIp } from "@/lib/rateLimit";
import { createDemoBooking, listBookings } from "@/lib/repository";

const WALLET_COOKIE_NAME = "nlz_wallet";

const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer"
};

function readCookieValue(request: Request, name: string): string | undefined {
  const raw = request.headers.get("cookie");
  if (!raw) return undefined;
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email") ?? undefined;
  const walletToken =
    readCookieValue(request, WALLET_COOKIE_NAME) ??
    searchParams.get("walletToken") ??
    request.headers.get("x-wallet-token") ??
    undefined;
  const session = await getSessionFromRequest(request);

  if (session.user) {
    if (email && hasPermission(session.assignments, "platform:bookings:support")) {
      const bookings = await listBookings({ email });
      return NextResponse.json({ bookings }, { headers: SECURITY_HEADERS });
    }
    const bookings = await listBookings({ userId: session.user.id });
    return NextResponse.json({ bookings }, { headers: SECURITY_HEADERS });
  }

  if (walletToken) {
    const verified = verifyWalletAccessToken(walletToken);
    if (!verified) {
      return NextResponse.json(
        { error: "Invalid or expired wallet token." },
        { status: 401, headers: SECURITY_HEADERS }
      );
    }
    const all = await listBookings({});
    const booking = all.find((b) => b.id === verified.bookingId);
    if (!booking || booking.referenceCode !== verified.referenceCode) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404, headers: SECURITY_HEADERS });
    }
    return NextResponse.json({ bookings: [booking] }, { headers: SECURITY_HEADERS });
  }

  return NextResponse.json(
    { error: "Authentication or valid booking wallet token required." },
    { status: 401, headers: SECURITY_HEADERS }
  );
}

export async function POST(request: Request) {
  const ip = getTrustedClientIp(request);
  const allowed = await checkSharedRateLimit(`booking:${ip}`, 25, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many booking requests. Please wait." },
      { status: 429, headers: SECURITY_HEADERS }
    );
  }
  const session = await getSessionFromRequest(request);
  try {
    const body = await request.json();
    const booking = await createDemoBooking(body, { userId: session.user?.id ?? null });
    const walletToken = createWalletAccessToken(booking.id, booking.referenceCode);
    const claimToken =
      booking.paymentChannel === "ORGANISER_UPI"
        ? createUpiClaimToken(booking.id, booking.referenceCode)
        : undefined;
    return NextResponse.json(
      { booking, walletToken, ...(claimToken ? { claimToken } : {}) },
      { status: 201, headers: SECURITY_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create demo booking";
    return NextResponse.json({ error: message }, { status: 400, headers: SECURITY_HEADERS });
  }
}
