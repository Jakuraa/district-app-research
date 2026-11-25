import type {
  Offer,
  PriceBreakdown,
  SelectedTierInput,
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
