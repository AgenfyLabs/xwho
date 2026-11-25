import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { batches, findIndexNowKey, INDEXNOW_BATCH, indexNowPayload, SITE_HOST, urlsFromSitemap } from "../scripts/indexnow.mjs";

const key = "abfac3ea7702718243dbe54c6f4d3751";
const publicDir = fileURLToPath(new URL("../public", import.meta.url));

it("公开密钥文件的正文等于文件名中的密钥", () => {
  const found = findIndexNowKey(publicDir);
  expect(found).toEqual({
    key,
    filename: `${key}.txt`,
    keyLocation: `https://xwho.org/${key}.txt`,
  });
  expect(readFileSync(new URL(`../public/${key}.txt`, import.meta.url), "utf8")).toBe(key);
});

it("拒绝正文与文件名不一致的密钥文件", () => {
  const dir = mkdtempSync(join(tmpdir(), "xwho-indexnow-"));
  writeFileSync(join(dir, `${key}.txt`), `${key}\n`);
  expect(() => findIndexNowKey(dir)).toThrow(/正文必须等于密钥/);
});

it("从站点地图取出本站 https 网址并解码实体", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset>
  <url><loc>https://xwho.org/</loc></url>
  <url><loc>https://xwho.org/</loc></url>
  <url><loc>https://xwho.org/creator/A&amp;B</loc></url>
</urlset>`;
  expect(urlsFromSitemap(xml)).toEqual(["https://xwho.org/", "https://xwho.org/creator/A&B"]);
  expect(() => urlsFromSitemap("<urlset><url><loc>http://xwho.org/</loc></url></urlset>")).toThrow(/https:\/\/xwho\.org/);
  expect(() => urlsFromSitemap("<urlset><url><loc>https://example.com/</loc></url></urlset>")).toThrow(SITE_HOST);
  expect(() => urlsFromSitemap("<sitemapindex><sitemap><loc>https://xwho.org/sitemap.xml</loc></sitemap></sitemapindex>")).toThrow(/sitemap index/);
});

it("IndexNow 每批不超过 10000 条，并带上 host、key 与 keyLocation", () => {
  const urls = Array.from({ length: INDEXNOW_BATCH + 1 }, (_, i) => `https://xwho.org/creator/${i}`);
  const groups = batches(urls);
  expect(groups.map(group => group.length)).toEqual([INDEXNOW_BATCH, 1]);
  expect(indexNowPayload({
    host: SITE_HOST,
    key,
    keyLocation: `https://xwho.org/${key}.txt`,
    urlList: groups[0],
  })).toEqual({
    host: "xwho.org",
    key,
    keyLocation: `https://xwho.org/${key}.txt`,
    urlList: groups[0],
  });
});

it("页面使用 zh-CN，并声明同时适用于电脑和手机", () => {
  const layout = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
  expect(layout).toContain('lang="zh-CN"');
  expect(layout).toContain('"applicable-device": "pc,mobile"');
});
