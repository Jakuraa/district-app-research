import type { AppRole, RoleAssignmentRecord } from "./roles.ts";

export type EventCategory =
  | "concerts"
  | "festivals"
  | "comedy"
  | "nightlife"
  | "parties"
  | "music"
  | "sports"
  | "workshops";

export type DiscoveryVertical = "for-you" | "dining" | "movies" | "events" | "play";

export type SalesPhaseStatus =
  | "UPCOMING"
  | "EARLY_ACCESS"
  | "PRE_SALE"
  | "GENERAL_SALE"
  | "FINAL_RELEASE"
  | "SOLD_OUT";

export type EventLifecycleStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "PUBLISHED"
  | "PAUSED"
  | "CANCELLED";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

export type TierAvailability = "AVAILABLE" | "NEARLY_SOLD" | "SOLD_OUT";

export type OfferKind = "PERCENT_CAP" | "FLAT" | "BOGO_TIER";

export type PaymentState = "PENDING" | "CONFIRMED" | "FAILED" | "CANCELLED" | "REFUND_PENDING" | "REFUNDED";

export type BookingStatus = "CONFIRMED_DEMO" | "CANCELLED" | "REFUND_PENDING" | "REFUNDED";

export type TicketStatus = "VALID" | "USED" | "CANCELLED" | "REVOKED" | "EXPIRED";

export type ScanResultCode =
  | "VALID"
  | "ALREADY_USED"
  | "INVALID"
  | "EXPIRED"
  | "REVOKED"
  | "CANCELLED"
  | "WRONG_EVENT"
  | "CONFLICT";

export type RefundStatus =
  | "REQUESTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "PROCESSED";

export type SupportCaseStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export interface City {
  slug: string;
  name: string;
  state: string;
  locality?: string;
  isPopular: boolean;
}

export interface SeatRowSpec {
  rowLabel: string;
  seatCount: number;
  unavailableSeats?: string[];
}

export interface VenueSection {
  id: string;
  name: string;
  zoneLabel: string;
  tierId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  capacity?: number;
  seatRows?: SeatRowSpec[];
}

export interface Venue {
  slug: string;
  name: string;
  citySlug: string;
  address: string;
  headline: string;
  summary: string;
  openStatusLabel: string;
  artworkUrl?: string;
  distanceKm?: number;
  organizationId?: string | null;
  approvalStatus?: ApprovalStatus;
  policies?: string[];
  capacityTotal?: number;
  timings: { day: string; hours: string }[];
  facilities: string[];
  sections: VenueSection[];
}

export interface Organization {
  id: string;
  slug: string;
  name: string;
  legalName: string;
  contactEmail: string;
  citySlug: string;
  approvalStatus: ApprovalStatus;
  rating: number;
  tenureLabel: string;
  createdBy: string | null;
  createdAt: string;
}

export interface SalesTimelineEntry {
  phase: SalesPhaseStatus;
  label: string;
  startsAt: string;
  endsAt?: string;
  state: "completed" | "active" | "upcoming";
}

export interface TicketTier {
  id: string;
  sectionId: string;
  name: string;
  description: string;
  priceInr: number;
  totalQuota: number;
  remainingQuota: number;
  maxPerOrder: number;
  salesPhase: SalesPhaseStatus;
  isActive?: boolean;
}

export interface Offer {
  id: string;
  code: string;
  title: string;
  description: string;
  eligibility?: string;
  kind: OfferKind;
  discountValue: number;
  maxDiscountInr: number | null;
  minOrderInr: number;
  minQty: number;
  expiresAt: string;
  isActive: boolean;
}

export interface ArtistLineupEntry {
  slug?: string;
  name: string;
  role: string;
  artworkUrl?: string;
}

export interface EventSession {
  id: string;
  label: string;
  startsAt: string;
  status: "AVAILABLE" | "FAST_FILLING" | "SOLD_OUT";
}

