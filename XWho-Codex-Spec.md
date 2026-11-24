# XWho（中文 X 黄皮书）— 项目初始化与开发规格文档（Codex 交接版）

> **给 Codex 的直接指令**：请在 GitHub 组织 **`AgenfyLabs`**（`https://github.com/AgenfyLabs`）下创建或初始化公开仓库 **`https://github.com/AgenfyLabs/xwho`**（`git remote` 指向 `https://github.com/AgenfyLabs/xwho.git`，默认分支 `main`），并依据本文档实现 **XWho（中文 X 黄皮书）** MVP。严格遵循文中的数据口径、隐私红线、Schema 约束与验收清单，不要编造虚构创作者数据或虚假指标；建完项目与导入脚本后，运行全部校验、单元测试和生产构建并通过后再交付。

---

## 1. 项目定位与核心原则

- **项目名称**：**XWho**（中文对外名：**中文 X 黄皮书**）
- **GitHub 组织**：`AgenfyLabs`（https://github.com/AgenfyLabs）
- **目标仓库**：`https://github.com/AgenfyLabs/xwho`（Public 公开开源仓库，默认分支 `main`；若尚未在远端创建，可执行 `gh repo create AgenfyLabs/xwho --public --description "中文 X 创作者开源黄皮书与中推今日大事件 · Open-source directory & daily digest for Chinese builders on X"` 或绑定该 remote）
- **一句话介绍**：公开、可核验、由本人认领的中文 X（Twitter）实战者黄皮书与「中推今日大事件」日更动态。
- **核心差异化（解决同类中文推特导航「半年停更、死链丛生、垃圾投稿」问题）**：
  1. **永久主键防断链**：所有创作者档案以 X 不可变数字 ID `x_user_id` 为唯一主键（单人单文件 `data/creators/<x_user_id>.json`），不以 `@handle` 为主键，改名不会拆断档案，且单人单文件彻底避免多人/机器人并发提 PR 时的 Git 冲突。
  2. **公开作品在前，联系方式本人自己留**：编辑与自动化脚本**绝不代填**创作者的微信号、邮箱、报价、咨询入口或接单状态（`service_board` 必须为空）；只有本人通过 X OAuth 2.0 登录后（按 `x_user_id` 精确匹配），才能自主填写合作留言板或一键隐藏自己的档案。
  3. **零编造与严格口径**：禁止编造粉丝数、收入、用户数、作品或金句；所有粉丝数必须带抓取时点（UTC+8），自述数据必须标注「自述」，每一条金句与大事件都必须附真实可查的 `source_url`。
  4. **严格反水号红线**：不收录纯交易所返佣/带单/喊单号、互关抽奖/空投羊毛号、纯搬运营销号、超过 12 个月未发帖的停更号。
  5. **日更保鲜飞轮**：通过「每日轮换巡检 500+ 池（查漏补缺） + 中推今日大事件 + 提 PR 人工审核」保持长期活性，严禁绕过官方接口爬 X，严禁自动代发推文。

---

## 2. 技术栈与仓库结构

### 技术栈
- **框架**：Next.js（App Router，TypeScript 严格模式）
- **样式**：Tailwind CSS
- **数据校验**：Zod（前后端与 CI 共用一套 Schema）
- **测试**：Vitest（覆盖 Schema 校验、去重规则、隐私红线、认领/隐藏过滤、推文草稿格式化）
- **数据源**：Git 仓库内 JSON 文件（零数据库冷启动，静态构建 + 服务端路由读取；写操作走 GitHub API 提 PR 或直推）

### 视觉基调
- 温暖、克制的「纸面黄皮书 / 编辑部名录」阅读气质（浅暖纸底 `#F8F5EE` / `#FAF8F4`、深墨文字、暖灰细边框、温和棕褐主按钮），**不要**使用霓虹渐变、黑客风暗黑大屏或浮夸动效。
- 面向 500+ 条目设计信息密度，桌面端与移动端均清晰易扫读。

