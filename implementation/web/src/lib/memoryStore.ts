import {
  DISCOVERY_CATEGORIES,
  SEED_CITIES,
  SEED_EVENTS,
  SEED_FEATURE_FLAGS,
  SEED_NOTIFICATIONS,
  SEED_ORGANIZATIONS,
  SEED_SUPPORT_CASES,
  SEED_VENUES,
  SYNTHETIC_QA_IDENTITIES,
  type AuditLogEntry,
  type BookingAttendeeRecord,
  type BookingQuestion,
  type BookingRecord,
  type City,
  type FeatureFlag,
  type InventoryHold,
  type LedgerEntry,
  type Organization,
  type OrganiserPaymentProfile,
  type OtpPurpose,
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
  passwordHash: string | null;
}

export interface MemoryOtpChallengeRecord {
  id: string;
  phone: string;
  otpHash: string;
  purpose: OtpPurpose;
  attempts: number;
  maxAttempts: number;
  resendCount: number;
  lastSentAt: string;
  expiresAt: string;
  consumedAt: string | null;
  createdIp: string | null;
  createdAt: string;
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
  organiserPaymentProfiles: OrganiserPaymentProfile[];
  venues: Venue[];
  events: PulseEvent[];
  users: MemoryUserRecord[];
  sessions: MemorySessionRecord[];
  otpChallenges: MemoryOtpChallengeRecord[];
  roleAssignments: RoleAssignmentRecord[];
  staffInvitations: StaffInvitation[];
  holds: InventoryHold[];
  bookings: BookingRecord[];
  bookingQuestions: BookingQuestion[];
  bookingAttendees: BookingAttendeeRecord[];
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

  const users: MemoryUserRecord[] = SYNTHETIC_QA_IDENTITIES.map((qa) => ({
    id: qa.id,
    email: qa.email,
    passwordHash: defaultHash,
    fullName: qa.fullName,
    phone: qa.phone,
    phoneVerifiedAt: "2026-11-26T00:00:00Z",
    preferredCitySlug: qa.preferredCitySlug,
    favoriteCategories: [...qa.favoriteCategories],
    status: "ACTIVE",
    createdAt: "2026-11-26T00:00:00Z"
  }));

  const roleAssignments: RoleAssignmentRecord[] = SYNTHETIC_QA_IDENTITIES.flatMap((qa) =>
    qa.roles.map((r) => ({
      id: r.id,
      userId: qa.id,
      role: r.role,
      organizationId: r.organizationId,
      venueSlug: r.venueSlug,
      eventId: r.eventId,
      grantedBy: "usr-super-admin",
      createdAt: "2026-11-26T00:00:00Z"
    }))
  );

  const events = structuredClone(SEED_EVENTS).map((evt) => ({
    ...evt,
    organizationId:
      evt.organizerName === "Harbor Collective"
        ? "org-harbor-collective"
        : "org-nightlifez-originals",
    lifecycleStatus: "PUBLISHED" as const,
    visibility: "PUBLIC" as const,
    approvalRequired: false,
    clonedFromEventId: null
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
    organiserPaymentProfiles: [],
    venues,
    events,
    users,
    sessions: [],
    otpChallenges: [],
    roleAssignments,
    staffInvitations: [],
    holds: [],
    bookings: [],
    bookingQuestions: [],
    bookingAttendees: [],
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
