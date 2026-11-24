import { readDataset } from "@/lib/data";
import { llmsFullText, plainText } from "@/lib/seo";

export const dynamic = "force-static";

export function GET() {
  return plainText(llmsFullText(readDataset().creators));
}
