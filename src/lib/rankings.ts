import { publicCreators } from "./data";
import { categoryPath, isVertical, type Crumb } from "./discovery";
import { clipText, creatorPath, siteOrigin, siteTitle } from "./seo";
import { roleNames, verticalNames, type Creator, type Role, type Vertical } from "./schema";

export const rankingsPath = "/rankings";
export const rankingsTitle = "中文 X 排行榜";
export const rankingsDescription = "汇总中文 X 创作者的赛道、身份和主题排行。各榜按粉丝快照从高到低排列，只为至少 10 人的分类建页；赛道榜沿用原来的赛道页。";
export const rankingsIntro = "这些排行都来自已经公开的创作者档案。赛道榜就是原来的六个赛道页，按主赛道字段收录，避免同一批人再占一个重复地址。身份榜看角色标签，主题榜看子标签里写明的方向。档案没有语言、地区或粉丝增长字段：中文范围来自收录标准，名次只比较每人最近一次粉丝快照。少于 10 人的分类不单独立页。";
export const rankingBasis = "排名依据是档案中的粉丝快照人数，从高到低。快照时点使用东八区（+08:00），与人数成对保存，不是打开本页时的实时粉丝。没有历史快照，因此不计算涨粉。人数相同则深度核验排在接口核验之前；仍相同则按用户名排序，保证顺序稳定。核验层级只在平局时起作用，表示资料核对深度。隐藏档案不进入榜单。";
export const minRankingSize = 10;
export const rankingPageSize = 100;

export const rankingGroups = [
  { id: "overall", title: "总榜" },
  { id: "vertical", title: "赛道" },
  { id: "role", title: "身份" },
  { id: "topic", title: "主题" },
] as const;

export type RankingGroup = typeof rankingGroups[number]["id"];

type Spec = {
  id: string;
  kind: "vertical" | "board";
  group: RankingGroup;
  path: string;
  title: string;
  navLabel: string;
  scope: string;
  intro: (count: number) => string;
  seeAlso: string[];
  match: (creator: Creator) => boolean;
};

function absoluteUrl(path: string) {
  return `${siteOrigin}${path === "/" ? "/" : path}`;
}

function rankingDescription(scope: string, count: number) {
  return `按粉丝快照从高到低排列 ${count} 位${scope}。快照为东八区时点，不是实时粉丝，也不按涨粉计算。`;
}

function verticalSpec(vertical: Vertical, title: string, intro: (count: number) => string): Spec {
  return {
    id: vertical, kind: "vertical", group: "vertical", path: categoryPath(vertical), title,
    navLabel: verticalNames[vertical], scope: `主赛道为「${verticalNames[vertical]}」的中文 X 创作者`,
    intro, seeAlso: ["followers"], match: creator => creator.vertical === vertical,
  };
}

function roleSpec(id: string, role: Role, title: string, navLabel: string, intro: (count: number) => string): Spec {
  return {
    id, kind: "board", group: "role", path: `${rankingsPath}/${id}`, title, navLabel,
    scope: `角色为「${roleNames[role]}」的中文 X 创作者`, intro, seeAlso: ["followers"],
    match: creator => creator.role_tags.includes(role),
  };
}

function topicSpec(id: string, tag: string, title: string, navLabel: string, seeAlso: string[], intro: (count: number) => string): Spec {
  return {
    id, kind: "board", group: "topic", path: `${rankingsPath}/${id}`, title, navLabel,
    scope: `子标签含「${tag}」的中文 X 创作者`, intro, seeAlso,
    match: creator => creator.sub_tags.includes(tag),
  };
}

