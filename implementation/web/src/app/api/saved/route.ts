import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/authStore";
import { listSavedItems, toggleSavedItem } from "@/lib/repository";

const toggleSchema = z.object({
  itemType: z.enum(["event", "venue", "movie", "restaurant", "activity"]),
  itemSlug: z.string().trim().min(1).max(120)
});

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session.user) {
    return NextResponse.json({ items: [] });
  }
  const items = await listSavedItems(session.user.id);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session.user) {
    return NextResponse.json({ error: "Sign in to save events and venues." }, { status: 401 });
  }
  try {
    const body = toggleSchema.parse(await request.json());
    const result = await toggleSavedItem(session.user.id, body.itemType, body.itemSlug);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not update saved items";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
