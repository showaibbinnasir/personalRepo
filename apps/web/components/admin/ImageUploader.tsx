"use client";

import { DragEvent, useRef, useState } from "react";
import Icon from "./icons";
import { uploadImage } from "./cmsApi";

/** Drag-and-drop / click-to-upload image field backed by ImgBB, with a URL fallback. */
export default function ImageUploader({ value, onChange, label = "image" }: { value?: string; onChange: (url: string) => void; label?: string }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function upload(file?: File) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) return setError("Choose a JPG, PNG, WEBP or GIF image");
    setUploading(true);
    setError("");
    try {
      onChange(await uploadImage(file));
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    upload(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="cms-uploader">
      <div
        className={`cms-dropzone ${over ? "is-over" : ""} ${value ? "has-image" : ""}`}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        onClick={() => !value && input.current?.click()}
        role={value ? undefined : "button"}
        tabIndex={value ? undefined : 0}
        onKeyDown={e => !value && (e.key === "Enter" || e.key === " ") && input.current?.click()}
      >
        {value ? (
          <>
            <img src={value} alt="" />
            <div className="cms-dropzone-actions">
              <button type="button" onClick={() => input.current?.click()} disabled={uploading}>
                <Icon name="upload" size={15} /> {uploading ? "Uploading…" : "Replace"}
              </button>
              <button type="button" onClick={() => onChange("")} className="danger">
                <Icon name="trash" size={15} /> Remove
              </button>
            </div>
          </>
        ) : (
          <div className="cms-dropzone-empty">
            <Icon name="image" size={26} />
            <strong>{uploading ? "Uploading…" : `Drop ${/^[aeiou]/i.test(label) ? "an" : "a"} ${label} here or click to upload`}</strong>
            <small>JPG, PNG, WEBP or GIF · up to 8 MB · stored on ImgBB</small>
          </div>
        )}
        {uploading && <div className="cms-dropzone-progress" />}
      </div>
      <input ref={input} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e => upload(e.target.files?.[0])} />
      <input className="cms-input cms-input--sm" value={value || ""} onChange={e => onChange(e.target.value)} placeholder="…or paste an image URL" />
      {error && <small className="cms-error">{error}</small>}
    </div>
  );
}
