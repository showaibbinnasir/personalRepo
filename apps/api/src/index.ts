import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { connectDb } from "./db.js";
import authRoutes from "./routes/auth.js";
import portfolioRoutes from "./routes/portfolio.js";
import uploadRoutes from "./routes/upload.js";
import aiRoutes from "./routes/ai.js";
import postRoutes from "./routes/posts.js";

await connectDb();

const app = express();
// How many proxies sit in front of this API (used to find the visitor's real IP for rate limits).
// Locally the website's /backend proxy is 1 hop. In production, count your host's load balancer too
// (e.g. website proxy + Render = 2).
app.set("trust proxy", Number(process.env.TRUST_PROXY ?? 1));
app.use(helmet({ crossOriginResourcePolicy: false }));
const origins = (process.env.FRONTEND_URL || "http://localhost:3000").split(",").map(v => v.trim());
app.use(cors({ origin: origins, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

// Cookie-authenticated endpoints accept form posts, so reject state-changing
// requests that a browser sends from any site other than the configured frontend.
app.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  if (!origin || origins.includes(origin)) return next();
  // Requests relayed by the website's own /backend proxy carry the site's host in
  // X-Forwarded-Host. A browser on another site can't set that header without a
  // CORS preflight (which is refused), so a match means the request came from our site.
  const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
  try {
    if (forwardedHost && new URL(origin).host === forwardedHost) return next();
  } catch {
    /* malformed Origin */
  }
  return res.status(403).json({ error: "Origin not allowed" });
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/posts", postRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Unexpected server error" });
});

const port = Number(process.env.PORT || 5000);
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
