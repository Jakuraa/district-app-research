import { NextResponse } from "next/server";
import { hasPermission } from "@nightlifez/shared";
import { checkRateLimit } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/authStore";
import { createUpiClaimToken } from "@/lib/organiserPaymentService";
import { createDemoBooking, listBookings } from "@/lib/repository";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email") ?? undefined;
  const session = await getSessionFromRequest(request);

  if (!email && (!session.user || !hasPermission(session.assignments, "platform:bookings:support"))) {
    if (session.user) {
      const bookings = await listBookings({ userId: session.user.id });
      return NextResponse.json({ bookings });
    }
    return NextResponse.json({ bookings: [] });
  }

  const bookings = await listBookings({ email });
  return NextResponse.json({ bookings });
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  if (!checkRateLimit(`booking:${ip}`, 25, 60_000)) {
    return NextResponse.json({ error: "Too many booking requests. Please wait." }, { status: 429 });
  }
  const session = await getSessionFromRequest(request);
  try {
    const body = await request.json();
    const booking = await createDemoBooking(body, { userId: session.user?.id ?? null });
    const claimToken =
      booking.paymentChannel === "ORGANISER_UPI"
        ? createUpiClaimToken(booking.id, booking.referenceCode)
        : undefined;
    return NextResponse.json({ booking, ...(claimToken ? { claimToken } : {}) }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create demo booking";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
