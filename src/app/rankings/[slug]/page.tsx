import { notFound } from "next/navigation";
import { RankingArticle } from "@/components/ranking";
import { readDataset } from "@/lib/data";
import { boardRankingParams, rankingBySlug, rankingCrumbs } from "@/lib/rankings";
import { indexableMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return boardRankingParams(readDataset().creators);
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const ranking = rankingBySlug(readDataset().creators, (await params).slug);
  if (!ranking) notFound();
  return indexableMetadata({ title: ranking.title, description: ranking.description, path: ranking.path });
}

export default async function RankingPage({ params }: { params: Promise<{ slug: string }> }) {
  const ranking = rankingBySlug(readDataset().creators, (await params).slug);
  if (!ranking) notFound();
  return <RankingArticle ranking={ranking} crumbs={rankingCrumbs(ranking)} />;
}
