import { NextResponse } from "next/server";
import { hasPermission } from "@nightlifez/shared";
import { assertAuthorized } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/authStore";
import { listStaffInvitations, updateVenueDetails } from "@/lib/operationsStore";
import { listBookings, listCitiesAndEvents, listVenues } from "@/lib/repository";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  const auth = assertAuthorized(session, "venue:read");
  if (!auth.ok) return auth.response;

  const isPlatform = hasPermission(session.assignments, "platform:kpi:read");
  const [allVenues, { events }, bookings, invites] = await Promise.all([
    listVenues(),
    listCitiesAndEvents({}, { includeNonPublished: true }),
    listBookings(),
    listStaffInvitations()
  ]);

  const permittedVenues = isPlatform
    ? allVenues
    : allVenues.filter((v) =>
        hasPermission(session.assignments, "venue:read", {
          venueSlug: v.slug,
          organizationId: v.organizationId ?? undefined
        })
      );
  const slugs = new Set(permittedVenues.map((v) => v.slug));
  const venueEvents = events.filter((e) => slugs.has(e.venueSlug));
  const venueEventIds = new Set(venueEvents.map((e) => e.id));
  const venueBookings = bookings.filter((b) => venueEventIds.has(b.eventId));

  return NextResponse.json({
    venues: permittedVenues,
    events: venueEvents,
    bookings: venueBookings,
    invitations: invites.filter((i) => i.venueSlug && slugs.has(i.venueSlug))
  });
}

export async function PATCH(request: Request) {
  const session = await getSessionFromRequest(request);
  try {
    const body = await request.json();
    const venueSlug = typeof body?.slug === "string" ? body.slug : "";
    const venues = await listVenues();
    const target = venues.find((v) => v.slug === venueSlug);
    if (!target) {
      return NextResponse.json({ error: "Venue not found." }, { status: 404 });
    }
    const auth = assertAuthorized(session, "venue:write", {
      venueSlug,
      organizationId: target.organizationId ?? undefined
    });
    if (!auth.ok) return auth.response;

    const updated = await updateVenueDetails(body, {
      id: session.user!.id,
      email: session.user!.email,
      role: session.roles[0] ?? "venue_manager"
    });
    return NextResponse.json({ venue: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update venue";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
