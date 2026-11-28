import { NextResponse } from "next/server";
import { assertAuthorized, checkRateLimit } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/authStore";
import { verifyAndCheckInTicket } from "@/lib/operationsStore";
import { getEventDetail } from "@/lib/repository";

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (!checkRateLimit(`scan:${session.user.id}`, 120, 60_000)) {
    return NextResponse.json({ error: "Scan rate limit exceeded." }, { status: 429 });
  }
  try {
    const body = await request.json();
    const eventId = String(body?.eventId ?? "");
    const detail = await getEventDetail(eventId);
    if (!detail) {
      return NextResponse.json({ error: "Assigned event not found." }, { status: 404 });
    }
    const auth = assertAuthorized(session, "staff:tickets:scan", {
      eventId: detail.event.id,
      organizationId: detail.event.organizationId ?? undefined,
      venueSlug: detail.event.venueSlug
    });
    if (!auth.ok) return auth.response;

    const result = await verifyAndCheckInTicket(
      { ...body, eventId: detail.event.id },
      { id: session.user.id, email: session.user.email }
    );
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scan verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
