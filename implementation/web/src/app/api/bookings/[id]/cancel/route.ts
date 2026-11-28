import { NextResponse } from "next/server";
import { hasPermission } from "@nightlifez/shared";
import { getSessionFromRequest } from "@/lib/authStore";
import { cancelDemoBooking, listBookings } from "@/lib/repository";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getSessionFromRequest(request);
    const existing = (await listBookings()).find((b) => b.id === id);
    if (!existing) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }
    if (existing.userId) {
      const isOwner = session.user?.id === existing.userId;
      const isSupport =
        session.user && hasPermission(session.assignments, "platform:bookings:support");
      if (!isOwner && !isSupport) {
        return NextResponse.json({ error: "Forbidden: cannot cancel another user's booking." }, { status: 403 });
      }
    }

    let reason: string | undefined;
    try {
      const body = await request.json();
      if (body && typeof body.reason === "string") reason = body.reason;
    } catch {
      // Optional body
    }

    const booking = await cancelDemoBooking(id, reason);
    return NextResponse.json({ booking });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not cancel booking";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
