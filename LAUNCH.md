# Overseas OPC Matrix — Launch Pack（刘小排逻辑）

## 已锁定上线（直接做，不再纠结）

| # | 产品代号 | 域名意向 | 一句话 | 优先级 |
|---|----------|----------|--------|--------|
| 1 | **SnapShelf** | snapshelf.app / .com | 电商主图：去背/白底/精修，免登录出图 | P0 先上 |
| 2 | **FacePass** | facepass.app / .com | AI 职业头像：自拍 → 多风格证件/LinkedIn 照 | P0 并行骨架 |
| 3 | **PageBrief** | pagebrief.app / .com | PDF/长文 → 带引用的一页结构摘要 | P1 第二波 |

共同商业骨架（不可改）：

```
免登录试用 → 30 秒出结果（含水印）→ Stripe 去水印/额度/订阅 → 结果页可分享
```

共同原则：一个主功能做到极致；不投流先测；14 天无付费则杀产品。

---

## 统一定价（先写死）

| 档位 | 价格 | 权益 |
|------|------|------|
| Free | $0 | 每日 3 次，带水印，禁止商用声明 |
| Credits | $9 / 100 credits | 去水印导出（约 1 图=3–5 credits） |
| Pro | $19/mo | 每日更高额度 + 去水印 + 历史记录 |

支付：**Creem**（Checkout + Webhook）。不要用 Stripe。

---

## 14 天节奏（三人矩阵，一人执行）

| 天 | SnapShelf | FacePass | PageBrief |
|----|-----------|----------|-----------|
| 1–2 | 域名+落地文案+竞品截图 | 同左（文案） | 仅竞品与关键词表 |
| 3–7 | **可付费 MVP 上线** | 上传→出图骨架 | — |
| 8–10 | PH + Reddit(r/ecommerce, r/shopify) | MVP 可试用 | 开始搭 |
| 11–14 | 看付费；调水印/额度 | 上 Stripe | MVP 内测 |

停损：任一产品连续 14 天 **0 付费且分享率 <1%** → 下线，资源并到活着的那个。

---

## 技术统一

- Next.js 14 App Router + TypeScript
- Vercel 部署
- 图像：Replicate / fal.ai（或国内可转的海外 API）
- PDF：pdf-parse / LlamaParse / 大模型长文
- DB：Supabase（用户可选登录、额度、历史）
- 额度：IP + fingerprint 免费层；登录后绑定账户

---

## 水印与传播（每个产品都要）

结果图/PDF 页脚固定：

`Made with {Brand} — free online {feature}` + 可点链接

Pro / Credits 购买后去掉水印。