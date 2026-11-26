"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * "Share to story": previews the post's 1080×1920 story card, then shares it as an
 * image through the phone's share sheet (Instagram, Facebook, WhatsApp stories…),
 * or downloads it on computers. The post link is copied so it can be added with
 * the story app's link sticker (websites can't attach a link to a story directly).
 */
type StoryShareProps = {
  slug: string;
  url: string;
  title: string;
  /** Path of the 1080×1920 story image. Defaults to the blog post's. */
  imagePath?: string;
  /** What's being shared, used in the wording ("post", "project"). */
  noun?: string;
};

export default function StoryShare({ slug, url, title, imagePath, noun = "post" }: StoryShareProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [message, setMessage] = useState("");
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const objectUrl = useRef<string | null>(null);
  const imageUrl = imagePath || `/blog/${encodeURIComponent(slug)}/story`;

  useEffect(() => setMounted(true), []);

  // Fetch the image as soon as the preview opens, so "Share" can run instantly
  // (phones only allow the share sheet right after a tap).
  useEffect(() => {
    if (!open || file) return;
    let cancelled = false;
    setStatus("loading");
    fetch(imageUrl)
      .then(r => {
        if (!r.ok) throw new Error();
        return r.blob();
      })
      .then(blob => {
        if (cancelled) return;
        const f = new File([blob], `${slug}-story.png`, { type: "image/png" });
        setFile(f);
        setCanShareFiles(typeof navigator.canShare === "function" && navigator.canShare({ files: [f] }));
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, [open, file, imageUrl, slug]);

  const close = useCallback(() => {
    setOpen(false);
    setMessage("");
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    document.documentElement.classList.add("menu-open");
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("menu-open");
    };
  }, [open, close]);

  useEffect(() => () => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
  }, []);

  async function copyLink(silent = false) {
    try {
      await navigator.clipboard.writeText(url);
      if (!silent) setMessage("Link copied. Add it to your story with the Link sticker.");
      return true;
    } catch {
      if (!silent) setMessage(url);
      return false;
    }
  }

  async function share() {
    if (!file) return;
    // Copy the link first so it's ready to paste into the story's link sticker.
    const copied = await copyLink(true);
    try {
      await navigator.share({ files: [file], title });
      setMessage(copied ? `Shared! The ${noun} link is copied — add it with the Link sticker.` : "Shared!");
    } catch (e: any) {
      if (e?.name !== "AbortError") setMessage("Sharing didn't work here. Download the image instead.");
    }
  }

  function download() {
    if (!file) return;
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = objectUrl.current;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setMessage("Image saved. Post it as a story, then add the link with the Link sticker.");
  }

  return (
    <>
      <button ref={triggerRef} type="button" className="story-trigger" onClick={() => setOpen(true)}>
        <span className="story-trigger-ring" aria-hidden="true" />
        Share to story
      </button>

      {mounted && open &&
        createPortal(
          <div className="story-modal" role="dialog" aria-modal="true" aria-label={`Share this ${noun} to your story`} onClick={e => e.target === e.currentTarget && close()}>
            <div className="story-panel">
              <button ref={closeRef} type="button" className="story-close" onClick={close} aria-label="Close">×</button>

              {/* On phones only this part scrolls, so the close button always stays in view. */}
              <div className="story-body">
              <div className="story-preview">
                {status === "error" ? (
                  <p>Couldn&apos;t create the story image. Please try again.</p>
                ) : (
                  <img src={imageUrl} alt={`Story card for “${title}”`} />
                )}
                {status === "loading" && <span className="story-loading">Preparing image…</span>}
              </div>

              <div className="story-side">
                <small>{"// Share to story"}</small>
                <h3>Share this {noun} to your story</h3>
                <p>
                  {canShareFiles
                    ? "Tap Share and pick Instagram, Facebook or WhatsApp, then choose Story."
                    : "Download the image and post it as a story from your phone."}
                </p>

                <div className="story-actions">
                  {canShareFiles && (
                    <button type="button" className="story-btn story-btn--primary" onClick={share} disabled={status !== "ready"}>
                      Share image
                    </button>
                  )}
                  <button type="button" className={`story-btn ${canShareFiles ? "" : "story-btn--primary"}`} onClick={download} disabled={status !== "ready"}>
                    Download image
                  </button>
                  <button type="button" className="story-btn" onClick={() => copyLink()}>
                    Copy {noun} link
                  </button>
                </div>

                <p className="story-tip">
                  Stories can&apos;t carry a link automatically. Add one with Instagram&apos;s <strong>Link</strong> sticker and paste the {noun} link.
                </p>
                {message && <p className="story-message" role="status">{message}</p>}
              </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
