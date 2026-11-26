import crypto from "node:crypto";
import {
  calculatePriceBreakdown,
  createBookingSchema,
  getMinTierPrice,
  SEED_ACTIVITIES,
  SEED_ARTISTS,
  SEED_CITIES,
  SEED_COLLECTIONS,
  SEED_EVENTS,
  SEED_MOVIES,
  SEED_RESTAURANTS,
  SEED_VENUES,
  type Activity,
  type Artist,
  type BookingRecord,
  type City,
  type CreateBookingInput,
  type EditorialCollection,
  type EventQueryInput,
  type Movie,
  type Offer,
  type PulseEvent,
  type Restaurant,
  type TicketTier,
  type Venue
} from "@nightlifez/shared";
import { getPool } from "./db.ts";

// In-memory store used strictly when DATABASE_URL is not configured (e.g. offline unit tests)
const memoryEvents: PulseEvent[] = structuredClone(SEED_EVENTS);
const memoryBookings: BookingRecord[] = [];

const seedEventMap = new Map(SEED_EVENTS.map((e) => [e.slug, e]));
const seedVenueMap = new Map(SEED_VENUES.map((v) => [v.slug, v]));
const seedCityMap = new Map(SEED_CITIES.map((c) => [c.slug, c]));

function mapRowToEvent(
  row: Record<string, unknown>,
  tiers: TicketTier[],
  offers: Offer[]
): PulseEvent {
  const slug = String(row.slug);
  const seedFallback = seedEventMap.get(slug);
  return {
    id: String(row.id),
    slug,
    title: String(row.title),
    category: row.category as PulseEvent["category"],
    citySlug: String(row.city_slug),
    venueSlug: String(row.venue_slug),
    venueName: String(row.venue_name),
    startsAt: new Date(String(row.starts_at)).toISOString(),
    endsAt: new Date(String(row.ends_at)).toISOString(),
    dateLabel: String(row.date_label),
    artworkUrl: row.artwork_url ? String(row.artwork_url) : seedFallback?.artworkUrl,
    ageLimit: row.age_limit ? String(row.age_limit) : seedFallback?.ageLimit,
    language: row.language ? String(row.language) : seedFallback?.language,
    durationLabel: row.duration_label ? String(row.duration_label) : seedFallback?.durationLabel,
    distanceKm:
      row.distance_km !== null && row.distance_km !== undefined
        ? Number(row.distance_km)
        : seedFallback?.distanceKm,
    sessions: seedFallback?.sessions,
    organizerName: String(row.organizer_name),
    organizerRating: Number(row.organizer_rating),
    organizerTenure: String(row.organizer_tenure),
    summary: String(row.summary),
    highlights: (row.highlights_json as PulseEvent["highlights"]) ?? [],
    facilities: (row.facilities_json as string[]) ?? [],
    policies: (row.policies_json as string[]) ?? [],
    lineup: ((row.lineup_json as PulseEvent["lineup"]) ?? []).map((l, idx) => ({
      ...l,
      slug: l.slug ?? seedFallback?.lineup[idx]?.slug,
      artworkUrl: l.artworkUrl ?? seedFallback?.lineup[idx]?.artworkUrl
    })),
    salesTimeline: (row.sales_timeline_json as PulseEvent["salesTimeline"]) ?? [],
    activePhase: row.active_phase as PulseEvent["activePhase"],
    partialReservePercent:
      row.partial_reserve_percent === null || row.partial_reserve_percent === undefined
        ? null
        : Number(row.partial_reserve_percent),
    isFeatured: Boolean(row.is_featured),
    accentColor: String(row.accent_color),
    tiers,
    offers
  };
}

function mapTierRow(row: Record<string, unknown>): TicketTier {
  return {
    id: String(row.id),
    sectionId: String(row.section_id),
    name: String(row.name),
    description: String(row.description),
    priceInr: Number(row.price_inr),
    totalQuota: Number(row.total_quota),
    remainingQuota: Number(row.remaining_quota),
    maxPerOrder: Number(row.max_per_order),
    salesPhase: row.sales_phase as TicketTier["salesPhase"]
  };
}

