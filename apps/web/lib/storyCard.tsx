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

/**
 * Wraps text into at most `maxLines` lines of `width` px, estimating glyph widths
 * (satori can't measure for us). Adds "…" when shortened. Used to keep every
 * story card inside its frame, however long the title or description is.
 */
function fitLines(text: string, size: number, charFactor: number, width: number, maxLines: number) {
  const perLine = Math.max(8, Math.floor(width / (size * charFactor)));
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  let i = 0;
  for (; i < words.length; i++) {
    let w = words[i];
    if (w.length > perLine) w = `${w.slice(0, perLine - 1)}…`;
    const next = line ? `${line} ${w}` : w;
    if (next.length <= perLine) {
      line = next;
      continue;
    }
    lines.push(line);
    line = w;
    if (lines.length === maxLines) break;
  }
  const truncated = lines.length === maxLines && i < words.length;
  if (!truncated && line) lines.push(line);
  if (truncated) {
    let last = lines[maxLines - 1];
    while (last.length > perLine - 1 && last.includes(" ")) last = last.slice(0, last.lastIndexOf(" "));
    lines[maxLines - 1] = `${last.replace(/[\s,.;:–—-]+$/, "")}…`;
  }
  return { text: lines.join(" "), lines: Math.max(1, lines.length), truncated };
}

