import { NextResponse } from "next/server";
import { assertAuthorized } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/authStore";
import { listRecentScans, lookupEventTickets } from "@/lib/operationsStore";
import { getEventDetail } from "@/lib/repository";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId") ?? "";
  const q = searchParams.get("q") ?? undefined;

  const detail = await getEventDetail(eventId);
  if (!detail) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const auth = assertAuthorized(session, "staff:tickets:lookup", {
    eventId: detail.event.id,
    organizationId: detail.event.organizationId ?? undefined,
    venueSlug: detail.event.venueSlug
  });
  if (!auth.ok) return auth.response;

  const [tickets, scans] = await Promise.all([
    lookupEventTickets(detail.event.id, q),
    listRecentScans(detail.event.id)
  ]);
  return NextResponse.json({ tickets, scans });
}
