import { notFound, permanentRedirect } from "next/navigation";
import { RankingArticle } from "@/components/ranking";
import { readDataset } from "@/lib/data";
import {
  boardPaginationParams, loadBoardPage, rankingCrumbs, rankingPageDescription, rankingPagePath, rankingPageTitle,
} from "@/lib/rankings";
import { indexableMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return boardPaginationParams(readDataset().creators);
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string; page: string }> }) {
  const { slug, page: raw } = await params;
  const parsed = loadBoardPage(readDataset().creators, slug, raw);
  if (!parsed) notFound();
  return indexableMetadata({
    title: rankingPageTitle(parsed.ranking, parsed.page),
    description: rankingPageDescription(parsed.ranking, parsed.page),
    path: rankingPagePath(parsed.ranking.path, parsed.page),
  });
}

export default async function RankingLeaf({ params }: { params: Promise<{ slug: string; page: string }> }) {
  const { slug, page: raw } = await params;
  const parsed = loadBoardPage(readDataset().creators, slug, raw);
  if (!parsed) notFound();
  if (parsed.page === 1) permanentRedirect(parsed.ranking.path);
  return <RankingArticle ranking={parsed.ranking} crumbs={rankingCrumbs(parsed.ranking, parsed.page)} page={parsed.page} />;
}
