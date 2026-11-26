import { NextResponse } from "next/server";
import { assertAuthorized } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/authStore";
import { upsertFeatureFlag } from "@/lib/operationsStore";

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  const auth = assertAuthorized(session, "platform:flags:manage");
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const flag = await upsertFeatureFlag(body, {
      id: session.user!.id,
      email: session.user!.email,
      role: session.roles[0] ?? "platform_super_admin"
    });
    return NextResponse.json({ flag });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update feature flag";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
