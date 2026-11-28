import { NextResponse } from "next/server";
import { completeApprovedBookingPayment, getApprovalBookingByToken } from "@/lib/sellerGuestService";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const booking = await getApprovalBookingByToken(token);
  if (!booking) {
    return NextResponse.json({ error: "Approval payment link not found." }, { status: 404 });
  }
  return NextResponse.json({ booking });
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  try {
    const booking = await completeApprovedBookingPayment(token);
    return NextResponse.json({ booking });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not complete approved payment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
