import { NextResponse } from "next/server";
import { assertAuthorized } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/authStore";
import { getEventDetail } from "@/lib/repository";
import { importCsvGuestList } from "@/lib/sellerGuestService";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(request);
  const { id } = await context.params;
  const detail = await getEventDetail(id);
  if (!detail) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const auth = assertAuthorized(session, "org:guests:manage", {
    organizationId: detail.event.organizationId ?? undefined
  });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const result = await importCsvGuestList(detail.event.id, body, {
      id: session.user!.id,
      email: session.user!.email,
      role: session.roles[0] ?? "organiser_owner"
    });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not import guest list";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
