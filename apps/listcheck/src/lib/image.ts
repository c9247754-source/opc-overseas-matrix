import sharp from "sharp";

export type CheckStatus = "pass" | "warn" | "fail";

export type RuleResult = {
  id: string;
  title: string;
  status: CheckStatus;
  detail: string;
};

export type ComplianceReport = {
  width: number;
  height: number;
  format: string;
  bytes: number;
  score: number;
  ready: boolean;
  rules: RuleResult[];
};

/**
 * Heuristic checks against common Amazon MAIN image rules (public guidelines).
 * Not affiliated with Amazon — sellers use this to catch obvious fails before upload.
 */
export async function analyzeAmazonMainImage(
  imageDataUrl: string
): Promise<ComplianceReport> {
  const base64 = imageDataUrl.split(",")[1];
  if (!base64) throw new Error("Invalid image");
  const input = Buffer.from(base64, "base64");

  const img = sharp(input).ensureAlpha();
  const meta = await img.metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  const format = (meta.format || "unknown").toLowerCase();
  const bytes = input.length;
  const longest = Math.max(width, height);

  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const white = sampleWhiteBackground(data, info.width, info.height, info.channels);
  const fill = estimateProductFill(data, info.width, info.height, info.channels);

  const rules: RuleResult[] = [];

  // 1) Resolution
  if (longest >= 2000) {
    rules.push({
      id: "resolution",
      title: "Resolution (zoom-ready)",
      status: "pass",
      detail: `${width}×${height} — longest side ${longest}px (≥2000 recommended).`,
    });
  } else if (longest >= 1000) {
    rules.push({
      id: "resolution",
      title: "Resolution (zoom-ready)",
      status: "warn",
      detail: `${width}×${height} — meets 1000px minimum, but 2000px+ is safer for zoom.`,
    });
  } else {
    rules.push({
      id: "resolution",
      title: "Resolution (zoom-ready)",
      status: "fail",
      detail: `${width}×${height} — longest side under 1000px. Amazon may disable zoom / reject.`,
    });
  }

  // 2) White background (edge sampling)
  if (white.ratio >= 0.92 && white.avgDelta <= 8) {
    rules.push({
      id: "white_bg",
      title: "Pure white background",
      status: "pass",
      detail: `Edge whites ~${(white.ratio * 100).toFixed(0)}%, avg distance from RGB(255,255,255)=${white.avgDelta.toFixed(1)}.`,
    });
  } else if (white.ratio >= 0.75 && white.avgDelta <= 20) {
    rules.push({
      id: "white_bg",
      title: "Pure white background",
      status: "warn",
      detail: `Background looks off-white / uneven (ratio ${(white.ratio * 100).toFixed(0)}%, delta ${white.avgDelta.toFixed(1)}). Amazon wants exact RGB 255,255,255.`,
    });
  } else {
    rules.push({
      id: "white_bg",
      title: "Pure white background",
      status: "fail",
      detail: `Edges are not pure white (ratio ${(white.ratio * 100).toFixed(0)}%, delta ${white.avgDelta.toFixed(1)}). High risk of MAIN image issues.`,
    });
  }

  // 3) Product fill ~85%
  if (fill >= 0.85) {
    rules.push({
      id: "fill",
      title: "Product fills ≥85% of frame",
      status: "pass",
      detail: `Estimated subject box covers ~${(fill * 100).toFixed(0)}% of the image.`,
    });
  } else if (fill >= 0.7) {
    rules.push({
      id: "fill",
      title: "Product fills ≥85% of frame",
      status: "warn",
      detail: `Estimated fill ~${(fill * 100).toFixed(0)}%. Crop tighter so the product dominates the frame.`,
    });
  } else {
    rules.push({
      id: "fill",
      title: "Product fills ≥85% of frame",
      status: "fail",
      detail: `Estimated fill ~${(fill * 100).toFixed(0)}%. Too much empty space for a MAIN image.`,
    });
  }

  // 4) Format
  if (["jpeg", "jpg", "png", "tiff", "tif", "gif", "webp"].includes(format)) {
    rules.push({
      id: "format",
      title: "File format",
      status: format === "webp" ? "warn" : "pass",
      detail:
        format === "webp"
          ? "WebP detected — convert to JPEG/PNG before uploading to Amazon."
          : `${format.toUpperCase()} is commonly accepted.`,
    });
  } else {
    rules.push({
      id: "format",
      title: "File format",
      status: "fail",
      detail: `Format “${format}” may be rejected. Prefer JPEG or PNG.`,
    });
  }

  // 5) File size
  if (bytes <= 10 * 1024 * 1024) {
    rules.push({
      id: "filesize",
      title: "File size ≤10MB",
      status: "pass",
      detail: `${(bytes / 1024).toFixed(0)} KB.`,
    });
  } else {
    rules.push({
      id: "filesize",
      title: "File size ≤10MB",
      status: "fail",
      detail: `${(bytes / (1024 * 1024)).toFixed(1)} MB — over typical 10MB limit.`,
    });
  }

  // 6) Square-ish
  const ratio = width && height ? width / height : 1;
  if (ratio > 0.95 && ratio < 1.05) {
    rules.push({
      id: "aspect",
      title: "Square-ish aspect (1:1)",
      status: "pass",
      detail: `Aspect ${ratio.toFixed(2)} — good for consistent MAIN tiles.`,
    });
  } else {
    rules.push({
      id: "aspect",
      title: "Square-ish aspect (1:1)",
      status: "warn",
      detail: `Aspect ${ratio.toFixed(2)}. Square (1:1) is safer for search tiles.`,
    });
  }

  const fails = rules.filter((r) => r.status === "fail").length;
  const warns = rules.filter((r) => r.status === "warn").length;
  const score = Math.max(0, 100 - fails * 25 - warns * 8);
  const ready = fails === 0;

  return { width, height, format, bytes, score, ready, rules };
}

