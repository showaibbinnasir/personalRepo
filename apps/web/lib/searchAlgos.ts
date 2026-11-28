import { BD_EDGES, BD_NODES } from "./bdGraph";

/**
 * Search algorithms for the search-agents lab. Each one runs instantly and records
 * a trace of steps, which the canvas then animates. All of them work on the same
 * graph, so step counts are directly comparable.
 */

export type Graph = {
  n: number;
  names: string[];
  bn: string[];
  x: number[];
  y: number[];
  lat: number[];
  lon: number[];
  adj: { to: number; km: number }[][];
  edges: [number, number, number][];
};

export function buildGraph(): Graph {
  const n = BD_NODES.length;
  const adj: Graph["adj"] = Array.from({ length: n }, () => []);
  for (const [a, b, km] of BD_EDGES) {
    adj[a].push({ to: b, km });
    adj[b].push({ to: a, km });
  }
  // Deterministic neighbour order: nearest first.
  adj.forEach(list => list.sort((p, q) => p.km - q.km || p.to - q.to));
  return {
    n,
    names: BD_NODES.map(d => d[0]),
    bn: BD_NODES.map(d => d[1]),
    x: BD_NODES.map(d => d[2]),
    y: BD_NODES.map(d => d[3]),
    lat: BD_NODES.map(d => d[4]),
    lon: BD_NODES.map(d => d[5]),
    adj,
    edges: BD_EDGES
  };
}

