import type { MetadataRoute } from "next";
import { absUrl, crawlerAgents, siteOrigin } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: crawlerAgents.map(userAgent => ({ userAgent, allow: "/", disallow: "/api/" })),
    sitemap: absUrl("/sitemap.xml"),
    host: siteOrigin(),
  };
}
