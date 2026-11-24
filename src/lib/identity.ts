import { z } from "zod";
import { BoardFieldsSchema, CreatorSchema, HandleSchema, HttpUrlSchema, IdSchema, verticals, type Creator } from "./schema";
import { shanghaiStamp } from "./digest";

export const IdentitySchema = z.strictObject({ id: IdSchema, username: HandleSchema, name: z.string().trim().min(1) });
export type Identity = z.infer<typeof IdentitySchema>;
export const ApplicationInputSchema = z.strictObject({
  vertical: z.enum(verticals), summary: z.string().trim().min(1, "请填写一句话简介"),
  work_urls: z.array(HttpUrlSchema).min(1, "请至少填写一项可核验作品链接"),
});
export const publicApplicationIntent = "confirm-public-submit";
export const ConfirmApplicationSchema = z.strictObject({
  intent: z.literal(publicApplicationIntent), accountId: IdSchema, application: ApplicationInputSchema,
});
export const ProfileInputSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("hide") }),
  z.strictObject({ action: z.literal("restore") }),
  z.strictObject({
    action: z.literal("save"), display_name: z.string().trim().min(1), summary: z.string().trim().min(1),
    vertical: z.enum(verticals), service_board: BoardFieldsSchema.nullable(),
  }),
]);
export type ProfileInput = z.infer<typeof ProfileInputSchema>;
export type ApplicationInput = z.infer<typeof ApplicationInputSchema>;
export class ChangeError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function editProfile(current: Creator, owner: Identity, input: ProfileInput, now = new Date()): Creator {
  if (owner.id !== current.x_user_id) throw new ChangeError(403, "只能维护与登录 X ID 对应的档案");
  if (input.action === "hide") return CreatorSchema.parse({ ...current, claim_status: "hidden" });
  if (input.action === "restore") {
    if (current.claim_status !== "hidden") throw new ChangeError(409, "此档案当前未隐藏");
    return CreatorSchema.parse({ ...current, claim_status: "claimed" });
  }
  if (current.claim_status === "hidden") throw new ChangeError(409, "请先恢复档案，再修改公开资料");
  const { action: _action, service_board, ...fields } = input;
  const old = current.service_board;
  const unchanged = old && JSON.stringify({
    open_for_collab: old.open_for_collab, cooperation_tags: old.cooperation_tags, pitch: old.pitch, contact_channels: old.contact_channels,
  }) === JSON.stringify(service_board);
  return CreatorSchema.parse({
    ...current, ...fields, claim_status: "claimed",
    service_board: service_board && { ...service_board, updated_at: unchanged ? old.updated_at : shanghaiStamp(now) },
  });
}
export function applicationDocument(owner: Identity, input: ApplicationInput) {
  return {
    x_user_id: owner.id, handle: owner.username, display_name: owner.name, ...input, status: "pending-review" as const,
  };
}
