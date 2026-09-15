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

await connectDb();

const app = express();
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: false }));
const origins = (process.env.FRONTEND_URL || "http://localhost:3000").split(",").map(v => v.trim());
app.use(cors({ origin: origins, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/ai", aiRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Unexpected server error" });
});

if (!process.env.VERCEL) {
  const port = Number(process.env.PORT || 5000);

  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

export default app;