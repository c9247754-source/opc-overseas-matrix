# StageListing

AI virtual staging for real estate listings — empty room → staged photo.

## Local

```bash
cd apps/stagelisting
cp .env.example .env.local
npm install
npm run dev   # http://localhost:3002
```

Without `FAL_KEY` / `REPLICATE_API_TOKEN`, the app uses a local preview overlay so UI + Creem freemium still work. Add a key for photoreal staging.

## Creem

- Credits $9 → 100 clean exports  
- Pro $19/mo → 30 days  

Webhook: `/api/webhook/creem`

## Deploy (Vercel)

- Root Directory: `apps/stagelisting`
- Env: Creem + optional `FAL_KEY`
- Push to deploy (do not invent extra Vercel projects unless needed)

## 14-day kill

0 paid + nobody says “cheaper/faster than my staging vendor” → kill.
