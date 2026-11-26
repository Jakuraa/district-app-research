import { NextResponse } from "next/server";
import { extractSessionTokenFromRequest, SESSION_COOKIE_NAME } from "@/lib/auth";
import { signOutToken } from "@/lib/authStore";

export async function POST(request: Request) {
  const token = extractSessionTokenFromRequest(request);
  await signOutToken(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
  return res;
}
