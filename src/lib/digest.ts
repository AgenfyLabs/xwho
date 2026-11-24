import type { Creator, EventType, Milestone, Vertical } from "./schema";

const shanghai = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});
export function shanghaiDay(value: string | Date) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Date(new Date(value).getTime() + 8 * 3_600_000).toISOString().slice(0, 10);
}
export function shanghaiStamp(now = new Date()) {
  return new Date(now.getTime() + 8 * 3_600_000).toISOString().slice(0, 19) + "+08:00";
}
export function displayTime(value: string) {
  return `${shanghai.format(new Date(value))} UTC+8`;
}
export type DigestEntry = Milestone & { handle: string; display_name: string; vertical: Vertical };
export function publicEvents(creators: Creator[], events: Milestone[]): DigestEntry[] {
  const authors = new Map(creators.filter(c => c.claim_status !== "hidden").map(c => [c.x_user_id, c]));
  return events.flatMap(event => {
    const c = authors.get(event.x_user_id);
    return c ? [{ ...event, handle: c.handle, display_name: c.display_name, vertical: c.vertical }] : [];
  });
}
export function groupEvents(entries: DigestEntry[], vertical?: Vertical, type?: EventType) {
  const groups = new Map<string, DigestEntry[]>();
  for (const entry of entries) {
    if ((vertical && entry.vertical !== vertical) || (type && entry.event_type !== type)) continue;
    const day = shanghaiDay(entry.event_date);
    const group = groups.get(day) ?? [];
    group.push(entry);
    groups.set(day, group);
  }
  return [...groups].sort(([a], [b]) => b.localeCompare(a))
    .map(([day, events]) => ({ day, events: events.sort((a, b) => a.id.localeCompare(b.id)) }));
}
export function formatDraft(day: string, events: DigestEntry[]) {
  const oneLine = (value: string) => value.replace(/\s+/gu, " ").trim();
  return [
    `中推今日大事件｜${day}（UTC+8）`,
    ...events.map((e, i) => `${i + 1}. @${e.handle} ${oneLine(e.display_name)}\n${oneLine(e.summary)}\n${e.source_url}`),
  ].join("\n\n");
}
