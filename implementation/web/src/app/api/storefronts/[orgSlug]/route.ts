import { NextResponse } from "next/server";
import { getPublicStorefront } from "@/lib/sellerGuestService";

export async function GET(
  _request: Request,
  context: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await context.params;
  const storefront = await getPublicStorefront(orgSlug);
  if (!storefront) {
    return NextResponse.json({ error: "Storefront not found." }, { status: 404 });
  }
  return NextResponse.json(storefront);
}
