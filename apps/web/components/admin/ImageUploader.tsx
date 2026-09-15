"use client";
import { useState } from "react";
import { API_URL } from "@/lib/api";

export default function ImageUploader({ value, onChange }: { value?: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(file?: File) {
    if (!file) return;
    setUploading(true); setError("");
    const body = new FormData(); body.append("image", file);
    try {
      const res = await fetch(`${API_URL}/upload`, { method: "POST", body, credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      onChange(json.url);
    } catch (e: any) { setError(e.message); } finally { setUploading(false); }
  }

  return <div className="image-uploader">
    {value && <img src={value} alt="Current upload"/>}
    <input value={value || ""} onChange={e => onChange(e.target.value)} placeholder="ImgBB image URL" />
    <div className="upload-row"><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e => upload(e.target.files?.[0])}/><span>{uploading ? "Uploading…" : "Uploads to ImgBB"}</span></div>
    {error && <small className="login-error">{error}</small>}
  </div>;
}
