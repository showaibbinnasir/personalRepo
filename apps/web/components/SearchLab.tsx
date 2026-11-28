"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BD_HEIGHT, BD_OUTLINE, BD_WIDTH } from "@/lib/bdGraph";
import {
  buildGraph,
  CONNECT_ALGOS,
  ROUTE_ALGOS,
  runConnect,
  runRoute,
  type ConnectAlgo,
  type ConnectTrace,
  type Graph,
  type RouteAlgo,
  type RouteTrace
} from "@/lib/searchAlgos";

/**
 * LAB-03 · Search agents. Search algorithms on a map of Bangladesh's 64 district towns.
 * - Find a route: watch BFS, DFS, UCS, Greedy, A* or Bidirectional BFS explore from one town to another.
 * - Connect the country: BFS/DFS trees and Prim's/Kruskal's minimum spanning trees link every town.
 * - Race: every algorithm runs side by side at the same speed; fewer steps = drawn faster.
 */

type Mode = "route" | "connect";
type View = "single" | "race";
type Trace = RouteTrace | ConnectTrace;

const BASE_RATE: Record<Mode, number> = { route: 7, connect: 22 }; // steps per second at 1×
const OUTLINE_PATHS = BD_OUTLINE.map(r => r.split(" ").map(p => p.split(",").map(Number) as [number, number]));
const PAD = 16;

type Colors = { accent: string; fg: string; muted: string; silver: string; mono: string };

function readColors(el: HTMLElement): Colors {
  const probe = document.createElement("span");
  probe.style.color = "var(--accent-text, #e0473d)";
  el.appendChild(probe);
  const accent = getComputedStyle(probe).color;
  probe.remove();
  const cs = getComputedStyle(el);
  return {
    accent,
    fg: cs.getPropertyValue("--fg").trim() || "#f4f1ec",
    muted: cs.getPropertyValue("--muted").trim() || "#a9a4a0",
    silver: "#b9c4d0",
    mono: cs.getPropertyValue("--mono").trim() || "monospace"
  };
}

