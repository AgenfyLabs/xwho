import type { NextRequest } from "next/server";
import { directory, directoryParams, readDataset } from "@/lib/data";

export function GET(request: NextRequest) {
  return Response.json(directory(readDataset().creators, directoryParams(request.nextUrl.searchParams)));
}
