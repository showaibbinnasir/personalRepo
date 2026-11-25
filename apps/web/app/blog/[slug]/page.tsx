import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPortfolio, getPost, getPosts } from "@/lib/api";
import { absoluteUrl, formatDate, SITE_URL } from "@/lib/site";
import { sanitizeRichText, withHeadingAnchors } from "@/lib/richtext";
import SiteHeader from "@/components/SiteHeader";
import ShareButtons from "@/components/ShareButtons";
import StoryShare from "@/components/StoryShare";
import BlogCard from "@/components/BlogCard";

export const revalidate = 60;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const list = await getPosts({ limit: 100 });
  return (list?.posts || []).map(p => ({ slug: p.slug }));
}

const shareImage = (post: { slug: string; coverImageUrl?: string }) =>
  post.coverImageUrl || absoluteUrl(`/blog/${post.slug}/og`);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const [detail, portfolio] = await Promise.all([getPost(slug), getPortfolio()]);
  if (!detail) return { title: "Post not found", robots: { index: false } };
  const { post } = detail;
  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt || `An article by ${portfolio?.profile.name || "Showaib Bin Nasir"}.`;
  const url = absoluteUrl(`/blog/${post.slug}`);
  const image = shareImage(post);
  const author = portfolio?.profile.name || "Mohammad Showaib Bin Nasir";

  return {
    title,
    description,
    keywords: post.tags,
    authors: [{ name: author, url: SITE_URL }],
    alternates: { canonical: url, types: { "application/rss+xml": absoluteUrl("/blog/feed.xml") } },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      siteName: portfolio?.profile.shortName || "Showaib Bin Nasir",
      publishedTime: post.publishedAt || undefined,
      modifiedTime: post.updatedAt,
      authors: [SITE_URL],
      tags: post.tags,
      images: [{ url: image, width: 1200, height: 630, alt: post.coverImageAlt || post.title }]
    },
    twitter: { card: "summary_large_image", title, description, images: [image] }
  };
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [detail, portfolio] = await Promise.all([getPost(slug), getPortfolio()]);
  if (!detail) notFound();

  const { post, prev, next, related } = detail;
  const profile = portfolio?.profile;
  const url = absoluteUrl(`/blog/${post.slug}`);
  const { html, toc } = withHeadingAnchors(sanitizeRichText(post.content));

  const styles = portfolio
    ? ({
        "--accent": portfolio.siteSettings.accent,
        "--bg": portfolio.siteSettings.background,
        "--fg": portfolio.siteSettings.foreground,
        "--muted": portfolio.siteSettings.muted
      } as CSSProperties)
    : undefined;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt || undefined,
      image: [shareImage(post)],
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      wordCount: post.wordCount || undefined,
      timeRequired: `PT${post.readingMinutes}M`,
      keywords: post.tags?.join(", ") || undefined,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      url,
      author: { "@type": "Person", name: profile?.name || "Mohammad Showaib Bin Nasir", url: SITE_URL },
      publisher: { "@type": "Person", name: profile?.name || "Mohammad Showaib Bin Nasir", url: SITE_URL }
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Blog", item: absoluteUrl("/blog") },
        { "@type": "ListItem", position: 3, name: post.title, item: url }
      ]
    }
  ];

  return (
    <main className="blog-page post-page" style={styles}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <SiteHeader email={profile?.email} active="blog" />

      <article className="post" itemScope itemType="https://schema.org/BlogPosting">
        <header className="post-header">
          <nav className="post-breadcrumb" aria-label="Breadcrumb">
            <a href="/">Home</a> <span>/</span> <a href="/blog">Blog</a>
          </nav>
          {post.tags?.length > 0 && (
            <div className="post-tags">
              {post.tags.map(tag => <a key={tag} href={`/blog?tag=${encodeURIComponent(tag)}`}>{tag}</a>)}
            </div>
          )}
          <h1 itemProp="headline">{post.title}</h1>
          {post.excerpt && <p className="post-excerpt" itemProp="description">{post.excerpt}</p>}
          <div className="post-meta">
            <div className="post-author">
              {profile?.portraitUrl ? <img src={profile.portraitUrl} alt="" /> : <span aria-hidden="true">SBN</span>}
              <div>
                <strong itemProp="author">{profile?.name || "Showaib Bin Nasir"}</strong>
                <small>
                  <time dateTime={post.publishedAt || undefined} itemProp="datePublished">{formatDate(post.publishedAt)}</time>
                  {" · "}{post.readingMinutes} min read
                </small>
              </div>
            </div>
            <div className="post-share-row">
              <StoryShare slug={post.slug} url={url} title={post.title} />
              <ShareButtons url={url} title={post.title} text={post.excerpt} compact />
            </div>
          </div>
        </header>

        {post.coverImageUrl && (
          <figure className="post-cover" data-reveal="zoom">
            <img src={post.coverImageUrl} alt={post.coverImageAlt || ""} data-parallax="0.06" itemProp="image" />
          </figure>
        )}

        <div className={`post-layout ${toc.length >= 3 ? "has-toc" : ""}`}>
          {toc.length >= 3 && (
            <aside className="post-toc" aria-label="On this page">
              <small>On this page</small>
              <ol>
                {toc.map(item => (
                  <li key={item.id} className={`toc-${item.level}`}>
                    <a href={`#${item.id}`}>{item.text}</a>
                  </li>
                ))}
              </ol>
            </aside>
          )}
          <div className="project-article post-body" itemProp="articleBody" dangerouslySetInnerHTML={{ __html: html }} />
        </div>

        <footer className="post-footer">
          <div className="post-share-footer">
            <ShareButtons url={url} title={post.title} text={post.excerpt} />
            <StoryShare slug={post.slug} url={url} title={post.title} />
          </div>

          {profile && (
            <div className="author-card">
              {profile.portraitUrl ? <img src={profile.portraitUrl} alt={profile.name} /> : <span aria-hidden="true">SBN</span>}
              <div>
                <small>Written by</small>
                <h2>{profile.name}</h2>
                <p>{profile.title}</p>
                <div className="mini-links">
                  <a href="/">Portfolio ↗</a>
                  {(portfolio?.socialLinks || []).map(s => (
                    <a key={s.id} href={s.url} target="_blank" rel="noreferrer">{s.label} ↗</a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(prev || next) && (
            <nav className="post-nav" aria-label="More posts">
              {prev ? (
                <a href={`/blog/${prev.slug}`} rel="prev"><small>← Previous</small><strong>{prev.title}</strong></a>
              ) : <span />}
              {next ? (
                <a href={`/blog/${next.slug}`} rel="next" className="next"><small>Next →</small><strong>{next.title}</strong></a>
              ) : <span />}
            </nav>
          )}
        </footer>
      </article>

      {related.length > 0 && (
        <section className="section related-posts">
          <div className="section-kicker"><span>//</span><span>Keep reading</span><span>Related</span></div>
          <div className="card-grid blog-grid">
            {related.map(p => <BlogCard key={p._id} post={p} />)}
          </div>
        </section>
      )}

      <footer className="blog-footer">
        <a href="/blog">← All posts</a>
      </footer>
    </main>
  );
}
