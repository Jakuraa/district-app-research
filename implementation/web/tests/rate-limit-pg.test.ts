import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";

const TEST_DB_URL = process.env.TEST_DATABASE_URL?.trim();

test(
  "PostgreSQL atomic rate limiter handles concurrent connections and window expiry",
  { skip: !TEST_DB_URL ? "Set TEST_DATABASE_URL to an isolated test Postgres DB to run" : false },
  async () => {
    const poolA = new Pool({ connectionString: TEST_DB_URL });
    const poolB = new Pool({ connectionString: TEST_DB_URL });
    const key = `pg-rl-test-${Date.now()}`;
    const limit = 4;
    const windowMs = 200;

    try {
      await poolA.query(`
        CREATE TABLE IF NOT EXISTS rate_limits (
          key TEXT PRIMARY KEY,
          count INTEGER NOT NULL,
          reset_at TIMESTAMPTZ NOT NULL
        );
      `);

      const hit = async (pool: Pool) => {
        const res = await pool.query(
          `INSERT INTO rate_limits (key, count, reset_at)
           VALUES ($1, 1, NOW() + ($2 || ' milliseconds')::interval)
           ON CONFLICT (key) DO UPDATE SET
             count = CASE WHEN rate_limits.reset_at <= NOW() THEN 1 ELSE rate_limits.count + 1 END,
             reset_at = CASE WHEN rate_limits.reset_at <= NOW() THEN NOW() + ($2 || ' milliseconds')::interval ELSE rate_limits.reset_at END
           RETURNING count`,
          [key, String(windowMs)]
        );
        return Number(res.rows[0].count) <= limit;
      };

      const results = await Promise.all([
        hit(poolA),
        hit(poolB),
        hit(poolA),
        hit(poolB),
        hit(poolA),
        hit(poolB)
      ]);
      assert.equal(results.filter(Boolean).length, 4);
      assert.equal(results.filter((r) => !r).length, 2);

      // Wait for window expiry and verify reset
      await new Promise((r) => setTimeout(r, windowMs + 50));
      assert.equal(await hit(poolA), true);
    } finally {
      await poolA.query("DELETE FROM rate_limits WHERE key = $1", [key]).catch(() => {});
      await Promise.all([poolA.end(), poolB.end()]);
    }
  }
);
