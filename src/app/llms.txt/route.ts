import { readDataset } from "@/lib/data";
import { llmsText } from "@/lib/discovery";

export const dynamic = "force-static";

export function GET() {
  return new Response(llmsText(readDataset().creators), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
