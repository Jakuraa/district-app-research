import { NextResponse } from "next/server";
import { assertAuthorized } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/authStore";
import {
  createTripListing,
  listOrganiserTrips,
  updateTripBookingByOrganiser
} from "@/lib/communityModulesService";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId") ?? "";
  const auth = assertAuthorized(session, "org:read", { organizationId });
  if (!auth.ok) return auth.response;

  const data = await listOrganiserTrips(organizationId);
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  try {
    const body = await request.json();
    const organizationId = typeof body?.organizationId === "string" ? body.organizationId : "";
    const auth = assertAuthorized(session, "org:events:write", { organizationId });
    if (!auth.ok) return auth.response;

    const trip = await createTripListing(body, {
      id: session.user!.id,
      email: session.user!.email,
      role: session.roles[0] ?? "organiser_owner"
    });
    return NextResponse.json({ trip }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not create trip" },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getSessionFromRequest(request);
  try {
    const body = await request.json();
    const organizationId = typeof body?.organizationId === "string" ? body.organizationId : "";
    const isPaymentAction =
      body?.action === "VERIFY_ADVANCE" ||
      body?.action === "REJECT_ADVANCE" ||
      body?.action === "COLLECT_BALANCE";
    const auth = assertAuthorized(
      session,
      isPaymentAction ? "org:payments:manage" : "org:events:write",
      { organizationId }
    );
    if (!auth.ok) return auth.response;

    const booking = await updateTripBookingByOrganiser(body, {
      id: session.user!.id,
      email: session.user!.email,
      role: session.roles[0] ?? "organiser_owner"
    });
    return NextResponse.json({ booking });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not update trip booking" },
      { status: 400 }
    );
  }
}
