import {
  DISCOVERY_CATEGORIES,
  SEED_CITIES,
  SEED_EVENTS,
  SEED_FEATURE_FLAGS,
  SEED_NOTIFICATIONS,
  SEED_ORGANIZATIONS,
  SEED_SUPPORT_CASES,
  SEED_VENUES,
  type AuditLogEntry,
  type BookingRecord,
  type City,
  type FeatureFlag,
  type InventoryHold,
  type LedgerEntry,
  type Organization,
  type PlatformNotification,
  type PulseEvent,
  type RefundRequest,
  type RoleAssignmentRecord,
  type SavedItem,
  type SettlementBatch,
  type StaffInvitation,
  type SupportCase,
  type TicketPass,
  type TicketScanLog,
  type UserAccount,
  type Venue
} from "@nightlifez/shared";
import { hashPassword } from "./auth.ts";

export interface MemoryUserRecord extends UserAccount {
  passwordHash: string;
}

export interface MemorySessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
}

export interface MemoryStore {
  cities: City[];
  categories: { key: string; label: string; color: string; isActive: boolean }[];
  organizations: Organization[];
  venues: Venue[];
  events: PulseEvent[];
  users: MemoryUserRecord[];
  sessions: MemorySessionRecord[];
  roleAssignments: RoleAssignmentRecord[];
  staffInvitations: StaffInvitation[];
  holds: InventoryHold[];
  bookings: BookingRecord[];
  idempotencyIndex: Map<string, string>;
  tickets: TicketPass[];
  scanLogs: TicketScanLog[];
  refunds: RefundRequest[];
  ledger: LedgerEntry[];
  settlements: SettlementBatch[];
  supportCases: SupportCase[];
  notifications: PlatformNotification[];
  featureFlags: FeatureFlag[];
  savedItems: SavedItem[];
  auditLogs: AuditLogEntry[];
}

declare global {
  var __nightlifezMemoryStore: MemoryStore | undefined;
}

