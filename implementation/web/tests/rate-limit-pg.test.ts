import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { checkSharedRateLimit } from "../src/lib/rateLimit.ts";

const TEST_DB_URL = process.env.TEST_DATABASE_URL?.trim();

test(
  "production checkSharedRateLimit enforces atomic PostgreSQL counting and window expiry across connections",
  { skip: !TEST_DB_URL ? "Set TEST_DATABASE_URL to an isolated test Postgres DB to run" : false },
  async () => {
    const prevDbUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = TEST_DB_URL;
    const poolA = new Pool({ connectionString: TEST_DB_URL });
    const poolB = new Pool({ connectionString: TEST_DB_URL });
    const key = `pg-rl-prod-${Date.now()}`;
    const limit = 4;
    const windowMs = 200;

    try {
      const results = await Promise.all(
        Array.from({ length: 6 }, () => checkSharedRateLimit(key, limit, windowMs))
      );
      assert.equal(results.filter(Boolean).length, 4);
      assert.equal(results.filter((r) => !r).length, 2);

      // Verify persisted row in independent connection
      const rowRes = await poolB.query("SELECT count FROM rate_limits WHERE key = $1", [key]);
      assert.equal(Number(rowRes.rows[0]?.count), 6);

      // Wait for window expiry and verify reset via checkSharedRateLimit
      await new Promise((r) => setTimeout(r, windowMs + 60));
      assert.equal(await checkSharedRateLimit(key, limit, windowMs), true);
    } finally {
      await poolA.query("DELETE FROM rate_limits WHERE key = $1", [key]).catch(() => {});
      await Promise.all([poolA.end(), poolB.end()]);
      if (prevDbUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = prevDbUrl;
    }
  }
);
