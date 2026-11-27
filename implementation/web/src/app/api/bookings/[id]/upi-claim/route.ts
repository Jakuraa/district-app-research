import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/authStore";
import { submitAttendeeUpiClaim } from "@/lib/organiserPaymentService";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const { id } = await context.params;
  if (!checkRateLimit(`upi-claim:${ip}:${id}`, 10, 60_000)) {
    return NextResponse.json(
      { error: "Too many payment claim attempts. Please wait a minute." },
      { status: 429 }
    );
  }

  const session = await getSessionFromRequest(request);

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
