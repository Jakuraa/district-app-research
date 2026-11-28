import { NextResponse } from "next/server";
import { hasPermission } from "@nightlifez/shared";
import { getSessionFromRequest } from "@/lib/authStore";
import { createSupportCase, listSupportCases, updateSupportCase } from "@/lib/operationsStore";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (hasPermission(session.assignments, "platform:support:manage")) {
    const cases = await listSupportCases();
    return NextResponse.json({ cases });
  }
  const cases = await listSupportCases(session.user.id);
  return NextResponse.json({ cases });
}

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const body = await request.json();
    const created = await createSupportCase(body, {
      id: session.user.id,
      email: session.user.email
    });
    return NextResponse.json({ supportCase: created }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create support case";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (!hasPermission(session.assignments, "platform:support:manage")) {
    return NextResponse.json({ error: "Forbidden: support agent permission required." }, { status: 403 });
  }
  try {
    const body = await request.json();
    if (!body?.id || typeof body.id !== "string") {
      return NextResponse.json({ error: "Missing case id." }, { status: 400 });
    }
    const updated = await updateSupportCase(body.id, body, {
      id: session.user.id,
      email: session.user.email,
      role: session.roles[0] ?? "support_agent"
    });
    return NextResponse.json({ supportCase: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update support case";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
