export type EventCategory = "concerts" | "festivals" | "comedy" | "nightlife" | "sports" | "workshops";

export type SalesPhaseStatus = "UPCOMING" | "EARLY_ACCESS" | "PRE_SALE" | "GENERAL_SALE" | "SOLD_OUT";

export type TierAvailability = "AVAILABLE" | "NEARLY_SOLD" | "SOLD_OUT";

export type OfferKind = "PERCENT_CAP" | "FLAT" | "BOGO_TIER";

export interface City {
  slug: string;
  name: string;
  state: string;
  isPopular: boolean;
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
}

export interface Venue {
  slug: string;
  name: string;
  citySlug: string;
  address: string;
  headline: string;
  summary: string;
  openStatusLabel: string;
  timings: { day: string; hours: string }[];
  facilities: string[];
  sections: VenueSection[];
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
}

export interface Offer {
  id: string;
  code: string;
  title: string;
  description: string;
  kind: OfferKind;
  discountValue: number;
  maxDiscountInr: number | null;
  minOrderInr: number;
  minQty: number;
  expiresAt: string;
  isActive: boolean;
}

export interface ArtistLineupEntry {
  name: string;
  role: string;
}

export interface PulseEvent {
  id: string;
  slug: string;
  title: string;
  category: EventCategory;
  citySlug: string;
  venueSlug: string;
  venueName: string;
  startsAt: string;
  endsAt: string;
  dateLabel: string;
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
}

export interface BookingRecord {
  id: string;
  referenceCode: string;
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
  status: "CONFIRMED_DEMO" | "CANCELLED";
  paymentMode: "DEMO_NO_CHARGE";
  createdAt: string;
  items: BookingItem[];
}
