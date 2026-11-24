"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * PID tuning playground: a drone holding altitude.
 *
 * Plant: m·a = thrust − m·g − c·v, thrust limited to [0, UMAX].
 * Like a real flight controller, thrust = hover feedforward (for an empty 1 kg drone)
 * + PID. The drone carries a payload the feedforward doesn't know about, so a P-only
 * controller settles below the target (error = payload·g / Kp); the I term learns it.
 * Derivative is on the measurement (no "kick" on setpoint changes), filtered, and the
 * integrator has anti-windup. Settling uses a ±5% band.
 */

const M0 = 1; // mass the hover feedforward assumes
const PAYLOAD = 0.25;
const G = 9.81;
const DRAG = 0.4;
const UMAX = 32;
const Y_MAX = 10;
const WINDOW = 10; // seconds shown on the chart
const DT = 1 / 240;

type Gains = { kp: number; ki: number; kd: number };

const PRESETS: { id: string; label: string; gains: Gains; note: string }[] = [
  { id: "p", label: "P only", gains: { kp: 6, ki: 0, kd: 0 }, note: "Wobbles, then hovers short of the target: the built-in hover thrust doesn't know about the payload, and P only pushes back while there's an error." },
  { id: "pd", label: "Add D", gains: { kp: 6, ki: 0, kd: 3.5 }, note: "D damps the wobble, but the drone still sits short. Nothing is learning the payload's extra weight yet." },
  { id: "pid", label: "Full PID", gains: { kp: 20, ki: 2, kd: 6 }, note: "I learns the payload's weight and removes the offset. Fast, small overshoot, settles on target: this one passes the challenge." },
  { id: "hot", label: "Too aggressive", gains: { kp: 20, ki: 12, kd: 0.8 }, note: "A big integral and little damping: large overshoot, ringing and saturated motors." }
];

type StepStats = {
  t0: number;
  y0: number;
  r: number;
  peak: number;
  t10: number | null;
  t90: number | null;
  inBandSince: number | null;
  settled: number | null;
};

type Metrics = { rise: number | null; overshoot: number | null; settle: number | null; sse: number | null; saturated: boolean };

const fmt = (v: number | null, digits = 2, unit = "") => (v === null || !Number.isFinite(v) ? "—" : `${v.toFixed(digits)}${unit}`);

