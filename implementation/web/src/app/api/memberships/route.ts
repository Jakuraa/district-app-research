import { NextResponse } from "next/server";
import {
  createMembershipRequest,
  listActiveMembershipPlans,
  lookupMembershipAccess,
  submitMembershipUpiClaim
} from "@/lib/communityModulesService";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const referenceCode = searchParams.get("referenceCode");
  const email = searchParams.get("email");
  if (referenceCode && email) {
    const membership = await lookupMembershipAccess(referenceCode, email);
    return NextResponse.json({ membership });
  }
  const plans = await listActiveMembershipPlans();
  return NextResponse.json({ plans });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createMembershipRequest({
      planId: String(body?.planId ?? ""),
      memberName: String(body?.memberName ?? ""),
      memberEmail: String(body?.memberEmail ?? ""),
      memberPhone: String(body?.memberPhone ?? "")
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not request membership" },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const membership = await submitMembershipUpiClaim(
      String(body?.referenceCode ?? ""),
      String(body?.upiTxRef ?? "")
    );
    return NextResponse.json({ membership });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not submit UPI claim" },
      { status: 400 }
    );
  }
}
