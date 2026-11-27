import crypto from "node:crypto";
import {
  buildUpiPaymentUri,
  canTransitionBookingStatus,
  isValidUpiVpa,
  submitUpiPaymentClaimSchema,
  upsertOrganiserPaymentProfileSchema,
  verifyOrganiserPaymentSchema,
  type BookingRecord,
  type OrganiserPaymentProfile,
  type PublicOrganiserPaymentInfo,
  type TicketPass
} from "@nightlifez/shared";
import { signQrPayload } from "./auth.ts";
import { recordAuditLog } from "./authStore.ts";
import { ensureSchemaBootstrapped } from "./bootstrapDb.ts";
import { getPool } from "./db.ts";
import { getMemoryStore } from "./memoryStore.ts";
import { listBookings } from "./repository.ts";

export async function getOrganiserPaymentProfile(organizationId: string): Promise<OrganiserPaymentProfile> {
  const pool = getPool();
  if (!pool) {
    const existing = getMemoryStore().organiserPaymentProfiles.find((p) => p.organizationId === organizationId);
    if (existing) return existing;
    return {
      organizationId,
      upiEnabled: false,
      upiId: null,
      payeeDisplayName: null,
      paymentInstructions: null,
      providerMode: "DEMO_SANDBOX",
      updatedAt: new Date(0).toISOString(),
      updatedBy: null
    };
  }

  await ensureSchemaBootstrapped(pool);
  const res = await pool.query(
    "SELECT * FROM organiser_payment_profiles WHERE organization_id = $1 LIMIT 1",
    [organizationId]
  );
  if (res.rowCount === 0) {
    return {
      organizationId,
      upiEnabled: false,
      upiId: null,
      payeeDisplayName: null,
      paymentInstructions: null,
      providerMode: "DEMO_SANDBOX",
      updatedAt: new Date(0).toISOString(),
      updatedBy: null
    };
  }
  const r = res.rows[0];
  const upiEnabled = Boolean(r.upi_enabled);
  return {
    organizationId: String(r.organization_id),
    upiEnabled,
    upiId: r.upi_id ? String(r.upi_id) : null,
    payeeDisplayName: r.payee_display_name ? String(r.payee_display_name) : null,
    paymentInstructions: r.payment_instructions ? String(r.payment_instructions) : null,
    providerMode: upiEnabled ? "DIRECT_UPI" : "DEMO_SANDBOX",
    updatedAt: new Date(String(r.updated_at)).toISOString(),
    updatedBy: r.updated_by ? String(r.updated_by) : null
  };
}

export async function getPublicOrganiserPaymentInfo(organizationId: string): Promise<PublicOrganiserPaymentInfo> {
  const profile = await getOrganiserPaymentProfile(organizationId);
  if (!profile.upiEnabled || !isValidUpiVpa(profile.upiId)) {
    return {
      organizationId,
      upiEnabled: false,
      upiId: null,
      payeeDisplayName: null,
      paymentInstructions: null
    };
  }
  return {
    organizationId,
    upiEnabled: true,
    upiId: profile.upiId,
    payeeDisplayName: profile.payeeDisplayName,
    paymentInstructions: profile.paymentInstructions
  };
}

