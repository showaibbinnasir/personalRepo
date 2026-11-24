/** Public site origin, used for canonical URLs, sitemaps, RSS and share links. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.showaibbinnasir.site").replace(/\/$/, "");

export const DEFAULT_RESUME_PATH = "/cv/showaib-cv.pdf";

export const absoluteUrl = (path = "/") => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

export function formatDate(value?: string | null, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });
}

/**
 * True when rich text has something to show. The editor saves an emptied field as
 * "<p></p>" (or similar), which must not count as a case study.
 */
export function hasRichContent(html?: string | null) {
  if (!html) return false;
  if (/<(img|iframe|video|hr)\b/i.test(html)) return true;
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;|&#160;|\s/g, "").length > 0;
}

/** Case-insensitive de-duplication, keeping the first spelling. */
export function uniqueList(items: string[] = []) {
  const seen = new Set<string>();
  return items.map(i => i.trim()).filter(i => i && !seen.has(i.toLowerCase()) && seen.add(i.toLowerCase()));
}
