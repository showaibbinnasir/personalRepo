import type { BlogPostSummary } from "@/lib/types";
import { formatDate } from "@/lib/site";

export default function BlogCard({ post, index, large }: { post: BlogPostSummary; index?: number; large?: boolean }) {
  return (
    <article className={`blog-card ${large ? "blog-card--large" : ""}`}>
      <a href={`/blog/${post.slug}`} className="blog-card-link" aria-label={post.title}>
        <div className="blog-card-media">
          {post.coverImageUrl ? (
            <img src={post.coverImageUrl} alt={post.coverImageAlt || ""} loading="lazy" />
          ) : (
            <div className="blog-card-placeholder" aria-hidden="true">
              <span>{post.title.slice(0, 1)}</span>
            </div>
          )}
        </div>
        <div className="blog-card-copy">
          <small>
            {index !== undefined && <>{String(index + 1).padStart(2, "0")} / </>}
            {formatDate(post.publishedAt, { day: "numeric", month: "short", year: "numeric" })} · {post.readingMinutes} min read
          </small>
          <h3>{post.title}</h3>
          {post.excerpt && <p>{post.excerpt}</p>}
          {post.tags?.length > 0 && (
            <div className="tags">
              {post.tags.slice(0, 4).map(tag => <span key={tag}>{tag}</span>)}
            </div>
          )}
          <span className="blog-card-cta">Read article ↗</span>
        </div>
      </a>
    </article>
  );
}
