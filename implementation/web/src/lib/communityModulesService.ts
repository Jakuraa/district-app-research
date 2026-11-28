import crypto from "node:crypto";
import {
  buildUpiPaymentUri,
  type MembershipPlan,
  type MembershipRecord,
  type Promoter,
  type PromoterPayout,
  type TripBookingRecord,
  type TripListing,
  type TripPickupPoint
} from "@nightlifez/shared";
import { getPool } from "./db.ts";
import { getMemoryStore } from "./memoryStore.ts";
import { getOrganiserPaymentProfile } from "./organiserPaymentService.ts";
import { recordAuditLog } from "./authStore.ts";

function makeRef(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function makeSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${base || "listing"}-${crypto.randomBytes(2).toString("hex")}`;
}

// ============================================================================
// 1. PROMOTERS & ORGANISER-MANAGED COMMISSIONS
// ============================================================================

export async function listOrganiserPromoters(organizationId: string): Promise<{
  promoters: Promoter[];
  payouts: PromoterPayout[];
}> {
  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    const promoters = store.promoters
      .filter((p) => p.organizationId === organizationId)
      .map((p) => {
        const referred = store.bookings.filter(
          (b) =>
            b.organizationId === organizationId &&
            b.referralCode?.toUpperCase() === p.referralCode.toUpperCase() &&
            b.status === "CONFIRMED_DEMO"
        );
        const revenue = referred.reduce((s, b) => s + b.totalInr, 0);
        const earned = referred.reduce(
          (s, b) => s + Math.round((b.totalInr * p.commissionPercent) / 100) + p.commissionFlatInr,
          0
        );
        const paid = store.promoterPayouts
          .filter((pay) => pay.promoterId === p.id)
          .reduce((s, pay) => s + pay.amountInr, 0);
        return {
          ...p,
          referredBookings: referred.length,
          referredRevenueInr: revenue,
          earnedCommissionInr: earned,
          paidCommissionInr: paid
        };
      });
    const payouts = store.promoterPayouts.filter((pay) => pay.organizationId === organizationId);
    return { promoters, payouts };
  }

  const [promRes, payRes, bookRes] = await Promise.all([
    pool.query(
      `SELECT * FROM promoters WHERE organization_id = $1 ORDER BY created_at DESC`,
      [organizationId]
    ),
    pool.query(
      `SELECT * FROM promoter_payouts WHERE organization_id = $1 ORDER BY paid_at DESC`,
      [organizationId]
    ),
    pool.query(
      `SELECT referral_code, total_inr FROM bookings
       WHERE organization_id = $1 AND status = 'CONFIRMED_DEMO' AND referral_code IS NOT NULL`,
      [organizationId]
    )
  ]);

  const payouts: PromoterPayout[] = payRes.rows.map((r) => ({
    id: String(r.id),
    promoterId: String(r.promoter_id),
    organizationId: String(r.organization_id),
    amountInr: Number(r.amount_inr),
    paymentRef: String(r.payment_ref),
    note: r.note ? String(r.note) : null,
    paidBy: String(r.paid_by),
    paidAt: new Date(String(r.paid_at)).toISOString()
  }));

  const promoters: Promoter[] = promRes.rows.map((r) => {
    const code = String(r.referral_code).toUpperCase();
    const pct = Number(r.commission_percent);
    const flat = Number(r.commission_flat_inr);
    const matching = bookRes.rows.filter(
      (b) => String(b.referral_code).toUpperCase() === code
    );
    const revenue = matching.reduce((s, b) => s + Number(b.total_inr), 0);
    const earned = matching.reduce(
      (s, b) => s + Math.round((Number(b.total_inr) * pct) / 100) + flat,
      0
    );
    const paid = payouts
      .filter((pay) => pay.promoterId === String(r.id))
      .reduce((s, pay) => s + pay.amountInr, 0);
    return {
      id: String(r.id),
      organizationId: String(r.organization_id),
      eventId: r.event_id ? String(r.event_id) : null,
      name: String(r.name),
      email: String(r.email),
      phone: r.phone ? String(r.phone) : null,
      referralCode: String(r.referral_code),
      commissionPercent: pct,
      commissionFlatInr: flat,
      isActive: Boolean(r.is_active),
      createdAt: new Date(String(r.created_at)).toISOString(),
      referredBookings: matching.length,
      referredRevenueInr: revenue,
      earnedCommissionInr: earned,
      paidCommissionInr: paid
    };
  });

  return { promoters, payouts };
}

export async function createPromoter(
  input: {
    organizationId: string;
    eventId?: string | null;
    name: string;
    email: string;
    phone?: string | null;
    referralCode: string;
    commissionPercent: number;
    commissionFlatInr?: number;
  },
  actor: { id: string; email: string | null; role: string }
): Promise<Promoter> {
  const code = input.referralCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  if (code.length < 3) throw new Error("Referral code must be at least 3 alphanumeric characters.");
  if (input.commissionPercent < 0 || input.commissionPercent > 100) {
    throw new Error("Commission percent must be between 0 and 100.");
  }

  const promoter: Promoter = {
    id: `prm_${crypto.randomUUID().slice(0, 10)}`,
    organizationId: input.organizationId,
    eventId: input.eventId ?? null,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || null,
    referralCode: code,
    commissionPercent: input.commissionPercent,
    commissionFlatInr: input.commissionFlatInr ?? 0,
    isActive: true,
    createdAt: new Date().toISOString()
  };

  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    if (store.promoters.some((p) => p.referralCode === code)) {
      throw new Error("Referral code already exists.");
    }
    store.promoters.unshift(promoter);
  } else {
    await pool.query(
      `INSERT INTO promoters (id, organization_id, event_id, name, email, phone, referral_code, commission_percent, commission_flat_inr, is_active, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE,$10)`,
      [
        promoter.id,
        promoter.organizationId,
        promoter.eventId,
        promoter.name,
        promoter.email,
        promoter.phone,
        promoter.referralCode,
        promoter.commissionPercent,
        promoter.commissionFlatInr,
        promoter.createdAt
      ]
    );
  }

  await recordAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: "PROMOTER_CREATED",
    targetType: "promoter",
    targetId: promoter.id,
    afterJson: { referralCode: promoter.referralCode, commissionPercent: promoter.commissionPercent }
  });
  return promoter;
}

export async function recordPromoterPayout(
  input: {
    promoterId: string;
    organizationId: string;
    amountInr: number;
    paymentRef: string;
    note?: string | null;
  },
  actor: { id: string; email: string | null; role: string }
): Promise<PromoterPayout> {
  if (input.amountInr <= 0) throw new Error("Payout amount must be greater than 0.");
  if (input.paymentRef.trim().length < 3) throw new Error("Payment reference is required.");
  const payout: PromoterPayout = {
    id: `ppay_${crypto.randomUUID().slice(0, 10)}`,
    promoterId: input.promoterId,
    organizationId: input.organizationId,
    amountInr: input.amountInr,
    paymentRef: input.paymentRef.trim(),
    note: input.note?.trim() || null,
    paidBy: actor.id,
    paidAt: new Date().toISOString()
  };

  const pool = getPool();
  if (!pool) {
    getMemoryStore().promoterPayouts.unshift(payout);
  } else {
    await pool.query(
      `INSERT INTO promoter_payouts (id, promoter_id, organization_id, amount_inr, payment_ref, note, paid_by, paid_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        payout.id,
        payout.promoterId,
        payout.organizationId,
        payout.amountInr,
        payout.paymentRef,
        payout.note,
        payout.paidBy,
        payout.paidAt
      ]
    );
  }

  await recordAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: "PROMOTER_PAYOUT_RECORDED",
    targetType: "promoter_payout",
    targetId: payout.id,
    afterJson: { promoterId: payout.promoterId, amountInr: payout.amountInr }
  });
  return payout;
}

