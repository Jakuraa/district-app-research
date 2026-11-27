export const PLATFORM_ROLES = [
  "platform_super_admin",
  "platform_operations",
  "support_agent",
  "finance_ops"
] as const;

export const ORGANISER_ROLES = [
  "organiser_owner",
  "organiser_admin",
  "event_manager"
] as const;

export const VENUE_ROLES = ["venue_manager"] as const;

export const STAFF_ROLES = ["box_office", "checkin_staff"] as const;

export const ALL_ELEVATED_ROLES = [
  ...PLATFORM_ROLES,
  ...ORGANISER_ROLES,
  ...VENUE_ROLES,
  ...STAFF_ROLES
] as const;

export const ALL_ROLES = ["attendee", ...ALL_ELEVATED_ROLES] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];
export type OrganiserRole = (typeof ORGANISER_ROLES)[number];
export type VenueRole = (typeof VENUE_ROLES)[number];
export type StaffRole = (typeof STAFF_ROLES)[number];
export type ElevatedRole = (typeof ALL_ELEVATED_ROLES)[number];
export type AppRole = (typeof ALL_ROLES)[number];

export type Permission =
  | "platform:kpi:read"
  | "platform:events:moderate"
  | "platform:orgs:approve"
  | "platform:venues:approve"
  | "platform:users:manage"
  | "platform:roles:manage"
  | "platform:masterdata:manage"
  | "platform:offers:manage"
  | "platform:bookings:support"
  | "platform:refunds:operate"
  | "platform:ledger:read"
  | "platform:settlements:operate"
  | "platform:support:manage"
  | "platform:flags:manage"
  | "platform:audit:read"
  | "platform:notifications:broadcast"
  | "org:read"
  | "org:write"
  | "org:events:write"
  | "org:events:publish"
  | "org:tiers:write"
  | "org:offers:write"
  | "org:bookings:read"
  | "org:approvals:decide"
  | "org:guests:manage"
  | "org:refunds:decide"
  | "org:staff:invite"
  | "org:reports:read"
  | "org:settlements:read"
  | "venue:read"
  | "venue:write"
  | "venue:sections:write"
  | "venue:staff:manage"
  | "venue:reports:read"
  | "staff:events:read"
  | "staff:tickets:scan"
  | "staff:tickets:lookup"
  | "staff:boxoffice:sell";

export interface RoleScope {
  organizationId?: string | null;
  venueSlug?: string | null;
  eventId?: string | null;
}

export interface RoleAssignmentRecord {
  id: string;
  userId: string;
  role: AppRole;
  organizationId: string | null;
  venueSlug: string | null;
  eventId: string | null;
  grantedBy: string | null;
  createdAt: string;
}

