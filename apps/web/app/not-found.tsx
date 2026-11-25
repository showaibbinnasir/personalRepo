import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import { getPortfolio } from "@/lib/api";

export const metadata: Metadata = {
  title: "Page not found",
  description: "This page doesn't exist or has moved.",
  robots: { index: false, follow: true },
  alternates: { canonical: null }
};

export default async function NotFound() {
  const portfolio = await getPortfolio();
  return (
    <main className="status-page">
      <SiteHeader email={portfolio?.profile.email} />
      <section className="status-body">
        <div className="section-kicker">
          <span>404</span>
          <span>{"// Signal lost"}</span>
          <span>Page not found</span>
        </div>
        <h1>
          <span>Lost in</span>
          <span>space.</span>
        </h1>
        <p className="lead">This page doesn&apos;t exist, or it has moved. Here are a few places that do.</p>
        <nav className="status-links" aria-label="Suggested pages">
          <a href="/" className="status-primary">Back to home <i aria-hidden="true">→</i></a>
          <a href="/#work">Projects <i aria-hidden="true">→</i></a>
          <a href="/blog">Blog <i aria-hidden="true">→</i></a>
          <a href="/#lab">Lab <i aria-hidden="true">→</i></a>
        </nav>
      </section>
    </main>
  );
}
