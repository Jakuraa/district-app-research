import { NextResponse } from "next/server";
import { hasPermission } from "@nightlifez/shared";
import { getSessionFromRequest } from "@/lib/authStore";
import { createRefundRequest, listRefundRequests } from "@/lib/repository";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (hasPermission(session.assignments, "platform:refunds:operate")) {
    const refunds = await listRefundRequests();
    return NextResponse.json({ refunds });
  }
  const refunds = await listRefundRequests({ userId: session.user.id });
  return NextResponse.json({ refunds });
}

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  try {
    const body = await request.json();
    const refund = await createRefundRequest(body, session.user?.id ?? null);
    return NextResponse.json({ refund }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not submit refund request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
