# SnapShelf — Product Spec（P0）

## Positioning

Upload a product photo → get a clean white-background / studio-ready image in seconds.  
No signup required for first runs.

## Why it lives（刘小排逻辑）

- Demand validated: remove.bg / Photoroom 已证明付费
- Instant result + shareable
- Freemium: watermark / daily limit → pay to remove
- Single feature: product photo cleanup（不做全能编辑器）

## Scope（只做这些）

1. Upload JPG/PNG（≤10MB）
2. One-click: background remove + white / soft-gray studio bg
3. Download PNG with watermark（free）
4. Pay → download clean PNG
5. Optional: “enhance lighting” toggle（v1.1）

## Out of scope（明确不做）

- Batch >10, team seats, plugins, mobile app, video
- Full Photoshop editor, text overlays, logo collage

## API sketch

- `POST /api/process` { imageBase64, mode: "white"|"gray" } → { jobId, previewUrl, watermarked: true }
- `POST /api/checkout` → Stripe session
- `GET /api/download?token=` → clean file if paid

## Landing copy（EN）

- H1: Product photos that look store-ready — in one click
- Sub: Free to try. No account. Pay only when you need a clean export.
- CTA: Upload product photo

## Launch channels

- Product Hunt
- Reddit: r/ecommerce, r/shopify, r/Entrepreneur
- Indie Hackers
- Watermark growth

## Success metric（14 days）

- ≥ 1 paid checkout OR ≥ 3% share-button CTR on result page