import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import {
  DISCOVERY_CATEGORIES,
  SEED_CITIES,
  SEED_EVENTS,
  SEED_FEATURE_FLAGS,
  SEED_NOTIFICATIONS,
  SEED_ORGANIZATIONS,
  SEED_SUPPORT_CASES,
  SEED_VENUES
} from "../../shared/src/index.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env.local");

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing DIRECT_URL or DATABASE_URL for migration.");
  process.exit(1);
}

function hashSandboxPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

const SANDBOX_PASS = process.env.NIGHTLIFEZ_SANDBOX_DEMO_PASSWORD || "NightlifezDemo#2026";

const SANDBOX_USERS = [
  {
    id: "usr-attendee-demo",
    email: "asha@nightlifez.test",
    fullName: "Asha Rao",
    city: "bengaluru",
    categories: ["concerts", "dining"],
    roles: [{ id: "ra-att-1", role: "attendee", org: null, venue: null, event: null }]
  },
  {
    id: "usr-super-admin",
    email: "admin@nightlifez.test",
    fullName: "Nikhil Verma (Platform Admin)",
    city: "bengaluru",
    categories: ["concerts", "festivals"],
    roles: [{ id: "ra-adm-1", role: "platform_super_admin", org: null, venue: null, event: null }]
  },
  {
    id: "usr-support-agent",
    email: "support@nightlifez.test",
    fullName: "Riya Menon (Support Agent)",
    city: "mumbai",
    categories: ["comedy"],
    roles: [{ id: "ra-sup-1", role: "support_agent", org: null, venue: null, event: null }]
  },
  {
    id: "usr-finance-ops",
    email: "finance@nightlifez.test",
    fullName: "Vikram Kulkarni (Finance Ops)",
    city: "mumbai",
    categories: ["festivals"],
    roles: [{ id: "ra-fin-1", role: "finance_ops", org: null, venue: null, event: null }]
  },
  {
    id: "usr-organiser-owner",
    email: "organiser@nightlifez.test",
    fullName: "Meera Nair (Organiser Owner)",
    city: "bengaluru",
    categories: ["festivals", "music"],
    roles: [
      {
        id: "ra-org-1",
        role: "organiser_owner",
        org: "org-nightlifez-originals",
        venue: null,
        event: null
      },
      {
        id: "ra-org-2",
        role: "organiser_admin",
        org: "org-harbor-collective",
        venue: null,
        event: null
      }
    ]
  },
  {
    id: "usr-venue-manager",
    email: "venue@nightlifez.test",
    fullName: "Arjun Shetty (Venue Manager)",
    city: "bengaluru",
    categories: ["concerts"],
    roles: [
      {
        id: "ra-ven-1",
        role: "venue_manager",
        org: "org-nightlifez-originals",
        venue: "skyline-amphitheatre-bengaluru",
        event: null
      }
    ]
  },
  {
    id: "usr-checkin-staff",
    email: "staff@nightlifez.test",
    fullName: "Kiran Das (Gate Staff)",
    city: "bengaluru",
    categories: ["concerts"],
    roles: [
      {
        id: "ra-stf-1",
        role: "checkin_staff",
        org: "org-nightlifez-originals",
        venue: "skyline-amphitheatre-bengaluru",
        event: "evt-solstice-2026"
      },
      {
        id: "ra-stf-2",
        role: "box_office",
        org: "org-nightlifez-originals",
        venue: "banyan-courtyard-coimbatore",
        event: "evt-southern-cipher-2026"
      }
    ]
  }
];