### 仓库目录结构
```text
.
├── AGENTS.md                           # 给后续 AI Agent / 协作者的仓库铁律
├── README.md                           # 项目简介、本地启动、环境变量、数据贡献与 PR 流程
├── .env.example                        # 完整环境变量模板
├── .github/
│   ├── PULL_REQUEST_TEMPLATE.md        # 每日巡检 / 今日大事件 / 新博主入库三类 PR 清单
│   └── workflows/
│       └── validate-data.yml           # PR & push 自动跑 validate:data、test、build
├── data/
│   ├── creators/
│   │   └── <x_user_id>.json            # 单人一文件（首批支持直接导入 500+ 已核验名单）
│   └── milestones.json                 # 「中推今日大事件」结构化事件流
├── scripts/
│   ├── validate-data.ts                # 全量数据校验脚本（npm run validate:data）
│   └── import-pool.ts                  # 幂等批量导入脚本（支持导入已核验 JSON 池并按 x_user_id 去重）
├── src/
│   ├── lib/
│   │   ├── schema.ts                   # Creator / Milestone / ServiceBoard Zod Schema
│   │   ├── data.ts                     # 数据读取、筛选、排序、分页与隐藏过滤
│   │   ├── digest.ts                   # 「中推今日大事件」按 UTC+8 分组与推文草稿生成器
│   │   ├── x-oauth.ts                  # X OAuth 2.0 PKCE（只读权限 users.read 和 tweet.read）+ 签名 Cookie 会话
│   │   └── github-writer.ts            # 将认领修改/隐藏/入库申请写入 GitHub（PR 或 direct 模式）
│   └── app/
│       ├── page.tsx                    # 首页：500+ 创作者黄皮书目录
│       ├── creator/[handle]/page.tsx   # 创作者详情页（不区分大小写匹配 handle，hidden 返回 404）
│       ├── events/page.tsx             # 「中推今日大事件」按日时间线与一键复制推文草稿
│       ├── dashboard/page.tsx          # X 登录工作台：认领编辑、一键隐藏、申请入库
│       └── api/
│           ├── auth/x/login/route.ts
│           ├── auth/x/callback/route.ts
│           ├── auth/logout/route.ts
│           ├── profile/route.ts        # 已登录本人更新档案 / service_board / hide
│           └── apply/route.ts          # 未入库用户提交入库申请（开 PR）
└── tests/
    └── *.test.ts                       # Vitest 单元测试
```

---

## 3. 核心数据模型（Schema 规范）

> 下方字段命名与已核验的 500+ 人数据集完全对齐，确保后续可直接用 `scripts/import-pool.ts` 无损导入。

### 3.1 赛道与标签枚举
- **6 个主赛道（`vertical`）**：
  - `ai-dev`：AI 开发者
  - `geo`：GEO
  - `media`：媒体人
  - `crypto`：币圈
  - `finance`：财经投资
  - `general`：创业与观察
- **身份背景标签（`role_tags`，可多选）**：
  `indie-dev`（独立开发者）、`founder`（创始人）、`oss-author`（开源作者）、`ex-bigtech`（前大厂）、`ai-exec`（AI 高管）、`bigtech-exec`（大厂高管）、`investor`（投资人）、`media-editor`（媒体/编辑）、`researcher`（研究员）、`brand-account`（机构/品牌号）
- **核验分层（`verification_tier`）**：
  - `deep-verified`：**深度核验**（逐条核验过代表作、第三方链接、原帖金句与公开事实；要求 `verified_works.length >= 1`）
  - `api-verified`：**接口核验**（经 X 官方接口核验账号存活、活跃度、语言与反水号红线；允许 `verified_works` 为空数组 `[]`）
- **认领状态（`claim_status`）**：
  - `unclaimed`：未认领（公开展示，但**严禁**包含非空 `service_board`）
  - `claimed`：已认领（本人 X OAuth 校验后可自主维护 `service_board` 与公开信息）
  - `hidden`：本人已隐藏（文件继续留在仓库中以防每日巡检重复录入，但网站所有公开列表、搜索、统计与详情页完全不展示，访问 `/creator/[handle]` 返回 `404`）

