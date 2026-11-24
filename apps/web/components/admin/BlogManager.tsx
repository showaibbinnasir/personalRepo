"use client";

import { useEffect, useMemo, useState } from "react";
import type { BlogPost, BlogPostSummary, Portfolio } from "@/lib/types";
import Icon from "./icons";
import ImageUploader from "./ImageUploader";
import RichTextEditor from "./RichTextEditor";
import TagInput from "./TagInput";
import { cmsApi, siteOrigin } from "./cmsApi";

type Notify = (message: string, tone?: "success" | "error" | "info") => void;
type Filter = "all" | "published" | "scheduled" | "draft";

type Draft = {
  _id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  coverImageAlt: string;
  tags: string[];
  status: "draft" | "published";
  publishedAt: string | null;
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
};

const EMPTY: Draft = {
  title: "", slug: "", excerpt: "", content: "", coverImageUrl: "", coverImageAlt: "", tags: [],
  status: "draft", publishedAt: null, featured: false, seoTitle: "", seoDescription: ""
};

export const postState = (p: Pick<BlogPostSummary, "status" | "publishedAt">): Exclude<Filter, "all"> =>
  p.status !== "published" ? "draft" : p.publishedAt && new Date(p.publishedAt) > new Date() ? "scheduled" : "published";

const STATE_LABEL = { published: "Published", scheduled: "Scheduled", draft: "Draft" } as const;

const slugify = (v: string) =>
  v.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

const strip = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

