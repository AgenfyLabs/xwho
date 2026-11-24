import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { beginOAuth, cookieOptions, exchangeIdentity, readSession, sessionCookie, verifyFlow } from "../src/lib/x-oauth";
import { ApplicationInputSchema, editProfile, ProfileInputSchema } from "../src/lib/identity";
import { POST as profilePost } from "../src/app/api/profile/route";
import { POST as applyPost } from "../src/app/api/apply/route";
import { GET as callback } from "../src/app/api/auth/x/callback/route";
import CreatorPage from "../src/app/creator/[handle]/page";
import * as data from "../src/lib/data";
import { board, creator, owner } from "./fixtures";

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", "x".repeat(32)); vi.stubEnv("X_CLIENT_ID", "test-client");
  vi.stubEnv("GITHUB_TOKEN", ""); vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://xwho.example");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it("PKCE S256、仅 users.read、签名、状态、有效期及 Cookie 标记", () => {
  const { cookie, url } = beginOAuth(100);
  const state = url.searchParams.get("state");
  const verifier = verifyFlow(cookie, state, 101);
  expect(url.searchParams.get("scope")).toBe("users.read");
  expect(url.searchParams.get("code_challenge")).toBe(createHash("sha256").update(verifier).digest("base64url"));
  expect(() => verifyFlow(cookie, "other", 101)).toThrow();
  expect(() => verifyFlow(cookie, state, 700000)).toThrow();
  expect(readSession(cookie, 101)).toBeNull();
  const session = sessionCookie(owner, 100);
  expect(readSession(session, 101)).toEqual(owner);
  expect(readSession(`${session}0`, 101)).toBeNull();
  expect(readSession(session, 8 * 86400000)).toBeNull();
  expect(cookieOptions(20)).toMatchObject({ httpOnly: true, sameSite: "lax", secure: true });
});
it("回调只从官方 /users/me 建立身份，权限不足不签发会话", async () => {
  const http = vi.fn().mockResolvedValueOnce(Response.json({ access_token: "test-token" })).mockResolvedValueOnce(Response.json({ data: { ...owner, verified: false } }));
  vi.stubGlobal("fetch", http);
  expect(await exchangeIdentity("test-code", "test-verifier")).toEqual(owner);
  expect(http.mock.calls[1][0]).toBe("https://api.x.com/2/users/me");
  const flow = beginOAuth();
  http.mockResolvedValueOnce(Response.json({ access_token: "test-token" })).mockResolvedValueOnce(new Response(null, { status: 403 }));
  const req = new NextRequest(`https://xwho.example/api/auth/x/callback?code=test&state=${flow.url.searchParams.get("state")}`, { headers: { cookie: `xwho_oauth=${flow.cookie}` } });
  const res = await callback(req);
  expect(res.headers.get("location")).toBe("https://xwho.example/dashboard?auth=scope");
  expect(res.cookies.has("xwho_session")).toBe(false);
  expect(res.cookies.get("xwho_oauth")?.value).toBe("");
});
it("认领只匹配数字 ID，同名不能代认领；隐藏必须主动恢复", () => {
  expect(() => editProfile(creator(), { ...owner, id: "2" }, { action: "hide" })).toThrow(/本人|登录/);
  const hidden = editProfile(creator({ claim_status: "claimed", service_board: board }), owner, { action: "hide" });
  expect(hidden.claim_status).toBe("hidden");
  expect(editProfile(hidden, owner, { action: "restore" }).service_board).toEqual(board);
  const save = { action: "save", display_name: "本人", summary: "测试", vertical: "media", service_board: null } as const;
  expect(() => editProfile(hidden, owner, save)).toThrow(/恢复/);
  expect(editProfile(creator(), { ...owner, username: "renamed" }, save).claim_status).toBe("claimed");
  expect(ProfileInputSchema.safeParse({ ...save, x_user_id: "2" }).success).toBe(false);
});
it("表单及服务端共享申请规则，至少一项 HTTP(S) 作品且不能自报身份", () => {
  const valid = { vertical: "media", summary: "测试", work_urls: ["https://example.org/work"] };
  expect(ApplicationInputSchema.safeParse(valid).success).toBe(true);
  for (const row of [{ ...valid, work_urls: [] }, { ...valid, work_urls: ["file:///a"] }, { ...valid, x_user_id: "2" }]) expect(ApplicationInputSchema.safeParse(row).success).toBe(false);
});
function request(body: unknown, signed = true, origin = "https://xwho.example") {
  return new NextRequest("https://xwho.example/api/profile", { method: "POST", headers: {
    origin, "Content-Type": "application/json", ...(signed ? { cookie: `xwho_session=${sessionCookie(owner)}` } : {}),
  }, body: JSON.stringify(body) });
}
it("写路由检查登录、来源及白名单；无令牌只返回本人补丁", async () => {
  vi.spyOn(data, "readDataset").mockReturnValue({ creators: [creator()], milestones: [] });
  expect((await profilePost(request({ action: "hide" }, false))).status).toBe(401);
  expect((await profilePost(request({ action: "hide" }, true, "https://other.example"))).status).toBe(403);
  expect((await profilePost(request({ action: "hide", x_user_id: "2" }))).status).toBe(400);
  const response = await profilePost(request({ action: "hide" }));
  expect(await response.json()).toMatchObject({ mode: "preview", path: "data/creators/10001.json", document: { x_user_id: owner.id, claim_status: "hidden" } });
  expect((await applyPost(request({ vertical: "media", summary: "测试", work_urls: [] }))).status).toBe(400);
});
it("详情路由隐藏与未知均调用 Next 404，公开 handle 忽略大小写", async () => {
  vi.spyOn(data, "readDataset").mockReturnValue({ creators: [creator({ claim_status: "hidden" })], milestones: [] });
  for (const handle of [owner.username.toUpperCase(), "missing"]) {
    await expect(CreatorPage({ params: Promise.resolve({ handle }) })).rejects.toMatchObject({ digest: expect.stringContaining("404") });
  }
  vi.mocked(data.readDataset).mockReturnValue({ creators: [creator()], milestones: [] });
  expect(await CreatorPage({ params: Promise.resolve({ handle: owner.username.toUpperCase() }) })).toBeTruthy();
});
