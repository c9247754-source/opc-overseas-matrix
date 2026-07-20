import { createHmac, timingSafeEqual } from "crypto";

export function signUnlock(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function makeUnlockToken(email: string, product: string, secret: string): string {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 30; // 30 days
  const body = `${email}|${product}|${exp}`;
  const sig = signUnlock(body, secret);
  return Buffer.from(`${body}|${sig}`).toString("base64url");
}

export function verifyUnlockToken(
  token: string,
  secret: string
): { email: string; product: string; exp: number } | null {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const parts = raw.split("|");
    if (parts.length !== 4) return null;
    const [email, product, expStr, sig] = parts;
    const body = `${email}|${product}|${expStr}`;
    const expected = signUnlock(body, secret);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || Date.now() > exp) return null;
    return { email, product, exp };
  } catch {
    return null;
  }
}
