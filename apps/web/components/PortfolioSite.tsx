"use client";

import type { BlogPostSummary, Portfolio } from "@/lib/types";
import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import ChatWidget from "./ChatWidget";
import BlogCard from "./BlogCard";
import { DEFAULT_RESUME_PATH } from "@/lib/site";

const PROJECTS_PER_PAGE = 6;

/** Every homepage section the CMS can order or hide. The footer/contact is always last. */
export const HOME_SECTIONS = [
  { key: "about", label: "Profile" },
  { key: "education", label: "Education" },
  { key: "experience", label: "Experience" },
  { key: "leadership", label: "Leadership" },
  { key: "projects", label: "Projects" },
  { key: "blog", label: "Blog" },
  { key: "skills", label: "Skills" },
  { key: "languages", label: "Languages" },
  { key: "certifications", label: "Credentials" },
  { key: "ask-ai", label: "Ask AI" }
] as const;

const ALIASES: Record<string, string> = { achievements: "certifications", credentials: "certifications" };

/** Saved order first (de-duplicated), then any sections the saved order doesn't know about yet. */
export function resolveSectionOrder(saved: string[] = []) {
  const known = HOME_SECTIONS.map(s => s.key as string);
  const ordered: string[] = [];
  for (const raw of saved) {
    const key = ALIASES[raw] || raw;
    if (known.includes(key) && !ordered.includes(key)) ordered.push(key);
  }
  for (const key of known) {
    if (ordered.includes(key)) continue;
    // New sections slot in after the one they follow by default (e.g. blog after projects).
    const prev = known[known.indexOf(key) - 1];
    const at = prev ? ordered.indexOf(prev) : -1;
    if (at >= 0) ordered.splice(at + 1, 0, key);
    else ordered.push(key);
  }
  return ordered;
}

const sortVisible = <T extends { visible?: boolean; order?: number }>(items: T[] = []) =>
  [...items].filter(item => item.visible !== false).sort((a, b) => (a.order || 0) - (b.order || 0));

const dateRange = (start?: string, end?: string, current?: boolean) =>
  [start, current ? "Present" : end].filter(Boolean).join(" — ");

const lines = (items?: string[]) => (items || []).filter(line => line?.trim());

function Kicker({ index, title, meta }: { index: string; title: string; meta?: string }) {
  return (
    <div className="section-kicker">
      <span>{index}</span>
      <span>// {title}</span>
      <span>{meta || ""}</span>
    </div>
  );
}

