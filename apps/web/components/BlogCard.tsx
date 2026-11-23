import type { BlogPostSummary } from "@/lib/types";

/** "23 NOV 2026" — compact, terminal-style date for card metadata. */
function shortDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).toUpperCase();
}

export default function BlogCard({ post, index, large }: { post: BlogPostSummary; index?: number; large?: boolean }) {
  return (
    <article className={`bcard ${large ? "bcard--lead" : ""} ${post.featured ? "is-featured" : ""}`}>
      <div className="bcard-media">
        {post.coverImageUrl ? (
          <img src={post.coverImageUrl} alt={post.coverImageAlt || ""} loading="lazy" />
        ) : (
          <div className="card-placeholder card-placeholder--journal" aria-hidden="true">
            <span>{post.title.slice(0, 2)}</span>
          </div>
        )}
        {index !== undefined && <span className="card-index">B/{String(index + 1).padStart(2, "0")}</span>}
        {post.tags?.[0] && <span className="card-badge">{post.tags[0]}</span>}
      </div>
      <div className="bcard-body">
        <div className="card-meta">
          <time dateTime={post.publishedAt || undefined}>{shortDate(post.publishedAt)}</time>
          <span aria-hidden="true">{"//"}</span>
          <span>{post.readingMinutes} min read</span>
          {large && post.featured && <span className="card-flag">Featured</span>}
        </div>
        <h3>
          <a className="card-stretch" href={`/blog/${post.slug}`}>{post.title}</a>
        </h3>
        {post.excerpt && <p>{post.excerpt}</p>}
        {post.tags?.length > 1 && (
          <ul className="chips" aria-label="Tags">
            {post.tags.slice(1, large ? 5 : 4).map(tag => <li key={tag}>{tag}</li>)}
          </ul>
        )}
        <div className="card-links">
          <span>Read article <i aria-hidden="true">→</i></span>
        </div>
      </div>
    </article>
  );
}
