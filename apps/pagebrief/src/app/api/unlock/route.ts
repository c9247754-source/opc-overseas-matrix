import { NextRequest, NextResponse } from "next/server";
import { makeUnlockToken } from "@/lib/unlock";

/** MVP unlock mint after Creem redirect. Harden with signature verify in production. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = (body.email as string) || "buyer@example.com";
  const secret = process.env.CREEM_API_KEY || "dev-secret";
  const token = makeUnlockToken(email, "pagebrief", secret);
  return NextResponse.json({ token });
}
