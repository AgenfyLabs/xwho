import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { readDataset, verticalCounts } from "@/lib/data";
import { pageMeta, tracksJsonLd } from "@/lib/seo";
import { verticalNames, verticals } from "@/lib/schema";

export const metadata = pageMeta({
  title: "按赛道浏览",
  description: "XWho 中文 X 黄皮书的六个赛道，每个赛道列出全部公开创作者。",
  path: "/tracks",
});

export default function TracksPage() {
  const counts = verticalCounts(readDataset().creators);
  return <div className="page-body">
    <JsonLd data={tracksJsonLd(counts)} />
    <header className="page-intro">
      <h1>按赛道浏览</h1>
      <p>六个赛道下的全部公开创作者。打开一个赛道即可看到每一位的档案链接。</p>
    </header>
    <ul className="entries">{verticals.map(vertical => <li key={vertical}>
      <Link className="text-link" href={`/tracks/${vertical}`}>{verticalNames[vertical]}</Link>
      <span className="meta"> · {counts[vertical]} 人</span>
    </li>)}</ul>
  </div>;
}
