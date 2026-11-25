import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { SEED_CITIES, SEED_EVENTS, SEED_VENUES } from "../../shared/src/seed.ts";

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

const schemaSql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(schemaSql);

    for (const city of SEED_CITIES) {
      await client.query(
        `INSERT INTO cities (slug, name, state, is_popular)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, state = EXCLUDED.state, is_popular = EXCLUDED.is_popular`,
        [city.slug, city.name, city.state, city.isPopular]
      );
    }

    for (const venue of SEED_VENUES) {
      await client.query(
        `INSERT INTO venues (slug, name, city_slug, address, headline, summary, open_status_label, timings_json, facilities_json, sections_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb)
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           city_slug = EXCLUDED.city_slug,
           address = EXCLUDED.address,
           headline = EXCLUDED.headline,
           summary = EXCLUDED.summary,
           open_status_label = EXCLUDED.open_status_label,
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
          JSON.stringify(venue.timings),
          JSON.stringify(venue.facilities),
          JSON.stringify(venue.sections)
        ]
      );
    }

    for (const evt of SEED_EVENTS) {
      await client.query(
        `INSERT INTO events (
           id, slug, title, category, city_slug, venue_slug, venue_name,
           starts_at, ends_at, date_label, organizer_name, organizer_rating,
           organizer_tenure, summary, highlights_json, facilities_json,
           policies_json, lineup_json, sales_timeline_json, active_phase,
           partial_reserve_percent, is_featured, accent_color
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7,
           $8, $9, $10, $11, $12,
           $13, $14, $15::jsonb, $16::jsonb,
           $17::jsonb, $18::jsonb, $19::jsonb, $20,
           $21, $22, $23
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
          `INSERT INTO offers (id, event_id, code, title, description, kind, discount_value, max_discount_inr, min_order_inr, min_qty, expires_at, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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

    await client.query("COMMIT");
    console.log("Migration and seed completed:", {
      cities: SEED_CITIES.length,
      venues: SEED_VENUES.length,
      events: SEED_EVENTS.length
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
