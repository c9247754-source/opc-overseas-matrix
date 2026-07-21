import sharp from "sharp";

export type StageStyle =
  | "modern"
  | "scandinavian"
  | "luxury"
  | "coastal"
  | "minimal";

export const STAGE_STYLES: {
  id: StageStyle;
  label: string;
  prompt: string;
}[] = [
  {
    id: "modern",
    label: "Modern",
    prompt:
      "virtually stage this empty real estate listing photo as a modern living space with contemporary sofa, coffee table, floor lamp, and tasteful decor, photorealistic, MLS-ready, keep room geometry and windows unchanged",
  },
  {
    id: "scandinavian",
    label: "Scandinavian",
    prompt:
      "virtually stage this empty room photo scandinavian style: light wood furniture, white and beige textiles, simple plants, airy natural light, photorealistic real estate listing, keep architecture unchanged",
  },
  {
    id: "luxury",
    label: "Luxury",
    prompt:
      "virtually stage this empty luxury home listing: elegant sofa, marble accents, designer lighting, premium finishes, photorealistic MLS photo, keep walls windows and floor plan unchanged",
  },
  {
    id: "coastal",
    label: "Coastal",
    prompt:
      "virtually stage this empty room coastal style: soft blues and whites, light fabrics, rattan accents, relaxed beach-house furniture, photorealistic listing photo, keep room structure unchanged",
  },
  {
    id: "minimal",
    label: "Minimal",
    prompt:
      "virtually stage this empty room minimal style: few essential furniture pieces, clean lines, neutral palette, uncluttered, photorealistic real estate photo, keep architecture unchanged",
  },
];

export function stylePrompt(style: StageStyle): string {
  return (
    STAGE_STYLES.find((s) => s.id === style)?.prompt ||
    STAGE_STYLES[0].prompt
  );
}

/** Diagonal watermark tile for unpaid exports */
export async function applyWatermark(
  png: Buffer,
  brand: string
): Promise<Buffer> {
  const meta = await sharp(png).metadata();
  const w = meta.width || 1200;
  const h = meta.height || 800;
  const tile = 280;
  const text = `Made with ${brand}`;
  const svg = Buffer.from(`
    <svg width="${tile}" height="${tile}" xmlns="http://www.w3.org/2000/svg">
      <text x="20" y="${tile / 2}" font-size="18" font-family="Arial,sans-serif"
        fill="rgba(255,255,255,0.55)" transform="rotate(-28 ${tile / 2} ${tile / 2})">${escapeXml(text)}</text>
    </svg>
  `);
  const tilePng = await sharp(svg).png().toBuffer();
  const cols = Math.ceil(w / tile) + 1;
  const rows = Math.ceil(h / tile) + 1;
  const composites: { input: Buffer; left: number; top: number }[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      composites.push({ input: tilePng, left: x * tile, top: y * tile });
    }
  }
  return sharp(png).composite(composites).png().toBuffer();
}

/**
 * Photoreal staging via fal.ai (preferred) or Replicate.
 * Set FAL_KEY or REPLICATE_API_TOKEN. Optional STAGING_PROVIDER=mock for local UI demos.
 */
export async function stageRoom(
  imageDataUrl: string,
  style: StageStyle
): Promise<Buffer> {
  const provider = (process.env.STAGING_PROVIDER || "auto").toLowerCase();
  const falKey = process.env.FAL_KEY || process.env.FAL_API_KEY;
  const replicateToken = process.env.REPLICATE_API_TOKEN;
  const prompt = stylePrompt(style);

  // No AI key → local preview still ships (watermarked freemium works).
  // Add FAL_KEY or REPLICATE_API_TOKEN for photoreal MLS-quality staging.
  if (provider === "mock" || (!falKey && !replicateToken)) {
    return mockStage(imageDataUrl, style);
  }

  if ((provider === "fal" || provider === "auto") && falKey) {
    try {
      return await stageWithFal(imageDataUrl, prompt, falKey);
    } catch (e) {
      console.error("[stage] fal failed, falling back to mock", e);
      return mockStage(imageDataUrl, style);
    }
  }
  if ((provider === "replicate" || provider === "auto") && replicateToken) {
    try {
      return await stageWithReplicate(imageDataUrl, prompt, replicateToken);
    } catch (e) {
      console.error("[stage] replicate failed, falling back to mock", e);
      return mockStage(imageDataUrl, style);
    }
  }
  return mockStage(imageDataUrl, style);
}

