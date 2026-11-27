import { NextResponse } from "next/server";
import { assertAuthorized } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/authStore";
import { getEventDetail } from "@/lib/repository";
import { exportEventGuestList } from "@/lib/sellerGuestService";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(request);
  const { id } = await context.params;
  const detail = await getEventDetail(id);
  if (!detail) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const auth = assertAuthorized(session, "org:bookings:read", {
    organizationId: detail.event.organizationId ?? undefined
  });
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "json";
  const exported = await exportEventGuestList(detail.event.id);

  if (format === "csv") {
    return new NextResponse(exported.csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="nightlifez-guests-${detail.event.slug}.csv"`
      }
    });
  }

  return NextResponse.json(exported);
}
