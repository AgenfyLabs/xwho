import type { Metadata } from "next";
import { directory, publicCreators, verticalCounts, type DirectoryResult } from "./data";
import { roleNames, verticalNames, verticals, type Creator, type Vertical } from "./schema";
import type { DigestEntry } from "./digest";

export const SITE_NAME = "XWho 中文 X 黄皮书";
export const SITE_DESCRIPTION = "XWho 中文 X 黄皮书按赛道收录中文 X 创作者的可核验作品，并汇总附原始出处的每日动态。";
export const GITHUB_URL = "https://github.com/AgenfyLabs/xwho";
export const crawlerAgents = [
  "*",
  "Googlebot",
  "Bingbot",
  "DuckDuckBot",
  "Applebot",
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "PerplexityBot",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "anthropic-ai",
  "Google-Extended",
  "GrokBot",
  "xAI-SearchBot",
];

const TITLE_MAX = 70;
const DESCRIPTION_MAX = 160;
const MIXED_BIO_LINK = /个人站\s*\/\s*项目站/;
const PERSONAL_SITE = /个人站|个人网站|个人主页|个人博客/;

export function siteOrigin() {
  const fallback = "https://xwho.org";
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return fallback;
  try {
    const url = new URL(raw);
    if (url.hostname === "xwho.org" || url.hostname === "www.xwho.org") return `https://${url.hostname}`;
    if (url.protocol === "https:") return url.origin;
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return url.origin;
  } catch { /* 配置无效时使用正式站点 */ }
  return fallback;
}

export function absUrl(path: string) {
  return new URL(path, siteOrigin()).toString();
}

export function isVertical(value: string): value is Vertical {
  return (verticals as readonly string[]).includes(value);
}

export function clipText(text: string, max = DESCRIPTION_MAX) {
  const chars = Array.from(text.replace(/\s+/g, " ").trim());
  if (chars.length <= max) return chars.join("");
  const slice = chars.slice(0, max - 1).join("");
  const stop = Math.max(slice.lastIndexOf("。"), slice.lastIndexOf("！"), slice.lastIndexOf("？"));
  const base = stop >= Math.floor(max * 0.6) ? slice.slice(0, stop + 1) : slice.replace(/[，、：；\s]+$/u, "");
  return `${base}…`;
}

export function creatorTitle(c: Pick<Creator, "display_name" | "handle" | "sub_tags" | "verified_works">) {
  const core = `${c.display_name} @${c.handle}`;
  const topic = c.sub_tags.find(tag => tag.trim());
  const work = c.verified_works.find(item => item.title.trim())?.title.trim();
  const candidates = [
    topic && work ? `${core} · ${topic}、${work}` : "",
    topic ? `${core} · ${topic}` : "",
    work ? `${core} · ${work}` : "",
    core,
  ];
  return candidates.find(item => item && Array.from(item).length <= TITLE_MAX) || core;
}

export function creatorDescription(c: Pick<Creator, "display_name" | "handle" | "vertical" | "summary" | "verified_works">) {
  const summary = c.summary.trim();
  const period = /[。！？]$/u.test(summary) ? "" : "。";
  const work = c.verified_works.find(item => item.title.trim())?.title.trim();
  const workBit = work ? `代表作：${work}。` : "";
  return clipText(`${c.display_name}（@${c.handle}），${verticalNames[c.vertical]}。${summary}${period}${workBit}`);
}

function normalizeUrl(raw: string) {
  const url = new URL(raw);
  url.hash = "";
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) url.pathname = url.pathname.slice(0, -1);
  const normalized = url.toString();
  return url.pathname === "/" && !url.search ? normalized.replace(/\/$/, "") : normalized;
}

function externalProfile(raw: string) {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return;
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "x.com" || host === "twitter.com" || host.endsWith(".twitter.com")) return;
    return normalizeUrl(raw);
  } catch { return; }
}

export function creatorSameAs(c: Pick<Creator, "handle" | "verified_works" | "service_board">) {
  const urls = [`https://x.com/${c.handle}`];
  for (const work of c.verified_works) {
    const text = `${work.title}\n${work.description}`;
    if (MIXED_BIO_LINK.test(text) || !PERSONAL_SITE.test(text)) continue;
    const profile = externalProfile(work.url);
    if (profile) urls.push(profile);
  }
  for (const channel of c.service_board?.contact_channels ?? []) {
    if (!/网站|主页|博客|个人站/.test(channel.label)) continue;
    const profile = externalProfile(channel.value);
    if (profile) urls.push(profile);
  }
  return [...new Set(urls)];
}

export function pageMeta({ title, description, path }: { title?: string; description: string; path: string }): Metadata {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  return {
    title: title ?? { absolute: SITE_NAME },
    description,
    alternates: { canonical: path },
    openGraph: {
      title: fullTitle, description, url: path, siteName: SITE_NAME, locale: "zh_CN", type: "website",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image", title: fullTitle, description,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: SITE_NAME }],
    },
  };
}

export function orderedPublic(creators: Creator[]) {
  const visible = publicCreators(creators);
  const byId = new Map(visible.map(creator => [creator.x_user_id, creator]));
  return listDirectory(visible).flatMap(item => {
    const creator = byId.get(item.x_user_id);
    return creator ? [creator] : [];
  });
}

export function listDirectory(creators: Creator[], vertical?: Vertical) {
  const first = directory(creators, { vertical, page: 1 });
  const items: DirectoryResult["items"] = [...first.items];
  for (let page = 2; page <= first.pages; page += 1) items.push(...directory(creators, { vertical, page }).items);
  return items;
}

