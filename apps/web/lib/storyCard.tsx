import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { Portfolio } from "@/lib/types";
import { SITE_URL } from "@/lib/site";

/**
 * Shared 1080×1920 "story card" used for blog posts and projects when shared to
 * Instagram / Facebook / WhatsApp stories. Cover photo (or generated space art),
 * title, short description and tags on a deep-space background. Content stays
 * inside the area story apps leave uncovered (top ~150px, bottom ~300px).
 * Routes that use it must bundle ./assets/fonts via outputFileTracingIncludes.
 */

export type StoryCardOptions = {
  seed: string;
  label: string; // e.g. "JOURNAL", "PROJECT"
  title: string;
  description?: string;
  tags?: string[];
  coverUrl?: string;
  metaLeft?: string;
  metaRight?: string;
  cta: string; // e.g. "Read it at"
  path: string; // shown after the site host, e.g. "/blog"
};

const W = 1080;
const H = 1920;

// Bundled with this function via outputFileTracingIncludes in next.config.mjs.
const fontPath = (file: string) => join(process.cwd(), "assets", "fonts", file);

type StoryFont = { name: string; data: Buffer; weight: 400 | 500 | 800; style: "normal" };
let fontCache: Promise<StoryFont[]> | null = null;
function loadFonts() {
  fontCache ??= Promise.all([
    readFile(fontPath("inter-latin-400-normal.woff")).then(data => ({ name: "Inter", data, weight: 400 as const, style: "normal" as const })),
    readFile(fontPath("inter-latin-800-normal.woff")).then(data => ({ name: "Inter", data, weight: 800 as const, style: "normal" as const })),
    readFile(fontPath("jetbrains-mono-latin-500-normal.woff")).then(data => ({ name: "Mono", data, weight: 500 as const, style: "normal" as const }))
  ]).catch(error => {
    // Fall back to the built-in font rather than failing the whole image.
    console.warn("Story card fonts unavailable:", (error as Error).message);
    fontCache = null;
    return [];
  });
  return fontCache;
}

/** Fetches an image and re-encodes it as JPEG (handles WebP/large files), as a data URL. */
async function loadImage(url: string | undefined, width: number, height: number) {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    try {
      const sharp = (await import("sharp")).default;
      const out = await sharp(buf).rotate().resize(width, height, { fit: "cover" }).jpeg({ quality: 84 }).toBuffer();
      return `data:image/jpeg;base64,${out.toString("base64")}`;
    } catch {
      const type = res.headers.get("content-type") || "";
      return /image\/(png|jpe?g)/.test(type) ? `data:${type};base64,${buf.toString("base64")}` : null;
    }
  } catch {
    return null;
  }
}

