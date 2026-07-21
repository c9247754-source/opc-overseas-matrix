import { createHmac, timingSafeEqual } from "crypto";

export type UnlockPlan = "credits" | "pro";

export type UnlockPayload = {
  email: string;
  product: string;
  plan: UnlockPlan;
  exp: number;
  creditsLeft?: number;
};

export function signUnlock(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function makeUnlockToken(
  email: string,
  product: string,
  secret: string,
  plan: UnlockPlan = "credits"
): string {
  const exp =
    plan === "pro"
      ? Date.now() + 1000 * 60 * 60 * 24 * 30
      : Date.now() + 1000 * 60 * 60 * 24 * 365;
  const creditsLeft = plan === "credits" ? 100 : 0;
  const body = `${email}|${product}|${plan}|${exp}|${creditsLeft}`;
  const sig = signUnlock(body, secret);
  return Buffer.from(`${body}|${sig}`).toString("base64url");
}

export function verifyUnlockToken(
  token: string,
  secret: string
): UnlockPayload | null {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const parts = raw.split("|");
    if (parts.length === 6) {
      const [email, product, plan, expStr, creditsStr, sig] = parts;
      if (plan !== "credits" && plan !== "pro") return null;
      const body = `${email}|${product}|${plan}|${expStr}|${creditsStr}`;
      if (!safeEqualSig(sig, signUnlock(body, secret))) return null;
      const exp = Number(expStr);
      const creditsLeft = Number(creditsStr);
      if (!Number.isFinite(exp) || Date.now() > exp) return null;
      if (plan === "credits" && (!Number.isFinite(creditsLeft) || creditsLeft <= 0))
        return null;
      return {
        email,
        product,
        plan,
        exp,
        creditsLeft: plan === "credits" ? creditsLeft : undefined,
      };
    }
    if (parts.length === 4) {
      const [email, product, expStr, sig] = parts;
      const body = `${email}|${product}|${expStr}`;
      if (!safeEqualSig(sig, signUnlock(body, secret))) return null;
      const exp = Number(expStr);
      if (!Number.isFinite(exp) || Date.now() > exp) return null;
      return { email, product, plan: "pro", exp };
    }
    return null;
  } catch {
    return null;
  }
}

export function consumeCreditToken(
  token: string,
  secret: string
): string | null {
  const parsed = verifyUnlockToken(token, secret);
  if (!parsed) return null;
  if (parsed.plan === "pro") return token;
  const left = (parsed.creditsLeft ?? 0) - 1;
  if (left < 0) return null;
  const body = `${parsed.email}|${parsed.product}|credits|${parsed.exp}|${left}`;
  const sig = signUnlock(body, secret);
  return Buffer.from(`${body}|${sig}`).toString("base64url");
}

function safeEqualSig(sig: string, expected: string): boolean {
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
