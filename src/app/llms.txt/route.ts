import { readDataset } from "@/lib/data";
import { llmsText, plainText } from "@/lib/seo";

export const dynamic = "force-static";

export function GET() {
  return plainText(llmsText(readDataset().creators));
}