async function stageWithFal(
  imageDataUrl: string,
  prompt: string,
  apiKey: string
): Promise<Buffer> {
  const res = await fetch("https://fal.run/fal-ai/flux/dev/image-to-image", {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image_url: imageDataUrl,
      prompt,
      strength: 0.65,
      num_inference_steps: 28,
      guidance_scale: 3.5,
      enable_safety_checker: true,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      data?.detail || data?.error || `fal.ai staging failed (${res.status})`
    );
  }
  const url =
    data?.images?.[0]?.url || data?.image?.url || data?.output?.url;
  if (!url) throw new Error("fal.ai returned no image");
  return fetchImageBuffer(url);
}

async function stageWithReplicate(
  imageDataUrl: string,
  prompt: string,
  token: string
): Promise<Buffer> {
  const create = await fetch(
    "https://api.replicate.com/v1/models/black-forest-labs/flux-dev/predictions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      body: JSON.stringify({
        input: {
          prompt,
          image: imageDataUrl,
          prompt_strength: 0.65,
          num_inference_steps: 28,
          guidance: 3.5,
          output_format: "png",
        },
      }),
    }
  );
  const pred = await create.json();
  if (!create.ok) {
    throw new Error(
      pred?.detail || pred?.error || `Replicate failed (${create.status})`
    );
  }

  let status = pred.status as string;
  let output = pred.output;
  const getUrl = pred.urls?.get as string | undefined;
  let guard = 0;
  while (
    (status === "starting" || status === "processing") &&
    getUrl &&
    guard < 60
  ) {
    await sleep(2000);
    const poll = await fetch(getUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await poll.json();
    status = body.status;
    output = body.output;
    guard++;
  }
  if (status !== "succeeded") {
    throw new Error(`Replicate staging ${status || "failed"}`);
  }
  const url = Array.isArray(output) ? output[0] : output;
  if (!url || typeof url !== "string") {
    throw new Error("Replicate returned no image");
  }
  return fetchImageBuffer(url);
}

/** Local furniture-overlay preview when no AI key — still ships UI + Creem path. */
async function mockStage(
  imageDataUrl: string,
  style: StageStyle
): Promise<Buffer> {
  const base64 = imageDataUrl.split(",")[1];
  if (!base64) throw new Error("Invalid image");
  const input = Buffer.from(base64, "base64");
  const meta = await sharp(input).metadata();
  const w = meta.width || 1200;
  const h = meta.height || 800;
  const tint =
    style === "coastal"
      ? { r: 220, g: 235, b: 245 }
      : style === "luxury"
        ? { r: 245, g: 235, b: 220 }
        : { r: 240, g: 238, b: 232 };

  const furniture = Buffer.from(`
    <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${w * 0.18}" y="${h * 0.58}" width="${w * 0.45}" height="${h * 0.18}" rx="12" fill="rgba(80,70,60,0.55)"/>
      <rect x="${w * 0.32}" y="${h * 0.72}" width="${w * 0.18}" height="${h * 0.06}" rx="4" fill="rgba(60,50,40,0.5)"/>
      <ellipse cx="${w * 0.72}" cy="${h * 0.7}" rx="${w * 0.06}" ry="${h * 0.03}" fill="rgba(40,90,50,0.45)"/>
      <rect x="${w * 0.7}" y="${h * 0.42}" width="${w * 0.04}" height="${h * 0.28}" fill="rgba(50,50,50,0.4)"/>
      <circle cx="${w * 0.72}" cy="${h * 0.4}" r="${w * 0.035}" fill="rgba(255,240,200,0.5)"/>
      <text x="${w / 2}" y="${h * 0.12}" text-anchor="middle" font-size="22" font-family="Arial"
        fill="rgba(0,0,0,0.45)">Preview staging (${escapeXml(style)}) — add FAL_KEY for photoreal</text>
    </svg>
  `);

  return sharp(input)
    .resize({ width: Math.min(w, 1600), withoutEnlargement: true })
    .modulate({ brightness: 1.05, saturation: 0.95 })
    .tint(tint)
    .composite([{ input: await sharp(furniture).png().toBuffer(), blend: "over" }])
    .png()
    .toBuffer();
}

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to download staged image");
  return Buffer.from(await res.arrayBuffer());
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
