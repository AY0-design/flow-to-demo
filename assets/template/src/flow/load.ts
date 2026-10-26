import flowJson from "../../flow.json" with { type: "json" };
import presentationJson from "../../presentation.json" with { type: "json" };
import type { FlowManifest, Presentation } from "./types";

export const flow = flowJson as unknown as FlowManifest;

const defaults: Presentation = {
  background: "#EDEEF1",
  frame: "rounded",
  cornerRadius: 44,
  padding: 72,
  shadow: true,
  fps: 60,
  scale: 2,
  speed: 1,
  loop: false,
  cursor: "auto",
  output: { width: null, height: null },
  timing: { leadInMs: 1200, holdAfterTransitionMs: 1300, pressMs: 220, typingCharMs: 85, scrollMs: 1400, outroMs: 1500 },
  transitions: { push: 460, fade: 320, rise: 480, overlay: 380 },
  poster: { step: "auto" },
};

const p = presentationJson as Partial<Presentation>;
export const presentation: Presentation = {
  ...defaults,
  ...p,
  output: { ...defaults.output, ...(p.output ?? {}) },
  timing: { ...defaults.timing, ...(p.timing ?? {}) },
  transitions: { ...defaults.transitions, ...(p.transitions ?? {}) },
  poster: { ...defaults.poster, ...(p.poster ?? {}) },
};

/** Stage size (1x) — the UI plus padding, or an explicit output size. Always even. */
export function stageSize(pr: Presentation = presentation, f: FlowManifest = flow) {
  const even = (n: number) => Math.round(n / 2) * 2;
  const pad = pr.frame === "none" ? 0 : pr.padding;
  const bezel = pr.frame === "device" ? 14 : 0;
  const w = pr.output.width ?? f.meta.viewport.width + 2 * (pad + bezel);
  const h = pr.output.height ?? f.meta.viewport.height + 2 * (pad + bezel);
  return { width: even(w), height: even(h) };
}