// ============================================================================
// 2. TRIPS, PICKUP POINTS, BOARDING MANIFESTS & OUTSTANDING BALANCES
// ============================================================================

function mapTripRow(r: Record<string, unknown>): TripListing {
  return {
    id: String(r.id),
    organizationId: String(r.organization_id),
    organizationName: r.org_name ? String(r.org_name) : undefined,
    slug: String(r.slug),
    title: String(r.title),
    destination: String(r.destination),
    citySlug: String(r.city_slug),
    departureLabel: String(r.departure_label),
    returnLabel: String(r.return_label),
    priceInr: Number(r.price_inr),
    advanceInr: Number(r.advance_inr),
    totalSeats: Number(r.total_seats),
    remainingSeats: Number(r.remaining_seats),
    pickupPoints: Array.isArray(r.pickup_points_json) ? (r.pickup_points_json as TripPickupPoint[]) : [],
    summary: String(r.summary),
    lifecycleStatus: String(r.lifecycle_status) as TripListing["lifecycleStatus"],
    createdAt: new Date(String(r.created_at)).toISOString()
  };
}

function mapTripBookingRow(r: Record<string, unknown>): TripBookingRecord {
  return {
    id: String(r.id),
    tripId: String(r.trip_id),
    tripTitle: r.trip_title ? String(r.trip_title) : undefined,
    organizationId: String(r.organization_id),
    referenceCode: String(r.reference_code),
    travellerName: String(r.traveller_name),
    travellerEmail: String(r.traveller_email),
    travellerPhone: String(r.traveller_phone),
    pickupPointId: String(r.pickup_point_id),
    pickupPointLabel: String(r.pickup_point_label),
    seats: Number(r.seats),
    totalInr: Number(r.total_inr),
    advanceInr: Number(r.advance_inr),
    paidInr: Number(r.paid_inr),
    balanceInr: Number(r.balance_inr),
    approvalStatus: String(r.approval_status) as TripBookingRecord["approvalStatus"],
    paymentStatus: String(r.payment_status) as TripBookingRecord["paymentStatus"],
    upiTxRef: r.upi_tx_ref ? String(r.upi_tx_ref) : null,
    boarded: Boolean(r.boarded),
    boardedAt: r.boarded_at ? new Date(String(r.boarded_at)).toISOString() : null,
    createdAt: new Date(String(r.created_at)).toISOString()
  };
}

