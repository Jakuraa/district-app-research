import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { SESSION_COOKIE_NAME } from "@/lib/auth";
import { OtpError, verifyOtpChallenge } from "@/lib/otpService";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await verifyOtpChallenge(body);
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
    if (err instanceof OtpError) {
      return NextResponse.json(
        { error: err.message, code: err.code, retryAfterSeconds: err.retryAfterSeconds },
        { status: err.status }
      );
    }
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Enter a valid 6-digit OTP.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    const message = err instanceof Error ? err.message : "OTP verification failed.";
    return NextResponse.json({ error: message, code: "OTP_VERIFY_FAILED" }, { status: 400 });
  }
}