export interface PulseEvent {
  id: string;
  slug: string;
  title: string;
  category: EventCategory;
  citySlug: string;
  venueSlug: string;
  venueName: string;
  organizationId?: string | null;
  lifecycleStatus?: EventLifecycleStatus;
  moderationNotes?: string | null;
  startsAt: string;
  endsAt: string;
  dateLabel: string;
  artworkUrl?: string;
  ageLimit?: string;
  language?: string;
  durationLabel?: string;
  distanceKm?: number;
  sessions?: EventSession[];
  organizerName: string;
  organizerRating: number;
  organizerTenure: string;
  summary: string;
  highlights: { title: string; body: string }[];
  facilities: string[];
  policies: string[];
  lineup: ArtistLineupEntry[];
  salesTimeline: SalesTimelineEntry[];
  activePhase: SalesPhaseStatus;
  partialReservePercent: number | null;
  isFeatured: boolean;
  accentColor: string;
  tiers: TicketTier[];
  offers: Offer[];
}

export interface Artist {
  slug: string;
  name: string;
  role: string;
  genres: string[];
  citySlug: string;
  followersLabel: string;
  bio: string;
  artworkUrl: string;
  upcomingEventSlugs: string[];
}

export interface Showtime {
  id: string;
  cinemaName: string;
  locality: string;
  citySlug: string;
  dateLabel: string;
  timeLabel: string;
  format: "2D" | "IMAX" | "Dolby Atmos" | "4DX";
  priceInr: number;
  availability: TierAvailability;
}

export interface Movie {
  id: string;
  slug: string;
  title: string;
  language: string;
  genres: string[];
  certificate: string;
  durationLabel: string;
  rating: number;
  releaseLabel: string;
  synopsis: string;
  artworkUrl: string;
  isDemoPartnerInventory: true;
  showtimes: Showtime[];
}

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  citySlug: string;
  locality: string;
  cuisines: string[];
  budgetForTwoInr: number;
  rating: number;
  distanceKm: number;
  offerText: string | null;
  artworkUrl: string;
  highlights: string[];
  availableSlots: string[];
  isDemoPartnerInventory: true;
}

export interface Activity {
  id: string;
  slug: string;
  title: string;
  category: "sports" | "recreation" | "workshops" | "adventure";
  citySlug: string;
  venueName: string;
  locality: string;
  dateLabel: string;
  durationLabel: string;
  priceInr: number;
  rating: number;
  artworkUrl: string;
  rules: string[];
  slots: { id: string; label: string; remaining: number }[];
  isDemoPartnerInventory: true;
}

export interface EditorialCollection {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  badge: string;
  artworkUrl: string;
  eventSlugs: string[];
}

export interface SelectedTierInput {
  tierId: string;
  quantity: number;
}

export interface PriceBreakdown {
  totalQuantity: number;
  subtotalInr: number;
  discountInr: number;
  appliedOfferCode: string | null;
  appliedOfferTitle: string | null;
  convenienceFeeInr: number;
  gstInr: number;
  totalInr: number;
  offerRejectionReason: string | null;
}

export interface BookingItem {
  tierId: string;
  tierName: string;
  quantity: number;
  unitPriceInr: number;
  seatLabels?: string[];
}

export interface TicketPass {
  id: string;
  bookingId: string;
  eventId: string;
  eventTitle?: string;
  tierId: string;
  tierName: string;
  holderName: string;
  holderEmail: string;
  ticketCode: string;
  qrToken: string;
  seatLabel: string | null;
  status: TicketStatus;
  checkedInAt: string | null;
  checkedInBy: string | null;
}

export interface BookingRecord {
  id: string;
  referenceCode: string;
  userId?: string | null;
  organizationId?: string | null;
  attendeeEmail: string;
  attendeeName: string;
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  venueName: string;
  dateLabel: string;
  offerCode: string | null;
  subtotalInr: number;
  discountInr: number;
  convenienceFeeInr: number;
  gstInr: number;
  totalInr: number;
  status: BookingStatus;
  paymentMode: "DEMO_NO_CHARGE";
  paymentStatus?: PaymentState;
  paymentRef?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  items: BookingItem[];
  tickets?: TicketPass[];
}

export interface InventoryHold {
  id: string;
  holdToken: string;
  userId: string | null;
  eventId: string;
  tierId: string;
  quantity: number;
  seatLabels: string[];
  status: "ACTIVE" | "CONVERTED" | "RELEASED" | "EXPIRED";
  expiresAt: string;
  createdAt: string;
}

