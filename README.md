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

## IndexNow

部署完成后，把站点地图中的网址提交给 IndexNow，供 Bing、Yandex、Seznam 和 Naver 接收。`npm run indexnow` 不参与 `npm run build`，CI 也不会执行它。

密钥文件是 `public/abfac3ea7702718243dbe54c6f4d3751.txt`，正文只有密钥本身。线上地址为 `https://xwho.org/abfac3ea7702718243dbe54c6f4d3751.txt`。这是公开校验文件，不是访问凭据。

~~~sh
npm run indexnow -- --dry-run
npm run indexnow
npm run indexnow -- --sitemap https://xwho.org/sitemap.xml
~~~

默认读取 `https://xwho.org/sitemap.xml`。`--sitemap` 可改为其他 http(s) 地址或本地 XML 文件。脚本按最多 10000 条一批，向 `https://api.indexnow.org/indexnow` 提交 JSON，字段为 `host`（`xwho.org`）、`key`、`keyLocation` 和 `urlList`。先确认密钥文件已能从公网打开，再执行不带 `--dry-run` 的命令。HTTP 200 或 202 表示该批已被接受。

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
| GITHUB_WRITE_MODE | 默认 preview。有令牌且显式设为 pr 或 direct 时才允许写入，direct 仅对已有档案生效 |

在 X 开发者控制台登记与 NEXT_PUBLIC_APP_URL 完全一致的 /api/auth/x/callback 回调。登录仅请求 `users.read` 和 `tweet.read`。回调调用 `GET /2/users/me`，用本人的数字 ID、用户名和显示名识别身份，并从 `description`、`protected`、`pinned_tweet_id` 生成申请建议。[X 官方身份接口](https://docs.x.com/x-api/users/get-my-user)

流程使用 PKCE S256 和随机 state，流程 Cookie 有效期为 10 分钟。服务器将身份与筛选后的申请建议写入 7 天的 HMAC 签名会话。Cookie 使用 HttpOnly、SameSite=Lax，HTTPS 附加 Secure。

登录后点「从 X 导入草稿」，可带入适合公开的简介、明确的赛道和本人公开置顶帖。本人可改写简介、移除置顶帖或换成自己的作品。当前标签页为每个账号单独暂存草稿，刷新和再次导入会保留手动修改与删除。退出登录会清理该账号的草稿。

点「预览草稿」可核对即将公开的账号和资料。修改任一字段后需重新预览。开启写入时，只有本人再点「确认公开提交」才会创建或复用审核 PR。登录、授权回跳、导入、编辑与预览均不会访问 GitHub 写入接口。

生产验收期间设置 `GITHUB_WRITE_MODE=preview`。即使有令牌，申请和已有名片修改也只返回预览。缺少 X 配置时，访客仍可试写并预览。

## 贡献、审核与生效时间

- 巡检按工作日轮换，每日约 100 人。按数字 ID 识别改名，检查停更、锁推、封禁与注销。仅使用 X 官方接口或人工核实的公开原始来源。
- 今日大事件单独开 PR，汇总近 24 小时真实动态，目标 5–8 条，每条均附出处。站长按天复制草稿并人工审阅发布。
- 开放写入后，入库申请一律走 PR。data/applications/<id>.json 是待审核材料，网站不读取该目录。维护者核实公开作品、语言、活跃度、数字及反营销红线后，在该 PR 内以 data/creators/<id>.json 替换申请。核实层级和数值后再合并。
- 认领与隐藏根据 OAuth 数字 ID 定位。编辑不得代留联系方式。本人公开的联系方式会进入公开 Git 仓库及历史，请在提交前留意公开范围。隐藏生效后，该 ID 会从网站全部公开入口移除，文件保留用于巡检去重。
- PR 模式在合并并部署后对访客生效，direct 模式在提交并部署后生效。服务器从目标分支读取当前档案，按文件 SHA 防止覆盖并发修改。GitHub Actions 在每次 push 和 PR 上校验数据、执行测试并构建生产版本。
