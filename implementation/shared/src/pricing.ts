import type {
  BookingStatus,
  EventLifecycleStatus,
  Offer,
  PriceBreakdown,
  RefundStatus,
  ScanResultCode,
  SelectedTierInput,
  TicketPass,
  TicketTier,
  TierAvailability
} from "./types.ts";

export function getTierAvailability(tier: Pick<TicketTier, "remainingQuota" | "totalQuota">): TierAvailability {
  if (tier.remainingQuota <= 0) return "SOLD_OUT";
  const ratio = tier.totalQuota > 0 ? tier.remainingQuota / tier.totalQuota : 0;
  if (tier.remainingQuota <= 15 || ratio <= 0.15) return "NEARLY_SOLD";
  return "AVAILABLE";
}

export function getMinTierPrice(tiers: TicketTier[]): number {
  if (tiers.length === 0) return 0;
  return Math.min(...tiers.map((t) => t.priceInr));
}

export function evaluateOfferDiscount(
  offer: Offer,
  subtotalInr: number,
  totalQuantity: number,
  cheapestSelectedUnitPriceInr: number,
  now: Date = new Date()
): { discountInr: number; rejectionReason: string | null } {
  if (!offer.isActive) {
    return { discountInr: 0, rejectionReason: "This offer is no longer active." };
  }
  if (new Date(offer.expiresAt).getTime() < now.getTime()) {
    return { discountInr: 0, rejectionReason: "This offer has expired." };
  }
  if (totalQuantity < offer.minQty) {
    return {
      discountInr: 0,
      rejectionReason: `Valid on minimum ticket count of ${offer.minQty}.`
    };
  }
  if (subtotalInr < offer.minOrderInr) {
    return {
      discountInr: 0,
      rejectionReason: `Valid on orders of ₹${offer.minOrderInr.toLocaleString("en-IN")} or more.`
    };
  }

  let discountInr = 0;
  if (offer.kind === "PERCENT_CAP") {
    const raw = Math.round((subtotalInr * offer.discountValue) / 100);
    discountInr = offer.maxDiscountInr !== null ? Math.min(raw, offer.maxDiscountInr) : raw;
  } else if (offer.kind === "FLAT") {
    discountInr = Math.min(offer.discountValue, subtotalInr);
  } else if (offer.kind === "BOGO_TIER") {
    discountInr = Math.min(cheapestSelectedUnitPriceInr, subtotalInr);
  }

  return { discountInr: Math.max(0, discountInr), rejectionReason: null };
}

export function calculatePriceBreakdown(params: {
  tiers: TicketTier[];
  selections: SelectedTierInput[];
  offers: Offer[];
  offerCode?: string | null;
  now?: Date;
}): PriceBreakdown {
  const tierMap = new Map(params.tiers.map((t) => [t.id, t]));
  let totalQuantity = 0;
  let subtotalInr = 0;
  let cheapestUnit = Number.POSITIVE_INFINITY;

  for (const sel of params.selections) {
    if (sel.quantity <= 0) continue;
    const tier = tierMap.get(sel.tierId);
    if (!tier) continue;
    totalQuantity += sel.quantity;
    subtotalInr += tier.priceInr * sel.quantity;
    cheapestUnit = Math.min(cheapestUnit, tier.priceInr);
  }

  if (totalQuantity === 0) {
    return {
      totalQuantity: 0,
      subtotalInr: 0,
      discountInr: 0,
      appliedOfferCode: null,
      appliedOfferTitle: null,
      convenienceFeeInr: 0,
      gstInr: 0,
      totalInr: 0,
      offerRejectionReason: null
    };
  }

  let discountInr = 0;
  let appliedOfferCode: string | null = null;
  let appliedOfferTitle: string | null = null;
  let offerRejectionReason: string | null = null;

  const trimmedCode = params.offerCode?.trim();
  if (trimmedCode) {
    const matched = params.offers.find(
      (o) => o.code.toLowerCase() === trimmedCode.toLowerCase()
    );
    if (!matched) {
      offerRejectionReason = `Promo code "${trimmedCode.toUpperCase()}" is not valid for this event.`;
    } else {
      const evaluated = evaluateOfferDiscount(
        matched,
        subtotalInr,
        totalQuantity,
        Number.isFinite(cheapestUnit) ? cheapestUnit : 0,
        params.now
      );
      if (evaluated.rejectionReason) {
        offerRejectionReason = evaluated.rejectionReason;
      } else {
        discountInr = evaluated.discountInr;
        appliedOfferCode = matched.code;
        appliedOfferTitle = matched.title;
      }
    }
  }

  const netSubtotal = Math.max(0, subtotalInr - discountInr);
  const convenienceFeeInr = Math.round(netSubtotal * 0.06);
  const gstInr = Math.round(convenienceFeeInr * 0.18);
  const totalInr = netSubtotal + convenienceFeeInr + gstInr;

  return {
    totalQuantity,
    subtotalInr,
    discountInr,
    appliedOfferCode,
    appliedOfferTitle,
    convenienceFeeInr,
    gstInr,
    totalInr,
    offerRejectionReason
  };
}

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export const BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  CONFIRMED_DEMO: ["CANCELLED", "REFUND_PENDING"],
  REFUND_PENDING: ["REFUNDED", "CONFIRMED_DEMO", "CANCELLED"],
  CANCELLED: ["REFUND_PENDING", "REFUNDED"],
  REFUNDED: []
};

