import type { MetadataRoute } from "next";
import { publicCreators, readDataset } from "@/lib/data";
import { siteOrigin } from "@/lib/seo";

const origin = siteOrigin;

export default function sitemap(): MetadataRoute.Sitemap {
  const creators = publicCreators(readDataset().creators);
  return [
    { url: `${origin}/` },
    { url: `${origin}/events` },
    ...creators.map(({ handle }) => ({ url: `${origin}/creator/${handle}` })),
  ];
}