/** Straight-line (great-circle) distance in km: the heuristic for Greedy and A*. Never overestimates. */
export function crowKm(g: Graph, a: number, b: number) {
  const r = Math.PI / 180;
  const dl = (g.lat[b] - g.lat[a]) * r;
  const dn = (g.lon[b] - g.lon[a]) * r;
  const h = Math.sin(dl / 2) ** 2 + Math.cos(g.lat[a] * r) * Math.cos(g.lat[b] * r) * Math.sin(dn / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// ---------------------------------------------------------------- route search

export type RouteAlgo = "bfs" | "dfs" | "ucs" | "greedy" | "astar" | "bidir";

export type RouteStep = {
  node: number; // expanded this step
  parent: number; // -1 for a start node
  side: 0 | 1; // bidirectional search: 0 = from start, 1 = from goal
  added: number[]; // neighbours pushed onto the frontier this step
  frontier: { node: number; label: string }[]; // next few in pop order (for the learning panel)
  frontierSize: number;
};

export type RouteTrace = {
  algo: RouteAlgo;
  steps: RouteStep[];
  path: number[]; // empty if not found
  km: number;
  found: boolean;
};

export const ROUTE_ALGOS: { id: RouteAlgo; label: string; short: string; structure: string; optimal: string; how: string }[] = [
  { id: "bfs", label: "Breadth-first", short: "BFS", structure: "Queue (first in, first out)", optimal: "Fewest stops, not fewest km",
    how: "Explores in rings: every town one link away, then two, then three. Guarantees the route with the fewest stops." },
  { id: "dfs", label: "Depth-first", short: "DFS", structure: "Stack (last in, first out)", optimal: "No",
    how: "Dives down one road as far as it can, then backtracks. Uses little memory, but the route it finds can wander." },
  { id: "ucs", label: "Uniform cost", short: "UCS", structure: "Priority queue on g (km so far)", optimal: "Yes, shortest km",
    how: "Dijkstra's algorithm: always expands the town with the shortest distance travelled so far. Optimal, but searches in every direction." },
  { id: "greedy", label: "Greedy best-first", short: "Greedy", structure: "Priority queue on h (km to goal, straight line)", optimal: "No",
    how: "Always heads for the town that looks closest to the goal. Very fast when the way is clear, but can be fooled into a longer route." },
  { id: "astar", label: "A* search", short: "A*", structure: "Priority queue on f = g + h", optimal: "Yes, shortest km",
    how: "Combines distance travelled (g) with a straight-line estimate to the goal (h). Optimal like UCS, while exploring far fewer towns." },
  { id: "bidir", label: "Bidirectional BFS", short: "Bi-BFS", structure: "Two queues, one from each end", optimal: "Fewest stops",
    how: "Runs two breadth-first searches, from the start and from the goal, and stops when they meet in the middle." }
];

const TOP = 6;

function tracePath(parents: number[], end: number) {
  const path = [];
  for (let v = end; v !== -1; v = parents[v]) path.push(v);
  return path.reverse();
}

function pathKm(g: Graph, path: number[]) {
  let km = 0;
  for (let i = 1; i < path.length; i++) km += g.adj[path[i - 1]].find(e => e.to === path[i])?.km || 0;
  return km;
}

/** Minimal binary heap keyed by number (ties broken by insertion order, so results are deterministic). */
class Heap<T> {
  private a: { k: number; s: number; v: T }[] = [];
  private seq = 0;
  get size() { return this.a.length; }
  push(k: number, v: T) {
    const a = this.a;
    a.push({ k, s: this.seq++, v });
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.lt(a[p], a[i])) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.lt(a[l], a[m])) m = l;
        if (r < a.length && this.lt(a[r], a[m])) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
  /** Items in pop order (small heaps only). */
  sorted() { return [...this.a].sort((p, q) => (this.lt(p, q) ? -1 : 1)); }
  private lt(p: { k: number; s: number }, q: { k: number; s: number }) { return p.k < q.k || (p.k === q.k && p.s < q.s); }
}

export function runRoute(g: Graph, algo: RouteAlgo, start: number, goal: number): RouteTrace {
  if (algo === "bidir") return runBidirectional(g, start, goal);
  const steps: RouteStep[] = [];
  const parents = new Array(g.n).fill(-1);
  const best = new Array(g.n).fill(Infinity); // g-cost
  const closed = new Array(g.n).fill(false);
  const h = (v: number) => crowKm(g, v, goal);

  if (algo === "bfs" || algo === "dfs") {
    const list: number[] = [start];
    const seen = new Array(g.n).fill(false);
    seen[start] = true;
    while (list.length) {
      const u = algo === "bfs" ? list.shift()! : list.pop()!;
      if (closed[u]) continue;
      closed[u] = true;
      const added: number[] = [];
      if (u !== goal) {
        // DFS pushes in reverse so the nearest neighbour is explored first.
        const nbrs = algo === "dfs" ? [...g.adj[u]].reverse() : g.adj[u];
        for (const { to } of nbrs) {
          if (algo === "bfs" ? seen[to] : closed[to]) continue;
          seen[to] = true;
          parents[to] = u;
          list.push(to);
          added.push(to);
        }
      }
      const order = algo === "bfs" ? list : [...list].reverse();
      const uniq = order.filter((v, i) => !closed[v] && order.indexOf(v) === i);
      steps.push({ node: u, parent: steps.length ? stepParent(parents, u, start) : -1, side: 0, added, frontier: uniq.slice(0, TOP).map(v => ({ node: v, label: "" })), frontierSize: uniq.length });
      if (u === goal) break;
    }
  } else {
    const heap = new Heap<number>();
    best[start] = 0;
    heap.push(algo === "ucs" ? 0 : algo === "greedy" ? h(start) : h(start), start);
    while (heap.size) {
      const { v: u } = heap.pop();
      if (closed[u]) continue;
      closed[u] = true;
      const added: number[] = [];
      if (u !== goal) {
        for (const { to, km } of g.adj[u]) {
          if (closed[to]) continue;
          const cost = best[u] + km;
          if (algo === "greedy") {
            if (best[to] !== Infinity) continue; // greedy never revisits
            best[to] = cost;
            parents[to] = u;
            heap.push(h(to), to);
            added.push(to);
          } else if (cost < best[to]) {
            best[to] = cost;
            parents[to] = u;
            heap.push(algo === "ucs" ? cost : cost + h(to), to);
            added.push(to);
          }
        }
      }
      const seenF = new Set<number>();
      const front = heap.sorted().filter(e => !closed[e.v] && !seenF.has(e.v) && (seenF.add(e.v), true));
      steps.push({
        node: u,
        parent: u === start ? -1 : parents[u],
        side: 0,
        added,
        frontier: front.slice(0, TOP).map(e => ({ node: e.v, label: algo === "astar" ? `f ${Math.round(e.k)}` : algo === "ucs" ? `g ${Math.round(e.k)}` : `h ${Math.round(e.k)}` })),
        frontierSize: front.length
      });
      if (u === goal) break;
    }
  }
  const found = closed[goal];
  const path = found ? tracePath(parents, goal) : [];
  return { algo, steps, path, km: pathKm(g, path), found };
}

function stepParent(parents: number[], u: number, start: number) {
  return u === start ? -1 : parents[u];
}

function runBidirectional(g: Graph, start: number, goal: number): RouteTrace {
  const steps: RouteStep[] = [];
  const par = [new Array(g.n).fill(-1), new Array(g.n).fill(-1)];
  const dist = [new Array(g.n).fill(-1), new Array(g.n).fill(-1)];
  dist[0][start] = 0;
  dist[1][goal] = 0;
  if (start === goal) {
    steps.push({ node: start, parent: -1, side: 0, added: [], frontier: [], frontierSize: 0 });
    return { algo: "bidir", steps, path: [start], km: 0, found: true };
  }
  let level: number[][] = [[start], [goal]];
  let meet = -1;
  let side: 0 | 1 = 0;
  // Expand one whole layer at a time (alternating sides). When the searches touch,
  // finish that layer and keep the meeting town with the shortest combined route.
  while (meet === -1 && (level[0].length || level[1].length)) {
    if (!level[side].length) side = side === 0 ? 1 : 0;
    const other: 0 | 1 = side === 0 ? 1 : 0;
    const next: number[] = [];
    let bestTotal = Infinity;
    for (let i = 0; i < level[side].length; i++) {
      const u = level[side][i];
      const added: number[] = [];
      for (const { to } of g.adj[u]) {
        if (dist[side][to] !== -1) continue;
        dist[side][to] = dist[side][u] + 1;
        par[side][to] = u;
        next.push(to);
        added.push(to);
        if (dist[other][to] !== -1 && dist[side][to] + dist[other][to] < bestTotal) {
          bestTotal = dist[side][to] + dist[other][to];
          meet = to;
        }
      }
      const waiting = [...level[side].slice(i + 1), ...next, ...level[other]];
      steps.push({
        node: u,
        parent: par[side][u],
        side,
        added,
        frontier: waiting.slice(0, TOP).map(v => ({ node: v, label: dist[0][v] !== -1 && dist[1][v] === -1 ? "from start" : dist[1][v] !== -1 && dist[0][v] === -1 ? "from goal" : "meeting" })),
        frontierSize: waiting.length
      });
    }
    level[side] = next;
    side = other;
  }
  if (meet === -1) return { algo: "bidir", steps, path: [], km: 0, found: false };
  const a = tracePath(par[0], meet);
  const b: number[] = [];
  for (let v = par[1][meet]; v !== -1; v = par[1][v]) b.push(v);
  const path = [...a, ...b];
  return { algo: "bidir", steps, path, km: pathKm(g, path), found: true };
}

// ---------------------------------------------------------------- connect the country

export type ConnectAlgo = "bfs-tree" | "dfs-tree" | "prim" | "kruskal";

export type ConnectStep = { kind: "check" | "add"; u: number; v: number; km: number };

export type ConnectTrace = { algo: ConnectAlgo; steps: ConnectStep[]; checks: number; km: number; links: number };

export const CONNECT_ALGOS: { id: ConnectAlgo; label: string; short: string; structure: string; optimal: string; how: string }[] = [
  { id: "bfs-tree", label: "BFS tree", short: "BFS", structure: "Queue", optimal: "No (any tree)",
    how: "Spreads outward from the start town ring by ring, linking each new town to the one that reached it first." },
  { id: "dfs-tree", label: "DFS tree", short: "DFS", structure: "Stack / recursion", optimal: "No (any tree)",
    how: "Follows one chain of towns as deep as it goes, then backtracks. Draws long snaking branches." },
  { id: "prim", label: "Prim's MST", short: "Prim", structure: "Priority queue of links", optimal: "Yes, least total km",
    how: "Grows one network from the start town, always adding the shortest link to a town not yet connected." },
  { id: "kruskal", label: "Kruskal's MST", short: "Kruskal", structure: "Sorted links + union-find", optimal: "Yes, least total km",
    how: "Considers every link from shortest to longest and keeps it if it joins two separate networks. Many small networks merge into one." }
];

export function runConnect(g: Graph, algo: ConnectAlgo, start: number): ConnectTrace {
  const steps: ConnectStep[] = [];
  const inTree = new Array(g.n).fill(false);
  const add = (u: number, v: number, km: number) => steps.push({ kind: "add", u, v, km });
  const check = (u: number, v: number, km: number) => steps.push({ kind: "check", u, v, km });

  if (algo === "bfs-tree") {
    const q = [start];
    inTree[start] = true;
    while (q.length) {
      const u = q.shift()!;
      for (const { to, km } of g.adj[u]) {
        check(u, to, km);
        if (inTree[to]) continue;
        inTree[to] = true;
        add(u, to, km);
        q.push(to);
      }
    }
  } else if (algo === "dfs-tree") {
    const visit = (u: number) => {
      inTree[u] = true;
      for (const { to, km } of g.adj[u]) {
        check(u, to, km);
        if (inTree[to]) continue;
        add(u, to, km);
        visit(to);
      }
    };
    visit(start);
  } else if (algo === "prim") {
    const heap = new Heap<[number, number]>();
    const enter = (u: number) => {
      inTree[u] = true;
      for (const { to, km } of g.adj[u]) if (!inTree[to]) heap.push(km, [u, to]);
    };
    enter(start);
    let added = 0;
    while (heap.size && added < g.n - 1) {
      const { k, v: [u, to] } = heap.pop();
      check(u, to, k);
      if (inTree[to]) continue;
      add(u, to, k);
      added++;
      enter(to);
    }
  } else {
    const parent = Array.from({ length: g.n }, (_, i) => i);
    const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    const sorted = [...g.edges].sort((p, q) => p[2] - q[2] || p[0] - q[0] || p[1] - q[1]);
    let added = 0;
    for (const [u, v, km] of sorted) {
      if (added === g.n - 1) break;
      check(u, v, km);
      const a = find(u), b = find(v);
      if (a === b) continue;
      parent[a] = b;
      add(u, v, km);
      added++;
    }
  }
  const adds = steps.filter(s => s.kind === "add");
  return { algo, steps, checks: steps.filter(s => s.kind === "check").length, km: adds.reduce((a, s) => a + s.km, 0), links: adds.length };
}
