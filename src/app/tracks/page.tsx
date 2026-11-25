import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { readDataset, verticalCounts } from "@/lib/data";
import { breadcrumbJsonLd, categoryPath, tracksCrumbs, tracksDescription, tracksJsonLd, tracksTitle } from "@/lib/discovery";
import { publishedRankings, rankingsPath } from "@/lib/rankings";
import { indexableMetadata } from "@/lib/seo";
import { verticalNames, verticals } from "@/lib/schema";

export const metadata = indexableMetadata({ title: tracksTitle, description: tracksDescription, path: "/tracks" });

export default function TracksPage() {
  const creators = readDataset().creators;
  const counts = verticalCounts(creators);
  const boards = publishedRankings(creators).filter(ranking => ranking.kind === "board");
  const crumbs = tracksCrumbs();
  return <div className="page-body">
    <JsonLd data={tracksJsonLd()} />
    <JsonLd data={breadcrumbJsonLd(crumbs)} />
    <header className="page-intro">
      <Breadcrumb items={crumbs} />
      <h1>{tracksTitle}</h1>
      <p>{tracksDescription}</p>
      <p>满 10 人的赛道页按粉丝快照排列。身份和主题榜见<Link className="text-link" href={rankingsPath}>全部排行榜</Link>。</p>
    </header>
    <ul className="entries">{verticals.map(vertical => <li key={vertical}>
      <Link className="text-link" href={categoryPath(vertical)}>{verticalNames[vertical]}</Link>
      <span className="meta"> · {counts[vertical]} 人</span>
    </li>)}</ul>
    {boards.length > 0 && <nav className="track-nav" aria-label="排行榜"><span>排行榜</span>
      <Link href={rankingsPath}>全部</Link>
      {boards.map(ranking => <Link key={ranking.id} href={ranking.path}>{ranking.navLabel}<span>{ranking.creators.length}</span></Link>)}
    </nav>}
  </div>;
}
