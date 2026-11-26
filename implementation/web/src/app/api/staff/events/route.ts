import { NextResponse } from "next/server";
import { assertAuthorized } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/authStore";
import { listRecentScans, listStaffAssignedEvents } from "@/lib/operationsStore";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  const auth = assertAuthorized(session, "staff:events:read");
  if (!auth.ok) return auth.response;

  const events = await listStaffAssignedEvents(session.assignments);
  const eventIds = new Set(events.map((e) => e.id));
  const scans = (await listRecentScans()).filter((s) => eventIds.has(s.eventId));

  return NextResponse.json({ events, recentScans: scans });
}
