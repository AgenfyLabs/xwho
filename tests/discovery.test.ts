import { expect, it } from "vitest";
import { publicCreators } from "../src/lib/data";
import {
  breadcrumbJsonLd, categoryJsonLd, categoryPath, creatorCrumbs, creatorsInVertical, homeCategoryLinks,
  llmsText, organizationJsonLd, similarCreators, tracksJsonLd,
} from "../src/lib/discovery";
import { creatorPath, serializeJsonLd, siteDescription, siteTitle, websiteJsonLd } from "../src/lib/seo";
import { verticals } from "../src/lib/schema";
import { board, creator } from "./fixtures";

const snapshot = { count: 10, as_of: "2026-02-01T10:00:00+08:00" };

it("每位公开创作者都能从首页经赛道页两次点击到达，隐藏档案不出现", () => {
  const creators = [
    creator({ x_user_id: "1", handle: "Alpha", vertical: "ai-dev" }),
    creator({ x_user_id: "2", handle: "Beta", vertical: "crypto" }),
    creator({ x_user_id: "3", handle: "Hidden", vertical: "ai-dev", claim_status: "hidden" }),
  ];
  const home = homeCategoryLinks();
  expect(home).toEqual(verticals.map(vertical => `/tracks/${vertical}`));
  for (const person of publicCreators(creators)) {
    expect(home).toContain(categoryPath(person.vertical));
    expect(creatorsInVertical(creators, person.vertical).map(creatorPath)).toContain(creatorPath(person));
  }
  expect(creatorsInVertical(creators, "ai-dev").map(person => person.handle)).toEqual(["Alpha"]);
});

it("相似创作者优先同赛道和相同标签，数量在 4 到 8 之间，并排除本人与隐藏档案", () => {
  const current = creator({ x_user_id: "1", handle: "me", vertical: "media", role_tags: ["researcher"], sub_tags: ["样本分类"] });
  const boosted = creator({
    x_user_id: "2", handle: "boost", vertical: "media", role_tags: ["researcher"], sub_tags: ["样本分类"],
    followers_snapshot: { ...snapshot, count: 1 },
  });
  const plain = creator({
    x_user_id: "3", handle: "plain", vertical: "media", role_tags: [], sub_tags: [],
    followers_snapshot: { ...snapshot, count: 999 },
  });
  expect(similarCreators([current, boosted, plain], current).map(person => person.handle)).toEqual(["boost", "plain"]);

  const crowd = Array.from({ length: 9 }, (_, index) => creator({
    x_user_id: String(index + 10), handle: `m${index}`, vertical: "media", role_tags: [], sub_tags: [],
  }));
  const hidden = creator({ x_user_id: "30", handle: "hidden_one", vertical: "media", claim_status: "hidden" });
  const unrelated = creator({ x_user_id: "31", handle: "other", vertical: "finance", role_tags: [], sub_tags: ["无关"] });
  const picked = similarCreators([current, ...crowd, hidden, unrelated], current);
  expect(picked).toHaveLength(8);
  expect(picked.map(person => person.handle)).not.toContain("me");
  expect(picked.map(person => person.handle)).not.toContain("hidden_one");
  expect(picked.map(person => person.handle)).not.toContain("other");

  const cross = Array.from({ length: 4 }, (_, index) => creator({
    x_user_id: String(40 + index), handle: `cross${index}`, vertical: "crypto", role_tags: ["researcher"], sub_tags: [],
  }));
  const filled = similarCreators([current, plain, ...cross], current);
  expect(filled).toHaveLength(5);
  expect(filled[0].handle).toBe("plain");
});

it("面包屑是首页、赛道、创作者，并输出 BreadcrumbList", () => {
  const crumbs = creatorCrumbs(creator({ display_name: "Livid", handle: "Livid", vertical: "ai-dev" }));
  expect(crumbs.map(item => item.name)).toEqual(["首页", "AI 开发者", "Livid"]);
  const data = breadcrumbJsonLd(crumbs);
  expect(data["@type"]).toBe("BreadcrumbList");
  expect(data.itemListElement.map(item => item.position)).toEqual([1, 2, 3]);
  expect(data.itemListElement.map(item => item.item)).toEqual([
    "https://xwho.org/",
    "https://xwho.org/tracks/ai-dev",
    "https://xwho.org/creator/Livid",
  ]);
});

it("首页 Organization 与已有 WebSite 分开，分类页使用 CollectionPage 和 ItemList", () => {
  expect(websiteJsonLd()).toMatchObject({ "@type": "WebSite", name: siteTitle });
  expect(organizationJsonLd()).toMatchObject({
    "@type": "Organization", name: siteTitle, url: "https://xwho.org",
    sameAs: ["https://github.com/AgenfyLabs/xwho"],
  });
  const tracks = tracksJsonLd();
  expect(tracks["@type"]).toBe("CollectionPage");
  expect(tracks.mainEntity["@type"]).toBe("ItemList");
  expect(tracks.mainEntity.numberOfItems).toBe(verticals.length);

  const shown = creator({
    x_user_id: "5", handle: "Shown", display_name: "可见<script>", vertical: "geo",
    claim_status: "claimed", service_board: board,
  });
  const hidden = creator({ x_user_id: "6", handle: "Nope", vertical: "geo", claim_status: "hidden" });
  const json = serializeJsonLd(categoryJsonLd("geo", [shown, hidden]));
  const data = JSON.parse(json);
  expect(data["@type"]).toBe("CollectionPage");
  expect(data.mainEntity["@type"]).toBe("ItemList");
  expect(data.mainEntity.numberOfItems).toBe(1);
  expect(data.mainEntity.itemListElement[0].url).toBe("https://xwho.org/creator/Shown");
  expect(json).not.toContain("fixture@example.invalid");
  expect(json).not.toContain("Nope");
  expect(json).not.toContain("<script>");
  expect(json).toContain("\\u003cscript>");
});

it("llms.txt 包含站点简介、分类和代表性链接，不包含隐藏档案或留言板", () => {
  const shown = creator({
    x_user_id: "5", handle: "Shown", display_name: "可见", vertical: "geo", summary: "公开简介",
    claim_status: "claimed", service_board: board,
  });
  const hidden = creator({ x_user_id: "6", handle: "Nope", vertical: "geo", claim_status: "hidden", summary: "隐藏简介" });
  const text = llmsText([shown, hidden]);
  expect(text.startsWith("# XWho\n")).toBe(true);
  expect(text).toContain(`> ${siteDescription}`);
  expect(text).toContain("[GEO](https://xwho.org/tracks/geo): 1 位公开创作者");
  expect(text).toContain("[可见（@Shown）](https://xwho.org/creator/Shown): 公开简介");
  expect(text).toContain("https://xwho.org/events");
  expect(text).not.toContain("Nope");
  expect(text).not.toContain("隐藏简介");
  expect(text).not.toContain("fixture@example.invalid");
  expect(text).not.toContain("/dashboard");
});
