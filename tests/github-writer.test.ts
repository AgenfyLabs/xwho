import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { writeChange } from "../src/lib/github-writer";
import { creator, owner } from "./fixtures";

const base = "a".repeat(40);
const sha = "b".repeat(40);
const file = (value: unknown) => ({ sha, encoding: "base64", content: Buffer.from(JSON.stringify(value)).toString("base64") });
const http = vi.fn();
const missing = () => new Response(null, { status: 404 });
beforeEach(() => {
  vi.stubEnv("GITHUB_TOKEN", "unit-test-only"); vi.stubEnv("GITHUB_WRITE_MODE", "direct");
  vi.stubEnv("GITHUB_BASE_BRANCH", "main"); vi.stubEnv("GITHUB_REPO_OWNER", "AgenfyLabs"); vi.stubEnv("GITHUB_REPO_NAME", "xwho");
  vi.stubGlobal("fetch", http); http.mockReset();
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it("direct 从当前远端档案生成修改，提供文件 SHA 保护并发写入", async () => {
  http.mockResolvedValueOnce(Response.json({ object: { sha: base } }))
    .mockResolvedValueOnce(Response.json(file(creator({ summary: "远端最新简介" }))))
    .mockResolvedValueOnce(Response.json({ commit: { html_url: "https://example.org/commit" } }));
  expect(await writeChange(owner, { kind: "profile", input: { action: "hide" } }, creator())).toMatchObject({ mode: "direct" });
  const args = JSON.parse(http.mock.calls[2][1].body);
  expect(args).toMatchObject({ branch: "main", sha });
  expect(JSON.parse(Buffer.from(args.content, "base64").toString())).toMatchObject({ summary: "远端最新简介", claim_status: "hidden" });
});
it("申请即使在 direct 模式也只写候选材料并开 PR，不捏造核验或粉丝信息", async () => {
  http.mockResolvedValueOnce(Response.json({ object: { sha: base } })).mockResolvedValueOnce(missing()).mockResolvedValueOnce(missing())
    .mockResolvedValueOnce(missing()).mockResolvedValueOnce(Response.json({})).mockResolvedValueOnce(Response.json({ commit: { html_url: "https://example.org/commit" } }))
    .mockResolvedValueOnce(Response.json([])).mockResolvedValueOnce(Response.json({ html_url: "https://example.org/pull/1" }));
  const result = await writeChange(owner, { kind: "application", input: { vertical: "media", summary: "样本", work_urls: ["https://example.org/test"] } });
  expect(result).toEqual({ mode: "pr", url: "https://example.org/pull/1" });
  const [url, options] = http.mock.calls[5];
  const args = JSON.parse(options.body);
  expect(url).toContain("/contents/data/applications/10001.json");
  expect(args.branch).not.toBe("main");
  const doc = JSON.parse(Buffer.from(args.content, "base64").toString());
  expect(doc).toMatchObject({ x_user_id: owner.id, status: "pending-review" });
  expect(doc).not.toHaveProperty("verification_tier"); expect(doc).not.toHaveProperty("followers_snapshot");
});
it("权限错误与并发冲突不会降级为成功或无条件覆盖", async () => {
  http.mockResolvedValueOnce(Response.json({ object: { sha: base } })).mockResolvedValueOnce(Response.json(file(creator())))
    .mockResolvedValueOnce(new Response(null, { status: 409 }));
  await expect(writeChange(owner, { kind: "profile", input: { action: "hide" } })).rejects.toMatchObject({ status: 409 });
  expect(http).toHaveBeenCalledTimes(3);
});
it("目标 ID 不存在或远端文件内容 ID 错配时拒绝写入", async () => {
  http.mockResolvedValueOnce(Response.json({ object: { sha: base } })).mockResolvedValueOnce(missing());
  await expect(writeChange(owner, { kind: "profile", input: { action: "hide" } })).rejects.toMatchObject({ status: 404 });
  http.mockResolvedValueOnce(Response.json({ object: { sha: base } })).mockResolvedValueOnce(Response.json(file(creator({ x_user_id: "2" }))));
  await expect(writeChange(owner, { kind: "profile", input: { action: "hide" } })).rejects.toMatchObject({ status: 403 });
});
