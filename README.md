# opc-overseas-matrix

刘小排逻辑 · 海外 Freemium 工具矩阵（程序员执行版）

## Products（需求优先）

1. **SnapShelf** — 去背（验证中；弱差异）
2. **StageListing** — 房产 Virtual Staging（主押）
3. **OgMaker** — OG 社媒封面图（主押）
4. ListCheck / FacePass / PageBrief — 暂缓或旁支

See `LAUNCH.md` and `products/*.md`.

## Repo layout

```
apps/snapshelf/      ← 已上线
apps/stagelisting/   ← 空房→布景（可上线）
apps/ogmaker/        ← OG 图生成（可上线）
apps/listcheck/      ← 合规检查旁支
apps/facepass/       ← 暂缓
apps/pagebrief/      ← 暂缓
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