export async function upsertOrganiserPaymentProfile(
  organizationId: string,
  rawInput: unknown,
  actor: { id: string; email: string | null; role: string }
): Promise<OrganiserPaymentProfile> {
  const input = upsertOrganiserPaymentProfileSchema.parse(rawInput);
  const nowIso = new Date().toISOString();
  const next: OrganiserPaymentProfile = {
    organizationId,
    upiEnabled: input.upiEnabled,
    upiId: input.upiId?.trim() || null,
    payeeDisplayName: input.payeeDisplayName?.trim() || null,
    paymentInstructions: input.paymentInstructions?.trim() || null,
    providerMode: input.upiEnabled ? "DIRECT_UPI" : "DEMO_SANDBOX",
    updatedAt: nowIso,
    updatedBy: actor.id
  };

  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    if (!store.organizations.some((o) => o.id === organizationId)) {
      throw new Error("Organization not found.");
    }
    const idx = store.organiserPaymentProfiles.findIndex((p) => p.organizationId === organizationId);
    const before = idx >= 0 ? structuredClone(store.organiserPaymentProfiles[idx]) : null;
    if (idx >= 0) store.organiserPaymentProfiles[idx] = next;
    else store.organiserPaymentProfiles.push(next);

    await recordAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "PAYMENT_PROFILE_UPDATED",
      targetType: "organization_payment_profile",
      targetId: organizationId,
      beforeJson: before,
      afterJson: next
    });
    return next;
  }

  await ensureSchemaBootstrapped(pool);
  const orgCheck = await pool.query("SELECT id FROM organizations WHERE id = $1 LIMIT 1", [organizationId]);
  if (orgCheck.rowCount === 0) throw new Error("Organization not found.");

  await pool.query(
    `INSERT INTO organiser_payment_profiles (organization_id, upi_enabled, upi_id, payee_display_name, payment_instructions, updated_by, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (organization_id) DO UPDATE SET
       upi_enabled = EXCLUDED.upi_enabled,
       upi_id = EXCLUDED.upi_id,
       payee_display_name = EXCLUDED.payee_display_name,
       payment_instructions = EXCLUDED.payment_instructions,
       updated_by = EXCLUDED.updated_by,
       updated_at = EXCLUDED.updated_at`,
    [organizationId, next.upiEnabled, next.upiId, next.payeeDisplayName, next.paymentInstructions, actor.id, nowIso]
  );

  await recordAuditLog({
    actorUserId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: "PAYMENT_PROFILE_UPDATED",
    targetType: "organization_payment_profile",
    targetId: organizationId,
    afterJson: next
  });
  return next;
}

export async function expireStaleUpiBookings(): Promise<number> {
  const nowMs = Date.now();
  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    let count = 0;
    for (const b of store.bookings) {
      if (
        b.status === "AWAITING_PAYMENT_VERIFICATION" &&
        b.paymentExpiresAt &&
        new Date(b.paymentExpiresAt).getTime() <= nowMs
      ) {
        b.status = "EXPIRED";
        b.paymentStatus = "CANCELLED";
        const evt = store.events.find((e) => e.id === b.eventId);
        if (evt) {
          for (const item of b.items) {
            const tier = evt.tiers.find((t) => t.id === item.tierId);
            if (tier) tier.remainingQuota += item.quantity;
          }
        }
        count++;
      }
    }
    return count;
  }

  await ensureSchemaBootstrapped(pool);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const expiredRes = await client.query(
      `UPDATE bookings SET status = 'EXPIRED', payment_status = 'CANCELLED'
       WHERE status = 'AWAITING_PAYMENT_VERIFICATION'
         AND payment_expires_at IS NOT NULL
         AND payment_expires_at <= NOW()
       RETURNING id`
    );
    for (const row of expiredRes.rows) {
      const itemsRes = await client.query(
        "SELECT tier_id, quantity FROM booking_items WHERE booking_id = $1",
        [String(row.id)]
      );
      for (const item of itemsRes.rows) {
        await client.query(
          "UPDATE ticket_tiers SET remaining_quota = remaining_quota + $1 WHERE id = $2",
          [Number(item.quantity), String(item.tier_id)]
        );
      }
    }
    await client.query("COMMIT");
    return expiredRes.rowCount ?? 0;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function listOrganiserPaymentVerifications(organizationId: string): Promise<BookingRecord[]> {
  await expireStaleUpiBookings();
  const bookings = await listBookings({ organizationId });
  return bookings.filter(
    (b) =>
      b.paymentChannel === "ORGANISER_UPI" ||
      b.status === "AWAITING_PAYMENT_VERIFICATION" ||
      Boolean(b.paymentSubmittedAt)
  );
}

export async function buildBookingUpiPayload(booking: BookingRecord): Promise<{
  upiId: string;
  payeeDisplayName: string;
  paymentInstructions: string | null;
  upiUri: string;
} | null> {
  if (!booking.organizationId) return null;
  const info = await getPublicOrganiserPaymentInfo(booking.organizationId);
  if (!info.upiEnabled || !info.upiId || !info.payeeDisplayName) return null;
  const upiUri = buildUpiPaymentUri({
    upiId: info.upiId,
    payeeName: info.payeeDisplayName,
    amountInr: booking.totalInr,
    referenceCode: booking.referenceCode,
    note: `NIGHTLIFEZ ${booking.referenceCode}`
  });
  return {
    upiId: info.upiId,
    payeeDisplayName: info.payeeDisplayName,
    paymentInstructions: info.paymentInstructions,
    upiUri
  };
}

const EPHEMERAL_DEV_SECRET = crypto.randomBytes(32).toString("hex");
const DEFAULT_WALLET_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const CURRENT_WALLET_TOKEN_VERSION = 1;

