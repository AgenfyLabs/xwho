import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { readDataset } from "@/lib/data";
import {
  breadcrumbJsonLd, categoryCrumbs, categoryDescription, categoryJsonLd, categoryPath, creatorsInVertical, isVertical,
} from "@/lib/discovery";
import { creatorPath, indexableMetadata } from "@/lib/seo";
import { tierNames, verticalNames, verticals } from "@/lib/schema";

export function generateStaticParams() {
  return verticals.map(vertical => ({ vertical }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ vertical: string }> }) {
  const { vertical } = await params;
  if (!isVertical(vertical)) notFound();
  const count = creatorsInVertical(readDataset().creators, vertical).length;
  return indexableMetadata({
    title: verticalNames[vertical],
    description: categoryDescription(vertical, count),
    path: categoryPath(vertical),
  });
}

export default async function TrackPage({ params }: { params: Promise<{ vertical: string }> }) {
  const { vertical } = await params;
  if (!isVertical(vertical)) notFound();
  const creators = readDataset().creators;
  const people = creatorsInVertical(creators, vertical);
  const name = verticalNames[vertical];
  const description = categoryDescription(vertical, people.length);
  const crumbs = categoryCrumbs(vertical);
  return <div className="page-body">
    <JsonLd data={categoryJsonLd(vertical, creators)} />
    <JsonLd data={breadcrumbJsonLd(crumbs)} />
    <header className="page-intro">
      <Breadcrumb items={crumbs} />
      <h1>{name}</h1>
      <p>{description}</p>
    </header>
    {people.length ? <ul className="entries">{people.map(creator => <li key={creator.x_user_id}>
      <Link className="text-link" href={creatorPath(creator)}>{creator.display_name}</Link>
      <span className="handle"> @{creator.handle}</span>
      <span className="meta"> · {tierNames[creator.verification_tier]}</span>
      <p>{creator.summary}</p>
    </li>)}</ul> : <p className="muted">这个赛道还没有公开创作者。</p>}
  </div>;
}
