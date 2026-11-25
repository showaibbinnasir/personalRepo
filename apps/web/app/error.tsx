"use client";

import { useEffect } from "react";

/** Shown if a page fails to render. Offers a retry and a way home. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="status-page">
      <section className="status-body">
        <div className="section-kicker">
          <span>500</span>
          <span>{"// System fault"}</span>
          <span>Something went wrong</span>
        </div>
        <h1>
          <span>Houston,</span>
          <span>a problem.</span>
        </h1>
        <p className="lead">This page hit an unexpected error. Try again, or head back home.</p>
        <nav className="status-links" aria-label="Recovery">
          <button type="button" onClick={reset} className="status-primary">Try again <i aria-hidden="true">↻</i></button>
          <a href="/">Back to home <i aria-hidden="true">→</i></a>
        </nav>
        {error.digest && <p className="status-ref">Reference: {error.digest}</p>}
      </section>
    </main>
  );
}
