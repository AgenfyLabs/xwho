import { z } from "zod";

export const verticals = ["ai-dev", "geo", "media", "crypto", "finance", "general"] as const;
export const verticalNames = {
  "ai-dev": "AI 开发者", geo: "GEO", media: "媒体人", crypto: "币圈", finance: "财经投资", general: "创业与观察",
};
export const roles = [
  "indie-dev", "founder", "oss-author", "ex-bigtech", "ai-exec", "bigtech-exec",
  "investor", "media-editor", "researcher", "brand-account",
] as const;
export const roleNames = {
  "indie-dev": "独立开发者", founder: "创始人", "oss-author": "开源作者", "ex-bigtech": "前大厂",
  "ai-exec": "AI 高管", "bigtech-exec": "大厂高管", investor: "投资人", "media-editor": "媒体/编辑",
  researcher: "研究员", "brand-account": "机构/品牌号",
};
export const eventTypes = ["launch", "oss", "writing", "talk", "milestone", "other"] as const;
export const eventNames = {
  launch: "产品发布", oss: "开源里程碑", writing: "长文复盘", talk: "办会演讲", milestone: "重要节点", other: "其他",
};
export const tierNames = { "deep-verified": "深度核验", "api-verified": "接口核验" };
export const TierSchema = z.enum(["deep-verified", "api-verified"]);
export const IdSchema = z.string().regex(/^\d+$/, "X ID 必须是纯数字字符串");
export const HandleSchema = z.string().regex(/^[A-Za-z0-9_]{1,15}$/, "请输入不含 @ 的 X 用户名");
const nonempty = z.string().trim().min(1, "此字段不能为空");
export const HttpUrlSchema = z.url({ protocol: /^https?$/, hostname: /^.+$/ }).refine(
  value => /^https?:\/\//i.test(value) && !/[\s\\]/u.test(value), "需要完整的 HTTP(S) 链接",
);
const dateTime = z.iso.datetime({ offset: true });
export const SnapshotTimeSchema = dateTime.refine(value => value.endsWith("+08:00"), "快照时点必须使用 +08:00");
export const WorkSchema = z.strictObject({ title: nonempty, description: z.string(), url: HttpUrlSchema });
const contact = z.strictObject({ label: nonempty, value: nonempty });
export const BoardFieldsSchema = z.strictObject({
  open_for_collab: z.boolean(),
  cooperation_tags: z.array(nonempty),
  pitch: z.string().refine(value => Array.from(value).length <= 280, "合作说明最多 280 字"),
  contact_channels: z.array(contact),
});
export const ServiceBoardSchema = BoardFieldsSchema.extend({ updated_at: dateTime });
export const CreatorSchema = z.strictObject({
  x_user_id: IdSchema,
  handle: HandleSchema,
  display_name: nonempty,
  vertical: z.enum(verticals),
  role_tags: z.array(z.enum(roles)),
  sub_tags: z.array(nonempty),
  summary: nonempty,
  verified_works: z.array(WorkSchema),
  quote: z.strictObject({ text: nonempty, source_url: HttpUrlSchema, published_at: z.union([z.iso.date(), dateTime]) }).nullish(),
  followers_snapshot: z.strictObject({ count: z.number().int().nonnegative(), as_of: SnapshotTimeSchema }).nullish(),
  verification_tier: TierSchema,
  claim_status: z.enum(["unclaimed", "claimed", "hidden"]),
  last_post_at: dateTime.nullish(),
  lead_sources: z.array(nonempty),
  service_board: ServiceBoardSchema.nullish(),
}).superRefine((creator, ctx) => {
  if (creator.claim_status === "unclaimed" && creator.service_board != null) {
    ctx.addIssue({ code: "custom", path: ["service_board"], message: "未认领档案的合作留言板必须为空" });
  }
  if (creator.verification_tier === "deep-verified" && !creator.verified_works.length) {
    ctx.addIssue({ code: "custom", path: ["verified_works"], message: "深度核验至少需要一项代表作" });
  }
});
export const MilestoneSchema = z.strictObject({
  id: nonempty, x_user_id: IdSchema, event_type: z.enum(eventTypes),
  summary: nonempty, source_url: HttpUrlSchema, event_date: z.iso.date(), submitted_by: nonempty,
});

export type Creator = z.infer<typeof CreatorSchema>;
export type ServiceBoard = z.infer<typeof ServiceBoardSchema>;
export type Milestone = z.infer<typeof MilestoneSchema>;
export type Vertical = typeof verticals[number];
export type Role = typeof roles[number];
export type EventType = typeof eventTypes[number];
export type Tier = z.infer<typeof TierSchema>;

export function validationMessage(error: z.ZodError) {
  return error.issues.map(issue => `${issue.path.join(".") || "数据"} · ${issue.message}`).join("\n");
}
