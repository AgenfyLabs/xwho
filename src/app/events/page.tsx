import { Events } from "@/components/events";
import { JsonLd } from "@/components/json-ld";
import { readDataset } from "@/lib/data";
import { publicEvents } from "@/lib/digest";
import { eventsJsonLd, pageMeta } from "@/lib/seo";

const description = "按北京时间（UTC+8）汇总中文 X 创作者的可核验动态，每条附原始出处。";
export const metadata = pageMeta({ title: "中推今日大事件", description, path: "/events" });

export default function EventsPage() {
  const { creators, milestones } = readDataset();
  const entries = publicEvents(creators, milestones);
  return <div className="page-body">
    <JsonLd data={eventsJsonLd(entries)} />
    <header className="page-intro"><h1>中推今日大事件</h1>
    <p>按北京时间（UTC+8）逐日查阅创作者动态、核对原始出处，或复制当日推文草稿。</p></header>
    <Events entries={entries} /></div>;
}
