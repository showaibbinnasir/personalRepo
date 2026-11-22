"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BlogPostSummary, Portfolio } from "@/lib/types";
import { HOME_SECTIONS, resolveSectionOrder } from "@/components/PortfolioSite";
import ArrayEditor, { type Field } from "./ArrayEditor";
import BlogManager, { postState } from "./BlogManager";
import ImageUploader from "./ImageUploader";
import Icon from "./icons";
import { cmsApi } from "./cmsApi";
import { BROWSER_API } from "@/lib/api";

type Tab =
  | "Overview" | "Blog" | "Projects" | "Profile" | "Experience" | "Education" | "Skills" | "Leadership"
  | "Certifications" | "Achievements" | "Languages" | "Socials" | "Site";

const NAV: { group: string; items: { tab: Tab; icon: string }[] }[] = [
  { group: "Workspace", items: [{ tab: "Overview", icon: "overview" }, { tab: "Blog", icon: "blog" }, { tab: "Projects", icon: "projects" }] },
  {
    group: "Portfolio",
    items: [
      { tab: "Profile", icon: "profile" }, { tab: "Experience", icon: "experience" }, { tab: "Education", icon: "education" },
      { tab: "Skills", icon: "skills" }, { tab: "Leadership", icon: "leadership" }, { tab: "Certifications", icon: "certifications" },
      { tab: "Achievements", icon: "achievements" }, { tab: "Languages", icon: "languages" }, { tab: "Socials", icon: "socials" }
    ]
  },
  { group: "Settings", items: [{ tab: "Site", icon: "site" }] }
];

const SUBTITLES: Partial<Record<Tab, string>> = {
  Overview: "Everything on your site at a glance.",
  Blog: "Write, schedule and publish posts. Posts save on their own — no need for the main Save button.",
  Projects: "Showcase work on the homepage. Add a full description to give a project its own case-study page.",
  Profile: "Your name, headline, bio and contact details.",
  Experience: "Professional roles, newest first.",
  Education: "Degrees and study.",
  Skills: "Group skills into categories such as Languages, Robotics or Tools.",
  Leadership: "Societies, teams and community roles.",
  Certifications: "Courses and credentials.",
  Achievements: "Awards, competitions and recognition.",
  Languages: "Spoken languages and proficiency.",
  Socials: "Profiles linked across the site and on every blog post.",
  Site: "Colours, homepage section order and footer."
};

const F: Record<string, Field[]> = {
  experience: [
    { key: "role", label: "Role" }, { key: "organization", label: "Organisation" }, { key: "location", label: "Location" },
    { key: "startDate", label: "Start date", placeholder: "e.g. Jan 2025" }, { key: "endDate", label: "End date", placeholder: "Leave empty if current" },
    { key: "current", label: "I currently work here", type: "checkbox" },
    { key: "description", label: "Responsibilities & achievements", type: "lines", full: true, hint: "One bullet point per line." }
  ],
  education: [
    { key: "degree", label: "Degree" }, { key: "institution", label: "Institution" }, { key: "location", label: "Location" },
    { key: "status", label: "Status", placeholder: "Completed, In progress…" }, { key: "startDate", label: "Start" }, { key: "endDate", label: "End" },
    { key: "description", label: "Description", type: "textarea", full: true }
  ],
  projects: [
    { key: "title", label: "Project title" }, { key: "category", label: "Category", placeholder: "Robotics, AI, Web…" },
    { key: "summary", label: "Short summary", type: "textarea", full: true, hint: "Shown on the project card." },
    { key: "imageUrl", label: "Cover image", type: "image", full: true },
    { key: "tech", label: "Technologies", type: "csv", full: true, placeholder: "Python, ROS, PyTorch…" },
    { key: "liveUrl", label: "Live URL", type: "url" }, { key: "githubUrl", label: "GitHub URL", type: "url" },
    { key: "featured", label: "Featured (wide card)", type: "checkbox" },
    { key: "description", label: "Case study", type: "richtext", full: true, hint: "Optional. When filled in, the card links to a full case-study page." }
  ],
  skills: [{ key: "category", label: "Category" }, { key: "skills", label: "Skills", type: "csv", full: true }],
  leadership: [
    { key: "role", label: "Role" }, { key: "organization", label: "Organisation" }, { key: "startDate", label: "Start date" }, { key: "endDate", label: "End date" },
    { key: "current", label: "Current role", type: "checkbox" }, { key: "description", label: "Impact", type: "lines", full: true, hint: "One point per line." }
  ],
  certifications: [
    { key: "name", label: "Certificate / course" }, { key: "issuer", label: "Issuer" }, { key: "date", label: "Date" },
    { key: "credentialUrl", label: "Credential URL", type: "url", full: true }
  ],
  achievements: [
    { key: "title", label: "Achievement" }, { key: "organization", label: "Organisation" }, { key: "date", label: "Date" },
    { key: "description", label: "Description", type: "textarea", full: true }
  ],
  languages: [{ key: "name", label: "Language" }, { key: "level", label: "Proficiency" }],
  socials: [{ key: "label", label: "Platform" }, { key: "url", label: "URL", type: "url", full: true }]
};

