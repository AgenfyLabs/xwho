import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { readDataset } from "@/lib/data";
import { tierNames, verticalNames, verticals, type Vertical } from "@/lib/schema";
import { collectionJsonLd, isVertical, listDirectory, pageMeta } from "@/lib/seo";

export function generateStaticParams() {
  return verticals.map(vertical => ({ vertical }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ vertical: string }> }) {
  const { vertical } = await params;
  if (!isVertical(vertical)) return { title: "档案未找到", robots: { index: false, follow: false } };
  const count = listDirectory(readDataset().creators, vertical).length;
  return pageMeta({
    title: verticalNames[vertical],
    description: `XWho 中文 X 黄皮书收录的${verticalNames[vertical]}，共 ${count} 人。`,
    path: `/tracks/${vertical}`,
  });
}

export default async function TrackPage({ params }: { params: Promise<{ vertical: string }> }) {
  const { vertical } = await params;
  if (!isVertical(vertical)) notFound();
  const name = verticalNames[vertical];
  const items = listDirectory(readDataset().creators, vertical as Vertical);
  const description = `XWho 中文 X 黄皮书收录的${name}，共 ${items.length} 人。`;
  return <div className="page-body">
    <JsonLd data={collectionJsonLd({
      name,
      description,
      path: `/tracks/${vertical}`,
      items: items.map(creator => ({ name: `${creator.display_name} @${creator.handle}`, url: `/creator/${creator.handle}` })),
    })} />
    <header className="page-intro">
      <Link className="back-link" href="/tracks">全部赛道</Link>
      <h1>{name}</h1>
      <p>{description}</p>
    </header>
    {items.length ? <ul className="entries">{items.map(creator => <li key={creator.x_user_id}>
      <Link className="text-link" href={`/creator/${creator.handle}`}>{creator.display_name}</Link>
      <span className="handle"> @{creator.handle}</span>
      <span className="meta"> · {tierNames[creator.verification_tier]}</span>
      <p>{creator.summary}</p>
    </li>)}</ul> : <p className="muted">这个赛道还没有公开创作者。</p>}
  </div>;
}
