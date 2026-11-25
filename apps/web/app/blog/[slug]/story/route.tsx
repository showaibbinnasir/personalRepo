import { getPortfolio, getPost } from "@/lib/api";
import { shortDate, storyCardResponse } from "@/lib/storyCard";

/** 1080×1920 story card for sharing a blog post (see lib/storyCard). */
export const revalidate = 3600;

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [detail, portfolio] = await Promise.all([getPost(slug), getPortfolio()]);
  if (!detail) return new Response("Not found", { status: 404 });
  const { post } = detail;
  return storyCardResponse(
    {
      seed: post.slug,
      label: "JOURNAL",
      title: post.title,
      description: post.seoDescription || post.excerpt,
      tags: post.tags,
      coverUrl: post.coverImageUrl,
      metaLeft: shortDate(post.publishedAt),
      metaRight: `${post.readingMinutes} MIN READ`,
      cta: "Read it at",
      path: "/blog"
    },
    portfolio
  );
}
