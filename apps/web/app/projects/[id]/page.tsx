import { getPortfolio } from "@/lib/api";
import { notFound } from "next/navigation";
import { sanitizeRichText } from "@/lib/richtext";
import SiteHeader from "@/components/SiteHeader";
import ShareButtons from "@/components/ShareButtons";
import StoryShare from "@/components/StoryShare";
import type { CSSProperties } from "react";
import type { Metadata } from "next";

export const revalidate = 60;

import { hasRichContent, SITE_URL, uniqueList } from "@/lib/site";

export async function generateStaticParams() {
  const portfolio = await getPortfolio();
  if (!portfolio) return [];
  return portfolio.projects.filter(p => p.visible !== false).map(p => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const portfolio = await getPortfolio();
  const project = portfolio?.projects.find(p => p.id === decodeURIComponent(id) && p.visible !== false);
  if (!project) return { title: "Project not found" };

  const title = project.title;
  const description = project.summary || `${project.title} — a project by ${portfolio?.profile.name}.`;
  const url = `${SITE_URL}/projects/${encodeURIComponent(project.id)}`;
  // Projects without a cover get a generated, branded preview card.
  const image = project.imageUrl || `${url}/og`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images: [{ url: image, alt: project.title, ...(project.imageUrl ? {} : { width: 1200, height: 630 }) }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image]
    }
  };
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

  const url = `${SITE_URL}/projects/${encodeURIComponent(project.id)}`;
  const shareText = project.summary || `${project.title}, a project by ${portfolio.profile.name}.`;
  const storyPath = `/projects/${encodeURIComponent(project.id)}/story`;
  const html = hasRichContent(project.description) ? sanitizeRichText(project.description) : "";
  const tech = uniqueList(project.tech);

  // Next project (wrapping around), in the same order as the homepage.
  const ordered = portfolio.projects.filter(p => p.visible !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
  const position = ordered.findIndex(p => p.id === project.id);
  const nextProject = ordered.length > 1 ? ordered[(position + 1) % ordered.length] : null;

  const projectLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.summary || undefined,
    image: project.imageUrl || undefined,
    url: `${SITE_URL}/projects/${encodeURIComponent(project.id)}`,
    creator: { "@type": "Person", name: portfolio.profile.name },
    keywords: project.tech?.length ? project.tech.join(", ") : undefined,
    ...(project.liveUrl ? { sameAs: [project.liveUrl] } : {})
  };

  return (
    <main className="project-detail-page" style={styles}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(projectLd).replace(/</g, "\\u003c") }}
      />
      <SiteHeader name={portfolio.profile.shortName} email={portfolio.profile.email} />

      <article className="project-detail">
        <a className="back-link" href="/#work">← All projects</a>
        <div className="project-detail-kicker">
          <span>{project.category || "Project"}</span>
          <span>{html ? "Case study" : "Project"}</span>
        </div>

        <h1>{project.title}</h1>
        {project.summary && <p className="project-detail-summary">{project.summary}</p>}

        <div className="post-share-row project-share-row">
          <StoryShare slug={project.id} url={url} title={project.title} imagePath={storyPath} noun="project" />
          <ShareButtons url={url} title={project.title} text={shareText} noun="project" compact />
        </div>

        {(tech.length > 0 || project.liveUrl || project.githubUrl) && (
          <section className="project-specs" aria-label="Project details">
            {tech.length > 0 && (
              <div className="project-specs-stack">
                <div className="project-specs-head">
                  <span>{"// Tech stack"}</span>
                  <span>{tech.length} {tech.length === 1 ? "technology" : "technologies"}</span>
                </div>
                <ul className="chips chips--lg">
                  {tech.map((item, i) => <li key={`${item}-${i}`}>{item}</li>)}
                </ul>
              </div>
            )}
            {(project.liveUrl || project.githubUrl) && (
              <div className="project-actions">
                {project.liveUrl && (
                  <a className="project-action project-action--primary" href={project.liveUrl} target="_blank" rel="noreferrer">
                    View live <i aria-hidden="true">↗</i>
                  </a>
                )}
                {project.githubUrl && (
                  <a className="project-action" href={project.githubUrl} target="_blank" rel="noreferrer">
                    Source code <i aria-hidden="true">↗</i>
                  </a>
                )}
              </div>
            )}
          </section>
        )}

        {project.imageUrl && <img className="project-detail-cover" data-reveal="zoom" src={project.imageUrl} alt={project.title} />}

        {html && <div className="project-article" dangerouslySetInnerHTML={{ __html: html }} />}

        <div className="post-share-footer project-share-footer">
          <ShareButtons url={url} title={project.title} text={shareText} noun="project" />
          <StoryShare slug={project.id} url={url} title={project.title} imagePath={storyPath} noun="project" />
        </div>

        <nav className="project-detail-footer" aria-label="More projects">
          <a href="/#work"><small>← Back</small><strong>All projects</strong></a>
          {nextProject && (
            <a href={`/projects/${encodeURIComponent(nextProject.id)}`} className="next">
              <small>Next project →</small>
              <strong>{nextProject.title}</strong>
            </a>
          )}
        </nav>
      </article>
    </main>
  );
}