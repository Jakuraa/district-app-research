import { NextResponse } from "next/server";
import { assertAuthorized } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/authStore";
import {
  createMembershipPlan,
  listOrganiserMemberships,
  updateMembershipByOrganiser
} from "@/lib/communityModulesService";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId") ?? "";
  const auth = assertAuthorized(session, "org:read", { organizationId });
  if (!auth.ok) return auth.response;

  const data = await listOrganiserMemberships(organizationId);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  try {
    const body = await request.json();
    const organizationId = typeof body?.organizationId === "string" ? body.organizationId : "";
    const auth = assertAuthorized(session, "org:events:write", { organizationId });
    if (!auth.ok) return auth.response;

    const plan = await createMembershipPlan(body, {
      id: session.user!.id,
      email: session.user!.email,
      role: session.roles[0] ?? "organiser_owner"
    });
    return NextResponse.json({ plan }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not create membership plan" },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getSessionFromRequest(request);
  try {
    const body = await request.json();
    const organizationId = typeof body?.organizationId === "string" ? body.organizationId : "";
    const perm = body?.action === "ACTIVATE" || body?.action === "REJECT"
      ? "org:payments:manage"
      : "org:events:write";
    const auth = assertAuthorized(session, perm, { organizationId });
    if (!auth.ok) return auth.response;

    const membership = await updateMembershipByOrganiser(body, {
      id: session.user!.id,
      email: session.user!.email,
      role: session.roles[0] ?? "organiser_owner"
    });
    return NextResponse.json({ membership });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not update membership" },
      { status: 400 }
    );
  }
}
