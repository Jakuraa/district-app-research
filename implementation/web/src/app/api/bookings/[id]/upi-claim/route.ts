import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/authStore";
import { submitAttendeeUpiClaim } from "@/lib/organiserPaymentService";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(request);
  const { id } = await context.params;

  try {
    const body = await request.json();
    const booking = await submitAttendeeUpiClaim(id, body, session.user?.id ?? null);
    return NextResponse.json({ booking });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not submit UPI payment claim";
    const status = message.startsWith("Forbidden:") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
