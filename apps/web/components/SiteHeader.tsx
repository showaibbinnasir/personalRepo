/** Fixed top bar shared by the blog, project and other inner pages. */
export default function SiteHeader({ email, active }: { name?: string; email?: string; active?: "blog" | "work" }) {
  return (
    <header className="topbar">
      <a className="brand" href="/" aria-label="Home">
        SBN<span>•</span>
      </a>
      <nav aria-label="Main">
        <a href="/#work" aria-current={active === "work" ? "page" : undefined}>Work</a>
        <a href="/#about">About</a>
        <a href="/blog" aria-current={active === "blog" ? "page" : undefined}>Blog</a>
        <a href="/cv">CV</a>
      </nav>
      {email ? (
        <a className="pill-link" href={`mailto:${email}`}>CONTACT NOW</a>
      ) : (
        <span />
      )}
    </header>
  );
}