export function getClaimTokenSecret(): string {
  const configured = (process.env.NIGHTLIFEZ_AUTH_SECRET || process.env.AUTH_SECRET || "").trim();
  const isDeployedOrProd =
    process.env.VERCEL === "1" ||
    Boolean(process.env.VERCEL_ENV) ||
    process.env.NODE_ENV === "production";
  if (configured) {
    if (Buffer.byteLength(configured, "utf8") < 32) {
      throw new Error("NIGHTLIFEZ_AUTH_SECRET must be at least 32 bytes.");
    }
    return configured;
  }
  if (isDeployedOrProd) {
    throw new Error("NIGHTLIFEZ_AUTH_SECRET is required in deployed and production environments.");
  }
  return EPHEMERAL_DEV_SECRET;
}

export function createUpiClaimToken(bookingId: string, referenceCode: string): string {
  const payload = `upi-claim:${bookingId}:${referenceCode}`;
  return crypto.createHmac("sha256", getClaimTokenSecret()).update(payload).digest("hex");
}

export function verifyUpiClaimToken(token: string, bookingId: string, referenceCode: string): boolean {
  const expected = createUpiClaimToken(bookingId, referenceCode);
  const a = Buffer.from(token, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function createWalletAccessToken(
  bookingId: string,
  referenceCode: string,
  options?: { ttlSeconds?: number; version?: number }
): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const ttlSec = options?.ttlSeconds ?? DEFAULT_WALLET_TTL_SECONDS;
  const body = Buffer.from(
    JSON.stringify({
      b: bookingId,
      r: referenceCode,
      p: "wallet-access",
      iat: nowSec,
      exp: nowSec + ttlSec,
      v: options?.version ?? CURRENT_WALLET_TOKEN_VERSION
    }),
    "utf8"
  ).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getClaimTokenSecret())
    .update(`wallet-access:${body}`)
    .digest("hex");
  return `${body}.${sig}`;
}

export function verifyWalletAccessToken(
  token: string,
  options?: { minVersion?: number }
): { bookingId: string; referenceCode: string; iat: number; exp: number; version: number } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;
  const expected = crypto
    .createHmac("sha256", getClaimTokenSecret())
    .update(`wallet-access:${body}`)
    .digest("hex");
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      b?: string;
      r?: string;
      p?: string;
      iat?: number;
      exp?: number;
      v?: number;
    };
    const nowSec = Math.floor(Date.now() / 1000);
    const minVersion = options?.minVersion ?? CURRENT_WALLET_TOKEN_VERSION;
    if (
      parsed.p !== "wallet-access" ||
      !parsed.b ||
      !parsed.r ||
      typeof parsed.iat !== "number" ||
      typeof parsed.exp !== "number" ||
      typeof parsed.v !== "number" ||
      parsed.exp <= nowSec ||
      parsed.v < minVersion
    ) {
      return null;
    }
    return {
      bookingId: parsed.b,
      referenceCode: parsed.r,
      iat: parsed.iat,
      exp: parsed.exp,
      version: parsed.v
    };
  } catch {
    return null;
  }
}