const specs: Spec[] = [
  {
    id: "followers", kind: "board", group: "overall", path: `${rankingsPath}/followers`,
    title: "中文 X 创作者排行", navLabel: "总榜", scope: "已收录的中文 X 创作者", seeAlso: [],
    intro: count => `本榜列出 XWho 全部公开档案，共 ${count} 人。目录只收录可核验的中文创作者，但档案里没有单独的语言或地区列，因此这里不按地区拆榜，也不把涨粉当作名次。`,
    match: () => true,
  },
  verticalSpec("ai-dev", "AI 领域 X 博主排行", count => `这就是「AI 开发者」赛道页，收录主赛道标为 AI 开发者的公开创作者，共 ${count} 人，用来查找做 AI 工程、产品和研究方向的中文 X 账号。同一地址不再另开一份重复名单。`),
  verticalSpec("geo", "GEO 赛道 X 创作者排行", count => `这就是 GEO 赛道页，收录主赛道标为 GEO 的公开创作者，共 ${count} 人。入库规则里 GEO 对应生成式引擎优化；本榜只认档案中的赛道字段，不另按关键词扩大范围。`),
  verticalSpec("media", "媒体人 X 博主排行", count => `这就是「媒体人」赛道页，收录主赛道标为媒体人的公开创作者，共 ${count} 人，用来查找在中文 X 上做报道、评论和栏目的账号。`),
  verticalSpec("crypto", "加密货币 KOL 排行", count => `这就是「币圈」赛道页，收录主赛道标为币圈的公开创作者，共 ${count} 人。标题沿用加密货币方向的常见叫法，名单以赛道字段为准，不是另设的 KOL 标签。`),
  verticalSpec("finance", "财经投资 X 博主排行", count => `这就是「财经投资」赛道页，收录主赛道标为财经投资的公开创作者，共 ${count} 人。美股等更窄的主题如果单独成榜，会在主题榜里交叉链过来。`),
  verticalSpec("general", "创业与观察 X 创作者排行", count => `这就是「创业与观察」赛道页，收录主赛道标为创业与观察的公开创作者，共 ${count} 人。它不等于「创始人」身份榜：身份榜看角色标签，可以跨赛道。`),
  roleSpec("founders", "founder", "创始人 X 账号排行", "创始人", count => `本榜收录角色标签含「创始人」的公开创作者，共 ${count} 人，不限赛道。只在子标签里提到创业、但没有这个角色标签的账号不会进入本榜。`),
  roleSpec("indie-developers", "indie-dev", "独立开发者 X 排行", "独立开发者", count => `本榜收录角色标签为「独立开发者」的公开创作者，共 ${count} 人。子标签「独立开发」是另一套自由文本，两边有重叠，但本榜只认角色标签。`),
  roleSpec("open-source", "oss-author", "开源作者 X 排行", "开源作者", count => `本榜收录角色标签为「开源作者」的公开创作者，共 ${count} 人。子标签「开源」不单独决定是否入榜。`),
  roleSpec("investors", "investor", "投资人 X 账号排行", "投资人", count => `本榜收录角色标签为「投资人」的公开创作者，共 ${count} 人。子标签「投资」和财经赛道全员都不等于这个角色，因此不会整表并入。`),
  roleSpec("ex-bigtech", "ex-bigtech", "前大厂 X 创作者排行", "前大厂", count => `本榜收录角色标签为「前大厂」的公开创作者，共 ${count} 人，不限现在所在的赛道。这个标签表示曾经在大型科技公司工作，不表示现任职务，也不和某个赛道页重复。`),
  topicSpec("going-global", "出海", "出海方向 X 创作者排行", "出海", ["ai-dev", "geo"], count => `本榜收录子标签恰好含有「出海」的公开创作者，共 ${count} 人。这些人分布在 AI 开发者、GEO 等赛道，所以不并进任何一个赛道页。`),
  topicSpec("us-stocks", "美股", "美股方向 X 创作者排行", "美股", ["finance"], count => `本榜收录子标签恰好含有「美股」的公开创作者，共 ${count} 人。名单横跨财经与币圈等赛道，因此不等于财经投资赛道页。`),
  topicSpec("ai-agents", "AI Agent", "AI Agent 方向 X 创作者排行", "AI Agent", ["ai-dev"], count => `本榜收录子标签恰好含有「AI Agent」的公开创作者，共 ${count} 人。它是 AI 赛道中的一个主题，不是整个 AI 领域榜。`),
];

const specById = new Map(specs.map(spec => [spec.id, spec]));

export function rankCreators(creators: Creator[]) {
  return publicCreators(creators).slice().sort((a, b) => {
    const byFollowers = (b.followers_snapshot?.count ?? -1) - (a.followers_snapshot?.count ?? -1);
    if (byFollowers) return byFollowers;
    if (a.verification_tier !== b.verification_tier) return a.verification_tier === "deep-verified" ? -1 : 1;
    return a.handle.localeCompare(b.handle);
  });
}

