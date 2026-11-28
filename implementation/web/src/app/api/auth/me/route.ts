import { NextResponse } from "next/server";
import { getSessionFromRequest, updateUserProfile } from "@/lib/authStore";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  return NextResponse.json(session);
}

export async function PATCH(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const body = await request.json();
    const updated = await updateUserProfile(session.user.id, body);
    return NextResponse.json({ user: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Profile update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
