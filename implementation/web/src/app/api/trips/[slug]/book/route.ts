import { NextResponse } from "next/server";
import { createTripBookingRequest, submitTripAdvanceUpiClaim } from "@/lib/communityModulesService";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const body = await request.json();
    const result = await createTripBookingRequest({
      tripSlug: slug,
      travellerName: String(body?.travellerName ?? ""),
      travellerEmail: String(body?.travellerEmail ?? ""),
      travellerPhone: String(body?.travellerPhone ?? ""),
      pickupPointId: String(body?.pickupPointId ?? ""),
      seats: Number(body?.seats ?? 1)
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not submit trip request" },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const booking = await submitTripAdvanceUpiClaim(
      String(body?.referenceCode ?? ""),
      String(body?.upiTxRef ?? "")
    );
    return NextResponse.json({ booking });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not submit UPI claim" },
      { status: 400 }
    );
  }
}
