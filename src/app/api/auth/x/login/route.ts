import { NextRequest, NextResponse } from "next/server";
import { beginOAuth, cookieOptions, FLOW_COOKIE, FLOW_TTL, missingOAuth } from "@/lib/x-oauth";

export function GET(request: NextRequest) {
  if (missingOAuth().length) return NextResponse.redirect(new URL("/dashboard?auth=configuration", request.url));
  const flow = beginOAuth();
  const response = NextResponse.redirect(flow.url);
  response.cookies.set(FLOW_COOKIE, flow.cookie, cookieOptions(FLOW_TTL));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
