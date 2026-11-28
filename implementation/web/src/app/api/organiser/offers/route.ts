import { NextResponse } from "next/server";
import { assertAuthorized } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/authStore";
import { upsertEventOffer } from "@/lib/operationsStore";
import { getEventDetail } from "@/lib/repository";

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  try {
    const body = await request.json();
    const detail = await getEventDetail(String(body?.eventId ?? ""));
    if (!detail) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }
    const auth = assertAuthorized(session, "org:offers:write", {
      organizationId: detail.event.organizationId ?? undefined
    });
    if (!auth.ok) return auth.response;

    const offer = await upsertEventOffer(body);
    return NextResponse.json({ offer }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create offer";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
