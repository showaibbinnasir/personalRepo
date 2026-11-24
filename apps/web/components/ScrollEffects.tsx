"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Site-wide scroll motion:
 *  - reveals content as it enters the viewport (staggered, eased)
 *  - reading/scroll progress bar
 *  - subtle parallax on elements marked data-parallax="0.1"
 *  - hides the top bar while scrolling down, shows it on scroll up
 *
 * Content that is already on screen when the page loads is never hidden, so there
 * is no flash, and nothing is hidden at all without JavaScript or when the visitor
 * prefers reduced motion.
 */
const REVEAL_SELECTOR = [
  "[data-reveal]",
  ".section-kicker",
  ".section h2",
  ".section .lead",
  ".section .mini-links",
  ".row",
  ".pcard",
  ".skills-grid article",
  ".language-list > div",
  ".credential",
  ".large-cta",
  ".bcard",
  ".projects-navigation",
  ".footer > *",
  ".post-header > *",
  ".post-body > *",
  ".post-footer > *",
  ".blog-index-head > *",
  ".blog-tags",
  ".project-detail > *",
  ".project-article > *",
  ".empty-public"
].join(",");

const EXCLUDE = ".chat-panel, .cms, .login-page";

export default function ScrollEffects() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname?.startsWith("/dashboard")) return;

    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cleanups: Array<() => void> = [];

    /* ---------- Reveal on scroll ---------- */
    if (!reduceMotion && "IntersectionObserver" in window) {
      root.classList.add("reveal-ready");

      const finish = (el: HTMLElement) => {
        el.classList.add("reveal-done");
        el.style.removeProperty("transition-delay");
      };

      const io = new IntersectionObserver(
        entries => {
          const visible = entries
            .filter(e => e.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
          visible.forEach((entry, i) => {
            const el = entry.target as HTMLElement;
            io.unobserve(el);
            el.style.transitionDelay = `${Math.min(i * 85, 510)}ms`;
            el.classList.add("is-visible");
            const done = () => finish(el);
            el.addEventListener("transitionend", done, { once: true });
            window.setTimeout(done, 1600 + i * 85);
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
      );

      const register = (scope: ParentNode) => {
        const nodes = scope instanceof Element && scope.matches(REVEAL_SELECTOR) ? [scope, ...scope.querySelectorAll(REVEAL_SELECTOR)] : [...scope.querySelectorAll(REVEAL_SELECTOR)];
        const vh = window.innerHeight;
        nodes.forEach(node => {
          const el = node as HTMLElement;
          if (el.classList.contains("reveal-item") || el.closest(EXCLUDE)) return;
          const rect = el.getBoundingClientRect();
          el.classList.add("reveal-item");
          if (rect.top < vh * 0.96 && rect.bottom > 0) {
            // Already on screen at load: show immediately, no animation, no flash.
            el.classList.add("is-visible", "reveal-done");
          } else {
            io.observe(el);
          }
        });
      };

      register(document.body);

      // Content rendered later (pagination, "view more", client navigation).
      const mo = new MutationObserver(mutations => {
        for (const m of mutations) m.addedNodes.forEach(n => n instanceof Element && register(n));
      });
      mo.observe(document.body, { childList: true, subtree: true });

      cleanups.push(() => {
        io.disconnect();
        mo.disconnect();
        root.classList.remove("reveal-ready");
      });
    }

    /* ---------- Card spotlight: a soft glow that follows the pointer ---------- */
    if (!reduceMotion) {
      const onMove = (e: PointerEvent) => {
        if (e.pointerType === "touch") return;
        const card = (e.target as Element | null)?.closest?.<HTMLElement>(".pcard, .bcard");
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      };
      document.addEventListener("pointermove", onMove, { passive: true });
      cleanups.push(() => document.removeEventListener("pointermove", onMove));
    }

    /* ---------- Progress bar, parallax, header ---------- */
    const bar = document.querySelector<HTMLElement>(".scroll-progress");
    const parallax = reduceMotion ? [] : [...document.querySelectorAll<HTMLElement>("[data-parallax]")];
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const max = root.scrollHeight - window.innerHeight;
      if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;

      const vh = window.innerHeight;
      for (const el of parallax) {
        const rect = el.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > vh + 200) continue;
        const speed = Number(el.dataset.parallax) || 0.1;
        const offset = (rect.top + rect.height / 2 - vh / 2) * -speed;
        el.style.setProperty("--parallax", `${offset.toFixed(1)}px`);
      }

      if (Math.abs(y - lastY) > 6) {
        root.dataset.scrollDir = y > lastY && y > 140 ? "down" : "up";
        lastY = y;
      }
      root.dataset.scrolled = y > 20 ? "true" : "false";
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    cleanups.push(() => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      delete root.dataset.scrollDir;
    });

    return () => cleanups.forEach(fn => fn());
  }, [pathname]);

  if (pathname?.startsWith("/dashboard")) return null;
  return <div className="scroll-progress" aria-hidden="true" />;
}
