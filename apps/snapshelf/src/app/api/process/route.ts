import { NextRequest, NextResponse } from "next/server";
import {
  compositeOnWhiteAndWatermark,
  type ExportSize,
} from "@/lib/image";
import { verifyUnlockToken } from "@/lib/unlock";

export const runtime = "nodejs";
export const maxDuration = 30;

function parseSize(v: unknown): ExportSize {
  if (v === 2000 || v === "2000") return 2000;
  return 1000;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cutoutBase64 = body?.cutoutBase64 as string | undefined;
    const unlockToken = (body?.unlockToken as string | undefined) || "";
    const brand = process.env.NEXT_PUBLIC_BRAND || "SnapShelf";
    const secret = process.env.CREEM_API_KEY || "dev-secret";
    const size = parseSize(body?.size);
    const shadow = body?.shadow !== false;

    if (!cutoutBase64?.startsWith("data:")) {
      return NextResponse.json(
        { error: "Invalid cutout image" },
        { status: 400 }
      );
    }

    const unlocked = unlockToken
      ? verifyUnlockToken(unlockToken, secret)
      : null;
    const watermark = !unlocked;

    const png = await compositeOnWhiteAndWatermark(cutoutBase64, {
      watermark,
      brand,
      size,
      shadow,
      paddingRatio: 0.1,
    });

    const dataUrl = `data:image/png;base64,${png.toString("base64")}`;

    return NextResponse.json({
      previewUrl: dataUrl,
      watermarked: watermark,
      size,
      shadow,
      message: watermark
        ? `${size}×${size} store-ready (watermarked). Pay with Creem to remove watermark.`
        : `${size}×${size} clean export unlocked.`,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Process failed" },
      { status: 500 }
    );
  }
}
