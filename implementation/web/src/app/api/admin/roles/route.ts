import { NextResponse } from "next/server";
import { assertAuthorized } from "@/lib/auth";
import { assignRoleToUser, getSessionFromRequest } from "@/lib/authStore";

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  const auth = assertAuthorized(session, "platform:roles:manage");
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const assignment = await assignRoleToUser(body, session.user!);
    return NextResponse.json({ assignment }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not assign role";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
