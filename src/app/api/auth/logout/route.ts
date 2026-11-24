import { NextRequest, NextResponse } from "next/server";
import { sameOrigin } from "@/lib/write-request";
import { cookieOptions, FLOW_COOKIE, SESSION_COOKIE } from "@/lib/x-oauth";

export function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "请求来源不匹配" }, { status: 403 });
  const response = NextResponse.redirect(new URL("/dashboard", request.url), 303);
  response.cookies.set(SESSION_COOKIE, "", cookieOptions(0));
  response.cookies.set(FLOW_COOKIE, "", cookieOptions(0));
  return response;
}
