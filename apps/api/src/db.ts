import mongoose from "mongoose";

export async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured");
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(uri);
  console.log("MongoDB connected");
}