export async function submitAttendeeUpiClaim(
  bookingId: string,
  rawInput: unknown,
  actorUserId?: string | null
): Promise<BookingRecord> {
  await expireStaleUpiBookings();
  const input = submitUpiPaymentClaimSchema.parse(rawInput);
  const nowIso = new Date().toISOString();

  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    const booking = store.bookings.find((b) => b.id === bookingId);
    if (!booking) throw new Error("Booking not found.");
    if (booking.userId) {
      if (!actorUserId) {
        throw new Error("Unauthorized: sign in to submit a payment claim for this booking.");
      }
      if (booking.userId !== actorUserId) {
        throw new Error("Forbidden: cannot update another attendee's booking.");
      }
    } else if (!input.claimToken || !verifyUpiClaimToken(input.claimToken, booking.id, booking.referenceCode)) {
      throw new Error("Forbidden: valid booking claim token is required for guest payment claims.");
    }
    if (booking.status !== "AWAITING_PAYMENT_VERIFICATION") {
      throw new Error(`Booking is in state ${booking.status} and cannot accept a UPI claim.`);
    }
    if (input.expectedAmountInr !== undefined && input.expectedAmountInr !== booking.totalInr) {
      throw new Error(`Amount mismatch: expected ₹${booking.totalInr}, got ₹${input.expectedAmountInr}.`);
    }
    booking.paymentSubmittedAt = nowIso;
    booking.paymentSubmittedRef = input.transactionRef?.trim() || null;

    store.notifications.unshift({
      id: `ntf_${crypto.randomUUID().slice(0, 10)}`,
      userId: null,
      audience: "ORGANISER",
      title: `UPI claim submitted: ${booking.referenceCode}`,
      body: `${booking.attendeeName} marked ₹${booking.totalInr} as paid${
        booking.paymentSubmittedRef ? ` (Ref: ${booking.paymentSubmittedRef})` : ""
      }. Verify credit in your UPI app before approving.`,
      kind: "BOOKING",
      isRead: false,
      createdAt: nowIso
    });
    return booking;
  }

  await ensureSchemaBootstrapped(pool);
  const res = await pool.query("SELECT * FROM bookings WHERE id = $1 LIMIT 1", [bookingId]);
  if (res.rowCount === 0) throw new Error("Booking not found.");
  const row = res.rows[0];
  if (row.user_id) {
    if (!actorUserId) {
      throw new Error("Unauthorized: sign in to submit a payment claim for this booking.");
    }
    if (String(row.user_id) !== actorUserId) {
      throw new Error("Forbidden: cannot update another attendee's booking.");
    }
  } else if (
    !input.claimToken ||
    !verifyUpiClaimToken(input.claimToken, String(row.id), String(row.reference_code))
  ) {
    throw new Error("Forbidden: valid booking claim token is required for guest payment claims.");
  }
  if (String(row.status) !== "AWAITING_PAYMENT_VERIFICATION") {
    throw new Error(`Booking is in state ${String(row.status)} and cannot accept a UPI claim.`);
  }
  if (input.expectedAmountInr !== undefined && input.expectedAmountInr !== Number(row.total_inr)) {
    throw new Error(`Amount mismatch: expected ₹${Number(row.total_inr)}, got ₹${input.expectedAmountInr}.`);
  }

  const submittedRef = input.transactionRef?.trim() || null;
  await pool.query(
    "UPDATE bookings SET payment_submitted_at = $2, payment_submitted_ref = $3 WHERE id = $1",
    [bookingId, nowIso, submittedRef]
  );
  await pool.query(
    `INSERT INTO notifications (id, user_id, audience, title, body, kind, is_read, created_at)
     VALUES ($1,NULL,'ORGANISER',$2,$3,'BOOKING',FALSE,$4)`,
    [
      `ntf_${crypto.randomUUID().slice(0, 10)}`,
      `UPI claim submitted: ${String(row.reference_code)}`,
      `${String(row.attendee_name)} marked ₹${Number(row.total_inr)} as paid${
        submittedRef ? ` (Ref: ${submittedRef})` : ""
      }. Verify credit in your UPI app before approving.`,
      nowIso
    ]
  );

  const all = await listBookings({ eventId: String(row.event_id) });
  return all.find((b) => b.id === bookingId)!;
}

