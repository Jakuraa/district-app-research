import { NextResponse } from "next/server";
import { assertAuthorized } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/authStore";
import { syncOfflineScans } from "@/lib/operationsStore";
import { getEventDetail } from "@/lib/repository";

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
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

    const results = await syncOfflineScans(
      { ...body, eventId: detail.event.id },
      { id: session.user!.id, email: session.user!.email }
    );
    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Offline scan sync failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
