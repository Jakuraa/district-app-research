import { NextResponse } from "next/server";
import { checkRateLimit, SESSION_COOKIE_NAME } from "@/lib/auth";
import { signUpUser } from "@/lib/authStore";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  if (!checkRateLimit(`signup:${ip}`, 15, 60_000)) {
    return NextResponse.json({ error: "Too many sign-up attempts. Please wait a minute." }, { status: 429 });
  }
  try {
    const body = await request.json();
    const result = await signUpUser(body);
    const res = NextResponse.json(result, { status: 201 });
    res.cookies.set(SESSION_COOKIE_NAME, result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create account";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