export const REFUND_TRANSITIONS: Record<RefundStatus, readonly RefundStatus[]> = {
  REQUESTED: ["UNDER_REVIEW", "APPROVED", "REJECTED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["PROCESSED"],
  REJECTED: [],
  PROCESSED: []
};

export const EVENT_STATUS_TRANSITIONS: Record<EventLifecycleStatus, readonly EventLifecycleStatus[]> = {
  DRAFT: ["PENDING_APPROVAL", "PUBLISHED", "CANCELLED"],
  PENDING_APPROVAL: ["PUBLISHED", "DRAFT", "CANCELLED"],
  PUBLISHED: ["PAUSED", "CANCELLED"],
  PAUSED: ["PUBLISHED", "CANCELLED"],
  CANCELLED: []
};

export function canTransitionBookingStatus(from: BookingStatus, to: BookingStatus): boolean {
  if (from === to) return true;
  return BOOKING_TRANSITIONS[from].includes(to);
}

export function canTransitionRefundStatus(from: RefundStatus, to: RefundStatus): boolean {
  if (from === to) return true;
  return REFUND_TRANSITIONS[from].includes(to);
}

export function canTransitionEventStatus(
  from: EventLifecycleStatus,
  to: EventLifecycleStatus
): boolean {
  if (from === to) return true;
  return EVENT_STATUS_TRANSITIONS[from].includes(to);
}

export function evaluateTicketScanEligibility(params: {
  ticket: Pick<TicketPass, "eventId" | "status" | "checkedInAt"> | null;
  expectedEventId: string;
  eventEndsAt?: string | null;
  now?: Date;
}): { result: ScanResultCode; valid: boolean; message: string } {
  const { ticket, expectedEventId, eventEndsAt, now = new Date() } = params;
  if (!ticket) {
    return { result: "INVALID", valid: false, message: "Ticket not found or invalid QR signature." };
  }
  if (ticket.eventId !== expectedEventId) {
    return {
      result: "WRONG_EVENT",
      valid: false,
      message: "Ticket belongs to a different event."
    };
  }
  if (ticket.status === "USED") {
    return {
      result: "ALREADY_USED",
      valid: false,
      message: `Ticket already checked in${ticket.checkedInAt ? ` at ${ticket.checkedInAt}` : ""}.`
    };
  }
  if (ticket.status === "CANCELLED") {
    return { result: "CANCELLED", valid: false, message: "Ticket booking has been cancelled." };
  }
  if (ticket.status === "REVOKED") {
    return { result: "REVOKED", valid: false, message: "Ticket was revoked by operations." };
  }
  if (ticket.status === "EXPIRED") {
    return { result: "EXPIRED", valid: false, message: "Ticket has expired." };
  }
  if (eventEndsAt && new Date(eventEndsAt).getTime() + 6 * 60 * 60 * 1000 < now.getTime()) {
    return { result: "EXPIRED", valid: false, message: "Event window has ended; pass expired." };
  }
  return { result: "VALID", valid: true, message: "Valid pass — entry approved." };
}
