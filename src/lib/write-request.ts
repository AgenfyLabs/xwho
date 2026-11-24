import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApplicationInputSchema, ChangeError, ConfirmApplicationSchema, ProfileInputSchema } from "./identity";
import { readDataset } from "./data";
import { githubWriteMode, writeChange } from "./github-writer";
import { validationMessage } from "./schema";
import { appOrigin, readSession, SESSION_COOKIE } from "./x-oauth";

export function sameOrigin(request: NextRequest) {
  const expected = process.env.NEXT_PUBLIC_APP_URL ? appOrigin() : request.nextUrl.origin;
  return request.headers.get("origin") === expected;
}
function applicationChange(body: unknown, preview: boolean, ownerId: string) {
  if (preview) return { kind: "application", input: ApplicationInputSchema.parse(body) } as const;
  const confirmed = ConfirmApplicationSchema.safeParse(body);
  if (!confirmed.success) throw new ChangeError(400, "请重新预览草稿，再点「确认公开提交」。");
  if (confirmed.data.accountId !== ownerId) throw new ChangeError(409, "登录的 X 账号已更换，请刷新后用当前账号重新预览。");
  return { kind: "application", input: confirmed.data.application } as const;
}
export async function writeRequest(request: NextRequest, kind: "profile" | "application") {
  try {
    if (!sameOrigin(request)) throw new ChangeError(403, "请求来源不匹配");
    const owner = readSession(request.cookies.get(SESSION_COOKIE)?.value);
    if (!owner) throw new ChangeError(401, "请先使用 X 登录");
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ChangeError(415, "需要 JSON 请求");
    let body: unknown;
    try { body = await request.json(); } catch { throw new ChangeError(400, "无法解析 JSON"); }
    const preview = kind === "application" && request.nextUrl.searchParams.get("preview") === "1";
    const change = kind === "profile"
      ? { kind, input: ProfileInputSchema.parse(body) } as const
      : applicationChange(body, preview, owner.id);
    const local = preview || githubWriteMode() === "preview" ? readDataset().creators.find(c => c.x_user_id === owner.id) : undefined;
    const result = await writeChange(owner, change, local, preview);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof ChangeError ? error.status : error instanceof ZodError ? 400 : 502;
    const message = error instanceof ChangeError ? error.message : error instanceof ZodError ? validationMessage(error) : "服务暂时无法处理此变更，请稍后重试";
    return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
