import { NextRequest, NextResponse } from "next/server";
import { verifyUnlockToken } from "@/lib/unlock";
import sharp from "sharp";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * MVP: if REPLICATE_API_TOKEN set, call an img2img/headshot model;
 * otherwise return selfie with watermark (demo).
 * Replace HEADSHOT_MODEL with your chosen Replicate model id.
 */
const HEADSHOT_MODEL =
  process.env.REPLICATE_HEADSHOT_MODEL ||
  "tencentarc/gfpgan:0fbacf7afc6c144e5be9767cff80f25aff23e52b0708f724e51b0608cebb3c7d";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const imageBase64 = body?.imageBase64 as string | undefined;
    const unlockToken = (body?.unlockToken as string | undefined) || "";
    const secret = process.env.CREEM_API_KEY || "dev-secret";
    const unlocked = unlockToken
      ? verifyUnlockToken(unlockToken, secret)
      : null;
    const watermark = !unlocked;

    if (!imageBase64?.startsWith("data:")) {
      return NextResponse.json({ error: "Invalid image" }, { status: 400 });
    }

    let outBuf: Buffer;
    const token = process.env.REPLICATE_API_TOKEN;

    if (!token) {
      const base64 = imageBase64.split(",")[1];
      outBuf = Buffer.from(base64, "base64");
    } else {
      const Replicate = (await import("replicate")).default;
      const replicate = new Replicate({ auth: token });
      const output = (await replicate.run(
        HEADSHOT_MODEL as `${string}/${string}`,
        { input: { img: imageBase64, scale: 2 } }
      )) as unknown;
      const url =
        typeof output === "string"
          ? output
          : Array.isArray(output)
            ? String(output[0])
            : null;
      if (!url) throw new Error("No headshot output");
      const res = await fetch(url);
      outBuf = Buffer.from(await res.arrayBuffer());
    }

    if (watermark) {
      const meta = await sharp(outBuf).metadata();
      const width = meta.width || 800;
      const svg = `<svg width="${width}" height="40"><rect width="100%" height="100%" fill="rgba(0,0,0,0.45)"/><text x="50%" y="50%" fill="white" font-size="14" text-anchor="middle" dominant-baseline="middle">Made with FacePass — free AI headshots</text></svg>`;
      outBuf = await sharp(outBuf)
        .composite([{ input: Buffer.from(svg), gravity: "south" }])
        .png()
        .toBuffer();
    }

    return NextResponse.json({
      previewUrl: `data:image/png;base64,${outBuf.toString("base64")}`,
      watermarked: watermark,
      message: watermark
        ? "Preview ready. Pay with Creem for clean export."
        : "Clean headshot unlocked.",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