function createInitialStore(): MemoryStore {
  const demoPassword = process.env.NIGHTLIFEZ_SANDBOX_DEMO_PASSWORD || "NightlifezDemo#2026";
  const defaultHash = hashPassword(demoPassword);

  const users: MemoryUserRecord[] = [
    {
      id: "usr-attendee-demo",
      email: "asha@nightlifez.test",
      passwordHash: defaultHash,
      fullName: "Asha Rao",
      phone: "+91 98765 00001",
      preferredCitySlug: "bengaluru",
      favoriteCategories: ["concerts", "dining"],
      status: "ACTIVE",
      createdAt: "2026-11-26T00:00:00Z"
    },
    {
      id: "usr-super-admin",
      email: "admin@nightlifez.test",
      passwordHash: defaultHash,
      fullName: "Nikhil Verma (Platform Admin)",
      phone: null,
      preferredCitySlug: "bengaluru",
      favoriteCategories: ["concerts", "festivals"],
      status: "ACTIVE",
      createdAt: "2026-11-26T00:00:00Z"
    },
    {
      id: "usr-support-agent",
      email: "support@nightlifez.test",
      passwordHash: defaultHash,
      fullName: "Riya Menon (Support Agent)",
      phone: null,
      preferredCitySlug: "mumbai",
      favoriteCategories: ["comedy"],
      status: "ACTIVE",
      createdAt: "2026-11-26T00:00:00Z"
    },
    {
      id: "usr-finance-ops",
      email: "finance@nightlifez.test",
      passwordHash: defaultHash,
      fullName: "Vikram Kulkarni (Finance Ops)",
      phone: null,
      preferredCitySlug: "mumbai",
      favoriteCategories: ["festivals"],
      status: "ACTIVE",
      createdAt: "2026-11-26T00:00:00Z"
    },
    {
      id: "usr-organiser-owner",
      email: "organiser@nightlifez.test",
      passwordHash: defaultHash,
      fullName: "Meera Nair (Organiser Owner)",
      phone: null,
      preferredCitySlug: "bengaluru",
      favoriteCategories: ["festivals", "music"],
      status: "ACTIVE",
      createdAt: "2026-11-26T00:00:00Z"
    },
    {
      id: "usr-venue-manager",
      email: "venue@nightlifez.test",
      passwordHash: defaultHash,
      fullName: "Arjun Shetty (Venue Manager)",
      phone: null,
      preferredCitySlug: "bengaluru",
      favoriteCategories: ["concerts"],
      status: "ACTIVE",
      createdAt: "2026-11-26T00:00:00Z"
    },
    {
      id: "usr-checkin-staff",
      email: "staff@nightlifez.test",
      passwordHash: defaultHash,
      fullName: "Kiran Das (Gate Staff)",
      phone: null,
      preferredCitySlug: "bengaluru",
      favoriteCategories: ["concerts"],
      status: "ACTIVE",
      createdAt: "2026-11-26T00:00:00Z"
    }
  ];

  const roleAssignments: RoleAssignmentRecord[] = [
    { id: "ra-att-1", userId: "usr-attendee-demo", role: "attendee", organizationId: null, venueSlug: null, eventId: null, grantedBy: "usr-super-admin", createdAt: "2026-11-26T00:00:00Z" },
    { id: "ra-adm-1", userId: "usr-super-admin", role: "platform_super_admin", organizationId: null, venueSlug: null, eventId: null, grantedBy: "usr-super-admin", createdAt: "2026-11-26T00:00:00Z" },
    { id: "ra-sup-1", userId: "usr-support-agent", role: "support_agent", organizationId: null, venueSlug: null, eventId: null, grantedBy: "usr-super-admin", createdAt: "2026-11-26T00:00:00Z" },
    { id: "ra-fin-1", userId: "usr-finance-ops", role: "finance_ops", organizationId: null, venueSlug: null, eventId: null, grantedBy: "usr-super-admin", createdAt: "2026-11-26T00:00:00Z" },
    { id: "ra-org-1", userId: "usr-organiser-owner", role: "organiser_owner", organizationId: "org-nightlifez-originals", venueSlug: null, eventId: null, grantedBy: "usr-super-admin", createdAt: "2026-11-26T00:00:00Z" },
    { id: "ra-org-2", userId: "usr-organiser-owner", role: "organiser_admin", organizationId: "org-harbor-collective", venueSlug: null, eventId: null, grantedBy: "usr-super-admin", createdAt: "2026-11-26T00:00:00Z" },
    { id: "ra-ven-1", userId: "usr-venue-manager", role: "venue_manager", organizationId: "org-nightlifez-originals", venueSlug: "skyline-amphitheatre-bengaluru", eventId: null, grantedBy: "usr-super-admin", createdAt: "2026-11-26T00:00:00Z" },
    { id: "ra-stf-1", userId: "usr-checkin-staff", role: "checkin_staff", organizationId: "org-nightlifez-originals", venueSlug: "skyline-amphitheatre-bengaluru", eventId: "evt-solstice-2026", grantedBy: "usr-super-admin", createdAt: "2026-11-26T00:00:00Z" },
    { id: "ra-stf-2", userId: "usr-checkin-staff", role: "box_office", organizationId: "org-nightlifez-originals", venueSlug: "banyan-courtyard-coimbatore", eventId: "evt-southern-cipher-2026", grantedBy: "usr-super-admin", createdAt: "2026-11-26T00:00:00Z" }
  ];

  const events = structuredClone(SEED_EVENTS).map((evt) => ({
    ...evt,
    organizationId:
      evt.organizerName === "Harbor Collective"
        ? "org-harbor-collective"
        : "org-nightlifez-originals",
    lifecycleStatus: "PUBLISHED" as const
  }));

  const venues = structuredClone(SEED_VENUES).map((v) => ({
    ...v,
    organizationId:
      v.citySlug === "mumbai" ? "org-harbor-collective" : "org-nightlifez-originals",
    approvalStatus: "APPROVED" as const,
    capacityTotal: v.sections.reduce((sum, s) => sum + (s.capacity ?? 250), 0)
  }));

  return {
    cities: structuredClone(SEED_CITIES),
    categories: DISCOVERY_CATEGORIES.map((c) => ({
      key: c.key,
      label: c.label,
      color: c.color,
      isActive: true
    })),
    organizations: structuredClone(SEED_ORGANIZATIONS),
    venues,
    events,
    users,
    sessions: [],
    roleAssignments,
    staffInvitations: [],
    holds: [],
    bookings: [],
    idempotencyIndex: new Map(),
    tickets: [],
    scanLogs: [],
    refunds: [],
    ledger: [],
    settlements: [],
    supportCases: structuredClone(SEED_SUPPORT_CASES),
    notifications: structuredClone(SEED_NOTIFICATIONS),
    featureFlags: structuredClone(SEED_FEATURE_FLAGS),
    savedItems: [],
    auditLogs: []
  };
}

export function getMemoryStore(): MemoryStore {
  if (!globalThis.__nightlifezMemoryStore) {
    globalThis.__nightlifezMemoryStore = createInitialStore();
  }
  return globalThis.__nightlifezMemoryStore;
}