### 3.2 `data/creators/<x_user_id>.json` 结构
```json
{
  "x_user_id": "3178231",
  "handle": "dotey",
  "display_name": "宝玉",
  "vertical": "media",
  "role_tags": ["oss-author"],
  "sub_tags": ["AI 资讯解读", "海外内容翻译", "Agent Skills"],
  "summary": "长期把海外 AI 论文、长文、产品动态翻译解读成中文；同时维护开源 Agent 技能集 baoyu-skills。",
  "verified_works": [
    {
      "title": "baoyu-skills",
      "description": "面向 Coding Agent 的开源技能集",
      "url": "https://github.com/JimLiu/baoyu-skills"
    }
  ],
  "quote": {
    "text": "经核验的原帖金句（可选，没有则为 null）",
    "source_url": "https://x.com/dotey/status/...",
    "published_at": "2026-11-20"
  },
  "followers_snapshot": {
    "count": 271452,
    "as_of": "2026-11-24T10:27:00+08:00"
  },
  "verification_tier": "deep-verified",
  "claim_status": "unclaimed",
  "last_post_at": "2026-11-24T09:10:00+08:00",
  "lead_sources": ["manual-verified-batch"],
  "service_board": null
}
```

认领后（`claim_status: "claimed"`）才允许写入 `service_board`：
```json
"service_board": {
  "open_for_collab": true,
  "cooperation_tags": ["技术咨询", "产品顾问", "播客/访谈", "开源赞助"],
  "pitch": "本人填写的合作范围与说明（≤280 字）",
  "contact_channels": [
    { "label": "合作邮箱", "value": "hi@example.com" },
    { "label": "预约链接", "value": "https://cal.com/example" }
  ],
  "updated_at": "2026-11-24T12:00:00+08:00"
}
```

### 3.3 `data/milestones.json` 结构（「中推今日大事件」）
```json
[
  {
    "id": "m-20261123-001",
    "x_user_id": "3178231",
    "event_type": "writing",
    "summary": "发布 P vs NP 科普视频并拆解核心直觉",
    "source_url": "https://x.com/dotey/status/...",
    "event_date": "2026-11-23",
    "submitted_by": "daily-bot"
  }
]
```
- `event_type` 枚举：`launch`（产品发布）、`oss`（开源里程碑）、`writing`（长文复盘）、`talk`（办会演讲）、`milestone`（重要节点）、`other`（其他）。
- `event_date` 统一使用 **UTC+8 日历日** `YYYY-MM-DD`。
- `x_user_id` 必须对应 `data/creators/` 中已存在的创作者（由 `validate-data.ts` 校验引用完整性）。

### 3.4 `npm run validate:data` 强制校验规则
1. 每个文件名必须严格等于内部 `x_user_id` + `.json`（纯数字字符串）。
2. 全库零重复 `x_user_id`，零重复小写 `handle`。
3. 所有 URL（`verified_works[].url`、`quote.source_url`、`milestones[].source_url`）必须是合法 `http://` 或 `https://`。
4. **隐私硬红线**：任何 `claim_status === "unclaimed"` 的档案，`service_board` 必须为 `null` 或缺省，否则校验直接失败。
5. **分层质量校验**：`verification_tier === "deep-verified"` 必须至少有 1 条 `verified_works`；`api-verified` 允许 `verified_works` 为空数组 `[]`。
6. `data/milestones.json` 每条记录的 `id` 唯一、`event_date` 符合 `YYYY-MM-DD`、`x_user_id` 存在于 `data/creators/` 中。

---

## 4. 四大核心页面与交互需求

### 4.1 首页 `/`（500+ 规模目录）
- 顶部品牌标题、定位说明与双按钮：`认领或申请入库`（跳 `/dashboard`）、`看中推今日大事件`（跳 `/events`）。
- **6 个赛道 Tab +「全部」**，每个 Tab 显示非隐藏创作者的实时人数。
- **搜索与筛选栏**：
  - 实时搜索：匹配 `display_name`、`handle`、`summary`、`sub_tags`、作品标题与已认领用户的 `service_board.pitch`。
  - 下拉筛选：`身份背景（role_tags）`、`合作标签（cooperation_tags）`。
  - 开关筛选：`已认领优先`、`正在接合作`、`只看深度核验`。
  - 排序切换：`深度核验优先`（默认，深度核验在前、同类按粉丝数降序）、`粉丝从高到低`、`最近活跃`（按 `last_post_at` 降序）。
