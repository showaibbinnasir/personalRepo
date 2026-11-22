import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { Post, publicPostFilter } from "../models/Post.js";
import { requireAuth } from "../middleware/auth.js";
import { readingStats, revalidateWeb, slugify } from "../lib/content.js";

const router = Router();

const LIST_FIELDS = "-content -__v";

const postInput = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  slug: z.string().trim().max(100).optional().default(""),
  excerpt: z.string().trim().max(500).optional().default(""),
  content: z.string().max(1_500_000).optional().default(""),
  coverImageUrl: z.union([z.string().trim().url(), z.literal("")]).optional().default(""),
  coverImageAlt: z.string().trim().max(200).optional().default(""),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional().default([]),
  status: z.enum(["draft", "published"]).optional().default("draft"),
  publishedAt: z.union([z.coerce.date(), z.null()]).optional(),
  featured: z.boolean().optional().default(false),
  seoTitle: z.string().trim().max(120).optional().default(""),
  seoDescription: z.string().trim().max(320).optional().default("")
});

function buildPost(data: z.infer<typeof postInput>) {
  const slug = slugify(data.slug || data.title) || `post-${Date.now().toString(36)}`;
  const seen = new Set<string>();
  const tags = data.tags.map(t => t.trim()).filter(t => t && !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()));
  let publishedAt = data.publishedAt ?? null;
  if (data.status === "published" && !publishedAt) publishedAt = new Date();
  return { ...data, slug, tags, publishedAt, ...readingStats(data.content) };
}

async function slugTaken(slug: string, exceptId?: string) {
  const existing = await Post.findOne({ slug }).select("_id").lean() as { _id: unknown } | null;
  return Boolean(existing && String(existing._id) !== exceptId);
}

const validationError = (error: z.ZodError) =>
  error.issues.map(i => `${i.path.join(".") || "post"}: ${i.message}`).join("; ");

/* ---------- Admin (must be declared before "/:slug") ---------- */

router.get("/admin/all", requireAuth, async (_req, res) => {
  const posts = await Post.find().select(LIST_FIELDS).sort({ updatedAt: -1 }).lean();
  res.json({ posts });
});

router.get("/admin/:id", requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Post not found" });
  const post = await Post.findById(req.params.id).lean();
  if (!post) return res.status(404).json({ error: "Post not found" });
  res.json({ post });
});

router.post("/admin", requireAuth, async (req, res) => {
  const parsed = postInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: validationError(parsed.error) });
  const data = buildPost(parsed.data);
  if (await slugTaken(data.slug)) return res.status(409).json({ error: "That URL slug is already used by another post" });
  const post = await Post.create(data);
  await revalidateWeb();
  res.status(201).json({ post: post.toObject() });
});

router.put("/admin/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) return res.status(404).json({ error: "Post not found" });
  const parsed = postInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: validationError(parsed.error) });
  const data = buildPost(parsed.data);
  if (await slugTaken(data.slug, id)) return res.status(409).json({ error: "That URL slug is already used by another post" });
  const post = await Post.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
  if (!post) return res.status(404).json({ error: "Post not found" });
  await revalidateWeb();
  res.json({ post });
});

router.delete("/admin/:id", requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Post not found" });
  const deleted = await Post.findByIdAndDelete(req.params.id).lean();
  if (!deleted) return res.status(404).json({ error: "Post not found" });
  await revalidateWeb();
  res.json({ ok: true });
});

/* ---------- Public ---------- */

router.get("/", async (req, res) => {
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? "9"), 10) || 9));
  const tag = typeof req.query.tag === "string" && req.query.tag.trim() ? req.query.tag.trim() : undefined;

  const filter: Record<string, unknown> = publicPostFilter();
  if (tag) filter.tags = tag;

  const [posts, total, tags] = await Promise.all([
    Post.find(filter).select(LIST_FIELDS).sort({ featured: -1, publishedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Post.countDocuments(filter),
    Post.distinct("tags", publicPostFilter())
  ]);

  res.json({ posts, total, page, pages: Math.max(1, Math.ceil(total / limit)), tags: (tags as string[]).sort((a, b) => a.localeCompare(b)) });
});

router.get("/:slug", async (req, res) => {
  const post = await Post.findOne({ ...publicPostFilter(), slug: String(req.params.slug).toLowerCase() }).lean() as Record<string, any> | null;
  if (!post) return res.status(404).json({ error: "Post not found" });

  const base = publicPostFilter();
  const [older, newer, related] = await Promise.all([
    Post.findOne({ ...base, publishedAt: { $lt: post.publishedAt } }).select("title slug").sort({ publishedAt: -1 }).lean(),
    Post.findOne({ ...base, publishedAt: { $gt: post.publishedAt, $lte: new Date() } }).select("title slug").sort({ publishedAt: 1 }).lean(),
    post.tags?.length
      ? Post.find({ ...base, _id: { $ne: post._id }, tags: { $in: post.tags } }).select(LIST_FIELDS).sort({ publishedAt: -1 }).limit(3).lean()
      : Promise.resolve([])
  ]);

  res.json({ post, prev: older, next: newer, related });
});

export default router;