export default function PidPlayground() {
  const [gains, setGains] = useState<Gains>(PRESETS[0].gains);
  const [preset, setPreset] = useState<string>("p");
  const [metrics, setMetrics] = useState<Metrics>({ rise: null, overshoot: null, settle: null, sse: null, saturated: false });
  const [passed, setPassed] = useState(false);
  const [result, setResult] = useState<Metrics | null>(null);
  const [payload, setPayload] = useState(true);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gainsRef = useRef(gains);
  // The challenge is scored on each completed step (when the next one begins), and the
  // result holds until the following step completes, so it never flickers.
  const onResult = useRef((m: Metrics) => {
    setResult(m);
    setPassed(m.overshoot !== null && m.overshoot <= 10 && m.settle !== null && m.settle <= 3 && m.sse !== null && m.sse <= 0.05);
  });
  const commands = useRef<{ gust: boolean; reset: boolean; setpoint: number | null; payload: boolean }>({ gust: false, reset: false, setpoint: null, payload: true });

  useEffect(() => {
    gainsRef.current = gains;
  }, [gains]);

  const choosePreset = (id: string) => {
    const p = PRESETS.find(x => x.id === id)!;
    setPreset(id);
    setGains(p.gains);
  };
  const setGain = (key: keyof Gains, value: number) => {
    setPreset("");
    setGains(g => ({ ...g, [key]: value }));
  };
  const gust = useCallback(() => (commands.current.gust = true), []);
  const reset = useCallback(() => {
    commands.current.reset = true;
    setResult(null);
    setPassed(false);
  }, []);
  const togglePayload = () =>
    setPayload(p => {
      commands.current.payload = !p;
      return !p;
    });

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !canvas || !ctx) return;

    const css = getComputedStyle(wrap);
    ctx.fillStyle = css.getPropertyValue("--accent").trim() || "#a71919";
    const accent = /^#[0-9a-f]{6}$/i.test(String(ctx.fillStyle)) ? String(ctx.fillStyle) : "#a71919";
    const fg = css.getPropertyValue("--fg").trim() || "#f4f1ec";
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Simulation state
    let t = 0, y = 1, v = 0, integ = 0, dFilt = 0, yPrev = 1, u = 0;
    let r = 5;
    let nextAutoStep = 2;
    let userUntil = -1;
    const samples: { t: number; r: number; y: number; u: number }[] = [];
    let step: StepStats | null = null;
    let lastMetrics = 0;

    let w = 0, h = 0, sceneW = 0, raf = 0, running = false, visible = false, last = 0, acc = 0;

    function layout() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      sceneW = w < 640 ? Math.max(110, w * 0.3) : Math.min(260, w * 0.24);
    }

    const pad = { top: 26, bottom: 30 };
    const yToPx = (alt: number) => pad.top + (1 - alt / Y_MAX) * (h - pad.top - pad.bottom);
    const pxToY = (px: number) => Math.max(0.5, Math.min(Y_MAX - 0.5, (1 - (px - pad.top) / (h - pad.top - pad.bottom)) * Y_MAX));

    function newStep(target: number) {
      // Score the step that just finished: steady-state error is the error at its end.
      if (step && Math.abs(step.r - step.y0) > 0.5 && t - step.t0 >= 4) {
        const span = step.r - step.y0;
        const final: Metrics = {
          rise: step.t10 !== null && step.t90 !== null ? step.t90 - step.t10 : null,
          overshoot: Math.max(0, ((step.peak - step.r) / span) * 100),
          settle: step.settled ?? Infinity,
          sse: Math.abs(step.r - y),
          saturated: false
        };
        onResult.current(final);
      }
      r = target;
      integ = Math.min(integ, UMAX); // keep, but bounded
      step = { t0: t, y0: y, r: target, peak: y, t10: null, t90: null, inBandSince: null, settled: null };
    }

    function simulate() {
      const c = commands.current;
      if (c.reset) {
        c.reset = false;
        t = 0; y = 1; v = 0; integ = 0; dFilt = 0; yPrev = 1; u = 0;
        step = null;
        samples.length = 0;
        nextAutoStep = 1;
        userUntil = -1;
        newStep(5);
      }
      if (c.setpoint !== null) {
        newStep(c.setpoint);
        c.setpoint = null;
        userUntil = t + 9;
        nextAutoStep = t + 9;
      }
      if (c.gust) {
        c.gust = false;
        v -= 4.5; // a sudden downdraft
      }
      // Autopilot: alternate targets so the chart is always demonstrating something.
      if (t >= nextAutoStep && t > userUntil) {
        newStep(r > 5 ? 3 : 7);
        nextAutoStep = t + 7;
      }

      const { kp, ki, kd } = gainsRef.current;
      const e = r - y;
      const dMeas = -(y - yPrev) / DT;
      yPrev = y;
      dFilt += (dMeas - dFilt) * 0.2;
      // `integ` stores the integral TERM (Ki·∫e dt), so nothing builds up while Ki is 0 and
      // changing Ki never makes the thrust jump ("bumpless" tuning).
      const unsat = M0 * G + kp * e + integ + kd * dFilt; // hover feedforward + PID
      u = Math.max(0, Math.min(UMAX, unsat));
      // Anti-windup: only integrate when it doesn't push further into saturation.
      if ((unsat < UMAX || e < 0) && (unsat > 0 || e > 0)) integ += ki * e * DT;
      integ = Math.max(-UMAX, Math.min(UMAX, integ));

      const mass = M0 + (c.payload ? PAYLOAD : 0);
      const a = (u - mass * G - DRAG * v) / mass;
      v += a * DT;
      y += v * DT;
      if (y <= 0) {
        y = 0;
        v = Math.max(0, v);
      }
      if (y >= Y_MAX) {
        y = Y_MAX;
        v = Math.min(0, v);
      }
      t += DT;

      // Step-response measurements.
      if (step) {
        const span = step.r - step.y0;
        const dir = Math.sign(span) || 1;
        if ((y - step.peak) * dir > 0) step.peak = y;
        const frac = span !== 0 ? (y - step.y0) / span : 1;
        if (step.t10 === null && frac >= 0.1) step.t10 = t;
        if (step.t90 === null && frac >= 0.9) step.t90 = t;
        const band = Math.max(0.05, Math.abs(span) * 0.05);
        if (Math.abs(y - step.r) <= band) {
          if (step.inBandSince === null) step.inBandSince = t;
          if (step.settled === null && t - step.inBandSince >= 1) step.settled = step.inBandSince - step.t0;
        } else {
          step.inBandSince = null;
          if (step.settled !== null && Math.abs(y - step.r) > band * 3) step.settled = null;
        }
      }
    }

    function record() {
      samples.push({ t, r, y, u });
      while (samples.length && samples[0].t < t - WINDOW) samples.shift();
    }

    function draw(now: number) {
      ctx!.clearRect(0, 0, w, h);

      // ---------- Scene (left) ----------
      const sx = 0, sw = sceneW;
      ctx!.strokeStyle = "rgba(244,241,236,0.12)";
      ctx!.beginPath();
      ctx!.moveTo(sx + sw, 0);
      ctx!.lineTo(sx + sw, h);
      ctx!.stroke();
      // Altitude scale
      ctx!.font = "10px ui-monospace, Menlo, monospace";
      ctx!.textAlign = "left";
      for (let m = 0; m <= Y_MAX; m += 1) {
        const py = yToPx(m);
        const major = m % 2 === 0;
        ctx!.strokeStyle = major ? "rgba(244,241,236,0.35)" : "rgba(244,241,236,0.15)";
        ctx!.beginPath();
        ctx!.moveTo(sx + 14, py);
        ctx!.lineTo(sx + (major ? 26 : 20), py);
        ctx!.stroke();
        if (major) {
          ctx!.fillStyle = "rgba(244,241,236,0.4)";
          ctx!.fillText(`${m}m`, sx + 30, py + 3);
        }
      }
      // Ground
      ctx!.fillStyle = "rgba(244,241,236,0.06)";
      ctx!.fillRect(sx, yToPx(0), sw, h - yToPx(0));
      // Target line
      const ry = yToPx(r);
      ctx!.strokeStyle = fg;
      ctx!.setLineDash([4, 5]);
      ctx!.beginPath();
      ctx!.moveTo(sx + 60, ry);
      ctx!.lineTo(sx + sw - 8, ry);
      ctx!.stroke();
      ctx!.setLineDash([]);
      ctx!.fillStyle = fg;
      ctx!.textAlign = "right";
      ctx!.fillText("TARGET", sx + sw - 10, ry - 6);
      // Drone
      const dx = sx + sw * 0.62, dy = yToPx(y);
      const thrust = u / UMAX;
      const flame = ctx!.createLinearGradient(dx, dy + 6, dx, dy + 6 + 50 * thrust);
      flame.addColorStop(0, `${accent}cc`);
      flame.addColorStop(1, `${accent}00`);
      ctx!.fillStyle = flame;
      for (const ox of [-26, 26]) {
        ctx!.beginPath();
        ctx!.moveTo(dx + ox - 7, dy + 4);
        ctx!.lineTo(dx + ox + 7, dy + 4);
        ctx!.lineTo(dx + ox, dy + 6 + 50 * thrust);
        ctx!.closePath();
        ctx!.fill();
      }
      ctx!.strokeStyle = "rgba(244,241,236,0.7)";
      ctx!.lineWidth = 2;
      ctx!.beginPath();
      ctx!.moveTo(dx - 26, dy);
      ctx!.lineTo(dx + 26, dy);
      ctx!.stroke();
      const spin = now / 40;
      for (const ox of [-26, 26]) {
        ctx!.strokeStyle = "rgba(200,214,255,0.8)";
        ctx!.lineWidth = 2;
        const span = 13 * Math.abs(Math.cos(spin + ox));
        ctx!.beginPath();
        ctx!.moveTo(dx + ox - span, dy - 5);
        ctx!.lineTo(dx + ox + span, dy - 5);
        ctx!.stroke();
        ctx!.fillStyle = "#0d0a10";
        ctx!.strokeStyle = "rgba(244,241,236,0.6)";
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.arc(dx + ox, dy - 1, 3, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.stroke();
      }
      ctx!.fillStyle = "#2a2430";
      ctx!.strokeStyle = accent;
      ctx!.lineWidth = 1.5;
      ctx!.beginPath();
      ctx!.roundRect(dx - 12, dy - 6, 24, 12, 4);
      ctx!.fill();
      ctx!.stroke();
      ctx!.fillStyle = accent;
      ctx!.fillRect(dx - 4, dy - 1, 8, 2);
      ctx!.lineWidth = 1;

      // ---------- Chart (right) ----------
      const cx0 = sceneW + 18, cx1 = w - 16;
      const tx = (time: number) => cx0 + ((time - (t - WINDOW)) / WINDOW) * (cx1 - cx0);
      // Grid
      ctx!.strokeStyle = "rgba(244,241,236,0.06)";
      for (let m = 0; m <= Y_MAX; m += 2) {
        ctx!.beginPath();
        ctx!.moveTo(cx0, yToPx(m));
        ctx!.lineTo(cx1, yToPx(m));
        ctx!.stroke();
      }
      ctx!.fillStyle = "rgba(244,241,236,0.35)";
      ctx!.textAlign = "center";
      for (let s = Math.ceil(t - WINDOW); s <= t; s++) {
        if (s < 0) continue;
        const px = tx(s);
        ctx!.strokeStyle = "rgba(244,241,236,0.06)";
        ctx!.beginPath();
        ctx!.moveTo(px, pad.top);
        ctx!.lineTo(px, h - pad.bottom);
        ctx!.stroke();
        if (s % 2 === 0) ctx!.fillText(`${s}s`, px, h - 12);
      }
      if (samples.length > 1) {
        // Thrust (effort) as a faint area at the bottom.
        ctx!.beginPath();
        ctx!.moveTo(tx(samples[0].t), h - pad.bottom);
        for (const s of samples) ctx!.lineTo(tx(s.t), h - pad.bottom - (s.u / UMAX) * (h - pad.top - pad.bottom) * 0.35);
        ctx!.lineTo(tx(samples[samples.length - 1].t), h - pad.bottom);
        ctx!.closePath();
        ctx!.fillStyle = "rgba(111,182,255,0.12)";
        ctx!.fill();
        // Target
        ctx!.strokeStyle = fg;
        ctx!.setLineDash([4, 5]);
        ctx!.beginPath();
        samples.forEach((s, i) => (i ? ctx!.lineTo(tx(s.t), yToPx(s.r)) : ctx!.moveTo(tx(s.t), yToPx(s.r))));
        ctx!.stroke();
        ctx!.setLineDash([]);
        // Altitude: a wide faint stroke under a crisp one gives the glow cheaply.
        ctx!.beginPath();
        samples.forEach((s, i) => (i ? ctx!.lineTo(tx(s.t), yToPx(s.y)) : ctx!.moveTo(tx(s.t), yToPx(s.y))));
        ctx!.strokeStyle = `${accent}40`;
        ctx!.lineWidth = 7;
        ctx!.stroke();
        ctx!.strokeStyle = accent;
        ctx!.lineWidth = 2.2;
        ctx!.stroke();
        ctx!.lineWidth = 1;
        // Head dot
        const lastS = samples[samples.length - 1];
        ctx!.fillStyle = fg;
        ctx!.beginPath();
        ctx!.arc(tx(lastS.t), yToPx(lastS.y), 3.5, 0, Math.PI * 2);
        ctx!.fill();
      }
      // Legend
      ctx!.textAlign = "left";
      ctx!.font = "10px ui-monospace, Menlo, monospace";
      const lx = cx0 + 4, ly = 14;
      ctx!.fillStyle = accent;
      ctx!.fillRect(lx, ly - 4, 14, 2);
      ctx!.fillStyle = "rgba(244,241,236,0.6)";
      ctx!.fillText("ALTITUDE", lx + 20, ly);
      ctx!.strokeStyle = fg;
      ctx!.setLineDash([3, 3]);
      ctx!.beginPath();
      ctx!.moveTo(lx + 92, ly - 3);
      ctx!.lineTo(lx + 106, ly - 3);
      ctx!.stroke();
      ctx!.setLineDash([]);
      ctx!.fillText("TARGET", lx + 112, ly);
      if (cx1 - cx0 > 260) {
        ctx!.fillStyle = "rgba(111,182,255,0.5)";
        ctx!.fillRect(lx + 172, ly - 6, 14, 6);
        ctx!.fillStyle = "rgba(244,241,236,0.6)";
        ctx!.fillText("THRUST", lx + 192, ly);
      }
    }

    function publishMetrics(now: number) {
      if (now - lastMetrics < 200 || !step) return;
      lastMetrics = now;
      const span = step.r - step.y0;
      const big = Math.abs(span) > 0.5;
      const over = big ? Math.max(0, ((step.peak - step.r) / span) * 100) : null;
      const rise = step.t10 !== null && step.t90 !== null ? step.t90 - step.t10 : null;
      const sse = step.settled !== null || t - step.t0 > 5 ? Math.abs(step.r - y) : null;
      const m: Metrics = { rise, overshoot: over, settle: step.settled, sse, saturated: u >= UMAX - 0.01 || u <= 0.01 };
      setMetrics(m);
    }

    function frame(now: number) {
      const elapsed = Math.min(0.05, (now - last) / 1000);
      last = now;
      acc += elapsed;
      let n = 0;
      while (acc >= DT && n < 40) {
        simulate();
        acc -= DT;
        n++;
        if (n % 4 === 0) record();
      }
      draw(now);
      publishMetrics(now);
      if (running) raf = requestAnimationFrame(frame);
    }

    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    // Click / tap on the scene or chart sets a new target altitude.
    const onDown = (e: PointerEvent) => {
      const rect = canvas!.getBoundingClientRect();
      commands.current.setpoint = Math.round(pxToY(e.clientY - rect.top) * 2) / 2;
      if (reduceMotion) start();
    };

    layout();
    newStep(5);
    draw(performance.now());

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
      if (!running) draw(performance.now());
    });
    ro.observe(canvas);
    canvas.addEventListener("pointerdown", onDown);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointerdown", onDown);
    };
  }, []);

  const note = PRESETS.find(p => p.id === preset)?.note || "Custom gains. Watch the step response, then try the challenge.";
  const checks = [
    { label: "Overshoot ≤ 10%", ok: !!result && result.overshoot !== null && result.overshoot <= 10 },
    { label: "Settles (±5%) in ≤ 3 s", ok: !!result && result.settle !== null && result.settle <= 3 },
    { label: "Error ≤ 5 cm", ok: !!result && result.sse !== null && result.sse <= 0.05 }
  ];

  return (
    <div className="pid-lab" ref={wrapRef}>
      <div className="pid-stage">
        <canvas ref={canvasRef} className="pid-canvas" role="img" aria-label="Drone altitude simulation with a live chart of target, altitude and thrust. Click to set a new target altitude." />
        <div className="arm-hud arm-hud--tl pid-hud-tl" aria-hidden="true">
          <small>{"// LAB-02 · PID altitude hold"}</small>
        </div>
        <dl className="arm-hud arm-hud--tr pid-metrics">
          <div><dt>Rise time</dt><dd>{fmt(metrics.rise, 2, " s")}</dd></div>
          <div><dt>Overshoot</dt><dd>{fmt(metrics.overshoot, 1, "%")}</dd></div>
          <div><dt>Settling</dt><dd>{fmt(metrics.settle, 2, " s")}</dd></div>
          <div><dt>Steady error</dt><dd>{fmt(metrics.sse, 2, " m")}</dd></div>
          <div><dt>Motors</dt><dd className={metrics.saturated ? "is-warn" : ""}>{metrics.saturated ? "Saturated" : "In range"}</dd></div>
        </dl>
        <div className="arm-hud arm-hud--bl" aria-hidden="true">
          <span className="arm-hint arm-hint--pointer">Click to set a new target altitude</span>
          <span className="arm-hint arm-hint--touch">Tap to set a new target altitude</span>
        </div>
      </div>

      <div className="pid-controls">
        <div className="pid-sliders">
          {([
            ["kp", "Kp", "Proportional", 0, 25, 0.1, "Reacts to the error now. More = faster, but more overshoot."],
            ["ki", "Ki", "Integral", 0, 15, 0.1, "Adds up past error. Removes the steady offset."],
            ["kd", "Kd", "Derivative", 0, 10, 0.1, "Reacts to how fast it's moving. Adds damping."]
          ] as const).map(([key, sym, name, min, max, stepSize, help]) => (
            <label key={key} className="pid-slider">
              <span className="pid-slider-head">
                <b>{sym}</b>
                <span>{name}</span>
                <output>{gains[key].toFixed(1)}</output>
              </span>
              <input
                type="range"
                min={min}
                max={max}
                step={stepSize}
                value={gains[key]}
                onChange={e => setGain(key, Number(e.target.value))}
                style={{ ["--fill" as string]: `${(gains[key] / max) * 100}%` }}
              />
              <small>{help}</small>
            </label>
          ))}
        </div>

        <div className="pid-side">
          <div className="pid-presets" role="group" aria-label="Presets">
            {PRESETS.map(p => (
              <button key={p.id} type="button" className={preset === p.id ? "is-active" : ""} onClick={() => choosePreset(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
          <p className="pid-note">{note}</p>
          <div className={`pid-challenge ${passed ? "is-passed" : ""}`}>
            <small>{passed ? "// Challenge complete" : result ? "// Challenge · last step" : "// Challenge · scoring next step"}</small>
            <ul>
              {checks.map(c => (
                <li key={c.label} className={c.ok ? "is-ok" : ""}>
                  <span aria-hidden="true">{c.ok ? "✓" : "○"}</span> {c.label}
                </li>
              ))}
            </ul>
          </div>
          <div className="pid-actions">
            <button type="button" className={`pid-btn ${payload ? "is-on" : ""}`} onClick={togglePayload} aria-pressed={payload}>
              Payload: {payload ? "250 g" : "none"}
            </button>
            <button type="button" className="pid-btn" onClick={gust}>Wind gust</button>
            <button type="button" className="pid-btn" onClick={reset}>Reset</button>
          </div>
        </div>
      </div>
    </div>
  );
}
