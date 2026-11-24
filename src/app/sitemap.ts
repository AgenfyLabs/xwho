import type { MetadataRoute } from "next";
import { readDataset } from "@/lib/data";
import { absUrl, publicPaths } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const { creators } = readDataset();
  const byHandle = new Map(creators.map(creator => [creator.handle, creator.last_post_at]));
  return publicPaths(creators).map(path => {
    const handle = path.startsWith("/creator/") ? path.slice("/creator/".length) : "";
    const lastPost = handle ? byHandle.get(handle) : undefined;
    return { url: absUrl(path), ...(lastPost ? { lastModified: lastPost } : {}) };
  });
}
