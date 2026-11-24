# XWho · 中文 X 黄皮书

通过公开作品发现中文 X 创作者，按北京时间查阅有原始出处的每日动态。创作者使用 X 登录后，可以认领档案、发布本人合作信息或隐藏档案。

**初始数据为空。** 项目方尚未提供已核验的 500+ 名单。首页人数来自实际文件。规格中的 JSON 用于解释结构，测试夹具和隔离验收样本仅用于测试。

## 本地启动

需要 Node.js 22.12+ 和 npm。在项目根目录运行以下命令。

~~~sh
npm ci
npm run validate:data
npm test
npm run build
npm run dev
~~~

浏览 http://localhost:3000 。生产模式执行 npm start。无需 .env 即可查看首页、事件页、工作台和详情路由。空库中任意创作者地址返回 404。导入真实档案后，用 /creator/用户名 查看详情，用户名忽略大小写。

## 页面与数据

| 入口 | 功能 |
| --- | --- |
| / | 六赛道名录、实时搜索、身份及合作筛选、三种排序，每页 24 人 |
| /creator/[handle] | 作品和出处、粉丝快照、近期事件，以及本人填写的公开留言板 |
| /events | 按 UTC+8 日期倒序查看事件，按赛道与类型筛选，按天复制草稿 |
| /dashboard | 登录、认领、公开信息与合作留言板、隐藏或恢复、申请入库 |

正式档案放在 data/creators/<x_user_id>.json，事件放在 data/milestones.json。src/lib/schema.ts 是数据口径的实现，字段示例见 XWho-Codex-Spec.md。未知粉丝快照、金句、最近发帖时间可以为空。深度核验至少需要一项核验作品。接口核验允许作品数组为空。

## 批量导入

~~~sh
npx tsx scripts/import-pool.ts --input /path/to/verified-pool.json
npm run import:pool -- --input /path/to/verified-directory --tier api-verified
~~~

输入可为 JSON 数组、带 creators 数组的对象，或每个 JSON 文件一人的目录。--tier 仅补全缺省层级。脚本按永久数字 ID 合并，跨 ID 的大小写同名会使整批失败。新档案只能以未认领、空留言板状态入库。已有认领或隐藏状态以及本人留言板均保留。同一 ID 的低层级来源只能给深度档案补缺最近发帖时间和来源。重复导入相同数据不会改写文件。

脚本先在内存完成全库校验，再暂存变更、逐文件原子替换，最后重读全库并输出六赛道的公开人数。普通写入失败会回滚本次已替换的文件。并发导入由 data/.xwho-import.lock 互斥。若进程意外退出，先核实锁内 PID 已结束，再清理遗留锁并重跑同一批数据。

## 环境变量

从 .env.example 复制为 .env.local 后按需配置。所有密钥只在服务端使用。

| 名称 | 用途 |
| --- | --- |
| NEXT_PUBLIC_APP_URL | 对外 origin，默认 http://localhost:3000，生产使用 HTTPS |
| X_CLIENT_ID | X OAuth 客户端 ID |
| X_CLIENT_SECRET | 机密客户端的 secret，公开 PKCE 客户端可留空 |
| SESSION_SECRET | 至少 32 字节随机密钥，签名登录流程与会话 Cookie |
| GITHUB_TOKEN | 仅向目标仓库写内容和开 PR 的服务端凭据 |
| GITHUB_REPO_OWNER / GITHUB_REPO_NAME | 默认 AgenfyLabs / xwho |
| GITHUB_BASE_BRANCH | 默认 main |
| GITHUB_WRITE_MODE | 默认 pr，direct 仅对已有档案变更生效 |

在 X 开发者控制台登记与 NEXT_PUBLIC_APP_URL 完全一致的 /api/auth/x/callback 回调。登录仅请求 `users.read` 和 `tweet.read`。回调调用 `GET /2/users/me`，用本人的数字 ID、用户名和显示名识别身份，并从 `description`、`protected`、`pinned_tweet_id` 生成申请建议。[X 官方身份接口](https://docs.x.com/x-api/users/get-my-user)

流程使用 PKCE S256 和随机 state，流程 Cookie 有效期为 10 分钟。服务器将身份与筛选后的申请建议写入 7 天的 HMAC 签名会话。Cookie 使用 HttpOnly、SameSite=Lax，HTTPS 附加 Secure。

工作台会预填公开 bio 中适合公开的简介，只有赛道明确时才预选，作品候选使用本人公开置顶帖。已有会话可点「用 X 简介自动申请」同步 X 资料，保留已填内容并在资料齐全时提交。缺少必填项时在原表单补全。预览模式对应「用 X 简介自动预览」，可核对生成的 JSON。

缺少 X 配置时，工作台可本地校验并预览申请 JSON。已验证身份但缺少 GITHUB_TOKEN 时，可预览本人档案或申请的 JSON 补丁。页面提供 GitHub 仓库入口。

## 贡献、审核与生效时间

- 巡检按工作日轮换，每日约 100 人。按数字 ID 识别改名，检查停更、锁推、封禁与注销。仅使用 X 官方接口或人工核实的公开原始来源。
- 今日大事件单独开 PR，汇总近 24 小时真实动态，目标 5–8 条，每条均附出处。站长按天复制草稿并人工审阅发布。
- 入库申请无论写入模式如何都开 PR。data/applications/<id>.json 是待审核材料，网站不读取该目录。维护者核实公开作品、语言、活跃度、数字及反营销红线后，在该 PR 内以 data/creators/<id>.json 替换申请。核实层级和数值后再合并。
- 认领与隐藏根据 OAuth 数字 ID 定位。编辑不得代留联系方式。本人公开的联系方式会进入公开 Git 仓库及历史，请在提交前留意公开范围。隐藏生效后，该 ID 会从网站全部公开入口移除，文件保留用于巡检去重。
- PR 模式在合并并部署后对访客生效，direct 模式在提交并部署后生效。服务器从目标分支读取当前档案，按文件 SHA 防止覆盖并发修改。GitHub Actions 在每次 push 和 PR 上校验数据、执行测试并构建生产版本。