export default function PortfolioSite({ data, posts = [] }: { data: Portfolio; posts?: BlogPostSummary[] }) {
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [projectPage, setProjectPage] = useState(1);

  const { profile, siteSettings } = data;
  const resumeUrl = profile.resumeUrl?.trim() || DEFAULT_RESUME_PATH;

  const styles = {
    "--accent": siteSettings.accent,
    "--bg": siteSettings.background,
    "--fg": siteSettings.foreground,
    "--muted": siteSettings.muted
  } as CSSProperties;

  const education = sortVisible(data.education);
  const experiences = sortVisible(data.experiences);
  const leadership = sortVisible(data.leadership);
  const projects = sortVisible(data.projects);
  const skills = sortVisible(data.skillGroups);
  const languages = sortVisible(data.languages || []);
  const certs = sortVisible(data.certifications);
  const achievements = sortVisible(data.achievements);
  const socials = sortVisible(data.socialLinks);

  /* Project pagination */
  const totalProjectPages = Math.ceil(projects.length / PROJECTS_PER_PAGE);
  const projectStartIndex = (projectPage - 1) * PROJECTS_PER_PAGE;
  const displayedProjects = showAllProjects
    ? projects.slice(projectStartIndex, projectStartIndex + PROJECTS_PER_PAGE)
    : projects.slice(0, 3);

  const scrollToProjects = () =>
    window.setTimeout(() => document.getElementById("work")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);

  const changeProjectPage = (page: number) => {
    if (page < 1 || page > totalProjectPages) return;
    setProjectPage(page);
    scrollToProjects();
  };

  const nameParts = profile.shortName.split(" ");
  const hidden = new Set(data.hiddenSections || []);
  let sectionNumber = 0;
  const next = () => String(++sectionNumber).padStart(2, "0");

  const sections: Record<string, () => ReactNode> = {
    about: () => (
      <section id="about" className="section split-section" key="about">
        <Kicker index={next()} title="Profile" meta="Who I Am" />
        <div className="section-grid">
          <h2>Engineering intelligence<br />into practical systems.</h2>
          <div>
            <p className="lead">{profile.bio}</p>
            <div className="mini-links">
              {socials.map(social => (
                <a key={social.id} href={social.url} target="_blank" rel="noreferrer">{social.label} ↗</a>
              ))}
            </div>
          </div>
        </div>
      </section>
    ),

    education: () =>
      education.length > 0 && (
        <section className="section" id="education" key="education">
          <Kicker index={next()} title="Education" meta="Academic Journey" />
          <div className="rows">
            {education.map(item => (
              <article className="row" key={item.id}>
                <div>
                  <small>{dateRange(item.startDate, item.endDate)}</small>
                  <h3>{item.degree}</h3>
                </div>
                <div>
                  <strong>{item.institution}</strong>
                  {item.location && <p>{item.location}</p>}
                  {item.description && <p>{item.description}</p>}
                </div>
                <span>{item.status}</span>
              </article>
            ))}
          </div>
        </section>
      ),

    experience: () =>
      experiences.length > 0 && (
        <section className="section" id="experience" key="experience">
          <Kicker index={next()} title="Experience" meta="Professional" />
          <div className="rows">
            {experiences.map(item => (
              <article className="row" key={item.id}>
                <div>
                  <small>{dateRange(item.startDate, item.endDate, item.current)}</small>
                  <h3>{item.role}</h3>
                </div>
                <div>
                  <strong>{item.organization}</strong>
                  {item.location && <p>{item.location}</p>}
                  {lines(item.description).map((line, i) => <p key={i}>{line}</p>)}
                </div>
                <span>Experience</span>
              </article>
            ))}
          </div>
        </section>
      ),

    leadership: () =>
      leadership.length > 0 && (
        <section className="section" id="leadership" key="leadership">
          <Kicker index={next()} title="Leadership" meta="Community" />
          <div className="rows">
            {leadership.map(item => (
              <article className="row" key={item.id}>
                <div>
                  <small>{dateRange(item.startDate, item.endDate, item.current)}</small>
                  <h3>{item.role}</h3>
                </div>
                <div>
                  <strong>{item.organization}</strong>
                  {lines(item.description).map((line, i) => <p key={i}>{line}</p>)}
                </div>
                <span>Leadership</span>
              </article>
            ))}
          </div>
        </section>
      ),

    projects: () => (
      <section id="work" className="section projects-section" key="projects">
        <Kicker index={next()} title="Selected Work" meta="Projects" />
        <div className="section-grid">
          <h2>Projects built to<br />solve, learn &amp; explore.</h2>
          <p className="lead">A selection of robotics, AI and software work — from early prototypes to finished systems.</p>
        </div>

        {projects.length > 0 ? (
          <>
            <div className="project-grid">
              {displayedProjects.map((project, index) => {
                const projectNumber = showAllProjects ? projectStartIndex + index + 1 : index + 1;
                return (
                  <article className={`project-card ${project.featured ? "featured" : ""}`} key={project.id}>
                    {project.imageUrl ? (
                      <img src={project.imageUrl} alt={project.title} loading="lazy" />
                    ) : (
                      <div className="project-image-placeholder">PROJECT IMAGE</div>
                    )}
                    <div className="project-copy">
                      <small>{String(projectNumber).padStart(2, "0")} / {project.category || "PROJECT"}</small>
                      <h3>{project.title}</h3>
                      <p>{project.summary}</p>
                      <div className="tags">
                        {project.tech.map(technology => <span key={technology}>{technology}</span>)}
                      </div>
                      <div className="project-links">
                        {project.description && <a href={`/projects/${encodeURIComponent(project.id)}`}>Case study ↗</a>}
                        {project.liveUrl && <a href={project.liveUrl} target="_blank" rel="noreferrer">Live ↗</a>}
                        {project.githubUrl && <a href={project.githubUrl} target="_blank" rel="noreferrer">Code ↗</a>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {projects.length > 3 && (
              <div className="projects-navigation">
                {!showAllProjects ? (
                  <button type="button" className="view-more-projects" onClick={() => { setShowAllProjects(true); setProjectPage(1); }}>
                    <span>View More Projects</span>
                    <span className="navigation-arrow">↓</span>
                  </button>
                ) : (
                  <>
                    {totalProjectPages > 1 && (
                      <div className="project-pagination">
                        <button type="button" className="pagination-arrow" aria-label="Previous projects" disabled={projectPage === 1} onClick={() => changeProjectPage(projectPage - 1)}>←</button>
                        <div className="pagination-pages">
                          {Array.from({ length: totalProjectPages }, (_, i) => i + 1).map(page => (
                            <button
                              type="button"
                              key={page}
                              aria-label={`Go to project page ${page}`}
                              aria-current={projectPage === page ? "page" : undefined}
                              className={projectPage === page ? "active" : ""}
                              onClick={() => changeProjectPage(page)}
                            >
                              {String(page).padStart(2, "0")}
                            </button>
                          ))}
                        </div>
                        <button type="button" className="pagination-arrow" aria-label="Next projects" disabled={projectPage === totalProjectPages} onClick={() => changeProjectPage(projectPage + 1)}>→</button>
                      </div>
                    )}
                    <div className="project-results-meta">
                      <span>
                        Showing {projectStartIndex + 1}–{Math.min(projectStartIndex + PROJECTS_PER_PAGE, projects.length)} of {projects.length}
                      </span>
                    </div>
                    <button type="button" className="show-less-projects" onClick={() => { setShowAllProjects(false); setProjectPage(1); scrollToProjects(); }}>
                      <span>Show Less</span>
                      <span className="navigation-arrow">↑</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="empty-public">PROJECTS WILL APPEAR HERE WHEN ADDED FROM THE DASHBOARD.</div>
        )}
      </section>
    ),

    blog: () =>
      posts.length > 0 && (
        <section id="blog" className="section home-blog" key="blog">
          <Kicker index={next()} title="Journal" meta="Latest Writing" />
          <div className="section-grid">
            <h2>Thoughts,<br />notes &amp; ideas.</h2>
            <div>
              <p className="lead">Writing about what I&apos;m building, learning and thinking about in robotics, AI and software.</p>
              <div className="mini-links">
                <a href="/blog">All articles ↗</a>
                <a href="/blog/feed.xml">RSS ↗</a>
              </div>
            </div>
          </div>
          <div className="blog-grid home-blog-grid">
            {posts.slice(0, 3).map((post, i) => <BlogCard key={post._id} post={post} index={i} />)}
          </div>
        </section>
      ),

    skills: () =>
      skills.length > 0 && (
        <section className="section" id="skills" key="skills">
          <Kicker index={next()} title="Stack & Tools" meta="Capabilities" />
          <div className="skills-grid">
            {skills.map(group => (
              <article key={group.id}>
                <small>{group.category}</small>
                {group.skills.map(skill => <h3 key={skill}>{skill}</h3>)}
              </article>
            ))}
          </div>
        </section>
      ),

    languages: () =>
      languages.length > 0 && (
        <section className="section languages-section" id="languages" key="languages">
          <Kicker index={next()} title="Languages" meta="Communication" />
          <div className="language-list">
            {languages.map(language => (
              <div key={language.id}>
                <h3>{language.name}</h3>
                <span>{language.level}</span>
              </div>
            ))}
          </div>
        </section>
      ),

    certifications: () =>
      (certs.length > 0 || achievements.length > 0) && (
        <section className="section" id="credentials" key="certifications">
          <Kicker index={next()} title="Credentials" meta="Recognition" />
          <div className="credentials-grid">
            {certs.length > 0 && (
              <div>
                <h2>Certifications</h2>
                {certs.map(item => (
                  <div className="credential" key={item.id}>
                    <strong>
                      {item.credentialUrl ? <a href={item.credentialUrl} target="_blank" rel="noreferrer">{item.name} ↗</a> : item.name}
                    </strong>
                    <span>{item.issuer}</span>
                    <small>{item.date}</small>
                  </div>
                ))}
              </div>
            )}
            {achievements.length > 0 && (
              <div>
                <h2>Achievements</h2>
                {achievements.map(item => (
                  <div className="credential" key={item.id}>
                    <strong>{item.title}</strong>
                    <span>{item.organization}</span>
                    <small>{item.date}</small>
                    {item.description && <p>{item.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ),

    "ask-ai": () => (
      <section className="section ai-section" id="ask-ai" key="ask-ai">
        <Kicker index={next()} title="Ask AI" meta="Portfolio Assistant" />
        <div className="section-grid">
          <h2>Ask about my<br />background.</h2>
          <div>
            <p className="lead">
              The AI assistant answers from this portfolio, so you can explore my education, experience, leadership, projects, skills and writing conversationally.
            </p>
            <button type="button" className="large-cta" onClick={() => (document.querySelector(".chat-fab") as HTMLButtonElement)?.click()}>
              ASK THE ASSISTANT ↗
            </button>
          </div>
        </div>
      </section>
    )
  };

  const order = resolveSectionOrder(data.sectionOrder).filter(key => !hidden.has(key));
  const navHas = (key: string) => order.includes(key) && (key !== "blog" || posts.length > 0);

  return (
    <main style={styles}>
      <header className="topbar">
        <a className="brand" href="#top">SBN<span>•</span></a>
        <nav aria-label="Main">
          {navHas("projects") && <a href="#work">Work</a>}
          {navHas("about") && <a href="#about">About</a>}
          {navHas("blog") && <a href="/blog">Blog</a>}
          <a href="/cv">CV</a>
          <a href="#contact">Contact</a>
        </nav>
        <a className="pill-link" href={`mailto:${profile.email}`}>CONTACT NOW</a>
      </header>

      <section id="top" className="hero">
        <div className="hero-meta">
          <span>{profile.title}</span>
          <span>{profile.location || "Open to opportunities"}</span>
          <span>{profile.availability}</span>
        </div>

        <h1 data-parallax="0.08">
          <span><span className="hero-line">{nameParts.slice(0, 1).join(" ")}</span></span>
          <span><span className="hero-line">{nameParts.slice(1).join(" ")}</span></span>
        </h1>

        <div className="hero-bottom">
          <div>
            <p>{profile.heroStatement}</p>
            <div className="cvActions">
              <a className="viewCV" href="/cv">View CV ↗</a>
              <a className="downloadCV" href={resumeUrl} download="Mohammad-Showaib-Bin-Nasir-CV.pdf">Download CV ↓</a>
            </div>
          </div>
          <div className="portrait-wrap">
            {profile.portraitUrl ? (
              <img src={profile.portraitUrl} alt={profile.name} data-parallax="0.12" />
            ) : (
              <div className="portrait-placeholder">
                <span>SBN</span>
                <small>UPLOAD PORTRAIT IN DASHBOARD</small>
              </div>
            )}
          </div>
        </div>

        <div className="scroll-note">SCROLL TO EXPLORE <span className="scroll-note-arrow">↓</span></div>
      </section>

      {order.map(key => sections[key]?.())}

      <footer id="contact" className="footer">
        <small>LET&apos;S CONNECT</small>
        <a className="email-big" href={`mailto:${profile.email}`}>{profile.email}</a>
        <div className="footer-bottom">
          <span>{profile.phone}</span>
          <span>{siteSettings.footerNote}</span>
          <div>
            {socials.map(social => (
              <a key={social.id} href={social.url} target="_blank" rel="noreferrer">{social.label}</a>
            ))}
            {posts.length > 0 && <a href="/blog">Blog</a>}
          </div>
        </div>
      </footer>

      <ChatWidget />
    </main>
  );
}
