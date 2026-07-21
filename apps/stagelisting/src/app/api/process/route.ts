import { NextRequest, NextResponse } from "next/server";
import { applyWatermark, stageRoom, type StageStyle } from "@/lib/stage";
import { consumeCreditToken, verifyUnlockToken } from "@/lib/unlock";

export const runtime = "nodejs";
export const maxDuration = 120;

const STYLES = new Set([
  "modern",
  "scandinavian",
  "luxury",
  "coastal",
  "minimal",
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const imageBase64 = body?.imageBase64 as string | undefined;
    const styleRaw = String(body?.style || "modern").toLowerCase();
    const style = (STYLES.has(styleRaw) ? styleRaw : "modern") as StageStyle;
    const unlockToken = (body?.unlockToken as string | undefined) || "";
    const brand = process.env.NEXT_PUBLIC_BRAND || "StageListing";
    const secret = process.env.CREEM_API_KEY || "dev-secret";

    if (!imageBase64?.startsWith("data:")) {
      return NextResponse.json({ error: "Invalid image" }, { status: 400 });
    }

    const unlocked = unlockToken
      ? verifyUnlockToken(unlockToken, secret)
      : null;
    const watermark = !unlocked;

    let png = await stageRoom(imageBase64, style);
    if (watermark) png = await applyWatermark(png, brand);
    const previewUrl = `data:image/png;base64,${png.toString("base64")}`;

    let nextUnlockToken: string | undefined;
    let creditsLeft: number | undefined;
    let message: string;

    if (watermark) {
      message =
        "Staged preview (watermarked). Pay for a clean MLS-ready export.";
    } else if (unlocked?.plan === "pro") {
      message = "Clean staging export (Pro).";
    } else {
      nextUnlockToken = consumeCreditToken(unlockToken, secret) || undefined;
      const after = nextUnlockToken
        ? verifyUnlockToken(nextUnlockToken, secret)
        : null;
      creditsLeft = after?.creditsLeft ?? 0;
      message = `Clean staging export. Credits left: ${creditsLeft}.`;
    }

    return NextResponse.json({
      previewUrl,
      style,
      watermarked: watermark,
      plan: unlocked?.plan,
      creditsLeft,
      unlockToken: nextUnlockToken,
      message,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Staging failed" },
      { status: 500 }
    );
  }
}
