import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { publicCreatorByHandle, publicCreators, readDataset } from "@/lib/data";
import { breadcrumbJsonLd, categoryPath, creatorCrumbs, similarCreators } from "@/lib/discovery";
import { rankingsForCreator } from "@/lib/rankings";
import { displayTime, groupEvents, publicEvents } from "@/lib/digest";
import { eventNames, HttpUrlSchema, roleNames, tierNames, verticalNames } from "@/lib/schema";
import { creatorDescription, creatorPath, creatorProfileJsonLd, creatorTitle, indexableMetadata } from "@/lib/seo";

const loadCreatorPage = cache((handle: string) => {
  const { creators, milestones } = readDataset();
  return { creators, creator: publicCreatorByHandle(creators, handle), milestones };
});

export const revalidate = 3600;

export function generateStaticParams() {
  return publicCreators(readDataset().creators).map(creator => ({ handle: creator.handle }));
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { creator } = loadCreatorPage((await params).handle);
  if (!creator) notFound();
  return indexableMetadata({
    title: creatorTitle(creator),
    description: creatorDescription(creator),
    path: creatorPath(creator),
    type: "profile",
    username: creator.handle,
  });
}

export default async function CreatorPage({ params }: { params: Promise<{ handle: string }> }) {
  const { creators, creator: c, milestones } = loadCreatorPage((await params).handle);
  if (!c) notFound();
  const groups = groupEvents(publicEvents([c], milestones));
  const board = c.claim_status === "claimed" ? c.service_board : null;
  const crumbs = creatorCrumbs(c);
  const similar = similarCreators(creators, c);
  const rankings = rankingsForCreator(creators, c);
  return <div className="reading">
    <JsonLd data={creatorProfileJsonLd(c)} />
    <JsonLd data={breadcrumbJsonLd(crumbs)} />
    <Breadcrumb items={crumbs} />
    <Link className="back-link" href="/">创作者名录</Link>
    <header className="profile-head"><div className="initial" aria-hidden="true">{Array.from(c.display_name)[0]}</div><div>
      <div className="badges"><span className="badge">{tierNames[c.verification_tier]}</span>{verticalNames[c.vertical]}</div>
      <h1>{c.display_name}</h1><a className="text-link" href={`https://x.com/${c.handle}`}>@{c.handle} <ExternalLink size={13} /></a>
    </div></header>
    <p className="lede">{c.summary}</p><div className="tags">{[...c.role_tags.map(t => roleNames[t]), ...c.sub_tags].map((t, i) => <span key={i}>{t}</span>)}</div>
    {c.followers_snapshot && <p className="meta">粉丝 {c.followers_snapshot.count.toLocaleString("zh-CN")} · 快照于 {displayTime(c.followers_snapshot.as_of)}</p>}
    <section className="chapter"><h2>代表作</h2>{c.verified_works.length ? <ul className="entries">{c.verified_works.map((w, i) =>
      <li key={i}><a className="text-link" href={w.url}>{w.title} <ExternalLink size={14} /></a>{w.description && <p>{w.description}</p>}</li>)}</ul>
      : <p className="muted">暂无已核验的代表作。</p>}</section>
    {c.quote && <section className="chapter"><h2>原帖金句</h2><blockquote>{c.quote.text}</blockquote>
      <a className="text-link" href={c.quote.source_url}>查看原帖 · {c.quote.published_at.slice(0, 10)}</a></section>}
    <section className="chapter"><h2>近期大事件</h2>{groups.length ? <ul className="entries">{groups.slice(0, 7).flatMap(g => g.events.map(e =>
      <li key={e.id}><span className="meta">{g.day} · {eventNames[e.event_type]}</span><p>{e.summary} <a className="text-link" href={e.source_url}>原始出处</a></p></li>))}</ul> : <p className="muted">暂无收录事件。</p>}</section>
    {similar.length > 0 && <section className="chapter"><h2>相似创作者</h2>
      <ul className="similar">{similar.map(creator => <li key={creator.x_user_id}>
        <Link className="text-link" href={creatorPath(creator)}>{creator.display_name}</Link>
        <span className="handle"> @{creator.handle}</span>
        <span className="meta"> · {verticalNames[creator.vertical]}</span>
        <p>{creator.summary}</p>
      </li>)}</ul>
      <Link className="text-link" href={categoryPath(c.vertical)}>查看全部{verticalNames[c.vertical]}</Link>
    </section>}
    {rankings.length > 0 && <section className="chapter"><h2>收录排行</h2>
      <ul className="entries">{rankings.map(({ ranking, place, path }) => <li key={ranking.id}>
        <Link className="text-link" href={path}>{ranking.title}</Link>
        <span className="meta"> · 第 {place} 名 / {ranking.creators.length} 人</span>
      </li>)}</ul>
    </section>}
    <section className="board chapter"><h2>本人合作与联系留言板</h2>
      {c.claim_status === "unclaimed" ? <><p>这张名片还没认领，联系方式由创作者自己填写。</p><Link className="btn primary" href="/dashboard">这是我，认领名片</Link></>
        : board ? <><p>{board.open_for_collab ? "正在接合作" : "暂不接合作"}</p><div className="tags">{board.cooperation_tags.map((t, i) => <span key={i}>{t}</span>)}</div>
          {board.pitch && <p className="multiline">{board.pitch}</p>}<dl>{board.contact_channels.map((ch, i) => <div key={i}><dt>{ch.label}</dt>
            <dd>{HttpUrlSchema.safeParse(ch.value).success ? <a className="text-link" href={ch.value}>{ch.value}</a> : ch.value}</dd></div>)}</dl>
          <small>本人更新于 {displayTime(board.updated_at)}</small></> : <p>已认领 · 本人尚未填写合作信息。</p>}
    </section>
  </div>;
}
