import type { Portfolio, PostDetail, PostList } from "./types";

/** Used by the server (page rendering) to reach the API directly. */
export const API_URL = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

/** Used by the browser: same-origin path proxied to the API (see next.config.mjs). */
export const BROWSER_API = "/backend";

const REVALIDATE = 60;

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate: REVALIDATE, tags: ["cms"] } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const getPortfolio = () => getJson<Portfolio>("/portfolio");

export function getPosts({ page = 1, limit = 9, tag }: { page?: number; limit?: number; tag?: string } = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (tag) qs.set("tag", tag);
  return getJson<PostList>(`/posts?${qs}`);
}

export const getPost = (slug: string) => getJson<PostDetail>(`/posts/${encodeURIComponent(slug)}`);
