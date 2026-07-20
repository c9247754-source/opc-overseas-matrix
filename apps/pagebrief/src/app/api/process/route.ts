import { NextRequest, NextResponse } from "next/server";
import { verifyUnlockToken } from "@/lib/unlock";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const unlockToken = (form.get("unlockToken") as string) || "";
    const secret = process.env.CREEM_API_KEY || "dev-secret";
    const unlocked = unlockToken
      ? verifyUnlockToken(unlockToken, secret)
      : null;
    const watermarked = !unlocked;

    if (!file) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (
      b: Buffer
    ) => Promise<{ text: string; numpages: number }>;
    const parsed = await pdfParse(buf);
    const text = (parsed.text || "").slice(0, unlocked ? 80000 : 20000);

    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl =
      process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

    if (!apiKey) {
      // Demo brief without LLM
      const lines = text
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 12);
      return NextResponse.json({
        title: file.name.replace(/\.pdf$/i, "") || "Document brief",
        outline: lines.slice(0, 5),
        bullets: lines.slice(0, 8).map((t, i) => ({
          text: t.slice(0, 200),
          page: Math.min(i + 1, parsed.numpages || 1),
        })),
        watermarked,
        message: watermarked
          ? "Demo mode (no OPENAI_API_KEY). Pay with Creem to unlock longer docs."
          : "Demo clean mode.",
      });
    }

    const prompt = `Summarize this PDF text into JSON with keys:
title (string), outline (string array max 8), bullets (array of {text, page} max 12).
Use approximate page numbers if possible. Text only:\n\n${text}`;

    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You produce structured PDF briefs as JSON only.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(err.slice(0, 300));
    }

    const json = await resp.json();
    const content = json.choices?.[0]?.message?.content || "{}";
    const data = JSON.parse(content);

    return NextResponse.json({
      title: data.title || file.name,
      outline: data.outline || [],
      bullets: data.bullets || [],
      watermarked,
      message: watermarked
        ? "Brief ready (free tier). Creem Pro removes footer limits."
        : "Pro brief unlocked.",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
