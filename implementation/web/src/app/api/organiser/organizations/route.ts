import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/authStore";
import { createOrganization } from "@/lib/operationsStore";

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  try {
    const body = await request.json();
    const org = await createOrganization(body, {
      id: session.user.id,
      email: session.user.email
    });
    return NextResponse.json({ organization: org }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create organization";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