/** Small deterministic RNG so each post always gets the same star field. */
function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/** Shortens at a word boundary so titles and descriptions never end mid-word. */
function clipWords(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–—-]+$/, "")}…`;
}

/** Planet, orbit rings and a small constellation: the card art when a post has no cover. */
function SpaceArt({ accent, rand, width, height }: { accent: string; rand: () => number; width: number; height: number }) {
  const cx = width * (0.62 + rand() * 0.16);
  const cy = height * (0.42 + rand() * 0.16);
  const r = height * 0.26;
  const dots = Array.from({ length: 46 }, () => ({ x: rand() * width, y: rand() * height, r: rand() < 0.85 ? 1.2 + rand() : 2.4 + rand() * 1.4, o: 0.25 + rand() * 0.6 }));
  const constellation = Array.from({ length: 5 }, (_, i) => ({ x: width * (0.08 + i * 0.09 + rand() * 0.05), y: height * (0.2 + rand() * 0.55) }));
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <radialGradient id="sky" cx="75%" cy="20%" r="80%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.55" />
          <stop offset="45%" stopColor="#2a1d4d" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#09070c" stopOpacity="1" />
        </radialGradient>
        <radialGradient id="planet" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="18%" stopColor={accent} stopOpacity="1" />
          <stop offset="70%" stopColor="#2b0f16" stopOpacity="1" />
          <stop offset="100%" stopColor="#09070c" stopOpacity="1" />
        </radialGradient>
        <radialGradient id="halo" cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor={accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width={width} height={height} fill="url(#sky)" />
      {dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#ffffff" fillOpacity={d.o} />)}
      <circle cx={cx} cy={cy} r={r * 1.7} fill="url(#halo)" />
      <ellipse cx={cx} cy={cy} rx={r * 2.3} ry={r * 0.62} fill="none" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="2" transform={`rotate(-14 ${cx} ${cy})`} />
      <ellipse cx={cx} cy={cy} rx={r * 3.1} ry={r * 0.9} fill="none" stroke="#ffffff" strokeOpacity="0.1" strokeWidth="1.5" strokeDasharray="6 10" transform={`rotate(-14 ${cx} ${cy})`} />
      <circle cx={cx} cy={cy} r={r} fill="url(#planet)" />
      <circle cx={cx + r * 2.1} cy={cy - r * 0.7} r={r * 0.13} fill="#e9e4ff" fillOpacity="0.9" />
      <polyline points={constellation.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#c8d6ff" strokeOpacity="0.45" strokeWidth="1.5" />
      {constellation.map((p, i) => <circle key={`c${i}`} cx={p.x} cy={p.y} r={3.2} fill="#ffffff" />)}
    </svg>
  );
}

function shortDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).toUpperCase();
}

export { shortDate };

export async function storyCardResponse(o: StoryCardOptions, portfolio: Portfolio | null) {
  const accent = portfolio?.siteSettings.accent || "#A71919";
  const bg = "#07060b";
  const fg = portfolio?.siteSettings.foreground || "#F4F1EC";
  const muted = portfolio?.siteSettings.muted || "#A9A4A0";
  const name = portfolio?.profile.name || "Mohammad Showaib Bin Nasir";
  const role = portfolio?.profile.title || "";
  const host = SITE_URL.replace(/^https?:\/\//, "").replace(/^www\./, "");

  const [fonts, cover, backdrop, avatar] = await Promise.all([
    loadFonts(),
    loadImage(o.coverUrl, 888 * 2, 520 * 2),
    loadImage(o.coverUrl, 540, 960),
    loadImage(portfolio?.profile.portraitUrl, 160, 160)
  ]);

  const title = clipWords(o.title, 96);
  const titleSize = title.length <= 34 ? 84 : title.length <= 60 ? 70 : 56;
  const description = clipWords(o.description || "", title.length > 60 ? 130 : 170);
  const tags = (o.tags || []).filter(Boolean).slice(0, 3);

  const rand = seeded(o.seed);
  const stars = Array.from({ length: 90 }, () => ({
    x: rand() * W,
    y: rand() * H,
    r: rand() < 0.85 ? 1.5 + rand() * 1.5 : 3 + rand() * 2,
    o: 0.25 + rand() * 0.6
  }));

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", position: "relative", background: bg, color: fg, fontFamily: "Inter" }}>
        {/* Backdrop: the cover, faded, so each story picks up the post's colours (like Spotify). */}
        {backdrop && (
          <img src={backdrop} width={W} height={H} style={{ position: "absolute", left: 0, top: 0, width: W, height: H, objectFit: "cover", opacity: 0.32 }} />
        )}
        <div
          style={{
            position: "absolute", left: 0, top: 0, width: W, height: H, display: "flex",
            backgroundImage: `radial-gradient(circle at 10% 8%, rgba(70,52,170,0.55), transparent 42%), radial-gradient(circle at 95% 62%, ${accent}66, transparent 40%), radial-gradient(circle at 30% 100%, rgba(20,100,120,0.45), transparent 45%), linear-gradient(180deg, rgba(7,6,11,0.55) 0%, rgba(7,6,11,0.82) 55%, rgba(7,6,11,0.96) 100%)`
          }}
        />
        {stars.map((s, i) => (
          <div key={i} style={{ position: "absolute", left: s.x, top: s.y, width: s.r, height: s.r, borderRadius: 999, background: `rgba(255,255,255,${s.o})`, display: "flex" }} />
        ))}

        <div style={{ position: "relative", display: "flex", flexDirection: "column", width: W, height: H, padding: "150px 96px 300px" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 46, fontWeight: 800, letterSpacing: -2 }}>
              SBN<span style={{ color: accent }}>•</span>
            </div>
            <div style={{ display: "flex", fontFamily: "Mono", fontSize: 24, letterSpacing: 4, color: muted }}>{`// ${o.label}`}</div>
          </div>

          {/* Card */}
          <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <div
              style={{
                display: "flex", flexDirection: "column", width: 888, borderRadius: 40, overflow: "hidden",
                border: "2px solid rgba(244,241,236,0.14)", background: "rgba(14,10,14,0.86)",
                boxShadow: `0 40px 120px -30px ${accent}88`
              }}
            >
              {cover ? (
                <img src={cover} width={888} height={520} style={{ width: 888, height: 520, objectFit: "cover" }} />
              ) : (
                <div style={{ width: 888, height: 420, display: "flex" }}>
                  <SpaceArt accent={accent} rand={seeded(`${o.seed}-art`)} width={888} height={420} />
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", padding: "48px 52px 52px" }}>
                {tags.length > 0 && (
                  <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
                    {tags.map(tag => (
                      <div key={tag} style={{ display: "flex", fontFamily: "Mono", fontSize: 22, letterSpacing: 1, padding: "8px 16px", borderRadius: 8, border: "1.5px solid rgba(244,241,236,0.18)", color: "#ddd6d0" }}>
                        {clip(tag, 22)}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", fontSize: titleSize, fontWeight: 800, lineHeight: 1.04, letterSpacing: -2.5 }}>{title}</div>
                {description && (
                  <div style={{ display: "flex", marginTop: 26, fontSize: 32, lineHeight: 1.4, color: "#c2bab4" }}>{description}</div>
                )}
                {(o.metaLeft || o.metaRight) && <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 36, paddingTop: 28, borderTop: "2px dashed rgba(244,241,236,0.14)", fontFamily: "Mono", fontSize: 24, letterSpacing: 2, color: muted }}>
                  {o.metaLeft && <span>{o.metaLeft}</span>}
                  {o.metaLeft && o.metaRight && <span style={{ color: accent }}>{"//"}</span>}
                  {o.metaRight && <span>{o.metaRight}</span>}
                </div>}
              </div>
            </div>
          </div>

          {/* Footer: author + where to read it */}
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {avatar ? (
              <img src={avatar} width={84} height={84} style={{ width: 84, height: 84, borderRadius: 999, objectFit: "cover", border: `3px solid ${accent}` }} />
            ) : (
              <div style={{ width: 84, height: 84, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", border: `3px solid ${accent}`, fontSize: 26, fontWeight: 800 }}>SBN</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ display: "flex", fontSize: 32, fontWeight: 800, letterSpacing: -0.5 }}>{clip(name, 34)}</div>
              {role && <div style={{ display: "flex", fontSize: 24, color: muted, marginTop: 4 }}>{clip(role, 46)}</div>}
            </div>
          </div>
          <div style={{ display: "flex", marginTop: 26, fontFamily: "Mono", fontSize: 24, letterSpacing: 1, color: fg }}>
            <span style={{ color: accent, marginRight: 14 }}>•</span>
            {`${o.cta} ${clip(`${host}${o.path}`, 40)}`}
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts,
      headers: { "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" }
    }
  );
}
