import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, type Crumb } from "@/lib/discovery";
import {
  rankingJsonLd, rankingPageCount, rankingPagePath, rankingPageSize, rankingPageTitle, rankingsPath,
  sliceRanking, type PublishedRanking, type RankingLink,
} from "@/lib/rankings";
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

export function RankingList({ creators, start = 1 }: { creators: Creator[]; start?: number }) {
  return <ol className="entries ranking" start={start}>{creators.map(creator => <li key={creator.x_user_id}>
    <Link className="text-link" href={creatorPath(creator)}>{creator.display_name}</Link>
    <span className="handle"> @{creator.handle}</span>
    <span className="meta"> · {followerText(creator)} · {verticalNames[creator.vertical]} · {tierNames[creator.verification_tier]}</span>
    <p>{creator.summary}</p>
  </li>)}</ol>;
}

export function RankingPager({ path, page, pages }: { path: string; page: number; pages: number }) {
  if (pages <= 1) return null;
  return <nav className="pager" aria-label="排行分页">
    {page > 1 ? <Link href={rankingPagePath(path, page - 1)}>上一页</Link> : null}
    {Array.from({ length: pages }, (_, index) => {
      const number = index + 1;
      return number === page
        ? <span key={number} aria-current="page">{number}</span>
        : <Link key={number} href={rankingPagePath(path, number)}>{number}</Link>;
    })}
    {page < pages ? <Link href={rankingPagePath(path, page + 1)}>下一页</Link> : null}
  </nav>;
}

export function RankingArticle({ ranking, crumbs, page = 1 }: { ranking: PublishedRanking; crumbs: Crumb[]; page?: number }) {
  const slice = sliceRanking(ranking.creators, page);
  if (!slice) return null;
  return <div className="page-body">
    <JsonLd data={rankingJsonLd(ranking, page)} />
    <JsonLd data={breadcrumbJsonLd(crumbs)} />
    <header className="page-intro">
      <Breadcrumb items={crumbs} />
      <h1>{rankingPageTitle(ranking, page)}</h1>
      <p>{ranking.intro}</p>
      <p>{ranking.basis}</p>
      {slice.pages > 1 && <p>这一页是第 {slice.from}–{slice.to} 名，共 {slice.total} 人，每页 {rankingPageSize} 人。</p>}
      <RankingLinks links={ranking.seeAlso} />
      <RankingPager path={ranking.path} page={page} pages={rankingPageCount(ranking.creators.length)} />
    </header>
    <RankingList creators={slice.items} start={slice.from} />
    <RankingPager path={ranking.path} page={page} pages={rankingPageCount(ranking.creators.length)} />
  </div>;
}
