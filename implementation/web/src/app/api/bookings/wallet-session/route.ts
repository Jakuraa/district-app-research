import { NextResponse } from "next/server";
import { verifyWalletAccessToken } from "@/lib/organiserPaymentService";

const WALLET_COOKIE_NAME = "nlz_wallet";

const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer"
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { walletToken?: string };
    const token = body.walletToken?.trim();
    if (!token) {
      return NextResponse.json({ error: "walletToken is required." }, { status: 400, headers: SECURITY_HEADERS });
    }
    const verified = verifyWalletAccessToken(token);
    if (!verified) {
      return NextResponse.json({ error: "Invalid or expired wallet token." }, { status: 401, headers: SECURITY_HEADERS });
    }

    const res = NextResponse.json({ ok: true }, { headers: SECURITY_HEADERS });
    res.cookies.set(WALLET_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Math.max(60, verified.exp - Math.floor(Date.now() / 1000))
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400, headers: SECURITY_HEADERS });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true }, { headers: SECURITY_HEADERS });
  res.cookies.delete(WALLET_COOKIE_NAME);
  return res;
}