export async function listPublishedTrips(city?: string): Promise<TripListing[]> {
  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    return store.trips
      .filter((t) => t.lifecycleStatus === "PUBLISHED" && (!city || city === "all" || t.citySlug === city))
      .map((t) => ({
        ...t,
        organizationName: store.organizations.find((o) => o.id === t.organizationId)?.name
      }));
  }
  const res = await pool.query(
    `SELECT t.*, o.name AS org_name FROM trips t
     LEFT JOIN organizations o ON o.id = t.organization_id
     WHERE t.lifecycle_status = 'PUBLISHED'
       AND ($1::text IS NULL OR $1 = 'all' OR t.city_slug = $1)
     ORDER BY t.created_at DESC`,
    [city ?? null]
  );
  return res.rows.map(mapTripRow);
}

export async function listOrganiserTrips(organizationId: string): Promise<{
  trips: TripListing[];
  bookings: TripBookingRecord[];
}> {
  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    const trips = store.trips.filter((t) => t.organizationId === organizationId);
    const bookings = store.tripBookings
      .filter((b) => b.organizationId === organizationId)
      .map((b) => ({
        ...b,
        tripTitle: trips.find((t) => t.id === b.tripId)?.title
      }));
    return { trips, bookings };
  }
  const [tripsRes, bookRes] = await Promise.all([
    pool.query(`SELECT * FROM trips WHERE organization_id = $1 ORDER BY created_at DESC`, [organizationId]),
    pool.query(
      `SELECT tb.*, t.title AS trip_title FROM trip_bookings tb
       JOIN trips t ON t.id = tb.trip_id
       WHERE tb.organization_id = $1 ORDER BY tb.created_at DESC`,
      [organizationId]
    )
  ]);
  return {
    trips: tripsRes.rows.map(mapTripRow),
    bookings: bookRes.rows.map(mapTripBookingRow)
  };
}

export async function createTripListing(
  input: {
    organizationId: string;
    title: string;
    destination: string;
    citySlug: string;
    departureLabel: string;
    returnLabel: string;
    priceInr: number;
    advanceInr: number;
    totalSeats: number;
    pickupPoints: TripPickupPoint[];
    summary: string;
  },
  actor: { id: string; email: string | null; role: string }
): Promise<TripListing> {
  if (input.advanceInr > input.priceInr) {
    throw new Error("Advance amount cannot exceed total trip price.");
  }
  if (input.pickupPoints.length === 0) {
    throw new Error("At least one pickup point is required.");
  }
  const trip: TripListing = {
    id: `trp_${crypto.randomUUID().slice(0, 10)}`,
    organizationId: input.organizationId,
    slug: makeSlug(input.title),
    title: input.title.trim(),
    destination: input.destination.trim(),
    citySlug: input.citySlug,
    departureLabel: input.departureLabel.trim(),
    returnLabel: input.returnLabel.trim(),
    priceInr: input.priceInr,
    advanceInr: input.advanceInr,
    totalSeats: input.totalSeats,
    remainingSeats: input.totalSeats,
    pickupPoints: input.pickupPoints,
    summary: input.summary.trim(),
    lifecycleStatus: "PUBLISHED",
    createdAt: new Date().toISOString()
  };

  const pool = getPool();
  if (!pool) {
    getMemoryStore().trips.unshift(trip);
  } else {
    await pool.query(
      `INSERT INTO trips (id, organization_id, slug, title, destination, city_slug, departure_label, return_label, price_inr, advance_inr, total_seats, remaining_seats, pickup_points_json, summary, lifecycle_status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,'PUBLISHED',$15)`,
      [
        trip.id,
        trip.organizationId,
        trip.slug,
        trip.title,
        trip.destination,
        trip.citySlug,
        trip.departureLabel,
        trip.returnLabel,
        trip.priceInr,
        trip.advanceInr,
        trip.totalSeats,
        trip.remainingSeats,
        JSON.stringify(trip.pickupPoints),
        trip.summary,
        trip.createdAt
      ]
    );
  }

  await recordAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: "TRIP_CREATED",
    targetType: "trip",
    targetId: trip.id,
    afterJson: { title: trip.title, destination: trip.destination }
  });
  return trip;
}