function withAlpha(color: string, a: number) {
  const m = color.match(/\d+(\.\d+)?/g);
  if (color.startsWith("rgb") && m) return `rgba(${m[0]},${m[1]},${m[2]},${a})`;
  if (color.startsWith("#") && color.length === 7) {
    const n = parseInt(color.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }
  return color;
}

type Scene = {
  g: Graph;
  mode: Mode;
  trace: Trace;
  pos: number; // animation position in steps (fractional)
  start: number;
  goal: number;
  hover: number;
  reveal: number; // 0..1 path / finish reveal
  time: number; // seconds, for pulses
  mini: boolean;
  colors: Colors;
};

function fit(w: number, h: number) {
  const s = Math.min((w - PAD * 2) / BD_WIDTH, (h - PAD * 2) / BD_HEIGHT);
  return { s, ox: (w - BD_WIDTH * s) / 2, oy: (h - BD_HEIGHT * s) / 2 };
}

function drawScene(ctx: CanvasRenderingContext2D, w: number, h: number, sc: Scene) {
  const { g, colors: C, mini } = sc;
  const { s, ox, oy } = fit(w, h);
  const X = (i: number) => ox + g.x[i] * s;
  const Y = (i: number) => oy + g.y[i] * s;
  const lw = mini ? 0.8 : 1;
  ctx.clearRect(0, 0, w, h);

  // Country
  ctx.beginPath();
  for (const ring of OUTLINE_PATHS) {
    ring.forEach(([x, y], i) => (i ? ctx.lineTo(ox + x * s, oy + y * s) : ctx.moveTo(ox + x * s, oy + y * s)));
    ctx.closePath();
  }
  ctx.fillStyle = "rgba(244,241,236,0.035)";
  ctx.fill();
  ctx.strokeStyle = "rgba(244,241,236,0.28)";
  ctx.lineWidth = lw;
  ctx.stroke();

  // All links (the search space)
  ctx.beginPath();
  for (const [a, b] of g.edges) { ctx.moveTo(X(a), Y(a)); ctx.lineTo(X(b), Y(b)); }
  ctx.strokeStyle = "rgba(244,241,236,0.09)";
  ctx.lineWidth = lw;
  ctx.stroke();

  const line = (a: number, b: number, t: number, color: string, width: number, dash?: number[]) => {
    ctx.beginPath();
    ctx.moveTo(X(a), Y(a));
    ctx.lineTo(X(a) + (X(b) - X(a)) * t, Y(a) + (Y(b) - Y(a)) * t);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash || []);
    ctx.stroke();
    ctx.setLineDash([]);
  };
  const dot = (i: number, r: number, fill: string) => { ctx.beginPath(); ctx.arc(X(i), Y(i), r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); };
  const ring = (i: number, r: number, color: string, width = 1.4) => { ctx.beginPath(); ctx.arc(X(i), Y(i), r, 0, Math.PI * 2); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); };

  const k = Math.max(0, Math.floor(sc.pos));
  const frac = sc.pos - k;
  const state = new Array<number>(g.n).fill(0); // 0 unseen, 1 frontier, 2 visited

  if (sc.mode === "route") {
    const tr = sc.trace as RouteTrace;
    const steps = tr.steps;
    const done = k >= steps.length;
    const parentOf = new Map<number, [number, 0 | 1]>();
    const discoveredBy = new Map<number, [number, 0 | 1]>();
    for (let i = 0; i < Math.min(k, steps.length); i++) {
      const st = steps[i];
      state[st.node] = 2;
      if (st.parent >= 0) parentOf.set(st.node, [st.parent, st.side]);
      for (const v of st.added) { if (state[v] !== 2) state[v] = 1; discoveredBy.set(v, [st.node, st.side]); }
    }
    // Frontier links (dashed): discovered but not yet expanded
    discoveredBy.forEach(([p, side], v) => {
      if (state[v] === 1) line(p, v, 1, side ? withAlpha(C.silver, 0.45) : "rgba(244,241,236,0.38)", lw, mini ? [2, 3] : [3, 4]);
    });
    // Search tree (solid), newer links brighter
    let age = 0;
    for (let i = Math.min(k, steps.length) - 1; i >= 0; i--, age++) {
      const st = steps[i];
      if (st.parent < 0) continue;
      const a = Math.max(0.35, 1 - age / 40);
      line(st.parent, st.node, 1, withAlpha(st.side ? C.silver : C.accent, a), mini ? 1.3 : 1.8);
    }
    // Link being followed right now (grows)
    if (!done) {
      const st = steps[k];
      if (st.parent >= 0) line(st.parent, st.node, Math.min(1, frac * 1.6), st.side ? C.silver : C.accent, mini ? 1.6 : 2.4);
    }
    // Nodes
    for (let i = 0; i < g.n; i++) {
      if (state[i] === 2) dot(i, mini ? 2.4 : 3.6, C.accent);
      else if (state[i] === 1) { dot(i, mini ? 1.8 : 2.6, C.fg); ring(i, (mini ? 3.5 : 5.5) + Math.sin(sc.time * 5 + i) * (mini ? 0.5 : 1), "rgba(244,241,236,0.5)", 1); }
      else dot(i, mini ? 1.4 : 2.2, "rgba(244,241,236,0.38)");
    }
    if (!done) {
      const cur = steps[k].node;
      ring(cur, (mini ? 4 : 7) + frac * (mini ? 5 : 10), withAlpha(C.fg, 1 - frac), 1.6);
      dot(cur, mini ? 2.6 : 4, C.fg);
    }
    // Final route: glowing line drawn start → goal, with a travelling pulse
    if (done && tr.path.length > 1) {
      const segs = tr.path.length - 1;
      const upto = sc.reveal * segs;
      ctx.save();
      ctx.shadowColor = withAlpha(C.accent, 0.9);
      ctx.shadowBlur = mini ? 6 : 14;
      for (let i = 0; i < segs && i < upto; i++) line(tr.path[i], tr.path[i + 1], Math.min(1, upto - i), C.fg, mini ? 2 : 3.2);
      ctx.restore();
      if (sc.reveal >= 1 && !mini) {
        const t = (sc.time * 0.35) % 1;
        const f = t * segs;
        const i = Math.min(segs - 1, Math.floor(f));
        const a = tr.path[i], b = tr.path[i + 1];
        const px = X(a) + (X(b) - X(a)) * (f - i), py = Y(a) + (Y(b) - Y(a)) * (f - i);
        ctx.beginPath(); ctx.arc(px, py, 4.5, 0, Math.PI * 2); ctx.fillStyle = C.fg; ctx.shadowColor = C.accent; ctx.shadowBlur = 16; ctx.fill(); ctx.shadowBlur = 0;
      }
      tr.path.forEach(v => dot(v, mini ? 2.2 : 3.4, C.fg));
    }
    // Start and goal
    ring(sc.start, mini ? 5 : 9, C.fg, mini ? 1.4 : 2);
    dot(sc.start, mini ? 2.6 : 4.2, C.fg);
    ring(sc.goal, mini ? 5 : 9, C.accent, mini ? 1.4 : 2);
    if (!mini) {
      const gx = X(sc.goal), gy = Y(sc.goal);
      ctx.beginPath(); ctx.moveTo(gx - 14, gy); ctx.lineTo(gx - 10, gy); ctx.moveTo(gx + 10, gy); ctx.lineTo(gx + 14, gy);
      ctx.moveTo(gx, gy - 14); ctx.lineTo(gx, gy - 10); ctx.moveTo(gx, gy + 10); ctx.lineTo(gx, gy + 14);
      ctx.strokeStyle = C.accent; ctx.lineWidth = 1.6; ctx.stroke();
    }
    dot(sc.goal, mini ? 2.6 : 4, C.accent);
  } else {
    const tr = sc.trace as ConnectTrace;
    const steps = tr.steps;
    const done = k >= steps.length;
    const lim = Math.min(k, steps.length);
    let lastAdd = -1;
    for (let i = 0; i < lim; i++) {
      const st = steps[i];
      if (st.kind === "add") { state[st.u] = 2; state[st.v] = 2; lastAdd = i; }
    }
    if (tr.algo !== "kruskal") state[sc.start] = 2;
    let age = 0;
    for (let i = lim - 1; i >= 0; i--) {
      const st = steps[i];
      if (st.kind !== "add") continue;
      const a = done ? 1 : Math.max(0.45, 1 - age++ / 30);
      line(st.u, st.v, 1, withAlpha(C.accent, a), mini ? 1.4 : 2);
    }
    // Recent checks flash and fade
    for (let i = Math.max(0, lim - 4); i < lim; i++) {
      const st = steps[i];
      if (st.kind === "check") line(st.u, st.v, 1, `rgba(244,241,236,${(0.5 * (i - lim + 5)) / 5})`, mini ? 0.9 : 1.2, [2, 3]);
    }
    if (!done) {
      const st = steps[k];
      if (st.kind === "add") line(st.u, st.v, Math.min(1, frac * 1.5), C.fg, mini ? 1.8 : 2.6);
      else line(st.u, st.v, 1, `rgba(244,241,236,${0.8 * (1 - frac)})`, mini ? 1 : 1.4, [3, 3]);
    }
    for (let i = 0; i < g.n; i++) dot(i, state[i] === 2 ? (mini ? 2.3 : 3.4) : mini ? 1.4 : 2.2, state[i] === 2 ? C.accent : "rgba(244,241,236,0.38)");
    if (!done && lastAdd >= 0) { const st = steps[lastAdd]; ring(st.v, (mini ? 3 : 6) + frac * 8, withAlpha(C.fg, 1 - frac), 1.4); }
    if (done && sc.reveal > 0) {
      // Finish: a light sweeps across the finished network
      ctx.save();
      ctx.shadowColor = withAlpha(C.accent, 0.9);
      ctx.shadowBlur = mini ? 5 : 12;
      const sweep = sc.reveal * (BD_HEIGHT + 200) - 100;
      for (const st of steps) if (st.kind === "add") {
        const my = (g.y[st.u] + g.y[st.v]) / 2;
        const glow = Math.max(0, 1 - Math.abs(my - sweep) / 160);
        if (glow > 0.02) line(st.u, st.v, 1, withAlpha(C.fg, glow), mini ? 1.8 : 2.6);
      }
      ctx.restore();
    }
    if (tr.algo !== "kruskal") { ring(sc.start, mini ? 5 : 9, C.fg, mini ? 1.4 : 2); dot(sc.start, mini ? 2.6 : 4.2, C.fg); }
  }

  // Labels
  if (!mini) {
    ctx.font = `500 11px ${C.mono}`;
    ctx.textBaseline = "middle";
    const label = (i: number, text: string, color: string) => {
      const tx = X(i) + 13, ty = Y(i) - 12;
      const m = ctx.measureText(text).width;
      const left = tx + m + 12 > w ? X(i) - 13 - m - 10 : tx;
      ctx.fillStyle = "rgba(10,8,12,0.82)";
      ctx.beginPath(); ctx.roundRect(left - 5, ty - 9, m + 10, 18, 3); ctx.fill();
      ctx.fillStyle = color;
      ctx.fillText(text, left, ty + 0.5);
    };
    if (sc.mode === "route") {
      label(sc.start, `A · ${g.names[sc.start].toUpperCase()}`, C.fg);
      label(sc.goal, `B · ${g.names[sc.goal].toUpperCase()}`, C.accent);
    } else if ((sc.trace as ConnectTrace).algo !== "kruskal") label(sc.start, `START · ${g.names[sc.start].toUpperCase()}`, C.fg);
    if (sc.hover >= 0 && sc.hover !== sc.start && sc.hover !== sc.goal) label(sc.hover, `${g.names[sc.hover]} · ${g.bn[sc.hover]}`, C.muted);
  }
}

