import { NextResponse } from "next/server";
import { assertAuthorized } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/authStore";
import { upsertOrganiserEvent } from "@/lib/operationsStore";

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  try {
    const body = await request.json();
    const orgId = typeof body?.organizationId === "string" ? body.organizationId : "";
    const auth = assertAuthorized(session, "org:events:write", { organizationId: orgId });
    if (!auth.ok) return auth.response;

    if (body?.lifecycleStatus === "PUBLISHED") {
      const pubAuth = assertAuthorized(session, "org:events:publish", { organizationId: orgId });
      if (!pubAuth.ok) return pubAuth.response;
    }

    const event = await upsertOrganiserEvent(body, {
      id: session.user!.id,
      email: session.user!.email,
      role: session.roles[0] ?? "organiser_owner"
    });
    return NextResponse.json({ event }, { status: body?.id ? 200 : 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save event";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
