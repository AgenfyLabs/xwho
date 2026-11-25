import { expect, it } from "vitest";
import { board, creator } from "./fixtures";
import {
  creatorDescription, creatorPath, creatorProfileJsonLd, creatorTitle, dashboardDescription,
  eventsDescription, eventsJsonLd, indexableMetadata, privateMetadata, serializeJsonLd,
  siteDescription, siteOrigin, siteTitle, websiteJsonLd,
} from "../src/lib/seo";

it("创作者标题和描述包含姓名、用户名、赛道与简介，且彼此不同", () => {
  const named = creator({ display_name: "Livid", handle: "Livid", vertical: "ai-dev", role_tags: [], summary: "AI / 开发方向的中文 X 创作者。" });
  expect(creatorTitle(named)).toBe("Livid（@Livid）· AI 开发者");
  expect(creatorDescription(named)).toBe("Livid（@Livid），AI 开发者。AI / 开发方向的中文 X 创作者。");
  expect(creatorTitle(creator())).toBe("测试夹具（@xwho_fixture）· 媒体人 · 研究员");
  const sameBio = creator({ x_user_id: "2", handle: "other_name", summary: named.summary });
  expect(creatorDescription(sameBio)).not.toBe(creatorDescription(named));
  expect(creatorPath(named)).toBe("/creator/Livid");
});

it("超长简介按字符截断，并压平空白", () => {
  const description = creatorDescription(creator({ summary: `第一行\n${"测".repeat(300)}` }));
  expect(Array.from(description)).toHaveLength(160);
  expect(description.endsWith("…")).toBe(true);
  expect(description).toContain("第一行 测");
  expect(description.startsWith("测试夹具（@xwho_fixture），媒体人，研究员。")).toBe(true);
});

it("可索引页面带有指向自身的规范链接，事件页描述不与首页重复", () => {
  expect(eventsDescription).not.toBe(siteDescription);
  const home = indexableMetadata({ path: "/" });
  const events = indexableMetadata({ title: "中推今日大事件", description: eventsDescription, path: "/events" });
  expect(home.alternates).toMatchObject({ canonical: "/" });
  expect(home.description).toBe(siteDescription);
  expect(events.alternates).toMatchObject({ canonical: "/events" });
  expect(events.description).toBe(eventsDescription);
  expect(events.openGraph).toMatchObject({ type: "website", url: "/events", description: eventsDescription });
  const profile = indexableMetadata({ title: "Livid（@Livid）· AI 开发者", description: "简介", path: "/creator/Livid", type: "profile", username: "Livid" });
  expect(profile.openGraph).toMatchObject({ type: "profile", url: "/creator/Livid", username: "Livid" });
  expect(profile.twitter).toMatchObject({ card: "summary", description: "简介" });
});

it("本人名片不提供规范链接，并标记为 noindex", () => {
  const metadata = privateMetadata("我的名片", dashboardDescription);
  expect(metadata.robots).toEqual({ index: false });
  expect(metadata.alternates).toBeUndefined();
  expect(metadata.description).not.toBe(siteDescription);
});

it("结构化数据使用正式域名，保留数字 ID 精度，且不写入留言板联系方式", () => {
  expect(websiteJsonLd()).toMatchObject({ "@type": "WebSite", name: siteTitle, url: siteOrigin });
  expect(eventsJsonLd()).toMatchObject({ "@type": "CollectionPage", url: `${siteOrigin}/events`, description: eventsDescription });
  const snowflake = "1493519370664177667";
  const profile = creator({
    x_user_id: snowflake, handle: "Livid", display_name: "Livid", vertical: "ai-dev", role_tags: [],
    sub_tags: ["AI"], claim_status: "claimed", service_board: board, summary: "简介 <script>",
  });
  const json = serializeJsonLd(creatorProfileJsonLd(profile));
  const data = JSON.parse(json);
  expect(data["@type"]).toBe("ProfilePage");
  expect(data.mainEntity["@type"]).toBe("Person");
  expect(data.mainEntity.identifier.value).toBe(snowflake);
  expect(data.mainEntity.sameAs).toEqual(["https://x.com/Livid"]);
  expect(data.mainEntity.knowsAbout).toEqual(["AI"]);
  expect(data.url).toBe(`${siteOrigin}/creator/Livid`);
  expect(json).toContain(`"value":"${snowflake}"`);
  expect(json).not.toContain("fixture@example.invalid");
  expect(json).not.toContain("<script>");
  expect(json).toContain("\\u003cscript>");
});
