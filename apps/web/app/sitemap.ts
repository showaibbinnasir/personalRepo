import type { MetadataRoute } from "next";
import { getPortfolio, getPosts } from "@/lib/api";
import { hasRichContent, SITE_URL } from "@/lib/site";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [portfolio, list] = await Promise.all([getPortfolio(), getPosts({ limit: 100 })]);
  const portfolioUpdated = portfolio?.updatedAt ? new Date(portfolio.updatedAt) : undefined;
  const posts = list?.posts || [];
  const latestPost = posts.reduce<Date | undefined>((latest, p) => {
    const d = new Date(p.updatedAt);
    return !latest || d > latest ? d : latest;
  }, undefined);

  const projectEntries: MetadataRoute.Sitemap = (portfolio?.projects || [])
    .filter(p => p.visible !== false && hasRichContent(p.description))
    .map(p => ({
      url: `${SITE_URL}/projects/${encodeURIComponent(p.id)}`,
      lastModified: portfolioUpdated,
      changeFrequency: "monthly",
      priority: 0.7
    }));

  const postEntries: MetadataRoute.Sitemap = posts.map(p => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.updatedAt),
    changeFrequency: "monthly",
    priority: 0.8,
    images: p.coverImageUrl ? [p.coverImageUrl] : undefined
  }));

  return [
    { url: SITE_URL, lastModified: portfolioUpdated, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/blog`, lastModified: latestPost, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/cv`, lastModified: portfolioUpdated, changeFrequency: "monthly", priority: 0.6 },
    ...postEntries,
    ...projectEntries
  ];
}
