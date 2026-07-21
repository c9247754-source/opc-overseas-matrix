import { readFileSync } from "fs";
import { join } from "path";
import satori from "satori";
import sharp from "sharp";
import { applyDiagonalBitmapWatermark } from "@/lib/bitmap-wm";

export type OgTemplate = "blog" | "product" | "launch" | "quote";

export type OgInput = {
  template: OgTemplate;
  title: string;
  subtitle?: string;
  brand?: string;
  accent?: string;
  watermark?: boolean;
};

const W = 1200;
const H = 630;

export const OG_TEMPLATES: { id: OgTemplate; label: string; hint: string }[] =
  [
    { id: "blog", label: "Blog / Article", hint: "1200×630 Open Graph" },
    { id: "product", label: "Product card", hint: "Feature + price vibe" },
    { id: "launch", label: "Launch / PH", hint: "Bold announcement" },
    { id: "quote", label: "Quote / Thread", hint: "Large pull-quote" },
  ];

type FontBuf = { name: string; data: ArrayBuffer; weight: 400 | 700 };

let cachedFonts: FontBuf[] | null = null;

function loadFontFile(...parts: string[]): ArrayBuffer | null {
  const bases = [
    join(process.cwd(), "src/lib/fonts"),
    join(process.cwd(), "apps/ogmaker/src/lib/fonts"),
  ];
  for (const base of bases) {
    try {
      const buf = readFileSync(join(base, ...parts));
      return buf.buffer.slice(
        buf.byteOffset,
        buf.byteOffset + buf.byteLength
      ) as ArrayBuffer;
    } catch {
      /* try next */
    }
  }
  return null;
}

/** Inter (Latin) + Noto Sans SC (中文) — satori turns glyphs into paths (Vercel-safe). */
function getFonts(): FontBuf[] {
  if (cachedFonts) return cachedFonts;
  const interReg = loadFontFile("Inter-Regular.woff");
  const interBold = loadFontFile("Inter-Bold.woff");
  const noto = loadFontFile("NotoSansSC-Regular.woff");
  if (!interReg || !interBold) {
    throw new Error(
      "Missing Inter fonts in src/lib/fonts — redeploy with font files."
    );
  }
  const fonts: FontBuf[] = [
    { name: "Inter", data: interReg, weight: 400 },
    { name: "Inter", data: interBold, weight: 700 },
  ];
  if (noto) {
    // Same file for both weights so Chinese never tofu
    fonts.push({ name: "NotoSansSC", data: noto, weight: 400 });
    fonts.push({ name: "NotoSansSC", data: noto, weight: 700 });
  }
  cachedFonts = fonts;
  return fonts;
}

const FONT_STACK = "Inter, NotoSansSC";

export async function renderOgPng(input: OgInput): Promise<Buffer> {
  const title = (input.title || "Untitled").slice(0, 120);
  const subtitle = (input.subtitle || "").slice(0, 160);
  const brand = (input.brand || "OgMaker").slice(0, 40);
  const accent = sanitizeHex(input.accent || "#0ea5e9");
  const watermark = Boolean(input.watermark);
  const template = input.template || "blog";

  const bg =
    template === "launch"
      ? "#0f172a"
      : template === "quote"
        ? "#fafafa"
        : "#0b1220";
  const fg = template === "quote" ? "#0f172a" : "#f8fafc";
  const muted = template === "quote" ? "#64748b" : "#94a3b8";
  const titleSize = template === "quote" ? 52 : 48;

  const badgeLabel =
    template === "product" ? "PRODUCT" : template === "launch" ? "LAUNCH" : null;

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: bg,
          padding: "56px 64px",
          position: "relative",
          overflow: "hidden",
        },
        children: [
          // decor
          ...(template === "blog"
            ? [
                {
                  type: "div",
                  props: {
                    style: {
                      position: "absolute",
                      right: 0,
                      top: 0,
                      width: 220,
                      height: H,
                      backgroundColor: accent,
                      opacity: 0.18,
                    },
                  },
                },
              ]
            : []),
          ...(template === "launch"
            ? [
                {
                  type: "div",
                  props: {
                    style: {
                      position: "absolute",
                      left: 0,
                      bottom: 0,
                      width: W,
                      height: 12,
                      backgroundColor: accent,
                    },
                  },
                },
              ]
            : []),
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                gap: 20,
                maxWidth: 920,
              },
              children: [
                badgeLabel
                  ? {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: template === "product" ? 140 : 120,
                          height: 36,
                          borderRadius: 8,
                          backgroundColor: accent,
                          color: template === "launch" ? "#0f172a" : "#ffffff",
                          fontSize: 16,
                          fontWeight: 700,
                          fontFamily: FONT_STACK,
                        },
                        children: badgeLabel,
                      },
                    }
                  : {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                width: 14,
                                height: 14,
                                borderRadius: 7,
                                backgroundColor: accent,
                              },
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: 18,
                                fontWeight: 600,
                                color: muted,
                                fontFamily: FONT_STACK,
                              },
                              children: brand,
                            },
                          },
                        ],
                      },
                    },
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: titleSize,
                      fontWeight: 700,
                      color: fg,
                      lineHeight: 1.15,
                      fontFamily: FONT_STACK,
                      display: "flex",
                      flexWrap: "wrap",
                    },
                    children: title,
                  },
                },
                subtitle
                  ? {
                      type: "div",
                      props: {
                        style: {
                          fontSize: 22,
                          fontWeight: 400,
                          color: muted,
                          lineHeight: 1.4,
                          fontFamily: FONT_STACK,
                          display: "flex",
                          flexWrap: "wrap",
                        },
                        children: subtitle,
                      },
                    }
                  : null,
              ].filter(Boolean),
            },
          },
          !watermark
            ? {
                type: "div",
                props: {
                  style: {
                    fontSize: 18,
                    fontWeight: 400,
                    color: muted,
                    fontFamily: FONT_STACK,
                  },
                  children: brand,
                },
              }
            : { type: "div", props: { style: { height: 18 }, children: "" } },
        ],
      },
      // satori accepts a custom element tree; ReactNode typing is too strict here
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    {
      width: W,
      height: H,
      fonts: getFonts(),
    }
  );

  let png: Buffer = Buffer.from(await sharp(Buffer.from(svg)).png().toBuffer());

  if (watermark) {
    png = Buffer.from(
      await applyDiagonalBitmapWatermark(
        png,
        `MADE WITH ${brand.toUpperCase().replace(/[^A-Z0-9]+/g, " ")}`.trim(),
        { light: template !== "quote", alpha: 95 }
      )
    );
  }

  return png;
}

function sanitizeHex(c: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(c) ? c : "#0ea5e9";
}
