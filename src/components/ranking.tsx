import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, type Crumb } from "@/lib/discovery";
import { rankingJsonLd, rankingsPath, type PublishedRanking, type RankingLink } from "@/lib/rankings";
import { tierNames, verticalNames, type Creator } from "@/lib/schema";
import { creatorPath } from "@/lib/seo";

function followerText(creator: Creator) {
  const snapshot = creator.followers_snapshot;
  if (!snapshot) return "粉丝未知";
  return `粉丝 ${snapshot.count.toLocaleString("zh-CN")} · 快照 ${snapshot.as_of.slice(0, 10)}`;
}

export function RankingLinks({ links }: { links: RankingLink[] }) {
  const items = [...links, { path: rankingsPath, title: "全部排行榜" }];
  const unique = items.filter((item, index) => items.findIndex(other => other.path === item.path) === index);
  return <p>{unique.map((item, index) => <span key={item.path}>{index > 0 && " · "}
    <Link className="text-link" href={item.path}>{item.title}</Link></span>)}</p>;
}

export function RankingList({ creators }: { creators: Creator[] }) {
  return <ol className="entries ranking">{creators.map(creator => <li key={creator.x_user_id}>
    <Link className="text-link" href={creatorPath(creator)}>{creator.display_name}</Link>
    <span className="handle"> @{creator.handle}</span>
    <span className="meta"> · {followerText(creator)} · {verticalNames[creator.vertical]} · {tierNames[creator.verification_tier]}</span>
    <p>{creator.summary}</p>
  </li>)}</ol>;
}

export function RankingArticle({ ranking, crumbs }: { ranking: PublishedRanking; crumbs: Crumb[] }) {
  return <div className="page-body">
    <JsonLd data={rankingJsonLd(ranking)} />
    <JsonLd data={breadcrumbJsonLd(crumbs)} />
    <header className="page-intro">
      <Breadcrumb items={crumbs} />
      <h1>{ranking.title}</h1>
      <p>{ranking.intro}</p>
      <p>{ranking.basis}</p>
      <RankingLinks links={ranking.seeAlso} />
    </header>
    <RankingList creators={ranking.creators} />
  </div>;
}
