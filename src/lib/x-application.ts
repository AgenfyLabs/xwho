import { z } from "zod";
import { verticals, type Vertical } from "./schema";

export const XApplicationSchema = z.strictObject({
  summary: z.string().max(400),
  vertical: z.enum(verticals).optional(),
  pinnedPost: z.string().regex(/^https:\/\/x\.com\/[A-Za-z0-9_]{1,15}\/status\/\d{1,20}$/).optional(),
});
export type XApplication = z.infer<typeof XApplicationSchema>;

const categories: Record<Vertical, RegExp> = {
  "ai-dev": /AI\s*(?:独立\s*)?(?:开发|工程|编程)|人工智能(?:开发|工程)|大模型(?:开发|工程)|\b(?:AI|ML)\s+(?:developer|engineer)\b/i,
  geo: /\bGEO\b|生成式引擎优化/i,
  media: /媒体|记者|编辑|播客|\b(?:journalist|editor|podcaster)\b/i,
  crypto: /区块链|加密货币|币圈|\b(?:web3|crypto|blockchain)\b/i,
  finance: /财经|投资|金融|\b(?:investor|finance)\b/i,
  general: /创业|创始人|\bfounder\b/i,
};

// Stop at the first contact or sales clause, including any unlabelled continuation.
const privateDetails = [
  /[@✉☎📧📞📱💰$¥€£]|https?:\/\/|www\.|[a-z0-9-]+\.[a-z]{2,}\b|\d(?:[\s().-]*\d){6,}/i,
  /[微薇][信訊]|[加➕]\s*[v微]|邮箱|郵箱|电邮|電郵|电话|電話|手机|手機|私[信訊聊]|联系|聯絡|聯繫|商务|商務|合作|咨询|諮詢|接[单單案]|报价|報價|收费|收費|预约|預約|广告|廣告|价格|價格|赞助|贊助|带单|返佣|\d\s*(?:元|块|塊|円)/i,
  /wxid_|v信|加群|\b(?:e-?mail|contact|wechat|weixin|wx|vx|qq|tg|telegram|whatsapp|discord|dms?|hire|hiring|collabs?|rates?|booking|consulting|sponsor(?:ship)?|pricing|usd|rmb|cny)\b/i,
];
function bioSummary(value: unknown) {
  if (typeof value !== "string") return "";
  let safe = "";
  for (const clause of value.replace(/\p{Cf}/gu, "").split(/(?<=[\n|｜;；。！!，,•])/u)) {
    const normalized = clause.normalize("NFKC");
    if (privateDetails.some(pattern => pattern.test(normalized))) break;
    safe += clause;
  }
  const summary = Array.from(safe.replace(/[\s|｜;；，,•]+$/u, "").replace(/\s+/gu, " ").trim()).slice(0, 160).join("");
  const hasMetrics = /\d/.test(summary) && /\d\s*[+%万萬亿億]|粉丝|粉絲|收入|营收|用户|用戶|followers|revenue|users/i.test(summary);
  return hasMetrics ? `自述：${summary}` : summary;
}

export function xApplication(user: { description?: unknown; protected?: unknown; pinned_tweet_id?: unknown }, username: string): XApplication {
  if (user.protected !== false) return { summary: "" };
  const summary = bioSummary(user.description);
  const matches = verticals.filter(vertical => categories[vertical].test(summary));
  const pinned = user.pinned_tweet_id;
  return {
    summary,
    ...(matches.length === 1 ? { vertical: matches[0] } : {}),
    ...(typeof pinned === "string" && /^\d{1,20}$/.test(pinned) ? { pinnedPost: `https://x.com/${username}/status/${pinned}` } : {}),
  };
}
