import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype))
});

router.post("/", requireAuth, upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Choose a JPG, PNG, WEBP or GIF image" });
  const key = process.env.IMGBB_API_KEY;
  if (!key) return res.status(500).json({ error: "IMGBB_API_KEY is not configured" });

  const form = new FormData();
  form.append("image", req.file.buffer.toString("base64"));
  form.append("name", req.file.originalname.replace(/\.[^.]+$/, ""));
  const response = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(key)}`, { method: "POST", body: form });
  const json = await response.json() as any;
  if (!response.ok || !json?.success) return res.status(502).json({ error: "ImgBB upload failed" });
  res.json({ url: json.data.url, displayUrl: json.data.display_url, deleteUrl: json.data.delete_url });
});

export default router;
