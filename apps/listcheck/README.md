# ListCheck

Amazon MAIN image compliance check — demand-first product in the OPC matrix.

## What users want

Sellers fear MAIN suppress. They need **pass/fail before upload**, not another rembg.

## Local

```bash
cd apps/listcheck
cp .env.example .env.local
npm install
npm run dev   # http://localhost:3001
```

## Creem

Reuse your Creem store. Create products (or reuse SnapShelf SKUs if testing):

- Credits $9 → 100 clean reports
- Pro $19/mo → 30 days

Set `NEXT_PUBLIC_CREEM_PRODUCT_*` and `CREEM_API_KEY`. Webhook: `/api/webhook/creem`.

## Deploy

Same pattern as SnapShelf: one Vercel project, Root Directory `apps/listcheck`, push to deploy. Do not invent extra Vercel projects unless needed.

## 14-day kill

0 paid + nobody says “this would have caught my suppress” → kill.
