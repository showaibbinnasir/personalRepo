"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Project, SkillGroup } from "@/lib/types";
import { hasRichContent } from "@/lib/site";

/**
 * Skills section with two views:
 *  - Constellation: each category is a constellation, each skill a star sized by how many
 *    projects use it. Hover / focus / tap a star to see the projects and light up the
 *    skills used alongside it.
 *  - List: the original grid (default on small screens).
 */

const VB_W = 1200;
const VB_H = 640;

const words = (s: string) => s.toLowerCase().replace(/&/g, " and ").split(/[\s/,()-]+/).filter(Boolean);
const norm = (s: string) => words(s).join(" ");

/** A project "uses" a skill if names match, or every word of the skill appears in the tech name. */
function uses(tech: string, skill: string) {
  if (norm(tech) === norm(skill)) return true;
  const t = new Set(words(tech));
  const k = words(skill);
  return k.length > 0 && k.every(w => t.has(w));
}

function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

type Node = {
  id: string;
  skill: string;
  category: string;
  x: number;
  y: number;
  r: number;
  labelX: number;
  labelY: number;
  anchor: "start" | "middle" | "end";
  projects: Project[];
  delay: number;
};

export default function SkillsExplorer({ groups, projects }: { groups: SkillGroup[]; projects: Project[] }) {
  const [view, setView] = useState<"constellation" | "list">("constellation");
  const [active, setActive] = useState<string | null>(null);
  const [lit, setLit] = useState(false);
  const svgWrap = useRef<HTMLDivElement>(null);

  // Phones get the list by default: tiny star labels aren't readable there.
  useEffect(() => {
    if (window.matchMedia("(max-width: 760px)").matches) setView("list");
  }, []);

  useEffect(() => {
    const el = svgWrap.current;
    if (!el || view !== "constellation") return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setLit(true), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [view]);

  const { nodes, clusters, edges, related } = useMemo(() => {
    const visibleProjects = projects.filter(p => p.visible !== false);
    const k = groups.length || 1;
    const cols = k <= 3 ? k : Math.ceil(k / 2);
    const rows = k <= 3 ? 1 : 2;
    const cellW = VB_W / cols;
    const cellH = VB_H / rows;
    const nodes: Node[] = [];
    const clusters: { id: string; label: string; x: number; y: number }[] = [];
    const edges: { a: string; b: string }[] = [];
    let delay = 0;

    groups.forEach((group, gi) => {
      const rand = seeded(group.category || String(gi));
      const col = gi % cols;
      const row = Math.floor(gi / cols);
      // Centre the last row if it's not full.
      const inRow = row === rows - 1 ? k - cols * (rows - 1) : cols;
      const rowOffset = ((cols - inRow) * cellW) / 2;
      const cx = rowOffset + cellW * (col + 0.5) + (rand() - 0.5) * cellW * 0.12;
      const cy = cellH * (row + 0.5) + (rand() - 0.5) * cellH * 0.1;
      clusters.push({ id: `c${gi}`, label: group.category, x: cx, y: cy });

      const skills = group.skills.filter(Boolean);
      const n = skills.length;
      const R = Math.min(cellW, cellH) * (n > 7 ? 0.36 : 0.3);
      const start = rand() * Math.PI * 2;
      const ids: string[] = [];
      skills.forEach((skill, si) => {
        const ring = n > 7 && si % 2 === 1 ? 0.62 : 1;
        const ang = start + (si / n) * Math.PI * 2 + (rand() - 0.5) * 0.25;
        const rr = R * ring * (0.88 + rand() * 0.2);
        const x = cx + Math.cos(ang) * rr;
        const y = cy + Math.sin(ang) * rr * 0.82;
        const used = visibleProjects.filter(p => (p.tech || []).some(t => uses(t, skill)));
        const r = 3.2 + Math.min(used.length, 5) * 1.25;
        const cos = Math.cos(ang);
        const anchor: Node["anchor"] = cos > 0.35 ? "start" : cos < -0.35 ? "end" : "middle";
        const off = r + 9;
        const id = `${gi}-${si}`;
        ids.push(id);
        nodes.push({
          id, skill, category: group.category, x, y, r, anchor, projects: used,
          labelX: x + (anchor === "start" ? off : anchor === "end" ? -off : 0),
          labelY: y + (anchor === "middle" ? (Math.sin(ang) > 0 ? off + 8 : -off) : 4),
          delay: delay++ * 35
        });
      });
      // Constellation lines: an open loop through the cluster's stars.
      for (let i = 0; i < ids.length - 1; i++) edges.push({ a: ids[i], b: ids[i + 1] });
      if (ids.length > 3) edges.push({ a: ids[0], b: ids[Math.floor(ids.length / 2)] });
    });

    // Skills used together in at least one project.
    const related = new Map<string, Set<string>>();
    for (const n of nodes) related.set(n.id, new Set());
    for (const p of visibleProjects) {
      const inProject = nodes.filter(n => n.projects.includes(p)).map(n => n.id);
      for (const a of inProject) for (const b of inProject) if (a !== b) related.get(a)!.add(b);
    }
    return { nodes, clusters, edges, related };
  }, [groups, projects]);

  const byId = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  const activeNode = active ? byId.get(active) : null;
  const activeRelated = active ? related.get(active) || new Set<string>() : new Set<string>();
  const activeCategory = activeNode?.category;

  if (!groups.length) return null;

  return (
    <div className="skills-explorer">
      <div className="skills-toolbar">
        <div className="view-toggle" role="tablist" aria-label="Skills view">
          <button type="button" role="tab" aria-selected={view === "constellation"} className={view === "constellation" ? "is-active" : ""} onClick={() => setView("constellation")}>
            Constellation
          </button>
          <button type="button" role="tab" aria-selected={view === "list"} className={view === "list" ? "is-active" : ""} onClick={() => setView("list")}>
            List
          </button>
        </div>
        {view === "constellation" && <small className="skills-hint">Hover a star to see where I&apos;ve used it</small>}
      </div>

      {view === "list" ? (
        <div className="skills-grid">
          {groups.map(group => (
            <article key={group.id}>
              <small>{group.category}</small>
              {group.skills.map((skill, i) => <h3 key={`${skill}-${i}`}>{skill}</h3>)}
            </article>
          ))}
        </div>
      ) : (
        <div className={`constellation ${lit ? "is-lit" : ""} ${active ? "has-active" : ""}`}>
          <div className="constellation-map" ref={svgWrap}>
            <svg viewBox={`0 0 ${VB_W} ${VB_H}`} role="group" aria-label="Skills constellation" onMouseLeave={() => setActive(null)}>
              <defs>
                <radialGradient id="star-glow">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </radialGradient>
              </defs>

              {clusters.map(c => (
                <text key={c.id} x={c.x} y={c.y} className={`cluster-label ${activeCategory === c.label ? "is-active" : ""}`} textAnchor="middle">
                  {c.label}
                </text>
              ))}

              {edges.map((e, i) => {
                const a = byId.get(e.a)!, b = byId.get(e.b)!;
                const on = activeCategory && a.category === activeCategory;
                return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={`edge ${on ? "is-on" : ""}`} style={{ animationDelay: `${a.delay}ms` }} />;
              })}

              {active && activeNode &&
                [...activeRelated].map(id => {
                  const b = byId.get(id)!;
                  return <line key={`r-${id}`} x1={activeNode.x} y1={activeNode.y} x2={b.x} y2={b.y} className="edge-related" />;
                })}

              {nodes.map(n => {
                const isActive = n.id === active;
                const isRelated = activeRelated.has(n.id);
                const dim = active && !isActive && !isRelated && n.category !== activeCategory;
                return (
                  <g
                    key={n.id}
                    className={`star ${isActive ? "is-active" : ""} ${isRelated ? "is-related" : ""} ${dim ? "is-dim" : ""}`}
                    style={{ animationDelay: `${n.delay}ms` }}
                    tabIndex={0}
                    role="button"
                    aria-label={`${n.skill}, ${n.category}${n.projects.length ? `, used in ${n.projects.length} project${n.projects.length > 1 ? "s" : ""}` : ""}`}
                    onMouseEnter={() => setActive(n.id)}
                    onFocus={() => setActive(n.id)}
                    onClick={() => setActive(n.id)}
                  >
                    <circle cx={n.x} cy={n.y} r={n.r * 4} fill="url(#star-glow)" className="star-halo" />
                    <circle cx={n.x} cy={n.y} r={n.r + 10} className="star-hit" />
                    <circle cx={n.x} cy={n.y} r={n.r} className="star-core" style={{ animationDelay: `${(n.delay * 7) % 3000}ms` }} />
                    <text x={n.labelX} y={n.labelY} textAnchor={n.anchor} className="star-label">{n.skill}</text>
                  </g>
                );
              })}
            </svg>
          </div>

          <aside className="constellation-panel" aria-live="polite">
            {activeNode ? (
              <>
                <small>{`// ${activeNode.category}`}</small>
                <h3>{activeNode.skill}</h3>
                {activeNode.projects.length ? (
                  <>
                    <p>
                      Used in {activeNode.projects.length} project{activeNode.projects.length > 1 ? "s" : ""}
                      {activeRelated.size > 0 && <> · often alongside {activeRelated.size} other skill{activeRelated.size > 1 ? "s" : ""}</>}
                    </p>
                    <ul>
                      {activeNode.projects.map(p => (
                        <li key={p.id}>
                          {hasRichContent(p.description) ? (
                            <a href={`/projects/${encodeURIComponent(p.id)}`}>{p.title} <i aria-hidden="true">→</i></a>
                          ) : (
                            <span>{p.title}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p>Part of my toolkit. Not tagged on a showcased project yet.</p>
                )}
              </>
            ) : (
              <>
                <small>{"// Skill map"}</small>
                <h3>{nodes.length} skills across {groups.length} areas</h3>
                <p>Each constellation is an area of expertise. Bigger stars are used in more of my projects. Hover or tap a star to explore.</p>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
