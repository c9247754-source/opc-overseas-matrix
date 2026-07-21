import { NextRequest, NextResponse } from "next/server";
import { makeUnlockToken, type UnlockPlan } from "@/lib/unlock";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = (body.email as string) || "buyer@example.com";
  const planRaw = String(body.plan || "credits").toLowerCase();
  const plan: UnlockPlan = planRaw === "pro" ? "pro" : "credits";
  const secret = process.env.CREEM_API_KEY || "dev-secret";
  const token = makeUnlockToken(email, "ogmaker", secret, plan);
  return NextResponse.json({
    token,
    plan,
    message:
      plan === "pro"
        ? "Pro unlocked for 30 days on this browser."
        : "Credits unlocked: 100 clean OG exports on this browser.",
  });
}
