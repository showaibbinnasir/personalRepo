/** Public site origin, used for canonical URLs, sitemaps, RSS and share links. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.showaibbinnasir.site").replace(/\/$/, "");

export const DEFAULT_RESUME_PATH = "/cv/showaib-cv.pdf";

export const absoluteUrl = (path = "/") => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

export function formatDate(value?: string | null, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });
}
