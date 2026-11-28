import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/authStore";
import { createInventoryHold } from "@/lib/repository";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  if (!checkRateLimit(`holds:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Hold rate limit exceeded." }, { status: 429 });
  }
  const session = await getSessionFromRequest(request);
  try {
    const body = await request.json();
    const hold = await createInventoryHold(body, session.user?.id ?? null);
    return NextResponse.json({ hold }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not hold tickets";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
