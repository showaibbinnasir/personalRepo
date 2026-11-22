import { getPortfolio, getPosts } from "@/lib/api";
import { absoluteUrl, SITE_URL } from "@/lib/site";

export const revalidate = 300;

const xml = (value = "") =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export async function GET() {
  const [list, portfolio] = await Promise.all([getPosts({ limit: 50 }), getPortfolio()]);
  const name = portfolio?.profile.name || "Mohammad Showaib Bin Nasir";
  const posts = [...(list?.posts || [])].sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));

  const items = posts
    .map(post => {
      const link = absoluteUrl(`/blog/${post.slug}`);
      return `    <item>
      <title>${xml(post.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(post.publishedAt || post.createdAt).toUTCString()}</pubDate>
      <description>${xml(post.seoDescription || post.excerpt)}</description>
${post.tags.map(t => `      <category>${xml(t)}</category>`).join("\n")}
    </item>`;
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(`${name} — Blog`)}</title>
    <link>${SITE_URL}/blog</link>
    <description>${xml(`Thoughts on robotics, AI and software by ${name}.`)}</description>
    <language>en</language>
    <atom:link href="${absoluteUrl("/blog/feed.xml")}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
