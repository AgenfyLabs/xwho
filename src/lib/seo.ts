import type { Metadata } from "next";
import { roleNames, verticalNames, type Creator } from "./schema";

export const siteOrigin = "https://xwho.org";
export const siteTitle = "XWho · 中文 X 黄皮书";
export const siteDescription = "按赛道查找中文 X 创作者的可核验作品，阅读附原始出处的每日动态。";
export const eventsTitle = "中推今日大事件";
export const eventsDescription = "按北京时间（UTC+8）逐日查阅中文 X 创作者的可核验动态，并核对每条记录的原始出处。";
export const dashboardTitle = "我的名片";
export const dashboardDescription = "使用 X 账号登录，认领或申请你的中文 X 黄皮书名片。";
const descriptionLimit = 160;

type IndexablePage = {
  title?: string;
  description?: string;
  path: string;
  type?: "website" | "profile";
  username?: string;
};

function categoryLabel(creator: Pick<Creator, "vertical" | "role_tags">, separator: string) {
  const track = verticalNames[creator.vertical];
  const roles = creator.role_tags.map(role => roleNames[role]);
  return roles.length ? `${track}${separator}${roles.join("、")}` : track;
}

export function clipText(text: string, max = descriptionLimit) {
  const chars = Array.from(text);
  if (chars.length <= max) return chars.join("");
  return `${chars.slice(0, max - 1).join("")}…`;
}

export function creatorTitle(creator: Pick<Creator, "display_name" | "handle" | "vertical" | "role_tags">) {
  return `${creator.display_name}（@${creator.handle}）· ${categoryLabel(creator, " · ")}`;
}

export function creatorDescription(creator: Pick<Creator, "display_name" | "handle" | "vertical" | "role_tags" | "summary">) {
  const summary = creator.summary.replace(/\s+/g, " ").trim();
  return clipText(`${creator.display_name}（@${creator.handle}），${categoryLabel(creator, "，")}。${summary}`);
}

export function creatorPath(creator: Pick<Creator, "handle">) {
  return `/creator/${creator.handle}`;
}

function socialGraph(page: IndexablePage, description: string): Metadata["openGraph"] {
  const shared = {
    locale: "zh_CN" as const,
    siteName: "XWho",
    description,
    url: page.path,
    title: page.title ?? { absolute: siteTitle },
  };
  if (page.type === "profile") return { ...shared, type: "profile", username: page.username };
  return { ...shared, type: "website" };
}

export function indexableMetadata(page: IndexablePage): Metadata {
  const description = page.description ?? siteDescription;
  return {
    ...(page.title ? { title: page.title } : {}),
    description,
    alternates: { canonical: page.path },
    openGraph: socialGraph(page, description),
    twitter: { card: "summary", description, title: page.title ?? { absolute: siteTitle } },
  };
}

export function privateMetadata(title: string, description: string): Metadata {
  return {
    title,
    description,
    robots: { index: false },
    openGraph: { type: "website", locale: "zh_CN", siteName: "XWho", title, description },
    twitter: { card: "summary", title, description },
  };
}

const websiteRef = { "@type": "WebSite", name: siteTitle, url: siteOrigin };

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    ...websiteRef,
    description: siteDescription,
    inLanguage: "zh-CN",
  };
}

export function eventsJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: eventsTitle,
    url: `${siteOrigin}/events`,
    description: eventsDescription,
    inLanguage: "zh-CN",
    isPartOf: { ...websiteRef },
  };
}

export function creatorProfileJsonLd(creator: Creator) {
  const url = `${siteOrigin}${creatorPath(creator)}`;
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: creatorTitle(creator),
    url,
    description: creatorDescription(creator),
    inLanguage: "zh-CN",
    isPartOf: { ...websiteRef },
    mainEntity: {
      "@type": "Person",
      name: creator.display_name,
      alternateName: `@${creator.handle}`,
      identifier: { "@type": "PropertyValue", propertyID: "x_user_id", value: creator.x_user_id },
      description: creator.summary.replace(/\s+/g, " ").trim(),
      url,
      sameAs: [`https://x.com/${creator.handle}`],
      ...(creator.sub_tags.length ? { knowsAbout: creator.sub_tags } : {}),
    },
  };
}

export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
