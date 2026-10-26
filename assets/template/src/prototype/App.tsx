import { useEffect, useState } from "react";
import { flow, presentation } from "../flow/load";
import type { Presentation } from "../flow/types";
import { FlowProvider, useFlow } from "../runtime/FlowContext";
import { ScreenStack } from "../runtime/ScreenStack";
import { Device } from "../present/Stage";

// URL options (handy for portfolio embeds):
//   ?embed=1            no toolbar, no page padding, fills the iframe
//   ?frame=rounded|device|none
//   ?bg=%23ffffff       stage background (URL-encoded)
const q = new URLSearchParams(window.location.search);
const embed = q.has("embed");
const pres: Presentation = {
  ...presentation,
  frame: (q.get("frame") as Presentation["frame"]) ?? presentation.frame,
  background: q.get("bg") ?? (embed ? "transparent" : presentation.background),
};

function useFitScale() {
  const { width, height } = flow.meta.viewport;
  const pad = embed ? 0 : 48;
  const bezel = pres.frame === "device" ? 28 : 0;
  const calc = () =>
    Math.min(1, (window.innerWidth - pad * 2) / (width + bezel), (window.innerHeight - pad * 2 - (embed ? 0 : 44)) / (height + bezel));
  const [s, setS] = useState(calc);
  useEffect(() => {
    const on = () => setS(calc());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return s;
}

function Toolbar() {
  const f = useFlow();
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", font: "500 13px system-ui", color: "#555" }}>
      <span>{flow.meta.name}</span>
      <span style={{ opacity: 0.4 }}>·</span>
      <button
        onClick={f.restart}
        style={{ font: "inherit", border: "1px solid #d0d3d9", background: "#fff", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}
      >
        Restart
      </button>
    </div>
  );
}

const bezelPx = pres.frame === "device" ? 28 : 0;
const boxW = flow.meta.viewport.width + bezelPx;
const boxH = flow.meta.viewport.height + bezelPx;

export function App() {
  const scale = useFitScale();
  return (
    <FlowProvider manifest={flow} presentation={pres}>
      <div
        data-mode="interactive"
        style={{
          minHeight: "100%",
          height: "100%",
          background: pres.background,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          overflow: "hidden",
        }}
      >
        <div style={{ width: boxW * scale, height: boxH * scale, flex: "none" }}>
          <div style={{ width: boxW, height: boxH, transform: `scale(${scale})`, transformOrigin: "top left" }}>
            <Device manifest={flow} presentation={pres}>
              <ScreenStack />
            </Device>
          </div>
        </div>
        {embed ? null : <Toolbar />}
      </div>
    </FlowProvider>
  );
}