export default function SearchLab() {
  const g = useMemo(buildGraph, []);
  const idx = (name: string) => Math.max(0, g.names.indexOf(name));
  const townOptions = useMemo(() => g.names.map((name, i) => ({ name, i })).sort((a, b) => a.name.localeCompare(b.name)), [g]);

  const [mode, setMode] = useState<Mode>("route");
  const [view, setView] = useState<View>("single");
  const [routeAlgo, setRouteAlgo] = useState<RouteAlgo>("astar");
  const [connectAlgo, setConnectAlgo] = useState<ConnectAlgo>("prim");
  const [start, setStart] = useState(() => idx("Panchagarh"));
  const [goal, setGoal] = useState(() => idx("Cox's Bazar"));
  const [pick, setPick] = useState<"start" | "goal">("start");
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(true);
  const [tick, setTick] = useState(0);
  const [finished, setFinished] = useState(false);

  const traces = useMemo(() => {
    if (mode === "route") return ROUTE_ALGOS.map(a => runRoute(g, a.id, start, goal));
    return CONNECT_ALGOS.map(a => runConnect(g, a.id, start));
  }, [g, mode, start, goal]);
  const activeId = mode === "route" ? routeAlgo : connectAlgo;
  const shown: Trace[] = view === "race" ? traces : [traces.find(t => t.algo === activeId)!];
  const maxSteps = Math.max(...shown.map(t => t.steps.length));

  const wrapRef = useRef<HTMLDivElement>(null);
  const main = { ref: useRef<HTMLCanvasElement>(null) };
  const miniRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const anim = useRef({ pos: 0, doneAt: -1, hover: -1, visible: true });
  const live = useRef({ mode, shown, start, goal, speed, playing, maxSteps, view });
  live.current = { mode, shown, start, goal, speed, playing, maxSteps, view };

  // Restart whenever the problem changes.
  useEffect(() => {
    anim.current.pos = 0;
    anim.current.doneAt = -1;
    setTick(0);
    setFinished(false);
    setPlaying(true);
  }, [mode, view, routeAlgo, connectAlgo, start, goal]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const colors = readColors(wrap);
    let raf = 0;
    let last = performance.now();
    let lastTick = -1;
    const io = new IntersectionObserver(([e]) => { anim.current.visible = e.isIntersecting; }, { threshold: 0.05 });
    io.observe(wrap);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      // rAF timestamps can be slightly earlier than performance.now(), so clamp at 0.
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      if (!anim.current.visible || document.hidden) return;
      const L = live.current;
      const A = anim.current;
      if (L.playing && A.pos < L.maxSteps) {
        A.pos = Math.min(L.maxSteps, A.pos + dt * BASE_RATE[L.mode] * L.speed);
        if (A.pos >= L.maxSteps) { A.doneAt = now; setFinished(true); }
      }
      const t = Math.floor(A.pos);
      if (t !== lastTick) { lastTick = t; setTick(t); }
      const time = now / 1000;

      const render = (canvas: HTMLCanvasElement | null, tr: Trace, mini: boolean) => {
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const pos = Math.min(A.pos, tr.steps.length);
        // Each racer's finish reveal starts when it finishes.
        const finishedFor = (A.pos - tr.steps.length) / (BASE_RATE[L.mode] * L.speed);
        const reveal = A.pos >= tr.steps.length ? Math.min(1, Math.max(0, finishedFor) / 1.4) : 0;
        drawScene(ctx, w, h, { g, mode: L.mode, trace: tr, pos, start: L.start, goal: L.goal, hover: mini ? -1 : A.hover, reveal, time, mini, colors });
      };
      // Keep the clock running after the slowest finishes, so reveals complete.
      const revealEnd = L.maxSteps + BASE_RATE[L.mode] * L.speed * 1.5;
      if (A.pos >= L.maxSteps && A.pos < revealEnd && L.playing) A.pos = Math.min(revealEnd, A.pos + dt * BASE_RATE[L.mode] * L.speed);
      if (L.view === "single") render(main.ref.current, L.shown[0], false);
      else L.shown.forEach((tr, i) => render(miniRefs.current[i], tr, true));
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [g, main.ref]);

  // Map interaction (single view): hover shows a town, click sets start / goal.
  const nearest = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget;
    const r = c.getBoundingClientRect();
    const { s, ox, oy } = fit(r.width, r.height);
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    let best = -1, bd = 22;
    for (let i = 0; i < g.n; i++) {
      const d = Math.hypot(ox + g.x[i] * s - mx, oy + g.y[i] * s - my);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => { anim.current.hover = nearest(e); };
  const onLeave = () => { anim.current.hover = -1; };
  const onClick = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const i = nearest(e);
    if (i < 0) return;
    if (mode === "connect") { setStart(i); return; }
    if (pick === "start") { if (i !== goal) setStart(i); setPick("goal"); }
    else { if (i !== start) setGoal(i); setPick("start"); }
  };

  const restart = () => { anim.current.pos = 0; anim.current.doneAt = -1; setTick(0); setFinished(false); setPlaying(true); };
  const stepOnce = () => { setPlaying(false); anim.current.pos = Math.min(maxSteps, Math.floor(anim.current.pos) + 1); if (anim.current.pos >= maxSteps) setFinished(true); setTick(Math.floor(anim.current.pos)); };
  const togglePlay = () => { if (finished || anim.current.pos >= maxSteps) { restart(); return; } setPlaying(p => !p); };

  const algos = mode === "route" ? ROUTE_ALGOS : CONNECT_ALGOS;
  const info = algos.find(a => a.id === activeId)!;
  const single = shown[0];
  const k = Math.min(tick, single.steps.length);

  // Live numbers for the HUD (single view)
  let hud: [string, string][] = [];
  if (mode === "route") {
    const tr = single as RouteTrace;
    const st = tr.steps[Math.max(0, k - 1)];
    const done = k >= tr.steps.length;
    hud = [
      ["Expanded", `${k} / ${g.n}`],
      ["Frontier", done ? "–" : String(st?.frontierSize ?? 1)],
      ["Route", done ? (tr.found ? `${tr.km} km` : "None") : "searching…"],
      ["Stops", done && tr.found ? String(tr.path.length - 1) : "–"]
    ];
  } else {
    const tr = single as ConnectTrace;
    const sofar = tr.steps.slice(0, k);
    const adds = sofar.filter(s => s.kind === "add");
    hud = [
      ["Steps", `${k} / ${tr.steps.length}`],
      ["Links", `${adds.length} / ${g.n - 1}`],
      ["Total", `${adds.reduce((a, s) => a + s.km, 0)} km`],
      ["Checked", String(sofar.filter(s => s.kind === "check").length)]
    ];
  }

  // Race leaderboard: fewer steps = drawn faster
  const optimalKm = mode === "route" ? Math.min(...(traces as RouteTrace[]).filter(t => t.found).map(t => t.km)) : Math.min(...(traces as ConnectTrace[]).map(t => t.km));
  const board = traces
    .map(t => ({ t, meta: algos.find(a => a.id === t.algo)!, km: t.km, steps: t.steps.length }))
    .sort((a, b) => a.steps - b.steps || a.km - b.km);
  const rankOf = (algo: string) => board.findIndex(b => b.t.algo === algo) + 1;

  const frontier = mode === "route" && view === "single" ? (single as RouteTrace).steps[Math.max(0, k - 1)]?.frontier ?? [] : [];
  const status =
    view === "race"
      ? finished ? `Race finished. ${board[0].meta.label} drew it fastest in ${board[0].steps} steps.` : "Race in progress"
      : finished
        ? mode === "route"
          ? `${info.label} found a ${(single as RouteTrace).km} km route after expanding ${single.steps.length} towns.`
          : `${info.label} connected all ${g.n} towns with ${(single as ConnectTrace).km} km of links in ${single.steps.length} steps.`
        : "";

  return (
    <div className="search-lab" ref={wrapRef}>
      <div className={`search-stage ${view === "race" ? "is-race" : ""} ${mode === "connect" ? "is-connect" : ""}`}>
        {view === "single" ? (
          <>
            <canvas
              ref={main.ref}
              className="search-canvas"
              data-cursor="hover"
              onPointerMove={onMove}
              onPointerLeave={onLeave}
              onClick={onClick}
              role="img"
              aria-label={`Map of Bangladesh's 64 district towns. ${info.label} ${mode === "route" ? `searching from ${g.names[start]} to ${g.names[goal]}` : `connecting every town`}. Click a town to change the ${mode === "route" ? pick : "start"}.`}
            />
            <div className="arm-hud arm-hud--tl" aria-hidden="true">
              <small>{"// LAB-03 · Search agents"}</small>
            </div>
            <dl className="arm-hud arm-hud--tr search-hud">
              {hud.map(([dt, dd]) => <div key={dt}><dt>{dt}</dt><dd>{dd}</dd></div>)}
            </dl>
            <div className="arm-hud arm-hud--bl" aria-hidden="true">
              <span className="arm-hint arm-hint--pointer">{mode === "route" ? `Click a town to set ${pick === "start" ? "A (start)" : "B (goal)"}` : "Click a town to start from there"}</span>
              <span className="arm-hint arm-hint--touch">{mode === "route" ? `Tap a town to set ${pick === "start" ? "A (start)" : "B (goal)"}` : "Tap a town to start from there"}</span>
            </div>
          </>
        ) : (
          <div className="search-race">
            {shown.map((tr, i) => {
              const meta = algos.find(a => a.id === tr.algo)!;
              const done = tick >= tr.steps.length;
              const rank = rankOf(tr.algo);
              return (
                <div key={tr.algo} className={`search-mini ${done ? "is-done" : ""} ${done && rank === 1 ? "is-first" : ""}`}>
                  <canvas ref={el => { miniRefs.current[i] = el; }} aria-hidden="true" />
                  <div className="search-mini-head">
                    <b>{meta.short}</b>
                    <span>{Math.min(tick, tr.steps.length)} steps</span>
                  </div>
                  {done && <div className="search-mini-rank">#{rank}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="search-side">
        <div className="search-modes" role="group" aria-label="Problem">
          <button type="button" className={mode === "route" ? "is-active" : ""} aria-pressed={mode === "route"} onClick={() => setMode("route")}>
            <small>A → B</small>Find a route
          </button>
          <button type="button" className={mode === "connect" ? "is-active" : ""} aria-pressed={mode === "connect"} onClick={() => setMode("connect")}>
            <small>All 64</small>Connect the country
          </button>
        </div>

        <div className="search-block">
          <span className="search-label">{view === "race" ? "// Racing every algorithm" : "// Algorithm"}</span>
          <div className="pid-presets search-algos" role="group" aria-label="Algorithm">
            {algos.map(a => (
              <button
                key={a.id}
                type="button"
                className={view === "single" && activeId === a.id ? "is-active" : ""}
                aria-pressed={view === "single" && activeId === a.id}
                onClick={() => { setView("single"); mode === "route" ? setRouteAlgo(a.id as RouteAlgo) : setConnectAlgo(a.id as ConnectAlgo); }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <div className="search-block search-towns">
          <label>
            <span className="search-label">{mode === "route" ? "// A · Start" : "// Start town"}</span>
            <select className="search-select" value={start} onChange={e => { const v = Number(e.target.value); if (mode === "connect" || v !== goal) setStart(v); }}>
              {townOptions.map(t => <option key={t.i} value={t.i}>{t.name}</option>)}
            </select>
          </label>
          {mode === "route" && (
            <>
              <button type="button" className="search-swap" onClick={() => { setStart(goal); setGoal(start); }} aria-label="Swap start and goal" title="Swap">⇄</button>
              <label>
                <span className="search-label">{"// B · Goal"}</span>
                <select className="search-select" value={goal} onChange={e => { const v = Number(e.target.value); if (v !== start) setGoal(v); }}>
                  {townOptions.map(t => <option key={t.i} value={t.i}>{t.name}</option>)}
                </select>
              </label>
            </>
          )}
        </div>

        <label className="pid-slider search-speed">
          <span className="pid-slider-head">
            <b>⏱</b>
            <span>Speed</span>
            <output>{speed.toFixed(2).replace(/\.?0+$/, "")}×</output>
          </span>
          <input type="range" min={0.25} max={4} step={0.25} value={speed} onChange={e => setSpeed(Number(e.target.value))} style={{ ["--fill" as string]: `${((speed - 0.25) / 3.75) * 100}%` }} />
        </label>

        <div className="pid-actions search-actions">
          <button type="button" className="pid-btn" onClick={togglePlay}>{finished ? "Replay" : playing ? "Pause" : "Play"}</button>
          <button type="button" className="pid-btn" onClick={stepOnce} disabled={finished}>Step</button>
          <button type="button" className={`pid-btn search-race-btn ${view === "race" ? "is-on" : ""}`} aria-pressed={view === "race"} onClick={() => setView(v => (v === "race" ? "single" : "race"))}>
            {view === "race" ? "Exit race" : "Race all"}
          </button>
        </div>

        {view === "single" ? (
          <div className="search-learn">
            <span className="search-label">{`// How ${info.short} works`}</span>
            <p>{info.how}</p>
            <dl>
              <div><dt>Uses</dt><dd>{info.structure}</dd></div>
              <div><dt>Optimal</dt><dd>{info.optimal}</dd></div>
            </dl>
            {mode === "route" && frontier.length > 0 && (
              <div className="search-frontier">
                <span className="search-label">{"// Next in the frontier"}</span>
                <ol>
                  {frontier.map(f => (
                    <li key={f.node}><span>{g.names[f.node]}</span>{f.label && <em>{f.label}</em>}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        ) : (
          <div className="search-board">
            <span className="search-label">{mode === "route" ? "// Leaderboard · towns expanded" : "// Leaderboard · steps to draw"}</span>
            <ol>
              {board.map(({ t, meta, km, steps }, i) => {
                const done = tick >= steps;
                const best = km === optimalKm && (mode === "connect" || (t as RouteTrace).found);
                return (
                  <li key={t.algo} className={done ? "is-done" : ""}>
                    <b>{done ? `#${i + 1}` : "…"}</b>
                    <span>{meta.label}</span>
                    <em>{steps} steps</em>
                    <em className={best ? "is-best" : ""}>{km} km{best ? " ✓" : ""}</em>
                  </li>
                );
              })}
            </ol>
            <p className="search-board-note">
              {mode === "route"
                ? "Steps = towns expanded before reaching the goal. ✓ = shortest route found."
                : "Steps = links checked plus links added. ✓ = least total length (a minimum spanning tree)."}
            </p>
          </div>
        )}

        <p className="sr-only" role="status" aria-live="polite">{status}</p>
        <p className="search-credit">Towns © OpenStreetMap contributors (ODbL) · Outline: Natural Earth</p>
      </div>
    </div>
  );
}
