# OgMaker / StageListing — Vercel 上线必填环境变量

两个项目共用同一套 Creem 结构。在 Vercel → Project → Settings → Environment Variables 填齐后 **Redeploy**。

## OgMaker（Root = `apps/ogmaker`）

| 变量 | 必填 | 示例 / 说明 |
|------|------|-------------|
| `CREEM_API_KEY` | 是 | Creem Dashboard 的 API Key |
| `CREEM_WEBHOOK_SECRET` | 是 | Webhook signing secret |
| `CREEM_TEST_MODE` | 是 | 测试 `true`；正式 `false` |
| `NEXT_PUBLIC_CREEM_PRODUCT_CREDITS` | 是 | Credits 商品 ID，`prod_…` |
| `NEXT_PUBLIC_CREEM_PRODUCT_PRO` | 建议 | Pro 商品 ID，`prod_…` |
| `NEXT_PUBLIC_APP_URL` | 是 | `https://你的域名` |
| `NEXT_PUBLIC_BRAND` | 建议 | `OgMaker` |

Webhook URL：`https://你的域名/api/webhook/creem`

OgMaker **不需要** AI Key。字体已打进仓库（Inter + 思源黑体简），中英文标题在 Vercel 上也应正常。

## StageListing（Root = `apps/stagelisting`）

| 变量 | 必填 | 说明 |
|------|------|------|
| 上表全部 Creem / Brand 变量 | 是 | Brand 用 `StageListing` |
| `FAL_KEY` | 正式布景必填 | [fal.ai](https://fal.ai) Key |
| `STAGING_PROVIDER` | 建议 | 正式设 `auto`；无 key 时为 mock 预览 |

Webhook：`https://你的Stage域名/api/webhook/creem`

## 自检

1. 首页能打开，点生成/布景有图  
2. 免费图有清晰水印（不是方框乱码）  
3. 标题中英文都清晰可读  
4. Credits 测试支付 → `/success` → 再生成无水印  
