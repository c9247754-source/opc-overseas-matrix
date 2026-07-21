import sharp from "sharp";

/**
 * 5×7 bitmap glyphs — no system fonts (Vercel Linux SVG text tofu).
 * Uppercase A–Z, digits, space, hyphen.
 */
const GLYPHS: Record<string, number[]> = {
  " ": [0, 0, 0, 0, 0, 0, 0],
  "-": [0, 0, 0, 0b111, 0, 0, 0],
  A: [0b010, 0b101, 0b101, 0b111, 0b101, 0b101, 0b101],
  B: [0b110, 0b101, 0b101, 0b110, 0b101, 0b101, 0b110],
  C: [0b011, 0b100, 0b100, 0b100, 0b100, 0b100, 0b011],
  D: [0b110, 0b101, 0b101, 0b101, 0b101, 0b101, 0b110],
  E: [0b111, 0b100, 0b100, 0b111, 0b100, 0b100, 0b111],
  F: [0b111, 0b100, 0b100, 0b111, 0b100, 0b100, 0b100],
  G: [0b011, 0b100, 0b100, 0b101, 0b101, 0b101, 0b011],
  H: [0b101, 0b101, 0b101, 0b111, 0b101, 0b101, 0b101],
  I: [0b111, 0b010, 0b010, 0b010, 0b010, 0b010, 0b111],
  J: [0b001, 0b001, 0b001, 0b001, 0b101, 0b101, 0b010],
  K: [0b101, 0b101, 0b110, 0b100, 0b110, 0b101, 0b101],
  L: [0b100, 0b100, 0b100, 0b100, 0b100, 0b100, 0b111],
  M: [0b101, 0b111, 0b111, 0b101, 0b101, 0b101, 0b101],
  N: [0b101, 0b111, 0b111, 0b111, 0b101, 0b101, 0b101],
  O: [0b010, 0b101, 0b101, 0b101, 0b101, 0b101, 0b010],
  P: [0b111, 0b101, 0b101, 0b111, 0b100, 0b100, 0b100],
  Q: [0b010, 0b101, 0b101, 0b101, 0b111, 0b110, 0b001],
  R: [0b110, 0b101, 0b101, 0b110, 0b101, 0b101, 0b101],
  S: [0b011, 0b100, 0b100, 0b010, 0b001, 0b001, 0b110],
  T: [0b111, 0b010, 0b010, 0b010, 0b010, 0b010, 0b010],
  U: [0b101, 0b101, 0b101, 0b101, 0b101, 0b101, 0b010],
  V: [0b101, 0b101, 0b101, 0b101, 0b101, 0b010, 0b010],
  W: [0b101, 0b101, 0b101, 0b101, 0b111, 0b111, 0b101],
  X: [0b101, 0b101, 0b010, 0b010, 0b010, 0b101, 0b101],
  Y: [0b101, 0b101, 0b101, 0b010, 0b010, 0b010, 0b010],
  Z: [0b111, 0b001, 0b001, 0b010, 0b100, 0b100, 0b111],
  "0": [0b010, 0b101, 0b101, 0b101, 0b101, 0b101, 0b010],
  "1": [0b010, 0b110, 0b010, 0b010, 0b010, 0b010, 0b111],
  "2": [0b110, 0b001, 0b001, 0b010, 0b100, 0b100, 0b111],
  "3": [0b110, 0b001, 0b001, 0b010, 0b001, 0b001, 0b110],
  "4": [0b101, 0b101, 0b101, 0b111, 0b001, 0b001, 0b001],
  "5": [0b111, 0b100, 0b100, 0b110, 0b001, 0b001, 0b110],
  "6": [0b011, 0b100, 0b100, 0b110, 0b101, 0b101, 0b010],
  "7": [0b111, 0b001, 0b001, 0b010, 0b010, 0b010, 0b010],
  "8": [0b010, 0b101, 0b101, 0b010, 0b101, 0b101, 0b010],
  "9": [0b010, 0b101, 0b101, 0b011, 0b001, 0b001, 0b110],
};

export async function makeBitmapWatermarkTile(
  text: string,
  opts?: { alpha?: number; scale?: number; light?: boolean }
): Promise<Buffer> {
  const scale = opts?.scale ?? 4;
  const alpha = opts?.alpha ?? 72;
  const light = Boolean(opts?.light);
  const ink = light ? 235 : 40;
  const chars = text
    .toUpperCase()
    .replace(/[^A-Z0-9 \-]/g, " ")
    .split("");
  const gw = 4;
  const width = Math.max(gw * scale, chars.length * gw * scale);
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
              rgba[idx] = ink;
              rgba[idx + 1] = ink;
              rgba[idx + 2] = ink;
              rgba[idx + 3] = alpha;
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

  return sharp(padded)
    .rotate(-28, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

/** Diagonal tiled watermark — crop-resistant, no system fonts. */
export async function applyDiagonalBitmapWatermark(
  input: Buffer,
  phrase: string,
  opts?: { light?: boolean; alpha?: number }
): Promise<Buffer> {
  const meta = await sharp(input).metadata();
  const w = meta.width || 1200;
  const h = meta.height || 800;
  const tile = await makeBitmapWatermarkTile(phrase, {
    alpha: opts?.alpha ?? (opts?.light ? 90 : 68),
    scale: 4,
    light: opts?.light,
  });
  const tMeta = await sharp(tile).metadata();
  const tw = tMeta.width || 500;
  const th = tMeta.height || 280;
  const overlays: { input: Buffer; left: number; top: number }[] = [];

  for (let y = -Math.round(th * 0.25); y < h + th; y += Math.round(th * 0.62)) {
    for (
      let x = -Math.round(tw * 0.25);
      x < w + tw;
      x += Math.round(tw * 0.72)
    ) {
      overlays.push({ input: tile, left: x, top: y });
    }
  }

  return sharp(input).composite(overlays).png().toBuffer();
}

/** Horizontal label strip (for mock banners / footer), bitmap only. */
export async function makeBitmapLabel(
  text: string,
  opts: { scale?: number; r?: number; g?: number; b?: number; a?: number } = {}
): Promise<Buffer> {
  const scale = opts.scale ?? 3;
  const r = opts.r ?? 40;
  const g = opts.g ?? 40;
  const b = opts.b ?? 40;
  const a = opts.a ?? 200;
  const chars = text
    .toUpperCase()
    .replace(/[^A-Z0-9 \-]/g, " ")
    .split("");
  const gw = 4;
  const width = Math.max(1, chars.length * gw * scale);
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
              rgba[idx] = r;
              rgba[idx + 1] = g;
              rgba[idx + 2] = b;
              rgba[idx + 3] = a;
            }
          }
        }
      }
    }
  });

  return sharp(rgba, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
}