function mapOfferRow(row: Record<string, unknown>): Offer {
  return {
    id: String(row.id),
    code: String(row.code),
    title: String(row.title),
    description: String(row.description),
    kind: row.kind as Offer["kind"],
    discountValue: Number(row.discount_value),
    maxDiscountInr:
      row.max_discount_inr === null || row.max_discount_inr === undefined
        ? null
        : Number(row.max_discount_inr),
    minOrderInr: Number(row.min_order_inr),
    minQty: Number(row.min_qty),
    expiresAt: new Date(String(row.expires_at)).toISOString(),
    isActive: Boolean(row.is_active)
  };
}

function filterAndSortEvents(events: PulseEvent[], query: EventQueryInput): PulseEvent[] {
  let result = events.slice();
  if (query.city && query.city !== "all") {
    result = result.filter((e) => e.citySlug === query.city);
  }
  if (query.category && query.category !== "all") {
    result = result.filter((e) => e.category === query.category);
  }
  if (query.q && query.q.trim().length > 0) {
    const needle = query.q.trim().toLowerCase();
    result = result.filter(
      (e) =>
        e.title.toLowerCase().includes(needle) ||
        e.venueName.toLowerCase().includes(needle) ||
        e.summary.toLowerCase().includes(needle) ||
        e.category.toLowerCase().includes(needle) ||
        e.lineup.some((a) => a.name.toLowerCase().includes(needle))
    );
  }
  if (query.dateWindow === "weekend") {
    result = result.filter((e) => {
      const day = new Date(e.startsAt).getUTCDay();
      return day === 0 || day === 6 || day === 5;
    });
  } else if (query.dateWindow === "today") {
    result = result.slice(0, 2);
  } else if (query.dateWindow === "tomorrow") {
    result = result.slice(1, 4);
  }

  if (query.maxPriceInr) {
    result = result.filter((e) => getMinTierPrice(e.tiers) <= query.maxPriceInr!);
  }
  if (query.maxDistanceKm) {
    result = result.filter((e) => (e.distanceKm ?? 5) <= query.maxDistanceKm!);
  }

  if (query.sort === "price_asc") {
    result.sort((a, b) => getMinTierPrice(a.tiers) - getMinTierPrice(b.tiers));
  } else if (query.sort === "price_desc") {
    result.sort((a, b) => getMinTierPrice(b.tiers) - getMinTierPrice(a.tiers));
  } else if (query.sort === "date_asc") {
    result.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  } else {
    result.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
  }
  return result;
}

export async function listCitiesAndEvents(
  query: EventQueryInput = {}
): Promise<{ cities: City[]; events: PulseEvent[] }> {
  const pool = getPool();
  if (!pool) {
    return { cities: SEED_CITIES, events: filterAndSortEvents(memoryEvents, query) };
  }

  const [cityRes, evtRes, tierRes, offerRes] = await Promise.all([
    pool.query("SELECT slug, name, state, is_popular FROM cities ORDER BY is_popular DESC, name ASC"),
    pool.query("SELECT * FROM events ORDER BY is_featured DESC, starts_at ASC"),
    pool.query("SELECT * FROM ticket_tiers ORDER BY price_inr ASC"),
    pool.query("SELECT * FROM offers ORDER BY min_order_inr ASC")
  ]);

  const tiersByEvt = new Map<string, TicketTier[]>();
  for (const row of tierRes.rows) {
    const eid = String(row.event_id);
    const arr = tiersByEvt.get(eid) ?? [];
    arr.push(mapTierRow(row));
    tiersByEvt.set(eid, arr);
  }

  const offersByEvt = new Map<string, Offer[]>();
  for (const row of offerRes.rows) {
    const eid = String(row.event_id);
    const arr = offersByEvt.get(eid) ?? [];
    arr.push(mapOfferRow(row));
    offersByEvt.set(eid, arr);
  }

  const cities: City[] = cityRes.rows.map((r) => {
    const slug = String(r.slug);
    return {
      slug,
      name: String(r.name),
      state: String(r.state),
      locality: seedCityMap.get(slug)?.locality,
      isPopular: Boolean(r.is_popular)
    };
  });

  const events = evtRes.rows.map((r) =>
    mapRowToEvent(r, tiersByEvt.get(String(r.id)) ?? [], offersByEvt.get(String(r.id)) ?? [])
  );

  // Merge any newer seed events not yet migrated in DB so preview stays complete
  const dbSlugs = new Set(events.map((e) => e.slug));
  for (const seedEvt of SEED_EVENTS) {
    if (!dbSlugs.has(seedEvt.slug)) {
      events.push(seedEvt);
    }
  }

  return { cities, events: filterAndSortEvents(events, query) };
}