export async function createTripBookingRequest(input: {
  tripSlug: string;
  travellerName: string;
  travellerEmail: string;
  travellerPhone: string;
  pickupPointId: string;
  seats: number;
}): Promise<{ booking: TripBookingRecord; upiUri: string | null; payeeName: string | null; upiId: string | null }> {
  const pool = getPool();
  let trip: TripListing | null = null;
  if (!pool) {
    trip = getMemoryStore().trips.find((t) => t.slug === input.tripSlug && t.lifecycleStatus === "PUBLISHED") ?? null;
  } else {
    const res = await pool.query(`SELECT * FROM trips WHERE slug = $1 AND lifecycle_status = 'PUBLISHED'`, [input.tripSlug]);
    if (res.rowCount && res.rowCount > 0) trip = mapTripRow(res.rows[0]);
  }
  if (!trip) throw new Error("Trip not found.");
  if (input.seats < 1 || input.seats > trip.remainingSeats) {
    throw new Error("Insufficient seats available.");
  }
  const pickup = trip.pickupPoints.find((p) => p.id === input.pickupPointId) ?? trip.pickupPoints[0];
  if (!pickup) throw new Error("Invalid pickup point.");

  const totalInr = trip.priceInr * input.seats;
  const advanceInr = trip.advanceInr * input.seats;
  const ref = makeRef("TRP");

  const booking: TripBookingRecord = {
    id: `trpb_${crypto.randomUUID().slice(0, 10)}`,
    tripId: trip.id,
    tripTitle: trip.title,
    organizationId: trip.organizationId,
    referenceCode: ref,
    travellerName: input.travellerName.trim(),
    travellerEmail: input.travellerEmail.trim().toLowerCase(),
    travellerPhone: input.travellerPhone.trim(),
    pickupPointId: pickup.id,
    pickupPointLabel: `${pickup.label} (${pickup.timeLabel})`,
    seats: input.seats,
    totalInr,
    advanceInr,
    paidInr: 0,
    balanceInr: totalInr,
    approvalStatus: "PENDING_APPROVAL",
    paymentStatus: "PENDING",
    upiTxRef: null,
    boarded: false,
    boardedAt: null,
    createdAt: new Date().toISOString()
  };

  if (!pool) {
    const store = getMemoryStore();
    const t = store.trips.find((x) => x.id === trip!.id)!;
    t.remainingSeats -= input.seats;
    store.tripBookings.unshift(booking);
  } else {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const upd = await client.query(
        `UPDATE trips SET remaining_seats = remaining_seats - $2 WHERE id = $1 AND remaining_seats >= $2 RETURNING remaining_seats`,
        [trip.id, input.seats]
      );
      if (upd.rowCount === 0) throw new Error("Insufficient seats available.");
      await client.query(
        `INSERT INTO trip_bookings (id, trip_id, organization_id, reference_code, traveller_name, traveller_email, traveller_phone, pickup_point_id, pickup_point_label, seats, total_inr, advance_inr, paid_inr, balance_inr, approval_status, payment_status, boarded, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,0,$11,'PENDING_APPROVAL','PENDING',FALSE,$13)`,
        [
          booking.id,
          booking.tripId,
          booking.organizationId,
          booking.referenceCode,
          booking.travellerName,
          booking.travellerEmail,
          booking.travellerPhone,
          booking.pickupPointId,
          booking.pickupPointLabel,
          booking.seats,
          booking.totalInr,
          booking.advanceInr,
          booking.createdAt
        ]
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  const profile = await getOrganiserPaymentProfile(trip.organizationId);
  const upiUri =
    profile.upiEnabled && profile.upiId && profile.payeeDisplayName
      ? buildUpiPaymentUri({
          upiId: profile.upiId,
          payeeName: profile.payeeDisplayName,
          amountInr: advanceInr,
          referenceCode: ref
        })
      : null;

  return {
    booking,
    upiUri,
    payeeName: profile.payeeDisplayName,
    upiId: profile.upiId
  };
}

export async function submitTripAdvanceUpiClaim(referenceCode: string, upiTxRef: string): Promise<TripBookingRecord> {
  const ref = upiTxRef.trim();
  if (ref.length < 6) throw new Error("Enter a valid UPI transaction reference / UTR.");
  const pool = getPool();
  if (!pool) {
    const b = getMemoryStore().tripBookings.find((x) => x.referenceCode === referenceCode);
    if (!b) throw new Error("Trip booking not found.");
    b.upiTxRef = ref;
    b.paymentStatus = "AWAITING_VERIFICATION";
    return b;
  }
  const res = await pool.query(
    `UPDATE trip_bookings SET upi_tx_ref = $2, payment_status = 'AWAITING_VERIFICATION'
     WHERE reference_code = $1 RETURNING *`,
    [referenceCode, ref]
  );
  if (res.rowCount === 0) throw new Error("Trip booking not found.");
  return mapTripBookingRow(res.rows[0]);
}

export async function updateTripBookingByOrganiser(
  input: {
    bookingId: string;
    organizationId: string;
    action: "APPROVE_TRAVELLER" | "REJECT_TRAVELLER" | "VERIFY_ADVANCE" | "REJECT_ADVANCE" | "MARK_BOARDED" | "COLLECT_BALANCE";
    amountInr?: number;
  },
  actor: { id: string; email: string | null; role: string }
): Promise<TripBookingRecord> {
  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    const b = store.tripBookings.find((x) => x.id === input.bookingId && x.organizationId === input.organizationId);
    if (!b) throw new Error("Trip booking not found.");
    if (input.action === "APPROVE_TRAVELLER") b.approvalStatus = "APPROVED";
    if (input.action === "REJECT_TRAVELLER") {
      b.approvalStatus = "REJECTED";
      b.paymentStatus = "REJECTED";
      const t = store.trips.find((x) => x.id === b.tripId);
      if (t) t.remainingSeats += b.seats;
    }
    if (input.action === "VERIFY_ADVANCE") {
      b.approvalStatus = "APPROVED";
      b.paidInr = b.advanceInr;
      b.balanceInr = Math.max(0, b.totalInr - b.paidInr);
      b.paymentStatus = b.balanceInr === 0 ? "FULLY_PAID" : "ADVANCE_PAID";
    }
    if (input.action === "REJECT_ADVANCE") {
      b.paymentStatus = "REJECTED";
    }
    if (input.action === "MARK_BOARDED") {
      b.boarded = true;
      b.boardedAt = new Date().toISOString();
    }
    if (input.action === "COLLECT_BALANCE") {
      const add = input.amountInr ?? b.balanceInr;
      b.paidInr = Math.min(b.totalInr, b.paidInr + add);
      b.balanceInr = Math.max(0, b.totalInr - b.paidInr);
      b.paymentStatus = b.balanceInr === 0 ? "FULLY_PAID" : "ADVANCE_PAID";
    }
    return b;
  }

  let res;
  if (input.action === "APPROVE_TRAVELLER") {
    res = await pool.query(
      `UPDATE trip_bookings SET approval_status = 'APPROVED' WHERE id = $1 AND organization_id = $2 RETURNING *`,
      [input.bookingId, input.organizationId]
    );
  } else if (input.action === "REJECT_TRAVELLER") {
    res = await pool.query(
      `UPDATE trip_bookings SET approval_status = 'REJECTED', payment_status = 'REJECTED' WHERE id = $1 AND organization_id = $2 RETURNING *`,
      [input.bookingId, input.organizationId]
    );
    if (res.rowCount && res.rowCount > 0) {
      await pool.query(`UPDATE trips SET remaining_seats = remaining_seats + $2 WHERE id = $1`, [
        res.rows[0].trip_id,
        res.rows[0].seats
      ]);
    }
  } else if (input.action === "VERIFY_ADVANCE") {
    res = await pool.query(
      `UPDATE trip_bookings
       SET approval_status = 'APPROVED',
           paid_inr = advance_inr,
           balance_inr = GREATEST(0, total_inr - advance_inr),
           payment_status = CASE WHEN total_inr - advance_inr <= 0 THEN 'FULLY_PAID' ELSE 'ADVANCE_PAID' END
       WHERE id = $1 AND organization_id = $2 RETURNING *`,
      [input.bookingId, input.organizationId]
    );
  } else if (input.action === "REJECT_ADVANCE") {
    res = await pool.query(
      `UPDATE trip_bookings SET payment_status = 'REJECTED' WHERE id = $1 AND organization_id = $2 RETURNING *`,
      [input.bookingId, input.organizationId]
    );
  } else if (input.action === "MARK_BOARDED") {
    res = await pool.query(
      `UPDATE trip_bookings SET boarded = TRUE, boarded_at = NOW() WHERE id = $1 AND organization_id = $2 RETURNING *`,
      [input.bookingId, input.organizationId]
    );
  } else {
    res = await pool.query(
      `UPDATE trip_bookings
       SET paid_inr = LEAST(total_inr, paid_inr + COALESCE($3, balance_inr)),
           balance_inr = GREATEST(0, total_inr - LEAST(total_inr, paid_inr + COALESCE($3, balance_inr))),
           payment_status = CASE WHEN total_inr - LEAST(total_inr, paid_inr + COALESCE($3, balance_inr)) <= 0 THEN 'FULLY_PAID' ELSE 'ADVANCE_PAID' END
       WHERE id = $1 AND organization_id = $2 RETURNING *`,
      [input.bookingId, input.organizationId, input.amountInr ?? null]
    );
  }
  if (!res || res.rowCount === 0) throw new Error("Trip booking not found.");
  await recordAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: `TRIP_${input.action}`,
    targetType: "trip_booking",
    targetId: input.bookingId
  });
  return mapTripBookingRow(res.rows[0]);
}

