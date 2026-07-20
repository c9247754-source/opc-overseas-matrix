import sharp from "sharp";

const REMOVE_BG_MODEL =
  process.env.REPLICATE_REMOVE_BG_MODEL ||
  "cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003";

export async function removeBackgroundAndComposite(
  imageDataUrl: string,
  opts: { watermark: boolean; brand: string }
): Promise<Buffer> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    // Demo: return original bytes with optional text watermark via sharp
    const base64 = imageDataUrl.split(",")[1];
    const input = Buffer.from(base64, "base64");
    return applyWatermarkIfNeeded(input, opts);
  }

  const Replicate = (await import("replicate")).default;
  const replicate = new Replicate({ auth: token });

  const output = (await replicate.run(REMOVE_BG_MODEL as `${string}/${string}`, {
    input: { image: imageDataUrl },
  })) as unknown;

  const cutoutUrl = extractUrl(output);
  if (!cutoutUrl) {
    throw new Error("No output from remove-bg model");
  }

  const cutoutRes = await fetch(cutoutUrl);
  const cutoutBuf = Buffer.from(await cutoutRes.arrayBuffer());

  const meta = await sharp(cutoutBuf).metadata();
  const width = meta.width || 1024;
  const height = meta.height || 1024;

  const whiteBg = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .png()
    .toBuffer();

  const composited = await sharp(whiteBg)
    .composite([{ input: cutoutBuf, gravity: "centre" }])
    .png()
    .toBuffer();

  return applyWatermarkIfNeeded(composited, opts);
}

function extractUrl(output: unknown): string | null {
  if (typeof output === "string") return output;
  if (Array.isArray(output) && typeof output[0] === "string") return output[0];
  if (output && typeof output === "object" && "url" in output) {
    const u = (output as { url: unknown }).url;
    if (typeof u === "string") return u;
    if (typeof u === "function") {
      try {
        return String((u as () => string)());
      } catch {
        return null;
      }
    }
  }
  return null;
}

async function applyWatermarkIfNeeded(
  input: Buffer,
  opts: { watermark: boolean; brand: string }
): Promise<Buffer> {
  if (!opts.watermark) return input;

  const meta = await sharp(input).metadata();
  const width = meta.width || 800;
  const fontSize = Math.max(14, Math.round(width / 40));
  const text = `Made with ${opts.brand} — free online product photo cleanup`;

  const svg = `
  <svg width="${width}" height="${fontSize * 3}">
    <rect width="100%" height="100%" fill="rgba(0,0,0,0.45)"/>
    <text x="50%" y="50%" fill="white" font-size="${fontSize}"
      font-family="Arial, sans-serif" text-anchor="middle" dominant-baseline="middle">
      ${escapeXml(text)}
    </text>
  </svg>`;

  return sharp(input)
    .composite([
      {
        input: Buffer.from(svg),
        gravity: "south",
      },
    ])
    .png()
    .toBuffer();
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
