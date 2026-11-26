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

export type TierAvailability = "AVAILABLE" | "NEARLY_SOLD" | "SOLD_OUT";

export type OfferKind = "PERCENT_CAP" | "FLAT" | "BOGO_TIER";

export type PaymentState = "PENDING" | "CONFIRMED" | "FAILED" | "CANCELLED";

export interface City {
  slug: string;
  name: string;
  state: string;
  locality?: string;
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
  artworkUrl?: string;
  distanceKm?: number;
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

export interface DemoUserProfile {
  name: string;
  email: string;
  phone?: string;
  preferredCitySlug: string;
  favoriteCategories: string[];
  isSignedIn: boolean;
}
