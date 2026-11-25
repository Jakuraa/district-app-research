import { Pool } from "pg";

declare global {
  var __pulsepassPool: Pool | undefined;
}

export function getPool(): Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;

  if (!globalThis.__pulsepassPool) {
    globalThis.__pulsepassPool = new Pool({
      connectionString: url,
      max: 5,
      ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : { rejectUnauthorized: false }
    });
  }
  return globalThis.__pulsepassPool;
}
