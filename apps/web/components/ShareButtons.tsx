"use client";

import { useEffect, useState } from "react";

type Props = { url: string; title: string; text?: string; compact?: boolean };

/** Share links for social networks + copy link + the device's native share sheet. */
export default function ShareButtons({ url, title, text, compact }: Props) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links = [
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { label: "X", href: `https://twitter.com/intent/tweet?url=${u}&text=${t}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}` },
    { label: "Telegram", href: `https://t.me/share/url?url=${u}&text=${t}` },
    { label: "Email", href: `mailto:?subject=${t}&body=${encodeURIComponent(`${text ? `${text}\n\n` : ""}${url}`)}` }
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, text, url });
    } catch {
      /* user cancelled */
    }
  }

  return (
    <div className={`share ${compact ? "share--compact" : ""}`} aria-label="Share this post">
      {!compact && <small>Share</small>}
      <div className="share-buttons">
        {canNativeShare && (
          <button type="button" onClick={nativeShare} className="share-primary">Share ↗</button>
        )}
        {links.map(link => (
          <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer">
            {link.label}
          </a>
        ))}
        <button type="button" onClick={copy} aria-live="polite">
          {copied ? "Copied ✓" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
