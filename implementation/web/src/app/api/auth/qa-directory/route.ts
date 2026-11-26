import { NextResponse } from "next/server";
import { SYNTHETIC_QA_IDENTITIES } from "@nightlifez/shared";
import { isNonProductionEnvironment } from "@/lib/smsProvider";

export async function GET() {
  if (!isNonProductionEnvironment()) {
    return NextResponse.json({ error: "Not available in production." }, { status: 404 });
  }
  return NextResponse.json({
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    identities: SYNTHETIC_QA_IDENTITIES
  });
}
