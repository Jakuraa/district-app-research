import { NextResponse } from "next/server";
import { assertAuthorized } from "@/lib/auth";
import { getSessionFromRequest } from "@/lib/authStore";
import { updateOrganizationStorefront } from "@/lib/sellerGuestService";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(request);
  const { id } = await context.params;
  const auth = assertAuthorized(session, "org:write", { organizationId: id });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const organization = await updateOrganizationStorefront(id, body, {
      id: session.user!.id,
      email: session.user!.email,
      role: session.roles[0] ?? "organiser_owner"
    });
    return NextResponse.json({ organization });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update storefront";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
