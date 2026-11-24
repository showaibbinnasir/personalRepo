"use client";

import { useEffect, useRef } from "react";

/**
 * Interactive 3-joint robot arm that follows the pointer using inverse kinematics, drawn as a HUD-style instrument. When nobody is steering it, it switches to
 * "autonomous" mode and traces a smooth path on its own. Click / tap toggles the gripper.
 *
 * Only animates while on screen and while the tab is visible; reduced-motion users get
 * a responsive but un-eased arm with no idle animation.
 */

type Pt = { x: number; y: number };

const deg = (r: number) => Math.round((r * 180) / Math.PI);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export default function RobotArmLab() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hud = {
    mode: useRef<HTMLSpanElement>(null),
    j1: useRef<HTMLSpanElement>(null),
    j2: useRef<HTMLSpanElement>(null),
    j3: useRef<HTMLSpanElement>(null),
    ee: useRef<HTMLSpanElement>(null),
    reach: useRef<HTMLSpanElement>(null),
    grip: useRef<HTMLSpanElement>(null)
  };

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !canvas || !ctx) return;

    const styles = getComputedStyle(wrap);
    // Normalise any CSS colour to #rrggbb so alpha suffixes like `${accent}66` work.
    ctx.fillStyle = "#a71919";
    ctx.fillStyle = styles.getPropertyValue("--accent").trim() || "#a71919";
    const accent = /^#[0-9a-f]{6}$/i.test(String(ctx.fillStyle)) ? String(ctx.fillStyle) : "#a71919";
    const fg = styles.getPropertyValue("--fg").trim() || "#f4f1ec";
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0, h = 0, dpr = 1;
    let base: Pt = { x: 0, y: 0 };
    let lengths = [0, 0, 0];
    let reach = 0;
    let joints: Pt[] = [];
    const target: Pt = { x: 0, y: 0 };
    const goal: Pt = { x: 0, y: 0 };
    const trail: Pt[] = [];
    const ripples: { x: number; y: number; t: number }[] = [];
    let gripClosed = false;
    let grip = 1; // 1 open … 0 closed
    let lastInput = -Infinity;
    let raf = 0;
    let running = false;
    let visible = false;
    let hudTick = 0;

    function layout() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = wrap!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      base = { x: w * (w < 640 ? 0.5 : 0.56), y: h - 64 };
      reach = Math.min(h - 110, w * (w < 640 ? 0.44 : 0.36));
      lengths = [reach * 0.42, reach * 0.36, reach * 0.22];
      if (!joints.length) {
        // Start in a relaxed pose.
        const a = [-Math.PI / 2 - 0.5, 1.3, 0.6];
        joints = [{ ...base }];
        let ang = 0;
        for (let i = 0; i < 3; i++) {
          ang += a[i];
          const p = joints[i];
          joints.push({ x: p.x + Math.cos(ang) * lengths[i], y: p.y + Math.sin(ang) * lengths[i] });
        }
        target.x = goal.x = joints[3].x;
        target.y = goal.y = joints[3].y;
      } else {
        // Rescale the current pose to the new size.
        joints[0] = { ...base };
        for (let i = 0; i < 3; i++) {
          const dx = joints[i + 1].x - joints[i].x, dy = joints[i + 1].y - joints[i].y;
          const d = Math.hypot(dx, dy) || 1;
          joints[i + 1] = { x: joints[i].x + (dx / d) * lengths[i], y: joints[i].y + (dy / d) * lengths[i] };
        }
      }
    }

    /**
     * Inverse kinematics with the preferences of a real pick-and-place arm:
     * the gripper points outward and slightly down, and the elbow stays up.
     * The wrist point is placed one gripper-length back from the target, then the
     * shoulder/elbow pair is solved exactly (law of cosines) with elbow-up chosen.
     */
    function solve(t: Pt) {
      const [L1, L2, L3] = lengths;
      const dx = t.x - base.x, dy = t.y - base.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist > L1 + L2 + L3 - 0.5) {
        // Out of reach: stretch towards the target.
        const ang = Math.atan2(dy, dx);
        joints[0] = { ...base };
        for (let i = 0; i < 3; i++) joints[i + 1] = { x: joints[i].x + Math.cos(ang) * lengths[i], y: joints[i].y + Math.sin(ang) * lengths[i] };
        return false;
      }
      // Gripper direction: outward from the base, tilted downward.
      let ux = dx / dist, uy = dy / dist + 0.6;
      const ul = Math.hypot(ux, uy) || 1;
      ux /= ul;
      uy /= ul;
      let wx = t.x - ux * L3, wy = t.y - uy * L3;
      let d = Math.hypot(wx - base.x, wy - base.y);
      // If the wrist point is unreachable that way, aim the gripper straight at the target instead.
      if (d > L1 + L2 - 0.5 || d < Math.abs(L1 - L2) + 0.5) {
        ux = dx / dist;
        uy = dy / dist;
        wx = t.x - ux * L3;
        wy = t.y - uy * L3;
        d = Math.hypot(wx - base.x, wy - base.y);
      }
      d = Math.max(Math.abs(L1 - L2) + 0.5, Math.min(L1 + L2 - 0.5, d));
      const a = Math.atan2(wy - base.y, wx - base.x);
      const alpha = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
      // Two possible elbows; keep the higher one (smaller y on screen).
      const e1 = { x: base.x + Math.cos(a - alpha) * L1, y: base.y + Math.sin(a - alpha) * L1 };
      const e2 = { x: base.x + Math.cos(a + alpha) * L1, y: base.y + Math.sin(a + alpha) * L1 };
      const elbow = e1.y <= e2.y ? e1 : e2;
      const wa = Math.atan2(wy - elbow.y, wx - elbow.x);
      const wrist = { x: elbow.x + Math.cos(wa) * L2, y: elbow.y + Math.sin(wa) * L2 };
      const ga = Math.atan2(t.y - wrist.y, t.x - wrist.x);
      joints[0] = { ...base };
      joints[1] = elbow;
      joints[2] = wrist;
      joints[3] = { x: wrist.x + Math.cos(ga) * L3, y: wrist.y + Math.sin(ga) * L3 };
      return true;
    }

    function setGoalFromEvent(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      goal.x = e.clientX - rect.left;
      goal.y = Math.min(e.clientY - rect.top, base.y - 12);
      // A tap holds its target a little longer than a hovering mouse.
      lastInput = performance.now() + (e.pointerType === "touch" ? 3500 : 0);
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return; // touch uses tap, so the page still scrolls
      setGoalFromEvent(e);
      if (reduceMotion) frame(performance.now());
    };
    const onDown = (e: PointerEvent) => {
      setGoalFromEvent(e);
      if (e.pointerType !== "touch" || Math.hypot(goal.x - target.x, goal.y - target.y) < 30) gripClosed = !gripClosed;
      ripples.push({ x: goal.x, y: goal.y, t: 0 });
      if (reduceMotion) {
        grip = gripClosed ? 0 : 1;
        frame(performance.now());
      }
    };

    function drawSegment(a: Pt, b: Pt, width: number) {
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const nx = Math.cos(ang - Math.PI / 2) * (width / 2), ny = Math.sin(ang - Math.PI / 2) * (width / 2);
      // Capsule body with a light-to-dark gradient across its width, like brushed metal.
      const grad = ctx!.createLinearGradient(a.x + nx, a.y + ny, a.x - nx, a.y - ny);
      grad.addColorStop(0, "#5b5363");
      grad.addColorStop(0.35, "#3a3341");
      grad.addColorStop(1, "#1c1821");
      ctx!.fillStyle = grad;
      ctx!.strokeStyle = "rgba(244,241,236,0.28)";
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.moveTo(a.x + nx, a.y + ny);
      ctx!.lineTo(b.x + nx, b.y + ny);
      ctx!.arc(b.x, b.y, width / 2, ang - Math.PI / 2, ang + Math.PI / 2);
      ctx!.lineTo(a.x - nx, a.y - ny);
      ctx!.arc(a.x, a.y, width / 2, ang + Math.PI / 2, ang + Math.PI * 1.5);
      ctx!.closePath();
      ctx!.fill();
      ctx!.stroke();
      // Accent cable running along the link.
      ctx!.strokeStyle = `${accent}aa`;
      ctx!.lineWidth = 1.5;
      ctx!.setLineDash([4, 5]);
      ctx!.beginPath();
      ctx!.moveTo(a.x - nx * 0.45, a.y - ny * 0.45);
      ctx!.lineTo(b.x - nx * 0.45, b.y - ny * 0.45);
      ctx!.stroke();
      ctx!.setLineDash([]);
    }

    function drawJoint(p: Pt, r: number, glow: number) {
      const g = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3.2);
      g.addColorStop(0, `${accent}${Math.round(glow * 120).toString(16).padStart(2, "0")}`);
      g.addColorStop(1, `${accent}00`);
      ctx!.fillStyle = g;
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, r * 3.2, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.fillStyle = "#0d0a10";
      ctx!.strokeStyle = accent;
      ctx!.lineWidth = 2;
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.stroke();
      ctx!.fillStyle = fg;
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, r * 0.28, 0, Math.PI * 2);
      ctx!.fill();
    }

    function frame(now: number) {
      const idle = now - lastInput > 2600;
      if (idle && !reduceMotion) {
        // Autonomous mode: a smooth figure-of-eight inside the workspace.
        const t = now / 1000;
        goal.x = base.x + Math.sin(t * 0.55) * reach * 0.62;
        goal.y = base.y - reach * 0.55 + Math.sin(t * 1.1) * reach * 0.2;
      }
      const ease = reduceMotion ? 1 : 0.14;
      target.x = lerp(target.x, goal.x, ease);
      target.y = lerp(target.y, goal.y, ease);
      const inReach = solve(target);
      grip = reduceMotion ? (gripClosed ? 0 : 1) : lerp(grip, gripClosed ? 0 : 1, 0.2);

      const ee = joints[3];
      trail.push({ ...ee });
      if (trail.length > 42) trail.shift();

      ctx!.clearRect(0, 0, w, h);

      // Workspace arc with degree ticks (a protractor-like HUD).
      ctx!.save();
      ctx!.strokeStyle = "rgba(244,241,236,0.12)";
      ctx!.setLineDash([3, 7]);
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.arc(base.x, base.y, reach, Math.PI, Math.PI * 2);
      ctx!.stroke();
      ctx!.beginPath();
      ctx!.arc(base.x, base.y, reach * 0.5, Math.PI, Math.PI * 2);
      ctx!.stroke();
      ctx!.setLineDash([]);
      ctx!.font = "10px ui-monospace, Menlo, monospace";
      ctx!.fillStyle = "rgba(244,241,236,0.35)";
      ctx!.textAlign = "center";
      for (let a = 0; a <= 180; a += 15) {
        const r = (Math.PI * (180 + a)) / 180;
        const major = a % 45 === 0;
        const r1 = reach + 4, r2 = reach + (major ? 14 : 8);
        ctx!.strokeStyle = major ? "rgba(244,241,236,0.4)" : "rgba(244,241,236,0.18)";
        ctx!.beginPath();
        ctx!.moveTo(base.x + Math.cos(r) * r1, base.y + Math.sin(r) * r1);
        ctx!.lineTo(base.x + Math.cos(r) * r2, base.y + Math.sin(r) * r2);
        ctx!.stroke();
        if (major) ctx!.fillText(`${180 - a}°`, base.x + Math.cos(r) * (reach + 28), base.y + Math.sin(r) * (reach + 28) + 3);
      }
      ctx!.restore();

      // Floor line with ticks
      ctx!.strokeStyle = "rgba(244,241,236,0.18)";
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.moveTo(0, base.y + 22);
      ctx!.lineTo(w, base.y + 22);
      ctx!.stroke();
      for (let x = (base.x % 40); x < w; x += 40) {
        ctx!.beginPath();
        ctx!.moveTo(x, base.y + 22);
        ctx!.lineTo(x, base.y + 28);
        ctx!.stroke();
      }

      // End-effector trail
      for (let i = 1; i < trail.length; i++) {
        ctx!.strokeStyle = `${accent}${Math.round((i / trail.length) * 140).toString(16).padStart(2, "0")}`;
        ctx!.lineWidth = 1.5;
        ctx!.beginPath();
        ctx!.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx!.lineTo(trail[i].x, trail[i].y);
        ctx!.stroke();
      }

      // Guide beam from the gripper to the target.
      ctx!.strokeStyle = inReach ? "rgba(200,214,255,0.35)" : `${accent}aa`;
      ctx!.setLineDash([2, 5]);
      ctx!.beginPath();
      ctx!.moveTo(ee.x, ee.y);
      ctx!.lineTo(goal.x, goal.y);
      ctx!.stroke();
      ctx!.setLineDash([]);

      // Target reticle
      const spin = now / 900;
      ctx!.strokeStyle = inReach ? fg : accent;
      ctx!.lineWidth = 1.2;
      ctx!.beginPath();
      ctx!.arc(goal.x, goal.y, 11, spin, spin + Math.PI * 0.6);
      ctx!.stroke();
      ctx!.beginPath();
      ctx!.arc(goal.x, goal.y, 11, spin + Math.PI, spin + Math.PI * 1.6);
      ctx!.stroke();
      ctx!.beginPath();
      ctx!.moveTo(goal.x - 18, goal.y);
      ctx!.lineTo(goal.x - 6, goal.y);
      ctx!.moveTo(goal.x + 6, goal.y);
      ctx!.lineTo(goal.x + 18, goal.y);
      ctx!.moveTo(goal.x, goal.y - 18);
      ctx!.lineTo(goal.x, goal.y - 6);
      ctx!.moveTo(goal.x, goal.y + 6);
      ctx!.lineTo(goal.x, goal.y + 18);
      ctx!.stroke();
      if (!inReach) {
        ctx!.font = "10px ui-monospace, Menlo, monospace";
        ctx!.fillStyle = accent;
        ctx!.textAlign = "left";
        ctx!.fillText("OUT OF REACH", goal.x + 16, goal.y - 14);
      }

      // Click ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.t += 0.035;
        if (r.t >= 1) {
          ripples.splice(i, 1);
          continue;
        }
        ctx!.strokeStyle = `${accent}${Math.round((1 - r.t) * 255).toString(16).padStart(2, "0")}`;
        ctx!.lineWidth = 1.5;
        ctx!.beginPath();
        ctx!.arc(r.x, r.y, 10 + r.t * 46, 0, Math.PI * 2);
        ctx!.stroke();
      }

      // Base platform
      ctx!.fillStyle = "#151119";
      ctx!.strokeStyle = "rgba(244,241,236,0.18)";
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.moveTo(base.x - 46, base.y + 22);
      ctx!.lineTo(base.x - 30, base.y - 4);
      ctx!.lineTo(base.x + 30, base.y - 4);
      ctx!.lineTo(base.x + 46, base.y + 22);
      ctx!.closePath();
      ctx!.fill();
      ctx!.stroke();
      ctx!.fillStyle = accent;
      ctx!.shadowColor = accent;
      ctx!.shadowBlur = 12;
      ctx!.fillRect(base.x - 22, base.y + 10, 44, 2);
      ctx!.shadowBlur = 0;

      // Links
      const widths = [24, 19, 14];
      for (let i = 0; i < 3; i++) drawSegment(joints[i], joints[i + 1], widths[i]);

      // Gripper
      const a3 = Math.atan2(joints[3].y - joints[2].y, joints[3].x - joints[2].x);
      const spread = 0.18 + grip * 0.42;
      const fingerLen = 28;
      ctx!.strokeStyle = fg;
      ctx!.lineWidth = 3.5;
      ctx!.lineCap = "round";
      ctx!.lineJoin = "round";
      for (const side of [-1, 1]) {
        const ang = a3 + side * spread;
        const mid = { x: ee.x + Math.cos(ang) * fingerLen * 0.6, y: ee.y + Math.sin(ang) * fingerLen * 0.6 };
        const tip = { x: mid.x + Math.cos(a3 - side * 0.35) * fingerLen * 0.55, y: mid.y + Math.sin(a3 - side * 0.35) * fingerLen * 0.55 };
        ctx!.beginPath();
        ctx!.moveTo(ee.x, ee.y);
        ctx!.lineTo(mid.x, mid.y);
        ctx!.lineTo(tip.x, tip.y);
        ctx!.stroke();
      }

      // Joints on top
      drawJoint(joints[0], 16, 0.9);
      drawJoint(joints[1], 13, 0.7);
      drawJoint(joints[2], 10, 0.6);
      drawJoint(joints[3], 7, gripClosed ? 1 : 0.5);

      // HUD readouts (about 12 times a second is plenty).
      if (now - hudTick > 80) {
        hudTick = now;
        const a1 = Math.atan2(base.y - joints[1].y, joints[1].x - base.x);
        const a2 = Math.atan2(joints[2].y - joints[1].y, joints[2].x - joints[1].x) - Math.atan2(joints[1].y - joints[0].y, joints[1].x - joints[0].x);
        const a3r = Math.atan2(joints[3].y - joints[2].y, joints[3].x - joints[2].x) - Math.atan2(joints[2].y - joints[1].y, joints[2].x - joints[1].x);
        const norm = (r: number) => Math.atan2(Math.sin(r), Math.cos(r));
        const scale = 600 / reach; // show "millimetres" for a ~600 mm arm
        const set = (el: HTMLSpanElement | null, v: string) => el && el.textContent !== v && (el.textContent = v);
        set(hud.j1.current, `${deg(a1).toString().padStart(4, " ")}°`);
        set(hud.j2.current, `${deg(-norm(a2)).toString().padStart(4, " ")}°`);
        set(hud.j3.current, `${deg(-norm(a3r)).toString().padStart(4, " ")}°`);
        set(hud.ee.current, `${Math.round((ee.x - base.x) * scale)}, ${Math.round((base.y - ee.y) * scale)} mm`);
        const pct = Math.min(100, Math.round((Math.hypot(goal.x - base.x, goal.y - base.y) / reach) * 100));
        set(hud.reach.current, `${pct}%`);
        set(hud.mode.current, idle && !reduceMotion ? "Autonomous" : inReach ? "Tracking" : "Out of reach");
        set(hud.grip.current, gripClosed ? "Closed" : "Open");
        wrap!.dataset.state = idle && !reduceMotion ? "auto" : inReach ? "tracking" : "limit";
      }

      if (running && !reduceMotion) raf = requestAnimationFrame(frame);
    }

    const start = () => {
      if (running || reduceMotion) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    layout();
    frame(performance.now());

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !document.hidden) start();
      else stop();
    });
    io.observe(wrap);
    const onVisibility = () => (document.hidden ? stop() : visible && start());
    document.addEventListener("visibilitychange", onVisibility);
    const ro = new ResizeObserver(() => {
      layout();
      if (!running) frame(performance.now());
    });
    ro.observe(wrap);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    // Mouse leaving hands control back to autonomous mode; a lifted finger doesn't.
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType !== "touch") lastInput = Math.min(lastInput, performance.now() - 2000);
    };
    canvas.addEventListener("pointerleave", onLeave);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div className="arm-lab" ref={wrapRef} data-state="auto">
      <canvas ref={canvasRef} className="arm-canvas" aria-label="Interactive robot arm. Move your pointer over it to guide the gripper; click to open or close it." role="img" />

      <div className="arm-hud arm-hud--tl" aria-hidden="true">
        <small>{"// LAB-01 · Inverse kinematics"}</small>
        <span className="arm-status"><i /> <span ref={hud.mode}>Autonomous</span></span>
      </div>

      <dl className="arm-hud arm-hud--tr" aria-hidden="true">
        <div><dt>J1 · Shoulder</dt><dd ref={hud.j1}>—</dd></div>
        <div><dt>J2 · Elbow</dt><dd ref={hud.j2}>—</dd></div>
        <div><dt>J3 · Wrist</dt><dd ref={hud.j3}>—</dd></div>
        <div><dt>End effector</dt><dd ref={hud.ee}>—</dd></div>
        <div><dt>Reach</dt><dd ref={hud.reach}>—</dd></div>
        <div><dt>Gripper</dt><dd ref={hud.grip}>Open</dd></div>
      </dl>

      <div className="arm-hud arm-hud--bl" aria-hidden="true">
        <span className="arm-hint arm-hint--pointer">Move your cursor to guide the arm · Click to grip</span>
        <span className="arm-hint arm-hint--touch">Tap to set a target · Tap the gripper to grip</span>
      </div>
      <div className="arm-hud arm-hud--br" aria-hidden="true">
        <small>Solver: analytic IK · 3 DOF</small>
      </div>
    </div>
  );
}
