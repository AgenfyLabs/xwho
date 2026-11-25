import { publicCreators } from "./data";
import { verticalNames, verticals, type Creator, type Vertical } from "./schema";
import { clipText, creatorPath, eventsDescription, siteDescription, siteOrigin, siteTitle } from "./seo";

export const tracksPath = "/tracks";
export const tracksTitle = "按赛道浏览";
export const tracksDescription = "按六个赛道查看全部公开的中文 X 创作者，并从赛道进入每一位的档案。";
const minSimilar = 4;
const maxSimilar = 8;

export function isVertical(value: string): value is Vertical {
  return (verticals as readonly string[]).includes(value);
}

export function categoryPath(vertical: Vertical) {
  return `${tracksPath}/${vertical}`;
}

export function homeCategoryLinks() {
  return verticals.map(categoryPath);
}

export function absoluteUrl(path: string) {
  return `${siteOrigin}${path === "/" ? "/" : path}`;
}

export function creatorsInVertical(creators: Creator[], vertical: Vertical) {
  return publicCreators(creators)
    .filter(creator => creator.vertical === vertical)
    .sort((a, b) => {
      if (a.verification_tier !== b.verification_tier) return a.verification_tier === "deep-verified" ? -1 : 1;
      return (b.followers_snapshot?.count ?? -1) - (a.followers_snapshot?.count ?? -1) || a.handle.localeCompare(b.handle);
    });
}

export function similarCreators(creators: Creator[], current: Creator) {
  const roles = new Set(current.role_tags);
  const subs = new Set(current.sub_tags);
  const ranked = publicCreators(creators).flatMap(creator => {
    if (creator.x_user_id === current.x_user_id) return [];
    const sharedRoles = creator.role_tags.filter(tag => roles.has(tag)).length;
    const sharedSubs = creator.sub_tags.filter(tag => subs.has(tag)).length;
    const sameVertical = creator.vertical === current.vertical;
    if (!sameVertical && sharedRoles === 0 && sharedSubs === 0) return [];
    return [{ creator, score: (sameVertical ? 10 : 0) + sharedRoles * 3 + sharedSubs * 2 }];
  });
  ranked.sort((a, b) => b.score - a.score
    || Number(b.creator.verification_tier === "deep-verified") - Number(a.creator.verification_tier === "deep-verified")
    || (b.creator.followers_snapshot?.count ?? -1) - (a.creator.followers_snapshot?.count ?? -1)
    || a.creator.handle.localeCompare(b.creator.handle));
  const count = ranked.length >= minSimilar ? Math.min(maxSimilar, ranked.length) : ranked.length;
  return ranked.slice(0, count).map(item => item.creator);
}

export function categoryDescription(vertical: Vertical, count: number) {
  return `收录 ${count} 位${verticalNames[vertical]}赛道的中文 X 创作者，查看可核验作品与原始出处。`;
}

export type Crumb = { name: string; path: string };

export function creatorCrumbs(creator: Pick<Creator, "display_name" | "handle" | "vertical">): Crumb[] {
  return [
    { name: "首页", path: "/" },
    { name: verticalNames[creator.vertical], path: categoryPath(creator.vertical) },
    { name: creator.display_name, path: creatorPath(creator) },
  ];
}

export function categoryCrumbs(vertical: Vertical): Crumb[] {
  return [
    { name: "首页", path: "/" },
    { name: verticalNames[vertical], path: categoryPath(vertical) },
  ];
}

export function tracksCrumbs(): Crumb[] {
  return [
    { name: "首页", path: "/" },
    { name: tracksTitle, path: tracksPath },
  ];
}

export function breadcrumbJsonLd(items: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

const websiteRef = { "@type": "WebSite", name: siteTitle, url: siteOrigin };

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteTitle,
    url: siteOrigin,
    description: siteDescription,
    sameAs: ["https://github.com/AgenfyLabs/xwho"],
  };
}

function itemList(items: { name: string; path: string }[]) {
  return {
    "@type": "ItemList",
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}

export function tracksJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: tracksTitle,
    url: absoluteUrl(tracksPath),
    description: tracksDescription,
    inLanguage: "zh-CN",
    isPartOf: { ...websiteRef },
    mainEntity: itemList(verticals.map(vertical => ({
      name: verticalNames[vertical],
      path: categoryPath(vertical),
    }))),
  };
}

export function categoryJsonLd(vertical: Vertical, creators: Creator[]) {
  const people = creatorsInVertical(creators, vertical);
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: verticalNames[vertical],
    url: absoluteUrl(categoryPath(vertical)),
    description: categoryDescription(vertical, people.length),
    inLanguage: "zh-CN",
    isPartOf: { ...websiteRef },
    mainEntity: itemList(people.map(creator => ({
      name: creator.display_name,
      path: creatorPath(creator),
    }))),
  };
}

export function llmsText(creators: Creator[]) {
  const visible = publicCreators(creators);
  const lines = [
    "# XWho",
    "",
    `> ${siteDescription}`,
    "",
    "XWho 是中文 X 创作者的公开黄皮书。以下为六个赛道，以及每个赛道中核验层级和粉丝快照较高的代表性档案。隐藏档案不列入。",
    "",
    "## 分类",
    "",
    `- [按赛道浏览](${absoluteUrl(tracksPath)}): ${tracksDescription}`,
    ...verticals.map(vertical => {
      const count = visible.filter(creator => creator.vertical === vertical).length;
      return `- [${verticalNames[vertical]}](${absoluteUrl(categoryPath(vertical))}): ${count} 位公开创作者`;
    }),
    "",
    "## 代表性链接",
    "",
  ];
  for (const vertical of verticals) {
    for (const creator of creatorsInVertical(visible, vertical).slice(0, 2)) {
      const summary = clipText(creator.summary.replace(/\s+/g, " ").trim(), 80);
      lines.push(`- [${creator.display_name}（@${creator.handle}）](${absoluteUrl(creatorPath(creator))}): ${summary}`);
    }
  }
  lines.push("", "## 其他", "", `- [中推今日大事件](${absoluteUrl("/events")}): ${eventsDescription}`, "");
  return lines.join("\n");
}
