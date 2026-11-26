import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { OtpError, resendOtpChallenge } from "@/lib/otpService";

function getClientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "local";
  return request.headers.get("x-real-ip") ?? "local";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await resendOtpChallenge(body, getClientIp(request));
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof OtpError) {
      return NextResponse.json(
        { error: err.message, code: err.code, retryAfterSeconds: err.retryAfterSeconds },
        { status: err.status }
      );
    }
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid resend request.", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    const message = err instanceof Error ? err.message : "Could not resend OTP.";
    return NextResponse.json({ error: message, code: "OTP_RESEND_FAILED" }, { status: 400 });
  }
}
