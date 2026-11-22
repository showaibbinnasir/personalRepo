/** Helpers shared by the portfolio and blog routes. */

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export function htmlToText(html: string) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function readingStats(html: string) {
  const text = htmlToText(html);
  const wordCount = text ? text.split(" ").length : 0;
  return { wordCount, readingMinutes: Math.max(1, Math.round(wordCount / 220)) };
}

const PORTFOLIO_ARRAYS = [
  "experiences", "education", "projects", "skillGroups", "certifications",
  "achievements", "leadership", "languages", "socialLinks"
] as const;

/** Removes items the admin has hidden, so they never leave the server for public visitors. */
export function publicPortfolio<T extends Record<string, any>>(portfolio: T): T {
  const copy: Record<string, any> = { ...portfolio };
  for (const key of PORTFOLIO_ARRAYS) {
    if (Array.isArray(copy[key])) copy[key] = copy[key].filter((item: any) => item?.visible !== false);
  }
  return copy as T;
}

/**
 * Asks the Next.js site to drop its cached pages so edits appear immediately.
 * Only runs when REVALIDATE_SECRET is configured on both apps.
 */
export async function revalidateWeb() {
  const secret = process.env.REVALIDATE_SECRET;
  const base = process.env.WEB_URL || (process.env.FRONTEND_URL || "").split(",")[0]?.trim();
  if (!secret || !base) return;
  try {
    await fetch(`${base.replace(/\/$/, "")}/api/revalidate`, {
      method: "POST",
      headers: { "x-revalidate-secret": secret },
      signal: AbortSignal.timeout(5000)
    });
  } catch (error) {
    console.warn("Web revalidation failed:", (error as Error).message);
  }
}
