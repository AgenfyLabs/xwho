import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { readDataset } from "@/lib/data";
import { breadcrumbJsonLd } from "@/lib/discovery";
import {
  publishedRankings, rankingBasis, rankingGroups, rankingPageCount, rankingsCrumbs, rankingsDescription, rankingsIndexJsonLd,
  rankingsIntro, rankingsPath, rankingsTitle,
} from "@/lib/rankings";
import { indexableMetadata } from "@/lib/seo";

export const metadata = indexableMetadata({ title: rankingsTitle, description: rankingsDescription, path: rankingsPath });

export default function RankingsPage() {
  const rankings = publishedRankings(readDataset().creators);
  const crumbs = rankingsCrumbs();
  return <div className="page-body">
    <JsonLd data={rankingsIndexJsonLd(rankings)} />
    <JsonLd data={breadcrumbJsonLd(crumbs)} />
    <header className="page-intro">
      <Breadcrumb items={crumbs} />
      <h1>{rankingsTitle}</h1>
      <p>{rankingsIntro}</p>
      <p>{rankingBasis}</p>
    </header>
    {rankingGroups.map(group => {
      const items = rankings.filter(ranking => ranking.group === group.id);
      if (!items.length) return null;
      return <section key={group.id} className="chapter"><h2>{group.title}</h2>
        <ul className="entries">{items.map(ranking => {
          const pages = rankingPageCount(ranking.creators.length);
          return <li key={ranking.id}>
            <Link className="text-link" href={ranking.path}>{ranking.title}</Link>
            <span className="meta"> · {ranking.creators.length} 人{pages > 1 ? ` · ${pages} 页` : ""}</span>
            <p>{ranking.description}</p>
          </li>;
        })}</ul>
      </section>;
    })}
  </div>;
}
