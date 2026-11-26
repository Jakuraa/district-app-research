import { NextResponse } from "next/server";
import { ensureSchemaBootstrapped } from "@/lib/bootstrapDb";
import { getPool } from "@/lib/db";

export async function GET() {
  const pool = getPool();
  if (!pool) {
    return NextResponse.json({ ok: true, database: "memory-fallback" });
  }
  try {
    await ensureSchemaBootstrapped(pool);
    await pool.query("SELECT 1");
    return NextResponse.json({ ok: true, database: "postgres-connected" });
  } catch {
    return NextResponse.json({ ok: false, database: "error" }, { status: 500 });
  }
}