// ============================================================================
// 3. MEMBERSHIPS, EXPIRY, RENEWAL REMINDERS & GATED PRIVATE INVITE LINKS
// ============================================================================

function mapPlanRow(r: Record<string, unknown>): MembershipPlan {
  return {
    id: String(r.id),
    organizationId: String(r.organization_id),
    organizationName: r.org_name ? String(r.org_name) : undefined,
    slug: String(r.slug),
    name: String(r.name),
    description: String(r.description),
    priceInr: Number(r.price_inr),
    durationDays: Number(r.duration_days),
    perks: Array.isArray(r.perks_json) ? r.perks_json.map(String) : [],
    privateInviteUrl: String(r.private_invite_url),
    isActive: Boolean(r.is_active),
    createdAt: new Date(String(r.created_at)).toISOString()
  };
}

function mapMembershipRow(r: Record<string, unknown>, includeInvite = false): MembershipRecord {
  const status = String(r.status) as MembershipRecord["status"];
  const expiresAt = r.expires_at ? new Date(String(r.expires_at)).toISOString() : null;
  const isExpired = expiresAt ? new Date(expiresAt).getTime() < Date.now() : false;
  const effectiveStatus: MembershipRecord["status"] = status === "ACTIVE" && isExpired ? "EXPIRED" : status;

  return {
    id: String(r.id),
    planId: String(r.plan_id),
    planName: r.plan_name ? String(r.plan_name) : undefined,
    organizationId: String(r.organization_id),
    referenceCode: String(r.reference_code),
    memberName: String(r.member_name),
    memberEmail: String(r.member_email),
    memberPhone: String(r.member_phone),
    status: effectiveStatus,
    upiTxRef: r.upi_tx_ref ? String(r.upi_tx_ref) : null,
    startsAt: r.starts_at ? new Date(String(r.starts_at)).toISOString() : null,
    expiresAt,
    reminderSentAt: r.reminder_sent_at ? new Date(String(r.reminder_sent_at)).toISOString() : null,
    privateInviteUrl:
      includeInvite && effectiveStatus === "ACTIVE" && r.private_invite_url
        ? String(r.private_invite_url)
        : null,
    createdAt: new Date(String(r.created_at)).toISOString()
  };
}

