-- NIGHTLIFEZ Platform Relational Schema (PostgreSQL / Neon)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT,
  full_name TEXT NOT NULL,
  phone TEXT,
  phone_verified_at TIMESTAMPTZ,
  preferred_city_slug TEXT NOT NULL DEFAULT 'bengaluru',
  favorite_categories_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique ON users (phone) WHERE phone IS NOT NULL;

CREATE TABLE IF NOT EXISTS auth_otp_challenges (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'LOGIN',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  resend_count INTEGER NOT NULL DEFAULT 0,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_challenges_phone ON auth_otp_challenges (phone, created_at DESC);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  city_slug TEXT NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'PENDING',
  rating INTEGER NOT NULL DEFAULT 85,
  tenure_label TEXT NOT NULL DEFAULT 'New partner',
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS bio_intro TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS cover_artwork_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS public_contact_phone TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS public_contact_email TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS social_links_json JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS promoted_listings_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS promoted_event_slugs_json JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS cities (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  locality TEXT,
  is_popular BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE cities ADD COLUMN IF NOT EXISTS locality TEXT;

CREATE TABLE IF NOT EXISTS venues (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city_slug TEXT NOT NULL REFERENCES cities(slug),
  address TEXT NOT NULL,
  headline TEXT NOT NULL,
  summary TEXT NOT NULL,
  open_status_label TEXT NOT NULL,
  artwork_url TEXT,
  distance_km NUMERIC,
  timings_json JSONB NOT NULL,
  facilities_json JSONB NOT NULL,
  sections_json JSONB NOT NULL
);

ALTER TABLE venues ADD COLUMN IF NOT EXISTS artwork_url TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS distance_km NUMERIC;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'APPROVED';
ALTER TABLE venues ADD COLUMN IF NOT EXISTS policies_json JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS capacity_total INTEGER NOT NULL DEFAULT 500;

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
  artwork_url TEXT,
  age_limit TEXT,
  language TEXT,
  duration_label TEXT,
  distance_km NUMERIC,
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

ALTER TABLE events ADD COLUMN IF NOT EXISTS artwork_url TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS age_limit TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS language TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS duration_label TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS distance_km NUMERIC;
ALTER TABLE events ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE events ADD COLUMN IF NOT EXISTS moderation_notes TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE events ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE events ADD COLUMN IF NOT EXISTS approval_required BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS cloned_from_event_id TEXT;

CREATE TABLE IF NOT EXISTS booking_questions (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL,
  options_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  required BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_questions_event ON booking_questions (event_id, sort_order ASC);

CREATE TABLE IF NOT EXISTS event_occurrences (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  capacity INTEGER NOT NULL DEFAULT 500,
  status TEXT NOT NULL DEFAULT 'AVAILABLE'
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

ALTER TABLE ticket_tiers ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS inventory_holds (
  id TEXT PRIMARY KEY,
  hold_token TEXT UNIQUE NOT NULL,
  user_id TEXT,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tier_id TEXT NOT NULL REFERENCES ticket_tiers(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  seat_labels_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

ALTER TABLE offers ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS used_count INTEGER NOT NULL DEFAULT 0;

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

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hold_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS occurrence_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'CONFIRMED';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_ref TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'NOT_REQUIRED';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS approval_token TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS approval_expires_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_source TEXT NOT NULL DEFAULT 'ONLINE';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_channel TEXT NOT NULL DEFAULT 'DEMO_SANDBOX';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_submitted_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_submitted_ref TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_verified_by TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_rejection_reason TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_idempotency ON bookings (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_approval_token ON bookings (approval_token) WHERE approval_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_org_payment_status ON bookings (organization_id, payment_status, status);

CREATE TABLE IF NOT EXISTS organiser_payment_profiles (
  organization_id TEXT PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  upi_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  upi_id TEXT,
  payee_display_name TEXT,
  payment_instructions TEXT,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booking_attendees (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tier_id TEXT NOT NULL REFERENCES ticket_tiers(id),
  attendee_index INTEGER NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  answers_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ticket_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_attendees_booking ON booking_attendees (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_attendees_event_email ON booking_attendees (event_id, LOWER(email));

CREATE TABLE IF NOT EXISTS booking_items (
  id SERIAL PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  tier_id TEXT NOT NULL REFERENCES ticket_tiers(id),
  tier_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price_inr INTEGER NOT NULL
);

ALTER TABLE booking_items ADD COLUMN IF NOT EXISTS seat_labels_json JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS payment_records (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'DEMO_SANDBOX',
  mode TEXT NOT NULL DEFAULT 'DEMO_NO_CHARGE',
  amount_inr INTEGER NOT NULL,
  state TEXT NOT NULL,
  transaction_ref TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tier_id TEXT NOT NULL REFERENCES ticket_tiers(id),
  tier_name TEXT NOT NULL,
  holder_name TEXT NOT NULL,
  holder_email TEXT NOT NULL,
  ticket_code TEXT UNIQUE NOT NULL,
  qr_token TEXT UNIQUE NOT NULL,
  seat_label TEXT,
  status TEXT NOT NULL DEFAULT 'VALID',
  checked_in_at TIMESTAMPTZ,
  checked_in_by TEXT
);

CREATE TABLE IF NOT EXISTS ticket_scan_logs (
  id TEXT PRIMARY KEY,
  ticket_id TEXT REFERENCES tickets(id),
  ticket_code TEXT NOT NULL,
  event_id TEXT NOT NULL,
  scanned_by TEXT NOT NULL,
  device_id TEXT NOT NULL,
  scan_mode TEXT NOT NULL,
  client_scan_id TEXT NOT NULL,
  result TEXT NOT NULL,
  message TEXT NOT NULL,
  scanned_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_scan_logs_client_id ON ticket_scan_logs (device_id, client_scan_id);

CREATE TABLE IF NOT EXISTS role_assignments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  organization_id TEXT,
  venue_slug TEXT,
  event_id TEXT,
  granted_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_invitations (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  organization_id TEXT,
  venue_slug TEXT,
  event_id TEXT,
  token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  invited_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS refund_requests (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id TEXT,
  organization_id TEXT,
  amount_inr INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'REQUESTED',
  reviewed_by TEXT,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY,
  organization_id TEXT,
  booking_id TEXT,
  refund_id TEXT,
  settlement_id TEXT,
  entry_type TEXT NOT NULL,
  amount_inr INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  mode TEXT NOT NULL DEFAULT 'DEMO_LEDGER',
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settlements (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  period_label TEXT NOT NULL,
  gross_inr INTEGER NOT NULL,
  fees_inr INTEGER NOT NULL,
  refunds_inr INTEGER NOT NULL,
  net_payout_inr INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  approved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settled_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS support_cases (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  booking_id TEXT,
  event_id TEXT,
  subject TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  status TEXT NOT NULL DEFAULT 'OPEN',
  assigned_to TEXT,
  notes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  audience TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  kind TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, item_type, item_slug)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  before_json JSONB,
  after_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS master_categories (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  color TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS wallet_recovery_challenges (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  reference_code TEXT NOT NULL,
  attendee_email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ
);
