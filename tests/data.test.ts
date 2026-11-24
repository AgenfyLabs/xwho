import { describe, expect, it } from "vitest";
import { directory, directoryParams, publicCreatorByHandle, validateDataset, verticalCounts } from "../src/lib/data";
import { CreatorSchema, MilestoneSchema, ServiceBoardSchema } from "../src/lib/schema";
import { formatDraft, groupEvents, publicEvents, shanghaiDay } from "../src/lib/digest";
import { board, creator, event, work } from "./fixtures";

describe("Schema 与引用完整性", () => {
  it("未认领允许空或缺省留言板，禁止编辑代填", () => {
    expect(CreatorSchema.safeParse(creator()).success).toBe(true);
    expect(CreatorSchema.safeParse(creator({ service_board: undefined })).success).toBe(true);
    expect(CreatorSchema.safeParse(creator({ service_board: board })).success).toBe(false);
    expect(ServiceBoardSchema.safeParse({ ...board, pitch: "文".repeat(281) }).success).toBe(false);
  });
  it("只有深度核验必需有作品", () => {
    expect(CreatorSchema.safeParse(creator({ verification_tier: "deep-verified" })).success).toBe(false);
    expect(CreatorSchema.safeParse(creator({ verification_tier: "deep-verified", verified_works: [work] })).success).toBe(true);
  });
  it("数字 ID、用户名及粉丝快照各自有严格格式", () => {
    expect(CreatorSchema.safeParse(creator({ x_user_id: "1e5" })).success).toBe(false);
    expect(CreatorSchema.safeParse(creator({ handle: "@test" })).success).toBe(false);
    for (const snap of [{ count: 1 }, { count: 1, as_of: "2026-02-01T02:00:00Z" }, { count: -1, as_of: board.updated_at }]) {
      expect(CreatorSchema.safeParse({ ...creator(), followers_snapshot: snap }).success).toBe(false);
    }
    expect(CreatorSchema.safeParse(creator({ followers_snapshot: { count: 0, as_of: board.updated_at } })).success).toBe(true);
  });
  it("所有作品、金句、事件只允许 HTTP(S) 原始链接", () => {
    for (const url of ["javascript:alert(1)", "file:///tmp/test", "data:text/plain,x", "/relative", ""]) {
      expect(CreatorSchema.safeParse(creator({ verified_works: [{ ...work, url }] })).success).toBe(false);
      expect(CreatorSchema.safeParse(creator({ quote: { text: "测试", source_url: url, published_at: "2026-02-01" } })).success).toBe(false);
      expect(MilestoneSchema.safeParse(event({ source_url: url })).success).toBe(false);
    }
  });
  it("拒绝错误文件名、重复数字 ID 和大小写同名，包括隐藏档案", () => {
    const c = creator();
    const f = { filename: `${c.x_user_id}.json`, value: c };
    expect(() => validateDataset([{ ...f, filename: "wrong.json" }], [])).toThrow(/文件名/);
    expect(() => validateDataset([f, f], [])).toThrow(/重复 x_user_id/);
    const alias = creator({ x_user_id: "2", handle: c.handle.toUpperCase(), claim_status: "hidden" });
    expect(() => validateDataset([f, { filename: "2.json", value: alias }], [])).toThrow(/重复 handle/);
  });
  it("拒绝重复事件、未知作者和无效日历日", () => {
    const files = [{ filename: "10001.json", value: creator() }];
    expect(() => validateDataset(files, [event(), event()])).toThrow(/重复事件/);
    expect(() => validateDataset(files, [event({ x_user_id: "777" })])).toThrow(/未知/);
    expect(() => validateDataset(files, [event({ event_date: "2026-02-30" })])).toThrow();
  });
});
describe("公开名录", () => {
  const visible = creator({ verified_works: [work] });
  const claimed = creator({ x_user_id: "2", handle: "other_test", claim_status: "claimed", service_board: board, vertical: "geo" });
  const hidden = creator({ x_user_id: "3", handle: "hidden_test", display_name: "隐藏字串", claim_status: "hidden", service_board: board });
  const all = [visible, claimed, hidden];
  it("一次排除隐藏档案的分页、计数、检索、合作标签和详情", () => {
    expect(directory(all).items).toHaveLength(2);
    expect(verticalCounts(all).media).toBe(1);
    expect(directory(all, { q: "隐藏字串" }).total).toBe(0);
    expect(directory([hidden]).cooperationTags).toEqual([]);
    expect(publicCreatorByHandle(all, "HIDDEN_TEST")).toBeUndefined();
    expect(publicCreatorByHandle(all, "XWHO_FIXTURE")).toEqual(visible);
    expect(JSON.stringify(directory(all))).not.toContain("fixture@example.invalid");
  });
  it("每个公开搜索字段可查，合作筛选只使用本人留言板", () => {
    for (const q of ["测试夹具", "@XWHO_FIXTURE", "自动化", "样本分类", work.title, board.pitch]) expect(directory(all, { q }).total).toBeGreaterThan(0);
    expect(directory(all, { open: true, cooperation: "测试合作", vertical: "geo", role: "researcher" }).items[0].x_user_id).toBe("2");
    expect(directory(all, { deep: true }).total).toBe(0);
    expect(directory(all, { claimedFirst: true }).items[0].x_user_id).toBe("2");
  });
  it("深度优先、粉丝和最近活跃排序；500+ 条目每次只返回 24 人", () => {
    const snap = (count: number) => ({ count, as_of: board.updated_at });
    const deep = creator({ x_user_id: "6", handle: "deep_test", verified_works: [work], verification_tier: "deep-verified", followers_snapshot: snap(1) });
    const api = creator({ followers_snapshot: snap(100), last_post_at: "2026-02-01T02:00:00Z" });
    expect(directory([api, deep]).items[0].x_user_id).toBe("6");
    expect(directory([api, deep], { sort: "followers" }).items[0].x_user_id).toBe(api.x_user_id);
    expect(directory([api, deep], { sort: "active" }).items[0].x_user_id).toBe(api.x_user_id);
    const pool = Array.from({ length: 505 }, (_, i) => creator({ x_user_id: String(i + 1), handle: `test_${i}` }));
    expect(directory(pool).items).toHaveLength(24);
    const last = directory(pool, directoryParams(new URLSearchParams("page=999")));
    expect([last.page, last.items.length, last.total]).toEqual([22, 1, 505]);
  });
});
describe("UTC+8 事件与人工推文草稿", () => {
  it("UTC 16:00 跨北京日界线，日期字段保持原日", () => {
    expect(shanghaiDay("2026-02-01T15:59:59Z")).toBe("2026-02-01");
    expect(shanghaiDay("2026-02-01T16:00:00Z")).toBe("2026-02-02");
    expect(shanghaiDay("2026-02-02")).toBe("2026-02-02");
  });
  it("按天倒序、过滤赛道和事件类型，草稿带作者、原始链接且不泄露隐藏作者", () => {
    const a = creator(), h = creator({ x_user_id: "2", handle: "hidden_test", claim_status: "hidden" });
    const entries = publicEvents([a, h], [event(), event({ id: "b", event_date: "2026-02-02", event_type: "launch" }), event({ id: "h", x_user_id: "2" })]);
    const groups = groupEvents(entries);
    expect(groups.map(g => g.day)).toEqual(["2026-02-02", "2026-02-01"]);
    expect(groupEvents(entries, "media", "writing")).toHaveLength(1);
    expect(groupEvents(entries, "geo")).toHaveLength(0);
    expect(formatDraft(groups[0].day, groups[0].events)).toBe("中推今日大事件｜2026-02-02（UTC+8）\n\n1. @xwho_fixture 测试夹具\n隔离测试的一句话事实。\nhttps://example.org/source");
  });
});
