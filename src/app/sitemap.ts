import type { MetadataRoute } from "next";
import { publicCreators, readDataset } from "@/lib/data";
import { categoryPath, tracksPath } from "@/lib/discovery";
import { boardRankingParams, rankingOverflowPaths, rankingsPath } from "@/lib/rankings";
import { verticals } from "@/lib/schema";
import { siteOrigin } from "@/lib/seo";

const origin = siteOrigin;

export default function sitemap(): MetadataRoute.Sitemap {
  const creators = readDataset().creators;
  return [
    { url: `${origin}/` },
    { url: `${origin}/events` },
    { url: `${origin}${tracksPath}` },
    { url: `${origin}${rankingsPath}` },
    ...verticals.map(vertical => ({ url: `${origin}${categoryPath(vertical)}` })),
    ...boardRankingParams(creators).map(({ slug }) => ({ url: `${origin}${rankingsPath}/${slug}` })),
    ...rankingOverflowPaths(creators).map(path => ({ url: `${origin}${path}` })),
    ...publicCreators(creators).map(({ handle }) => ({ url: `${origin}/creator/${handle}` })),
  ];
}