export async function listActiveMembershipPlans(): Promise<Omit<MembershipPlan, "privateInviteUrl">[]> {
  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    return store.membershipPlans
      .filter((p) => p.isActive)
      .map(({ privateInviteUrl: _hidden, ...rest }) => ({
        ...rest,
        organizationName: store.organizations.find((o) => o.id === rest.organizationId)?.name
      }));
  }
  const res = await pool.query(
    `SELECT mp.*, o.name AS org_name FROM membership_plans mp
     LEFT JOIN organizations o ON o.id = mp.organization_id
     WHERE mp.is_active = TRUE ORDER BY mp.created_at DESC`
  );
  return res.rows.map((r) => {
    const { privateInviteUrl: _hidden, ...rest } = mapPlanRow(r);
    return rest;
  });
}

export async function listOrganiserMemberships(organizationId: string): Promise<{
  plans: MembershipPlan[];
  members: MembershipRecord[];
}> {
  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    const plans = store.membershipPlans.filter((p) => p.organizationId === organizationId);
    const members = store.memberships
      .filter((m) => m.organizationId === organizationId)
      .map((m) => {
        const plan = plans.find((p) => p.id === m.planId);
        return {
          ...m,
          planName: plan?.name,
          privateInviteUrl: m.status === "ACTIVE" ? plan?.privateInviteUrl ?? null : null
        };
      });
    return { plans, members };
  }
  const [plansRes, memRes] = await Promise.all([
    pool.query(`SELECT * FROM membership_plans WHERE organization_id = $1 ORDER BY created_at DESC`, [organizationId]),
    pool.query(
      `SELECT m.*, mp.name AS plan_name, mp.private_invite_url
       FROM memberships m
       JOIN membership_plans mp ON mp.id = m.plan_id
       WHERE m.organization_id = $1 ORDER BY m.created_at DESC`,
      [organizationId]
    )
  ]);
  return {
    plans: plansRes.rows.map(mapPlanRow),
    members: memRes.rows.map((r) => mapMembershipRow(r, true))
  };
}

