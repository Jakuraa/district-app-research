import { NextResponse } from "next/server";
import { hasPermission } from "@nightlifez/shared";
import { assertAuthorized } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/authStore";
import { listOrganizations } from "@/lib/operationsStore";
import { listBookings } from "@/lib/repository";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  const auth = assertAuthorized(session, "org:approvals:decide");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId") ?? undefined;
  const isPlatform = hasPermission(session.assignments, "platform:kpi:read");
  const allOrgs = await listOrganizations();
  const permittedOrgIds = new Set(
    (isPlatform
      ? allOrgs
      : allOrgs.filter((o) => hasPermission(session.assignments, "org:approvals:decide", { organizationId: o.id }))
    ).map((o) => o.id)
  );

  const allBookings = await listBookings({ eventId });
  const approvals = allBookings.filter(
    (b) =>
      b.organizationId &&
      permittedOrgIds.has(b.organizationId) &&
      (b.approvalStatus !== "NOT_REQUIRED" ||
        b.status === "PENDING_APPROVAL" ||
        b.status === "APPROVED_AWAITING_PAYMENT" ||
        b.status === "REJECTED" ||
        b.status === "EXPIRED")
  );

  return NextResponse.json({ approvals });
}
