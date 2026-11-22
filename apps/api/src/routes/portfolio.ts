import { Router } from "express";
import { Portfolio } from "../models/Portfolio.js";
import { requireAuth } from "../middleware/auth.js";
import { publicPortfolio, revalidateWeb } from "../lib/content.js";

const router = Router();

/** Public: hidden items are removed before the response leaves the server. */
router.get("/", async (_req, res) => {
  const portfolio = await Portfolio.findOne({ key: "main" }).lean();
  if (!portfolio) return res.status(404).json({ error: "Portfolio has not been seeded yet" });
  res.json(publicPortfolio(portfolio as Record<string, any>));
});

/** Admin: the full record, hidden items included, for the dashboard editor. */
router.get("/admin", requireAuth, async (_req, res) => {
  const portfolio = await Portfolio.findOne({ key: "main" }).lean();
  if (!portfolio) return res.status(404).json({ error: "Portfolio has not been seeded yet" });
  res.json(portfolio);
});

router.put("/admin", requireAuth, async (req, res) => {
  const body = { ...req.body };
  delete body._id;
  delete body.__v;
  delete body.createdAt;
  delete body.updatedAt;
  body.key = "main";
  const portfolio = await Portfolio.findOneAndUpdate({ key: "main" }, body, {
    new: true,
    upsert: true,
    runValidators: true,
    setDefaultsOnInsert: true
  }).lean();
  await revalidateWeb();
  res.json(portfolio);
});

export default router;
