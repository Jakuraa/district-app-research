import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/authStore";
import { submitAttendeeUpiClaim } from "@/lib/organiserPaymentService";
import { checkSharedRateLimit, getTrustedClientIp } from "@/lib/rateLimit";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const ip = getTrustedClientIp(request);
  const { id } = await context.params;
  const session = await getSessionFromRequest(request);
  const identityKey = session.user?.id ? `user:${session.user.id}` : `ip:${ip}`;
  const allowed = await checkSharedRateLimit(`upi-claim:${identityKey}:${id}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many payment claim attempts. Please wait a minute." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const booking = await submitAttendeeUpiClaim(id, body, session.user?.id ?? null);
    return NextResponse.json({ booking });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not submit UPI payment claim";
    const status = message.startsWith("Unauthorized:")
      ? 401
      : message.startsWith("Forbidden:")
      ? 403
      : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
