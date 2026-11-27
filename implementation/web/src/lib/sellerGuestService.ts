import crypto from "node:crypto";
import {
  canTransitionBookingStatus,
  csvImportGuestsSchema,
  decideApprovalSchema,
  duplicateEventSchema,
  manualGuestSchema,
  parseCsvGuestRows,
  updateOrganizationStorefrontSchema,
  upsertBookingQuestionsSchema,
  validateAttendeeQuestionAnswers,
  type BookingAttendeeRecord,
  type BookingQuestion,
  type BookingRecord,
  type Organization,
  type PulseEvent,
  type TicketPass
} from "@nightlifez/shared";
import { signQrPayload } from "./auth.ts";
import { recordAuditLog } from "./authStore.ts";
import { ensureSchemaBootstrapped } from "./bootstrapDb.ts";
import { getPool } from "./db.ts";
import { getMemoryStore } from "./memoryStore.ts";
import { listOrganizations } from "./operationsStore.ts";
import { executeDemoPaymentAdapter } from "./paymentAdapter.ts";
import { getEventDetail, listBookings, listCitiesAndEvents } from "./repository.ts";

export interface PublicStorefrontView {
  organization: {
    id: string;
    slug: string;
    name: string;
    citySlug: string;
    rating: number;
    tenureLabel: string;
    isVerified: boolean;
    bioIntro: string | null;
    coverArtworkUrl: string | null;
    instagramHandle: string | null;
    publicContactPhone: string | null;
    publicContactEmail: string | null;
    socialLinks: { platform: string; url: string }[];
    promotedListingsEnabled: boolean;
  };
  upcomingEvents: PulseEvent[];
  promotedEvents: PulseEvent[];
}

export async function getPublicStorefront(orgSlug: string): Promise<PublicStorefrontView | null> {
  const orgs = await listOrganizations();
  const org = orgs.find((o) => o.slug === orgSlug);
  if (!org || org.approvalStatus !== "APPROVED") {
    return null;
  }

  const { events } = await listCitiesAndEvents({}, { includeNonPublished: false });
  const upcomingEvents = events.filter(
    (e) =>
      e.organizationId === org.id &&
      (e.lifecycleStatus ?? "PUBLISHED") === "PUBLISHED" &&
      (e.visibility ?? "PUBLIC") === "PUBLIC"
  );

  const promotedSlugs = new Set(org.promotedEventSlugs ?? []);
  const promotedEvents =
    org.promotedListingsEnabled && promotedSlugs.size > 0
      ? events.filter(
          (e) =>
            promotedSlugs.has(e.slug) &&
            (e.lifecycleStatus ?? "PUBLISHED") === "PUBLISHED" &&
            (e.visibility ?? "PUBLIC") === "PUBLIC"
        )
      : [];

  return {
    organization: {
      id: org.id,
      slug: org.slug,
      name: org.name,
      citySlug: org.citySlug,
      rating: org.rating,
      tenureLabel: org.tenureLabel,
      isVerified: org.approvalStatus === "APPROVED",
      bioIntro: org.bioIntro ?? null,
      coverArtworkUrl: org.coverArtworkUrl ?? null,
      instagramHandle: org.instagramHandle ?? null,
      publicContactPhone: org.publicContactPhone ?? null,
      publicContactEmail: org.publicContactEmail ?? null,
      socialLinks: org.socialLinks ?? [],
      promotedListingsEnabled: Boolean(org.promotedListingsEnabled)
    },
    upcomingEvents,
    promotedEvents
  };
}

export async function updateOrganizationStorefront(
  orgId: string,
  rawInput: unknown,
  actor: { id: string; email: string | null; role: string }
): Promise<Organization> {
  const input = updateOrganizationStorefrontSchema.parse(rawInput);
  const pool = getPool();

  if (!pool) {
    const store = getMemoryStore();
    const org = store.organizations.find((o) => o.id === orgId);
    if (!org) throw new Error("Organization not found.");
    const before = { bioIntro: org.bioIntro, instagramHandle: org.instagramHandle };
    if (input.bioIntro !== undefined) org.bioIntro = input.bioIntro;
    if (input.coverArtworkUrl !== undefined) org.coverArtworkUrl = input.coverArtworkUrl;
    if (input.instagramHandle !== undefined) org.instagramHandle = input.instagramHandle;
    if (input.publicContactPhone !== undefined) org.publicContactPhone = input.publicContactPhone;
    if (input.publicContactEmail !== undefined) org.publicContactEmail = input.publicContactEmail || null;
    if (input.socialLinks !== undefined) org.socialLinks = input.socialLinks;
    if (input.promotedListingsEnabled !== undefined) org.promotedListingsEnabled = input.promotedListingsEnabled;
    if (input.promotedEventSlugs !== undefined) org.promotedEventSlugs = input.promotedEventSlugs;

    await recordAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "STOREFRONT_UPDATED",
      targetType: "organization",
      targetId: orgId,
      beforeJson: before,
      afterJson: input
    });
    return org;
  }

  await ensureSchemaBootstrapped(pool);
  const existingRes = await pool.query("SELECT * FROM organizations WHERE id = $1 LIMIT 1", [orgId]);
  if (existingRes.rowCount === 0) throw new Error("Organization not found.");

  await pool.query(
    `UPDATE organizations SET
       bio_intro = COALESCE($2, bio_intro),
       cover_artwork_url = COALESCE($3, cover_artwork_url),
       instagram_handle = COALESCE($4, instagram_handle),
       public_contact_phone = COALESCE($5, public_contact_phone),
       public_contact_email = COALESCE($6, public_contact_email),
       social_links_json = COALESCE($7::jsonb, social_links_json),
       promoted_listings_enabled = COALESCE($8, promoted_listings_enabled),
       promoted_event_slugs_json = COALESCE($9::jsonb, promoted_event_slugs_json)
     WHERE id = $1`,
    [
      orgId,
      input.bioIntro ?? null,
      input.coverArtworkUrl ?? null,
      input.instagramHandle ?? null,
      input.publicContactPhone ?? null,
      input.publicContactEmail === "" ? null : input.publicContactEmail ?? null,
      input.socialLinks ? JSON.stringify(input.socialLinks) : null,
      input.promotedListingsEnabled ?? null,
      input.promotedEventSlugs ? JSON.stringify(input.promotedEventSlugs) : null
    ]
  );

  await recordAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: "STOREFRONT_UPDATED",
    targetType: "organization",
    targetId: orgId,
    afterJson: input
  });

  const updated = await listOrganizations([orgId]);
  return updated[0]!;
}

