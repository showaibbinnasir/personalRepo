import { ImageResponse } from "next/og";
import { getPortfolio } from "@/lib/api";
import { SITE_URL, uniqueList } from "@/lib/site";

export const revalidate = 3600;

/** Branded 1200×630 link-preview card, used when a project has no cover image. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const portfolio = await getPortfolio();
  const project = portfolio?.projects.find(p => p.id === decodeURIComponent(id) && p.visible !== false);
  if (!portfolio || !project) return new Response("Not found", { status: 404 });

  const accent = portfolio.siteSettings.accent || "#A71919";
  const bg = portfolio.siteSettings.background || "#080606";
  const fg = portfolio.siteSettings.foreground || "#F4F1EC";
  const muted = portfolio.siteSettings.muted || "#A9A4A0";
  const title = project.title.length > 110 ? `${project.title.slice(0, 107)}…` : project.title;
  const host = SITE_URL.replace(/^https?:\/\//, "");
  const tech = uniqueList(project.tech).slice(0, 3).join(" · ");

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: bg, color: fg, padding: "64px 72px", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, letterSpacing: 4, textTransform: "uppercase", color: muted }}>
          <div style={{ display: "flex", fontWeight: 900, fontSize: 34, letterSpacing: -1, color: fg }}>
            SBN<span style={{ color: accent }}>•</span>
          </div>
          <div style={{ display: "flex" }}>{`// ${project.category || "Project"}`}</div>
        </div>
        <div style={{ display: "flex", fontSize: title.length > 60 ? 64 : 84, fontWeight: 900, lineHeight: 1, letterSpacing: -3, textTransform: "uppercase" }}>
          {title}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `2px solid ${accent}`, paddingTop: 28, fontSize: 24, color: muted }}>
          <div style={{ display: "flex", flexShrink: 0, marginRight: 40 }}>{portfolio.profile.name || "Showaib Bin Nasir"}</div>
          <div style={{ display: "flex", textAlign: "right" }}>{tech || host}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
