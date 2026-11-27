import { NextResponse } from "next/server";
import { assertAuthorized } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/authStore";
import { getOrganiserPaymentProfile, upsertOrganiserPaymentProfile } from "@/lib/organiserPaymentService";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(request);
  const { id } = await context.params;
  const auth = assertAuthorized(session, "org:payments:manage", { organizationId: id });
  if (!auth.ok) return auth.response;

  const profile = await getOrganiserPaymentProfile(id);
  return NextResponse.json({ profile });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(request);
  const { id } = await context.params;
  const auth = assertAuthorized(session, "org:payments:manage", { organizationId: id });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const profile = await upsertOrganiserPaymentProfile(id, body, {
      id: session.user!.id,
      email: session.user!.email,
      role: session.roles[0] ?? "organiser_owner"
    });
    return NextResponse.json({ profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update payment settings";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
