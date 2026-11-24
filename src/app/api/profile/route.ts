import type { NextRequest } from "next/server";
import { writeRequest } from "@/lib/write-request";

export const POST = (request: NextRequest) => writeRequest(request, "profile");
