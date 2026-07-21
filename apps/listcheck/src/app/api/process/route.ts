import { NextRequest, NextResponse } from "next/server";
import {
  analyzeAmazonMainImage,
  renderReportPng,
} from "@/lib/image";
import { consumeCreditToken, verifyUnlockToken } from "@/lib/unlock";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const imageBase64 = body?.imageBase64 as string | undefined;
    const unlockToken = (body?.unlockToken as string | undefined) || "";
    const brand = process.env.NEXT_PUBLIC_BRAND || "ListCheck";
    const secret = process.env.CREEM_API_KEY || "dev-secret";

    if (!imageBase64?.startsWith("data:")) {
      return NextResponse.json({ error: "Invalid image" }, { status: 400 });
    }

    const unlocked = unlockToken
      ? verifyUnlockToken(unlockToken, secret)
      : null;
    const watermark = !unlocked;

    const report = await analyzeAmazonMainImage(imageBase64);
    const png = await renderReportPng(report, { watermark, brand });
    const reportUrl = `data:image/png;base64,${png.toString("base64")}`;

    let nextUnlockToken: string | undefined;
    let creditsLeft: number | undefined;
    let message: string;

    if (watermark) {
      message = report.ready
        ? "No hard fails — download report (watermarked) or pay for a clean export."
        : "Hard fails found — fix before using as Amazon MAIN. Pay to remove report watermark.";
    } else if (unlocked?.plan === "pro") {
      message = `Clean report (Pro). Score ${report.score}/100.`;
    } else {
      nextUnlockToken = consumeCreditToken(unlockToken, secret) || undefined;
      const after = nextUnlockToken
        ? verifyUnlockToken(nextUnlockToken, secret)
        : null;
      creditsLeft = after?.creditsLeft ?? 0;
      message = `Clean report. Credits left: ${creditsLeft}. Score ${report.score}/100.`;
    }

    return NextResponse.json({
      report,
      reportUrl,
      watermarked: watermark,
      plan: unlocked?.plan,
      creditsLeft,
      unlockToken: nextUnlockToken,
      message,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Check failed" },
      { status: 500 }
    );
  }
}