export async function createMembershipPlan(
  input: {
    organizationId: string;
    name: string;
    description: string;
    priceInr: number;
    durationDays: number;
    perks: string[];
    privateInviteUrl: string;
  },
  actor: { id: string; email: string | null; role: string }
): Promise<MembershipPlan> {
  const plan: MembershipPlan = {
    id: `mpl_${crypto.randomUUID().slice(0, 10)}`,
    organizationId: input.organizationId,
    slug: makeSlug(input.name),
    name: input.name.trim(),
    description: input.description.trim(),
    priceInr: input.priceInr,
    durationDays: input.durationDays,
    perks: input.perks,
    privateInviteUrl: input.privateInviteUrl.trim(),
    isActive: true,
    createdAt: new Date().toISOString()
  };

  const pool = getPool();
  if (!pool) {
    getMemoryStore().membershipPlans.unshift(plan);
  } else {
    await pool.query(
      `INSERT INTO membership_plans (id, organization_id, slug, name, description, price_inr, duration_days, perks_json, private_invite_url, is_active, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,TRUE,$10)`,
      [
        plan.id,
        plan.organizationId,
        plan.slug,
        plan.name,
        plan.description,
        plan.priceInr,
        plan.durationDays,
        JSON.stringify(plan.perks),
        plan.privateInviteUrl,
        plan.createdAt
      ]
    );
  }
  await recordAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: "MEMBERSHIP_PLAN_CREATED",
    targetType: "membership_plan",
    targetId: plan.id
  });
  return plan;
}

export async function createMembershipRequest(input: {
  planId: string;
  memberName: string;
  memberEmail: string;
  memberPhone: string;
}): Promise<{ membership: MembershipRecord; upiUri: string | null; payeeName: string | null; upiId: string | null }> {
  const pool = getPool();
  let plan: MembershipPlan | null = null;
  if (!pool) {
    plan = getMemoryStore().membershipPlans.find((p) => p.id === input.planId && p.isActive) ?? null;
  } else {
    const res = await pool.query(`SELECT * FROM membership_plans WHERE id = $1 AND is_active = TRUE`, [input.planId]);
    if (res.rowCount && res.rowCount > 0) plan = mapPlanRow(res.rows[0]);
  }
  if (!plan) throw new Error("Membership plan not found.");

  const ref = makeRef("MEM");
  const membership: MembershipRecord = {
    id: `mem_${crypto.randomUUID().slice(0, 10)}`,
    planId: plan.id,
    planName: plan.name,
    organizationId: plan.organizationId,
    referenceCode: ref,
    memberName: input.memberName.trim(),
    memberEmail: input.memberEmail.trim().toLowerCase(),
    memberPhone: input.memberPhone.trim(),
    status: "PENDING_PAYMENT",
    upiTxRef: null,
    startsAt: null,
    expiresAt: null,
    reminderSentAt: null,
    privateInviteUrl: null,
    createdAt: new Date().toISOString()
  };

  if (!pool) {
    getMemoryStore().memberships.unshift(membership);
  } else {
    await pool.query(
      `INSERT INTO memberships (id, plan_id, organization_id, reference_code, member_name, member_email, member_phone, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING_PAYMENT',$8)`,
      [
        membership.id,
        membership.planId,
        membership.organizationId,
        membership.referenceCode,
        membership.memberName,
        membership.memberEmail,
        membership.memberPhone,
        membership.createdAt
      ]
    );
  }

  const profile = await getOrganiserPaymentProfile(plan.organizationId);
  const upiUri =
    profile.upiEnabled && profile.upiId && profile.payeeDisplayName
      ? buildUpiPaymentUri({
          upiId: profile.upiId,
          payeeName: profile.payeeDisplayName,
          amountInr: plan.priceInr,
          referenceCode: ref
        })
      : null;

  return { membership, upiUri, payeeName: profile.payeeDisplayName, upiId: profile.upiId };
}

