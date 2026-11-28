import crypto from "node:crypto";
import {
  broadcastNotificationSchema,
  canTransitionEventStatus,
  createOrganizationSchema,
  evaluateTicketScanEligibility,
  featureFlagSchema,
  inviteStaffSchema,
  moderationActionSchema,
  offlineScanSyncSchema,
  settlementCreateSchema,
  supportCaseCreateSchema,
  supportCaseUpdateSchema,
  updateVenueSchema,
  upsertEventSchema,
  upsertOfferSchema,
  verifyTicketScanSchema,
  type FeatureFlag,
  type LedgerEntry,
  type Organization,
  type PlatformNotification,
  type PulseEvent,
  type RoleAssignmentRecord,
  type ScanResultCode,
  type SettlementBatch,
  type StaffInvitation,
  type SupportCase,
  type TicketPass,
  type TicketScanLog,
  type Venue
} from "@nightlifez/shared";
import { verifyQrPayload } from "./auth.ts";
import { recordAuditLog } from "./authStore.ts";
import { getPool } from "./db.ts";
import { getMemoryStore } from "./memoryStore.ts";
import { getEventDetail, listBookings, listCitiesAndEvents, listRefundRequests, listVenues } from "./repository.ts";

export async function listOrganizations(scopeOrgIds?: string[]): Promise<Organization[]> {
  const pool = getPool();
  if (!pool) {
    const orgs = getMemoryStore().organizations;
    if (!scopeOrgIds) return orgs;
    return orgs.filter((o) => scopeOrgIds.includes(o.id));
  }
  const res = scopeOrgIds
    ? await pool.query("SELECT * FROM organizations WHERE id = ANY($1::text[]) ORDER BY created_at DESC", [scopeOrgIds])
    : await pool.query("SELECT * FROM organizations ORDER BY created_at DESC");
  return res.rows.map((r) => ({
    id: String(r.id),
    slug: String(r.slug),
    name: String(r.name),
    legalName: String(r.legal_name),
    contactEmail: String(r.contact_email),
    citySlug: String(r.city_slug),
    approvalStatus: r.approval_status as Organization["approvalStatus"],
    rating: Number(r.rating),
    tenureLabel: String(r.tenure_label),
    bioIntro: r.bio_intro ? String(r.bio_intro) : null,
    coverArtworkUrl: r.cover_artwork_url ? String(r.cover_artwork_url) : null,
    instagramHandle: r.instagram_handle ? String(r.instagram_handle) : null,
    publicContactPhone: r.public_contact_phone ? String(r.public_contact_phone) : null,
    publicContactEmail: r.public_contact_email ? String(r.public_contact_email) : null,
    socialLinks: (r.social_links_json as Organization["socialLinks"]) ?? [],
    promotedListingsEnabled: Boolean(r.promoted_listings_enabled),
    promotedEventSlugs: (r.promoted_event_slugs_json as string[]) ?? [],
    createdBy: r.created_by ? String(r.created_by) : null,
    createdAt: new Date(String(r.created_at)).toISOString()
  }));
}

