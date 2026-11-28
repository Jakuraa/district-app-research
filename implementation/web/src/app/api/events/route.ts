import { NextResponse } from "next/server";
import { eventQuerySchema } from "@nightlifez/shared";
import { listCitiesAndEvents } from "@/lib/repository";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = eventQuerySchema.safeParse({
    city: searchParams.get("city") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    dateWindow: searchParams.get("dateWindow") ?? undefined,
    sort: searchParams.get("sort") ?? undefined
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const data = await listCitiesAndEvents(parsed.data);
  return NextResponse.json(data);
}
