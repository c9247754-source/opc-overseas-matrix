import sharp from "sharp";

export type ExportSize = 1000 | 2000;

export type CompositeOptions = {
  watermark: boolean;
  brand: string;
  size: ExportSize;
  shadow: boolean;
  /** Fraction of canvas reserved as margin on each side (default 0.1 = 10%). */
  paddingRatio?: number;
};

/**
 * Cutout PNG (alpha) → store-ready square: trim → pad/center → soft shadow → white → watermark.
 * No paid AI API.
 */
export async function compositeOnWhiteAndWatermark(
  cutoutDataUrl: string,
  opts: CompositeOptions
): Promise<Buffer> {
  const base64 = cutoutDataUrl.split(",")[1];
  if (!base64) throw new Error("Invalid cutout image");

  const paddingRatio = opts.paddingRatio ?? 0.1;
  const canvas = opts.size;
  const contentMax = Math.round(canvas * (1 - paddingRatio * 2));

  // 1) Trim empty alpha so product fills the usable area
  let trimmed: Buffer;
  try {
    trimmed = await sharp(Buffer.from(base64, "base64"))
      .ensureAlpha()
      .trim({ threshold: 8 })
      .png()
      .toBuffer();
  } catch {
    trimmed = await sharp(Buffer.from(base64, "base64"))
      .ensureAlpha()
      .png()
      .toBuffer();
  }

  // 2) Fit inside content box (keep aspect)
  const product = await sharp(trimmed)
    .resize({
      width: contentMax,
      height: contentMax,
      fit: "inside",
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  const pMeta = await sharp(product).metadata();
  const pw = pMeta.width || contentMax;
  const ph = pMeta.height || contentMax;
  const left = Math.round((canvas - pw) / 2);
  const top = Math.round((canvas - ph) / 2);

  const layers: {
    input: Buffer;
    left?: number;
    top?: number;
  }[] = [];

  // 3) Soft contact shadow under product (fake, free)
  if (opts.shadow) {
    const shadowW = Math.round(pw * 0.78);
    const shadowH = Math.max(10, Math.round(ph * 0.07));
    const shadowSvg = Buffer.from(`
      <svg width="${shadowW}" height="${shadowH}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="g" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="rgba(0,0,0,0.28)"/>
            <stop offset="70%" stop-color="rgba(0,0,0,0.10)"/>
            <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
          </radialGradient>
        </defs>
        <ellipse cx="50%" cy="50%" rx="48%" ry="45%" fill="url(#g)"/>
      </svg>
    `);
    const shadowBuf = Buffer.from(
      await sharp(shadowSvg).blur(2.2).png().toBuffer()
    );
    layers.push({
      input: shadowBuf,
      left: Math.round(left + (pw - shadowW) / 2),
      top: Math.min(canvas - shadowH - 4, top + ph - Math.round(shadowH * 0.35)),
    });
  }

  layers.push({ input: Buffer.from(product), left, top });

  // 4) White square canvas, then force opaque (no leftover alpha)
  let out: Buffer = Buffer.from(
    await sharp({
      create: {
        width: canvas,
        height: canvas,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .composite(layers)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .removeAlpha()
      .png()
      .toBuffer()
  );

  // 5) Diagonal tiled watermark — cropping a corner won't remove it
  if (opts.watermark) {
    out = await applyDiagonalWatermark(out, opts.brand, canvas);
  }

  return out;
}

async function applyDiagonalWatermark(
  input: Buffer,
  _brand: string,
  canvas: number
): Promise<Buffer> {
  // Build tile in-memory (bitmap font). Do NOT read public/ — missing on Vercel lambdas.
  const tile = await makeBitmapWatermarkTile("MADE WITH SNAPSHELF");
  const meta = await sharp(tile).metadata();
  const tw = meta.width || 500;
  const th = meta.height || 280;
  const overlays: { input: Buffer; left: number; top: number }[] = [];

  for (let y = -Math.round(th * 0.2); y < canvas + th; y += Math.round(th * 0.48)) {
    for (
      let x = -Math.round(tw * 0.2);
      x < canvas + tw;
      x += Math.round(tw * 0.58)
    ) {
      overlays.push({ input: tile, left: x, top: y });
    }
  }

  return Buffer.from(
    await sharp(input)
      .composite(overlays)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .removeAlpha()
      .png()
      .toBuffer()
  );
}

/** 5x7 pixel font — no system fonts, works on Vercel Linux. */
const GLYPHS: Record<string, number[]> = {
  " ": [0, 0, 0, 0, 0, 0, 0],
  A: [0b010, 0b101, 0b101, 0b111, 0b101, 0b101, 0b101],
  D: [0b110, 0b101, 0b101, 0b101, 0b101, 0b101, 0b110],
  E: [0b111, 0b100, 0b100, 0b111, 0b100, 0b100, 0b111],
  F: [0b111, 0b100, 0b100, 0b111, 0b100, 0b100, 0b100],
  H: [0b101, 0b101, 0b101, 0b111, 0b101, 0b101, 0b101],
  I: [0b111, 0b010, 0b010, 0b010, 0b010, 0b010, 0b111],
  L: [0b100, 0b100, 0b100, 0b100, 0b100, 0b100, 0b111],
  M: [0b101, 0b111, 0b111, 0b101, 0b101, 0b101, 0b101],
  N: [0b101, 0b111, 0b111, 0b111, 0b101, 0b101, 0b101],
  O: [0b010, 0b101, 0b101, 0b101, 0b101, 0b101, 0b010],
  P: [0b111, 0b101, 0b101, 0b111, 0b100, 0b100, 0b100],
  S: [0b011, 0b100, 0b100, 0b010, 0b001, 0b001, 0b110],
  T: [0b111, 0b010, 0b010, 0b010, 0b010, 0b010, 0b010],
  W: [0b101, 0b101, 0b101, 0b101, 0b111, 0b111, 0b101],
};

async function makeBitmapWatermarkTile(text: string): Promise<Buffer> {
  // Larger + darker so it stays visible on white / product photos
  const scale = 6;
  const chars = text.toUpperCase().split("");
  const gw = 4;
  const width = chars.length * gw * scale;
  const height = 7 * scale;
  const rgba = Buffer.alloc(width * height * 4, 0);

  chars.forEach((ch, i) => {
    const rows = GLYPHS[ch] || GLYPHS[" "];
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 3; x++) {
        if ((rows[y] >> (2 - x)) & 1) {
          for (let dy = 0; dy < scale; dy++) {
            for (let dx = 0; dx < scale; dx++) {
              const px = (i * gw + x) * scale + dx;
              const py = y * scale + dy;
              const idx = (py * width + px) * 4;
              rgba[idx] = 15;
              rgba[idx + 1] = 15;
              rgba[idx + 2] = 15;
              rgba[idx + 3] = 165;
            }
          }
        }
      }
    }
  });

  const label = await sharp(rgba, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();

  const tw = width + 100;
  const th = height + 140;
  const base = await sharp({
    create: {
      width: tw,
      height: th,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: label,
        left: Math.round((tw - width) / 2),
        top: Math.round((th - height) / 2),
      },
    ])
    .png()
    .toBuffer();

  const pad = 80;
  const padded = await sharp(base)
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  return Buffer.from(
    await sharp(padded)
      .rotate(-28, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()
  );
}
