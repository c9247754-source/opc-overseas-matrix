import { NextRequest, NextResponse } from "next/server";
import { removeBackgroundAndComposite } from "@/lib/image";
import { verifyUnlockToken } from "@/lib/unlock";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const imageBase64 = body?.imageBase64 as string | undefined;
    const unlockToken = (body?.unlockToken as string | undefined) || "";
    const brand = process.env.NEXT_PUBLIC_BRAND || "SnapShelf";
    const secret = process.env.CREEM_API_KEY || "dev-secret";

    if (!imageBase64?.startsWith("data:")) {
      return NextResponse.json({ error: "Invalid image" }, { status: 400 });
    }

    const unlocked = unlockToken
      ? verifyUnlockToken(unlockToken, secret)
      : null;
    const watermark = !unlocked;

    const png = await removeBackgroundAndComposite(imageBase64, {
      watermark,
      brand,
    });

    const dataUrl = `data:image/png;base64,${png.toString("base64")}`;

    return NextResponse.json({
      previewUrl: dataUrl,
      watermarked: watermark,
      message: watermark
        ? "Preview ready (watermarked). Pay with Creem to remove watermark."
        : "Clean export unlocked.",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Process failed" },
      { status: 500 }
    );
  }
}