export async function createOrganization(
  rawInput: unknown,
  actor: { id: string; email: string | null }
): Promise<Organization> {
  const input = createOrganizationSchema.parse(rawInput);
  const slugBase = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const org: Organization = {
    id: `org_${crypto.randomUUID().slice(0, 10)}`,
    slug: `${slugBase}-${crypto.randomBytes(2).toString("hex")}`,
    name: input.name,
    legalName: input.legalName,
    contactEmail: input.contactEmail,
    citySlug: input.citySlug,
    approvalStatus: "PENDING",
    rating: 85,
    tenureLabel: "New partner",
    createdBy: actor.id,
    createdAt: new Date().toISOString()
  };

  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    store.organizations.unshift(org);
    store.roleAssignments.push({
      id: `ra_${crypto.randomUUID().slice(0, 10)}`,
      userId: actor.id,
      role: "organiser_owner",
      organizationId: org.id,
      venueSlug: null,
      eventId: null,
      grantedBy: actor.id,
      createdAt: org.createdAt
    });
    return org;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO organizations (id, slug, name, legal_name, contact_email, city_slug, approval_status, rating, tenure_label, created_by, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,'PENDING',$7,$8,$9,$10)`,
      [org.id, org.slug, org.name, org.legalName, org.contactEmail, org.citySlug, org.rating, org.tenureLabel, actor.id, org.createdAt]
    );
    await client.query(
      `INSERT INTO role_assignments (id, user_id, role, organization_id, granted_by)
       VALUES ($1,$2,'organiser_owner',$3,$2)`,
      [`ra_${crypto.randomUUID().slice(0, 10)}`, actor.id, org.id]
    );
    await client.query("COMMIT");
    return org;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function upsertOrganiserEvent(
  rawInput: unknown,
  actor: { id: string; email: string | null; role: string }
): Promise<PulseEvent> {
  const input = upsertEventSchema.parse(rawInput);
  const venues = await listVenues();
  const venue = venues.find((v) => v.slug === input.venueSlug);
  if (!venue) throw new Error("Selected venue not found.");
  const orgs = await listOrganizations([input.organizationId]);
  const org = orgs[0];
  if (!org) throw new Error("Organization not found.");

  const slugBase = input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const isNew = !input.id;
  const eventId = input.id || `evt_${crypto.randomUUID().slice(0, 10)}`;
  const slug = isNew ? `${slugBase}-${crypto.randomBytes(2).toString("hex")}` : "";

  const tiers = input.tiers.map((t, idx) => ({
    id: t.id || `tier_${eventId}_${idx + 1}`,
    sectionId: t.sectionId,
    name: t.name,
    description: t.description,
    priceInr: t.priceInr,
    totalQuota: t.totalQuota,
    remainingQuota: t.totalQuota,
    maxPerOrder: t.maxPerOrder,
    salesPhase: t.salesPhase ?? input.activePhase ?? "GENERAL_SALE"
  }));

  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    if (!isNew) {
      const existing = store.events.find((e) => e.id === eventId);
      if (!existing) throw new Error("Event not found.");
      const nextStatus = input.lifecycleStatus ?? existing.lifecycleStatus ?? "PUBLISHED";
      if (!canTransitionEventStatus(existing.lifecycleStatus ?? "PUBLISHED", nextStatus)) {
        throw new Error(`Invalid event status transition from ${existing.lifecycleStatus} to ${nextStatus}.`);
      }
      const before = { title: existing.title, lifecycleStatus: existing.lifecycleStatus };
      existing.title = input.title;
      existing.category = input.category;
      existing.citySlug = input.citySlug;
      existing.venueSlug = venue.slug;
      existing.venueName = venue.name;
      existing.startsAt = input.startsAt;
      existing.endsAt = input.endsAt;
      existing.dateLabel = input.dateLabel;
      existing.summary = input.summary;
      existing.ageLimit = input.ageLimit;
      existing.language = input.language;
      existing.durationLabel = input.durationLabel;
      existing.activePhase = input.activePhase ?? existing.activePhase;
      existing.lifecycleStatus = nextStatus;
      if (input.visibility !== undefined) existing.visibility = input.visibility;
      if (input.approvalRequired !== undefined) existing.approvalRequired = input.approvalRequired;
      if (input.goalTickets !== undefined) existing.goalTickets = input.goalTickets;
      if (input.goalRevenueInr !== undefined) existing.goalRevenueInr = input.goalRevenueInr;
      if (input.maxCapacity !== undefined) existing.maxCapacity = input.maxCapacity;
      existing.tiers = tiers.map((nt) => {
        const old = existing.tiers.find((ot) => ot.id === nt.id);
        return old ? { ...nt, remainingQuota: Math.min(nt.totalQuota, old.remainingQuota) } : nt;
      });
      await recordAuditLog({
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: "EVENT_UPDATED",
        targetType: "event",
        targetId: eventId,
        beforeJson: before,
        afterJson: { title: existing.title, lifecycleStatus: existing.lifecycleStatus }
      });
      return existing;
    }

    const newEvent: PulseEvent = {
      id: eventId,
      slug,
      title: input.title,
      category: input.category,
      citySlug: input.citySlug,
      venueSlug: venue.slug,
      venueName: venue.name,
      organizationId: org.id,
      lifecycleStatus: input.lifecycleStatus ?? "PUBLISHED",
      visibility: input.visibility ?? "PUBLIC",
      approvalRequired: input.approvalRequired ?? false,
      clonedFromEventId: null,
      goalTickets: input.goalTickets ?? null,
      goalRevenueInr: input.goalRevenueInr ?? null,
      maxCapacity: input.maxCapacity ?? null,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      dateLabel: input.dateLabel,
      artworkUrl: "/art/evt-solstice.svg",
      ageLimit: input.ageLimit,
      language: input.language,
      durationLabel: input.durationLabel,
      distanceKm: venue.distanceKm ?? 5,
      organizerName: org.name,
      organizerRating: org.rating,
      organizerTenure: org.tenureLabel,
      summary: input.summary,
      highlights: [{ title: "Organiser Showcase", body: "Verified NIGHTLIFEZ organiser listing." }],
      facilities: venue.facilities,
      policies: ["Valid ID required at entry", "Tickets non-transferable after check-in"],
      lineup: [],
      salesTimeline: [
        {
          phase: input.activePhase ?? "GENERAL_SALE",
          label: "Sale Live",
          startsAt: new Date().toISOString(),
          state: "active"
        }
      ],
      activePhase: input.activePhase ?? "GENERAL_SALE",
      partialReservePercent: null,
      isFeatured: false,
      accentColor: "#5B3DF5",
      tiers,
      offers: []
    };
    store.events.unshift(newEvent);
    await recordAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "EVENT_CREATED",
      targetType: "event",
      targetId: eventId,
      afterJson: { title: newEvent.title, slug: newEvent.slug }
    });
    return newEvent;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (!isNew) {
      const existingRes = await client.query("SELECT * FROM events WHERE id = $1 FOR UPDATE", [eventId]);
      if (existingRes.rowCount === 0) throw new Error("Event not found.");
      const existing = existingRes.rows[0];
      const prevStatus = (existing.lifecycle_status as PulseEvent["lifecycleStatus"]) ?? "PUBLISHED";
      const nextStatus = input.lifecycleStatus ?? prevStatus;
      if (!canTransitionEventStatus(prevStatus, nextStatus)) {
        throw new Error(`Invalid event status transition from ${prevStatus} to ${nextStatus}.`);
      }
      await client.query(
        `UPDATE events SET
           title = $2, category = $3, city_slug = $4, venue_slug = $5, venue_name = $6,
           starts_at = $7, ends_at = $8, date_label = $9, summary = $10, age_limit = $11,
           language = $12, duration_label = $13, active_phase = $14, lifecycle_status = $15,
           visibility = COALESCE($16, visibility), approval_required = COALESCE($17, approval_required),
           goal_tickets = COALESCE($18, goal_tickets), goal_revenue_inr = COALESCE($19, goal_revenue_inr),
           max_capacity = COALESCE($20, max_capacity),
           updated_at = NOW()
         WHERE id = $1`,
        [
          eventId,
          input.title,
          input.category,
          input.citySlug,
          venue.slug,
          venue.name,
          input.startsAt,
          input.endsAt,
          input.dateLabel,
          input.summary,
          input.ageLimit ?? null,
          input.language ?? null,
          input.durationLabel ?? null,
          input.activePhase ?? String(existing.active_phase),
          nextStatus,
          input.visibility ?? null,
          input.approvalRequired ?? null,
          input.goalTickets ?? null,
          input.goalRevenueInr ?? null,
          input.maxCapacity ?? null
        ]
      );
    } else {
      await client.query(
        `INSERT INTO events (
           id, slug, title, category, city_slug, venue_slug, venue_name,
           starts_at, ends_at, date_label, artwork_url, age_limit, language,
           duration_label, distance_km, organization_id, lifecycle_status,
           visibility, approval_required,
           organizer_name, organizer_rating, organizer_tenure, summary,
           highlights_json, facilities_json, policies_json, lineup_json,
           sales_timeline_json, active_phase, partial_reserve_percent,
           is_featured, accent_color, created_by
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'/art/evt-solstice.svg',$11,$12,$13,$14,$15,$16,
           $17,$18,$19,$20,$21,$22,$23::jsonb,$24::jsonb,$25::jsonb,'[]'::jsonb,$26::jsonb,$27,NULL,FALSE,'#5B3DF5',$28
         )`,
        [
          eventId,
          slug,
          input.title,
          input.category,
          input.citySlug,
          venue.slug,
          venue.name,
          input.startsAt,
          input.endsAt,
          input.dateLabel,
          input.ageLimit ?? null,
          input.language ?? null,
          input.durationLabel ?? null,
          venue.distanceKm ?? 5,
          org.id,
          input.lifecycleStatus ?? "PUBLISHED",
          input.visibility ?? "PUBLIC",
          input.approvalRequired ?? false,
          org.name,
          org.rating,
          org.tenureLabel,
          input.summary,
          JSON.stringify([{ title: "Organiser Showcase", body: "Verified NIGHTLIFEZ organiser listing." }]),
          JSON.stringify(venue.facilities),
          JSON.stringify(["Valid ID required at entry"]),
          JSON.stringify([{ phase: input.activePhase ?? "GENERAL_SALE", label: "Sale Live", startsAt: new Date().toISOString(), state: "active" }]),
          input.activePhase ?? "GENERAL_SALE",
          actor.id
        ]
      );
    }

    for (const tier of tiers) {
      await client.query(
        `INSERT INTO ticket_tiers (id, event_id, section_id, name, description, price_inr, total_quota, remaining_quota, max_per_order, sales_phase)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO UPDATE SET
           section_id = EXCLUDED.section_id,
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           price_inr = EXCLUDED.price_inr,
           total_quota = EXCLUDED.total_quota,
           max_per_order = EXCLUDED.max_per_order,
           sales_phase = EXCLUDED.sales_phase`,
        [
          tier.id,
          eventId,
          tier.sectionId,
          tier.name,
          tier.description,
          tier.priceInr,
          tier.totalQuota,
          tier.remainingQuota,
          tier.maxPerOrder,
          tier.salesPhase
        ]
      );
    }

    await client.query("COMMIT");
    await recordAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: isNew ? "EVENT_CREATED" : "EVENT_UPDATED",
      targetType: "event",
      targetId: eventId,
      afterJson: { title: input.title, lifecycleStatus: input.lifecycleStatus ?? "PUBLISHED" }
    });
    const created = await getEventDetail(eventId);
    if (!created) throw new Error("Failed to load event after save.");
    return created.event;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function upsertEventOffer(rawInput: unknown) {
  const input = upsertOfferSchema.parse(rawInput);
  const detail = await getEventDetail(input.eventId);
  if (!detail) throw new Error("Event not found.");
  const offer = {
    id: `off_${crypto.randomUUID().slice(0, 10)}`,
    code: input.code,
    title: input.title,
    description: input.description,
    kind: input.kind,
    discountValue: input.discountValue,
    maxDiscountInr: input.maxDiscountInr ?? null,
    minOrderInr: input.minOrderInr,
    minQty: input.minQty,
    expiresAt: input.expiresAt,
    isActive: true
  };

  const pool = getPool();
  if (!pool) {
    const evt = getMemoryStore().events.find((e) => e.id === detail.event.id);
    if (evt) evt.offers.push(offer);
    return offer;
  }
  await pool.query(
    `INSERT INTO offers (id, event_id, organization_id, code, title, description, kind, discount_value, max_discount_inr, min_order_inr, min_qty, expires_at, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,TRUE)`,
    [
      offer.id,
      detail.event.id,
      detail.event.organizationId ?? null,
      offer.code,
      offer.title,
      offer.description,
      offer.kind,
      offer.discountValue,
      offer.maxDiscountInr,
      offer.minOrderInr,
      offer.minQty,
      offer.expiresAt
    ]
  );
  return offer;
}

export async function inviteStaffMember(
  rawInput: unknown,
  actor: { id: string; email: string | null; role: string }
): Promise<StaffInvitation> {
  const input = inviteStaffSchema.parse(rawInput);
  const invite: StaffInvitation = {
    id: `inv_${crypto.randomUUID().slice(0, 10)}`,
    email: input.email.toLowerCase(),
    role: input.role,
    organizationId: input.organizationId ?? null,
    venueSlug: input.venueSlug ?? null,
    eventId: input.eventId ?? null,
    status: "PENDING",
    invitedBy: actor.id,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  };
  const token = crypto.randomBytes(16).toString("hex");

  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    store.staffInvitations.unshift(invite);
    const existingUser = store.users.find((u) => u.email?.toLowerCase() === invite.email);
    if (existingUser) {
      invite.status = "ACCEPTED";
      store.roleAssignments.push({
        id: `ra_${crypto.randomUUID().slice(0, 10)}`,
        userId: existingUser.id,
        role: invite.role,
        organizationId: invite.organizationId,
        venueSlug: invite.venueSlug,
        eventId: invite.eventId,
        grantedBy: actor.id,
        createdAt: invite.createdAt
      });
    }
    return invite;
  }

  await pool.query(
    `INSERT INTO staff_invitations (id, email, role, organization_id, venue_slug, event_id, token, status, invited_by, created_at, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING',$8,$9,$10)`,
    [invite.id, invite.email, invite.role, invite.organizationId, invite.venueSlug, invite.eventId, token, actor.id, invite.createdAt, invite.expiresAt]
  );
  const existingUser = await pool.query("SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1", [invite.email]);
  if ((existingUser.rowCount ?? 0) > 0) {
    const uid = String(existingUser.rows[0].id);
    await pool.query(
      `INSERT INTO role_assignments (id, user_id, role, organization_id, venue_slug, event_id, granted_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [`ra_${crypto.randomUUID().slice(0, 10)}`, uid, invite.role, invite.organizationId, invite.venueSlug, invite.eventId, actor.id]
    );
    await pool.query("UPDATE staff_invitations SET status = 'ACCEPTED' WHERE id = $1", [invite.id]);
    invite.status = "ACCEPTED";
  }
  return invite;
}

export async function listStaffInvitations(organizationId?: string): Promise<StaffInvitation[]> {
  const pool = getPool();
  if (!pool) {
    const list = getMemoryStore().staffInvitations;
    return organizationId ? list.filter((i) => i.organizationId === organizationId) : list;
  }
  const res = organizationId
    ? await pool.query("SELECT * FROM staff_invitations WHERE organization_id = $1 ORDER BY created_at DESC", [organizationId])
    : await pool.query("SELECT * FROM staff_invitations ORDER BY created_at DESC");
  return res.rows.map((r) => ({
    id: String(r.id),
    email: String(r.email),
    role: r.role as StaffInvitation["role"],
    organizationId: r.organization_id ? String(r.organization_id) : null,
    venueSlug: r.venue_slug ? String(r.venue_slug) : null,
    eventId: r.event_id ? String(r.event_id) : null,
    status: r.status as StaffInvitation["status"],
    invitedBy: String(r.invited_by),
    createdAt: new Date(String(r.created_at)).toISOString(),
    expiresAt: new Date(String(r.expires_at)).toISOString()
  }));
}

export async function updateVenueDetails(
  rawInput: unknown,
  actor: { id: string; email: string | null; role: string }
): Promise<Venue> {
  const input = updateVenueSchema.parse(rawInput);
  const venues = await listVenues();
  const current = venues.find((v) => v.slug === input.slug);
  if (!current) throw new Error("Venue not found.");

  const pool = getPool();
  if (!pool) {
    const v = getMemoryStore().venues.find((x) => x.slug === input.slug)!;
    if (input.headline !== undefined) v.headline = input.headline;
    if (input.summary !== undefined) v.summary = input.summary;
    if (input.openStatusLabel !== undefined) v.openStatusLabel = input.openStatusLabel;
    if (input.facilities !== undefined) v.facilities = input.facilities;
    if (input.policies !== undefined) v.policies = input.policies;
    if (input.sections !== undefined) v.sections = input.sections;
    await recordAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "VENUE_UPDATED",
      targetType: "venue",
      targetId: v.slug,
      afterJson: input
    });
    return v;
  }

  await pool.query(
    `UPDATE venues SET
       headline = COALESCE($2, headline),
       summary = COALESCE($3, summary),
       open_status_label = COALESCE($4, open_status_label),
       facilities_json = COALESCE($5::jsonb, facilities_json),
       policies_json = COALESCE($6::jsonb, policies_json),
       sections_json = COALESCE($7::jsonb, sections_json)
     WHERE slug = $1`,
    [
      input.slug,
      input.headline ?? null,
      input.summary ?? null,
      input.openStatusLabel ?? null,
      input.facilities ? JSON.stringify(input.facilities) : null,
      input.policies ? JSON.stringify(input.policies) : null,
      input.sections ? JSON.stringify(input.sections) : null
    ]
  );
  await recordAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: "VENUE_UPDATED",
    targetType: "venue",
    targetId: input.slug,
    afterJson: input
  });
  const updatedList = await listVenues();
  return updatedList.find((v) => v.slug === input.slug)!;
}

export async function listStaffAssignedEvents(assignments: readonly RoleAssignmentRecord[]): Promise<PulseEvent[]> {
  const { events } = await listCitiesAndEvents({}, { includeNonPublished: true });
  const isPlatform = assignments.some((a) => a.role.startsWith("platform_"));
  if (isPlatform) return events;

  const eventIds = new Set(assignments.map((a) => a.eventId).filter(Boolean) as string[]);
  const orgIds = new Set(
    assignments
      .filter((a) => !a.eventId && (a.role === "organiser_owner" || a.role === "organiser_admin" || a.role === "event_manager"))
      .map((a) => a.organizationId)
      .filter(Boolean) as string[]
  );
  const venueSlugs = new Set(
    assignments.filter((a) => !a.eventId && a.role === "venue_manager").map((a) => a.venueSlug).filter(Boolean) as string[]
  );

  return events.filter(
    (e) =>
      eventIds.has(e.id) ||
      (e.organizationId && orgIds.has(e.organizationId)) ||
      venueSlugs.has(e.venueSlug)
  );
}

export async function verifyAndCheckInTicket(
  rawInput: unknown,
  actor: { id: string; email: string | null }
): Promise<{
  valid: boolean;
  result: ScanResultCode;
  message: string;
  ticket: TicketPass | null;
  scanLog: TicketScanLog;
}> {
  const input = verifyTicketScanSchema.parse(rawInput);
  const clientScanId = input.clientScanId ?? `scan_${crypto.randomUUID().slice(0, 10)}`;
  const scannedAt = input.scannedAt ?? new Date().toISOString();
  const detail = await getEventDetail(input.eventId);
  const eventEndsAt = detail?.event.endsAt ?? null;

  let codeLookup = input.ticketCodeOrToken.trim();
  if (codeLookup.startsWith("NLZ1.")) {
    const verified = verifyQrPayload(codeLookup);
    if (!verified.validFormat || !verified.ticketCode) {
      const scanLog: TicketScanLog = {
        id: `scn_${crypto.randomUUID().slice(0, 12)}`,
        ticketId: null,
        ticketCode: codeLookup.slice(0, 40),
        eventId: input.eventId,
        scannedBy: actor.id,
        deviceId: input.deviceId,
        scanMode: input.scanMode,
        clientScanId,
        result: "INVALID",
        message: "Tampered or invalid signed QR token.",
        scannedAt,
        syncedAt: new Date().toISOString()
      };
      return { valid: false, result: "INVALID", message: scanLog.message, ticket: null, scanLog };
    }
    codeLookup = verified.ticketCode;
  }

  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    const dupLog = store.scanLogs.find(
      (l) => l.deviceId === input.deviceId && l.clientScanId === clientScanId
    );
    if (dupLog) {
      const t = dupLog.ticketId ? store.tickets.find((x) => x.id === dupLog.ticketId) ?? null : null;
      return { valid: dupLog.result === "VALID", result: dupLog.result, message: dupLog.message, ticket: t, scanLog: dupLog };
    }

    const ticket =
      store.tickets.find(
        (t) => t.ticketCode.toLowerCase() === codeLookup.toLowerCase() || t.qrToken === input.ticketCodeOrToken.trim()
      ) ?? null;

    const evalRes = evaluateTicketScanEligibility({
      ticket,
      expectedEventId: input.eventId,
      eventEndsAt
    });

    let resultCode: ScanResultCode = evalRes.result;
    let message = evalRes.message;
    let valid = evalRes.valid;

    if (valid && ticket) {
      ticket.status = "USED";
      ticket.checkedInAt = scannedAt;
      ticket.checkedInBy = actor.email;
    } else if (resultCode === "ALREADY_USED" && input.scanMode === "OFFLINE_SYNC") {
      resultCode = "CONFLICT";
      message = `Offline duplicate conflict: ${message}`;
      valid = false;
    }

    const scanLog: TicketScanLog = {
      id: `scn_${crypto.randomUUID().slice(0, 12)}`,
      ticketId: ticket?.id ?? null,
      ticketCode: ticket?.ticketCode ?? codeLookup,
      eventId: input.eventId,
      scannedBy: actor.id,
      deviceId: input.deviceId,
      scanMode: input.scanMode,
      clientScanId,
      result: resultCode,
      message,
      scannedAt,
      syncedAt: new Date().toISOString()
    };
    store.scanLogs.unshift(scanLog);
    return { valid, result: resultCode, message, ticket, scanLog };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existingLog = await client.query(
      "SELECT * FROM ticket_scan_logs WHERE device_id = $1 AND client_scan_id = $2 LIMIT 1",
      [input.deviceId, clientScanId]
    );
    if ((existingLog.rowCount ?? 0) > 0) {
      const r = existingLog.rows[0];
      await client.query("COMMIT");
      const scanLog: TicketScanLog = {
        id: String(r.id),
        ticketId: r.ticket_id ? String(r.ticket_id) : null,
        ticketCode: String(r.ticket_code),
        eventId: String(r.event_id),
        scannedBy: String(r.scanned_by),
        deviceId: String(r.device_id),
        scanMode: r.scan_mode as TicketScanLog["scanMode"],
        clientScanId: String(r.client_scan_id),
        result: r.result as ScanResultCode,
        message: String(r.message),
        scannedAt: new Date(String(r.scanned_at)).toISOString(),
        syncedAt: r.synced_at ? new Date(String(r.synced_at)).toISOString() : null
      };
      return { valid: scanLog.result === "VALID", result: scanLog.result, message: scanLog.message, ticket: null, scanLog };
    }

    const tRes = await client.query(
      "SELECT * FROM tickets WHERE LOWER(ticket_code) = LOWER($1) OR qr_token = $2 FOR UPDATE",
      [codeLookup, input.ticketCodeOrToken.trim()]
    );
    const ticketRow = tRes.rows[0] ?? null;
    const ticket: TicketPass | null = ticketRow
      ? {
          id: String(ticketRow.id),
          bookingId: String(ticketRow.booking_id),
          eventId: String(ticketRow.event_id),
          tierId: String(ticketRow.tier_id),
          tierName: String(ticketRow.tier_name),
          holderName: String(ticketRow.holder_name),
          holderEmail: String(ticketRow.holder_email),
          ticketCode: String(ticketRow.ticket_code),
          qrToken: String(ticketRow.qr_token),
          seatLabel: ticketRow.seat_label ? String(ticketRow.seat_label) : null,
          status: ticketRow.status as TicketPass["status"],
          checkedInAt: ticketRow.checked_in_at ? new Date(String(ticketRow.checked_in_at)).toISOString() : null,
          checkedInBy: ticketRow.checked_in_by ? String(ticketRow.checked_in_by) : null
        }
      : null;

    const evalRes = evaluateTicketScanEligibility({
      ticket,
      expectedEventId: input.eventId,
      eventEndsAt
    });
    let resultCode: ScanResultCode = evalRes.result;
    let message = evalRes.message;
    let valid = evalRes.valid;

    if (valid && ticket) {
      const upd = await client.query(
        "UPDATE tickets SET status = 'USED', checked_in_at = $2, checked_in_by = $3 WHERE id = $1 AND status = 'VALID' RETURNING *",
        [ticket.id, scannedAt, actor.email]
      );
      if ((upd.rowCount ?? 0) === 0) {
        valid = false;
        resultCode = input.scanMode === "OFFLINE_SYNC" ? "CONFLICT" : "ALREADY_USED";
        message = "Ticket was checked in concurrently by another scanner.";
      } else {
        ticket.status = "USED";
        ticket.checkedInAt = scannedAt;
        ticket.checkedInBy = actor.email;
      }
    } else if (resultCode === "ALREADY_USED" && input.scanMode === "OFFLINE_SYNC") {
      resultCode = "CONFLICT";
      message = `Offline duplicate conflict: ${message}`;
      valid = false;
    }

    const scanLog: TicketScanLog = {
      id: `scn_${crypto.randomUUID().slice(0, 12)}`,
      ticketId: ticket?.id ?? null,
      ticketCode: ticket?.ticketCode ?? codeLookup,
      eventId: input.eventId,
      scannedBy: actor.id,
      deviceId: input.deviceId,
      scanMode: input.scanMode,
      clientScanId,
      result: resultCode,
      message,
      scannedAt,
      syncedAt: new Date().toISOString()
    };

    await client.query(
      `INSERT INTO ticket_scan_logs (id, ticket_id, ticket_code, event_id, scanned_by, device_id, scan_mode, client_scan_id, result, message, scanned_at, synced_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        scanLog.id,
        scanLog.ticketId,
        scanLog.ticketCode,
        scanLog.eventId,
        scanLog.scannedBy,
        scanLog.deviceId,
        scanLog.scanMode,
        scanLog.clientScanId,
        scanLog.result,
        scanLog.message,
        scanLog.scannedAt,
        scanLog.syncedAt
      ]
    );
    await client.query("COMMIT");
    return { valid, result: resultCode, message, ticket, scanLog };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function syncOfflineScans(
  rawInput: unknown,
  actor: { id: string; email: string | null }
) {
  const input = offlineScanSyncSchema.parse(rawInput);
  const results = [];
  for (const item of input.scans) {
    const res = await verifyAndCheckInTicket(
      {
        eventId: input.eventId,
        ticketCodeOrToken: item.ticketCodeOrToken,
        deviceId: input.deviceId,
        clientScanId: item.clientScanId,
        scanMode: "OFFLINE_SYNC",
        scannedAt: item.scannedAt
      },
      actor
    );
    results.push({
      clientScanId: item.clientScanId,
      valid: res.valid,
      result: res.result,
      message: res.message,
      ticketCode: res.scanLog.ticketCode
    });
  }
  return results;
}

export async function lookupEventTickets(eventId: string, q?: string): Promise<TicketPass[]> {
  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    let list = store.tickets.filter((t) => t.eventId === eventId);
    if (q && q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.ticketCode.toLowerCase().includes(needle) ||
          t.holderName.toLowerCase().includes(needle) ||
          t.holderEmail.toLowerCase().includes(needle)
      );
    }
    return list;
  }

  const res = q && q.trim()
    ? await pool.query(
        `SELECT * FROM tickets WHERE event_id = $1 AND (LOWER(ticket_code) LIKE LOWER($2) OR LOWER(holder_name) LIKE LOWER($2) OR LOWER(holder_email) LIKE LOWER($2)) LIMIT 100`,
        [eventId, `%${q.trim()}%`]
      )
    : await pool.query("SELECT * FROM tickets WHERE event_id = $1 LIMIT 100", [eventId]);

  return res.rows.map((r) => ({
    id: String(r.id),
    bookingId: String(r.booking_id),
    eventId: String(r.event_id),
    tierId: String(r.tier_id),
    tierName: String(r.tier_name),
    holderName: String(r.holder_name),
    holderEmail: String(r.holder_email),
    ticketCode: String(r.ticket_code),
    qrToken: String(r.qr_token),
    seatLabel: r.seat_label ? String(r.seat_label) : null,
    status: r.status as TicketPass["status"],
    checkedInAt: r.checked_in_at ? new Date(String(r.checked_in_at)).toISOString() : null,
    checkedInBy: r.checked_in_by ? String(r.checked_in_by) : null
  }));
}

