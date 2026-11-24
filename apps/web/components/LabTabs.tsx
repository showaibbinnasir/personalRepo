"use client";

import { useState } from "react";
import RobotArmLab from "./RobotArmLab";
import PidPlayground from "./PidPlayground";

const LABS = [
  { id: "arm", label: "Robot arm", sub: "Inverse kinematics" },
  { id: "pid", label: "PID tuning", sub: "Control systems" }
] as const;

/** Switches between the lab experiments. Only the active one is mounted (and animating). */
export default function LabTabs() {
  const [active, setActive] = useState<(typeof LABS)[number]["id"]>("arm");
  return (
    <div className="lab-tabs">
      <div className="lab-tablist" role="tablist" aria-label="Experiments">
        {LABS.map((lab, i) => (
          <button
            key={lab.id}
            type="button"
            role="tab"
            id={`lab-tab-${lab.id}`}
            aria-selected={active === lab.id}
            aria-controls={`lab-panel-${lab.id}`}
            className={active === lab.id ? "is-active" : ""}
            onClick={() => setActive(lab.id)}
          >
            <small>{String(i + 1).padStart(2, "0")}</small>
            <span>{lab.label}</span>
            <em>{lab.sub}</em>
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`lab-panel-${active}`} aria-labelledby={`lab-tab-${active}`} className="lab-panel" key={active}>
        {active === "arm" ? <RobotArmLab /> : <PidPlayground />}
      </div>
    </div>
  );
}