- **分页体验**：每页展示 **24 人**，底部提供「加载更多」或清晰分页器（显示 `显示 24 / N 人`），避免 500+ 卡片一次渲染卡顿。
- 卡片内容：显示名、`@handle`、轻微徽标（`深度核验` / `接口核验` + 赛道标签）、简介、`role_tags` / `sub_tags`、代表作、粉丝数及 UTC+8 快照时间、底部认领状态（未认领提示「未认领 · 联系方式待本人填写」；已认领展示合作状态徽标）。

### 4.2 创作者详情页 `/creator/[handle]`
- 不区分大小写匹配 `handle`；若 `claim_status === "hidden"` 或不存在，直接返回 `404`。
- 上半区（公开可核验档案）：头像占位/首字、名称、`@handle` 外链到 X、核验分层徽标、简介、代表作列表（带外链与说明）、原帖金句（带出处链接）、粉丝快照与时点（UTC+8）、TA 在 `milestones.json` 中的近期大事件。
- 下半区（本人合作与联系留言板）：
  - 未认领时：展示清晰说明与「我是本人，使用 X 登录认领或隐藏档案」按钮；**绝不展示任何猜测的微信号或邮箱**。
  - 已认领时：渲染本人填写的合作标签、说明、公开联系方式与更新时间。

### 4.3 「中推今日大事件」页面 `/events`
- 按 `event_date`（UTC+8）**倒序按天分组**，最新一天高亮置顶。
- 支持按「主赛道」和「事件类型」筛选。
- **核心运营功能**：每一天右上角提供 **「复制今日推文草稿」** 按钮，点击后一键复制格式化好的中文推文要点（包含日期标题、每条事件的 `@handle` + 显示名、客观一句话事实摘要与原帖出处链接，自动控制在适合发 X 长帖或 Thread 的清晰排版），方便站长人工审阅后直接发推/转发。

