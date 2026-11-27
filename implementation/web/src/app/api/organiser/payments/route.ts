import { NextResponse } from "next/server";
import { hasPermission } from "@nightlifez/shared";
import { assertAuthorized } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/authStore";
import { listOrganizations } from "@/lib/operationsStore";
import { listOrganiserPaymentVerifications } from "@/lib/organiserPaymentService";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  const auth = assertAuthorized(session, "org:payments:manage");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const requestedOrgId = searchParams.get("organizationId") ?? undefined;
  const isPlatform = hasPermission(session.assignments, "platform:kpi:read");
  const allOrgs = await listOrganizations();
  const permittedOrgs = isPlatform
    ? allOrgs
    : allOrgs.filter((o) =>
        hasPermission(session.assignments, "org:payments:manage", { organizationId: o.id })
      );

  if (requestedOrgId && !permittedOrgs.some((o) => o.id === requestedOrgId)) {
    return NextResponse.json({ error: "Forbidden: organization payment scope denied." }, { status: 403 });
  }

  const targetOrgs = requestedOrgId
    ? permittedOrgs.filter((o) => o.id === requestedOrgId)
    : permittedOrgs;

  const lists = await Promise.all(targetOrgs.map((o) => listOrganiserPaymentVerifications(o.id)));
  const payments = lists.flat().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return NextResponse.json({ payments });
}
