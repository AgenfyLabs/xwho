import { Events } from "@/components/events";
import { JsonLd } from "@/components/json-ld";
import { readDataset } from "@/lib/data";
import { publicEvents } from "@/lib/digest";
import { eventsDescription, eventsJsonLd, eventsTitle, indexableMetadata } from "@/lib/seo";

export const metadata = indexableMetadata({ title: eventsTitle, description: eventsDescription, path: "/events" });
export default function EventsPage() {
  const { creators, milestones } = readDataset();
  return <div className="page-body"><JsonLd data={eventsJsonLd()} /><header className="page-intro"><h1>中推今日大事件</h1>
    <p>按北京时间（UTC+8）逐日查阅创作者动态、核对原始出处，或复制当日推文草稿。</p></header>
    <Events entries={publicEvents(creators, milestones)} /></div>;
}
