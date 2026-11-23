"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Interactive "deep space" backdrop for the public site.
 *
 *  - CSS layers: base colour (the CMS background colour) + slowly drifting nebula
 *    clouds tinted with the CMS accent colour, + a soft light that follows the cursor.
 *  - Canvas layer: three depths of twinkling stars with parallax on pointer move and
 *    scroll; stars near the cursor brighten and drift aside, and faint constellation
 *    lines link the closest ones to the cursor. Occasional shooting stars.
 *
 * Pauses while the tab is hidden, uses fewer stars on small screens, and renders a
 * single still frame for visitors who prefer reduced motion.
 */

type Star = {
  x: number; // base position in CSS pixels
  y: number;
  z: number; // depth 0.25 (far) … 1 (near)
  r: number;
  phase: number;
  speed: number;
  hue: string;
  dx: number; // displacement from the cursor push
  dy: number;
};

type Meteor = { x: number; y: number; vx: number; vy: number; life: number; max: number };

const HIDDEN_ON = ["/dashboard", "/cv"];

export default function SpaceBackground() {
  const pathname = usePathname() || "/";
  const hidden = HIDDEN_ON.some(p => pathname.startsWith(p));
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hidden) return;
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const light = lightRef.current;
    if (!root || !canvas || !light) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Take colours from the page's theme (set from the CMS on <main>).
    const themed = document.querySelector<HTMLElement>("main") || document.documentElement;
    const cs = getComputedStyle(themed);
    const accent = cs.getPropertyValue("--accent").trim() || "#a71919";
    const bg = cs.getPropertyValue("--bg").trim() || "#080606";
    root.style.setProperty("--space-accent", accent);
    root.style.setProperty("--space-bg", bg);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let stars: Star[] = [];
    const meteors: Meteor[] = [];

    const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false };
    const parallax = { x: 0, y: 0, tx: 0, ty: 0 };

    const STAR_COLORS = ["255,255,255", "255,255,255", "214,226,255", "255,236,214", "200,214,255"];

    function build() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const density = width < 700 ? 5200 : 3400;
      const count = Math.min(520, Math.round((width * height) / density));
      // Spread stars over an area larger than the screen so parallax never shows an edge.
      const padX = width * 0.1;
      const padY = height * 0.25;
      stars = Array.from({ length: count }, () => {
        const z = Math.random() < 0.6 ? 0.25 + Math.random() * 0.25 : Math.random() < 0.75 ? 0.5 + Math.random() * 0.3 : 0.8 + Math.random() * 0.2;
        return {
          x: -padX + Math.random() * (width + padX * 2),
          y: -padY + Math.random() * (height + padY * 2),
          z,
          r: 0.35 + z * 1.15 * Math.random() + (z > 0.85 ? 0.4 : 0),
          phase: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 1.6,
          hue: STAR_COLORS[(Math.random() * STAR_COLORS.length) | 0],
          dx: 0,
          dy: 0
        };
      });
    }

    function spawnMeteor() {
      const fromLeft = Math.random() < 0.5;
      const speed = 9 + Math.random() * 6;
      const angle = (fromLeft ? 0.35 : Math.PI - 0.35) + (Math.random() - 0.5) * 0.25;
      meteors.push({
        x: fromLeft ? Math.random() * width * 0.6 : width * 0.4 + Math.random() * width * 0.6,
        y: Math.random() * height * 0.4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        max: 55 + Math.random() * 30
      });
    }

    let last = performance.now();
    let nextMeteor = last + 4000 + Math.random() * 6000;
    let raf = 0;

    function frame(now: number) {
      const dt = Math.min(48, now - last) / 16.67; // ~1 at 60 fps
      last = now;
      const t = now / 1000;
      const scrollY = window.scrollY;

      // Ease pointer and parallax towards their targets.
      pointer.x += (pointer.tx - pointer.x) * Math.min(1, 0.12 * dt);
      pointer.y += (pointer.ty - pointer.y) * Math.min(1, 0.12 * dt);
      parallax.x += (parallax.tx - parallax.x) * Math.min(1, 0.05 * dt);
      parallax.y += (parallax.ty - parallax.y) * Math.min(1, 0.05 * dt);

      light!.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;

      ctx!.clearRect(0, 0, width, height);
      ctx!.globalCompositeOperation = "lighter";

      const R = 190; // cursor influence radius
      const near: { x: number; y: number; d: number }[] = [];

      for (const s of stars) {
        // Slow drift, parallax from pointer, and depth-based scroll parallax.
        const drift = (t * 2.2 * s.z) % (width * 1.2);
        let x = s.x + drift - parallax.x * s.z * 26;
        let y = s.y - parallax.y * s.z * 18 - scrollY * s.z * 0.12;
        const spanX = width * 1.2;
        const spanY = height * 1.5;
        x = ((((x + width * 0.1) % spanX) + spanX) % spanX) - width * 0.1;
        y = ((((y + height * 0.25) % spanY) + spanY) % spanY) - height * 0.25;

        // Cursor: push nearby stars gently away; spring back otherwise.
        let glow = 0;
        if (pointer.active) {
          const ddx = x + s.dx - pointer.x;
          const ddy = y + s.dy - pointer.y;
          const d = Math.hypot(ddx, ddy);
          if (d < R && d > 0.01) {
            const f = (1 - d / R) ** 2;
            s.dx += (ddx / d) * f * 2.2 * s.z * dt;
            s.dy += (ddy / d) * f * 2.2 * s.z * dt;
            glow = f;
            if (s.z > 0.35 && near.length < 48) near.push({ x: x + s.dx, y: y + s.dy, d });
          }
        }
        s.dx *= 1 - Math.min(1, 0.06 * dt);
        s.dy *= 1 - Math.min(1, 0.06 * dt);

        const px = x + s.dx;
        const py = y + s.dy;
        if (px < -4 || px > width + 4 || py < -4 || py > height + 4) continue;

        const twinkle = reduceMotion ? 0.85 : 0.55 + 0.45 * Math.sin(t * s.speed + s.phase);
        const alpha = Math.min(1, (0.25 + s.z * 0.6) * twinkle + glow * 0.9);
        const r = s.r * (1 + glow * 0.9);

        ctx!.fillStyle = `rgba(${s.hue},${alpha})`;
        ctx!.beginPath();
        ctx!.arc(px, py, r, 0, Math.PI * 2);
        ctx!.fill();

        // Soft halo on bright, near stars.
        if (s.z > 0.85 || glow > 0.35) {
          const halo = ctx!.createRadialGradient(px, py, 0, px, py, r * 6);
          halo.addColorStop(0, `rgba(${s.hue},${0.18 * alpha + glow * 0.25})`);
          halo.addColorStop(1, `rgba(${s.hue},0)`);
          ctx!.fillStyle = halo;
          ctx!.beginPath();
          ctx!.arc(px, py, r * 6, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      // Constellation lines from the cursor to its closest stars, and between them.
      if (pointer.active && near.length) {
        near.sort((a, b) => a.d - b.d);
        const pts = near.slice(0, 8);
        ctx!.lineWidth = 0.75;
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i];
          const o = 0.6 * (1 - a.d / R);
          ctx!.strokeStyle = `rgba(200,214,255,${o})`;
          ctx!.beginPath();
          ctx!.moveTo(pointer.x, pointer.y);
          ctx!.lineTo(a.x, a.y);
          ctx!.stroke();
          const b = pts[i + 1];
          if (b) {
            ctx!.strokeStyle = `rgba(200,214,255,${o * 0.6})`;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.stroke();
          }
        }
      }

      // Shooting stars.
      if (!reduceMotion && now > nextMeteor) {
        spawnMeteor();
        nextMeteor = now + 7000 + Math.random() * 9000;
      }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.life += dt;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        const p = m.life / m.max;
        if (p >= 1) {
          meteors.splice(i, 1);
          continue;
        }
        const fade = Math.sin(p * Math.PI);
        const tail = ctx!.createLinearGradient(m.x, m.y, m.x - m.vx * 9, m.y - m.vy * 9);
        tail.addColorStop(0, `rgba(255,255,255,${0.85 * fade})`);
        tail.addColorStop(1, "rgba(255,255,255,0)");
        ctx!.strokeStyle = tail;
        ctx!.lineWidth = 1.4;
        ctx!.beginPath();
        ctx!.moveTo(m.x, m.y);
        ctx!.lineTo(m.x - m.vx * 9, m.y - m.vy * 9);
        ctx!.stroke();
      }

      ctx!.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(frame);
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      pointer.tx = e.clientX;
      pointer.ty = e.clientY;
      if (!pointer.active) {
        pointer.x = e.clientX;
        pointer.y = e.clientY;
        pointer.active = true;
        root.classList.add("has-pointer");
      }
      parallax.tx = e.clientX / width - 0.5;
      parallax.ty = e.clientY / height - 0.5;
    };
    const onLeave = () => {
      pointer.active = false;
      pointer.tx = pointer.ty = -9999;
      root.classList.remove("has-pointer");
      parallax.tx = parallax.ty = 0;
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduceMotion) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        build();
        if (reduceMotion) frame(performance.now());
      }, 150);
    };

    build();
    if (reduceMotion) {
      frame(performance.now());
      cancelAnimationFrame(raf);
    } else {
      raf = requestAnimationFrame(frame);
      // Mouse/pen only (checked per event), so touch scrolling never triggers it.
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
      document.addEventListener("visibilitychange", onVisibility);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
    };
  }, [hidden, pathname]);

  if (hidden) return null;

  return (
    <div className="space" ref={rootRef} aria-hidden="true">
      <div className="space-nebula space-nebula--a" />
      <div className="space-nebula space-nebula--b" />
      <div className="space-nebula space-nebula--c" />
      <canvas className="space-stars" ref={canvasRef} />
      <div className="space-light" ref={lightRef} />
      <div className="space-vignette" />
    </div>
  );
}
