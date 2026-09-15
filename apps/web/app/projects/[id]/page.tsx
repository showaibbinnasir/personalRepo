import { getPortfolio } from "@/lib/api";
import { notFound } from "next/navigation";
import sanitizeHtml from "sanitize-html";
import type { CSSProperties } from "react";

function plainTextToHtml(value: string) {
  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
  return `<p>${escaped.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
}

function projectArticleHtml(value?: string) {
  if (!value?.trim()) return "";
  const source = /<\/?[a-z][\s\S]*>/i.test(value) ? value : plainTextToHtml(value);

  return sanitizeHtml(source, {
    allowedTags: [
      "p", "h2", "h3", "strong", "em", "u", "s", "ul", "ol", "li",
      "blockquote", "br", "hr", "a", "img", "span", "code", "pre"
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title", "class"],
      p: ["style"],
      h2: ["style"],
      h3: ["style"],
      span: ["style"]
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedStyles: {
      "*": {
        "text-align": [/^(left|center|right|justify)$/],
        "font-size": [/^(14|16|20|24|32)px$/]
      }
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }, true)
    }
  });
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const portfolio = await getPortfolio();
  if (!portfolio) return <main className="offline"><p>Portfolio API is not available.</p></main>;

  const project = portfolio.projects.find((p) => p.id === decodeURIComponent(id) && p.visible !== false);
  if (!project) notFound();

  const styles = {
    "--accent": portfolio.siteSettings.accent,
    "--bg": portfolio.siteSettings.background,
    "--fg": portfolio.siteSettings.foreground,
    "--muted": portfolio.siteSettings.muted,
  } as CSSProperties;

  const html = projectArticleHtml(project.description);

  return (
    <main className="project-detail-page" style={styles}>
      <header className="project-detail-nav">
        <a href="/">← Back to portfolio</a>
        <span>{portfolio.profile.shortName}</span>
      </header>

      <article className="project-detail">
        <div className="project-detail-kicker">
          <span>{project.category || "Project"}</span>
          <span>Case study</span>
        </div>

        <h1>{project.title}</h1>
        {project.summary && <p className="project-detail-summary">{project.summary}</p>}

        <div className="project-detail-meta">
          <div className="tags">{project.tech.map((tech) => <span key={tech}>{tech}</span>)}</div>
          <div className="project-links">
            {project.liveUrl && <a href={project.liveUrl} target="_blank" rel="noreferrer">Live ↗</a>}
            {project.githubUrl && <a href={project.githubUrl} target="_blank" rel="noreferrer">Code ↗</a>}
          </div>
        </div>

        {project.imageUrl && <img className="project-detail-cover" src={project.imageUrl} alt={project.title} />}

        {html && <div className="project-article" dangerouslySetInnerHTML={{ __html: html }} />}
      </article>
    </main>
  );
}
