# System Architecture & Data Models

## Monorepo Layout (`implementation/`)

- `implementation/shared`: Pure TypeScript package (`@nightlifez/shared`) containing domain types, Zod validation schemas, deterministic ticket pricing & offer engine, sales phase state helpers, design tokens, and synthetic seed catalog.
- `implementation/web`: Next.js App Router + TypeScript + Tailwind CSS responsive web application + REST API routes (`/api/health`, `/api/events`, `/api/events/[slug]`, `/api/venues/[slug]`, `/api/bookings`, `/api/bookings/[id]/cancel`) backed by PostgreSQL (Neon Free) with safe synthetic fallback when `DATABASE_URL` is unset in local unit tests.
- `implementation/android`: React Native + Expo + Expo Router TypeScript native Android application sharing `@nightlifez/shared`, configured with EAS Build (`eas.json`) for Android APK (preview/testing) and AAB (production store release when authorized).

## PostgreSQL Schema (`implementation/web/db/schema.sql`)

1. `cities` (`id`, `slug`, `name`, `state`, `is_popular`)
2. `venues` (`id`, `slug`, `name`, `city_slug`, `address`, `timings_json`, `facilities_json`, `sections_json`)
3. `events` (`id`, `slug`, `title`, `category`, `city_slug`, `venue_slug`, `starts_at`, `ends_at`, `organizer_name`, `organizer_rating`, `summary`, `highlights_json`, `facilities_json`, `policies_json`, `lineup_json`, `sales_timeline_json`, `active_phase`, `is_featured`)
4. `ticket_tiers` (`id`, `event_id`, `section_id`, `name`, `description`, `price_inr`, `total_quota`, `remaining_quota`, `max_per_order`, `sales_phase`)
5. `offers` (`id`, `event_id`, `code`, `title`, `description`, `kind`, `discount_value`, `max_discount_inr`, `min_order_inr`, `min_qty`, `expires_at`, `is_active`)
6. `bookings` (`id`, `reference_code`, `attendee_email`, `attendee_name`, `event_id`, `offer_code`, `subtotal_inr`, `discount_inr`, `fee_inr`, `tax_inr`, `total_inr`, `status`, `created_at`)
7. `booking_items` (`id`, `booking_id`, `tier_id`, `tier_name`, `quantity`, `unit_price_inr`)
