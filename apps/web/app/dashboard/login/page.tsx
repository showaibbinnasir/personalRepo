"use client";

import { FormEvent, useState } from "react";
import { BROWSER_API } from "@/lib/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      let r: Response;
      try {
        r = await fetch(`${BROWSER_API}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password })
        });
      } catch {
        throw new Error("Can't reach the website server. Is `npm run dev` still running?");
      }
      const text = await r.text();
      let j: any = {};
      try { j = JSON.parse(text); } catch { /* not JSON */ }

      if (r.status === 401) throw new Error("Wrong email or password. If you have never run `npm run seed`, the admin account doesn't exist yet.");
      if (r.status === 429) throw new Error("Too many sign-in attempts. Wait 15 minutes, or restart the API to reset the limit.");
      if (r.status === 403) throw new Error("The API refused this site's address. Set FRONTEND_URL in apps/api/.env to the address in your browser bar, then restart the API.");
      if (r.status === 500 && /ECONNREFUSED|proxy|Internal Server Error/i.test(text) && !j.error)
        throw new Error("The API isn't running or can't be reached. Start it with `npm run dev` and check NEXT_PUBLIC_API_URL.");
      if (!r.ok) throw new Error(j.error || `Sign-in failed (HTTP ${r.status}).`);

      // Make sure the browser actually kept the session before leaving this page.
      const me = await fetch(`${BROWSER_API}/auth/me`, { credentials: "include" });
      if (!me.ok) throw new Error("Signed in, but your browser didn't keep the session cookie. Try a normal (not private) window, and make sure cookies are allowed for this site.");

      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="cms-login">
      <section className="cms-login-art" aria-hidden="true">
        <span className="cms-logo cms-logo--xl">SBN<i>•</i></span>
        <div>
          <strong>Studio</strong>
          <p>Write posts, update projects and shape your portfolio — all in one place.</p>
        </div>
        <small>Private workspace</small>
      </section>
      <section className="cms-login-panel">
        <form className="cms-login-card" onSubmit={submit}>
          <small>Sign in</small>
          <h1>Welcome back</h1>
          <p>Use the admin account created by the seed script.</p>
          <div className="cms-field">
            <label htmlFor="email">Email</label>
            <input id="email" className="cms-input" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="cms-field">
            <label htmlFor="password">Password</label>
            <div className="cms-password">
              <input id="password" className="cms-input" type={show ? "text" : "password"} autoComplete="current-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShow(v => !v)}>{show ? "Hide" : "Show"}</button>
            </div>
          </div>
          {error && <p className="cms-error" role="alert">{error}</p>}
          <button className="cms-btn cms-btn--primary cms-btn--block" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
          <a className="cms-link" href="/">← Back to the site</a>
        </form>
      </section>
    </main>
  );
}