export async function listEventQuestions(eventId: string): Promise<BookingQuestion[]> {
  const pool = getPool();
  if (!pool) {
    return getMemoryStore()
      .bookingQuestions.filter((q) => q.eventId === eventId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }
  await ensureSchemaBootstrapped(pool);
  const res = await pool.query(
    "SELECT * FROM booking_questions WHERE event_id = $1 ORDER BY sort_order ASC, created_at ASC",
    [eventId]
  );
  return res.rows.map((r) => ({
    id: String(r.id),
    eventId: String(r.event_id),
    label: String(r.label),
    fieldType: r.field_type as BookingQuestion["fieldType"],
    options: (r.options_json as string[]) ?? [],
    required: Boolean(r.required),
    sortOrder: Number(r.sort_order)
  }));
}

export async function replaceEventQuestions(
  eventId: string,
  rawInput: unknown,
  actor: { id: string; email: string | null; role: string }
): Promise<BookingQuestion[]> {
  const input = upsertBookingQuestionsSchema.parse(rawInput);
  const normalized: BookingQuestion[] = input.questions.map((q, idx) => ({
    id: q.id || `bq_${crypto.randomUUID().slice(0, 10)}`,
    eventId,
    label: q.label,
    fieldType: q.fieldType,
    options: q.fieldType === "DROPDOWN" || q.fieldType === "MULTI_CHOICE" ? q.options : [],
    required: q.required,
    sortOrder: q.sortOrder ?? idx
  }));

  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    store.bookingQuestions = store.bookingQuestions.filter((q) => q.eventId !== eventId);
    store.bookingQuestions.push(...normalized);
    await recordAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "BOOKING_QUESTIONS_UPDATED",
      targetType: "event",
      targetId: eventId,
      afterJson: { count: normalized.length }
    });
    return normalized;
  }

  await ensureSchemaBootstrapped(pool);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM booking_questions WHERE event_id = $1", [eventId]);
    for (const q of normalized) {
      await client.query(
        `INSERT INTO booking_questions (id, event_id, label, field_type, options_json, required, sort_order)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7)`,
        [q.id, q.eventId, q.label, q.fieldType, JSON.stringify(q.options), q.required, q.sortOrder]
      );
    }
    await client.query("COMMIT");
    await recordAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "BOOKING_QUESTIONS_UPDATED",
      targetType: "event",
      targetId: eventId,
      afterJson: { count: normalized.length }
    });
    return normalized;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function duplicateOrganiserEvent(
  sourceEventId: string,
  rawInput: unknown,
  actor: { id: string; email: string | null; role: string }
): Promise<PulseEvent> {
  const input = duplicateEventSchema.parse(rawInput);
  const detail = await getEventDetail(sourceEventId);
  if (!detail) throw new Error("Source event not found.");
  const src = detail.event;

  const newEventId = `evt_${crypto.randomUUID().slice(0, 10)}`;
  const newTitle = input.title ?? `${src.title} (Encore)`;
  const slugBase = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const newSlug = `${slugBase}-${crypto.randomBytes(2).toString("hex")}`;

  const quotaMap = new Map((input.tierQuotas ?? []).map((tq) => [tq.sourceTierId, tq.totalQuota]));
  const newTiers = src.tiers.map((t, idx) => {
    const freshQuota = quotaMap.get(t.id) ?? t.totalQuota;
    return {
      ...t,
      id: `tier_${newEventId}_${idx + 1}`,
      totalQuota: freshQuota,
      remainingQuota: freshQuota
    };
  });

  const newOffers = src.offers.map((o) => ({
    ...o,
    id: `off_${crypto.randomUUID().slice(0, 10)}`
  }));

  const srcQuestions = await listEventQuestions(src.id);
  const newQuestions: BookingQuestion[] = srcQuestions.map((q) => ({
    ...q,
    id: `bq_${crypto.randomUUID().slice(0, 10)}`,
    eventId: newEventId
  }));

  const duplicated: PulseEvent = {
    ...structuredClone(src),
    id: newEventId,
    slug: newSlug,
    title: newTitle,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    dateLabel: input.dateLabel,
    lifecycleStatus: "DRAFT",
    clonedFromEventId: src.id,
    tiers: newTiers,
    offers: newOffers
  };

  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    store.events.unshift(duplicated);
    store.bookingQuestions.push(...newQuestions);
    await recordAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "EVENT_DUPLICATED",
      targetType: "event",
      targetId: newEventId,
      beforeJson: { sourceEventId: src.id },
      afterJson: { title: newTitle, lifecycleStatus: "DRAFT" }
    });
    return duplicated;
  }

  await ensureSchemaBootstrapped(pool);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO events (
         id, slug, title, category, city_slug, venue_slug, venue_name,
         starts_at, ends_at, date_label, artwork_url, age_limit, language,
         duration_label, distance_km, organization_id, lifecycle_status,
         visibility, approval_required, cloned_from_event_id,
         organizer_name, organizer_rating, organizer_tenure, summary,
         highlights_json, facilities_json, policies_json, lineup_json,
         sales_timeline_json, active_phase, partial_reserve_percent,
         is_featured, accent_color, created_by
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'DRAFT',
         $17,$18,$19,$20,$21,$22,$23,$24::jsonb,$25::jsonb,$26::jsonb,$27::jsonb,$28::jsonb,$29,$30,FALSE,$31,$32
       )`,
      [
        duplicated.id,
        duplicated.slug,
        duplicated.title,
        duplicated.category,
        duplicated.citySlug,
        duplicated.venueSlug,
        duplicated.venueName,
        duplicated.startsAt,
        duplicated.endsAt,
        duplicated.dateLabel,
        duplicated.artworkUrl ?? "/art/evt-solstice.svg",
        duplicated.ageLimit ?? null,
        duplicated.language ?? null,
        duplicated.durationLabel ?? null,
        duplicated.distanceKm ?? null,
        duplicated.organizationId ?? "org-nightlifez-originals",
        duplicated.visibility ?? "PUBLIC",
        Boolean(duplicated.approvalRequired),
        src.id,
        duplicated.organizerName,
        duplicated.organizerRating,
        duplicated.organizerTenure,
        duplicated.summary,
        JSON.stringify(duplicated.highlights),
        JSON.stringify(duplicated.facilities),
        JSON.stringify(duplicated.policies),
        JSON.stringify(duplicated.lineup),
        JSON.stringify(duplicated.salesTimeline),
        duplicated.activePhase,
        duplicated.partialReservePercent,
        duplicated.accentColor,
        actor.id
      ]
    );

    for (const tier of newTiers) {
      await client.query(
        `INSERT INTO ticket_tiers (id, event_id, section_id, name, description, price_inr, total_quota, remaining_quota, max_per_order, sales_phase)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [tier.id, duplicated.id, tier.sectionId, tier.name, tier.description, tier.priceInr, tier.totalQuota, tier.remainingQuota, tier.maxPerOrder, tier.salesPhase]
      );
    }

    for (const offer of newOffers) {
      await client.query(
        `INSERT INTO offers (id, event_id, organization_id, code, title, description, kind, discount_value, max_discount_inr, min_order_inr, min_qty, expires_at, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [offer.id, duplicated.id, duplicated.organizationId ?? null, offer.code, offer.title, offer.description, offer.kind, offer.discountValue, offer.maxDiscountInr, offer.minOrderInr, offer.minQty, offer.expiresAt, offer.isActive]
      );
    }

    for (const q of newQuestions) {
      await client.query(
        `INSERT INTO booking_questions (id, event_id, label, field_type, options_json, required, sort_order)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7)`,
        [q.id, duplicated.id, q.label, q.fieldType, JSON.stringify(q.options), q.required, q.sortOrder]
      );
    }

    await client.query("COMMIT");
    await recordAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "EVENT_DUPLICATED",
      targetType: "event",
      targetId: duplicated.id,
      beforeJson: { sourceEventId: src.id },
      afterJson: { title: duplicated.title, lifecycleStatus: "DRAFT" }
    });
    return duplicated;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function listBookingAttendees(bookingIds: string[]): Promise<Map<string, BookingAttendeeRecord[]>> {
  const map = new Map<string, BookingAttendeeRecord[]>();
  if (bookingIds.length === 0) return map;

  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    const idSet = new Set(bookingIds);
    for (const att of store.bookingAttendees) {
      if (!idSet.has(att.bookingId)) continue;
      const arr = map.get(att.bookingId) ?? [];
      arr.push(att);
      map.set(att.bookingId, arr);
    }
    return map;
  }

  const res = await pool.query(
    "SELECT * FROM booking_attendees WHERE booking_id = ANY($1::text[]) ORDER BY attendee_index ASC",
    [bookingIds]
  );
  for (const r of res.rows) {
    const bid = String(r.booking_id);
    const arr = map.get(bid) ?? [];
    arr.push({
      id: String(r.id),
      bookingId: bid,
      eventId: String(r.event_id),
      tierId: String(r.tier_id),
      attendeeIndex: Number(r.attendee_index),
      fullName: String(r.full_name),
      email: String(r.email),
      phone: r.phone ? String(r.phone) : null,
      answers: (r.answers_json as BookingAttendeeRecord["answers"]) ?? {},
      ticketId: r.ticket_id ? String(r.ticket_id) : null,
      createdAt: new Date(String(r.created_at)).toISOString()
    });
    map.set(bid, arr);
  }
  return map;
}

export async function decideBookingApproval(
  bookingId: string,
  rawInput: unknown,
  actor: { id: string; email: string | null; role: string }
): Promise<BookingRecord> {
  const input = decideApprovalSchema.parse(rawInput);
  const now = new Date();
  const nowIso = now.toISOString();
  const expiresIso = new Date(now.getTime() + input.expiresInHours * 60 * 60 * 1000).toISOString();
  const token = input.decision === "APPROVE" ? `apv_${crypto.randomBytes(16).toString("hex")}` : null;

  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    const booking = store.bookings.find((b) => b.id === bookingId);
    if (!booking) throw new Error("Booking request not found.");
    if (booking.status !== "PENDING_APPROVAL") {
      throw new Error(`Booking is already in state ${booking.status}.`);
    }

    if (input.decision === "APPROVE") {
      booking.status = "APPROVED_AWAITING_PAYMENT";
      booking.approvalStatus = "APPROVED";
      booking.approvalToken = token;
      booking.approvalExpiresAt = expiresIso;
      booking.approvedAt = nowIso;
      booking.approvedBy = actor.id;
    } else {
      booking.status = "REJECTED";
      booking.approvalStatus = "REJECTED";
      booking.rejectedAt = nowIso;
      booking.approvedBy = actor.id;
      booking.rejectionReason = input.reason ?? "Declined by organiser";
    }

    store.notifications.unshift({
      id: `ntf_${crypto.randomUUID().slice(0, 10)}`,
      userId: booking.userId ?? null,
      audience: "USER",
      title: input.decision === "APPROVE" ? `Spot approved: ${booking.eventTitle}` : `Request declined: ${booking.eventTitle}`,
      body:
        input.decision === "APPROVE"
          ? `Your booking request ${booking.referenceCode} is approved. Complete demo payment before ${expiresIso}.`
          : `Your booking request ${booking.referenceCode} was declined. No payment was charged.`,
      kind: "BOOKING",
      isRead: false,
      createdAt: nowIso
    });

    await recordAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: input.decision === "APPROVE" ? "BOOKING_APPROVED" : "BOOKING_REJECTED",
      targetType: "booking",
      targetId: bookingId,
      afterJson: { decision: input.decision, reason: input.reason ?? null }
    });
    return booking;
  }

  await ensureSchemaBootstrapped(pool);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const res = await client.query("SELECT * FROM bookings WHERE id = $1 FOR UPDATE", [bookingId]);
    if (res.rowCount === 0) throw new Error("Booking request not found.");
    const row = res.rows[0];
    if (String(row.status) !== "PENDING_APPROVAL") {
      throw new Error(`Booking is already in state ${String(row.status)}.`);
    }

    if (input.decision === "APPROVE") {
      await client.query(
        `UPDATE bookings SET
           status = 'APPROVED_AWAITING_PAYMENT',
           approval_status = 'APPROVED',
           approval_token = $2,
           approval_expires_at = $3,
           approved_at = $4,
           approved_by = $5
         WHERE id = $1`,
        [bookingId, token, expiresIso, nowIso, actor.id]
      );
    } else {
      await client.query(
        `UPDATE bookings SET
           status = 'REJECTED',
           approval_status = 'REJECTED',
           rejected_at = $2,
           approved_by = $3,
           rejection_reason = $4
         WHERE id = $1`,
        [bookingId, nowIso, actor.id, input.reason ?? "Declined by organiser"]
      );
    }

    await client.query(
      `INSERT INTO notifications (id, user_id, audience, title, body, kind, is_read, created_at)
       VALUES ($1,$2,'USER',$3,$4,'BOOKING',FALSE,$5)`,
      [
        `ntf_${crypto.randomUUID().slice(0, 10)}`,
        row.user_id ? String(row.user_id) : null,
        input.decision === "APPROVE"
          ? `Spot approved: ${String(row.event_title)}`
          : `Request declined: ${String(row.event_title)}`,
        input.decision === "APPROVE"
          ? `Your booking request ${String(row.reference_code)} is approved. Complete demo payment before ${expiresIso}.`
          : `Your booking request ${String(row.reference_code)} was declined. No payment was charged.`,
        nowIso
      ]
    );
    await client.query("COMMIT");

    await recordAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: input.decision === "APPROVE" ? "BOOKING_APPROVED" : "BOOKING_REJECTED",
      targetType: "booking",
      targetId: bookingId,
      afterJson: { decision: input.decision, reason: input.reason ?? null }
    });

    const all = await listBookings({ eventId: String(row.event_id) });
    return all.find((b) => b.id === bookingId)!;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getApprovalBookingByToken(token: string): Promise<BookingRecord | null> {
  const pool = getPool();
  const nowMs = Date.now();

  if (!pool) {
    const store = getMemoryStore();
    const found = store.bookings.find((b) => b.approvalToken === token);
    if (!found) return null;
    if (
      found.status === "APPROVED_AWAITING_PAYMENT" &&
      found.approvalExpiresAt &&
      new Date(found.approvalExpiresAt).getTime() <= nowMs
    ) {
      found.status = "EXPIRED";
      found.approvalStatus = "EXPIRED";
    }
    return {
      ...found,
      attendees: store.bookingAttendees.filter((a) => a.bookingId === found.id),
      tickets: store.tickets.filter((t) => t.bookingId === found.id)
    };
  }

  await ensureSchemaBootstrapped(pool);
  const res = await pool.query("SELECT * FROM bookings WHERE approval_token = $1 LIMIT 1", [token]);
  if (res.rowCount === 0) return null;
  const row = res.rows[0];
  if (
    String(row.status) === "APPROVED_AWAITING_PAYMENT" &&
    row.approval_expires_at &&
    new Date(String(row.approval_expires_at)).getTime() <= nowMs
  ) {
    await pool.query(
      "UPDATE bookings SET status = 'EXPIRED', approval_status = 'EXPIRED' WHERE id = $1",
      [String(row.id)]
    );
  }
  const all = await listBookings({ eventId: String(row.event_id) });
  return all.find((b) => b.id === String(row.id)) ?? null;
}

export async function completeApprovedBookingPayment(token: string): Promise<BookingRecord> {
  const booking = await getApprovalBookingByToken(token);
  if (!booking) throw new Error("Approval link is invalid.");
  if (booking.status === "EXPIRED") {
    throw new Error("Approval payment link has expired.");
  }
  if (booking.status === "CONFIRMED_DEMO") {
    return booking;
  }
  if (booking.status !== "APPROVED_AWAITING_PAYMENT") {
    throw new Error(`Cannot pay for booking in state ${booking.status}.`);
  }
  if (!canTransitionBookingStatus(booking.status, "CONFIRMED_DEMO")) {
    throw new Error("Invalid booking state transition.");
  }

  const paymentAttempt = await executeDemoPaymentAdapter({
    amountInr: booking.totalInr,
    simulateOutcome: "CONFIRMED"
  });

  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    const target = store.bookings.find((b) => b.id === booking.id)!;
    const evt = store.events.find((e) => e.id === target.eventId);
    if (!evt) throw new Error("Event not found.");

    for (const item of target.items) {
      const tier = evt.tiers.find((t) => t.id === item.tierId);
      if (!tier) throw new Error(`Ticket tier ${item.tierId} not found.`);
      if (tier.remainingQuota < item.quantity) {
        throw new Error(`Insufficient quota remaining for ${tier.name}.`);
      }
    }
    for (const item of target.items) {
      const tier = evt.tiers.find((t) => t.id === item.tierId)!;
      tier.remainingQuota -= item.quantity;
    }

    const attendees = store.bookingAttendees.filter((a) => a.bookingId === target.id);
    const tickets: TicketPass[] = [];
    let attCursor = 0;
    for (const item of target.items) {
      for (let i = 0; i < item.quantity; i++) {
        const att = attendees[attCursor++];
        const ticketId = `tkt_${crypto.randomUUID().slice(0, 12)}`;
        const ticketCode = `NLZ-TKT-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
        const tkt: TicketPass = {
          id: ticketId,
          bookingId: target.id,
          eventId: target.eventId,
          eventTitle: target.eventTitle,
          tierId: item.tierId,
          tierName: item.tierName,
          holderName: att?.fullName ?? target.attendeeName,
          holderEmail: att?.email ?? target.attendeeEmail,
          ticketCode,
          qrToken: signQrPayload(ticketId, target.eventId, ticketCode),
          seatLabel: item.seatLabels?.[i] ?? null,
          status: "VALID",
          checkedInAt: null,
          checkedInBy: null
        };
        tickets.push(tkt);
        if (att) att.ticketId = ticketId;
      }
    }

    target.status = "CONFIRMED_DEMO";
    target.paymentStatus = "CONFIRMED";
    target.paymentRef = paymentAttempt.transactionRef;
    store.tickets.push(...tickets);
    return { ...target, attendees, tickets };
  }

  await ensureSchemaBootstrapped(pool);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const bRes = await client.query("SELECT * FROM bookings WHERE id = $1 FOR UPDATE", [booking.id]);
    const bRow = bRes.rows[0];
    if (String(bRow.status) !== "APPROVED_AWAITING_PAYMENT") {
      throw new Error(`Cannot pay for booking in state ${String(bRow.status)}.`);
    }
    if (bRow.approval_expires_at && new Date(String(bRow.approval_expires_at)).getTime() <= Date.now()) {
      await client.query("UPDATE bookings SET status = 'EXPIRED', approval_status = 'EXPIRED' WHERE id = $1", [booking.id]);
      await client.query("COMMIT");
      throw new Error("Approval payment link has expired.");
    }

    for (const item of booking.items) {
      const tRes = await client.query(
        "SELECT id, name, remaining_quota FROM ticket_tiers WHERE id = $1 FOR UPDATE",
        [item.tierId]
      );
      if (tRes.rowCount === 0) throw new Error(`Ticket tier ${item.tierId} not found.`);
      if (Number(tRes.rows[0].remaining_quota) < item.quantity) {
        throw new Error(`Insufficient quota remaining for ${String(tRes.rows[0].name)}.`);
      }
      await client.query("UPDATE ticket_tiers SET remaining_quota = remaining_quota - $1 WHERE id = $2", [
        item.quantity,
        item.tierId
      ]);
    }

    const attRes = await client.query(
      "SELECT * FROM booking_attendees WHERE booking_id = $1 ORDER BY attendee_index ASC",
      [booking.id]
    );
    let attCursor = 0;
    for (const item of booking.items) {
      for (let i = 0; i < item.quantity; i++) {
        const att = attRes.rows[attCursor++];
        const ticketId = `tkt_${crypto.randomUUID().slice(0, 12)}`;
        const ticketCode = `NLZ-TKT-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
        const qrToken = signQrPayload(ticketId, booking.eventId, ticketCode);
        const holderName = att ? String(att.full_name) : booking.attendeeName;
        const holderEmail = att ? String(att.email) : booking.attendeeEmail;
        await client.query(
          `INSERT INTO tickets (id, booking_id, event_id, tier_id, tier_name, holder_name, holder_email, ticket_code, qr_token, seat_label, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'VALID')`,
          [ticketId, booking.id, booking.eventId, item.tierId, item.tierName, holderName, holderEmail, ticketCode, qrToken, item.seatLabels?.[i] ?? null]
        );
        if (att) {
          await client.query("UPDATE booking_attendees SET ticket_id = $1 WHERE id = $2", [ticketId, String(att.id)]);
        }
      }
    }

    await client.query(
      "UPDATE bookings SET status = 'CONFIRMED_DEMO', payment_status = 'CONFIRMED', payment_ref = $2 WHERE id = $1",
      [booking.id, paymentAttempt.transactionRef]
    );
    await client.query(
      `INSERT INTO payment_records (id, booking_id, provider, mode, amount_inr, state, transaction_ref)
       VALUES ($1,$2,'DEMO_SANDBOX','DEMO_NO_CHARGE',$3,'CONFIRMED',$4)`,
      [`pay_${crypto.randomUUID().slice(0, 10)}`, booking.id, booking.totalInr, paymentAttempt.transactionRef]
    );
    await client.query("COMMIT");

    const all = await listBookings({ eventId: booking.eventId });
    return all.find((b) => b.id === booking.id)!;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function issueManualGuestPass(
  rawInput: unknown,
  actor: { id: string; email: string | null; role: string }
): Promise<BookingRecord> {
  const input = manualGuestSchema.parse(rawInput);
  const detail = await getEventDetail(input.eventId);
  if (!detail) throw new Error("Event not found.");
  const { event } = detail;

  const tier = event.tiers.find((t) => t.id === input.tierId);
  if (!tier) throw new Error("Ticket tier not found.");

  const questions = await listEventQuestions(event.id);
  const qRes = validateAttendeeQuestionAnswers(questions, input.answers, input.fullName);
  if (!qRes.valid) {
    throw new Error(qRes.errors.join(" "));
  }

  const emailLower = input.email.trim().toLowerCase();
  const isFree = input.guestType === "VIP" || input.guestType === "COMPLIMENTARY";
  const unitPrice = isFree ? 0 : tier.priceInr;
  const bookingSource =
    input.guestType === "VIP"
      ? "BOX_OFFICE_VIP"
      : input.guestType === "COMPLIMENTARY"
      ? "BOX_OFFICE_COMP"
      : "BOX_OFFICE_WALKIN";
  const paymentChannel = isFree ? "COMPLIMENTARY" : "ORGANISER_CASH";
  const paymentRef = isFree ? `COMP-${Date.now()}` : `CASH-${Date.now()}`;

  const bookingId = `bkg_${crypto.randomUUID().slice(0, 12)}`;
  const refCode = `NLZ-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const ticketId = `tkt_${crypto.randomUUID().slice(0, 12)}`;
  const ticketCode = `NLZ-TKT-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const qrToken = signQrPayload(ticketId, event.id, ticketCode);
  const attId = `att_${crypto.randomUUID().slice(0, 10)}`;
  const nowIso = new Date().toISOString();

  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    const dupTicket = store.tickets.find(
      (t) => t.eventId === event.id && t.holderEmail.toLowerCase() === emailLower && (t.status === "VALID" || t.status === "USED")
    );
    if (dupTicket) {
      throw new Error(`Guest ${emailLower} already holds an active pass (${dupTicket.ticketCode}) for this event.`);
    }
    if (tier.remainingQuota < 1) {
      throw new Error(`Insufficient quota remaining for ${tier.name}.`);
    }
    tier.remainingQuota -= 1;

    const ticket: TicketPass = {
      id: ticketId,
      bookingId,
      eventId: event.id,
      eventTitle: event.title,
      tierId: tier.id,
      tierName: tier.name,
      holderName: input.fullName,
      holderEmail: emailLower,
      ticketCode,
      qrToken,
      seatLabel: null,
      status: "VALID",
      checkedInAt: null,
      checkedInBy: null
    };
    const attendee: BookingAttendeeRecord = {
      id: attId,
      bookingId,
      eventId: event.id,
      tierId: tier.id,
      attendeeIndex: 0,
      fullName: input.fullName,
      email: emailLower,
      phone: input.phone ?? null,
      answers: qRes.sanitized,
      ticketId,
      createdAt: nowIso
    };
    const booking: BookingRecord = {
      id: bookingId,
      referenceCode: refCode,
      userId: null,
      organizationId: event.organizationId ?? "org-nightlifez-originals",
      attendeeEmail: emailLower,
      attendeeName: input.fullName,
      eventId: event.id,
      eventSlug: event.slug,
      eventTitle: event.title,
      venueName: event.venueName,
      dateLabel: event.dateLabel,
      offerCode: null,
      subtotalInr: unitPrice,
      discountInr: 0,
      convenienceFeeInr: 0,
      gstInr: 0,
      totalInr: unitPrice,
      status: "CONFIRMED_DEMO",
      paymentMode: "DEMO_NO_CHARGE",
      paymentStatus: "CONFIRMED",
      paymentRef,
      paymentChannel,
      bookingSource,
      approvalStatus: "NOT_REQUIRED",
      createdAt: nowIso,
      items: [{ tierId: tier.id, tierName: tier.name, quantity: 1, unitPriceInr: unitPrice, seatLabels: [] }],
      attendees: [attendee],
      tickets: [ticket]
    };

    store.bookings.unshift(booking);
    store.bookingAttendees.push(attendee);
    store.tickets.push(ticket);

    await recordAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "MANUAL_GUEST_CREATED",
      targetType: "booking",
      targetId: bookingId,
      afterJson: { eventId: event.id, email: emailLower, guestType: input.guestType, ticketCode }
    });
    return booking;
  }

  await ensureSchemaBootstrapped(pool);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const dupRes = await client.query(
      "SELECT ticket_code FROM tickets WHERE event_id = $1 AND LOWER(holder_email) = LOWER($2) AND status IN ('VALID','USED') LIMIT 1",
      [event.id, emailLower]
    );
    if ((dupRes.rowCount ?? 0) > 0) {
      throw new Error(`Guest ${emailLower} already holds an active pass (${String(dupRes.rows[0].ticket_code)}) for this event.`);
    }

    const tRes = await client.query(
      "SELECT id, name, remaining_quota FROM ticket_tiers WHERE id = $1 AND event_id = $2 FOR UPDATE",
      [tier.id, event.id]
    );
    if (tRes.rowCount === 0) throw new Error("Ticket tier not found.");
    if (Number(tRes.rows[0].remaining_quota) < 1) {
      throw new Error(`Insufficient quota remaining for ${tier.name}.`);
    }
    await client.query("UPDATE ticket_tiers SET remaining_quota = remaining_quota - 1 WHERE id = $1", [tier.id]);

    await client.query(
      `INSERT INTO bookings (
         id, reference_code, user_id, organization_id, attendee_email, attendee_name,
         event_id, event_slug, event_title, venue_name, date_label,
         subtotal_inr, discount_inr, convenience_fee_inr, gst_inr, total_inr,
         status, payment_mode, payment_status, payment_ref, approval_status, booking_source, payment_channel
       ) VALUES ($1,$2,NULL,$3,$4,$5,$6,$7,$8,$9,$10,$11,0,0,0,$11,'CONFIRMED_DEMO','DEMO_NO_CHARGE','CONFIRMED',$12,'NOT_REQUIRED',$13,$14)`,
      [
        bookingId,
        refCode,
        event.organizationId ?? "org-nightlifez-originals",
        emailLower,
        input.fullName,
        event.id,
        event.slug,
        event.title,
        event.venueName,
        event.dateLabel,
        unitPrice,
        paymentRef,
        bookingSource,
        paymentChannel
      ]
    );
    await client.query(
      "INSERT INTO booking_items (booking_id, tier_id, tier_name, quantity, unit_price_inr) VALUES ($1,$2,$3,1,$4)",
      [bookingId, tier.id, tier.name, unitPrice]
    );
    await client.query(
      `INSERT INTO tickets (id, booking_id, event_id, tier_id, tier_name, holder_name, holder_email, ticket_code, qr_token, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'VALID')`,
      [ticketId, bookingId, event.id, tier.id, tier.name, input.fullName, emailLower, ticketCode, qrToken]
    );
    await client.query(
      `INSERT INTO booking_attendees (id, booking_id, event_id, tier_id, attendee_index, full_name, email, phone, answers_json, ticket_id)
       VALUES ($1,$2,$3,$4,0,$5,$6,$7,$8::jsonb,$9)`,
      [attId, bookingId, event.id, tier.id, input.fullName, emailLower, input.phone ?? null, JSON.stringify(qRes.sanitized), ticketId]
    );
    await client.query(
      `INSERT INTO payment_records (id, booking_id, provider, mode, amount_inr, state, transaction_ref)
       VALUES ($1,$2,$3,'DEMO_NO_CHARGE',$4,'CONFIRMED',$5)`,
      [`pay_${crypto.randomUUID().slice(0, 10)}`, bookingId, paymentChannel, unitPrice, paymentRef]
    );

    await client.query("COMMIT");
    await recordAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "MANUAL_GUEST_CREATED",
      targetType: "booking",
      targetId: bookingId,
      afterJson: { eventId: event.id, email: emailLower, guestType: input.guestType, ticketCode }
    });
    const all = await listBookings({ eventId: event.id });
    return all.find((b) => b.id === bookingId)!;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function importCsvGuestList(
  eventId: string,
  rawInput: unknown,
  actor: { id: string; email: string | null; role: string }
): Promise<{
  importedCount: number;
  skippedDuplicates: { lineNumber: number; email: string; reason: string }[];
  errors: { lineNumber: number; message: string }[];
  bookings: BookingRecord[];
}> {
  const input = csvImportGuestsSchema.parse(rawInput);
  const detail = await getEventDetail(eventId);
  if (!detail) throw new Error("Event not found.");
  const { event } = detail;

  const questions = await listEventQuestions(event.id);
  const parsed = parseCsvGuestRows(input.csvText, questions);
  const skippedDuplicates: { lineNumber: number; email: string; reason: string }[] = [];
  const errors = [...parsed.errors];
  const seenEmailsInBatch = new Set<string>();
  const importedBookings: BookingRecord[] = [];

  for (const row of parsed.rows) {
    if (seenEmailsInBatch.has(row.email)) {
      skippedDuplicates.push({
        lineNumber: row.lineNumber,
        email: row.email,
        reason: "Duplicate email within CSV import batch"
      });
      continue;
    }

    const matchedTier =
      (row.tierHint
        ? event.tiers.find(
            (t) => t.id === row.tierHint || t.name.toLowerCase() === row.tierHint!.toLowerCase()
          )
        : null) ??
      (input.defaultTierId ? event.tiers.find((t) => t.id === input.defaultTierId) : null) ??
      event.tiers[0];

    if (!matchedTier) {
      errors.push({ lineNumber: row.lineNumber, message: `No matching ticket tier for line ${row.lineNumber}.` });
      continue;
    }

    try {
      const booking = await issueManualGuestPass(
        {
          eventId: event.id,
          tierId: matchedTier.id,
          fullName: row.fullName,
          email: row.email,
          phone: row.phone,
          guestType: row.guestTypeHint ?? input.defaultGuestType,
          answers: row.rawAnswers
        },
        actor
      );
      seenEmailsInBatch.add(row.email);
      importedBookings.push(booking);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to import row";
      if (msg.includes("already holds an active pass")) {
        skippedDuplicates.push({ lineNumber: row.lineNumber, email: row.email, reason: msg });
      } else {
        errors.push({ lineNumber: row.lineNumber, message: `Line ${row.lineNumber}: ${msg}` });
      }
    }
  }

  await recordAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: "GUEST_LIST_IMPORTED",
    targetType: "event",
    targetId: event.id,
    afterJson: {
      importedCount: importedBookings.length,
      duplicateCount: skippedDuplicates.length,
      errorCount: errors.length
    }
  });

  return {
    importedCount: importedBookings.length,
    skippedDuplicates,
    errors,
    bookings: importedBookings
  };
}

export async function exportEventGuestList(eventId: string) {
  const detail = await getEventDetail(eventId);
  if (!detail) throw new Error("Event not found.");
  const [bookings, questions] = await Promise.all([
    listBookings({ eventId }),
    listEventQuestions(eventId)
  ]);

  const rows: {
    referenceCode: string;
    bookingStatus: string;
    bookingSource: string;
    paymentChannel: string;
    attendeeName: string;
    attendeeEmail: string;
    attendeePhone: string;
    tierName: string;
    ticketCode: string;
    ticketStatus: string;
    checkedInAt: string;
    answers: Record<string, string | number | boolean | string[]>;
  }[] = [];

  for (const b of bookings) {
    const attendees = b.attendees ?? [];
    const tickets = b.tickets ?? [];
    const count = Math.max(tickets.length, attendees.length, 1);
    for (let i = 0; i < count; i++) {
      const att = attendees[i];
      const tkt = tickets[i];
      rows.push({
        referenceCode: b.referenceCode,
        bookingStatus: b.status,
        bookingSource: b.bookingSource ?? "ONLINE",
        paymentChannel: b.paymentChannel ?? "DEMO_SANDBOX",
        attendeeName: att?.fullName ?? tkt?.holderName ?? b.attendeeName,
        attendeeEmail: att?.email ?? tkt?.holderEmail ?? b.attendeeEmail,
        attendeePhone: att?.phone ?? "",
        tierName: tkt?.tierName ?? b.items[0]?.tierName ?? "",
        ticketCode: tkt?.ticketCode ?? "PENDING",
        ticketStatus: tkt?.status ?? b.status,
        checkedInAt: tkt?.checkedInAt ?? "",
        answers: att?.answers ?? {}
      });
    }
  }

  const header = [
    "Reference",
    "Booking Status",
    "Source",
    "Payment Channel",
    "Guest Name",
    "Guest Email",
    "Phone",
    "Tier",
    "Ticket Code",
    "Ticket Status",
    "Checked In At",
    ...questions.map((q) => q.label)
  ];

  const csvLines = [
    header.map((h) => `"${h.replace(/"/g, '""')}"`).join(","),
    ...rows.map((r) =>
      [
        r.referenceCode,
        r.bookingStatus,
        r.bookingSource,
        r.paymentChannel,
        r.attendeeName,
        r.attendeeEmail,
        r.attendeePhone,
        r.tierName,
        r.ticketCode,
        r.ticketStatus,
        r.checkedInAt,
        ...questions.map((q) => {
          const val = r.answers[q.id];
          return Array.isArray(val) ? val.join("; ") : val === undefined ? "" : String(val);
        })
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",")
    )
  ];

  return {
    event: detail.event,
    questions,
    rows,
    csv: csvLines.join("\n")
  };
}
