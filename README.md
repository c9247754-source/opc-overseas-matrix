# opc-overseas-matrix

刘小排逻辑 · 海外 Freemium 工具矩阵（程序员执行版）

## Locked products

1. **SnapShelf** — product photo cleanup（先做）
2. **FacePass** — AI headshots
3. **PageBrief** — PDF → cited brief

See `LAUNCH.md` and `products/*.md`.

## Repo layout

```
apps/snapshelf/   ← P0 Next.js app（先实现）
apps/facepass/    ← 复用同一模板
apps/pagebrief/   ← 第二波
packages/ui/      ← 可选共享
```

## 完整手册

打开根目录 **`SOP.md`**（Creem 手把手，从建商品到上线获客）。

## Quick start（SnapShelf）

```bash
cd apps/snapshelf
cp .env.example .env.local
# 填 CREEM_* + NEXT_PUBLIC_CREEM_PRODUCT_* + REPLICATE_API_TOKEN
npm install
npm run dev
```

支付已接 **Creem**（`@creem_io/nextjs`）。