### 4.4 本人认领与申请工作台 `/dashboard`
- **X OAuth 2.0（PKCE）登录**：
  - 仅申请 `users.read` 和 `tweet.read` 两项只读权限（不申请发推、关注或私信权限）。回调通过 `GET /2/users/me` 读取当前登录用户的 `id`、`username`、`name`，以 `id` 匹配档案的 `x_user_id`。[X 官方权限映射](https://docs.x.com/fundamentals/authentication/guides/v2-authentication-mapping)
  - 使用 HttpOnly + SameSite=Lax 的 HMAC 签名 Cookie 保存登录态（依赖 `SESSION_SECRET`）。
- **登录后分支**：
  1. **已在黄皮书库中（按 `x_user_id` 匹配）**：
     - 可编辑自己的 `service_board`（是否接合作、合作标签、留言说明、公开联系方式）及基础公开信息；
     - 提供显眼的 **「一键隐藏我的档案」**（将 `claim_status` 设为 `"hidden"`，立即生效/提交变更；已隐藏用户再次登录可一键恢复）。
  2. **尚未入库**：
     - 展示「申请入库」表单：必填赛道、一句话简介、**至少 1 个公开可核验作品 URL**（表单和服务端双校验），提交后走 GitHub API 开出新创作者入库 PR 等待维护者审核。
- **优雅降级（本地预览/未配密钥也能跑通演示）**：
  - 若未配置 `X_CLIENT_ID` 或 `GITHUB_TOKEN`，页面不报错崩白，清晰提示缺哪些环境变量，并提供「预览生成的 JSON 补丁 / 跳转 `https://github.com/AgenfyLabs/xwho` 提 PR」兜底，方便本地开发和评审。

---

## 5. 每日更新 + 提 PR 审核运营机制

项目上线后按以下双轨 PR 流程运行（CI 由 `.github/workflows/validate-data.yml` 兜底）：

1. **查漏补缺巡检 PR**（每周滚动覆盖全池）：
   - 按工作日每天抽查 ~100 位账号，通过 X 官方接口核查：是否改 `@handle`（按 `x_user_id` 原地更新 `handle`）、是否封禁/注销/锁推/超过 12 个月未发帖，以及补充经红线审核的新增候选人。
2. **中推今日大事件 PR**（每日 1 条 PR）：
   - 汇总 500+ 池内过去 24 小时 5–8 条真实高价值动态写入 `data/milestones.json`，附带中文推文草稿供站长审核后自行发推/转发。
3. **CI 门禁与 PR 模板**：
   - `.github/workflows/validate-data.yml`：每次 PR 自动执行 `npm ci && npm run validate:data && npm test && npm run build`。
   - `.github/PULL_REQUEST_TEMPLATE.md`：列出三类 PR 勾选清单（查漏补缺 / 今日大事件 / 新博主入库）及红线核对项（无返佣喊单、无编造数字、未代填联系方式、均有原帖出处）。

---

## 6. 环境变量清单（`.env.example`）

```bash
# 应用公开访问地址（本地开发 http://localhost:3000）
NEXT_PUBLIC_APP_URL=http://localhost:3000

# X OAuth 2.0（仅请求 users.read 和 tweet.read 两项只读权限）
X_CLIENT_ID=
X_CLIENT_SECRET=

# 登录会话 Cookie 签名密钥（建议 ≥32 位随机串）
SESSION_SECRET=

# GitHub 写入配置（认领编辑 / 隐藏 / 入库申请提交到仓库）
GITHUB_TOKEN=
GITHUB_REPO_OWNER=AgenfyLabs
GITHUB_REPO_NAME=xwho
GITHUB_BASE_BRANCH=main
# pr（推荐：自动开 PR 留痕审核）或 direct（直接提交到主分支）
GITHUB_WRITE_MODE=pr
```

---

## 7. 批量导入已有 500+ 实查数据说明（`scripts/import-pool.ts`）

我们已通过 X 官方接口实查并去重整理好 500+ 位中文 X 创作者 JSON 数据（后续会由项目方把数据 JSON 放入仓库或本地目录）。请实现 `scripts/import-pool.ts`，支持命令：
```bash
npx tsx scripts/import-pool.ts --input <path-to-json> [--tier deep-verified|api-verified]
```
要求：
- 严格按 `x_user_id`（及小写 `handle`）幂等合并写入 `data/creators/<x_user_id>.json`；
- 合并优先级：**保留已存在的 `claimed` / `hidden` 状态与 `service_board`**，且 `deep-verified` 档案优先于 `api-verified`（冲突时仅补充缺失的 `last_post_at` / `lead_sources`）；
- 导入结束自动输出各赛道统计人数并运行一次全量 Schema 校验。

---

## 8. Codex 完成交付验收清单

Codex 在结束初始化前必须全部完成并验证通过以下项目：
- [ ] 完成全部目录结构、四大页面、X OAuth 2.0 路由、GitHub 写入层、`validate-data.ts`、`import-pool.ts`、GitHub Actions CI 与 PR 模板、以及 `AGENTS.md` / `README.md`。
- [ ] 放入至少 3–5 条示例骨架数据（或等待导入真实 500+ 数据文件；若放示例数据，在 README 明确标注为占位示例，切勿冒充已核验真实创作者，最好直接留好 `import-pool.ts` 待导入真实 500+ 数据）。
- [ ] `npm run validate:data` 退出码 `0`。
- [ ] `npm test` 全部通过（至少覆盖：Schema 校验、重复 `x_user_id`/`handle` 拦截、`unclaimed` 带 `service_board` 拦截、`hidden` 过滤与 404、`events` 按 UTC+8 日期分组与推文草稿输出，以及 X 登录跳转只请求 `users.read` 和 `tweet.read`）。
- [ ] `npm run build` 生产构建零报错通过。
- [ ] 确认未配置 `.env` 时本地 `npm run dev` 首页、详情页、`/events`、`/dashboard` 均可正常打开且无服务端崩溃。
