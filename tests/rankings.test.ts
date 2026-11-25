import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { llmsBody } from "../src/app/llms.txt/route";
import { readDataset } from "../src/lib/data";
import { breadcrumbJsonLd, categoryPath, llmsText, tracksDescription } from "../src/lib/discovery";
import {
  boardRankingParams, minRankingSize, publishedRankings, rankCreators, rankingBasis, rankingBySlug,
  rankingCrumbs, rankingJsonLd, rankingsCrumbs, rankingsDescription, rankingsForCreator, rankingsIndexJsonLd,
  rankingsLlmsSection, rankingsPath, rankingsTitle,
} from "../src/lib/rankings";
import { eventsDescription, serializeJsonLd, siteDescription } from "../src/lib/seo";
import { verticals } from "../src/lib/schema";
import { board, creator } from "./fixtures";

const snapshot = { count: 10, as_of: "2026-02-01T10:00:00+08:00" };

function people(count: number, fields: Parameters<typeof creator>[0] = {}) {
  return Array.from({ length: count }, (_, index) => creator({
    x_user_id: String(index + 1),
    handle: `u${String(index).padStart(2, "0")}`,
    display_name: `创作者${index}`,
    followers_snapshot: { ...snapshot, count: index },
    ...fields,
  }));
}

it("排名按粉丝快照从高到低，平局时深度核验优先，再按用户名，并排除隐藏档案", () => {
  const hidden = creator({
    x_user_id: "9", handle: "hidden_one", claim_status: "hidden", display_name: "隐藏",
    followers_snapshot: { ...snapshot, count: 999 }, service_board: board,
  });
  const ranked = rankCreators([
    creator({ x_user_id: "1", handle: "low", verification_tier: "deep-verified", followers_snapshot: { ...snapshot, count: 5 } }),
    creator({ x_user_id: "2", handle: "mid_deep", verification_tier: "deep-verified", followers_snapshot: { ...snapshot, count: 10 } }),
    creator({ x_user_id: "3", handle: "mid_api", followers_snapshot: { ...snapshot, count: 10 } }),
    creator({ x_user_id: "4", handle: "mid_b", followers_snapshot: { ...snapshot, count: 10 } }),
    creator({ x_user_id: "5", handle: "high", followers_snapshot: { ...snapshot, count: 50 } }),
    creator({ x_user_id: "6", handle: "none" }),
    hidden,
  ]);
  expect(ranked.map(person => person.handle)).toEqual(["high", "mid_deep", "mid_api", "mid_b", "low", "none"]);
});

it("少于 10 人的分类不建榜，满 10 人后才出现在索引、参数和 llms", () => {
  const nine = people(9, { role_tags: ["founder"], vertical: "finance" });
  expect(publishedRankings(nine)).toEqual([]);
  expect(boardRankingParams(nine)).toEqual([]);
  expect(rankingsLlmsSection(nine)).toContain(`](https://xwho.org${rankingsPath})`);
  expect(rankingsLlmsSection(nine)).not.toContain("/rankings/followers");
  expect(rankingsLlmsSection(nine)).not.toContain("/rankings/founders");

  const ten = people(10, { role_tags: ["founder"], vertical: "finance", sub_tags: ["美股"] });
  const ids = publishedRankings(ten).map(ranking => ranking.id);
  expect(ids).toEqual(["followers", "finance", "founders", "us-stocks"]);
  expect(boardRankingParams(ten).map(item => item.slug)).toEqual(["followers", "founders", "us-stocks"]);
  expect(rankingBySlug(ten, "ai-dev")).toBeUndefined();
  expect(rankingBySlug(ten, "founders")?.path).toBe("/rankings/founders");
});