export interface UserAccount {
  id: string;
  email: string | null;
  fullName: string;
  phone: string | null;
  phoneVerifiedAt?: string | null;
  preferredCitySlug: string;
  favoriteCategories: string[];
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
}

export interface WorkspaceOption {
  key: string;
  role: AppRole;
  label: string;
  path: "/account" | "/admin" | "/organiser" | "/venue-portal" | "/staff";
  organizationId: string | null;
  organizationName?: string | null;
  venueSlug: string | null;
  eventId: string | null;
}

export interface AuthSessionView {
  user: UserAccount | null;
  assignments: RoleAssignmentRecord[];
  roles: AppRole[];
  workspaces?: WorkspaceOption[];
  defaultWorkspacePath?: string;
}

export type OtpPurpose = "LOGIN" | "SIGNUP" | "VERIFY";

export interface OtpRequestResult {
  challengeId: string;
  maskedPhone: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
  message: string;
  previewSyntheticOtp?: string;
}

export interface OtpVerifyResult extends AuthSessionView {
  token: string;
  isNewUser: boolean;
  needsOnboarding: boolean;
}

export interface StaffInvitation {
  id: string;
  email: string;
  role: AppRole;
  organizationId: string | null;
  venueSlug: string | null;
  eventId: string | null;
  status: "PENDING" | "ACCEPTED" | "REVOKED";
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
}

export interface TicketScanLog {
  id: string;
  ticketId: string | null;
  ticketCode: string;
  eventId: string;
  scannedBy: string;
  deviceId: string;
  scanMode: "ONLINE" | "OFFLINE_SYNC";
  clientScanId: string;
  result: ScanResultCode;
  message: string;
  scannedAt: string;
  syncedAt: string | null;
}

export interface RefundRequest {
  id: string;
  bookingId: string;
  userId: string | null;
  organizationId: string | null;
  amountInr: number;
  reason: string;
  status: RefundStatus;
  reviewedBy: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerEntry {
  id: string;
  organizationId: string | null;
  bookingId: string | null;
  refundId: string | null;
  settlementId: string | null;
  entryType: "TICKET_SALE" | "PLATFORM_FEE" | "GST" | "REFUND_DEBIT" | "SETTLEMENT_PAYOUT";
  amountInr: number;
  currency: "INR";
  mode: "DEMO_LEDGER";
  note: string;
  createdAt: string;
}

export interface SettlementBatch {
  id: string;
  organizationId: string;
  periodLabel: string;
  grossInr: number;
  feesInr: number;
  refundsInr: number;
  netPayoutInr: number;
  status: "PENDING" | "APPROVED" | "SETTLED_DEMO";
  approvedBy: string | null;
  createdAt: string;
  settledAt: string | null;
}

export interface SupportCase {
  id: string;
  userId: string | null;
  bookingId: string | null;
  eventId: string | null;
  subject: string;
  category: "BOOKING" | "REFUND" | "ACCESS" | "DISPUTE" | "TRUST_SAFETY";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: SupportCaseStatus;
  assignedTo: string | null;
  notes: { author: string; text: string; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorUserId: string | null;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  beforeJson: unknown;
  afterJson: unknown;
  createdAt: string;
}

export interface PlatformNotification {
  id: string;
  userId: string | null;
  audience: "USER" | "ORGANISER" | "STAFF" | "PLATFORM";
  title: string;
  body: string;
  kind: "BOOKING" | "REMINDER" | "SYSTEM" | "OPERATIONS";
  isRead: boolean;
  createdAt: string;
}

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string;
  updatedBy: string | null;
  updatedAt: string;
}

export interface SavedItem {
  id: string;
  userId: string;
  itemType: "event" | "venue" | "movie" | "restaurant" | "activity";
  itemSlug: string;
  createdAt: string;
}

export interface DemoUserProfile {
  name: string;
  email: string;
  phone?: string;
  preferredCitySlug: string;
  favoriteCategories: string[];
  isSignedIn: boolean;
}