type Toast = { id: number; message: string; tone: "success" | "error" | "info" };

export default function AdminDashboard() {
  const [data, setData] = useState<Portfolio | null>(null);
  const [saved, setSaved] = useState("");
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [tab, setTab] = useState<Tab>("Overview");
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [postDirty, setPostDirty] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [newPostSignal, setNewPostSignal] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const notify = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = ++toastId.current;
    setToasts(t => [...t, { id, message, tone }]);
    window.setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), tone === "error" ? 6000 : 3200);
  }, []);

  useEffect(() => {
    (async () => {
      // Only a real "not signed in" answer sends you to the login page;
      // if the API is down, say so instead of looping back to login.
      let me: Response;
      try {
        me = await fetch(`${BROWSER_API}/auth/me`, { credentials: "include" });
      } catch {
        setLoadError("Can't reach the website server.");
        return;
      }
      if (me.status === 401) {
        window.location.href = "/dashboard/login";
        return;
      }
      if (!me.ok) {
        setLoadError(`The API isn't responding (HTTP ${me.status}). Make sure it is running, then retry.`);
        return;
      }
      try {
        const [portfolio, list] = await Promise.all([
          cmsApi<Portfolio>("/portfolio/admin"),
          cmsApi<{ posts: BlogPostSummary[] }>("/posts/admin/all").catch(() => ({ posts: [] }))
        ]);
        setData(portfolio);
        setSaved(JSON.stringify(portfolio));
        setPosts(list.posts);
      } catch (e: any) {
        setLoadError(e.message || "Could not load portfolio data");
      }
    })();
  }, []);

  const dirty = data !== null && JSON.stringify(data) !== saved;
  const anyDirty = dirty || postDirty;

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!anyDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [anyDirty]);

  const save = useCallback(async () => {
    if (!data || saving) return;
    setSaving(true);
    try {
      const next = await cmsApi<Portfolio>("/portfolio/admin", { method: "PUT", body: JSON.stringify(data) });
      setData(next);
      setSaved(JSON.stringify(next));
      notify("Changes saved and published.");
    } catch (e: any) {
      notify(e.message || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }, [data, saving, notify]);

  useEffect(() => {
    if (tab === "Blog") return; // the post editor owns ⌘S there
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, tab]);

  const go = (next: Tab) => {
    if (tab === "Blog" && next !== "Blog" && postDirty && !window.confirm("You have an unsaved post. Leave it?")) return;
    setTab(next);
    setNewPostSignal(0);
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  };

  async function logout() {
    if (anyDirty && !window.confirm("You have unsaved changes. Log out anyway?")) return;
    await cmsApi("/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/dashboard/login";
  }

  const postCounts = useMemo(() => {
    const c = { published: 0, scheduled: 0, draft: 0 };
    posts.forEach(p => c[postState(p)]++);
    return c;
  }, [posts]);

  if (loadError) {
    return (
      <div className="cms cms-loading">
        <p>{loadError}</p>
        <button className="cms-btn cms-btn--primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="cms cms-loading">
        <div className="cms-spinner" />
        <p>Loading your workspace…</p>
      </div>
    );
  }

  const setProfile = (key: keyof Portfolio["profile"], value: string) => setData({ ...data, profile: { ...data.profile, [key]: value } });
  const setSite = (key: keyof Portfolio["siteSettings"], value: string) => setData({ ...data, siteSettings: { ...data.siteSettings, [key]: value } });

  const countFor: Partial<Record<Tab, number>> = {
    Blog: posts.length, Projects: data.projects.length, Experience: data.experiences.length, Education: data.education.length,
    Skills: data.skillGroups.length, Leadership: data.leadership.length, Certifications: data.certifications.length,
    Achievements: data.achievements.length, Languages: (data.languages || []).length, Socials: data.socialLinks.length
  };

  const checklist = [
    { done: Boolean(data.profile.portraitUrl), label: "Add a portrait photo", tab: "Profile" as Tab },
    { done: Boolean(data.profile.bio?.trim()), label: "Write your bio", tab: "Profile" as Tab },
    { done: data.projects.length > 0, label: "Add your first project", tab: "Projects" as Tab },
    { done: data.skillGroups.length > 0, label: "List your skills", tab: "Skills" as Tab },
    { done: data.experiences.length > 0, label: "Add professional experience", tab: "Experience" as Tab },
    { done: postCounts.published > 0, label: "Publish your first blog post", tab: "Blog" as Tab }
  ];
  const completeness = Math.round((checklist.filter(c => c.done).length / checklist.length) * 100);

  const order = resolveSectionOrder(data.sectionOrder);
  const hidden = new Set(data.hiddenSections || []);
  const moveSection = (index: number, dir: -1 | 1) => {
    const next = [...order];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setData({ ...data, sectionOrder: next });
  };
  const toggleSection = (key: string) => {
    const next = new Set(hidden);
    next.has(key) ? next.delete(key) : next.add(key);
    setData({ ...data, sectionOrder: order, hiddenSections: [...next] });
  };

  const array = (t: Tab) => {
    const common = { title: "", items: [] as any[], onChange: (_: any[]) => {}, fields: [] as Field[], blank: {}, labelKey: "", subtitleKeys: [] as string[] };
    switch (t) {
      case "Projects": return { ...common, title: "Project", items: data.projects, onChange: (v: any[]) => setData({ ...data, projects: v }), fields: F.projects, blank: { title: "", category: "", summary: "", description: "", tech: [], imageUrl: "", liveUrl: "", githubUrl: "", featured: false }, labelKey: "title", subtitleKeys: ["category"] };
      case "Experience": return { ...common, title: "Role", items: data.experiences, onChange: (v: any[]) => setData({ ...data, experiences: v }), fields: F.experience, blank: { role: "", organization: "", location: "", startDate: "", endDate: "", current: false, description: [] }, labelKey: "role", subtitleKeys: ["organization", "startDate"] };
      case "Education": return { ...common, title: "Qualification", items: data.education, onChange: (v: any[]) => setData({ ...data, education: v }), fields: F.education, blank: { degree: "", institution: "", location: "", startDate: "", endDate: "", status: "", description: "" }, labelKey: "degree", subtitleKeys: ["institution", "endDate"] };
      case "Skills": return { ...common, title: "Skill group", items: data.skillGroups, onChange: (v: any[]) => setData({ ...data, skillGroups: v }), fields: F.skills, blank: { category: "", skills: [] }, labelKey: "category" };
      case "Leadership": return { ...common, title: "Role", items: data.leadership, onChange: (v: any[]) => setData({ ...data, leadership: v }), fields: F.leadership, blank: { role: "", organization: "", startDate: "", endDate: "", current: false, description: [] }, labelKey: "role", subtitleKeys: ["organization"] };
      case "Certifications": return { ...common, title: "Certification", items: data.certifications, onChange: (v: any[]) => setData({ ...data, certifications: v }), fields: F.certifications, blank: { name: "", issuer: "", date: "", credentialUrl: "" }, labelKey: "name", subtitleKeys: ["issuer", "date"] };
      case "Achievements": return { ...common, title: "Achievement", items: data.achievements, onChange: (v: any[]) => setData({ ...data, achievements: v }), fields: F.achievements, blank: { title: "", organization: "", date: "", description: "" }, labelKey: "title", subtitleKeys: ["organization", "date"] };
      case "Languages": return { ...common, title: "Language", items: data.languages || [], onChange: (v: any[]) => setData({ ...data, languages: v }), fields: F.languages, blank: { name: "", level: "" }, labelKey: "name", subtitleKeys: ["level"] };
      case "Socials": return { ...common, title: "Link", items: data.socialLinks, onChange: (v: any[]) => setData({ ...data, socialLinks: v }), fields: F.socials, blank: { label: "", url: "" }, labelKey: "label", subtitleKeys: ["url"] };
      default: return null;
    }
  };
  const arrayProps = array(tab);

  return (
    <div className={`cms ${menuOpen ? "menu-open" : ""}`}>
      <aside className="cms-sidebar">
        <div className="cms-brand">
          <span className="cms-logo">SBN<i>•</i></span>
          <span><strong>Studio</strong><small>Portfolio CMS</small></span>
          <button type="button" className="cms-menu-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><Icon name="close" /></button>
        </div>
        <nav className="cms-nav">
          {NAV.map(section => (
            <div key={section.group} className="cms-nav-group">
              <small>{section.group}</small>
              {section.items.map(item => (
                <button key={item.tab} type="button" className={tab === item.tab ? "is-active" : ""} onClick={() => go(item.tab)}>
                  <Icon name={item.icon} size={17} />
                  <span>{item.tab}</span>
                  {countFor[item.tab] !== undefined && <em>{countFor[item.tab]}</em>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="cms-sidebar-foot">
          <a href="/" target="_blank" rel="noreferrer"><Icon name="external" size={16} /> View site</a>
          <button type="button" onClick={logout}><Icon name="logout" size={16} /> Log out</button>
        </div>
      </aside>
      <div className="cms-scrim" onClick={() => setMenuOpen(false)} />

      <div className="cms-main">
        <header className="cms-topbar">
          <button type="button" className="cms-menu" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Icon name="menu" /></button>
          <div className="cms-topbar-title">
            <h1>{tab === "Site" ? "Site settings" : tab}</h1>
            <p>{SUBTITLES[tab]}</p>
          </div>
          {tab !== "Blog" && (
            <div className="cms-topbar-actions">
              <span className={`cms-save-state ${dirty ? "is-dirty" : ""}`}>
                {saving ? "Saving…" : dirty ? "Unsaved changes" : <><Icon name="check" size={14} /> All changes saved</>}
              </span>
              {dirty && <button type="button" className="cms-btn cms-btn--ghost" onClick={() => setData(JSON.parse(saved))}>Discard</button>}
              <button type="button" className="cms-btn cms-btn--primary" onClick={save} disabled={!dirty || saving}>Save changes</button>
            </div>
          )}
        </header>

        <div className="cms-content" key={tab}>
          {tab === "Overview" && (
            <div className="cms-overview">
              <div className="cms-hello">
                <div>
                  <small>Welcome back</small>
                  <h2>{data.profile.shortName.split(" ")[0]}, what are we shipping today?</h2>
                </div>
                <div className="cms-quick">
                  <button type="button" className="cms-btn cms-btn--primary" onClick={() => { setTab("Blog"); setNewPostSignal(Date.now()); }}><Icon name="blog" size={16} /> Write a post</button>
                  <button type="button" className="cms-btn" onClick={() => go("Projects")}><Icon name="projects" size={16} /> Add project</button>
                  <a className="cms-btn" href="/" target="_blank" rel="noreferrer"><Icon name="external" size={16} /> View site</a>
                </div>
              </div>

              <div className="cms-stat-grid">
                {[
                  { label: "Published posts", value: postCounts.published, sub: `${postCounts.draft} drafts · ${postCounts.scheduled} scheduled`, tab: "Blog" as Tab },
                  { label: "Projects", value: data.projects.length, sub: `${data.projects.filter(p => p.visible !== false).length} visible`, tab: "Projects" as Tab },
                  { label: "Experience", value: data.experiences.length + data.leadership.length, sub: "roles & leadership", tab: "Experience" as Tab },
                  { label: "Skills", value: data.skillGroups.reduce((n, g) => n + g.skills.length, 0), sub: `${data.skillGroups.length} groups`, tab: "Skills" as Tab }
                ].map(s => (
                  <button type="button" className="cms-stat" key={s.label} onClick={() => go(s.tab)}>
                    <small>{s.label}</small>
                    <strong>{s.value}</strong>
                    <span>{s.sub}</span>
                  </button>
                ))}
              </div>

              <div className="cms-overview-grid">
                <section className="cms-card">
                  <div className="cms-card-head">
                    <h3>Recent posts</h3>
                    <button type="button" className="cms-link" onClick={() => go("Blog")}>Manage →</button>
                  </div>
                  {posts.length === 0 ? (
                    <p className="cms-muted">No posts yet. Your writing will show up here.</p>
                  ) : (
                    <ul className="cms-mini-list">
                      {posts.slice(0, 5).map(p => {
                        const st = postState(p);
                        return (
                          <li key={p._id}>
                            <span>{p.title}</span>
                            <span className={`cms-status cms-status--${st}`}>{st}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>

                <section className="cms-card">
                  <div className="cms-card-head">
                    <h3>Portfolio completeness</h3>
                    <strong className="cms-percent">{completeness}%</strong>
                  </div>
                  <div className="cms-meter"><span style={{ width: `${completeness}%` }} /></div>
                  <ul className="cms-checklist">
                    {checklist.map(item => (
                      <li key={item.label} className={item.done ? "is-done" : ""}>
                        <span className="cms-check">{item.done && <Icon name="check" size={12} />}</span>
                        {item.done ? <span>{item.label}</span> : <button type="button" className="cms-link" onClick={() => go(item.tab)}>{item.label}</button>}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          )}

          {tab === "Blog" && (
            <BlogManager posts={posts} setPosts={setPosts} portfolio={data} notify={notify} onDirtyChange={setPostDirty} startNew={newPostSignal} />
          )}

          {tab === "Profile" && (
            <div className="cms-stack">
              <section className="cms-card">
                <h3>Identity</h3>
                <div className="cms-grid">
                  {([["name", "Full name"], ["shortName", "Display name (hero)"], ["title", "Professional title"], ["location", "Location"], ["availability", "Availability", true]] as const).map(([k, l, full]) => (
                    <div className={`cms-field ${full ? "is-full" : ""}`} key={k}>
                      <label htmlFor={k}>{l}</label>
                      <input id={k} className="cms-input" value={data.profile[k] || ""} onChange={e => setProfile(k, e.target.value)} />
                    </div>
                  ))}
                </div>
              </section>
              <section className="cms-card">
                <h3>Story</h3>
                <div className="cms-grid">
                  <div className="cms-field is-full">
                    <label htmlFor="hero">Hero statement</label>
                    <textarea id="hero" rows={2} className="cms-input" value={data.profile.heroStatement} onChange={e => setProfile("heroStatement", e.target.value)} />
                  </div>
                  <div className="cms-field is-full">
                    <label htmlFor="bio">Biography <em>{data.profile.bio.length} chars</em></label>
                    <textarea id="bio" rows={5} className="cms-input" value={data.profile.bio} onChange={e => setProfile("bio", e.target.value)} />
                  </div>
                </div>
              </section>
              <div className="cms-two">
                <section className="cms-card">
                  <h3>Contact</h3>
                  <div className="cms-field">
                    <label htmlFor="email">Email</label>
                    <input id="email" type="email" className="cms-input" value={data.profile.email} onChange={e => setProfile("email", e.target.value)} />
                  </div>
                  <div className="cms-field">
                    <label htmlFor="phone">Phone <em>shown publicly</em></label>
                    <input id="phone" className="cms-input" value={data.profile.phone} onChange={e => setProfile("phone", e.target.value)} />
                  </div>
                  <div className="cms-field">
                    <label htmlFor="cv">CV / resume URL</label>
                    <input id="cv" className="cms-input" value={data.profile.resumeUrl} placeholder="/cv/showaib-cv.pdf (default)" onChange={e => setProfile("resumeUrl", e.target.value)} />
                    <small className="cms-hint">Used by every “Download CV” button. Leave empty to use the bundled PDF.</small>
                  </div>
                </section>
                <section className="cms-card">
                  <h3>Portrait</h3>
                  <ImageUploader value={data.profile.portraitUrl} onChange={v => setProfile("portraitUrl", v)} label="portrait" />
                </section>
              </div>
            </div>
          )}

          {arrayProps && <ArrayEditor {...arrayProps} />}

          {tab === "Site" && (
            <div className="cms-stack">
              <section className="cms-card">
                <h3>Homepage sections</h3>
                <p className="cms-muted">Reorder with the arrows and switch sections on or off. The contact footer always comes last.</p>
                <ol className="cms-sections">
                  {order.map((key, i) => {
                    const meta = HOME_SECTIONS.find(s => s.key === key)!;
                    const off = hidden.has(key);
                    return (
                      <li key={key} className={off ? "is-off" : ""}>
                        <span className="cms-item-index">{String(i + 1).padStart(2, "0")}</span>
                        <strong>{meta.label}</strong>
                        <label className="cms-switch cms-switch--sm">
                          <input type="checkbox" checked={!off} onChange={() => toggleSection(key)} />
                          <span className="cms-switch-track" />
                          <span>{off ? "Hidden" : "Shown"}</span>
                        </label>
                        <span className="cms-item-tools">
                          <button type="button" disabled={i === 0} onClick={() => moveSection(i, -1)} title="Move up"><Icon name="up" size={15} /></button>
                          <button type="button" disabled={i === order.length - 1} onClick={() => moveSection(i, 1)} title="Move down"><Icon name="down" size={15} /></button>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </section>

              <section className="cms-card">
                <h3>Colours</h3>
                <div className="cms-colors">
                  {([["accent", "Accent"], ["background", "Background"], ["foreground", "Text"], ["muted", "Muted text"]] as const).map(([k, l]) => (
                    <label className="cms-color" key={k}>
                      <input type="color" value={/^#[0-9a-f]{6}$/i.test(data.siteSettings[k]) ? data.siteSettings[k] : "#000000"} onChange={e => setSite(k, e.target.value)} />
                      <span>
                        <strong>{l}</strong>
                        <input className="cms-input cms-input--sm" value={data.siteSettings[k]} onChange={e => setSite(k, e.target.value)} />
                      </span>
                    </label>
                  ))}
                </div>
                <div className="cms-theme-preview" style={{ background: data.siteSettings.background, color: data.siteSettings.foreground }}>
                  <small style={{ color: data.siteSettings.muted }}>01 <span style={{ color: data.siteSettings.accent }}>//</span> PREVIEW</small>
                  <strong>{data.profile.shortName}<span style={{ color: data.siteSettings.accent }}>•</span></strong>
                  <p style={{ color: data.siteSettings.muted }}>{data.profile.title}</p>
                  <span className="cms-theme-btn" style={{ background: data.siteSettings.accent }}>Contact now</span>
                </div>
              </section>

              <section className="cms-card">
                <h3>Footer</h3>
                <div className="cms-field">
                  <label htmlFor="footer">Footer note</label>
                  <input id="footer" className="cms-input" value={data.siteSettings.footerNote} onChange={e => setSite("footerNote", e.target.value)} />
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      <div className="cms-toasts" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`cms-toast cms-toast--${t.tone}`}>
            <Icon name={t.tone === "error" ? "close" : "check"} size={15} />
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
