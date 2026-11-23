import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { getPortfolio, getPosts } from "@/lib/api";
import { SITE_URL } from "@/lib/site";
import SiteHeader from "@/components/SiteHeader";
import BlogCard from "@/components/BlogCard";

export const revalidate = 60;

const PER_PAGE = 9;

type Search = Promise<{ tag?: string; page?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: Search }): Promise<Metadata> {
  const { tag, page } = await searchParams;
  const portfolio = await getPortfolio();
  const name = portfolio?.profile.shortName || "Showaib Bin Nasir";
  const title = tag ? `Posts tagged “${tag}”` : "Blog — Thoughts on robotics, AI & software";
  const description = tag
    ? `Articles by ${name} about ${tag}.`
    : `Notes, ideas and write-ups by ${name} on robotics, artificial intelligence, software engineering and building intelligent systems.`;
  const pageNum = Number(page) > 1 ? Number(page) : 1;
  const qs = new URLSearchParams();
  if (tag) qs.set("tag", tag);
  if (pageNum > 1) qs.set("page", String(pageNum));
  const canonical = `/blog${qs.size ? `?${qs}` : ""}`;

  return {
    title,
    description,
    alternates: { canonical, types: { "application/rss+xml": `${SITE_URL}/blog/feed.xml` } },
    openGraph: { title, description, url: `${SITE_URL}${canonical}`, type: "website" },
    twitter: { card: "summary", title, description }
  };
}

export default async function BlogIndex({ searchParams }: { searchParams: Search }) {
  const { tag, page } = await searchParams;
  const pageNum = Math.max(1, Number.parseInt(page || "1", 10) || 1);
  const [portfolio, list] = await Promise.all([getPortfolio(), getPosts({ page: pageNum, limit: PER_PAGE, tag })]);

  const styles = portfolio
    ? ({
        "--accent": portfolio.siteSettings.accent,
        "--bg": portfolio.siteSettings.background,
        "--fg": portfolio.siteSettings.foreground,
        "--muted": portfolio.siteSettings.muted
      } as CSSProperties)
    : undefined;

  const posts = list?.posts || [];
  const showLead = pageNum === 1 && !tag && posts.length > 0;
  const lead = showLead ? posts[0] : null;
  const rest = showLead ? posts.slice(1) : posts;
  const href = (p: number) => {
    const qs = new URLSearchParams();
    if (tag) qs.set("tag", tag);
    if (p > 1) qs.set("page", String(p));
    return `/blog${qs.size ? `?${qs}` : ""}`;
  };

  return (
    <main className="blog-page" style={styles}>
      <SiteHeader email={portfolio?.profile.email} active="blog" />

      <section className="blog-index-head">
        <div className="section-kicker">
          <span>//</span>
          <span>Journal</span>
          <span>{list ? `${list.total} ${list.total === 1 ? "article" : "articles"}` : ""}</span>
        </div>
        <h1>
          <span>Thoughts</span>
          <span>&amp; Notes</span>
        </h1>
        <p className="lead">
          Ideas, experiments and lessons from working across robotics, artificial intelligence and software engineering.
        </p>
      </section>

      {list && list.tags.length > 0 && (
        <nav className="blog-tags" aria-label="Filter by topic">
          <a href="/blog" className={!tag ? "active" : ""}>All</a>
          {list.tags.map(t => (
            <a key={t} href={`/blog?tag=${encodeURIComponent(t)}`} className={tag === t ? "active" : ""}>{t}</a>
          ))}
        </nav>
      )}

      <section className="blog-list">
        {!list && <div className="empty-public">THE BLOG IS UNAVAILABLE RIGHT NOW. PLEASE TRY AGAIN SHORTLY.</div>}
        {list && posts.length === 0 && (
          <div className="empty-public">{tag ? `NO POSTS TAGGED “${tag.toUpperCase()}” YET.` : "FIRST POSTS ARE ON THE WAY."}</div>
        )}

        {lead && <BlogCard post={lead} large />}

        {rest.length > 0 && (
          <div className="card-grid blog-grid">
            {rest.map((post, i) => (
              <BlogCard key={post._id} post={post} index={(pageNum - 1) * PER_PAGE + i + (showLead ? 1 : 0)} />
            ))}
          </div>
        )}

        {list && list.pages > 1 && (
          <nav className="project-pagination blog-pagination" aria-label="Blog pages">
            {pageNum > 1 ? <a className="pagination-arrow" href={href(pageNum - 1)} aria-label="Newer posts">←</a> : <span className="pagination-arrow" aria-disabled="true">←</span>}
            <div className="pagination-pages">
              {Array.from({ length: list.pages }, (_, i) => i + 1).map(p => (
                <a key={p} href={href(p)} className={p === pageNum ? "active" : ""} aria-current={p === pageNum ? "page" : undefined}>
                  {String(p).padStart(2, "0")}
                </a>
              ))}
            </div>
            {pageNum < list.pages ? <a className="pagination-arrow" href={href(pageNum + 1)} aria-label="Older posts">→</a> : <span className="pagination-arrow" aria-disabled="true">→</span>}
          </nav>
        )}
      </section>

      <footer className="blog-footer">
        <a href="/">← Back to portfolio</a>
        <a href="/blog/feed.xml">RSS feed ↗</a>
      </footer>
    </main>
  );
}
