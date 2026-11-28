import { NextResponse } from "next/server";
import { assertAuthorized } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/authStore";
import {
  createPromoter,
  listOrganiserPromoters,
  recordPromoterPayout
} from "@/lib/communityModulesService";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId") ?? "";
  const auth = assertAuthorized(session, "org:read", { organizationId });
  if (!auth.ok) return auth.response;

  const data = await listOrganiserPromoters(organizationId);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  try {
    const body = await request.json();
    const organizationId = typeof body?.organizationId === "string" ? body.organizationId : "";
    const auth = assertAuthorized(session, "org:events:write", { organizationId });
    if (!auth.ok) return auth.response;

    const promoter = await createPromoter(body, {
      id: session.user!.id,
      email: session.user!.email,
      role: session.roles[0] ?? "organiser_owner"
    });
    return NextResponse.json({ promoter }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not create promoter" },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getSessionFromRequest(request);
  try {
    const body = await request.json();
    const organizationId = typeof body?.organizationId === "string" ? body.organizationId : "";
    const auth = assertAuthorized(session, "org:payments:manage", { organizationId });
    if (!auth.ok) return auth.response;

    const payout = await recordPromoterPayout(body, {
      id: session.user!.id,
      email: session.user!.email,
      role: session.roles[0] ?? "organiser_owner"
    });
    return NextResponse.json({ payout }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not record payout" },
      { status: 400 }
    );
  }
}
