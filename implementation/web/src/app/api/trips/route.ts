import { NextResponse } from "next/server";
import { listPublishedTrips } from "@/lib/communityModulesService";
import { listCitiesAndEvents } from "@/lib/repository";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city") ?? undefined;
  const [trips, { cities }] = await Promise.all([
    listPublishedTrips(city),
    listCitiesAndEvents({})
  ]);
  return NextResponse.json({ trips, cities });
}
