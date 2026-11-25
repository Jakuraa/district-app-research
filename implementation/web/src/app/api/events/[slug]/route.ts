import { NextResponse } from "next/server";
import { getEventDetail } from "@/lib/repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const data = await getEventDetail(slug);
  if (!data) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}