function sampleWhiteBackground(
  data: Buffer,
  w: number,
  h: number,
  channels: number
) {
  const band = Math.max(2, Math.floor(Math.min(w, h) * 0.04));
  let n = 0;
  let whiteish = 0;
  let deltaSum = 0;

  const visit = (x: number, y: number) => {
    const i = (y * w + x) * channels;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const d = (255 - r + (255 - g) + (255 - b)) / 3;
    deltaSum += d;
    n++;
    if (r >= 245 && g >= 245 && b >= 245) whiteish++;
  };

  for (let y = 0; y < band; y++) for (let x = 0; x < w; x++) visit(x, y);
  for (let y = h - band; y < h; y++) for (let x = 0; x < w; x++) visit(x, y);
  for (let y = band; y < h - band; y++) {
    for (let x = 0; x < band; x++) visit(x, y);
    for (let x = w - band; x < w; x++) visit(x, y);
  }

  return {
    ratio: n ? whiteish / n : 0,
    avgDelta: n ? deltaSum / n : 255,
  };
}

/** Bounding box of non-near-white pixels / full area */
function estimateProductFill(
  data: Buffer,
  w: number,
  h: number,
  channels: number
) {
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * channels;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = channels > 3 ? data[i + 3] : 255;
      if (a < 20) continue;
      if (r >= 248 && g >= 248 && b >= 248) continue;
      found = true;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (!found) return 0;
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  return (bw * bh) / (w * h);
}

export async function renderReportPng(
  report: ComplianceReport,
  opts: { watermark: boolean; brand: string }
): Promise<Buffer> {
  const rowH = 52;
  const pad = 40;
  const width = 900;
  const height = pad * 2 + 120 + report.rules.length * rowH + 80;
  const lines = report.rules
    .map((r, i) => {
      const y = pad + 130 + i * rowH;
      const color =
        r.status === "pass" ? "#15803d" : r.status === "warn" ? "#a16207" : "#b91c1c";
      const label = r.status.toUpperCase();
      return `
        <text x="${pad}" y="${y}" font-size="16" font-family="Arial, sans-serif" font-weight="700" fill="${color}">[${label}]</text>
        <text x="${pad + 90}" y="${y}" font-size="16" font-family="Arial, sans-serif" font-weight="600" fill="#18181b">${escapeXml(r.title)}</text>
        <text x="${pad + 90}" y="${y + 22}" font-size="13" font-family="Arial, sans-serif" fill="#52525b">${escapeXml(r.detail).slice(0, 95)}</text>
      `;
    })
    .join("");

  const stamp = opts.watermark
    ? `<text x="${width / 2}" y="${height - 24}" text-anchor="middle" font-size="14" fill="rgba(0,0,0,0.35)" font-family="Arial, sans-serif">Made with ${escapeXml(opts.brand)} — free Amazon MAIN check</text>`
    : "";

  const readyColor = report.ready ? "#15803d" : "#b91c1c";
  const svg = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#fafafa"/>
      <text x="${pad}" y="${pad + 28}" font-size="28" font-weight="700" font-family="Arial, sans-serif" fill="#18181b">Amazon MAIN image check</text>
      <text x="${pad}" y="${pad + 58}" font-size="15" font-family="Arial, sans-serif" fill="#52525b">${report.width}×${report.height} · ${report.format.toUpperCase()} · score ${report.score}/100</text>
      <text x="${pad}" y="${pad + 88}" font-size="18" font-weight="700" font-family="Arial, sans-serif" fill="${readyColor}">${report.ready ? "No hard fails detected" : "Fix fails before uploading as MAIN"}</text>
      ${lines}
      ${stamp}
    </svg>
  `);

  // Prefer embedded bitmap title if fonts missing on Linux — sharp SVG text may tofu;
  // still OK for MVP report structure; watermark line is secondary.
  return sharp(svg).png().toBuffer();
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