export const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  attendee: [],
  platform_super_admin: [
    "platform:kpi:read",
    "platform:events:moderate",
    "platform:orgs:approve",
    "platform:venues:approve",
    "platform:users:manage",
    "platform:roles:manage",
    "platform:masterdata:manage",
    "platform:offers:manage",
    "platform:bookings:support",
    "platform:refunds:operate",
    "platform:ledger:read",
    "platform:settlements:operate",
    "platform:support:manage",
    "platform:flags:manage",
    "platform:audit:read",
    "platform:notifications:broadcast",
    "org:read",
    "org:write",
    "org:events:write",
    "org:events:publish",
    "org:tiers:write",
    "org:offers:write",
    "org:bookings:read",
    "org:approvals:decide",
    "org:guests:manage",
    "org:refunds:decide",
    "org:staff:invite",
    "org:reports:read",
    "org:settlements:read",
    "venue:read",
    "venue:write",
    "venue:sections:write",
    "venue:staff:manage",
    "venue:reports:read",
    "staff:events:read",
    "staff:tickets:scan",
    "staff:tickets:lookup",
    "staff:boxoffice:sell"
  ],
  platform_operations: [
    "platform:kpi:read",
    "platform:events:moderate",
    "platform:orgs:approve",
    "platform:venues:approve",
    "platform:masterdata:manage",
    "platform:offers:manage",
    "platform:bookings:support",
    "platform:support:manage",
    "platform:flags:manage",
    "platform:audit:read",
    "platform:notifications:broadcast"
  ],
  support_agent: [
    "platform:kpi:read",
    "platform:bookings:support",
    "platform:refunds:operate",
    "platform:support:manage",
    "platform:audit:read"
  ],
  finance_ops: [
    "platform:kpi:read",
    "platform:refunds:operate",
    "platform:ledger:read",
    "platform:settlements:operate",
    "platform:audit:read"
  ],
  organiser_owner: [
    "org:read",
    "org:write",
    "org:events:write",
    "org:events:publish",
    "org:tiers:write",
    "org:offers:write",
    "org:bookings:read",
    "org:approvals:decide",
    "org:guests:manage",
    "org:refunds:decide",
    "org:staff:invite",
    "org:reports:read",
    "org:settlements:read",
    "venue:read",
    "staff:events:read",
    "staff:tickets:scan",
    "staff:tickets:lookup",
    "staff:boxoffice:sell"
  ],
  organiser_admin: [
    "org:read",
    "org:write",
    "org:events:write",
    "org:events:publish",
    "org:tiers:write",
    "org:offers:write",
    "org:bookings:read",
    "org:approvals:decide",
    "org:guests:manage",
    "org:refunds:decide",
    "org:staff:invite",
    "org:reports:read",
    "staff:events:read",
    "staff:tickets:scan",
    "staff:tickets:lookup"
  ],
  event_manager: [
    "org:read",
    "org:events:write",
    "org:events:publish",
    "org:tiers:write",
    "org:offers:write",
    "org:bookings:read",
    "org:approvals:decide",
    "org:guests:manage",
    "org:reports:read",
    "staff:events:read",
    "staff:tickets:scan",
    "staff:tickets:lookup"
  ],
  venue_manager: [
    "venue:read",
    "venue:write",
    "venue:sections:write",
    "venue:staff:manage",
    "venue:reports:read",
    "staff:events:read",
    "staff:tickets:lookup"
  ],
  box_office: [
    "staff:events:read",
    "staff:tickets:scan",
    "staff:tickets:lookup",
    "staff:boxoffice:sell"
  ],
  checkin_staff: [
    "staff:events:read",
    "staff:tickets:scan",
    "staff:tickets:lookup"
  ]
};

export function isPlatformRole(role: AppRole): boolean {
  return (PLATFORM_ROLES as readonly string[]).includes(role);
}

export function isOrganiserRole(role: AppRole): boolean {
  return (ORGANISER_ROLES as readonly string[]).includes(role);
}

export function isVenueRole(role: AppRole): boolean {
  return (VENUE_ROLES as readonly string[]).includes(role);
}

export function isStaffRole(role: AppRole): boolean {
  return (STAFF_ROLES as readonly string[]).includes(role);
}

export function assignmentMatchesScope(
  assignment: Pick<RoleAssignmentRecord, "role" | "organizationId" | "venueSlug" | "eventId">,
  scope?: RoleScope
): boolean {
  if (isPlatformRole(assignment.role)) {
    return true;
  }
  if (!scope) {
    return true;
  }
  if (scope.organizationId) {
    if (!assignment.organizationId || assignment.organizationId !== scope.organizationId) {
      return false;
    }
  }
  if (scope.venueSlug) {
    if (assignment.venueSlug && assignment.venueSlug !== scope.venueSlug) {
      return false;
    }
    if (!assignment.venueSlug && !assignment.organizationId) {
      return false;
    }
  }
  if (scope.eventId) {
    // Organization-wide organiser_owner / organiser_admin can manage events in their org if org scope is also checked
    if (assignment.eventId) {
      return assignment.eventId === scope.eventId;
    }
    if (isStaffRole(assignment.role)) {
      return false;
    }
  }
  return true;
}

export function hasPermission(
  assignments: readonly Pick<RoleAssignmentRecord, "role" | "organizationId" | "venueSlug" | "eventId">[],
  permission: Permission,
  scope?: RoleScope
): boolean {
  for (const assignment of assignments) {
    const perms = ROLE_PERMISSIONS[assignment.role];
    if (!perms || !perms.includes(permission)) continue;
    if (assignmentMatchesScope(assignment, scope)) {
      return true;
    }
  }
  return false;
}
