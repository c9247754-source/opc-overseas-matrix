import sharp from "sharp";

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

export async function renderOgPng(input: OgInput): Promise<Buffer> {
  const title = (input.title || "Untitled").slice(0, 120);
  const subtitle = (input.subtitle || "").slice(0, 160);
  const brand = (input.brand || "OgMaker").slice(0, 40);
  const accent = sanitizeHex(input.accent || "#0ea5e9");
  const watermark = Boolean(input.watermark);

  const svg = layoutSvg({
    template: input.template || "blog",
    title,
    subtitle,
    brand,
    accent,
    watermark,
  });

  return sharp(Buffer.from(svg)).png().toBuffer();
}

function layoutSvg(opts: {
  template: OgTemplate;
  title: string;
  subtitle: string;
  brand: string;
  accent: string;
  watermark: boolean;
}): string {
  const { template, title, subtitle, brand, accent, watermark } = opts;
  const titleLines = wrapText(title, template === "quote" ? 28 : 22);
  const subLines = wrapText(subtitle, 48);

  const bg =
    template === "launch"
      ? `#0f172a`
      : template === "quote"
        ? `#fafafa`
        : `#0b1220`;
  const fg = template === "quote" ? `#0f172a` : `#f8fafc`;
  const muted = template === "quote" ? `#64748b` : `#94a3b8`;

  const titleY = template === "quote" ? 220 : 200;
  const titleSize = template === "quote" ? 52 : 48;
  const titleXml = titleLines
    .map(
      (line, i) =>
        `<text x="72" y="${titleY + i * (titleSize + 10)}" font-size="${titleSize}" font-weight="700" font-family="Georgia, 'Times New Roman', serif" fill="${fg}">${escapeXml(line)}</text>`
    )
    .join("");
  const subXml = subLines
    .map(
      (line, i) =>
        `<text x="72" y="${titleY + titleLines.length * (titleSize + 10) + 36 + i * 28}" font-size="22" font-family="Arial, Helvetica, sans-serif" fill="${muted}">${escapeXml(line)}</text>`
    )
    .join("");

  const badge =
    template === "product"
      ? `<rect x="72" y="72" width="140" height="36" rx="8" fill="${accent}"/><text x="92" y="96" font-size="16" font-weight="700" font-family="Arial" fill="#fff">PRODUCT</text>`
      : template === "launch"
        ? `<rect x="72" y="72" width="120" height="36" rx="8" fill="${accent}"/><text x="88" y="96" font-size="16" font-weight="700" font-family="Arial" fill="#0f172a">LAUNCH</text>`
        : `<circle cx="90" cy="90" r="14" fill="${accent}"/><text x="118" y="96" font-size="18" font-weight="600" font-family="Arial" fill="${muted}">${escapeXml(brand)}</text>`;

  const footer = watermark
    ? `<text x="${W / 2}" y="${H - 28}" text-anchor="middle" font-size="16" font-family="Arial" fill="rgba(148,163,184,0.85)">Made with ${escapeXml(brand)} — free OG image</text>`
    : `<text x="72" y="${H - 36}" font-size="18" font-family="Arial" fill="${muted}">${escapeXml(brand)}</text>`;

  const decor =
    template === "blog"
      ? `<rect x="${W - 220}" y="0" width="220" height="${H}" fill="${accent}" opacity="0.18"/>`
      : template === "product"
        ? `<circle cx="${W - 80}" cy="80" r="160" fill="${accent}" opacity="0.2"/><circle cx="${W - 40}" cy="${H - 40}" r="120" fill="${accent}" opacity="0.12"/>`
        : template === "launch"
          ? `<rect x="0" y="${H - 12}" width="${W}" height="12" fill="${accent}"/>`
          : `<text x="72" y="170" font-size="96" font-family="Georgia" fill="${accent}" opacity="0.35">“</text>`;

  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${bg}"/>
    ${decor}
    ${badge}
    ${titleXml}
    ${subXml}
    ${footer}
  </svg>`;
}

function wrapText(text: string, maxChars: number): string[] {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 4);
}

function sanitizeHex(c: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(c) ? c : "#0ea5e9";
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
