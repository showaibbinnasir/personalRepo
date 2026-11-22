import { BROWSER_API } from "@/lib/api";

/** Authenticated JSON call to the API. Sends the admin cookie; bounces to login on 401. */
export async function cmsApi<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const isForm = typeof FormData !== "undefined" && init.body instanceof FormData;
  const res = await fetch(`${BROWSER_API}${path}`, {
    ...init,
    credentials: "include",
    headers: { ...(init.body && !isForm ? { "Content-Type": "application/json" } : {}), ...(init.headers || {}) }
  });
  if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/auth/")) {
    window.location.href = "/dashboard/login";
    throw new Error("Your session has expired. Please sign in again.");
  }
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
  return json as T;
}

export async function uploadImage(file: File): Promise<string> {
  const body = new FormData();
  body.append("image", file);
  const json = await cmsApi<{ url: string }>("/upload", { method: "POST", body });
  return json.url;
}

export const siteOrigin = () =>
  (process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "");
