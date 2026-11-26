import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/authStore";
import { listNotifications } from "@/lib/operationsStore";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  const notifications = await listNotifications(session.user?.id ?? null);
  return NextResponse.json({ notifications });
}
