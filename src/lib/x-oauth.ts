import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { ChangeError, IdentitySchema, type Identity } from "./identity";
import { XApplicationSchema, xApplication } from "./x-application";

export const SESSION_COOKIE = "xwho_session";
export const FLOW_COOKIE = "xwho_oauth";
export const SESSION_TTL = 7 * 86400;
export const FLOW_TTL = 10 * 60;
export const X_LOGIN_SCOPE = "users.read tweet.read";
export function appOrigin() {
  return new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").origin;
}
export function missingOAuth() {
  return [
    ...(!process.env.X_CLIENT_ID ? ["X_CLIENT_ID"] : []),
    ...(Buffer.byteLength(process.env.SESSION_SECRET || "") < 32 ? ["SESSION_SECRET"] : []),
  ];
}
export function cookieOptions(maxAge: number) {
  return { httpOnly: true, sameSite: "lax" as const, secure: appOrigin().startsWith("https:"), path: "/", maxAge };
}
function sign(kind: string, data: unknown, ttl: number, now: number) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) throw new ChangeError(503, "请先配置至少 32 字节的 SESSION_SECRET");
  const payload = Buffer.from(JSON.stringify({ kind, exp: now + ttl * 1000, data })).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}
function open<T>(cookie: string | undefined, kind: string, schema: z.ZodType<T>, now: number): T | null {
  const secret = process.env.SESSION_SECRET;
  if (!cookie || !secret || Buffer.byteLength(secret) < 32) return null;
  const parts = cookie.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const got = Buffer.from(signature);
  if (got.length !== expected.length || !timingSafeEqual(Buffer.from(expected), got)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (value.kind !== kind || typeof value.exp !== "number" || value.exp <= now) return null;
    return schema.parse(value.data);
  } catch { return null; }
}
const sessionSchema = IdentitySchema.extend({ application: XApplicationSchema.optional() });
type LoginSession = z.infer<typeof sessionSchema>;
export function sessionCookie(owner: LoginSession, now = Date.now()) { return sign("session", sessionSchema.parse(owner), SESSION_TTL, now); }
export function readSession(cookie?: string, now = Date.now()) { return open(cookie, "session", sessionSchema, now); }
const flowSchema = z.strictObject({ state: z.string().min(32), verifier: z.string().min(43), application: z.uuid().optional() });
const callback = () => `${appOrigin()}/api/auth/x/callback`;
export function beginOAuth(now = Date.now(), application?: string | null) {
  if (missingOAuth().length) throw new ChangeError(503, "X 登录尚未配置");
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const url = new URL("https://x.com/i/oauth2/authorize");
  url.search = new URLSearchParams({
    response_type: "code", client_id: process.env.X_CLIENT_ID!, redirect_uri: callback(), scope: X_LOGIN_SCOPE,
    state, code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256",
  }).toString();
  const attempt = z.uuid().safeParse(application);
  return { url, cookie: sign("oauth", { state, verifier, application: attempt.success ? attempt.data : undefined }, FLOW_TTL, now) };
}
export function verifyFlow(cookie: string | undefined, state: string | null, now = Date.now()) {
  const flow = open(cookie, "oauth", flowSchema, now);
  if (!flow || !state || flow.state !== state) throw new ChangeError(400, "登录校验已失效，请重新登录");
  return flow;
}
export async function exchangeIdentity(code: string, verifier: string): Promise<LoginSession> {
  const id = process.env.X_CLIENT_ID!;
  const secret = process.env.X_CLIENT_SECRET;
  const headers = new Headers({ "Content-Type": "application/x-www-form-urlencoded" });
  const body = new URLSearchParams({ grant_type: "authorization_code", redirect_uri: callback(), code, code_verifier: verifier, client_id: id });
  if (secret) headers.set("Authorization", `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`);
  const token = await fetch("https://api.x.com/2/oauth2/token", { method: "POST", headers, body, cache: "no-store" });
  if (!token.ok) throw new ChangeError(401, "X 授权码交换失败");
  const { access_token } = z.object({ access_token: z.string().min(1) }).parse(await token.json());
  const userEndpoint = "https://api.x.com/2/users/me";
  const lookup = { headers: { Authorization: `Bearer ${access_token}` }, cache: "no-store" } as const;
  let me = await fetch(`${userEndpoint}?user.fields=description,protected,pinned_tweet_id`, lookup);
  if (me.status === 400 || me.status === 403) me = await fetch(userEndpoint, lookup);
  if (me.status === 403) throw new ChangeError(403, "X 拒绝了当前只读权限下的身份查询");
  if (!me.ok) throw new ChangeError(401, "无法读取 X 登录身份");
  const { data } = await me.json();
  const identity: Identity = IdentitySchema.strip().parse(data);
  return { ...identity, application: xApplication(data, identity.username) };
}
