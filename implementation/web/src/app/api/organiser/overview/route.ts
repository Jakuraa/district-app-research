import { NextResponse } from "next/server";
import { hasPermission } from "@nightlifez/shared";
import { assertAuthorized } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/authStore";
import {
  listLedgerEntries,
  listOrganizations,
  listSettlements,
  listStaffInvitations
} from "@/lib/operationsStore";
import { listBookings, listCitiesAndEvents, listRefundRequests, listVenues } from "@/lib/repository";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  const auth = assertAuthorized(session, "org:read");
  if (!auth.ok) return auth.response;

  const isPlatform = hasPermission(session.assignments, "platform:kpi:read");
  const allOrgs = await listOrganizations();
  const permittedOrgs = isPlatform
    ? allOrgs
    : allOrgs.filter((o) =>
        hasPermission(session.assignments, "org:read", { organizationId: o.id })
      );
  const orgIds = new Set(permittedOrgs.map((o) => o.id));

  const [{ cities, events }, venues, allBookings, allRefunds, invites, ledger, settlements] =
    await Promise.all([
      listCitiesAndEvents({}, { includeNonPublished: true }),
      listVenues(),
      listBookings(),
      listRefundRequests(),
      listStaffInvitations(),
      listLedgerEntries(),
      listSettlements()
    ]);

  const orgEvents = events.filter((e) => e.organizationId && orgIds.has(e.organizationId));
  const orgBookings = allBookings.filter((b) => b.organizationId && orgIds.has(b.organizationId));
  const orgRefunds = allRefunds.filter((r) => r.organizationId && orgIds.has(r.organizationId));
  const orgInvites = invites.filter((i) => i.organizationId && orgIds.has(i.organizationId));
  const orgLedger = ledger.filter((l) => l.organizationId && orgIds.has(l.organizationId));
  const orgSettlements = settlements.filter((s) => orgIds.has(s.organizationId));

  return NextResponse.json({
    organizations: permittedOrgs,
    events: orgEvents,
    venues,
    cities,
    bookings: orgBookings,
    refunds: orgRefunds,
    invitations: orgInvites,
    ledger: orgLedger,
    settlements: orgSettlements
  });
}
