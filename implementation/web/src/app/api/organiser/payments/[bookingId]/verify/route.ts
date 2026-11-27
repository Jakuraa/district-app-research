import { NextResponse } from "next/server";
import { assertAuthorized } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/authStore";
import { verifyOrganiserUpiPayment } from "@/lib/organiserPaymentService";
import { listBookings } from "@/lib/repository";

export async function POST(
  request: Request,
  context: { params: Promise<{ bookingId: string }> }
) {
  const session = await getSessionFromRequest(request);
  const { bookingId } = await context.params;
  const all = await listBookings();
  const target = all.find((b) => b.id === bookingId);
  if (!target) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const auth = assertAuthorized(session, "org:payments:manage", {
    organizationId: target.organizationId ?? undefined
  });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const booking = await verifyOrganiserUpiPayment(bookingId, body, {
      id: session.user!.id,
      email: session.user!.email,
      role: session.roles[0] ?? "organiser_owner"
    });
    return NextResponse.json({ booking });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not verify payment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
