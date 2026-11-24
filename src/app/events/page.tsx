import { Events } from "@/components/events";
import { readDataset } from "@/lib/data";
import { publicEvents } from "@/lib/digest";

export const metadata = { title: "中推今日大事件" };
export default function EventsPage() {
  const { creators, milestones } = readDataset();
  return <div className="page-body"><header className="page-intro"><h1>中推今日大事件</h1>
    <p>按北京时间（UTC+8）逐日查阅创作者动态、核对原始出处，或复制当日推文草稿。</p></header>
    <Events entries={publicEvents(creators, milestones)} /></div>;
}
