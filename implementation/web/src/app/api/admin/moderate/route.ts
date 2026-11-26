import { NextResponse } from "next/server";
import { assertAuthorized } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/authStore";
import { moderateTarget } from "@/lib/operationsStore";

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  try {
    const body = await request.json();
    const targetType = String(body?.targetType ?? "");
    const perm =
      targetType === "organization"
        ? "platform:orgs:approve"
        : targetType === "venue"
        ? "platform:venues:approve"
        : targetType === "user"
        ? "platform:users:manage"
        : "platform:events:moderate";

    const auth = assertAuthorized(session, perm);
    if (!auth.ok) return auth.response;

    const result = await moderateTarget(body, {
      id: session.user!.id,
      email: session.user!.email,
      role: session.roles[0] ?? "platform_operations"
    });
    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Moderation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