export default function BlogManager({
  posts,
  setPosts,
  portfolio,
  notify,
  onDirtyChange,
  startNew
}: {
  posts: BlogPostSummary[];
  setPosts: (p: BlogPostSummary[]) => void;
  portfolio: Portfolio;
  notify: Notify;
  onDirtyChange: (dirty: boolean) => void;
  startNew?: number;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [baseline, setBaseline] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [mode, setMode] = useState<"write" | "preview">("write");

  const dirty = draft !== null && JSON.stringify(draft) !== baseline;
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  // "Write a post" from the overview opens a fresh editor.
  useEffect(() => {
    if (startNew) openNew();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startNew]);

  const counts = useMemo(() => {
    const c = { all: posts.length, published: 0, scheduled: 0, draft: 0 };
    posts.forEach(p => c[postState(p)]++);
    return c;
  }, [posts]);

  const allTags = useMemo(() => [...new Set(posts.flatMap(p => p.tags))].sort(), [posts]);

  const visible = posts.filter(p => {
    if (filter !== "all" && postState(p) !== filter) return false;
    const q = query.trim().toLowerCase();
    return !q || p.title.toLowerCase().includes(q) || p.tags.some(t => t.toLowerCase().includes(q)) || p.slug.includes(q);
  });

  const confirmDiscard = () => !dirty || window.confirm("You have unsaved changes to this post. Discard them?");

  function load(d: Draft) {
    setDraft(d);
    setBaseline(JSON.stringify(d));
    setSlugTouched(Boolean(d._id));
    setMode("write");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openNew() {
    if (!confirmDiscard()) return;
    load({ ...EMPTY });
  }

  async function openPost(id: string) {
    if (!confirmDiscard()) return;
    setLoadingId(id);
    try {
      const { post } = await cmsApi<{ post: BlogPost }>(`/posts/admin/${id}`);
      load({
        _id: post._id, title: post.title, slug: post.slug, excerpt: post.excerpt, content: post.content,
        coverImageUrl: post.coverImageUrl, coverImageAlt: post.coverImageAlt, tags: post.tags, status: post.status,
        publishedAt: post.publishedAt, featured: post.featured, seoTitle: post.seoTitle, seoDescription: post.seoDescription
      });
    } catch (e: any) {
      notify(e.message, "error");
    } finally {
      setLoadingId(null);
    }
  }

  function close() {
    if (!confirmDiscard()) return;
    setDraft(null);
    setBaseline("");
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft(d => {
      if (!d) return d;
      const next = { ...d, [key]: value };
      if (key === "title" && !slugTouched) next.slug = slugify(String(value));
      return next;
    });

  async function save(status?: "draft" | "published") {
    if (!draft) return;
    if (!draft.title.trim()) return notify("Give the post a title first.", "error");
    const body = { ...draft, status: status || draft.status };
    if (body.status === "published" && !body.publishedAt) body.publishedAt = new Date().toISOString();
    setSaving(true);
    try {
      const { post } = draft._id
        ? await cmsApi<{ post: BlogPost }>(`/posts/admin/${draft._id}`, { method: "PUT", body: JSON.stringify(body) })
        : await cmsApi<{ post: BlogPost }>("/posts/admin", { method: "POST", body: JSON.stringify(body) });
      const { content: _c, ...summary } = post;
      setPosts([summary as BlogPostSummary, ...posts.filter(p => p._id !== post._id)]);
      const saved: Draft = { ...body, _id: post._id, slug: post.slug, publishedAt: post.publishedAt, tags: post.tags };
      setDraft(saved);
      setBaseline(JSON.stringify(saved));
      setSlugTouched(true);
      const state = postState(post);
      notify(state === "published" ? "Post is live." : state === "scheduled" ? `Scheduled for ${fmt(post.publishedAt)}.` : "Draft saved.", "success");
    } catch (e: any) {
      notify(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string, title: string) {
    if (!window.confirm(`Delete “${title}” permanently? This cannot be undone.`)) return;
    try {
      await cmsApi(`/posts/admin/${id}`, { method: "DELETE" });
      setPosts(posts.filter(p => p._id !== id));
      if (draft?._id === id) {
        setDraft(null);
        setBaseline("");
      }
      notify("Post deleted.", "info");
    } catch (e: any) {
      notify(e.message, "error");
    }
  }

  // Ctrl/Cmd + S saves the open post.
  useEffect(() => {
    if (!draft) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ------------------------------ Editor ------------------------------ */
  if (draft) {
    const origin = siteOrigin();
    const state = draft._id ? postState({ status: draft.status, publishedAt: draft.publishedAt }) : "draft";
    const seoTitle = draft.seoTitle || draft.title || "Post title";
    const seoDesc = draft.seoDescription || draft.excerpt || strip(draft.content).slice(0, 160) || "A short description of the post appears here.";
    const words = strip(draft.content) ? strip(draft.content).split(" ").length : 0;
    const futureDate = draft.publishedAt && new Date(draft.publishedAt) > new Date();
    const theme = {
      "--accent": portfolio.siteSettings.accent,
      "--bg": portfolio.siteSettings.background,
      "--fg": portfolio.siteSettings.foreground,
      "--muted": portfolio.siteSettings.muted
    } as React.CSSProperties;

    return (
      <div className="cms-post-editor">
        <div className="cms-editor-bar">
          <button type="button" className="cms-btn cms-btn--ghost" onClick={close}>← All posts</button>
          <div className="cms-seg" role="tablist">
            <button type="button" className={mode === "write" ? "is-active" : ""} onClick={() => setMode("write")}>Write</button>
            <button type="button" className={mode === "preview" ? "is-active" : ""} onClick={() => setMode("preview")}>Preview</button>
          </div>
          <span className={`cms-status cms-status--${state}`}>{STATE_LABEL[state]}{dirty ? " · unsaved" : ""}</span>
        </div>

        <div className="cms-post-grid">
          <div className="cms-post-main">
            {mode === "write" ? (
              <>
                <textarea
                  className="cms-title-input"
                  value={draft.title}
                  onChange={e => set("title", e.target.value.replace(/\n/g, " "))}
                  placeholder="Post title"
                  rows={1}
                  autoFocus={!draft._id}
                />
                <div className="cms-slug">
                  <span>{origin.replace(/^https?:\/\//, "")}/blog/</span>
                  <input
                    value={draft.slug}
                    onChange={e => { setSlugTouched(true); set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+/, "")); }}
                    placeholder="post-url"
                    aria-label="URL slug"
                  />
                  {slugTouched && draft.title && (
                    <button type="button" onClick={() => { setSlugTouched(false); set("slug", slugify(draft.title)); }}>Reset</button>
                  )}
                </div>

                <div className="cms-field is-full">
                  <label htmlFor="excerpt">Excerpt <em>{draft.excerpt.length}/300</em></label>
                  <textarea id="excerpt" className="cms-input" rows={3} maxLength={500} value={draft.excerpt} onChange={e => set("excerpt", e.target.value)} placeholder="One or two sentences that introduce the post. Shown on cards, in search results and when shared." />
                </div>

                <RichTextEditor value={draft.content} onChange={html => set("content", html)} minHeight={520} />
              </>
            ) : (
              <div className="cms-preview" style={theme}>
                {draft.tags.length > 0 && <div className="post-tags">{draft.tags.map(t => <a key={t}>{t}</a>)}</div>}
                <h1 className="cms-preview-title">{draft.title || "Untitled post"}</h1>
                {draft.excerpt && <p className="post-excerpt">{draft.excerpt}</p>}
                <p className="cms-preview-meta">{portfolio.profile.name} · {fmt(draft.publishedAt || new Date().toISOString())} · {Math.max(1, Math.round(words / 220))} min read</p>
                {draft.coverImageUrl && <img className="cms-preview-cover" src={draft.coverImageUrl} alt={draft.coverImageAlt} />}
                <div className="project-article post-body" dangerouslySetInnerHTML={{ __html: draft.content || "<p><em>Nothing written yet.</em></p>" }} />
              </div>
            )}
          </div>

          <aside className="cms-post-side">
            <div className="cms-card">
              <h4>Publish</h4>
              <div className="cms-field">
                <label htmlFor="pubdate">{draft.status === "published" ? "Publish date" : "Publish date (optional)"}</label>
                <input
                  id="pubdate"
                  type="datetime-local"
                  className="cms-input"
                  value={toLocalInput(draft.publishedAt)}
                  onChange={e => set("publishedAt", e.target.value ? new Date(e.target.value).toISOString() : null)}
                />
                <small className="cms-hint">{futureDate ? "A future date schedules the post — it goes live automatically." : "Leave empty to use the moment you publish."}</small>
              </div>
              <label className="cms-switch">
                <input type="checkbox" checked={draft.featured} onChange={e => set("featured", e.target.checked)} />
                <span className="cms-switch-track" />
                <span>Feature at the top of the blog</span>
              </label>
              <div className="cms-publish-actions">
                {draft.status === "published" ? (
                  <>
                    <button type="button" className="cms-btn cms-btn--primary" disabled={saving} onClick={() => save("published")}>{saving ? "Saving…" : futureDate ? "Update schedule" : "Update post"}</button>
                    <button type="button" className="cms-btn" disabled={saving} onClick={() => save("draft")}>Unpublish</button>
                  </>
                ) : (
                  <>
                    <button type="button" className="cms-btn cms-btn--primary" disabled={saving} onClick={() => save("published")}>{saving ? "Saving…" : futureDate ? "Schedule" : "Publish"}</button>
                    <button type="button" className="cms-btn" disabled={saving} onClick={() => save("draft")}>Save draft</button>
                  </>
                )}
              </div>
              <div className="cms-publish-links">
                {draft._id && state === "published" && (
                  <>
                    <a href={`/blog/${draft.slug}`} target="_blank" rel="noreferrer"><Icon name="external" size={14} /> View live post</a>
                    <a href={`/blog/${draft.slug}/story`} target="_blank" rel="noreferrer"><Icon name="image" size={14} /> Story image</a>
                  </>
                )}
                {draft._id && (
                  <button type="button" className="cms-link-danger" onClick={() => remove(draft._id!, draft.title)}><Icon name="trash" size={14} /> Delete post</button>
                )}
              </div>
              <small className="cms-hint">Tip: press ⌘/Ctrl + S to save.</small>
            </div>

            <div className="cms-card">
              <h4>Cover image</h4>
              <ImageUploader value={draft.coverImageUrl} onChange={url => set("coverImageUrl", url)} label="cover image" />
              <div className="cms-field">
                <label htmlFor="alt">Alt text</label>
                <input id="alt" className="cms-input" value={draft.coverImageAlt} onChange={e => set("coverImageAlt", e.target.value)} placeholder="Describe the image for screen readers & SEO" />
              </div>
              {!draft.coverImageUrl && <small className="cms-hint">No cover? A branded share image is generated automatically for social media.</small>}
            </div>

            <div className="cms-card">
              <h4>Tags</h4>
              <TagInput value={draft.tags} onChange={tags => set("tags", tags)} suggestions={allTags} placeholder="robotics, ai, notes…" />
              <small className="cms-hint">Readers can filter the blog by tag. Related posts are matched by tag.</small>
            </div>

            <div className="cms-card">
              <h4>Search &amp; social</h4>
              <div className="cms-field">
                <label htmlFor="seot">SEO title <em className={seoTitle.length > 60 ? "is-over" : ""}>{(draft.seoTitle || draft.title).length}/60</em></label>
                <input id="seot" className="cms-input" maxLength={120} value={draft.seoTitle} onChange={e => set("seoTitle", e.target.value)} placeholder={draft.title || "Defaults to the post title"} />
              </div>
              <div className="cms-field">
                <label htmlFor="seod">Meta description <em className={seoDesc.length > 160 ? "is-over" : ""}>{(draft.seoDescription || draft.excerpt).length}/160</em></label>
                <textarea id="seod" className="cms-input" rows={3} maxLength={320} value={draft.seoDescription} onChange={e => set("seoDescription", e.target.value)} placeholder="Defaults to the excerpt" />
              </div>

              <small className="cms-preview-label">Google preview</small>
              <div className="cms-serp">
                <span className="cms-serp-url">{origin.replace(/^https?:\/\//, "")} › blog › {draft.slug || "post-url"}</span>
                <span className="cms-serp-title">{seoTitle.length > 60 ? `${seoTitle.slice(0, 58)}…` : seoTitle} | {portfolio.profile.shortName}</span>
                <span className="cms-serp-desc">{seoDesc.length > 160 ? `${seoDesc.slice(0, 157)}…` : seoDesc}</span>
              </div>

              <small className="cms-preview-label">Share card (LinkedIn, Facebook, X, WhatsApp)</small>
              <div className="cms-social">
                <div className="cms-social-img" style={{ background: portfolio.siteSettings.background }}>
                  {draft.coverImageUrl ? <img src={draft.coverImageUrl} alt="" /> : (
                    <div style={{ color: portfolio.siteSettings.foreground }}>
                      <b>SBN<span style={{ color: portfolio.siteSettings.accent }}>•</span></b>
                      <strong>{draft.title || "Post title"}</strong>
                    </div>
                  )}
                </div>
                <div className="cms-social-copy">
                  <small>{origin.replace(/^https?:\/\//, "").toUpperCase()}</small>
                  <strong>{seoTitle}</strong>
                  <span>{seoDesc}</span>
                </div>
              </div>
            </div>

            <div className="cms-card cms-stats">
              <div><strong>{words.toLocaleString()}</strong><small>words</small></div>
              <div><strong>{Math.max(1, Math.round(words / 220))}</strong><small>min read</small></div>
              <div><strong>{draft.tags.length}</strong><small>tags</small></div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  /* ------------------------------ List ------------------------------ */
  return (
    <div className="cms-blog">
      <div className="cms-blog-toolbar">
        <div className="cms-seg">
          {(["all", "published", "scheduled", "draft"] as Filter[]).map(f => (
            <button key={f} type="button" className={filter === f ? "is-active" : ""} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f === "draft" ? "Drafts" : STATE_LABEL[f]} <em>{counts[f]}</em>
            </button>
          ))}
        </div>
        <label className="cms-search">
          <Icon name="search" size={16} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search posts or tags" />
        </label>
        <button type="button" className="cms-btn cms-btn--primary" onClick={openNew}><Icon name="plus" size={16} /> New post</button>
      </div>

      {posts.length === 0 ? (
        <button type="button" className="cms-empty cms-empty--large" onClick={openNew}>
          <Icon name="blog" size={28} />
          <strong>Write your first post</strong>
          <span>Share ideas, project write-ups and lessons learned. Posts get their own SEO-ready page, social share card and RSS entry.</span>
        </button>
      ) : visible.length === 0 ? (
        <div className="cms-empty">No posts match this filter.</div>
      ) : (
        <div className="cms-table">
          {visible.map(post => {
            const state = postState(post);
            return (
              <div key={post._id} className="cms-row">
                <button type="button" className="cms-row-main" onClick={() => openPost(post._id)} disabled={loadingId === post._id}>
                  <span className="cms-row-thumb">{post.coverImageUrl ? <img src={post.coverImageUrl} alt="" /> : <span>{post.title.slice(0, 1)}</span>}</span>
                  <span className="cms-row-text">
                    <strong>{post.title}{post.featured && <span className="cms-pill cms-pill--accent">Featured</span>}</strong>
                    <small>/blog/{post.slug} · {post.readingMinutes} min · {post.tags.join(", ") || "no tags"}</small>
                  </span>
                </button>
                <span className={`cms-status cms-status--${state}`}>{STATE_LABEL[state]}</span>
                <span className="cms-row-date">{state === "draft" ? `Edited ${fmt(post.updatedAt)}` : fmt(post.publishedAt)}</span>
                <span className="cms-row-actions">
                  <button type="button" title="Edit" onClick={() => openPost(post._id)}><Icon name="blog" size={15} /></button>
                  {state === "published" && <a title="View" href={`/blog/${post.slug}`} target="_blank" rel="noreferrer"><Icon name="external" size={15} /></a>}
                  <button type="button" title="Delete" className="danger" onClick={() => remove(post._id, post.title)}><Icon name="trash" size={15} /></button>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
