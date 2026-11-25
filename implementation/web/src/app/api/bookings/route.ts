import { NextResponse } from "next/server";
import { createDemoBooking, listBookings } from "@/lib/repository";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email") ?? undefined;
  const bookings = await listBookings(email);
  return NextResponse.json({ bookings });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const booking = await createDemoBooking(body);
    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create demo booking";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
