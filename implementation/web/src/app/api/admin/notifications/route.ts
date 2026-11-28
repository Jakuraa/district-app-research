import { NextResponse } from "next/server";
import { assertAuthorized } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/authStore";
import { broadcastNotification } from "@/lib/operationsStore";

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  const auth = assertAuthorized(session, "platform:notifications:broadcast");
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const notification = await broadcastNotification(body, {
      id: session.user!.id,
      email: session.user!.email,
      role: session.roles[0] ?? "platform_operations"
    });
    return NextResponse.json({ notification }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not broadcast notification";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
