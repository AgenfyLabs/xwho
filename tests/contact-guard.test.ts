import { describe, expect, it } from "vitest";
import { contactViolations, referralUrl } from "../scripts/validate-data";
import { board, creator, work } from "./fixtures";

describe("未认领档案不得公开联系方式或邀请链接", () => {
  it("拦住微信、QQ、邮箱、电话和私信引流", () => {
    for (const summary of [
      "合作请加 wx: abc",
      "QQ群：123456",
      "客服联系QQ：2304588786",
      "邮箱 hello@example.com",
      "电话 13800138000",
      "欢迎+v: name",
      "请私信合作",
      "telegram: @name",
    ]) {
      expect(contactViolations(creator({ summary })).length, summary).toBeGreaterThan(0);
    }
  });
  it("拦住邀请参数、Ave 注册页、/r/ 邀请路径和 Telegram 入口", () => {
    for (const url of [
      "https://share.ave.ai?lang=zh-cn&code=1",
      "https://example.com/join?inviteCode=abc",
      "https://example.com/?aff=1",
      "https://example.com/?ref=1",
      "https://gmgn.ai/r/abc",
      "https://t.me/example",
    ]) {
      expect(referralUrl(url), url).toBe(true);
      expect(contactViolations(creator({ verified_works: [{ ...work, url }] })).length, url).toBeGreaterThan(0);
    }
    expect(contactViolations(creator({ summary: "注册ave用我链接", verified_works: [] })).length).toBeGreaterThan(0);
  });
  it("保留作品站点、否认私信、行情代码和已认领留言板", () => {
    expect(referralUrl("https://example.org/work")).toBe(false);
    expect(referralUrl("https://mp.weixin.qq.com/s/abc")).toBe(false);
    expect(referralUrl("https://ftqq.com")).toBe(false);
    expect(contactViolations(creator({
      summary: "不会私信，也不会私聊。指数 QQQ。微信公众号：示例。注册用户 120 万。",
      verified_works: [{ ...work, title: "mp.weixin.qq.com", url: "https://mp.weixin.qq.com/s/abc" }],
    }))).toEqual([]);
    expect(contactViolations(creator({ display_name: "Adam@Greeks.live", summary: "期权交易" }))).toEqual([]);
    expect(contactViolations(creator({
      claim_status: "claimed", service_board: board, summary: "wx: owner",
    }))).toEqual([]);
  });
});