export async function verifyOrganiserUpiPayment(
  bookingId: string,
  rawInput: unknown,
  actor: { id: string; email: string | null; role: string }
): Promise<BookingRecord> {
  await expireStaleUpiBookings();
  const input = verifyOrganiserPaymentSchema.parse(rawInput);
  const nowIso = new Date().toISOString();

  const pool = getPool();
  if (!pool) {
    const store = getMemoryStore();
    const booking = store.bookings.find((b) => b.id === bookingId);
    if (!booking) throw new Error("Booking not found.");
    if (booking.status !== "AWAITING_PAYMENT_VERIFICATION") {
      throw new Error(`Booking cannot be verified in state ${booking.status}.`);
    }
    if (input.expectedAmountInr !== undefined && input.expectedAmountInr !== booking.totalInr) {
      throw new Error(`Payment amount mismatch: expected ₹${booking.totalInr}, got ₹${input.expectedAmountInr}.`);
    }

    if (input.decision === "APPROVE") {
      if (!canTransitionBookingStatus(booking.status, "CONFIRMED_DEMO")) {
        throw new Error("Invalid booking state transition.");
      }
      const existingTickets = store.tickets.filter((t) => t.bookingId === booking.id);
      if (existingTickets.length > 0) {
        throw new Error("Tickets already issued for this booking.");
      }

      const attendees = store.bookingAttendees.filter((a) => a.bookingId === booking.id);
      const tickets: TicketPass[] = [];
      let attCursor = 0;
      for (const item of booking.items) {
        for (let i = 0; i < item.quantity; i++) {
          const att = attendees[attCursor++];
          const ticketId = `tkt_${crypto.randomUUID().slice(0, 12)}`;
          const ticketCode = `NLZ-TKT-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
          const tkt: TicketPass = {
            id: ticketId,
            bookingId: booking.id,
            eventId: booking.eventId,
            eventTitle: booking.eventTitle,
            tierId: item.tierId,
            tierName: item.tierName,
            holderName: att?.fullName ?? booking.attendeeName,
            holderEmail: att?.email ?? booking.attendeeEmail,
            ticketCode,
            qrToken: signQrPayload(ticketId, booking.eventId, ticketCode),
            seatLabel: item.seatLabels?.[i] ?? null,
            status: "VALID",
            checkedInAt: null,
            checkedInBy: null
          };
          tickets.push(tkt);
          if (att) att.ticketId = ticketId;
        }
      }

      booking.status = "CONFIRMED_DEMO";
      booking.paymentStatus = "CONFIRMED";
      booking.paymentVerifiedAt = nowIso;
      booking.paymentVerifiedBy = actor.id;
      booking.paymentRef = booking.paymentSubmittedRef || `DIRECT-UPI-${Date.now()}`;
      store.tickets.push(...tickets);

      store.notifications.unshift({
        id: `ntf_${crypto.randomUUID().slice(0, 10)}`,
        userId: booking.userId ?? null,
        audience: "USER",
        title: `Payment verified: ${booking.eventTitle}`,
        body: `Organiser confirmed your direct UPI payment for ${booking.referenceCode}. Your QR passes are ready.`,
        kind: "BOOKING",
        isRead: false,
        createdAt: nowIso
      });

      await recordAuditLog({
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: "PAYMENT_VERIFIED_APPROVED",
        targetType: "booking",
        targetId: booking.id,
        afterJson: {
          referenceCode: booking.referenceCode,
          totalInr: booking.totalInr,
          submittedRef: booking.paymentSubmittedRef ?? null
        }
      });

      return { ...booking, attendees, tickets };
    }

    // REJECT -> release inventory once
    booking.status = "REJECTED";
    booking.paymentStatus = "FAILED";
    booking.paymentVerifiedAt = nowIso;
    booking.paymentVerifiedBy = actor.id;
    booking.paymentRejectionReason = input.reason ?? "Payment not received by organiser";

    const evt = store.events.find((e) => e.id === booking.eventId);
    if (evt) {
      for (const item of booking.items) {
        const tier = evt.tiers.find((t) => t.id === item.tierId);
        if (tier) tier.remainingQuota += item.quantity;
      }
    }

    store.notifications.unshift({
      id: `ntf_${crypto.randomUUID().slice(0, 10)}`,
      userId: booking.userId ?? null,
      audience: "USER",
      title: `Payment not verified: ${booking.eventTitle}`,
      body: `Organiser rejected payment verification for ${booking.referenceCode}: ${booking.paymentRejectionReason}.`,
      kind: "BOOKING",
      isRead: false,
      createdAt: nowIso
    });

    await recordAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "PAYMENT_VERIFIED_REJECTED",
      targetType: "booking",
      targetId: booking.id,
      afterJson: {
        referenceCode: booking.referenceCode,
        reason: booking.paymentRejectionReason
      }
    });

    return booking;
  }

  await ensureSchemaBootstrapped(pool);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const bRes = await client.query("SELECT * FROM bookings WHERE id = $1 FOR UPDATE", [bookingId]);
    if (bRes.rowCount === 0) throw new Error("Booking not found.");
    const row = bRes.rows[0];
    const currentStatus = String(row.status);
    if (currentStatus !== "AWAITING_PAYMENT_VERIFICATION") {
      throw new Error(`Booking cannot be verified in state ${currentStatus}.`);
    }
    const totalInr = Number(row.total_inr);
    if (input.expectedAmountInr !== undefined && input.expectedAmountInr !== totalInr) {
      throw new Error(`Payment amount mismatch: expected ₹${totalInr}, got ₹${input.expectedAmountInr}.`);
    }

    const itemRes = await client.query("SELECT * FROM booking_items WHERE booking_id = $1", [bookingId]);

    if (input.decision === "APPROVE") {
      const existingTicketsRes = await client.query("SELECT id FROM tickets WHERE booking_id = $1 LIMIT 1", [bookingId]);
      if ((existingTicketsRes.rowCount ?? 0) > 0) {
        throw new Error("Tickets already issued for this booking.");
      }

      const attRes = await client.query(
        "SELECT * FROM booking_attendees WHERE booking_id = $1 ORDER BY attendee_index ASC",
        [bookingId]
      );
      let attCursor = 0;
      for (const item of itemRes.rows) {
        const qty = Number(item.quantity);
        const seatLabels = (item.seat_labels_json as string[]) ?? [];
        for (let i = 0; i < qty; i++) {
          const att = attRes.rows[attCursor++];
          const ticketId = `tkt_${crypto.randomUUID().slice(0, 12)}`;
          const ticketCode = `NLZ-TKT-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
          const qrToken = signQrPayload(ticketId, String(row.event_id), ticketCode);
          await client.query(
            `INSERT INTO tickets (id, booking_id, event_id, tier_id, tier_name, holder_name, holder_email, ticket_code, qr_token, seat_label, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'VALID')`,
            [
              ticketId,
              bookingId,
              String(row.event_id),
              String(item.tier_id),
              String(item.tier_name),
              att ? String(att.full_name) : String(row.attendee_name),
              att ? String(att.email) : String(row.attendee_email),
              ticketCode,
              qrToken,
              seatLabels[i] ?? null
            ]
          );
          if (att) {
            await client.query("UPDATE booking_attendees SET ticket_id = $1 WHERE id = $2", [
              ticketId,
              String(att.id)
            ]);
          }
        }
      }

      const paymentRef = row.payment_submitted_ref
        ? String(row.payment_submitted_ref)
        : `DIRECT-UPI-${Date.now()}`;
      await client.query(
        `UPDATE bookings SET
           status = 'CONFIRMED_DEMO',
           payment_status = 'CONFIRMED',
           payment_verified_at = $2,
           payment_verified_by = $3,
           payment_ref = $4
         WHERE id = $1`,
        [bookingId, nowIso, actor.id, paymentRef]
      );
      await client.query(
        `INSERT INTO payment_records (id, booking_id, provider, mode, amount_inr, state, transaction_ref)
         VALUES ($1,$2,'DIRECT_UPI','DIRECT_ORGANISER_UPI',$3,'CONFIRMED',$4)`,
        [`pay_${crypto.randomUUID().slice(0, 10)}`, bookingId, totalInr, paymentRef]
      );
      await client.query(
        `INSERT INTO notifications (id, user_id, audience, title, body, kind, is_read, created_at)
         VALUES ($1,$2,'USER',$3,$4,'BOOKING',FALSE,$5)`,
        [
          `ntf_${crypto.randomUUID().slice(0, 10)}`,
          row.user_id ? String(row.user_id) : null,
          `Payment verified: ${String(row.event_title)}`,
          `Organiser confirmed your direct UPI payment for ${String(row.reference_code)}. Your QR passes are ready.`,
          nowIso
        ]
      );
    } else {
      const reason = input.reason ?? "Payment not received by organiser";
      await client.query(
        `UPDATE bookings SET
           status = 'REJECTED',
           payment_status = 'FAILED',
           payment_verified_at = $2,
           payment_verified_by = $3,
           payment_rejection_reason = $4
         WHERE id = $1`,
        [bookingId, nowIso, actor.id, reason]
      );
      for (const item of itemRes.rows) {
        await client.query(
          "UPDATE ticket_tiers SET remaining_quota = remaining_quota + $1 WHERE id = $2",
          [Number(item.quantity), String(item.tier_id)]
        );
      }
      await client.query(
        `INSERT INTO notifications (id, user_id, audience, title, body, kind, is_read, created_at)
         VALUES ($1,$2,'USER',$3,$4,'BOOKING',FALSE,$5)`,
        [
          `ntf_${crypto.randomUUID().slice(0, 10)}`,
          row.user_id ? String(row.user_id) : null,
          `Payment not verified: ${String(row.event_title)}`,
          `Organiser rejected payment verification for ${String(row.reference_code)}: ${reason}.`,
          nowIso
        ]
      );
    }

    await client.query("COMMIT");
    await recordAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: input.decision === "APPROVE" ? "PAYMENT_VERIFIED_APPROVED" : "PAYMENT_VERIFIED_REJECTED",
      targetType: "booking",
      targetId: bookingId,
      afterJson: {
        referenceCode: String(row.reference_code),
        totalInr,
        reason: input.reason ?? null
      }
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
