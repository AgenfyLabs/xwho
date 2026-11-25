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

it("robots.txt 向所有爬虫提供正式域名的站点地图地址", () => {
  const robots = readFileSync(new URL("../src/app/robots.txt", import.meta.url), "utf8");
  expect(robots).toMatch(/^User-agent: \*$/m);
  expect(robots).toMatch(/^Allow: \/$/m);
  expect(robots).toMatch(/^Sitemap: https:\/\/xwho\.org\/sitemap\.xml$/m);
});
