CREATE TABLE IF NOT EXISTS cities (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  is_popular BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS venues (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city_slug TEXT NOT NULL REFERENCES cities(slug),
  address TEXT NOT NULL,
  headline TEXT NOT NULL,
  summary TEXT NOT NULL,
  open_status_label TEXT NOT NULL,
  timings_json JSONB NOT NULL,
  facilities_json JSONB NOT NULL,
  sections_json JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  city_slug TEXT NOT NULL REFERENCES cities(slug),
  venue_slug TEXT NOT NULL REFERENCES venues(slug),
  venue_name TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  date_label TEXT NOT NULL,
  organizer_name TEXT NOT NULL,
  organizer_rating INTEGER NOT NULL,
  organizer_tenure TEXT NOT NULL,
  summary TEXT NOT NULL,
  highlights_json JSONB NOT NULL,
  facilities_json JSONB NOT NULL,
  policies_json JSONB NOT NULL,
  lineup_json JSONB NOT NULL,
  sales_timeline_json JSONB NOT NULL,
  active_phase TEXT NOT NULL,
  partial_reserve_percent INTEGER,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  accent_color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ticket_tiers (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price_inr INTEGER NOT NULL,
  total_quota INTEGER NOT NULL,
  remaining_quota INTEGER NOT NULL,
  max_per_order INTEGER NOT NULL,
  sales_phase TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  kind TEXT NOT NULL,
  discount_value INTEGER NOT NULL,
  max_discount_inr INTEGER,
  min_order_inr INTEGER NOT NULL,
  min_qty INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  reference_code TEXT UNIQUE NOT NULL,
  attendee_email TEXT NOT NULL,
  attendee_name TEXT NOT NULL,
  event_id TEXT NOT NULL REFERENCES events(id),
  event_slug TEXT NOT NULL,
  event_title TEXT NOT NULL,
  venue_name TEXT NOT NULL,
  date_label TEXT NOT NULL,
  offer_code TEXT,
  subtotal_inr INTEGER NOT NULL,
  discount_inr INTEGER NOT NULL,
  convenience_fee_inr INTEGER NOT NULL,
  gst_inr INTEGER NOT NULL,
  total_inr INTEGER NOT NULL,
  status TEXT NOT NULL,
  payment_mode TEXT NOT NULL DEFAULT 'DEMO_NO_CHARGE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booking_items (
  id SERIAL PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  tier_id TEXT NOT NULL REFERENCES ticket_tiers(id),
  tier_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price_inr INTEGER NOT NULL
);
