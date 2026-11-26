import { NextResponse } from "next/server";
import { assertAuthorized } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/authStore";
import { createSettlementBatch } from "@/lib/operationsStore";

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  const auth = assertAuthorized(session, "platform:settlements:operate");
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const settlement = await createSettlementBatch(body, {
      id: session.user!.id,
      email: session.user!.email,
      role: session.roles[0] ?? "finance_ops"
    });
    return NextResponse.json({ settlement }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create settlement batch";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