export async function listRecentScans(eventId?: string): Promise<TicketScanLog[]> {
  const pool = getPool();
  if (!pool) {
    const logs = getMemoryStore().scanLogs;
    return eventId ? logs.filter((l) => l.eventId === eventId).slice(0, 50) : logs.slice(0, 50);
  }
  const res = eventId
    ? await pool.query("SELECT * FROM ticket_scan_logs WHERE event_id = $1 ORDER BY scanned_at DESC LIMIT 50", [eventId])
    : await pool.query("SELECT * FROM ticket_scan_logs ORDER BY scanned_at DESC LIMIT 50");
  return res.rows.map((r) => ({
    id: String(r.id),
    ticketId: r.ticket_id ? String(r.ticket_id) : null,
    ticketCode: String(r.ticket_code),
    eventId: String(r.event_id),
    scannedBy: String(r.scanned_by),
    deviceId: String(r.device_id),
    scanMode: r.scan_mode as TicketScanLog["scanMode"],
    clientScanId: String(r.client_scan_id),
    result: r.result as ScanResultCode,
    message: String(r.message),
    scannedAt: new Date(String(r.scanned_at)).toISOString(),
    syncedAt: r.synced_at ? new Date(String(r.synced_at)).toISOString() : null
  }));
}

export async function listLedgerEntries(organizationId?: string): Promise<LedgerEntry[]> {
  const pool = getPool();
  if (!pool) {
    const list = getMemoryStore().ledger;
    return organizationId ? list.filter((l) => l.organizationId === organizationId) : list;
  }
  const res = organizationId
    ? await pool.query("SELECT * FROM ledger_entries WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 150", [organizationId])
    : await pool.query("SELECT * FROM ledger_entries ORDER BY created_at DESC LIMIT 150");
  return res.rows.map((r) => ({
    id: String(r.id),
    organizationId: r.organization_id ? String(r.organization_id) : null,
    bookingId: r.booking_id ? String(r.booking_id) : null,
    refundId: r.refund_id ? String(r.refund_id) : null,
    settlementId: r.settlement_id ? String(r.settlement_id) : null,
    entryType: r.entry_type as LedgerEntry["entryType"],
    amountInr: Number(r.amount_inr),
    currency: "INR",
    mode: "DEMO_LEDGER",
    note: String(r.note),
    createdAt: new Date(String(r.created_at)).toISOString()
  }));
}

