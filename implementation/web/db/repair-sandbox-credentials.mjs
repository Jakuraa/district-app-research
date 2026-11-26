import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

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

const CONFIRM_FLAG = process.argv.includes("--confirm") || process.env.CONFIRM_SANDBOX_CREDENTIAL_RESET === "YES";
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("ABORT: Missing DIRECT_URL or DATABASE_URL.");
  process.exit(1);
}

// Guard 1: Refuse execution in production runtime environments
if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
  console.error("ABORT: Refusing to run sandbox credential repair in production environment.");
  process.exit(1);
}

// Guard 2: Verify target database hostname is NOT a production database
let parsedUrl;
try {
  parsedUrl = new URL(connectionString);
} catch {
  console.error("ABORT: Invalid database connection URL.");
  process.exit(1);
}

const forbiddenPatterns = ["nightlifez.com", "prod", "production"];
const hostLower = parsedUrl.hostname.toLowerCase();
const dbLower = parsedUrl.pathname.toLowerCase();
if (forbiddenPatterns.some((p) => hostLower.includes(p) || dbLower.includes(p))) {
  console.error(`ABORT: Target database (${parsedUrl.hostname}${parsedUrl.pathname}) looks like production.`);
  process.exit(1);
}

if (
  process.env.NIGHTLIFEZ_PRODUCTION_DB_HOST &&
  hostLower === process.env.NIGHTLIFEZ_PRODUCTION_DB_HOST.toLowerCase()
) {
  console.error("ABORT: Target database matches NIGHTLIFEZ_PRODUCTION_DB_HOST.");
  process.exit(1);
}

