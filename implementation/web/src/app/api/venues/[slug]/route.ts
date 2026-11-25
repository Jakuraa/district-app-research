import { NextResponse } from "next/server";
import { getVenueDetail } from "@/lib/repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const data = await getVenueDetail(slug);
  if (!data) {
    return NextResponse.json({ error: "Venue not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}
