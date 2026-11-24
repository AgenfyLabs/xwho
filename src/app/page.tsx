import Link from "next/link";
import { CalendarDays, UserRound } from "lucide-react";
import { Directory } from "@/components/directory";
import { JsonLd } from "@/components/json-ld";
import { directory, readDataset, verticalCounts } from "@/lib/data";
import { pageMeta, SITE_DESCRIPTION, websiteJsonLd } from "@/lib/seo";
import { verticalNames, verticals } from "@/lib/schema";

export function generateMetadata() {
  const count = verticalCounts(readDataset().creators).all;
  return pageMeta({ description: `${SITE_DESCRIPTION}目前收录 ${count} 位公开创作者。`, path: "/" });
}

export default function Home() {
  const creators = readDataset().creators;
  const counts = verticalCounts(creators);
  return <>
    <JsonLd data={websiteJsonLd()} />
    <section className="hero">
      <div><h1>中文 X 黄皮书</h1><p>从一件作品，认识一位中文 X 创作者。</p></div>
      <div className="actions"><Link href="/dashboard" className="btn primary"><UserRound aria-hidden="true" />认领或申请名片</Link>
        <Link href="/events" className="btn"><CalendarDays aria-hidden="true" />今日大事件</Link></div>
    </section>
    <nav className="track-nav" aria-label="按赛道查看全部创作者">
      <span>按赛道查看全部</span>
      {verticals.map(vertical => <Link key={vertical} href={`/tracks/${vertical}`}>{verticalNames[vertical]}<span>{counts[vertical]}</span></Link>)}
    </nav>
    <Directory initial={directory(creators)} />
  </>;
}
