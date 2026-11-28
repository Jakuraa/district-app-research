import { NextResponse } from "next/server";
import { hasPermission } from "@nightlifez/shared";
import { getSessionFromRequest } from "@/lib/authStore";
import { decideRefundRequest, listRefundRequests } from "@/lib/repository";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(request);
  if (!session.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const { id } = await context.params;
  const refunds = await listRefundRequests();
  const target = refunds.find((r) => r.id === id);
  if (!target) {
    return NextResponse.json({ error: "Refund request not found." }, { status: 404 });
  }

  const allowedPlatform = hasPermission(session.assignments, "platform:refunds:operate");
  const allowedOrg = hasPermission(session.assignments, "org:refunds:decide", {
    organizationId: target.organizationId
  });
  if (!allowedPlatform && !allowedOrg) {
    return NextResponse.json({ error: "Forbidden: insufficient refund decision permissions." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const refund = await decideRefundRequest(id, body, {
      id: session.user.id,
      email: session.user.email,
      role: session.roles[0] ?? "support_agent"
    });
    return NextResponse.json({ refund });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update refund request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
