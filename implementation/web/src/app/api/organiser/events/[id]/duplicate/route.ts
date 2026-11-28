import { NextResponse } from "next/server";
import { assertAuthorized } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/authStore";
import { getEventDetail } from "@/lib/repository";
import { duplicateOrganiserEvent } from "@/lib/sellerGuestService";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(request);
  const { id } = await context.params;
  const detail = await getEventDetail(id);
  if (!detail) {
    return NextResponse.json({ error: "Source event not found." }, { status: 404 });
  }

  const auth = assertAuthorized(session, "org:events:write", {
    organizationId: detail.event.organizationId ?? undefined
  });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const event = await duplicateOrganiserEvent(detail.event.id, body, {
      id: session.user!.id,
      email: session.user!.email,
      role: session.roles[0] ?? "organiser_owner"
    });
    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not duplicate event";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
