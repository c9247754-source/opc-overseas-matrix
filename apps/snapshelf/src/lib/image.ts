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
  brand: string,
  canvas: number
): Promise<Buffer> {
  const fontSize = Math.max(18, Math.round(canvas / 28));
  const line = escapeXml(`Made with ${brand}`);
  // Extra-large canvas so rotated tiles cover every corner after crop attempts
  const tile = Math.round(canvas * 1.6);
  const stepY = Math.round(fontSize * 3.2);

  const lines: string[] = [];
  for (let y = fontSize; y < tile; y += stepY) {
    const offset = ((y / stepY) % 2) * Math.round(fontSize * 4);
    lines.push(`
      <text x="${offset}" y="${y}" fill="rgba(40,40,40,0.22)"
        font-size="${fontSize}" font-family="Arial, Helvetica, sans-serif"
        font-weight="600" letter-spacing="1">${line}    ${line}    ${line}    ${line}</text>
    `);
  }

  const svg = Buffer.from(`
    <svg width="${canvas}" height="${canvas}" xmlns="http://www.w3.org/2000/svg">
      <g transform="rotate(-28 ${canvas / 2} ${canvas / 2})">
        <g transform="translate(${-canvas * 0.25}, ${-canvas * 0.15})">
          ${lines.join("")}
        </g>
      </g>
    </svg>
  `);

  return Buffer.from(
    await sharp(input)
      .ensureAlpha()
      .composite([{ input: svg, left: 0, top: 0 }])
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .removeAlpha()
      .png()
      .toBuffer()
  );
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
