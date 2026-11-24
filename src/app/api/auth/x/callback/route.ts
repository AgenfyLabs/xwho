import { NextRequest, NextResponse } from "next/server";
import { ChangeError } from "@/lib/identity";
import { appOrigin, cookieOptions, exchangeIdentity, FLOW_COOKIE, SESSION_COOKIE, SESSION_TTL, sessionCookie, verifyFlow } from "@/lib/x-oauth";

export async function GET(request: NextRequest) {
  const target = new URL("/dashboard", process.env.NEXT_PUBLIC_APP_URL ? appOrigin() : request.url);
  const query = request.nextUrl.searchParams;
  let session: string | undefined;
  try {
    const flow = verifyFlow(request.cookies.get(FLOW_COOKIE)?.value, query.get("state"));
    if (flow.application) target.searchParams.set("application", flow.application);
    const code = query.get("code");
    if (!code || query.has("error")) throw new ChangeError(401, "登录已取消");
    session = sessionCookie(await exchangeIdentity(code, flow.verifier));
  } catch (error) {
    target.searchParams.set("auth", error instanceof ChangeError && error.status === 403 ? "scope" : "failed");
  }
  const response = NextResponse.redirect(target);
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(FLOW_COOKIE, "", cookieOptions(0));
  if (session) response.cookies.set(SESSION_COOKIE, session, cookieOptions(SESSION_TTL));
  return response;
}
