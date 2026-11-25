import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { readDataset, verticalCounts } from "@/lib/data";
import { breadcrumbJsonLd, categoryPath, tracksCrumbs, tracksDescription, tracksJsonLd, tracksTitle } from "@/lib/discovery";
import { indexableMetadata } from "@/lib/seo";
import { verticalNames, verticals } from "@/lib/schema";

export const metadata = indexableMetadata({ title: tracksTitle, description: tracksDescription, path: "/tracks" });

export default function TracksPage() {
  const counts = verticalCounts(readDataset().creators);
  const crumbs = tracksCrumbs();
  return <div className="page-body">
    <JsonLd data={tracksJsonLd()} />
    <JsonLd data={breadcrumbJsonLd(crumbs)} />
    <header className="page-intro">
      <Breadcrumb items={crumbs} />
      <h1>{tracksTitle}</h1>
      <p>{tracksDescription}</p>
    </header>
    <ul className="entries">{verticals.map(vertical => <li key={vertical}>
      <Link className="text-link" href={categoryPath(vertical)}>{verticalNames[vertical]}</Link>
      <span className="meta"> · {counts[vertical]} 人</span>
    </li>)}</ul>
  </div>;
}
