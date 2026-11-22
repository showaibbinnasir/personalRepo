import { getPortfolio, getPosts } from "@/lib/api";
import PortfolioSite from "@/components/PortfolioSite";
import type { Metadata } from "next";

import { SITE_URL } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const portfolio = await getPortfolio();
  if (!portfolio) return {};
  const { profile } = portfolio;
  return {
    title: `${profile.name} — ${profile.title}`,
    description: profile.heroStatement || profile.bio,
    alternates: { canonical: SITE_URL },
    openGraph: {
      title: `${profile.name} — ${profile.title}`,
      description: profile.heroStatement || profile.bio,
      url: SITE_URL,
      images: profile.portraitUrl ? [{ url: profile.portraitUrl, alt: profile.name }] : undefined
    },
    twitter: {
      card: profile.portraitUrl ? "summary_large_image" : "summary",
      images: profile.portraitUrl ? [profile.portraitUrl] : undefined
    }
  };
}

export const revalidate = 60;

export default async function Home() {
  const [portfolio, postList] = await Promise.all([getPortfolio(), getPosts({ limit: 3 })]);
  if (!portfolio) {
    return <main className="offline"><p>Portfolio API is not available yet.</p><p className="muted">Start the Express server and seed MongoDB, then refresh.</p></main>;
  }
  return <PortfolioSite data={portfolio} posts={postList?.posts || []} />;
}