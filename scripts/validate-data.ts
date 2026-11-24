import path from "node:path";
import { pathToFileURL } from "node:url";
import { readDataset } from "../src/lib/data";
import type { Creator } from "../src/lib/schema";

const INVITE_PARAM = /^(?:ref|refs|invite|invitecode|code|aff|affiliate|referral|join|via)$/i;
const TELEGRAM_HOST = /^(?:t\.me|telegram\.me|telegram\.org|conso\.tg)$/i;
const WECHAT = /微信(?!公众号|小程序|文章)|(?:wx|vx)\s*[:：]|(?:加|\+|＋)\s*[vV]\s*[:：]/i;
const QQ = /(?<![A-Za-z])QQ(?!Q)\s*(?:群|号)?\s*[:：]\s*\d|客服[^\n]{0,6}QQ/i;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE = /(?<!\d)1[3-9]\d{9}(?!\d)/;
const TELEGRAM = /telegram\s*[:：@]|t\.me\/|\bTg\s*[:：]|个人\s*telegram|telegram\s*交流/i;
const FUNNEL = /(?<!不会主动|不处理|不会|不主动)私信|欢迎私聊|(?<!不会)私聊|付费咨询|付费答疑|1V1咨询|咨询沟通|业务\s*[&＆]\s*咨询|答疑社群|链接\s*[&＆]+\s*咨询/;
const PROMO = /用我链接|注册入口|注册\s*ave|打狗就用\s*ave/i;

export function referralUrl(url: string) {
  let parsed: URL;
  try { parsed = new URL(url); }
  catch { return false; }
  const host = parsed.hostname.replace(/^www\./i, "");
  if (host === "share.ave.ai" || TELEGRAM_HOST.test(host)) return true;
  for (const key of parsed.searchParams.keys()) if (INVITE_PARAM.test(key)) return true;
  const [first, second] = parsed.pathname.split("/").filter(Boolean);
  return first?.toLowerCase() === "r" && Boolean(second);
}

function editorial(creator: Creator) {
  return [
    creator.summary,
    ...creator.sub_tags,
    ...creator.verified_works.flatMap(work => [work.title, work.description]),
    creator.quote?.text ?? "",
  ].join("\n");
}

export function contactViolations(creator: Creator) {
  if (creator.claim_status !== "unclaimed") return [];
  const body = editorial(creator);
  const visible = `${creator.display_name}\n${body}`;
  const issues: string[] = [];
  if (WECHAT.test(visible)) issues.push("公开文本含有微信或 vx/wx 联系方式");
  if (QQ.test(visible)) issues.push("公开文本含有 QQ 号或 QQ 群");
  if (EMAIL.test(body)) issues.push("公开文本含有邮箱");
  if (PHONE.test(body)) issues.push("公开文本含有电话");
  if (TELEGRAM.test(visible)) issues.push("公开文本含有 Telegram 或 TG 号");
  if (FUNNEL.test(visible)) issues.push("公开文本含有私信或付费咨询引流");
  if (PROMO.test(visible)) issues.push("公开文本含有注册或邀请推广语");
  for (const work of creator.verified_works) {
    if (referralUrl(work.url)) issues.push(`代表作含邀请或注册链接 ${work.url}`);
  }
  return issues;
}

export function assertNoUnclaimedContact(creators: Creator[]) {
  const lines = creators.flatMap(creator => contactViolations(creator).map(issue => `@${creator.handle} · ${issue}`));
  if (lines.length) throw new Error(`未认领档案不能公开联系方式或邀请链接\n${lines.join("\n")}`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const { creators, milestones } = readDataset();
    assertNoUnclaimedContact(creators);
    console.log(`数据校验通过 · ${creators.length} 份档案，${milestones.length} 条事件`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
