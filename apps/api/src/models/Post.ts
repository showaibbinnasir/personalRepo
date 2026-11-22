import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    excerpt: { type: String, default: "" },
    /** Rich-text HTML from the CMS editor. Sanitised by the web app before rendering. */
    content: { type: String, default: "" },
    coverImageUrl: { type: String, default: "" },
    coverImageAlt: { type: String, default: "" },
    tags: { type: [String], default: [], index: true },
    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
    /** A future date schedules the post: it stays hidden until then. */
    publishedAt: { type: Date, default: null, index: true },
    featured: { type: Boolean, default: false },
    seoTitle: { type: String, default: "" },
    seoDescription: { type: String, default: "" },
    readingMinutes: { type: Number, default: 1 },
    wordCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const Post =
  (mongoose.models.Post as mongoose.Model<any>) || mongoose.model("Post", postSchema);

/** Filter for posts the public is allowed to see right now. */
export const publicPostFilter = () => ({ status: "published", publishedAt: { $ne: null, $lte: new Date() } });