export async function getEventDetail(
  slug: string
): Promise<{ event: PulseEvent; venue: Venue | null } | null> {
  const { events } = await listCitiesAndEvents();
  const event = events.find((e) => e.slug === slug);
  if (!event) return null;

  const venueData = await getVenueDetail(event.venueSlug);
  return { event, venue: venueData?.venue ?? null };
}

export async function listVenues(citySlug?: string): Promise<Venue[]> {
  if (!citySlug || citySlug === "all") return SEED_VENUES;
  return SEED_VENUES.filter((v) => v.citySlug === citySlug);
}

export async function getVenueDetail(
  slug: string
): Promise<{ venue: Venue; upcomingEvents: PulseEvent[] } | null> {
  const pool = getPool();
  if (!pool) {
    const venue = SEED_VENUES.find((v) => v.slug === slug);
    if (!venue) return null;
    return {
      venue,
      upcomingEvents: memoryEvents.filter((e) => e.venueSlug === slug)
    };
  }

  const vRes = await pool.query("SELECT * FROM venues WHERE slug = $1 LIMIT 1", [slug]);
  if (vRes.rowCount === 0) {
    const seedVenue = seedVenueMap.get(slug);
    if (!seedVenue) return null;
    const { events } = await listCitiesAndEvents();
    return { venue: seedVenue, upcomingEvents: events.filter((e) => e.venueSlug === slug) };
  }
  const r = vRes.rows[0];
  const seedVenue = seedVenueMap.get(slug);
  const venue: Venue = {
    slug: String(r.slug),
    name: String(r.name),
    citySlug: String(r.city_slug),
    address: String(r.address),
    headline: String(r.headline),
    summary: String(r.summary),
    openStatusLabel: String(r.open_status_label),
    artworkUrl: r.artwork_url ? String(r.artwork_url) : seedVenue?.artworkUrl,
    distanceKm:
      r.distance_km !== null && r.distance_km !== undefined
        ? Number(r.distance_km)
        : seedVenue?.distanceKm,
    timings: (r.timings_json as Venue["timings"]) ?? [],
    facilities: (r.facilities_json as string[]) ?? [],
    sections: (r.sections_json as Venue["sections"]) ?? []
  };

  const { events } = await listCitiesAndEvents();
  return {
    venue,
    upcomingEvents: events.filter((e) => e.venueSlug === slug)
  };
}

// Clean demo adapter interfaces for Artists, Movies, Dining, Activities, Collections
export async function listArtists(city?: string): Promise<Artist[]> {
  if (!city || city === "all") return SEED_ARTISTS;
  return SEED_ARTISTS.filter((a) => a.citySlug === city);
}

export async function getArtistDetail(
  slug: string
): Promise<{ artist: Artist; events: PulseEvent[] } | null> {
  const artist = SEED_ARTISTS.find((a) => a.slug === slug);
  if (!artist) return null;
  const { events } = await listCitiesAndEvents();
  const matching = events.filter(
    (e) =>
      artist.upcomingEventSlugs.includes(e.slug) ||
      e.lineup.some((l) => l.name.toLowerCase() === artist.name.toLowerCase())
  );
  return { artist, events: matching };
}

export async function listMovies(filters?: {
  city?: string;
  language?: string;
  genre?: string;
  q?: string;
}): Promise<Movie[]> {
  let result = SEED_MOVIES.slice();
  if (filters?.language && filters.language !== "all") {
    result = result.filter((m) => m.language.toLowerCase() === filters.language!.toLowerCase());
  }
  if (filters?.genre && filters.genre !== "all") {
    result = result.filter((m) =>
      m.genres.some((g) => g.toLowerCase() === filters.genre!.toLowerCase())
    );
  }
  if (filters?.city && filters.city !== "all") {
    result = result.filter((m) => m.showtimes.some((s) => s.citySlug === filters.city));
  }
  if (filters?.q && filters.q.trim()) {
    const q = filters.q.trim().toLowerCase();
    result = result.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.language.toLowerCase().includes(q) ||
        m.genres.some((g) => g.toLowerCase().includes(q))
    );
  }
  return result;
}

