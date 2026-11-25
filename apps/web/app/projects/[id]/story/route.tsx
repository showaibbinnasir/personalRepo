import { getPortfolio } from "@/lib/api";
import { uniqueList } from "@/lib/site";
import { storyCardResponse } from "@/lib/storyCard";

/** 1080×1920 story card for sharing a project (same design as blog posts). */
export const revalidate = 3600;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const portfolio = await getPortfolio();
  const project = portfolio?.projects.find(p => p.id === decodeURIComponent(id) && p.visible !== false);
  if (!project) return new Response("Not found", { status: 404 });
  const tech = uniqueList(project.tech);
  return storyCardResponse(
    {
      seed: project.id,
      label: "PROJECT",
      title: project.title,
      description: project.summary,
      tags: tech,
      coverUrl: project.imageUrl,
      metaLeft: (project.category || "Project").toUpperCase(),
      metaRight: tech.length ? `${tech.length} ${tech.length === 1 ? "TECHNOLOGY" : "TECHNOLOGIES"}` : "",
      cta: "See it at",
      path: ""
    },
    portfolio
  );
}
