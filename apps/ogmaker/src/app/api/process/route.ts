import { NextRequest, NextResponse } from "next/server";
import { renderOgPng, type OgTemplate } from "@/lib/og";
import { consumeCreditToken, verifyUnlockToken } from "@/lib/unlock";

export const runtime = "nodejs";
export const maxDuration = 30;

const TEMPLATES = new Set(["blog", "product", "launch", "quote"]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const templateRaw = String(body?.template || "blog").toLowerCase();
    const template = (
      TEMPLATES.has(templateRaw) ? templateRaw : "blog"
    ) as OgTemplate;
    const title = String(body?.title || "").trim();
    const subtitle = String(body?.subtitle || "").trim();
    const accent = String(body?.accent || "#0ea5e9");
    const unlockToken = (body?.unlockToken as string | undefined) || "";
    const brand = process.env.NEXT_PUBLIC_BRAND || "OgMaker";
    const secret = process.env.CREEM_API_KEY || "dev-secret";

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const unlocked = unlockToken
      ? verifyUnlockToken(unlockToken, secret)
      : null;
    const watermark = !unlocked;

    const png = await renderOgPng({
      template,
      title,
      subtitle,
      brand,
      accent,
      watermark,
    });
    const previewUrl = `data:image/png;base64,${png.toString("base64")}`;

    let nextUnlockToken: string | undefined;
    let creditsLeft: number | undefined;
    let message: string;

    if (watermark) {
      message = "OG image ready (watermarked). Pay for a clean export.";
    } else if (unlocked?.plan === "pro") {
      message = "Clean OG export (Pro).";
    } else {
      nextUnlockToken = consumeCreditToken(unlockToken, secret) || undefined;
      const after = nextUnlockToken
        ? verifyUnlockToken(nextUnlockToken, secret)
        : null;
      creditsLeft = after?.creditsLeft ?? 0;
      message = `Clean OG export. Credits left: ${creditsLeft}.`;
    }

    return NextResponse.json({
      previewUrl,
      template,
      width: 1200,
      height: 630,
      watermarked: watermark,
      plan: unlocked?.plan,
      creditsLeft,
      unlockToken: nextUnlockToken,
      message,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "OG render failed" },
      { status: 500 }
    );
  }
}
