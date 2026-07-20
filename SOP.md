# 完整手把手 SOP（Creem 收款版）

> **你已有 Creem** — 全程用 Creem，不要配 Stripe。  
> 目标：海外上线 **SnapShelf → FacePass → PageBrief**  
> 原则：刘小排逻辑 — 免登录试用、水印、第一天能收费、14 天无付费就杀

---

## 今天立刻做（Creem 优先 20 分钟）

1. 打开 Creem Dashboard → **Products**  
2. 新建（建议先 Test mode）：  
   - `SnapShelf Credits` · one-time · **$9** → 复制 `prod_…`  
   - `SnapShelf Pro` · subscription · **$19/mo** → 复制 `prod_…`  
3. **API Keys** → 复制 Test API Key  
4. 填进 `apps/snapshelf/.env.local`（见阶段 2）  
5. `cd apps/snapshelf && npm run dev` → 浏览器点 Buy → 应跳转 Creem Checkout  

FacePass / PageBrief 各再建一对 Credits+Pro（共 6 个商品）。

---

## 总览（你按序号做，不要跳）

| 阶段 | 做什么 | 预计时间 |
|------|--------|----------|
| 0 | 账号与密钥备齐 | 1–2 小时 |
| 1 | Creem 里建好 6 个商品 | 30 分钟 |
| 2 | SnapShelf 本地跑通 → 接去背 → 接 Creem | 1–2 天 |
| 3 | 域名 + Vercel 上线 SnapShelf | 半天 |
| 4 | 发 PH / Reddit（获客） | 半天 |
| 5 | 复制代码做 FacePass | 1–2 天 |
| 6 | 做 PageBrief | 1–2 天 |
| 7 | 14 天数据复盘 | — |

---

## 阶段 0：账号清单（全部注册好）

逐项打勾：

- [ ] **Creem** 已开通（你有）→ 记下 Test API Key + Live API Key  
- [ ] **GitHub** 账号（代码仓库）  
- [ ] **Vercel** 账号（用 GitHub 登录）  
- [ ] **域名**（Namecheap / Cloudflare / Porkbun）建议先买 1 个主域，子域分产品：  
  - `snapshelf.yourdomain.com`  
  - `facepass.yourdomain.com`  
  - `pagebrief.yourdomain.com`  
  或三个独立 `.com`（更贵，品牌更好）  
- [ ] **SnapShelf 去背**：浏览器本地免费（`@imgly/background-removal`），**不需要 Replicate**  
- [ ] **FacePass** 仍可能需要 Replicate / fal.ai（头像生成）  

- [ ] **OpenAI / Anthropic / DeepSeek** 任一（PageBrief 用）  
- [ ] **邮箱** 用于 Creem / 域名 / 客服（建议 Google Workspace 或纯 Gmail）

---

## 阶段 1：Creem 后台建商品（必须先做）