if (!CONFIRM_FLAG) {
  console.error(
    `DRY-RUN GUARD: Target DB is ${parsedUrl.hostname}${parsedUrl.pathname}.\n` +
      "Re-run with --confirm (or CONFIRM_SANDBOX_CREDENTIAL_RESET=YES) to rotate @nightlifez.test QA credentials."
  );
  process.exit(1);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

const ROTATED_PASSWORD = process.env.NIGHTLIFEZ_SANDBOX_DEMO_PASSWORD || "NightlifezDemo#2026";

const QA_ACCOUNTS = [
  {
    id: "usr-attendee-demo",
    email: "asha@nightlifez.test",
    fullName: "Asha Rao",
    phone: "+919876500001",
    city: "bengaluru",
    categories: ["concerts", "dining"],
    roles: [{ id: "ra-att-1", role: "attendee", org: null, venue: null, event: null }]
  },
  {
    id: "usr-super-admin",
    email: "admin@nightlifez.test",
    fullName: "Nikhil Verma (Platform Admin)",
    phone: "+919876500002",
    city: "bengaluru",
    categories: ["concerts", "festivals"],
    roles: [{ id: "ra-adm-1", role: "platform_super_admin", org: null, venue: null, event: null }]
  },
  {
    id: "usr-support-agent",
    email: "support@nightlifez.test",
    fullName: "Riya Menon (Support Agent)",
    phone: "+919876500003",
    city: "mumbai",
    categories: ["comedy"],
    roles: [{ id: "ra-sup-1", role: "support_agent", org: null, venue: null, event: null }]
  },
  {
    id: "usr-finance-ops",
    email: "finance@nightlifez.test",
    fullName: "Vikram Kulkarni (Finance Ops)",
    phone: "+919876500004",
    city: "mumbai",
    categories: ["festivals"],
    roles: [{ id: "ra-fin-1", role: "finance_ops", org: null, venue: null, event: null }]
  },
  {
    id: "usr-organiser-owner",
    email: "organiser@nightlifez.test",
    fullName: "Meera Nair (Organiser Owner)",
    phone: "+919876500005",
    city: "bengaluru",
    categories: ["festivals", "music"],
    roles: [
      { id: "ra-org-1", role: "organiser_owner", org: "org-nightlifez-originals", venue: null, event: null },
      { id: "ra-org-2", role: "organiser_admin", org: "org-harbor-collective", venue: null, event: null }
    ]
  },
  {
    id: "usr-venue-manager",
    email: "venue@nightlifez.test",
    fullName: "Arjun Shetty (Venue Manager)",
    phone: "+919876500006",
    city: "bengaluru",
    categories: ["concerts"],
    roles: [{ id: "ra-ven-1", role: "venue_manager", org: "org-nightlifez-originals", venue: "skyline-amphitheatre-bengaluru", event: null }]
  },
  {
    id: "usr-checkin-staff",
    email: "staff@nightlifez.test",
    fullName: "Kiran Das (Gate Staff)",
    phone: "+919876500007",
    city: "bengaluru",
    categories: ["concerts"],
    roles: [
      { id: "ra-stf-1", role: "checkin_staff", org: "org-nightlifez-originals", venue: "skyline-amphitheatre-bengaluru", event: "evt-solstice-2026" },
      { id: "ra-stf-2", role: "box_office", org: "org-nightlifez-originals", venue: "banyan-courtyard-coimbatore", event: "evt-southern-cipher-2026" }
    ]
  },
  {
    id: "usr-platform-ops",
    email: "ops@nightlifez.test",
    fullName: "Siddharth Rao (Platform Ops)",
    phone: "+919876500008",
    city: "bengaluru",
    categories: ["concerts", "nightlife"],
    roles: [{ id: "ra-ops-1", role: "platform_operations", org: null, venue: null, event: null }]
  },
  {
    id: "usr-organiser-admin",
    email: "orgadmin@nightlifez.test",
    fullName: "Kavya Desai (Organiser Admin)",
    phone: "+919876500009",
    city: "mumbai",
    categories: ["comedy", "music"],
    roles: [{ id: "ra-oga-1", role: "organiser_admin", org: "org-harbor-collective", venue: null, event: null }]
  },
  {
    id: "usr-event-manager",
    email: "eventmgr@nightlifez.test",
    fullName: "Rohan Kapoor (Event Manager)",
    phone: "+919876500010",
    city: "bengaluru",
    categories: ["festivals"],
    roles: [{ id: "ra-evm-1", role: "event_manager", org: "org-nightlifez-originals", venue: "skyline-amphitheatre-bengaluru", event: "evt-solstice-2026" }]
  },
  {
    id: "usr-box-office",
    email: "boxoffice@nightlifez.test",
    fullName: "Ananya Iyer (Box Office)",
    phone: "+919876500011",
    city: "coimbatore",
    categories: ["concerts"],
    roles: [{ id: "ra-box-1", role: "box_office", org: "org-nightlifez-originals", venue: "banyan-courtyard-coimbatore", event: "evt-southern-cipher-2026" }]
  }
];

async function main() {
  const client = new pg.Client({
    connectionString,
    ssl: hostLower === "localhost" || hostLower === "127.0.0.1" ? false : { rejectUnauthorized: false }
  });
  await client.connect();
  try {
    await client.query("BEGIN");
    for (const u of QA_ACCOUNTS) {
      if (!u.email.endsWith("@nightlifez.test")) {
        throw new Error(`Refusing to modify non-synthetic account: ${u.email}`);
      }
      const nextHash = hashPassword(ROTATED_PASSWORD);
      await client.query(
        `INSERT INTO users (id, email, password_hash, full_name, phone, preferred_city_slug, favorite_categories_json, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, 'ACTIVE')
         ON CONFLICT (id) DO UPDATE SET
           email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           full_name = EXCLUDED.full_name,
           phone = COALESCE(users.phone, EXCLUDED.phone),
           status = 'ACTIVE'`,
        [u.id, u.email, nextHash, u.fullName, u.phone, u.city, JSON.stringify(u.categories)]
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
    await client.query("COMMIT");
    console.log(`SUCCESS: Rotated ${QA_ACCOUNTS.length} @nightlifez.test QA accounts on ${parsedUrl.hostname}${parsedUrl.pathname}.`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.release?.();
    await client.end();
  }
}

main().catch((err) => {
  console.error("REPAIR FAILED:", err);
  process.exit(1);
});
