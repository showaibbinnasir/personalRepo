"use client";
import type { Portfolio } from "@/lib/types";
import type { CSSProperties } from "react";
import ChatWidget from "./ChatWidget";

const sortVisible = <T extends { visible?: boolean; order?: number }>(items: T[]) => [...items].filter(i => i.visible !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
const dateRange = (a?: string, b?: string, current?: boolean) => [a, current ? "Present" : b].filter(Boolean).join(" — ");

function Kicker({ index, title, meta }: { index: string; title: string; meta?: string }) {
  return <div className="section-kicker"><span>{index}</span><span>// {title}</span><span>{meta || ""}</span></div>;
}

export default function PortfolioSite({ data }: { data: Portfolio }) {
  const { profile, siteSettings } = data;
  const styles = { "--accent": siteSettings.accent, "--bg": siteSettings.background, "--fg": siteSettings.foreground, "--muted": siteSettings.muted } as CSSProperties;
  const education = sortVisible(data.education), experiences = sortVisible(data.experiences), leadership = sortVisible(data.leadership), projects = sortVisible(data.projects), skills = sortVisible(data.skillGroups), languages = sortVisible(data.languages || []), certs = sortVisible(data.certifications), achievements = sortVisible(data.achievements), socials = sortVisible(data.socialLinks);
  return <main style={styles}>
    <header className="topbar">
      <a className="brand" href="#top">SBN<span>•</span></a>
      <nav><a href="#work">Work</a><a href="#about">About</a><a href="#contact">Contact</a></nav>
      <a className="pill-link" href={`mailto:${profile.email}`}>CONTACT NOW</a>
    </header>

    <section id="top" className="hero">
      <div className="hero-meta"><span>{profile.title}</span><span>{profile.location || "Open to opportunities"}</span><span>{profile.availability}</span></div>
      <h1><span>{profile.shortName.split(" ").slice(0, 1).join(" ")}</span><span>{profile.shortName.split(" ").slice(1).join(" ")}</span></h1>
      <div className="hero-bottom">
        <p>{profile.heroStatement}</p>
        <div className="portrait-wrap">
          {profile.portraitUrl ? <img src={profile.portraitUrl} alt={profile.name} /> : <div className="portrait-placeholder"><span>SBN</span><small>UPLOAD PORTRAIT IN DASHBOARD</small></div>}
        </div>
      </div>
      <div className="hero-actions">
        <div className="cvActions">
          <a
            className="viewCV"
            href="/cv"
            target="_blank"
            rel="noopener noreferrer"
          >
            View CV ↗
          </a>

          <a
            className="downloadCV"
            href="/cv/showaib-cv.pdf"
            download="Mohammad-Showaib-Bin-Nasir-CV.pdf"
          >
            Download CV ↓
          </a>
        </div>
      </div>
      <div className="scroll-note">SCROLL TO EXPLORE ↓</div>

    </section>

    <section id="about" className="section split-section">
      <Kicker index="01" title="Profile" meta="Who I Am" />
      <div className="section-grid"><h2>Engineering intelligence<br />into practical systems.</h2><div><p className="lead">{profile.bio}</p><div className="mini-links">{socials.map(s => <a key={s.id} href={s.url} target="_blank">{s.label} ↗</a>)}</div></div></div>
    </section>

    {education.length > 0 && <section className="section">
      <Kicker index="02" title="Education" meta="Academic Journey" />
      <div className="rows">{education.map(e => <article className="row" key={e.id}><div><small>{dateRange(e.startDate, e.endDate)}</small><h3>{e.degree}</h3></div><div><strong>{e.institution}</strong><p>{e.location}</p><p>{e.description}</p></div><span>{e.status}</span></article>)}</div>
    </section>}

    {experiences.length > 0 && <section className="section">
      <Kicker index="03" title="Experience" meta="Professional" />
      <div className="rows">{experiences.map(e => <article className="row" key={e.id}><div><small>{dateRange(e.startDate, e.endDate, e.current)}</small><h3>{e.role}</h3></div><div><strong>{e.organization}</strong><p>{e.location}</p>{e.description.map((d, i) => <p key={i}>{d}</p>)}</div><span>Experience</span></article>)}</div>
    </section>}

    {leadership.length > 0 && <section className="section">
      <Kicker index="04" title="Leadership" meta="Community" />
      <div className="rows">{leadership.map(e => <article className="row" key={e.id}><div><small>{dateRange(e.startDate, e.endDate, e.current)}</small><h3>{e.role}</h3></div><div><strong>{e.organization}</strong>{e.description.map((d, i) => <p key={i}>{d}</p>)}</div><span>Leadership</span></article>)}</div>
    </section>}

    <section id="work" className="section projects-section">
      <Kicker index="05" title="Selected Work" meta="Projects" />
      <div className="section-grid"><h2>Projects built to<br />solve, learn & explore.</h2><p className="lead">A selection of robotics, AI and software work. Projects can be added, reordered, hidden or updated from the dashboard.</p></div>
      {projects.length ? <div className="project-grid">{projects.map((p, i) => <article className={`project-card ${p.featured ? 'featured' : ''}`} key={p.id}>{p.imageUrl ? <img src={p.imageUrl} alt="" /> : <div className="project-image-placeholder">PROJECT IMAGE</div>}<div className="project-copy"><small>0{i + 1} / {p.category || 'PROJECT'}</small><h3>{p.title}</h3><p>{p.summary}</p><div className="tags">{p.tech.map(t => <span key={t}>{t}</span>)}</div><div className="project-links">{p.description && <a href={`/projects/${encodeURIComponent(p.id)}`}>Case study ↗</a>}{p.liveUrl && <a href={p.liveUrl} target="_blank">Live ↗</a>}{p.githubUrl && <a href={p.githubUrl} target="_blank">Code ↗</a>}</div></div></article>)}</div> : <div className="empty-public">PROJECTS WILL APPEAR HERE WHEN ADDED FROM THE DASHBOARD.</div>}
    </section>

    {skills.length > 0 && <section className="section">
      <Kicker index="06" title="Stack & Tools" meta="Capabilities" />
      <div className="skills-grid">{skills.map(g => <article key={g.id}><small>{g.category}</small>{g.skills.map(s => <h3 key={s}>{s}</h3>)}</article>)}</div>
    </section>}

    {languages.length > 0 && <section className="section languages-section">
      <Kicker index="07" title="Languages" meta="Communication" />
      <div className="language-list">{languages.map(l => <div key={l.id}><h3>{l.name}</h3><span>{l.level}</span></div>)}</div>
    </section>}

    {(certs.length > 0 || achievements.length > 0) && <section className="section">
      <Kicker index="08" title="Credentials" meta="Recognition" />
      <div className="credentials-grid">
        <div><h2>Certifications</h2>{certs.map(c => <div className="credential" key={c.id}><strong>{c.name}</strong><span>{c.issuer}</span><small>{c.date}</small></div>)}</div>
        <div><h2>Achievements</h2>{achievements.map(a => <div className="credential" key={a.id}><strong>{a.title}</strong><span>{a.organization}</span><small>{a.date}</small>{a.description && <p>{a.description}</p>}</div>)}</div>
      </div>
    </section>}

    <section className="section ai-section">
      <Kicker index="09" title="Ask AI" meta="Portfolio Assistant" />
      <div className="section-grid"><h2>Ask about my<br />background.</h2><div><p className="lead">The AI assistant answers from the portfolio database, so visitors can explore education, experience, leadership, projects and skills conversationally.</p><button className="large-cta" onClick={() => (document.querySelector('.chat-fab') as HTMLButtonElement)?.click()}>ASK THE ASSISTANT ↗</button></div></div>
    </section>

    <footer id="contact" className="footer">
      <small>LET’S CONNECT</small><a className="email-big" href={`mailto:${profile.email}`}>{profile.email}</a><div className="footer-bottom"><span>{profile.phone}</span><span>{siteSettings.footerNote}</span><div>{socials.map(s => <a key={s.id} href={s.url} target="_blank">{s.label}</a>)}</div></div>
    </footer>
    <ChatWidget />
  </main>;
}
