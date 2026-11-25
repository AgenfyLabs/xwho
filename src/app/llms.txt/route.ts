import { readDataset } from "@/lib/data";
import { llmsText } from "@/lib/discovery";
import { rankingsLlmsSection } from "@/lib/rankings";
import type { Creator } from "@/lib/schema";

export const dynamic = "force-static";

export function llmsBody(creators: Creator[]) {
  return `${llmsText(creators)}${rankingsLlmsSection(creators)}`;
}

export function GET() {
  return new Response(llmsBody(readDataset().creators), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