export async function submitMembershipUpiClaim(referenceCode: string, upiTxRef: string): Promise<MembershipRecord> {
  const ref = upiTxRef.trim();
  if (ref.length < 6) throw new Error("Enter a valid UPI transaction reference / UTR.");
  const pool = getPool();
  if (!pool) {
    const m = getMemoryStore().memberships.find((x) => x.referenceCode === referenceCode);
    if (!m) throw new Error("Membership request not found.");
    m.upiTxRef = ref;
    m.status = "AWAITING_VERIFICATION";
    return m;
  }
  const res = await pool.query(
    `UPDATE memberships SET upi_tx_ref = $2, status = 'AWAITING_VERIFICATION' WHERE reference_code = $1 RETURNING *`,
    [referenceCode, ref]
  );
  if (res.rowCount === 0) throw new Error("Membership request not found.");
  return mapMembershipRow(res.rows[0], false);
}

export async function lookupMembershipAccess(referenceCode: string, email: string): Promise<MembershipRecord | null> {
  const cleanRef = referenceCode.trim().toUpperCase();
  const cleanEmail = email.trim().toLowerCase();
  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    const m = store.memberships.find(
      (x) => x.referenceCode.toUpperCase() === cleanRef && x.memberEmail.toLowerCase() === cleanEmail
    );
    if (!m) return null;
    const plan = store.membershipPlans.find((p) => p.id === m.planId);
    const isExpired = m.expiresAt ? new Date(m.expiresAt).getTime() < Date.now() : false;
    const status = m.status === "ACTIVE" && isExpired ? "EXPIRED" : m.status;
    return {
      ...m,
      status,
      planName: plan?.name,
      privateInviteUrl: status === "ACTIVE" ? plan?.privateInviteUrl ?? null : null
    };
  }
  const res = await pool.query(
    `SELECT m.*, mp.name AS plan_name, mp.private_invite_url
     FROM memberships m
     JOIN membership_plans mp ON mp.id = m.plan_id
     WHERE UPPER(m.reference_code) = $1 AND LOWER(m.member_email) = $2`,
    [cleanRef, cleanEmail]
  );
  if (res.rowCount === 0) return null;
  return mapMembershipRow(res.rows[0], true);
}

export async function updateMembershipByOrganiser(
  input: {
    membershipId: string;
    organizationId: string;
    action: "ACTIVATE" | "REJECT" | "SEND_REMINDER" | "EXPIRE";
  },
  actor: { id: string; email: string | null; role: string }
): Promise<MembershipRecord> {
  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    const m = store.memberships.find((x) => x.id === input.membershipId && x.organizationId === input.organizationId);
    if (!m) throw new Error("Membership not found.");
    const plan = store.membershipPlans.find((p) => p.id === m.planId);
    if (input.action === "ACTIVATE") {
      const now = new Date();
      const exp = new Date(now.getTime() + (plan?.durationDays ?? 30) * 86_400_000);
      m.status = "ACTIVE";
      m.startsAt = now.toISOString();
      m.expiresAt = exp.toISOString();
    } else if (input.action === "REJECT") {
      m.status = "REJECTED";
    } else if (input.action === "SEND_REMINDER") {
      m.reminderSentAt = new Date().toISOString();
    } else if (input.action === "EXPIRE") {
      m.status = "EXPIRED";
    }
    return { ...m, privateInviteUrl: m.status === "ACTIVE" ? plan?.privateInviteUrl ?? null : null };
  }

  let res;
  if (input.action === "ACTIVATE") {
    res = await pool.query(
      `UPDATE memberships m
       SET status = 'ACTIVE',
           starts_at = NOW(),
           expires_at = NOW() + (mp.duration_days || ' days')::interval
       FROM membership_plans mp
       WHERE m.id = $1 AND m.organization_id = $2 AND mp.id = m.plan_id
       RETURNING m.*, mp.name AS plan_name, mp.private_invite_url`,
      [input.membershipId, input.organizationId]
    );
  } else if (input.action === "REJECT") {
    res = await pool.query(
      `UPDATE memberships SET status = 'REJECTED' WHERE id = $1 AND organization_id = $2 RETURNING *`,
      [input.membershipId, input.organizationId]
    );
  } else if (input.action === "SEND_REMINDER") {
    res = await pool.query(
      `UPDATE memberships SET reminder_sent_at = NOW() WHERE id = $1 AND organization_id = $2 RETURNING *`,
      [input.membershipId, input.organizationId]
    );
  } else {
    res = await pool.query(
      `UPDATE memberships SET status = 'EXPIRED' WHERE id = $1 AND organization_id = $2 RETURNING *`,
      [input.membershipId, input.organizationId]
    );
  }
  if (!res || res.rowCount === 0) throw new Error("Membership not found.");
  await recordAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: `MEMBERSHIP_${input.action}`,
    targetType: "membership",
    targetId: input.membershipId
  });
  return mapMembershipRow(res.rows[0], true);
}