export function publicPaths(creators: Creator[]) {
  return [
    "/",
    "/events",
    "/tracks",
    ...verticals.map(vertical => `/tracks/${vertical}`),
    ...publicCreators(creators).map(creator => `/creator/${creator.handle}`),
  ];
}

function websiteRef() {
  return { "@type": "WebSite", name: SITE_NAME, url: siteOrigin() };
}

export function websiteJsonLd() {
  const origin = siteOrigin();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: SITE_NAME,
        alternateName: ["XWho", "中文 X 黄皮书"],
        url: origin,
        description: SITE_DESCRIPTION,
        inLanguage: "zh-CN",
        publisher: { "@id": `${origin}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: SITE_NAME,
        url: origin,
        sameAs: [GITHUB_URL],
      },
    ],
  };
}

export function creatorJsonLd(c: Creator) {
  const url = absUrl(`/creator/${c.handle}`);
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: creatorTitle(c),
    description: creatorDescription(c),
    url,
    inLanguage: "zh-CN",
    isPartOf: websiteRef(),
    mainEntity: {
      "@type": "Person",
      name: c.display_name,
      alternateName: `@${c.handle}`,
      description: c.summary,
      url,
      sameAs: creatorSameAs(c),
      ...(c.sub_tags.length ? { knowsAbout: c.sub_tags } : {}),
      ...(c.verified_works.length ? {
        subjectOf: c.verified_works.map(work => ({
          "@type": "CreativeWork",
          name: work.title,
          url: work.url,
          ...(work.description ? { description: work.description } : {}),
        })),
      } : {}),
    },
  };
}

export function collectionJsonLd({ name, description, path, items }: {
  name: string; description: string; path: string; items: { name: string; url: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: absUrl(path),
    inLanguage: "zh-CN",
    isPartOf: websiteRef(),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: item.url.startsWith("http") ? item.url : absUrl(item.url),
      })),
    },
  };
}

export function eventsJsonLd(entries: DigestEntry[]) {
  return collectionJsonLd({
    name: "中推今日大事件",
    description: "按北京时间（UTC+8）汇总中文 X 创作者的可核验动态，每条附原始出处。",
    path: "/events",
    items: entries.map(entry => ({
      name: `${entry.display_name}：${entry.summary}`,
      url: absUrl(`/creator/${entry.handle}`),
    })),
  });
}

export function tracksJsonLd(counts: Record<Vertical, number>) {
  return collectionJsonLd({
    name: "按赛道浏览",
    description: "XWho 中文 X 黄皮书的六个赛道，每个赛道列出全部公开创作者。",
    path: "/tracks",
    items: verticals.map(vertical => ({
      name: `${verticalNames[vertical]}（${counts[vertical]} 人）`,
      url: absUrl(`/tracks/${vertical}`),
    })),
  });
}

export function llmsText(creators: Creator[]) {
  const origin = siteOrigin();
  const counts = verticalCounts(creators);
  const people = orderedPublic(creators);
  return [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION} 本文件由公开档案生成，只包含未隐藏的创作者。`,
    "",
    `站点：${origin}`,
    "",
    "## 页面",
    "",
    `- [创作者名录](${origin}/): 首页目录`,
    `- [按赛道浏览](${origin}/tracks): 六个赛道的全量公开名单`,
    ...verticals.map(vertical => `- [${verticalNames[vertical]}](${origin}/tracks/${vertical}): ${counts[vertical]} 人`),
    `- [中推今日大事件](${origin}/events): 按北京时间（UTC+8）排列、附原始出处的动态`,
    "",
    "## 创作者",
    "",
    ...people.map(creator => `- [${creator.display_name} (@${creator.handle})](${origin}/creator/${creator.handle}): ${creator.summary.replace(/\s+/g, " ").trim()}`),
    "",
    "## 可选",
    "",
    `- [完整档案](${origin}/llms-full.txt): 赛道、简介、代表作标题与原始链接`,
    "",
  ].join("\n");
}

export function llmsFullText(creators: Creator[]) {
  const origin = siteOrigin();
  const sections = orderedPublic(creators).map(creator => {
    const tags = [...creator.role_tags.map(tag => roleNames[tag]), ...creator.sub_tags];
    const sites = creatorSameAs(creator).filter(url => url !== `https://x.com/${creator.handle}`);
    const works = creator.verified_works.length
      ? creator.verified_works.map(work => `- [${work.title}](${work.url})${work.description ? `：${work.description}` : ""}`).join("\n")
      : "- 暂无已核验的代表作";
    const lines = [
      `## ${creator.display_name} (@${creator.handle})`,
      "",
      `- 赛道：${verticalNames[creator.vertical]}`,
      `- 档案：${origin}/creator/${creator.handle}`,
      `- X：https://x.com/${creator.handle}`,
      `- 简介：${creator.summary.trim()}`,
    ];
    if (tags.length) lines.push(`- 标签：${tags.join("、")}`);
    if (sites.length) lines.push(`- 个人站：${sites.join("、")}`);
    if (creator.followers_snapshot) lines.push(`- 粉丝快照：${creator.followers_snapshot.count}（${creator.followers_snapshot.as_of}）`);
    lines.push("", "代表作：", "", works);
    if (creator.quote) lines.push("", `金句：${creator.quote.text}`, `出处：${creator.quote.source_url}`);
    return lines.join("\n");
  });
  return [`# ${SITE_NAME}`, "", "> 由公开档案生成的完整名录。隐藏档案不包含在内。", "", ...sections, ""].join("\n");
}

export function plainText(body: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex",
    },
  });
}
