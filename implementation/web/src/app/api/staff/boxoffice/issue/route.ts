import { NextResponse } from "next/server";
import { assertAuthorized } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/authStore";
import { getEventDetail } from "@/lib/repository";
import { issueManualGuestPass } from "@/lib/sellerGuestService";

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  try {
    const body = await request.json();
    const eventId = String(body?.eventId ?? "");
    const detail = await getEventDetail(eventId);
    if (!detail) {
      return NextResponse.json({ error: "Assigned event not found." }, { status: 404 });
    }

    const auth = assertAuthorized(session, "staff:boxoffice:sell", {
      eventId: detail.event.id,
      organizationId: detail.event.organizationId ?? undefined,
      venueSlug: detail.event.venueSlug
    });
    if (!auth.ok) return auth.response;

    const booking = await issueManualGuestPass(
      { ...body, eventId: detail.event.id },
      {
        id: session.user!.id,
        email: session.user!.email,
        role: session.roles[0] ?? "box_office"
      }
    );
    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not issue box-office pass";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