const schemaSql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(schemaSql);

    for (const city of SEED_CITIES) {
      await client.query(
        `INSERT INTO cities (slug, name, state, locality, is_popular)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, state = EXCLUDED.state, locality = EXCLUDED.locality, is_popular = EXCLUDED.is_popular`,
        [city.slug, city.name, city.state, city.locality ?? null, city.isPopular]
      );
    }

    for (const cat of DISCOVERY_CATEGORIES) {
      await client.query(
        `INSERT INTO master_categories (key, label, color, is_active)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, color = EXCLUDED.color`,
        [cat.key, cat.label, cat.color]
      );
    }

    for (const u of SANDBOX_USERS) {
      await client.query(
        `INSERT INTO users (id, email, password_hash, full_name, preferred_city_slug, favorite_categories_json, status)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'ACTIVE')
         ON CONFLICT (id) DO NOTHING`,
        [
          u.id,
          u.email,
          hashSandboxPassword(SANDBOX_PASS),
          u.fullName,
          u.city,
          JSON.stringify(u.categories)
        ]
      );
      for (const r of u.roles) {
        await client.query(
          `INSERT INTO role_assignments (id, user_id, role, organization_id, venue_slug, event_id, granted_by)
           VALUES ($1, $2, $3, $4, $5, $6, 'usr-super-admin')
           ON CONFLICT (id) DO NOTHING`,
          [r.id, u.id, r.role, r.org, r.venue, r.event]
        );
      }
    }

    for (const org of SEED_ORGANIZATIONS) {
      await client.query(
        `INSERT INTO organizations (id, slug, name, legal_name, contact_email, city_slug, approval_status, rating, tenure_label, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           legal_name = EXCLUDED.legal_name,
           contact_email = EXCLUDED.contact_email,
           approval_status = EXCLUDED.approval_status`,
        [
          org.id,
          org.slug,
          org.name,
          org.legalName,
          org.contactEmail,
          org.citySlug,
          org.approvalStatus,
          org.rating,
          org.tenureLabel,
          org.createdBy === "usr-organiser-pending" ? null : org.createdBy
        ]
      );
    }

    for (const venue of SEED_VENUES) {
      await client.query(
        `INSERT INTO venues (slug, name, city_slug, address, headline, summary, open_status_label, artwork_url, distance_km, organization_id, approval_status, timings_json, facilities_json, sections_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'APPROVED', $11::jsonb, $12::jsonb, $13::jsonb)
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           city_slug = EXCLUDED.city_slug,
           address = EXCLUDED.address,
           headline = EXCLUDED.headline,
           summary = EXCLUDED.summary,
           open_status_label = EXCLUDED.open_status_label,
           artwork_url = EXCLUDED.artwork_url,
           distance_km = EXCLUDED.distance_km,
           organization_id = COALESCE(venues.organization_id, EXCLUDED.organization_id),
           timings_json = EXCLUDED.timings_json,
           facilities_json = EXCLUDED.facilities_json,
           sections_json = EXCLUDED.sections_json`,
        [
          venue.slug,
          venue.name,
          venue.citySlug,
          venue.address,
          venue.headline,
          venue.summary,
          venue.openStatusLabel,
          venue.artworkUrl ?? null,
          venue.distanceKm ?? null,
          venue.citySlug === "mumbai" ? "org-harbor-collective" : "org-nightlifez-originals",
          JSON.stringify(venue.timings),
          JSON.stringify(venue.facilities),
          JSON.stringify(venue.sections)
        ]
      );
    }

    for (const evt of SEED_EVENTS) {
      const orgId =
        evt.organizerName === "Harbor Collective"
          ? "org-harbor-collective"
          : "org-nightlifez-originals";
      await client.query(
        `INSERT INTO events (
           id, slug, title, category, city_slug, venue_slug, venue_name,
           starts_at, ends_at, date_label, artwork_url, age_limit, language,
           duration_label, distance_km, organization_id, lifecycle_status,
           organizer_name, organizer_rating, organizer_tenure, summary,
           highlights_json, facilities_json, policies_json, lineup_json,
           sales_timeline_json, active_phase, partial_reserve_percent,
           is_featured, accent_color
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7,
           $8, $9, $10, $11, $12, $13,
           $14, $15, $16, 'PUBLISHED',
           $17, $18, $19, $20,
           $21::jsonb, $22::jsonb, $23::jsonb, $24::jsonb,
           $25::jsonb, $26, $27, $28, $29
         )
         ON CONFLICT (id) DO UPDATE SET
           slug = EXCLUDED.slug,
           title = EXCLUDED.title,
           category = EXCLUDED.category,
           city_slug = EXCLUDED.city_slug,
           venue_slug = EXCLUDED.venue_slug,
           venue_name = EXCLUDED.venue_name,
           starts_at = EXCLUDED.starts_at,
           ends_at = EXCLUDED.ends_at,
           date_label = EXCLUDED.date_label,
           artwork_url = EXCLUDED.artwork_url,
           age_limit = EXCLUDED.age_limit,
           language = EXCLUDED.language,
           duration_label = EXCLUDED.duration_label,
           distance_km = EXCLUDED.distance_km,
           organization_id = COALESCE(events.organization_id, EXCLUDED.organization_id),
           organizer_name = EXCLUDED.organizer_name,
           organizer_rating = EXCLUDED.organizer_rating,
           organizer_tenure = EXCLUDED.organizer_tenure,
           summary = EXCLUDED.summary,
           highlights_json = EXCLUDED.highlights_json,
           facilities_json = EXCLUDED.facilities_json,
           policies_json = EXCLUDED.policies_json,
           lineup_json = EXCLUDED.lineup_json,
           sales_timeline_json = EXCLUDED.sales_timeline_json,
           active_phase = EXCLUDED.active_phase,
           partial_reserve_percent = EXCLUDED.partial_reserve_percent,
           is_featured = EXCLUDED.is_featured,
           accent_color = EXCLUDED.accent_color`,
        [
          evt.id,
          evt.slug,
          evt.title,
          evt.category,
          evt.citySlug,
          evt.venueSlug,
          evt.venueName,
          evt.startsAt,
          evt.endsAt,
          evt.dateLabel,
          evt.artworkUrl ?? null,
          evt.ageLimit ?? null,
          evt.language ?? null,
          evt.durationLabel ?? null,
          evt.distanceKm ?? null,
          orgId,
          evt.organizerName,
          evt.organizerRating,
          evt.organizerTenure,
          evt.summary,
          JSON.stringify(evt.highlights),
          JSON.stringify(evt.facilities),
          JSON.stringify(evt.policies),
          JSON.stringify(evt.lineup),
          JSON.stringify(evt.salesTimeline),
          evt.activePhase,
          evt.partialReservePercent,
          evt.isFeatured,
          evt.accentColor
        ]
      );

      for (const tier of evt.tiers) {
        await client.query(
          `INSERT INTO ticket_tiers (id, event_id, section_id, name, description, price_inr, total_quota, remaining_quota, max_per_order, sales_phase)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
            evt.id,
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

      for (const offer of evt.offers) {
        await client.query(
          `INSERT INTO offers (id, event_id, organization_id, code, title, description, kind, discount_value, max_discount_inr, min_order_inr, min_qty, expires_at, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (id) DO UPDATE SET
             code = EXCLUDED.code,
             title = EXCLUDED.title,
             description = EXCLUDED.description,
             kind = EXCLUDED.kind,
             discount_value = EXCLUDED.discount_value,
             max_discount_inr = EXCLUDED.max_discount_inr,
             min_order_inr = EXCLUDED.min_order_inr,
             min_qty = EXCLUDED.min_qty,
             expires_at = EXCLUDED.expires_at,
             is_active = EXCLUDED.is_active`,
          [
            offer.id,
            evt.id,
            orgId,
            offer.code,
            offer.title,
            offer.description,
            offer.kind,
            offer.discountValue,
            offer.maxDiscountInr,
            offer.minOrderInr,
            offer.minQty,
            offer.expiresAt,
            offer.isActive
          ]
        );
      }
    }

    for (const flag of SEED_FEATURE_FLAGS) {
      await client.query(
        `INSERT INTO feature_flags (key, enabled, description, updated_by, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (key) DO NOTHING`,
        [flag.key, flag.enabled, flag.description, flag.updatedBy, flag.updatedAt]
      );
    }

    for (const n of SEED_NOTIFICATIONS) {
      await client.query(
        `INSERT INTO notifications (id, user_id, audience, title, body, kind, is_read, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [n.id, n.userId, n.audience, n.title, n.body, n.kind, n.isRead, n.createdAt]
      );
    }

    for (const c of SEED_SUPPORT_CASES) {
      await client.query(
        `INSERT INTO support_cases (id, user_id, booking_id, event_id, subject, category, priority, status, assigned_to, notes_json, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12)
         ON CONFLICT (id) DO NOTHING`,
        [
          c.id,
          c.userId,
          c.bookingId,
          c.eventId,
          c.subject,
          c.category,
          c.priority,
          c.status,
          c.assignedTo,
          JSON.stringify(c.notes),
          c.createdAt,
          c.updatedAt
        ]
      );
    }

    await client.query("COMMIT");
    console.log("Migration and seed completed:", {
      cities: SEED_CITIES.length,
      organizations: SEED_ORGANIZATIONS.length,
      venues: SEED_VENUES.length,
      events: SEED_EVENTS.length,
      sandboxUsers: SANDBOX_USERS.length
    });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
