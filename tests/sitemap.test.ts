import { readFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import sitemap from "../src/app/sitemap";
import * as data from "../src/lib/data";
import { creator } from "./fixtures";

afterEach(() => { vi.restoreAllMocks(); });

it("站点地图包含每一页的公开名片，自动反映新增、改名和隐藏", () => {
  const creators = Array.from({ length: 30 }, (_, i) => creator({
    x_user_id: String(i + 1), handle: `Creator_${i + 1}`,
  }));
  const dataset = { creators, milestones: [] };
  vi.spyOn(data, "readDataset").mockReturnValue(dataset);

  const sections = ["https://xwho.org/", "https://xwho.org/events"];
  const profile = (handle: string) => `https://xwho.org/creator/${handle}`;
  const urls = () => sitemap().map(entry => entry.url).sort();
  expect(urls()).toEqual([...sections, ...creators.map(c => profile(c.handle))].sort());

  creators[0].claim_status = "hidden";
  creators[1].handle = "Renamed";
  creators.push(creator({ x_user_id: "31", handle: "NewCreator", claim_status: "claimed" }));
  expect(urls()).toEqual([...sections, profile("Renamed"), profile("NewCreator"),
    ...Array.from({ length: 28 }, (_, i) => profile(`Creator_${i + 3}`)),
  ].sort());
});

it("robots.txt 明示欢迎中文与 Bing 爬虫，并禁止抓取工作台", () => {
  const robots = readFileSync(new URL("../src/app/robots.txt", import.meta.url), "utf8");
  const agents = [
    "Baiduspider", "Baiduspider-image", "Sogou web spider", "Sogou inst spider",
    "Sogou spider2", "bingbot", "msnbot", "*",
  ];
  const groups = new Map();
  let current = "";
  for (const line of robots.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const agent = trimmed.match(/^User-agent:\s*(.+)$/);
    if (agent) {
      current = agent[1];
      groups.set(current, []);
      continue;
    }
    if (trimmed.startsWith("Sitemap:")) {
      expect(trimmed).toBe("Sitemap: https://xwho.org/sitemap.xml");
      continue;
    }
    groups.get(current)?.push(trimmed);
  }
  expect([...groups.keys()]).toEqual(agents);
  for (const agent of agents) expect(groups.get(agent)).toEqual(["Allow: /", "Disallow: /dashboard"]);
  expect(robots.match(/^Sitemap:/gm)).toHaveLength(1);
});
