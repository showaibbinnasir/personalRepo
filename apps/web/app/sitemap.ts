import type { MetadataRoute } from "next";
import { getPortfolio } from "@/lib/api";

const SITE_URL = "https://www.showaibbinnasir.site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const portfolio = await getPortfolio();

  const projectEntries: MetadataRoute.Sitemap = (portfolio?.projects || [])
    .filter(p => p.visible !== false)
    .map(p => ({
      url: `${SITE_URL}/projects/${encodeURIComponent(p.id)}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7
    }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1
    },
    ...projectEntries
  ];
}