import { NextResponse } from "next/server";
import { checkRateLimit, SESSION_COOKIE_NAME } from "@/lib/auth";
import { signInUser } from "@/lib/authStore";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  if (!checkRateLimit(`signin:${ip}`, 25, 60_000)) {
    return NextResponse.json({ error: "Too many sign-in attempts. Please wait a minute." }, { status: 429 });
  }
  try {
    const body = await request.json();
    const result = await signInUser(body);
    const res = NextResponse.json(result, { status: 200 });
    res.cookies.set(SESSION_COOKIE_NAME, result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Authentication failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
