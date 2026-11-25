import { notFound, permanentRedirect } from "next/navigation";
import { RankingArticle } from "@/components/ranking";
import { readDataset } from "@/lib/data";
import { categoryCrumbs } from "@/lib/discovery";
import {
  loadVerticalPage, rankingPageCrumbs, rankingPageDescription, rankingPagePath, rankingPageTitle, verticalPaginationParams,
} from "@/lib/rankings";
import { indexableMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return verticalPaginationParams(readDataset().creators);
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ vertical: string; page: string }> }) {
  const { vertical, page: raw } = await params;
  const parsed = loadVerticalPage(readDataset().creators, vertical, raw);
  if (!parsed) notFound();
  return indexableMetadata({
    title: rankingPageTitle(parsed.ranking, parsed.page),
    description: rankingPageDescription(parsed.ranking, parsed.page),
    path: rankingPagePath(parsed.ranking.path, parsed.page),
  });
}

export default async function TrackLeaf({ params }: { params: Promise<{ vertical: string; page: string }> }) {
  const { vertical, page: raw } = await params;
  const parsed = loadVerticalPage(readDataset().creators, vertical, raw);
  if (!parsed) notFound();
  if (parsed.page === 1) permanentRedirect(parsed.ranking.path);
  const crumbs = rankingPageCrumbs(categoryCrumbs(parsed.vertical), parsed.ranking.path, parsed.page);
  return <RankingArticle ranking={parsed.ranking} crumbs={crumbs} page={parsed.page} />;
}
