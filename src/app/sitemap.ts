import type { MetadataRoute } from "next";
import { publicCreators, readDataset } from "@/lib/data";
import { categoryPath, tracksPath } from "@/lib/discovery";
import { verticals } from "@/lib/schema";
import { siteOrigin } from "@/lib/seo";

const origin = siteOrigin;

export default function sitemap(): MetadataRoute.Sitemap {
  const creators = publicCreators(readDataset().creators);
  return [
    { url: `${origin}/` },
    { url: `${origin}/events` },
    { url: `${origin}${tracksPath}` },
    ...verticals.map(vertical => ({ url: `${origin}${categoryPath(vertical)}` })),
    ...creators.map(({ handle }) => ({ url: `${origin}/creator/${handle}` })),
  ];
}