export type RankingLink = { path: string; title: string };

export type PublishedRanking = {
  id: string;
  kind: Spec["kind"];
  group: RankingGroup;
  path: string;
  title: string;
  navLabel: string;
  description: string;
  intro: string;
  basis: string;
  seeAlso: RankingLink[];
  creators: Creator[];
};

export function publishedRankings(creators: Creator[]): PublishedRanking[] {
  const visible = publicCreators(creators);
  const matched = new Map(specs.map(spec => [spec.id, rankCreators(visible.filter(spec.match))]));
  const published = new Set(specs.filter(spec => (matched.get(spec.id)?.length ?? 0) >= minRankingSize).map(spec => spec.id));
  return specs.flatMap(spec => {
    const people = matched.get(spec.id) ?? [];
    if (people.length < minRankingSize) return [];
    return [{
      id: spec.id, kind: spec.kind, group: spec.group, path: spec.path, title: spec.title, navLabel: spec.navLabel,
      description: rankingDescription(spec.scope, people.length), intro: spec.intro(people.length), basis: rankingBasis,
      seeAlso: spec.seeAlso.flatMap(id => {
        const target = specById.get(id);
        if (!target || !published.has(target.id)) return [];
        return [{ path: target.path, title: target.title }];
      }),
      creators: people,
    }];
  });
}

export function rankingBySlug(creators: Creator[], slug: string) {
  return publishedRankings(creators).find(ranking => ranking.kind === "board" && ranking.id === slug);
}

export function verticalRanking(creators: Creator[], vertical: Vertical) {
  return publishedRankings(creators).find(ranking => ranking.kind === "vertical" && ranking.id === vertical);
}

export function boardRankingParams(creators: Creator[]) {
  return publishedRankings(creators).filter(ranking => ranking.kind === "board").map(ranking => ({ slug: ranking.id }));
}

export function rankingPageCount(total: number) {
  return Math.max(1, Math.ceil(total / rankingPageSize));
}

export function parseRankingPage(value: string) {
  if (!/^[1-9]\d*$/.test(value)) return null;
  return Number(value);
}

export function rankingPagePath(path: string, page: number) {
  return page <= 1 ? path : `${path}/${page}`;
}

export function pageForPlace(place: number) {
  return Math.max(1, Math.ceil(place / rankingPageSize));
}

export function rankingWindow(total: number, page: number) {
  const pages = rankingPageCount(total);
  if (!Number.isInteger(page) || page < 1 || page > pages) return null;
  return { page, pages, total, from: (page - 1) * rankingPageSize + 1, to: Math.min(total, page * rankingPageSize) };
}

export function sliceRanking<T>(items: T[], page: number) {
  const window = rankingWindow(items.length, page);
  if (!window) return null;
  return { ...window, items: items.slice(window.from - 1, window.to) };
}

export function rankingPageTitle(ranking: Pick<PublishedRanking, "title">, page = 1) {
  return page <= 1 ? ranking.title : `${ranking.title} · 第 ${page} 页`;
}

export function rankingPageDescription(ranking: Pick<PublishedRanking, "description" | "creators">, page = 1) {
  if (page <= 1) return ranking.description;
  const window = rankingWindow(ranking.creators.length, page);
  if (!window) return ranking.description;
  return clipText(`第 ${window.from}–${window.to} 名，共 ${window.total} 人。${ranking.description}`);
}

export function rankingPageCrumbs(base: Crumb[], path: string, page: number): Crumb[] {
  if (page <= 1) return base;
  return [...base, { name: `第 ${page} 页`, path: rankingPagePath(path, page) }];
}

function paginationParams(creators: Creator[], kind: PublishedRanking["kind"]) {
  return publishedRankings(creators).filter(ranking => ranking.kind === kind).flatMap(ranking => {
    const pages = rankingPageCount(ranking.creators.length);
    if (pages < 2) return [];
    return Array.from({ length: pages }, (_, index) => ({ id: ranking.id, page: String(index + 1) }));
  });
}

export function boardPaginationParams(creators: Creator[]) {
  return paginationParams(creators, "board").map(({ id, page }) => ({ slug: id, page }));
}