export async function listSettlements(organizationId?: string): Promise<SettlementBatch[]> {
  const pool = getPool();
  if (!pool) {
    const list = getMemoryStore().settlements;
    return organizationId ? list.filter((s) => s.organizationId === organizationId) : list;
  }
  const res = organizationId
    ? await pool.query("SELECT * FROM settlements WHERE organization_id = $1 ORDER BY created_at DESC", [organizationId])
    : await pool.query("SELECT * FROM settlements ORDER BY created_at DESC");
  return res.rows.map((r) => ({
    id: String(r.id),
    organizationId: String(r.organization_id),
    periodLabel: String(r.period_label),
    grossInr: Number(r.gross_inr),
    feesInr: Number(r.fees_inr),
    refundsInr: Number(r.refunds_inr),
    netPayoutInr: Number(r.net_payout_inr),
    status: r.status as SettlementBatch["status"],
    approvedBy: r.approved_by ? String(r.approved_by) : null,
    createdAt: new Date(String(r.created_at)).toISOString(),
    settledAt: r.settled_at ? new Date(String(r.settled_at)).toISOString() : null
  }));
}

export async function createSettlementBatch(
  rawInput: unknown,
  actor: { id: string; email: string | null; role: string }
): Promise<SettlementBatch> {
  const input = settlementCreateSchema.parse(rawInput);
  const ledger = await listLedgerEntries(input.organizationId);
  const grossInr = ledger.filter((l) => l.entryType === "TICKET_SALE").reduce((a, b) => a + b.amountInr, 0);
  const feesInr = ledger.filter((l) => l.entryType === "PLATFORM_FEE" || l.entryType === "GST").reduce((a, b) => a + b.amountInr, 0);
  const refundsInr = Math.abs(ledger.filter((l) => l.entryType === "REFUND_DEBIT").reduce((a, b) => a + b.amountInr, 0));
  const netPayoutInr = Math.max(0, grossInr - refundsInr);
  const batch: SettlementBatch = {
    id: `stl_${crypto.randomUUID().slice(0, 10)}`,
    organizationId: input.organizationId,
    periodLabel: input.periodLabel,
    grossInr,
    feesInr,
    refundsInr,
    netPayoutInr,
    status: "SETTLED_DEMO",
    approvedBy: actor.id,
    createdAt: new Date().toISOString(),
    settledAt: new Date().toISOString()
  };

  const pool = getPool();
  if (!pool) {
    getMemoryStore().settlements.unshift(batch);
  } else {
    await pool.query(
      `INSERT INTO settlements (id, organization_id, period_label, gross_inr, fees_inr, refunds_inr, net_payout_inr, status, approved_by, created_at, settled_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [batch.id, batch.organizationId, batch.periodLabel, batch.grossInr, batch.feesInr, batch.refundsInr, batch.netPayoutInr, batch.status, batch.approvedBy, batch.createdAt, batch.settledAt]
    );
  }
  await recordAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: "SETTLEMENT_CREATED",
    targetType: "settlement",
    targetId: batch.id,
    afterJson: batch
  });
  return batch;
}

export async function moderateTarget(
  rawInput: unknown,
  actor: { id: string; email: string | null; role: string }
) {
  const input = moderationActionSchema.parse(rawInput);
  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    if (input.targetType === "organization") {
      const org = store.organizations.find((o) => o.id === input.targetId);
      if (!org) throw new Error("Organization not found.");
      const before = { approvalStatus: org.approvalStatus };
      org.approvalStatus =
        input.decision === "APPROVE" || input.decision === "ACTIVATE"
          ? "APPROVED"
          : input.decision === "REJECT"
          ? "REJECTED"
          : "SUSPENDED";
      await recordAuditLog({
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: `MOD_ORG_${input.decision}`,
        targetType: "organization",
        targetId: org.id,
        beforeJson: before,
        afterJson: { approvalStatus: org.approvalStatus, note: input.note }
      });
      return org;
    }
    if (input.targetType === "venue") {
      const v = store.venues.find((x) => x.slug === input.targetId);
      if (!v) throw new Error("Venue not found.");
      const before = { approvalStatus: v.approvalStatus };
      v.approvalStatus =
        input.decision === "APPROVE" || input.decision === "ACTIVATE"
          ? "APPROVED"
          : input.decision === "REJECT"
          ? "REJECTED"
          : "SUSPENDED";
      await recordAuditLog({
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: `MOD_VENUE_${input.decision}`,
        targetType: "venue",
        targetId: v.slug,
        beforeJson: before,
        afterJson: { approvalStatus: v.approvalStatus, note: input.note }
      });
      return v;
    }
    if (input.targetType === "event") {
      const evt = store.events.find((e) => e.id === input.targetId || e.slug === input.targetId);
      if (!evt) throw new Error("Event not found.");
      const before = { lifecycleStatus: evt.lifecycleStatus };
      evt.lifecycleStatus =
        input.decision === "APPROVE" || input.decision === "ACTIVATE"
          ? "PUBLISHED"
          : input.decision === "PAUSE"
          ? "PAUSED"
          : "CANCELLED";
      evt.moderationNotes = input.note ?? null;
      await recordAuditLog({
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: `MOD_EVENT_${input.decision}`,
        targetType: "event",
        targetId: evt.id,
        beforeJson: before,
        afterJson: { lifecycleStatus: evt.lifecycleStatus, note: input.note }
      });
      return evt;
    }
    const user = store.users.find((u) => u.id === input.targetId);
    if (!user) throw new Error("User not found.");
    const before = { status: user.status };
    user.status = input.decision === "SUSPEND" ? "SUSPENDED" : "ACTIVE";
    await recordAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: `MOD_USER_${input.decision}`,
      targetType: "user",
      targetId: user.id,
      beforeJson: before,
      afterJson: { status: user.status, note: input.note }
    });
    return { id: user.id, status: user.status };
  }

  if (input.targetType === "organization") {
    const status =
      input.decision === "APPROVE" || input.decision === "ACTIVATE"
        ? "APPROVED"
        : input.decision === "REJECT"
        ? "REJECTED"
        : "SUSPENDED";
    await pool.query("UPDATE organizations SET approval_status = $2 WHERE id = $1", [input.targetId, status]);
  } else if (input.targetType === "venue") {
    const status =
      input.decision === "APPROVE" || input.decision === "ACTIVATE"
        ? "APPROVED"
        : input.decision === "REJECT"
        ? "REJECTED"
        : "SUSPENDED";
    await pool.query("UPDATE venues SET approval_status = $2 WHERE slug = $1", [input.targetId, status]);
  } else if (input.targetType === "event") {
    const status =
      input.decision === "APPROVE" || input.decision === "ACTIVATE"
        ? "PUBLISHED"
        : input.decision === "PAUSE"
        ? "PAUSED"
        : "CANCELLED";
    await pool.query("UPDATE events SET lifecycle_status = $2, moderation_notes = $3 WHERE id = $1 OR slug = $1", [
      input.targetId,
      status,
      input.note ?? null
    ]);
  } else if (input.targetType === "user") {
    const status = input.decision === "SUSPEND" ? "SUSPENDED" : "ACTIVE";
    await pool.query("UPDATE users SET status = $2 WHERE id = $1", [input.targetId, status]);
  }

  await recordAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: `MOD_${input.targetType.toUpperCase()}_${input.decision}`,
    targetType: input.targetType,
    targetId: input.targetId,
    afterJson: { decision: input.decision, note: input.note }
  });
  return { ok: true };
}

export async function listSupportCases(userId?: string): Promise<SupportCase[]> {
  const pool = getPool();
  if (!pool) {
    const list = getMemoryStore().supportCases;
    return userId ? list.filter((c) => c.userId === userId) : list;
  }
  const res = userId
    ? await pool.query("SELECT * FROM support_cases WHERE user_id = $1 ORDER BY updated_at DESC", [userId])
    : await pool.query("SELECT * FROM support_cases ORDER BY updated_at DESC");
  return res.rows.map((r) => ({
    id: String(r.id),
    userId: r.user_id ? String(r.user_id) : null,
    bookingId: r.booking_id ? String(r.booking_id) : null,
    eventId: r.event_id ? String(r.event_id) : null,
    subject: String(r.subject),
    category: r.category as SupportCase["category"],
    priority: r.priority as SupportCase["priority"],
    status: r.status as SupportCase["status"],
    assignedTo: r.assigned_to ? String(r.assigned_to) : null,
    notes: (r.notes_json as SupportCase["notes"]) ?? [],
    createdAt: new Date(String(r.created_at)).toISOString(),
    updatedAt: new Date(String(r.updated_at)).toISOString()
  }));
}

export async function createSupportCase(
  rawInput: unknown,
  actor: { id: string | null; email: string | null }
): Promise<SupportCase> {
  const input = supportCaseCreateSchema.parse(rawInput);
  const now = new Date().toISOString();
  const c: SupportCase = {
    id: `case_${crypto.randomUUID().slice(0, 10)}`,
    userId: actor.id,
    bookingId: input.bookingId ?? null,
    eventId: input.eventId ?? null,
    subject: input.subject,
    category: input.category,
    priority: input.priority,
    status: "OPEN",
    assignedTo: null,
    notes: [{ author: actor.email ?? "phone-user", text: input.message, createdAt: now }],
    createdAt: now,
    updatedAt: now
  };
  const pool = getPool();
  if (!pool) {
    getMemoryStore().supportCases.unshift(c);
    return c;
  }
  await pool.query(
    `INSERT INTO support_cases (id, user_id, booking_id, event_id, subject, category, priority, status, notes_json, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'OPEN',$8::jsonb,$9,$9)`,
    [c.id, c.userId, c.bookingId, c.eventId, c.subject, c.category, c.priority, JSON.stringify(c.notes), now]
  );
  return c;
}

export async function updateSupportCase(
  caseId: string,
  rawInput: unknown,
  actor: { id: string; email: string | null; role: string }
): Promise<SupportCase> {
  const input = supportCaseUpdateSchema.parse(rawInput);
  const now = new Date().toISOString();
  const pool = getPool();
  if (!pool) {
    const found = getMemoryStore().supportCases.find((c) => c.id === caseId);
    if (!found) throw new Error("Support case not found.");
    if (input.status) found.status = input.status;
    if (input.priority) found.priority = input.priority;
    if (input.note) found.notes.push({ author: actor.email ?? "phone-user", text: input.note, createdAt: now });
    found.assignedTo = actor.id;
    found.updatedAt = now;
    return found;
  }

  const res = await pool.query("SELECT * FROM support_cases WHERE id = $1", [caseId]);
  if (res.rowCount === 0) throw new Error("Support case not found.");
  const r = res.rows[0];
  const notes = (r.notes_json as SupportCase["notes"]) ?? [];
  if (input.note) notes.push({ author: actor.email ?? "phone-user", text: input.note, createdAt: now });
  const upd = await pool.query(
    `UPDATE support_cases SET
       status = COALESCE($2, status),
       priority = COALESCE($3, priority),
       assigned_to = $4,
       notes_json = $5::jsonb,
       updated_at = $6
     WHERE id = $1 RETURNING *`,
    [caseId, input.status ?? null, input.priority ?? null, actor.id, JSON.stringify(notes), now]
  );
  const row = upd.rows[0];
  return {
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : null,
    bookingId: row.booking_id ? String(row.booking_id) : null,
    eventId: row.event_id ? String(row.event_id) : null,
    subject: String(row.subject),
    category: row.category as SupportCase["category"],
    priority: row.priority as SupportCase["priority"],
    status: row.status as SupportCase["status"],
    assignedTo: row.assigned_to ? String(row.assigned_to) : null,
    notes: (row.notes_json as SupportCase["notes"]) ?? [],
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString()
  };
}

export async function listFeatureFlags(): Promise<FeatureFlag[]> {
  const pool = getPool();
  if (!pool) return getMemoryStore().featureFlags;
  const res = await pool.query("SELECT * FROM feature_flags ORDER BY key ASC");
  return res.rows.map((r) => ({
    key: String(r.key),
    enabled: Boolean(r.enabled),
    description: String(r.description),
    updatedBy: r.updated_by ? String(r.updated_by) : null,
    updatedAt: new Date(String(r.updated_at)).toISOString()
  }));
}

export async function upsertFeatureFlag(
  rawInput: unknown,
  actor: { id: string; email: string | null; role: string }
): Promise<FeatureFlag> {
  const input = featureFlagSchema.parse(rawInput);
  const now = new Date().toISOString();
  const pool = getPool();
  if (!pool) {
    const flags = getMemoryStore().featureFlags;
    const existing = flags.find((f) => f.key === input.key);
    if (existing) {
      existing.enabled = input.enabled;
      if (input.description) existing.description = input.description;
      existing.updatedBy = actor.id;
      existing.updatedAt = now;
      await recordAuditLog({
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: "FEATURE_FLAG_UPDATED",
        targetType: "feature_flag",
        targetId: input.key,
        afterJson: existing
      });
      return existing;
    }
    const created: FeatureFlag = {
      key: input.key,
      enabled: input.enabled,
      description: input.description ?? "Custom platform flag",
      updatedBy: actor.id,
      updatedAt: now
    };
    flags.push(created);
    return created;
  }

  await pool.query(
    `INSERT INTO feature_flags (key, enabled, description, updated_by, updated_at)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled, description = COALESCE($3, feature_flags.description), updated_by = EXCLUDED.updated_by, updated_at = EXCLUDED.updated_at`,
    [input.key, input.enabled, input.description ?? "Platform feature flag", actor.id, now]
  );
  await recordAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: "FEATURE_FLAG_UPDATED",
    targetType: "feature_flag",
    targetId: input.key,
    afterJson: input
  });
  const flags = await listFeatureFlags();
  return flags.find((f) => f.key === input.key)!;
}

export async function listNotifications(userId?: string | null): Promise<PlatformNotification[]> {
  const pool = getPool();
  if (!pool) {
    return getMemoryStore().notifications.filter((n) => !n.userId || (userId && n.userId === userId));
  }
  const res = userId
    ? await pool.query("SELECT * FROM notifications WHERE user_id IS NULL OR user_id = $1 ORDER BY created_at DESC LIMIT 50", [userId])
    : await pool.query("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50");
  return res.rows.map((r) => ({
    id: String(r.id),
    userId: r.user_id ? String(r.user_id) : null,
    audience: r.audience as PlatformNotification["audience"],
    title: String(r.title),
    body: String(r.body),
    kind: r.kind as PlatformNotification["kind"],
    isRead: Boolean(r.is_read),
    createdAt: new Date(String(r.created_at)).toISOString()
  }));
}

export async function broadcastNotification(
  rawInput: unknown,
  actor: { id: string; email: string | null; role: string }
): Promise<PlatformNotification> {
  const input = broadcastNotificationSchema.parse(rawInput);
  const notif: PlatformNotification = {
    id: `ntf_${crypto.randomUUID().slice(0, 10)}`,
    userId: input.userId ?? null,
    audience: input.audience,
    title: input.title,
    body: input.body,
    kind: input.kind,
    isRead: false,
    createdAt: new Date().toISOString()
  };
  const pool = getPool();
  if (!pool) {
    getMemoryStore().notifications.unshift(notif);
  } else {
    await pool.query(
      `INSERT INTO notifications (id, user_id, audience, title, body, kind, is_read, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,FALSE,$7)`,
      [notif.id, notif.userId, notif.audience, notif.title, notif.body, notif.kind, notif.createdAt]
    );
  }
  await recordAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: "NOTIFICATION_BROADCAST",
    targetType: "notification",
    targetId: notif.id,
    afterJson: notif
  });
  return notif;
}

export async function getPlatformKpis() {
  const [{ cities, events }, bookings, refunds, orgs, venues, cases] = await Promise.all([
    listCitiesAndEvents({}, { includeNonPublished: true }),
    listBookings(),
    listRefundRequests(),
    listOrganizations(),
    listVenues(),
    listSupportCases()
  ]);
  const confirmedBookings = bookings.filter((b) => b.status === "CONFIRMED_DEMO");
  const grossDemoVolumeInr = confirmedBookings.reduce((s, b) => s + b.totalInr, 0);
  const ticketsIssued = bookings.reduce((s, b) => s + (b.tickets?.length ?? b.items.reduce((a, i) => a + i.quantity, 0)), 0);
  const ticketsCheckedIn = bookings.reduce(
    (s, b) => s + (b.tickets?.filter((t) => t.status === "USED").length ?? 0),
    0
  );
  return {
    citiesCount: cities.length,
    eventsCount: events.length,
    publishedEventsCount: events.filter((e) => (e.lifecycleStatus ?? "PUBLISHED") === "PUBLISHED").length,
    organizationsCount: orgs.length,
    pendingOrgsCount: orgs.filter((o) => o.approvalStatus === "PENDING").length,
    venuesCount: venues.length,
    bookingsCount: bookings.length,
    confirmedBookingsCount: confirmedBookings.length,
    grossDemoVolumeInr,
    ticketsIssued,
    ticketsCheckedIn,
    pendingRefundsCount: refunds.filter((r) => r.status === "REQUESTED" || r.status === "UNDER_REVIEW").length,
    openSupportCasesCount: cases.filter((c) => c.status === "OPEN" || c.status === "IN_PROGRESS").length
  };
}