登录 [Creem Dashboard](https://creem.io) → Products。

### 1.1 每个产品建 2 个商品

| 内部名 | 类型 | 价格 | 用在 |
|--------|------|------|------|
| SnapShelf Credits | one-time | **$9** | 积分包（约 100 credits） |
| SnapShelf Pro | subscription 月付 | **$19/mo** | 去水印 + 更高额度 |
| FacePass Credits | one-time | **$9** | 头像包 |
| FacePass Pro | subscription | **$19/mo** | 同上 |
| PageBrief Credits | one-time | **$9** | 文档额度 |
| PageBrief Pro | subscription | **$19/mo** | 历史 + 长文档 |

### 1.2 复制 Product ID

每个商品创建后，复制类似 `prod_xxxx` 的 ID，填进各 app 的 `.env.local`：

```
CREEM_API_KEY=creem_test_xxx          # 先用 test
CREEM_WEBHOOK_SECRET=whsec_xxx        # webhook 里拿
CREEM_PRODUCT_CREDITS=prod_xxxx
CREEM_PRODUCT_PRO=prod_yyyy
CREEM_TEST_MODE=true                  # 上线改 false + 换 live key
```

### 1.3 Webhook（上线前配）

Creem → Webhooks → 添加：

- URL：`https://你的域名/api/webhook/creem`  
- 事件：至少勾选 `checkout.completed`（以及订阅相关若有）  
- 复制 **Webhook Secret** → `CREEM_WEBHOOK_SECRET`

本地调试可用 Creem 文档推荐的转发，或先上 Vercel Preview URL 测。

---

## 阶段 2：SnapShelf 本地完整跑通

### 2.1 打开项目

```bash
cd /Users/peilongjia/Projects/opc-overseas-matrix/apps/snapshelf
cp .env.example .env.local
npm install
```

### 2.2 编辑 `.env.local`

按阶段 1 填入 Creem（SnapShelf **不用** Replicate）：

```
CREEM_API_KEY=
CREEM_WEBHOOK_SECRET=
CREEM_PRODUCT_CREDITS=
CREEM_PRODUCT_PRO=
CREEM_TEST_MODE=true
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BRAND=SnapShelf
```

### 2.3 启动

```bash
npm run dev
```

浏览器打开 `http://localhost:3000`。

### 2.4 验收清单（本地）

1. 上传商品图 → 浏览器本地去背 → 白底 + **水印文字**（首次会下载免费模型，稍等）  
2. 点 **Buy credits / Pro** → 跳转 Creem Checkout（Test 模式）  
3. 付完跳转 `/success?…` → 页面显示成功  
4. Webhook 配置后：终端/日志能看到 `checkout.completed`（授予「去水印」标记 — MVP 用 cookie/localStorage + 服务端 token）

### 2.5 去背说明

SnapShelf 使用 `@imgly/background-removal`（浏览器 ONNX），**零 API 费用**。首次运行需能访问模型 CDN；国内网络慢时可开代理。

---

## 阶段 3：域名 + Vercel 上线 SnapShelf

### 3.1 推 GitHub

```bash
cd /Users/peilongjia/Projects/opc-overseas-matrix
git add .
git commit -m "feat: snapshelf creem mvp"
git remote add origin git@github.com:你的用户名/opc-overseas-matrix.git
git push -u origin main
```

### 3.2 Vercel

1. Import 该仓库  
2. **Root Directory** 选 `apps/snapshelf`  
3. Environment Variables 粘贴与 `.env.local` 相同，但：  
   - `NEXT_PUBLIC_APP_URL=https://你的域名`  
   - 先可用 `CREEM_TEST_MODE=true` 测，确认后再改 live  
4. Deploy  

### 3.3 绑域名

Vercel → Domains → 添加 `snapshelf.xxx.com` → 按提示加 DNS。

### 3.4 改 Creem Webhook 为生产 URL

`https://snapshelf.xxx.com/api/webhook/creem`

### 3.5 生产验收

- 手机/无痕打开站点，走完：上传 → 出图 → Creem 付款 → success  
- 确认付费后能下无水印图（按 success 页说明操作）

---

## 阶段 4：获客（不投流）

### 4.1 Product Hunt

- 标题：`SnapShelf – Store-ready product photos in one click`  
- 副标题：Free to try, no account. Pay only for clean exports.  
- 当天亲自回复评论  

### 4.2 Reddit（遵守版规，别硬广）

- r/ecommerce、r/shopify、r/EntrepreneurRideAlong  
- 先讲「我做了个免注册去背工具求反馈」，再放链接  

### 4.3 Indie Hackers

发 Build in public：截图 + 第一笔 Creem 收款。

### 4.4 水印即增长

确保导出图带：`Made with SnapShelf — free online product photo cleanup`

---

## 阶段 5：FacePass（复制 SnapShelf）

```bash
# 若尚未复制
cp -R apps/snapshelf apps/facepass
# 改 package.json name、文案、模型（头像生成）、Creem 商品 ID
```

SOP：

1. Creem 用 FacePass 的两个 `prod_`  
2. Vercel 再 Import 一次，Root = `apps/facepass`  
3. 换头像模型（见 `apps/facepass` 内注释）  
4. 同样 PH / Reddit（求职向版块）

---

## 阶段 6：PageBrief

1. Creem 建 Credits + Pro  
2. 配置 `OPENAI_API_KEY` 或兼容 API  
3. 上传 PDF → 结构摘要 + 页码引用  
4. 免费 1 次/天；Pro 去页脚水印 + 更长文档  
5. SEO：单独做 `/summarize-pdf` 落地页  

---

## 阶段 7：14 天复盘（刘小排停损）

对每个产品填表：

| 指标 | 数字 | 结论 |
|------|------|------|
| 独立访客 | | |
| 完成处理次数 | | |
| Creem 成功支付笔数 | | |
| 分享按钮点击率 | | |

**规则：** 14 天 **0 笔付费** 且分享率极低 → **杀掉**，资源并到有付费的产品。  
不要靠「再加功能」续命。

---

## 常见坑

| 坑 | 处理 |
|----|------|
| Creem 跳转失败 | 检查 `CREEM_API_KEY`、`product_id`、test/live 是否混用 |
| 去背一直失败 | 看浏览器控制台；首次模型下载是否被墙/超时 |
| Webhook 不触发 | URL 必须公网 HTTPS；Secret 一致 |
| 本机付款成功但无权限 | success 页要写入 unlock token；webhook 异步授予更稳 |
| 国内打不开测试 | 海外产品用海外网络测 Creem/Replicate |

---

## 你现在立刻做的 5 步（今天）

1. Creem 建好 SnapShelf 的 **$9 one-time** + **$19/mo** 两个商品，复制 `prod_` ID  
2. 注册 Replicate，拿 Token  
3. 填 `apps/snapshelf/.env.local`  
4. `npm run dev` 走通上传 + Creem Test 付款  
5. 回我：`prod_` 两个 ID 是否已建好、Test 付款是否成功——我再帮你盯上线/FacePass  

代码侧已按 **Creem**（非 Stripe）接好，见各 app 的 `api/checkout` 与 `api/webhook/creem`。
