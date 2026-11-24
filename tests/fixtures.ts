import type { Creator, Milestone, ServiceBoard } from "../src/lib/schema";

export const owner = { id: "10001", username: "xwho_fixture", name: "测试夹具" };
export const work = { title: "隔离测试作品", description: "", url: "https://example.org/work" };
export const board: ServiceBoard = {
  open_for_collab: true, cooperation_tags: ["测试合作"], pitch: "测试留言板关键词",
  contact_channels: [{ label: "仅测试", value: "fixture@example.invalid" }], updated_at: "2026-02-01T10:00:00+08:00",
};
export function creator(fields: Partial<Creator> = {}): Creator {
  return {
    x_user_id: owner.id, handle: owner.username, display_name: owner.name, vertical: "media", role_tags: ["researcher"], sub_tags: ["样本分类"],
    summary: "只供自动化测试的档案。", verified_works: [], verification_tier: "api-verified", claim_status: "unclaimed",
    lead_sources: ["isolated-test"], service_board: null, ...fields,
  };
}
export function event(fields: Partial<Milestone> = {}): Milestone {
  return {
    id: "fixture-1", x_user_id: owner.id, event_type: "writing", summary: "隔离测试的一句话事实。",
    source_url: "https://example.org/source", event_date: "2026-02-01", submitted_by: "test", ...fields,
  };
}
