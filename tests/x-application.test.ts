import { expect, it } from "vitest";
import { xApplication } from "../src/lib/x-application";
import { applicationInput, draftKey, emptyDraft, pendingApplicationKey, readDraft, takeApplication, withSuggestions } from "../src/lib/application-form";
import { owner } from "./fixtures";

const source = { protected: false, description: "AI 开发者｜维护开源工具", pinned_tweet_id: "123" };
const attempt = "32f2c2c6-3211-47a9-a2cd-fa65589d1107";

it("公开置顶帖与明确赛道可补全申请，手动字段优先", () => {
  const suggested = xApplication(source, owner.username);
  expect(applicationInput(withSuggestions(undefined, suggested)).data).toEqual({
    vertical: "ai-dev", summary: "AI 开发者｜维护开源工具", work_urls: [`https://x.com/${owner.username}/status/123`],
  });
  const manual = { vertical: "media" as const, summary: "本人填写", works: "https://example.org/work" };
  expect(withSuggestions(manual, suggested)).toEqual(manual);
});
it("缺字段和混合赛道留给本人补充，受保护账号不产生公开草稿", () => {
  for (const restricted of [true, undefined]) expect(xApplication({ ...source, protected: restricted }, owner.username)).toEqual({ summary: "" });
  const draft = xApplication({ protected: false, description: "媒体记者，长期关注金融", pinned_tweet_id: "invalid" }, owner.username);
  expect(draft).toEqual({ summary: "媒体记者，长期关注金融" });
  expect(applicationInput(withSuggestions(undefined, draft)).success).toBe(false);
  expect(xApplication({ protected: false, description: "AI 独立开发者｜美股投资人" }, owner.username).vertical).toBeUndefined();
});
it.each(["合作邮箱｜name@example.invalid", "私信：fixture", "接单 100 元", "微信｜fixture", "咨询预约 https://example.org", "📧 fixture", "DM me", "＋86 138 1234 5678"])("自动简介排除联系和销售内容 %s", tail => {
  const draft = xApplication({ protected: false, description: `分享实践｜${tail}` }, owner.username);
  expect(draft.summary).toBe("分享实践");
});
it("申请中的自述指标带来源标记", () => {
  expect(xApplication({ protected: false, description: "服务 100 位用户" }, owner.username).summary).toBe("自述：服务 100 位用户");
});
it("草稿仅属当前账号，清空简介、删除或替换置顶帖后，刷新和再次导入均保留选择", () => {
  const suggested = xApplication(source, owner.username);
  for (const works of ["", "https://example.org/my-project"]) {
    const draft = { imported: true, fields: { summary: "", works } };
    const storage = { getItem: (key: string) => key === draftKey(owner.id) ? JSON.stringify(draft) : null };
    const restored = readDraft(storage, owner.id);
    expect(withSuggestions(restored.fields, suggested)).toEqual({ vertical: "ai-dev", summary: "", works });
    expect(readDraft(storage, "2")).toEqual(emptyDraft);
  }
  expect(readDraft({ getItem: () => "{" }, owner.id)).toEqual(emptyDraft);
});
it("旧版待处理操作只由原账号恢复一次，忽略其中的提交模式", () => {
  function storage() {
    const values = new Map([[pendingApplicationKey, JSON.stringify({ id: owner.id, attempt, expires: 200, preview: false, fields: withSuggestions() })]]);
    return { getItem: (key: string) => values.get(key) ?? null, removeItem: (key: string) => { values.delete(key); } };
  }
  const current = storage();
  expect(takeApplication(current, undefined, owner.id, 100)).toBeUndefined();
  expect(takeApplication(current, "other", owner.id, 100)).toBeUndefined();
  expect(takeApplication(current, attempt, owner.id, 100)).toEqual({ id: owner.id, attempt, expires: 200, fields: withSuggestions() });
  expect(takeApplication(current, attempt, owner.id, 101)).toBeUndefined();
  expect(takeApplication(storage(), attempt, "2", 100)).toBeUndefined();
  expect(takeApplication(storage(), attempt, owner.id, 200)).toBeUndefined();
});
