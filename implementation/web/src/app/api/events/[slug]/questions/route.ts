import { NextResponse } from "next/server";
import { getEventDetail } from "@/lib/repository";
import { listEventQuestions } from "@/lib/sellerGuestService";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const detail = await getEventDetail(slug);
  if (!detail) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }
  const questions = await listEventQuestions(detail.event.id);
  return NextResponse.json({ questions });
}
