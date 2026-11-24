import { describe, expect, it } from "vitest";
import { board, creator, work } from "./fixtures";
import {
  clipText, crawlerAgents, creatorDescription, creatorSameAs, creatorTitle, llmsFullText, llmsText, publicPaths, siteOrigin,
} from "../src/lib/seo";

describe("发现元数据", () => {
  const dotey = creator({
    handle: "dotey", display_name: "宝玉", vertical: "media", sub_tags: ["AI 资讯解读", "海外内容翻译"],
    summary: "长期把海外 AI 论文、长文、产品动态翻译解读成中文。",
    verified_works: [
      { ...work, title: "baoyu-skills", url: "https://github.com/JimLiu/baoyu-skills" },
      { title: "个人站 baoyu.io", description: "X 简介所挂站点。", url: "https://baoyu.io/" },
      { title: "项目主页", description: "本人 X 资料中公开的外链（个人站 / 项目站）", url: "https://example.org/project" },
    ],
  });

  it("用姓名、用户名、标签和代表作组成标题，不超出长度", () => {
    expect(creatorTitle(dotey)).toBe("宝玉 @dotey · AI 资讯解读、baoyu-skills");
    const long = creator({ sub_tags: ["标签".repeat(40)], verified_works: [{ ...work, title: "作品".repeat(40) }] });
    expect(Array.from(creatorTitle(long)).length).toBeLessThanOrEqual(70);
    expect(creatorTitle(creator({ sub_tags: [], verified_works: [] }))).toBe("测试夹具 @xwho_fixture");
  });

  it("描述只复述档案中的赛道、简介和代表作", () => {
    const description = creatorDescription(dotey);
    expect(description).toContain("宝玉（@dotey），媒体人。");
    expect(description).toContain(dotey.summary);
    expect(description).toContain("代表作：baoyu-skills。");
    expect(description).not.toContain("fixture@");
    expect(Array.from(clipText("句".repeat(200))).length).toBeLessThanOrEqual(160);
  });

  it("sameAs 使用 X 主页和明确的个人站，不把项目外链当成本人", () => {
    expect(creatorSameAs(dotey)).toEqual(["https://x.com/dotey", "https://baoyu.io"]);
    const claimed = creator({
      claim_status: "claimed",
      service_board: { ...board, contact_channels: [{ label: "个人网站", value: "https://example.org/me" }, { label: "邮箱", value: "a@example.com" }] },
    });
    expect(creatorSameAs(claimed)).toEqual(["https://x.com/xwho_fixture", "https://example.org/me"]);
  });

  it("站点地图和 llms 文本排除隐藏档案", () => {
    const hidden = creator({ x_user_id: "3", handle: "hidden_test", display_name: "隐藏字串", claim_status: "hidden" });
    const paths = publicPaths([dotey, hidden]);
    expect(paths).toContain("/creator/dotey");
    expect(paths).toContain("/tracks/ai-dev");
    expect(paths).not.toContain("/creator/hidden_test");
    const text = `${llmsText([dotey, hidden])}\n${llmsFullText([dotey, hidden])}`;
    expect(text).toContain(`${siteOrigin()}/creator/dotey`);
    expect(text).toContain("baoyu-skills");
    expect(text).not.toContain("hidden_test");
    expect(text).not.toContain("隐藏字串");
    for (const agent of ["Googlebot", "Bingbot", "GPTBot", "ChatGPT-User", "PerplexityBot", "ClaudeBot", "GrokBot", "xAI-SearchBot"]) {
      expect(crawlerAgents).toContain(agent);
    }
  });
});
