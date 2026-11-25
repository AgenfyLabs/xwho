import { readFileSync, readdirSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const SITE_HOST = "xwho.org";
export const INDEXNOW_BATCH = 10000;
const KEY_FILE = /^[a-f0-9]{32}\.txt$/;
const root = fileURLToPath(new URL("..", import.meta.url));

export function findIndexNowKey(publicDir) {
  const names = readdirSync(publicDir).filter(name => KEY_FILE.test(name)).sort();
  if (names.length !== 1) {
    throw new Error(`public/ 下需要恰好一个 32 位十六进制 IndexNow 密钥文件，当前找到 ${names.length} 个`);
  }
  const filename = names[0];
  const key = filename.slice(0, -4);
  const body = readFileSync(resolve(publicDir, filename), "utf8");
  if (body !== key) throw new Error(`${filename} 的正文必须等于密钥本身，不能有空格或换行`);
  return { key, filename, keyLocation: `https://${SITE_HOST}/${filename}` };
}

function decodeXml(value) {
  return value.replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", "\"").replaceAll("&apos;", "'");
}

export function urlsFromSitemap(xml, host = SITE_HOST) {
  if (/<sitemapindex[\s>]/i.test(xml)) throw new Error("需要网址列表 sitemap，而不是 sitemap index");
  const found = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map(match => decodeXml(match[1]));
  if (!found.length) throw new Error("站点地图里没有网址");
  const urls = [];
  const seen = new Set();
  for (const url of found) {
    let parsed;
    try { parsed = new URL(url); }
    catch { throw new Error(`站点地图含有无效网址 ${url}`); }
    if (parsed.protocol !== "https:" || parsed.host !== host) throw new Error(`站点地图含有非 https://${host} 的网址 ${url}`);
    if (seen.has(parsed.href)) continue;
    seen.add(parsed.href);
    urls.push(parsed.href);
  }
  return urls;
}

export function batches(urls, size = INDEXNOW_BATCH) {
  if (!Number.isInteger(size) || size < 1 || size > INDEXNOW_BATCH) throw new Error(`每批须为 1 到 ${INDEXNOW_BATCH} 条`);
  const groups = [];
  for (let i = 0; i < urls.length; i += size) groups.push(urls.slice(i, i + size));
  return groups;
}

export function indexNowPayload({ host, key, keyLocation, urlList }) {
  return { host, key, keyLocation, urlList };
}

async function readSitemap(source) {
  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source, { signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new Error(`读取站点地图失败：HTTP ${response.status} ${source}`);
    return response.text();
  }
  return readFileSync(source, "utf8");
}

function usage() {
  return `用法：npm run indexnow -- [--sitemap <https 地址或本地 XML>] [--dry-run]

默认读取 https://${SITE_HOST}/sitemap.xml，按最多 ${INDEXNOW_BATCH} 条一批
POST 到 ${INDEXNOW_ENDPOINT}。正文包含 host、key、keyLocation 和 urlList。
不参与 npm run build。密钥文件须已能从公网打开，否则接口会拒绝。`;
}

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      sitemap: { type: "string", default: `https://${SITE_HOST}/sitemap.xml` },
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
    strict: true,
  });
  if (values.help) {
    console.log(usage());
    return;
  }
  const { key, keyLocation } = findIndexNowKey(resolve(root, "public"));
  const urls = urlsFromSitemap(await readSitemap(values.sitemap));
  const groups = batches(urls);
  console.log(`IndexNow · ${urls.length} 条网址 · ${groups.length} 批 · ${keyLocation}`);
  if (values["dry-run"]) {
    console.log("dry-run · 未提交");
    return;
  }
  let failed = false;
  for (const [index, urlList] of groups.entries()) {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(indexNowPayload({ host: SITE_HOST, key, keyLocation, urlList })),
      signal: AbortSignal.timeout(60_000),
    });
    const text = (await response.text()).trim().slice(0, 300);
    const ok = response.status === 200 || response.status === 202;
    console.log(`第 ${index + 1} 批 · ${urlList.length} 条 · HTTP ${response.status}${text ? ` · ${text}` : ""}`);
    if (!ok) failed = true;
  }
  if (failed) process.exitCode = 1;
}

function runningAsCli() {
  const entry = process.argv[1];
  if (!entry) return false;
  try { return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url)); }
  catch { return false; }
}

if (runningAsCli()) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
