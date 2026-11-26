import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAuthorized } from "@/lib/auth";
import { getSessionFromRequest, recordAuditLog } from "@/lib/authStore";
import { getPool } from "@/lib/db";
import { getMemoryStore } from "@/lib/memoryStore";

const citySchema = z.object({
  slug: z.string().trim().min(2).max(60),
  name: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  locality: z.string().trim().max(120).optional(),
  isPopular: z.boolean().default(false)
});

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  const auth = assertAuthorized(session, "platform:masterdata:manage");
  if (!auth.ok) return auth.response;

  try {
    const city = citySchema.parse(await request.json());
    const pool = getPool();
    if (!pool) {
      const store = getMemoryStore();
      const idx = store.cities.findIndex((c) => c.slug === city.slug);
      if (idx >= 0) store.cities[idx] = city;
      else store.cities.push(city);
    } else {
      await pool.query(
        `INSERT INTO cities (slug, name, state, locality, is_popular)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, state = EXCLUDED.state, locality = EXCLUDED.locality, is_popular = EXCLUDED.is_popular`,
        [city.slug, city.name, city.state, city.locality ?? null, city.isPopular]
      );
    }
    await recordAuditLog({
      actorUserId: session.user!.id,
      actorEmail: session.user!.email,
      actorRole: session.roles[0] ?? "platform_operations",
      action: "MASTER_CITY_UPSERT",
      targetType: "city",
      targetId: city.slug,
      afterJson: city
    });
    return NextResponse.json({ city }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save city";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
