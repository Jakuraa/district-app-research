import { NextResponse } from "next/server";
import { assertAuthorized } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/authStore";
import { inviteStaffMember } from "@/lib/operationsStore";

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  try {
    const body = await request.json();
    const auth = assertAuthorized(session, "org:staff:invite", {
      organizationId: typeof body?.organizationId === "string" ? body.organizationId : undefined
    });
    if (!auth.ok) return auth.response;

    const invitation = await inviteStaffMember(body, {
      id: session.user!.id,
      email: session.user!.email,
      role: session.roles[0] ?? "organiser_owner"
    });
    return NextResponse.json({ invitation }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not invite staff";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
