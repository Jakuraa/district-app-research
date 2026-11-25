import { NextResponse } from "next/server";
import { cancelDemoBooking } from "@/lib/repository";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const booking = await cancelDemoBooking(id);
    return NextResponse.json({ booking });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not cancel booking";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