export async function getMovieDetail(slug: string): Promise<Movie | null> {
  return SEED_MOVIES.find((m) => m.slug === slug) ?? null;
}

export async function listRestaurants(filters?: {
  city?: string;
  cuisine?: string;
  maxBudget?: number;
  q?: string;
}): Promise<Restaurant[]> {
  let result = SEED_RESTAURANTS.slice();
  if (filters?.city && filters.city !== "all") {
    result = result.filter((r) => r.citySlug === filters.city);
  }
  if (filters?.cuisine && filters.cuisine !== "all") {
    result = result.filter((r) =>
      r.cuisines.some((c) => c.toLowerCase().includes(filters.cuisine!.toLowerCase()))
    );
  }
  if (filters?.maxBudget) {
    result = result.filter((r) => r.budgetForTwoInr <= filters.maxBudget!);
  }
  if (filters?.q && filters.q.trim()) {
    const q = filters.q.trim().toLowerCase();
    result = result.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.locality.toLowerCase().includes(q) ||
        r.cuisines.some((c) => c.toLowerCase().includes(q))
    );
  }
  return result;
}

export async function getRestaurantDetail(slug: string): Promise<Restaurant | null> {
  return SEED_RESTAURANTS.find((r) => r.slug === slug) ?? null;
}

export async function listActivities(filters?: {
  city?: string;
  category?: string;
  q?: string;
}): Promise<Activity[]> {
  let result = SEED_ACTIVITIES.slice();
  if (filters?.city && filters.city !== "all") {
    result = result.filter((a) => a.citySlug === filters.city);
  }
  if (filters?.category && filters.category !== "all") {
    result = result.filter((a) => a.category === filters.category);
  }
  if (filters?.q && filters.q.trim()) {
    const q = filters.q.trim().toLowerCase();
    result = result.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.venueName.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
    );
  }
  return result;
}

export async function getActivityDetail(slug: string): Promise<Activity | null> {
  return SEED_ACTIVITIES.find((a) => a.slug === slug) ?? null;
}

export async function listCollections(): Promise<EditorialCollection[]> {
  return SEED_COLLECTIONS;
}

export async function listBookings(email?: string): Promise<BookingRecord[]> {
  const pool = getPool();
  if (!pool) {
    return email
      ? memoryBookings.filter((b) => b.attendeeEmail.toLowerCase() === email.toLowerCase())
      : memoryBookings.slice();
  }

  const bRes = email
    ? await pool.query(
        "SELECT * FROM bookings WHERE LOWER(attendee_email) = LOWER($1) ORDER BY created_at DESC",
        [email]
      )
    : await pool.query("SELECT * FROM bookings ORDER BY created_at DESC LIMIT 50");

  if (bRes.rows.length === 0) return [];
  const ids = bRes.rows.map((r) => String(r.id));
  const itemRes = await pool.query("SELECT * FROM booking_items WHERE booking_id = ANY($1::text[])", [ids]);

  const itemsByBooking = new Map<string, BookingRecord["items"]>();
  for (const row of itemRes.rows) {
    const bid = String(row.booking_id);
    const arr = itemsByBooking.get(bid) ?? [];
    arr.push({
      tierId: String(row.tier_id),
      tierName: String(row.tier_name),
      quantity: Number(row.quantity),
      unitPriceInr: Number(row.unit_price_inr)
    });
    itemsByBooking.set(bid, arr);
  }

  return bRes.rows.map((r) => ({
    id: String(r.id),
    referenceCode: String(r.reference_code),
    attendeeEmail: String(r.attendee_email),
    attendeeName: String(r.attendee_name),
    eventId: String(r.event_id),
    eventSlug: String(r.event_slug),
    eventTitle: String(r.event_title),
    venueName: String(r.venue_name),
    dateLabel: String(r.date_label),
    offerCode: r.offer_code ? String(r.offer_code) : null,
    subtotalInr: Number(r.subtotal_inr),
    discountInr: Number(r.discount_inr),
    convenienceFeeInr: Number(r.convenience_fee_inr),
    gstInr: Number(r.gst_inr),
    totalInr: Number(r.total_inr),
    status: r.status as BookingRecord["status"],
    paymentMode: "DEMO_NO_CHARGE",
    createdAt: new Date(String(r.created_at)).toISOString(),
    items: itemsByBooking.get(String(r.id)) ?? []
  }));
}

