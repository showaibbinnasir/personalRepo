"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Silver robotic-hand cursor (mouse / trackpad only; touch keeps the normal behaviour).
 *
 * - The index fingertip is the exact click point; the hand pivots around it, so
 *   tilting never makes clicks less precise.
 * - Tilts with horizontal speed and settles back, like a servo with a bit of lag.
 * - Over links and buttons the finger extends and the palm light glows.
 * - On click the finger presses in and a small ring pulses out.
 * - Over text fields the normal text cursor comes back, so typing feels normal.
 */

const HIDDEN_ON = ["/dashboard"];
const INTERACTIVE =
  'a[href], button, [role="button"], [role="tab"], label, summary, select, input[type="range"], input[type="checkbox"], input[type="radio"], input[type="submit"], input[type="button"], [data-cursor="hover"]';
const TEXT_FIELD =
  'input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]), textarea, [contenteditable="true"]';

// Fingertip position inside the rendered SVG (px). Keep in sync with the SVG below.
const TIP_X = 11.4;
const TIP_Y = 1;
const BASE_TILT = -20;

export default function RobotCursor() {
  const pathname = usePathname() || "/";
  const hidden = HIDDEN_ON.some(p => pathname === p || pathname.startsWith(`${p}/`));
  const rootRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<HTMLDivElement>(null);
  const ringsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hidden) return;
    const root = rootRef.current;
    const hand = handRef.current;
    const rings = ringsRef.current;
    if (!root || !hand || !rings) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const html = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let x = -100;
    let y = -100;
    let lastX = 0;
    let lastT = 0;
    let vx = 0;
    let tilt = BASE_TILT;
    let raf = 0;
    let active = false;

    const place = () => {
      root.style.transform = `translate3d(${x - TIP_X}px, ${y - TIP_Y}px, 0)`;
    };

    const frame = () => {
      raf = 0;
      // Velocity decays so the hand eases back upright when the mouse stops.
      vx *= 0.82;
      const target = BASE_TILT + Math.max(-16, Math.min(16, vx * 0.9));
      tilt += (target - tilt) * 0.2;
      hand.style.transform = `rotate(${tilt.toFixed(2)}deg)`;
      if (Math.abs(target - tilt) > 0.05 || Math.abs(vx) > 0.05) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf && !reduceMotion) raf = requestAnimationFrame(frame);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (!active) {
        active = true;
        html.classList.add("robot-cursor-on");
      }
      const now = e.timeStamp;
      const dt = Math.max(8, now - lastT);
      if (lastT) vx = vx * 0.5 + ((e.clientX - lastX) / dt) * 16 * 0.5;
      lastX = e.clientX;
      lastT = now;
      x = e.clientX;
      y = e.clientY;
      place();
      root.dataset.visible = "true";
      kick();
    };

    const onOver = (e: PointerEvent) => {
      const el = e.target instanceof Element ? e.target : null;
      const text = !!el?.closest(TEXT_FIELD);
      root.dataset.text = text ? "true" : "false";
      root.dataset.hover = !text && el?.closest(INTERACTIVE) ? "true" : "false";
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      root.dataset.press = "true";
      if (reduceMotion) return;
      const ring = document.createElement("span");
      ring.className = "robot-cursor-ring";
      ring.style.left = `${x}px`;
      ring.style.top = `${y}px`;
      rings.appendChild(ring);
      window.setTimeout(() => ring.remove(), 650);
    };
    const onUp = () => {
      root.dataset.press = "false";
    };
    const onLeave = () => {
      root.dataset.visible = "false";
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("blur", onUp);
    html.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("blur", onUp);
      html.removeEventListener("pointerleave", onLeave);
      html.classList.remove("robot-cursor-on");
    };
  }, [hidden]);

  if (hidden) return null;

  return (
    <>
      <div ref={ringsRef} className="robot-cursor-rings" aria-hidden="true" />
      <div ref={rootRef} className="robot-cursor" aria-hidden="true" data-visible="false">
        <div ref={handRef} className="robot-cursor-hand" style={{ transformOrigin: `${TIP_X}px ${TIP_Y}px`, transform: `rotate(${BASE_TILT}deg)` }}>
          <svg width="37.4" height="50" viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="rc-metal" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#5f656e" />
                <stop offset=".28" stopColor="#f6f8fa" />
                <stop offset=".5" stopColor="#b4bac2" />
                <stop offset=".7" stopColor="#ffffff" />
                <stop offset="1" stopColor="#7c838c" />
              </linearGradient>
              <linearGradient id="rc-metal-v" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ffffff" />
                <stop offset=".45" stopColor="#c3c9d0" />
                <stop offset="1" stopColor="#6c727b" />
              </linearGradient>
              <linearGradient id="rc-shine" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#fff" stopOpacity=".9" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
              <radialGradient id="rc-led" cx=".5" cy=".5" r=".5">
                <stop offset="0" stopColor="#ffd0c8" />
                <stop offset=".45" stopColor="var(--accent, #a71919)" />
                <stop offset="1" stopColor="#3a0606" />
              </radialGradient>
            </defs>
            <g stroke="#40454d" strokeWidth=".9" strokeLinejoin="round">
              {/* Wrist */}
              <rect x="19" y="63" width="26" height="15" rx="3" fill="url(#rc-metal)" />
              <path d="M21 68h22M21 72h22" stroke="#6b717a" strokeWidth=".8" />
              {/* Thumb */}
              <g className="rc-thumb">
                <rect x="4" y="40" width="9" height="17" rx="4.5" fill="url(#rc-metal)" transform="rotate(-28 8.5 48.5)" />
              </g>
              {/* Curled fingers */}
              <g className="rc-fingers">
                <rect x="24" y="29" width="8.5" height="12" rx="4" fill="url(#rc-metal-v)" />
                <rect x="33.5" y="30.5" width="8.5" height="11" rx="4" fill="url(#rc-metal-v)" />
                <rect x="43" y="33" width="8" height="10" rx="4" fill="url(#rc-metal-v)" />
              </g>
              {/* Palm */}
              <rect x="10" y="34" width="43" height="32" rx="9" fill="url(#rc-metal)" />
              <path d="M16 45h31" stroke="#8a9099" strokeWidth=".8" fill="none" />
              <circle cx="16.5" cy="58.5" r="1.6" fill="#8d949c" />
              <circle cx="46.5" cy="58.5" r="1.6" fill="#8d949c" />
              <circle className="rc-led" cx="38" cy="54" r="4" fill="url(#rc-led)" stroke="#2b2f35" />
              {/* Index finger (pointer): three segments with joints */}
              <g className="rc-index">
                <rect x="13.5" y="24" width="9.5" height="14" rx="3.5" fill="url(#rc-metal)" />
                <circle cx="18.25" cy="23.5" r="3.2" fill="#9aa1a9" />
                <rect x="14" y="12.5" width="8.5" height="11.5" rx="3.2" fill="url(#rc-metal)" />
                <circle cx="18.25" cy="12.4" r="2.9" fill="#9aa1a9" />
                <path d="M14.4 12.5V5.5a3.85 3.85 0 0 1 7.7 0v7z" fill="url(#rc-metal)" />
              </g>
            </g>
            {/* Specular highlights */}
            <path d="M15.6 6v30" stroke="url(#rc-shine)" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M14 38.5c4-2.6 22-2.6 30 0" stroke="#fff" strokeOpacity=".75" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </>
  );
}
