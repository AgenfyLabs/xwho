import Link from "next/link";
import { CalendarDays, UserRound } from "lucide-react";
import { Directory } from "@/components/directory";
import { JsonLd } from "@/components/json-ld";
import { directory, readDataset } from "@/lib/data";
import { indexableMetadata, websiteJsonLd } from "@/lib/seo";

export const metadata = indexableMetadata({ path: "/" });

export default function Home() {
  return <>
    <JsonLd data={websiteJsonLd()} />
    <section className="hero">
      <div><h1>中文 X 黄皮书</h1><p>从一件作品，认识一位中文 X 创作者。</p></div>
      <div className="actions"><Link href="/dashboard" className="btn primary"><UserRound aria-hidden="true" />认领或申请名片</Link>
        <Link href="/events" className="btn"><CalendarDays aria-hidden="true" />今日大事件</Link></div>
    </section>
    <Directory initial={directory(readDataset().creators)} />
  </>;
}