it("排行页有独立标题、说明、引言和排名依据，并输出面包屑与 ItemList", () => {
  const named = creator({
    x_user_id: "1", handle: "Shown", display_name: "可见<script>", vertical: "crypto", role_tags: ["founder"],
    followers_snapshot: { ...snapshot, count: 3 }, claim_status: "claimed", service_board: board,
  });
  const roster = [named, ...people(10, { role_tags: ["founder"], vertical: "crypto" }).filter(person => person.x_user_id !== "1")];
  const ranking = rankingBySlug(roster, "founders");
  expect(ranking).toBeDefined();
  if (!ranking) return;
  expect(ranking.title).toBe("创始人 X 账号排行");
  expect(ranking.description).not.toBe(siteDescription);
  expect(ranking.description).toContain("10 位");
  expect(ranking.description.length).toBeLessThanOrEqual(160);
  expect(ranking.intro).toContain("10");
  expect(ranking.basis).toBe(rankingBasis);
  expect(ranking.basis).toContain("粉丝快照");
  expect(ranking.basis).toContain("不计算涨粉");
  expect(ranking.creators.map(person => person.handle)).not.toContain("hidden_one");
  expect(ranking.creators[0]?.handle).toBe("u09");

  const json = serializeJsonLd(rankingJsonLd(ranking));
  const data = JSON.parse(json);
  expect(data["@type"]).toBe("CollectionPage");
  expect(data.url).toBe("https://xwho.org/rankings/founders");
  expect(data.mainEntity["@type"]).toBe("ItemList");
  expect(data.mainEntity.itemListOrder).toBe("https://schema.org/ItemListOrderDescending");
  expect(data.mainEntity.numberOfItems).toBe(10);
  expect(data.mainEntity.itemListElement.map((item: { position: number }) => item.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  expect(data.mainEntity.itemListElement[0].url).toBe("https://xwho.org/creator/u09");
  expect(json).not.toContain("fixture@example.invalid");
  expect(json).not.toContain("<script>");
  expect(json).toContain("\\u003cscript>");

  const crumbs = rankingCrumbs(ranking);
  const breadcrumb = breadcrumbJsonLd(crumbs);
  expect(breadcrumb["@type"]).toBe("BreadcrumbList");
  expect(breadcrumb.itemListElement.map(item => item.item)).toEqual([
    "https://xwho.org/",
    "https://xwho.org/rankings",
    "https://xwho.org/rankings/founders",
  ]);
  const index = rankingsIndexJsonLd([ranking]);
  expect(index.mainEntity["@type"]).toBe("ItemList");
  expect(index.url).toBe("https://xwho.org/rankings");
  expect(rankingsCrumbs().map(item => item.path)).toEqual(["/", rankingsPath]);
});

it("创作者只链到自己入选的榜，名次按粉丝快照计算", () => {
  const roster = people(10, { role_tags: ["investor"], vertical: "media" });
  const top = roster[9];
  expect(top).toBeDefined();
  if (!top) return;
  const placed = rankingsForCreator(roster, top);
  expect(placed.map(item => item.ranking.id)).toEqual(["followers", "media", "investors"]);
  expect(placed.every(item => item.place === 1)).toBe(true);
  const outsider = creator({ x_user_id: "99", handle: "outsider", vertical: "ai-dev", role_tags: [] });
  expect(rankingsForCreator(roster, outsider)).toEqual([]);
});

it("llms 排行榜一节接在原有简介之后，不写入隐藏档案或留言板", () => {
  const hidden = creator({
    x_user_id: "30", handle: "Nope", claim_status: "hidden", summary: "隐藏简介", service_board: board,
  });
  const roster = [...people(10), hidden];
  const text = llmsBody(roster);
  expect(text.startsWith(llmsText(roster))).toBe(true);
  expect(text).toContain(`## 排行榜`);
  expect(text).toContain(`[${rankingsTitle}](https://xwho.org/rankings)`);
  expect(text).toContain("[中文 X 创作者排行](https://xwho.org/rankings/followers): 10 位，按粉丝快照从高到低");
  expect(text).not.toContain("Nope");
  expect(text).not.toContain("隐藏简介");
  expect(text).not.toContain("fixture@example.invalid");
  expect(text).not.toContain("/dashboard");
});

it("现有档案恰好生成 10 到 15 个满员榜，赛道榜沿用 /tracks", () => {
  const rankings = publishedRankings(readDataset().creators);
  expect(rankings.map(ranking => ranking.id)).toEqual([
    "followers",
    "ai-dev", "geo", "media", "crypto", "finance", "general",
    "founders", "indie-developers", "open-source", "investors", "ex-bigtech",
    "going-global", "us-stocks", "ai-agents",
  ]);
  expect(rankings.length).toBeGreaterThanOrEqual(10);
  expect(rankings.length).toBeLessThanOrEqual(15);
  const titles = rankings.map(ranking => ranking.title);
  const descriptions = rankings.map(ranking => ranking.description);
  expect(new Set(titles).size).toBe(titles.length);
  expect(new Set(descriptions).size).toBe(descriptions.length);
  expect(descriptions).not.toContain(siteDescription);
  expect(descriptions).not.toContain(eventsDescription);
  expect(descriptions).not.toContain(tracksDescription);
  expect(rankingsDescription.length).toBeLessThanOrEqual(160);
  for (const ranking of rankings) {
    expect(ranking.creators.length).toBeGreaterThanOrEqual(minRankingSize);
    expect(ranking.creators.some(person => person.claim_status === "hidden")).toBe(false);
    expect(ranking.description.length).toBeLessThanOrEqual(160);
    expect(ranking.intro.length).toBeGreaterThan(40);
    const counts = ranking.creators.map(person => person.followers_snapshot?.count ?? -1);
    expect(counts).toEqual(counts.slice().sort((a, b) => b - a));
    expect(ranking.path.startsWith("/rankings/") || ranking.path.startsWith("/tracks/")).toBe(true);
  }
  expect(rankings.find(ranking => ranking.id === "crypto")).toMatchObject({
    path: categoryPath("crypto"), title: "加密货币 KOL 排行",
  });
  expect(rankings.find(ranking => ranking.id === "ai-dev")?.path).toBe("/tracks/ai-dev");
  const slugs = boardRankingParams(readDataset().creators).map(item => item.slug);
  for (const vertical of verticals) expect(slugs).not.toContain(vertical);
  expect(rankingBySlug(readDataset().creators, "ai-dev")).toBeUndefined();
});

it("创作者页使用一小时再验证，便于 CDN 缓存", () => {
  const source = readFileSync(new URL("../src/app/creator/[handle]/page.tsx", import.meta.url), "utf8");
  expect(source).toMatch(/export const revalidate = 3600/);
  expect(source).toContain("generateStaticParams");
});