export async function createDemoBooking(rawInput: CreateBookingInput): Promise<BookingRecord> {
  const input = createBookingSchema.parse(rawInput);
  const detail = await getEventDetail(input.eventSlug);
  if (!detail) {
    throw new Error("Event not found.");
  }
  const { event } = detail;

  const breakdown = calculatePriceBreakdown({
    tiers: event.tiers,
    selections: input.items,
    offers: event.offers,
    offerCode: input.offerCode
  });

  if (breakdown.totalQuantity <= 0 || breakdown.totalQuantity > 10) {
    throw new Error("Total ticket quantity must be between 1 and 10 per order.");
  }
  if (input.offerCode && breakdown.offerRejectionReason) {
    throw new Error(breakdown.offerRejectionReason);
  }

  const bookingId = `bkg_${crypto.randomUUID().slice(0, 12)}`;
  const refCode = `NLZ-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  const pool = getPool();
  if (!pool) {
    const items: BookingRecord["items"] = [];
    for (const sel of input.items) {
      const tier = event.tiers.find((t) => t.id === sel.tierId);
      if (!tier) throw new Error(`Unknown ticket tier: ${sel.tierId}`);
      if (tier.remainingQuota < sel.quantity) {
        throw new Error(`Insufficient quota remaining for ${tier.name}.`);
      }
      if (sel.quantity > tier.maxPerOrder) {
        throw new Error(`Maximum ${tier.maxPerOrder} tickets allowed for ${tier.name}.`);
      }
      tier.remainingQuota -= sel.quantity;
      items.push({
        tierId: tier.id,
        tierName: tier.name,
        quantity: sel.quantity,
        unitPriceInr: tier.priceInr
      });
    }
    const record: BookingRecord = {
      id: bookingId,
      referenceCode: refCode,
      attendeeEmail: input.attendeeEmail,
      attendeeName: input.attendeeName,
      eventId: event.id,
      eventSlug: event.slug,
      eventTitle: event.title,
      venueName: event.venueName,
      dateLabel: event.dateLabel,
      offerCode: breakdown.appliedOfferCode,
      subtotalInr: breakdown.subtotalInr,
      discountInr: breakdown.discountInr,
      convenienceFeeInr: breakdown.convenienceFeeInr,
      gstInr: breakdown.gstInr,
      totalInr: breakdown.totalInr,
      status: "CONFIRMED_DEMO",
      paymentMode: "DEMO_NO_CHARGE",
      createdAt: new Date().toISOString(),
      items
    };
    memoryBookings.unshift(record);
    return record;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const items: BookingRecord["items"] = [];
    for (const sel of input.items) {
      const tRes = await client.query(
        "SELECT id, name, price_inr, remaining_quota, max_per_order FROM ticket_tiers WHERE id = $1 AND event_id = $2 FOR UPDATE",
        [sel.tierId, event.id]
      );
      if (tRes.rowCount === 0) throw new Error(`Unknown ticket tier: ${sel.tierId}`);
      const row = tRes.rows[0];
      if (Number(row.remaining_quota) < sel.quantity) {
        throw new Error(`Insufficient quota remaining for ${String(row.name)}.`);
      }
      if (sel.quantity > Number(row.max_per_order)) {
        throw new Error(`Maximum ${Number(row.max_per_order)} tickets allowed for ${String(row.name)}.`);
      }
      await client.query("UPDATE ticket_tiers SET remaining_quota = remaining_quota - $1 WHERE id = $2", [
        sel.quantity,
        sel.tierId
      ]);
      items.push({
        tierId: String(row.id),
        tierName: String(row.name),
        quantity: sel.quantity,
        unitPriceInr: Number(row.price_inr)
      });
    }

    const insertRes = await client.query(
      `INSERT INTO bookings (
         id, reference_code, attendee_email, attendee_name, event_id, event_slug,
         event_title, venue_name, date_label, offer_code, subtotal_inr, discount_inr,
         convenience_fee_inr, gst_inr, total_inr, status, payment_mode
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'CONFIRMED_DEMO','DEMO_NO_CHARGE')
       RETURNING created_at`,
      [
        bookingId,
        refCode,
        input.attendeeEmail,
        input.attendeeName,
        event.id,
        event.slug,
        event.title,
        event.venueName,
        event.dateLabel,
        breakdown.appliedOfferCode,
        breakdown.subtotalInr,
        breakdown.discountInr,
        breakdown.convenienceFeeInr,
        breakdown.gstInr,
        breakdown.totalInr
      ]
    );

    for (const item of items) {
      await client.query(
        `INSERT INTO booking_items (booking_id, tier_id, tier_name, quantity, unit_price_inr)
         VALUES ($1, $2, $3, $4, $5)`,
        [bookingId, item.tierId, item.tierName, item.quantity, item.unitPriceInr]
      );
    }

    await client.query("COMMIT");
    return {
      id: bookingId,
      referenceCode: refCode,
      attendeeEmail: input.attendeeEmail,
      attendeeName: input.attendeeName,
      eventId: event.id,
      eventSlug: event.slug,
      eventTitle: event.title,
      venueName: event.venueName,
      dateLabel: event.dateLabel,
      offerCode: breakdown.appliedOfferCode,
      subtotalInr: breakdown.subtotalInr,
      discountInr: breakdown.discountInr,
      convenienceFeeInr: breakdown.convenienceFeeInr,
      gstInr: breakdown.gstInr,
      totalInr: breakdown.totalInr,
      status: "CONFIRMED_DEMO",
      paymentMode: "DEMO_NO_CHARGE",
      createdAt: new Date(String(insertRes.rows[0].created_at)).toISOString(),
      items
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function cancelDemoBooking(id: string): Promise<BookingRecord> {
  const pool = getPool();
  if (!pool) {
    const existing = memoryBookings.find((b) => b.id === id);
    if (!existing) throw new Error("Booking not found.");
    if (existing.status === "CANCELLED") return existing;
    existing.status = "CANCELLED";
    const evt = memoryEvents.find((e) => e.id === existing.eventId);
    if (evt) {
      for (const item of existing.items) {
        const tier = evt.tiers.find((t) => t.id === item.tierId);
        if (tier) tier.remainingQuota += item.quantity;
      }
    }
    return existing;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const bRes = await client.query("SELECT * FROM bookings WHERE id = $1 FOR UPDATE", [id]);
    if (bRes.rowCount === 0) throw new Error("Booking not found.");
    const row = bRes.rows[0];
    const itemRes = await client.query("SELECT * FROM booking_items WHERE booking_id = $1", [id]);

    if (String(row.status) !== "CANCELLED") {
      await client.query("UPDATE bookings SET status = 'CANCELLED' WHERE id = $1", [id]);
      for (const item of itemRes.rows) {
        await client.query(
          "UPDATE ticket_tiers SET remaining_quota = remaining_quota + $1 WHERE id = $2",
          [Number(item.quantity), String(item.tier_id)]
        );
      }
    }

    await client.query("COMMIT");
    return {
      id: String(row.id),
      referenceCode: String(row.reference_code),
      attendeeEmail: String(row.attendee_email),
      attendeeName: String(row.attendee_name),
      eventId: String(row.event_id),
      eventSlug: String(row.event_slug),
      eventTitle: String(row.event_title),
      venueName: String(row.venue_name),
      dateLabel: String(row.date_label),
      offerCode: row.offer_code ? String(row.offer_code) : null,
      subtotalInr: Number(row.subtotal_inr),
      discountInr: Number(row.discount_inr),
      convenienceFeeInr: Number(row.convenience_fee_inr),
      gstInr: Number(row.gst_inr),
      totalInr: Number(row.total_inr),
      status: "CANCELLED",
      paymentMode: "DEMO_NO_CHARGE",
      createdAt: new Date(String(row.created_at)).toISOString(),
      items: itemRes.rows.map((item) => ({
        tierId: String(item.tier_id),
        tierName: String(item.tier_name),
        quantity: Number(item.quantity),
        unitPriceInr: Number(item.unit_price_inr)
      }))
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