export function verticalPaginationParams(creators: Creator[]) {
  return paginationParams(creators, "vertical").map(({ id, page }) => ({ vertical: id, page }));
}

export function rankingOverflowPaths(creators: Creator[]) {
  return publishedRankings(creators).flatMap(ranking => {
    const pages = rankingPageCount(ranking.creators.length);
    return Array.from({ length: Math.max(0, pages - 1) }, (_, index) => rankingPagePath(ranking.path, index + 2));
  });
}

export function loadBoardPage(creators: Creator[], slug: string, rawPage: string) {
  const page = parseRankingPage(rawPage);
  const ranking = rankingBySlug(creators, slug);
  if (!ranking || page == null || page > rankingPageCount(ranking.creators.length)) return null;
  return { ranking, page };
}

export function loadVerticalPage(creators: Creator[], vertical: string, rawPage: string) {
  if (!isVertical(vertical)) return null;
  const page = parseRankingPage(rawPage);
  const ranking = verticalRanking(creators, vertical);
  if (!ranking || page == null || page > rankingPageCount(ranking.creators.length)) return null;
  return { ranking, page, vertical };
}

export function rankingsForCreator(creators: Creator[], creator: Creator) {
  return publishedRankings(creators).flatMap(ranking => {
    const place = ranking.creators.findIndex(person => person.x_user_id === creator.x_user_id);
    if (place < 0) return [];
    const rank = place + 1;
    return [{ ranking, place: rank, path: rankingPagePath(ranking.path, pageForPlace(rank)) }];
  });
}

export function rankingsCrumbs(): Crumb[] {
  return [
    { name: "首页", path: "/" },
    { name: rankingsTitle, path: rankingsPath },
  ];
}

export function rankingCrumbs(ranking: Pick<PublishedRanking, "title" | "path">, page = 1): Crumb[] {
  return rankingPageCrumbs([
    { name: "首页", path: "/" },
    { name: rankingsTitle, path: rankingsPath },
    { name: ranking.title, path: ranking.path },
  ], ranking.path, page);
}

const websiteRef = { "@type": "WebSite", name: siteTitle, url: siteOrigin };

function itemList(items: { name: string; path: string }[], order?: string, start = 1) {
  return {
    "@type": "ItemList",
    numberOfItems: items.length,
    ...(order ? { itemListOrder: order } : {}),
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: start + index,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}

export function rankingsIndexJsonLd(rankings: PublishedRanking[]) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: rankingsTitle,
    url: absoluteUrl(rankingsPath),
    description: rankingsDescription,
    inLanguage: "zh-CN",
    isPartOf: { ...websiteRef },
    mainEntity: itemList(rankings.map(ranking => ({ name: ranking.title, path: ranking.path }))),
  };
}

export function rankingJsonLd(ranking: PublishedRanking, page = 1) {
  const slice = sliceRanking(ranking.creators, page);
  if (!slice) throw new Error(`排行页超出范围 · ${ranking.path} · ${page}`);
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: rankingPageTitle(ranking, page),
    url: absoluteUrl(rankingPagePath(ranking.path, page)),
    description: rankingPageDescription(ranking, page),
    inLanguage: "zh-CN",
    isPartOf: { ...websiteRef },
    mainEntity: itemList(
      slice.items.map(creator => ({ name: creator.display_name, path: creatorPath(creator) })),
      "https://schema.org/ItemListOrderDescending",
      slice.from,
    ),
  };
}

export function rankingsLlmsSection(creators: Creator[]) {
  const rankings = publishedRankings(creators);
  const lines = [
    "",
    "## 排行榜",
    "",
    `- [${rankingsTitle}](${absoluteUrl(rankingsPath)}): ${rankingsDescription}`,
    ...rankings.map(ranking => {
      const pages = rankingPageCount(ranking.creators.length);
      const paging = pages > 1 ? `，每页 ${rankingPageSize} 人，共 ${pages} 页` : "";
      return `- [${ranking.title}](${absoluteUrl(ranking.path)}): ${ranking.creators.length} 位，按粉丝快照从高到低${paging}`;
    }),
    "",
  ];
  return lines.join("\n");
}
