import { NextResponse } from "next/server";
import { assertAuthorized } from "@/lib/auth";
import { getSessionFromRequest, listAuditLogs, listUsersWithRoles } from "@/lib/authStore";
import {
  getPlatformKpis,
  listFeatureFlags,
  listLedgerEntries,
  listNotifications,
  listOrganizations,
  listSettlements,
  listSupportCases
} from "@/lib/operationsStore";
import { listBookings, listCitiesAndEvents, listRefundRequests, listVenues } from "@/lib/repository";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  const auth = assertAuthorized(session, "platform:kpi:read");
  if (!auth.ok) return auth.response;

  const [
    kpis,
    { cities, events },
    organizations,
    venues,
    usersData,
    bookings,
    refunds,
    ledger,
    settlements,
    supportCases,
    featureFlags,
    notifications,
    auditLogs
  ] = await Promise.all([
    getPlatformKpis(),
    listCitiesAndEvents({}, { includeNonPublished: true }),
    listOrganizations(),
    listVenues(),
    listUsersWithRoles(),
    listBookings(),
    listRefundRequests(),
    listLedgerEntries(),
    listSettlements(),
    listSupportCases(),
    listFeatureFlags(),
    listNotifications(),
    listAuditLogs(80)
  ]);

  return NextResponse.json({
    kpis,
    cities,
    events,
    organizations,
    venues,
    users: usersData.users,
    bookings,
    refunds,
    ledger,
    settlements,
    supportCases,
    featureFlags,
    notifications,
    auditLogs
  });
}
