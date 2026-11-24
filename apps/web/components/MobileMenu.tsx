"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type MenuLink = { href: string; label: string };

/** Hamburger button (visible on small screens) that opens a full-screen menu. */
export default function MobileMenu({ links, email }: { links: MenuLink[]; email?: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("menu-open", open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      root.classList.remove("menu-open");
    };
  }, [open]);

  // Close if the screen grows past the mobile breakpoint.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 901px)");
    const onChange = () => mq.matches && setOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`menu-toggle ${open ? "is-open" : ""}`}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen(v => !v)}
      >
        <span />
        <span />
      </button>

      {mounted && createPortal(
      <div id="mobile-menu" ref={panelRef} className={`mobile-menu ${open ? "is-open" : ""}`} aria-hidden={!open} inert={!open}>
        <nav aria-label="Mobile">
          <ol>
            {links.map((link, i) => (
              <li key={link.href} style={{ transitionDelay: open ? `${120 + i * 60}ms` : "0ms" }}>
                <a href={link.href} onClick={() => setOpen(false)}>
                  <small>{String(i + 1).padStart(2, "0")}</small>
                  <span>{link.label}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
        {email && (
          <div className="mobile-menu-foot" style={{ transitionDelay: open ? `${160 + links.length * 60}ms` : "0ms" }}>
            <small>{"// Get in touch"}</small>
            <a href={`mailto:${email}`}>{email}</a>
          </div>
        )}
      </div>,
      document.body
      )}
    </>
  );
}
