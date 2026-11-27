import { NextResponse } from "next/server";
import { getPublicOrganiserPaymentInfo } from "@/lib/organiserPaymentService";
import { getEventDetail } from "@/lib/repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const detail = await getEventDetail(slug);
  if (!detail) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }
  const orgId = detail.event.organizationId ?? "org-nightlifez-originals";
  const directUpi = await getPublicOrganiserPaymentInfo(orgId);
  return NextResponse.json({ directUpi });
}