/** First item of a list-like label ("Embedded Systems / IoT / …" → "Embedded Systems"). */
function firstLabel(value?: string, max = 26) {
  if (!value) return "";
  const first = value.split(/\s*[\/|,•·]\s*/)[0] || value;
  return clip(first.trim(), max);
}

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

  // ---- Fixed layout: every story has the same structure and proportions. ----
  // Card: photo slot (fixed) + text slot (fixed). Text adapts to its slot, never the other way round.
  const CARD_H = 1150;
  const MEDIA_H = 500;
  const PAD_X = 56;
  const TEXT_W = 888 - PAD_X * 2;
  const TAGS_H = 46 + 26; // row + gap
  const META_H = 30 + 26; // divider padding + one line
  const TEXT_SLOT = CARD_H - MEDIA_H - 52 - 48 /* padding */ - META_H - 28 /* gap above meta */;

  const tags = (o.tags || []).filter(Boolean).map(t => clip(t, 20));
  const shownTags: string[] = [];
  let tagsWidth = 0;
  for (const t of tags.slice(0, 3)) {
    const w = t.length * 14 + 2 * 16 + 12;
    if (tagsWidth + w > TEXT_W) break;
    shownTags.push(t);
    tagsWidth += w;
  }
  const metaLeft = firstLabel(o.metaLeft, 24);
  const metaRight = clip(o.metaRight || "", 18);

  const slot = TEXT_SLOT - (shownTags.length ? TAGS_H : 0);
  const DESC_LH = 44;
  // Largest title size that fits (max 3 lines) while leaving room for at least 2 description lines.
  let titleSize = 52;
  let titleFit = fitLines(o.title, 52, 0.6, TEXT_W, 3);
  for (const size of [78, 68, 60, 52]) {
    const f = fitLines(o.title, size, 0.6, TEXT_W, size >= 68 ? 2 : 3);
    const h = Math.ceil(f.lines * size * 1.06);
    const room = slot - h - (o.description ? 24 + 2 * DESC_LH : 0);
    if (!f.truncated && room >= 0) {
      titleSize = size;
      titleFit = f;
      break;
    }
  }
  const titleH = Math.ceil(titleFit.lines * titleSize * 1.06);
  const descLines = Math.max(0, Math.min(4, Math.floor((slot - titleH - 24) / DESC_LH)));
  const descFit = fitLines(o.description || "", 31, 0.52, TEXT_W, Math.max(1, descLines));
  const title = titleFit.text;
  const description = descLines > 0 ? descFit.text : "";

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
          <div style={{ display: "flex", flexShrink: 0, height: 60, justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 46, fontWeight: 800, letterSpacing: -2 }}>
              SBN<span style={{ color: accent }}>•</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: "Mono", fontSize: 22, letterSpacing: 4, color: fg, padding: "10px 20px", borderRadius: 999, border: "1.5px solid rgba(244,241,236,0.2)", background: "rgba(14,10,14,0.6)" }}>
              <div style={{ display: "flex", width: 10, height: 10, borderRadius: 999, background: accent }} />
              {o.label}
            </div>
          </div>

          {/* Card: fixed size, fixed slots */}
          <div style={{ display: "flex", flexShrink: 0, marginTop: 44 }}>
            <div
              style={{
                display: "flex", flexDirection: "column", width: 888, height: CARD_H, borderRadius: 40, overflow: "hidden",
                border: "2px solid rgba(244,241,236,0.14)", background: "rgba(14,10,14,0.9)",
                boxShadow: `0 40px 120px -30px ${accent}88`
              }}
            >
              {/* Photo slot */}
              {cover ? (
                <img src={cover} width={888} height={MEDIA_H} style={{ width: 888, height: MEDIA_H, flexShrink: 0, objectFit: "cover" }} />
              ) : (
                <div style={{ width: 888, height: MEDIA_H, flexShrink: 0, display: "flex" }}>
                  <SpaceArt accent={accent} rand={seeded(`${o.seed}-art`)} width={888} height={MEDIA_H} />
                </div>
              )}
              <div style={{ display: "flex", flexShrink: 0, height: 4, width: 888, backgroundImage: `linear-gradient(90deg, ${accent}, rgba(167,25,25,0))` }} />

              {/* Text slot */}
              <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, padding: `48px ${PAD_X}px 52px` }}>
                {shownTags.length > 0 && (
                  <div style={{ display: "flex", flexShrink: 0, height: 46, gap: 12, marginBottom: 26 }}>
                    {shownTags.map(tag => (
                      <div key={tag} style={{ display: "flex", alignItems: "center", fontFamily: "Mono", fontSize: 21, letterSpacing: 1, padding: "0 16px", borderRadius: 8, border: "1.5px solid rgba(244,241,236,0.18)", color: "#ddd6d0" }}>
                        {tag}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", flexShrink: 0, maxHeight: titleH, overflow: "hidden", fontSize: titleSize, fontWeight: 800, lineHeight: 1.04, letterSpacing: -2.5 }}>{title}</div>
                {description && (
                  <div style={{ display: "flex", flexShrink: 0, maxHeight: descLines * DESC_LH, overflow: "hidden", marginTop: 24, fontSize: 31, lineHeight: 1.42, color: "#c2bab4" }}>{description}</div>
                )}

                {/* Info row, pinned to the bottom of the card */}
                {(metaLeft || metaRight) && (
                  <div style={{ display: "flex", flexShrink: 0, marginTop: "auto", paddingTop: 26, borderTop: "2px dashed rgba(244,241,236,0.14)", justifyContent: "space-between", alignItems: "center", whiteSpace: "nowrap", fontFamily: "Mono", fontSize: 23, letterSpacing: 2, color: muted }}>
                    <span>{metaLeft}</span>
                    <span style={{ color: fg }}>{metaRight}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer: author on the left, site address on the right */}
          <div style={{ display: "flex", flexShrink: 0, marginTop: "auto", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 22, minWidth: 0 }}>
              {avatar ? (
                <img src={avatar} width={84} height={84} style={{ width: 84, height: 84, flexShrink: 0, borderRadius: 999, objectFit: "cover", border: `3px solid ${accent}` }} />
              ) : (
                <div style={{ width: 84, height: 84, flexShrink: 0, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", border: `3px solid ${accent}`, fontSize: 26, fontWeight: 800 }}>SBN</div>
              )}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>{clip(name, 30)}</div>
                {role && <div style={{ display: "flex", fontSize: 22, color: muted, marginTop: 4 }}>{clip(role, 44)}</div>}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexShrink: 0, marginTop: 24, alignItems: "center", gap: 14, whiteSpace: "nowrap", fontFamily: "Mono", fontSize: 23, letterSpacing: 1, color: fg }}>
            <span style={{ color: accent }}>•</span>
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
